import { CardLayout, CARD_COLORS } from "./card-layout"

interface PelicanInsightProps {
  headline: string
  tickers: string[]
}

function parseTextToLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function isBulletLine(line: string): boolean {
  return /^[•\-*]\s/.test(line) || /^\d+[.)]\s/.test(line)
}

function cleanBullet(line: string): string {
  return line.replace(/^[•\-*]\s+/, "").replace(/^\d+[.)]\s+/, "")
}

function getDynamicFontSize(text: string): number {
  const lines = parseTextToLines(text)
  const charCount = text.length
  const lineCount = lines.length

  if (lineCount > 12 || charCount > 600) return 15
  if (lineCount > 8 || charCount > 400) return 17
  if (lineCount > 5 || charCount > 200) return 20
  if (charCount > 100) return 24
  return 30
}

export function PelicanInsightCard({ headline, tickers }: PelicanInsightProps) {
  const fontSize = getDynamicFontSize(headline)
  const lines = parseTextToLines(headline)

  return (
    <CardLayout>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          justifyContent: "center",
        }}
      >
        {lines.map((line, i) => {
          const bullet = isBulletLine(line)
          const cleaned = bullet ? cleanBullet(line) : line
          const isLabel = /^[A-Z][\w\s&]+:/.test(line) && line.length < 60

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                paddingLeft: bullet ? 16 : 0,
              }}
            >
              {bullet ? (
                <span
                  style={{
                    color: CARD_COLORS.purple,
                    marginRight: 8,
                    fontSize,
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
              ) : null}
              <span
                style={{
                  fontSize,
                  fontWeight: isLabel ? 700 : 400,
                  color: isLabel ? "#ffffff" : CARD_COLORS.textPrimary,
                  lineHeight: 1.5,
                }}
              >
                {cleaned}
              </span>
            </div>
          )
        })}

        {tickers.length > 0 ? (
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {tickers.map((ticker, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  fontSize: 16,
                  fontWeight: 600,
                  color: CARD_COLORS.textSecondary,
                  backgroundColor: CARD_COLORS.cardBg,
                  border: `1px solid ${CARD_COLORS.border}`,
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                {`$${ticker}`}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "auto",
        }}
      >
        <span style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.05em" }}>
          Analysis by Pelican AI
        </span>
      </div>
    </CardLayout>
  )
}
