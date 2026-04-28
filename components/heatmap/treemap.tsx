"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { treemap, hierarchy } from "d3-hierarchy"
import type { HeatmapStock } from "@/app/api/heatmap/route"
import { formatChangePercent } from "@/hooks/use-heatmap"
import { NumberTicker } from "@/components/motion/number-ticker"
import { PriceFlash } from "@/components/motion/price-flash"
import { HeatmapTooltip, type TooltipData } from "./heatmap-tooltip"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface TreemapProps {
  stocks: HeatmapStock[]
  width: number
  height: number
  onStockClick?: (ticker: string, name: string) => void
  highlightedSector?: string | null
  showMyStocks?: boolean
  positionTickers?: Set<string>
  watchlistTickers?: Set<string>
  positionPnl?: Map<string, number>
  earningsToday?: Set<string>
  tickerWinRates?: Map<string, number>
  market?: string
}

type StockNode = {
  ticker: string
  name: string
  price: number | null
  changePercent: number | null
  marketCap: number
  sector: string
  volume: number | null
  originalMarketCap: number | null
}

// ── Sector label abbreviations ───────────────────────────────────────────────

const SECTOR_ABBREVIATIONS: Record<string, string> = {
  'Information Technology': 'INFO TECH',
  'Consumer Discretionary': 'CONS. DISC.',
  'Consumer Staples': 'CONS. STAPLES',
  'Communication Services': 'COMM. SVCS',
  'Health Care': 'HEALTH CARE',
  'Real Estate': 'REAL ESTATE',
}

function getSectorLabel(name: string): string {
  return SECTOR_ABBREVIATIONS[name] ?? name.toUpperCase()
}

// ── Color system (cached CSS vars to avoid layout thrashing) ─────────────────

interface HeatmapColorVars {
  greenMinR: number; greenMinG: number; greenMinB: number
  greenMaxR: number; greenMaxG: number; greenMaxB: number
  redMinR: number; redMinG: number; redMinB: number
  redMaxR: number; redMaxG: number; redMaxB: number
  flatR: number; flatG: number; flatB: number
}

const DARK_DEFAULTS: HeatmapColorVars = {
  greenMinR: 20, greenMinG: 60, greenMinB: 30,
  greenMaxR: 0, greenMaxG: 180, greenMaxB: 50,
  redMinR: 60, redMinG: 30, redMinB: 30,
  redMaxR: 200, redMaxG: 20, redMaxB: 30,
  flatR: 42, flatG: 42, flatB: 58,
}

function readHeatmapVars(): HeatmapColorVars {
  if (typeof window === 'undefined') return DARK_DEFAULTS
  const s = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: number) => Number(s.getPropertyValue(name).trim()) || fallback
  return {
    greenMinR: v('--heatmap-green-min-r', 20), greenMinG: v('--heatmap-green-min-g', 60), greenMinB: v('--heatmap-green-min-b', 30),
    greenMaxR: v('--heatmap-green-max-r', 0), greenMaxG: v('--heatmap-green-max-g', 180), greenMaxB: v('--heatmap-green-max-b', 50),
    redMinR: v('--heatmap-red-min-r', 60), redMinG: v('--heatmap-red-min-g', 30), redMinB: v('--heatmap-red-min-b', 30),
    redMaxR: v('--heatmap-red-max-r', 200), redMaxG: v('--heatmap-red-max-g', 20), redMaxB: v('--heatmap-red-max-b', 30),
    flatR: v('--heatmap-flat-r', 42), flatG: v('--heatmap-flat-g', 42), flatB: v('--heatmap-flat-b', 58),
  }
}

function getTileColor(changePercent: number, vars: HeatmapColorVars): { rgb: string; r: number; g: number; b: number } {
  const clamped = Math.max(-5, Math.min(5, changePercent))

  if (Math.abs(changePercent) < 0.05) {
    const { flatR: r, flatG: g, flatB: b } = vars
    return { rgb: `rgb(${r}, ${g}, ${b})`, r, g, b }
  }

  if (changePercent > 0) {
    const t = Math.min(clamped / 5, 1)
    const r = Math.round(vars.greenMinR + (vars.greenMaxR - vars.greenMinR) * t)
    const g = Math.round(vars.greenMinG + (vars.greenMaxG - vars.greenMinG) * t)
    const b = Math.round(vars.greenMinB + (vars.greenMaxB - vars.greenMinB) * t)
    return { rgb: `rgb(${r}, ${g}, ${b})`, r, g, b }
  }

  const t = Math.min(Math.abs(clamped) / 5, 1)
  const r = Math.round(vars.redMinR + (vars.redMaxR - vars.redMinR) * t)
  const g = Math.round(vars.redMinG + (vars.redMaxG - vars.redMinG) * t)
  const b = Math.round(vars.redMinB + (vars.redMaxB - vars.redMinB) * t)
  return { rgb: `rgb(${r}, ${g}, ${b})`, r, g, b }
}

/** WCAG relative luminance — returns white or dark text for optimal contrast */
function getTextColor(bgR: number, bgG: number, bgB: number): string {
  const luminance = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255
  return luminance > 0.45 ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)'
}

function getTextShadow(bgR: number, bgG: number, bgB: number): string {
  const luminance = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255
  return luminance > 0.45 ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
}

// ── Dynamic font sizing based on cell area ───────────────────────────────────

function getTickerFontSize(w: number, h: number): number {
  const area = w * h
  if (area > 15000) return 14
  if (area > 8000) return 12
  if (area > 4000) return 11
  if (area > 2000) return 10
  if (area > 800) return 9
  return 0 // Too small — hide text
}

function getChangeFontSize(w: number, h: number): number {
  const tickerSize = getTickerFontSize(w, h)
  return tickerSize > 0 ? Math.max(tickerSize - 1, 8) : 0
}

// ── Market cap helper ────────────────────────────────────────────────────────

function toMarketCapValue(stock: HeatmapStock): number {
  return stock.marketCap ?? (stock.volume ? stock.volume * (stock.price ?? 100) : 1_000_000_000)
}

// ── Component ────────────────────────────────────────────────────────────────

export function Treemap({
  stocks,
  width,
  height,
  onStockClick,
  highlightedSector,
  showMyStocks = false,
  positionTickers,
  watchlistTickers,
  positionPnl,
  earningsToday,
  tickerWinRates,
  market,
}: TreemapProps) {

  // Cache CSS color vars once per render cycle (not per tile)
  const colorVarsRef = useRef<HeatmapColorVars>(DARK_DEFAULTS)
  useEffect(() => { colorVarsRef.current = readHeatmapVars() })

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [clickedTicker, setClickedTicker] = useState<string | null>(null)

  // D3 hierarchy
  const root = useMemo(() => {
    const grouped = new Map<string, StockNode[]>()
    for (const stock of stocks) {
      const children = grouped.get(stock.sector) ?? []
      children.push({
        ticker: stock.ticker,
        name: stock.name,
        price: stock.price,
        changePercent: stock.changePercent,
        marketCap: toMarketCapValue(stock),
        sector: stock.sector,
        volume: stock.volume,
        originalMarketCap: stock.marketCap,
      })
      grouped.set(stock.sector, children)
    }

    const data = {
      name: "market",
      children: Array.from(grouped.entries()).map(([sector, children]) => ({
        name: sector,
        children,
      })),
    }

    return hierarchy(data)
      .sum((d) => ("marketCap" in (d as object) ? ((d as unknown as StockNode).marketCap ?? 0) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  }, [stocks])

  const layoutRoot = useMemo(() => {
    return treemap<unknown>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(1)
      .paddingTop(20)(root as never)
  }, [root, width, height])

  const nodes = layoutRoot.descendants()

  const handleCellClick = useCallback((stock: StockNode) => {
    setClickedTicker(stock.ticker)
    setTimeout(() => setClickedTicker(null), 300)
    onStockClick?.(stock.ticker, stock.name)
  }, [onStockClick])

  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" style={{ width, height }}>
        <p className="text-sm text-[var(--text-muted)]">No data available</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-default)]" style={{ width, height }}>
      {nodes.map((node) => {
        // ── Sector group (depth 1): border + label ──────────────────
        if (node.depth === 1) {
          const sector = String((node.data as { name?: string }).name ?? "")
          const sectorW = node.x1 - node.x0
          const labelFontSize = Math.max(10, Math.min(13, sectorW / 15))

          return (
            <div key={`sector-${sector}`}>
              {/* Sector border overlay */}
              <div
                className="absolute pointer-events-none border border-[var(--border-default)] dark:border-white/15 rounded-sm"
                style={{
                  left: node.x0,
                  top: node.y0,
                  width: sectorW,
                  height: node.y1 - node.y0,
                }}
              />
              {/* Sector label */}
              <div
                className="pointer-events-none absolute truncate"
                style={{
                  left: node.x0 + 2,
                  top: node.y0 + 1,
                  width: sectorW - 4,
                  fontSize: `${labelFontSize}px`,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '1px 4px',
                  color: 'var(--text-primary)',
                  opacity: 0.7,
                  backgroundColor: 'color-mix(in oklch, var(--background) 70%, transparent)',
                  borderRadius: '2px',
                  lineHeight: '16px',
                }}
              >
                {getSectorLabel(sector)}
              </div>
            </div>
          )
        }

        if (node.depth !== 2) return null

        // ── Stock tile (depth 2) ──────────────────────────────────────
        const stock = node.data as StockNode
        const tileW = node.x1 - node.x0
        const tileH = node.y1 - node.y0
        const change = stock.changePercent ?? 0
        const tickerSize = getTickerFontSize(tileW, tileH)
        const changeSize = getChangeFontSize(tileW, tileH)
        const { rgb: bgColor, r, g, b } = getTileColor(change, colorVarsRef.current)
        const textColor = getTextColor(r, g, b)
        const textShadow = getTextShadow(r, g, b)

        // Portfolio overlay
        const isMyPosition = positionTickers?.has(stock.ticker)
        const isMyWatchlist = watchlistTickers?.has(stock.ticker)
        const isMyStock = isMyPosition || isMyWatchlist
        const pnl = positionPnl?.get(stock.ticker)
        const hasEarnings = earningsToday?.has(stock.ticker)

        // Sector highlighting
        const isDimmed = (highlightedSector && stock.sector !== highlightedSector) ||
                         (showMyStocks && !isMyStock)

        return (
          <button
            key={`stock-${stock.ticker}`}
            aria-label={`${stock.ticker}: ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}% at ${stock.price != null ? `$${stock.price.toFixed(2)}` : 'unknown price'}. Click to analyze.`}
            onClick={() => handleCellClick(stock)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCellClick(stock)
              }
            }}
            onMouseEnter={() => {
              setTooltipData({
                ticker: stock.ticker,
                companyName: stock.name,
                price: stock.price,
                changePercent: stock.changePercent,
                volume: stock.volume,
                marketCap: stock.originalMarketCap,
                sector: stock.sector,
              })
              setTooltipVisible(true)
            }}
            onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTooltipVisible(false)}
            className={cn(
              "absolute overflow-hidden cursor-pointer transition-all duration-150",
              "hover:z-10 hover:ring-2 hover:ring-[var(--accent-primary)]/50 hover:shadow-lg",
              clickedTicker === stock.ticker && "ring-2 ring-[var(--accent-primary)] scale-[0.98]",
              isDimmed && "opacity-30 hover:opacity-60",
              showMyStocks && isMyPosition && "ring-2 ring-[var(--accent-primary)] z-10",
              showMyStocks && isMyWatchlist && !isMyPosition && "ring-2 ring-[var(--accent-primary)]/40 z-[5]",
            )}
            style={{
              left: node.x0,
              top: node.y0,
              width: tileW,
              height: tileH,
              backgroundColor: bgColor,
              borderWidth: '1px',
              borderColor: 'rgba(0,0,0,0.3)',
              borderStyle: showMyStocks && isMyWatchlist && !isMyPosition ? 'dashed' : 'solid',
            }}
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center px-0.5"
              style={{ color: textColor, textShadow }}
            >
              {tickerSize > 0 && (
                <>
                  <span
                    className="font-semibold leading-tight tracking-tight font-mono"
                    style={{ fontSize: `${tickerSize}px` }}
                  >
                    {stock.ticker}
                  </span>
                  {changeSize > 0 && tileH > 30 && (
                    <span
                      className="font-mono leading-tight tabular-nums"
                      style={{ fontSize: `${changeSize}px`, opacity: 0.85 }}
                    >
                      {stock.changePercent == null ? formatChangePercent(stock.changePercent) : (
                        <PriceFlash value={stock.changePercent} direction={stock.changePercent >= 0 ? "up" : "down"}>
                          <NumberTicker value={stock.changePercent} format={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`} />
                        </PriceFlash>
                      )}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Position P&L badge */}
            {showMyStocks && isMyPosition && pnl != null && tileW > 40 && (
              <div className="absolute top-0.5 right-0.5 bg-black/60 rounded px-1 py-0.5">
                <span className={cn(
                  "text-[8px] font-mono font-bold tabular-nums",
                  pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Historical win rate badge */}
            {showMyStocks && isMyPosition && tickerWinRates?.has(stock.ticker) && tileW > 50 && (
              <div className="absolute bottom-0.5 left-0.5 bg-black/60 rounded px-1 py-0.5">
                <span className={cn(
                  "text-[8px] font-mono font-bold tabular-nums",
                  (tickerWinRates.get(stock.ticker) ?? 0) >= 50 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {tickerWinRates.get(stock.ticker)?.toFixed(0)}% WR
                </span>
              </div>
            )}

            {/* Earnings today badge */}
            {hasEarnings && tileW > 30 && (
              <div className="absolute bottom-0.5 right-0.5" title="Reports earnings today">
                <span className="text-[8px]" role="img" aria-label="Earnings today">📊</span>
              </div>
            )}
          </button>
        )
      })}

      {/* Tooltip (rendered outside cell loop) */}
      <HeatmapTooltip data={tooltipData} position={tooltipPos} visible={tooltipVisible} market={market} />
    </div>
  )
}
