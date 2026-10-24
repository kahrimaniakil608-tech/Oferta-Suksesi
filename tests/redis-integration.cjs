// Explicit opt-in: starts a disposable, network-isolated Redis container from a cached image.
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomBytes, createHash } = require("node:crypto");
const run = promisify(execFile);
require("ts-node").register({
  project: path.resolve(__dirname, "../apps/api/tsconfig.json"),
  transpileOnly: true,
});
const { RedisService } = require("../apps/api/src/redis/redis.service.ts");
const { MediaService } = require("../apps/api/src/media/media.service.ts");
const name = `oferta-test-redis-${process.pid}-${randomBytes(4).toString("hex")}`;
let started = false;
async function command(...args) {
  const { stdout } = await run(
    "docker",
    ["exec", name, "redis-cli", "--raw", ...args.map(String)],
    { timeout: 15000 },
  );
  const value = stdout.replace(/\r?\n$/, "");
  if (/^(ERR|WRONGTYPE|NOSCRIPT)\b/.test(value)) throw new Error(value);
  return value;
}
(async () => {
  await run(
    "docker",
    [
      "run",
      "--pull=never",
      "--rm",
      "-d",
      "--network",
      "none",
      "--name",
      name,
      "redis:7-alpine",
      "redis-server",
      "--save",
      "",
      "--appendonly",
      "no",
    ],
    { timeout: 30000 },
  );
  started = true;
  assert.equal(await command("PING"), "PONG");
  const redis = new RedisService({});
  redis.client = {
    eval: async (...args) => {
      const value = await command("EVAL", ...args);
      return value === "" ? null : /^\d+$/.test(value) ? Number(value) : value;
    },
    set: (...args) => command("SET", ...args),
  };
  const reservations = await Promise.all(
    Array.from({ length: 20 }, () => redis.reserveQuota("quota", 1, 7, 60)),
  );
  assert.equal(reservations.filter(Boolean).length, 7);
  assert.equal(await command("GET", "quota"), "7");
  assert.ok(Number(await command("TTL", "quota")) > 0);
  console.log(
    "PASS: 20 concurrent reservations grant exactly 7 slots with an expiry",
  );

  await Promise.all(
    Array.from({ length: 12 }, () =>
      redis.reserveQuotaOnce("once", "same-submission", 7, 86400),
    ),
  );
  assert.equal(Number(await command("GET", "once")), 1);
  const unique = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      redis.reserveQuotaOnce("once", `submission-${i}`, 7, 86400),
    ),
  );
  assert.equal(unique.filter(Boolean).length, 6);
  console.log(
    "PASS: duplicate submission retries consume one guest slot under concurrency",
  );

  const media = new MediaService(
    redis,
    {
      get: (key) =>
        key === "JWT_SECRET" ? "disposable-test-secret" : undefined,
    },
    { uploadBatch: { create: async ({ data }) => data } },
  );
  const issued = await media.issueUpload("listing", 2, null, "127.0.0.1");
  const resourceId = issued.uploadPath.split("/").pop();
  const key = `media:permit:${createHash("sha256").update(issued.token).digest("hex")}`;
  assert.ok(Number(await command("TTL", key)) > 0);
  await assert.rejects(
    media.consume(issued.token, "ad-banner", resourceId),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    media.consume(issued.token, "listing", "foreign-folder"),
    (error) => error.getStatus() === 401,
  );
  const consumers = await Promise.allSettled(
    Array.from({ length: 10 }, () =>
      media.consume(issued.token, "listing", resourceId),
    ),
  );
  assert.equal(
    consumers.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(await command("EXISTS", key), "0");
  console.log(
    "PASS: scoped permit survives wrong-scope attempts and is consumed once under 10 concurrent requests",
  );

  const expiring = await media.issueUpload("listing", 1, null, "127.0.0.1");
  const expiringKey = `media:permit:${createHash("sha256").update(expiring.token).digest("hex")}`;
  await command("PEXPIRE", expiringKey, 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await assert.rejects(
    media.consume(
      expiring.token,
      "listing",
      expiring.uploadPath.split("/").pop(),
    ),
    (error) => error.getStatus() === 401,
  );
  console.log("PASS: expired permits cannot be consumed");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (started) await run("docker", ["rm", "-f", name], { timeout: 15000 });
  });
