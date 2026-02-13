export interface DataPoint {
  date: string
  initialDrop: string
  forwardReturn: string
}

export interface ParsedDataTable {
  data: DataPoint[]
  title: string
}

// New: Flexible column structure for structured data
export interface Column {
  key: string
  label: string
  type?: 'date' | 'percentage' | 'number' | 'text'
  align?: 'left' | 'center' | 'right'
}

// New: Structured data table format (from AI markers)
export interface StructuredDataTable {
  query?: string
  title: string
  columns: Column[]
  data: Record<string, unknown>[]
  summary?: Record<string, unknown>
}

/**
 * Detects structured data wrapped in <data-table> XML markers
 * This is the preferred format as it's unambiguous and flexible
 *
 * @param text - The text content to analyze
 * @returns Structured data table, or null if not found
 */
export function detectStructuredData(text: string): StructuredDataTable | null {
  // Defensive check - ensure text is a string
  if (typeof text !== 'string') {
    return null
  }
  
  if (!text || text.trim().length === 0) {
    return null
  }

  // Look for <data-table>...</data-table> markers
  const match = text.match(/<data-table>\s*([\s\S]*?)\s*<\/data-table>/i)

  if (!match || !match[1]) {
    return null
  }

  try {
    const parsed = JSON.parse(match[1].trim())

    // Validate structure
    if (!parsed.columns || !parsed.data || !Array.isArray(parsed.columns) || !Array.isArray(parsed.data)) {

      return null
    }

    // Ensure columns have required fields
    const validColumns = parsed.columns.every((col: unknown) => {
      return typeof col === 'object' && col !== null && 'key' in col && 'label' in col
    })
    if (!validColumns) {

      return null
    }

    // Return validated structure
    return {
      query: parsed.query,
      title: parsed.title || 'Data Table',
      columns: parsed.columns,
      data: parsed.data,
      summary: parsed.summary,
    }
  } catch {

    return null
  }
}

/**
 * Detects arrow-format data tables (legacy format)
 * Pattern: YYYY-MM-DD followed by –X.XX% → –X.XX% (or +X.XX%)
 *
 * @param text - The text content to analyze
 * @returns Parsed data table with title, or null if no valid pattern found
 */
export function detectArrowFormat(text: string): ParsedDataTable | null {
  // Defensive check - ensure text is a string
  if (typeof text !== 'string') {
    return null
  }
  
  if (!text || text.trim().length === 0) {
    return null
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length < 3) {
    return null
  }

  // Pattern: YYYY-MM-DD followed by percentage with arrow
  // Handle both en dash (–) and hyphen (-) for negative signs
  const dataPattern = /^(\d{4}-\d{2}-\d{2})\s+([-–]\d+\.\d+%|[+]?\d+\.\d+%)\s*[→>]\s*([-–+]?\d+\.\d+%)/

  const dataPoints: DataPoint[] = []
  let titleLine: string | null = null
  let firstDataLineIndex = -1

  // Find data lines and extract title
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const match = line.match(dataPattern)

    if (match) {
      if (firstDataLineIndex === -1) {
        firstDataLineIndex = i
        // The line before the first data line is likely the title
        if (i > 0) {
          titleLine = lines[i - 1] ?? null
        }
      }

      const date = match[1]
      const initialDrop = match[2]
      const forwardReturn = match[3]

      if (date && initialDrop && forwardReturn) {
        dataPoints.push({
          date,
          initialDrop,
          forwardReturn,
        })
      }
    }
  }

  // Minimum 3 consecutive matching lines required
  if (dataPoints.length < 3) {
    return null
  }

  // Default title if extraction failed
  const title = titleLine && titleLine.length > 0 && titleLine.length < 100
    ? titleLine
    : "Market Data"

  return {
    data: dataPoints,
    title,
  }
}

/**
 * Calculate statistics from data points
 *
 * @param data - Array of data points
 * @returns Object with average return and percentage positive
 */
export function calculateStats(data: DataPoint[]): { avgReturn: string; percentPositive: string } {
  if (data.length === 0) {
    return {
      avgReturn: "0.00%",
      percentPositive: "0%",
    }
  }

  // Parse forward returns (handle both – and - as negative signs)
  const returns = data.map(point => {
    const cleanValue = point.forwardReturn
      .replace(/[–-]/g, '-') // Normalize dashes to hyphen
      .replace(/%/g, '') // Remove %
      .replace(/\+/g, '') // Remove + sign
      .trim()

    return parseFloat(cleanValue)
  }).filter(value => !isNaN(value))

  if (returns.length === 0) {
    return {
      avgReturn: "0.00%",
      percentPositive: "0%",
    }
  }

  // Calculate average
  const sum = returns.reduce((acc, val) => acc + val, 0)
  const avg = sum / returns.length

  // Calculate percentage positive
  const positiveCount = returns.filter(val => val >= 0).length
  const percentPositive = (positiveCount / returns.length) * 100

  return {
    avgReturn: `${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`,
    percentPositive: `${percentPositive.toFixed(0)}%`,
  }
}

/**
 * Main detection function - tries all formats
 * Priority: Structured data (most reliable) → Arrow format (legacy)
 *
 * @param text - The text content to analyze
 * @returns Structured data or parsed data table, or null if no format matches
 */
export function detectDataTable(text: string): StructuredDataTable | ParsedDataTable | null {
  // Defensive check - ensure text is a string
  if (typeof text !== 'string') {
    return null
  }
  
  // Try structured format FIRST (most reliable, unambiguous)
  const structured = detectStructuredData(text)
  if (structured) {
    return structured
  }

  // Fall back to arrow format (legacy regex-based)
  const arrow = detectArrowFormat(text)
  if (arrow) {
    return arrow
  }

  // No format detected
  return null
}
