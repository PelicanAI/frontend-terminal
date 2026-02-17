# UI/UX & Production Polish Findings

**Auditor:** Agent 4 — UI/UX & Production Polish
**Date:** 2026-02-17
**Scope:** Visual consistency, loading states, mobile responsiveness, interactive polish, design tokens

---

## CRITICAL

- **[U-C1] No error.tsx boundaries for feature pages** — The `app/(features)/` directory (morning, earnings, journal, heatmap) has zero `error.tsx` files. Any uncaught error in these pages will bubble up to the root error boundary or crash the page entirely. Error boundaries exist for `app/chat/`, `app/settings/`, `app/admin/`, `app/pricing/`, and `app/(marketing)/` — but the four main V3 feature pages are completely unprotected.

- **[U-C2] No loading.tsx for feature pages** — None of the four feature pages (`morning`, `earnings`, `journal`, `heatmap`) have Next.js `loading.tsx` files. Loading states exist for `chat`, `settings`, `pricing`, and `profile` but not for any feature page. This means users see nothing (or a flash) while client-side data fetches resolve.

- **[U-C3] Morning page is 603 lines — exceeds 300-line limit** — `app/(features)/morning/page.tsx` is 603 lines, double the project's max component size of 300 lines. It contains SSE streaming logic, IPO fetching, economic calendar fetching, trade analysis handlers, and the full UI template all in one file.

---

## HIGH

- **[U-H1] 70+ hardcoded hex color values across components** — Found 70+ instances of `bg-[#...]`, `text-[#...]`, and `border-[#...]` in TSX files. The worst offenders: `app/auth/signup/page.tsx` (9), `app/(features)/earnings/page.tsx` (8), `app/auth/login/page.tsx` (5). Most are hardcoding `#8b5cf6` (accent purple), `#0a0a0c`, `#12141c`, `#1e1e2e`, `#13131a` — values that already exist as CSS custom properties (`--accent-purple`, `--surface-0`, `--surface-1`). This creates maintenance burden and theming inconsistency.

- **[U-H2] Raw `<button>` outnumbers shadcn `<Button>` by 3:1** — Found 114 raw `<button>` elements vs only 35 imports of `@/components/ui/button`. Feature pages and journal components rely almost entirely on hand-styled buttons with repeated className strings. This leads to inconsistent sizing, padding, hover effects, and accessibility (aria attributes, focus management).

- **[U-H3] No useMediaQuery / mobile detection outside layout** — `useIsMobile` hook exists and is used in `app/(features)/layout.tsx` and `app/chat/page.client.tsx`, but none of the four feature pages themselves use it. The heatmap page sets fixed dimensions (`width: 1200, height: 800`) on initial render before measuring the container — this will flash or overflow on mobile. The earnings grid renders a `min-w-[1000px]` scrollable div on mobile, which is functional but not ideal.

- **[U-H4] Earnings page has 518 lines — near the limit** — `app/(features)/earnings/page.tsx` at 518 lines also exceeds the 300-line max. Contains inline `EarningsGridSkeleton`, `EarningsCard`, and `EarningsSection` components that should be split out.

- **[U-H5] contrast-fixes.css uses `!important` overrides extensively** — `app/contrast-fixes.css` has 20+ `!important` declarations to force logo and button styling. This suggests the underlying component styles are fighting CSS specificity — a fragile approach that will break when components change.

---

## MEDIUM

- **[U-M1] Inconsistent page header patterns** — Feature pages use slightly different header structures:
  - Journal: `px-4 sm:px-6 py-4` with `flex-col sm:flex-row` responsive layout
  - Heatmap: `px-6 py-4` (no mobile padding adjustment)
  - Earnings: `px-4 sm:px-6 py-4` with responsive structure
  - Morning: Custom header with no consistent pattern matching the others

  All share the gradient `bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/[0.04]` which is good, but padding and responsive behavior is inconsistent.

- **[U-M2] Only 204 responsive class usages across entire codebase** — For a production trading app, responsive class usage (`sm:`, `md:`, `lg:`, `xl:`) is relatively low. The heatmap page uses `sm:flex-row` for sector sidebar but has limited mobile handling. The journal page has mobile-specific FAB button and responsive trade type filter. Morning page is the weakest — large cards and data tables with minimal responsive adaptation.

- **[U-M3] Tooltip usage concentrated in only 5 files** — 73 tooltip occurrences across just 5 files: `message-actions.tsx` (40), `conversation-sidebar.tsx` (7), `dashboard-tab.tsx` (2), `AnalyticsChart.tsx` (1), and the component definition. Feature pages (morning, earnings, journal, heatmap) have zero tooltips — icons like RefreshCw, Sparkles, LayoutGrid, Grid3x3 have no tooltip labels, relying on visual context alone.

- **[U-M4] 185 onClick handlers on divs/spans without cursor-pointer** — Many interactive elements (table rows, filter chips, trade cards) use onClick on non-button elements without explicit `cursor-pointer`. Some have it via Tailwind, but a significant number rely on the element looking clickable by visual context alone.

- **[U-M5] PelicanCard component underutilized** — A `PelicanCard` component exists in `components/ui/pelican-card.tsx` with matching `.pelican-card` CSS class providing consistent styling (surface-1 bg, purple border, hover glow, translateY animation). Yet it's only used in 2 files: `morning/page.tsx` and `ai-grade-card.tsx`. Earnings, heatmap, and journal pages hand-roll card styling.

- **[U-M6] 30 hardcoded text-gray/text-white in feature pages** — Feature pages use `text-gray-500`, `text-gray-600`, `text-white` directly rather than semantic tokens like `text-foreground`, `text-muted-foreground`, `text-foreground/50`. This breaks if light mode is ever fully enabled.

---

## LOW

- **[U-L1] Skeleton/loading animations are well-defined** — globals.css has `.skeleton`, `.shimmer`, `.thinking-shimmer-text`, and `.live-dot` animation utilities. The earnings page has an inline `EarningsGridSkeleton` component. This infrastructure exists but isn't systematically applied to all feature pages.

- **[U-L2] Good transition/animation coverage** — 342 transition/animation class usages found across the codebase. Feature pages use `transition-colors`, `active:scale-95`, and `animate-spin` on refresh buttons. The design system includes `glow-button`, `pelican-card` hover, and `logo-breathe` keyframes.

- **[U-L3] 211 hover state declarations** — Reasonable hover coverage. Most interactive elements have hover states. However, the hover patterns are inconsistent — some use `hover:bg-white/[0.04]`, others `hover:bg-white/[0.08]`, and others `hover:bg-[#1e1e2e]`.

- **[U-L4] CSS custom property system is comprehensive** — globals.css defines 80+ CSS variables across typography (5 leading vars), shadows (4 levels), radii (6 levels), spacing (6 levels), responsive layout (7 vars), colors (surfaces, borders, text, accent), z-index (8 layers), and chart colors (5 vars). The design token infrastructure is solid — the problem is adoption in components.

- **[U-L5] Reduced motion preferences respected** — `@media (prefers-reduced-motion: reduce)` is implemented in globals.css, disabling shimmer animations and forcing `animation-duration: 0.01ms`. Good accessibility practice.

- **[U-L6] Safe area insets handled** — `.pb-safe` and `.pt-safe` utilities exist for mobile notch/bottom bar handling. The chat input area uses `env(safe-area-inset-bottom)`. This is production-ready for iOS.

- **[U-L7] Mobile bottom sheet for Pelican panel is well-implemented** — The features layout uses `useIsMobile` + Sheet component to render a bottom sheet on mobile (75vh height, rounded top, drag handle). Desktop gets an animated 30% sidebar. Good responsive pattern.

---

## Feature Page Walkthrough

### Morning Brief (`app/(features)/morning/page.tsx` — 603 lines)
- **Loading states:** Has `briefLoading` spinner, `moversLoading` check, `economicLoading` state, `tradesLoading` via SWR. Loading UI is inline (spinners/skeleton) rather than page-level.
- **Error handling:** Has `briefError` state for the AI brief generation. API fetch errors silently caught (`.catch(() => {...})`). No error boundary.
- **Empty states:** Has empty state for brief ("Generate Brief" CTA). No explicit empty state for movers or economic events sections — they simply render nothing if empty.
- **Mobile:** Minimal responsive classes. PelicanCard components used. No mobile-specific layout adaptations for the grid sections.

### Earnings (`app/(features)/earnings/page.tsx` — 518 lines)
- **Loading states:** Excellent. Has dedicated `EarningsGridSkeleton` component with animate-pulse. Shows while data loads.
- **Error handling:** No error handling visible. If `useEarnings` fails, no fallback UI.
- **Empty states:** Has "No reports" text for empty days. Search yields filtered results but no "no results" message.
- **Mobile:** Good. Has separate mobile layout (`md:hidden` horizontal scroll) vs desktop grid. Min-touch targets on buttons (44px).

### Journal/Positions (`app/(features)/journal/page.tsx` — 338 lines)
- **Loading states:** Relies on `tradesLoading` from SWR hook. TradesTable likely handles its own loading.
- **Error handling:** No visible error handling or fallback.
- **Empty states:** TradesTable has "No trades to display" empty state. Dashboard tab likely handles its own.
- **Mobile:** Good. Has mobile FAB button for adding trades (`sm:hidden`). Responsive header with `flex-col sm:flex-row`. Trade type filter hidden on mobile (`hidden sm:flex`).

### Heatmap (`app/(features)/heatmap/page.tsx` — 310 lines)
- **Loading states:** Uses `isLoading` from `useHeatmap`. RefreshCw icon spins during load.
- **Error handling:** Has `error` from hook but no visible error UI rendering in the first 175 lines examined.
- **Empty states:** Treemap and HeatmapGrid components have "No data available" messages.
- **Mobile:** Sector sidebar uses horizontal scrolling pills on mobile (`sm:hidden` pills vs desktop vertical list). Container dimensions resize via ResizeObserver. Reasonable mobile handling.

---

## Design Token Audit

### Token Infrastructure
- **CSS Variables:** ~80+ defined in globals.css across `:root` (light) and `.dark` (dark)
- **Categories covered:** Typography (5), Shadows (4), Radii (6), Spacing (6), Layout (7), Z-Index (8), Colors (25+), Chart colors (5)
- **Theme integration:** `@theme inline` block maps CSS vars to Tailwind `--color-*` namespace
- **Dark mode:** Uses `.dark` class selector (next-themes compatible) with HSL and oklch values

### Token Adoption
- **Good adoption:** Body background/foreground, card colors, sidebar colors use CSS vars via `bg-background`, `text-foreground`, `bg-card`, etc.
- **Poor adoption:** Feature pages bypass tokens with hardcoded hex. Auth pages are the worst offenders with `bg-[#0a0a0c]`, `bg-[#12141c]`, `border-[#2d3240]`.
- **Missing design system file:** No `design-tokens.ts`, `theme.ts`, or `system.md` file exists to document the token system for developers.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Hardcoded hex colors in TSX | 70+ |
| Responsive classes (sm:/md:/lg:/xl:) | 204 |
| Hover state declarations | 211 |
| Transition/animation usages | 342 |
| error.tsx boundaries | 5 (0 in features) |
| loading.tsx files | 4 (0 in features) |
| Raw `<button>` elements | 114 |
| shadcn Button imports | 35 |
| Tooltip usages | 73 (5 files only) |
| CSS custom properties | 80+ |
| Feature page avg line count | 442 (max 603) |

---

### Score: 5.5/10

**Rationale:** The design token infrastructure in globals.css is genuinely well-architected — comprehensive surface system, z-index layers, typography scale, safe area handling, and reduced motion support. The features layout has solid mobile handling with bottom sheet panel. However, the gap between the design system and actual component usage is significant. Feature pages lack error boundaries and loading.tsx files — production essentials. Hardcoded colors are widespread. The button story is fragmented (114 raw vs 35 shadcn). Morning and earnings pages exceed the 300-line component limit. Tooltip coverage is minimal on feature pages. The foundation is strong but adoption and consistency need a dedicated pass.
