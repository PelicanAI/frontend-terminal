"use client"

export const dynamic = "force-dynamic"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { useHeatmap } from "@/hooks/use-heatmap"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { Treemap } from "@/components/heatmap/treemap"
import { HeatmapGrid } from "@/components/heatmap/heatmap-grid"
import { SectorLegend } from "@/components/heatmap/sector-legend"
import { getSectors, type SP500Sector } from "@/lib/data/sp500-constituents"
import { ArrowsClockwise, GridFour, SquaresFour, Lightning } from "@phosphor-icons/react"
import { getMarketStatus } from "@/hooks/use-market-data"
import { PageHeader, DataCell, pageEnter } from "@/components/ui/pelican"

type ViewMode = "treemap" | "grid"

export default function HeatmapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("treemap")
  const [selectedSectors, setSelectedSectors] = useState<SP500Sector[]>(getSectors())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  const { stocks, isLoading, error, lastUpdated, refetch } = useHeatmap({
    autoRefresh,
    refreshInterval: 60000, // 1 minute
  })

  const { openWithPrompt } = usePelicanPanelContext()

  // Calculate container dimensions for treemap
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(width - 32, 600), // Account for padding
          height: Math.max(height - 100, 400), // Account for header
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [viewMode])

  const handleStockClick = (ticker: string, name: string) => {
    openWithPrompt(
      ticker,
      `Analyze this mover: ${ticker} (${name}). Provide momentum drivers, key levels, setup quality, and a tactical trade plan with invalidation.`,
      'heatmap'
    )
  }

  const handleToggleSector = (sector: SP500Sector) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) {
        // Don't allow deselecting all sectors
        if (prev.length === 1) return prev
        return prev.filter((s) => s !== sector)
      } else {
        return [...prev, sector]
      }
    })
  }

  // Filter stocks by selected sectors
  const filteredStocks = stocks.filter((stock) =>
    selectedSectors.includes(stock.sector as SP500Sector)
  )

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  const subtitleParts = [
    `${filteredStocks.length} stocks`,
    `${selectedSectors.length} sectors`,
  ]
  if (lastUpdated) {
    subtitleParts.push(`Updated ${new Date(lastUpdated).toLocaleTimeString()}`)
  }

  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-[var(--border-subtle)]">
        <PageHeader
          title="S&P 500 Heatmap"
          subtitle={subtitleParts.join(' • ')}
          className="mb-3"
          actions={
            <div className="flex items-center gap-2">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium
                  flex items-center gap-1.5 transition-all duration-150
                  ${
                    autoRefresh
                      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]'
                  }
                `}
              >
                <Lightning className="w-3 h-3" weight={autoRefresh ? "fill" : "regular"} />
                Auto-refresh
              </button>

              {/* Manual refresh */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all duration-150 disabled:opacity-50"
              >
                <ArrowsClockwise className={`w-4 h-4 text-[var(--text-secondary)] ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('treemap')}
                  className={`
                    px-3 py-1.5 rounded text-xs font-medium transition-all duration-150
                    ${
                      viewMode === 'treemap'
                        ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <SquaresFour className="w-4 h-4" weight={viewMode === 'treemap' ? "fill" : "regular"} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    px-3 py-1.5 rounded text-xs font-medium transition-all duration-150
                    ${
                      viewMode === 'grid'
                        ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <GridFour className="w-4 h-4" weight={viewMode === 'grid' ? "fill" : "regular"} />
                </button>
              </div>
            </div>
          }
        />

        {/* Market status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isMarketOpen ? 'bg-[var(--data-positive)]' : 'bg-[var(--data-warning)]'
            }`}
          />
          <span className="text-xs text-[var(--text-muted)]">
            Market {isMarketOpen ? 'Open' : marketStatus.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Sidebar - Sector Legend (horizontal scroll on mobile, vertical on desktop) */}
        <div className="flex-shrink-0 sm:w-64 border-b sm:border-b-0 sm:border-r border-[var(--border-subtle)] overflow-y-auto">
          {/* Mobile: horizontal scrolling pills */}
          <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-hide p-3 pb-2">
            {getSectors().map((sector) => {
              const sectorStocks = stocks.filter(s => s.sector === sector)
              const avgChange = sectorStocks.length > 0
                ? sectorStocks.reduce((sum, s) => sum + (s.changePercent ?? 0), 0) / sectorStocks.length
                : 0
              const isSelected = selectedSectors.includes(sector)

              return (
                <button
                  key={sector}
                  onClick={() => handleToggleSector(sector)}
                  className={`
                    px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap
                    flex-shrink-0 border transition-all duration-150
                    ${isSelected
                      ? 'bg-[var(--accent-muted)] border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                    }
                  `}
                >
                  {sector}
                  <span className="ml-1">
                    <DataCell
                      value={avgChange.toFixed(2)}
                      sentiment={avgChange >= 0 ? 'positive' : 'negative'}
                      prefix={avgChange >= 0 ? '+' : ''}
                      suffix="%"
                      size="sm"
                      className="text-[10px]"
                    />
                  </span>
                </button>
              )
            })}
          </div>

          {/* Desktop: existing vertical legend */}
          <div className="hidden sm:block p-4">
            <SectorLegend
              stocks={stocks}
              selectedSectors={selectedSectors}
              onToggleSector={handleToggleSector}
            />
          </div>
        </div>

        {/* Heatmap visualization */}
        <div ref={containerRef} className="flex-1 p-4 overflow-auto">
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-[var(--data-negative)] text-sm mb-2">Failed to load heatmap data</p>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {isLoading && stocks.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ArrowsClockwise className="w-8 h-8 text-[var(--accent-primary)] animate-spin mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-sm">Loading heatmap data...</p>
              </div>
            </div>
          )}

          {!error && !isLoading && filteredStocks.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--text-muted)] text-sm">No stocks to display</p>
            </div>
          )}

          {!error && filteredStocks.length > 0 && (
            <>
              {/* Desktop: Treemap or Grid */}
              {viewMode === 'treemap' && (
                <div className="hidden sm:flex items-center justify-center">
                  <Treemap
                    stocks={filteredStocks}
                    width={dimensions.width}
                    height={dimensions.height}
                    onStockClick={handleStockClick}
                  />
                </div>
              )}

              {viewMode === 'grid' && (
                <div className="hidden sm:block">
                  <HeatmapGrid stocks={filteredStocks} onStockClick={handleStockClick} />
                </div>
              )}

              {/* Mobile: Sorted list view */}
              <div className="sm:hidden space-y-1 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {selectedSectors.length === getSectors().length ? 'All Stocks' : `${selectedSectors.join(', ')}`} — Sorted by Change
                  </h3>
                  <span className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
                    {filteredStocks.length} stocks
                  </span>
                </div>

                {filteredStocks
                  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
                  .map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => handleStockClick(stock.ticker, stock.name)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)] transition-colors duration-150 min-h-[44px] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-[var(--accent-primary)] w-12 text-left tabular-nums">
                          {stock.ticker}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">
                          ${stock.price?.toFixed(2) ?? '—'}
                        </span>
                        <DataCell
                          value={stock.changePercent?.toFixed(2) ?? '0.00'}
                          sentiment={(stock.changePercent ?? 0) >= 0 ? 'positive' : 'negative'}
                          prefix={(stock.changePercent ?? 0) >= 0 ? '+' : ''}
                          suffix="%"
                          size="sm"
                          className="w-16 text-right font-semibold"
                        />
                      </div>
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
