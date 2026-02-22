"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Trade } from "@/hooks/use-trades"

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface KeyMoment {
  index: number
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit'
  label: string
  price?: number
  color: string
}

export type PlaybackSpeed = 1 | 2 | 5

interface UseTradeReplayReturn {
  visibleCandles: Candle[]
  candles: Candle[]
  playbackIndex: number
  setPlaybackIndex: (index: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  speed: PlaybackSpeed
  setSpeed: (speed: PlaybackSpeed) => void
  keyMoments: KeyMoment[]
  isLoading: boolean
  error: string | null
}

function calculateTimespan(trade: Trade): { timespan: string; multiplier: string } {
  if (!trade.exit_date) {
    return { timespan: 'hour', multiplier: '1' }
  }

  const entryMs = new Date(trade.entry_date).getTime()
  const exitMs = new Date(trade.exit_date).getTime()
  const durationDays = (exitMs - entryMs) / (1000 * 60 * 60 * 24)

  if (durationDays < 1) return { timespan: 'minute', multiplier: '1' }
  if (durationDays <= 5) return { timespan: 'minute', multiplier: '5' }
  if (durationDays <= 30) return { timespan: 'hour', multiplier: '1' }
  return { timespan: 'day', multiplier: '1' }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function findClosestCandleIndex(candles: Candle[], dateStr: string): number {
  const targetMs = new Date(dateStr).getTime()
  let closest = 0
  let minDiff = Infinity

  for (let i = 0; i < candles.length; i++) {
    const diff = Math.abs((candles[i]?.t ?? 0) - targetMs)
    if (diff < minDiff) {
      minDiff = diff
      closest = i
    }
  }

  return closest
}

export function useTradeReplay(trade: Trade | null): UseTradeReplayReturn {
  const [candles, setCandles] = useState<Candle[]>([])
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch candles when trade changes
  useEffect(() => {
    if (!trade) {
      setCandles([])
      setPlaybackIndex(0)
      setIsPlaying(false)
      setError(null)
      return
    }

    let cancelled = false

    async function fetchCandles() {
      if (!trade) return

      setIsLoading(true)
      setError(null)
      setCandles([])
      setPlaybackIndex(0)
      setIsPlaying(false)

      try {
        const { timespan, multiplier } = calculateTimespan(trade)

        // Add padding: 1 day before entry, 1 day after exit
        const from = addDays(trade.entry_date.slice(0, 10), -1)
        const to = addDays(
          (trade.exit_date ?? trade.entry_date).slice(0, 10),
          1
        )

        const params = new URLSearchParams({
          ticker: trade.ticker,
          from,
          to,
          timespan,
          multiplier,
        })

        const res = await fetch(`/api/candles?${params}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch candles (${res.status})`)
        }

        const data = await res.json()
        if (cancelled) return

        if (!data.candles || data.candles.length === 0) {
          setError("No candle data available for this trade period")
          return
        }

        setCandles(data.candles)
        // Start with all candles visible
        setPlaybackIndex(data.candles.length - 1)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load candle data")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchCandles()
    return () => { cancelled = true }
  }, [trade?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Playback timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isPlaying || candles.length === 0) return

    const intervalMs = Math.round(100 / speed)

    intervalRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, speed, candles.length])

  // Visible candles
  const visibleCandles = candles.slice(0, playbackIndex + 1)

  // Key moments
  const keyMoments: KeyMoment[] = []
  if (candles.length > 0 && trade) {
    const entryIndex = findClosestCandleIndex(candles, trade.entry_date)
    keyMoments.push({
      index: entryIndex,
      type: 'entry',
      label: `Entry $${trade.entry_price.toFixed(2)}`,
      price: trade.entry_price,
      color: 'var(--accent-primary)',
    })

    if (trade.exit_date && trade.exit_price) {
      const exitIndex = findClosestCandleIndex(candles, trade.exit_date)
      const exitColor = (trade.pnl_amount ?? 0) >= 0
        ? 'var(--data-positive)'
        : 'var(--data-negative)'
      keyMoments.push({
        index: exitIndex,
        type: 'exit',
        label: `Exit $${trade.exit_price.toFixed(2)}`,
        price: trade.exit_price,
        color: exitColor,
      })
    }

    if (trade.stop_loss) {
      keyMoments.push({
        index: -1, // horizontal line, not index-specific
        type: 'stop_loss',
        label: `SL $${trade.stop_loss.toFixed(2)}`,
        price: trade.stop_loss,
        color: 'var(--data-negative)',
      })
    }

    if (trade.take_profit) {
      keyMoments.push({
        index: -1,
        type: 'take_profit',
        label: `TP $${trade.take_profit.toFixed(2)}`,
        price: trade.take_profit,
        color: 'var(--data-positive)',
      })
    }
  }

  const handleSetPlaybackIndex = useCallback((index: number) => {
    setPlaybackIndex(Math.max(0, Math.min(index, candles.length - 1)))
  }, [candles.length])

  return {
    visibleCandles,
    candles,
    playbackIndex,
    setPlaybackIndex: handleSetPlaybackIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    keyMoments,
    isLoading,
    error,
  }
}
