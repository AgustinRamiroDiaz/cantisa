'use client'

import { useState } from 'react'
import { usePitchDetector } from './components/PitchDetector'
import { PitchGraph } from './components/PitchGraph'

// Exercise notes - a simple scale for beginners
const EXERCISE_NOTES = ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5']

export default function Home() {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetector()

  const targetNote = EXERCISE_NOTES[currentNoteIndex]

  const handleNext = () => {
    if (currentNoteIndex < EXERCISE_NOTES.length - 1) {
      setCurrentNoteIndex(currentNoteIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentNoteIndex > 0) {
      setCurrentNoteIndex(currentNoteIndex - 1)
    }
  }

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl">
          {error}
        </div>
      )}

      <PitchGraph
        frequency={pitchData.frequency}
        targetNote={targetNote}
        isActive={isListening}
        onToggle={handleToggle}
        onNext={handleNext}
        onPrevious={handlePrevious}
        canGoNext={currentNoteIndex < EXERCISE_NOTES.length - 1}
        canGoPrevious={currentNoteIndex > 0}
        currentIndex={currentNoteIndex}
        totalNotes={EXERCISE_NOTES.length}
      />
    </main>
  )
}
