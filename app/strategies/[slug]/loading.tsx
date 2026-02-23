export default function StrategyDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="h-6 w-32 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-6" />
      <div className="h-10 w-96 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-2" />
      <div className="h-5 w-full bg-[var(--bg-surface)] rounded-lg animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse" />
    </div>
  )
}
