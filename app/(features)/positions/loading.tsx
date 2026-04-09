export default function PositionsLoading() {
  return (
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="border-b border-[var(--border-default)] pb-3">
            <div className="h-3 w-28 bg-[var(--bg-elevated)]" />
            <div className="mt-3 h-8 w-40 bg-[var(--bg-elevated)] opacity-80" />
            <div className="mt-2 h-px w-full bg-[var(--border-subtle)]" />
          </div>

          <div className="border-b border-[var(--border-default)] py-3">
            <div className="h-11 w-full bg-[var(--bg-elevated)] opacity-70" />
          </div>

          <div className="border-b border-[var(--border-default)] py-2.5">
            <div className="h-3 w-24 bg-[var(--bg-elevated)] opacity-80" />
          </div>

          <div>
            {[1, 2, 3].map((item) => (
              <div key={item} className="border-b border-[var(--border-subtle)] py-3">
                <div className="h-4 w-full bg-[var(--bg-elevated)] opacity-70" />
              </div>
            ))}
          </div>

          <div className="mt-4 border-b border-[var(--border-default)] py-4">
            <div className="h-3 w-28 bg-[var(--bg-elevated)] opacity-80" />
            <div className="mt-4 h-px w-full bg-[var(--border-subtle)]" />
            <div className="mt-8 h-px w-full bg-[var(--border-subtle)]" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8 border-b border-[var(--border-default)] py-4">
              <div className="h-3 w-20 bg-[var(--bg-elevated)] opacity-80" />
              <div className="mt-4 h-px w-full bg-[var(--border-subtle)]" />
              <div className="mt-6 h-px w-full bg-[var(--border-subtle)]" />
            </div>
            <div className="xl:col-span-4 border-b border-[var(--border-default)] py-4">
              <div className="h-3 w-16 bg-[var(--bg-elevated)] opacity-80" />
              <div className="mt-4 h-px w-full bg-[var(--border-subtle)]" />
              <div className="mt-6 h-px w-full bg-[var(--border-subtle)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
