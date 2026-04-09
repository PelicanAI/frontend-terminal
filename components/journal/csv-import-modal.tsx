"use client"

import { useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PelicanButton } from "@/components/ui/pelican"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Upload01Icon as UploadSimple,
  File02Icon as FileText,
  ArrowRight01Icon as ArrowRight,
  ArrowLeft01Icon as ArrowLeft,
  Alert01Icon as Warning,
  CheckmarkCircle01Icon as CheckCircle,
} from "@hugeicons/core-free-icons"
import { parseCSV, mapRowsToTrades, type CSVParseResult, type ColumnMapping, type ParsedTrade, type RowError } from "@/lib/csv/parse-trades"

interface CSVImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

const emptyMapping: ColumnMapping = {
  ticker: null, direction: null, quantity: null, entry_price: null,
  exit_price: null, stop_loss: null, take_profit: null,
  entry_date: null, exit_date: null, asset_type: null, notes: null, commission: null,
}

const FIELD_LABELS: Record<keyof ColumnMapping, { label: string; required: boolean }> = {
  ticker: { label: 'Ticker / Symbol', required: true },
  quantity: { label: 'Quantity / Shares', required: true },
  entry_price: { label: 'Entry Price', required: true },
  entry_date: { label: 'Entry Date', required: true },
  direction: { label: 'Direction (Buy/Sell)', required: false },
  exit_price: { label: 'Exit Price', required: false },
  exit_date: { label: 'Exit Date', required: false },
  stop_loss: { label: 'Stop Loss', required: false },
  take_profit: { label: 'Take Profit', required: false },
  asset_type: { label: 'Asset Type', required: false },
  notes: { label: 'Notes', required: false },
  commission: { label: 'Commission', required: false },
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['ticker', 'quantity', 'entry_price', 'entry_date']

export function CSVImportModal({ open, onOpenChange, onImportComplete }: CSVImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping)
  const [fileName, setFileName] = useState<string>('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [mappedResult, setMappedResult] = useState<{ trades: ParsedTrade[]; errors: RowError[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep(1)
    setCsvResult(null)
    setMapping(emptyMapping)
    setFileName('')
    setParseError(null)
    setMappedResult(null)
    setImporting(false)
    setImportResult(null)
    setIsDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }, [onOpenChange, resetState])

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a CSV file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const result = parseCSV(text)
        if (result.rows.length === 0) {
          setParseError('No data rows found in file')
          return
        }
        setCsvResult(result)
        setMapping(result.suggestedMapping)
        setFileName(file.name)
        setParseError(null)
        setStep(2)
      } catch {
        setParseError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const missingRequired = REQUIRED_FIELDS.filter(f => !mapping[f])

  const handleNextToPreview = useCallback(() => {
    if (!csvResult || missingRequired.length > 0) return
    const result = mapRowsToTrades(csvResult.rows, mapping)
    setMappedResult(result)
    setStep(3)
  }, [csvResult, mapping, missingRequired])

  const handleImport = useCallback(async () => {
    if (!mappedResult || !csvResult) return
    setImporting(true)
    try {
      const response = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: mappedResult.trades,
          broker: csvResult.detectedBroker,
          fileName,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed')
      setImportResult({ imported: data.imported, failed: data.failed, errors: data.errors || [] })
      setStep(4)
    } catch (err) {
      setImportResult({
        imported: 0,
        failed: mappedResult.trades.length,
        errors: [{ row: 0, message: err instanceof Error ? err.message : 'Import failed' }],
      })
      setStep(4)
    } finally {
      setImporting(false)
    }
  }, [mappedResult, csvResult, fileName])

  const handleDone = useCallback(() => {
    onImportComplete()
    handleOpenChange(false)
  }, [onImportComplete, handleOpenChange])

  const validCount = mappedResult?.trades.length ?? 0
  const errorCount = mappedResult?.errors.length ?? 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)] border-[var(--border-subtle)] rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.5),0_16px_48px_rgba(0,0,0,0.25)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Import Trades</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Upload a CSV file from your broker
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step >= s
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                }`}>
                  {step > s ? <HugeiconsIcon icon={CheckCircle} size={14} strokeWidth={2} color="currentColor" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-0.5 ${step > s ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'}`} />
                )}
              </div>
            ))}
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              {step === 1 ? 'Upload' : step === 2 ? 'Map Columns' : step === 3 ? 'Preview' : 'Done'}
            </span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <button
              type="button"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 py-12 px-6 rounded-xl border-dashed border-2 transition-colors duration-150 cursor-pointer w-full appearance-none bg-transparent m-0 ${
                isDragOver
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
              }`}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload CSV file"
            >
              <HugeiconsIcon icon={UploadSimple} size={32} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Drop your CSV file here
              </p>
              <p className="text-xs text-[var(--text-muted)]">or</p>
              <PelicanButton
                variant="secondary"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                <HugeiconsIcon icon={FileText} size={16} strokeWidth={1.5} color="currentColor" />
                Browse Files
              </PelicanButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </button>

            {parseError && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--data-negative)]/10 border border-[var(--data-negative)]/30 px-4 py-3 text-sm text-[var(--data-negative)]">
                <HugeiconsIcon icon={Warning} size={16} className="flex-shrink-0" strokeWidth={2} color="currentColor" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && csvResult && (
          <div className="space-y-4">
            {/* Info bar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FileText} size={16} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
                <span className="text-sm text-[var(--text-primary)] font-medium truncate max-w-[200px]">{fileName}</span>
              </div>
              {csvResult.detectedBroker && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium">
                  {csvResult.detectedBroker}
                </span>
              )}
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                {csvResult.rows.length} rows
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                {csvResult.headers.length} columns
              </span>
            </div>

            {/* Mapping rows */}
            <div className="space-y-3">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => {
                const { label, required } = FIELD_LABELS[field]
                const sampleValue = mapping[field] && csvResult.rows[0]
                  ? csvResult.rows[0][mapping[field] as string]
                  : null

                return (
                  <div key={field} className="flex items-center gap-3">
                    <div className="w-40 flex-shrink-0">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {label}
                        {required && <span className="text-[var(--data-negative)] ml-0.5">*</span>}
                      </span>
                    </div>
                    <div className="flex-1">
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
                      >
                        <option value="">&mdash; Not mapped &mdash;</option>
                        {csvResult.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-[120px] flex-shrink-0">
                      {sampleValue != null && (
                        <span className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[120px] block">
                          {String(sampleValue)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Direction not mapped note */}
            {!mapping.direction && (
              <p className="text-xs text-[var(--text-muted)] px-1">
                Direction is not mapped. All trades will default to Long.
              </p>
            )}

            {/* Missing required error */}
            {missingRequired.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--data-warning)]/10 border border-[var(--data-warning)]/30 px-4 py-3 text-sm text-[var(--data-warning)]">
                <HugeiconsIcon icon={Warning} size={16} className="flex-shrink-0" strokeWidth={2} color="currentColor" />
                Missing required: {missingRequired.map(f => FIELD_LABELS[f].label).join(', ')}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-2">
              <PelicanButton
                variant="ghost"
                onClick={() => setStep(1)}
              >
                <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={2} color="currentColor" />
                Back
              </PelicanButton>
              <PelicanButton
                variant="primary"
                onClick={handleNextToPreview}
                disabled={missingRequired.length > 0}
              >
                Next
                <HugeiconsIcon icon={ArrowRight} size={16} strokeWidth={2} color="currentColor" />
              </PelicanButton>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 3 && mappedResult && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CheckCircle} size={18} className="text-[var(--data-positive)]" strokeWidth={2} color="currentColor" />
                <span className="text-sm text-[var(--text-primary)] font-medium font-mono tabular-nums">
                  {validCount} valid trades
                </span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Warning} size={18} className="text-[var(--data-negative)]" strokeWidth={2} color="currentColor" />
                  <span className="text-sm text-[var(--data-negative)] font-medium font-mono tabular-nums">
                    {errorCount} errors
                  </span>
                </div>
              )}
            </div>

            {/* Preview table */}
            {validCount > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Ticker</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Side</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Entry</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Exit</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedResult.trades.slice(0, 50).map((trade, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="px-3 py-2 text-[var(--text-primary)] font-medium uppercase">
                          {trade.ticker}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs uppercase font-medium ${
                            trade.direction === 'short'
                              ? 'text-[var(--data-negative)]'
                              : 'text-[var(--data-positive)]'
                          }`}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {trade.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {trade.entry_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {trade.exit_price != null ? trade.exit_price.toFixed(2) : '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          {trade.entry_date}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            trade.exit_price != null
                              ? 'border-[var(--text-muted)]/30 text-[var(--text-muted)]'
                              : 'border-[var(--data-positive)]/30 text-[var(--data-positive)]'
                          }`}>
                            {trade.exit_price != null ? 'Closed' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validCount > 50 && (
                  <div className="px-3 py-2 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                    Showing first 50 of {validCount} trades
                  </div>
                )}
              </div>
            )}

            {/* Error details */}
            {errorCount > 0 && (
              <details className="rounded-lg border border-[var(--data-negative)]/20 overflow-hidden">
                <summary className="px-4 py-3 text-sm font-medium text-[var(--data-negative)] cursor-pointer hover:bg-[var(--data-negative)]/5 transition-colors">
                  <HugeiconsIcon icon={Warning} size={14} className="inline mr-2" strokeWidth={2} color="currentColor" />
                  {errorCount} row{errorCount !== 1 ? 's' : ''} with errors
                </summary>
                <div className="px-4 py-3 border-t border-[var(--data-negative)]/10 space-y-1.5 max-h-40 overflow-y-auto">
                  {mappedResult.errors.map((err, i) => (
                    <div key={i} className="text-xs text-[var(--text-secondary)]">
                      <span className="font-mono tabular-nums text-[var(--text-muted)]">Row {err.row}:</span>{' '}
                      {err.message}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-2">
              <PelicanButton
                variant="ghost"
                onClick={() => setStep(2)}
              >
                <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={2} color="currentColor" />
                Back
              </PelicanButton>
              <PelicanButton
                variant="primary"
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? 'Importing...' : `Import ${validCount} Trades`}
              </PelicanButton>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && importResult && (
          <div className="flex flex-col items-center gap-4 py-8">
            {importResult.imported > 0 ? (
              <>
                <HugeiconsIcon icon={CheckCircle} size={48} className="text-[var(--data-positive)]" strokeWidth={2} color="currentColor" />
                <div className="text-center space-y-1">
                  <p className="text-lg font-medium text-[var(--text-primary)]">
                    Successfully imported <span className="font-mono tabular-nums">{importResult.imported}</span> trades
                  </p>
                  {importResult.failed > 0 && (
                    <p className="text-sm text-[var(--data-warning)]">
                      <span className="font-mono tabular-nums">{importResult.failed}</span> trades had errors
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Warning} size={48} className="text-[var(--data-negative)]" strokeWidth={2} color="currentColor" />
                <div className="text-center space-y-1">
                  <p className="text-lg font-medium text-[var(--text-primary)]">
                    Import failed
                  </p>
                  {importResult.errors.length > 0 && importResult.errors[0] && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {importResult.errors[0].message}
                    </p>
                  )}
                </div>
              </>
            )}

            <PelicanButton
              variant="primary"
              size="lg"
              onClick={handleDone}
            >
              Done
            </PelicanButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
