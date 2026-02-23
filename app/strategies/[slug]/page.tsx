import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

const StrategyDetailView = dynamic(
  () => import('@/components/strategies/strategy-detail').then(m => ({ default: m.StrategyDetail })),
  { ssr: false }
)

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('playbooks')
    .select('name, description, category, difficulty')
    .eq('slug', slug)
    .or('is_published.eq.true,is_curated.eq.true')
    .single()

  if (!data) return { title: 'Strategy Not Found' }

  return {
    title: data.name,
    description: data.description || `${data.name} trading strategy on Pelican Trading AI`,
    openGraph: {
      title: `${data.name} — Pelican Strategy`,
      description: data.description || `${data.name} trading strategy`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.name} — Pelican Strategy`,
      description: data.description || `${data.name} trading strategy`,
    },
  }
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const { slug } = await params
  return <StrategyDetailView slug={slug} />
}
