## Workflow Orchestration
### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity
### 2. Agent Strategy
- **Agent Teams**: Use freely for parallel workstreams. No limits on agent count.
- **Subagents**: Spawn as many as needed. Nest freely.
- Maximize parallelism. Speed over conservation.
### 3. Self-Improvement Loop
- After ANY correction: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake
- Review lessons at session start
### 4. Verification Before Done
- Never mark complete without proving it works
- `npm run build` must pass before any commit
- Ask: "Would a staff engineer approve this?"
### 5. Autonomous Bug Fixing
- When given a bug: just fix it. Don't ask for hand-holding.
- Point at logs/errors, then resolve them.

## Core Principles
- **Simplicity First**: Minimal changes, minimal code touched.
- **No Laziness**: Root causes only. No temporary fixes.
- **Security First**: Every feature needs RLS, input validation, auth checks. Never client-only enforcement.
- **Don't Touch Streaming**: `hooks/use-chat.ts` and `hooks/use-streaming-chat.ts` work. Don't modify unless explicitly asked.

---

## Project Context: Pelican Trading AI

### What This Is
AI-powered trading assistant. Users ask questions about markets in plain English, get institutional-grade analysis. Think Bloomberg Terminal for retail traders.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Auth/DB | Supabase (project: `ewcqmsfaostcwmgybbub`, us-east-2) |
| Payments | Stripe (Starter $29, Pro $99, Elite $249) |
| UI | Radix UI + shadcn/ui + Tailwind CSS |
| State | SWR + React Context |
| Charts | TradingView widgets |
| Backend API | Python on Fly.io (SSE streaming) |
| LLM | GPT-5 (primary), GPT-4o-mini (education, classification) |
| Market Data | Polygon.io |
| Hosting | Vercel |
| Email | Resend |
| i18n | Custom useTranslation hook (30 languages) |
| Domain | pelicantrading.ai (prod), pelicantrading.org (staging) |

### Database — Core Tables (actively used)
```
user_credits: user_id (PK), credits_balance, credits_used_this_month, plan_type,
  plan_credits_monthly, stripe_customer_id, stripe_subscription_id,
  free_questions_remaining (default 10), is_admin, terms_accepted

conversations: id, user_id, title, created_at, updated_at, is_active,
  metadata, last_message_preview, message_count

messages: id, conversation_id, user_id, role (user/assistant/syem),
  content, timestamp, metadata (JSONB — may contain images array),
  intent, tickers[], emotional_state

files: id, user_id, storage_path, mime_type, name, size
```

### Database — Future Feature Tables (exist in Supabase, no frontend yet)
```
trades: id, user_id, ticker, asset_type, direction, quantity, entry_price,
  exit_price, stop_loss, take_profit, status (open/closed/cancelled),
  pnl_amount, pnl_percent, r_multiple, entry_date, exit_date,
  thesis, notes, setup_tags[], conviction (1-10), ai_grade (jsonb)

daily_journal: id, user_id, journal_date, pre_market_notes, market_bias,
  daily_goal, post_market_notes, lessons_learned, daily_pnl

playbooks: id, user_id, name, setup_type, entry_rules, exit_rules,
  risk_rules, checklist[], win_rate

watchlist: id, user_id, ticker, notes, alert_price_above, alert_price_below
```

### RPC Functions (exist in Supabase, for future trade journal)
```
close_trade, get_trade_stats, get_stats_by_setup, get_pnl_by_day_of_week, get_equity_curve
```

### RPC Function for Admin (actively used)
```
get_popular_tickers(p_days INTEGER, p_limit INTEGER) → [{ ticker TEXT, mention_count BIGINT }]
  -- Extracts tickers from user message content via regex against known ticker whitelist
```

---

## What's Built (V2 Features — Complete)

### Chat Interface
- SSE streaming with GPT-5 via Fly.io backend
- Ticker highlighting (purple, clickable → pre-fills chat)
- Learning Mode toggle (GraduationCap icon, 120+ terms, hover tooltips, education sidebar chat)
- Regenerate response button
- Message actions (copy, etc.)
- 30-language support

### Right Sidebar Tabs
- **Market**: Live indices (SPX, IXIC, DJI), VIX, sector performance, watchlist with prices
- **Calendar**: TradingView economic calendar widget
- **Learn**: Education chat (GPT-4o-mini) for Learning Mode

### Morning Brief (`/morning`) — COMPLETE ✓
- **Market Movers**: Gainers/Losers with price tier filters (All, $200+, $100-$200, etc.)
  - Default: "All" tier (shows all tickers)
  - Live price data via Polygon.io
  - Click ticker → pre-fills chat
- **Active Exposure**: Open positions with unrealized P&L calculated from live prices
  - Formula: `(currentPrice - entryPrice) × quantity × direction`
  - Color-coded: green (profit), red (loss), gray (unavailable)
- **Earnings Today**: Today's earnings with EPS/Rev estimates and actuals
  - Pre-report: "Est. EPS:" / "Est. Rev:" labels (muted)
  - Post-report: "EPS:" / "Rev:" with beat/miss indicators (▲/▼)
- **IPO Watch**: Upcoming IPOs with ticker, company, date, price range
  - Smart date formatting (Today, Tomorrow, or date)
  - Click → opens Pelican chat with IPO context
- **Economic Calendar**: Key events for the day
- Subtle header elevation with gradient background

### Earnings Calendar (`/earnings`) — COMPLETE ✓
- **5-Column Week Grid**: Monday-Friday layout with day headers
- **Before Open Section**: ☀ Capped at 3 rows (small caps)
  - "+N more" expands to show all
  - "− collapse" to hide extras
- **After Close Section**: 🌙 Shows 8 rows initially (big names like NVDA, AAPL, META)
  - Same "+N more" expansion behavior
- **Uniform Row Sizing**: ALL rows enlarged for better readability
  - Logo: 20px, Ticker: text-sm font-semibold
  - EPS/Rev: text-xs, Padding: px-3 py-2.5
  - Hover: `hover:bg-white/[0.04]`
- **Visual Divider**: Subtle border between Before Open and After Close
- **Pelican Watermark**: Pure white logo at 3% opacity
  - Overlays ON TOP of grid (not behind)
  - CSS filter: `brightness(0) invert(1)` for pure white
  - Brands every screenshot for social media exposure
- **Consistent Background**: Uniform `#0a0a0f` top to bottom (no gradient)
- **Header Polish**: Subtle border divider, clean spacing

### Trade Journal (`/journal`) — COMPLETE ✓
- **Positions Table**: Open/closed trades with live P&L tracking
  - Multi-endpoint price fetching (stocks, crypto, forex)
  - Ticker format: `ticker:assetType` for proper Polygon routing
- **Log Trade Modal**: Full trade entry with validation
  - Auto-appends "USD" for crypto/forex (BTC → BTCUSD, EUR → EURUSD)
  - Company name search (not just ticker symbols)
  - Position size, Risk at Stop, Profit at Target calculations
  - Risk/Reward ratio with color coding (green ≥2:1, yellow 1-2:1, red <1:1)
  - Asset type auto-detection from search results
- **Crypto/Forex Support**: Polygon ticker prefixes
  - Crypto: `X:BTCUSD`, Forex: `C:EURUSD`, Stocks: `AAPL`
  - Logo mapping for crypto pairs (BTCUSD → BTC)
- **Mobile Responsive**: Card layouts, bottom sheets, safe area padding

### Market Heatmap (`/heatmap`) — COMPLETE ✓
- Custom squarified treemap (no d3 dependency)
- S&P 500 stocks with live price data
- Sector filtering with horizontal pills on mobile
- Click stock → pre-fills chat with analysis prompt
- Auto-refresh: 60s market hours, 5m after hours
- Mobile: sorted list view with color coding

### Admin Dashboard (`/admin`)
- User list with search/filter
- Recent signups table
- Recent conversations with expandable previews
- Credit management
- Analytics: messages/day, conversations/day, signups/day, credit consumption, conversion funnel, plan distribution, MRR

### Security (Hardened)
- Stripe checkout: authenticated endpoints, validated price IDs, server-controlled credits
- Terms of Service: server-side enforcement for Google OAuth
- RLS on all tables
- Secure RPC with SECURITY DEFINER

---

## Architecture Patterns

### Chat ↔ Feature Integration
Features use a "chat pre-fill" pattern: clicking elements composes messages in chat input.
Look for `prefillChatMessage` or similar — should be a shared utility.

### Data Fetching
- **SWR Hooks**: Used for live data (prices, earnings, movers)
  - `useLiveQuotes` - Multi-endpoint price fetching with asset type routing
  - `useEarnings` - Earnings calendar with 60s refresh
  - `useHeatmap` - Heatmap data with auto-refresh
- **Format**: `ticker:assetType` for price fetching (`AAPL:stock`, `BTCUSD:crypto`, `EURUSD:forex`)

### Polygon.io API Integration
- **Different endpoints per asset class**:
  - Stocks: `/v2/snapshot/locale/us/markets/stocks/tickers`
  - Crypto: `/v2/snapshot/locale/global/markets/crypto/tickers`
  - Forex: `/v2/snapshot/locale/global/markets/forex/tickers`
- **Ticker Prefixes**:
  - Crypto: `X:BTCUSD` (must include prefix)
  - Forex: `C:EURUSD` (must include prefix)
  - Stocks: `AAPL` (no prefix)
- **Multi-endpoint routing**: Group tickers by asset type, fetch in parallel

### Supabase Client
- Client-side: `createClient` or `createBrowserClient` (search lib/supabase/)
- Server-side API routes: different client. Search for `createServerClient`.

### Mobile Responsiveness Strategy
- **Breakpoints**: sm: 640px, md: 768px, lg: 1024px
- **Desktop ≥1024px**: Must look identical, no layout changes
- **Mobile/Tablet**: Bottom sheets, card layouts, horizontal scrolling
- **Safe Area**: `.pb-safe`, `.pt-safe` utilities for notch/bottom bar
- **Pattern**: Desktop-first design, then mobile adaptations

### Visual Branding
- **Watermarks**: Overlay ON TOP of content (not background-image)
  - Use `filter: brightness(0) invert(1)` for pure white
  - `pointer-events-none` for click-through
  - 3-5% opacity for subtle effect
  - Positioned LAST in DOM for natural stacking order
- **Consistency**: Uniform backgrounds, no gradients unless intentional hierarchy

---

## Key Learnings & Best Practices

### Polygon.io Integration Lessons
1. **Asset Type Routing is Critical**
   - MUST use different endpoints per asset class (stocks, crypto, forex)
   - MUST include prefixes for crypto (`X:`) and forex (`C:`)
   - Group tickers by asset type before fetching to minimize API calls
   - Pass `ticker:assetType` format from frontend to API routes

2. **Logo Mapping for Crypto**
   - Crypto pairs (BTCUSD) need mapping to base symbol (BTC) for logos
   - Map in frontend: `getLogoSymbol()` function strips prefixes and maps pairs

3. **Auto-normalization**
   - Auto-append "USD" for bare crypto/forex symbols (BTC → BTCUSD, EUR → EURUSD)
   - Prevents user errors when logging trades
   - Apply normalization in form submission AND autocomplete selection

### Visual Design Patterns
1. **Watermarks for Screenshot Branding**
   - Position LAST in DOM to overlay ON TOP of all content
   - Use `filter: brightness(0) invert(1)` for pure white (regardless of original color)
   - `pointer-events-none` for click-through behavior
   - 3-5% opacity is sweet spot (visible but not distracting)
   - Marketing hack: Every screenshot shared = free brand exposure

2. **Background Consistency**
   - Avoid gradients that create color shifts between sections
   - Use borders (`border-white/[0.04]`) for visual separation, not background changes
   - Keep entire page one uniform background (`#0a0a0f`)
   - Let grid glows and content spacing create hierarchy

3. **Visual Hierarchy with Data Density**
   - Cap less important sections (Before Open earnings at 3 rows)
   - Give more space to important data (After Close earnings at 8 rows)
   - Use uniform sizing when differentiation isn't meaningful
   - "+N more" expansion for overflow prevents overwhelming users

### Form UX Enhancements
1. **Progressive Reveal with Calculations**
   - Show calculated metrics as form fields are filled (Position Size, Risk at Stop, Profit at Target)
   - Color-code Risk/Reward ratios (green ≥2:1, yellow 1-2:1, red <1:1)
   - Gamification through discipline: visible metrics encourage better trade planning

2. **Smart Defaults**
   - Market movers default to "All" tier (not $200+) - users can filter down
   - Company name search, not just ticker symbols (more user-friendly)
   - Asset type auto-detection from search results

3. **Estimate vs Actual Clarity**
   - Pre-report: "Est. EPS:" / "Est. Rev:" (muted color)
   - Post-report: "EPS:" / "Rev:" with beat/miss indicators (▲/▼, colored)
   - Label change makes transition from estimate to result obvious at a glance

### Mobile Responsiveness Strategy
1. **Desktop-First, Then Adapt**
   - Desktop ≥1024px must remain pixel-perfect
   - Mobile gets: bottom sheets, card layouts, horizontal scrolling
   - Safe area utilities for notches/home bars

2. **Consistent Patterns**
   - Apply same header treatment across all feature pages
   - Use same component patterns (sheets, pills, cards) throughout
   - Mobile users expect consistency

---

## Planned Features (NOT in repo yet — do not reference these files)

### Trade Journal (`/journal`)
- 5 tabs: Dashboard, Trades, Analytics, Daily Journal, Playbooks
- 6 recharts visualizations: equity curve, daily P&L, setup performance, day-of-week, R-multiple, conviction
- Log/Close/Edit trade modals with zod validation
- Pelican Scan: click icon on trade → pre-fills chat with trade context
- "Log Trade" button on chat messages with ticker detection
- Sidebar "Trades" tab: open position cards, today's closed trades, quick actions

### Market Heatmap (`/heatmap`)
- Custom squarified treemap (no d3 dependency)
- S&P 500 static constituent mapping (200+ stocks)
- Sidebar "Heatmap" tab with same data views
- Click stock → pre-fills chat with analysis prompt
- Auto-refresh: 60s market hours, 5m after hours

### Database tables exist in Supabase but frontend not built yet:
trades, daily_journal, playbooks, watchlist, trade_screenshots, trade_imports

---

## File Ownership (Agent Teams)

### Read-Only
- `hooks/use-chat.ts` — SSE streaming. Works. Don't touch.
- `hooks/use-streaming-chat.ts` — SSE parsing. Works.
- `hooks/use-conversations.ts` — Conversation state. Works.
- `messages/*.json` — Translation files. Only modify via i18n workflow.

### Shared (Coordinate First)
- `app/layout.tsx` — Root layout affects everything
- `lib/supabase/*` — Shared client setup
- `providers/` — Context providers
- `tailwind.config.ts` — Global styles
- `package.json` — Dependency changes need approval
- `globals.css` — Design tokens and CSS variables

---

## Coding Standards
- TypeScript strict. No `any` where proper types exist.
- Functional components + hooks. React.memo for expensive renders.
- Tailwind utilities + custom classes in globals.css for animations.
- PascalCase components, camelCase functions, kebab-case files.
- All mutations in try/catch with user-facing errors.
- `IF NOT EXISTS` in migrations. Never break production.
- No console.log in production except intentional error logging.
- All user-facing strings through translation system.
- `tabular-nums` on all numeric data (prices, percentages).
- `next/dynamic` instead of React.lazy (App Router).

---

## Current TODO
- [x] ~~Morning Brief with movers, earnings, IPOs~~ ✓ COMPLETE
- [x] ~~Earnings Calendar with watermark branding~~ ✓ COMPLETE
- [x] ~~Trade Journal with crypto/forex support~~ ✓ COMPLETE
- [x] ~~Market Heatmap with live data~~ ✓ COMPLETE
- [x] ~~Mobile responsiveness V2~~ ✓ COMPLETE
- [ ] Image persistence (Supabase Storage → signed URLs)
- [ ] TradingView attribution tags
- [ ] Nick headshot + Twitter on team page
- [ ] Chat UI polish (formatting, spacing, visual hierarchy)
- [ ] Open Graph meta tags for social sharing
- [ ] Landing page CRO improvements (audit score: 51/100)

## Future TODO
- [ ] Trade Analytics Dashboard (equity curve, P&L charts)
- [ ] Daily Journal feature (pre/post market notes)
- [ ] Playbooks system (setup rules, checklists)
- [ ] Sidebar Trades + Heatmap tabs
- [ ] Position health scores
- [ ] AI trade grading
