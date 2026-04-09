"use client"

import { useState, useEffect, useCallback } from "react"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon as MagnifyingGlass,
  AnalyticsUpIcon as TrendUp,
  Clock01Icon as Clock,
  CommandIcon as Command,
} from "@hugeicons/core-free-icons"
import { TickerSearchResult } from "@/app/api/tickers/search/route"

interface TickerSearchProps {
  open: boolean
  onClose: () => void
}

export function TickerSearch({ open, onClose }: TickerSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TickerSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const { openWithPrompt } = usePelicanPanelContext()

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pelican_recent_searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/tickers/search?q=${encodeURIComponent(query)}&limit=8`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback((ticker: string, name: string) => {
    // Add to recent searches
    const updated = [ticker, ...recentSearches.filter((t) => t !== ticker)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('pelican_recent_searches', JSON.stringify(updated))

    // Open Pelican panel with analysis prompt
    openWithPrompt(
      ticker,
      `Analyze ${ticker} (${name}). Provide:\n1. Recent price action and key levels\n2. Technical setup and momentum\n3. Fundamental highlights\n4. Trading opportunities and risks`,
      'search',
      'search_ticker'
    )

    onClose()
    setQuery("")
  }, [recentSearches, openWithPrompt, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex].ticker, results[selectedIndex].name)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, selectedIndex, handleSelect, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <HugeiconsIcon icon={MagnifyingGlass} size={20} className="text-muted-foreground/60 flex-shrink-0" strokeWidth={1.5} color="currentColor" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Search ticker symbols..."
            autoFocus
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none text-lg"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <kbd className="px-2 py-0.5 rounded bg-muted-foreground/10 font-mono">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.ticker}
                  onClick={() => handleSelect(result.ticker, result.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    w-full px-4 py-3 flex items-center justify-between gap-4
                    transition-colors text-left
                    ${
                      index === selectedIndex
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-foreground text-base">
                        {result.ticker}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground uppercase">
                        {result.type}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-1">
                      {result.name}
                    </div>
                  </div>
                  <HugeiconsIcon icon={TrendUp} size={16} className="text-primary flex-shrink-0" strokeWidth={1.5} color="currentColor" />
                </button>
              ))}
            </div>
          )}

          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <HugeiconsIcon icon={Clock} size={12} strokeWidth={1.5} color="currentColor" />
                Recent Searches
              </div>
              {recentSearches.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setQuery(ticker)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="font-mono font-semibold text-foreground">{ticker}</span>
                  <span className="text-sm text-muted-foreground">→ Search again</span>
                </button>
              ))}
            </div>
          )}

          {!query && recentSearches.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm mb-3">
                <HugeiconsIcon icon={Command} size={16} strokeWidth={1.5} color="currentColor" />
                <span>Start typing to search</span>
              </div>
              <p className="text-xs text-muted-foreground/60">
                Search thousands of stocks, ETFs, and crypto
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted-foreground/10 font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted-foreground/10 font-mono">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted-foreground/10 font-mono">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground/60">
            Powered by Polygon.io
          </div>
        </div>
      </div>
    </div>
  )
}
