export default function PositionsLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-48 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: '#1e1e1e' }} />
          ))}
        </div>
        <div className="h-[50vh] rounded-xl mt-4" style={{ backgroundColor: '#1e1e1e' }} />
      </div>
    </div>
  )
}
