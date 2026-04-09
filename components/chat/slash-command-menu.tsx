"use client"

import { useEffect, useRef, useCallback } from "react"
import { m, AnimatePresence } from "framer-motion"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Search01Icon as MagnifyingGlass,
  ChartLineData01Icon as ChartLineUp,
  BalanceScaleIcon as Scales,
  CalendarCheckIn01Icon as CalendarCheck,
  BarChartIcon as ChartBar,
} from "@hugeicons/core-free-icons"

export interface SlashCommand {
  command: string
  args: string
  description: string
  icon: IconSvgElement
  prompt: (arg: string) => string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/scan",
    args: "[ticker]",
    description: "Deep scan a position",
    icon: MagnifyingGlass,
    prompt: (arg: string) =>
      `Scan my ${arg} position in detail — entry quality, current levels, risk, and what to watch`,
  },
  {
    command: "/grade",
    args: "[ticker]",
    description: "Grade a recent trade",
    icon: ChartLineUp,
    prompt: (arg: string) =>
      `Grade my most recent ${arg} trade. What did I do well? What could I improve?`,
  },
  {
    command: "/compare",
    args: "[A] vs [B]",
    description: "Compare two assets",
    icon: Scales,
    prompt: (args: string) =>
      `Compare ${args} — which is the better trade right now and why?`,
  },
  {
    command: "/plan",
    args: "",
    description: "Tomorrow's trading plan",
    icon: CalendarCheck,
    prompt: () =>
      `Help me build my trading plan for tomorrow based on my current positions and market conditions`,
  },
  {
    command: "/review",
    args: "",
    description: "Today's performance",
    icon: ChartBar,
    prompt: () =>
      `Review my trading performance today. What happened, what I did well, and what to improve`,
  },
]

interface SlashCommandMenuProps {
  inputValue: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  visible: boolean
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function SlashCommandMenu({
  inputValue,
  onSelect,
  onClose,
  visible,
  selectedIndex,
  onSelectedIndexChange,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Filter commands based on input
  const filteredCommands = getFilteredCommands(inputValue)

  // Scroll selected item into view
  useEffect(() => {
    if (visible && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex, visible])

  // Reset index when filtered list changes
  useEffect(() => {
    onSelectedIndexChange(0)
  }, [filteredCommands.length, onSelectedIndexChange])

  // Click outside to close
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [visible, onClose])

  const handleItemClick = useCallback(
    (cmd: SlashCommand) => {
      onSelect(cmd)
    },
    [onSelect],
  )

  if (filteredCommands.length === 0) return null

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          ref={menuRef}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute bottom-full left-0 mb-2 w-72 z-50 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1.5 overflow-hidden"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Commands
          </div>
          {filteredCommands.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <div
                key={cmd.command}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleItemClick(cmd)
                }}
                onMouseEnter={() => onSelectedIndexChange(i)}
                className={`
                  px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 cursor-pointer
                  transition-colors duration-100
                  ${
                    i === selectedIndex
                      ? "bg-[var(--bg-surface)]"
                      : "hover:bg-[var(--bg-surface)]"
                  }
                `}
              >
                <HugeiconsIcon icon={Icon} size={18} className="flex-shrink-0 text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[var(--accent-primary)]">
                      {cmd.command}
                    </span>
                    {cmd.args && (
                      <span className="text-[var(--text-muted)] text-xs">
                        {cmd.args}
                      </span>
                    )}
                  </div>
                  <span className="text-[var(--text-muted)] text-xs truncate">
                    {cmd.description}
                  </span>
                </div>
              </div>
            )
          })}
        </m.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Parse the input to determine if we're in slash-command mode.
 * Returns the typed command prefix (e.g. "/sc" or "/scan ").
 */
export function getSlashCommandPrefix(input: string): string | null {
  if (!input.startsWith("/")) return null
  return input
}

/**
 * Get filtered commands based on current input.
 */
export function getFilteredCommands(input: string): SlashCommand[] {
  const prefix = getSlashCommandPrefix(input)
  if (prefix === null) return []

  // Extract just the command part (before any space)
  const spaceIdx = prefix.indexOf(" ")
  const typedCmd = spaceIdx === -1 ? prefix : prefix.slice(0, spaceIdx)

  // If user has typed a space, they've selected a command — don't show menu
  if (spaceIdx !== -1) return []

  return SLASH_COMMANDS.filter((cmd) =>
    cmd.command.startsWith(typedCmd.toLowerCase()),
  )
}

/**
 * Check if the input is a complete slash command ready to send.
 * Returns the generated prompt string or null.
 */
export function resolveSlashCommand(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith("/")) return null

  const spaceIdx = trimmed.indexOf(" ")
  const cmdStr = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const argStr = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim()

  const command = SLASH_COMMANDS.find((c) => c.command === cmdStr.toLowerCase())
  if (!command) return null

  // No-arg commands: ready immediately
  if (!command.args) {
    return command.prompt("")
  }

  // Arg commands: need args
  if (!argStr) return null
  return command.prompt(argStr)
}
