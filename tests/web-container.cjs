// Run against a built web image; uses disposable containers without host ports or external networking.
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const { tmpdir } = require("node:os");
const { mkdtempSync, copyFileSync, writeFileSync, rmSync } = require("node:fs");
const run = promisify(execFile);
const image = process.env.OFERTA_TEST_WEB_IMAGE || "oferta-test-web:local";
const prefix = `oferta-web-check-${process.pid}-${randomBytes(4).toString("hex")}`;
const network = `${prefix}-net`;
const api = `${prefix}-api`;
const containers = [];
let networkCreated = false;
let configDirectory;

async function docker(...args) {
  return (
    await run("docker", args, {
      cwd: path.resolve(__dirname, ".."),
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    })
  ).stdout.trim();
}

async function waitFor(check) {
  const deadline = Date.now() + 45000;
  let lastError;
  do {
    try {
      return await check();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  throw lastError;
}

function probe(url, status) {
  return `fetch(${JSON.stringify(url)}, {signal:AbortSignal.timeout(4000)}).then(async r => {
    const body = await r.json();
    if (r.status !== ${status} || body.status !== ${JSON.stringify(status === 200 ? "ready" : "unavailable")})
      throw new Error('Unexpected readiness: ' + r.status + ' ' + JSON.stringify(body));
  }).catch(e => { console.error(e.message); process.exitCode = 1; })`;
}

(async () => {
  await docker("image", "inspect", image);
  // Compose still checks env_file existence with --no-env-resolution on some versions.
  // Parse the real configuration in a temporary project with an empty .env.
  configDirectory = mkdtempSync(path.join(tmpdir(), "oferta-web-config-"));
  copyFileSync(
    path.resolve(__dirname, "../docker-compose.yml"),
    path.join(configDirectory, "docker-compose.yml"),
  );
  writeFileSync(path.join(configDirectory, ".env"), "");
  const config = JSON.parse(
    await docker(
      "compose",
      "--project-directory",
      configDirectory,
      "--file",
      path.join(configDirectory, "docker-compose.yml"),
      "--env-file",
      "/dev/null",
      "config",
      "--no-env-resolution",
      "--format",
      "json",
    ),
  ).services.web;
  assert.equal(config.healthcheck.test[0], "CMD");
  await docker("network", "create", "--internal", network);
  networkCreated = true;
  const mock = `require('node:http').createServer((req,res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({status:'ready'}));
  }).listen(3001,'0.0.0.0');`;
  await docker(
    "run",
    "--pull=never",
    "-d",
    "--name",
    api,
    "--network",
    network,
    "--network-alias",
    "api",
    "--entrypoint",
    "node",
    image,
    "-e",
    mock,
  );
  containers.push(api);
  await waitFor(() =>
    docker(
      "exec",
      api,
      "node",
      "-e",
      probe("http://127.0.0.1:3001/api/v1/ready", 200),
    ),
  );

  for (const mode of ["image-defaults", "compose-environment"]) {
    const web = `${prefix}-${mode}`;
    const environment =
      mode === "image-defaults"
        ? { API_URL: "http://api:3001/api/v1" }
        : config.environment;
    await docker(
      "run",
      "--pull=never",
      "-d",
      "--name",
      web,
      "--network",
      network,
      ...Object.entries(environment).flatMap(([key, value]) => [
        "-e",
        `${key}=${value}`,
      ]),
      image,
    );
    containers.push(web);
    // Exercise the shipping Compose probe against the actual standalone server.
    await waitFor(() =>
      docker("exec", web, ...config.healthcheck.test.slice(1)),
    );
    await docker(
      "exec",
      web,
      "node",
      "-e",
      probe("http://127.0.0.1:3000/api/ready", 200),
    );
    await docker(
      "exec",
      api,
      "node",
      "-e",
      probe(`http://${web}:3000/api/ready`, 200),
    );
    console.log(
      `PASS: ${mode} accepts loopback health checks and peer-container traffic`,
    );
    if (mode === "compose-environment") {
      await docker("stop", "--time", "1", api);
      await docker(
        "exec",
        web,
        "node",
        "-e",
        probe("http://127.0.0.1:3000/api/ready", 503),
      );
      await docker("start", api);
      await waitFor(() =>
        docker("exec", web, ...config.healthcheck.test.slice(1)),
      );
      console.log(
        "PASS: web readiness reports API outage and recovers when the API returns",
      );
    }
  }
})()
  .catch(async (error) => {
    console.error(error.message);
    for (const name of containers) {
      console.error(await docker("logs", "--tail", "15", name).catch(() => ""));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (configDirectory)
      rmSync(configDirectory, { recursive: true, force: true });
    for (const name of containers.reverse()) {
      await docker("rm", "-f", name).catch(() => {
        process.exitCode = 1;
      });
    }
    if (networkCreated)
      await docker("network", "rm", network).catch(() => {
        process.exitCode = 1;
      });
  });
