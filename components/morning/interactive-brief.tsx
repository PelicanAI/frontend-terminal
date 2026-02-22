'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  CaretDown, CaretUp, Export, Copy, FileText, XLogo,
  Moon, Target, Briefcase, Eye, Globe, Factory,
  TrendUp, Lightbulb, Warning, GameController, Article,
  BookOpenText,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatLine, applyTickerLinks } from '@/components/chat/message/format-utils'
import { SP500_TICKERS, NASDAQ_100 } from '@/lib/trading/ticker-lists'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

// Build a combined set of known tickers for detection
const KNOWN_TICKERS = new Set([...SP500_TICKERS, ...NASDAQ_100])
// Convert to array for applyTickerLinks
const TICKER_LIST = Array.from(KNOWN_TICKERS)

const BRIEF_SECTIONS = [
  { pattern: /overnight|recap/i, id: 'overnight', label: 'Overnight' },
  { pattern: /key levels/i, id: 'levels', label: 'Levels' },
  { pattern: /positions? update/i, id: 'positions', label: 'Positions' },
  { pattern: /watchlist/i, id: 'watchlist', label: 'Watchlist' },
  { pattern: /macro|catalyst/i, id: 'macro', label: 'Macro' },
  { pattern: /sector/i, id: 'sectors', label: 'Sectors' },
  { pattern: /movers/i, id: 'movers', label: 'Movers' },
  { pattern: /trade ideas/i, id: 'ideas', label: 'Ideas' },
  { pattern: /risk warning/i, id: 'risk', label: 'Risk' },
  { pattern: /game plan/i, id: 'plan', label: 'Game Plan' },
  { pattern: /setup|playbook/i, id: 'setups', label: 'Setups' },
]

const SECTION_ICONS: Record<string, React.ElementType> = {
  overnight: Moon,
  levels: Target,
  positions: Briefcase,
  watchlist: Eye,
  macro: Globe,
  sectors: Factory,
  movers: TrendUp,
  ideas: Lightbulb,
  risk: Warning,
  plan: GameController,
  setups: BookOpenText,
}

interface InteractiveBriefProps {
  content: string
  isStreaming: boolean
  onTickerClick: (ticker: string, prompt: string) => void
  onShare: (format: 'full' | 'summary' | 'twitter') => void
}

interface ParsedSection {
  id: string
  label: string
  title: string
  content: string
}

function parseSections(content: string): { intro: string; sections: ParsedSection[] } {
  // Split on markdown headers like "## 1. MARKET OVERNIGHT RECAP" or "**1. MARKET OVERNIGHT RECAP**"
  const headerRegex = /^(?:#{1,3}\s*)?(?:\*\*)?(\d+)\.\s*(.+?)(?:\*\*)?$/gm
  const parts: { index: number; num: string; title: string }[] = []

  let match
  while ((match = headerRegex.exec(content)) !== null) {
    parts.push({ index: match.index, num: match[1] ?? '', title: (match[2] ?? '').trim() })
  }

  if (parts.length === 0) {
    return { intro: content, sections: [] }
  }

  const intro = content.slice(0, parts[0]!.index).trim()
  const sections: ParsedSection[] = parts.map((part, i) => {
    const end = i < parts.length - 1 ? parts[i + 1]!.index : content.length
    const sectionContent = content.slice(part.index, end).trim()
    // Remove the header line from the content
    const firstNewline = sectionContent.indexOf('\n')
    const body = firstNewline >= 0 ? sectionContent.slice(firstNewline + 1).trim() : ''

    // Match to a known section
    const matched = BRIEF_SECTIONS.find(s => s.pattern.test(part.title))

    return {
      id: matched?.id || `section-${part.num}`,
      label: matched?.label || part.title.slice(0, 15),
      title: `${part.num}. ${part.title}`,
      content: body,
    }
  })

  return { intro, sections }
}

function renderMarkdown(text: string, enableTickers: boolean): string {
  const lines = text.split('\n')
  let html = lines.map(line => formatLine(line)).join('<br />')
  if (enableTickers) {
    html = applyTickerLinks(html, TICKER_LIST)
  }
  return html
}

/** Extract a TL;DR from the brief content — first meaningful sentence. */
function extractTldr(content: string): string {
  // Strip markdown headers and bold markers
  const cleaned = content.replace(/^#{1,3}\s*/gm, '').replace(/\*\*/g, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // Skip section numbers like "1. MARKET OVERNIGHT RECAP"
    if (/^\d+\.\s*[A-Z\s]{5,}$/.test(line)) continue
    // Skip lines that are just dashes or bullets with no real content
    if (/^[-—*]+$/.test(line)) continue
    // Found a meaningful line — take the first sentence
    const sentenceMatch = line.match(/^(.+?[.!?])(?:\s|$)/)
    if (sentenceMatch) return sentenceMatch[1]!
    // If no sentence-ending punctuation, return the whole line (capped)
    if (line.length > 10) return line.length > 120 ? line.slice(0, 117) + '...' : line
  }
  return 'Your morning market brief is ready.'
}

export function InteractiveBrief({ content, isStreaming, onTickerClick, onShare }: InteractiveBriefProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [briefCollapsed, setBriefCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pelican-brief-collapsed') === 'true'
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleBriefCollapsed = useCallback(() => {
    setBriefCollapsed(prev => {
      const next = !prev
      localStorage.setItem('pelican-brief-collapsed', String(next))
      return next
    })
  }, [])

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Parse sections (only when not streaming and content is available)
  const parsed = useMemo(() => {
    if (isStreaming || !content) return null
    return parseSections(content)
  }, [content, isStreaming])

  // Handle ticker clicks via event delegation
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('ticker-link')) return
    e.preventDefault()
    const ticker = target.getAttribute('data-ticker')
    if (ticker) {
      onTickerClick(ticker, `Deep dive on ${ticker}. What's the current setup, key levels, and any catalysts?`)
    }
  }, [onTickerClick])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [handleClick])

  const tldr = useMemo(() => {
    if (!content) return ''
    return extractTldr(content)
  }, [content])

  // During streaming, render raw content (no section parsing)
  if (isStreaming || !parsed || parsed.sections.length === 0) {
    const html = content
      ? content.split('\n').map(line => formatLine(line)).join('<br />')
      : ''
    return (
      <div ref={containerRef}>
        <div
          className="text-[var(--text-secondary)] leading-relaxed space-y-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Overall brief collapse header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={toggleBriefCollapsed}
          className="flex items-center gap-1.5 group"
          aria-label={briefCollapsed ? 'Expand brief' : 'Collapse brief'}
        >
          <CaretDown
            className={cn(
              "h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0",
              briefCollapsed && "-rotate-90"
            )}
            weight="bold"
          />
          <span className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider">
            {briefCollapsed ? 'Show Brief' : 'Hide Brief'}
          </span>
        </button>
      </div>

      {/* TL;DR card — always visible */}
      {tldr && (
        <div className="rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-primary)]/20 px-4 py-3 mb-3">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {tldr}
          </p>
        </div>
      )}

      {/* Collapsible brief body */}
      <AnimatePresence initial={false}>
        {!briefCollapsed && (
          <motion.div
            key="brief-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-[70vh] overflow-y-auto">
              {/* Section TOC + controls */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                {parsed.sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      document.getElementById(`brief-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="px-2 py-0.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {s.label}
                  </button>
                ))}

                {/* Collapse/Expand all + Share */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allExpanded = collapsedSections.size === 0
                      if (allExpanded) {
                        setCollapsedSections(new Set(parsed.sections.map(s => s.id)))
                      } else {
                        setCollapsedSections(new Set())
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {collapsedSections.size === 0 ? (
                      <><CaretUp size={12} weight="bold" /> Collapse all</>
                    ) : (
                      <><CaretDown size={12} weight="bold" /> Expand all</>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                        <Export className="h-3.5 w-3.5" weight="regular" />
                        Share
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onShare('full')}>
                        <Copy className="h-3.5 w-3.5 mr-2" weight="regular" />
                        Copy Full Brief
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare('summary')}>
                        <FileText className="h-3.5 w-3.5 mr-2" weight="regular" />
                        Copy Summary
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare('twitter')}>
                        <XLogo className="h-3.5 w-3.5 mr-2" weight="regular" />
                        Copy for X/Twitter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Intro content (before first section) */}
              {parsed.intro && (
                <div
                  className="text-[var(--text-secondary)] leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(parsed.intro, true) }}
                />
              )}

              {/* Sections */}
              <div className="space-y-2">
                {parsed.sections.map(section => {
                  const isCollapsed = collapsedSections.has(section.id)
                  const SectionIcon = SECTION_ICONS[section.id] || Article
                  return (
                    <div
                      key={section.id}
                      id={`brief-${section.id}`}
                      className={cn(
                        "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden",
                        section.id === 'setups' && "border-l-2 border-l-[var(--accent-primary)]"
                      )}
                    >
                      {/* Section header (clickable to collapse) */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <SectionIcon
                          size={16}
                          weight="regular"
                          className="text-[var(--accent-primary)] flex-shrink-0"
                        />
                        <span className="font-medium text-sm text-[var(--text-primary)] flex-1">
                          {section.title}
                        </span>
                        <CaretDown
                          size={14}
                          weight="bold"
                          className={cn(
                            "text-[var(--text-muted)] transition-transform duration-200",
                            !isCollapsed && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Section content */}
                      {!isCollapsed && (
                        <div className="px-4 pb-4 pt-0 border-t border-[var(--border-subtle)]">
                          <div
                            className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-2 pt-3
                                       [&_strong]:text-[var(--text-primary)] [&_strong]:font-medium
                                       [&_code]:text-[var(--accent-primary)] [&_code]:bg-[var(--accent-muted)] [&_code]:px-1 [&_code]:rounded
                                       [&_ul]:space-y-1 [&_li]:text-[var(--text-secondary)]"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content, true) }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
