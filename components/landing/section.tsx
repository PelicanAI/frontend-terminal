import { cn } from '@/lib/utils'

export function Section({
  children,
  id,
  className,
}: {
  children: React.ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={cn('py-24 md:py-32 px-6', className)}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  )
}
