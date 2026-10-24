// Exercises the built web application against a local synthetic API. Never connects to the project's database.
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/6D8AAAAASUVORK5CYII=",
  "base64",
);
const now = new Date().toISOString();
const owner = {
  id: "owner",
  name: "Synthetic Owner",
  email: "owner@example.invalid",
  role: "USER",
  slug: "owner",
  trustScore: 80,
  createdAt: now,
  _count: { listings: 1, favourites: 0 },
};
const category = {
  id: 1,
  name: "Test category",
  slug: "test",
  icon: "test",
  parentId: null,
  children: [],
  attributeSchema: {},
  _count: { listings: 1 },
};
const city = {
  id: 1,
  name: "Test city",
  slug: "test-city",
  _count: { listings: 1 },
};
const images = [1, 2].map((i) => ({
  id: `image-${i}`,
  url: `listings/2026/10/upload-test/original/${i}.webp`,
  thumbUrl: `/uploads/listings/2026/10/upload-test/thumb/${i}.webp`,
  mediumUrl: `/uploads/listings/2026/10/upload-test/medium/${i}.webp`,
  position: i - 1,
  isPrimary: i === 1,
  claimToken: "synthetic-claim",
}));
const listing = {
  id: "listing-test",
  slug: "synthetic-listing",
  title: "Synthetic browser listing",
  description: "A sufficiently long synthetic listing description",
  status: "PUBLISHED",
  userId: owner.id,
  user: owner,
  categoryId: 1,
  category,
  cityId: 1,
  city,
  attributes: { price: 20, phone: "+38344123456" },
  images,
  isFeatured: false,
  isUrgent: false,
  createdAt: now,
  updatedAt: now,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  viewsCount: 3,
  contactClicks: 1,
};
const state = {
  user: null,
  expired: false,
  refreshes: 0,
  failSearch: false,
  failSupport: false,
  failPost: false,
  posts: [],
  impressions: [],
  uploads: 0,
  dashboardFailures: new Set(),
  dashboardRequests: [],
  emptyDashboardUsers: false,
  malformedDashboardUsers: false,
};
let server, app, browser, context, origin;
const log = require.main === module ? fs.openSync("/tmp/oferta-browser-server.log", "w") : undefined;
function response(pathname, method, body, search) {
  if (pathname === "/site-config")
    return [200, { maintenance: false, google_analytics_id: "" }];
  if (pathname === "/ready") return [200, { status: "ready" }];
  if (pathname === "/auth/refresh") {
    state.refreshes++;
    if (!state.user) return [401, {}];
    state.expired = false;
    return [200, { user: state.user }];
  }
  if (pathname === "/auth/login" || pathname === "/auth/register") {
    state.user = owner;
    return [200, { user: owner }];
  }
  if (pathname === "/users/me")
    return state.user && !state.expired
      ? [200, state.user]
      : [401, { message: "Not signed in" }];
  if (pathname === "/users/me/listings/counts")
    return [200, { counts: { PENDING_REVIEW: 1 } }];
  if (pathname.startsWith("/users/me/listings"))
    return [
      200,
      {
        data: [{ ...listing, status: "PENDING_REVIEW" }],
        meta: { total: 1, page: 1, totalPages: 1 },
      },
    ];
  if (pathname.includes("/favourites") && method === "POST") {
    if (state.expired) return [401, {}];
    return [200, { favourited: true }];
  }
  if (pathname.includes("/favourites"))
    return [200, { isFavourite: false, favourited: false }];
  if (pathname === "/categories") return [200, [category]];
  if (pathname === "/categories/test") return [200, category];
  if (pathname === "/cities") return [200, [city]];
  if (pathname.startsWith("/admin/")) {
    state.dashboardRequests.push(pathname);
    if (state.dashboardFailures.has(pathname))
      return [503, { message: "Synthetic dashboard outage" }];
    if (pathname === "/admin/stats")
      return [200, { totalUsers: 3489, totalCompanies: 6, totalListings: 3962,
        publishedListings: 3000, pendingListings: 10, rejectedListings: 2, todayListings: 0 }];
    if (pathname === "/admin/ads/dashboard")
      return [200, { totalActiveCampaigns: 3, impressionsToday: 200, clicksToday: 5, overallCtrToday: 2.5 }];
    if (pathname === "/admin/listings") return [200, { data: [listing] }];
    if (pathname === "/admin/users") return [200, state.malformedDashboardUsers
      ? { data: null } : { data: state.emptyDashboardUsers ? [] : [owner] }];
  }
  if (pathname.startsWith("/ads/zone/"))
    return [
      200,
      {
        zone: { id: "zone", width: 320, height: 50, rotationInterval: 30 },
        ads: pathname.endsWith("/mobile-sticky")
          ? [
              {
                id: "mobile-ad",
                title: "Synthetic mobile ad",
                adType: "IMAGE_BANNER",
                imageUrl: "ads/test/banner.webp",
                targetUrl: "https://example.invalid",
              },
            ]
          : pathname.endsWith("/sidebar-skyscraper-left")
            ? [1, 2].map((i) => ({
                id: `side-ad-${i}`,
                title: `Synthetic sidebar ad ${i}`,
                adType: "IMAGE_BANNER",
                imageUrl: `ads/test/side-${i}.webp`,
                targetUrl: "https://example.invalid",
              }))
            : [],
      },
    ];
  if (pathname.includes("/impression")) {
    state.impressions.push(pathname);
    return [200, { tracked: true }];
  }
  if (
    pathname.includes("/ads/") ||
    pathname.endsWith("/view") ||
    (pathname.startsWith("/listings/") && pathname.endsWith("/contact"))
  )
    return [200, { success: true }];
  if (pathname.endsWith("/report")) {
    if (state.expired) return [401, {}];
    return [200, { reported: true }];
  }
  if (pathname === "/media/upload-permits") {
    state.uploads++;
    return [
      200,
      {
        token: "synthetic-permit",
        claimToken: "synthetic-claim",
        uploadPath: "/images/upload/upload-test",
      },
    ];
  }
  if (pathname === "/listings" && method === "POST") {
    if (state.expired) return [401, {}];
    state.posts.push(body);
    if (state.failPost) {
      state.failPost = false;
      return [503, { message: "Synthetic retryable failure" }];
    }
    return [201, { ...listing, status: "PENDING_REVIEW" }];
  }
  if (pathname === "/listings/sitemap")
    return [
      200,
      { items: [{ slug: listing.slug, updatedAt: now }], pages: 1, total: 1 },
    ];
  if (pathname === "/listings" || pathname === "/search/listings")
    return state.failSearch
      ? [503, { message: "Synthetic search outage" }]
      : [200, { data: [listing], meta: { total: 1, page: 1, totalPages: 1 } }];
  if (pathname.startsWith("/listings/")) return [200, listing];
  if (pathname === "/companies") {
    const rows = [
      {
        id: "company",
        name: "Synthetic company",
        slug: "synthetic",
        isPremium: false,
        isVerified: true,
        _count: { listings: 1 },
        updatedAt: now,
      },
    ];
    return [
      200,
      search.has("page")
        ? {
            data: rows,
            meta: {
              total: 61,
              totalPages: search.get("limit") === "100" ? 1 : 3,
            },
          }
        : rows,
    ];
  }
  if (pathname.startsWith("/blog/posts"))
    return [
      200,
      {
        data: [{ id: "post", slug: "synthetic-post", updatedAt: now }],
        meta: { total: 1, totalPages: 1 },
      },
    ];
  if (pathname === "/blog/categories") return [200, []];
  if (pathname === "/contact")
    return state.failSupport
      ? [503, { message: "Synthetic support outage" }]
      : [201, { accepted: true, id: "message-1" }];
  return [200, []];
}
async function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}
if (require.main === module) (async () => {
  server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const url = new URL(req.url, "http://localhost");
    const body = Buffer.concat(chunks).toString();
    const [status, data] = response(
      url.pathname.replace(/^\/api\/v1/, ""),
      req.method,
      body ? JSON.parse(body) : {},
      url.searchParams,
    );
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  });
  const apiPort = await listen(server);
  const placeholder = http.createServer();
  const webPort = await listen(placeholder);
  await new Promise((resolve) => placeholder.close(resolve));
  origin = `http://127.0.0.1:${webPort}`;
  app = spawn(
    process.execPath,
    [
      webRequire.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(webPort),
    ],
    {
      cwd: path.join(root, "apps/web"),
      env: {
        ...process.env,
        API_URL: `http://127.0.0.1:${apiPort}/api/v1`,
        NODE_ENV: "production",
      },
      stdio: ["ignore", log, log],
    },
  );
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${origin}/api/ready`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
    if (i === 79)
      throw new Error(
        "Web server did not become ready; see /tmp/oferta-browser-server.log",
      );
  }
  const executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname.startsWith("/api/v1/")) {
      if (req.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE",
          },
        });
      const [status, data] = response(
        url.pathname.replace("/api/v1", ""),
        req.method(),
        req.postDataJSON(),
        url.searchParams,
      );
      return route.fulfill({
        status,
        json: data,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }
    if (url.pathname.startsWith("/images/upload/"))
      return route.fulfill({
        status: 201,
        json: images,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      });
    if (url.pathname.startsWith("/uploads/"))
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: png,
      });
    if (url.origin === origin) return route.continue();
    return route.abort(); // No external navigation or network writes.
  });
  const page = await context.newPage();
  const errors = [];
  page.on("requestfailed", (req) => {
    if (
      req.url().startsWith(origin) &&
      !req.url().includes("_next/image") &&
      req.failure()?.errorText !== "net::ERR_ABORTED"
    )
      console.error("Local request failed", req.url(), req.failure());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/posto-shpallje`);
  await expect(page.getByLabel("Titulli *", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Email-i juaj do të shfaqet publikisht", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Titulli *", { exact: true })
    .fill("Draft preserved across login");
  await page
    .getByLabel("Përshkrimi *", { exact: true })
    .fill("A synthetic description preserved while signing into the site.");
  await page.getByRole("link", { name: "Kyçu", exact: true }).click();
  await page.getByLabel("Adresa Email").fill(owner.email);
  await page
    .getByLabel("Fjalëkalimi", { exact: true })
    .fill("SyntheticPassword!");
  await page.getByRole("button", { name: "Hyr në Llogari" }).click();
  await expect(page.getByLabel("Titulli *", { exact: true })).toHaveValue(
    "Draft preserved across login",
  );
  await page.getByLabel("Kategoria *", { exact: true }).selectOption("1");
  await page.getByLabel("Qyteti *", { exact: true }).selectOption("1");
  await page.getByLabel("Numri i telefonit 1").fill("+38344123456");
  await page.locator("input[type=file]").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: png },
    { name: "two.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(
    page.getByRole("button", { name: "Zhvendos foton 2 majtas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zhvendos foton 2 majtas" }).focus();
  await page.keyboard.press("Enter");
  const baselineRefreshes = state.refreshes;
  state.expired = true;
  state.failPost = true;
  await page.locator("button[type=submit]").click();
  await expect(page.getByText("Synthetic retryable failure")).toBeVisible();
  await expect(page.getByLabel("Titulli *", { exact: true })).toHaveValue(
    "Draft preserved across login",
  );
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/paneli/shpalljet?**");
  assert.equal(state.refreshes, baselineRefreshes + 1);
  assert.equal(state.posts.length, 2);
  assert.equal(state.posts[0].requestId, state.posts[1].requestId);
  assert.match(state.posts[1].images[0].url, /2.webp$/);
  console.log(
    "PASS: guest email disclosure, labelled posting form, preserved login draft, keyboard photo ordering, refresh recovery and retry identity",
  );

  await page.goto(`${origin}/kategorite/test?q=retained&view=list`);
  await page.evaluate(() => {
    window.ofertaFilterTrace = [];
    for (const type of ["pointerdown", "pointerup", "click", "change"]) {
      document.addEventListener(type, (event) => {
        if (!event.target.closest("dialog")) return;
        window.ofertaFilterTrace.push({
          type,
          target: event.target.tagName,
          label: event.target.getAttribute("aria-label"),
          text: event.target.innerText?.slice(0, 60),
          value: event.target.value,
          city: document.querySelector('dialog select[aria-label="Qyteti"]')?.value,
        });
      }, true);
    }
    for (const name of ["pushState", "replaceState"]) {
      const original = history[name];
      history[name] = function (...args) {
        window.ofertaFilterTrace.push({ type: name, url: args[2] });
        return original.apply(this, args);
      };
    }
  });
  await expect(page.getByRole("button", { name: "Hap filtrat" })).toBeVisible();
  await page.getByRole("button", { name: "Hap filtrat" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtra" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(
        () => document.activeElement.closest("dialog") !== null,
      ),
      true,
    );
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hap filtrat" })).toBeFocused();
  await page.getByRole("button", { name: "Hap filtrat" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Qyteti", { exact: true })
    .selectOption("test-city");
  await expect(
    page.getByRole("dialog").getByLabel("Qyteti", { exact: true }),
  ).toHaveValue("test-city");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apliko Filtrat" })
    .click();
  try {
    await expect(page).toHaveURL(/city=test-city/, { timeout: 12000 });
  } catch (error) {
    console.error("Filter diagnostics", {
      events: await page.evaluate(() => window.ofertaFilterTrace),
      errors,
      url: page.url(),
      dialogVisible: await dialog.isVisible(),
      body: (await page.locator("body").innerText()).slice(0, 1000),
    });
    throw error;
  }
  const params = new URL(page.url()).searchParams;
  assert.equal(params.get("q"), "retained");
  assert.equal(params.get("view"), "list");
  await expect(
    page.getByRole("button", { name: "Mbyll reklamën" }),
  ).toBeVisible();
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(150);
    const ad = await page
      .getByRole("button", { name: "Mbyll reklamën" })
      .evaluate((el) => {
        const r = el.closest(".fixed").getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
    const nav = await page
      .getByRole("navigation", { name: "Navigimi i poshtëm" })
      .boundingBox();
    const filter = await page
      .getByRole("button", { name: "Hap filtrat" })
      .boundingBox();
    assert.ok(ad.bottom <= nav.y + 1);
    assert.ok(filter.y + filter.height <= ad.top + 1);
  }
  assert.ok(
    !(
      await page.locator("meta[name=viewport]").getAttribute("content")
    ).includes("maximum-scale"),
  );
  await expect
    .poll(
      () =>
        state.impressions.filter((value) => value.includes("/mobile-ad/"))
          .length,
    )
    .toBeGreaterThan(0);
  assert.equal(
    state.impressions.some((value) => value.includes("/side-ad-")),
    false,
  );
  console.log(
    "PASS: native modal keyboard focus/escape/restore, filter URL context, mobile control separation and zoom",
  );

  await page.goto(`${origin}/shpalljet/synthetic-listing`);
  await page.getByRole("button", { name: "Raporto shpalljen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  state.expired = true;
  await page.getByRole("radio", { name: "Spam ose reklamë" }).check();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await expect(page.getByText("Raporti u dërgua!")).toBeVisible();
  assert.equal(state.refreshes, baselineRefreshes + 2);
  console.log(
    "PASS: authenticated report modal recovers expired access and confirms the persisted report",
  );

  state.failSearch = true;
  await page.goto(`${origin}/kerko?q=synthetic`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Kërkimi dështoi" }),
  ).toBeVisible();
  state.failSearch = false;
  await page.getByRole("button", { name: "Provo përsëri" }).click();
  await expect(
    page.getByText(listing.title, { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`${origin}/kompanite?page=3&q=synthetic`);
  await expect(
    page.getByText("Synthetic company", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Faqja 3 / 3")).toBeVisible();
  const index = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.match(index, /sitemapindex/);
  assert.match(index, /sitemaps\/blog\/1/);
  assert.match(
    await (await fetch(`${origin}/sitemaps/blog/1`)).text(),
    /synthetic-post/,
  );
  await page.goto(`${origin}/kontakti`);
  for (const [id, value] of Object.entries({
    name: "Synthetic visitor",
    email: "visitor@example.invalid",
    subject: "Synthetic request",
    message: "A synthetic support message retained for retry.",
  }))
    await page.locator(`#${id}`).fill(value);
  state.failSupport = true;
  await page.locator("button[type=submit]").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Mesazhi nuk u pranua" }),
  ).toBeVisible();
  await expect(page.locator("#message")).toHaveValue(
    "A synthetic support message retained for retry.",
  );
  state.failSupport = false;
  await page.locator("button[type=submit]").click();
  await expect(
    page.getByText("Mesazhi u dërgua!", { exact: true }),
  ).toBeVisible();
  console.log(
    "PASS: support failure retains typed input and retry confirms acceptance",
  );
  state.user = { ...owner, role: "ADMIN" };
  state.dashboardFailures = new Set(["/admin/ads/dashboard", "/admin/users"]);
  await page.goto(`${origin}/admin`);
  const cards = page.getByRole("group", { name: "Statistikat kryesore" });
  await expect(cards.getByRole("link", { name: "Përdorues 3489", exact: true })).toBeVisible();
  await expect(cards.getByRole("link", { name: "Kompani 6", exact: true })).toBeVisible();
  await expect(cards.getByRole("link", { name: "Të Reja Sot 0", exact: true })).toBeVisible();
  await expect(cards.getByRole("link", { name: /Reklama Aktive/ })).toContainText("—");
  await expect(page.getByText(listing.title, { exact: true })).toBeVisible();
  await expect(page.getByText("Nuk ka përdorues.", { exact: true })).toHaveCount(0);
  const usersError = page.getByRole("alert").filter({ hasText: "Përdoruesit nuk u ngarkuan." });
  await expect(usersError).toBeVisible();
  const requestsBeforeRetry = state.dashboardRequests.length;
  state.dashboardFailures.delete("/admin/users");
  await usersError.getByRole("button", { name: "Provo përsëri" }).click();
  await expect(page.getByText(owner.email, { exact: true })).toBeVisible();
  assert.deepEqual(state.dashboardRequests.slice(requestsBeforeRetry), ["/admin/users"]);

  state.dashboardFailures = new Set(["/admin/stats", "/admin/listings"]);
  state.malformedDashboardUsers = true;
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "Statistikat nuk u ngarkuan." })).toBeVisible();
  await expect(cards.getByRole("link", { name: /Përdorues/ })).toContainText("—");
  await expect(cards.getByRole("link", { name: "Reklama Aktive 3", exact: true })).toBeVisible();
  await expect(page.getByText("2.5%", { exact: true })).toBeVisible();
  await expect(page.getByText("Nuk ka shpallje.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Shpalljet nuk u ngarkuan." })).toBeVisible();
  await expect(usersError).toBeVisible();
  state.malformedDashboardUsers = false;
  state.emptyDashboardUsers = true;
  await usersError.getByRole("button", { name: "Provo përsëri" }).click();
  await expect(page.getByText("Nuk ka përdorues.", { exact: true })).toBeVisible();
  state.dashboardFailures.clear();
  await page.getByRole("alert").filter({ hasText: "Statistikat nuk u ngarkuan." })
    .getByRole("button", { name: "Provo përsëri" }).click();
  await page.getByRole("alert").filter({ hasText: "Shpalljet nuk u ngarkuan." })
    .getByRole("button", { name: "Provo përsëri" }).click();
  await expect(cards.getByRole("link", { name: "Përdorues 3489", exact: true })).toBeVisible();
  await expect(page.getByText(listing.title, { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /nuk u ngarkuan/ })).toHaveCount(0);
  console.log("PASS: dashboard partial failures retain healthy sections, retry independently, reject malformed payloads and distinguish unavailable counts from real zeros/empty results");

  state.user = { ...owner, role: "MODERATOR" };
  await page.goto(`${origin}/admin/cilesimet`);
  await expect(
    page.getByText(/Kjo faqe kërkon të drejta administratori/),
  ).toBeVisible();
  console.log(
    "PASS: outage retry, company pagination, blog sitemap inclusion and direct moderator permission feedback",
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`${origin}/kategorite/test`);
  await expect
    .poll(
      () =>
        state.impressions.filter((value) => value.includes("/side-ad-1/"))
          .length,
    )
    .toBeGreaterThan(0);
  assert.equal(
    state.impressions.some((value) => value.includes("/side-ad-2/")),
    false,
  );
  await page.getByRole("button", { name: "Reklama 2", exact: true }).click();
  await expect
    .poll(
      () =>
        state.impressions.filter((value) => value.includes("/side-ad-2/"))
          .length,
    )
    .toBeGreaterThan(0);
  console.log(
    "PASS: hidden ads and inactive carousel slides do not count; visible loaded creatives do",
  );
  assert.deepEqual(errors, []);
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (app) app.kill("SIGTERM");
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.closeSync(log);
  });

module.exports = {response, state, listing, owner, category, city, images, png, now, listen};
