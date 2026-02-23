import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const difficulty = searchParams.get('difficulty')
  const source = searchParams.get('source')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'popular'

  const supabase = await createClient()

  let query = supabase
    .from('playbooks')
    .select('*')
    .or('is_published.eq.true,is_curated.eq.true')

  if (source === 'curated') query = query.eq('is_curated', true)
  else if (source === 'community') query = query.eq('is_curated', false).eq('is_published', true)

  if (category && category !== 'all') query = query.eq('category', category)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)

  switch (sort) {
    case 'popular':
      query = query.order('is_curated', { ascending: false }).order('adoption_count', { ascending: false })
      break
    case 'rating':
      query = query.order('community_rating', { ascending: false, nullsFirst: false })
      break
    case 'newest':
      query = query.order('published_at', { ascending: false, nullsFirst: false })
      break
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
