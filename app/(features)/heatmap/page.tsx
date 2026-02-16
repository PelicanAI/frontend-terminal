"use client"

export const dynamic = "force-dynamic"

import { useState, useRef, useEffect } from "react"
import { useHeatmap } from "@/hooks/use-heatmap"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { Treemap } from "@/components/heatmap/treemap"
import { HeatmapGrid } from "@/components/heatmap/heatmap-grid"
import { SectorLegend } from "@/components/heatmap/sector-legend"
import { getSectors, type SP500Sector } from "@/lib/data/sp500-constituents"
import { LayoutGrid, Grid3x3, RefreshCw, Sparkles } from "lucide-react"
import { getMarketStatus } from "@/hooks/use-market-data"

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">S&P 500 Heatmap</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredStocks.length} stocks • {selectedSectors.length} sectors
              {lastUpdated && (
                <span className="ml-2">
                  • Updated {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                flex items-center gap-1.5 transition-colors
                ${
                  autoRefresh
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.06] text-foreground/70 border border-white/[0.06] hover:bg-white/[0.08]'
                }
              `}
            >
              <Sparkles className="w-3 h-3" />
              Auto-refresh
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-foreground/70 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.06] rounded-lg p-1">
              <button
                onClick={() => setViewMode('treemap')}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    viewMode === 'treemap'
                      ? 'bg-purple-600 text-white'
                      : 'text-foreground/70 hover:text-foreground'
                  }
                `}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    viewMode === 'grid'
                      ? 'bg-purple-600 text-white'
                      : 'text-foreground/70 hover:text-foreground'
                  }
                `}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Market status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isMarketOpen ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-xs text-foreground/60">
            Market {isMarketOpen ? 'Open' : marketStatus.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Sidebar - Sector Legend (horizontal scroll on mobile, vertical on desktop) */}
        <div className="flex-shrink-0 sm:w-64 border-b sm:border-b-0 sm:border-r border-white/[0.04] overflow-y-auto">
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
                    flex-shrink-0 border transition-colors
                    ${isSelected
                      ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                      : 'bg-white/[0.02] border-white/[0.04] text-foreground/50'
                    }
                  `}
                >
                  {sector}
                  <span className={`ml-1 font-mono ${avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
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
                <p className="text-red-400 text-sm mb-2">Failed to load heatmap data</p>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {isLoading && stocks.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-foreground/50 text-sm">Loading heatmap data...</p>
              </div>
            </div>
          )}

          {!error && !isLoading && filteredStocks.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-foreground/50 text-sm">No stocks to display</p>
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
                  <h3 className="text-xs font-semibold text-foreground/50 uppercase">
                    {selectedSectors.length === getSectors().length ? 'All Stocks' : `${selectedSectors.join(', ')}`} — Sorted by Change
                  </h3>
                  <span className="text-[10px] text-foreground/30">
                    {filteredStocks.length} stocks
                  </span>
                </div>

                {filteredStocks
                  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
                  .map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => handleStockClick(stock.ticker, stock.name)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors min-h-[44px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-purple-400 w-12 text-left">
                          {stock.ticker}
                        </span>
                        <span className="text-[10px] text-foreground/40 truncate">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[10px] font-mono text-foreground/50">
                          ${stock.price?.toFixed(2) ?? '—'}
                        </span>
                        <span className={`text-xs font-mono font-semibold w-16 text-right ${
                          (stock.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(stock.changePercent ?? 0) >= 0 ? '+' : ''}
                          {stock.changePercent?.toFixed(2) ?? '0.00'}%
                        </span>
                      </div>
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
