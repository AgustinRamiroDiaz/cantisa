'use client'

interface TuningMeterProps {
  cents: number
  isActive: boolean
}

type TuningStatus = 'correct' | 'close' | 'far'

function getTuningStatus(cents: number): TuningStatus {
  const absCents = Math.abs(cents)
  if (absCents <= 10) return 'correct'
  if (absCents <= 25) return 'close'
  return 'far'
}

export function TuningMeter({ cents, isActive }: TuningMeterProps) {
  const status = getTuningStatus(cents)

  // Convert cents (-50 to +50) to percentage (0 to 100)
  const clampedCents = Math.max(-50, Math.min(50, cents))
  const position = ((clampedCents + 50) / 100) * 100

  const statusColors = {
    correct: 'feedback-correct',
    close: 'feedback-close',
    far: 'feedback-far'
  }

  const statusLabels = {
    correct: 'Perfecto!',
    close: cents > 0 ? 'Un poco alto' : 'Un poco bajo',
    far: cents > 0 ? 'Muy alto' : 'Muy bajo'
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Meter */}
      <div className="meter-container">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 h-full w-1 bg-white/40 -translate-x-1/2" />

        {/* Scale markers */}
        <div className="absolute left-1/4 top-0 h-full w-0.5 bg-white/20" />
        <div className="absolute left-3/4 top-0 h-full w-0.5 bg-white/20" />

        {/* Indicator */}
        {isActive && (
          <div
            className={`meter-indicator ${statusColors[status]}`}
            style={{ left: `calc(${position}% - 8px)` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-white/60 text-sm">
        <span>Bajo</span>
        <span>Afinado</span>
        <span>Alto</span>
      </div>

      {/* Status text */}
      {isActive && (
        <div className={`text-center text-2xl font-bold ${
          status === 'correct' ? 'text-green-400' :
          status === 'close' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {statusLabels[status]}
        </div>
      )}
    </div>
  )
}
