import type { ReactNode } from "react"
import { PELICAN_LOGO_B64 } from "./logo-base64"
import { CARD_BG_B64 } from "./bg-card-base64"

export const CARD_COLORS = {
  bg: "#0a0a0f",
  cardBg: "#13131a",
  border: "#1e1e2e",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  cyan: "#22d3ee",
  green: "#22c55e",
  red: "#ef4444",
  textPrimary: "#e8e8ed",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
} as const

export { PELICAN_LOGO_B64 }

interface CardLayoutProps {
  children: ReactNode
  hideHeader?: boolean
  hideFooter?: boolean
}

export function CardLayout({
  children,
  hideHeader = false,
  hideFooter = false,
}: CardLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        fontFamily: "IBM Plex Sans, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CARD_BG_B64}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Dark overlay for text readability */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.55)",
        }}
      />

      {/* Content on top */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          width: "100%",
          height: "100%",
          padding: 48,
        }}
      >
        {/* Top bar: Logo + brand */}
        {hideHeader ? null : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PELICAN_LOGO_B64}
              alt=""
              width={36}
              height={36}
              style={{ width: 36, height: 36, borderRadius: 6 }}
            />
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: CARD_COLORS.purple,
                letterSpacing: "-0.02em",
              }}
            >
              PELICAN AI
            </span>
          </div>
        )}

        {/* Card content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>

        {/* Bottom watermark */}
        {hideFooter ? null : (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "auto",
              paddingTop: 24,
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: CARD_COLORS.textMuted,
                letterSpacing: "0.05em",
              }}
            >
              pelicantrading.ai
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
