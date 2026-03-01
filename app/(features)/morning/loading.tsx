export default function MorningLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-10 w-64 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="h-5 w-48 rounded" style={{ backgroundColor: '#222' }} />
        <div className="space-y-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl" style={{ backgroundColor: '#1e1e1e' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
