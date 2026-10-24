// Only called with the disposable database created by database-integration.cjs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const run = promisify(execFile);
const root = path.resolve(__dirname, "..");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
module.exports = async function verifyHttp(
  db,
  databaseUrl,
  category,
  city,
  temporary,
) {
  const containers = [],
    processes = [],
    logs = [];
  async function container(label, image, port, args = []) {
    const name = `oferta-http-${label}-${process.pid}`;
    await run(
      "docker",
      [
        "run",
        "--pull=never",
        "--rm",
        "-d",
        "--name",
        name,
        "-p",
        `127.0.0.1::${port}`,
        ...args,
        image,
      ],
      { timeout: 30000 },
    );
    containers.push(name);
    const { stdout } = await run("docker", ["port", name, `${port}/tcp`]);
    return { name, port: Number(stdout.trim().split(":").pop()) };
  }
  async function wait(url, predicate = (r) => r.ok) {
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (await predicate(r)) return;
      } catch {}
      await pause(200);
    }
    throw new Error(
      `Service did not become ready: ${url}; see /tmp/oferta-http-*.log`,
    );
  }
  try {
    const redis = await container("redis", "redis:7-alpine", 6379);
    const search = await container(
      "search",
      "getmeili/meilisearch:v1.7",
      7700,
      ["-e", "MEILI_NO_ANALYTICS=true"],
    );
    const apiPort = await freePort(),
      imagePort = await freePort();
    const api = `http://127.0.0.1:${apiPort}/api/v1`,
      image = `http://127.0.0.1:${imagePort}`;
    const env = {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: `redis://127.0.0.1:${redis.port}`,
      MEILISEARCH_HOST: `http://127.0.0.1:${search.port}`,
      MEILISEARCH_KEY: "",
      JWT_SECRET: "synthetic-http-test-secret-only",
      JWT_REFRESH_SECRET: "synthetic-http-refresh-secret-only",
      IMAGE_SERVICE_SECRET: "synthetic-http-image-secret-only",
      OUTBOX_SECRET: "synthetic-http-outbox-secret-only",
      TURNSTILE_SECRET_KEY: "",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      TRUSTED_PROXY_CIDRS: "",
      API_PORT: String(apiPort),
      IMAGE_SERVICE_PORT: String(imagePort),
      IMAGE_AUTH_API_URL: api,
      IMAGE_SERVICE_URL: image,
      NEXT_PUBLIC_IMAGE_URL: image,
      PUBLIC_URL: image,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3999",
      UPLOAD_DIR: path.join(temporary, "http-uploads"),
    };
    for (const service of ["api", "image-service"]) {
      const log = fs.openSync(`/tmp/oferta-http-${service}.log`, "w");
      logs.push(log);
      processes.push(
        spawn(
          process.execPath,
          [path.join(root, `apps/${service}/dist/main.js`)],
          { cwd: temporary, env, stdio: ["ignore", log, log] },
        ),
      );
    }
    await wait(
      `${api}/ready`,
      async (r) => r.ok && (await r.json()).status === "ready",
    );
    await wait(`${image}/health`);
    let cookies = "";
    async function request(
      route,
      method = "GET",
      data,
      expected = 200,
      anonymous = false,
    ) {
      const response = await fetch(`${api}${route}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(anonymous ? {} : { Cookie: cookies }),
        },
        ...(data && { body: JSON.stringify(data) }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${route}: ${JSON.stringify(result)}`,
      );
      if (response.headers.getSetCookie().length && !anonymous)
        cookies = response.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
      return result;
    }
    // Exercise the actual Prisma projection over HTTP, not a fixture that
    // already contains the icon field and could hide a missing API selection.
    await db.category.update({
      where: { id: category.id },
      data: { icon: "🏠" },
    });
    const childCategory = await db.category.create({
      data: { name: "Apartments", slug: "apartments", icon: "🏢", parentId: category.id },
    });
    const catalog = await request("/categories", "GET", undefined, 200, true);
    const publicCategory = catalog.find((row) => row.id === category.id);
    assert.equal(publicCategory.icon, "🏠");
    assert.equal(publicCategory.children.find((row) => row.id === childCategory.id).icon, "🏢");
    await db.category.update({
      where: { id: category.id },
      data: { icon: "🌟" },
    });
    assert.equal(
      (await request("/categories", "GET", undefined, 200, true))
        .find((row) => row.id === category.id).icon,
      "🌟",
    );
    console.log("PASS: public category API returns saved parent/child icons and subsequent icon edits");
    await db.siteSetting.upsert({
      where: { key: "maintenance_mode" },
      update: { value: "false" },
      create: { key: "maintenance_mode", value: "false", group: "general" },
    });
    const user = await request(
      "/auth/register",
      "POST",
      {
        email: "http@example.invalid",
        name: "Synthetic HTTP owner",
        password: "SyntheticPassword!123",
      },
      201,
    );
    assert.match(cookies, /os_access=/);
    assert.equal((await request("/users/me")).id, user.user.id);
    await request("/listings?page=invalid", "GET", undefined, 400);
    const permit = await request(
      "/media/upload-permits",
      "POST",
      { operation: "listing", fileCount: 1 },
      201,
    );
    const png = await require("sharp")({
      create: { width: 32, height: 32, channels: 3, background: "#5544ff" },
    })
      .png()
      .toBuffer();
    function form() {
      const data = new FormData();
      data.append("files", new Blob([png], { type: "image/png" }), "test.png");
      return data;
    }
    assert.equal(
      (
        await fetch(`${image}${permit.uploadPath}`, {
          method: "POST",
          body: form(),
        })
      ).status,
      401,
    );
    const upload = await fetch(`${image}${permit.uploadPath}`, {
      method: "POST",
      body: form(),
      headers: { Authorization: `Bearer ${permit.token}` },
    });
    const images = await upload.json();
    assert.equal(upload.status, 201, JSON.stringify(images));
    assert.equal((await fetch(images[0].url)).status, 200);
    assert.equal(
      (
        await fetch(`${image}${permit.uploadPath}`, {
          method: "POST",
          body: form(),
          headers: { Authorization: `Bearer ${permit.token}` },
        })
      ).status,
      401,
    );
    const data = {
      requestId: randomUUID(),
      title: "HTTP integration listing",
      description:
        "A synthetic listing created through actual running services.",
      categoryId: category.id,
      cityId: city.id,
      images,
    };
    const listing = await request("/listings", "POST", data, 201);
    assert.equal(
      (await request("/listings", "POST", data, 201)).id,
      listing.id,
    );
    assert.equal(
      (await request(`/listings/${listing.id}/manage`)).images.length,
      1,
    );
    await request(`/listings/${listing.id}`, "GET", undefined, 404, true);
    await db.listing.update({
      where: { id: listing.id },
      data: { status: "PUBLISHED" },
    });
    await wait(
      `${api}/search/listings?q=HTTP`,
      async (r) =>
        r.ok && (await r.json()).data?.some((row) => row.id === listing.id),
    );
    await db.listing.update({
      where: { id: listing.id },
      data: { status: "REJECTED" },
    });
    assert.ok(
      !(await request("/search/listings?q=HTTP")).data.some(
        (row) => row.id === listing.id,
      ),
    );
    const stale = cookies;
    await request("/auth/logout", "POST", {});
    cookies = stale;
    await request("/users/me", "GET", undefined, 401);
    console.log(
      "PASS: real HTTP registration/cookies, upload permit/replay, file serving, atomic submission replay, private management, search outbox and logout revocation",
    );
    await run("docker", ["stop", search.name]);
    await wait(
      `${api}/ready`,
      async (r) => r.ok && (await r.json()).status === "degraded",
    );
    assert.equal((await fetch(`${api}/health`)).status, 200);
    await run("docker", ["stop", redis.name]);
    await wait(`${api}/ready`, (r) => r.status === 503);
    assert.equal((await fetch(`${api}/health`)).status, 200);
    console.log(
      "PASS: actual dependency shutdown changes readiness while liveness remains available",
    );
  } finally {
    await Promise.all(
      processes.map(
        (child) =>
          new Promise((resolve) => {
            if (child.exitCode !== null) return resolve();
            child.once("exit", resolve);
            child.kill("SIGTERM");
            const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
            timer.unref();
          }),
      ),
    );
    await Promise.all(
      containers.map((name) =>
        run("docker", ["rm", "-f", name]).catch(() => {}),
      ),
    );
    for (const fd of logs) fs.closeSync(fd);
  }
};
