/**
 * KLineChart DataLoader that routes through our server-side Polygon API proxy.
 * Keeps POLYGON_API_KEY on the server.
 */
import type { DataLoader, DataLoaderGetBarsParams } from 'klinecharts'
import { periodToApiParams, toPolygonTicker, getDateRange, polygonBarToKLineData } from './polygon-adapter'
import { logger } from '@/lib/logger'

/** Maximum consecutive empty responses before stopping backward loading */
const MAX_EMPTY_BACKWARD = 2

export function createPelicanDataLoader(): DataLoader {
  let emptyBackwardCount = 0

  return {
    getBars: async (params: DataLoaderGetBarsParams) => {
      const { type, timestamp, symbol, period, callback } = params

      // Skip update type (no real-time feed yet)
      if (type === 'update') {
        callback([], false)
        return
      }

      const apiParams = periodToApiParams(period)
      const ticker = toPolygonTicker(symbol.ticker)

      let from: string
      let to: string

      if (type === 'backward' && timestamp) {
        // Guard against infinite backward loading
        if (emptyBackwardCount >= MAX_EMPTY_BACKWARD) {
          callback([], false)
          return
        }
        const range = getDateRange(apiParams.daysBack, timestamp)
        from = range.from
        to = range.to
      } else {
        // init or forward: load from present
        emptyBackwardCount = 0
        const range = getDateRange(apiParams.daysBack)
        from = range.from
        to = range.to
      }

      try {
        const searchParams = new URLSearchParams({
          ticker,
          from,
          to,
          timespan: apiParams.timespan,
          multiplier: apiParams.multiplier,
        })

        const res = await fetch(`/api/candles?${searchParams}`)
        if (!res.ok) {
          logger.error('DataLoader fetch failed', undefined, { status: res.status, ticker })
          callback([], false)
          return
        }

        const data = await res.json()
        const bars = ((data.candles ?? []) as Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>)
          .map(polygonBarToKLineData)

        if (bars.length === 0) {
          if (type === 'backward') emptyBackwardCount++
          callback([], false)
          return
        }

        // Reset counter on successful backward load
        if (type === 'backward') emptyBackwardCount = 0

        // Signal whether more data is available
        const more = type === 'init'
          ? { backward: true, forward: false }
          : type === 'backward'
            ? bars.length > 0
            : false

        callback(bars, more)
      } catch (err) {
        logger.error('DataLoader error', err instanceof Error ? err : undefined, { ticker })
        callback([], false)
      }
    },
    // subscribeBar / unsubscribeBar intentionally omitted.
    // Polygon free tier has no websocket. Can add polling later.
  }
}
