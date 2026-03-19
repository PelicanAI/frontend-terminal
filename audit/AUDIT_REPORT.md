# Codebase Health Audit Report

**Generated:** 2026-02-21
**Scope:** All V2/V3 features post-sprint (~150+ files across 8 features)

---

## Summary

**Build status: PASSING** -- `npm run build` completes with zero type errors. All 49 pages render. No broken `@/` imports in production code. The codebase compiles, but has significant structural debt: 29 files exceed the 300-line guideline, 8 orphaned files can be deleted, 5 planned feature files were never created, and 3 integration gaps exist between features and the chat hub.

### Quick Numbers

| Metric | Count |
|--------|-------|
| Build errors | 0 |
| Orphaned files (delete) | 8 |
| Missing planned files | 5 |
| Integration gaps | 3 |
| Duplicate utilities | 4 |
| TODO comments | 6 |
| Console.log in production | 0 |
| Files over 400 lines | 29 |
| Files with 5+ useState | 23 |
| RPC functions called | 20 |

---

## Build Status

`npm run build` passes cleanly. All 49 routes compile. No TypeScript errors. No broken imports in production code.

One non-blocking warning: `/api/admin/conversations` triggers `DYNAMIC_SERVER_USAGE` because it uses `cookies()` -- this is expected for a dynamic route and does not affect the build.

---

## Critical Issues (Fix Before Next Feature)

### C1. Database Column Existence Risk

**Severity: HIGH** -- Inserts will silently fail or error if these don't exist.

The frontend references three columns on the `trades` table that may not have been migrated:
- `plan_rules_followed` (JSONB array)
- `plan_rules_violated` (JSONB array)
- `plan_checklist_completed` (boolean)

**Referenced in:**
- `hooks/use-trades.ts` -- Trade type + TradeInput + logTrade insert
- `components/journal/log-trade-modal.tsx` -- populated via `deriveComplianceData()`
- `app/(features)/positions/page.tsx` -- set to null on new trade

**Action:** Verify with Ray that these columns exist on `trades`. If not, create migration:
```sql
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS plan_rules_followed jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS plan_rules_violated jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS plan_checklist_completed boolean DEFAULT false;
```

### C2. Additional Column/Table Verification Needed

These are referenced in code but should be verified in Supabase:
- `billing_cycle_start` on `user_credits` (referenced in `hooks/use-credits.ts`)
- `profiles` table (only referenced in `app/profile/page.tsx`)
- `user_streaks` table (referenced in `hooks/use-streaks.ts`)
- `trade_patterns` table (referenced in `hooks/use-trade-patterns.ts`)
- `saved_insights` table (referenced in `hooks/use-saved-insights.ts`)
- `trading_profiles` table (referenced in `hooks/use-trader-profile.ts`)

### C3. RPC Functions to Verify

20 unique RPCs are called from the frontend. Verify all exist in Supabase:

| RPC | Called From |
|-----|------------|
| `close_trade` | hooks/use-trades.ts |
| `get_trade_stats` | hooks/use-trade-stats.ts |
| `get_stats_by_setup` | hooks/use-trade-stats.ts |
| `get_pnl_by_day_of_week` | hooks/use-trade-stats.ts |
| `get_equity_curve` | hooks/use-trade-stats.ts |
| `get_popular_tickers` | app/api/admin/analytics/route.ts |
| `get_user_credits` | hooks/use-credits.ts |
| `get_portfolio_summary` | hooks/use-portfolio-summary.ts |
| `get_todays_warnings` | hooks/use-todays-warnings.ts |
| `get_all_behavioral_insights` | hooks/use-behavioral-insights.ts |
| `get_plan_compliance_stats` | hooks/use-plan-compliance.ts |
| `detect_and_store_patterns` | hooks/use-detect-patterns.ts |
| `update_streak` | hooks/use-streaks.ts |
| `accept_terms` | app/accept-terms/page.tsx |
| `setup_subscriber` | app/api/stripe/webhook/route.ts |
| `activate_referral_bonus` | app/api/stripe/webhook/route.ts |
| `reset_monthly_credits` | app/api/stripe/webhook/route.ts |
| `cancel_subscription` | app/api/stripe/webhook/route.ts |
| `validate_referral_code` | components/ReferralCodeInput.tsx, app/auth/callback/route.ts |
| `record_referral` | components/ReferralCodeInput.tsx, app/auth/callback/route.ts |

---

## Dead Code (Remove)

### Orphaned Components (never imported)

| File | Export | Notes |
|------|--------|-------|
| `components/morning/market-sessions.tsx` | `MarketSessions` | Not referenced anywhere |
| `components/journal/ai-grade-card.tsx` | `AIGradeCard` | Superseded by `components/grading/trade-grade-card.tsx` |
| `components/insights/pattern-badge.tsx` | `PatternBadge` | Self-referencing only |
| `components/insights/insight-card.tsx` | `InsightCard` | Self-referencing only |
| `components/risk-budget/budget-gauges.tsx` | `BudgetGauges` | Self-referencing only |
| `components/onboarding/feature-hint.tsx` | `FeatureHint` | Self-referencing only |

### Orphaned Hooks

| File | Export | Notes |
|------|--------|-------|
| `hooks/use-playbooks.ts` | `usePlaybooks` | `playbooks` table exists but hook is never used |

### Orphaned Lib Files

| File | Exports | Notes |
|------|---------|-------|
| `lib/chat/prefill.ts` | `setChatPrefill`, `getChatPrefill` | Legacy sessionStorage prefill. Superseded by `openWithPrompt`. Never imported (only test file). |
| `lib/chat/prefill.test.ts` | -- | Test for dead code |

### Unused Exports (in otherwise-used files)

| File | Export | Notes |
|------|--------|-------|
| `lib/chat/message-source.ts` | `DEFAULT_MESSAGE_SOURCE` | Exported but never imported by any consumer |

### Missing Planned Files (Never Created)

These files were part of feature specs but were never built:
- `lib/chat/journal-extractor.ts` -- Talk-to-Journal extraction
- `lib/chat/parse-action-lines.ts` -- Chat action line parsing
- `lib/chat/action-line-format.ts` -- Action line formatting
- `lib/whisper/generate-whispers.ts` -- Whisper Bar generation (entire `lib/whisper/` missing)
- `lib/chat/save-journal-from-chat.ts` -- Save journal entries from chat

---

## Integration Gaps (Features Not Connected)

### G1. Chat Page Has No URL-Based Prefill

**Status: DISCONNECTED**

`app/chat/page.client.tsx` reads `searchParams.get("conversation")` but does NOT read `prefill` or `source` URL params. There is no way to deep-link to chat with a pre-composed prompt (e.g., `/chat?prefill=Analyze+AAPL&source=heatmap_click`).

Feature pages currently route through `usePelicanPanelContext().openWithPrompt()` which opens the **side panel**, not the main chat page. This works but means the full-page chat experience can't be reached from cross-feature navigation.

### G2. DejaVu Card -- Feature Not Built

**Status: NOT IMPLEMENTED**

No `DejaVuCard` component, `useDejaVu` hook, or deja-vu-related files exist anywhere. The only reference is a future `MessageSource` type string `'deja_vu'` in `lib/chat/message-source.ts`. The log trade modal does not integrate it.

### G3. WhisperBar -- Feature Not Built

**Status: NOT IMPLEMENTED**

No `WhisperBar` component exists. Neither layout file (`app/layout.tsx`, `app/(features)/layout.tsx`) references it. The only trace is `'whisper'` as a `MessageSource` type string.

---

## Duplicates (Consolidate)

### D1. `formatPercent` -- 3 implementations

| File | Line | Scope |
|------|------|-------|
| `hooks/use-market-data.ts` | 144 | Exported |
| `lib/positions/dashboard-utils.ts` | 426 | Exported |
| `components/chat/trading-context-panel.tsx` | 172 | Local function |

**Action:** Consolidate into a single `lib/formatters.ts` utility.

### D2. `formatPnl` -- 2 implementations

| File | Scope |
|------|-------|
| `components/journal/performance-tab.tsx:72` | Local |
| `components/journal/insights/plan-compliance-card.tsx:65` | Local |

**Action:** Extract to shared utility.

### D3. Supabase Service Role Client -- 2 creation points

| File | Pattern |
|------|---------|
| `lib/admin.ts` | Canonical `getServiceClient()` |
| `app/api/stripe/webhook/route.ts` | Duplicates creation directly with `createClient()` |

**Action:** Webhook route should use `getServiceClient()` from `lib/admin.ts`.

### D4. `Conversation` Type -- Duplicate definition

| File | Notes |
|------|-------|
| `hooks/use-conversations.ts:30` | Canonical definition |
| `components/chat/conversation-sidebar.tsx:53` | Shadow definition (risk of drift) |

**Action:** Sidebar should import from `use-conversations.ts`, not redefine.

### D5. `Message` Type -- Duplicate definitions

| File | Notes |
|------|-------|
| `lib/chat-utils.ts:1` | Canonical |
| `components/chat/EducationChat.tsx:19` | Local (acceptable -- isolated component) |
| `components/marketing/HelpChat.tsx:7` | Local (acceptable -- isolated component) |
| `remotion/src/shims/` | Build shims (acceptable) |

---

## Console.log Cleanup

**Status: CLEAN** -- 0 `console.log` statements in production code. The only instance is inside `lib/logger.ts` (the structured logger itself).

---

## TODOs / Incomplete Work

| # | File | Line | Comment |
|---|------|------|---------|
| 1 | `components/morning/news-headlines.tsx` | 7 | `TAVILY INTEGRATION TODO:` -- waiting on Tavily API backend |
| 2 | `components/morning/news-headlines.tsx` | 37 | `TODO: Replace with useSWR once Tavily backend is live` |
| 3 | `components/chat/conversation-sidebar.tsx` | 180 | `TODO: Pin Chat -- add pin functionality` |
| 4 | `app/(features)/layout.tsx` | 143 | `TODO: Show trial exhausted modal` |
| 5 | `app/(features)/layout.tsx` | 147 | `TODO: Show insufficient credits modal` |
| 6 | `app/(features)/layout.tsx` | 152 | `TODO: Show error toast` |

**Items 4-6 are credit/paywall UX gaps** -- users hit error states with no UI feedback. Should be prioritized.

---

## Hardcoded Values

| File | Value | Risk |
|------|-------|------|
| `lib/correlations/calculate.ts:182` | `00000000-0000-0000-0000-000000000000` nil UUID | Used as "delete all" sentinel -- code smell, not a bug |
| `lib/supabase/client.ts:13-14` | `https://placeholder.supabase.co` + fake JWT | Build-time fallback when env vars missing -- intentional but creates silent broken client if leaked to runtime |

---

## Technical Debt (Track, Fix Later)

### Files Over 400 Lines (Top 10)

| Lines | File | Action |
|------:|------|--------|
| 988 | `app/(features)/morning/page.tsx` | Split: extract sections to components |
| 940 | `components/admin/RecentConversations.tsx` | Split: 21 useState calls |
| 937 | `components/chat/conversation-sidebar.tsx` | Split: 13 useState, duplicate types |
| 759 | `app/chat/page.client.tsx` | Split: extract chart panel, state management |
| 753 | `components/journal/log-trade-modal.tsx` | Split: 17 useState, extract form sections |
| 707 | `components/journal/trading-plan-tab.tsx` | Split: extract subsections |
| 705 | `hooks/use-chat.ts` | READ-ONLY per CLAUDE.md rules |
| 638 | `components/chat/trading-context-panel.tsx` | Split: extract panels |
| 633 | `components/positions/calendar-tab.tsx` | Split: extract calendar/list views |
| 563 | `components/positions/portfolio-overview.tsx` | Split: extract stat sections |

29 total files over 400 lines. Full list in Phase 9 findings.

### State Sprawl (Top 5)

| useState Count | File |
|---------------:|------|
| 21 | `components/admin/RecentConversations.tsx` |
| 17 | `components/journal/log-trade-modal.tsx` |
| 15 | `app/chat/page.client.tsx` |
| 14 | `app/(features)/morning/page.tsx` |
| 13 | `components/chat/conversation-sidebar.tsx` |

These are candidates for `useReducer` or state consolidation.

### Command-K Ticker Search

`components/command-k/ticker-search.tsx` imports `usePelicanPanel` directly instead of `usePelicanPanelContext` from the provider. All other consumers use the context hook. This could break if rendered outside the provider tree.

---

## Feature Verification Matrix

| Feature | Files Exist | Types Correct | Wired to Page | Chat Connected | Backend RPC Exists |
|---------|:-----------:|:-------------:|:-------------:|:--------------:|:-----------------:|
| Plan Compliance | ✅ | ✅ | ✅ | ✅ | ⚠️ `get_plan_compliance_stats` -- verify |
| Message Source Tagging | ✅ | ✅ | ✅ | ✅ | N/A (metadata) |
| Chat Action Buttons | ✅ | ✅ | ✅ | ✅ | N/A |
| Positions Dashboard | ✅ (14 files) | ✅ | ✅ | ✅ | ⚠️ `get_portfolio_summary`, `get_todays_warnings` -- verify |
| Text Selection Reply | ✅ | ✅ | ✅ | ✅ | N/A |
| Chat Action Bar | ✅ | ✅ | ✅ | ✅ | N/A |
| Journal (4 tabs) | ✅ | ✅ | ✅ | ✅ | ⚠️ Plan compliance columns -- verify |
| Morning Brief | ✅ (9 components) | ✅ | ✅ | ✅ | N/A (API routes) |
| Heatmap | ✅ (4 components) | ✅ | ✅ | ✅ | N/A (API route) |
| Correlations | ✅ (5 components) | ✅ | ✅ | ✅ | N/A (API routes) |
| Earnings | ✅ (monolithic page) | ✅ | ✅ | ✅ | N/A (API route) |
| Deja Vu Alerts | ❌ | ❌ | ❌ | ❌ | ❌ |
| Talk-to-Journal | ❌ | ❌ | ❌ | ❌ | ❌ |
| Whisper Bar | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ = Yes | ❌ = Not built | ⚠️ = Verify with Ray (DB admin)

---

## Action Plan

### Immediate (Before Next Feature)

1. **Verify DB schema with Ray** -- plan compliance columns, RPCs, new tables (C1, C2, C3)
2. **Fix credit/paywall TODO gaps** -- layout.tsx lines 143-152 need UI modals (TODO items 4-6)
3. **Delete dead code** -- 8 orphaned files + 2 dead lib files in one cleanup commit
4. **Consolidate `Conversation` type** -- sidebar should import, not redefine (D4)

### Soon (Next Sprint)

5. **Consolidate `formatPercent`/`formatPnl`** into `lib/formatters.ts` (D1, D2)
6. **Fix Stripe webhook** to use `getServiceClient()` (D3)
7. **Add URL prefill to chat page** if deep-linking is desired (G1)
8. **Split top 5 oversized files** -- morning page, RecentConversations, conversation-sidebar, log-trade-modal, chat page

### Later (Backlog)

9. Decide on Deja Vu, Talk-to-Journal, Whisper Bar -- build or remove type stubs
10. Tavily news integration (TODO items 1-2)
11. Pin chat functionality (TODO item 3)
12. Command-K ticker search provider import fix
