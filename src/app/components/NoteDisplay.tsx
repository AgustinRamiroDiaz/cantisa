'use client'

interface NoteDisplayProps {
  targetNote: string
  currentNote: string | null
  isCorrect: boolean
}

export function NoteDisplay({ targetNote, currentNote, isCorrect }: NoteDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-white/60 text-2xl font-medium">Canta esta nota:</div>

      <div
        className={`note-display transition-all duration-300 ${
          isCorrect ? 'text-green-400 scale-110' : 'text-white'
        }`}
      >
        {targetNote}
      </div>

      <div className="h-16 flex items-center">
        {currentNote && (
          <div className="text-4xl text-white/80 font-semibold animate-pulse">
            Tu nota: <span className={isCorrect ? 'text-green-400' : 'text-white'}>{currentNote}</span>
          </div>
        )}
      </div>
    </div>
  )
}
