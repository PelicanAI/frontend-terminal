"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check, ArrowSquareOut } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useAdoptTemplate } from "@/hooks/use-strategies"
import { createClient } from "@/lib/supabase/client"
import type { Playbook, TemplateAdoption } from "@/types/trading"

interface AdoptButtonProps {
  strategy: Playbook
  adoption: TemplateAdoption | null
}

export function AdoptButton({ strategy, adoption }: AdoptButtonProps) {
  const router = useRouter()
  const { adopt, isAdopting } = useAdoptTemplate()
  const [result, setResult] = useState<{ success: boolean; playbook_id?: string } | null>(null)

  const alreadyAdopted = !!adoption || result?.success

  const handleAdopt = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/auth/login?redirectTo=/strategies/${strategy.slug}`)
      return
    }

    const res = await adopt(strategy.id)
    setResult(res)
  }

  if (alreadyAdopted) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 text-sm text-[var(--data-positive)]">
          <Check size={16} weight="bold" />
          Added to Playbooks
        </div>
        <button
          onClick={() => router.push('/playbooks')}
          className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
        >
          <ArrowSquareOut size={12} />
          View in Playbooks
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAdopt}
      disabled={isAdopting}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
        "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent-primary)]/20",
        "active:scale-[0.98]",
        isAdopting && "opacity-60 cursor-not-allowed"
      )}
    >
      <Plus size={16} weight="bold" />
      {isAdopting ? "Adding..." : "Use This Strategy"}
    </button>
  )
}
