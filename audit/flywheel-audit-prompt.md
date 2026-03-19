# FLYWHEEL INTEGRITY AUDIT — Does Every Pipe Actually Connect?

## PURPOSE

This is NOT a visual/UI audit. This is a plumbing audit.

We need to verify that every feature in the frontend is properly wired to read from AND write to the correct Supabase tables, with correct column names, correct RPC function signatures, correct foreign key relationships, and correct data transformations.

The question for every feature: "When a user does X, does the data flow all the way through and come back correctly?"

## BEFORE YOU START

Read these files completely to understand the codebase architecture:
```bash
# Find the core data layer
find . -path ./node_modules -prune -o -name "*.ts" -name "*supabase*" -print
find . -path ./node_modules -prune -o -name "*.ts" -name "*client*" -print | grep -i supa
cat lib/supabase/*.ts 2>/dev/null || find . -path ./node_modules -prune -o -name "createClient*" -print

# Find ALL hooks (this is the data layer)
find . -path ./node_modules -prune -o -name "use*.ts" -print | grep -v node_modules | sort
find . -path ./node_modules -prune -o -name "use*.tsx" -print | grep -v node_modules | sort

# Find ALL API routes
find . -path ./node_modules -prune -o -path "*/api/*route*" -print | grep -v node_modules | sort

# Find type definitions
find . -path ./node_modules -prune -o -name "*.ts" -print | xargs grep -l "^export type\|^export interface" 2>/dev/null | grep -v node_modules | sort
```

Read ALL results before proceeding. You need the full map.

---

## AUDIT 1: TRADES PIPELINE

The core of the journal. Traces: Log Trade → Supabase → Dashboard/Analytics/Sidebar

### 1A: Log Trade Modal → `trades` table

```bash
# Find the log trade modal
grep -rn "LogTrade\|log-trade\|log_trade\|logTrade" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

Read the modal component. Verify:
- [ ] Form fields map to correct `trades` table columns:
  - `ticker` (text, required)
  - `asset_type` (text, must be one of: stock/option/future/forex/crypto/etf/other)
  - `direction` (text, must be: long/short)
  - `quantity` (numeric, nullable)
  - `position_size_usd` (numeric, nullable)
  - `entry_price` (numeric, required)
  - `stop_loss` (numeric, nullable)
  - `take_profit` (numeric, nullable)
  - `option_type` (text, nullable, must be: call/put/null)
  - `strike_price` (numeric, nullable)
  - `expiration_date` (date, nullable)
  - `entry_date` (timestamptz, defaults to now())
  - `thesis` (text, nullable)
  - `conviction` (int, 1-10, nullable)
  - `setup_tags` (text[], defaults to '{}')
  - `playbook_id` (uuid FK → playbooks, nullable)
  - `is_paper` (boolean, defaults false)
  - `plan_rules_followed` (text[], defaults '{}')
  - `plan_rules_violated` (text[], defaults '{}')
  - `plan_checklist_completed` (jsonb, defaults '{}')
- [ ] `user_id` is NOT sent from client (should default to `auth.uid()` via RLS)
- [ ] `status` defaults to 'open' (not sent from client)
- [ ] On success, does the hook/mutation invalidate or refetch the trades list?
- [ ] Does the Supabase insert use `.insert()` on the `trades` table?

### 1B: Close Trade Modal → `close_trade()` RPC

```bash
grep -rn "close_trade\|closeTrade\|CloseTradeModal\|close-trade" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

Read the close modal. Verify:
- [ ] Calls RPC `close_trade` (not a direct UPDATE on trades table)
- [ ] Passes correct params: `p_trade_id` (uuid), `p_exit_price` (numeric), `p_exit_date` (timestamptz, optional), `p_notes` (text, optional), `p_mistakes` (text, optional)
- [ ] Receives and uses return value: `{ success, pnl_amount, pnl_percent, r_multiple }`
- [ ] Does NOT try to calculate P&L client-side (the RPC does it)
- [ ] After success, invalidates/refetches trades list AND trade stats

### 1C: Edit Trade Modal

```bash
grep -rn "EditTrade\|edit-trade\|editTrade" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Uses `.update()` on `trades` table (not an RPC)
- [ ] Only sends changed fields
- [ ] Does NOT allow changing `user_id`, `status`, `pnl_amount`, `pnl_percent`, `r_multiple` (these are computed)

### 1D: Trade Stats RPC Hooks

```bash
grep -rn "get_trade_stats\|get_equity_curve\|get_pnl_by_day_of_week\|get_stats_by_setup" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

For each of the 4 RPCs, verify:
- [ ] `get_trade_stats` — called with optional `p_start_date` and `p_end_date` params, returns object with: total_trades, winning_trades, losing_trades, win_rate, total_pnl, avg_win_pnl, avg_loss_pnl, avg_r_multiple, best_trade_pnl, worst_trade_pnl, profit_factor, expectancy, open_trades, most_traded_ticker
- [ ] `get_equity_curve` — returns array of: { date, daily_pnl, cumulative_pnl, trade_count }
- [ ] `get_pnl_by_day_of_week` — returns array of: { day_of_week, day_name, total_trades, win_rate, total_pnl }
- [ ] `get_stats_by_setup` — returns array of: { setup, total, wins, losses, win_rate, avg_r, total_pnl }
- [ ] SWR hooks have `onErrorRetry` that stops on 404 (prevents retry loop if schema cache stale)
- [ ] The component consuming each hook handles `isLoading`, `error`, and empty data states

### 1E: Trade → Chat Flywheel (Pelican Scan)

```bash
grep -rn "pelican.*scan\|scan.*pelican\|SCAN\|prefill.*chat\|chat.*prefill\|openWithPrompt" --include="*.tsx" --include="*.ts" | grep -v node_modules | head -30
```

- [ ] Clicking "Scan" on a trade pre-fills the chat with trade context (ticker, direction, entry, current price, P&L)
- [ ] After scan, `pelican_scan_count` is incremented and `last_pelican_scan_at` is updated on the trade
- [ ] The scan updates the `trades` table (not just a visual action)

### 1F: Trade → Playbook Link

```bash
grep -rn "playbook_id\|playbookId" --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
```

- [ ] Log Trade modal has a playbook selector dropdown
- [ ] Selected playbook's `id` is saved as `playbook_id` FK on the trade
- [ ] Playbook detail page can filter trades by `playbook_id` to show "trades using this playbook"
- [ ] When a trade is logged with a playbook_id, the playbook's aggregate stats (total_trades, winning_trades, win_rate, avg_r_multiple, etc.) should either update automatically (trigger) or be recomputed on read

---

## AUDIT 2: PLAYBOOKS PIPELINE

### 2A: Create/Edit Playbook Modal

```bash
grep -rn "CreatePlaybook\|create-playbook\|PlaybookModal\|PlaybookForm\|playbook.*modal" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

Read the modal. Verify fields map to `playbooks` table:
- [ ] `name` (text, required)
- [ ] `description` (text, nullable)
- [ ] `setup_type` (text, required)
- [ ] `timeframe` (text, nullable)
- [ ] `market_conditions` (text, nullable)
- [ ] `entry_rules` (text, nullable)
- [ ] `exit_rules` (text, nullable)
- [ ] `risk_rules` (text, nullable)
- [ ] `checklist` (text[], defaults '{}')
- [ ] `market_type` (text, nullable, defaults 'all') — **NEW FIELD, may not be wired yet**
- [ ] `instruments` (text[], nullable) — **NEW FIELD, may not be wired yet**
- [ ] `category` (text, nullable)
- [ ] `difficulty` (text, nullable, must be: beginner/intermediate/advanced)
- [ ] Does NOT send computed fields: total_trades, winning_trades, win_rate, avg_r_multiple, etc.

### 2B: Playbook Detail Page — Stats Tab

```bash
grep -rn "PlaybookDetail\|playbook-detail\|playbook/\[" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Stats tab queries trades WHERE `playbook_id = this_playbook.id`
- [ ] Computes or displays: total trades, win rate, avg R, profit factor from those filtered trades
- [ ] "Backtest with Pelican" button exists (even if backend isn't wired yet)
- [ ] If `strategy_backtest_results` has a row for this playbook_id, it loads and displays cached results

### 2C: Strategy Templates (Public Browse)

```bash
grep -rn "strateg\|template.*browse\|curated\|is_published\|is_curated" --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
```

- [ ] Browse page queries playbooks WHERE `is_published = true` OR `is_curated = true`
- [ ] Public detail page uses the `slug` field for the URL (not the UUID)
- [ ] "Use This Strategy" / "Adopt" button creates a new playbook for the user with `forked_from` set to the source playbook's id
- [ ] Adoption is tracked in `template_adoptions` table
- [ ] Source playbook's `adoption_count` increments

---

## AUDIT 3: WATCHLIST PIPELINE

```bash
grep -rn "watchlist\|useWatchlist\|Watchlist" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Add to watchlist writes to `watchlist` table with: user_id (via RLS), ticker, notes, added_from ('manual'/'chat'/'trade'/'onboarding'), conversation_id (nullable)
- [ ] UNIQUE constraint is per user+ticker (can't add same ticker twice)
- [ ] Remove from watchlist deletes the row
- [ ] Watchlist items appear on: Morning Brief page, Positions sidebar, wherever "My Watchlist" shows
- [ ] Watchlist items are clickable → opens chat with analysis prompt (the chat prefill flywheel)
- [ ] `alert_price_above` and `alert_price_below` columns — is there any UI to set these? Or are they dead columns?

---

## AUDIT 4: DAILY JOURNAL PIPELINE

```bash
grep -rn "daily_journal\|dailyJournal\|DailyJournal\|journal.*date\|journal_date" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Journal entry writes to `daily_journal` with correct columns:
  - `journal_date` (date, unique per user)
  - `pre_market_notes`, `market_bias`, `planned_trades`, `daily_goal`
  - `post_market_notes`, `lessons_learned`, `emotional_state`, `followed_plan`
  - `total_trades`, `winning_trades`, `losing_trades`, `daily_pnl`
- [ ] Upsert logic: if entry exists for today, UPDATE; else INSERT
- [ ] The trade stats (total_trades, winning_trades, losing_trades, daily_pnl) — are these auto-computed from the `trades` table for that date, or manually entered? If manual, is there a "sync from trades" button?
- [ ] Journal entries display on a calendar or list view with correct date grouping
- [ ] The `emotional_state` field uses the correct enum values: confident/anxious/frustrated/calm/excited/fearful/neutral

---

## AUDIT 5: MORNING BRIEF / POSITIONS PIPELINE

```bash
grep -rn "morning\|brief\|MorningBrief\|positions.*dashboard\|PositionsDashboard" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

### 5A: Open Positions Display

- [ ] Queries `trades` WHERE `status = 'open'` AND `user_id` (via RLS)
- [ ] For each open trade, fetches live price from Polygon API route
- [ ] Live price fetch handles asset_type correctly:
  - `stock` → `/v2/snapshot/locale/us/markets/stocks/tickers/{TICKER}`
  - `crypto` → `/v2/snapshot/locale/global/markets/crypto/tickers/X:{TICKER}`
  - `forex` → `/v2/snapshot/locale/global/markets/forex/tickers/C:{TICKER}`
  - `etf` → same as stocks endpoint
  - `option` → TBD
  - `future` → TBD
- [ ] Unrealized P&L computed client-side: `(currentPrice - entry_price) * quantity * (direction === 'short' ? -1 : 1)`
- [ ] Clicking a position opens chat with context (Pelican Scan flywheel)

### 5B: Morning Brief Generation

```bash
grep -rn "pelican.*brief\|generate.*brief\|briefPrompt\|pelican_stream\|morning.*brief" --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
```

- [ ] "Generate Brief" button constructs a prompt including: open positions, watchlist tickers, today's date
- [ ] Sends to backend via SSE (same `/api/pelican_stream` or similar endpoint used by chat)
- [ ] Response streams inline on the Morning Brief page (not redirecting to chat)
- [ ] Cached brief stored somewhere (localStorage? `cached_market_data` table?) with expiry
- [ ] Uses 1 credit

### 5C: Top Movers / Market Data

```bash
grep -rn "movers\|top.*gain\|top.*los\|market.*data\|heatmap" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Movers fetched from Polygon API route (not directly from client)
- [ ] Gainers and losers displayed with correct price formatting
- [ ] Clicking a mover → chat prefill with analysis prompt (flywheel)

---

## AUDIT 6: HEATMAP PIPELINE

```bash
grep -rn "heatmap\|Heatmap\|treemap\|sp500" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Three surfaces: sidebar tab, full `/heatmap` page, in-chat widget
- [ ] Data comes from API routes (`/api/heatmap/sp500`, `/api/heatmap/movers`, `/api/heatmap/custom`)
- [ ] Custom view uses the user's `watchlist` tickers
- [ ] Clicking any stock → chat prefill with "Analyze {TICKER}" (flywheel)
- [ ] Auto-refresh interval: 60s during market hours, 5m after hours
- [ ] S&P 500 constituent mapping exists and is reasonably complete

---

## AUDIT 7: EARNINGS CALENDAR PIPELINE

```bash
grep -rn "earnings\|Earnings\|finnhub\|FINNHUB" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Fetches from Finnhub API via server-side route (not client-direct)
- [ ] Response shape handled correctly: `data.earningsCalendar` (array)
- [ ] Grouped by date in UI
- [ ] Clicking an earnings row → opens chat/Pelican panel with context (flywheel)
- [ ] Cache exists in `cached_market_data` table with 24h expiry? Or just API route cache?

---

## AUDIT 8: CORRELATION PAGE

```bash
grep -rn "correlation\|Correlation" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Reads from `correlation_assets` (18 rows — the asset universe)
- [ ] Reads from `correlation_cache` (459 rows — precomputed correlations)
- [ ] Reads from `market_regimes` (4 rows)
- [ ] Clicking "Ask Pelican" on a correlation pair → chat prefill (flywheel)
- [ ] Correlation data computed server-side? Or by an API route? Where does `correlation_cache` get populated?

---

## AUDIT 9: BEHAVIORAL EVENTS (THE INVISIBLE FLYWHEEL)

```bash
grep -rn "behavioral_event\|trackEvent\|track_event\|logEvent\|behavioralEvent" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

This is the engagement tracking that powers personalization. Verify:
- [ ] Events are being written to `behavioral_events` table
- [ ] The `event_type` values used in code match the CHECK constraint enum:
  alert_dismissed, alert_acted, position_monitored, health_score_viewed,
  heatmap_ticker_clicked, heatmap_sector_drilled, heatmap_view_changed,
  trade_graded, trade_scanned, daily_journal_written, insight_viewed,
  playbook_scanned, playbook_adopted, playbook_created, checklist_completed,
  correlation_pair_viewed, correlation_ask_pelican, earnings_event_clicked,
  earnings_alert_set, brief_opened, brief_section_engaged, chat_prefill_used,
  suggested_prompt_clicked, learning_term_clicked, feature_first_use, page_visited
- [ ] Key user actions actually fire events:
  - Logging a trade → event?
  - Scanning a position → `trade_scanned`?
  - Clicking a heatmap stock → `heatmap_ticker_clicked`?
  - Writing a journal entry → `daily_journal_written`?
  - Adopting a strategy template → `playbook_adopted`?
  - Using a suggested prompt chip → `suggested_prompt_clicked`?
- [ ] Events include the correct `ticker` and `feature` fields where applicable
- [ ] There's a shared utility/hook for tracking (not scattered `supabase.from('behavioral_events').insert()` calls)

---

## AUDIT 10: ONBOARDING & SURVEY PIPELINE

```bash
grep -rn "onboarding\|survey\|trader_survey\|traderSurvey\|OnboardingSurvey" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Survey form exists and writes to `trader_survey` table
- [ ] Survey fields match the massive column set (experience_level, primary_style, markets_traded, account_size_range, risk_tolerance, etc.)
- [ ] `completed_at` is set when survey is submitted (not on page load)
- [ ] Survey can be `skipped` (sets `skipped = true`)
- [ ] Onboarding milestones write to `onboarding_progress` table with `milestone_key` + `completed_at`
- [ ] Survey data is READ anywhere downstream (morning brief, suggested prompts, chat context)? Or is it write-only right now?

---

## AUDIT 11: TRADING PLAN PIPELINE

```bash
grep -rn "trading_plan\|tradingPlan\|TradingPlan" --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

- [ ] Plan editor writes to `trading_plans` table
- [ ] Massive field set is properly mapped (max_trades_per_day, max_daily_loss, require_stop_loss, pre_entry_checklist, etc.)
- [ ] Plan rules surface in the Log Trade modal (pre-entry checklist, violations)
- [ ] `plan_rules_followed` and `plan_rules_violated` on trades reference actual rules from the active plan
- [ ] Active plan is identified by `is_active = true` for the user

---

## AUDIT 12: STREAKS & GAMIFICATION

```bash
grep -rn "streak\|user_streaks\|update_streak" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] `update_streak` RPC exists and is called when: user writes a journal entry (streak_type='journal'), user follows their plan (streak_type='plan')
- [ ] Streak display reads from `user_streaks` table: current_streak, best_streak, last_activity_date
- [ ] If no streak row exists for the user, UI shows 0 (not an error)

---

## AUDIT 13: CREDIT SYSTEM FLOW

```bash
grep -rn "credit\|deduct\|credits_balance\|free_questions" --include="*.tsx" --include="*.ts" | grep -v node_modules | head -30
```

- [ ] Credits displayed from `user_credits.credits_balance`
- [ ] `free_questions_remaining` decremented for unauthenticated/free users
- [ ] Credit deduction happens SERVER-SIDE (Fly.io backend or API route), NOT client-side
- [ ] After a chat message, the credits provider refetches/updates the balance
- [ ] Supabase Realtime subscription on `user_credits` table updates UI live?

---

## AUDIT 14: CHAT ↔ FEATURE INTEGRATION (THE FLYWHEEL HUB)

This is the most important audit. Chat is the center of the flywheel. Every feature should connect back to it.

```bash
# Find ALL chat prefill / openWithPrompt patterns
grep -rn "openWithPrompt\|prefillChat\|setChatPrefill\|chatPrefill\|setInput.*ticker\|pelicanPanel" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

Verify these flywheel connections exist AND work:

| Feature | Action | Expected Chat Integration |
|---------|--------|--------------------------|
| Positions table | Click SCAN | Chat prefills with position context |
| Heatmap | Click stock tile | Chat prefills "Analyze {TICKER}" |
| Earnings | Click earnings row | Chat prefills earnings analysis prompt |
| Watchlist | Click ticker | Chat prefills analysis prompt |
| Morning Brief movers | Click ticker | Chat prefills analysis prompt |
| Correlation page | "Ask Pelican" button | Chat prefills correlation context |
| Trade journal | "Log Trade" button on chat message | Detects tickers in message, pre-fills modal |
| Playbook detail | "Discuss" button | Chat opens with playbook context |
| Learning Mode | Click term | Learn sidebar opens with education chat |

For each: trace from the click handler → through the prefill mechanism → to the chat input actually receiving the text. Is there ONE shared mechanism, or are there multiple incompatible implementations?

---

## AUDIT 15: SAVED INSIGHTS

```bash
grep -rn "saved_insight\|SavedInsight\|saveInsight\|bookmark" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] "Save Insight" button on chat messages writes to `saved_insights` table
- [ ] Columns: content, message_id (FK → messages), conversation_id (FK → conversations), tickers[], note
- [ ] Saved insights viewable somewhere (Insights tab? Settings?)
- [ ] 5 rows exist — the feature is partially working

---

## OUTPUT FORMAT

After completing all 15 audits, produce a single summary with THREE sections:

### SECTION 1: CONNECTED AND WORKING
List every pipe that is properly wired end-to-end. Format:
```
✅ [Feature] → [Table/RPC] — [Brief note]
```

### SECTION 2: WIRED BUT BROKEN
Pipes that exist but have bugs (wrong column names, missing error handling, stale data, type mismatches). Format:
```
⚠️ [Feature] → [Table/RPC] — [Exact problem] — [File:line]
```

### SECTION 3: NOT WIRED (MISSING PIPES)
Features that exist in the UI but have no data connection, or DB tables that exist but no frontend reads/writes them. Format:
```
❌ [Feature/Table] — [What's missing] — [Impact on flywheel]
```

### SECTION 4: FLYWHEEL GAPS
Places where Feature A should feed into Feature B but doesn't. The "this trade should update the playbook stats" kind of gaps. Format:
```
🔄 [Source] → [Expected Destination] — [What should happen] — [What actually happens]
```

DO NOT fix anything. Report only. Be specific — file names, line numbers, exact column name mismatches.
