export default function PositionsLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <div className="animate-pulse space-y-3">
        <div className="h-[88px] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
        <div className="h-9 rounded bg-[var(--bg-surface)]/50" />
        <div className="flex items-center gap-3 pt-1 pb-1">
          <div className="h-2.5 w-20 rounded bg-[var(--bg-elevated)]" />
          <div className="flex-1 h-px bg-[var(--border-subtle)]/20" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[60px] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
          ))}
        </div>
        <div className="h-44 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-8 h-40 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
          <div className="xl:col-span-4 h-40 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
        </div>
      </div>
    </div>
  )
}
