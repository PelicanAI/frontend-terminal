import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin'
import { calculateCorrelations } from '@/lib/correlations/calculate'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = getServiceClient()

  try {
    const result = await calculateCorrelations(serviceClient)
    return NextResponse.json({ ...result, triggered_at: new Date().toISOString() })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
