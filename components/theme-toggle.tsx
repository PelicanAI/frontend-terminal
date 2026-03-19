"use client"
import { Moon, Sun } from "@phosphor-icons/react"
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
        <Sun size={16} weight="regular" />
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
        <Sun size={16} weight="regular" className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon size={16} weight="regular" className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </IconTooltip>
  )
}
