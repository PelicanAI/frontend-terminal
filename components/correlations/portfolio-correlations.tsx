"use client"

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Warning, ShieldCheck, Link as LinkIcon, Eye, ArrowRight, Briefcase } from '@phosphor-icons/react'
import { useTrades } from '@/hooks/use-trades'
import { getCorrelationProxy, getProxyLabel, groupByProxy } from '@/lib/correlations/portfolio-proxy'
import type { CorrelationPair, CorrelationAsset } from '@/types/correlations'

// --- Color utilities (shared with main matrix) ---

function correlationColor(value: number): string {
  if (Math.abs(value) < 0.05) return 'hsl(230, 8%, 25%)'
  if (value > 0) {
    const sat = Math.min(value * 80, 80)
    const light = 35 + (1 - value) * 15
    return `hsl(142, ${sat}%, ${light}%)`
  }
  const absVal = Math.abs(value)
  const sat = Math.min(absVal * 80, 80)
  const light = 35 + (1 - absVal) * 15
  return `hsl(0, ${sat}%, ${light}%)`
}

function cellTextColor(value: number): string {
  return Math.abs(value) > 0.6 ? 'white' : 'var(--text-primary)'
}

function riskColor(level: 'low' | 'moderate' | 'high'): string {
  return level === 'low' ? 'var(--data-positive)'
    : level === 'moderate' ? 'var(--data-warning)'
    : 'var(--data-negative)'
}

// --- Types ---

interface PortfolioCorrelationsProps {
  correlations: CorrelationPair[]
  assets: CorrelationAsset[]
  period: '30d' | '90d' | '1y'
  beginnerMode: boolean
  onSelectPair: (assetA: string, assetB: string) => void
}

interface PortfolioPosition {
  ticker: string
  proxy: string
  isDirectAsset: boolean // ticker IS a matrix asset
}

// --- Animation presets ---

const entranceInitial = { opacity: 0, y: 8 }
const entranceAnimate = { opacity: 1, y: 0 }
const entranceTransition = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }

// --- Component ---

export function PortfolioCorrelations({
  correlations, assets, beginnerMode, onSelectPair,
}: PortfolioCorrelationsProps) {
  const { openTrades, isLoading } = useTrades({ status: 'open' })

  // Build correlation lookup
  const corrMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const pair of correlations) {
      map.set(`${pair.asset_a}-${pair.asset_b}`, pair.correlation)
      map.set(`${pair.asset_b}-${pair.asset_a}`, pair.correlation)
    }
    return map
  }, [correlations])

  const getCorr = (a: string, b: string): number | undefined => corrMap.get(`${a}-${b}`)

  // Map tickers to positions
  const assetTickers = useMemo(() => new Set(assets.map(a => a.ticker)), [assets])

  const positions: PortfolioPosition[] = useMemo(() => {
    const tickers = [...new Set(openTrades.map(t => t.ticker.toUpperCase()))]
    return tickers.map(ticker => ({
      ticker,
      proxy: assetTickers.has(ticker) ? ticker : getCorrelationProxy(ticker),
      isDirectAsset: assetTickers.has(ticker),
    }))
  }, [openTrades, assetTickers])

  // Unique proxies for the mini matrix
  const uniqueProxies = useMemo(() => [...new Set(positions.map(p => p.proxy))], [positions])

  // Group tickers by proxy for concentration detection
  const proxyGroups = useMemo(
    () => groupByProxy(positions.map(p => p.ticker)),
    [positions],
  )

  // --- Risk calculations ---
  const riskMetrics = useMemo(() => {
    if (uniqueProxies.length < 2) return null

    // All cross-correlations between unique proxies
    const crossCorrs: { a: string; b: string; value: number }[] = []
    for (let i = 0; i < uniqueProxies.length; i++) {
      for (let j = i + 1; j < uniqueProxies.length; j++) {
        const val = getCorr(uniqueProxies[i]!, uniqueProxies[j]!)
        if (val !== undefined) {
          crossCorrs.push({ a: uniqueProxies[i]!, b: uniqueProxies[j]!, value: val })
        }
      }
    }

    if (crossCorrs.length === 0) return null

    const avgCorr = crossCorrs.reduce((s, c) => s + Math.abs(c.value), 0) / crossCorrs.length
    const concentrationLevel: 'low' | 'moderate' | 'high' =
      avgCorr < 0.3 ? 'low' : avgCorr < 0.6 ? 'moderate' : 'high'

    // Highest correlated pair
    const highest = [...crossCorrs].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0]!

    // Best diversifier: lowest avg correlation to everything else
    const avgByProxy = uniqueProxies.map(proxy => {
      const related = crossCorrs.filter(c => c.a === proxy || c.b === proxy)
      const avg = related.length > 0
        ? related.reduce((s, c) => s + Math.abs(c.value), 0) / related.length
        : 0
      return { proxy, avg }
    })
    const bestDiv = [...avgByProxy].sort((a, b) => a.avg - b.avg)[0]!

    // Concentration: 3+ tickers mapped to same proxy
    const concentrated = Object.entries(proxyGroups).filter(([, tickers]) => tickers.length >= 3)

    return { avgCorr, concentrationLevel, highest, bestDiv, concentrated, crossCorrs }
  }, [uniqueProxies, proxyGroups, getCorr])

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pelican-card h-24 animate-pulse"
              style={{ background: 'var(--bg-surface)' }} />
          ))}
        </div>
        <div className="pelican-card h-48 animate-pulse" style={{ background: 'var(--bg-surface)' }} />
      </div>
    )
  }

  // --- Empty state ---
  if (positions.length === 0) {
    return (
      <motion.div initial={entranceInitial} animate={entranceAnimate} transition={entranceTransition} className="pelican-card p-8 text-center">
        <Briefcase weight="light" className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Open Positions
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Log your first trade in the Journal to see how your positions correlate with each other and the broader market.
        </p>
        <a href="/journal"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: 'var(--accent-indigo)', color: 'white' }}>
          Go to Journal <ArrowRight weight="bold" className="w-4 h-4" />
        </a>
      </motion.div>
    )
  }

  // --- Single position state ---
  if (positions.length === 1) {
    const pos = positions[0]!
    const benchmarks = ['SPX', 'NDX', 'VIX', 'GOLD', 'BTC'].filter(b => b !== pos.proxy)
    return (
      <motion.div initial={entranceInitial} animate={entranceAnimate} transition={entranceTransition} className="space-y-4">
        <div className="pelican-card p-5">
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Correlations require at least 2 open positions. Here is how{' '}
            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {pos.ticker}
            </span>
            {!pos.isDirectAsset && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {' '}(via {pos.proxy})
              </span>
            )}
            {' '}correlates with key benchmarks:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {benchmarks.slice(0, 4).map(bm => {
              const val = getCorr(pos.proxy, bm)
              return (
                <button key={bm} onClick={() => val !== undefined && onSelectPair(pos.proxy, bm)}
                  className="rounded-lg p-3 text-center transition-all hover:brightness-110"
                  style={{ background: val !== undefined ? correlationColor(val) : 'var(--bg-elevated)' }}>
                  <div className="text-[10px] font-mono mb-1"
                    style={{ color: val !== undefined ? cellTextColor(val) : 'var(--text-muted)' }}>
                    {bm}
                  </div>
                  <div className="text-sm font-mono font-semibold tabular-nums"
                    style={{ color: val !== undefined ? cellTextColor(val) : 'var(--text-muted)' }}>
                    {val !== undefined ? val.toFixed(2) : '--'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    )
  }

  // --- Normal state (2+ positions) ---
  return (
    <motion.div initial={entranceInitial} animate={entranceAnimate} transition={entranceTransition} className="space-y-4">
      {/* Risk Summary Cards */}
      {riskMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <RiskCard
            icon={<LinkIcon weight="bold" className="w-4 h-4" />}
            label="Avg Correlation"
            value={riskMetrics.avgCorr.toFixed(2)}
            sublabel={riskMetrics.concentrationLevel.toUpperCase()}
            color={riskColor(riskMetrics.concentrationLevel)}
            beginner={beginnerMode ? 'How similar your positions move together' : undefined}
          />
          <RiskCard
            icon={<Warning weight="bold" className="w-4 h-4" />}
            label="Most Correlated"
            value={Math.abs(riskMetrics.highest.value).toFixed(2)}
            sublabel={`${riskMetrics.highest.a} / ${riskMetrics.highest.b}`}
            color={Math.abs(riskMetrics.highest.value) > 0.7 ? 'var(--data-negative)' : 'var(--data-warning)'}
            beginner={beginnerMode ? 'Your two most similar positions' : undefined}
          />
          <RiskCard
            icon={<ShieldCheck weight="bold" className="w-4 h-4" />}
            label="Best Diversifier"
            value={riskMetrics.bestDiv.avg.toFixed(2)}
            sublabel={`${riskMetrics.bestDiv.proxy} (${getProxyLabel(riskMetrics.bestDiv.proxy)})`}
            color="var(--data-positive)"
            beginner={beginnerMode ? 'The position least like the rest' : undefined}
          />
          <RiskCard
            icon={<Eye weight="bold" className="w-4 h-4" />}
            label="Hidden Exposure"
            value={riskMetrics.concentrated.length > 0 ? `${riskMetrics.concentrated.length}` : 'None'}
            sublabel={riskMetrics.concentrated.length > 0
              ? riskMetrics.concentrated.map(([proxy]) => getProxyLabel(proxy!)).join(', ')
              : 'Well diversified'}
            color={riskMetrics.concentrated.length > 0 ? 'var(--data-warning)' : 'var(--data-positive)'}
            beginner={beginnerMode ? 'Sectors where you hold 3+ similar stocks' : undefined}
          />
        </div>
      )}

      {/* Mini Correlation Matrix */}
      <div className="pelican-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Position Correlation Matrix
        </h3>
        <div
          className="inline-grid gap-[2px] min-w-max"
          style={{ gridTemplateColumns: `120px repeat(${positions.length}, minmax(60px, 1fr))` }}
        >
          {/* Top-left empty cell */}
          <div />

          {/* Column headers */}
          {positions.map(pos => (
            <div key={`col-${pos.ticker}`} className="flex flex-col items-center justify-end pb-1 px-1">
              <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                {pos.ticker}
              </span>
              {!pos.isDirectAsset && (
                <span className="text-[9px]" style={{ color: 'var(--text-disabled)' }}>
                  via {pos.proxy}
                </span>
              )}
            </div>
          ))}

          {/* Rows */}
          {positions.map((rowPos, rowIdx) => (
            <React.Fragment key={`row-${rowPos.ticker}`}>
              {/* Row header */}
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="text-xs font-mono font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                  {rowPos.ticker}
                </span>
                {!rowPos.isDirectAsset && (
                  <span className="text-[9px] shrink-0" style={{ color: 'var(--text-disabled)' }}>
                    ({getProxyLabel(rowPos.proxy)})
                  </span>
                )}
              </div>

              {/* Cells */}
              {positions.map((colPos, colIdx) => {
                // Diagonal
                if (rowIdx === colIdx) {
                  return (
                    <div key={`cell-${rowIdx}-${colIdx}`}
                      className="flex items-center justify-center rounded"
                      style={{ aspectRatio: '1', background: 'var(--bg-elevated)' }}>
                      <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                        1.00
                      </span>
                    </div>
                  )
                }

                // Same proxy = perfectly correlated (via proxy)
                const sameProxy = rowPos.proxy === colPos.proxy
                const val = sameProxy ? 1.0 : getCorr(rowPos.proxy, colPos.proxy)
                const bgColor = val !== undefined ? correlationColor(val) : 'var(--bg-surface)'
                const txtColor = val !== undefined ? cellTextColor(val) : 'var(--text-muted)'

                return (
                  <button key={`cell-${rowIdx}-${colIdx}`}
                    className="flex flex-col items-center justify-center rounded text-[10px] font-mono tabular-nums transition-all hover:brightness-110"
                    style={{
                      aspectRatio: '1',
                      background: bgColor,
                      color: txtColor,
                      border: '1px solid var(--border-subtle)',
                    }}
                    onClick={() => {
                      if (!sameProxy && val !== undefined) {
                        onSelectPair(rowPos.proxy, colPos.proxy)
                      }
                    }}
                    title={sameProxy
                      ? `Same sector proxy (${rowPos.proxy})`
                      : val !== undefined ? `${rowPos.proxy} / ${colPos.proxy}: ${val.toFixed(3)}` : 'No data'}
                  >
                    {val !== undefined ? (
                      beginnerMode
                        ? (val > 0.7 ? 'Strong' : val > 0.3 ? 'Mod' : val > -0.3 ? 'Weak' : 'Inv.')
                        : val.toFixed(2)
                    ) : '--'}
                    {sameProxy && rowIdx > colIdx && (
                      <span className="text-[8px]" style={{ color: txtColor, opacity: 0.7 }}>
                        same sector
                      </span>
                    )}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// --- Risk Card sub-component ---

function RiskCard({ icon, label, value, sublabel, color, beginner }: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  color: string
  beginner?: string
}) {
  return (
    <div className="pelican-card p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="font-mono font-bold text-lg tabular-nums mb-0.5" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
        {sublabel}
      </div>
      {beginner && (
        <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {beginner}
        </div>
      )}
    </div>
  )
}
