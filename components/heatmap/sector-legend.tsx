"use client"

import { motion } from "framer-motion"
import { getSectors, type SP500Sector } from "@/lib/data/sp500-constituents"
import { HeatmapStock } from "@/app/api/heatmap/route"
import { DataCell, staggerContainer, staggerItem } from "@/components/ui/pelican"

interface SectorLegendProps {
  stocks: HeatmapStock[]
  selectedSectors: SP500Sector[]
  onToggleSector: (sector: SP500Sector) => void
  onHighlightSector?: (sector: SP500Sector) => void
  highlightedSector?: string | null
  sectorLabel?: string
  customSectors?: string[]
}

export function SectorLegend({ stocks, selectedSectors, onToggleSector, onHighlightSector, highlightedSector, sectorLabel = 'Sectors', customSectors }: SectorLegendProps) {
  const sectors = customSectors ?? getSectors()

  // Calculate sector performance
  const sectorStats = sectors.map((sector) => {
    const sectorStocks = stocks.filter((s) => s.sector === sector)
    const avgChange =
      sectorStocks.length > 0
        ? sectorStocks.reduce((sum, s) => sum + (s.changePercent ?? 0), 0) / sectorStocks.length
        : 0

    return {
      sector,
      avgChange,
      count: sectorStocks.length,
    }
  })

  // Sort by average change descending
  const sortedSectors = sectorStats.sort((a, b) => b.avgChange - a.avgChange)

  // Calculate max absolute change for bar scaling
  const maxAbsChange = Math.max(...sortedSectors.map(s => Math.abs(s.avgChange)), 1)

  // Item count label
  const countLabel = customSectors ? 'items' : 'stocks'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{sectorLabel}</h3>
        {selectedSectors.length < sectors.length && (
          <button
            onClick={() => {
              // Select all
              sectors.forEach((s) => {
                if (!selectedSectors.includes(s as SP500Sector)) {
                  onToggleSector(s as SP500Sector)
                }
              })
            }}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors duration-150"
          >
            Select All
          </button>
        )}
      </div>

      {/* Clean sector list with performance bars */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-0.5"
      >
        {sortedSectors.map(({ sector, avgChange, count }) => {
          const isSelected = selectedSectors.includes(sector as SP500Sector)
          const isPositive = avgChange >= 0
          const absChange = Math.abs(avgChange)
          const barWidth = (absChange / maxAbsChange) * 100

          return (
            <motion.button
              key={sector}
              variants={staggerItem}
              onClick={() => onToggleSector(sector as SP500Sector)}
              onDoubleClick={(e) => {
                e.preventDefault()
                onHighlightSector?.(sector as SP500Sector)
              }}
              className={`
                w-full group relative overflow-hidden rounded-md
                px-3 py-2.5 text-left transition-all duration-150
                ${isSelected
                  ? 'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]'
                  : 'opacity-40 hover:opacity-60'
                }
                ${highlightedSector === sector ? 'ring-1 ring-[var(--accent-primary)]/50 bg-[var(--accent-muted)]' : ''}
              `}
            >
              {/* Performance bar background */}
              <div
                className="absolute inset-y-0 left-0 opacity-[0.07] transition-all duration-150 group-hover:opacity-[0.12]"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isPositive ? 'var(--data-positive)' : 'var(--data-negative)',
                }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate block capitalize">
                    {sector}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {count} {countLabel}
                  </span>
                </div>

                <DataCell
                  value={avgChange.toFixed(2)}
                  sentiment={isPositive ? 'positive' : 'negative'}
                  prefix={isPositive ? '+' : ''}
                  suffix="%"
                  size="sm"
                  className="font-semibold ml-3"
                />
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
