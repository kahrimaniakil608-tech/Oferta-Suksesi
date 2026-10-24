import { SITE, sitemapData, xml, xmlResponse } from "@/lib/sitemaps";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; page: string }> },
) {
  const { kind, page } = await params;
  if (
    !/^[1-9]\d{0,5}$/.test(page) ||
    !["static", "listings", "companies", "blog"].includes(kind) ||
    (kind === "static" && page !== "1")
  )
    return new Response("Not found", { status: 404 });
  let entries: { path: string; updatedAt?: string }[];
  if (kind === "static") {
    const [categories, cities] = await Promise.all([
      sitemapData("/categories"),
      sitemapData("/cities"),
    ]);
    entries = [
      "/",
      "/kerko",
      "/shpallje",
      "/kategorite",
      "/kompanite",
      "/blog",
      "/kontakti",
      "/rreth-nesh",
      "/redaksia",
      "/posto-shpallje",
    ].map((path) => ({ path }));
    entries.push(
      ...categories.map((row: { slug: string }) => ({
        path: `/kategorite/${encodeURIComponent(row.slug)}`,
      })),
      ...cities.map((row: { slug: string }) => ({
        path: `/qytete/${encodeURIComponent(row.slug)}`,
      })),
    );
  } else {
    const data = await sitemapData(
      kind === "listings"
        ? `/listings/sitemap?page=${page}`
        : kind === "companies"
          ? `/companies?page=${page}&limit=100`
          : `/blog/posts?page=${page}&limit=100`,
    );
    const rows = kind === "listings" ? data.items : data.data;
    const pages = kind === "listings" ? data.pages : data.meta.totalPages;
    if (Number(page) > pages) return new Response("Not found", { status: 404 });
    const prefix =
      kind === "listings"
        ? "shpalljet"
        : kind === "companies"
          ? "kompanite"
          : "blog";
    entries = rows.map((row: { slug: string; updatedAt?: string }) => ({
      path: `/${prefix}/${encodeURIComponent(row.slug)}`,
      updatedAt: row.updatedAt,
    }));
  }
  if (entries.length > 50000) throw new Error("Sitemap URL limit exceeded");
  return xmlResponse(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((row) => `<url><loc>${xml(SITE + row.path)}</loc>${row.updatedAt ? `<lastmod>${xml(new Date(row.updatedAt).toISOString())}</lastmod>` : ""}</url>`).join("")}</urlset>`,
  );
}
