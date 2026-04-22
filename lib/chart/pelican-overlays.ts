/**
 * Pelican intelligence overlay registration.
 *
 * Registers custom overlay types for Pelican AI features:
 * - Price levels from chat analysis
 * - Trade entry/exit markers
 * - Price zone win rates
 *
 * Standard drawing tools (horizontalStraightLine, straightLine,
 * fibonacciLine, rect, parallelStraightLine, priceChannelLine)
 * are built into klinecharts — no registration needed.
 */
import { registerOverlay } from 'klinecharts'
import type { PelicanPriceLevel } from '@/types/chart'

let registered = false

const LEVEL_COLORS: Record<string, string> = {
  support: '#22c55e',
  resistance: '#ef4444',
  target: '#06b6d4',
  stop: '#f97316',
  entry: '#8b5cf6',
  moving_average: '#a0a0b0',
  fibonacci: '#eab308',
  pivot: '#a0a0b0',
  vwap: '#06b6d4',
}

export function registerPelicanOverlays(): void {
  if (registered) return
  registered = true

  // Pelican price level: horizontal line with label, colored by type
  registerOverlay<PelicanPriceLevel>({
    name: 'pelican_price_level',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      const y = coordinates[0]?.y
      if (y === undefined) return []

      const data = overlay.extendData
      const color = data?.color ?? LEVEL_COLORS[data?.type ?? ''] ?? '#8b5cf6'
      const lineStyle = data?.style === 'solid' ? 'solid' : 'dashed'

      const figures = [
        {
          type: 'line',
          attrs: { coordinates: [{ x: 0, y }, { x: bounding.width, y }] },
          styles: { style: lineStyle, color, size: 1, dashedValue: [4, 3] },
        },
      ]

      // Add text label
      if (data?.label) {
        figures.push({
          type: 'text' as 'line',
          attrs: { x: 8, y: y - 4, text: data.label } as unknown as { coordinates: Array<{ x: number; y: number }> },
          styles: { color, size: 10, family: 'var(--font-mono), monospace' } as unknown as { style: string; color: string; size: number; dashedValue: number[] },
        })
      }

      return figures
    },
  })
}
