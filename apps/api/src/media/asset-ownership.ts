import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
export function assetKey(value: string): string {
  let key = value;
  if (/^https?:\/\//i.test(key)) {
    const url = new URL(key);
    const origin = new URL(
      process.env.NEXT_PUBLIC_IMAGE_URL ??
        process.env.PUBLIC_URL ??
        "http://localhost:4001",
    ).origin;
    if (url.origin !== origin)
      throw new BadRequestException(
        "Image must belong to the configured image service",
      );
    key = url.pathname;
  }
  key = key.replace(/^\/?uploads\//, "");
  if (
    !/^(listings|companies|ads)\/[a-zA-Z0-9_./-]+$/.test(key) ||
    key.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new BadRequestException("Invalid asset reference");
  return key;
}
export async function attachListingImages(
  tx: Prisma.TransactionClient,
  images: {
    url: string;
    thumbUrl: string;
    mediumUrl: string;
    claimToken?: string;
  }[],
  userId: string | null,
  listingId?: string,
  allowExternal = false,
) {
  const current = listingId
    ? await tx.listingImage.findMany({ where: { listingId } })
    : [];
  for (const image of images) {
    if (
      current.some(
        (old) =>
          old.url === image.url &&
          old.thumbUrl === image.thumbUrl &&
          old.mediumUrl === image.mediumUrl,
      )
    )
      continue;
    if (
      allowExternal &&
      [image.url, image.thumbUrl, image.mediumUrl].every((value) =>
        /^https:\/\//.test(value),
      ) &&
      !image.url.includes("/upload-")
    )
      continue;
    const keys = [image.url, image.thumbUrl, image.mediumUrl].map(assetKey);
    const id = keys[0].match(/\/(upload-[a-f0-9-]{36})\//)?.[1];
    if (!id || keys.some((key) => !key.includes(`/${id}/`)))
      throw new ForbiddenException("Upload these images before attaching them");
    const batch = await tx.uploadBatch.findUnique({ where: { id } });
    const owns =
      batch &&
      ((userId && batch.ownerId === userId) ||
        (!batch.ownerId &&
          image.claimToken &&
          createHash("sha256").update(image.claimToken).digest("hex") ===
            batch.claimHash));
    if (
      !owns ||
      batch.deletedAt ||
      batch.operation !== "listing" ||
      !Array.isArray(batch.files) ||
      keys.some((key) => !(batch.files as string[]).includes(key))
    )
      throw new ForbiddenException("Images do not belong to this submission");
    const claimed = await tx.uploadBatch.updateMany({
      where: { id, deletedAt: null },
      data: { attachedAt: new Date(), ...(userId && { ownerId: userId }) },
    });
    if (claimed.count !== 1)
      throw new ForbiddenException("Upload expired. Upload the image again.");
  }
}

export async function attachAsset(
  tx: Prisma.TransactionClient,
  value: string | null | undefined,
  oldValue: string | null | undefined,
  actorId: string,
  operation: string,
) {
  if (!value || value === oldValue) return;
  const key = assetKey(value);
  const id = key.match(/\/(upload-[a-f0-9-]{36})\//)?.[1];
  const batch = id ? await tx.uploadBatch.findUnique({ where: { id } }) : null;
  if (
    !batch ||
    batch.ownerId !== actorId ||
    batch.operation !== operation ||
    batch.deletedAt ||
    !(batch.files as string[]).includes(key)
  )
    throw new ForbiddenException(
      "Upload this image from your account before attaching it",
    );
  await tx.uploadBatch.update({
    where: { id: batch.id },
    data: { attachedAt: new Date() },
  });
}
