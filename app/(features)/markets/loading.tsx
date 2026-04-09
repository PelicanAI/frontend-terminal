export default function Loading() {
  return (
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="h-8 w-40 bg-[var(--bg-elevated)] rounded-lg mb-2" />
          <div className="h-4 w-64 bg-[var(--bg-elevated)] rounded opacity-60 mb-6" />
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 bg-[var(--bg-elevated)] rounded-lg" />
            ))}
          </div>
          <div className="h-10 w-72 rounded-lg bg-[var(--bg-elevated)] mb-4" />
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-1">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-[var(--bg-surface)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
