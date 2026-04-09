"use client"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoonIcon as Moon, Sun01Icon as Sun } from "@hugeicons/core-free-icons"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { IconTooltip } from "@/components/ui/icon-tooltip"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <HugeiconsIcon icon={Sun} size={16} strokeWidth={1.5} color="currentColor" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <IconTooltip label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-8 w-8 hover:bg-sidebar-accent/50"
      >
        <HugeiconsIcon icon={Sun} size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.5} color="currentColor" />
        <HugeiconsIcon icon={Moon} size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} color="currentColor" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </IconTooltip>
  )
}
