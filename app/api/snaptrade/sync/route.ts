import { NextResponse } from 'next/server'
import { Snaptrade } from 'snaptrade-typescript-sdk'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/admin'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const syncLimiter = createUserRateLimiter('snaptrade-sync', 10, '1 h')

function getSnapTradeClient() {
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  const clientId = process.env.SNAPTRADE_CLIENT_ID
  if (!consumerKey || !clientId) {
    throw new Error('Missing SNAPTRADE_CONSUMER_KEY or SNAPTRADE_CLIENT_ID')
  }
  return new Snaptrade({ consumerKey, clientId })
}

/** Map SnapTrade security type to our asset_type enum */
function mapAssetType(securityType: string | undefined): string {
  if (!securityType) return 'stock'
  const lower = securityType.toLowerCase()
  if (lower.includes('option')) return 'option'
  if (lower.includes('crypto')) return 'crypto'
  if (lower.includes('forex') || lower.includes('fx')) return 'forex'
  if (lower.includes('future')) return 'future'
  if (lower.includes('etf')) return 'etf'
  return 'stock'
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await syncLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Look up SnapTrade credentials
    const serviceClient = getServiceClient()
    const { data: connections, error: lookupError } = await serviceClient
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (lookupError || !connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'No active broker connections found' },
        { status: 404 }
      )
    }

    const snaptrade = getSnapTradeClient()
    let totalSynced = 0
    let totalClosed = 0

    // Process each active connection
    for (const connection of connections) {
      try {
        // Fetch all holdings from SnapTrade
        const response = await snaptrade.accountInformation.getAllUserHoldings({
          userId: connection.snaptrade_user_id,
          userSecret: connection.snaptrade_user_secret,
        })

        const accounts = response.data
        const syncedSymbolIds = new Set<string>()

        for (const account of accounts) {
          const positions = account.positions ?? []

          for (const position of positions) {
            const posSymbol = position.symbol
            const universalSymbol = posSymbol?.symbol
            if (!universalSymbol?.symbol) continue

            const ticker = universalSymbol.symbol
            const symbolId = universalSymbol.id ?? ticker
            const units = position.units ?? 0
            if (units === 0) continue

            syncedSymbolIds.add(symbolId)

            const entryPrice = position.average_purchase_price ?? position.price ?? 0
            const tradeData = {
              user_id: user.id,
              ticker: ticker.toUpperCase(),
              direction: units > 0 ? 'long' : 'short',
              quantity: Math.abs(units),
              entry_price: entryPrice,
              position_size_usd: Math.abs(units) * (position.price ?? 0),
              asset_type: mapAssetType(universalSymbol.type?.description),
              status: 'open',
              source: 'broker_sync',
              entry_date: new Date().toISOString().split('T')[0],
              snaptrade_symbol_id: symbolId,
              last_synced_at: new Date().toISOString(),
              broker_fields_locked: true,
              broker_connection_id: connection.id,
              is_paper: false,
            }

            // Upsert: match on user_id + ticker + status=open + source=broker_sync
            const { data: existing } = await serviceClient
              .from('trades')
              .select('id')
              .eq('user_id', user.id)
              .eq('ticker', ticker.toUpperCase())
              .eq('status', 'open')
              .eq('source', 'broker_sync')
              .limit(1)
              .single()

            if (existing) {
              // Update existing position
              await serviceClient
                .from('trades')
                .update({
                  quantity: tradeData.quantity,
                  entry_price: tradeData.entry_price,
                  position_size_usd: tradeData.position_size_usd,
                  direction: tradeData.direction,
                  last_synced_at: tradeData.last_synced_at,
                  snaptrade_symbol_id: tradeData.snaptrade_symbol_id,
                  broker_connection_id: tradeData.broker_connection_id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
            } else {
              // Insert new position
              await serviceClient.from('trades').insert(tradeData)
            }

            totalSynced++
          }
        }

        // Close positions that are no longer in SnapTrade
        const { data: dbPositions } = await serviceClient
          .from('trades')
          .select('id, ticker, snaptrade_symbol_id, entry_price')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .eq('source', 'broker_sync')
          .eq('broker_connection_id', connection.id)

        if (dbPositions) {
          for (const dbPos of dbPositions) {
            const symbolId = dbPos.snaptrade_symbol_id ?? dbPos.ticker
            if (!syncedSymbolIds.has(symbolId)) {
              // Position no longer exists in broker — close it
              await serviceClient.rpc('close_trade', {
                p_trade_id: dbPos.id,
                p_exit_price: dbPos.entry_price, // Best we can do without market data
                p_exit_date: new Date().toISOString().split('T')[0],
                p_notes: 'Auto-closed: position no longer found in broker account',
                p_mistakes: null,
              })
              totalClosed++
            }
          }
        }

        // Update last_synced_at on the connection
        await serviceClient
          .from('broker_connections')
          .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

      } catch (connError) {
        logger.error('Sync error for connection', connError instanceof Error ? connError : undefined, { connectionId: connection.id })
        // Mark connection as errored but continue with others
        await serviceClient
          .from('broker_connections')
          .update({ status: 'error', updated_at: new Date().toISOString() })
          .eq('id', connection.id)
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      closed: totalClosed,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    logger.error('SnapTrade sync error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Failed to sync positions' }, { status: 500 })
  }
}
