"use client"

export default function NewsCard() {
  return (
    <section className="border-b border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Market news</span>
        <span className="flex-shrink-0 text-[10px] text-[var(--text-muted)]">Coming soon</span>
      </div>
      <div className="px-3 pb-2">
        <p className="text-[11px] text-[var(--text-muted)]">AI-powered news arriving soon.</p>
      </div>
    </section>
  )
}
