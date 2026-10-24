import { adminFetch } from "./admin-api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const IMAGES = (
  process.env.NEXT_PUBLIC_IMAGE_URL ?? "http://localhost:4001"
).replace(/\/$/, "");

/** Upload to a new, server-allocated folder using a short-lived, single-use permit. */
export async function uploadImages<T>(
  operation: "listing" | "company-logo" | "company-cover" | "ad-banner",
  files: File[],
  guest?: { turnstileToken: string },
): Promise<T> {
  if (!files.length || files.length > 8)
    throw new Error("Zgjidhni nga 1 deri në 8 foto.");
  const invalid = files.filter(file =>
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024
  );
  if (invalid.length) {
    throw new Error(`Nuk u ngarkua asnjë foto. Kontrolloni ${invalid.map(file => file.name).join(", ")}: lejohen JPG, PNG ose WebP deri në 5 MB për foto.`);
  }
  const body = JSON.stringify({
    operation,
    fileCount: files.length,
    ...(guest ?? {}),
  });
  let permit: { token: string; uploadPath: string; claimToken: string };
  if (guest) {
    const response = await fetch(`${API}/media/guest-upload-permits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message ?? "Verifikimi i ngarkimit dështoi.");
    permit = data;
  } else {
    permit = await adminFetch("/media/upload-permits", undefined, {
      method: "POST",
      body,
    });
  }
  const form = new FormData();
  files.forEach((file) =>
    form.append(operation === "listing" ? "files" : "file", file),
  );
  const response = await fetch(`${IMAGES}${permit.uploadPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${permit.token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message ?? "Ngarkimi i fotos dështoi. Provo sërish.");
  return (
    Array.isArray(data)
      ? data.map((image) => ({ ...image, claimToken: permit.claimToken }))
      : data
  ) as T;
}
