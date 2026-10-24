# Design and interface audit — 21 October 2026

## Result

This review identified **31 further design and interaction findings** in the visitor, member and administrator interfaces: 23 in the first pass and eight in the requested continuation. All 31 have local implementations. The work builds on the [20 October review](UI-UX-AUDIT-2026-10-20.md); it does not recount those 50 earlier findings as new work.

The main changes make discovery faster, listing cards more readable, navigation usable with a keyboard and on phones, and administrative actions more dependable. The existing green/orange identity, category artwork and Albanian language remain the design foundation.

Reviewed source baseline: `e1de0cb`. The accompanying commit contains the implementation and verification evidence. **This report describes local testing; it does not verify a production deployment.**

## Method and scope

- Read the route inventory, shared layouts/components, existing audit registers and relevant API contracts.
- Visually inspected local Chromium renders at desktop and mobile widths, including long titles, multiple badges, large view counts and many pagination pages.
- Exercised guest, member, administrator and moderator flows using synthetic data. Browser requests to unrelated external services were blocked.
- Reused the existing browser suites for posting, draft recovery, validation, authentication, dialogs, filters, bulk moderation, permissions and editor safeguards.
- Added reproducible interaction tests and a responsive sweep to [tests/design-browser.cjs](../tests/design-browser.cjs), with a `test:design` script and CI step.
- Automated accessibility checks use axe-core 4.10.3 with WCAG 2 A/AA, 2.1 AA, 2.2 AA and best-practice tags. Results are bounded automated evidence, not accessibility certification.

The sweep covers 56 URL examples at 1440, 768, 390 and 320 CSS pixels. This includes every interactive page family and a second collection example with 31 pagination pages. Dynamic records are representative synthetic examples, not an exhaustive review of customer content.

| Area | Reviewed routes and tasks |
| --- | --- |
| Visitor discovery | Homepage; collection; search; categories and category detail; city and city/category detail; grid/list presentation; filters and pagination |
| Visitor detail | Listing photos/contact/share/favourites/report; company directory/profile; seller profile |
| Posting and identity | Guest posting, account posting, image limits, draft recovery, login, registration, forgotten/reset password |
| Content and support | Blog index/article, contact, about, editorial page, FAQ, terms, privacy, CMS page and missing page |
| Member | Overview, own listings, favourites, analytics, payments and settings |
| Admin | Dashboard, listing collection/create/edit, moderation, reports/support/delivery queue, companies, users/detail, badges |
| Admin content/configuration | Campaign list/create/edit/zones, blog list/create/edit/categories, listing categories, cities, exports and settings |
| Shared states | Loading, empty, unavailable, retry, validation, selected/expanded states, keyboard focus, mobile drawers and unsaved changes |

## Findings and implemented resolutions

P1 means a task can become inaccessible, misleading or fail to preserve the user's intent. P2 means a material clarity, efficiency or responsive-design improvement. The table distinguishes observed defects from design recommendations; every row is implemented.

| ID | Priority / type | Finding | Implemented resolution and acceptance |
| --- | --- | --- | --- |
| D01 | P2 · Design | Homepage categories followed promotions, company cards and several ad containers. The mobile search form consumed four full rows. | Categories now follow search, with a compact two-row shelf on phones and a full directory link. Search uses a two-column mobile layout. Section actions wrap, and desktop listing cards receive more space. |
| D02 | P2 · Content | The hero claimed to be the largest market; premium company placement was labelled as trust. Neither claim followed from the data being rendered. | Replaced the unsupported superlative with a description of what visitors can find. Company placement is labelled as a selection; the separate verified badge still follows `isVerified`. |
| D03 | P2 · Defect | Featured and urgent badges occupied overlapping corners. Large view counts crowded out the city in narrow cards. | Badges share a wrapping group. Grid cards prioritize title, price, city and date; location and date have separate lines. Borders and spacing are consistent. |
| D04 | P2 · Design | Search, grid collections and list collections maintained separate versions of listing presentation. | Search and the list-item adapter now use `ListingCard`, sharing price handling, badge layout, title treatment and metadata. |
| D05 | P2 · Navigation | Mobile visitors lacked a complete top-level navigation menu; companies were absent from the desktop primary navigation. | Added an accessible mobile dialog with discovery, companies and support/content links. Added companies to desktop navigation and exposed the active section. Corrected the city breadcrumb and structured breadcrumb URL to point to the working collection route. |
| D06 | P1 · Keyboard defect | Category/account disclosures depended on pointer dismissal; the admin account menu used a full-screen click overlay. | Added shared disclosure behavior: Escape closes and restores trigger focus; moving focus or clicking outside closes the panel. Ordinary links retain normal Tab navigation. |
| D07 | P1 · Search defect | Suggestions ignored category/city scope; “all results” discarded those filters. A selected suggestion could still win after Escape. | Suggestion requests and the full-results link retain scope. Enter opens a suggestion only while it is visible and selected. Input/filter changes clear stale suggestions; dismissal aborts pending requests. The listbox contains only options. D24 aligns scoped suggestions with the live API contract. |
| D08 | P2 · Recovery | Search mixed catalogue-load errors with result errors, and clearing a search could leave stale loading/error state. Empty states gave advice without an action. | Separate catalogue feedback, reset empty-query state, provide a visible heading and announced result count, and add clear/browse actions. Invalid page values normalize to page one. |
| D09 | P1 · Contrast defect | Some hover actions still switched from the corrected orange to the older bright orange; a member admin shortcut retained a bright amber fill. | Updated affected filter, homepage, listing-admin and member actions to the darker action palette. |
| D10 | P2 · Responsive defect | Many pagination pages squeezed numbered links between wide previous/next labels. Total/result context was absent from the shared paginator. | Responsive icon controls, wrapping page links, larger hit areas and a page/total summary. Verified with a 31-page collection. |
| D11 | P1 · Keyboard defect | Desktop carousel arrows were transparent until pointer hover, including when focused with the keyboard. | Focus within the carousel reveals arrows; explicit scrolling respects reduced-motion preferences. Grid/list buttons expose the selected view and keep their focus indicator inside the control. |
| D12 | P2 · Mobile layout | Bottom navigation did not include safe-area padding, and footer content could sit beneath fixed mobile controls. | Added safe-area padding and footer clearance for navigation/ads. Scroll padding gives focused controls space below sticky headers. Physical iOS safe-area behavior remains outside Chromium emulation. |
| D13 | P2 · Admin design | Small navigation and page titles weakened hierarchy; collapsed links relied on icon/title presentation, and mobile header search was hidden. | Larger stable-width sidebar, readable navigation, consistent heading scale, wrapped breadcrumbs and explicit link names. Mobile navigation remains expanded after desktop collapse. Added keyboard-accessible mobile search. |
| D14 | P2 · Workflow | Dashboard recent records were inert; active/today counters linked to an unfiltered collection. Moderation appeared below the counters. | Recent records link to their editors. Active counts open corresponding status filters; today's listings open the date filter. Moderation comes first, with larger counters and clearer section spacing. |
| D15 | P1 · Admin filtering | Listing filters used a fixed category/city catalogue, omitted rejected/archived tabs, and custom date inputs lacked labels/validation. | Load live admin catalogues, expose rejected/archived states, label and validate date ranges, synchronize date fields with URL state, retain filters during load errors, and provide filter clearing. Bulk controls wrap on small screens. |
| D16 | P1 · State defect | Operations failures could leave old cases visible beneath a new tab's error; malformed responses were not checked. | Validate the response, ignore aborted requests, hide stale cases on error, reset delivery-topic state between tabs and prevent tab changes during an in-flight mutation. Retry restores the current queue. |
| D17 | P1 · Campaign targeting | Both campaign editors used hardcoded category IDs, potentially targeting a different category in an imported/customized catalogue. | Load and validate categories from the admin API, alongside required references. The rendered checkbox IDs and saved targeting IDs come from those records. |
| D18 | P1 · Campaign save defect | Upload failure returned `null`, allowing the save sequence to continue. Missing banners and reversed dates reached the API. | Failed uploads stop the save and retain the selected file for retry. Validate required images and date order locally. Successful replacement updates the preview and saved baseline. |
| D19 | P1 · Campaign accessibility | File-picker drop zones were clickable divs; image removal lacked a useful name; stored asset paths were used directly in previews. | Use named native upload buttons and named remove buttons. Normalize stored paths through `imgSrc`. Track selected previews as unsaved work and release temporary object URLs. |
| D20 | P2 · Completion state | New campaign/manual-listing success used delayed navigation while still reporting unsaved changes. | Mark successful submissions saved and navigate immediately to the relevant record/collection. |
| D21 | P1 · Favourite state | A failed initial status request silently appeared as “not favourited”; toggles used a state-only duplicate-click guard. | Validate the initial status, disable unknown state, expose retry and abort outdated loads. A synchronous lock prevents duplicate toggles; only confirmed responses update the state. |
| D22 | P2 · Share recovery | Clipboard failure was unhandled and copy feedback disappeared after a timer. | Catch denied/unavailable clipboard access, offer a selectable read-only URL, announce successful copying and suppress duplicate copy requests. |
| D23 | P2 · Structure | The member shell supplied an `h1` in addition to each route's own primary heading. | Keep the shell label as contextual text; each member page owns its primary heading. |
| D24 | P1 · Search contract | The indexed search endpoint filters display names, while catalogue controls submit slugs. Sidebar suggestions ignored the current filters; searching within a city/category route lost its category, and cleared form fields could retain their old URL values. | Scoped header suggestions use the same collection API as the results page. Sidebar suggestions and submitted searches rebuild the current filter state, including the route's city/category, and remove cleared values and pagination. |
| D25 | P1 · Keyboard defect | Sidebar suggestions lacked combobox semantics, arrow selection, Escape and outside-focus dismissal. Header suggestions could retain selection when focus moved to another form control. | Named listboxes with active options, arrow navigation, cancellation of pending requests, outside-pointer/focus dismissal, and distinct IDs for desktop/mobile. In the mobile filter dialog, the first Escape dismisses suggestions and the next closes the dialog and restores focus. |
| D26 | P2 · Filter recovery | A failed or malformed city catalogue silently left the city control empty, suggesting that no cities existed. A fixed route city also appeared to be a removable filter. | Explicit loading/error states, disabled unavailable options and a retry action; retain the current city value during failure. Reset indicators exclude the immutable route city. |
| D27 | P2 · Pagination defect | Category, city and city/category pages accepted negative, partial or invalid `page` strings, unlike the main collection. | Each route normalizes non-positive/non-integer values to page one before requesting results and building item positions. |
| D28 | P1 · Campaign media contract | A successful upload response without a URL could still reach save. The direct-image-URL field offered a path rejected by asset ownership checks. The campaign overview still used a relative stored path. | Validate uploaded image URLs before create/update, retain the selected file for retry, clear previous feedback at the start of a new save, offer the supported file-upload workflow, and normalize the overview preview URL. Extends the D18/D19 fixes to malformed responses and the second preview. |
| D29 | P1 · Editor validation | The campaign editor was a div with a click handler, so required fields, invalid destination URLs and numeric constraints bypassed form validation. | Use the shared validated form with required title, advertiser, zone, URL and dates. The error summary focuses and links to invalid fields, and invalid forms send no mutation. Successful deletion clears dirty state and immediately returns to campaigns. |
| D30 | P1 · Schedule data loss | Loading an existing campaign sliced timestamps to dates. Saving an unrelated field silently replaced both times with midnight; valid same-day campaigns could not be scheduled. | Local date/time controls with explicit timezone guidance, chronological validation and exact instant preservation, including milliseconds and an unchanged repeated hour at the daylight-saving transition. The saved overview shows the updated schedule and zone. |
| D31 | P1 · Hydration defect | Shifting the browser clock one hour ahead reproducibly caused a homepage text hydration mismatch: client carousel cards recomputed relative dates. | Render the carousel's listing cards as server children. The client component controls scrolling while reusing the server-rendered card content. This fixes the reproduced homepage issue; it does not establish the cause of O1 on the city page. |

Additional consistency fixes within D01/D15: empty homepage/search ad wrappers no longer reserve padding when no creative renders, and public collection titles use the live category catalogue instead of static names.

## Main implementation locations

- Discovery and layout: [homepage](../apps/web/src/app/page.tsx), [search](../apps/web/src/app/kerko/page.tsx), [collection](../apps/web/src/app/shpallje/page.tsx), [Navbar](../apps/web/src/components/layout/Navbar.tsx), [shared CSS](../apps/web/src/app/globals.css).
- Shared behavior: [SearchBar](../apps/web/src/components/search/SearchBar.tsx), [FilterPanel](../apps/web/src/components/filters/FilterPanel.tsx), [ListingCard](../apps/web/src/components/listings/ListingCard.tsx), [FeaturedCarousel](../apps/web/src/components/listings/FeaturedCarousel.tsx), [Pagination](../apps/web/src/components/ui/Pagination.tsx), [useDisclosure](../apps/web/src/hooks/useDisclosure.ts), [FavouriteButton](../apps/web/src/components/listings/FavouriteButton.tsx), [ShareButtons](../apps/web/src/components/listings/ShareButtons.tsx).
- Administration: [shell](../apps/web/src/app/admin/AdminShell.tsx), [dashboard](../apps/web/src/app/admin/page.tsx), [listing collection](../apps/web/src/app/admin/shpalljet/page.tsx), [operations](../apps/web/src/app/admin/operacionet/page.tsx), [campaign creation](../apps/web/src/app/admin/reklamat/new/page.tsx), [campaign editing](../apps/web/src/app/admin/reklamat/[id]/page.tsx).

## Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @oferta/web build` | Passed; production web build and its TypeScript validation. Existing Next.js ESLint-plugin configuration warning remains non-blocking. |
| `pnpm typecheck` | Passed for web, API, image and notification services. |
| `pnpm lint` | Passed. |
| `pnpm test` | 67 passed, zero failures, including schedule precision/timezone regressions added in the continuation. |
| `pnpm test:browser` | Passed. |
| `pnpm test:ui-ux` | Passed. Pagination assertion now targets the page-number link specifically, since primary navigation also exposes its current state. |
| New design interactions | Passed, including campaign create/edit upload failure and malformed-response recovery, keyboard upload, form validation, exact schedule preservation, scoped sidebar search and nested Escape behavior. |
| Final responsive/accessibility sweep | Passed: **224 observations**, **zero runtime errors**, **zero document-wide overflow**. All 56 mobile axe scans reported zero violations. Every route example had one main landmark and one primary heading. Expected HTTP statuses passed, including the deliberate 404 example. |
| Final campaign refinement | After the full sweep, shortened date/time controls to minute precision while retaining untouched timestamp precision. Rebuilt and reran all design interactions, plus both campaign routes at four widths: **8 additional observations**, zero overflow/runtime errors/axe violations. The open mobile filter dialog also passed axe. |

**Intermittent observation O1:** an earlier production sweep recorded one React HTML hydration error on `/qytete/test-city` at 768px. The page still rendered. Ten repeated production visits and twelve development visits covering the city/category route sequence did not reproduce it. The original [observation](audits/design-2026-10-21/hydration-observation.json) and [failed-run output](audits/design-2026-10-21/verification-design-initial.txt) are retained. No root cause was established, so this is not claimed as a fixed defect. Both the first-pass and continuation sweeps passed independently with no recurrence across 224 observations each. Their assertions still fail on any runtime error; no warning was filtered or suppressed. O1 remains an unresolved caveat, separate from the 31 implemented findings.

**Reproduced and fixed hydration issue D31:** the continuation deliberately shifted the browser clock one hour ahead and recorded a homepage text mismatch. The matching [before diagnostic](audits/design-2026-10-21/clock-before/routes.json) reports one error; the [after diagnostic](audits/design-2026-10-21/clock-after/routes.json) reports zero. The normal regression suite now includes this clock-shift condition. The city observation has a different route/error detail and is not equated with this reproduced issue.

The new suite checks mobile/desktop menu focus and dismissal, scoped suggestions, Escape followed by Enter, clipboard-denial recovery, favourite status failure/retry, duplicate toggles, dashboard links, collapsed/mobile admin navigation, live catalogue filters, invalid dates, bulk-toolbar fit, operations failure/retry, campaign category IDs, keyboard file selection and failed image-upload/save recovery. The continuation adds sidebar scope and cleared-filter checks, malformed city recovery, an accessibility scan with mobile filters and suggestions open, create/edit malformed-upload recovery, required-field validation, unchanged schedule preservation, same-day local-to-UTC conversion, invalid route pagination and a deliberately shifted browser clock. Unit coverage also checks unchanged timestamps across three time zones and repeated daylight-saving hours.

The existing browser suites cover posting, draft/login recovery, image ordering/limits, filters and Back navigation, contact/report retry, dashboard partial failures, company/campaign pagination, partial bulk results, user selection, dirty editors, publication preview and moderator access.

## Evidence

- [Verification summary](audits/design-2026-10-21/summary.json).
- [Before snapshots and metrics](audits/design-2026-10-21/before/routes.json): 32 observations from eight representative screens at four widths.
- [First-pass route/viewport/accessibility results](audits/design-2026-10-21/after/routes.json) and [continuation full sweep](audits/design-2026-10-21/continued/routes.json).
- [Build output](audits/design-2026-10-21/verification-build.txt), [type checks](audits/design-2026-10-21/verification-types.txt), [lint](audits/design-2026-10-21/verification-lint.txt), [unit tests](audits/design-2026-10-21/verification-unit.txt) and [posting/browser suite](audits/design-2026-10-21/verification-browser.txt).
- [New design regression output](audits/design-2026-10-21/verification-design.txt) and [existing UI/UX output](audits/design-2026-10-21/verification-ui-ux.txt).
- Continuation: [build](audits/design-2026-10-21/continued-build.txt), [web types](audits/design-2026-10-21/continued-types.txt), [lint](audits/design-2026-10-21/continued-lint.txt), [67 unit tests](audits/design-2026-10-21/continued-unit.txt), [browser flows](audits/design-2026-10-21/continued-browser.txt), [UI/UX suite](audits/design-2026-10-21/continued-ui-ux.txt), and [expanded design suite](audits/design-2026-10-21/continued-design.txt).
- Final campaign refinement: [interaction and focused sweep output](audits/design-2026-10-21/continued-final.txt) and [eight route/viewport observations](audits/design-2026-10-21/continued-final/routes.json).
- Continuation screenshots: [mobile filters and suggestions](audits/design-2026-10-21/continued-final/390-mobile-filter-suggestions.png), [desktop campaign editor](audits/design-2026-10-21/continued-final/1440--admin-reklamat-ad-test.png), [mobile campaign editor](audits/design-2026-10-21/continued-final/390--admin-reklamat-ad-test.png).
- Screenshots: [visitor homepage](audits/design-2026-10-21/after/390--.png), [visitor search](audits/design-2026-10-21/after/390--kerko-q-banese.png), [desktop admin dashboard](audits/design-2026-10-21/after/1440--admin.png), [mobile admin listings](audits/design-2026-10-21/after/390--admin-shpalljet.png), [mobile settings](audits/design-2026-10-21/after/390--admin-cilesimet.png).

Listing photos and advertising creatives are synthetic placeholders. The initial baseline also replaced optimized logos; the final captures serve the repository logos. The final sweep expands the catalogue to twelve categories for stress testing. These fixture differences are not product changes or evidence of missing production images.

## Reproduction and limits

```sh
pnpm --filter @oferta/web typecheck
pnpm lint
pnpm test
pnpm --filter @oferta/web build
pnpm test:browser
pnpm test:ui-ux
pnpm test:design
DESIGN_SWEEP=1 pnpm test:design
# Optional accessibility sweep using a locally supplied axe script:
DESIGN_SWEEP=1 AXE_PATH=/absolute/path/to/axe.min.js pnpm test:design
```

Chromium must be installed, as described in the README. Without `AXE_PATH`, the design suite still runs interaction/layout checks and explicitly marks accessibility scans as not run. Browser fixtures exercise frontend contracts; they do not prove live service/provider behavior.

This pass changes frontend code, browser tests, CI and documentation. It makes no database/schema changes. Real Safari/iOS/Android, assistive-technology sessions, production admin credentials, provider email delivery and production publishing were not part of the local verification. The existing SMTP configuration issue is not represented as fixed by interface changes.
