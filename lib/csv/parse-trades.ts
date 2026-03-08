// ---------------------------------------------------------------------------
// lib/csv/parse-trades.ts — Client-side CSV parser with broker auto-detection
// No external dependencies. Handles quoted fields, escaped quotes, etc.
// ---------------------------------------------------------------------------

/* ----------------------------- Interfaces -------------------------------- */

export interface RawCSVRow {
  [key: string]: string
}

export interface ParsedTrade {
  ticker: string
  asset_type: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  take_profit: number | null
  entry_date: string // ISO date YYYY-MM-DD
  exit_date: string | null
  notes: string | null
  commission: number | null
  status: 'open' | 'closed'
  position_size_usd: number
}

export interface ColumnMapping {
  ticker: string | null
  direction: string | null
  quantity: string | null
  entry_price: string | null
  exit_price: string | null
  stop_loss: string | null
  take_profit: string | null
  entry_date: string | null
  exit_date: string | null
  asset_type: string | null
  notes: string | null
  commission: string | null
}

export interface CSVParseResult {
  headers: string[]
  rows: RawCSVRow[]
  detectedBroker: string | null
  suggestedMapping: ColumnMapping
}

export interface RowError {
  row: number
  message: string
}

/* ----------------------- Column-matching patterns ------------------------ */

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp> = {
  ticker:
    /^(symbol|ticker|instrument|stock|asset|underlying|security|name|contract)/i,
  direction:
    /^(side|direction|action|type|buy.?sell|b.?s|order.?side|trade.?type|trans)/i,
  quantity:
    /^(qty|quantity|shares|size|amount|volume|filled|lots|contracts|units|position.?size)/i,
  entry_price:
    /^(entry.?price|price|avg.?price|fill.?price|exec.?price|cost|average|open.?price|bought|entry)/i,
  exit_price: /^(exit.?price|close.?price|closing|exit|sold|sell.?price)/i,
  stop_loss: /^(stop|stop.?loss|sl|protective.?stop)/i,
  take_profit: /^(target|take.?profit|tp|profit.?target)/i,
  entry_date:
    /^(date|entry.?date|trade.?date|open.?date|exec.?time|time|timestamp|fill.?time|created|activity.?date)/i,
  exit_date: /^(exit.?date|close.?date|closed|closing.?date)/i,
  asset_type:
    /^(asset.?type|type|class|category|instrument.?type|product|market)/i,
  notes: /^(notes?|comment|memo|description|remarks)/i,
  commission: /^(commission|fee|fees|comm|charges|cost|brokerage)/i,
}

/**
 * Priority order matters: more specific patterns should be checked first so
 * they are not swallowed by a more generic pattern (e.g. "exit_price" before
 * "entry_price", "exit_date" before "entry_date", "commission" before a
 * generic "cost" match on entry_price, etc.).
 */
const MAPPING_PRIORITY: (keyof ColumnMapping)[] = [
  'ticker',
  'direction',
  'quantity',
  'exit_price',
  'stop_loss',
  'take_profit',
  'entry_price',
  'exit_date',
  'entry_date',
  'asset_type',
  'notes',
  'commission',
]

/* ----------------------- Broker detection -------------------------------- */

interface BrokerSignature {
  name: string
  test: (headers: string[]) => boolean
}

const BROKER_SIGNATURES: BrokerSignature[] = [
  {
    name: 'Thinkorswim',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase().includes('exec time') ||
          c.toLowerCase() === 'spread'
      ),
  },
  {
    name: 'Interactive Brokers',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase() === 'tradeid' ||
          c.toLowerCase() === 'ibcommission'
      ),
  },
  {
    name: 'Webull',
    test: (h) => {
      const lower = h.map((c) => c.toLowerCase())
      return lower.includes('filled') && lower.includes('avg price')
    },
  },
  {
    name: 'Robinhood',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase() === 'activity date' ||
          c.toLowerCase() === 'trans code'
      ),
  },
  {
    name: 'TradeStation',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase() === 'filled qty' ||
          c.toLowerCase() === 'route'
      ),
  },
  {
    name: 'NinjaTrader',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase() === 'entry price' ||
          c.toLowerCase() === 'entry time'
      ),
  },
  {
    name: 'Tradovate',
    test: (h) =>
      h.some(
        (c) =>
          c.toLowerCase() === 'fillpx' || c.toLowerCase() === 'ordtype'
      ),
  },
]

/* ============================= CSV Parser ================================ */

/**
 * Parse a single CSV line respecting quoted fields and escaped quotes ("").
 * Returns an array of field values.
 */
function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        // Peek next char — escaped quote or end of quoted field
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        // End of quoted section
        inQuotes = false
        i++
        continue
      }
      current += ch
      i++
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
        continue
      }
      if (ch === ',') {
        fields.push(current.trim())
        current = ''
        i++
        continue
      }
      current += ch
      i++
    }
  }

  // Push the last field
  fields.push(current.trim())

  return fields
}

/**
 * Split raw CSV text into lines, handling \r\n and \n.
 * Drops truly empty lines (after trim) but keeps rows that have commas
 * (they may represent rows with all-empty fields, which we want to skip later).
 */
function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)
}

/* ------------------------------ parseCSV --------------------------------- */

export function parseCSV(text: string): CSVParseResult {
  const lines = splitLines(text)

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedBroker: null,
      suggestedMapping: emptyMapping(),
    }
  }

  const headers = parseLine(lines[0]!)

  const rows: RawCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]!)
    // Skip rows that are completely empty values
    if (values.every((v) => v === '')) continue

    const row: RawCSVRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = j < values.length ? values[j]! : ''
    }
    rows.push(row)
  }

  // Detect broker
  const detectedBroker = detectBroker(headers)

  // Build suggested mapping
  const suggestedMapping = buildMapping(headers)

  return { headers, rows, detectedBroker, suggestedMapping }
}

/* ----------------------- Mapping helpers --------------------------------- */

function emptyMapping(): ColumnMapping {
  return {
    ticker: null,
    direction: null,
    quantity: null,
    entry_price: null,
    exit_price: null,
    stop_loss: null,
    take_profit: null,
    entry_date: null,
    exit_date: null,
    asset_type: null,
    notes: null,
    commission: null,
  }
}

function detectBroker(headers: string[]): string | null {
  for (const sig of BROKER_SIGNATURES) {
    if (sig.test(headers)) return sig.name
  }
  return 'Generic CSV'
}

function buildMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping()
  const claimed = new Set<string>()

  // Walk fields in priority order so more-specific patterns win first
  for (const field of MAPPING_PRIORITY) {
    const pattern = COLUMN_PATTERNS[field]
    for (const header of headers) {
      if (claimed.has(header)) continue
      if (pattern.test(header)) {
        mapping[field] = header
        claimed.add(header)
        break
      }
    }
  }

  return mapping
}

/* ===================== Value parsers / normalizers ======================== */

/**
 * Parse a numeric string. Handles currency symbols ($, EUR, GBP), commas,
 * spaces, and parenthetical negatives like (100.50) => -100.50.
 * Returns null for empty / unparseable values.
 */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === null) return null
  let v = value.trim()
  if (v === '') return null

  // Detect parenthetical negatives: (123.45) => -123.45
  const parenMatch = /^\((.+)\)$/.exec(v)
  if (parenMatch) {
    v = '-' + parenMatch[1]
  }

  // Strip currency symbols and whitespace
  v = v.replace(/[$€£¥₹]/g, '').replace(/\s/g, '')

  // Strip commas used as thousands separators
  v = v.replace(/,/g, '')

  const num = Number(v)
  if (isNaN(num) || !isFinite(num)) return null
  return num
}

/**
 * Parse a date string into ISO YYYY-MM-DD format.
 * Supported formats:
 *   - ISO: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
 *   - US:  MM/DD/YYYY or M/D/YYYY
 *   - EU:  DD/MM/YYYY (when first segment > 12)
 *   - Dash variants: MM-DD-YYYY, DD-MM-YYYY
 * Returns null for invalid/empty values.
 */
export function parseDate(value: string | undefined): string | null {
  if (value === undefined || value === null) return null
  const v = value.trim()
  if (v === '') return null

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = Number(isoMatch[2])
    const d = Number(isoMatch[3])
    if (isValidDate(y, m, d)) return formatISODate(y, m, d)
    return null
  }

  // Slash-separated: M/D/YYYY or D/M/YYYY
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (slashMatch) {
    return resolveAmbiguousDate(
      Number(slashMatch[1]),
      Number(slashMatch[2]),
      Number(slashMatch[3])
    )
  }

  // Dash-separated (non-ISO): M-D-YYYY or D-M-YYYY
  const dashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v)
  if (dashMatch) {
    return resolveAmbiguousDate(
      Number(dashMatch[1]),
      Number(dashMatch[2]),
      Number(dashMatch[3])
    )
  }

  return null
}

/**
 * Given first/second/year from a date like 01/15/2024 or 15/01/2024,
 * decide whether it's MM/DD or DD/MM. If first > 12 it must be DD/MM.
 * Otherwise assume US format MM/DD.
 */
function resolveAmbiguousDate(
  first: number,
  second: number,
  year: number
): string | null {
  if (first > 12) {
    // Must be DD/MM/YYYY (EU)
    const day = first
    const month = second
    if (isValidDate(year, month, day)) return formatISODate(year, month, day)
    return null
  }

  // Assume US: MM/DD/YYYY
  const month = first
  const day = second
  if (isValidDate(year, month, day)) return formatISODate(year, month, day)

  // Fallback: try EU interpretation
  if (isValidDate(year, second, first)) return formatISODate(year, second, first)

  return null
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  if (year < 1900 || year > 2100) return false
  // Use Date to validate day-of-month (handles leap years, 30/31 day months)
  const d = new Date(year, month - 1, day)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

function formatISODate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/* ---------------------- Direction normalization --------------------------- */

const LONG_PATTERNS = /^(buy|long|b|bot|bought|cover|buy\s*to\s*open|buy\s*to\s*cover|buy_to_open|buy_to_cover)$/i
const SHORT_PATTERNS = /^(sell\s*short|short\s*sell|sell|short|s|sold|sld|sell\s*to\s*open|sell_to_open|sell_short|short_sell)$/i

function normalizeDirection(raw: string): 'long' | 'short' | null {
  const v = raw.trim()
  if (LONG_PATTERNS.test(v)) return 'long'
  if (SHORT_PATTERNS.test(v)) return 'short'
  return null
}

/* ---------------------- Asset type normalization -------------------------- */

function normalizeAssetType(raw: string | undefined): string {
  if (!raw) return 'stock'
  const v = raw.trim().toLowerCase()

  if (/^(crypto|coin|cryptocurrency)$/.test(v)) return 'crypto'
  if (/^(forex|fx|currency)$/.test(v)) return 'forex'
  if (/^(option|options|call|put)$/.test(v)) return 'option'
  if (/^(future|futures)$/.test(v)) return 'future'
  if (/^etf$/.test(v)) return 'etf'

  return 'stock'
}

/* ======================== mapRowsToTrades ================================ */

function getField(
  row: RawCSVRow,
  columnName: string | null
): string | undefined {
  if (!columnName) return undefined
  return row[columnName]
}

export function mapRowsToTrades(
  rows: RawCSVRow[],
  mapping: ColumnMapping
): { trades: ParsedTrade[]; errors: RowError[] } {
  const trades: ParsedTrade[] = []
  const errors: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1 // 1-indexed, not counting header
    const row = rows[i]!

    // --- Required: ticker ---
    const ticker = getField(row, mapping.ticker)?.trim() ?? ''
    if (!ticker) {
      errors.push({ row: rowNum, message: 'Missing or empty ticker' })
      continue
    }

    // --- Required: quantity ---
    const rawQty = parseNumber(getField(row, mapping.quantity))
    if (rawQty === null || Math.abs(rawQty) === 0) {
      errors.push({
        row: rowNum,
        message: `Invalid or zero quantity: "${getField(row, mapping.quantity) ?? ''}"`,
      })
      continue
    }
    const quantity = Math.abs(rawQty)

    // --- Required: entry_price ---
    const entryPrice = parseNumber(getField(row, mapping.entry_price))
    if (entryPrice === null || entryPrice <= 0) {
      errors.push({
        row: rowNum,
        message: `Invalid or non-positive entry price: "${getField(row, mapping.entry_price) ?? ''}"`,
      })
      continue
    }

    // --- Required: entry_date ---
    const entryDate = parseDate(getField(row, mapping.entry_date))
    if (!entryDate) {
      errors.push({
        row: rowNum,
        message: `Invalid or missing entry date: "${getField(row, mapping.entry_date) ?? ''}"`,
      })
      continue
    }

    // --- Optional fields ---
    const exitPrice = parseNumber(getField(row, mapping.exit_price))

    let exitDate = parseDate(getField(row, mapping.exit_date))
    // If exit price exists but no exit date column mapped, use entry_date
    if (exitPrice !== null && exitDate === null) {
      exitDate = entryDate
    }

    const stopLoss = parseNumber(getField(row, mapping.stop_loss))
    const takeProfit = parseNumber(getField(row, mapping.take_profit))
    const commission = parseNumber(getField(row, mapping.commission))
    const notes = getField(row, mapping.notes)?.trim() || null
    const assetType = normalizeAssetType(getField(row, mapping.asset_type))

    // Direction: default to 'long' when column not mapped or unrecognized
    const rawDirection = getField(row, mapping.direction)
    const direction = rawDirection
      ? normalizeDirection(rawDirection) ?? 'long'
      : 'long'

    // Status: closed if we have an exit price, open otherwise
    const status: 'open' | 'closed' = exitPrice !== null ? 'closed' : 'open'

    // Position size in USD
    const positionSizeUsd = quantity * entryPrice

    trades.push({
      ticker: ticker.toUpperCase(),
      asset_type: assetType,
      direction,
      quantity,
      entry_price: entryPrice,
      exit_price: exitPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      entry_date: entryDate,
      exit_date: exitDate,
      notes,
      commission,
      status,
      position_size_usd: positionSizeUsd,
    })
  }

  return { trades, errors }
}
