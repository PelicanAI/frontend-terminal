/**
 * Polygon API adapter for klinecharts.
 * Pure functions bridging klinecharts types to our /api/candles params.
 */
import type { Period, KLineData } from 'klinecharts'
import type { TimeframeApiParams } from '@/types/chart'
import { normalizeTicker } from '@/lib/ticker-normalizer'

/* ── Period → API params ── */

const PERIOD_MAP: Record<string, TimeframeApiParams> = {
  'minute_1':  { multiplier: '1',  timespan: 'minute', daysBack: 1 },
  'minute_5':  { multiplier: '5',  timespan: 'minute', daysBack: 3 },
  'minute_15': { multiplier: '15', timespan: 'minute', daysBack: 7 },
  'minute_30': { multiplier: '30', timespan: 'minute', daysBack: 14 },
  'hour_1':    { multiplier: '1',  timespan: 'hour',   daysBack: 30 },
  'hour_4':    { multiplier: '4',  timespan: 'hour',   daysBack: 90 },
  'day_1':     { multiplier: '1',  timespan: 'day',    daysBack: 365 },
  'week_1':    { multiplier: '1',  timespan: 'week',   daysBack: 730 },
}

export function periodToApiParams(period: Period): TimeframeApiParams {
  const key = `${period.type}_${period.span}`
  return PERIOD_MAP[key] ?? { multiplier: String(period.span), timespan: period.type as TimeframeApiParams['timespan'], daysBack: 365 }
}

/* ── Ticker → Polygon format ── */

export function toPolygonTicker(ticker: string): string {
  const t = ticker.trim().toUpperCase()
  // Already prefixed
  if (t.startsWith('X:') || t.startsWith('C:')) return t

  const normalized = normalizeTicker(t)
  if (!normalized) return t

  switch (normalized.assetType) {
    case 'crypto':
      // Ensure it has USD suffix for Polygon
      return `X:${normalized.canonical.endsWith('USD') || normalized.canonical.endsWith('USDT') ? normalized.canonical : normalized.canonical + 'USD'}`
    case 'forex':
      return `C:${normalized.canonical}`
    default:
      return normalized.canonical
  }
}

/* ── Date helpers ── */

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getDateRange(daysBack: number, endTimestamp?: number): { from: string; to: string } {
  const to = endTimestamp ? new Date(endTimestamp) : new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - daysBack)
  return { from: formatDate(from), to: formatDate(to) }
}

/* ── Polygon bar → KLineData ── */

export function polygonBarToKLineData(bar: { t: number; o: number; h: number; l: number; c: number; v: number }): KLineData {
  return {
    timestamp: bar.t, // Polygon returns ms, klinecharts expects ms
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }
}
