const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");
const {
  WorkflowsService,
} = require("../apps/api/src/workflows/workflows.service.ts");

module.exports = async function (db, category, city) {
  const setting = (key, value) =>
    db.siteSetting.upsert({
      where: { key },
      create: { key, value, group: "test" },
      update: { value },
    });
  const oldLimit = await db.siteSetting.findUnique({
    where: { key: "max_images_per_listing" },
  });
  const identity = randomUUID();
  const owner = await db.user.create({
    data: {
      name: "Legacy image test",
      email: `${identity}@example.invalid`,
      slug: identity,
      passwordHash: "synthetic",
      role: "ADMIN",
      trustScore: 80,
    },
  });
  const image = (i) => ({
    url: `legacy-${i}.jpg`,
    thumbUrl: `legacy-${i}.jpg`,
    mediumUrl: `legacy-${i}.jpg`,
    position: i,
    isPrimary: i === 0,
  });
  // Model records created under an older, larger limit. No checks are disabled.
  await setting("max_images_per_listing", "10");
  const listing = await db.listing.create({
    data: {
      userId: owner.id,
      categoryId: category.id,
      cityId: city.id,
      title: "Legacy photo collection",
      description: "Synthetic legacy photo collection",
      slug: randomUUID(),
      status: "PUBLISHED",
      expiresAt: new Date(Date.now() + 86400000),
      images: { create: Array.from({ length: 10 }, (_, i) => image(i)) },
    },
    include: { images: { orderBy: { position: "asc" } } },
  });
  await setting("max_images_per_listing", "8");
  try {
    const admin = Object.assign(Object.create(AdminListingsService.prototype), {
      prisma: db,
    });
    await admin.update(listing.id, { title: "Edited legacy title" }, owner.id);
    await admin.toggleFeature(listing.id, owner.id);
    await admin.reorderImages(
      listing.id,
      listing.images.map((row) => row.id).reverse(),
      owner.id,
    );
    assert.equal(
      await db.listingImage.count({ where: { listingId: listing.id } }),
      10,
    );
    await admin.deleteImage(listing.id, listing.images[0].id, owner.id);
    assert.equal(
      await db.listingImage.count({ where: { listingId: listing.id } }),
      9,
    );
    await assert.rejects(
      db.listingImage.create({ data: { ...image(20), listingId: listing.id } }),
      /Listing image policy is not satisfied/,
    );
    assert.equal(
      await db.listingImage.count({ where: { listingId: listing.id } }),
      9,
    );
    const donor = await db.listing.create({
      data: {
        userId: owner.id,
        categoryId: category.id,
        cityId: city.id,
        title: "Image move source",
        description: "Synthetic image move source",
        slug: randomUUID(),
        status: "DRAFT",
        expiresAt: new Date(Date.now() + 86400000),
        images: { create: [image(0)] },
      },
      include: { images: true },
    });
    await assert.rejects(
      db.listingImage.update({
        where: { id: donor.images[0].id },
        data: { listingId: listing.id },
      }),
      /Listing image policy is not satisfied/,
    );
    assert.equal(
      (
        await db.listingImage.findUniqueOrThrow({
          where: { id: donor.images[0].id },
        })
      ).listingId,
      donor.id,
    );
    const oversizedSlug = randomUUID();
    await assert.rejects(
      db.listing.create({
        data: {
          userId: owner.id,
          categoryId: category.id,
          cityId: city.id,
          title: "New oversized collection",
          description: "Synthetic new oversized collection",
          slug: oversizedSlug,
          status: "DRAFT",
          expiresAt: new Date(Date.now() + 86400000),
          images: { create: Array.from({ length: 9 }, (_, i) => image(i)) },
        },
      }),
      /Listing image policy is not satisfied/,
    );
    assert.equal(await db.listing.count({ where: { slug: oversizedSlug } }), 0);
    await admin.update(
      listing.id,
      { expiresAt: new Date(0).toISOString() },
      owner.id,
    );
    const deleted = await db.listing.create({
      data: {
        userId: owner.id,
        categoryId: category.id,
        cityId: city.id,
        title: "Previously deleted advertisement",
        description: "Synthetic deleted listing",
        slug: randomUUID(),
        status: "PUBLISHED",
        deletedAt: new Date(),
        expiresAt: new Date(),
      },
    });
    await db.listing.update({
      where: { id: deleted.id },
      data: { expiresAt: new Date(0) },
    });
    await new WorkflowsService(db, {}).reconcileLifecycle();
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: deleted.id } }))
        .status,
      "EXPIRED",
    );
    const deletedEvents = await db.outboxEvent.findMany({
      where: { payload: { path: ["listingId"], equals: deleted.id } },
    });
    assert.ok(deletedEvents.length > 0);
    assert.ok(deletedEvents.every((event) => event.topic === "search.listing"));
    assert.equal(
      await db.outboxEvent.count({
        where: {
          topic: "listing.expired",
          payload: { path: ["listingId"], equals: listing.id },
        },
      }),
      1,
    );
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: listing.id } }))
        .status,
      "EXPIRED",
    );
    assert.equal(
      await db.listingImage.count({ where: { listingId: listing.id } }),
      9,
    );
    // Soft deletion must not provide a route to create an over-limit collection.
    await db.listing.update({
      where: { id: listing.id },
      data: { deletedAt: new Date() },
    });
    await assert.rejects(
      db.listing.update({
        where: { id: listing.id },
        data: { deletedAt: null },
      }),
      /Listing image policy is not satisfied/,
    );
    assert.ok(
      (await db.listing.findUniqueOrThrow({ where: { id: listing.id } }))
        .deletedAt,
    );
    await db.listingImage.delete({ where: { id: listing.images[1].id } });
    await db.listing.update({
      where: { id: listing.id },
      data: { deletedAt: null },
    });
    assert.equal(
      await db.listingImage.count({ where: { listingId: listing.id } }),
      8,
    );
    await assert.rejects(
      db.listingImage.create({ data: { ...image(21), listingId: listing.id } }),
      /Listing image policy is not satisfied/,
    );
    console.log(
      "PASS: legacy photo collections retain images through edits/reorder/expiry and gradual removal, while additions and soft-delete restoration enforce the current limit",
    );
    console.log(
      "PASS: expiry of previously deleted listings synchronizes search without queuing customer notifications; active listings still notify once",
    );
  } finally {
    if (oldLimit) await setting("max_images_per_listing", oldLimit.value);
    else
      await db.siteSetting.delete({ where: { key: "max_images_per_listing" } });
  }
};
