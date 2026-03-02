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
  return (
    <CardLayout hideHeader hideFooter>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          alignItems: "center",
        }}
      >
        {/* Centered header: logo + brand + context */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PELICAN_LOGO_B64}
            alt=""
            width={44}
            height={44}
            style={{ width: 44, height: 44, borderRadius: 8, marginBottom: 10 }}
          />
          <span
            style={{
              display: "flex",
              fontSize: 28,
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
            fontSize: 15,
            color: "rgba(255, 255, 255, 0.5)",
            marginBottom: 20,
          }}
        >
          {period}
        </span>

        {/* Data table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            flex: 1,
          }}
        >
          {/* Column headers */}
          <div
            style={{
              display: "flex",
              paddingBottom: 10,
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
              marginBottom: 4,
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

          {/* Data rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "space-evenly",
            }}
          >
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom:
                    i < rows.length - 1
                      ? "1px solid rgba(255, 255, 255, 0.06)"
                      : "none",
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    flex: 3,
                    fontSize: 15,
                    color: "rgba(255, 255, 255, 0.55)",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    display: "flex",
                    flex: 2,
                    fontSize: 17,
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
          </div>
        </div>

        {/* Subtle footer */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            paddingTop: 12,
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.18)",
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
