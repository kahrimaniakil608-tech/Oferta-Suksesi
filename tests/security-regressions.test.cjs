const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
require("ts-node").register({
  project: path.join(root, "apps/api/tsconfig.json"),
  transpileOnly: true,
});
const {
  ListingsService,
} = require("../apps/api/src/listings/listings.service.ts");
const {
  publicListingWhere,
  isPublicListing,
} = require("../apps/api/src/listings/listing-visibility.ts");
const {
  deletionTransaction,
  deleteListingsPreservingPayments,
} = require("../apps/api/src/listings/delete-listings.ts");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");
const {
  CompaniesController,
} = require("../apps/api/src/companies/companies.controller.ts");
const {
  UsersController,
} = require("../apps/api/src/users/users.controller.ts");
const {
  PagesController,
} = require("../apps/api/src/pages/pages.controller.ts");
const { SearchService } = require("../apps/api/src/search/search.service.ts");
const { MediaService } = require("../apps/api/src/media/media.service.ts");
const {
  TurnstileGuard,
} = require("../apps/api/src/common/guards/turnstile.guard.ts");
const {
  ImagesService,
} = require("../apps/image-service/src/images/images.service.ts");
const {
  ImagesController,
} = require("../apps/image-service/src/images/images.controller.ts");
const {
  UploadPermitGuard,
} = require("../apps/image-service/src/images/upload-permit.guard.ts");
const { serializeJsonLd } = require("../apps/web/src/lib/json-ld.ts");
const { Reflector } = apiRequire("@nestjs/core");
const { GUARDS_METADATA, METHOD_METADATA } = apiRequire(
  "@nestjs/common/constants",
);
const config = (values = {}) => ({
  get: (key, fallback) => values[key] ?? fallback,
});
const item = (changes = {}) => ({
  id: "listing-1",
  userId: "owner",
  title: "Example listing",
  description: "Example listing description",
  slug: "example-listing",
  status: "PUBLISHED",
  deletedAt: null,
  categoryId: 1,
  subcategoryId: null,
  cityId: 1,
  attributes: {},
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  updatedAt: new Date(),
  bumpedAt: null,
  renewalCount: 0,
  ...changes,
});
function listingService(prisma = {}, score = 0) {
  return new ListingsService(
    prisma,
    { publish: async () => {}, reserveQuota: async () => true },
    {
      indexListing: async () => {},
      removeListing: async () => {},
    },
    { score: async () => score },
  );
}
function editablePrisma(listing, saved, options = {}) {
  const prisma = {
    $executeRaw: async () => 0,
    siteSetting: { findMany: async () => [] },
    listingImage: { findMany: async () => [] },
    listing: {
      findUnique: async () => listing,
      update: async (args) => {
        saved.push(args);
        return { ...listing, ...args.data };
      },
    },
    category: {
      findUnique: async ({ where }) => ({
        id: where.id,
        parentId: where.id === 1 ? null : 1,
        isActive: true,
        attributeSchema: {},
      }),
    },
    city: { findUnique: async () => ({ id: 1 }) },
    company: { findUnique: async () => ({ ownerId: "someone-else" }) },
    user: {
      findUnique: async () => ({
        trustScore: 80,
        postingStatus: "AUTO_PUBLISH",
      }),
    },
    ...options,
  };
  prisma.$transaction = async (work) => work(prisma);
  return prisma;
}
function loadTsx(relative, overrides, browserGlobals = {}) {
  const ts = require("typescript");
  const output = ts.transpileModule(
    fs.readFileSync(path.join(root, relative), "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(
    output,
    {
      ...browserGlobals,
      exports,
      require: (name) => {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (
          name.startsWith("@/components/") ||
          name === "next/link" ||
          name === "next/image"
        )
          return () => null;
        return webRequire(name);
      },
      process: { env: {} },
      URLSearchParams,
      console,
    },
    { filename: relative },
  );
  return exports;
}

test("listing JSON-LD keeps attacker text inside one data script and preserves Unicode", async () => {
  const listing = item({
    title: "</script><script>window.__probe=1</script> ë & \u2028",
    images: [],
    category: { id: 1, name: "Test", slug: "test" },
    city: { id: 1, name: "Test" },
    user: null,
    isGuestListing: true,
    guestName: "Test",
    createdAt: new Date().toISOString(),
    viewsCount: 0,
  });
  const Page = loadTsx("apps/web/src/app/shpalljet/[slug]/page.tsx", {
    "next/navigation": { notFound: () => assert.fail("Unexpected 404") },
    "@/lib/api": {
      getListing: async () => listing,
      getListings: async () => ({ data: [] }),
    },
    "@/lib/utils": { formatPrice: String, timeAgo: () => "test" },
    "@/lib/seo": { SITE_URL: "https://example.invalid" },
    "@/lib/json-ld": { serializeJsonLd },
  }).default;
  const html = webRequire("react-dom/server").renderToStaticMarkup(
    await Page({ params: Promise.resolve({ slug: listing.slug }) }),
  );
  const { JSDOM } = createRequire(webRequire.resolve("isomorphic-dompurify"))(
    "jsdom",
  );
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.invalid",
  });
  try {
    assert.equal(dom.window.__probe, undefined);
    assert.equal(
      dom.window.document.querySelectorAll(
        'script:not([type="application/ld+json"])',
      ).length,
      0,
    );
    assert.equal(
      JSON.parse(
        dom.window.document.querySelector('script[type="application/ld+json"]')
          .textContent,
      ).name,
      listing.title,
    );
  } finally {
    dom.window.close();
  }
});

for (const status of [
  "DRAFT",
  "PENDING_REVIEW",
  "REJECTED",
  "ARCHIVED",
  "EXPIRED",
]) {
  test(`public list rejects ${status} without querying private records`, async () => {
    await assert.rejects(
      listingService().findAll({ status }),
      (error) => error.getStatus() === 400,
    );
  });
}
test("public search retains expiration criteria when combining text and price filters", async () => {
  const queries = [];
  const service = listingService({
    listing: {
      findMany: async (args) => {
        queries.push(args);
        return [];
      },
      count: async (args) => {
        queries.push(args);
        return 0;
      },
    },
    $transaction: (promises) => Promise.all(promises),
  });
  await service.findAll({ q: "house", price_min: 10, price_max: 100 });
  for (const { where } of queries) {
    assert.equal(where.status, "PUBLISHED");
    assert.equal(where.deletedAt, null);
    assert.equal(where.AND.length, 1);
    assert.deepEqual(where.numericPrice, { gte: 10, lte: 100 });
    assert.ok(where.AND[0].expiresAt.gt instanceof Date);
    assert.equal(where.OR.length, 2);
  }
});
for (const changes of [
  { status: "DRAFT" },
  { deletedAt: new Date() },
  { expiresAt: new Date(0) },
]) {
  test(`public detail hides unavailable listings: ${JSON.stringify(changes)}`, async () => {
    const listing = item(changes);
    assert.equal(isPublicListing(listing), false);
    await assert.rejects(
      listingService({ listing: { findUnique: async () => listing } }).findOne(
        listing.id,
      ),
      (error) => error.getStatus() === 404,
    );
  });
}
test("private listing editing is accessible to its owner and staff only, without incrementing views", async () => {
  const listing = item({ status: "PENDING_REVIEW" });
  const service = listingService({
    listing: { findUnique: async () => listing },
  });
  assert.equal(
    (await service.findForManagement(listing.id, "owner", "USER")).id,
    listing.id,
  );
  assert.equal(
    (await service.findForManagement(listing.id, "staff", "MODERATOR")).id,
    listing.id,
  );
  await assert.rejects(
    service.findForManagement(listing.id, "stranger", "USER"),
    (error) => error.getStatus() === 403,
  );
});
test("owner cannot publish a rejected listing with a status PATCH", async () => {
  const writes = [];
  const service = listingService(
    editablePrisma(item({ status: "REJECTED" }), writes),
  );
  await assert.rejects(
    service.update("listing-1", { status: "PUBLISHED" }, "owner", "USER"),
    (error) => error.getStatus() === 403,
  );
  assert.equal(writes.length, 0);
});
test("spam edits and approval-required owners return published listings to review", async () => {
  for (const options of [
    { score: 60, user: { trustScore: 80, postingStatus: "AUTO_PUBLISH" } },
    { score: 0, user: { trustScore: 90, postingStatus: "REQUIRES_APPROVAL" } },
  ]) {
    const writes = [];
    const service = listingService(
      editablePrisma(item(), writes, {
        user: { findUnique: async () => options.user },
      }),
      options.score,
    );
    assert.equal(
      (
        await service.update(
          "listing-1",
          { title: "Changed title" },
          "owner",
          "USER",
        )
      ).status,
      "PENDING_REVIEW",
    );
  }
});
test("owners cannot attach another company or transfer company ownership", async () => {
  const writes = [];
  await assert.rejects(
    listingService(editablePrisma(item(), writes)).update(
      "listing-1",
      { companyId: "foreign" },
      "owner",
      "USER",
    ),
    (error) => error.getStatus() === 403,
  );
  assert.equal(writes.length, 0);
  const companyDb = {
    $executeRaw: async () => 0,
    company: {
      findUnique: async () => ({ id: "company", ownerId: "owner" }),
      update: async (args) => args.data,
    },
  };
  companyDb.$transaction = async (work) => work(companyDb);
  const controller = new CompaniesController(companyDb);
  const updated = await controller.updateMine(
    { user: { id: "owner" } },
    { ownerId: "foreign", name: "New name" },
  );
  assert.equal(updated.ownerId, undefined);
  assert.equal(updated.name, "New name");
});
test("reordered images and removal of the final image are persisted atomically", async () => {
  const writes = [];
  const service = listingService(editablePrisma(item(), writes));
  const images = ["b", "a"].map((url) => ({
    url,
    thumbUrl: `${url}-t`,
    mediumUrl: `${url}-m`,
  }));
  service.prisma.listingImage.findMany = async () => images;
  await service.update("listing-1", { images }, "owner", "USER");
  assert.deepEqual(writes[0].data.images, {
    deleteMany: {},
    create: images.map((image, position) => ({
      ...image,
      position,
      isPrimary: position === 0,
    })),
  });
  await service.update("listing-1", { images: [] }, "owner", "USER");
  assert.deepEqual(writes[1].data.images, { deleteMany: {}, create: [] });
});
test("subcategory schema, parent relationship and explicit removal are validated on edit", async () => {
  const writes = [];
  const prisma = editablePrisma(item({ subcategoryId: 2 }), writes);
  prisma.category.findUnique = async ({ where }) =>
    where.id === 1
      ? { id: 1, parentId: null, isActive: true, attributeSchema: {} }
      : {
          id: 2,
          parentId: 1,
          isActive: true,
          attributeSchema: {
            fields: [{ name: "rooms", type: "number", required: true }],
          },
        };
  const service = listingService(prisma);
  await assert.rejects(
    service.update("listing-1", { attributes: {} }, "owner", "USER"),
    (error) => error.getStatus() === 400,
  );
  await service.update("listing-1", { subcategoryId: null }, "owner", "USER");
  assert.equal(writes[0].data.subcategoryId, null);
  prisma.category.findUnique = async () => ({
    id: 1,
    parentId: 99,
    isActive: true,
  });
  await assert.rejects(
    service.update("listing-1", {}, "owner", "USER"),
    (error) => error.getStatus() === 400,
  );
});
test("renewal cannot reactivate rejected, pending or archived listings", async () => {
  for (const status of ["REJECTED", "PENDING_REVIEW", "ARCHIVED", "DRAFT"]) {
    await assert.rejects(
      listingService(editablePrisma(item({ status }), [])).renew(
        "listing-1",
        "owner",
      ),
      (error) => error.getStatus() === 400,
    );
  }
  const service = listingService(
    editablePrisma(item({ status: "EXPIRED" }), [], {
      user: {
        findUnique: async () => ({
          trustScore: 20,
          postingStatus: "REQUIRES_APPROVAL",
        }),
      },
    }),
  );
  assert.equal(
    (await service.renew("listing-1", "owner")).status,
    "PENDING_REVIEW",
  );
});
test("company, favourites, and sitemap queries exclude private/deleted/expired listings", async () => {
  const queries = [];
  const capture = async (args) => {
    queries.push(args);
    return [];
  };
  const count = async (args) => {
    queries.push(args);
    return 0;
  };
  const prisma = {
    company: { findUnique: async () => ({ id: "company" }) },
    listing: { findMany: capture, count },
    favourite: { findMany: capture, count },
    $transaction: (args) => Promise.all(args),
  };
  await new CompaniesController(prisma).findOne("company");
  await new UsersController(prisma).myFavourites({ user: { id: "viewer" } });
  await listingService(prisma).findForSitemap();
  assert.equal(queries.length, 6);
  for (const query of queries) {
    const where = query.where.listing ?? query.where;
    assert.equal(where.status, "PUBLISHED");
    assert.equal(where.deletedAt, null);
    assert.ok(where.AND[0].expiresAt.gt instanceof Date);
  }
});
test("search drops stale private hits and returns current content with usable slugs", async () => {
  const service = Object.create(SearchService.prototype);
  service.index = {
    search: async () => ({
      hits: [
        { id: "private", title: "Secret" },
        { id: "public", title: "Stale" },
      ],
      estimatedTotalHits: 2,
    }),
  };
  service.prisma = {
    listing: {
      findMany: async ({ where }) => {
        assert.equal(where.status, "PUBLISHED");
        assert.equal(where.deletedAt, null);
        return [
          item({
            id: "public",
            title: "Current",
            category: { name: "Test" },
            city: { name: "Test" },
            images: [],
          }),
        ];
      },
    },
  };
  const result = await service.search("test");
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].title, "Current");
  assert.equal(result.data[0].slug, "example-listing");
});
test("public CMS rejects an unpublished page and filters its directory", async () => {
  let where;
  const controller = new PagesController({
    page: {
      findMany: async (args) => {
        where = args.where;
        return [];
      },
      findUnique: async () => ({ isPublished: false }),
    },
  });
  await controller.findAll();
  assert.equal(where.isPublished, true);
  await assert.rejects(
    controller.findOne("draft"),
    (error) => error.getStatus() === 404,
  );
});

function mediaHarness() {
  const permits = new Map();
  const redis = {
    reserveQuota: async () => true,
    set: async (key, value) => permits.set(key, value),
    consumeUploadPermit: async (key, operation, resourceId) => {
      const raw = permits.get(key);
      if (!raw) return null;
      const permit = JSON.parse(raw);
      if (permit.operation !== operation || permit.resourceId !== resourceId)
        return null;
      permits.delete(key);
      return raw;
    },
  };
  return {
    service: new MediaService(
      redis,
      config({ JWT_SECRET: "test-only-secret" }),
      { uploadBatch: { create: async ({ data }) => data } },
    ),
    redis,
    permits,
  };
}
test("upload permits are operation/resource bound and one-use; guests cannot upload ads", async () => {
  const { service } = mediaHarness();
  await assert.rejects(
    service.issueUpload("ad-banner", 1, null, "127.0.0.1"),
    (error) => error.getStatus() === 403,
  );
  await assert.rejects(
    service.issueUpload("ad-banner", 1, { id: "owner", role: "USER" }, ""),
    (error) => error.getStatus() === 403,
  );
  const permit = await service.issueUpload("listing", 2, null, "127.0.0.1");
  assert.match(permit.token, /^[a-f0-9]{64}$/);
  const resourceId = permit.uploadPath.split("/").pop();
  await assert.rejects(
    service.consume(permit.token, "ad-banner", resourceId),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    service.consume(permit.token, "listing", "existing-listing"),
    (error) => error.getStatus() === 401,
  );
  assert.equal(
    (await service.consume(permit.token, "listing", resourceId)).fileCount,
    2,
  );
  await assert.rejects(
    service.consume(permit.token, "listing", resourceId),
    (error) => error.getStatus() === 401,
  );
});
test("quota rejection never allocates a permit and internal credential rejects unauthenticated consumers", async () => {
  const { service, redis, permits } = mediaHarness();
  redis.reserveQuota = async () => false;
  await assert.rejects(
    service.issueUpload("listing", 1, null, ""),
    (error) => error.getStatus() === 400,
  );
  assert.equal(permits.size, 0);
  assert.throws(
    () => service.assertServiceCredential(),
    (error) => error.getStatus() === 401,
  );
  assert.throws(
    () => service.assertServiceCredential("Bearer wrong"),
    (error) => error.getStatus() === 401,
  );
});
test("every image mutation is guarded before file interception and has a scoped operation", async () => {
  assert.ok(
    Reflect.getMetadata(GUARDS_METADATA, ImagesController).includes(
      UploadPermitGuard,
    ),
  );
  let routes = 0;
  for (const name of Object.getOwnPropertyNames(ImagesController.prototype)) {
    const method = ImagesController.prototype[name];
    if (Reflect.getMetadata(METHOD_METADATA, method) !== undefined) {
      routes++;
      assert.ok(Reflect.getMetadata("imageOperation", method), name);
    }
  }
  assert.equal(routes, 6);
  assert.equal(ImagesService.prototype.deleteListingImages, undefined);
  const guard = new UploadPermitGuard(
    config({ JWT_SECRET: "test-only-secret" }),
    new Reflector(),
  );
  const context = {
    getHandler: () => ImagesController.prototype.uploadForListing,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        params: { listingId: "existing-listing" },
      }),
    }),
  };
  await assert.rejects(
    guard.canActivate(context),
    (error) => error.getStatus() === 401,
  );
});
test("image authorization fails closed when the API is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  const guard = new UploadPermitGuard(
    config({ JWT_SECRET: "test-only-secret" }),
    new Reflector(),
  );
  const context = {
    getHandler: () => ImagesController.prototype.uploadForListing,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: `Bearer ${"a".repeat(64)}` },
        params: { listingId: "upload-example" },
      }),
    }),
  };
  await assert.rejects(
    guard.canActivate(context),
    (error) => error.getStatus() === 503,
  );
});
test("file count is enforced even after a valid permit", async () => {
  const controller = new ImagesController({
    processAndSave: () => assert.fail("Unauthorized write"),
  });
  await assert.rejects(
    controller.uploadForListing("upload-test", [{}, {}], {
      uploadPermit: { fileCount: 1 },
    }),
    (error) => error.getStatus() === 400,
  );
});
test("image processing confines paths, rejects forged file data, and accepts a real image", async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "oferta-image-test-"),
  );
  const service = Object.create(ImagesService.prototype);
  Object.assign(service, {
    uploadDir: temporary,
    publicUrl: "https://images.example.invalid",
    watermarkBuffer: null,
    logger: { log() {} },
  });
  try {
    for (const id of [
      "../../escape",
      "/absolute",
      "..",
      "a/b",
      "a\\b",
      "%2e%2e",
      "a".repeat(101),
    ]) {
      assert.throws(
        () => service.listingDir(id),
        (error) => error.getStatus() === 400,
      );
    }
    for (const reference of [
      "/etc/passwd",
      "../secret",
      "https://foreign.invalid/uploads/listings/2026/10/x/original/a.webp",
      "uploads/listings/2026/10/x/../../../secret",
    ]) {
      assert.throws(
        () => service.resolveListingImage(reference),
        (error) => error.getStatus() === 400,
      );
    }
    fs.symlinkSync(os.tmpdir(), path.join(temporary, "companies"));
    assert.throws(
      () => service.companyDir("safe-id"),
      (error) => error.getStatus() === 400,
    );
    const fake = {
      buffer: Buffer.from("<svg></svg>"),
      size: 11,
      mimetype: "image/png",
      originalname: "fake.png",
    };
    await assert.rejects(
      service.processAndSave([fake], "upload-test"),
      (error) => error.getStatus() === 400,
    );
    const buffer = await require("sharp")({
      create: { width: 12, height: 12, channels: 3, background: "#00ff00" },
    })
      .png()
      .toBuffer();
    const result = await service.processAndSave(
      [
        {
          buffer,
          size: buffer.length,
          mimetype: "image/png",
          originalname: "real.png",
        },
      ],
      "upload-test",
    );
    for (const url of Object.values(result[0])) {
      const file = service.resolveListingImage(url);
      assert.equal((await require("sharp")(file).metadata()).format, "webp");
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
test("Turnstile requires a secret outside explicit development/test mode", async () => {
  for (const mode of ["production", undefined])
    assert.throws(() => new TurnstileGuard(config({ NODE_ENV: mode })));
  const guard = new TurnstileGuard(config({ NODE_ENV: "test" }));
  assert.equal(await guard.canActivate({}), true);
});
test("Turnstile uses the trusted request IP and handles verification outages", async (t) => {
  const guard = new TurnstileGuard(
    config({ TURNSTILE_SECRET_KEY: "test-only-secret" }),
  );
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        ip: "127.0.0.1",
        headers: { "x-forwarded-for": "forged" },
        body: { turnstileToken: "example" },
      }),
    }),
  };
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (_url, options) => {
      assert.equal(options.body.get("remoteip"), "127.0.0.1");
      return { ok: true, json: async () => ({ success: true }) };
    },
  );
  assert.equal(await guard.canActivate(context), true);
  fetchMock.mock.mockImplementation(async () => {
    throw new Error("timeout");
  });
  await assert.rejects(
    guard.canActivate(context),
    (error) => error.getStatus() === 503,
  );
});

test("permanent deletion preserves payment fields and leaves a traceable audit snapshot", async () => {
  const payments = [
    {
      id: "payment-1",
      listingId: "listing-1",
      amount: "49.99",
      currency: "EUR",
      status: "COMPLETED",
      providerRef: "provider-1",
    },
  ];
  const audit = [];
  const events = [];
  const tx = {
    $executeRaw: async (sql) => {
      if (sql.join("").includes("moderation_logs"))
        events.push("retain-history");
      else assert.match(sql.join(""), /SET CONSTRAINTS ALL IMMEDIATE/);
    },
    payment: {
      findMany: async () => payments.map((payment) => ({ ...payment })),
      updateMany: async ({ data }) => {
        events.push("detach");
        payments.forEach((payment) => Object.assign(payment, data));
      },
    },
    moderationLog: {
      createMany: async ({ data }) => {
        events.push("audit");
        audit.push(...data);
      },
    },
    listing: {
      deleteMany: async ({ where }) => {
        events.push("delete");
        assert.deepEqual(where.id.in, ["listing-1"]);
        return { count: 1 };
      },
    },
  };
  assert.equal(
    (await deleteListingsPreservingPayments(tx, [item()], "admin")).count,
    1,
  );
  assert.deepEqual(events, ["audit", "detach", "retain-history", "delete"]);
  assert.deepEqual(payments[0], {
    id: "payment-1",
    listingId: null,
    amount: "49.99",
    currency: "EUR",
    status: "COMPLETED",
    providerRef: "provider-1",
  });
  assert.equal(audit[0].listingId, undefined);
  assert.deepEqual(JSON.parse(audit[0].reason).paymentIds, ["payment-1"]);
  assert.equal(JSON.parse(audit[0].reason).id, "listing-1");
});
test("deletion transaction retries only serialization conflicts and reports exhausted retries", async () => {
  let attempts = 0;
  const prisma = {
    $transaction: async (work, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      if (++attempts < 3) throw { code: "P2034" };
      return work({ $executeRaw: async () => 0 });
    },
  };
  assert.equal(await deletionTransaction(prisma, async () => "ok"), "ok");
  assert.equal(attempts, 3);
  await assert.rejects(
    deletionTransaction(
      {
        $transaction: async () => {
          throw { code: "P2034" };
        },
      },
      async () => {},
    ),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    deletionTransaction(
      {
        $transaction: async () => {
          throw new Error("database offline");
        },
      },
      async () => {},
    ),
    /database offline/,
  );
});
test("owner/admin deletion and empty-trash run selection and payment detachment inside one transaction", async () => {
  for (const mode of ["owner", "admin", "empty-trash"]) {
    let inTransaction = false;
    let detached = false;
    const selected = item({
      status: "ARCHIVED",
      deletedAt: mode === "owner" ? null : new Date(),
    });
    const tx = {
      $executeRaw: async () => {
        assert.ok(inTransaction);
      },
      listing: {
        findUnique: async () => {
          assert.ok(inTransaction);
          return selected;
        },
        findMany: async () => {
          assert.ok(inTransaction);
          return [selected];
        },
        deleteMany: async ({ where }) => {
          assert.ok(inTransaction && detached);
          assert.deepEqual(where, { id: { in: [selected.id] } });
          return { count: 1 };
        },
      },
      payment: {
        findMany: async () => [],
        updateMany: async () => {
          assert.ok(inTransaction);
          detached = true;
        },
      },
      moderationLog: { createMany: async () => {} },
    };
    const prisma = {
      $transaction: async (work, options) => {
        assert.equal(options.isolationLevel, "Serializable");
        inTransaction = true;
        try {
          return await work(tx);
        } finally {
          inTransaction = false;
        }
      },
    };
    if (mode === "owner")
      await listingService(prisma).permanentDelete(selected.id, "owner");
    else {
      const service = Object.create(AdminListingsService.prototype);
      service.prisma = prisma;
      if (mode === "admin") await service.permanentDelete(selected.id, "admin");
      else await service.emptyTrash("admin");
    }
    assert.ok(detached);
  }
});
test("filter Apply does not serialize the click event as a subcategory", () => {
  const navigations = [];
  const Panel = loadTsx(
    "apps/web/src/components/filters/FilterPanel.tsx",
    {
      react: {
        useState: (value) => [value, () => {}],
        useRef: (value) => ({ current: value }),
        useCallback: (fn) => fn,
        useEffect: () => {},
        useId: () => 'filter-suggestions',
      },
      "next/navigation": {
        usePathname: () => "/kategorite/test",
        useSearchParams: () => new URLSearchParams("q=retained&view=list"),
      },
      "@/lib/constants": { CITIES: [] },
      "@/components/ui/Modal": { default: "dialog" },
      "@/lib/utils": { imgSrc: (value) => value },
    },
    {
      window: {
        location: { assign: (url) => navigations.push(url) },
      },
    },
  ).default;
  const tree = Panel({
    initialFilters: {
      city: "",
      price_min: "",
      price_max: "",
      has_photos: false,
      isFeatured: false,
      sort: "newest",
      subcategory: "selected",
    },
  });
  function find(node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (
      node.type === "button" &&
      String(node.props.children).trim() === "Apliko Filtrat"
    )
      return node;
    return find(node.props?.children);
  }
  const apply = find(tree);
  assert.ok(apply, "The Apply button must remain available");
  apply.props.onClick({ type: "click" });
  apply.props.onClick({ type: "click" });
  assert.equal(
    navigations.length,
    1,
    "Repeated clicks must navigate only once",
  );
  const destination = new URL(navigations[0], "https://example.invalid");
  assert.equal(destination.pathname, "/kategorite/test");
  assert.equal(destination.searchParams.get("subcategory"), "selected");
  assert.equal(destination.searchParams.get("q"), "retained");
  assert.equal(destination.searchParams.get("view"), "list");
});

test("guest and signed-in clients cannot activate unpaid promotions", async () => {
  const service = listingService();
  for (const flags of [{ isFeatured: true }, { isUrgent: true }]) {
    await assert.rejects(
      service.create(flags, "owner"),
      (error) => error.getStatus() === 403,
    );
    await assert.rejects(
      service.createGuest(flags, "127.0.0.1"),
      (error) => error.getStatus() === 403,
    );
    await assert.rejects(
      listingService(editablePrisma(item(), [])).update(
        "listing-1",
        flags,
        "owner",
        "USER",
      ),
      (error) => error.getStatus() === 403,
    );
  }
  const writes = [];
  await listingService(
    editablePrisma(item({ isFeatured: true, isUrgent: false }), writes),
  ).update("listing-1", { title: "New title" }, "owner", "USER");
  assert.equal(Object.hasOwn(writes[0].data, "isFeatured"), false);
});
test("concurrent moderation changes prevent stale owner edits and renewal", async () => {
  const listing = item();
  const prisma = editablePrisma(listing, []);
  prisma.listing.update = async ({ where }) => {
    assert.equal(where.updatedAt, listing.updatedAt);
    assert.equal(where.status, "PUBLISHED");
    assert.equal(where.deletedAt, null);
    throw { code: "P2025" };
  };
  const service = listingService(prisma);
  await assert.rejects(
    service.update(listing.id, { title: "Stale edit" }, "owner", "USER"),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    service.renew(listing.id, "owner"),
    (error) => error.getStatus() === 409,
  );
});
test("guest publication retains the public contact email policy", async () => {
  const prisma = editablePrisma(item(), []);
  prisma.listing.findUnique = async () => null;
  prisma.listing.create = async ({ data }) => ({ id: "new-guest", ...data });
  const result = await listingService(prisma).createGuest(
    {
      title: "Guest example",
      description: "A valid guest listing description",
      categoryId: 1,
      cityId: 1,
      guestEmail: "guest@example.invalid",
    },
    "127.0.0.1",
  );
  assert.equal(result.guestEmail, "guest@example.invalid");
  assert.equal(result.status, "PENDING_REVIEW");
  assert.equal(result.isFeatured, false);
  assert.equal(result.isUrgent, false);
});
test("image guard and API interoperate using the same credential and reject replay", async (t) => {
  const { service } = mediaHarness();
  const guard = new UploadPermitGuard(
    config({ JWT_SECRET: "test-only-secret" }),
    new Reflector(),
  );
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    service.assertServiceCredential(options.headers.Authorization);
    const { token, operation, resourceId } = JSON.parse(options.body);
    try {
      const permit = await service.consume(token, operation, resourceId);
      return { ok: true, json: async () => permit };
    } catch {
      return { ok: false, status: 401 };
    }
  });
  const permit = await service.issueUpload(
    "listing",
    2,
    { id: "owner", role: "USER" },
    "",
  );
  const request = {
    headers: { authorization: `Bearer ${permit.token}` },
    params: { listingId: permit.uploadPath.split("/").pop() },
  };
  const context = {
    getHandler: () => ImagesController.prototype.uploadForListing,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  assert.equal(await guard.canActivate(context), true);
  assert.equal(request.uploadPermit.fileCount, 2);
  await assert.rejects(
    guard.canActivate(context),
    (error) => error.getStatus() === 401,
  );
});
test("social image permits bind both image path and title", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({
      fileCount: 0,
      imagePath: "authorized-image",
      title: "Original title",
    }),
  }));
  const guard = new UploadPermitGuard(
    config({ JWT_SECRET: "test-only-secret" }),
    new Reflector(),
  );
  const request = {
    headers: { authorization: `Bearer ${"a".repeat(64)}` },
    params: { listingId: "listing-1" },
    body: { imagePath: "../secret", title: "Original title" },
  };
  const context = {
    getHandler: () => ImagesController.prototype.generateSocialImage,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  await assert.rejects(
    guard.canActivate(context),
    (error) => error.getStatus() === 401,
  );
});
test("frontend upload requests a scoped permit and sends it only to the image upload endpoint", async (t) => {
  const { uploadImages } = require("../apps/web/src/lib/image-upload.ts");
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () =>
        calls.length === 1
          ? { token: "test-permit", uploadPath: "/images/upload/upload-test" }
          : [{ url: "image-result" }],
    };
  });
  const result = await uploadImages(
    "listing",
    [new File(["image"], "test.png", { type: "image/png" })],
    { turnstileToken: "test-captcha" },
  );
  assert.equal(result[0].url, "image-result");
  assert.ok(calls[0].url.endsWith("/media/guest-upload-permits"));
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    operation: "listing",
    fileCount: 1,
    turnstileToken: "test-captcha",
  });
  assert.ok(calls[1].url.endsWith("/images/upload/upload-test"));
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-permit");
  assert.equal(calls[1].options.body.getAll("files").length, 1);
});
