import { SITE, sitemapData, xml, xmlResponse } from "@/lib/sitemaps";
export const dynamic = "force-dynamic";
export async function GET() {
  const [listings, companies, blog] = await Promise.all([
    sitemapData("/listings/sitemap?page=1"),
    sitemapData("/companies?page=1&limit=100"),
    sitemapData("/blog/posts?page=1&limit=100"),
  ]);
  const paths = ["/sitemaps/static/1"];
  for (const [kind, count] of [
    ["listings", listings.pages],
    ["companies", companies.meta.totalPages],
    ["blog", blog.meta.totalPages],
  ] as [string, number][]) {
    if (!Number.isSafeInteger(count) || count < 0 || count > 49999)
      throw new Error("Invalid sitemap page count");
    for (let page = 1; page <= count; page++)
      paths.push(`/sitemaps/${kind}/${page}`);
  }
  if (paths.length > 50000) throw new Error("Sitemap index limit exceeded");
  return xmlResponse(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<sitemap><loc>${xml(SITE + path)}</loc></sitemap>`).join("")}</sitemapindex>`,
  );
}
