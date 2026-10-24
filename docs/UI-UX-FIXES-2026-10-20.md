# UI/UX audit implementation — 20 October 2026

All 50 findings in the [UI/UX audit](UI-UX-AUDIT-2026-10-20.md) have an implementation in release `e7dd277d34e61d4105851700e1cf7c770e16911c`. **The operator reported a successful live deployment on 20 October 2026.** API/web health, origin readiness, public homepage/readiness requests and unchanged shared-site HTTP statuses passed. Authenticated admin login and existing listing photos still need browser confirmation. See the [deployment record and backup location](DEPLOYMENT.md#current-deployment--20-october-2026).

The original audit and its screenshots remain available as baseline evidence. New checks use synthetic users, listings, companies and campaigns; they do not change production records or send customer messages.

## Follow-up: original category icons

After deployment, the operator reported that all homepage categories displayed a folder icon. The public categories query omitted `icon` from its Prisma selection after the UI moved from the original static catalogue to live category data. Browser fixtures supplied icons anyway, so the earlier checks missed the API/UI mismatch.

The follow-up returns saved parent and child icons from the API and uses the original twelve category emojis when a saved icon is missing, null or blank. Defaults match by slug, preserving imported IDs, live catalogue ordering and new categories. Saved custom icons take precedence. Server-rendered pages and the client catalogue share the same fallback, covering homepage cards, the category directory, navigation, search and category/city pages.

Regression coverage now exercises the real category HTTP endpoint and database projection, including a changed saved icon. Browser coverage checks all twelve original defaults with absent/null/blank values at mobile and desktop widths, the directory/menu/search, saved custom artwork and a newly created category. This correction requires new API/web images; it has no migration or production-data changes. The current live release remains `e7dd277` until a subsequent cutover is confirmed.

Local verification passed: build, type checks, lint, all 66 unit tests, disposable database/HTTP integration and the complete UI/UX browser suite. The [restored category preview](audits/ui-ux-fixes-2026-10-20/category-icons-restored.png) includes one synthetic new category to verify the generic fallback; it is not a production screenshot. The earlier audit evidence below remains a historical snapshot, rather than evidence for this follow-up.

## Resolution register

| ID | Implemented change | Primary evidence / verification |
| --- | --- | --- |
| UX01 | Darker orange actions, readable supporting text and status colors, visible focus, light footer text on the dark background. | Shared theme, page and dialog accessibility sweeps. |
| UX02 | Connected labels for native and composite controls; named icon buttons, color choices, search fields and switches. | `Field`, explicit editor labels, page and dialog accessibility sweeps. |
| UX03 | Persistent focused error feedback, announced success, and a validation summary that links to invalid fields. Typed input survives failed submission. | `Feedback`, `ValidatedForm`; form failure and field-focus browser checks. |
| UX04 | Admin overlays use native modal dialogs with focus containment, Escape, inert background and focus restoration. | `Modal`; gallery, filters, admin drawer and opened admin dialogs. |
| UX05 | Closed mobile admin navigation leaves the focus order; the drawer has a named trigger and expanded state. | Moderator/drawer keyboard regression. |
| UX06 | One main landmark and a skip-to-content link; member/admin shells no longer nest main elements. | Layouts and route accessibility sweep. |
| UX07 | Larger mobile controls, legible supporting text, visible keyboard focus, responsive action areas, a tablet header that fits and sidebars that clear it. | Narrow-screen inspection, accessibility sweep, sticky-position checks and CSS zoom check. |
| UX08 | Dirty-state notices and navigation/reload guards for listing, campaign, blog, settings, user and company editors; successful saves update the baseline. | `useUnsavedChanges`; cancelled navigation and reload browser regression. |
| UX09 | Shared synchronous mutation lock, pending status, disabled action regions and persistent errors across administrative/member mutations. | `useAction`, `ActionRegion`; mutation and partial-failure browser regressions. |
| UX10 | Albanian navigation, roles, status labels, moderation terminology and queue topic descriptions. | Shared label mapping and page source review. |
| UX11 | Page-specific document titles and meaningful primary headings across admin, account and form routes. | Route inventory/title/heading sweep. |
| UX12 | Current navigation, selected filters, formatting state, switches and expanded controls expose their state. | ARIA attributes and interaction checks. |
| UX13 | Sidebar search retains category, city, query, prices, photo/featured selection and sort while resetting pagination. Applying filters uses document navigation with pending feedback; Back restores usable controls. | Browser assertions on destination queries; ten consecutive close/reopen/apply/Back cycles. |
| UX14 | General search shares the collection filter panel and supports the same price, photo, featured and sort options. | Search source and browser filter check. |
| UX15 | Failed search shows retryable unavailability instead of empty results or stale results labelled as current. | Existing outage/retry browser regression. |
| UX16 | Negative/invalid/inverted price ranges receive local feedback before navigation; Enter also applies validation. | Invalid-range browser regression. |
| UX17 | Autocomplete uses a named combobox, uniquely identified listbox/options, active descendant and keyboard selection; sidebar suggestions remain ordinary links. | Keyboard/active-option browser regression and accessibility checks. |
| UX18 | One price component renders zero, ordinary numbers, missing price and explicit negotiability consistently across result surfaces. | Collection/detail browser regression for `0 €` and explicit negotiability. No amount is guessed to mean “free.” |
| UX19 | Featured “view all” links to the featured collection with the matching heading. | Homepage URL, heading and selected-filter review. |
| UX20 | Company profiles pass the requested page to the API; invalid pages normalize and pages above the last page redirect deliberately. | Distinct page-two content, selected page and reload regression. |
| UX21 | Company, profile, CMS and blog loaders distinguish a real 404 from upstream failure. | Server loaders and retryable error boundaries; source review. |
| UX22 | Full-resolution photo viewer adds zoom, previous/next, image count, keyboard navigation, Escape and restored focus. | Full viewer browser regression. |
| UX23 | Mobile listing contact appears before the long description; desktop contact remains alongside the listing. | Responsive listing layout review. |
| UX24 | Secondary numbers use neutral contact hints; visitors explicitly choose which number messaging buttons should use. | Posting/editor hints and contact destination review. |
| UX25 | Safe public configuration supplies the effective image maximum and image-required rule to posting. Existing legacy collections remain preserved. | Public-config unit test, configured-limit browser test and database legacy-photo regressions. |
| UX26 | Excess/invalid photo batches are rejected explicitly before uploading; accepted batches identify uploaded files. No selection is silently sliced. | Four files against a three-file limit; upload-permit count remains unchanged. Applies to public and manual admin posting. |
| UX27 | Guest receipt includes a reference and a support link with the reference prefilled; signed-in submission wording describes submission/review rather than guaranteeing publication. | Receipt/support integration review and existing posting regression. |
| UX28 | New-post drafts show saved/recovered status, session lifetime and a discard action. Existing-record editors do not silently persist private form contents. | Draft recovery regression and storage/guard review. |
| UX29 | FAQ explains optional guest accounts, current photo policy, moderation/correction paths and the consistent support phone number. | FAQ/public-policy review. |
| UX30 | Unsupported hardcoded audience totals and rapid-publication promises were replaced with qualitative copy. | About-page copy review. |
| UX31 | Member settings load profile/preferences successfully before editing; failed or malformed responses block saving and expose retry. | Failed preferences/settings browser check. |
| UX32 | Member password change now enforces eight characters on both client and API, matching registration/reset/admin creation. | DTO validation test and existing password/session integration tests. |
| UX33 | Renewal explains possible moderation before confirmation and uses the actual returned status afterward; list/counts refresh. | Member renewal and public owner-action review. |
| UX34 | Rejected member listings display the customer-facing rejection reason and an edit/resubmit link; internal moderation records are not returned. | Owner-scoped reason/privacy unit test. |
| UX35 | Member analytics labels contact clicks accurately and explains lifetime counts and their limits. | Analytics copy/source review. |
| UX36 | Mobile account navigation uses a labelled selector exposing every destination. | Member route/viewport sweep. |
| UX37 | Admin collections retain unavailable/retry states rather than false empty states. The old `/admin/shpallje` URL redirects to the maintained listing workflow. | Campaign/moderation outage/retry regressions and list-loader review. |
| UX38 | Editors/settings require a successful valid record/reference response before enabling normal forms. | Malformed blog, listing and settings regressions. |
| UX39 | Mutations refetch their real client collections, totals and page bounds; stale requests cannot overwrite newer listing/user/campaign filters. | User/listing partial-result request traces and campaign pagination regression. |
| UX40 | User selections clear when page, role, query or deleted scope changes; select-all explicitly describes this page. | Select/filter regression and labelled checkboxes. |
| UX41 | Bulk actions present scope and consequences, collect reason/duration where relevant, and distinguish successes from failures. Only failed items remain selected for retry. | Mixed-success user/listing regressions; successful users are not submitted again. |
| UX42 | Campaigns use server pagination/search/status/zone filters and an independent zone catalogue. | Page-two API request assertion; zone loading review. |
| UX43 | Admin tables become labelled mobile cards with readable full titles, status, context and visible action labels. | 320/390px inspection and responsive route sweep. |
| UX44 | Admin settings navigation moves above fields on phones; footer/help/save areas stack. | Mobile settings screenshot and viewport sweep. |
| UX45 | Moderator entry redirects directly to moderation, while restricted destinations remain protected. | Moderator landing regression and existing permission tests. |
| UX46 | Moderation cards expose full descriptions and all photos without losing queue position, plus a plain explanation of the risk score. | Moderation layout/gallery review. |
| UX47 | Operations show readable status/topic, age, assignee name, attempt count, next retry and provider-authentication guidance, with support/topic filters. | Operations query/name unit tests and source review. SMTP configuration remains deferred. |
| UX48 | Named editor tools expose formatting state, image insertion requires alternative text, publication review shows title/URL/cover/state/content, and the list supports search/status. | Blog toolbar/preview/unsaved regression and filter unit test. |
| UX49 | Campaign series use separate bars, with a keyboard-accessible exact-value table for dates, impressions, clicks and CTR. | Campaign chart/table source and accessibility review. |
| UX50 | Export descriptions match available filters; each export shows its effective scope and validates date order. | Export UI review and existing CSV/PDF integration regressions. |

## Verification

| Check | Result |
| --- | --- |
| `pnpm build` | All seven workspace build tasks passed. |
| `pnpm lint` and `pnpm typecheck` | Passed; API, web, image service and notification service type checks passed. |
| `pnpm test` | 66 tests passed, zero failures. Five new API regressions cover image policy, password minimum, private rejection details, blog filtering and operations triage. |
| `pnpm test:http` | Passed against disposable database/cache/search containers, including migration and legacy-photo preservation, concurrent moderation, authentication, upload/submission, outbox and readiness checks. |
| `pnpm test:browser` | Passed the existing posting/login/draft, modal/focus/zoom, filters, support/report retry, dashboard outage, permission and advertising regressions. |
| `pnpm test:ui-ux` | Passed the new company/campaign pagination, price, autocomplete, image-limit, validation, failed/malformed loader, partial-bulk, duplicate-click, dirty-editor, preview and moderator-navigation regressions. Includes ten repeated filter/Back cycles. Added to the CI workflow; this report records local runs, not a remote CI execution. |
| Responsive route sweep | 55 representative routes × 1440, 768, 390 and 320 CSS pixels: **220 observations**, zero document-wide horizontal overflow, zero browser runtime errors. The missing-page example correctly returns 404 at each width; the other 216 observations return 200. The 32 observations affected by the final filter/sticky-layout changes were refreshed afterward. |
| Accessibility automation | axe-core 4.10.3: **zero reported violations on the 55 page examples at 390px and five opened dialogs** (filters, badges, companies, users and categories), using WCAG 2 A/AA, 2.1 AA, 2.2 AA and best-practice tags. This is bounded automated evidence, not an accessibility certification. |
| Sticky layout | At 768px, long synthetic listing/search collections and member navigation keep their sidebar below the header when scrolling (header bottom 88px, sidebar top 112px). |

The repeated filter test caught an intermittent client transition that could leave the old URL after Apply. Filters now perform a document GET and show pending feedback; restored pages reset their pending state. This trades a client-side transition for reliable URL/result/history synchronization.

CI follow-up: the [first published UI/UX check run](https://github.com/ArtimisK/OfertaSuksesi/actions/runs/39424666733) passed the web image build/startup checks but failed one unit test. The earlier local unit result preceded the final filter navigation change, so it did not verify that final revision. The filter unit harness still mocked router navigation and lacked `window.location.assign`. Its isolated browser mock is now updated; the test retains its click-event assertion and also checks query preservation and duplicate-click suppression. A fresh full local unit run passed all 66 tests. This correction changed test setup and evidence only. The [complete replacement GitHub run for `e7dd277`](https://github.com/ArtimisK/OfertaSuksesi/actions/runs/39425418746) subsequently passed, including HTTP/database, Redis, both browser suites and the built web-container checks, before deployment.

Retained evidence: [route and check summary](audits/ui-ux-fixes-2026-10-20/evidence.json), [page/viewport matrix](audits/ui-ux-fixes-2026-10-20/routes.json), [dialog results](audits/ui-ux-fixes-2026-10-20/dialogs.json), and [test output](audits/ui-ux-fixes-2026-10-20/verification.txt).

Selected screenshots use synthetic records and image placeholders:

- [Admin listings on mobile](audits/ui-ux-fixes-2026-10-20/admin-listings-mobile.png)
- [Admin settings on mobile](audits/ui-ux-fixes-2026-10-20/admin-settings-mobile.png)
- [Admin badge dialog](audits/ui-ux-fixes-2026-10-20/admin-badge-dialog-mobile.png)
- [Admin campaign editor](audits/ui-ux-fixes-2026-10-20/admin-campaign-mobile.png)
- [Public search on mobile](audits/ui-ux-fixes-2026-10-20/public-search-mobile.png)
- [Public posting on mobile](audits/ui-ux-fixes-2026-10-20/public-posting-mobile.png)
- [Public tablet header](audits/ui-ux-fixes-2026-10-20/public-home-tablet.png)
- [Member analytics on mobile](audits/ui-ux-fixes-2026-10-20/member-analytics-mobile.png)

To reproduce the application regressions, use the local test environment described in the README, install Playwright Chromium, then run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:http
pnpm test:browser
pnpm test:ui-ux
```

## Preserved policy and operational scope

- Guest email remains public, with the disclosure and contact link retained.
- Stored expiry dates, moderation policy and legacy photo protections remain intact.
- Local audit tests used synthetic data. The subsequent deployment replaced API/web containers and reloaded the existing proxy; it made no schema changes and retained the existing database and upload storage.
- The known ZeptoMail `535 Authentication Failed` remains deferred as requested. The operations UI explains that a credential problem requires configuration repair; these changes do not claim email delivery is restored.

## Verification boundaries

Local Chromium automation and source review do not constitute WCAG certification, a real assistive-technology assessment, user research or a physical-device test. Safari/iOS, Android messaging-app handoff, actual Turnstile/provider behavior and a staging email journey still need real-device/provider acceptance. No SMTP secret was changed and no real message was sent. Synthetic image placeholders in screenshots are test fixtures, not missing production assets.
