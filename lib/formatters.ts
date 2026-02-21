/**
 * Shared formatting utilities for numbers, percentages, and currency.
 * Consolidates duplicate implementations from across the codebase.
 */

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return '---%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatPnl(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}
