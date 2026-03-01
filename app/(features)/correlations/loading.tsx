export default function CorrelationsLoading() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#161616' }}>
      <div className="animate-pulse p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-40 rounded-lg" style={{ backgroundColor: '#222' }} />
        <div className="h-[60vh] rounded-xl mt-4" style={{ backgroundColor: '#1e1e1e' }} />
      </div>
    </div>
  )
}
