import { serverApiFetch } from "@/lib/server-fetch";
const API = process.env.API_URL ?? "http://localhost:3001/api/v1";
export const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ofertasuksesi.com"
).replace(/\/$/, "");
export async function sitemapData(path: string) {
  const response = await serverApiFetch(`${API}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(`Sitemap dependency failed (${response.status})`);
  return response.json();
}
export function xml(value: unknown) {
  return String(value).replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
}
export function xmlResponse(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
