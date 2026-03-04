import { CardLayout, CARD_COLORS, PELICAN_LOGO_B64 } from "./card-layout"

export interface StatsRow {
  label: string
  value: string
  color: string
}

interface StatsTableProps {
  period: string
  rows: StatsRow[]
}

function getColor(color: string): string {
  switch (color) {
    case "green":
      return CARD_COLORS.green
    case "red":
      return CARD_COLORS.red
    case "cyan":
      return CARD_COLORS.cyan
    default:
      return CARD_COLORS.textPrimary
  }
}

export function StatsTableCard({ period, rows }: StatsTableProps) {
  // No height:100%, no flex:1 anywhere — pure top-to-bottom stacking.
  // Satori doesn't constrain flex children in nested containers,
  // so we rely on the row cap (7 OG / 11 square) to ensure
  // content fits within CardLayout's padded area.
  return (
    <CardLayout hideHeader hideFooter>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          alignItems: "center",
        }}
      >
        {/* Centered header: logo + brand */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(10, 10, 15, 0.9)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              marginBottom: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PELICAN_LOGO_B64}
              alt=""
              width={32}
              height={32}
              style={{ width: 32, height: 32, borderRadius: 6 }}
            />
          </div>
          <span
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.15em",
            }}
          >
            PELICAN
          </span>
        </div>

        {/* Context line */}
        <span
          style={{
            display: "flex",
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.45)",
            marginBottom: 16,
          }}
        >
          {period}
        </span>

        {/* Column headers */}
        <div
          style={{
            display: "flex",
            width: "100%",
            paddingBottom: 8,
            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              display: "flex",
              flex: 3,
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.35)",
              fontWeight: 600,
              letterSpacing: "0.12em",
            }}
          >
            METRIC
          </span>
          <span
            style={{
              display: "flex",
              flex: 2,
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.35)",
              fontWeight: 600,
              letterSpacing: "0.12em",
              justifyContent: "flex-end",
            }}
          >
            VALUE
          </span>
        </div>

        {/* Data rows — direct children, no wrapper div */}
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              borderBottom:
                i < rows.length - 1
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "none",
              paddingTop: 7,
              paddingBottom: 7,
            }}
          >
            <span
              style={{
                display: "flex",
                flex: 3,
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.55)",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                display: "flex",
                flex: 2,
                fontSize: 15,
                fontWeight: 700,
                color: getColor(row.color),
                fontFamily: "Geist Mono, monospace",
                justifyContent: "flex-end",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.15)",
              letterSpacing: "0.08em",
            }}
          >
            pelicantrading.ai
          </span>
        </div>
      </div>
    </CardLayout>
  )
}
