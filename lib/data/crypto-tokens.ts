export interface CryptoToken {
  symbol: string       // "X:BTCUSD" (Polygon format)
  displayName: string  // "BTC"
  name: string         // "Bitcoin"
  category: 'layer1' | 'defi' | 'meme' | 'layer2' | 'infrastructure'
}

export const CRYPTO_TOKENS: CryptoToken[] = [
  // Layer 1
  { symbol: 'X:BTCUSD', displayName: 'BTC', name: 'Bitcoin', category: 'layer1' },
  { symbol: 'X:ETHUSD', displayName: 'ETH', name: 'Ethereum', category: 'layer1' },
  { symbol: 'X:SOLUSD', displayName: 'SOL', name: 'Solana', category: 'layer1' },
  { symbol: 'X:ADAUSD', displayName: 'ADA', name: 'Cardano', category: 'layer1' },
  { symbol: 'X:AVAXUSD', displayName: 'AVAX', name: 'Avalanche', category: 'layer1' },
  { symbol: 'X:DOTUSD', displayName: 'DOT', name: 'Polkadot', category: 'layer1' },
  { symbol: 'X:ATOMUSD', displayName: 'ATOM', name: 'Cosmos', category: 'layer1' },
  { symbol: 'X:NEARUSD', displayName: 'NEAR', name: 'NEAR Protocol', category: 'layer1' },
  { symbol: 'X:SUIUSD', displayName: 'SUI', name: 'Sui', category: 'layer1' },
  // DeFi
  { symbol: 'X:LINKUSD', displayName: 'LINK', name: 'Chainlink', category: 'defi' },
  { symbol: 'X:UNIUSD', displayName: 'UNI', name: 'Uniswap', category: 'defi' },
  { symbol: 'X:AABORROWUSD', displayName: 'AAVE', name: 'Aave', category: 'defi' },
  { symbol: 'X:MKRUSD', displayName: 'MKR', name: 'Maker', category: 'defi' },
  // Meme
  { symbol: 'X:DOGEUSD', displayName: 'DOGE', name: 'Dogecoin', category: 'meme' },
  { symbol: 'X:SHIBUSD', displayName: 'SHIB', name: 'Shiba Inu', category: 'meme' },
  { symbol: 'X:PEPEUSD', displayName: 'PEPE', name: 'Pepe', category: 'meme' },
  // Layer 2
  { symbol: 'X:MATICUSD', displayName: 'MATIC', name: 'Polygon', category: 'layer2' },
  { symbol: 'X:ARBUSD', displayName: 'ARB', name: 'Arbitrum', category: 'layer2' },
  { symbol: 'X:OPUSD', displayName: 'OP', name: 'Optimism', category: 'layer2' },
  // Infrastructure
  { symbol: 'X:XRPUSD', displayName: 'XRP', name: 'Ripple', category: 'infrastructure' },
  { symbol: 'X:LTCUSD', displayName: 'LTC', name: 'Litecoin', category: 'infrastructure' },
  { symbol: 'X:XLMUSD', displayName: 'XLM', name: 'Stellar', category: 'infrastructure' },
  { symbol: 'X:ALGOUSD', displayName: 'ALGO', name: 'Algorand', category: 'infrastructure' },
]

export const CRYPTO_CATEGORIES = ['layer1', 'defi', 'meme', 'layer2', 'infrastructure'] as const
export type CryptoCategory = typeof CRYPTO_CATEGORIES[number]

export function getCryptoCategories(): string[] {
  return [...CRYPTO_CATEGORIES]
}
