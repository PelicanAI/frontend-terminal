"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ConversationSidebar } from "@/components/chat/conversation-sidebar"
import { ChatContainer } from "@/components/chat/chat-container"
import { ChatInput, type ChatInputRef } from "@/components/chat/chat-input"
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary"
import { useChat } from "@/hooks/use-chat"
import { useMarketData } from "@/hooks/use-market-data"
import { useMessageHandler } from "@/hooks/use-message-handler"
import { useFileUpload } from "@/hooks/use-file-upload"
import { usePanelLayout } from "@/hooks/use-panel-layout"
import { useConversationRouter } from "@/hooks/use-conversation-router"
import { useAuth } from "@/lib/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { CaretRight, Plus as PlusIcon } from "@phosphor-icons/react"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { PaywallGate } from "@/components/paywall-gate"
import { useCreditsContext } from "@/providers/credits-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChartProvider, useChart } from "@/providers/chart-provider"
import { LearningModeProvider, useLearningMode } from "@/providers/learning-mode-provider"
import { ChatCreditCounter } from "@/components/chat/credit-counter"
import { useTrades } from "@/hooks/use-trades"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useSavedInsights } from "@/hooks/use-saved-insights"
import { OnboardingSkipBanner } from "@/components/onboarding/skip-banner"
import { useTiltDetection } from "@/hooks/use-tilt-detection"
import { TiltAlertBanner } from "@/components/tilt/tilt-alert-banner"
import { TiltIndicator } from "@/components/tilt/tilt-indicator"
import type { ActionTrade } from "@/types/action-buttons"
import { ActionBar } from "@/components/chat/action-bar"
import { ActionExpanders, type ExpanderKey } from "@/components/chat/action-expanders"
import { useFirstSession } from "@/hooks/use-first-session"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"

const SettingsModal = dynamic(() => import("@/components/settings-modal").then(m => ({ default: m.SettingsModal })))
const LogTradeModal = dynamic(() => import("@/components/journal/log-trade-modal").then(m => ({ default: m.LogTradeModal })))
const CloseTradeModal = dynamic(() => import("@/components/journal/close-trade-modal").then(m => ({ default: m.CloseTradeModal })))
const TrialExhaustedModal = dynamic(() => import("@/components/trial-exhausted-modal").then(m => ({ default: m.TrialExhaustedModal })))
const InsufficientCreditsModal = dynamic(() => import("@/components/insufficient-credits-modal").then(m => ({ default: m.InsufficientCreditsModal })))
const TradingViewChart = dynamic(() => import("@/components/chat/TradingViewChart").then(m => ({ default: m.TradingViewChart })), { ssr: false })
const EconomicCalendar = dynamic(() => import("@/components/chat/EconomicCalendar").then(m => ({ default: m.EconomicCalendar })), { ssr: false })
const TradingContextPanel = dynamic(() => import("@/components/chat/trading-context-panel").then(m => ({ default: m.TradingContextPanel })), { ssr: false })

// Loading screen component for chat page
function ChatLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full opacity-20" />
        </div>
        <span className="text-[var(--text-muted)] text-sm font-medium">Loading Pelican AI...</span>
      </div>
    </div>
  )
}

// Auto-expand trading panel when a chart or calendar is requested
function ChartPanelExpander({ onExpand }: { onExpand: () => void }) {
  const { mode } = useChart()
  useEffect(() => {
    if (mode === "chart" || mode === "calendar") onExpand()
  }, [mode, onExpand])
  return null
}

// Auto-expand trading panel and switch to Learn tab when a term is clicked
function LearningPanelExpander({ onExpand }: { onExpand: () => void }) {
  const { selectedTerm } = useLearningMode()
  const onExpandRef = useRef(onExpand)
  onExpandRef.current = onExpand
  useEffect(() => {
    if (selectedTerm) onExpandRef.current()
  }, [selectedTerm])
  return null
}

// Mobile sheet — opens on screens below xl when a chart or calendar is requested
function MobileChartSheet() {
  const { mode, selectedTicker, closeChart } = useChart()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  const isOpen = (mode === "chart" && !!selectedTicker) || mode === "calendar"

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeChart() }}>
      <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-xl">
        {mode === "calendar" && (
          <EconomicCalendar onClose={closeChart} />
        )}
        {mode === "chart" && selectedTicker && (
          <TradingViewChart symbol={selectedTicker} onClose={closeChart} />
        )}
      </SheetContent>
    </Sheet>
  )
}

// ChatContainerWithChart removed — onOpenChart prop eliminated (tickers are clickable inline)

function LearningAwareTradingPanel(props: React.ComponentProps<typeof TradingContextPanel>) {
  const { enabled, selectedTerm, clearTerm, learnTabActive, setLearnTabActive } = useLearningMode()
  return (
    <TradingContextPanel
      {...props}
      selectedTerm={enabled ? selectedTerm : null}
      onClearTerm={clearTerm}
      learnTabActive={learnTabActive}
      onLearnTabClick={() => setLearnTabActive(!learnTabActive)}
      learningEnabled={enabled}
    />
  )
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth()
  const { refetch, hasAccess, loading: creditsLoading } = useCreditsContext()
  const outOfCredits = !creditsLoading && !hasAccess
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    mounted,
    showOfflineBanner,
    setShowOfflineBanner,
    sidebarCollapsed,
    mobileSheetOpen,
    setMobileSheetOpen,
    tradingPanelCollapsed,
    sidebarWidth,
    panelWidth,
    handleSidebarToggle,
    handleSidebarWidthChange,
    handleTradingPanelToggle,
    handleResizeStart,
    expandTradingPanel,
  } = usePanelLayout()

  // Tilt detection
  const { alerts: tiltAlerts, isOnTilt } = useTiltDetection()

  // Action bar expander state
  const [activeExpander, setActiveExpander] = useState<ExpanderKey | null>(null)

  // Action buttons — shared state
  const { trades: allTradesRaw, closeTrade: closeTradeAction, logTrade: logTradeAction } = useTrades()
  const { asActionItems: watchlistItems, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { saveInsight } = useSavedInsights()
  const allTrades: ActionTrade[] = useMemo(
    () => allTradesRaw.map(t => ({
      id: t.id,
      ticker: t.ticker,
      direction: t.direction,
      status: t.status,
      entry_price: t.entry_price,
      stop_loss: t.stop_loss,
      take_profit: t.take_profit,
      thesis: t.thesis,
      pnl_amount: t.pnl_amount,
      pnl_percent: t.pnl_percent,
    })),
    [allTradesRaw]
  )

  // Log Trade modal state
  const [logTradeOpen, setLogTradeOpen] = useState(false)
  const [logTradeInitialTicker, setLogTradeInitialTicker] = useState("")

  // Close Trade modal state
  const [closeTradeOpen, setCloseTradeOpen] = useState(false)
  const [closeTradeTarget, setCloseTradeTarget] = useState<typeof allTradesRaw[0] | null>(null)

  const handleOpenLogTrade = useCallback((ticker: string) => {
    setLogTradeInitialTicker(ticker)
    setLogTradeOpen(true)
  }, [])

  const handleOpenCloseTrade = useCallback((tradeId: string) => {
    const trade = allTradesRaw.find(t => t.id === tradeId) || null
    setCloseTradeTarget(trade)
    setCloseTradeOpen(true)
  }, [allTradesRaw])

  // Fetch real-time market data
  const { indices, vix, vixChange, sectors, isLoading: isLoadingMarketData, refresh: refreshMarketData } = useMarketData({
    refreshInterval: 60000,
    autoRefresh: true,
  })

  // Onboarding milestone tracking
  const { completeMilestone } = useOnboardingProgress()

  // One-time terms acceptance check
  const [termsChecked, setTermsChecked] = useState(false)
  useEffect(() => {
    if (!user || termsChecked) return
    const supabase = createClient()
    supabase
      .from("user_credits")
      .select("terms_accepted")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.terms_accepted) {
          router.replace("/accept-terms")
        }
        setTermsChecked(true)
      })
  }, [user, termsChecked, router])

  // One-time onboarding survey check (runs after terms are verified)
  const [surveyChecked, setSurveyChecked] = useState(false)
  useEffect(() => {
    if (!user || !termsChecked || surveyChecked) return
    const supabase = createClient()
    supabase
      .from("trader_survey")
      .select("completed_at, skipped")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data || (!data.completed_at && !data.skipped)) {
          router.replace("/onboarding")
        }
        setSurveyChecked(true)
      })
  }, [user, termsChecked, surveyChecked, router])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [trialExhaustedOpen, setTrialExhaustedOpen] = useState(false)
  const [trialExhaustedMessage, setTrialExhaustedMessage] = useState<string | null>(null)
  const [insufficientCreditsOpen, setInsufficientCreditsOpen] = useState(false)
  const [insufficientCreditsMessage, setInsufficientCreditsMessage] = useState<string | null>(null)
  const [insufficientCreditsRequired, setInsufficientCreditsRequired] = useState<number | null>(null)
  const [insufficientCreditsBalance, setInsufficientCreditsBalance] = useState<number | null>(null)
  const chatInputRef = useRef<ChatInputRef>(null)

  // Get conversation ID from URL
  const conversationIdFromUrl = searchParams.get("conversation")
  const prefillFromUrl = searchParams.get("prefill")

  // Prefill chat input from URL param (e.g. from strategy "Ask Pelican" button)
  useEffect(() => {
    if (prefillFromUrl && chatInputRef.current) {
      chatInputRef.current.setMessage(prefillFromUrl)
      // Clean up URL to avoid re-prefilling on re-render
      const url = new URL(window.location.href)
      url.searchParams.delete("prefill")
      window.history.replaceState({}, "", url.toString())
    }
  }, [prefillFromUrl])

  const handleSaveInsight = useCallback(async (content: string, tickers: string[]) => {
    return saveInsight(content, {
      tickers,
      conversationId: conversationIdFromUrl || undefined,
    })
  }, [saveInsight, conversationIdFromUrl])

  const {
    messages,
    isLoading: chatLoading,
    isLoadingMessages,
    sendMessage,
    stopGeneration,
    clearMessages,
    regenerateLastMessage,
    editMessage,
    addSystemMessage,
    conversationNotFound,
  } = useChat({
    conversationId: conversationIdFromUrl,
    onError: () => {
      // Show offline banner for network errors
      setShowOfflineBanner(true)
    },
    onFinish: async (message) => {
      // Message sent successfully, hide offline banner if it was showing
      setShowOfflineBanner(false)
      messageHandler.handleMessageFinish()

      // Persist queued image metadata to the most recent user message.
      await fileUpload.persistPendingImageMetadata(latestConversationIdRef.current)

      // Auto-generate conversation title after first exchange
      const convId = latestConversationIdRef.current
      if (convId) {
        const userMessages = messages.filter(m => m.role === 'user')
        const firstUserMsg = userMessages[0]
        if (userMessages.length === 1 && firstUserMsg) {
          const userContent = firstUserMsg.content
          const assistantContent = message.content
          if (userContent && assistantContent) {
            fetch(`/api/conversations/${convId}/generate-title`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userMessage: userContent,
                assistantMessage: assistantContent,
              }),
            }).catch(() => {})
          }
        }
      }

      window.dispatchEvent(new CustomEvent('pelican:conversation-created'))

      // Milestone: first message
      completeMilestone("first_message")
    },
    onConversationCreated: (conversationId: string) => {
      latestConversationIdRef.current = conversationId
      conversationRouter.setCurrentConversationId(conversationId)
      // Signal sidebar to refresh immediately (don't rely solely on Realtime latency)
      window.dispatchEvent(new CustomEvent('pelican:conversation-created'))
    },
    onTrialExhausted: (info) => {
      setTrialExhaustedMessage(
        info.message || 'Your free trial has ended. Subscribe to continue using Pelican.'
      )
      setTrialExhaustedOpen(true)
      refetch()
    },
    onInsufficientCredits: (info) => {
      setInsufficientCreditsMessage(
        info.message || 'Not enough credits to run this query.'
      )
      setInsufficientCreditsRequired(info.required ?? null)
      setInsufficientCreditsBalance(info.balance ?? null)
      setInsufficientCreditsOpen(true)
      refetch()
    },
  })

  const messageHandler = useMessageHandler({
    chatLoading,
    currentConversationId: conversationIdFromUrl,
    sendMessage,
    chatInputRef,
  })

  const conversationRouter = useConversationRouter({
    user,
    chatLoading,
    messages,
    stopGeneration,
    clearMessages,
    clearDraftForConversation: messageHandler.clearDraftForConversation,
  })

  // Update the messageHandler with the current conversation ID
  useEffect(() => {
    messageHandler.setDraftConversationId(conversationRouter.currentConversationId || null)
  }, [conversationRouter.currentConversationId, messageHandler])

  // Clear guest conversation IDs from URL when user loads page
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl.startsWith('guest-')) {
      // Guest conversation ID in URL - clear it and redirect
      router.replace('/chat')
    }
  }, [conversationIdFromUrl, router])

  // ✅ FIX: Removed redirect - with API fix, conversationNotFound won't be set for new convos
  // If you see this log, something unexpected happened
  useEffect(() => {
    if (conversationNotFound && conversationIdFromUrl) {

      // Don't redirect - let user continue or handle gracefully
    }
  }, [conversationNotFound, conversationIdFromUrl])

  const fileUpload = useFileUpload({
    sendMessage,
    addSystemMessage,
    chatInputRef,
  })
  const clearUploadedFiles = fileUpload.clearUploadedFiles

  // Clear uploaded files when switching conversations
  const prevConversationRef = useRef(conversationIdFromUrl)
  useEffect(() => {
    if (prevConversationRef.current !== conversationIdFromUrl) {
      clearUploadedFiles()
    }
    prevConversationRef.current = conversationIdFromUrl
  }, [conversationIdFromUrl, clearUploadedFiles])

  // First-session auto welcome message
  useFirstSession(
    outOfCredits ? undefined : messageHandler.handleSendMessage,
    messages.length > 0,
  )

  const handleQuickStart = (message: string) => {
    messageHandler.handleSendMessage(message, { source: 'welcome_chip' })
  }

  // Track latest conversation ID (updated by onConversationCreated before onFinish fires)
  const latestConversationIdRef = useRef<string | null>(conversationIdFromUrl)
  latestConversationIdRef.current = conversationIdFromUrl
  const handleFileUploadWithCapture = useCallback((files: File[]) => {
    fileUpload.handleMultipleFileUploadWithCapture(files)
  }, [fileUpload])

  // Detect "log a trade" intent and open modal instead of sending to AI
  const LOG_TRADE_PATTERNS = [
    /^log\s*(a\s*)?trade/i,
    /^add\s*(a\s*)?trade/i,
    /^record\s*(a\s*)?trade/i,
    /^new\s*trade/i,
    /^enter\s*(a\s*)?trade/i,
  ]

  const NOT_TICKERS = new Set(['A', 'I', 'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE', 'LOG', 'ADD', 'NEW', 'FOR', 'THE'])

  const handleSendMessageWithFiles = useCallback(async (message: string) => {
    const trimmed = message.trim()
    const isLogTradeIntent = LOG_TRADE_PATTERNS.some(pattern => pattern.test(trimmed))

    if (isLogTradeIntent) {
      // Try to extract a ticker from the message (e.g., "log a trade on AAPL")
      const words = trimmed.split(/\s+/)
      const ticker = words.find(w => /^[A-Z]{1,5}$/.test(w) && !NOT_TICKERS.has(w))
      handleOpenLogTrade(ticker || "")
      return
    }

    const uploadPayload = await fileUpload.prepareMessageFiles(user?.id)
    await messageHandler.handleSendMessage(message, uploadPayload)

    // Clear uploaded files after sending
    clearUploadedFiles()
  }, [fileUpload, messageHandler, user?.id, clearUploadedFiles, handleOpenLogTrade])

  const handleConversationSelect = (id: string) => {
    conversationRouter.handleConversationSelect(id)
    setMobileSheetOpen(false)
  }

  const handleNewConversation = async () => {
    await conversationRouter.handleNewConversation()
    setMobileSheetOpen(false)
    // Refresh sidebar to catch any conversation created during the previous chat
    window.dispatchEvent(new CustomEvent('pelican:conversation-created'))
  }

  const handleStopGeneration = () => {
    stopGeneration()
    messageHandler.resetDraftState()
  }

  const handleSettingsClick = () => {
    setSettingsOpen(true)
  }

  // Show loading screen while checking auth
  if (!mounted || authLoading) {
    return <ChatLoadingScreen />
  }

  // Require authentication - redirect to login if no user
  if (!user) {
    router.push('/auth/login')
    return <ChatLoadingScreen />
  }

  return (
    <PaywallGate>
      <ChatErrorBoundary onReset={() => clearMessages()}>
        <ChartProvider>
        <LearningModeProvider>
        <ChartPanelExpander onExpand={expandTradingPanel} />
        <LearningPanelExpander onExpand={expandTradingPanel} />
        <div id="main-content" className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden relative app-background-gradient chat-viewport-lock">
      {/* Offline indicator */}
      {showOfflineBanner && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span>No internet connection. Your messages won&apos;t send until you&apos;re back online.</span>
          </div>
        </div>
      )}

      {/* Desktop sidebar — full or collapsed strip */}
      <div className="hidden xl:block flex-shrink-0">
        {sidebarCollapsed ? (
          <div className="w-12 h-full flex flex-col items-center pt-3 gap-3 border-r border-[var(--border-subtle)] bg-sidebar">
            <IconTooltip label="Open sidebar" side="right">
              <button
                onClick={handleSidebarToggle}
                className="h-8 w-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <CaretRight size={16} weight="regular" />
              </button>
            </IconTooltip>
            <IconTooltip label="New chat" side="right" kbd="N">
              <button
                onClick={handleNewConversation}
                className="h-8 w-8 flex items-center justify-center rounded-md text-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-muted)] transition-colors"
              >
                <PlusIcon size={16} weight="bold" />
              </button>
            </IconTooltip>
          </div>
        ) : (
          <ConversationSidebar
            currentConversationId={conversationRouter.currentConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarToggle}
            width={sidebarWidth}
            onWidthChange={handleSidebarWidthChange}
          />
        )}
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="left"
          className={cn(
            "w-[85vw] max-w-[320px] p-0 border-r-border",
            mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          onOpenAutoFocus={(e) => {
            const target = e.currentTarget as HTMLElement | null
            if (target) {
              const searchInput = target.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null
              if (searchInput) {
                searchInput.focus()
              }
            }
          }}
          onCloseAutoFocus={() => {
            setTimeout(() => {
              chatInputRef.current?.focus()
            }, 100)
          }}
        >
          <ConversationSidebar
            currentConversationId={conversationRouter.currentConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            isCollapsed={false}
            isMobileSheet={true}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="xl:hidden border-b border-[var(--border-subtle)] p-4 flex items-center justify-between bg-background touch-manipulation">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <IconTooltip label="Open sidebar" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 min-h-[44px] min-w-[44px] glow-button glow-ghost"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </Button>
              </IconTooltip>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <Image src="/pelican-logo-transparent.webp" alt="PelicanAI" width={24} height={24} className="w-6 h-6 object-contain" />
            <span className="font-semibold text-foreground">Pelican AI</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <TiltIndicator isOnTilt={isOnTilt} alertCount={tiltAlerts.length} />
            <ChatCreditCounter />
            <ThemeToggle />
          </div>
        </div>


        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto overscroll-none pb-[160px] chat-scroll-area flex flex-col">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex-1 flex flex-col">
              <OnboardingSkipBanner />
              {tiltAlerts.length > 0 && (
                <div className="mb-4">
                  <TiltAlertBanner alerts={tiltAlerts} />
                </div>
              )}
              <ChatContainer
                messages={messages}
                isLoading={chatLoading}
                isLoadingHistory={isLoadingMessages}
                onStopGeneration={handleStopGeneration}
                onRegenerateMessage={regenerateLastMessage}
                onEditMessage={editMessage}
                onQuickStart={outOfCredits ? undefined : handleQuickStart}
                onFileUpload={handleFileUploadWithCapture}
                onSettingsClick={handleSettingsClick}
                outOfCredits={outOfCredits}
                conversationId={conversationIdFromUrl || undefined}
                allTrades={allTrades}
                watchlistItems={watchlistItems}
                onAddToWatchlist={addToWatchlist}
                onRemoveFromWatchlist={removeFromWatchlist}
                onOpenLogTrade={handleOpenLogTrade}
                onOpenCloseTrade={handleOpenCloseTrade}
                onSubmitPrompt={messageHandler.handleSendMessage}
                onSaveInsight={handleSaveInsight}
                pendingDraft={messageHandler.pendingDraft}
                onPrefillInput={(text) => {
                  chatInputRef.current?.setMessage(text)
                  // Scroll chat area to bottom so user sees the prefilled input
                  requestAnimationFrame(() => {
                    const scrollArea = document.querySelector('.chat-scroll-area')
                    if (scrollArea) {
                      scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' })
                    }
                  })
                }}
              />
            </div>
          </div>

          <div className={cn(
            "fixed bottom-0 left-0 right-0 md:absolute md:bottom-0 md:left-0 md:right-0",
            "chat-input-fixed",
            "z-40 bg-background"
          )}>
            <div className="absolute inset-x-0 bottom-full h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            <div className="px-4 sm:px-6 pb-4 pt-2">
            <div className="max-w-3xl mx-auto w-full relative">
              {outOfCredits && (
                <div className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-6 py-3">
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground min-h-[56px]">
                    <span>You&apos;ve used all your free questions.</span>
                    <Link href="/pricing" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2 whitespace-nowrap">
                      Upgrade to keep trading &rarr;
                    </Link>
                  </div>
                </div>
              )}
              <ActionExpanders
                active={activeExpander}
                onClose={() => setActiveExpander(null)}
                onSend={(msg) => {
                  messageHandler.handleSendMessage(msg, { source: 'action_bar' })
                  setActiveExpander(null)
                }}
                openTrades={allTradesRaw.filter(t => t.status === "open")}
              />
              <ActionBar
                active={activeExpander}
                onToggle={setActiveExpander}
                onFocusInput={() => chatInputRef.current?.focus()}
                hasOpenTrades={allTradesRaw.some(t => t.status === "open")}
                disabled={outOfCredits}
                isAIResponding={chatLoading}
              />
              <ChatInput
                ref={chatInputRef}
                onSendMessage={handleSendMessageWithFiles}
                onStopResponse={handleStopGeneration}
                onFileUpload={handleFileUploadWithCapture}
                disabled={isLoadingMessages || outOfCredits}
                disabledSend={outOfCredits || ((chatLoading || isLoadingMessages) && !messageHandler.isQueueingMessage)}
                canSend={!outOfCredits && ((!chatLoading && !isLoadingMessages) || messageHandler.isQueueingMessage)}
                placeholder={outOfCredits ? "Upgrade to continue..." : "Ask Pelican anything..."}
                onTypingDuringResponse={messageHandler.handleTypingDuringResponse}
                isAIResponding={chatLoading}
                onQueueMessage={messageHandler.handleForceQueue}
                queueEnabled={chatLoading}
                pendingDraft={messageHandler.pendingDraft}
                onCancelDraft={messageHandler.cancelPendingMessage}
                attachments={fileUpload.uploadedFiles.map((f) => ({
                  name: f.name,
                  type: f.type,
                  url: f.url,
                }))}
                onRemoveAttachment={(index: number) => {
                  const uploadedCount = fileUpload.uploadedFiles.length
                  if (index < uploadedCount) {
                    fileUpload.removeUploadedFile(index)
                  } else {
                    const pendingIndex = index - uploadedCount
                    const attachment = fileUpload.pendingAttachments[pendingIndex]
                    if (attachment) {
                      fileUpload.handleRemovePendingAttachment(attachment.id)
                    }
                  }
                }}
                pendingAttachments={fileUpload.pendingAttachments}
                onRetryAttachment={fileUpload.handleRetryUpload}
              />
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Context Panel - Desktop only */}
      {!tradingPanelCollapsed && (
        <>
          {/* Resize handle */}
          <div
            className="hidden lg:flex items-center justify-center w-1.5 cursor-col-resize group hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors flex-shrink-0"
            onMouseDown={handleResizeStart}
          >
            <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-blue-400/50 group-active:bg-blue-400 transition-colors" />
          </div>
          <div
            className="hidden lg:block h-full overflow-y-auto flex-shrink-0"
            style={{ width: panelWidth }}
          >
            <LearningAwareTradingPanel
              collapsed={tradingPanelCollapsed}
              onToggleCollapse={handleTradingPanelToggle}
              indices={indices}
              vix={vix}
              vixChange={vixChange}
              sectors={sectors}
              isLoading={isLoadingMarketData}
              onRefresh={refreshMarketData}
              onPrefillChat={messageHandler.handleSendMessage}
            />
          </div>
        </>
      )}

      {/* Show expand button when trading panel is collapsed */}
      {tradingPanelCollapsed && (
        <div className="hidden lg:flex items-start p-2 bg-background border-l border-[var(--border-subtle)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTradingPanelToggle}
            className="h-8 px-2"
            title="Show Market Overview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="ml-1 text-xs">Market</span>
          </Button>
        </div>
      )}

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TrialExhaustedModal
        isOpen={trialExhaustedOpen}
        message={trialExhaustedMessage}
        onClose={() => setTrialExhaustedOpen(false)}
      />
      <InsufficientCreditsModal
        isOpen={insufficientCreditsOpen}
        message={insufficientCreditsMessage}
        required={insufficientCreditsRequired}
        balance={insufficientCreditsBalance}
        onClose={() => setInsufficientCreditsOpen(false)}
      />
      <MobileChartSheet />
      <LogTradeModal
        open={logTradeOpen}
        onOpenChange={(open) => {
          setLogTradeOpen(open)
          if (!open) setLogTradeInitialTicker("")
        }}
        onSubmit={async (data) => {
          await logTradeAction(data)
        }}
        initialTicker={logTradeInitialTicker}
      />
      <CloseTradeModal
        open={closeTradeOpen}
        onOpenChange={setCloseTradeOpen}
        trade={closeTradeTarget}
        onSubmit={async (data) => {
          if (closeTradeTarget) {
            await closeTradeAction(closeTradeTarget.id, data)
            setCloseTradeOpen(false)
            setCloseTradeTarget(null)
          }
        }}
      />
        </div>
        </LearningModeProvider>
        </ChartProvider>
      </ChatErrorBoundary>
    </PaywallGate>
  )
}
