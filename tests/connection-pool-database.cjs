const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
  ListingsService,
} = require("../apps/api/src/listings/listings.service.ts");
const {
  SpamScoringService,
} = require("../apps/api/src/listings/spam-scoring.service.ts");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");

// The caller supplies a client with connection_limit=1. A root-client query
// inside a transaction would need a second connection and fail this check.
module.exports = async function (db, category, city) {
  const identity = randomUUID();
  const owner = await db.user.create({
    data: {
      name: "Pool test",
      email: `${identity}@example.invalid`,
      slug: identity,
      passwordHash: "synthetic",
      trustScore: 80,
      role: "ADMIN",
    },
  });
  const company = await db.company.create({
    data: {
      ownerId: owner.id,
      name: "Pool test",
      slug: randomUUID(),
      email: "pool@example.invalid",
      phone: "+383000000",
    },
  });
  const child = await db.category.create({
    data: {
      name: "Pool child",
      slug: randomUUID(),
      parentId: category.id,
      attributeSchema: {
        fields: [{ name: "size", type: "number", required: true }],
      },
    },
  });
  await db.spamPattern.create({
    data: {
      type: "KEYWORD",
      pattern: identity,
      severity: 2,
    },
  });
  const service = new ListingsService(
    db,
    {
      reserveQuotaOnce: async () => true,
    },
    {},
    new SpamScoringService(db),
  );
  const base = {
    title: `Pool listing ${identity}`,
    description: "Synthetic connection-pool test",
    categoryId: category.id,
    subcategoryId: child.id,
    cityId: city.id,
    attributes: { size: 12 },
    companyId: company.id,
    requestId: randomUUID(),
  };
  const posted = await Promise.all(
    Array.from({ length: 4 }, () => service.create(base, owner.id)),
  );
  assert.equal(new Set(posted.map((row) => row.id)).size, 1);
  assert.equal(posted[0].companyId, company.id);
  assert.equal(posted[0].spamScore, 20);
  const another = await service.create(
    { ...base, requestId: randomUUID() },
    owner.id,
  );
  assert.notEqual(another.slug, posted[0].slug);
  await assert.rejects(
    service.create(
      { ...base, attributes: {}, requestId: randomUUID() },
      owner.id,
    ),
    (error) => error.getStatus?.() === 400,
  );
  await assert.rejects(
    service.create(
      { ...base, companyId: "missing-company", requestId: randomUUID() },
      owner.id,
    ),
    (error) => error.getStatus?.() === 403,
  );
  const { companyId: _company, ...guest } = base;
  const guestDto = {
    ...guest,
    requestId: randomUUID(),
    guestName: "Pool guest",
    guestEmail: "guest@example.invalid",
    guestPhone: "+383000000",
  };
  const guestPosts = await Promise.all(
    Array.from({ length: 4 }, () =>
      service.createGuest(guestDto, "192.0.2.20"),
    ),
  );
  assert.equal(new Set(guestPosts.map((row) => row.id)).size, 1);
  assert.equal(guestPosts[0].spamScore, 20);
  assert.equal(guestPosts[0].guestEmail, guestDto.guestEmail);
  assert.equal(guestPosts[0].status, "PENDING_REVIEW");

  const admin = Object.assign(Object.create(AdminListingsService.prototype), {
    prisma: db,
  });
  const edited = await admin.update(
    posted[0].id,
    { title: "Pool admin edit" },
    owner.id,
  );
  assert.equal(edited.title, "Pool admin edit");
  assert.equal(
    (await admin.toggleFeature(posted[0].id, owner.id)).isFeatured,
    true,
  );
  assert.equal(
    (await admin.toggleUrgent(posted[0].id, owner.id)).isUrgent,
    true,
  );
  const images = await admin.addImages(
    posted[0].id,
    [
      {
        url: "https://example.invalid/pool.jpg",
        thumbUrl: "https://example.invalid/pool-thumb.jpg",
        mediumUrl: "https://example.invalid/pool-medium.jpg",
      },
    ],
    owner.id,
  );
  assert.equal(images.length, 1);
  await admin.deleteImage(posted[0].id, images[0].id, owner.id);
  assert.equal(
    await db.listingImage.count({ where: { listingId: posted[0].id } }),
    0,
  );
  await assert.rejects(
    admin.update("missing-listing", { title: "Missing" }, owner.id),
    (error) => error.getStatus?.() === 404,
  );
  console.log(
    "PASS: concurrent owner/guest posting, real spam scoring, company/category validation and admin edits/promotions/images complete with one database connection",
  );
};
