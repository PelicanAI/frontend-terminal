import { CardLayout, CARD_COLORS } from "./card-layout"

interface TradeRecapProps {
  trade: {
    ticker: string
    direction: "long" | "short"
    asset_type: string
    entry_price: number
    exit_price: number | null
    pnl_amount: number | null
    pnl_percent: number | null
    r_multiple: number | null
    entry_date: string
    exit_date: string | null
    ai_grade: Record<string, unknown> | null
    setup_tags: string[] | null
  }
}

export function TradeRecapCard({ trade }: TradeRecapProps) {
  const pnlAmount = trade.pnl_amount ?? 0
  const pnlPercent = trade.pnl_percent ?? 0
  const isProfit = pnlAmount >= 0
  const pnlColor = isProfit ? CARD_COLORS.green : CARD_COLORS.red

  const gradeLabel =
    trade.ai_grade &&
    typeof trade.ai_grade === "object" &&
    "letter" in trade.ai_grade &&
    typeof (trade.ai_grade as Record<string, unknown>).letter === "string"
      ? ((trade.ai_grade as Record<string, unknown>).letter as string)
      : null

  const tags = trade.setup_tags && trade.setup_tags.length > 0 ? trade.setup_tags.slice(0, 3) : null

  const exitDate = trade.exit_date
    ? ` → ${new Date(trade.exit_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : ""

  return (
    <CardLayout>
      {/* Ticker + Direction badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: CARD_COLORS.textPrimary,
            letterSpacing: "-0.02em",
          }}
        >
          {trade.ticker}
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 16,
            fontWeight: 600,
            color: trade.direction === "long" ? CARD_COLORS.green : CARD_COLORS.red,
            backgroundColor:
              trade.direction === "long" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
            padding: "4px 12px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          {trade.direction}
        </span>
        {trade.asset_type !== "stock" ? (
          <span style={{ fontSize: 14, color: CARD_COLORS.textMuted, textTransform: "uppercase" }}>
            {trade.asset_type}
          </span>
        ) : null}
      </div>

      {/* P&L hero number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32 }}>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: pnlColor,
            letterSpacing: "-0.03em",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          {`${isProfit ? "+" : ""}${pnlPercent.toFixed(1)}%`}
        </span>
        <span
          style={{ fontSize: 28, color: pnlColor, opacity: 0.8, fontFamily: "IBM Plex Mono, monospace" }}
        >
          {`${isProfit ? "+" : ""}$${Math.abs(pnlAmount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: CARD_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Entry
          </span>
          <span style={{ fontSize: 22, color: CARD_COLORS.textPrimary, fontFamily: "IBM Plex Mono, monospace" }}>
            {`$${trade.entry_price.toFixed(2)}`}
          </span>
        </div>

        {trade.exit_price !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: CARD_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Exit
            </span>
            <span style={{ fontSize: 22, color: CARD_COLORS.textPrimary, fontFamily: "IBM Plex Mono, monospace" }}>
              {`$${trade.exit_price.toFixed(2)}`}
            </span>
          </div>
        ) : null}

        {trade.r_multiple !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: CARD_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              R-Multiple
            </span>
            <span style={{ fontSize: 22, color: pnlColor, fontFamily: "IBM Plex Mono, monospace" }}>
              {`${trade.r_multiple > 0 ? "+" : ""}${trade.r_multiple.toFixed(1)}R`}
            </span>
          </div>
        ) : null}

        {gradeLabel ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: CARD_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              AI Grade
            </span>
            <span style={{ fontSize: 22, color: CARD_COLORS.purple, fontWeight: 700 }}>
              {gradeLabel}
            </span>
          </div>
        ) : null}
      </div>

      {/* Setup tags */}
      {tags ? (
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: "flex",
                fontSize: 13,
                color: CARD_COLORS.purpleLight,
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Date range */}
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 16 }}>
        <span style={{ fontSize: 14, color: CARD_COLORS.textMuted }}>
          {`${new Date(trade.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}${exitDate}`}
        </span>
      </div>
    </CardLayout>
  )
}
