export type AssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'indices' | 'option' | 'future' | 'other'

export interface AssetCoverage {
  marketData: boolean
  realtime: boolean
  autocomplete: boolean
}

export const ASSET_COVERAGE: Record<AssetType, AssetCoverage> = {
  stock: { marketData: true, realtime: false, autocomplete: true },
  etf: { marketData: true, realtime: false, autocomplete: true },
  crypto: { marketData: true, realtime: true, autocomplete: true },
  forex: { marketData: true, realtime: true, autocomplete: true },
  indices: { marketData: true, realtime: false, autocomplete: true },
  option: { marketData: false, realtime: false, autocomplete: false },
  future: { marketData: false, realtime: false, autocomplete: false },
  other: { marketData: false, realtime: false, autocomplete: false },
}

export function toAssetType(value: string | null | undefined): AssetType {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 'other'
  if (normalized === 'stocks') return 'stock'
  if (normalized === 'index' || normalized === 'indices') return 'indices'
  if (normalized === 'fx') return 'forex'
  if (normalized === 'options') return 'option'
  if (normalized === 'futures') return 'future'
  if (normalized in ASSET_COVERAGE) return normalized as AssetType
  return 'other'
}

export function hasMarketData(type: string | null | undefined): boolean {
  return ASSET_COVERAGE[toAssetType(type)].marketData
}

export function isRealtime(type: string | null | undefined): boolean {
  return ASSET_COVERAGE[toAssetType(type)].realtime
}

export function supportsAutocomplete(type: string | null | undefined): boolean {
  return ASSET_COVERAGE[toAssetType(type)].autocomplete
}
