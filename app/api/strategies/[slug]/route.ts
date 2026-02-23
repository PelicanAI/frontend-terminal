import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .eq('slug', slug)
    .or('is_published.eq.true,is_curated.eq.true')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
