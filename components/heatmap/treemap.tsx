"use client"

import { useMemo } from "react"
import { treemap, hierarchy } from "d3-hierarchy"
import { HeatmapStock } from "@/app/api/heatmap/route"
import { formatChangePercent } from "@/hooks/use-heatmap"

interface TreemapProps {
  stocks: HeatmapStock[]
  width: number
  height: number
  onStockClick?: (ticker: string, name: string) => void
}

type StockNode = {
  ticker: string
  name: string
  price: number | null
  changePercent: number | null
  marketCap: number
  sector: string
}

function toMarketCapValue(stock: HeatmapStock): number {
  return stock.marketCap ?? (stock.volume ? stock.volume * (stock.price ?? 100) : 1_000_000_000)
}

function getTileColor(change: number): string {
  if (Math.abs(change) <= 0.3) return "oklch(0.22 0.02 280 / 0.4)"
  if (change >= 3) return "oklch(0.50 0.25 145)"
  if (change >= 1) return "oklch(0.65 0.20 145 / 0.8)"
  if (change <= -3) return "oklch(0.55 0.25 25)"
  if (change <= -1) return "oklch(0.65 0.15 25 / 0.8)"
  return "oklch(0.18 0.015 280)"
}

function getLabelSize(tileWidth: number): number {
  return Math.max(9, Math.min(14, tileWidth / 12))
}

export function Treemap({ stocks, width, height, onStockClick }: TreemapProps) {
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
      .paddingOuter(2)
      .paddingInner(1)
      .paddingTop(18)(root as never)
  }, [root, width, height])

  const nodes = layoutRoot.descendants()

  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-surface-1" style={{ width, height }}>
        <p className="text-sm text-foreground/50">No data available</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/[0.05]" style={{ width, height }}>
      {nodes.map((node) => {
        if (node.depth === 1) {
          const sector = String((node.data as { name?: string }).name ?? "")
          return (
            <div
              key={`sector-${sector}`}
              className="pointer-events-none absolute truncate px-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/50"
              style={{ left: node.x0, top: node.y0, width: node.x1 - node.x0 }}
            >
              {sector}
            </div>
          )
        }

        if (node.depth !== 2) return null

        const stock = node.data as StockNode
        const tileWidth = node.x1 - node.x0
        const tileHeight = node.y1 - node.y0
        const labelSize = getLabelSize(tileWidth)
        const change = stock.changePercent ?? 0
        const showPercent = tileWidth > 70 && tileHeight > 44

        return (
          <button
            key={`stock-${stock.ticker}`}
            onClick={() => onStockClick?.(stock.ticker, stock.name)}
            className="absolute cursor-pointer border border-black/20 transition-all duration-200 hover:z-20 hover:scale-[1.02] hover:border-white/30 hover:shadow-2xl"
            style={{
              left: node.x0,
              top: node.y0,
              width: tileWidth,
              height: tileHeight,
              backgroundColor: getTileColor(change),
            }}
            title={`${stock.ticker} ${formatChangePercent(stock.changePercent)}`}
          >
            <div className="flex h-full w-full flex-col items-center justify-center px-1 font-mono text-white">
              <div style={{ fontSize: `${labelSize}px` }} className="font-bold tracking-tight">
                {stock.ticker}
              </div>
              {showPercent && (
                <div className="text-[10px] opacity-85">
                  {formatChangePercent(stock.changePercent)}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
