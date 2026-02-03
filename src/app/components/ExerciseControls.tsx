'use client'

interface ExerciseControlsProps {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  onNext: () => void
  onPrevious: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  currentIndex: number
  totalNotes: number
}

export function ExerciseControls({
  isListening,
  onStart,
  onStop,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentIndex,
  totalNotes
}: ExerciseControlsProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress indicator */}
      <div className="flex gap-2">
        {Array.from({ length: totalNotes }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentIndex
                ? 'bg-white scale-125'
                : i < currentIndex
                  ? 'bg-green-500'
                  : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Main controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="btn-secondary"
          aria-label="Nota anterior"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {!isListening ? (
          <button onClick={onStart} className="btn-primary">
            <span className="flex items-center gap-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Empezar
            </span>
          </button>
        ) : (
          <button onClick={onStop} className="btn-primary bg-red-600 hover:bg-red-700">
            <span className="flex items-center gap-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Parar
            </span>
          </button>
        )}

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="btn-secondary"
          aria-label="Siguiente nota"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Instructions */}
      <p className="text-white/60 text-center max-w-sm">
        {isListening
          ? 'Canta la nota mostrada. El medidor te indica si estas afinado.'
          : 'Pulsa "Empezar" para activar el microfono y comenzar a practicar.'
        }
      </p>
    </div>
  )
}
