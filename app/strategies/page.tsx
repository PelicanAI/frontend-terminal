import dynamic from 'next/dynamic'

const StrategyBrowse = dynamic(
  () => import('@/components/strategies/strategy-browse').then(m => ({ default: m.StrategyBrowse })),
  { ssr: false }
)

export default function StrategiesPage() {
  return <StrategyBrowse />
}
