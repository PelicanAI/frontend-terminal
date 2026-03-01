export default function EarningsLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-48 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-16 rounded-lg" style={{ backgroundColor: '#222' }} />
          ))}
        </div>
        <div className="space-y-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg" style={{ backgroundColor: '#1e1e1e' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
