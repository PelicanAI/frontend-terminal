'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  SecurityCheckIcon as ShieldCheck,
  Alert01Icon as Warning,
  AnalyticsDownIcon as TrendDown,
} from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { RiskInsight } from '@/lib/positions/dashboard-utils'

interface RiskCheckProps {
  insights: RiskInsight[]
}

const severityStyles = {
  critical: {
    border: 'var(--data-negative)',
    icon: 'var(--data-negative)',
    bg: 'rgba(239, 68, 68, 0.06)',
  },
  warning: {
    border: 'var(--data-warning)',
    icon: 'var(--data-warning)',
    bg: 'rgba(245, 158, 11, 0.06)',
  },
  good: {
    border: 'var(--data-positive)',
    icon: 'var(--data-positive)',
    bg: 'rgba(34, 197, 94, 0.06)',
  },
}

function SeverityIcon({ severity, size = 18 }: { severity: RiskInsight['severity']; size?: number }) {
  const color = severityStyles[severity].icon
  if (severity === 'good') return <HugeiconsIcon icon={ShieldCheck} size={size} style={{ color }} strokeWidth={1.5} color="currentColor" />
  if (severity === 'critical') return <HugeiconsIcon icon={TrendDown} size={size} style={{ color }} strokeWidth={2} color="currentColor" />
  return <HugeiconsIcon icon={Warning} size={size} style={{ color }} strokeWidth={1.5} color="currentColor" />
}

export function RiskCheck({ insights }: RiskCheckProps) {
  if (insights.length === 0) return null

  return (
    <PelicanCard>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Risk Check
      </h3>

      <div className="space-y-2">
        {insights.map((insight) => {
          const style = severityStyles[insight.severity]
          return (
            <div
              key={insight.id}
              className="rounded-lg px-3 py-2.5 flex gap-3"
              style={{
                borderLeft: `3px solid ${style.border}`,
                background: style.bg,
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <SeverityIcon severity={insight.severity} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {insight.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {insight.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </PelicanCard>
  )
}
