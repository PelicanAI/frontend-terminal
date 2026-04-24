import { useReducedMotion as useFramerReducedMotion } from "framer-motion"

export const DURATION = {
  instant: 0.1,
  micro: 0.15,
  small: 0.25,
  medium: 0.4,
  slow: 0.6,
  ambient: 2,
} as const

export const EASING = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
} as const

export const STAGGER = {
  tight: 0.03,
  normal: 0.06,
  loose: 0.1,
} as const

export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false
}

export const fmt = {
  currency: (value: number, decimals = 2) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value),

  pnl: (value: number) => {
    const sign = value > 0 ? "+" : ""
    return `${sign}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`
  },

  percent: (value: number, decimals = 2) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`,

  price: (value: number, decimals = 2) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),

  compact: (value: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value),

  integer: (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value),
}
