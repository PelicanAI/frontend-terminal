export default function JournalLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-40 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="flex gap-3 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-lg" style={{ backgroundColor: '#222' }} />
          ))}
        </div>
        <div className="grid gap-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: '#1e1e1e' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
