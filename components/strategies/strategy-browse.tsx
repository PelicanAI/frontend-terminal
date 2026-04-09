"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons"
import { useStrategies } from "@/hooks/use-strategies"
import { pageEnter, staggerContainer } from "@/components/ui/pelican"
import { StrategyCard } from "./strategy-card"
import { StrategyFilters } from "./strategy-filters"
import { StrategySort } from "./strategy-sort"

export function StrategyBrowse() {
  const { strategies, adoptedIds, isLoading, filters, setFilters } = useStrategies()

  const curated = useMemo(() => strategies.filter(s => s.is_curated), [strategies])
  const community = useMemo(() => strategies.filter(s => !s.is_curated && s.is_published), [strategies])

  return (
    <m.div variants={pageEnter} initial="hidden" animate="visible">
      {/* Nav bar */}
      <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
              <Image src="/pelican-logo-transparent.webp" alt="Pelican AI" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Pelican AI</span>
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">Strategies</span>
          </div>
          <Link href="/playbooks" className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <HugeiconsIcon icon={ArrowLeft} size={14} strokeWidth={2} color="currentColor" />
            My Playbooks
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Strategy Library</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          Browse curated strategies from the Pelican team and proven setups shared by the community.
        </p>

        {/* Filters + Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
          <StrategyFilters filters={filters} onChange={setFilters} />
          <div className="ml-auto">
            <StrategySort filters={filters} onChange={setFilters} />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-56 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Curated Section */}
        {!isLoading && curated.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
                Pelican Curated
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">{curated.length}</span>
            </div>
            <m.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {curated.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} isAdopted={adoptedIds.has(strategy.id)} />
              ))}
            </m.div>
          </section>
        )}

        {/* Community Section */}
        {!isLoading && community.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Community Strategies
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">{community.length}</span>
            </div>
            <m.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {community.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} isAdopted={adoptedIds.has(strategy.id)} />
              ))}
            </m.div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && strategies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-[var(--text-muted)]">No strategies found matching your filters.</p>
          </div>
        )}
      </div>
    </m.div>
  )
}
