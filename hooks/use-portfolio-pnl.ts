'use client'

import useSWR from 'swr'
import type { PortfolioPosition } from '@/types/portfolio'

export interface PnlPoint {
  date: string
  total_pnl: number
  positions: Record<string, number>
}

interface UsePortfolioPnlReturn {
  data: PnlPoint[]
  isLoading: boolean
  error: Error | null
}

export function usePortfolioPnl(positions: PortfolioPosition[]): UsePortfolioPnlReturn {
  const positionKey = positions.length > 0
    ? `portfolio-pnl:${positions.map(p => p.id).sort().join(',')}`
    : null

  const { data, error, isLoading } = useSWR<PnlPoint[]>(
    positionKey,
    async () => {
      const payload = positions.map(p => ({
        ticker: p.ticker,
        asset_type: p.asset_type,
        direction: p.direction,
        quantity: p.quantity,
        entry_price: p.entry_price,
        entry_date: p.entry_date,
      }))

      const res = await fetch('/api/portfolio/pnl-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: payload }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch' }))
        throw new Error(err.error || 'Failed to fetch P&L history')
      }

      const { pnl_history } = await res.json()
      return pnl_history as PnlPoint[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      refreshInterval: 300000,
      onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 2) return
        setTimeout(() => revalidate({ retryCount }), 5000)
      },
    }
  )

  return {
    data: data ?? [],
    isLoading,
    error: error ?? null,
  }
}
