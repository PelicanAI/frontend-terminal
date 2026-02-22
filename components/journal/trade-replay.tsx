"use client"

import { useMemo } from "react"
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import { PlayCircle, Pause, FastForward, Lightning } from "@phosphor-icons/react"
import type { Trade } from "@/hooks/use-trades"
import { useTradeReplay, type Candle, type PlaybackSpeed } from "@/hooks/use-trade-replay"
import { PelicanCard } from "@/components/ui/pelican"

interface TradeReplayProps {
  trade: Trade
  onNarrate?: (trade: Trade) => void
}

interface ChartCandle {
  index: number
  time: string
  open: number
  close: number
  high: number
  low: number
  body: [number, number]
  isGreen: boolean
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

export function TradeReplay({ trade, onNarrate }: TradeReplayProps) {
  const {
    visibleCandles,
    candles,
    playbackIndex,
    setPlaybackIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    keyMoments,
    isLoading,
    error,
  } = useTradeReplay(trade)

  // Map candles to chart-friendly format
  const chartData: ChartCandle[] = useMemo(() => {
    return visibleCandles.map((c: Candle, i: number) => {
      const isGreen = c.c >= c.o
      return {
        index: i,
        time: formatTime(c.t),
        open: c.o,
        close: c.c,
        high: c.h,
        low: c.l,
        // Bar range: from open to close (body of candle)
        body: isGreen ? [c.o, c.c] : [c.c, c.o],
        isGreen,
      }
    })
  }, [visibleCandles])

  // Price domain
  const { minPrice, maxPrice } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100 }
    let min = Infinity
    let max = -Infinity
    for (const c of visibleCandles) {
      if (c.l < min) min = c.l
      if (c.h > max) max = c.h
    }
    // Include SL/TP in domain
    if (trade.stop_loss && trade.stop_loss < min) min = trade.stop_loss
    if (trade.take_profit && trade.take_profit > max) max = trade.take_profit
    const padding = (max - min) * 0.05
    return { minPrice: min - padding, maxPrice: max + padding }
  }, [visibleCandles, trade.stop_loss, trade.take_profit])

  const speeds: PlaybackSpeed[] = [1, 2, 5]

  // Current candle info
  const currentCandle = visibleCandles[playbackIndex]
  const progressPercent = candles.length > 1
    ? (playbackIndex / (candles.length - 1)) * 100
    : 0

  if (isLoading) {
    return (
      <PelicanCard className="p-6">
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Loading candle data...</p>
          </div>
        </div>
      </PelicanCard>
    )
  }

  if (error) {
    return (
      <PelicanCard className="p-6">
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      </PelicanCard>
    )
  }

  if (candles.length === 0) return null

  // Entry/exit key moments for reference lines
  const entryMoment = keyMoments.find(m => m.type === 'entry')
  const exitMoment = keyMoments.find(m => m.type === 'exit')
  const slMoment = keyMoments.find(m => m.type === 'stop_loss')
  const tpMoment = keyMoments.find(m => m.type === 'take_profit')

  return (
    <PelicanCard className="overflow-hidden">
      {/* Chart Area */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-[var(--text-muted)]">
            Trade Replay — <span className="font-mono tabular-nums">{trade.ticker}</span>
          </div>
          {currentCandle && (
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-[var(--text-muted)]">O <span className="text-[var(--text-primary)]">{formatPrice(currentCandle.o)}</span></span>
              <span className="text-[var(--text-muted)]">H <span className="text-[var(--text-primary)]">{formatPrice(currentCandle.h)}</span></span>
              <span className="text-[var(--text-muted)]">L <span className="text-[var(--text-primary)]">{formatPrice(currentCandle.l)}</span></span>
              <span className="text-[var(--text-muted)]">C <span className={currentCandle.c >= currentCandle.o ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}>{formatPrice(currentCandle.c)}</span></span>
            </div>
          )}
        </div>

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as ChartCandle
                  return (
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-xl text-xs">
                      <div className="text-[var(--text-muted)] mb-1">{d.time}</div>
                      <div className="font-mono tabular-nums space-y-0.5">
                        <div>O: {formatPrice(d.open)}</div>
                        <div>H: {formatPrice(d.high)}</div>
                        <div>L: {formatPrice(d.low)}</div>
                        <div className={d.isGreen ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}>
                          C: {formatPrice(d.close)}
                        </div>
                      </div>
                    </div>
                  )
                }}
              />

              {/* SL/TP horizontal reference lines */}
              {slMoment?.price && (
                <ReferenceLine
                  y={slMoment.price}
                  stroke="var(--data-negative)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: slMoment.label, fill: 'var(--data-negative)', fontSize: 10, position: 'right' }}
                />
              )}
              {tpMoment?.price && (
                <ReferenceLine
                  y={tpMoment.price}
                  stroke="var(--data-positive)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: tpMoment.label, fill: 'var(--data-positive)', fontSize: 10, position: 'right' }}
                />
              )}

              {/* Entry price line */}
              {entryMoment?.price && (
                <ReferenceLine
                  y={entryMoment.price}
                  stroke="var(--accent-primary)"
                  strokeDasharray="6 3"
                  strokeOpacity={0.5}
                  label={{ value: entryMoment.label, fill: 'var(--accent-primary)', fontSize: 10, position: 'left' }}
                />
              )}

              {/* Exit price line */}
              {exitMoment?.price && playbackIndex >= (exitMoment.index ?? 0) && (
                <ReferenceLine
                  y={exitMoment.price}
                  stroke={exitMoment.color}
                  strokeDasharray="6 3"
                  strokeOpacity={0.5}
                  label={{ value: exitMoment.label, fill: exitMoment.color, fontSize: 10, position: 'left' }}
                />
              )}

              {/* Candle bodies as bars */}
              <Bar dataKey="body" barSize={Math.max(2, Math.min(8, 400 / chartData.length))}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isGreen ? 'var(--data-positive)' : 'var(--data-negative)'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={() => {
            if (playbackIndex >= candles.length - 1) {
              setPlaybackIndex(0)
              setIsPlaying(true)
            } else {
              setIsPlaying(!isPlaying)
            }
          }}
          className="p-1.5 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={20} weight="fill" />
          ) : (
            <PlayCircle size={20} weight="fill" />
          )}
        </button>

        {/* Scrubber */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={candles.length - 1}
            value={playbackIndex}
            onChange={(e) => setPlaybackIndex(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--bg-elevated)] accent-[var(--accent-primary)]"
            style={{
              background: `linear-gradient(to right, var(--accent-primary) ${progressPercent}%, var(--bg-elevated) ${progressPercent}%)`,
            }}
          />
          {/* Entry/Exit markers on scrubber */}
          {entryMoment && candles.length > 1 && (
            <div
              className="absolute top-0 w-0.5 h-3 bg-[var(--accent-primary)] rounded-full pointer-events-none"
              style={{ left: `${(entryMoment.index / (candles.length - 1)) * 100}%`, transform: 'translateX(-50%) translateY(-25%)' }}
            />
          )}
          {exitMoment && exitMoment.index >= 0 && candles.length > 1 && (
            <div
              className="absolute top-0 w-0.5 h-3 rounded-full pointer-events-none"
              style={{
                left: `${(exitMoment.index / (candles.length - 1)) * 100}%`,
                transform: 'translateX(-50%) translateY(-25%)',
                backgroundColor: exitMoment.color,
              }}
            />
          )}
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-0.5">
          <FastForward size={14} className="text-[var(--text-muted)] mr-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono tabular-nums transition-colors ${
                speed === s
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timestamp */}
        <div className="text-xs font-mono tabular-nums text-[var(--text-muted)] hidden sm:block">
          {currentCandle ? formatTime(currentCandle.t) : '--'}
        </div>
      </div>

      {/* Narrate Button */}
      {onNarrate && (
        <div className="px-4 pb-3">
          <button
            onClick={() => onNarrate(trade)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent-muted)] text-[var(--accent-primary)] text-sm font-medium hover:bg-[var(--accent-primary)]/20 transition-colors active:scale-[0.98]"
          >
            <Lightning size={16} weight="fill" />
            Narrate with Pelican
          </button>
        </div>
      )}
    </PelicanCard>
  )
}
