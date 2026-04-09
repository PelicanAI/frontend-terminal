'use client'

import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSquare01Icon as SquaresFour, ArrowRight01Icon as ArrowRight } from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'

interface SectorData {
  name: string
  changePercent: number | null
}

interface SectorMiniHeatmapProps {
  sectors: SectorData[]
  onSectorClick: (sectorName: string) => void
}

const abbreviations: Record<string, string> = {
  Technology: 'Tech',
  Financials: 'Fin',
  Healthcare: 'Health',
  Energy: 'Energy',
  'Consumer Discretionary': 'Disc',
  'Consumer Staples': 'Staples',
  Industrials: 'Indust',
  Materials: 'Matls',
  'Real Estate': 'RE',
  Utilities: 'Utils',
  'Communication Services': 'Comms',
}

function abbreviate(name: string): string {
  return abbreviations[name] ?? name.slice(0, 5)
}

function sectorColor(change: number | null): string {
  if (change == null) return 'hsl(0, 0%, 18%)'
  if (change >= 2) return 'hsl(142, 70%, 30%)'
  if (change >= 1) return 'hsl(142, 60%, 25%)'
  if (change >= 0) return 'hsl(142, 40%, 20%)'
  if (change >= -1) return 'hsl(0, 40%, 20%)'
  if (change >= -2) return 'hsl(0, 60%, 25%)'
  return 'hsl(0, 70%, 30%)'
}

export function SectorMiniHeatmap({ sectors, onSectorClick }: SectorMiniHeatmapProps) {
  const sorted = [...sectors].sort(
    (a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)
  )

  return (
    <PelicanCard noPadding>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={SquaresFour} className="text-[var(--accent-primary)]" size={18} strokeWidth={2} color="currentColor" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sector Rotation
          </h3>
        </div>
        <Link
          href="/markets"
          className="flex items-center gap-1 text-xs transition-colors hover:text-[var(--accent-hover)]"
          style={{ color: 'var(--text-muted)' }}
        >
          Full Heatmap
          <HugeiconsIcon icon={ArrowRight} size={12} strokeWidth={2} color="currentColor" />
        </Link>
      </div>

      <div className="px-4 pb-4">
        {sorted.length === 0 ? (
          <div
            className="flex items-center justify-center rounded-lg py-6 text-xs"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            No sector data available
          </div>
        ) : (
          <div className="grid grid-cols-4 lg:grid-cols-6 gap-1.5">
            {sorted.map((sector) => (
              <button
                key={sector.name}
                onClick={() => onSectorClick(sector.name)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-1 py-2',
                  'text-center transition-all duration-150',
                  'hover:brightness-125 hover:scale-[1.03] active:scale-[0.97]',
                  'cursor-pointer border border-transparent hover:border-[var(--border-hover)]'
                )}
                style={{ backgroundColor: sectorColor(sector.changePercent) }}
              >
                <span className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {abbreviate(sector.name)}
                </span>
                <span className="font-mono tabular-nums text-xs font-semibold leading-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {sector.changePercent != null
                    ? `${sector.changePercent >= 0 ? '+' : ''}${sector.changePercent.toFixed(1)}%`
                    : '—'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </PelicanCard>
  )
}
