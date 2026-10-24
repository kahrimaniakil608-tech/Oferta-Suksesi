# Oferta Suksesi — public, member and admin UI/UX audit

**Date:** 20 October 2026

**Source reviewed:** `27e4534bbeb03376cff38a55152dcc2baf87d2ac`, branch `codex/audit-fixes-20261019`

**Live application release at audit time:** `32789dd47da80564e7b84ec75283fc76e1abf76b`, with the web listener correction

**Deliverable:** one complete review of the page inventory, containing **50 findings: 14 P1, 32 P2 and 4 P3**. The findings below preserve the original audit observations. **All 50 have implementations in `e7dd277`, reported deployed on 20 October**; see the [resolution register and verification report](UI-UX-FIXES-2026-10-20.md) for automated results and remaining browser acceptance.

The strongest opportunities are reliable administrative feedback, accessible forms/navigation, better mobile administration, and consistent discovery and posting journeys. Some issues are functional: company pagination repeats page one, the campaign list stops at 50 records, and certain bulk actions do not refresh their client-side lists. Others are design improvements, explicitly identified below.

This complements the [19 October engineering audit](AUDIT-FINDINGS-2026-10-19.md). Its implementation tracker describes the earlier work, not proof that every sibling screen has equivalent behavior. In particular, the earlier public dialog, filter, dashboard and draft fixes do not cover every admin modal, search entry point, editor or error state identified here.

## Scope and evidence

The review covered the public site, signed-in member area, administrator area and moderator navigation. It examined information hierarchy, discoverability, responsive layouts, forms, validation, keyboard behavior, accessibility semantics, empty/error/loading states, destructive actions, status messages and content consistency.

| Method | Coverage and limits |
| --- | --- |
| Source review | Current Next.js route inventory, shared components, and relevant API contracts. Source locations below refer to the reviewed commit. |
| Local browser | Built Next.js application in Chromium with a synthetic API. 55 route examples plus a valid-token reset variant; 168 retained route/viewport observations at 1440, 390 and 320 CSS pixels. Dynamic routes used representative synthetic records. |
| Accessibility automation | axe-core 4.10.3 at 390 pixels, using WCAG 2 A/AA, 2.1 AA, 2.2 AA and best-practice tags. Results retained for 52 valid page renders. Repeated shared-component warnings are consolidated, not counted as separate findings per page. |
| Interaction checks | Closed admin sidebar focus order, badge dialog opening/Escape, moderator landing, new-post draft recovery, admin draft loss, company pagination, bulk refresh, user selection across filters and injected request failures. |
| Live public browser | 24 passive visits: 12 routes at 1440 and 390 pixels. Homepage, listings, search, categories, companies, blog, posting, login, contact, and real listing/category/company detail pages. All returned HTTP 200; no document-wide horizontal overflow was observed at those widths. |
| Visual evidence | Eleven screenshots, including actual public pages and synthetic admin/member screens. Synthetic images/logos were replaced by a one-pixel placeholder: blank image areas in those screenshots are **not product findings**. |

No production admin credentials were used. Admin mutations were simulated locally; no production records were changed and no customer email was sent. Browser navigation to a page does not certify every possible data combination or successful completion of its workflow.

Two initial synthetic responses omitted company pagination metadata and blog-category counts. Those fixture errors were corrected and the pages rerun at all three widths; their initial error screens are excluded from findings and accessibility aggregates.

Evidence is retained in [the evidence summary](audits/ui-ux-2026-10-20/evidence.json) and [the raw axe findings](audits/ui-ux-2026-10-20/axe-findings.json). The latter includes automated candidates and shared-layout repetition; use the reviewed findings below as the actionable list.

### Reading the findings

- **P1:** fix first because a common task can become inaccessible, misleading, unreachable or lose work.
- **P2:** substantial usability, clarity or consistency problem; address during the UI/UX improvement work.
- **P3:** lower urgency refinement or a claim requiring business validation.
- **Defect:** observed behavior or a directly traceable implementation mismatch.
- **Improvement:** a proposed better experience; not a claim that the existing function is broken.
- **Verify:** the interface contains a claim that needs supporting business evidence.
- **B / L / S:** local browser evidence / live public observation / source evidence.

Priorities are relative to this UI/UX audit. They are not security severity ratings. The acceptance checks describe the intended outcome; the linked implementation report records what was changed and which checks were performed.

## Complete route coverage

Repeated dynamic URL values are represented once per page family. Authentication-dependent pages used the appropriate synthetic role.

| Area | Routes reviewed | Main findings |
| --- | --- | --- |
| Homepage and discovery | `/`, `/shpallje`, `/kerko`, `/kategorite`, `/kategorite/[slug]`, `/qytete/[slug]`, `/qytete/[slug]/[category]` | UX01–03, UX07, UX10–19 |
| Listing and identities | `/shpalljet/[slug]`, `/perdoruesit/[id]`, `/kompanite`, `/kompanite/[slug]` | UX18, UX20–24 |
| Posting | `/posto-shpallje`; create rendered, edit flow source reviewed | UX02–03, UX08–09, UX24–28 |
| Authentication | `/auth/hyr`, `/auth/regjistrohu`, `/auth/fjalekalim-i-harruar`, `/auth/rivendos-fjalekalimin`; reset with and without a token | UX01–03, UX07, UX32 |
| Content and support | `/blog`, `/blog/[slug]`, `/kontakti`, `/rreth-nesh`, `/redaksia`, `/pyetjet-e-shpeshta`, `/kushtet-e-perdorimit`, `/politikat-e-privatesise`, a valid CMS `/<slug>`, nonexistent URL | UX03, UX10–12, UX21, UX27, UX29–30 |
| Member | `/paneli`, `/paneli/shpalljet`, `/paneli/te-preferuarat`, `/paneli/analitika`, `/paneli/pagesat`, `/paneli/cilesimet` | UX01–03, UX06–12, UX31–36 |
| Admin dashboard and shell | `/admin`, shared navigation, moderator access | UX01–12, UX45 |
| Listing administration | `/admin/shpalljet`, `/admin/shpalljet/new`, `/admin/shpalljet/[id]`, legacy `/admin/shpallje`, `/admin/moderimi` | UX02–09, UX37–39, UX41, UX43, UX46 |
| Work queue | `/admin/operacionet`, reports/support/delivery UI source | UX10, UX47 |
| Users and companies | `/admin/perdoruesit`, `/admin/perdoruesit/[id]`, `/admin/kompanite`, `/admin/badges` | UX02–09, UX37–41, UX43 |
| Advertising | `/admin/reklamat`, `/admin/reklamat/new`, `/admin/reklamat/[id]`, `/admin/reklamat/zonat` | UX02–09, UX37–38, UX42–43, UX49 |
| Blog administration | `/admin/blog`, `/admin/blog/e-re`, `/admin/blog/[id]`, `/admin/blog/kategorite` | UX02–09, UX37–38, UX48 |
| Taxonomy and configuration | `/admin/kategorite`, `/admin/qytetet`, `/admin/cilesimet`, `/admin/eksportet` | UX02–09, UX38, UX44, UX50 |

API-only readiness, robots and sitemap endpoints were not counted as interactive UI pages.

## Findings: shared foundations

### UX01 — Low contrast affects actions and supporting information

**P1 · Defect · B/L/S**

Orange buttons with small white text and pale gray supporting text fail automated contrast checks. Examples include approximately **2.9:1** white text on `#E87A1E`, and **2.4:1** `#99A1AF` on `#F4F6F8`. Dates, form hints, tab labels and status context are especially hard to read.

**Improve:** define accessible text/action tokens and apply them across public and admin themes. Preserve the brand orange through suitable darker fills or darker foreground text.

**Acceptance:** normal text reaches 4.5:1 and qualifying large text 3:1, with hover/focus/selected states checked separately. These thresholds follow [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Evidence:** [theme](../apps/web/src/app/globals.css), [admin theme](../apps/web/src/app/admin/layout.tsx#L150), [mobile settings screenshot](audits/ui-ux-2026-10-20/admin-settings-mobile.png).

### UX02 — Many visible labels are not connected to their controls

**P1 · Defect · B/S**

Member settings and several admin editors render labels beside inputs without `htmlFor`/matching IDs or a wrapping label. Axe identified unnamed inputs/selects. The public posting `Field` helper also assigns its ID to the immediate child: for composite controls such as price, that child is a wrapper rather than the input.

**Improve:** use one field component that connects label, input, instructions and error. Give icon buttons and switches explicit names.

**Acceptance:** every editable control has the correct accessible name; clicking its visible label focuses/toggles it. Test composite price/phone fields as well as simple inputs.

**Evidence:** [member settings](../apps/web/src/app/paneli/cilesimet/page.tsx#L112), [blog editor](../apps/web/src/app/admin/blog/e-re/page.tsx#L108), [posting Field](../apps/web/src/app/posto-shpallje/page.tsx#L870), [axe results](audits/ui-ux-2026-10-20/axe-findings.json).

### UX03 — Feedback often disappears or is disconnected from the failed field

**P2 · Defect · B/S**

Many admin messages are three-second toasts without a live announcement. Several form errors appear as generic text away from the responsible input. Users can miss the failure, especially after scrolling or while navigating with assistive technology.

**Improve:** retain actionable errors until resolved, associate field errors with inputs, focus an error summary on failed submission, and announce success without moving focus.

**Acceptance:** a failed save remains understandable after ten seconds; the user can reach each invalid field from the summary; retry preserves input. Apply [W3C error identification guidance](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html).

**Evidence:** [user toasts](../apps/web/src/app/admin/perdoruesit/page.tsx#L71), [ad toasts](../apps/web/src/app/admin/reklamat/page.tsx#L78), [blog form error](../apps/web/src/app/admin/blog/e-re/page.tsx#L95).

### UX04 — Admin dialogs do not manage keyboard focus

**P1 · Defect · B/S**

Opening “Shto Badge” left focus on the launch button, exposed no dialog role, and Escape did not close it. Categories, cities, companies and user-management screens contain similar overlay markup. The public shared modal improvements were not adopted here.

**Improve:** migrate these overlays to the shared accessible dialog pattern, with a name, initial focus, contained Tab order, inert background, Escape and focus restoration.

**Acceptance:** complete create/edit/delete dialogs using only the keyboard; focus cannot escape behind an open modal. Follow the [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

**Evidence:** [badge modal](../apps/web/src/app/admin/badges/page.tsx#L256), [category modal](../apps/web/src/app/admin/kategorite/page.tsx#L231), [screenshot](audits/ui-ux-2026-10-20/admin-badge-modal-mobile.png), [interaction evidence](audits/ui-ux-2026-10-20/evidence.json).

### UX05 — Closed mobile admin navigation still receives focus offscreen

**P1 · Defect · B/S**

At 390 pixels, the first six Tab stops entered the translated-offscreen sidebar, with link coordinates around `x=-200`. The closed panel retains its focusable links. The menu toggle also lacks an explicit accessible label and expanded state.

**Improve:** make the closed mobile sidebar inert or remove it from the focus order. Give the trigger a name, `aria-expanded` and `aria-controls`; manage focus and Escape while open.

**Acceptance:** with the drawer closed, every Tab stop is visible. Opening and closing restores predictable focus without moving the page unexpectedly.

**Evidence:** [sidebar](../apps/web/src/app/admin/layout.tsx#L155), [header toggle](../apps/web/src/app/admin/layout.tsx#L250), [recorded focus positions](audits/ui-ux-2026-10-20/evidence.json).

### UX06 — Nested landmarks and no skip link make navigation repetitive

**P2 · Defect · B/S**

The root layout supplies a `main`, then admin and member layouts add another `main`. Axe reports nested/duplicate main landmarks. Repeated navigation does not provide a skip-to-content link, and multiple navigation regions are not consistently named.

**Improve:** give each rendered page one main landmark, label distinct navigation areas, and provide a visible-on-focus skip link.

**Acceptance:** landmark navigation identifies one main region and distinguishable navigation regions. The first keyboard action can bypass repeated navigation.

**Evidence:** [root layout](../apps/web/src/app/layout.tsx#L51), [admin layout](../apps/web/src/app/admin/layout.tsx#L334), [member layout](../apps/web/src/app/paneli/layout.tsx#L148).

### UX07 — Small controls and tiny supporting text are difficult on phones

**P2 · Defect / improvement · B/L/S**

The sticky-ad dismiss button is approximately 18×18 pixels, and dense admin icon actions use similarly small controls. Metadata and navigation labels frequently use 9–12 pixel text. The live listing/search screenshots show how much important context is compressed.

**Improve:** enlarge actionable hit areas independently of icon size, increase supporting text where space allows, and reduce simultaneous metadata rather than shrinking it.

**Acceptance:** assess each target against the 24 CSS pixel minimum and spacing exceptions; prefer roughly 44 pixels for frequent touch actions. A target below 24 pixels is not automatically a failure if an exception applies. See [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Evidence:** [ad dismiss control](../apps/web/src/components/ads/MobileStickyAd.tsx#L64), [listing administration](../apps/web/src/app/admin/shpalljet/page.tsx), [public search screenshot](audits/ui-ux-2026-10-20/public-search-mobile.png).

### UX08 — Editing existing content can lose unsaved work

**P1 · Defect · B/S**

Changing an admin listing title and refreshing restored the original title with no recovery. Admin editors lack a common dirty-state guard. Public new-post drafts do survive reload, but the posting page explicitly skips draft persistence in edit mode.

**Improve:** add draft recovery or navigation protection to existing-listing, blog, company and campaign editors. Explain which operations save immediately and which wait for Save.

**Acceptance:** edit a long description, navigate away or refresh, and either recover it or receive a useful warning. Saved content must clear the warning; protected drafts must be scoped to the account and record.

**Evidence:** [admin listing editor](../apps/web/src/app/admin/shpalljet/[id]/page.tsx), [edit-mode draft exclusion](../apps/web/src/app/posto-shpallje/page.tsx#L334), [reload evidence](audits/ui-ux-2026-10-20/evidence.json).

### UX09 — Several mutations have no pending state or recoverable failure

**P2 · Defect · S**

Campaign pause/delete, listing feature/delete/restore and some profile actions do not consistently disable the initiating action, catch network errors or show a row-specific result. Repeated clicks can issue repeated requests, while a failure may produce no useful visible explanation.

**Improve:** use a consistent mutation state per action/record; disable duplicates, retain context and show a persistent retryable failure.

**Acceptance:** simulate a slow request and then a 503 for each action. One intent produces one in-flight request, controls recover afterward, and the row reflects only confirmed changes.

**Evidence:** [campaign mutations](../apps/web/src/app/admin/reklamat/page.tsx#L92), [listing mutations](../apps/web/src/app/admin/shpalljet/page.tsx#L197), [profile save](../apps/web/src/app/paneli/cilesimet/page.tsx#L52).

### UX10 — Terminology and status language change across screens

**P2 · Improvement · B/L/S**

Albanian UI mixes “Featured,” “Badges,” “Dashboard,” raw `PENDING_REVIEW`/`OPEN` statuses and technical queue topics. The same concept receives different labels in cards, member lists and admin controls.

**Improve:** maintain a shared Albanian vocabulary and status-label map. Keep technical identifiers in secondary diagnostics rather than the primary task interface.

**Acceptance:** the same listing state has the same human-readable label across its receipt, member list, analytics and admin detail; no unexplained enum appears in normal customer flows.

**Evidence:** [member analytics](../apps/web/src/app/paneli/analitika/page.tsx#L110), [operations statuses](../apps/web/src/app/admin/operacionet/page.tsx#L114), [admin navigation](../apps/web/src/app/admin/layout.tsx), [screenshot](audits/ui-ux-2026-10-20/member-analytics-mobile.png).

### UX11 — Page titles and heading hierarchy do not consistently identify the task

**P2 · Improvement · B/S**

Many admin/member pages inherit the same browser title. Some pages rely on an `h2` or shared layout heading rather than a clear page-specific top-level heading. Multiple tabs become difficult to distinguish, and assistive-technology heading navigation is uneven.

**Improve:** give each route a useful title and coherent heading hierarchy; include the entity name on edit/detail pages without exposing sensitive information unnecessarily.

**Acceptance:** five open admin tabs can be identified from their titles, and heading navigation clearly identifies each page and its sections.

**Evidence:** [root metadata](../apps/web/src/app/layout.tsx), [member analytics](../apps/web/src/app/paneli/analitika/page.tsx#L68), [route titles/headings](audits/ui-ux-2026-10-20/evidence.json).

### UX12 — Active, selected and expanded states are often visual only

**P2 · Defect · B/S**

Sidebar/bottom-navigation active states and several admin tab groups depend on color and styling without consistently exposing current/selected state. FAQ expansion does not communicate the relationship between the trigger and answer.

**Improve:** use `aria-current` for current navigation, appropriate pressed/tab semantics for controls, and `aria-expanded`/`aria-controls` for accordions. Do not apply tab roles unless implementing their keyboard behavior.

**Acceptance:** selected navigation and expanded answers are identifiable without seeing the screen; state changes remain clear in high-contrast mode.

**Evidence:** [member navigation](../apps/web/src/app/paneli/layout.tsx#L124), [bottom navigation](../apps/web/src/components/layout/BottomNav.tsx), [FAQ](../apps/web/src/app/pyetjet-e-shpeshta/page.tsx), [listing tabs](../apps/web/src/app/admin/shpalljet/page.tsx#L294).

## Findings: public discovery, content and posting

### UX13 — Searching from the filter sidebar drops the browsing context

**P2 · Defect · S**

From a category/city listing page, the sidebar search submits only `/kerko?q=...`. Existing category, city, price, photo and sort choices are discarded. Ordinary Filter Apply preserves query state; this separate search path does not.

**Improve:** submit keyword changes through the same query-state model, retaining applicable filters or explicitly offering a search of the whole site.

**Acceptance:** choose a category, city and price range, search from that page, and retain them in the destination URL and controls. Back navigation restores the same state.

**Evidence:** [sidebar submission](../apps/web/src/components/filters/FilterPanel.tsx#L194).

### UX14 — Search and browsing expose different filtering capabilities

**P2 · Improvement · B/L/S**

The keyword search page offers category/city choices, while listing/category pages expose price, photo, featured, sort and view controls. Users following the main search box cannot refine with the same tools used elsewhere.

**Improve:** unify the results/filter interface and URL contract, with visible applied filters and a consistent reset action.

**Acceptance:** equivalent criteria produce the same visible filter state whether entered from the homepage, category page, city page or `/kerko`; mobile users can discover the available refinements.

**Evidence:** [search filters](../apps/web/src/app/kerko/page.tsx#L86), [shared filter panel](../apps/web/src/components/filters/FilterPanel.tsx), [live search](audits/ui-ux-2026-10-20/public-search-mobile.png).

### UX15 — Failed search can also claim that there are no matches

**P2 · Defect · B/S**

With the listings endpoint returning 503 on the first search, the page simultaneously displayed an error/retry message and “Nuk u gjet asgjë me këta filtra.” It also claimed previous results were preserved when none had loaded.

**Improve:** separate initial error, stale-results error and genuine zero-results states. Gate the empty-results message on a successful response.

**Acceptance:** first-load 503 shows only an unavailable/retry state; a successful empty response shows zero matches; failure after a successful search clearly labels the retained results.

**Evidence:** [empty-state condition](../apps/web/src/app/kerko/page.tsx#L274), [captured failure](audits/ui-ux-2026-10-20/public-search-failure.png).

### UX16 — Price ranges can contradict themselves without local guidance

**P2 · Defect · S**

The filter panel writes minimum and maximum prices directly to the query. It does not check that the minimum is no greater than the maximum before applying.

**Improve:** validate the pair together, explain the problem beside both fields, and preserve the entries for correction.

**Acceptance:** a minimum of 500 and maximum of 100 cannot silently become a normal results request. Empty bounds, zero, decimals and keyboard entry have clear behavior.

**Evidence:** [filter application](../apps/web/src/components/filters/FilterPanel.tsx#L202).

### UX17 — Search suggestions lack a complete accessible combobox contract

**P2 · Defect · B/S**

Search inputs expose expanded/listbox behavior but do not consistently establish a combobox role, stable option IDs and active-descendant association. Arrow-key visual selection is not sufficient to announce the highlighted suggestion.

**Improve:** implement a single reusable suggestion component following the [W3C combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

**Acceptance:** keyboard and screen-reader users hear the popup state, current option and result context; Escape closes suggestions without changing the query; Enter has predictable behavior.

**Evidence:** [homepage search](../apps/web/src/components/search/SearchBar.tsx#L199), [search autocomplete](../apps/web/src/components/search/SearchAutocomplete.tsx#L129), [axe results](audits/ui-ux-2026-10-20/axe-findings.json).

### UX18 — Zero and unspecified prices have inconsistent presentation

**P2 · Defect / improvement · L/S**

Listing cards suppress a nonpositive price, while other result cards display `0 €`. The live search also contained `1 €` prices. The interface does not consistently distinguish free, negotiable, unspecified and numeric pricing; a placeholder amount can look like a genuine offer.

**Improve:** define supported price states and render them through one formatter. Do not infer that every zero or one is invalid; require explicit seller intent where appropriate.

**Acceptance:** the same listing has the same price meaning on homepage, search, favourites, company and detail views, including zero, missing, negotiable and ordinary numeric values.

**Evidence:** [shared card](../apps/web/src/components/listings/ListingCard.tsx), [search cards](../apps/web/src/app/kerko/page.tsx), [live examples](audits/ui-ux-2026-10-20/public-search-mobile.png).

### UX19 — “View all” from featured listings does not retain that selection

**P2 · Defect · S**

The homepage featured section links to the general `/shpallje` route without a featured filter. The destination does not represent “all of the featured items” implied by the section.

**Improve:** link to the corresponding filtered collection, or label the link explicitly as browsing all listings.

**Acceptance:** the destination heading, active filter and returned records match the link's promise.

**Evidence:** [featured section link](../apps/web/src/app/page.tsx#L89).

### UX20 — Company profile pagination repeatedly loads page one

**P1 · Defect · B/S**

For a company with multiple listing pages, clicking page 2 changed the browser URL to `?page=2`, but the server still requested `/companies/synthetic?page=1`. `CompanyPage` does not read `searchParams`, although its links generate them.

**Improve:** parse and validate the requested page, pass it to the data loader, and keep current-page state consistent with the response.

**Acceptance:** with more than 20 company listings, page 2 displays a distinct set and remains selected after reload; invalid/out-of-range pages behave deliberately.

**Evidence:** [page loader](../apps/web/src/app/kompanite/[slug]/page.tsx#L64), [pagination links](../apps/web/src/app/kompanite/[slug]/page.tsx#L234), [request trace](audits/ui-ux-2026-10-20/evidence.json).

### UX21 — Some unavailable content is presented as missing content

**P2 · Defect · S**

Company and CMS loaders return `null` for both a genuine 404 and a temporary upstream failure, then render not-found. Similar fallback patterns occur in profile/blog content. This can send users away from valid content during an outage.

**Improve:** distinguish missing/unpublished content from unavailable data. Provide a retryable error for temporary failures and keep appropriate HTTP semantics.

**Acceptance:** an actual missing record produces not-found; a 503 produces a useful temporary error. Blog collection failure must not be described as an empty editorial catalogue.

**Evidence:** [company loader](../apps/web/src/app/kompanite/[slug]/page.tsx#L45), [CMS loader](../apps/web/src/app/[slug]/page.tsx#L27), [blog collection](../apps/web/src/app/blog/page.tsx), [profile loader](../apps/web/src/app/perdoruesit/[id]/page.tsx).

### UX22 — Photos cannot be deliberately opened for detailed inspection

**P2 · Improvement · B/L/S**

The listing gallery supports switching images but lacks a clear full-image/zoom viewer. Cropped display images are insufficient for inspecting room plans, product condition or text inside a photo.

**Improve:** add an accessible full-image viewer with image count, previous/next controls, Escape and focus restoration; use the appropriate full-resolution asset only when needed.

**Acceptance:** a user can inspect the full uncropped image on desktop and mobile, navigate all photos, and return to the original scroll position.

**Evidence:** [gallery](../apps/web/src/components/listings/ImageGallery.tsx), [live listing](audits/ui-ux-2026-10-20/public-listing-mobile.png).

### UX23 — Seller contact is distant from the main mobile decision point

**P2 · Improvement · L/S**

On a long listing, mobile users scroll through photos, metadata and description before reaching the contact section. The persistent bottom navigation emphasizes site navigation and posting rather than contacting this seller.

**Improve:** offer a compact “Kontakto” jump/action near the title or a contextual sticky action that coexists with navigation and advertising.

**Acceptance:** seller contact is discoverable without reading the whole description, and it does not overlap the bottom navigation, ad dismissal or safe area.

**Evidence:** [listing layout](../apps/web/src/app/shpalljet/[slug]/page.tsx), [live initial viewport](audits/ui-ux-2026-10-20/public-listing-mobile.png).

### UX24 — Phone field hints and messaging buttons disagree

**P1 · Defect · S**

Posting labels the second added phone “Numri (Viber)” and the third “Numri (WhatsApp).” The public contact component sends **both** Viber and WhatsApp actions to the first number. A seller following the hints can direct buyers to the wrong messaging account.

**Improve:** either store explicit channel-to-number choices and use them, or remove the channel-specific hints and let sellers designate supported channels clearly.

**Acceptance:** with three distinct numbers, each contact button targets the intended number. The displayed number and external application destination agree.

**Evidence:** [posting phone hints](../apps/web/src/app/posto-shpallje/page.tsx#L734), [messaging targets](../apps/web/src/components/listings/ContactSection.tsx#L103).

### UX25 — Posting instructions are not derived from configured image policy

**P2 · Defect · S**

The public uploader hardcodes eight photos in its labels and slicing logic. Admin configuration can set a lower maximum and require an image for publication. The form does not consistently communicate these effective rules before submission.

**Improve:** load the safe public posting policy and use it for required indicators, capacity, validation and helper text.

**Acceptance:** configure a lower limit and image-required policy in a test environment; posting explains and enforces the same rules before submission. Preserve the existing protection for legacy photo collections.

**Evidence:** [hardcoded photo capacity](../apps/web/src/app/posto-shpallje/page.tsx#L107), [upload limit](../apps/web/src/app/posto-shpallje/page.tsx#L433), [admin policy controls](../apps/web/src/app/admin/cilesimet/page.tsx).

### UX26 — Excess selected photos are silently omitted

**P2 · Defect · S**

Selecting more photos than the remaining capacity silently slices the selection. Upload feedback is batch-level, so users are not clearly told which files were omitted or failed.

**Improve:** report the accepted/omitted count before uploading and show per-file state or a clear batch result with a retry path.

**Acceptance:** selecting ten files with three spaces remaining gives an explicit three-accepted/seven-omitted message; a failed file can be retried without duplicating successful uploads.

**Evidence:** [file selection and result handling](../apps/web/src/app/posto-shpallje/page.tsx#L433).

### UX27 — Posting receipts and button wording could make next steps clearer

**P2 · Improvement · B/S**

The guest receipt correctly says the listing awaits moderation, but gives no reference number or direct support link despite directing the guest to contact the team for changes. Signed-in submission still uses “Publiko” even when moderation may follow.

**Improve:** show a stable reference, the actual returned state, a clear next action and realistic review wording. Link support with the reference prefilled. Align submission wording with the outcome.

**Acceptance:** a guest can quote a reference and reach help from the receipt; a member can distinguish submitted, pending and published. Account creation must not imply automatic ownership of an earlier guest post.

**Evidence:** [guest receipt](../apps/web/src/app/posto-shpallje/page.tsx#L237), [submit wording](../apps/web/src/app/posto-shpallje/page.tsx#L844).

### UX28 — Working draft recovery is invisible to the person posting

**P3 · Improvement · B/S**

New-post text survived reload in the browser check. However, the form does not explain that recovery is local to the current browser session or offer an obvious resume/discard choice.

**Improve:** show a discreet draft-saved/recovered indicator and an explicit discard action. Explain the lifetime without technical storage terminology.

**Acceptance:** returning to an unfinished post makes the restored state understandable; discarding starts clean, while ordinary navigation preserves the draft.

**Evidence:** [draft persistence](../apps/web/src/app/posto-shpallje/page.tsx#L331), [successful recovery observation](audits/ui-ux-2026-10-20/evidence.json).

### UX29 — Help content contradicts current posting behavior

**P2 · Defect · S**

The FAQ says an account is required and ten photos are allowed. The current product supports guest posting and advertises eight photos. FAQ support numbers use `+383 45…`, while contact/footer use `+383 44…` and the contact page also lists `+383 49…`.

**Improve:** reconcile help with actual policy and a verified support-number source. Reuse configured limits rather than maintaining conflicting copies.

**Acceptance:** FAQ, posting, receipts and support pages agree on guest access, image limits and approved contact numbers. Keep the intentional public display of guest email.

**Evidence:** [FAQ](../apps/web/src/app/pyetjet-e-shpeshta/page.tsx#L12), [contact numbers](../apps/web/src/app/kontakti/page.tsx#L25), [footer number](../apps/web/src/components/layout/Footer.tsx#L70).

### UX30 — Marketing numbers and turnaround claims need verification

**P3 · Verify · S**

About-page copy hardcodes 50,000+ published listings, 120,000+ registered users and publication “within minutes”; another sentence calls those users active. These claims have no displayed date or source. They also differ from the review timing explained elsewhere.

**Improve:** substantiate and date the claims, clearly distinguish cumulative/registered/active metrics, or replace them with supportable qualitative copy.

**Acceptance:** each numeric claim has an agreed definition and evidence owner; publication promises match actual moderation policy. This audit does **not** infer that historical totals are false from a current database snapshot.

**Evidence:** [statistics](../apps/web/src/app/rreth-nesh/page.tsx#L11), [turnaround copy](../apps/web/src/app/rreth-nesh/page.tsx#L43), [active-user claim](../apps/web/src/app/rreth-nesh/page.tsx#L170).

## Findings: member experience

### UX31 — Settings can show empty/default values after a failed load

**P1 · Defect · S**

Member settings parses profile/preferences JSON without checking response status. A JSON error object can become an empty name/phone and all preferences enabled. There is no equivalent persistent load-error state preventing edits against unknown values.

**Improve:** validate successful responses, represent loading/error separately from actual settings, and disable saving a section whose current values were not loaded.

**Acceptance:** a 503 cannot look like an empty profile or opted-in preferences; retry restores actual values without losing intentional edits in another successfully loaded section.

**Evidence:** [settings initialization](../apps/web/src/app/paneli/cilesimet/page.tsx#L37).

### UX32 — Password requirements differ between account journeys

**P2 · Defect · S**

Member password change accepts six characters in both client and endpoint, while registration and password reset require eight. This is an inconsistent rule, not a case of the member form being rejected by an eight-character change-password endpoint.

**Improve:** define one password policy and present it consistently across registration, change, reset and admin-assisted account creation.

**Acceptance:** the same proposed password receives the same minimum-length result in each supported flow, with clear instructions before submission.

**Evidence:** [member validation](../apps/web/src/app/paneli/cilesimet/page.tsx#L71), [change-password DTO](../apps/api/src/users/users.controller.ts#L38), [registration DTO](../apps/api/src/auth/dto/register.dto.ts#L11), [reset DTO](../apps/api/src/auth/dto/reset-password.dto.ts#L11).

### UX33 — “Bump” does not explain that renewal can require moderation

**P2 · Defect / improvement · S**

The published-listing action is labelled “Ngjit,” with a tooltip promising movement up the list. It calls the renewal endpoint, which reevaluates policy and can return `PENDING_REVIEW`. The action's wording understates a possible visibility change.

**Improve:** distinguish bumping, extending expiry and resubmitting for review. Explain the applicable outcome before the action and show the returned state afterward.

**Acceptance:** a renewal that enters moderation clearly explains why the listing is no longer publicly visible; the member list and counts reflect that state.

**Evidence:** [member action](../apps/web/src/app/paneli/shpalljet/page.tsx#L141), [button](../apps/web/src/app/paneli/shpalljet/page.tsx#L307), [renewal policy](../apps/api/src/listings/listings.service.ts#L509).

### UX34 — Rejected listings need an in-product correction path

**P2 · Improvement · S**

The member list shows rejected status and an edit action, but not a customer-facing explanation or checklist of what to correct. FAQ copy directs users to email for the reason, making recovery dependent on successful delivery.

**Improve:** display a safe moderation reason and a clear edit/resubmit path in the member area. Keep internal risk signals and staff-only notes private.

**Acceptance:** a member can understand and correct a rejected listing without needing the notification email; resubmission shows its new state and next step.

**Evidence:** [member listing rendering](../apps/web/src/app/paneli/shpalljet/page.tsx#L235), [FAQ recovery guidance](../apps/web/src/app/pyetjet-e-shpeshta/page.tsx#L40).

### UX35 — Analytics labels do not explain the measurement

**P3 · Improvement · B/S**

“Kontakte” represents contact-button activity, not confirmed conversations or sales, and the view lacks a clear measurement period. A roadmap sentence about a future phase occupies the explanatory space.

**Improve:** label contact clicks accurately, define the period and explain useful next actions. Remove internal roadmap language from the customer workflow.

**Acceptance:** a member can tell whether a number means views, button clicks or actual leads, and whether it is lifetime or period-specific. Do not invent conversion metrics the application does not collect.

**Evidence:** [member analytics](../apps/web/src/app/paneli/analitika/page.tsx#L70), [roadmap text](../apps/web/src/app/paneli/analitika/page.tsx#L139), [metric source](../apps/api/src/users/users.controller.ts#L323).

### UX36 — Mobile member navigation hides later destinations

**P2 · Improvement · B/S**

At 390 pixels, the member navigation is a horizontal strip with later items beyond the visible edge. Settings and payments are easy to miss, and the active item can be partly clipped.

**Improve:** use a clearly labelled account menu, a visible overflow affordance, or scroll the active tab into view with an obvious indication that more destinations exist.

**Acceptance:** every member destination is discoverable without guessing that the strip scrolls; the current destination is fully visible and announced.

**Evidence:** [member layout](../apps/web/src/app/paneli/layout.tsx), [mobile example](audits/ui-ux-2026-10-20/member-analytics-mobile.png).

## Findings: administrator and moderator workflows

### UX37 — Failed admin collection loads can look like empty work

**P1 · Defect · B/S**

Injecting a 503 into campaign loading produced an empty campaign list, while moderation loading could settle into the empty-queue presentation after its toast disappeared. Several collection loaders clear loading without maintaining an error state.

**Improve:** distinguish loading, unavailable, empty and populated states on every collection. Keep error/retry visible until a successful response.

**Acceptance:** 503 must never say there are zero campaigns or all moderation is complete. Retry loads the collection while preserving filters and page context.

**Evidence:** [campaign loader](../apps/web/src/app/admin/reklamat/page.tsx#L82), [listing loader](../apps/web/src/app/admin/shpalljet/page.tsx#L135), [moderation](../apps/web/src/app/admin/moderimi/page.tsx), [failure observations](audits/ui-ux-2026-10-20/evidence.json).

### UX38 — Failed editor loads can leave a usable-looking blank form

**P1 · Defect · B/S**

A failed blog detail request left an editable blank form after loading finished. Settings failures similarly leave controls whose displayed values cannot be trusted. This invites editing without knowing the saved state.

**Improve:** gate editing and saving on a successful, validated load. Provide a persistent retry screen or section-specific failure instead of a normal blank form.

**Acceptance:** failures and malformed responses cannot enable saving unknown state. After retry, the record's values appear and unrelated unsaved sections remain intact.

**Evidence:** [blog detail loader](../apps/web/src/app/admin/blog/[id]/page.tsx#L48), [settings](../apps/web/src/app/admin/cilesimet/page.tsx), [injected failures](audits/ui-ux-2026-10-20/evidence.json).

### UX39 — Successful bulk actions can leave stale lists and counts

**P1 · Defect · B/S**

After simulated bulk approval, the request trace contained the mutation but no refreshed `/admin/listings` GET. The handler uses `router.refresh()`, while data lives in a client effect whose dependencies did not change. User bulk suspension and creation use the same pattern.

**Improve:** invalidate/refetch the actual client collection or update it consistently from the mutation response, including totals, status tabs and page bounds.

**Acceptance:** a successful action updates affected rows and counts immediately; an item leaving the current filter disappears; the last row disappearing from a page moves to a valid page.

**Evidence:** [bulk listing handler](../apps/web/src/app/admin/shpalljet/page.tsx#L253), [user bulk/create](../apps/web/src/app/admin/perdoruesit/page.tsx#L124), [request trace](audits/ui-ux-2026-10-20/evidence.json).

### UX40 — User selections survive changes to the visible filter

**P1 · Defect · B/S**

The user list retained “1 selected” after a client-side role-filter change. Its loader does not reset or reconcile the selected ID set. If the new filter excludes that user, a bulk action can affect a person no longer visible. The listing list already clears selection on query changes; this finding concerns the user list.

**Improve:** clear selection when scope changes, or implement an explicit cross-page selection model with visible scope and selected-record review.

**Acceptance:** select a user, apply a filter that excludes them, and verify that a subsequent bulk action cannot silently affect that hidden user. “Select all” must describe its exact scope.

**Evidence:** [user loader](../apps/web/src/app/admin/perdoruesit/page.tsx#L78), [selection and bulk handler](../apps/web/src/app/admin/perdoruesit/page.tsx#L112), [filter interaction](audits/ui-ux-2026-10-20/evidence.json).

### UX41 — Bulk actions lack sufficient consequence and result detail

**P1 · Defect / improvement · S**

Bulk suspension immediately uses a fixed 30-day duration and “Bulk suspend” reason. Parallel requests can partially succeed but produce only one generic error. Listing bulk actions use a generic reason and report the selected count rather than a detailed outcome.

**Improve:** show a consequence summary, affected-record count, relevant reason/duration controls and a per-record result summary. Retry only failed items.

**Acceptance:** a mixed-success operation distinguishes completed and failed records; operators can review the scope before a disruptive action; retry does not repeat already successful work.

**Evidence:** [user bulk suspension](../apps/web/src/app/admin/perdoruesit/page.tsx#L124), [listing bulk actions](../apps/web/src/app/admin/shpalljet/page.tsx#L253).

### UX42 — Campaign management stops at the first 50 records

**P1 · Defect · S**

The campaign list requests `limit=50` with no page control. Zone choices are derived from those loaded records and then filtered locally. Older campaigns, and zones represented only by them, become unreachable from this screen.

**Improve:** add server-backed pagination/search and query zone filters on the server. Load zone choices independently of the current campaign slice.

**Acceptance:** with at least 51 campaigns, every campaign is reachable; a zone represented only by an older campaign remains selectable; totals match the selected filters.

**Evidence:** [campaign request and filtering](../apps/web/src/app/admin/reklamat/page.tsx#L82).

### UX43 — Mobile admin tables hide the most useful columns and actions

**P2 · Improvement · B/S**

At 390 pixels, the listing table initially exposes selection and truncated titles, while status, context and actions require horizontal exploration. A scrolling table is not inherently wrong, but this layout makes routine phone moderation difficult.

**Improve:** provide compact mobile rows/cards with title, status and the primary action; put secondary data behind expansion. Alternatively pin identity/actions and clearly indicate horizontal scrolling.

**Acceptance:** a phone user can identify, inspect and act on an item without hunting across columns; full titles and critical status remain available. Do not treat permitted table scrolling as document reflow failure; see [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

**Evidence:** [listing table](../apps/web/src/app/admin/shpalljet/page.tsx), [mobile screenshot](audits/ui-ux-2026-10-20/admin-listings-mobile.png).

### UX44 — Admin settings retain a desktop sidebar on a narrow screen

**P2 · Defect · B/S**

At 390 pixels, the fixed-width settings navigation consumes nearly half the content area. Field descriptions wrap into narrow columns, and the save button overlaps its explanatory text.

**Improve:** switch the navigation to a top selector or horizontal tabs on small screens and stack the save area. Give fields the full available width.

**Acceptance:** at 320 and 390 pixels, labels, help text, switches and Save remain readable and unobstructed; no horizontal panning is needed for ordinary settings.

**Evidence:** [settings layout](../apps/web/src/app/admin/cilesimet/page.tsx#L181), [captured layout](audits/ui-ux-2026-10-20/admin-settings-mobile.png).

### UX45 — Moderator entry opens an administrator-only destination

**P2 · Improvement · B/S**

A moderator visiting `/admin` sees a permissions message and a link to moderation. Access enforcement is working, but the normal entry experience presents rejection before the role's actual work.

**Improve:** route moderators directly to their permitted work queue or provide a role-specific dashboard. Keep direct-access denial for genuinely unauthorized URLs.

**Acceptance:** moderator login/navigation lands on an actionable allowed screen without a permission alert; admin navigation remains appropriate to its role.

**Evidence:** [role routing and permissions](../apps/web/src/app/admin/layout.tsx#L145), [denied landing](../apps/web/src/app/admin/layout.tsx#L336), [browser observation](audits/ui-ux-2026-10-20/evidence.json).

### UX46 — Moderation cards provide limited decision context

**P2 · Improvement · B/S**

The moderation queue emphasizes a compact description, first image and numeric spam score. Full review requires opening another screen, and the score does not itself explain what the moderator should inspect.

**Improve:** provide an expandable or side-panel preview with full text, all images, relevant policy flags and a clear route to the underlying record. Explain the score as a signal rather than a decision.

**Acceptance:** a moderator can inspect the complete submission before approving/rejecting, preserve queue position, and understand which issue a proposed rejection reason addresses.

**Evidence:** [moderation cards and actions](../apps/web/src/app/admin/moderimi/page.tsx).

### UX47 — The operations queue lacks human-readable triage context

**P2 · Improvement · B/S**

Operations rows can show raw statuses, topic names and assignee IDs without an age/received timestamp or a useful summary of prior attempts. Failed deliveries offer retry, but the operator needs to distinguish a temporary failure from a provider configuration problem.

**Improve:** display human-readable status, assignee, age, attempts and last outcome; add useful filters and a clear explanation of retry eligibility. Keep technical detail available on demand.

**Acceptance:** an operator can identify the oldest unresolved case, who owns it and the next action. A known provider authentication failure does not look like a routine one-click delivery recovery.

**Evidence:** [row model](../apps/web/src/app/admin/operacionet/page.tsx#L6), [row rendering](../apps/web/src/app/admin/operacionet/page.tsx#L136). SMTP configuration remains deferred by the owner; this finding requests better UI, not a credential change.

### UX48 — Blog authoring needs clearer tools and a publish review

**P2 · Improvement / accessibility defect · B/S**

The editor uses terse toolbar labels such as B/I/U and arrows without full action names or pressed state. The editable content lacks a useful accessible name in the automated check. Image insertion relies on a URL and offers no alt-text field; the authoring flow provides little preview guidance.

**Improve:** name the editor and toolbar actions, expose formatting state, support image selection with alternative text, and offer a preview/check of title, URL, cover and publication state. Add search/status filters to the blog list for larger catalogues.

**Acceptance:** keyboard users can identify formatting actions; authors can preview an article and supply image alternatives before publication; an existing draft is easy to find.

**Evidence:** [rich-text editor](../apps/web/src/components/editor/TiptapEditor.tsx#L60), [image insertion](../apps/web/src/components/editor/TiptapEditor.tsx#L149), [blog authoring](../apps/web/src/app/admin/blog/e-re/page.tsx), [blog list](../apps/web/src/app/admin/blog/page.tsx).

### UX49 — Campaign charts do not expose exact accessible values

**P2 · Defect / improvement · S**

The campaign chart renders colored bars and very small date labels, without per-point values, a keyboard-accessible tooltip or an equivalent data table. Operators cannot reliably inspect an exact day's impressions/clicks.

**Improve:** provide a named chart, clearly defined series/period and an accessible table or focusable value display. Keep colors distinguishable without relying on color alone.

**Acceptance:** an operator can retrieve exact values for every displayed day using keyboard or screen reader and understand the relationship between both series.

**Evidence:** [BarChart](../apps/web/src/app/admin/reklamat/[id]/page.tsx#L54).

### UX50 — Export descriptions promise a filter that is not offered

**P3 · Defect / improvement · S**

The listing export description promises filtering by category, but its controls offer only status and dates. A scope preview would also help operators avoid exporting the wrong population. UTC, PDF row limits and revenue semantics are already explained and should be retained.

**Improve:** implement the advertised category filter or correct the description, and show the chosen export scope before download.

**Acceptance:** every advertised filter exists and is passed to the endpoint; the export scope is understandable before download; existing UTC and format-limit guidance remains visible.

**Evidence:** [export description and controls](../apps/web/src/app/admin/eksportet/page.tsx#L18), [existing guidance](../apps/web/src/app/admin/eksportet/page.tsx#L147).

## Visual evidence index

The public screenshots show actual public content. Admin/member screenshots use synthetic records; their blank logos/images are intentional test placeholders.

| Screenshot | What it demonstrates |
| --- | --- |
| [Public homepage, desktop](audits/ui-ux-2026-10-20/public-home-desktop.png) | Search hierarchy, featured cards, text density and action colors |
| [Public homepage, mobile](audits/ui-ux-2026-10-20/public-home-mobile.png) | Stacked search, advertising and bottom navigation |
| [Public search, mobile](audits/ui-ux-2026-10-20/public-search-mobile.png) | Filter differences, compact result cards and zero/one price presentation |
| [Public listing, mobile](audits/ui-ux-2026-10-20/public-listing-mobile.png) | Initial detail viewport without a seller-contact action |
| [Public posting, mobile](audits/ui-ux-2026-10-20/public-posting-mobile.png) | Guest explanation and form layout |
| [Search failure](audits/ui-ux-2026-10-20/public-search-failure.png) | Error and “no matches” shown together |
| [Admin listings, mobile](audits/ui-ux-2026-10-20/admin-listings-mobile.png) | Table identity columns visible while actions are off to the side |
| [Admin settings, mobile](audits/ui-ux-2026-10-20/admin-settings-mobile.png) | Cramped fields and overlapping save explanation |
| [Admin badge modal, mobile](audits/ui-ux-2026-10-20/admin-badge-modal-mobile.png) | Overlay whose keyboard behavior fails the interaction checks |
| [Admin campaign editor, mobile](audits/ui-ux-2026-10-20/admin-ad-editor-mobile.png) | Long form, small labels and compact paired controls |
| [Member analytics, mobile](audits/ui-ux-2026-10-20/member-analytics-mobile.png) | Raw statuses, compressed rows and partially visible navigation |

## What should be retained

- The green/orange identity, public search prominence, listing photographs and clear guest-posting entry provide a usable visual foundation.
- New-post drafts recovered successfully after reload. Extend this behavior rather than replacing it with a more fragile flow.
- Public filter/report dialogs already use the shared modal approach; admin should adopt the same foundation.
- Public contact submission has a persistent server receipt mechanism, and several public/member screens already provide meaningful retry states.
- Main admin dashboard errors have dedicated handling from the previous audit. Apply that standard to collection and editor screens rather than reverting it.
- Moderate/approve actions already adjust the moderation queue count; that behavior was checked and is not listed as a defect.
- Member analytics already sorts by views and uses private edit routes for nonpublic listings. The findings concern clarity and presentation, not those corrected links.
- Export screens already explain UTC, PDF row limits and completed-payment revenue semantics.
- Public display of guest email is intentional policy. Keep the disclosure and email contact available.
- Existing expiry dates must remain honored. This audit does not propose renewing expired records or changing publication policy.

## Implementation order and completion checks

This is the full findings list, not the first batch of a continuing audit. The order below is a practical sequence for fixing it.

1. **Make administrative actions trustworthy:** UX20 and UX31, UX37–42; then UX24. Verify against paginated data, filtered selections, slow responses and mixed-success actions.
2. **Fix shared interaction foundations:** UX01–09, UX11–12 and UX17. Reuse components so fixes reach every affected screen.
3. **Unify public and member journeys:** UX13–19, UX21–30 and UX32–36. Preserve posting drafts, guest-email policy and moderation rules.
4. **Improve operator efficiency:** UX10 and UX43–50. Test the everyday tasks of finding, reviewing, changing and confirming a record on desktop and phone.

Before considering the UI/UX work complete:

- Re-run the route matrix at 320, 390, 768 and 1440 pixels, plus 200% browser zoom; inspect long Albanian labels, large counts, empty data and many records.
- Exercise full keyboard flows and perform real screen-reader checks, including dialogs, search suggestions, switches, tables and form errors.
- Verify first-load failure, stale-data failure, validation failure, duplicate clicks, session expiry and successful retry on each data-editing page family.
- Test company and campaign pagination beyond their current limits, filtered user selections, and client-list refresh after mutations.
- Check real-device Safari/iOS and Android behavior for the keyboard, safe areas, photo selection, phone links and messaging-app handoff.
- Use a staging account to complete registration/reset, posting/editing, moderation, support and email-delivery journeys. Those production account/provider workflows were not executed by this audit.

### Remaining verification limits

The 320-pixel synthetic pass showed approximately 21 pixels of overflow on registration and forgotten-password pages while the external challenge was blocked. Treat this as a **challenge-layout check to reproduce with the real widget**, not a proven production defect. Live public checks at 390 and 1440 pixels did not show document overflow.

This review does not certify WCAG conformance, measure real conversion rates, perform a full performance benchmark, validate legal policy content, or establish customer satisfaction through user interviews. Physical-device and assistive-technology results remain to be collected during acceptance.

The known ZeptoMail `535 Authentication Failed` issue remains deferred at the owner's request. Container health does not prove that email delivery works. It remains relevant to password recovery and notifications, but no SMTP credentials or deployment configuration were changed during this audit.
