"use client"

interface DataFreshnessProps {
  calculatedAt: string | null
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays}d ago`
}

export function DataFreshness({ calculatedAt }: DataFreshnessProps) {
  if (!calculatedAt) {
    return (
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Calculating...
      </span>
    )
  }

  const date = new Date(calculatedAt)
  const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60)
  const isStale = diffHours > 24
  const relativeTime = formatRelativeTime(date)

  return (
    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
      Updated {relativeTime}
      {isStale && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 ml-1.5">
          Data may be stale
        </span>
      )}
    </span>
  )
}
