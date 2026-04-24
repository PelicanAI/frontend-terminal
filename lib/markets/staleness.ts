export type StalenessLevel = "fresh" | "aging" | "stale" | "critical"

interface Staleness {
  level: StalenessLevel
  ageDays: number
  ageLabel: string
}

function formatAgeLabel(diffMs: number): string {
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export function getStaleness(lastUpdated: Date | string): Staleness {
  const updatedAt = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated)
  const diffMs = Math.max(0, Date.now() - updatedAt.getTime())
  const ageDays = diffMs / (1000 * 60 * 60 * 24)

  let level: StalenessLevel = "fresh"
  if (ageDays > 30) level = "critical"
  else if (ageDays > 7) level = "stale"
  else if (ageDays >= 1) level = "aging"

  return {
    level,
    ageDays,
    ageLabel: formatAgeLabel(diffMs),
  }
}
