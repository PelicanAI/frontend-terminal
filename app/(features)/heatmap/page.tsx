"use client"

import { useState, useRef, useEffect } from "react"
import { useHeatmap } from "@/hooks/use-heatmap"
import { usePelicanPanel } from "@/hooks/use-pelican-panel"
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

  const { openWithPrompt } = usePelicanPanel()

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
      `Analyze ${ticker} (${name}). Provide:\n1. Recent price action and key levels\n2. Technical setup\n3. Upcoming catalysts\n4. Risk/reward outlook`,
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
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
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
                    : 'bg-white/[0.06] text-foreground/70 border border-border hover:bg-white/[0.08]'
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
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-border hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-foreground/70 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-white/[0.06] border border-border rounded-lg p-1">
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
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Sector Legend */}
        <div className="flex-shrink-0 w-64 border-r border-border p-4 overflow-y-auto">
          <SectorLegend
            stocks={stocks}
            selectedSectors={selectedSectors}
            onToggleSector={handleToggleSector}
          />
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
              {viewMode === 'treemap' && (
                <div className="flex items-center justify-center">
                  <Treemap
                    stocks={filteredStocks}
                    width={dimensions.width}
                    height={dimensions.height}
                    onStockClick={handleStockClick}
                  />
                </div>
              )}

              {viewMode === 'grid' && (
                <HeatmapGrid stocks={filteredStocks} onStockClick={handleStockClick} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
