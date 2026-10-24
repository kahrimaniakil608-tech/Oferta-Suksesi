const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const apiRequire = createRequire(
  path.resolve(__dirname, "../apps/api/package.json"),
);
const { JwtService } = apiRequire("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const {
  AuthSessionsService,
  tokenHash,
} = require("../apps/api/src/auth/auth-sessions.service.ts");
const { AuthService } = require("../apps/api/src/auth/auth.service.ts");
const {
  UsersController,
} = require("../apps/api/src/users/users.controller.ts");
const {
  AdminUsersService,
} = require("../apps/api/src/admin/users/admin-users.service.ts");
const {
  AdminListingsService,
} = require("../apps/api/src/admin/listings/admin-listings.service.ts");

module.exports = async function runAuthModerationChecks(
  prisma,
  category,
  city,
) {
  const jwt = new JwtService();
  const secrets = {
    JWT_SECRET: "disposable-access-secret",
    JWT_REFRESH_SECRET: "disposable-refresh-secret",
  };
  const config = { get: (key, fallback) => secrets[key] ?? fallback };
  const latestReset = async () => {
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { topic: "user.password_reset" },
      orderBy: { createdAt: "desc" },
    });
    const payload =
      require("../apps/api/src/workflows/private-payload.ts").openPayload(
        event.payload,
        secrets.JWT_SECRET,
      );
    assert.ok(!JSON.stringify(event.payload).includes("resetUrl"));
    return new URL(payload.resetUrl).searchParams.get("token");
  };
  const events = [];
  const redis = {
    publish: async (channel, data) =>
      events.push({ channel, data: JSON.parse(data) }),
  };
  const sessions = new AuthSessionsService(prisma, jwt, config);
  const auth = new AuthService(prisma, sessions, config, redis);
  const adminUsers = Object.create(AdminUsersService.prototype);
  Object.assign(adminUsers, { prisma, redis });
  let sequence = 0;
  const makeUser = async (role = "USER") => {
    const slug = `auth-test-${++sequence}`;
    return prisma.user.create({
      data: {
        name: slug,
        slug,
        email: `${slug}@example.invalid`,
        passwordHash: await bcrypt.hash("OriginalPassword!", 4),
        role,
      },
    });
  };
  const admin = await makeUser("ADMIN");
  const owner = await makeUser();
  const login = () =>
    auth.login({ email: owner.email, password: "OriginalPassword!" });
  const access = (token) =>
    sessions.validateAccess(jwt.verify(token, { secret: secrets.JWT_SECRET }));
  const unauthorized = (error) => error.getStatus?.() === 401;

  const original = await login();
  assert.equal(original.user.passwordHash, undefined);
  assert.equal(original.user.authVersion, undefined);
  assert.equal((await access(original.accessToken)).id, owner.id);
  const stored = await prisma.authSession.findUniqueOrThrow({
    where: { id: jwt.decode(original.refreshToken).sid },
  });
  assert.equal(stored.refreshTokenHash, tokenHash(original.refreshToken));
  const otherDevice = await login();
  const rotated = await auth.refresh(original.refreshToken);
  assert.notEqual(rotated.refreshToken, original.refreshToken);
  assert.equal((await access(rotated.accessToken)).id, owner.id);
  await assert.rejects(auth.refresh(original.refreshToken), unauthorized);
  await assert.rejects(access(rotated.accessToken), unauthorized);
  await assert.rejects(auth.refresh(rotated.refreshToken), unauthorized);
  assert.equal((await access(otherDevice.accessToken)).id, owner.id);
  await auth.logout(otherDevice.accessToken, otherDevice.refreshToken);
  await assert.rejects(access(otherDevice.accessToken), unauthorized);
  await assert.rejects(auth.refresh(otherDevice.refreshToken), unauthorized);
  await assert.rejects(
    sessions.validateAccess({
      sub: owner.id,
      email: owner.email,
      role: "USER",
    }),
    unauthorized,
  );
  console.log(
    "PASS: refresh rotation rejects replay, revokes the reused family, and logout invalidates access/refresh without affecting another device",
  );

  const racing = await login();
  let reads = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const racingSessions = new AuthSessionsService(
    {
      authSession: {
        findUnique: async (args) => {
          const row = await prisma.authSession.findUnique(args);
          if (++reads === 5) release();
          await gate;
          return row;
        },
        updateMany: (args) => prisma.authSession.updateMany(args),
      },
    },
    jwt,
    config,
  );
  const refreshResults = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      racingSessions.refresh(racing.refreshToken),
    ),
  );
  assert.equal(
    refreshResults.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.ok(
    refreshResults
      .filter((result) => result.status === "rejected")
      .every((result) => unauthorized(result.reason)),
  );
  await assert.rejects(
    access(
      refreshResults.find((result) => result.status === "fulfilled").value
        .accessToken,
    ),
    unauthorized,
  );
  console.log(
    "PASS: five synchronized refresh requests have one rotation winner and reuse revokes the family",
  );

  const beforeChange = await login();
  await auth.forgotPassword(owner.email);
  const oldReset = await latestReset();
  assert.equal(await auth.verifyResetToken(oldReset), true);
  await new UsersController(prisma).changePassword(
    { user: { id: owner.id } },
    { currentPassword: "OriginalPassword!", newPassword: "ChangedPassword!" },
  );
  await assert.rejects(access(beforeChange.accessToken), unauthorized);
  await assert.rejects(auth.refresh(beforeChange.refreshToken), unauthorized);
  assert.equal(await auth.verifyResetToken(oldReset), false);
  const afterChange = await auth.login({
    email: owner.email,
    password: "ChangedPassword!",
  });
  await adminUsers.resetPassword(
    owner.id,
    { newPassword: "AdminPassword!" },
    admin.id,
  );
  await assert.rejects(access(afterChange.accessToken), unauthorized);
  await assert.rejects(auth.refresh(afterChange.refreshToken), unauthorized);
  console.log(
    "PASS: self-service and admin password changes immediately revoke old access/refresh/reset tokens",
  );

  const beforeReset = await auth.login({
    email: owner.email,
    password: "AdminPassword!",
  });
  await auth.forgotPassword(owner.email);
  const resetA = await latestReset();
  await auth.forgotPassword(owner.email);
  const resetB = await latestReset();
  const resetRow = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { tokenHash: tokenHash(resetA) },
  });
  assert.notEqual(resetRow.tokenHash, resetA);
  const resetResults = await Promise.allSettled([
    auth.resetPassword(resetA, "ResetPasswordA!"),
    auth.resetPassword(resetB, "ResetPasswordB!"),
  ]);
  assert.equal(
    resetResults.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    resetResults
      .find((result) => result.status === "rejected")
      .reason.getStatus(),
    400,
  );
  await assert.rejects(access(beforeReset.accessToken), unauthorized);
  await assert.rejects(auth.refresh(beforeReset.refreshToken), unauthorized);
  assert.equal(await auth.verifyResetToken(resetA), false);
  assert.equal(await auth.verifyResetToken(resetB), false);
  await assert.rejects(
    auth.resetPassword(resetA, "ReusedPassword!"),
    (error) => error.getStatus() === 400,
  );
  const winningPassword =
    resetResults[0].status === "fulfilled"
      ? "ResetPasswordA!"
      : "ResetPasswordB!";
  const afterReset = await auth.login({
    email: owner.email,
    password: winningPassword,
  });
  console.log(
    "PASS: concurrent password-reset links have one winner; reset tokens are hashed, consumed and invalidated together",
  );

  await adminUsers.suspend(
    owner.id,
    { reason: "Synthetic suspension" },
    admin.id,
  );
  await assert.rejects(access(afterReset.accessToken), unauthorized);
  await assert.rejects(auth.refresh(afterReset.refreshToken), unauthorized);
  await assert.rejects(
    auth.login({ email: owner.email, password: winningPassword }),
    unauthorized,
  );
  await adminUsers.unsuspend(owner.id, admin.id);
  await assert.rejects(auth.refresh(afterReset.refreshToken), unauthorized);
  const restored = await auth.login({
    email: owner.email,
    password: winningPassword,
  });
  await adminUsers.softDelete(owner.id, admin.id);
  await assert.rejects(
    auth.login({ email: owner.email, password: winningPassword }),
    unauthorized,
  );
  await adminUsers.restore(owner.id, admin.id);
  await assert.rejects(access(restored.accessToken), unauthorized);
  console.log(
    "PASS: suspended/deleted accounts cannot authenticate and restore/unsuspend never resurrects old sessions",
  );

  // Force both moderation requests to read their starting version before either transaction begins.
  function moderationService(participants = 1, failPublish = false) {
    const service = Object.create(AdminListingsService.prototype);
    let arrived = 0;
    let unblock;
    const barrier = new Promise((resolve) => {
      unblock = resolve;
    });
    Object.assign(service, {
      prisma,
      redis: {
        publish: async () => {
          if (failPublish) throw new Error("Synthetic Redis outage");
        },
      },
      logger: { warn() {} },
    });
    service.findOrFail = async (id) => {
      const listing = await prisma.listing.findUniqueOrThrow({ where: { id } });
      if (++arrived === participants) unblock();
      await barrier;
      return listing;
    };
    return service;
  }
  async function pending(user, suffix) {
    return prisma.listing.create({
      data: {
        userId: user?.id,
        isGuestListing: !user,
        categoryId: category.id,
        cityId: city.id,
        title: "Synthetic moderation",
        description: "Synthetic moderation test only",
        slug: `moderation-${++sequence}-${suffix}`,
        status: "PENDING_REVIEW",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }
  for (const mode of ["approve", "reject", "conflict", "guest"]) {
    const seller = mode === "guest" ? null : await makeUser();
    const listing = await pending(seller, mode);
    const service = moderationService(2);
    const first = () =>
      mode === "reject"
        ? service.reject(listing.id, { reason: "Synthetic reason" }, admin.id)
        : service.approve(listing.id, admin.id);
    const second = () =>
      mode === "reject" || mode === "conflict"
        ? service.reject(listing.id, { reason: "Synthetic reason" }, admin.id)
        : service.approve(listing.id, admin.id);
    const results = await Promise.allSettled([first(), second()]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
      mode,
    );
    assert.equal(
      results.find((result) => result.status === "rejected").reason.getStatus(),
      409,
      mode,
    );
    assert.equal(
      await prisma.moderationLog.count({
        where: {
          listingId: listing.id,
          action: { in: ["APPROVED", "REJECTED"] },
        },
      }),
      1,
    );
    if (seller) {
      const final = await prisma.listing.findUniqueOrThrow({
        where: { id: listing.id },
      });
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { id: seller.id } }))
          .trustScore,
        final.status === "PUBLISHED" ? 10 : -10,
      );
    }
  }
  console.log(
    "PASS: duplicate approvals/rejections, conflicting decisions and guest approvals commit one decision, one audit and one trust adjustment",
  );

  const firstSeller = await makeUser();
  const [firstA, firstB] = await Promise.all([
    pending(firstSeller, "first-a"),
    pending(firstSeller, "first-b"),
  ]);
  const simultaneous = moderationService(2);
  await Promise.all([
    simultaneous.approve(firstA.id, admin.id),
    simultaneous.approve(firstB.id, admin.id),
  ]);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: firstSeller.id } }))
      .trustScore,
    13,
  );
  const failureListing = await pending(firstSeller, "rollback");
  await assert.rejects(
    moderationService().approve(failureListing.id, "nonexistent-moderator"),
  );
  assert.equal(
    (
      await prisma.listing.findUniqueOrThrow({
        where: { id: failureListing.id },
      })
    ).status,
    "PENDING_REVIEW",
  );
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: firstSeller.id } }))
      .trustScore,
    13,
  );
  await moderationService(1, true).approve(failureListing.id, admin.id);
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: firstSeller.id } }))
      .trustScore,
    16,
  );
  await assert.rejects(
    moderationService().approve(failureListing.id, admin.id),
    (error) => error.getStatus() === 400,
  );
  console.log(
    "PASS: concurrent first approvals award 10 + 3; audit failure rolls back; notification outage does not report a committed decision as failed",
  );
};
