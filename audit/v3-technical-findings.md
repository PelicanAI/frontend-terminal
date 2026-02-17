# V3 Technical Quality Audit

**Date:** 2026-02-17
**Auditor:** Agent 2 (Technical Quality)
**Scope:** TypeScript health, unused code, performance, error handling, data fetching, build health, code size

---

## Technical Quality Findings

### CRITICAL

- **[T-C1] Missing node_modules: @upstash/ratelimit + @upstash/redis** -- Listed in `package.json` but not installed in `node_modules/`. `lib/rate-limit.ts` imports these, causing 2 TypeScript errors and a broken build. Either `npm install` was not run after adding these deps, or they were removed from `node_modules` without being removed from `package.json`.

- **[T-C2] Missing node_modules: d3-hierarchy** -- Both `d3-hierarchy` and `@types/d3-hierarchy` are in `package.json` but not installed. `components/heatmap/treemap.tsx` imports from `d3-hierarchy`, producing a TS2307 "Cannot find module" error plus 4 implicit `any` type errors (TS7006) in the same file. Heatmap feature is non-functional until this is resolved.

- **[T-C3] 5 Admin API routes have ZERO try/catch error handling** -- The following API routes have no try/catch blocks at all, meaning any runtime error will produce an unhandled exception and a 500 with no useful response:
  - `app/api/admin/conversations/route.ts`
  - `app/api/admin/conversations/[id]/messages/route.ts`
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/[id]/grant-credits/route.ts`
  - `app/api/admin/users/[id]/detail/route.ts`

### HIGH

- **[T-H1] 10 files exceed 400+ lines, 5 exceed 500 lines** -- Violates the 300-line max guideline from CLAUDE.md. Largest offenders:
  - `components/admin/RecentConversations.tsx` -- 782 lines
  - `app/chat/page.client.tsx` -- 743 lines
  - `hooks/use-chat.ts` -- 674 lines (read-only, but still oversized)
  - `components/chat/conversation-sidebar.tsx` -- 655 lines
  - `hooks/use-conversations.ts` -- 631 lines (read-only)
  - `app/(features)/morning/page.tsx` -- 603 lines
  - `lib/supabase/helpers.ts` -- 553 lines
  - `app/(features)/earnings/page.tsx` -- 518 lines
  - `components/journal/log-trade-modal.tsx` -- 498 lines
  - `components/chat/chat-container.tsx` -- 466 lines
  - `hooks/use-pelican-panel.ts` -- 454 lines
  - `components/chat/trading-context-panel.tsx` -- 446 lines
  - `components/marketing/HomePageContent.tsx` -- 435 lines
  - `hooks/use-streaming-chat.ts` -- 430 lines (read-only)
  - `components/journal/trades-table.tsx` -- 429 lines
  - `components/pelican-panel/pelican-chat-panel.tsx` -- 414 lines
  - `components/marketing/HelpChat.tsx` -- 406 lines

- **[T-H2] 109 console.log/warn/error statements across the codebase** -- Excessive console output in production. While some `console.error` calls in error boundaries and API routes are appropriate, many are debug-level logging that should be behind a feature flag, removed, or routed through a proper logger. Admin dashboard alone has 20+ console.error calls.

- **[T-H3] No Sentry integration in most API routes** -- Only 5 of 25 API route files use Sentry (`regenerate`, `conversations CRUD`, `generate-title`, `upload`). The remaining 20 routes (admin, stripe, market-data, earnings, heatmap, etc.) have no Sentry error reporting, meaning production errors in these routes go untracked.

- **[T-H4] Missing loading/error boundaries for features routes** -- `app/(features)/` has neither `loading.tsx` nor `error.tsx`, so morning brief, earnings, and journal pages have no route-level loading skeleton or error recovery. `app/admin/` has `error.tsx` but no `loading.tsx`.

### MEDIUM

- **[T-M1] 10 instances of `any` type usage** -- Relatively low count, but includes:
  - `hooks/use-conversation-router.ts:9` -- `user: any` (should be typed)
  - `hooks/use-conversation-router.ts:11` -- `messages: any[]` (should use Message type)
  - `hooks/use-credits.ts:144` -- `as any` cast on Supabase realtime payload
  - `hooks/use-chat.ts:274` -- `(msg: any)` in message mapping (read-only file)
  - `hooks/use-message-handler.ts` -- Multiple `any[]` for attachments (3 instances)
  - `hooks/use-smart-scroll.tsx:278` -- `as any` for webkit vendor prefix
  - `hooks/use-file-upload.ts:22` -- `any[]` for attachments

- **[T-M2] Test file has TypeScript errors** -- `components/chat/__tests__/SuggestedPrompts.test.tsx` has 3 TS2769 overload errors where `string | undefined` is passed to a function expecting `Matcher`. Tests may pass at runtime but indicate type mismatches.

- **[T-M3] Implicit `any` types in treemap.tsx** -- 4 parameters (`d`, `a`, `b`, `node`) in `components/heatmap/treemap.tsx` have implicit `any` types (TS7006). These should be explicitly typed to match d3-hierarchy node types.

- **[T-M4] `components/admin/RecentConversations.tsx` at 782 lines** -- Single largest component file. Should be split into sub-components (conversation list item, conversation detail view, filters, etc.).

### LOW

- **[T-L1] No React.lazy usage (correct)** -- The codebase correctly uses `next/dynamic` instead of `React.lazy` throughout. 8 files use dynamic imports appropriately.

- **[T-L2] Good memoization in chat components** -- `message-bubble.tsx` uses `memo`, `useCallback`, and `useMemo`. `streaming-message.tsx` uses `React.memo`. `conversation-sidebar.tsx` uses `useMemo` for filtering/grouping and `useCallback` for handlers. `chat-container.tsx` uses `useCallback` for drag/drop handlers.

- **[T-L3] Consistent SWR usage for data fetching** -- All data fetching hooks (`use-market-data`, `use-live-quotes`, `use-trade-stats`, `use-heatmap`, `use-morning-brief`, `use-streaks`, `use-trades`, `use-earnings`) consistently use SWR. No rogue `useEffect + fetch` patterns found in hooks.

- **[T-L4] Recharts dynamically imported** -- `components/journal/dashboard-tab.tsx` imports recharts statically, but the component itself is dynamically imported via `next/dynamic` in `app/(features)/journal/page.tsx`, which is the correct approach.

- **[T-L5] No raw `<img>` tags found** -- All images appear to use `next/image` or SVG components.

---

## Summary Statistics

| Metric | Count | Status |
|--------|-------|--------|
| TypeScript errors (total) | 10 | Needs fix |
| TypeScript errors (excl. missing deps) | 4 | Acceptable |
| `any` type usages | 10 | Acceptable |
| Console statements | 109 | Needs cleanup |
| Files over 300 lines | 17+ | Needs splitting |
| Files over 500 lines | 8 | Needs splitting |
| API routes without try/catch | 5 | Needs fix |
| API routes without Sentry | ~20 | Needs fix |
| Routes missing error.tsx | 1 (features) | Needs fix |
| Routes missing loading.tsx | 2 (features, admin) | Needs fix |
| Dynamic imports used | 8 files | Good |
| React.memo on hot components | 3 components | Good |
| SWR consistency | 100% in hooks | Good |

---

## Score: 5.5/10

**Rationale:** The codebase has solid foundations -- consistent SWR usage, proper memoization in performance-critical chat components, correct use of `next/dynamic`, and no raw `<img>` tags. However, it is pulled down significantly by: (1) missing dependencies making features non-functional, (2) admin API routes with zero error handling, (3) 109 console statements polluting production output, (4) 8 files exceeding 500 lines violating the project's own 300-line rule, (5) poor Sentry coverage leaving most API errors untracked, and (6) missing loading/error boundaries on feature routes. The positive patterns are there but not applied consistently across the codebase.
