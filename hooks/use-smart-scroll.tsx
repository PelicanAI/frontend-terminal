"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface SmartScrollOptions {
  nearBottomThreshold?: number
  mobileNearBottomThreshold?: number
  scrollBehavior?: ScrollBehavior
  enableMomentumScrolling?: boolean
  debounceMs?: number
}

export interface SmartScrollState {
  isNearBottom: boolean
  isUserScrolling: boolean
  hasNewMessages: boolean
  isStreaming: boolean
}

export function useSmartScroll(options: SmartScrollOptions = {}) {
  const {
    nearBottomThreshold = 100,
    mobileNearBottomThreshold = 150,
    scrollBehavior = "smooth",
    enableMomentumScrolling = true,
    debounceMs = 100,
  } = options

  // Memory leak prevention
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())
  const isMountedRef = useRef(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTopRef = useRef(0)
  const isStreamingRef = useRef(false)
  const shouldAutoScrollRef = useRef(true) // Track if auto-scroll is enabled (disabled when user scrolls up)
  const [lastNewMessageAt, setLastNewMessageAt] = useState<number>(0)

  const [state, setState] = useState<SmartScrollState>({
    isNearBottom: true,
    isUserScrolling: false,
    hasNewMessages: false,
    isStreaming: false,
  })

  // Helper to create tracked timeout
  const createTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        callback()
      }
      timeoutRefs.current.delete(timeout)
    }, delay)
    timeoutRefs.current.add(timeout)
    return timeout
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
    }
  }, [])

  // Detect if user is on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  const threshold = isMobile ? mobileNearBottomThreshold : nearBottomThreshold

  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return false

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom < 150 // Exact threshold as requested
  }, [])

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = scrollBehavior) => {
      const container = containerRef.current
      if (!container) return

      // Don't scroll if content fits on screen
      if (container.scrollHeight <= container.clientHeight + 50) return

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      })
    },
    [scrollBehavior],
  )

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const isScrollingUp = currentScrollTop < lastScrollTopRef.current
    const isNearBottom = checkIfNearBottom()

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Update user scrolling state
    setState((prev) => ({ ...prev, isUserScrolling: true, isNearBottom }))

    // SCENARIO 4: User manually scrolls
    // If user scrolls UP during streaming: disable auto-scroll immediately
    if (isScrollingUp && isStreamingRef.current && !isNearBottom) {
      shouldAutoScrollRef.current = false
    }
    
    // If user scrolls back to bottom: re-enable auto-scroll
    if (isNearBottom) {
      shouldAutoScrollRef.current = true
    }

    // Reset user scrolling state after debounce period
    scrollTimeoutRef.current = createTimeout(() => {
      setState((prev) => ({ ...prev, isUserScrolling: false }))
    }, debounceMs)

    lastScrollTopRef.current = currentScrollTop
  }, [checkIfNearBottom, debounceMs, createTimeout])

  // Scroll to show user message at top when they send a message
  const scrollToUserMessage = useCallback((messageId?: string) => {
    if (!messageId) {
      return
    }

    const container = containerRef.current
    if (!container) return

    const tryScroll = (attempt: number) => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)

      if (container && messageElement) {
        const containerRect = container.getBoundingClientRect()
        const messageRect = messageElement.getBoundingClientRect()
        const scrollOffset = messageRect.top - containerRect.top + container.scrollTop - 20

        // Don't scroll if message is already visible
        const messageTop = messageRect.top - containerRect.top
        const messageBottom = messageTop + messageRect.height
        const isVisible = messageTop >= 0 && messageBottom <= containerRect.height

        if (!isVisible) {
          container.scrollTo({
            top: scrollOffset,
            behavior: 'smooth',
          })
        }
      } else if (attempt < 3) {
        // Retry if DOM element not rendered yet (sidebar/action button sends)
        createTimeout(() => tryScroll(attempt + 1), 100)
      } else {
        // Fallback: just scroll to bottom
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }
    }

    createTimeout(() => tryScroll(0), 50)
  }, [createTimeout])

  // Claude/ChatGPT style auto-scroll: handles all scenarios
  const handleNewMessage = useCallback(
    (isStreaming = false, isUserMessage = false, messageId?: string) => {
      const container = containerRef.current
      if (!container) return

      // If content fits on screen, don't scroll at all
      // This handles the first-message case
      if (container.scrollHeight <= container.clientHeight + 50) return

      isStreamingRef.current = isStreaming

      setLastNewMessageAt(Date.now())

      setState((prev) => ({
        ...prev,
        hasNewMessages: true,
        isStreaming,
      }))

      // Check if user is near bottom (within 150px)
      const isNearBottom = checkIfNearBottom()

      // SCENARIO 1: When user sends a message
      if (isUserMessage) {
        // Scroll to bottom so the user message + AI thinking indicator are visible.
        // For sidebar-triggered sends (watchlist, positions) the user may be scrolled
        // far up; scrollToUserMessage alone can leave us away from the bottom, which
        // then prevents streaming auto-scroll from kicking in.
        shouldAutoScrollRef.current = true
        createTimeout(() => {
          scrollToBottom("smooth")
        }, 50)
      }
      // SCENARIO 5: When new conversation starts (non-streaming, non-user message)
      else if (!isStreaming && !isUserMessage) {
        shouldAutoScrollRef.current = isNearBottom
        if (isNearBottom) {
          scrollToBottom("smooth")
        }
      }
      
      // SCENARIO 2 & 3: AI responding - continuously check and scroll if appropriate
      if (isStreaming) {
        // Before EVERY scroll attempt: check if we should auto-scroll
        // This is checked on every streaming update
        if (shouldAutoScrollRef.current && isNearBottom) {
          // User is at bottom and hasn't scrolled up: keep showing new text
          const container = containerRef.current
          if (container) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "auto",  // instant during streaming, no jank
            })
          }
        }
        // If user scrolled up during streaming: shouldAutoScrollRef.current is false (set by handleScroll)
        // So we won't scroll anymore until they scroll back to bottom
      }

      // Reset new messages flag
      createTimeout(() => {
        setState((prev) => ({ ...prev, hasNewMessages: false }))
      }, 1000)
    },
    [checkIfNearBottom, scrollToBottom, scrollToUserMessage, createTimeout],
  )

  // Reset scroll state when streaming ends
  const handleStreamingEnd = useCallback(() => {
    isStreamingRef.current = false
    // Keep shouldAutoScrollRef as is - will be reset on next user message
    setState((prev) => ({ ...prev, isStreaming: false }))
  }, [])

  // Manually reset scroll state (useful for user-initiated scroll to bottom)
  const resetScrollAwayState = useCallback(() => {
    shouldAutoScrollRef.current = true
  }, [])

  // Lightweight streaming auto-scroll: only scrolls if user hasn't scrolled away
  const handleStreamingUpdate = useCallback(() => {
    if (!shouldAutoScrollRef.current) return
    const container = containerRef.current
    if (!container) return
    if (container.scrollHeight <= container.clientHeight + 50) return
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" })
  }, [])

  // Handle long messages - DISABLED: User controls scroll position at all times
  const handleLongMessage = useCallback(
    (messageElement: HTMLElement) => {
      // REMOVED: Auto-scroll for long messages - user controls scroll position
      // if (checkIfNearBottom()) {
      //   messageElement.scrollIntoView({ behavior: scrollBehavior, block: "start" })
      // }
    },
    [],
  )

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add scroll listener with passive for better performance
    container.addEventListener("scroll", handleScroll, { passive: true })

    // Enable momentum scrolling on iOS if requested
    if (enableMomentumScrolling) {
      ;(container.style as any).webkitOverflowScrolling = "touch"
    }

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll, enableMomentumScrolling])

  const showJump = state.isStreaming && !state.isNearBottom

  const resetScrollState = useCallback(() => {
    shouldAutoScrollRef.current = true
    isStreamingRef.current = false
    lastScrollTopRef.current = 0
    setState({
      isNearBottom: true,
      isUserScrolling: false,
      hasNewMessages: false,
      isStreaming: false,
    })
  }, [])

  return {
    containerRef,
    bottomRef,
    state,
    scrollToBottom,
    handleNewMessage,
    handleStreamingUpdate,
    handleStreamingEnd,
    handleLongMessage,
    checkIfNearBottom,
    resetScrollAwayState,
    resetScrollState,
    showJump,
    lastNewMessageAt,
  }
}
