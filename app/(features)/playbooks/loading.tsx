export default function PlaybooksLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-36 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl" style={{ backgroundColor: '#1e1e1e' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
