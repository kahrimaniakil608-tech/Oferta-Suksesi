# Oferta Suksesi engineering and usability audit

Reviewed on **19 October 2026**, against commit `df03c2bc1fbb3adaaf853dd1eb17829996f018fc` on `main`.

The highest priorities are unsafe listing HTML, unprotected image operations, publication controls, broken posting/search flows, and deletion of payment history. The extended review also found ineffective admin controls, unreliable moderation/report handling, and incorrect advertising/export metrics. Fix the security and data-integrity boundaries before extending features.

This report contains **65 findings**, including **29 added in the extended audit**, covering programming, business logic, reliability, and UI/UX. Each finding includes source locations, a trigger or reproduction scenario, a suggested fix, and an acceptance check. The original audit was read-only. Implementation is complete for the documented findings; the tracker below describes the working-tree changes and verification limits. Public display of guest email is intentional product policy; A08 concerns only contradictory form wording.

## Fix tracker — completed implementation, 19 October 2026

**All 65 documented findings have an implementation, deployed in release `32789dd` on 19 October 2026 with a web listener configuration correction.** Application readiness passes; SMTP authentication remains unavailable and was deferred by the operator. This is not a guarantee that no other defects exist. The original evidence below is retained for traceability and refers to the pre-fix commit. Limits of the supported product and remaining acceptance checks are explicit below and in [the deployment runbook](DEPLOYMENT.md).

| Finding | Status      | Resolution                                                                                                                                                                                                                                           |
| ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01     | Implemented | Escaped JSON-LD serializers keep hostile listing/category/city values inert; rendered injection regression passes.                                                                                                                                   |
| A02     | Implemented | Image mutations require one-use, operation/resource-bound permits. Traversal, symlinks, foreign assets, invalid formats and decoded-size limits are checked. Real upload/replay and small-photo watermark checks pass.                               |
| A03     | Implemented | Public collections reject private statuses; private records use authenticated owner/staff management endpoints.                                                                                                                                      |
| A04     | Implemented | Owner edits/renewal reevaluate moderation and cannot request direct publication. Concurrent changes return conflicts.                                                                                                                                |
| A05     | Implemented | Customer promotion booleans are blocked. Administrative grants record provenance/actor and expire; historical flags receive bounded legacy grants. Payment history uses actual records. Online checkout is intentionally unavailable.                |
| A06     | Implemented | Company associations require ownership. Transfers/deletion/membership changes are transactional and preserve unrelated administrator/moderator roles.                                                                                                |
| A07     | Implemented | Database-backed revocable sessions rotate hashed refresh tokens, reject replay and revoke access on logout, password changes/reset, suspension and deletion. Concurrent database tests pass.                                                         |
| A08     | Implemented | Guest form explicitly discloses public email contact; published guest email and mail links remain available by policy.                                                                                                                               |
| A09     | Implemented | Current published/nondeleted/unexpired rules cover public listings, profiles, companies, favourites, search and sitemaps. Publication-sensitive server data is not cached.                                                                           |
| A10     | Implemented | All tracking/guest/media identities use the controlled client IP. Atomic Redis quotas count submission retries once. Compose isolates ingress; trusted proxy and Cloudflare ranges are explicit; SSR reads use a private signature.                  |
| A11     | Implemented | Type checks, noninteractive lint, regression tests and complete builds run without ignored type errors. CI includes disposable integration/browser checks. Fonts are local so builds do not require Google Fonts access.                             |
| A12     | Implemented | Ports, environment loading, Docker startup/migrations and media service URLs agree. README documents a fresh setup; full migration-chain and real HTTP registration/search/upload tests pass. Bootstrap seeding no longer creates a known password.  |
| A13     | Implemented | Atomic image replacement, removal, reordering and primary selection survive reload, with ownership verification for newly attached files.                                                                                                            |
| A14     | Implemented | Pending submissions show a management receipt; owner edit endpoints and loading/error states work for pending/rejected content. Drafts survive login and retry.                                                                                      |
| A15     | Implemented | Filter Apply passes no React event to the query builder; mobile browser checks verify the resulting URL.                                                                                                                                             |
| A16     | Implemented | Stored numeric prices drive ascending/descending sorting and min/max filters, with missing prices last and stable ID ties. Featured pinning does not override price order.                                                                           |
| A17     | Implemented | Transactional search outbox, retries and hourly repair cover lifecycle/image changes. Workers await Meilisearch tasks; public hits are revalidated against current database visibility.                                                              |
| A18     | Implemented | Minute reconciliation marks overdue listings expired, sends deduplicated reminders and clears expired grants. New publication lifetime starts on approval; public reads enforce expiry even if workers are delayed.                                  |
| A19     | Implemented | Contact submissions persist with idempotent receipts and an admin support inbox. Failures preserve entered text and show a real error.                                                                                                               |
| A20     | Implemented | Approval emails use the actual /shpalljet/:id route under the configured public origin; both templates are regression tested.                                                                                                                        |
| A21     | Implemented | Optional notification preferences are checked at delivery time; unsupported switches are removed. Every offered event preference is covered by a delivery-suppression test.                                                                          |
| A22     | Implemented | Database outbox replaces fire-and-forget delivery for critical work, with leased claims, backoff, terminal failure inspection and retry. Stable submission receipts prevent duplicates. See the runbook for the SMTP crash-window limitation.        |
| A23     | Implemented | Create/guest/edit validate active category relationships and the effective attribute schema; clearing a subcategory persists null.                                                                                                                   |
| A24     | Implemented | Upload batches record claims, owners and exact files. Attachment verifies ownership; cleanup checks live references and removes only detached/abandoned registered assets after a grace period. Unregistered legacy files are deliberately retained. |
| A25     | Implemented | API failures produce error/retry states; requests cancel stale work and validate response shapes. Form mutations check status and retain input. Browser tests cover search/support and dashboard partial failure/retry, unavailable versus zero/empty results, and malformed responses.                                             |
| A26     | Implemented | Filter changes retain search/view context and synchronize controls with URL navigation. Categories/cities come from the API, including homepage, navigation and search choices.                                                                      |
| A27     | Implemented | Posting inputs have associated labels, photos have keyboard reorder/remove controls, native dialogs trap/restore focus and support Escape, and viewport zoom is allowed.                                                                             |
| A28     | Implemented | Measured sticky-ad height feeds shared bottom spacing; filter trigger, ad dismissal and navigation are separated. Chromium checks cover 320/375/390px widths.                                                                                        |
| A29     | Implemented | Protected frontend requests share session refresh and safe return navigation. Posting drafts and retry IDs survive login and recoverable failures. Browser checks exercise posting/report recovery.                                                  |
| A30     | Implemented | Visible client activity records views independently of content GET caching; database event claims deduplicate view/contact events. Management links use valid routes.                                                                                |
| A31     | Implemented | Authentication treats timed suspensions as ended at their deadline; lifecycle reconciliation clears expired suspension fields and badge state. Indefinite suspensions remain explicit.                                                               |
| A32     | Implemented | Editor links use the installed extendMarkRange API; TypeScript/build checks reject the old nonexistent command.                                                                                                                                      |
| A33     | Implemented | Shared query validation rejects repeated/nested, malformed, negative and excessive pagination/ID values; status enums are checked and search filter strings are escaped.                                                                             |
| A34     | Implemented | Search/sidebar results include a slug, with an ID fallback. Current database hydration repairs old index result contracts.                                                                                                                           |
| A35     | Implemented | Turnstile configuration fails closed outside explicit development/test, with bounded verification and recoverable client errors. Guest retry receipts do not consume a second CAPTCHA.                                                               |
| A36     | Implemented | Contact/ad links navigate immediately; tracking uses bounded keepalive requests without blocking navigation.                                                                                                                                         |
| A37     | Implemented | Public CMS list/detail/metadata exclude drafts; authorized management remains separate.                                                                                                                                                              |
| A38     | Implemented | Supported settings control registration, maintenance, moderation/trust thresholds, listing/image limits, expiry and analytics. Unsupported settings are removed from offered controls and rejected on update.                                        |
| A39     | Implemented | CORS permits PUT as required by settings saves.                                                                                                                                                                                                      |
| A40     | Implemented | Blog admin uses server pagination and a guarded direct-ID editor endpoint; older posts remain reachable without downloading the entire archive.                                                                                                      |
| A41     | Implemented | Sitemap index and paginated XML routes cover listings, companies and published blog posts. Dependency failures produce an error instead of an incomplete sitemap.                                                                                    |
| A42     | Implemented | Only the active creative mounts; an impression requires a loaded image, foreground tab and sustained viewport visibility. Offscreen/hidden carousels pause.                                                                                          |
| A43     | Implemented | Ad metrics use consistently recorded raw/daily data; hourly breakdowns are UTC and daily-unique sums are labeled accurately.                                                                                                                         |
| A44     | Implemented | Eligible active/date-valid campaigns use atomic database claims for deduplication and transactional raw/daily event updates.                                                                                                                         |
| A45     | Implemented | Database zone locking and interval-sweep capacity checks protect creation, update, resume and zone-capacity changes, including adjacent nonoverlapping bookings.                                                                                     |
| A46     | Implemented | CSV text neutralizes formula-like values, including whitespace/control/fullwidth variants, before quoting. Numeric columns remain numeric.                                                                                                           |
| A47     | Implemented | Explicit export columns produce valid header-only CSVs for empty datasets; empty PDF checks pass.                                                                                                                                                    |
| A48     | Implemented | Date filtering includes the entire selected final day in UTC; stable exports above 10,000 rows are clearly rejected before download, never silently truncated.                                                                                       |
| A49     | Implemented | Revenue totals include completed payments only and accumulate exact decimal totals separately per actual currency.                                                                                                                                   |
| A50     | Implemented | Category edits reject self-parent, cycles and unsupported nesting before mutation; valid tree structure is retained.                                                                                                                                 |
| A51     | Implemented | Moderation transitions, trust adjustments and audit logs commit together with conflict retries. Concurrent approval/rejection and first-publication tests pass.                                                                                      |
| A52     | Implemented | Audit records identify the affected user separately from the actor. The history endpoint exists; permanent listing deletion detaches and preserves historical logs/snapshots.                                                                        |
| A53     | Implemented | Permanent deletion and empty-trash retain financial records/provider references and original listing identity; injected failures roll back atomically.                                                                                               |
| A54     | Implemented | Image reorder validates an exact unique set of IDs belonging to the target listing, then writes contiguous positions and one primary image atomically.                                                                                               |
| A55     | Implemented | Moderator navigation/actions match backend permissions; directly opening an administrator-only page shows explicit permission feedback.                                                                                                              |
| A56     | Implemented | Suspended/deleted filters and restore/unsuspend controls use canonical backend fields. Restoring an account explains that archived listings stay archived.                                                                                           |
| A57     | Implemented | Social publishing converts stored paths to public absolute image URLs and reports each platform result separately; retry selects failed platforms. Live provider delivery remains a staging check.                                                   |
| A58     | Implemented | Company directory/admin use server pagination and search with totals; records beyond the first 50 remain reachable.                                                                                                                                  |
| A59     | Implemented | Uploaded image banners are the supported advertising format. Unsupported script/embed formats are hidden/rejected and never count as displayed impressions.                                                                                          |
| A60     | Implemented | Raw-event cleanup removes and aggregates uncounted events in one transaction with worker locking; retries preserve exact totals and legacy aggregated rows are not counted again.                                                                    |
| A61     | Implemented | Optional blog fields accept explicit null clearing while omitted fields remain unchanged; database reload tests pass.                                                                                                                                |
| A62     | Implemented | Published-listing reports enter a persistent moderator queue with assignment, resolution, actor and audit history.                                                                                                                                   |
| A63     | Implemented | Spam scores are retained independently of later notes and sorted before pagination. Underperforming campaign ranking considers the full eligible population.                                                                                         |
| A64     | Implemented | Bounded readiness checks distinguish database/Redis failure, search degradation, stale notification polling and SMTP failure from liveness. Real service shutdown tests cover API dependencies.                                                      |
| A65     | Implemented | Cards/galleries/thumbnails share canonical image URL handling and use appropriately sized image variants with a real fallback asset.                                                                                                                 |

### Verification

- `pnpm install --frozen-lockfile`, `prisma generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass locally. The unit/source suite contains 61 tests.
- `pnpm test:http` includes fresh migration-chain/schema comparison, upgrade from the old schema, PostgreSQL concurrency/rollback tests and actual HTTP services backed by disposable PostgreSQL, Redis and Meilisearch. Registration/cookies, upload authorization/replay, a small real image, file serving, submission replay, private management, automatic indexing/withdrawal and logout revocation are covered. A client limited to one connection verifies concurrent owner/guest posting with real spam scoring, company/category checks, and admin edits/promotions/image changes without nested pool acquisition.
- Legacy-photo database regressions exercise editing, promotions, reordering, gradual removal and expiry after a previously larger photo limit is lowered. New oversized collections, additions, moves and soft-delete restoration remain constrained, and failed writes preserve the original records. Expiry of already-deleted listings queues search synchronization without customer notifications; non-deleted listings retain their expiry event.
- `pnpm test:redis` verifies concurrent quota reservations, submission retry deduplication, scoped one-use permissions and permit expiry in an isolated Redis container.
- `pnpm test:browser` exercises the built web application with a synthetic API: posting/login draft retention, photo keyboard ordering, expired-session recovery, failed submission retry, modal focus/Escape/return, filter context, three mobile widths, report submission, search/support failure/retry, independent dashboard failure/retry and response validation, real company/CTR values, company pagination, blog sitemap and moderator permissions.
- A clean Node 20 Docker build passes, including all seven build tasks; the final API image includes the migration SQL. Nginx configuration validates with a disposable certificate.
- Email tests exercise preference suppression, correct links, encrypted reset payloads, failed SMTP retry, sent-event replay suppression and SMTP readiness with a mocked transport. They send no real email.

### Deployment and verification boundaries

The first GitHub run of release `46f58f6` exposed a missed transaction boundary: listing validation, slug lookup, company ownership and spam scoring queried the root Prisma client while already holding a transaction connection. Several administrative listing helpers did the same. A smaller connection pool could therefore stall posting or admin mutations. These helpers now receive the active transaction client; the one-connection integration regression covers the failure independently of the developer machine's CPU/pool size. This follow-up corrects the audited workflow implementation and requires the updated API image before rollout.

Production preflight also found ten listings above the new eight-photo limit. Additional migrations suppress customer notifications for previously soft-deleted listings and preserve oversized photo collections. The image-policy correction preserves their photos and permits edits, reordering, removal and lifecycle transitions; the limit remains enforced for new images and restored listings. Of 1,061 non-deleted published listings, 379 had expired and 682 had future expiry dates. The operator chose to honor the existing dates, so deployment will hide expired listings from public views without deleting their records or photos.

The automated suites use disposable services or temporary directories and send no real email. The subsequent operator-run deployment applied all four October migrations to the live database and switched API, web, image service and notification worker together. All application containers became healthy after correcting the web listener; origin readiness checks passed and the shared proxy's other sites retained their HTTP statuses. See [DEPLOYMENT.md](DEPLOYMENT.md#current-deployment--19-october-2026) for the deployed directory, backup and verification boundaries.

The deployment exposed an additional container configuration gap: Next.js standalone inherited Docker's hostname and accepted container-address requests while rejecting its loopback health probe. Explicit `HOSTNAME=0.0.0.0` and `PORT=3000` restored health in 7.5 seconds. Both Compose and the web image now retain those defaults, with a real-container regression covering loopback/peer access and API failure/recovery. SMTP connection verification separately returned authentication error 535 in 1.569 seconds; the worker's settings match the current configuration. The operator deferred the provider-account investigation. Email delivery and actual browser login remain unverified after cutover.

Production TLS, CDN invalidation, actual proxy identity, Turnstile challenges, SMTP deliverability and social-provider credentials still require checks in the deployed environment. Physical-device/Safari and screen-reader acceptance remain manual. Historical files without authoritative registry records are retained. SMTP has an unavoidable acceptance-versus-commit crash window without provider-level idempotency; the implementation retries durably and deduplicates confirmed sends.

Promotions currently use audited administrative grants and real payment-history display; checkout/provider processing is not offered. Image banners are supported; arbitrary advertiser JavaScript/embeds are not. Exports above 10,000 rows are clearly rejected with a request to narrow filters, which satisfies A48's explicit reject-or-export acceptance criterion.

## Scope and evidence

Reviewed the Next.js web app, NestJS API, image service, notification service, Prisma schema and migration inventory, deployment configuration, and existing verification setup. Coverage includes authentication, listing creation/editing, moderation, reports, search, companies, uploads, notifications, public navigation, CMS/blog publishing, user administration, settings, advertising, social publishing, CSV/PDF exports, cleanup, and health checks.

Evidence labels mean:

- **Reproduced locally:** actual source methods or components were executed with synthetic inputs and mocked dependencies. The HTML injection check used locally rendered React HTML and JSDOM.
- **Confirmed in code:** the relevant request, persistence, and/or rendering paths establish the behavior; no live request was made.
- **Needs browser confirmation:** source establishes a layout conflict, but its visual extent needs device testing.

No production API, customer data, email delivery, payment provider, or destructive image request was exercised. The API, Redis, search, and web services were not running locally during review. UI findings are based on source and isolated rendering, not a full desktop/mobile browser walkthrough. Dependency vulnerability scanning, load testing, and live deployment configuration are outside this report.

## Priority and fix order

| Priority | Count | Meaning                                                                | Findings                                                                        |
| -------- | ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| P0       | 2     | Immediate security exposure                                            | A01, A02                                                                        |
| P1       | 23    | High impact security, privacy, broken core flow, or reliability defect | A03–A07, A09–A11, A13–A15, A17–A19, A22, A34, A35, A37, A38, A46, A51, A53, A62 |
| P2       | 40    | Functional, usability, accessibility, or operational gap               | A08, A12, A16, A20, A21, A23–A33, A36, A39–A45, A47–A50, A52, A54–A61, A63–A65  |

Suggested implementation order:

1. **Security and permanent data loss:** A01–A07, A09, A10, A35, A37, A46, and A53. Add checks around public visibility, ownership, sessions, image access, exported text, and retained payment records.
2. **Moderation and operational control:** A17, A18, A22, A38, A51, A52, A56, A62, and A63. Make settings effective, transitions atomic, reports actionable, and history traceable.
3. **Core user journeys:** A13–A16, A19, A34, A36, A40, A50, A54, A58, A61, and A65. Verify posting, editing, filtering, contacting, media, and discovery against realistic dataset sizes.
4. **Reliable delivery and deployment:** A11, A12, A20–A24, A31, A39, A57, A60, and A64. Restore trustworthy checks, durable delivery, recoverable jobs, and meaningful readiness signals.
5. **Advertising and reporting accuracy:** A41–A45, A47–A49, and A59. Reconcile event definitions, eligibility, aggregates, exports, and content discovery.
6. **Usability and consistency:** A08, A25–A30, A32, A33, and A55. Align guest email wording with the publication policy and complete keyboard, error-state, permissions, navigation, and mobile checks.

For the first fixes, use small changes organized around these dependencies: establish shared visibility/authorization rules before repairing secondary listing surfaces; define canonical image/API contracts before changing forms; define ad event semantics before repairing analytics and cleanup together. A11 should accompany the first implementation batch so checks can detect regressions.

## Security and privacy findings

### A01 Listing structured data permits stored script injection

**P0 · Reproduced locally**

Evidence: [listing structured data](../apps/web/src/app/shpalljet/[slug]/page.tsx#L118), [raw script rendering](../apps/web/src/app/shpalljet/[slug]/page.tsx#L145), [web CSP](../apps/web/src/middleware.ts#L32).

Listing titles and descriptions enter `dangerouslySetInnerHTML` through `JSON.stringify`. JSON serialization does not escape the HTML `</script>` delimiter. A synthetic title containing a closing script tag and a harmless script assigning a window variable executed when the actual page component's rendered HTML was parsed locally. The configured script policy allows inline scripts. A04 also lets ordinary owners publish their content without approval.

**Fix:** use a shared JSON-LD serializer that escapes `<` as `\u003c`, and use it for every structured-data script. Tighten CSP with nonces as a separate defense.

**Acceptance:** hostile titles, descriptions, seller names, and category names remain inert text in every listing/category/city JSON-LD block. No additional executable element appears in rendered HTML.

### A02 Image mutations lack authorization and path containment

**P0 · Confirmed in code; path escape reproduced locally**

Evidence: [image routes](../apps/image-service/src/images/images.controller.ts#L82), [delete route](../apps/image-service/src/images/images.controller.ts#L211), [path construction](../apps/image-service/src/images/images.service.ts#L252), [recursive deletion](../apps/image-service/src/images/images.service.ts#L396), [public image proxy](../nginx.conf#L12).

Upload, social-image generation, and deletion have no authentication or ownership guard. Request-controlled identifiers are joined into filesystem paths without rejecting separators or checking containment. The path helper accepted a synthetic identifier that resolved outside the upload root. The delete handler passes its result to recursive filesystem deletion. Nginx forwards the image subdomain's entire path space to this service.

**Fix:** authorize mutations, issue scoped temporary upload tokens for guests, restrict identifiers, resolve paths beneath a fixed root, and reject any escape. Resolve deletion targets from trusted stored asset records. Add upload quotas and processing limits.

**Acceptance:** unauthenticated deletion and cross-owner mutations fail; encoded traversal and invalid identifiers cannot access paths outside the permitted asset directory. Test destructive cases only inside a disposable temporary directory.

### A03 Public listing enumeration accepts private statuses

**P1 · Reproduced locally**

Evidence: [unguarded collection endpoint](../apps/api/src/listings/listings.controller.ts#L43), [public query DTO](../apps/api/src/listings/dto/listing-query.dto.ts#L47), [status selection](../apps/api/src/listings/listings.service.ts#L69).

An anonymous request to `/api/v1/listings?status=PENDING_REVIEW` selects pending records. The same parameter accepts drafts, rejected, expired, and archived statuses. The result includes listing scalar fields, descriptions, attributes, and guest contact fields. The stricter public detail endpoint does not protect the collection endpoint.

**Fix:** enforce published, visible listings on public collections. Put owner and moderator status filters behind separate authenticated endpoints and explicit response projections.

**Acceptance:** anonymous queries cannot return unpublished listings for any status parameter. Owners see only their private records; moderators use the authorized moderation API.

### A04 Owners can bypass moderation through listing updates

**P1 · Reproduced locally**

Evidence: [update DTO](../apps/api/src/listings/dto/update-listing.dto.ts#L7), [owner update](../apps/api/src/listings/listings.service.ts#L403), [create-time moderation](../apps/api/src/listings/listings.service.ts#L222).

The owner check is followed by direct persistence of any supplied `ListingStatus`. A rejected listing can become published through an ordinary owner PATCH. The update path also skips the trust, posting-status, and spam checks used during creation. Editing already approved content therefore bypasses the content-review decision too.

**Fix:** define allowed transitions by actor and current state. Keep approval/rejection privileges in moderation actions. Reevaluate meaningful content edits and require review when policy demands it. Include visibility and deletion checks in the transition rules.

**Acceptance:** a restricted or low-trust owner cannot publish a rejected/pending listing, including through an intermediate expired state followed by renewal. Moderator approval remains logged and functional.

### A05 Paid promotion is controlled by client booleans

**P1 · Confirmed in code**

Evidence: [priced promotion options](../apps/web/src/app/posto-shpallje/page.tsx#L718), [create persistence](../apps/api/src/listings/listings.service.ts#L258), [guest persistence](../apps/api/src/listings/listings.service.ts#L341), [update persistence](../apps/api/src/listings/listings.service.ts#L417), [payment history placeholder](../apps/web/src/app/paneli/pagesat/page.tsx#L30).

The form advertises paid promotion, including featured placement at 5€ per week, but the API accepts `isFeatured` and `isUrgent` directly from users and guests. There is no payment or entitlement check in these paths, nor an expiry attached to the flags. Payment history always becomes an empty array after fetching the profile.

**Fix:** make promotion a server-managed entitlement with payment/manual-grant provenance and an end date. Remove client authority over these flags. Until payment handling exists, make the offered behavior and price language match what the product supports.

**Acceptance:** an unpaid ordinary request cannot activate promotion. A valid entitlement activates it once, expires on schedule, and appears in real payment history.

### A06 Company associations and ownership changes are insufficiently constrained

**P1 · Reproduced locally**

Evidence: [listing company assignment](../apps/api/src/listings/listings.service.ts#L264), [listing company update](../apps/api/src/listings/listings.service.ts#L415), [shared company DTO](../apps/api/src/companies/companies.controller.ts#L54), [own-company update](../apps/api/src/companies/companies.controller.ts#L164).

Listing creation/editing accepts another company's ID without checking membership. A user can therefore place their listing under an unrelated company. Separately, `PATCH /companies/mine` accepts `ownerId` through the shared DTO and writes it directly, bypassing the membership and role updates in the admin transfer path.

**Fix:** derive or verify listing company membership server-side. Separate owner-editable and administrator DTOs. Implement ownership transfer as a transactional operation with a clear authorization/acceptance rule; preserve unrelated administrative roles.

**Acceptance:** user A cannot attach a listing to company B. Ordinary profile edits cannot transfer ownership. A permitted transfer updates all relevant relations atomically.

### A07 Password reset and logout do not reliably revoke sessions

**P1 · Refresh behavior reproduced locally; reset/logout paths confirmed in code**

Evidence: [refresh implementation](../apps/api/src/auth/auth.service.ts#L140), [self-service reset](../apps/api/src/auth/auth.service.ts#L186), [password change](../apps/api/src/users/users.controller.ts#L74), [access-token revocation check](../apps/api/src/auth/jwt.strategy.ts#L64), [admin revocation](../apps/api/src/admin/users/admin-users.service.ts#L296), [logout](../apps/api/src/auth/auth.controller.ts#L100).

Refresh verifies only the token signature and user existence. It never checks the revocation marker and never consumes the old token. The same old refresh token can obtain new access tokens after an admin reset; their new issue time defeats the access-token timestamp check. Self-service password reset/change writes no revocation marker. Logout only clears browser cookies. Login and refresh also issue tokens for suspended/deleted accounts, although the protected-route strategy subsequently rejects those accounts.

**Fix:** use revocable sessions or token families, validate account state on login/refresh, rotate refresh tokens with reuse detection, and revoke appropriate sessions on password reset/change/logout.

**Acceptance:** tokens captured before a password reset or session revocation cannot refresh or access protected routes afterward. A consumed refresh token cannot be replayed.

### A08 Guest email helper text contradicts the publication policy

**P2 · Confirmed copy mismatch**

Evidence: [guest email helper text](../apps/web/src/app/posto-shpallje/page.tsx#L784), [detail email fallback](../apps/web/src/app/shpalljet/[slug]/page.tsx#L114), [contact rendering](../apps/web/src/components/listings/ContactSection.tsx#L119), [public detail response](../apps/api/src/listings/listings.service.ts#L181).

**Product policy:** guest email addresses are published with the listing so interested people can contact the poster by email. The public email display and mail link implement the intended behavior.

The remaining issue is the guest form's helper text: it says the email is used only to communicate with the team and will not appear publicly, contradicting that policy.

**Fix:** update the helper text to explain public contact, for example: “Email-i juaj do të shfaqet publikisht në shpallje, që të interesuarit t’ju kontaktojnë.” Preserve public guest email display on published listings.

**Acceptance:** before submission, the form clearly explains that the supplied email will be public. After publication, visitors can see it and use the mail link to contact the poster. Unpublished listing visibility remains governed by A03 and A09.

### A09 Soft deletion and visibility rules differ between read paths

**P1 · Confirmed in code**

Evidence: [admin soft delete](../apps/api/src/admin/listings/admin-listings.service.ts#L343), [company listings](../apps/api/src/companies/companies.controller.ts#L116), [favourites](../apps/api/src/users/users.controller.ts#L144), [favourite creation](../apps/api/src/users/users.controller.ts#L184), [listing sitemap](../apps/api/src/listings/listings.service.ts#L586).

Admin soft deletion sets `deletedAt` without changing published status. Company listings and sitemap queries check status but omit `deletedAt`. Favourites return their related listing without visibility restrictions, and adding a favourite does not require a currently public listing. Consequently removed/private records can remain visible through secondary endpoints even when the detail page returns 404.

**Fix:** centralize the public visibility predicate and apply it to collections, companies, favourites, search, and sitemaps. Keep owner/admin access separate. Check visibility before adding a favourite and return an unavailable state for existing favourites.

**Acceptance:** after deletion, rejection, or archival, anonymous and unrelated-user surfaces no longer expose listing content; authorized management screens still work.

### A10 Rate limiting uses inconsistent and untrusted client identities

**P1 · Confirmed in code; deployment impact depends on proxy topology**

Evidence: [global throttling](../apps/api/src/app.module.ts#L29), [API bootstrap](../apps/api/src/main.ts#L8), [guest IP extraction](../apps/api/src/listings/listings.controller.ts#L83), [guest counter](../apps/api/src/listings/listings.service.ts#L310), [proxy forwarding](../nginx.conf#L52).

The installed Nest throttler uses `req.ip`, but bootstrap does not configure trusted proxies. Requests through the supplied proxy can share a proxy-address quota for the same endpoint. Guest posting instead trusts the first raw `X-Forwarded-For` value, while Nginx appends to that header. A caller-controlled value can therefore influence the daily counter. Its read-then-set update also loses increments under concurrency.

**Fix:** define trusted proxy hops/networks and derive a single validated client identity. Prevent public bypass of the trusted ingress. Use atomic Redis counters and expiry. Define appropriate handling for server-rendered/internal requests.

**Acceptance:** different real clients receive independent quotas, spoofed forwarded headers do not reset them, and simultaneous guest submissions cannot exceed the intended daily allowance.

## Programming and deployment findings

### A11 Frontend type errors and broken checks can reach production

**P1 · Confirmed by local commands**

Evidence: [ignored build errors](../apps/web/next.config.ts#L5), [web configuration](../apps/web/tsconfig.json#L1), [base libraries](../tsconfig.base.json#L5), [web scripts and dependencies](../apps/web/package.json#L5), [existing smoke script](../test-admin-api.sh#L5).

The unmodified web type check fails with `TS2688` for `dompurify`. Restricting implicit types exposes the missing DOM libraries inherited from the base configuration. Supplying DOM libraries diagnostically then reveals **22 TypeScript diagnostics**, including the broken filter callback and nonexistent editor command. Next is explicitly configured to ignore type errors.

API ESLint fails because no ESLint configuration exists; web lint requests interactive setup. No automated test suite or tracked CI workflow was found. The shell smoke script still expects JSON `accessToken`, whereas login now returns a user and sets cookies.

**Fix:** repair the dependency/type configuration, remove `ignoreBuildErrors`, configure noninteractive lint, update authentication tests to cookies, and add CI for type checks and high-impact regression cases.

**Acceptance:** clean-install CI fails on a deliberate type error and passes type checks, lint, and the relevant authorization/posting/search tests without prompts.

### A12 Fresh setup and service configuration are not reproducible from the documented steps

**P2 · Confirmed in code and documentation**

Evidence: [setup guide](../README.md#L23), [Docker build](../Dockerfile#L39), [Compose services](../docker-compose.yml#L1), [migration history](../prisma/migrations), [frontend API default](../apps/web/src/lib/api.ts#L1), [API port](../apps/api/src/main.ts#L38), [development reference](../OFERTA-DEV-REFERENCE.md#L8).

Migration SQL exists in the repository, but the documented startup sequence and container commands do not apply it. `prisma generate` creates a client, not database tables. The README's infrastructure command starts the whole Compose file, which also includes production-domain build arguments and TLS certificate mounts. Many frontend clients default to API port 4000 while the API defaults to 3001; image/notification port guidance also differs between documents.

**Fix:** provide explicit local and deployment workflows, a migration deployment step before application readiness, consistent validated environment variables, and a health/readiness checklist. Validate the built image contains the migration assets needed by the chosen workflow.

**Acceptance:** a developer can follow the guide against a disposable empty database and reach working registration, listing search, and uploads without undocumented port or schema repairs.

### A13 Listing image edits are silently discarded

**P1 · Reproduced locally**

Evidence: [edit payload](../apps/web/src/app/posto-shpallje/page.tsx#L466), [update DTO inheritance](../apps/api/src/listings/dto/update-listing.dto.ts#L7), [update persistence](../apps/api/src/listings/listings.service.ts#L407).

The edit UI supports uploading, removing, and reordering photos and sends `images`, but the API update never writes the image relation. Other fields save successfully, making the ignored image changes especially misleading. Removing every image also omits the field entirely, so even a future backend implementation could not distinguish “clear all” from “leave unchanged.”

**Fix:** replace/reconcile images transactionally, preserve ordering and exactly one primary image where appropriate, validate ownership, and send `images: []` for deliberate removal of all photos.

**Acceptance:** add, remove, reorder, change primary, and remove-all operations survive a fresh reload and update listing-card thumbnails.

### A14 Pending listings lead to a 404 after creation and an endless edit loader

**P1 · Confirmed in code**

Evidence: [create moderation decision](../apps/api/src/listings/listings.service.ts#L222), [public-only detail](../apps/api/src/listings/listings.service.ts#L195), [edit loading](../apps/web/src/app/posto-shpallje/page.tsx#L339), [post-submit redirect](../apps/web/src/app/posto-shpallje/page.tsx#L528), [loader condition](../apps/web/src/app/posto-shpallje/page.tsx#L542).

New accounts start below the auto-publish threshold, but successful authenticated posting always redirects to the public detail page. That page rejects pending listings. Editing uses the same public endpoint; its 404 JSON is treated as a listing, leaving title and images empty and the loading condition permanently true. Drafts, rejected, expired, and archived listings have the same editing problem. Guest success copy also overpromises automatic publication after account creation.

**Fix:** add an authenticated owner-detail endpoint, track explicit loading/error states, check `res.ok`, and route by the returned status. Show a moderation receipt with a management link for pending submissions.

**Acceptance:** a new account posts successfully and sees a clear pending state. Its pending/rejected listing can be opened for editing; failed fetches provide retry/navigation instead of an infinite skeleton.

### A15 Applying filters inserts a click event into the URL

**P1 · Reproduced locally**

Evidence: [filter function](../apps/web/src/components/filters/FilterPanel.tsx#L117), [button callback](../apps/web/src/components/filters/FilterPanel.tsx#L308).

`applyFilters` takes an optional subcategory string but is passed directly to `onClick`. React supplies the click event, which is truthy and becomes `subcategory=[object Object]`. Category pages forward that value to the API and can show zero results after otherwise valid filtering. The isolated component check reproduced the incorrect URL.

**Fix:** use `onClick={() => applyFilters()}` or separate the event handler from the filter builder.

**Acceptance:** clicking Apply with no subcategory never adds an object-valued query parameter; selecting a real subcategory preserves its slug on desktop and mobile.

### A16 Price sorting actually sorts by creation date

**P2 · Reproduced locally**

Evidence: [sort implementation](../apps/api/src/listings/listings.service.ts#L147), [visible sort options](../apps/web/src/components/filters/FilterPanel.tsx#L36).

`price_asc` orders by ascending `createdAt`; `price_desc` orders by descending `createdAt`. The UI labels these as low/high price. Users cannot reliably compare offers.

**Fix:** implement numeric price ordering using a normalized price column or a safe database expression. Define placement of missing prices and the interaction with sponsored results. Add a stable tie-breaker for pagination.

**Acceptance:** fixtures priced 100, 20, and 3 sort as 3, 20, 100 regardless of creation dates; null prices and subsequent pages follow a documented consistent rule.

### A17 Moderation and renewal do not keep search in sync

**P1 · Confirmed in code**

Evidence: [owner indexing](../apps/api/src/listings/listings.service.ts#L424), [admin approval/rejection](../apps/api/src/admin/listings/admin-listings.service.ts#L387), [admin deletion](../apps/api/src/admin/listings/admin-listings.service.ts#L343), [renewal](../apps/api/src/listings/listings.service.ts#L496), [notification subscriptions](../apps/notification-service/src/event-listener.service.ts#L9), [search service](../apps/api/src/search/search.service.ts#L45).

Owner creation/update/archive touches Meilisearch. Admin creation, approval, rejection, deletion, restoration, and user suspension do not perform equivalent index updates. No search consumer handles their published events. Renewal also returns without reindexing. Newly approved listings can be absent from autocomplete, while removed or rejected entries retain searchable title/description data until a full sync.

**Fix:** funnel all listing visibility/content changes through one lifecycle service and a retryable indexing job. Reconcile periodically and observe indexing failures instead of swallowing them.

**Acceptance:** create, approve, edit, reject, suspend, delete, restore, and renew each produce the expected search visibility and content without a manual full sync.

### A18 Listing expiry is stored but not enforced

**P1 · Expired timestamp behavior reproduced locally; missing lifecycle confirmed in code**

Evidence: [expiry assignment](../apps/api/src/listings/listings.service.ts#L248), [public collection](../apps/api/src/listings/listings.service.ts#L69), [public detail](../apps/api/src/listings/listings.service.ts#L181), [cleanup tasks](../apps/api/src/cleanup/cleanup.service.ts#L21), [expiry email consumers](../apps/notification-service/src/event-listener.service.ts#L75).

Listings receive `expiresAt`, but public reads do not filter it, and the available scheduled jobs do not transition overdue listings to `EXPIRED`. Expiry/reminder event handlers exist without a producer. A published record with a timestamp in the distant past is still returned by the actual detail method.

**Fix:** enforce visibility using time as well as status; add idempotent expiry/reminder jobs and search removal. Define the listing's publication period relative to approval, and make renewal a permitted, atomic transition.

**Acceptance:** an overdue listing disappears even if the scheduler is delayed, is eventually marked expired, receives at most one intended notification, and returns correctly after an authorized renewal.

## Communication and data integrity findings

### A19 The contact form reports delivery without sending anything

**P1 · Confirmed in code**

Evidence: [contact submission](../apps/web/src/app/kontakti/page.tsx#L81).

Submission waits 1.2 seconds and sets the state to `sent`. There is no API call, persistence, or delivery. Support requests and business inquiries entered into the form are lost while users believe the team received them.

**Fix:** connect a validated contact endpoint to durable delivery/storage and show success only after acceptance. Until then, replace the form with a clearly labeled working contact method.

**Acceptance:** a synthetic submission creates a traceable message once; a delivery/acceptance failure shows an error and retains the user's text.

### A20 Approval emails link to a nonexistent route

**P2 · Confirmed in code**

Evidence: [automatic approval link](../apps/notification-service/src/event-listener.service.ts#L113), [moderator approval link](../apps/notification-service/src/event-listener.service.ts#L134), [actual detail route](../apps/web/src/app/shpalljet/[slug]/page.tsx#L17).

Emails link to `/shpallje/{id}`. The detail route is `/shpalljet/{slug}`, with ID fallback supported by the API. `/shpallje` is a collection page and has no matching detail child route.

**Fix:** share route builders or an explicit canonical listing URL in the event payload. Prefer the slug and preserve backward compatibility for previously issued links where practical.

**Acceptance:** both approval templates open the approved listing directly from the configured application origin.

### A21 Notification preferences are saved but ignored during delivery

**P2 · Confirmed in code**

Evidence: [preference UI](../apps/web/src/app/paneli/cilesimet/page.tsx#L8), [unconditional saved indicator](../apps/web/src/app/paneli/cilesimet/page.tsx#L82), [preference persistence](../apps/api/src/users/users.controller.ts#L278), [email event handlers](../apps/notification-service/src/event-listener.service.ts#L125).

The worker selects email addresses without reading `notificationPrefs`, so disabling approval/rejection emails does not affect those sends. The UI also displays “saved” after any resolved fetch, including HTTP errors. A featured-notification preference is offered without a corresponding worker subscription.

**Fix:** enforce supported preferences before optional notifications, validate preference keys, and acknowledge successful saves only after `res.ok`. Keep essential account-security email rules explicit and separate.

**Acceptance:** disabled optional event emails are not sent; failed preference writes show an error; every offered toggle has an observable supported effect.

### A22 Critical events have no durable delivery or retry boundary

**P1 · Confirmed in code**

Evidence: [password-reset publication](../apps/api/src/auth/auth.service.ts#L165), [listing commit then publish](../apps/api/src/listings/listings.service.ts#L258), [Redis publish](../apps/api/src/redis/redis.service.ts#L28), [subscriber](../apps/notification-service/src/event-listener.service.ts#L39), [email failure handling](../apps/notification-service/src/email.service.ts#L64).

Password-reset and listing events use Redis Pub/Sub. A disconnected subscriber misses the message; SMTP failure is logged without a retry job. In listing creation, a database write precedes an awaited publish, so a publish failure can return an error after the listing was saved. User retries can create duplicates, and a password-reset success response does not establish that delivery was queued durably.

**Fix:** persist an outbox event with the database change, deliver through a durable queue with retry/deduplication, and use idempotency for submissions. Expose failed delivery to operations without disclosing account existence.

**Acceptance:** stop the worker, submit, restart it, and verify eventual single delivery. Simulate a queue outage and retry without duplicate listings. Exercise SMTP retry and terminal failure handling.

### A23 Category and attribute rules differ between creation and editing

**P2 · Confirmed in code**

Evidence: [create validation](../apps/api/src/listings/listings.service.ts#L208), [guest validation](../apps/api/src/listings/listings.service.ts#L319), [update fields](../apps/api/src/listings/listings.service.ts#L403), [frontend schema choice](../apps/web/src/app/posto-shpallje/page.tsx#L389), [subcategory field](../apps/web/src/app/posto-shpallje/page.tsx#L608).

Creation validates only the parent category schema; the UI prefers the subcategory schema. Neither create path checks that the subcategory belongs to the parent or that the chosen category is active. Editing skips attribute validation entirely. Clearing a subcategory omits the field instead of clearing the stored relation. The form labels subcategory as required but does not enforce that requirement consistently.

**Fix:** resolve category/subcategory relationships and the effective schema in one shared server path for create and update. Validate merged update state, define clearing semantics, and align UI required fields and error messages.

**Acceptance:** mismatched/inactive categories fail cleanly, subcategory-specific rules are enforced, clearing a subcategory persists, and invalid edits cannot bypass rules enforced on creation.

### A24 Uploaded image storage has no complete ownership and cleanup lifecycle

**P2 · Confirmed in code**

Evidence: [temporary upload ID](../apps/web/src/app/posto-shpallje/page.tsx#L311), [upload request](../apps/web/src/app/posto-shpallje/page.tsx#L405), [date-derived directory](../apps/image-service/src/images/images.service.ts#L252), [deletion lookup](../apps/image-service/src/images/images.service.ts#L396), [database-only permanent deletion](../apps/api/src/listings/listings.service.ts#L471), [admin photo removal](../apps/api/src/admin/listings/admin-listings.service.ts#L666).

Photos upload under a temporary ID, but listing persistence does not finalize or register that storage ownership. Image deletion reconstructs a path using the current month, so it cannot reliably locate older assets or temporary-ID folders from the listing ID. Database image/listing deletion does not remove stored files, and abandoned uploads have no cleanup path.

**Fix:** store authoritative asset keys, uploader/temporary-token ownership, and attachment state. Finalize assets when the listing is saved; remove detached assets after a safe grace period. Delete by stored keys, not the current date.

**Acceptance:** upload in one month and delete in another; cancel a draft; remove a photo; delete a listing. Each case cleans only the intended unreferenced assets.

## UI and UX findings

### A25 API failures are confused with empty results or leave unsafe UI state

**P2 · Confirmed in code**

Evidence: [server collection fallback](../apps/web/src/lib/api.ts#L61), [server detail fallback](../apps/web/src/lib/api.ts#L127), [client search request](../apps/web/src/app/kerko/page.tsx#L63), [autocomplete requests](../apps/web/src/components/search/SearchAutocomplete.tsx#L41).

Server helpers convert service errors into empty results or `null`, making an outage look like “no listings” or a missing page. Client search does not check `res.ok` or handle rejection; an API error object can set listings to `undefined` before accessing missing metadata. Search/autocomplete requests have no cancellation or sequence guard, so an older response can replace newer results.

**Deployment follow-up, 19 October:** the initial implementation missed the [admin dashboard](../apps/web/src/app/admin/page.tsx). Its `Promise.all` discarded successful core responses when another core request failed, then displayed zero counts and empty lists. The ad request alone was already caught, so an ad failure alone did not explain the entire empty dashboard. Live PostgreSQL checks found 3,489 users, 3,962 listings and six companies while Redis refused connections. The deployed authentication strategy awaited Redis on every protected request; restoring Redis restored the dashboard, confirmed by the operator. The local follow-up loads sections independently, validates responses, aborts stale/timed-out requests, shows unavailable counts as dashes and offers section-specific retry. It also replaces the hardcoded company zero with a database count, removes invented growth percentages and reads the API's actual `overallCtrToday` field. See the [incident notes](DEPLOYMENT.md#19-october-2026-live-dashboard-incident) for the recovery evidence and remaining operational work.

**Fix:** distinguish empty, unavailable, unauthorized, and not-found states. Check status and response shape, retain useful prior content during transient failure, and add cancellation/request sequencing and retry controls.

**Acceptance:** test API 500, 429, malformed JSON, offline mode, and out-of-order search responses. The app stays usable and never labels a service outage as a genuine zero-result search.

### A26 Filter state loses context and can disagree with the URL

**P2 · Confirmed in code**

Evidence: [filter initialization](../apps/web/src/components/filters/FilterPanel.tsx#L54), [query rebuilding](../apps/web/src/components/filters/FilterPanel.tsx#L117), [search state initialization](../apps/web/src/app/kerko/page.tsx#L33), [static search options](../apps/web/src/app/kerko/page.tsx#L149), [city route filter](../apps/web/src/app/qytete/[slug]/page.tsx#L48).

Filters are initialized into local state without syncing later URL changes. Back/forward navigation can show controls that disagree with the actual result query. Apply rebuilds the query from scratch, dropping search text, category, and view parameters on the general listings page. A city page renders an editable city filter even though its query always uses the city in the path. Several selectors use hard-coded constants despite categories/cities being editable in the admin.

**Fix:** define one URL filter schema, preserve unrelated supported parameters, synchronize controls, and use canonical API options. Make location controls either navigate to the selected location or remain fixed on location-specific pages.

**Acceptance:** search, refine, change city, paginate, and use Back/Forward; controls, URL, and results agree throughout and newly added categories/cities are selectable.

### A27 Core forms and overlays have accessibility gaps

**P2 · Confirmed in code**

Evidence: [viewport zoom cap](../apps/web/src/app/layout.tsx#L22), [unassociated form labels](../apps/web/src/app/posto-shpallje/page.tsx#L846), [upload controls](../apps/web/src/app/posto-shpallje/page.tsx#L127), [report dialog](../apps/web/src/components/listings/ReportModal.tsx#L52), [mobile filter dialog](../apps/web/src/components/filters/FilterPanel.tsx#L365), [preference toggles](../apps/web/src/app/paneli/cilesimet/page.tsx#L189).

The viewport specifies `maximumScale: 1`. Posting labels are not associated with their sibling controls. The initial upload drop zone is a clickable `div` without keyboard activation, and photo reordering has no keyboard alternative. Dialogs have ARIA roles but no focus entry, focus containment, Escape handling, or focus restoration. Preference switches have no accessible name/state.

**Fix:** permit zoom, associate labels and errors, use native buttons for interactive upload controls, provide move-left/right or move-up/down actions, and use a shared accessible dialog implementation. Give switches labels and checked semantics.

**Acceptance:** complete posting, photo ordering, reporting, and filtering using only a keyboard and then a screen reader. Verify focus behavior and readable zoomed layouts.

### A28 Mobile ads and floating controls occupy the same screen area

**P2 · Needs browser confirmation**

Evidence: [mobile ad positioning](../apps/web/src/components/ads/MobileStickyAd.tsx#L51), [filter button positioning](../apps/web/src/components/filters/FilterPanel.tsx#L349), [bottom navigation](../apps/web/src/components/layout/BottomNav.tsx#L39), [page bottom spacing](../apps/web/src/app/layout.tsx#L55).

The ad starts 64px above the bottom and contains a 50px creative plus label/padding. The floating filter button starts at 84px, placing it in the same vertical region; both use z-index 40. The main layout reserves 80px total bottom padding, while navigation plus a visible ad consumes more. There is no coordinated safe-area/inset calculation.

**Fix:** define shared bottom offsets and reserve space for the actual visible navigation/ad height. Keep filters and other actions above ads, and account for device safe-area insets.

**Acceptance:** at 320, 375, and 390px widths, with ads on/off and browser text zoom, the filter trigger, final content, ad dismiss button, and bottom navigation remain visible and operable.

### A29 Authentication recovery and return navigation are inconsistent

**P2 · Confirmed in code**

Evidence: [auth hydration](../apps/web/src/contexts/AuthContext.tsx#L33), [admin refresh retry](../apps/web/src/lib/admin-api.ts#L35), [ordinary posting fetch](../apps/web/src/app/posto-shpallje/page.tsx#L517), [favourite handling](../apps/web/src/components/listings/FavouriteButton.tsx#L27), [report form](../apps/web/src/components/listings/ReportModal.tsx#L28), [registration redirect](../apps/web/src/app/auth/regjistrohu/page.tsx#L41).

Admin requests retry after refreshing an expired access cookie, but ordinary user actions generally do not. A tab can still show a signed-in user while posting or favouriting fails after expiry. Favourites ignore error statuses and redirect guests to login without a return path. Reporting invites guests to complete a form before the authenticated API rejects them. Registration ignores the `redirect` parameter supplied by the posting page.

**Fix:** share one authenticated request client, retain form state across recovery, provide safe return navigation, and make authentication requirements visible before input-heavy actions.

**Acceptance:** expire the access cookie while leaving refresh valid; posting, editing, favouriting, and reporting recover once. Guests return to the intended action after login/registration without losing their input.

### A30 Listing analytics do not represent actual visitor activity

**P2 · Confirmed in code**

Evidence: [views increment on GET](../apps/api/src/listings/listings.service.ts#L199), [cached detail fetch](../apps/web/src/lib/api.ts#L129), [contact counting](../apps/api/src/listings/listings.service.ts#L562), [analytics projection](../apps/api/src/users/users.controller.ts#L302), [analytics detail link](../apps/web/src/app/paneli/analitika/page.tsx#L121).

Views increment when the API detail method runs, while Next caches its response for 60 seconds. Multiple visitors can share one increment; direct API reads or non-user fetches can add increments. Contacts are counted without deduplication. Separately, the analytics endpoint omits `slug` from its explicit selection, but the UI builds detail links from it, producing `/shpalljet/undefined`.

**Fix:** define what constitutes a view/contact, track events independently of content fetching with bounded deduplication, and include the route identifier in the analytics response.

**Acceptance:** controlled visits under cache hits and misses follow the same metric rule, repeated contact events respect the chosen policy, and every analytics link opens its listing or management view.

### A31 Temporary suspensions do not end at the chosen time

**P2 · Confirmed in code**

Evidence: [suspension duration](../apps/api/src/admin/users/admin-users.service.ts#L373), [authentication rejection](../apps/api/src/auth/jwt.strategy.ts#L45), [manual unsuspend](../apps/api/src/admin/users/admin-users.service.ts#L420), [scheduled cleanup](../apps/api/src/cleanup/cleanup.service.ts#L21).

Suspension stores `suspendedUntil`, but authentication rejects any non-null `suspendedAt` and does not even select the expiry. No available scheduled task clears elapsed suspensions. A one-day suspension behaves as indefinite until manually removed.

**Fix:** compute active suspension from both fields and reconcile expired suspension state/badges. Keep listing restoration policy explicit instead of automatically republishing archived content.

**Acceptance:** a timed suspension blocks before expiry and permits normal authentication after expiry; an indefinite suspension remains active until an authorized unsuspend.

### A32 The rich text editor calls a nonexistent link command

**P2 · Confirmed by code and installed type declarations**

Evidence: [insert-link handler](../apps/web/src/components/editor/TiptapEditor.tsx#L42), [link UI](../apps/web/src/components/editor/TiptapEditor.tsx#L129).

`editor.chain().focus().extendMarkToUrl()` is not a command provided by the configured Tiptap extensions. TypeScript reports it, but ignored build errors allow the handler to ship. Clicking the link insertion action will fail at this call.

**Fix:** use the supported link mark-range command, handle the editor lifecycle safely, and validate URL protocols.

**Acceptance:** insert a new link, edit an existing link, and remove it; save and reload the article without console errors or unsafe protocols.

### A33 Several API query parameters bypass validation and bounds

**P2 · Confirmed in code**

Evidence: [public profile pagination](../apps/api/src/users/public-users.controller.ts#L13), [user listing pagination/status](../apps/api/src/users/users.controller.ts#L110), [search query parsing](../apps/api/src/search/search.controller.ts#L32), [search filter interpolation](../apps/api/src/search/search.service.ts#L97), [company limit](../apps/api/src/companies/companies.controller.ts#L78).

Several endpoints parse raw strings without integer/range checks, unlike the main listing query DTO. Negative, nonnumeric, or very large values can reach Prisma/search and produce server errors or unnecessarily large responses. Search category/city values are interpolated into filter expressions without escaping, so quotes can alter or invalidate the expression.

**Fix:** use validated shared query DTOs with finite bounded integers and supported enums. Escape filter literals using a deliberate serializer or accept canonical identifiers. Translate invalid inputs into consistent 400 responses.

**Acceptance:** negative, zero, NaN-like, huge, repeated, and quote-containing parameters produce bounded valid responses or clear 400 errors; they never change filter semantics unexpectedly.

### A34 Sidebar search suggestions link to undefined

**P1 · Confirmed in code**

Evidence: [Meilisearch document shape](../apps/api/src/search/search.service.ts#L59), [sidebar result mapping](../apps/web/src/components/filters/FilterPanel.tsx#L80), [sidebar result link](../apps/web/src/components/filters/FilterPanel.tsx#L174).

The sidebar's successful Meilisearch mapping omits `slug`, then builds links using `hit.slug`. The backend indexed document also omits it. Suggestions therefore point to `/shpalljet/undefined` when search is healthy. The fallback API path supplies a slug, which can hide the defect during search-service outages. The main autocomplete already has an ID fallback.

**Fix:** include slug in the indexed contract and mapping, and use a safe ID fallback during index migration. Reindex existing documents.

**Acceptance:** open a sidebar suggestion with Meilisearch available, then with the fallback path active; both open the same listing.

### A35 Missing anti-bot configuration silently disables server verification

**P1 · Confirmed in code; conditional on missing configuration**

Evidence: [guard fallback](../apps/api/src/common/guards/turnstile.guard.ts#L21), [guest widget](../apps/web/src/app/posto-shpallje/page.tsx#L790), [registration token requirement](../apps/web/src/app/auth/regjistrohu/page.tsx#L33).

The guard's comment describes a development exception, but its implementation skips verification whenever the secret is absent, including production. Meanwhile the frontend requires a token and uses a non-null assertion for the site key. Misconfiguration can simultaneously block normal browser users and leave direct API callers without anti-bot verification.

**Fix:** validate required production configuration at startup, permit bypass only in explicit development/test modes, and provide a recoverable widget failure state. Add a timeout and controlled failure handling to verification requests.

**Acceptance:** production cannot become ready with missing required keys; development behavior is intentional; unavailable/expired verification shows a retry path and does not leave users waiting indefinitely.

### A36 Seller and advertiser navigation waits for analytics

**P2 · Confirmed in code; popup behavior varies by browser**

Evidence: [contact handler](../apps/web/src/components/listings/ContactSection.tsx#L75), [tracking request](../apps/web/src/lib/client-api.ts#L3), [advertising click handler](../apps/web/src/components/ads/AdBanner.tsx#L67).

Phone, WhatsApp, and Viber actions await the tracking request before opening the destination. A slow/hanging API delays the primary contact action, and opening a new window after asynchronous work can lose the browser's user-activation allowance. Advertising links repeat the pattern: they prevent normal navigation and await click tracking before opening the advertiser destination. Noncritical tracking sits directly in the critical interaction path.

**Fix:** use appropriate links or open the destination synchronously from the click, then record analytics independently with a bounded/beacon-style request where supported.

**Acceptance:** throttle or disable tracking endpoints; phone, messaging, and advertiser destinations still open immediately. Tracking failure never prevents contact or ordinary link behavior.

## Extended audit: administration, content, advertising, and operations

The second pass added A37–A65. Findings below distinguish executable local checks from source-confirmed behavior. Public display of guest email remains intentional; none of these findings recommends removing it.

### A37 Unpublished CMS pages are exposed by public API endpoints

**P1 · Reproduced locally**

Evidence: [page collection and detail](../apps/api/src/pages/pages.controller.ts#L51), [web publication check](../apps/web/src/app/[slug]/page.tsx#L54).

Both anonymous page endpoints return records without an `isPublished` condition, including the complete draft content. The website checks publication before rendering the article, but that does not protect direct API access. Calling the actual controller methods against a synthetic unpublished page returned it through both endpoints.

**Fix:** enforce publication in the public API and use guarded admin routes for drafts. Apply the same rule when generating public metadata.

**Acceptance:** an unpublished page is absent from the public collection and returns 404 by slug; authorized editors can still preview and edit it.

### A38 Most saved site settings never change runtime behavior

**P1 · Confirmed in code**

Evidence: [settings and defaults](../apps/api/src/admin/settings/admin-settings.service.ts#L5), [only runtime settings reads](../apps/api/src/app.controller.ts#L22), [operational promises in the UI](../apps/web/src/app/admin/cilesimet/page.tsx#L40), [registration](../apps/api/src/auth/auth.service.ts#L99), [publication decision](../apps/api/src/listings/listings.service.ts#L225).

The settings screen persists registration, email verification, maintenance, listing limits, expiry, image requirements, auto-approval, and trust/spam controls. Application code never reads these stored values when making those decisions. Only the two tracking IDs are read outside the settings CRUD, and the web tracking component consumes only the Google ID. An administrator can disable registration or enable maintenance and see a save confirmation while the application continues normally. Branding/contact/social settings likewise have no runtime consumers in the reviewed source.

**Fix:** define typed settings, validate values, and connect every supported control to its actual decision/rendering path. Hide or clearly mark settings that are not implemented. Invalidate cached settings after changes.

**Acceptance:** changing each exposed setting produces the described behavior in a new request/session. In particular, disabled registration blocks API signup, maintenance activates its message, and listing limits are enforced server-side.

### A39 Cross-origin settings saves fail their CORS preflight

**P2 · Confirmed in code; applies when web and API have different origins**

Evidence: [settings PUT route](../apps/api/src/admin/settings/admin-settings.controller.ts#L39), [settings save request](../apps/web/src/app/admin/cilesimet/page.tsx#L144), [allowed CORS methods](../apps/api/src/main.ts#L14).

The settings UI sends PUT, but the API's CORS method list omits PUT. A browser using the separate web/API origins used in local development cannot complete this save even when its origin is allowed. Same-origin requests through the production proxy do not encounter this preflight defect.

**Fix:** include the methods actually used by supported routes, or consistently change the route/client to PATCH. Keep the origin allowlist explicit.

**Acceptance:** settings save succeeds from an allowed separate frontend origin; requests from disallowed origins remain rejected.

### A40 Older blog posts become unreachable in the admin interface

**P2 · Confirmed in code**

Evidence: [admin list fetch](../apps/web/src/app/admin/blog/page.tsx#L30), [editor lookup](../apps/web/src/app/admin/blog/[id]/page.tsx#L54), [paginated API](../apps/api/src/blog/blog.controller.ts#L140).

The admin list loads only the newest 50 posts and supplies no pagination. The editor fetches the newest 200 posts and searches that page for its ID. With 201 posts, the oldest valid editor URL reports that the article was not found. Increasing these limits would only postpone the failure.

**Fix:** paginate/search the admin list and add a guarded single-post lookup by ID for the editor, including drafts. Handle loading failures separately from nonexistent records.

**Acceptance:** with more than 200 posts, administrators can find, directly open, edit, and publish the oldest post.

### A41 Sitemap generation omits blog posts and most companies

**P2 · Blog omission reproduced locally; company limit confirmed in code**

Evidence: [sitemap response parsing](../apps/web/src/app/sitemap.ts#L52), [blog response envelope](../apps/api/src/blog/blog.controller.ts#L195), [company default limit](../apps/api/src/companies/companies.controller.ts#L78).

The sitemap reads blog results from `items` or a bare array; the API returns `{ data, meta }`. Consequently no individual blog posts enter the sitemap. Its expected `updatedAt` is also absent from the blog list projection. Company discovery fetches only the default first 12 companies. The local check executed the real sitemap function with the actual blog envelope and confirmed that a known published post was omitted.

**Fix:** use explicit shared response contracts and dedicated paginated sitemap feeds for published content. Include a valid modification date and iterate all company/blog pages.

**Acceptance:** fixtures with more than 12 companies and multiple blog pages produce every eligible URL once, with valid dates and no drafts.

### A42 Hidden carousel ads are counted as impressions immediately

**P2 · Reproduced locally**

Evidence: [all ads mounted in carousel](../apps/web/src/components/ads/AdRotator.tsx#L34), [impression on mount](../apps/web/src/components/ads/AdBanner.tsx#L28).

The rotator mounts every banner and hides inactive ones using opacity. Every banner immediately posts an impression, including slides a visitor never sees and banners below the viewport. The local component check reported three impressions before any rotation. Hidden embed scripts also initialize, and hidden links remain keyboard-focusable because pointer-event suppression does not remove them from tab order.

**Fix:** define the impression measurement rule and track only the active, visible creative after successful display. Make inactive slides inert or unmount them; pause rotation when appropriate for visibility/accessibility.

**Acceptance:** load three rotating ads and leave before rotation: only the visible eligible ad records an impression. Keyboard users cannot focus invisible links, and an offscreen or failed image is not counted as displayed.

### A43 Advertising analytics read data that is no longer recorded

**P2 · Confirmed in code; absence of raw writes verified locally**

Evidence: [tracking persistence](../apps/api/src/ads/ads.service.ts#L91), [hourly and top-page queries](../apps/api/src/admin/ads/admin-ads.service.ts#L448), [summed daily uniques](../apps/api/src/admin/ads/admin-ads.service.ts#L39), [unique-viewer response](../apps/api/src/admin/ads/admin-ads.service.ts#L473).

Impression tracking writes only daily aggregates and ignores `pageUrl`. Hourly and top-page reports still query `ad_impressions`; no current application writer for that table was found. New traffic therefore increases totals without populating those breakdowns. Additionally, `uniqueViewers` sums daily unique IP counts, so one IP visiting on three days becomes three lifetime “unique viewers.” The hourly API returns `{ hour: Date, count }`, while the client declares `{ hour: number, impressions, clicks }`.

**Fix:** agree on one event/aggregation contract. Persist the dimensions required by supported charts, or remove unsupported charts. Compute campaign-level uniqueness deliberately or label the measure as summed daily uniques. Align API and UI types.

**Acceptance:** synthetic visits across two pages, hours, and days reconcile between totals and breakdowns; the same visitor across days is counted according to the stated definition.

### A44 Ad tracking deduplication races and ignores campaign eligibility

**P2 · Reproduced locally**

Evidence: [impression deduplication](../apps/api/src/ads/ads.service.ts#L97), [click deduplication](../apps/api/src/ads/ads.service.ts#L129), [active-ad helper](../apps/api/src/ads/ads.service.ts#L148).

Deduplication uses separate Redis `exists` and `set` calls, allowing concurrent requests to both increment counts for one IP/ad. The helper named `findActiveAdOrFail` checks only existence and deletion; paused, future, and expired ads are accepted. The mock-boundary concurrency check counted two impressions for one paused, expired campaign. Redis marking and database counting also run independently, so a database failure can consume the deduplication window without recording the event.

**Fix:** validate campaign eligibility and use an atomic event-claim/idempotency design with a defined recovery path if persistence fails. Keep tracking failure independent from destination navigation, as in A36.

**Acceptance:** parallel duplicates count once, paused/out-of-window campaigns do not accumulate ordinary display events, and a failed write can be retried without silent loss or double counting.

### A45 Campaign capacity checks use the wrong dates and are bypassed by updates

**P2 · Future-booking rejection reproduced locally; other paths confirmed in code**

Evidence: [create](../apps/api/src/admin/ads/admin-ads.service.ts#L227), [update](../apps/api/src/admin/ads/admin-ads.service.ts#L250), [resume and duplicate](../apps/api/src/admin/ads/admin-ads.service.ts#L309), [capacity predicate](../apps/api/src/admin/ads/admin-ads.service.ts#L540), [serving cap](../apps/api/src/ads/ads.service.ts#L79).

Capacity validation counts campaigns active now rather than campaigns overlapping the requested interval. A full zone today blocks a nonoverlapping future booking and even an inactive duplicate. Conversely, future overlapping bookings can be admitted while the zone is currently empty. Moving, rescheduling, or resuming a campaign skips capacity validation. Serving then takes only the highest-priority `maxAds`, leaving excess campaigns undisplayed.

**Fix:** first define whether `maxAds` is an inventory limit or just a display limit. If it limits inventory, validate interval overlap transactionally across creation, rescheduling, movement, and activation. If it limits display, remove misleading booking rejection and implement the intended rotation/fairness rules.

**Acceptance:** nonoverlapping future bookings succeed; overlapping bookings and concurrent activation follow the same declared rule; every accepted campaign receives the intended eligibility.

### A46 CSV exports preserve user-controlled spreadsheet formulas

**P1 · Formula preservation reproduced locally; spreadsheet execution not attempted**

Evidence: [listing CSV](../apps/api/src/admin/exports/admin-exports.service.ts#L24), [user CSV](../apps/api/src/admin/exports/admin-exports.service.ts#L69).

Names and listing titles go directly into `json2csv`. A synthetic user name `=1+1` was emitted as the quoted CSV cell `"=1+1"`. CSV quoting alone does not force spreadsheet applications to treat formula-prefixed content as text; this can turn untrusted account/listing data into spreadsheet instructions when an administrator opens an export. See [OWASP's CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection).

**Fix:** choose an export policy for the supported spreadsheet tools, including formula-prefixed text and embedded delimiters. Consider a spreadsheet format with explicit text cell types. Validate the chosen mitigation through save/reopen behavior as well as initial import.

**Acceptance:** benign synthetic formula-prefixed names/titles remain literal text in supported spreadsheet workflows; ordinary punctuation and numeric fields retain their intended values.

### A47 CSV exports fail when filters return no records

**P2 · Reproduced locally**

Evidence: [CSV parser construction](../apps/api/src/admin/exports/admin-exports.service.ts#L35), [user CSV parser](../apps/api/src/admin/exports/admin-exports.service.ts#L78), [revenue CSV parser](../apps/api/src/admin/exports/admin-exports.service.ts#L120).

All CSV methods infer fields using `new Parser().parse(rows)`. The installed parser throws `Data should not be empty or the "fields" option should be included` for an empty array. A legitimate date/filter selection with no matches therefore becomes a server error rather than an empty export.

**Fix:** supply explicit stable field definitions and return a header-only CSV, with a clear no-records state in the export interface if desired.

**Acceptance:** empty listing, user, and revenue exports complete successfully with the documented headers and no misleading error alert.

### A48 Exports silently truncate results and exclude most of the selected final day

**P2 · Query behavior reproduced locally**

Evidence: [listing export bounds](../apps/api/src/admin/exports/admin-exports.service.ts#L185), [user export bounds](../apps/api/src/admin/exports/admin-exports.service.ts#L217), [payment export bounds](../apps/api/src/admin/exports/admin-exports.service.ts#L245), [date inputs](../apps/web/src/app/admin/eksportet/page.tsx#L35).

Every export query takes at most 10,000 rows without reporting truncation. The UI's inclusive-looking end-date field becomes `createdAt <= new Date('YYYY-MM-DD')`, which is midnight at the beginning of that day. Selecting the same start and end date effectively excludes that day's activity after midnight. Admin listing date filters repeat the same conversion.

**Fix:** interpret date-only ranges in an explicit business timezone, using an exclusive start-of-next-day upper bound. Stream/page complete exports, or visibly disclose and require a narrower range when a supported cap is reached.

**Acceptance:** morning and late-evening records on the selected final day are included; the following day is excluded; a dataset over 10,000 records is exported completely or clearly rejected before download.

### A49 Revenue PDFs add unsuccessful payments and label every currency as EUR

**P2 · Reproduced locally**

Evidence: [revenue PDF total and labels](../apps/api/src/admin/exports/admin-exports.service.ts#L129), [unfiltered payment query](../apps/api/src/admin/exports/admin-exports.service.ts#L245), [weekly completed-payment filter](../apps/api/src/admin/exports/admin-exports.service.ts#L154).

The revenue PDF sums every matching payment status and prints EUR for all rows, despite storing and selecting a currency. A local fixture containing a completed 10 EUR payment and a failed 20 USD payment produced a title total of EUR 30.00. The weekly report filters completed payments, so the two reports use different definitions of revenue. Currency mixing matters whenever non-EUR records exist; failed/pending inclusion applies regardless.

**Fix:** distinguish a payment ledger from recognized revenue, define status/refund handling, and group totals by currency unless an explicit conversion policy exists. Share these rules between reports.

**Acceptance:** completed, pending, failed, and refunded fixtures reconcile under the chosen definition; mixed currencies are not relabeled or directly added together.

### A50 Category edits can create cycles or unsupported nesting

**P2 · Self-parent update reproduced locally**

Evidence: [create-time depth validation](../apps/api/src/admin/categories/admin-categories.service.ts#L53), [update](../apps/api/src/admin/categories/admin-categories.service.ts#L74), [root-only admin tree](../apps/api/src/admin/categories/admin-categories.service.ts#L17).

Creation rejects a subcategory as parent, but updates write any `parentId` without equivalent checks. A category can become its own parent or be moved under its descendant. Such records no longer appear in root-based tree queries; deeper nesting is also accepted even though rendering expects only parents and children.

**Fix:** centralize tree invariants for creation and movement: existing parent, no self/descendant cycle, and supported maximum depth. Define how moving a parent with children affects that depth.

**Acceptance:** self-parent, two-node cycle, descendant move, and unsupported third-level moves fail cleanly; valid moves preserve discoverability and listing associations.

### A51 Simultaneous moderation decisions can award or deduct trust more than once

**P1 · Reproduced locally with concurrent service calls and mocked persistence**

Evidence: [approval state read and transaction](../apps/api/src/admin/listings/admin-listings.service.ts#L387), [rejection](../apps/api/src/admin/listings/admin-listings.service.ts#L441), [trust-driven auto-publication](../apps/api/src/listings/listings.service.ts#L237).

Moderation reads status before the transaction and later updates by ID alone. Two moderators can both observe the same pending listing, then both commit a trust award. The local interleaving produced +20 for one first-listing approval instead of +10. Rejection has the same read-before-write pattern; approval and rejection can also race. Trust affects whether future listings bypass review, so this changes authorization-like business behavior as well as statistics.

**Fix:** make the allowed-state transition and associated trust/log/outbox changes one conditional transaction, with idempotency or conflict handling. Define first-approval awards historically, and enforce the intended trust bounds.

**Acceptance:** concurrent approval/approval, rejection/rejection, and approval/rejection attempts yield one committed transition and one corresponding trust adjustment, log, and notification event.

### A52 User moderation history cannot identify its subject and the UI calls a missing route

**P2 · Missing subject reproduced locally; route and relation mismatch confirmed in code**

Evidence: [user action logging](../apps/api/src/admin/users/admin-users.service.ts#L50), [user detail history relation](../apps/api/src/admin/users/admin-users.service.ts#L182), [log schema](../prisma/schema.prisma#L387), [frontend history request](../apps/web/src/app/admin/perdoruesit/[id]/page.tsx#L136), [user controller](../apps/api/src/admin/users/admin-users.controller.ts#L75).

User-level logs record the acting moderator but no affected user ID. Generic role/trust/deletion reasons often do not name the subject either. The user detail's `moderationLogs` relation represents actions performed by that user as moderator, rather than actions affecting the account. Meanwhile the frontend requests `/admin/users/:id/moderation-logs`, which has no matching route, and converts the failure to an empty history. Permanent listing deletion also cascades away listing logs, including the deletion log written immediately beforehand.

**Fix:** model actor and subject separately, retain immutable event context according to the chosen retention policy, and expose the actual subject-history endpoint. Display fetch failures distinctly from no history.

**Acceptance:** an admin changing another user's role produces an event visible on the affected user's history with correct actor/subject IDs. Deleting content preserves the intended administrative audit record.

### A53 Permanent listing deletion also deletes its payment records

**P1 · Confirmed in code; no deletion executed**

Evidence: [single permanent deletion](../apps/api/src/admin/listings/admin-listings.service.ts#L638), [empty trash](../apps/api/src/admin/listings/admin-listings.service.ts#L763), [nullable payment listing relation](../prisma/schema.prisma#L428).

Both permanent deletion and empty-trash explicitly delete payments associated with the listings. Removing old content therefore removes payment/provider references and changes historical revenue reports. Payment deletion occurs before listing deletion, outside a transaction; failure of the second step can leave the listing present but its payments gone. Empty-trash additionally selects IDs for payment deletion, then deletes listings using a fresh broad trash predicate, allowing the two affected sets to diverge under concurrent changes.

**Fix:** retain payment records and detach or archive their content association with an immutable description/reference. Use a transactional, stable target set for content removal. Make any distinct payment-data retention operation explicit.

**Acceptance:** deleting a paid listing leaves its financial history and provider reference intact; injected deletion failure rolls back dependent changes; concurrent trash changes do not alter the agreed target set.

### A54 Admin image reorder can modify another listing and leave inconsistent primary images

**P2 · Cross-listing update predicate reproduced locally**

Evidence: [image reorder](../apps/api/src/admin/listings/admin-listings.service.ts#L700), [image deletion and renumbering](../apps/api/src/admin/listings/admin-listings.service.ts#L666).

Reorder validates the listing but updates each supplied image by image ID alone. It does not ensure that IDs belong to that listing, are unique, or form the complete intended set. An omitted existing primary image can remain primary while the first supplied image is also marked primary. Sequential writes can leave partial order changes if a later ID fails. This is a data-integrity problem within an already privileged action, not a claim that moderators gain a new privilege.

**Fix:** validate ownership and set completeness, reject duplicates, and update all positions/primary flags atomically. Apply the same invariant to image addition/deletion.

**Acceptance:** cross-listing, duplicate, missing, and nonexistent IDs leave all images unchanged on rejection. A successful reorder has contiguous positions and exactly one primary image when images exist.

### A55 Moderators see administrator-only screens and actions

**P2 · Confirmed in code**

Evidence: [shared admin navigation](../apps/web/src/app/admin/layout.tsx#L22), [moderator layout admission](../apps/web/src/app/admin/layout.tsx#L130), [admin-only user routes](../apps/api/src/admin/users/admin-users.controller.ts#L34), [blog write permissions](../apps/api/src/blog/blog.controller.ts#L237), [blog controls](../apps/web/src/app/admin/blog/page.tsx#L37).

The layout admits both ADMIN and MODERATOR and renders the same users, settings, exports, advertising, and content controls to both. Several corresponding API routes permit only ADMIN. For example, moderators can read the admin blog list but its publish/delete/edit actions fail authorization. Some pages swallow load errors or leave action rejections unhandled, obscuring the reason.

**Fix:** render navigation and actions from explicit capabilities consistent with backend permissions, and provide an understandable forbidden state for direct links. Preserve server authorization.

**Acceptance:** moderators see and can complete only their permitted workflows; administrators retain their controls; a direct forbidden URL shows a clear permission message.

### A56 Account suspension and recovery controls do not match backend state

**P2 · Confirmed in code**

Evidence: [returned suspension fields](../apps/api/src/admin/users/admin-users.service.ts#L127), [frontend status type](../apps/web/src/app/admin/perdoruesit/[id]/page.tsx#L10), [local-only suspension update](../apps/web/src/app/admin/perdoruesit/[id]/page.tsx#L183), [status badge and actions](../apps/web/src/app/admin/perdoruesit/[id]/page.tsx#L306), [deleted-user exclusion](../apps/api/src/admin/users/admin-users.service.ts#L83), [restore/unsuspend routes](../apps/api/src/admin/users/admin-users.controller.ts#L139).

The UI checks `isSuspended`, but the API returns `suspendedAt` and `suspendedUntil`. The badge appears after a local action and disappears on reload. The detail screen continues to offer “Suspend” and provides no unsuspend or restore action despite backend support. Deleted users are always excluded from the admin collection, which offers no trash filter, making recovery difficult without remembering an ID and calling the API manually. This is separate from the timed-expiry defect in A31.

**Fix:** derive status from the canonical backend contract, display the suspension end date, and provide state-appropriate recovery actions and a deleted-user view.

**Acceptance:** status remains correct after reload and across admin sessions; suspended users can be unsuspended and deleted users found/restored through the UI, with listing-restoration behavior explained.

### A57 Facebook photo publishing passes an internal image path to the external API

**P2 · Outgoing request reproduced locally with a mocked HTTP client**

Evidence: [stored upload path normalization](../apps/web/src/app/posto-shpallje/page.tsx#L44), [social image selection](../apps/api/src/admin/social/social-media.service.ts#L69), [Facebook photo request](../apps/api/src/admin/social/social-media.service.ts#L168).

Normal listing uploads store originals as `listings/year/month/.../file.webp`. The Facebook branch sends that value directly as its photo `url`, without adding the public image origin and `/uploads/`. The local request capture confirmed the relative value. An external service cannot fetch that internal relative path as a public image address, so the normal photo-sharing path is malformed even with credentials configured. The UI displays a failure marker without surfacing the returned error detail.

**Fix:** resolve stored image references through one trusted public-asset URL builder before external use. Validate reachability in an integration environment and show useful per-platform failure details.

**Acceptance:** a normally uploaded listing produces an absolute public HTTPS photo URL in the request; external publish failures are visible and retryable without obscuring successful platforms.

### A58 Company discovery stops after 50 records

**P2 · Confirmed in code**

Evidence: [directory request](../apps/web/src/app/kompanite/page.tsx#L22), [directory rendering](../apps/web/src/app/kompanite/page.tsx#L82), [API ordering and cap](../apps/api/src/companies/companies.controller.ts#L94).

The public directory loads at most 50 companies and has no pagination or search. The API cannot page past that cap. Older companies become undiscoverable there as the dataset grows; because premium records sort first, enough premium companies can exclude every regular company and trigger the misleading “no registered companies” empty state for that section.

**Fix:** add bounded pagination/search with total counts and clear separate premium/regular presentation. Reuse the paginated source for sitemap generation in A41.

**Acceptance:** with more than 50 companies, users can reach the oldest regular company from the directory and distinguish an empty category from a truncated result.

### A59 Advertiser embed support conflicts with the site's content security policy

**P2 · Confirmed in code; provider-specific rendering still needs browser validation**

Evidence: [embed feature contract](../apps/api/src/admin/ads/dto/create-ad.dto.ts#L38), [script execution and embed rendering](../apps/web/src/components/ads/AdBanner.tsx#L37), [CSP restrictions](../apps/web/src/middleware.ts#L30).

The application accepts HTML/JS embeds, explicitly including ad-provider embeds, but CSP permits only a small fixed script list, Cloudflare challenge frames, and self/configured-origin images. An otherwise valid embed using another script host, iframe host, or image host is blocked by those directives. The admin can save the campaign successfully with no compatibility validation or useful public fallback.

**Fix:** define supported providers and their required directives, validate embed/provider choice, and show preview failures. Prefer constrained provider integrations over arbitrary code; preserve an intentional CSP rather than removing it.

**Acceptance:** every advertised supported provider loads under the production policy in a browser; unsupported code is rejected or clearly marked, and blocked creatives do not count as impressions.

### A60 Historical ad cleanup is not safe to retry

**P2 · Reproduced locally**

Evidence: [impression aggregation and deletion](../apps/api/src/cleanup/cleanup.service.ts#L45), [click aggregation and deletion](../apps/api/src/cleanup/cleanup.service.ts#L86), [scheduled invocation](../apps/api/src/cleanup/cleanup.service.ts#L21).

Cleanup increments daily aggregates from old raw rows, then deletes those rows in a separate operation. If deletion fails after aggregation, the next run adds the same records again. A local failure/retry changed two source impressions into four aggregate impressions. Multiple API instances running this cron can encounter the same problem. This applies to historical/raw rows when present; the current live tracker only writes aggregates, as described in A43.

**Fix:** make batch aggregation and source consumption atomic/idempotent, and coordinate scheduled jobs across instances. Define a migration cutoff so restored historical rows cannot be counted twice.

**Acceptance:** retry after failure at each processing boundary produces identical final totals; two workers processing the same batch cannot double-count it.

### A61 Clearing optional blog fields silently preserves their old values

**P2 · Confirmed in code**

Evidence: [editor save payload](../apps/web/src/app/admin/blog/[id]/page.tsx#L92), [partial backend update](../apps/api/src/blog/blog.controller.ts#L247).

The editor converts empty excerpt, feature image, and meta description values to `undefined`. JSON serialization removes those keys, and the PATCH correctly interprets absent fields as unchanged. Deleting a feature-image URL and saving therefore leaves the old image attached; the same happens to the other optional text fields.

**Fix:** distinguish “unchanged” from “clear” in the payload contract. Send explicit supported empty/null values for fields the user clears and validate them consistently.

**Acceptance:** erase each optional field, save, and reload: it stays cleared. Editing another field without changing it preserves its original value.

### A62 Reports on published listings have no actionable review queue

**P1 · Confirmed in code**

Evidence: [report persistence/event](../apps/api/src/listings/listings.service.ts#L540), [notification subscriptions](../apps/notification-service/src/event-listener.service.ts#L9), [moderation queue predicate](../apps/api/src/admin/listings/admin-listings.service.ts#L790), [admin listing filters](../apps/api/src/admin/listings/dto/list-listings.dto.ts#L20).

A submitted report creates a moderation log and publishes `listing.reported`. No consumer subscribes to that event, no report-specific queue/filter or resolution state exists, and the moderation queue selects only pending listings. A report against an already published listing therefore does not reach the ordinary moderation workflow. Its log can be found only by opening that listing's detail directly. This remains broken even if Redis delivery reliability in A22 is fixed.

**Fix:** persist reports as reviewable records, expose an admin queue with assignment/status/resolution, and notify through a supported durable path. Keep reporter identity separate from moderator identity and prevent accidental duplicate submissions.

**Acceptance:** reporting a published listing makes it visible to moderators without knowing its ID; resolving it records who acted and the outcome, and removes it from the unresolved queue.

### A63 Priority dashboards sort only a subset of eligible records

**P2 · Confirmed in code**

Evidence: [moderation pagination before spam sorting](../apps/api/src/admin/listings/admin-listings.service.ts#L798), [accepted but unimplemented listing spam sort](../apps/api/src/admin/listings/admin-listings.service.ts#L248), [advertising underperformance sample](../apps/api/src/admin/ads/admin-ads.service.ts#L389).

The moderation queue fetches a page ordered by creation time, then sorts only that page by spam score. An older high-risk listing stays hidden on a later page. Its score also comes from the newest log, including later administrative logs whose score defaults to zero. The general admin listing endpoint accepts `spamScore` but falls through to creation-date ordering. The ad dashboard similarly takes an arbitrary first 20 active campaigns before selecting its bottom five, so the worst performers outside that sample are omitted.

**Fix:** store/query the intended score or aggregate, sort the full eligible dataset before pagination, and use deterministic tie-breakers. Make UI labels match the actual ranking definition.

**Acceptance:** an old high-score listing appears first in spam ordering, subsequent non-scoring logs do not erase its score, and the globally lowest-performing campaign appears even when it lies beyond the first 20 database records.

### A64 The health endpoint cannot detect unavailable dependencies

**P2 · Confirmed in code**

Evidence: [constant health response](../apps/api/src/app.service.ts#L5), [health route](../apps/api/src/app.controller.ts#L14), [application container configuration](../docker-compose.yml#L51).

`/api/v1/health` always reports `ok` once the process handles a request, regardless of PostgreSQL, Redis, or search availability. Compose checks dependency containers during startup but defines no application readiness check for the API/web/worker. A probe using this endpoint can therefore report success while posting, authentication, or search is failing. This establishes a monitoring gap, not evidence that the deployed system is currently unhealthy.

**Fix:** separate lightweight process liveness from bounded dependency readiness, define which dependencies are essential versus degraded, and wire deployment/monitoring probes to those meanings.

**Acceptance:** in a disposable stack, disable each dependency after startup and verify readiness/degraded status changes within a bounded time while liveness remains useful for process supervision.

### A65 Listing gallery uses a different image URL contract from listing cards

**P2 · Confirmed in code**

Evidence: [gallery original URL construction](../apps/web/src/components/listings/ImageGallery.tsx#L59), [gallery thumbnail URL](../apps/web/src/components/listings/ImageGallery.tsx#L119), [shared URL resolver](../apps/web/src/lib/utils.ts#L3), [admin URL imports](../apps/api/src/admin/listings/admin-listings.service.ts#L137).

Cards use `imgSrc`, which handles absolute URLs and paths already containing `/uploads/`. The detail gallery always prepends the image origin plus `/uploads/`. A supported/imported absolute URL becomes a malformed local path, while `/uploads/...` gets the prefix twice. Such a listing can have a working card image and a broken detail gallery. The thumbnail strip also loads original-size images rather than `thumbUrl`.

**Fix:** normalize stored asset references or use the same tested resolver in every surface, including metadata and social publishing. Render thumbnails from the thumbnail variant and add a failed-image fallback.

**Acceptance:** relative paths, upload-prefixed paths, and supported absolute image URLs render consistently on cards, galleries, and thumbnails without duplicate prefixes or unnecessary original-image downloads.

## Original audit verification results (before fixes)

| Check                                                      | Result                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| API TypeScript check                                       | Passed                                                                                        |
| Image-service TypeScript check                             | Passed                                                                                        |
| Notification-service TypeScript check                      | Passed                                                                                        |
| Web TypeScript check with repository configuration         | Failed: missing implicit `dompurify` type definition                                          |
| Web diagnostic check with explicit types and DOM libraries | Failed: 22 diagnostics; confirms errors beyond the initial configuration failure              |
| API ESLint                                                 | Failed: missing ESLint configuration                                                          |
| Web lint                                                   | Requested interactive configuration; not usable as an unattended check                        |
| Initial isolated source/DOM reproductions                  | 10 targeted checks reproduced the initial defects without external state changes              |
| Extended isolated source/component reproductions           | 15 additional targeted checks reproduced defects using synthetic data and mocked dependencies |
| Full application build and integrated browser flows        | Not run; service stack was unavailable and type/lint defects already established              |

Commands used for TypeScript checks, from the repository root:

```sh
./node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit --incremental false
./node_modules/.bin/tsc -p apps/image-service/tsconfig.json --noEmit --incremental false
./node_modules/.bin/tsc -p apps/notification-service/tsconfig.json --noEmit --incremental false
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false
```

The additional diagnostic command below bypassed the first type-discovery failure to reveal subsequent errors. It is **not** a fix or a substitute for making the repository configuration pass:

```sh
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false --types node,react,react-dom --lib es2020,dom,dom.iterable
```

The original audit used Node `v25.7.0`; the Dockerfile uses Node 20. This paragraph describes the initial read-only audit. The implementation now includes a frozen install, a pinned browser-test dependency, configuration changes and the verification documented in the fix tracker.

The ten isolated reproductions covered public pending-status queries; owner publication and unrelated company assignment; ignored image updates; creation-date price ordering; past-expiry public details; replayable refresh without revocation checks; image path escape; direct company ownership reassignment; filter event serialization; and script execution through listing JSON-LD. Filesystem deletion and live HTTP exploit attempts were deliberately excluded.

The fifteen extended checks covered draft CMS responses; concurrent ad tracking on an ineligible campaign; hidden carousel impressions; future-booking capacity rejection; self-parent categories; duplicate concurrent approval awards; formula-preserving CSV cells; empty CSV failure; export cutoff/cap predicates; mixed-status/currency revenue totals; repeated cleanup aggregation after failure; missing blog sitemap entries; missing user audit subjects; unconstrained image-reorder predicates; and relative image URLs passed to a mocked Facebook client. These execute actual source methods/components, but they do not replace real database concurrency tests, spreadsheet import tests, external provider tests, or integrated browser validation. No social post was sent, and no payment or listing record was deleted.

Type/lint results above come from the initial pass; they were not rerun for this documentation-only extension. The badge-picker response contract was explicitly rechecked and ruled out as a defect; expired public-profile badges are already filtered. Those behaviors are not counted as findings.

## Regression maintenance

The automated suites listed in the tracker cover the repaired security, business-rule, concurrency, upload, search, notification, export and browser boundaries. Keep them in CI. Add regression cases when new roles, listing states, image formats, payment providers or advertisement formats are introduced. The production and assistive-technology checks listed in the deployment runbook are release acceptance work, not claims made by the local test suite.

## Additional product decisions

These need a deliberate product decision rather than being counted as further confirmed defects:

- **Guest management:** guest success offers account creation, but guest listings have no owner ID and are assigned to accounts only through an admin action. Decide whether guests receive a secure management link, a verified claim flow, or clear support instructions; do not imply signup automatically attaches an old guest listing.
- **Saved-search alerts:** CRUD and an email template exist, but no matching/delivery worker was found. Define the alert frequency and supported filters before presenting this as an active feature.
- **Company owner email:** the public company collection explicitly includes the owner's account email in addition to the company's contact email. Decide whether personal account email should be part of the public contract; prefer an explicit public-contact projection.
- **Operational exposure:** verify the deployed firewall and ingress policy for Compose-published PostgreSQL, Redis, Meilisearch, and application ports. Repository port mappings alone do not establish actual internet reachability.
- **Mobile visual polish:** complete a real browser pass for contrast, touch targets, long Albanian text, image cropping, safe-area handling, and empty/error layouts after the confirmed functional issues are fixed.
