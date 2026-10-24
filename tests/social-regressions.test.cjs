const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
require("ts-node").register({
  project: path.resolve(__dirname, "../apps/api/tsconfig.json"),
  transpileOnly: true,
});
const {
  SocialMediaService,
} = require("../apps/api/src/admin/social/social-media.service.ts");

test("social shares use public absolute image URLs and retain independent platform outcomes", async () => {
  let reference, sentUrl;
  const audit = [];
  const service = new SocialMediaService(
    {
      listing: {
        findUnique: async () => ({
          id: "listing",
          slug: "synthetic",
          title: "Synthetic",
          description: "Synthetic description",
          images: [{ url: reference }],
          category: { slug: "test" },
          city: { name: "Test", slug: "test" },
        }),
      },
      moderationLog: { create: async (row) => audit.push(row.data) },
    },
    {
      get: (key, fallback) =>
        key === "NEXT_PUBLIC_IMAGE_URL"
          ? "https://images.example.invalid"
          : fallback,
    },
    {},
  );
  service.postToFacebook = async (_text, _listingUrl, imageUrl) => {
    sentUrl = imageUrl;
    return { platform: "facebook", success: true };
  };
  service.postToTwitter = async () => {
    throw new Error("Synthetic provider failure");
  };
  for (reference of [
    "listings/2026/10/batch/original/photo.webp",
    "/uploads/listings/2026/10/batch/original/photo.webp",
    "https://images.example.invalid/uploads/listings/2026/10/batch/original/photo.webp",
  ]) {
    const result = await service.publishToSocial(
      "listing",
      ["facebook", "twitter"],
      "admin",
    );
    assert.equal(
      sentUrl,
      "https://images.example.invalid/uploads/listings/2026/10/batch/original/photo.webp",
    );
    assert.equal(result[0].success, true);
    assert.equal(result[1].success, false);
    assert.match(result[1].error, /Synthetic provider failure/);
  }
  assert.equal(audit.length, 6);
});
