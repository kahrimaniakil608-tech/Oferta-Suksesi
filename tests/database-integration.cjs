// Explicit opt-in: all records live in a fresh PostgreSQL container, never the application's database.
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomBytes } = require("node:crypto");
const run = promisify(execFile);
const root = path.resolve(__dirname, "..");
require("ts-node").register({
  project: path.join(root, "apps/api/tsconfig.json"),
  transpileOnly: true,
});
const { PrismaClient } = require("@prisma/client");
const {
  ListingsService,
} = require("../apps/api/src/listings/listings.service.ts");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");
const {
  deletionTransaction,
  deleteListingsPreservingPayments,
} = require("../apps/api/src/listings/delete-listings.ts");
const name = `oferta-test-db-${process.pid}-${randomBytes(4).toString("hex")}`;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "oferta-db-test-"));
let started = false;
let prisma;
(async () => {
  await run(
    "docker",
    [
      "run",
      "--pull=never",
      "--rm",
      "-d",
      "--name",
      name,
      "--publish",
      "127.0.0.1::5432",
      "--tmpfs",
      "/var/lib/postgresql/data",
      "-e",
      "POSTGRES_USER=oferta_test",
      "-e",
      "POSTGRES_PASSWORD=disposable_test_password",
      "-e",
      "POSTGRES_DB=oferta_test",
      "postgres:16-alpine",
    ],
    { timeout: 30000 },
  );
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await run("docker", [
        "exec",
        name,
        "pg_isready",
        "-U",
        "oferta_test",
        "-d",
        "oferta_test",
      ]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(ready, "Disposable database did not become ready");
  const { stdout } = await run("docker", ["port", name, "5432/tcp"]);
  const port = stdout.trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
  assert.ok(port);
  const url = `postgresql://oferta_test:disposable_test_password@127.0.0.1:${port}/oferta_test`;
  const currentSchema = fs.readFileSync(
    path.join(root, "prisma/schema.prisma"),
    "utf8",
  );
  const previousSchema = fs.readFileSync(
    path.join(root, "tests/fixtures/pre-auth.prisma"),
    "utf8",
  );
  fs.writeFileSync(path.join(temporary, "schema.prisma"), previousSchema);
  // Work from a temporary directory so Prisma never loads the repository's .env.
  await run(
    process.execPath,
    [
      path.join(root, "node_modules/prisma/build/index.js"),
      "db",
      "push",
      "--schema",
      path.join(temporary, "schema.prisma"),
      "--skip-generate",
    ],
    {
      cwd: temporary,
      env: { ...process.env, DATABASE_URL: url },
      timeout: 30000,
    },
  );
  for (const migrationName of [
    "20261019120000_add_revocable_auth_sessions",
    "20261019140000_complete_audit_workflows",
    "20261019160000_preserve_legacy_listing_images",
    "20261019170000_skip_deleted_listing_notifications",
  ]) {
    const migration = fs.readFileSync(
      path.join(root, "prisma/migrations", migrationName, "migration.sql"),
      "utf8",
    );
    await new Promise((resolve, reject) => {
      const child = execFile(
        "docker",
        [
          "exec",
          "-i",
          name,
          "psql",
          "-v",
          "ON_ERROR_STOP=1",
          "-U",
          "oferta_test",
          "-d",
          "oferta_test",
        ],
        { timeout: 15000 },
        (error, stdout, stderr) =>
          error ? reject(new Error(stderr)) : resolve(),
      );
      child.stdin.end(migration);
    });
  }
  fs.writeFileSync(path.join(temporary, "schema.prisma"), currentSchema);
  await run(
    process.execPath,
    [
      path.join(root, "node_modules/prisma/build/index.js"),
      "migrate",
      "diff",
      "--from-url",
      url,
      "--to-schema-datamodel",
      path.join(temporary, "schema.prisma"),
      "--exit-code",
    ],
    {
      cwd: temporary,
      env: { ...process.env, DATABASE_URL: url },
      timeout: 30000,
    },
  );
  console.log(
    "PASS: the additive migrations apply to the previous schema and matches the current Prisma schema",
  );
  await run("docker", [
    "exec",
    name,
    "createdb",
    "-U",
    "oferta_test",
    "fresh_test",
  ]);
  const freshAddress = new URL(url);
  freshAddress.pathname = "/fresh_test";
  const freshUrl = freshAddress.toString();
  fs.cpSync(
    path.join(root, "prisma/migrations"),
    path.join(temporary, "migrations"),
    { recursive: true },
  );
  await run(
    process.execPath,
    [
      path.join(root, "node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
      "--schema",
      path.join(temporary, "schema.prisma"),
    ],
    {
      cwd: temporary,
      env: { ...process.env, DATABASE_URL: freshUrl },
      timeout: 30000,
    },
  );
  await run(
    process.execPath,
    [
      path.join(root, "node_modules/prisma/build/index.js"),
      "migrate",
      "diff",
      "--from-url",
      freshUrl,
      "--to-schema-datamodel",
      path.join(temporary, "schema.prisma"),
      "--exit-code",
    ],
    {
      cwd: temporary,
      env: { ...process.env, DATABASE_URL: freshUrl },
      timeout: 30000,
    },
  );
  console.log(
    "PASS: all tracked migrations build an empty database matching the current schema",
  );
  prisma = new PrismaClient({ datasources: { db: { url } } });
  const user = await prisma.user.create({
    data: {
      email: "test@example.invalid",
      name: "Disposable Test",
      slug: "disposable-test",
      passwordHash: "not-a-real-password",
      trustScore: 80,
    },
  });
  const category = await prisma.category.create({
    data: { name: "Test", slug: "test" },
  });
  const city = await prisma.city.create({
    data: { name: "Test", slug: "test" },
  });
  const service = new ListingsService(
    prisma,
    { publish: async () => {}, reserveQuota: async () => true },
    { indexListing: async () => {}, removeListing: async () => {} },
    { score: async () => 0 },
  );
  const admin = Object.create(AdminListingsService.prototype);
  admin.prisma = prisma;
  const createListing = (slug, changes = {}) =>
    prisma.listing.create({
      data: {
        slug,
        title: "Disposable listing",
        description: "Synthetic database verification only",
        userId: user.id,
        categoryId: category.id,
        cityId: city.id,
        status: "ARCHIVED",
        expiresAt: new Date(Date.now() + 86400000),
        ...changes,
      },
    });
  for (const mode of ["owner", "admin", "empty-trash"]) {
    const listing = await createListing(mode, {
      deletedAt: mode === "empty-trash" ? new Date() : null,
    });
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        listingId: listing.id,
        type: "FEATURED",
        status: "COMPLETED",
        amount: "49.99",
        currency: "EUR",
        providerRef: `test-${mode}`,
      },
    });
    if (mode === "owner") await service.permanentDelete(listing.id, user.id);
    if (mode === "admin") await admin.permanentDelete(listing.id, user.id);
    if (mode === "empty-trash")
      assert.equal((await admin.emptyTrash(user.id)).count, 1);
    assert.equal(
      await prisma.listing.findUnique({ where: { id: listing.id } }),
      null,
    );
    const retained = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    assert.equal(retained.listingId, null);
    assert.equal(retained.amount.toFixed(2), "49.99");
    assert.equal(retained.status, payment.status);
    assert.equal(retained.providerRef, payment.providerRef);
    const log = await prisma.moderationLog.findFirstOrThrow({
      where: { reason: { contains: payment.id } },
    });
    assert.equal(log.listingId, null);
    assert.equal(JSON.parse(log.reason).id, listing.id);
  }
  console.log(
    "PASS: owner deletion, admin deletion and empty trash retain real payment rows and durable snapshots",
  );

  const rollback = await createListing("rollback");
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      listingId: rollback.id,
      type: "FEATURED",
      amount: "5",
    },
  });
  await assert.rejects(
    deletionTransaction(prisma, async (tx) => {
      await deleteListingsPreservingPayments(tx, [rollback], user.id);
      throw new Error("Synthetic failure after deletion");
    }),
    /Synthetic failure/,
  );
  assert.ok(await prisma.listing.findUnique({ where: { id: rollback.id } }));
  assert.equal(
    (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
      .listingId,
    rollback.id,
  );
  assert.equal(
    await prisma.moderationLog.count({
      where: { reason: { contains: payment.id } },
    }),
    0,
  );
  console.log(
    "PASS: transaction rollback restores the listing/payment link and removes the uncommitted snapshot",
  );

  const editable = await createListing("photos", { status: "PUBLISHED" });
  const batchId = `upload-${require("crypto").randomUUID()}`;
  const images = ["second", "first"].map((name) => ({
    url: `listings/2026/10/${batchId}/original/${name}.webp`,
    thumbUrl: `listings/2026/10/${batchId}/thumb/${name}.webp`,
    mediumUrl: `listings/2026/10/${batchId}/medium/${name}.webp`,
  }));
  await prisma.uploadBatch.create({
    data: {
      id: batchId,
      ownerId: user.id,
      operation: "listing",
      claimHash: "test",
      files: images.flatMap((i) => [i.url, i.thumbUrl, i.mediumUrl]),
    },
  });
  await service.update(editable.id, { images }, user.id, "USER");
  const saved = await service.findForManagement(editable.id, user.id, "USER");
  assert.deepEqual(
    saved.images.map((image) => image.url),
    images.map((image) => image.url),
  );
  assert.deepEqual(
    saved.images.map((image) => image.isPrimary),
    [true, false],
  );
  await service.update(editable.id, { images: [] }, user.id, "USER");
  assert.equal(
    (await service.findForManagement(editable.id, user.id, "USER")).images
      .length,
    0,
  );
  await prisma.listing.update({
    where: { id: editable.id },
    data: { expiresAt: new Date(0) },
  });
  assert.equal((await service.findAll({})).data.length, 0);
  await assert.rejects(
    service.findOne(editable.slug),
    (error) => error.getStatus() === 404,
  );
  console.log(
    "PASS: image ordering/primary/removal persist on reload and expired records disappear from public reads",
  );
  await require("./auth-moderation-database.cjs")(prisma, category, city);
  await require("./completion-database.cjs")(prisma, category, city);
  await require("./legacy-images-database.cjs")(prisma, category, city);
  const limitedUrl = new URL(url);
  limitedUrl.searchParams.set("connection_limit", "1");
  const limited = new PrismaClient({
    datasources: { db: { url: limitedUrl.href } },
  });
  try {
    await require("./connection-pool-database.cjs")(limited, category, city);
  } finally {
    await limited.$disconnect();
  }
  if (process.env.OFERTA_HTTP_TEST === "1") {
    const fresh = new PrismaClient({ datasources: { db: { url: freshUrl } } });
    try {
      const freshCategory = await fresh.category.create({
        data: { name: "Test", slug: "test" },
      });
      const freshCity = await fresh.city.create({
        data: { name: "Test", slug: "test" },
      });
      await require("./http-database.cjs")(
        fresh,
        freshUrl,
        freshCategory,
        freshCity,
        temporary,
      );
    } finally {
      await fresh.$disconnect();
    }
  }
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (started) await run("docker", ["rm", "-f", name], { timeout: 15000 });
    fs.rmSync(temporary, { recursive: true, force: true });
  });
