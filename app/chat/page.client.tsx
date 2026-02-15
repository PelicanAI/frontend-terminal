"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ConversationSidebar } from "@/components/chat/conversation-sidebar"
import { ChatContainer } from "@/components/chat/chat-container"
import { ChatInput, type ChatInputRef } from "@/components/chat/chat-input"
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary"
import { useChat } from "@/hooks/use-chat"
import { useMarketData } from "@/hooks/use-market-data"
import { useMessageHandler } from "@/hooks/use-message-handler"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useConversationRouter } from "@/hooks/use-conversation-router"
import { useAuth } from "@/lib/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { uploadChatImage } from "@/lib/upload-image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
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
import { LearningModeToggle } from "@/components/chat/LearningModeToggle"
import { ChatCreditCounter } from "@/components/chat/credit-counter"

const SettingsModal = dynamic(() => import("@/components/settings-modal").then(m => ({ default: m.SettingsModal })))
const TrialExhaustedModal = dynamic(() => import("@/components/trial-exhausted-modal").then(m => ({ default: m.TrialExhaustedModal })))
const InsufficientCreditsModal = dynamic(() => import("@/components/insufficient-credits-modal").then(m => ({ default: m.InsufficientCreditsModal })))
const TradingViewChart = dynamic(() => import("@/components/chat/TradingViewChart").then(m => ({ default: m.TradingViewChart })), { ssr: false })
const EconomicCalendar = dynamic(() => import("@/components/chat/EconomicCalendar").then(m => ({ default: m.EconomicCalendar })), { ssr: false })
const TradingContextPanel = dynamic(() => import("@/components/chat/trading-context-panel").then(m => ({ default: m.TradingContextPanel })), { ssr: false })

// Loading screen component for chat page
function ChatLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-purple-950/20 via-black to-violet-950/20">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full" />
          <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full opacity-20" />
        </div>
        <span className="text-gray-400 text-sm font-medium">Loading Pelican AI...</span>
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tradingPanelCollapsed, setTradingPanelCollapsed] = useState(false)

  // Resizable trading panel width
  const PANEL_MIN = 280
  const PANEL_MAX = 700
  const PANEL_DEFAULT = 320
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT)
  const isResizing = useRef(false)

  // Handle sidebar toggle with persistence
  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)
    localStorage.setItem('pelican_sidebar_collapsed', newCollapsed.toString())
  }

  // Handle trading panel toggle with persistence
  const handleTradingPanelToggle = () => {
    const newCollapsed = !tradingPanelCollapsed
    setTradingPanelCollapsed(newCollapsed)
    localStorage.setItem('pelican_trading_panel_collapsed', newCollapsed.toString())
  }

  // Panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    // Disable pointer events on iframes during drag (they eat mouse events)
    document.querySelectorAll('iframe').forEach(f => { (f as HTMLElement).style.pointerEvents = 'none' })

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      // Dragging left increases width (panel is on the right)
      const delta = startX - ev.clientX
      const newWidth = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startWidth + delta))
      setPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.querySelectorAll('iframe').forEach(f => { (f as HTMLElement).style.pointerEvents = '' })
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // Persist final width
      setPanelWidth(w => {
        localStorage.setItem('pelican_trading_panel_width', String(w))
        return w
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [panelWidth])

  // Fetch real-time market data
  const { indices, vix, vixChange, sectors, watchlist, isLoading: isLoadingMarketData, refresh: refreshMarketData } = useMarketData({
    refreshInterval: 60000, // Refresh every 60 seconds
    autoRefresh: true,
    watchlistSymbols: ['AAPL', 'TSLA', 'NVDA', 'SPY'] // User's custom watchlist
  })

  // Hydrate localStorage values after mount and monitor network status
  useEffect(() => {
    setMounted(true)

    // Restore persisted state from localStorage
    const savedSidebar = localStorage.getItem('pelican_sidebar_collapsed')
    if (savedSidebar === 'true') setSidebarCollapsed(true)

    const savedPanel = localStorage.getItem('pelican_trading_panel_collapsed')
    if (savedPanel === 'true') setTradingPanelCollapsed(true)

    const savedWidth = localStorage.getItem('pelican_trading_panel_width')
    if (savedWidth) {
      const n = parseInt(savedWidth, 10)
      if (!isNaN(n) && n >= PANEL_MIN && n <= PANEL_MAX) setPanelWidth(n)
    }

    // Monitor online/offline status
    const handleOnline = () => {
      setShowOfflineBanner(false)
    }
    const handleOffline = () => {
      setShowOfflineBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
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

      // Persist image metadata to the user message in Supabase
      const imagesMeta = pendingImageMetaRef.current
      const activeConvId = latestConversationIdRef.current
      if (imagesMeta.length > 0 && activeConvId) {
        pendingImageMetaRef.current = []
        try {
          const supabase = createClient()
          // Find the most recent user message in this conversation
          const { data: recentMsg } = await supabase
            .from('messages')
            .select('id, metadata')
            .eq('conversation_id', activeConvId)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (recentMsg) {
            const existingMeta = (recentMsg.metadata as Record<string, unknown>) || {}
            await supabase
              .from('messages')
              .update({
                metadata: { ...existingMeta, images: imagesMeta },
              })
              .eq('id', recentMsg.id)
          }
        } catch {

        }
      }

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

  // Clear uploaded files when switching conversations
  const prevConversationRef = useRef(conversationIdFromUrl)
  useEffect(() => {
    if (prevConversationRef.current !== conversationIdFromUrl) {
      fileUpload.clearUploadedFiles()
    }
    prevConversationRef.current = conversationIdFromUrl
  }, [conversationIdFromUrl, fileUpload])

  const handleQuickStart = (message: string) => {
    messageHandler.handleSendMessage(message)
  }

  // Track image metadata for persistence after message send
  const pendingImageMetaRef = useRef<Array<{ storagePath: string; name: string; size: number }>>([])
  // Track latest conversation ID (updated by onConversationCreated before onFinish fires)
  const latestConversationIdRef = useRef<string | null>(conversationIdFromUrl)
  latestConversationIdRef.current = conversationIdFromUrl
  // Capture original File objects as they're uploaded (so we can re-upload images to chat-images)
  const imageFilesRef = useRef<Map<string, File>>(new Map())

  // Wrap the file upload to capture image File objects
  const handleFileUploadWithCapture = useCallback((files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        imageFilesRef.current.set(`${file.name}:${file.type}`, file)
      }
    }
    fileUpload.handleMultipleFileUpload(files)
  }, [fileUpload])

  const handleSendMessageWithFiles = useCallback(async (message: string) => {
    // Get uploaded file IDs and attachments
    const fileIds = fileUpload.getUploadedFileIds()
    const attachments = fileUpload.getUploadedAttachments()

    // Upload any image attachments to chat-images bucket for persistence
    const imagesMeta: Array<{ storagePath: string; name: string; size: number }> = []
    if (user && attachments.length > 0) {
      for (const att of attachments) {
        if (att.type?.startsWith('image/')) {
          const key = `${att.name}:${att.type}`
          const originalFile = imageFilesRef.current.get(key)
          if (originalFile) {
            const result = await uploadChatImage(originalFile, user.id)
            if (result) {
              imagesMeta.push({
                storagePath: result.storagePath,
                name: originalFile.name,
                size: originalFile.size,
              })
            }
            imageFilesRef.current.delete(key)
          }
        }
      }
    }

    // Store pending image metadata for post-send DB update
    pendingImageMetaRef.current = imagesMeta

    // Send message with files
    await messageHandler.handleSendMessage(message, {
      fileIds: fileIds.length > 0 ? fileIds : undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    })

    // Clear uploaded files after sending
    fileUpload.clearUploadedFiles()
  }, [fileUpload, messageHandler, user])

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
        <ChartPanelExpander onExpand={() => {
          setTradingPanelCollapsed(false)
          localStorage.setItem('pelican_trading_panel_collapsed', 'false')
        }} />
        <LearningPanelExpander onExpand={() => {
          setTradingPanelCollapsed(false)
          localStorage.setItem('pelican_trading_panel_collapsed', 'false')
        }} />
        <div id="main-content" className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden relative chat-background-gradient chat-viewport-lock">
      {/* Futuristic background effects - only in dark mode */}
      {/* <div className="absolute inset-0 dark:block hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/10 via-black to-violet-950/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      </div> */}
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

      {!sidebarCollapsed && (
        <div className="hidden xl:block">
          <ConversationSidebar
            currentConversationId={conversationRouter.currentConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarToggle}
          />
        </div>
      )}

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
        <div className="xl:hidden border-b p-4 flex items-center justify-between bg-background border-border touch-manipulation">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 min-h-[44px] min-w-[44px] glow-button glow-ghost"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <Image src="/pelican-logo-transparent.webp" alt="PelicanAI" width={24} height={24} className="w-6 h-6 object-contain" />
            <span className="font-semibold text-foreground">Pelican AI</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ChatCreditCounter />
            <LearningModeToggle />
            <ThemeToggle />
          </div>
        </div>


        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-none pb-[120px] md:pb-0 chat-scroll-area">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
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
              />
            </div>
          </div>

          <div className={cn(
            "bg-background border-t border-border",
            "fixed bottom-0 left-0 right-0 md:relative md:bottom-auto",
            "chat-input-fixed md:pb-4",
            "z-40"
          )}>
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-3 relative">
              {outOfCredits && (
                <div className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-6 py-3">
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground min-h-[56px]">
                    <span>You&apos;ve used all your free questions.</span>
                    <Link href="/pricing" className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-2 whitespace-nowrap">
                      Upgrade to keep trading &rarr;
                    </Link>
                  </div>
                </div>
              )}
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
                pendingDraft={messageHandler.pendingDraft}
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

      {/* Trading Context Panel - Desktop only */}
      {!tradingPanelCollapsed && (
        <>
          {/* Resize handle */}
          <div
            className="hidden lg:flex items-center justify-center w-1.5 cursor-col-resize group hover:bg-purple-500/10 active:bg-purple-500/20 transition-colors flex-shrink-0"
            onMouseDown={handleResizeStart}
          >
            <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-purple-400/50 group-active:bg-purple-400 transition-colors" />
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
              watchlist={watchlist}
              isLoading={isLoadingMarketData}
              onRefresh={refreshMarketData}
            />
          </div>
        </>
      )}

      {/* Show expand button when trading panel is collapsed */}
      {tradingPanelCollapsed && (
        <div className="hidden lg:flex items-start p-2 bg-background border-l border-border">
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
        </div>
        </LearningModeProvider>
        </ChartProvider>
      </ChatErrorBoundary>
    </PaywallGate>
  )
}
