'use client'

import { useState, useMemo } from 'react'
import { usePitchDetector, noteToFrequency } from './components/PitchDetector'
import { NoteDisplay } from './components/NoteDisplay'
import { TuningMeter } from './components/TuningMeter'
import { ExerciseControls } from './components/ExerciseControls'

// Exercise notes - a simple scale for beginners
const EXERCISE_NOTES = ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5']

function calculateCentsFromTarget(currentFreq: number | null, targetNote: string): number {
  if (!currentFreq) return 0

  const targetFreq = noteToFrequency(targetNote)
  if (!targetFreq) return 0

  const cents = 1200 * Math.log2(currentFreq / targetFreq)
  return Math.round(cents)
}

export default function Home() {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetector()

  const targetNote = EXERCISE_NOTES[currentNoteIndex]

  const centsFromTarget = useMemo(() => {
    return calculateCentsFromTarget(pitchData.frequency, targetNote)
  }, [pitchData.frequency, targetNote])

  const isCorrect = isListening && pitchData.note !== null && Math.abs(centsFromTarget) <= 10

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-12">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Cantisa</h1>
        <p className="text-white/70 text-xl">Aprende a afinar cantando</p>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl max-w-md text-center">
          {error}
        </div>
      )}

      {/* Note display */}
      <NoteDisplay
        targetNote={targetNote}
        currentNote={pitchData.note}
        isCorrect={isCorrect}
      />

      {/* Tuning meter */}
      <TuningMeter
        cents={centsFromTarget}
        isActive={isListening && pitchData.note !== null}
      />

      {/* Controls */}
      <ExerciseControls
        isListening={isListening}
        onStart={startListening}
        onStop={stopListening}
        onNext={handleNext}
        onPrevious={handlePrevious}
        canGoNext={currentNoteIndex < EXERCISE_NOTES.length - 1}
        canGoPrevious={currentNoteIndex > 0}
        currentIndex={currentNoteIndex}
        totalNotes={EXERCISE_NOTES.length}
      />

      {/* Debug info (only shown when listening) */}
      {isListening && pitchData.frequency && (
        <div className="text-white/40 text-sm text-center">
          Frecuencia: {pitchData.frequency.toFixed(1)} Hz | Claridad: {(pitchData.clarity * 100).toFixed(0)}%
        </div>
      )}
    </main>
  )
}
