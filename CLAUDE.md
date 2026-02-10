## Workflow Orchestration
### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
### 2. Agent Strategy
- **Agent Teams**: Use freely for parallel workstreams. No limits on agent count — use as many as needed to get results fast.
- **Subagents**: Spawn as many as needed for any subtask. Nest freely if it helps.
- Maximize parallelism. Speed over conservation.
### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it
### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Project Context: Pelican Frontend v2

### What This Is
AI-powered trading assistant frontend. Next.js 14 App Router, Supabase auth, Stripe payments, SSE streaming chat.

### V2 Goals
1. SSR for marketing pages (SEO/Core Web Vitals)
2. Performance optimization (images, code splitting, bundle size)
3. Component splitting (settings, message-bubble, chat-input)
4. New features: regenerate response, suggestions tab, better mobile

### Architecture Constraints
- Keep: Supabase, Stripe, SWR, Radix UI, 30-language i18n
- Change: Marketing pages → Server Components, add next/dynamic imports
- Don't Touch: hooks/use-chat.ts streaming logic (it works), hooks/use-conversations.ts

### Key Files to Know
- `app/(marketing)/page.tsx` — Currently 'use client', needs SSR refactor
- `app/settings/page.tsx` — 995 lines, needs splitting into sections
- `components/chat/message-bubble.tsx` — 552 lines, needs splitting
- `app/layout.tsx` lines 37-40 — Duplicate font loading, remove external link tags

### Testing Requirements
- Zero test coverage currently
- Add Vitest for unit tests
- Add Playwright E2E for: auth flow, chat send/receive, payment flow

### Don't Do
- Don't rebuild the chat streaming implementation
- Don't refactor hooks/use-chat.ts unless explicitly asked
- Don't add new dependencies without checking if existing ones cover the use case
- Don't use React.lazy — use next/dynamic instead (App Router)

---

## File Ownership Rules (Agent Teams)

When using agent teams, teammates must respect these boundaries to avoid merge conflicts:

### Read-Only (Never Modify)
- `hooks/use-chat.ts` — 577-line SSE streaming. Works. Don't touch.
- `hooks/use-streaming-chat.ts` — SSE parsing. Works.
- `hooks/use-conversations.ts` — Conversation state. Works.
- `messages/*.json` — 30 languages of translations. Only modify via i18n workflow.

### Directory Ownership (One Agent Per Directory)
- `app/(marketing)/` — SSR migration agent only
- `app/(app)/` — App feature agent only
- `app/(admin)/` — Admin dashboard agent only (new directory)
- `app/chart/` — Chart widget agent only (new directory)
- `app/api/` — Only modify if you own the feature that API serves
- `components/chat/` — One agent per component file, never two agents on same file
- `components/settings/` — One agent only (new directory, split from settings page)
- `components/portfolio/` — One agent only (new directory)
- `components/admin/` — One agent only (new directory)

### Shared (Coordinate Before Modifying)
- `app/layout.tsx` — Root layout. Changes here affect everything. Coordinate with lead.
- `lib/supabase/*` — Supabase client/server setup. Shared utility.
- `lib/admin.ts` — Admin email checks. Shared utility.
- `providers/` — Context providers. Changes affect all routes.
- `tailwind.config.ts` — Global styles. Coordinate.
- `package.json` — Dependency changes must be approved by lead agent.

## V2 Phased Roadmap

| Phase | Focus | Duration | Agent Teams? |
|-------|-------|----------|-------------|
| 0 | Quick wins: font fix, image optimization, console cleanup | 2 days | No — solo session |
| 1 | SSR + Performance: marketing SSR, code splitting, loading states | 1 week | Yes — 3 agents (SSR, Perf, Review) |
| 2 | Component splitting: settings, message-bubble, chat-input | 1 week | Yes — one per component |
| 3 | Chat features: regenerate, suggestions tab, mobile UI | 1 week | No — tightly coupled to streaming |
| 4 | Admin dashboard: user list, credit analytics, metrics | 1 week | Yes — 2 agents (backend, frontend) |
| 5 | Portfolio system: position CRUD, CSV import, portfolio view | 1.5 weeks | Yes — 3 agents (schema, CSV parser, UI) |
| 6 | Alerts + Realtime: price alerts, notifications, WebSocket | 1 week | No — sequential realtime logic |
| 7 | Chart widgets: TradingView embed, pop-out windows | 3-5 days | No — contained task |
| 8 | Testing + Polish: Vitest, Playwright, bug fixes | 1 week | Optional — parallel test writing |

## V2 Database Schema (New Tables)
```sql
-- Portfolio system
portfolios (id, user_id, name, is_default, created_at)
positions (id, portfolio_id, user_id, ticker, quantity, entry_price, entry_date, position_type, notes, metadata, created_at, updated_at)
position_alerts (id, position_id, user_id, alert_type, threshold, is_active, triggered_at, created_at)

-- Notifications (Supabase Realtime)
notifications (id, user_id, type, title, body, data, read_at, created_at)

-- Analytics
analytics_events (id, event, properties, user_id, session_id, timestamp)
credit_transactions (id, user_id, amount, balance_after, transaction_type, metadata, created_at)
```

## V2 New Features Summary

### Portfolio/Position Tracking
- Manual position entry (ticker, quantity, entry price, date)
- CSV import from brokers (TD/Schwab, IBKR, Robinhood)
- P&L calculations
- Chat becomes context-aware of user positions

### Real-time Alerts (Supabase Realtime)
- Price alerts (above/below threshold)
- Percentage gain/loss alerts
- Notifications table triggers realtime push
- Toast notifications in UI

### Pop-out Chart Widgets
- TradingView embedded widgets
- window.open() to /chart/[ticker] route
- Charts appear when ticker mentioned in chat

### Admin Dashboard
- User list with search/filter
- Credit consumption analytics
- Revenue metrics from Stripe
- System health monitoring

### Chat Enhancements
- Regenerate response button
- Pelican suggestions tab (prebuilt prompts)
- Branch to new chat button
- Better mobile UI (touch targets, responsive layout)

## Tech Stack Reference

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Auth/DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Payments | Stripe |
| UI | Radix UI + shadcn/ui + Tailwind CSS v4 |
| State | SWR + React Context |
| Charts | TradingView widgets |
| Backend API | Fly.io (Python) |
| Hosting | Vercel |
| Monitoring | Sentry + Vercel Analytics |
| i18n | next-intl (30 languages) |

## Agent Teams Guidelines

### When to Use Agent Teams
- Tasks with 2+ independent workstreams touching different files/directories
- Code reviews from multiple perspectives (security, performance, accessibility)
- Cross-layer features (schema + API + UI in parallel)

### When NOT to Use Agent Teams
- Sequential tasks or same-file edits
- Work that depends heavily on hooks/use-chat.ts or streaming logic
- Quick bug fixes or single-file changes
- Any task where agents would need to edit the same file

### Execution Protocol
- No limits on agent count — spawn as many as the task demands
- No token conservation concerns — prioritize speed and results
- Lead agent assigns tasks and synthesizes results
- Teammates claim tasks from shared task list
- If a teammate needs to touch a shared file, message the lead first
- After each phase, lead runs verification before moving on
