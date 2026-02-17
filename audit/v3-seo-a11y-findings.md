# SEO & Accessibility Audit — Pelican Trading Frontend V3

**Auditor:** Agent 3 (SEO & Accessibility)
**Date:** 2026-02-17
**Scope:** All pages under `app/`, all components under `components/`, global CSS, public assets

---

## SEO & Accessibility Findings

### CRITICAL

- **[A-C1] Feature pages missing metadata exports** — The four feature pages (`app/(features)/earnings/page.tsx`, `app/(features)/heatmap/page.tsx`, `app/(features)/journal/page.tsx`, `app/(features)/morning/page.tsx`) have zero `metadata` or `generateMetadata` exports. While these are auth-gated pages and indexed:false may be acceptable, they still lack `<title>` tags entirely, which hurts usability (browser tabs show generic "Pelican Trading" instead of "Earnings Calendar | Pelican Trading" etc.). This also affects analytics attribution.

- **[A-C2] IPO items use clickable `<div>` without keyboard support** — In `app/(features)/morning/page.tsx` lines 478-528, IPO list items are interactive `<div>` elements with `onClick` handlers but no `role="button"`, `tabIndex`, or `onKeyDown` handler. These are completely inaccessible to keyboard-only users.

- **[A-C3] Earnings search input missing label** — In `app/(features)/earnings/page.tsx` line 330-335, the search `<input>` has a placeholder ("Search ticker...") but no associated `<label>`, `aria-label`, or `aria-labelledby`. Screen readers cannot identify this field.

### HIGH

- **[A-H1] Skip nav target `#main-content` missing from most pages** — The root layout (`app/layout.tsx` line 62) has a skip navigation link targeting `#main-content`, but only `app/terms/page.tsx`, `app/privacy/page.tsx`, and `app/admin/layout.tsx` define `id="main-content"` on a `<main>` element. The skip link does nothing on the home page, pricing page, chat page, feature pages, and all other routes.

- **[A-H2] No structured data on how-to-use page** — The FAQ page (`app/(marketing)/faq/page.tsx`) and pricing page (`app/pricing/page.tsx`) both have JSON-LD structured data. The how-to-use page (`app/(marketing)/how-to-use/page.tsx`) has none, missing a "HowTo" schema opportunity that could generate rich results in Google.

- **[A-H3] HeroChatDemo image with empty alt text** — In `components/marketing/HeroChatDemo.tsx` line 34, `<Image src={LOGO} alt="" ... />` has an empty alt attribute. This is a decorative Pelican logo avatar in the chat demo that represents the AI assistant responding. It should have `alt="Pelican AI"` for context, since it conveys meaningful information (who is speaking).

- **[A-H4] Numerous low-contrast text instances across components** — Multiple components use `text-foreground/20`, `text-foreground/25`, `text-foreground/30`, and `text-foreground/40` classes, which produce text at 20-40% opacity on dark backgrounds. This fails WCAG 2.1 AA contrast ratio (4.5:1 minimum). Key offenders:
  - `app/(features)/earnings/page.tsx`: `text-foreground/20`, `text-foreground/25`, `text-foreground/40` on EPS labels and counts
  - `components/journal/trades-table.tsx`: `text-foreground/30` and `text-foreground/40` on dash placeholders and labels
  - `components/heatmap/sector-legend.tsx`: `text-foreground/40` on stock counts
  - `components/journal/dashboard-tab.tsx`: `text-foreground/40` on stat icons
  - `components/settings-modal.tsx`: `text-white/40` on helper text

- **[A-H5] Clickable `<div>` elements without keyboard accessibility** — Found in `components/admin/UsersTable.tsx`, `components/insufficient-credits-modal.tsx`, `components/trial-exhausted-modal.tsx`, and `app/(features)/journal/page.tsx` (mobile bottom sheet backdrop). Interactive `<div>` elements with `onClick` but missing `role`, `tabIndex`, and keyboard handlers.

### MEDIUM

- **[A-M1] Duplicate metadata between root layout and marketing layout** — Both `app/layout.tsx` and `app/(marketing)/layout.tsx` define full `openGraph` and `twitter` metadata. The marketing layout overrides the root with nearly identical values but a longer description. This is not a bug (Next.js merges correctly), but it creates maintenance overhead and potential drift.

- **[A-M2] Marketing layout twitter metadata missing `site` and `creator`** — The root layout (`app/layout.tsx` lines 39-40) includes `site: '@PelicanAI_'` and `creator: '@GrasshopperNick'` in twitter metadata, but the marketing layout (`app/(marketing)/layout.tsx`) omits these fields. Since the marketing layout metadata overrides the root for marketing pages, these twitter attribution fields are lost on the most important public pages.

- **[A-M3] Canonical URLs inconsistently formatted** — Some pages use relative canonical URLs (FAQ: `/faq`, how-to-use: `/how-to-use`) while others use absolute (pricing: `https://pelicantrading.ai/pricing`). While `metadataBase` resolves relative URLs, consistency would be cleaner.

- **[A-M4] Heatmap page buttons missing aria-labels** — In `app/(features)/heatmap/page.tsx`, the refresh button (line 113-119), treemap view button (line 123-135), and grid view button (line 136-148) all use icon-only buttons (`<RefreshCw>`, `<LayoutGrid>`, `<Grid3x3>`) without `aria-label` attributes. Screen readers will announce these as unlabeled buttons.

- **[A-M5] Earnings page navigation buttons missing aria-labels** — In `app/(features)/earnings/page.tsx`, the previous week button (line 302-307) and next week button (line 311-315) use `<ChevronLeft>` and `<ChevronRight>` icons without `aria-label`. The refresh button (line 339-345) also lacks an aria-label.

- **[A-M6] No `<main>` landmark on feature pages** — The feature pages (earnings, heatmap, journal, morning) render content directly in `<div>` containers without a `<main>` landmark element, making navigation harder for screen reader users.

### LOW

- **[A-L1] Sitemap uses `new Date()` for lastModified** — In `app/sitemap.ts`, all entries use `lastModified: new Date()`, which means the lastModified date changes on every build/request. This reduces the signal value for search engines. Consider using actual last-modified dates or build timestamps.

- **[A-L2] No `favicon.ico` in public directory** — While `app/icon.png` and `app/apple-icon.png` exist (which Next.js handles correctly), there is no `public/favicon.ico` fallback for older browsers and bookmarking tools that specifically request `/favicon.ico`.

- **[A-L3] Aria-label usage is moderate but not comprehensive** — Found 23 total `aria-label` occurrences across `components/` and `app/`. Key areas with good coverage: chat container, conversation sidebar, morning brief refresh. Areas lacking: most icon-only buttons in feature pages, heatmap controls, earnings navigation.

- **[A-L4] No `lang` attribute diversity for i18n** — The root layout hardcodes `<html lang="en">`, but the app supports 30+ languages. The lang attribute should dynamically reflect the user's selected language for screen reader pronunciation.

- **[A-L5] Legal pages (terms, privacy) have good semantic structure** — These pages properly use `<main>`, `<nav>`, `<section>`, `<h1>`, `<h2>`, and `<h3>` elements with correct heading hierarchy. This is a positive finding.

---

## Detailed Audit Results

### 3A: Meta Tags

| Page | Title | Description | OG | Twitter | Canonical | Structured Data |
|------|-------|-------------|-----|---------|-----------|-----------------|
| Root layout | Template-based | Yes | Yes | Yes (with site/creator) | N/A | N/A |
| Marketing layout | Static | Yes | Yes | Yes (missing site/creator) | `/` | N/A |
| Home `/` | Yes (absolute) | Yes | Inherited | Inherited | `/` | Organization + SoftwareApplication |
| Pricing `/pricing` | Yes | Yes | Inherited | Inherited | Absolute URL | Product + Offers |
| FAQ `/faq` | Yes | Yes | Inherited | Inherited | `/faq` | FAQPage |
| How-to-Use `/how-to-use` | Yes | Yes | Inherited | Inherited | `/how-to-use` | None |
| Terms `/terms` | Yes | Yes | Inherited | Inherited | `/terms` | None |
| Privacy `/privacy` | Yes | Yes | Inherited | Inherited | `/privacy` | None |
| Chat `/chat` | Inherited | Inherited | Inherited | Inherited | N/A | None (noindex) |
| Settings | Yes | N/A | Inherited | Inherited | N/A | None (noindex) |
| Auth pages | Inherited | N/A | N/A | N/A | N/A | None (noindex) |
| Feature pages | **MISSING** | **MISSING** | Inherited | Inherited | N/A | None |

### 3B: Favicon & Icons

| File | Status |
|------|--------|
| `app/icon.png` | Present |
| `app/apple-icon.png` | Present |
| `app/favicon.*` | Missing (not critical, icon.png serves) |
| `public/favicon.*` | Missing |
| `public/og-image.png` | Present |

### 3C: Robots & Sitemap

- **robots.ts**: Present at `app/robots.ts`. Allows `/`, disallows auth/admin/chat/settings/profile/api/accept-terms. References sitemap. Well-configured.
- **sitemap.ts**: Present at `app/sitemap.ts`. Covers 6 public pages (home, pricing, faq, how-to-use, privacy, terms). Complete coverage of public routes.

### 3D: Accessibility Summary

| Check | Result |
|-------|--------|
| Skip navigation | Present in root layout, but target `#main-content` missing from most pages |
| `aria-label` count | ~23 in components, ~4 in app pages |
| `onKeyDown` handlers | ~11 across components |
| `tabIndex` usage | 1 instance (MarketingNav) |
| `role="button"` | 0 instances |
| Focus styles | Good — global `focus-visible` styles in globals.css with purple ring |
| Color contrast issues | Multiple instances of 20-40% opacity text |
| Images without alt | 1 empty alt (HeroChatDemo avatar), all other images have alt text |
| Form inputs without labels | Earnings search input missing label |
| Clickable divs | 4+ files with interactive divs lacking keyboard support |
| `<main>` landmark | Only on legal pages and admin layout |

### 3E: Structured Data

| Page | Schema Type | Status |
|------|-------------|--------|
| Home | Organization + SoftwareApplication | Present, well-formed |
| Pricing | Product with Offers | Present, well-formed |
| FAQ | FAQPage with Q&A | Present, well-formed (6 questions) |
| How-to-Use | None | **Missing opportunity** |

### 3F: Semantic HTML

- **Heading hierarchy**: Generally correct. Marketing pages use h1 -> h2 properly. Feature pages have h1 headers. Legal pages have h1 -> h2 -> h3 hierarchy.
- **Landmark elements**: `<main>` used in legal pages and admin. `<nav>` used in marketing nav, legal pages. `<section>` used extensively on marketing and legal pages. `<footer>` in marketing footer. Feature pages lack `<main>` landmarks.
- **Lists**: Used appropriately in legal pages (ul/li) and pricing. Not applicable to most feature pages.

---

## Recommendations (Priority Order)

1. Add `metadata` exports to all four feature pages (title + description at minimum)
2. Add `id="main-content"` to the primary content container in marketing pages, chat page, and feature pages
3. Convert IPO clickable divs to `<button>` elements or add `role="button"` + `tabIndex={0}` + `onKeyDown`
4. Add `aria-label` to the earnings search input
5. Add `aria-label` to all icon-only buttons (heatmap view toggles, refresh, week nav)
6. Add `twitter.site` and `twitter.creator` to marketing layout metadata
7. Add HowTo structured data to the how-to-use page
8. Wrap feature page content in `<main id="main-content">` elements
9. Increase minimum text opacity from `/20` and `/25` to `/50` for WCAG AA compliance
10. Dynamically set `<html lang>` based on user's locale selection

---

### Score: 7/10

**Strengths:**
- Root metadata is comprehensive with OG, Twitter cards, and metadataBase
- Structured data (JSON-LD) on 3 key marketing pages is excellent
- Skip navigation link exists in root layout
- robots.ts and sitemap.ts are well-configured
- Global focus-visible styles provide good keyboard focus indicators
- All marketing images have proper alt text
- Legal pages have exemplary semantic HTML structure

**Weaknesses:**
- Feature pages completely lack metadata exports
- Skip nav target `#main-content` is broken on most pages
- Several interactive elements are inaccessible to keyboard users
- Low-contrast text (20-40% opacity) throughout feature pages
- Missing `<main>` landmarks on most pages
- i18n lang attribute is hardcoded to English
