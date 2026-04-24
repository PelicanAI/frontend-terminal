"use client"

import { useEffect, useState } from "react"
import { NumberTicker } from "@/components/motion/number-ticker"
import { PriceFlash } from "@/components/motion/price-flash"
import { PressScale } from "@/components/motion/press-scale"
import {
  ShimmerSkeleton,
  SkeletonNumberTicker,
  SkeletonRow,
} from "@/components/motion/shimmer-skeleton"
import { TabIndicator } from "@/components/motion/tab-indicator"
import { fmt } from "@/lib/motion"

export function MotionPreview() {
  const [price, setPrice] = useState(150)
  const [pnl, setPnl] = useState(2500)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const id = setInterval(() => {
      setPrice((current) => current + (Math.random() - 0.5) * 5)
      setPnl((current) => current + (Math.random() - 0.5) * 200)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen space-y-10 bg-[var(--background)] p-8">
      <header>
        <h1 className="text-xl font-medium text-[var(--foreground)]">Motion primitives preview</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Toggle OS reduced motion to verify graceful degradation.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">NumberTicker + PriceFlash</h2>
        <div className="flex items-center gap-6 font-mono">
          <PriceFlash value={price}>
            <NumberTicker value={price} format={fmt.price} />
          </PriceFlash>
          <PriceFlash value={pnl}>
            <NumberTicker value={pnl} format={fmt.pnl} />
          </PriceFlash>
          <NumberTicker value={Math.round(price * 100)} format={fmt.integer} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">PressScale</h2>
        <div className="flex gap-3">
          <PressScale>
            <button className="rounded-md bg-violet-500 px-4 py-2 text-sm text-white">Primary</button>
          </PressScale>
          <PressScale>
            <button className="rounded-md border border-[var(--border)] px-4 py-2 text-sm">Secondary</button>
          </PressScale>
          <PressScale disabled>
            <button className="rounded-md border border-[var(--border)] px-4 py-2 text-sm" disabled>
              Disabled
            </button>
          </PressScale>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">ShimmerSkeleton</h2>
        <div className="max-w-md space-y-3">
          <ShimmerSkeleton width="60%" height="1.2em" />
          <SkeletonRow cells={[{ width: "4ch" }, { width: "8ch" }, { width: "6ch" }, { width: "6ch" }]} />
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">Price:</span>
            <SkeletonNumberTicker />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">TabIndicator</h2>
        <TabIndicator
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "positions", label: "Positions" },
            { id: "history", label: "History" },
            { id: "insights", label: "Insights" },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Active: {activeTab}</p>
      </section>
    </div>
  )
}
