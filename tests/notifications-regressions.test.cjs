const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
require("ts-node").register({
  project: path.resolve(
    __dirname,
    "../apps/notification-service/tsconfig.json",
  ),
  transpileOnly: true,
});
const {
  EventListenerService,
} = require("../apps/notification-service/src/event-listener.service.ts");
const {
  EmailService,
} = require("../apps/notification-service/src/email.service.ts");
const { sealPayload } = require("../apps/api/src/workflows/private-payload.ts");
const {
  openPayload,
} = require("../apps/notification-service/src/private-payload.ts");

test("all optional notification preferences suppress delivery; approval links use the public route", async () => {
  const sent = [];
  let prefs = {};
  const worker = new EventListenerService(
    {
      get: (key, fallback) =>
        key === "NEXT_PUBLIC_APP_URL" ? "https://example.invalid" : fallback,
    },
    { send: async (data) => sent.push(data) },
    {
      user: {
        findUnique: async () => ({
          email: "test@example.invalid",
          deletedAt: null,
          notificationPrefs: prefs,
        }),
      },
      listing: { findUnique: async () => ({ title: "Synthetic" }) },
    },
  );
  const events = [
    "approved",
    "auto_approved",
    "rejected",
    "expired",
    "expiring_soon",
  ];
  for (const event of events) {
    prefs = {
      [`listing_${event === "auto_approved" ? "approved" : event}`]: false,
    };
    await worker.handleEvent(
      `listing.${event}`,
      JSON.stringify({
        userId: "user",
        listingId: "listing",
        title: "Synthetic",
        reason: "Test reason",
        expiresAt: new Date().toISOString(),
      }),
      `event-${event}`,
    );
  }
  assert.equal(sent.length, 0);
  prefs = {};
  await worker.handleEvent(
    "listing.approved",
    JSON.stringify({ userId: "user", listingId: "listing" }),
    "event-approved",
  );
  await worker.handleEvent(
    "listing.auto_approved",
    JSON.stringify({
      userId: "user",
      listingId: "listing",
      title: "Synthetic",
    }),
    "event-auto",
  );
  assert.equal(sent.length, 2);
  for (const email of sent)
    assert.match(email.html, /https:\/\/example.invalid\/shpalljet\/listing/);
});

test("SMTP failure remains retryable; successful event replay does not resend; readiness detects transport failure", async () => {
  const records = new Map();
  let attempts = 0,
    failed = true;
  const email = new EmailService(
    { get: (key, fallback) => (key === "SMTP_USER" ? "synthetic" : fallback) },
    {
      emailLog: {
        findUnique: async ({ where }) => records.get(where.eventId),
        upsert: async ({ where, create, update }) =>
          records.set(
            where.eventId,
            records.has(where.eventId) ? update : create,
          ),
      },
    },
  );
  email.transporter = {
    sendMail: async (data) => {
      attempts++;
      assert.equal(data.messageId, "<delivery@ofertasuksesi.com>");
      if (failed) throw new Error("Synthetic SMTP outage");
    },
    verify: async () => {
      if (failed) throw new Error("Synthetic SMTP outage");
      return true;
    },
  };
  const data = {
    eventId: "delivery",
    to: "test@example.invalid",
    subject: "Test",
    html: "<p>Test</p>",
    template: "test",
  };
  assert.equal(await email.isReady(), false);
  await assert.rejects(email.send(data), /Synthetic SMTP outage/);
  assert.equal(records.get("delivery").status, "FAILED");
  failed = false;
  await email.send(data);
  await email.send(data);
  assert.equal(attempts, 2);
  assert.equal(records.get("delivery").status, "SENT");
  assert.equal(await email.isReady(), true);
});

test("stored reset URLs are encrypted and reject an incorrect decryption key", () => {
  const secret = "synthetic-private-payload-key";
  const payload = {
    resetUrl: "https://example.invalid/reset?token=private-token",
  };
  const sealed = sealPayload(payload, secret);
  assert.ok(!JSON.stringify(sealed).includes("private-token"));
  assert.deepEqual(openPayload(sealed, secret), payload);
  assert.throws(() => openPayload(sealed, "different-secret"));
});
