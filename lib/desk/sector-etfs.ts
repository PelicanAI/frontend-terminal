/**
 * Sector name → SPDR sector ETF ticker mapping.
 *
 * Used by /desk Sectors view to update the K-line chart with a tradable proxy
 * when a sector tile is clicked. Names match the SectorData.name strings
 * returned by /api/market-data (see app/api/market-data/route.ts).
 */

export const SECTOR_ETF_BY_NAME: Record<string, string> = {
  Technology: "XLK",
  Financials: "XLF",
  "Financial Services": "XLF",
  Healthcare: "XLV",
  "Health Care": "XLV",
  Energy: "XLE",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  Industrials: "XLI",
  Utilities: "XLU",
  Materials: "XLB",
  "Real Estate": "XLRE",
  "Communication Services": "XLC",
}

export function sectorNameToEtf(name: string): string | null {
  return SECTOR_ETF_BY_NAME[name] ?? null
}
