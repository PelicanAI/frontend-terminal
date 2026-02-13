"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import dynamicImport from "next/dynamic"
import { useTrades, Trade } from "@/hooks/use-trades"
import { useTradeStats } from "@/hooks/use-trade-stats"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { LogTradeModal } from "@/components/journal/log-trade-modal"
import { CloseTradeModal } from "@/components/journal/close-trade-modal"
import { TradesTable } from "@/components/journal/trades-table"
import { TradeDetailPanel } from "@/components/journal/trade-detail-panel"
import { AIGradeCard } from "@/components/journal/ai-grade-card"
import { Plus, BarChart3, ListFilter } from "lucide-react"

const DashboardTab = dynamicImport(
  () => import("@/components/journal/dashboard-tab").then((m) => ({ default: m.DashboardTab })),
  { ssr: false }
)

const PelicanChatPanel = dynamicImport(
  () => import("@/components/pelican-panel/pelican-chat-panel").then((m) => ({ default: m.PelicanChatPanel })),
  { ssr: false }
)

type TabKey = 'dashboard' | 'trades'
type ActivePanel = 'detail' | 'pelican' | null

export default function JournalPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('trades')
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [showLogTradeModal, setShowLogTradeModal] = useState(false)
  const [showCloseTradeModal, setShowCloseTradeModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | 'real' | 'paper'>('all')

  const { trades, isLoading: tradesLoading, logTrade, closeTrade, refetch } = useTrades()
  const { stats, equityCurve, isLoading: statsLoading } = useTradeStats()
  const { isOpen: panelOpen, openWithPrompt, close: closePelicanPanel } = usePelicanPanelContext()
  const handleScanTrade = async (trade: Trade) => {
    const prompt = `Perform a high-fidelity audit on my ${trade.ticker} ${trade.direction} trade.
Entry: $${trade.entry_price} | Exit: ${trade.exit_price ? `$${trade.exit_price}` : "Open"}
Thesis: ${trade.thesis || trade.notes || "No notes provided."}

Provide:
1. Grade (A-F) based on entry timing and risk management.
2. Exit efficiency: Did I leave money on the table?
3. Behavioral check: Was this an emotional or systematic trade?`

    await openWithPrompt(trade.ticker, prompt, "journal")
    setActivePanel("pelican")
    setSelectedTrade(trade)
  }


  // Filter trades based on type
  const filteredTrades = trades.filter((trade) => {
    if (tradeTypeFilter === 'real') return !trade.is_paper
    if (tradeTypeFilter === 'paper') return trade.is_paper
    return true
  })

  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setActivePanel('detail')
    // Close Pelican panel when opening detail
    if (panelOpen) {
      closePelicanPanel()
    }
  }

  const handleCloseDetailPanel = () => {
    setActivePanel(null)
    setSelectedTrade(null)
  }

  const handleOpenCloseTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setShowCloseTradeModal(true)
  }

  const handleLogTrade = async (data: Parameters<typeof logTrade>[0]) => {
    await logTrade(data)
    refetch()
  }

  const handleCloseTrade = async (data: Parameters<typeof closeTrade>[1]) => {
    if (!selectedTrade) return
    const success = await closeTrade(selectedTrade.id, data)
    if (success) {
      refetch()
      setShowCloseTradeModal(false)
      handleCloseDetailPanel()
    }
  }

  // Monitor Pelican panel state - close detail panel when Pelican opens
  const showPelicanPanel = panelOpen
  if (showPelicanPanel && activePanel === 'detail') {
    setActivePanel('pelican')
    setSelectedTrade(null)
  }

  const showDetailPanel = activePanel === 'detail' && selectedTrade !== null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Trade Journal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trades.length} total trades • {stats?.win_rate.toFixed(1)}% win rate
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-white/[0.06] border border-border rounded-lg p-1">
              <button
                onClick={() => setTradeTypeFilter('all')}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    tradeTypeFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-foreground/70 hover:text-foreground'
                  }
                `}
              >
                All
              </button>
              <button
                onClick={() => setTradeTypeFilter('real')}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    tradeTypeFilter === 'real'
                      ? 'bg-purple-600 text-white'
                      : 'text-foreground/70 hover:text-foreground'
                  }
                `}
              >
                Real
              </button>
              <button
                onClick={() => setTradeTypeFilter('paper')}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    tradeTypeFilter === 'paper'
                      ? 'bg-purple-600 text-white'
                      : 'text-foreground/70 hover:text-foreground'
                  }
                `}
              >
                Paper
              </button>
            </div>

            {/* Log Trade Button */}
            <button
              onClick={() => setShowLogTradeModal(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Trade
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === 'dashboard'
                  ? 'bg-white/[0.06] text-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white/[0.03]'
              }
            `}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === 'trades'
                  ? 'bg-white/[0.06] text-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white/[0.03]'
              }
            `}
          >
            <ListFilter className="w-4 h-4 inline mr-1.5" />
            Trades
          </button>
        </div>
      </div>

      {/* Main Content Area with Dual Panel Support */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className={`flex-1 overflow-auto p-6 transition-all ${
          showDetailPanel || showPelicanPanel ? 'mr-0' : ''
        }`}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              equityCurve={equityCurve}
              isLoading={statsLoading}
            />
          )}

          {activeTab === 'trades' && (
            <div className="space-y-6">
              <TradesTable
                trades={filteredTrades}
                onSelectTrade={handleSelectTrade}
                onScanTrade={handleScanTrade}
                selectedTradeId={selectedTrade?.id}
              />
              {selectedTrade && (
                <AIGradeCard
                  overall="B+"
                  dimensions={[
                    { label: "Entry", grade: "B+", score: 82, note: "Entry timing aligned with session momentum." },
                    { label: "Exit", grade: "B", score: 78, note: "Exit captured move but left continuation." },
                    { label: "Risk", grade: "A-", score: 90, note: "Risk contained and stop placement respected." },
                    { label: "Thesis", grade: "B", score: 76, note: "Thesis was clear but lacked catalyst depth." },
                    { label: "Plan", grade: "B+", score: 84, note: "Execution followed plan with minor discretion drift." },
                  ]}
                />
              )}
            </div>
          )}

          {tradesLoading && trades.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-foreground/50 text-sm">Loading trades...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Trade Detail (30%) */}
        {showDetailPanel && (
          <div className="flex-shrink-0 w-[min(420px,30%)] h-full">
            <TradeDetailPanel
              trade={selectedTrade}
              onClose={handleCloseDetailPanel}
              onCloseTrade={handleOpenCloseTrade}
            />
          </div>
        )}

        {/* Right Panel - Pelican AI (30%) */}
        {showPelicanPanel && !showDetailPanel && (
          <div className="flex-shrink-0 w-[min(420px,30%)] h-full">
            <PelicanChatPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      <LogTradeModal
        open={showLogTradeModal}
        onOpenChange={setShowLogTradeModal}
        onSubmit={handleLogTrade}
      />

      {selectedTrade && (
        <CloseTradeModal
          open={showCloseTradeModal}
          onOpenChange={setShowCloseTradeModal}
          trade={selectedTrade}
          onSubmit={handleCloseTrade}
        />
      )}
    </div>
  )
}
