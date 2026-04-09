export default function Loading() {
  return (
    <div className="h-full bg-[var(--bg-base)]">
      <div className="grid h-full grid-cols-1 gap-px bg-[var(--border-subtle)] xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-[minmax(300px,55vh)_1fr]">
        <div className="h-[300px] bg-[var(--bg-surface)] animate-pulse md:h-[360px] xl:h-auto" />
        <div className="hidden bg-[var(--bg-surface)] animate-pulse xl:row-span-2 xl:block" />
        <div className="min-h-[420px] bg-[var(--bg-surface)] animate-pulse xl:min-h-0" />
      </div>
    </div>
  )
}
