"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye, ChartBar, ChatCircle, Star,
  Lightning, SignIn, Users,
  ShieldCheck, Target, SignOut as SignOutIcon, Warning, CheckCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { pageEnter, tabContent } from "@/components/ui/pelican"
import { useStrategyDetail } from "@/hooks/use-strategies"
import { AdoptButton } from "./adopt-button"
import { StrategyStats } from "./strategy-stats"
import { BacktestChart } from "./backtest-chart"
import { StrategyReviews } from "./strategy-reviews"
import { ShareButton } from "./share-button"
import type { Playbook } from "@/types/trading"

type TabKey = "overview" | "stats" | "reviews"

const tabs: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "stats", label: "Stats & Backtest", icon: ChartBar },
  { key: "reviews", label: "Reviews", icon: ChatCircle },
]

interface StrategyDetailProps {
  slug: string
}

const CATEGORY_LABELS: Record<string, string> = {
  momentum: "Momentum",
  mean_reversion: "Mean Reversion",
  event_driven: "Event-Driven",
  options: "Options",
}

export function StrategyDetail({ slug }: StrategyDetailProps) {
  const { strategy, backtests, ratings, adoption, isLoading } = useStrategyDetail(slug)
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-4" />
        <div className="h-12 w-96 bg-[var(--bg-surface)] rounded-lg animate-pulse mb-8" />
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-lg text-[var(--text-muted)]">Strategy not found.</p>
        <Link href="/strategies" className="text-sm text-[var(--accent-primary)] hover:underline mt-4 inline-block">
          Back to Strategy Library
        </Link>
      </div>
    )
  }

  return (
    <motion.div variants={pageEnter} initial="hidden" animate="visible">
      {/* Nav bar */}
      <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Image src="/pelican-logo-transparent.webp" alt="Pelican AI" width={32} height={32} className="w-8 h-8 object-contain" />
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <Link href="/strategies" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Strategies
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">{strategy.name}</span>
          </div>
          <ShareButton slug={strategy.slug!} name={strategy.name} />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {strategy.is_curated && (
                <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md">
                  <Lightning size={12} weight="fill" />
                  Curated
                </span>
              )}
              {strategy.category && (
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md">
                  {CATEGORY_LABELS[strategy.category] || strategy.category}
                </span>
              )}
              {strategy.difficulty && (
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md capitalize">
                  {strategy.difficulty}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{strategy.name}</h1>
            {strategy.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">{strategy.description}</p>
            )}
            {/* Meta row */}
            <div className="flex items-center gap-4 mt-3">
              {strategy.author_display_name && (
                <span className="text-xs text-[var(--text-muted)]">
                  by {strategy.author_display_name}
                </span>
              )}
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Users size={13} />
                <span className="font-mono tabular-nums">{strategy.adoption_count}</span>
                <span>users</span>
              </div>
              {strategy.community_rating != null && strategy.rating_count > 0 && (
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Star size={13} weight="fill" className="text-amber-400" />
                  <span className="font-mono tabular-nums">{strategy.community_rating.toFixed(1)}</span>
                  <span>({strategy.rating_count})</span>
                </div>
              )}
              {strategy.stats_verified && (
                <div className="flex items-center gap-1 text-xs text-[var(--data-positive)]">
                  <ShieldCheck size={13} weight="fill" />
                  <span>Stats Verified</span>
                </div>
              )}
            </div>
          </div>
          <AdoptButton strategy={strategy} adoption={adoption} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide border-b border-[var(--border-subtle)]">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 relative",
                activeTab === key
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={16} weight={activeTab === key ? "fill" : "regular"} />
              {label}
              {key === "reviews" && ratings.length > 0 && (
                <span className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">({ratings.length})</span>
              )}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <OverviewTab strategy={strategy} />
            </motion.div>
          )}
          {activeTab === "stats" && (
            <motion.div key="stats" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <StrategyStats strategy={strategy} />
              {backtests.length > 0 && <BacktestChart backtests={backtests} />}
            </motion.div>
          )}
          {activeTab === "reviews" && (
            <motion.div key="reviews" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <StrategyReviews strategy={strategy} ratings={ratings} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function OverviewTab({ strategy }: { strategy: Playbook }) {
  const ruleCards = [
    { label: "Entry Rules", content: strategy.entry_rules, icon: SignIn },
    { label: "Exit Rules", content: strategy.exit_rules, icon: SignOutIcon },
    { label: "Risk Rules", content: strategy.risk_rules, icon: Warning },
    { label: "Market Conditions", content: strategy.market_conditions, icon: Target },
  ].filter((r) => r.content)

  return (
    <div className="space-y-6">
      {/* Best/Avoid When */}
      {(strategy.best_when || strategy.avoid_when) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategy.best_when && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} weight="fill" className="text-[var(--data-positive)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--data-positive)]">Best When</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{strategy.best_when}</p>
            </div>
          )}
          {strategy.avoid_when && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Warning size={16} weight="fill" className="text-[var(--data-negative)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--data-negative)]">Avoid When</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{strategy.avoid_when}</p>
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      {ruleCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ruleCards.map(({ label, content, icon: Icon }) => (
            <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                  <Icon size={18} weight="regular" className="text-[var(--accent-primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      {strategy.checklist && strategy.checklist.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Pre-Trade Checklist</h3>
          <ul className="space-y-2">
            {strategy.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle size={16} weight="regular" className="text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended assets + timeframe */}
      {(strategy.recommended_assets?.length || strategy.timeframe) && (
        <div className="flex flex-wrap gap-2">
          {strategy.timeframe && (
            <span className="text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              {strategy.timeframe}
            </span>
          )}
          {strategy.recommended_assets?.map((asset) => (
            <span key={asset} className="text-xs px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              {asset}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
