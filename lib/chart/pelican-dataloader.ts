/**
 * KLineChart DataLoader that routes through our server-side Polygon API proxy.
 * Keeps POLYGON_API_KEY on the server.
 */
import type { DataLoader, DataLoaderGetBarsParams } from 'klinecharts'
import { periodToApiParams, toPolygonTicker, getDateRange, polygonBarToKLineData } from './polygon-adapter'
import { logger } from '@/lib/logger'

/** Maximum consecutive empty responses before stopping backward loading */
const MAX_EMPTY_BACKWARD = 2

export interface DataLoaderFetchError {
  status?: number
  message: string
  hint?: string
}

export interface DataLoaderCallbacks {
  onFetchStart?: () => void
  onFetchSuccess?: (barCount: number) => void
  onFetchError?: (error: DataLoaderFetchError) => void
}

export function createPelicanDataLoader(callbacks?: DataLoaderCallbacks): DataLoader {
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

      // For init we let the server pick a sensible, timespan-aware window.
      // For backward pagination we send an explicit { from, to } anchored at
      // the timestamp of the oldest bar already loaded.
      const searchParams = new URLSearchParams({
        ticker,
        timespan: apiParams.timespan,
        multiplier: apiParams.multiplier,
      })

      if (type === 'backward' && timestamp) {
        if (emptyBackwardCount >= MAX_EMPTY_BACKWARD) {
          callback([], false)
          return
        }
        const range = getDateRange(apiParams.daysBack, timestamp)
        searchParams.set('from', range.from)
        searchParams.set('to', range.to)
      } else {
        emptyBackwardCount = 0
      }

      // Only signal "loading" for the user-visible init load, not silent
      // backward pagination — that would flicker the spinner on every scroll.
      if (type === 'init') callbacks?.onFetchStart?.()

      try {
        const res = await fetch(`/api/candles?${searchParams}`)
        if (!res.ok) {
          let errBody: { error?: string; hint?: string } | null = null
          try {
            errBody = (await res.json()) as { error?: string; hint?: string }
          } catch {
            errBody = null
          }
          logger.error('DataLoader fetch failed', undefined, { status: res.status, ticker })
          if (type === 'init') {
            callbacks?.onFetchError?.({
              status: res.status,
              message: errBody?.error ?? `Request failed (${res.status})`,
              hint: errBody?.hint,
            })
          }
          callback([], false)
          return
        }

        const data = await res.json()
        const bars = ((data.candles ?? []) as Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>)
          .map(polygonBarToKLineData)

        if (bars.length === 0) {
          if (type === 'backward') emptyBackwardCount++
          if (type === 'init') callbacks?.onFetchSuccess?.(0)
          callback([], false)
          return
        }

        // Reset counter on successful backward load
        if (type === 'backward') emptyBackwardCount = 0

        if (type === 'init') callbacks?.onFetchSuccess?.(bars.length)

        // Signal whether more data is available
        const more = type === 'init'
          ? { backward: true, forward: false }
          : type === 'backward'
            ? bars.length > 0
            : false

        callback(bars, more)
      } catch (err) {
        logger.error('DataLoader error', err instanceof Error ? err : undefined, { ticker })
        if (type === 'init') {
          callbacks?.onFetchError?.({
            message: err instanceof Error ? err.message : 'Network error',
          })
        }
        callback([], false)
      }
    },
    // subscribeBar / unsubscribeBar intentionally omitted.
    // Polygon free tier has no websocket. Can add polling later.
  }
}
