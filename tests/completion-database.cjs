const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const {
  ListingsService,
} = require("../apps/api/src/listings/listings.service.ts");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");
const {
  AdminCategoriesService,
} = require("../apps/api/src/admin/categories/admin-categories.service.ts");
const {
  CompaniesController,
} = require("../apps/api/src/companies/companies.controller.ts");
const { BlogController } = require("../apps/api/src/blog/blog.controller.ts");
const { AdsService } = require("../apps/api/src/ads/ads.service.ts");
const {
  CleanupService,
} = require("../apps/api/src/cleanup/cleanup.service.ts");
const {
  WorkflowsService,
} = require("../apps/api/src/workflows/workflows.service.ts");
const {
  ContactController,
  OperationsController,
} = require("../apps/api/src/workflows/operations.controller.ts");
const {
  MediaCleanupService,
} = require("../apps/api/src/media/media-cleanup.service.ts");
const { claimJobs, finishJob } = require("../apps/api/src/workflows/outbox.ts");
module.exports = async function (db, category, city) {
  const setting = (key, value) =>
    db.siteSetting.upsert({
      where: { key },
      create: { key, value, group: "test" },
      update: { value },
    });
  const user = async (role) => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        name: "Synthetic User",
        email: `${id}@example.invalid`,
        slug: id,
        role: role ?? "USER",
        trustScore: 80,
        passwordHash: "synthetic",
      },
    });
  };
  const owner = await user();
  const admin = await user("ADMIN");
  const stranger = await user();
  const listing = (data = {}) =>
    db.listing.create({
      data: {
        userId: owner.id,
        categoryId: category.id,
        cityId: city.id,
        title: "Synthetic listing",
        description: "Synthetic listing for isolated workflow verification",
        slug: randomUUID(),
        expiresAt: new Date(Date.now() + 86400000),
        status: "PUBLISHED",
        ...data,
      },
    });
  const service = new ListingsService(
    db,
    { reserveQuota: async () => true },
    {},
    { score: async () => 0 },
  );
  const adminListings = Object.assign(
    Object.create(AdminListingsService.prototype),
    { prisma: db },
  );
  const base = {
    title: "Idempotent synthetic submission",
    description: "Synthetic listing for isolated workflow verification",
    categoryId: category.id,
    cityId: city.id,
    requestId: randomUUID(),
  };
  const submissions = await Promise.all(
    Array.from({ length: 4 }, () => service.create(base, owner.id)),
  );
  assert.equal(new Set(submissions.map((row) => row.id)).size, 1);
  assert.equal(
    await db.submission.count({ where: { listingId: submissions[0].id } }),
    1,
  );
  await assert.rejects(
    service.create({ ...base, title: "Changed submission content" }, owner.id),
    (error) => error.getStatus?.() === 409,
  );
  console.log(
    "PASS: simultaneous duplicate submissions have one listing/receipt; changed content with the same key conflicts",
  );

  const priced = await Promise.all([
    listing({ attributes: { price: "100" } }),
    listing({ attributes: { price: 20 } }),
    listing({ attributes: { price: "negotiable" } }),
  ]);
  const ascending = (
    await service.findAll({ sort: "price_asc", limit: 100 })
  ).data.filter((row) => priced.some((item) => item.id === row.id));
  assert.deepEqual(
    ascending.map((row) => row.id),
    [priced[1].id, priced[0].id, priced[2].id],
  );
  const filtered = (await service.findAll({ price_min: 50, price_max: 150 }))
    .data;
  assert.ok(filtered.some((row) => row.id === priced[0].id));
  assert.ok(!filtered.some((row) => row.id === priced[1].id));
  const originalViews = priced[0].viewsCount;
  await service.findOne(priced[0].id);
  await service.findOne(priced[0].id);
  assert.equal(
    (await db.listing.findUnique({ where: { id: priced[0].id } })).viewsCount,
    originalViews,
  );
  await Promise.all(
    Array.from({ length: 3 }, () => service.view(priced[0].id, "192.0.2.1")),
  );
  await service.contact(priced[0].id, { contactType: "PHONE" }, "192.0.2.1");
  await service.contact(priced[0].id, { contactType: "PHONE" }, "192.0.2.1");
  const engaged = await db.listing.findUnique({ where: { id: priced[0].id } });
  assert.equal(engaged.viewsCount, originalViews + 1);
  assert.equal(engaged.contactClicks, 1);
  console.log(
    "PASS: numeric price sorting/filtering and deduplicated explicit view/contact events work independently of content GETs",
  );

  const batch = `upload-${randomUUID()}`;
  const token = randomUUID();
  const image = {
    url: `listings/2026/10/${batch}/original/test.webp`,
    thumbUrl: `listings/2026/10/${batch}/thumb/test.webp`,
    mediumUrl: `listings/2026/10/${batch}/medium/test.webp`,
  };
  await db.uploadBatch.create({
    data: {
      id: batch,
      ownerId: owner.id,
      operation: "listing",
      claimHash: createHash("sha256").update(token).digest("hex"),
      files: Object.values(image),
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });
  await assert.rejects(
    service.create(
      {
        ...base,
        requestId: randomUUID(),
        title: "Stolen image attempt",
        images: [image],
      },
      stranger.id,
    ),
    (error) => error.getStatus?.() === 403,
  );
  await service.update(priced[0].id, { images: [image] }, owner.id, "USER");
  const ownedImage = await db.listingImage.findFirst({
    where: { listingId: priced[0].id },
  });
  const foreignImage = await db.listingImage.create({
    data: {
      listingId: priced[1].id,
      url: "legacy.jpg",
      thumbUrl: "legacy.jpg",
      mediumUrl: "legacy.jpg",
      position: 0,
      isPrimary: true,
    },
  });
  await assert.rejects(
    adminListings.reorderImages(priced[0].id, [foreignImage.id], admin.id),
    (error) => error.getStatus?.() === 400,
  );
  await assert.rejects(
    adminListings.reorderImages(
      priced[0].id,
      [ownedImage.id, ownedImage.id],
      admin.id,
    ),
    (error) => error.getStatus?.() === 400,
  );
  assert.equal(
    (await db.listingImage.findUnique({ where: { id: ownedImage.id } }))
      .isPrimary,
    true,
  );
  assert.equal(
    (await db.listing.findUnique({ where: { id: priced[0].id } })).status,
    "PUBLISHED",
  );
  await setting("require_image_to_publish", "true");
  await assert.rejects(
    db.listingImage.delete({ where: { id: ownedImage.id } }),
    "database image policy must reject direct deletion",
  );
  await assert.rejects(
    service.update(priced[0].id, { images: [] }, owner.id, "USER"),
  );
  assert.equal(
    await db.listingImage.count({ where: { listingId: priced[0].id } }),
    1,
  );
  await setting("require_image_to_publish", "false");
  await db.uploadBatch.update({
    where: { id: batch },
    data: { attachedAt: new Date(Date.now() - 2 * 86400000) },
  });
  const unusedBatch = `upload-${randomUUID()}`;
  await db.uploadBatch.create({
    data: {
      id: unusedBatch,
      operation: "listing",
      claimHash: "synthetic",
      files: [`listings/2026/10/${unusedBatch}/original/abandoned.webp`],
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });
  await new MediaCleanupService(db, {}, {}).queueUnused();
  assert.equal(
    (await db.uploadBatch.findUnique({ where: { id: batch } })).deletedAt,
    null,
  );
  assert.ok(
    (await db.uploadBatch.findUnique({ where: { id: unusedBatch } })).deletedAt,
  );
  assert.ok(
    await db.outboxEvent.findFirst({
      where: {
        topic: "media.delete",
        payload: { path: ["batchId"], equals: unusedBatch },
      },
    }),
  );
  console.log(
    "PASS: foreign/invalid photo claims and reorder sets are rejected; required-photo removal rolls back; cleanup retains referenced files",
  );

  const contact = new ContactController(db);
  const message = {
    requestKey: randomUUID(),
    name: "Synthetic sender",
    email: "sender@example.invalid",
    subject: "Synthetic support",
    message: "Support message for test only",
  };
  const receipts = await Promise.all([
    contact.accept(message),
    contact.accept(message),
  ]);
  assert.equal(receipts[0].id, receipts[1].id);
  await assert.rejects(
    contact.accept({ ...message, message: "Different support message" }),
    (error) => error.getStatus?.() === 400,
  );
  const report = await service.report(
    priced[0].id,
    { reason: "SPAM", details: "Synthetic test" },
    stranger.id,
  );
  assert.equal(
    (await service.report(priced[0].id, { reason: "SPAM" }, stranger.id))
      .reportId,
    report.reportId,
  );
  const operations = new OperationsController(db);
  assert.ok(
    (await operations.reports("1", "OPEN")).data.some(
      (row) => row.id === report.reportId,
    ),
  );
  await operations.resolve(
    report.reportId,
    { status: "RESOLVED", resolution: "Synthetic review completed" },
    { user: admin },
  );
  assert.ok(
    !(await operations.reports("1", "OPEN")).data.some(
      (row) => row.id === report.reportId,
    ),
  );
  const reportLog = await db.moderationLog.findFirst({
    where: { action: "REPORT_RESOLVED", subjectUserId: stranger.id },
  });
  assert.equal(reportLog.moderatorId, admin.id);
  console.log(
    "PASS: durable support receipts deduplicate and report triage preserves the reporter, actor and resolution",
  );

  const zone = await db.adZone.create({
    data: {
      name: "Synthetic",
      slug: randomUUID(),
      width: 300,
      height: 200,
      placement: "SIDEBAR",
      maxAds: 1,
    },
  });
  const now = Date.now();
  const campaign = (zoneId = zone.id, extra = {}) =>
    db.advertisement.create({
      data: {
        zoneId,
        title: "Synthetic campaign",
        advertiserName: "Synthetic",
        imageUrl: "https://example.invalid/banner.webp",
        targetUrl: "https://example.invalid",
        startsAt: new Date(now - 1000),
        endsAt: new Date(now + 86400000),
        ...extra,
      },
    });
  const bookings = await Promise.allSettled([campaign(), campaign()]);
  assert.equal(
    bookings.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const ad = bookings.find((result) => result.status === "fulfilled").value;
  const otherZone = await db.adZone.create({
    data: {
      name: "Intervals",
      slug: randomUUID(),
      width: 300,
      height: 200,
      placement: "SIDEBAR",
      maxAds: 2,
    },
  });
  await campaign(otherZone.id, {
    startsAt: new Date(now + 10000),
    endsAt: new Date(now + 20000),
  });
  await campaign(otherZone.id, {
    startsAt: new Date(now + 20000),
    endsAt: new Date(now + 30000),
  });
  await campaign(otherZone.id, {
    startsAt: new Date(now + 5000),
    endsAt: new Date(now + 40000),
  });
  await assert.rejects(
    campaign(otherZone.id, {
      startsAt: new Date(now + 15000),
      endsAt: new Date(now + 25000),
    }),
  );
  const ads = new AdsService(db, {});
  await Promise.all(
    Array.from({ length: 3 }, () =>
      ads.trackImpression(
        ad.id,
        { pageUrl: "https://example.invalid/a?q=secret" },
        "192.0.2.7",
      ),
    ),
  );
  await ads.trackClick(ad.id, "192.0.2.7");
  await ads.trackClick(ad.id, "192.0.2.7");
  const totals = await db.adDailyStat.findFirst({ where: { adId: ad.id } });
  assert.equal(totals.impressions, 1);
  assert.equal(totals.clicks, 1);
  assert.equal(totals.uniqueIps, 1);
  assert.equal(
    (await db.adImpression.findFirst({ where: { adId: ad.id } })).pageUrl,
    "/a",
  );
  await db.advertisement.update({
    where: { id: ad.id },
    data: { isActive: false },
  });
  await assert.rejects(
    ads.trackImpression(ad.id, {}, "192.0.2.8"),
    (error) => error.getStatus?.() === 404,
  );
  const past = new Date(now - 9 * 86400000);
  await db.adImpression.create({
    data: { adId: ad.id, ipHash: "legacy", createdAt: past },
  });
  await db.adClick.create({
    data: { adId: ad.id, ipHash: "legacy", createdAt: past },
  });
  const cleanup = new CleanupService(db);
  await cleanup.backfillAndPruneAdEvents();
  const before = await db.adDailyStat.findMany({
    where: { adId: ad.id },
    orderBy: { date: "asc" },
  });
  await cleanup.backfillAndPruneAdEvents();
  assert.deepEqual(
    await db.adDailyStat.findMany({
      where: { adId: ad.id },
      orderBy: { date: "asc" },
    }),
    before,
  );
  console.log(
    "PASS: concurrent inventory booking, adjacent interval capacity, eligible deduplicated ad events and replay-safe raw-event aggregation",
  );

  const companies = new CompaniesController(db);
  const moderator = await user("MODERATOR");
  const company = await companies.create(
    { user: moderator },
    {
      name: "Synthetic company",
      slug: randomUUID(),
      email: "company@example.invalid",
      phone: "+383000000",
    },
  );
  assert.equal(
    (await db.user.findUnique({ where: { id: moderator.id } })).role,
    "MODERATOR",
  );
  await companies.adminUpdate(
    company.id,
    { ownerId: stranger.id },
    { user: admin },
  );
  assert.equal(
    (await db.user.findUnique({ where: { id: moderator.id } })).companyId,
    null,
  );
  assert.equal(
    (await db.user.findUnique({ where: { id: stranger.id } })).companyId,
    company.id,
  );
  await companies.adminDelete(company.id);
  assert.equal(
    (await db.user.findUnique({ where: { id: stranger.id } })).companyId,
    null,
  );
  const cats = new AdminCategoriesService(db);
  await assert.rejects(
    cats.update(category.id, { parentId: category.id }),
    (error) => error.getStatus?.() === 400,
  );
  const blogCategory = await db.blogCategory.create({
    data: { name: "Test", slug: randomUUID() },
  });
  const blog = new BlogController(db);
  const post = await blog.createPost(
    {
      categoryId: blogCategory.id,
      title: "Synthetic post",
      slug: randomUUID(),
      content: "<p>Test</p>",
      excerpt: "old",
      featureImage: "https://example.invalid/old.jpg",
      metaDesc: "old",
    },
    { user: admin },
  );
  await blog.updatePost(post.id, {
    excerpt: null,
    featureImage: null,
    metaDesc: null,
  });
  const cleared = await blog.getAdminPost(post.id);
  assert.equal(cleared.featureImage, null);
  assert.equal(cleared.excerpt, null);
  assert.equal(cleared.metaDesc, null);
  console.log(
    "PASS: company changes preserve staff roles and membership consistency, category self-parent is rejected, and optional blog fields stay cleared",
  );

  const scored = await listing({
    status: "PENDING_REVIEW",
    createdAt: new Date(0),
  });
  await db.moderationLog.create({
    data: { listingId: scored.id, action: "AUTO_SPAM_SCORED", spamScore: 99 },
  });
  await db.moderationLog.create({
    data: { listingId: scored.id, action: "NOTE", spamScore: 0 },
  });
  assert.equal(
    (await adminListings.getModerationQueue(1, 1, "spam")).data[0].id,
    scored.id,
  );
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('oferta.actor_id',${admin.id},true)`;
    await tx.listing.update({
      where: { id: priced[0].id },
      data: { isFeatured: true },
    });
  });
  assert.equal(
    (await db.promotionGrant.findFirst({ where: { listingId: priced[0].id } }))
      .grantedBy,
    admin.id,
  );
  await db.listing.update({
    where: { id: priced[0].id },
    data: { expiresAt: new Date(0), featuredUntil: new Date(0) },
  });
  await new WorkflowsService(db, {}).reconcileLifecycle();
  const expired = await db.listing.findUnique({ where: { id: priced[0].id } });
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.isFeatured, false);
  assert.ok(
    await db.outboxEvent.findFirst({
      where: {
        topic: "listing.expired",
        payload: { path: ["listingId"], equals: expired.id },
      },
    }),
  );
  for (let i = 0; i < 12; i++)
    await db.outboxEvent.create({
      // These jobs must be eligible before either concurrent claim starts.
      data: {
        topic: "test.delivery",
        payload: { i },
        availableAt: new Date(0),
      },
    });
  await db.outboxEvent.create({
    data: {
      topic: "test.delivery",
      payload: { future: true },
      availableAt: new Date("2100-01-01T00:00:00Z"),
    },
  });
  const claims = await Promise.all([
    claimJobs(db, ["test.delivery"]),
    claimJobs(db, ["test.delivery"]),
  ]);
  const jobs = claims.flat();
  assert.equal(jobs.length, 12);
  assert.equal(new Set(jobs.map((job) => job.id)).size, 12);
  assert.equal((await claimJobs(db, ["test.delivery"])).length, 0);
  await finishJob(db, jobs[0], new Error("Synthetic dependency outage"));
  assert.equal(
    (await db.outboxEvent.findUnique({ where: { id: jobs[0].id } }))
      .completedAt,
    null,
  );
  await finishJob(db, jobs[1]);
  assert.ok(
    (await db.outboxEvent.findUnique({ where: { id: jobs[1].id } }))
      .completedAt,
  );
  console.log(
    "PASS: global spam ranking, time-limited audited promotions, expiry outbox events and exclusive/retryable worker claims",
  );
};
