"use client"

import { useState } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { usePelicanPanel } from "@/hooks/use-pelican-panel"
import { PelicanChatPanel } from "@/components/pelican-panel/pelican-chat-panel"
import { TrendingUp, TrendingDown, Sparkles, RefreshCw, DollarSign, Percent } from "lucide-react"
import { getMarketStatus } from "@/hooks/use-market-data"

export default function MorningPage() {
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)
  const { openTrades, isLoading: tradesLoading } = useTrades({ status: 'open' })
  const { movers, isLoading: moversLoading, refetch } = useMorningBrief()
  const { state: pelicanState, openWithPrompt } = usePelicanPanel()

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true)

    // Build context for AI brief
    const context = {
      positions: openTrades.map((t) => ({
        ticker: t.ticker,
        direction: t.direction,
        entry: t.entry_price,
        quantity: t.quantity,
      })),
      gainers: movers.gainers.slice(0, 5),
      losers: movers.losers.slice(0, 5),
      marketStatus,
    }

    const prompt = `Generate my morning trading brief for ${new Date().toLocaleDateString()}:

**My Open Positions** (${openTrades.length} trades):
${openTrades.map((t) => `- ${t.ticker} ${t.direction.toUpperCase()} @ $${t.entry_price} (${t.quantity} shares)`).join('\n') || 'No open positions'}

**Top Gainers**:
${movers.gainers.slice(0, 5).map((m) => `- ${m.ticker}: +${m.changePercent.toFixed(2)}% @ $${m.price.toFixed(2)}`).join('\n')}

**Top Losers**:
${movers.losers.slice(0, 5).map((m) => `- ${m.ticker}: ${m.changePercent.toFixed(2)}% @ $${m.price.toFixed(2)}`).join('\n')}

**Market Status**: ${marketStatus}

Please provide:
1. Key market themes for today
2. Analysis of my open positions with risk/opportunity assessment
3. Notable movers and what's driving them
4. 2-3 actionable insights for today's session`

    await openWithPrompt(null, prompt, 'morning')
    setIsGeneratingBrief(false)
  }

  const showPelicanPanel = pelicanState.isOpen

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Morning Brief</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Market Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-border">
              <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-xs text-foreground/70">
                {isMarketOpen ? 'Market Open' : marketStatus.replace('-', ' ')}
              </span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={moversLoading}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-border hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-foreground/70 ${moversLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Generate Brief */}
            <button
              onClick={handleGenerateBrief}
              disabled={isGeneratingBrief || showPelicanPanel}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {showPelicanPanel ? 'Brief Generated' : 'Generate Brief'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Open Positions */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              My Open Positions ({openTrades.length})
            </h2>
            {tradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : openTrades.length === 0 ? (
              <div className="p-6 rounded-lg border border-border bg-white/[0.03] text-center">
                <p className="text-foreground/50 text-sm">No open positions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {openTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-4 rounded-lg border border-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono font-bold text-foreground">{trade.ticker}</div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
                          trade.direction === 'long'
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Entry</span>
                        <span className="font-mono text-foreground">${trade.entry_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Qty</span>
                        <span className="font-mono text-foreground">{trade.quantity}</span>
                      </div>
                      {trade.stop_loss && (
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Stop</span>
                          <span className="font-mono text-red-400">${trade.stop_loss.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Movers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gainers */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Top Gainers
              </h2>
              <div className="space-y-2">
                {movers.gainers.slice(0, 10).map((mover) => (
                  <div
                    key={mover.ticker}
                    className="p-3 rounded-lg border border-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-foreground text-sm">{mover.ticker}</span>
                      <span className="text-sm font-mono font-medium text-green-400">
                        +{mover.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-foreground/60 mt-0.5">${mover.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Top Losers
              </h2>
              <div className="space-y-2">
                {movers.losers.slice(0, 10).map((mover) => (
                  <div
                    key={mover.ticker}
                    className="p-3 rounded-lg border border-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-foreground text-sm">{mover.ticker}</span>
                      <span className="text-sm font-mono font-medium text-red-400">
                        {mover.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-foreground/60 mt-0.5">${mover.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Active */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                Most Active
              </h2>
              <div className="space-y-2">
                {movers.active.slice(0, 10).map((mover) => (
                  <div
                    key={mover.ticker}
                    className="p-3 rounded-lg border border-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-foreground text-sm">{mover.ticker}</span>
                      <span
                        className={`text-sm font-mono font-medium ${
                          mover.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {mover.changePercent >= 0 ? '+' : ''}
                        {mover.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-foreground/60 mt-0.5">${mover.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Pelican AI Brief */}
        {showPelicanPanel && (
          <div className="flex-shrink-0 w-[min(420px,30%)] h-full">
            <PelicanChatPanel />
          </div>
        )}
      </div>
    </div>
  )
}
