export default function StrategiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="h-10 w-64 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-2" />
      <div className="h-5 w-96 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-8" />
      <div className="h-12 bg-[var(--bg-surface)] rounded-xl animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-56 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
