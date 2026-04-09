"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon as MagnifyingGlass } from "@hugeicons/core-free-icons"
import { TickerSearchResult } from "@/app/api/tickers/search/route"

interface TickerAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (ticker: TickerSearchResult) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search ticker...",
  className = "",
  autoFocus = false,
}: TickerAutocompleteProps) {
  const [results, setResults] = useState<TickerSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/tickers/search?q=${encodeURIComponent(value)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
          setIsOpen(data.results?.length > 0)
          setSelectedIndex(0)
        }
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  // Update dropdown position when opened or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current && isOpen) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        resultsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: TickerSearchResult) => {
    onChange(result.ticker)
    onSelect?.(result)
    setIsOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <HugeiconsIcon icon={MagnifyingGlass} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full pl-10 pr-4 py-2 rounded-lg
            bg-[var(--bg-surface)] border border-[var(--border-subtle)]
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]
            transition-all
            ${className}
          `}
        />
      </div>

      {/* Results dropdown - rendered via portal to avoid z-index issues */}
      {isOpen && results.length > 0 && typeof window !== 'undefined' && createPortal(
        <div
          ref={resultsRef}
          className="fixed z-50 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {results.map((result, index) => (
            <button
              key={result.ticker}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full px-4 py-2.5 text-left
                flex items-center justify-between gap-2
                transition-colors duration-150
                ${
                  index === selectedIndex
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold text-sm">{result.ticker}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{result.name}</div>
              </div>
              <div className="text-[10px] text-[var(--text-disabled)] uppercase font-mono">{result.type}</div>
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
