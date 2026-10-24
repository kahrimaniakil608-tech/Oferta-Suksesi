const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const apiRequire = createRequire(
  path.resolve(__dirname, "../apps/api/package.json"),
);
require("ts-node").register({
  project: path.resolve(__dirname, "../apps/api/tsconfig.json"),
  transpileOnly: true,
});
const { parse } = require("csv-parse/sync");
const { Prisma } = require("@prisma/client");
const { JwtService } = apiRequire("@nestjs/jwt");
const {
  AuthSessionsService,
} = require("../apps/api/src/auth/auth-sessions.service.ts");
const { AuthService } = require("../apps/api/src/auth/auth.service.ts");
const { AuthController } = require("../apps/api/src/auth/auth.controller.ts");
const { JwtStrategy } = require("../apps/api/src/auth/jwt.strategy.ts");
const {
  AdminExportsService,
} = require("../apps/api/src/admin/exports/admin-exports.service.ts");
const {
  csvFile,
  spreadsheetText,
  exportDateRange,
  completedRevenueByCurrency,
} = require("../apps/api/src/admin/exports/export-format.ts");
const {
  refreshSession,
  withSessionLock,
} = require("../apps/web/src/lib/session.ts");
const { adminFetch } = require("../apps/web/src/lib/admin-api.ts");
const config = {
  get: (key) =>
    ({
      JWT_SECRET: "test-only-access",
      JWT_REFRESH_SECRET: "test-only-refresh",
      NODE_ENV: "production",
    })[key],
};
const jwt = new JwtService();
async function readCsv(file) {
  let csv = "";
  for await (const chunk of file.getStream()) csv += chunk.toString();
  return parse(csv, { bom: true, columns: true });
}

test("formula-like strings stay literal after CSV parsing, including controls, fullwidth characters, delimiters and quotes", async () => {
  const inputs = [
    "=1+2",
    "+SUM(1,2)",
    "-1+2",
    "@SUM(A1)",
    "  =1",
    "\t=1",
    "\r=1",
    "\n=1",
    "\u0000=1",
    "\u200b=1",
    "＝1+2",
    "＋1",
    "－1",
    "＠SUM(A1)",
    '=1+2";,=1+2',
  ];
  const rows = await readCsv(
    csvFile(
      ["Value", "Neighbour"],
      inputs.map((Value) => ({ Value, Neighbour: "unchanged" })),
    ),
  );
  assert.equal(rows.length, inputs.length);
  rows.forEach((row, i) => {
    assert.equal(row.Value, `[text] ${inputs[i]}`);
    assert.equal(row.Neighbour, "unchanged");
    assert.equal(/^[=+\-@\t\r\n]/.test(row.Value), false);
  });
  assert.equal(spreadsheetText(-12.5), -12.5);
  assert.equal(spreadsheetText('Oferta ë ç, "quoted"'), 'Oferta ë ç, "quoted"');
});
for (const [method, model, firstHeader] of [
  ["listingsCsv", "listing", "ID"],
  ["usersCsv", "user", "ID"],
  ["revenueCsv", "payment", "ID"],
]) {
  test(`${method} exports an empty result with stable headers`, async () => {
    const service = new AdminExportsService({
      [model]: { findMany: async () => [] },
    });
    const file = await service[method]({});
    let text = "";
    for await (const chunk of file.getStream()) text += chunk.toString();
    assert.ok(text.startsWith(`\uFEFF"${firstHeader}"`));
    assert.ok(
      text.includes(
        method === "listingsCsv"
          ? "Titulli"
          : method === "usersCsv"
            ? "Email"
            : "Valuta",
      ),
    );
    assert.deepEqual(parse(text, { bom: true, columns: true }), []);
  });
}
test("each CSV endpoint sanitizes all untrusted text fields while preserving numeric columns", async () => {
  const date = new Date("2026-10-19T12:00:00Z");
  const service = new AdminExportsService({
    listing: {
      findMany: async () => [
        {
          id: "listing",
          title: "=1",
          category: { name: "+2" },
          city: { name: "@3" },
          status: "PUBLISHED",
          viewsCount: 12,
          contactClicks: 4,
          user: { name: "-4" },
          createdAt: date,
        },
      ],
    },
    user: {
      findMany: async () => [
        {
          id: "user",
          name: "=1",
          email: "+email@example.invalid",
          role: "USER",
          trustScore: -10,
          _count: { listings: 2 },
          createdAt: date,
        },
      ],
    },
    payment: {
      findMany: async () => [
        {
          id: "payment",
          type: "FEATURED",
          amount: new Prisma.Decimal("5.20"),
          currency: "EUR",
          status: "COMPLETED",
          user: { name: "=1" },
          createdAt: date,
        },
      ],
    },
  });
  const [listing] = await readCsv(await service.listingsCsv({}));
  for (const field of ["Titulli", "Kategoria", "Qyteti", "Autori"])
    assert.ok(listing[field].startsWith("[text] "));
  assert.equal(listing.Shikime, "12");
  const [user] = await readCsv(await service.usersCsv({}));
  assert.equal(user.Emri, "[text] =1");
  assert.equal(user.Email, "[text] +email@example.invalid");
  assert.equal(user["Trust Score"], "-10");
  const [payment] = await readCsv(await service.revenueCsv({}));
  assert.equal(payment.Perdoruesi, "[text] =1");
  assert.equal(payment.Shuma, "5.2");
});
test("export dates include the final UTC day and reject invalid or reversed ranges", () => {
  const range = exportDateRange({
    dateFrom: "2026-10-19",
    dateTo: "2026-10-19",
  });
  assert.equal(range.gte.toISOString(), "2026-10-19T00:00:00.000Z");
  assert.equal(range.lt.toISOString(), "2026-10-20T00:00:00.000Z");
  for (const dateTo of [
    "2026-02-30",
    "2026-13-01",
    "nonsense",
    "2026-10-19T12:00:00Z",
  ]) {
    assert.throws(
      () => exportDateRange({ dateTo }),
      (error) => error.getStatus() === 400,
    );
  }
  assert.throws(
    () => exportDateRange({ dateFrom: "2026-10-20", dateTo: "2026-10-19" }),
    (error) => error.getStatus() === 400,
  );
});
test("PDF exports refuse oversized datasets instead of returning a silent partial file", async () => {
  const queries = [];
  const tooMany = async (query) => {
    queries.push(query);
    return Array.from({ length: 10001 }, () => ({}));
  };
  const service = new AdminExportsService({
    listing: { findMany: tooMany },
    user: { findMany: tooMany },
    payment: { findMany: tooMany },
  });
  for (const method of ["listingsPdf", "usersPdf", "revenuePdf"]) {
    await assert.rejects(
      service[method]({ dateTo: "2026-10-19" }),
      (error) => error.getStatus() === 400 && error.message.includes("10,000"),
    );
  }
  assert.ok(
    queries.every(
      (query) =>
        query.take === 10001 &&
        query.where.createdAt.lt.toISOString() === "2026-10-20T00:00:00.000Z",
    ),
  );
});
test("invalid export status, role and category return validation errors before querying the database", async () => {
  const service = new AdminExportsService({});
  await assert.rejects(
    service.listingsCsv({ status: "INVALID" }),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    service.usersCsv({ role: "INVALID" }),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    service.listingsCsv({ categoryId: NaN }),
    (error) => error.getStatus() === 400,
  );
});
test("revenue reports total only completed payments, separately by currency with exact decimal arithmetic", async () => {
  const payments = [
    { amount: "0.10", currency: "EUR", status: "COMPLETED" },
    { amount: "0.20", currency: "EUR", status: "COMPLETED" },
    { amount: "9.99", currency: "USD", status: "COMPLETED" },
    { amount: "100", currency: "EUR", status: "FAILED" },
    { amount: "200", currency: "USD", status: "PENDING" },
  ].map((payment) => ({
    ...payment,
    amount: new Prisma.Decimal(payment.amount),
    type: "FEATURED",
    user: { name: "Test" },
    createdAt: new Date(),
  }));
  assert.deepEqual(completedRevenueByCurrency(payments), [
    { currency: "EUR", amount: "0.30" },
    { currency: "USD", amount: "9.99" },
  ]);
  const service = new AdminExportsService({
    payment: { findMany: async () => payments },
    listing: { count: async () => 0, groupBy: async () => [] },
    user: { count: async () => 0 },
  });
  service.generatePdf = async (title, headers, rows) => ({
    title,
    headers,
    rows,
  });
  const report = await service.revenuePdf({});
  assert.ok(report.title.includes("EUR 0.30; USD 9.99"));
  assert.equal(report.rows[2][2], "USD 9.99");
  assert.equal(report.rows[3][3], "FAILED");
  const weekly = await service.weeklyReportPdf();
  assert.ok(
    weekly.rows.some(
      (row) => row[0] === "Te Ardhura (EUR)" && row[1] === "0.30",
    ),
  );
  assert.ok(
    weekly.rows.some(
      (row) => row[0] === "Te Ardhura (USD)" && row[1] === "9.99",
    ),
  );
});
test("empty revenue PDF generation produces an actual PDF without crashing", async () => {
  const pdf = await new AdminExportsService({
    payment: { findMany: async () => [] },
  }).revenuePdf({});
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});
test("session creation requires active accounts and never stores the raw refresh token", async () => {
  let saved;
  const service = new AuthSessionsService(
    {
      authSession: {
        create: async (args) => {
          saved = args.data;
        },
      },
    },
    jwt,
    config,
  );
  const user = {
    id: "user",
    name: "Test",
    email: "test@example.invalid",
    role: "USER",
    passwordHash: "sensitive",
    authVersion: 0,
    suspendedAt: null,
    deletedAt: null,
  };
  const response = await service.create(user);
  assert.equal(response.user.passwordHash, undefined);
  assert.equal(response.user.authVersion, undefined);
  assert.equal(saved.refreshTokenHash.length, 64);
  assert.notEqual(saved.refreshTokenHash, response.refreshToken);
  assert.equal(jwt.decode(response.accessToken).kind, "access");
  assert.equal(jwt.decode(response.refreshToken).kind, "refresh");
  await assert.rejects(
    service.create({ ...user, suspendedAt: new Date() }),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    service.create({ ...user, deletedAt: new Date() }),
    (error) => error.getStatus() === 401,
  );
});
test("legacy tokens and wrong token kinds cannot enter the new session flow", async () => {
  const service = new AuthSessionsService({}, jwt, config);
  const oldRefresh = jwt.sign(
    { sub: "user" },
    { secret: config.get("JWT_REFRESH_SECRET"), expiresIn: "7d" },
  );
  await assert.rejects(
    service.refresh(oldRefresh),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    service.validateAccess({ sub: "user", iat: Date.now() }),
    (error) => error.getStatus() === 401,
  );
  const wrongKind = jwt.sign(
    {
      sub: "user",
      sid: "00000000-0000-4000-8000-000000000000",
      version: 0,
      kind: "access",
      jti: "test",
    },
    { secret: config.get("JWT_REFRESH_SECRET"), expiresIn: "7d" },
  );
  await assert.rejects(
    service.refresh(wrongKind),
    (error) => error.getStatus() === 401,
  );
});
test("JWT strategy delegates every authorized request to current database session validation", async () => {
  let seen;
  const strategy = new JwtStrategy(config, {
    validateAccess: async (payload) => {
      seen = payload;
      return { id: "user", role: "USER" };
    },
  });
  const payload = { sub: "user", sid: "session", version: 1, kind: "access" };
  assert.equal((await strategy.validate(payload)).id, "user");
  assert.equal(seen, payload);
});
test("malformed reset-token query values fail validation without touching the database", async () => {
  const service = new AuthService({}, {}, config, {});
  for (const token of [
    undefined,
    null,
    "",
    ["one", "two"],
    { token: "value" },
  ]) {
    assert.equal(await service.verifyResetToken(token), false);
  }
});
test("auth cookies stay httpOnly/secure and logout waits for server revocation before reporting success", async () => {
  const calls = [];
  let revoked = false;
  const service = {
    login: async () => ({
      accessToken: "access",
      refreshToken: "refresh",
      user: { id: "user" },
    }),
    logout: async (access, refresh) => {
      assert.equal(access, "access");
      assert.equal(refresh, "refresh");
      revoked = true;
    },
  };
  const response = {
    cookie: (...args) => calls.push(args),
    clearCookie: (...args) => {
      assert.ok(revoked);
      calls.push(args);
    },
  };
  const controller = new AuthController(service, config);
  assert.deepEqual(await controller.login({}, response), {
    user: { id: "user" },
  });
  for (const call of calls) {
    assert.equal(call[2].httpOnly, true);
    assert.equal(call[2].secure, true);
  }
  assert.equal(calls[1][2].path, "/api/v1/auth");
  await controller.logout(
    { cookies: { os_access: "access", os_refresh: "refresh" }, headers: {} },
    response,
  );
  assert.equal(calls.length, 4);
});
test("simultaneous frontend refresh requests share one rotation and detect refreshed cookies", async (t) => {
  let meCalls = 0;
  let rotations = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/users/me")) {
      meCalls++;
      return { ok: rotations > 0, status: rotations > 0 ? 200 : 401 };
    }
    rotations++;
    return { ok: true, status: 200 };
  });
  assert.deepEqual(
    await Promise.all(Array.from({ length: 5 }, () => refreshSession())),
    [true, true, true, true, true],
  );
  assert.equal(rotations, 1);
  assert.equal(meCalls, 1);
  assert.equal(await refreshSession(), true);
  assert.equal(rotations, 1);
});
test("cookie-changing operations wait for an in-flight refresh before login/logout", async () => {
  const events = [];
  let release;
  const first = withSessionLock(async () => {
    events.push("refresh-start");
    await new Promise((resolve) => {
      release = resolve;
    });
    events.push("refresh-end");
  });
  const second = withSessionLock(async () => {
    events.push("logout");
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["refresh-start"]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["refresh-start", "refresh-end", "logout"]);
});
test("refresh-aware API requests retry once using cookies after access expiry", async (t) => {
  let requestCount = 0;
  let rotated = false;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.credentials, "include");
    if (url.endsWith("/auth/refresh")) {
      rotated = true;
      return { ok: true, status: 200 };
    }
    if (url.endsWith("/users/me")) return { ok: false, status: 401 };
    requestCount++;
    return {
      ok: rotated,
      status: rotated ? 200 : 401,
      json: async () => (rotated ? { saved: true } : { message: "Expired" }),
    };
  });
  assert.deepEqual(await adminFetch("/example"), { saved: true });
  assert.equal(requestCount, 2);
});

test("CSV exports stream 12,005 rows in bounded, stable keyset pages", async () => {
  const rows = Array.from({ length: 12005 }, (_, i) => ({
    id: String(20000 - i).padStart(5, "0"),
    title: `Row ${i}`,
    status: "PUBLISHED",
    createdAt: new Date("2026-01-01"),
    viewsCount: 0,
    contactClicks: 0,
  }));
  let calls = 0;
  const service = new AdminExportsService({
    listing: {
      findMany: async (query) => {
        calls++;
        assert.equal(query.take, 1000);
        assert.ok(query.where.AND[0].createdAt.lte instanceof Date);
        const before = query.where.AND[1]?.OR[1].id.lt;
        return rows
          .filter((row) => !before || row.id < before)
          .slice(0, query.take);
      },
    },
  });
  const result = await readCsv(
    await service.listingsCsv({ dateTo: "2026-10-19" }),
  );
  assert.equal(result.length, 12005);
  assert.equal(new Set(result.map((row) => row.ID)).size, 12005);
  assert.equal(calls, 13);
});
