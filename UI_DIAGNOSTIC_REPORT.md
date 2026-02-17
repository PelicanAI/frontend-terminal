# UI Diagnostic Report

## ROOT CAUSE: Vercel Deployment Pipeline Broken

**The CSS changes are correct. The code is correct. The build succeeds. But NONE of it has been deployed to Vercel.**

The production Vercel deployment is stuck on commit `9341459` ("Add HeroChatDemo improvements, audit docs, and local config"). Five subsequent commits were pushed to `main` but NEVER deployed:

| Commit | Message | Deployed? |
|--------|---------|-----------|
| `9341459` | Add HeroChatDemo improvements, audit docs, and local config | YES (current production) |
| `722f97c` | trigger deploy | NO |
| `f8d7b93` | trigger deploy | NO |
| `8639c40` | trigger deploy | NO |
| `7217bd7` | ui: Premium chat UI polish — full design token system + 24 component files | NO |
| `6213eb7` | ui: Design token + component refinement pass — contrast, motion, polish | NO |

The 3 "trigger deploy" commits confirm someone already noticed deployments weren't working and tried to force them.

**The GitHub → Vercel webhook/integration is broken or disconnected.**

---

## CSS Variable System
- File location: `app/globals.css` (single file, no duplicates)
- Number of custom properties: ~60+ (surfaces, borders, text, accents, shadows, scrollbar, transitions, animation)
- Current `--surface-tertiary` dark value: `#18182a`
- Current `--surface-tertiary` light value: `#eaeaef`
- Current `--border-subtle` dark value: `rgba(255, 255, 255, 0.10)`
- Current `--border-subtle` light value: `rgba(0, 0, 0, 0.10)`
- Is globals.css imported in layout.tsx: **YES** (line 10: `import "./globals.css"`)
- CSS variables present in built output (`.next/static/css/`): **YES**
- Utility classes generated: **YES** (confirmed `bg-[var(--surface-tertiary)]`, `hover:bg-[var(--surface-hover)]`, etc.)

## Theme System
- Library: `next-themes` (v-latest)
- Dark mode selector: `.dark` class on `<html>` (`attribute="class"` in ThemeProvider)
- Provider location: `lib/providers/index.tsx` → `components/theme-provider.tsx`
- Default theme: `dark`
- System preference: enabled (`enableSystem={true}`)
- Storage key: `pelican-theme`

## Left Sidebar
- File: `components/chat/conversation-sidebar.tsx`
- Class merging utility: `cn()` (from `@/lib/utils`)
- Current root className: `cn("relative z-20", isMobileSheet ? "w-full h-full" : "w-[280px] h-screen border-r border-[var(--border-subtle)]", "flex flex-col bg-[var(--surface-sidebar)] shadow-[var(--shadow-sidebar)]", className)`
- Has bg class: YES — `bg-[var(--surface-sidebar)]`
- Has border class: YES — `border-r border-[var(--border-subtle)]`
- Has inline styles: YES (canary test: `style={{ border: '4px solid red' }}` — added for testing)
- Canary test result: **AWAITING USER VERIFICATION** (red 4px border added to root div)

## Suggestion Cards
- File: `components/chat/SuggestedPrompts.tsx`
- Class merging utility: None (direct className strings, no `cn()`)
- Current card className (enabled): `"w-full min-[400px]:w-auto max-w-[220px] rounded-xl px-5 py-4 min-h-[44px] border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)] active:translate-y-0 active:shadow-none active:scale-[0.98] text-left group"`
- Has bg class: YES — `bg-[var(--surface-tertiary)]`
- Has border class: YES — `border border-[var(--border-subtle)]`, `hover:border-[var(--border-hover)]`
- Has inline styles: NO

## Input Bar
- File: `components/chat/chat-input.tsx`
- Outermost wrapper className: `"w-full pt-3 px-3 sm:px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-[var(--surface-chat)]"`
- Border-bearing element className: `cn("relative flex items-center gap-2 px-4 py-2", "bg-[var(--surface-input)]", "rounded-2xl", "border border-[var(--border-input)]", "transition-[border-color,box-shadow] duration-150", "shadow-[var(--shadow-input)]", "min-h-[56px]", isFocused && ["border-[var(--border-focus)]", "shadow-[var(--shadow-input-focus)]"])`
- Has inline styles: NO
- Nested bg/border divs: NO — single border element wrapping textarea + buttons

## Messages
- File: `components/chat/message-bubble.tsx`
- User message className: `"rounded-[20px_20px_6px_20px] bg-[var(--surface-user-msg)] border border-[var(--border-user-msg)] px-4 py-3"`
- Assistant message className: No special bg — transparent wrapper with Pelican logo avatar
- Action bar className (user): `"flex items-center gap-2 mt-1.5 justify-end opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 max-sm:opacity-50 max-sm:translate-y-0"`
- Action bar className (assistant): `"flex items-center gap-2 mt-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 max-sm:opacity-50 max-sm:translate-y-0"`
- Has `group` class: YES — on both `"flex items-start justify-end group"` (user) and `"flex gap-3 items-start max-w-full sm:max-w-[85%] py-1 group"` (assistant)

## CSS Conflicts
- `!important` overrides found: YES — in 4 files:
  - `app/globals.css` — only on `.signin-button-custom` (sign-in page specific) and `@media (prefers-reduced-motion)` animation resets
  - `app/contrast-fixes.css` — only on `.pelican-logo-header`, `.signin-button-custom`, `.pelican-logo-footer` (marketing page specific)
  - `app/(marketing)/styles/marketing.css` — marketing page only
  - `app/(marketing)/how-to-use/how-to-use.css` — how-to-use page only
  - **None of these affect chat UI components**
- Inline styles in chat components: 10 instances (mostly sizing/dynamic values like `width: ${percent}%`, logo `filter: drop-shadow(...)`, scroll container)
- CSS modules: **NO** — none found in project
- styled-components/emotion: **NO** — not used

## Welcome Screen Layout
- Container hierarchy:
  1. `div.flex-1.flex.flex-col.min-h-0.bg-transparent.relative` (from ChatContainer)
  2. `div.flex.flex-col.items-center.justify-center.flex-1.px-4.sm:px-6.py-10` (WelcomeScreen root)
  3. `div.flex.flex-col.items-center.text-center.-mt-10` (inner centering wrapper)
  4. Logo, headline, subtitle, cards
- Has flex centering: YES — `justify-center` and `flex-1` on outer wrapper
- Has fixed top padding: `py-10` on outer, `-mt-10` on inner (optical centering shift)
- Gradient banner element: `div.absolute.left-1/2.top-1/2.-translate-x-1/2.-translate-y-1/2.w-[500px].h-[350px].rounded-full.opacity-[0.08].dark:opacity-[0.15].blur-[100px].bg-[#8b5cf6]`
- Gradient banner position: absolute (centered on logo)

## Build Verification
- Local `next build`: PASS (zero errors, zero warnings)
- Built CSS contains all custom property definitions: YES
- Built CSS contains all utility classes (`bg-[var(--surface-*)]`, `border-[var(--border-*)]`, etc.): YES
- `active:scale-[0.98]` in built CSS: YES
- `hover:-translate-y-[3px]` in built CSS: YES
- `tracking-[0.06em]` in built CSS: YES
- Build timestamp: Feb 10 07:33:01 — AFTER all source changes

## Vercel Deployment Status
- Project: `pelican-frontend-new` (prj_h4aFRSTxKpcP26XDOoQyK1VJyHd0)
- Team: team_qjcsi92uciMAC7YXPxd1ULCO
- Current production commit: `9341459` ("Add HeroChatDemo improvements, audit docs, and local config")
- Latest git commit: `6213eb7` ("ui: Design token + component refinement pass")
- **Gap: 5 commits not deployed**
- 3 of those 5 were explicit "trigger deploy" commits — confirming awareness of the problem
- Dev server running: **NO** (`next dev` not running)

---

## Hypothesis: Why Changes Aren't Visible

### Primary Cause: Vercel Deployment Pipeline Broken

The GitHub → Vercel auto-deploy integration has stopped working. The production deployment is stuck on commit `9341459`, which predates ALL UI polish work. Both full agent runs (commits `7217bd7` and `6213eb7`) were correctly implemented, build successfully, and generate correct CSS — but they were never deployed to Vercel.

The 3 "trigger deploy" commits between the old deployment and the UI polish work confirm this issue was already known.

### How to Fix

1. **Check Vercel GitHub integration**: Go to Vercel project settings → Git → verify the GitHub repository connection is active
2. **Manual deploy**: Run `vercel --prod` from the project root, or trigger a deploy from the Vercel dashboard
3. **Verify webhook**: Check GitHub repo settings → Webhooks → verify the Vercel webhook is present and delivering successfully
4. **After fixing**: Clear browser cache and verify the new deployment SHA matches the latest commit

### Secondary Observations

Even if deployment were working, many of the changes would be subtle in static screenshots:
- Most changes are interaction states (hover, active, focus) — invisible in static screenshots
- Color value changes are subtle (#f0f0f3 → #eaeaef, 6% → 10% opacity)
- The most VISIBLE changes would be: welcome screen purple glow, header shadow removal, and the `-mt-10` optical centering shift

## Canary Test Status

A `style={{ border: '4px solid red' }}` has been added to the left sidebar root div in `conversation-sidebar.tsx`. Start `npm run dev` and verify locally. If the red border appears, the component renders correctly and CSS changes work. **Leave this in place for user verification.**
