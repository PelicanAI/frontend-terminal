"use client"

import { useState, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Mortarboard01Icon as GraduationCap } from '@hugeicons/core-free-icons'

const STORAGE_KEY = 'pelican-beginner-mode'

interface BeginnerToggleProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function BeginnerToggle({ value, onChange }: BeginnerToggleProps) {
  return (
    <button
      onClick={() => {
        const next = !value
        onChange(next)
        try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{
        background: value ? 'var(--accent-indigo)' : 'var(--bg-base)',
        color: value ? 'white' : 'var(--text-secondary)',
        border: `1px solid ${value ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
      }}
    >
      <HugeiconsIcon icon={GraduationCap} className="w-3.5 h-3.5" strokeWidth={1.5} color="currentColor" />
      Beginner Mode
    </button>
  )
}

export function useBeginnerMode(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setEnabled(true)
    } catch { /* noop */ }
  }, [])

  return [enabled, setEnabled]
}
