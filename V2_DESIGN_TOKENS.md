# V2 Design Tokens Audit

Source audit files:
- `app/globals.css`
- `app/chat/page.client.tsx`
- `components/chat/message-bubble.tsx`

## Core Surfaces (Dark Mode)

From `app/globals.css`:
- `--surface-1: oklch(0.08 0.01 280)`
- `--surface-2: oklch(0.18 0.015 280)`
- `--surface-3: oklch(0.22 0.02 280)`

Supporting depth tokens:
- `--background: #0a0a0f`
- `--primary: oklch(0.60 0.25 280)`
- `--destructive: oklch(0.55 0.25 25)`
- `--border: oklch(0.35 0.08 280)`

## Chat Shell Gradient

From `app/globals.css`:
- `.dark .chat-background-gradient {`
- `background: radial-gradient(ellipse at top, rgba(88, 28, 135, 0.3) 0%, transparent 70%);`
- `}`

Applied in `app/chat/page.client.tsx` on `#main-content`:
- `chat-background-gradient chat-viewport-lock`

## Blur + Glass Layers

From chat shell/components:
- `backdrop-blur-2xl` on side panels/terminal shells
- `backdrop-blur-sm` on sticky chat header region
- `bg-white/[0.06]` for message bubbles and input surfaces
- Borders typically `border-white/[0.05]` to `border-white/[0.08]`

## Message Bubble Styling Pattern

From `components/chat/message-bubble.tsx`:
- User bubble container: `rounded-2xl bg-white/[0.06] px-4 py-3`
- Edit input surface: `bg-white/[0.06] border border-border ... focus:ring-purple-500`
- Action hover states: `hover:text-purple-400 hover:bg-purple-500/10`

## V2 Implementation Guardrails

Use these values for parity:
- Card base: `oklch(0.18 0.015 280)` (`--surface-2`)
- Neutral/muted data: `oklch(0.22 0.02 280 / 0.4)` (`--surface-3` with alpha)
- Ambient shell: `#0a0a0f` + `chat-background-gradient` at `opacity-30`
- Purple interaction glow: `rgba(168,85,247,0.15)` to `rgba(168,85,247,0.4)`
