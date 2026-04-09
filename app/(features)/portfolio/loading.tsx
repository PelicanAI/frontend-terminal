export default function Loading() {
  return (
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="border-b border-[var(--border-default)] pb-3">
            <div className="h-3 w-28 bg-[var(--bg-elevated)]" />
            <div className="mt-3 h-8 w-40 bg-[var(--bg-elevated)]" />
            <div className="mt-2 h-px w-full bg-[var(--border-subtle)] opacity-70" />
          </div>
          <div className="border-b border-[var(--border-default)] py-3">
            <div className="h-11 w-full bg-[var(--bg-elevated)] opacity-70" />
          </div>
          <div className="border-b border-[var(--border-default)] py-2.5">
            <div className="h-3 w-24 bg-[var(--bg-elevated)]" />
          </div>
          <div>
            {[1, 2, 3].map((item) => (
              <div key={item} className="border-b border-[var(--border-subtle)] py-3">
                <div className="h-5 w-full bg-[var(--bg-elevated)] opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
