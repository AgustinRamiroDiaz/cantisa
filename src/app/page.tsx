'use client'

import { useState } from 'react'
import { usePitchDetector } from './components/PitchDetector'
import { PitchGraph } from './components/PitchGraph'

export default function Home() {
  const [targetNote, setTargetNote] = useState('La3')
  const [toleranceCents, setToleranceCents] = useState(10)
  const [noteRange, setNoteRange] = useState({ from: 'Do3', to: 'Do5' })

  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetector()

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleNoteRangeChange = (from: string, to: string) => {
    setNoteRange({ from, to })
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
        onTargetChange={setTargetNote}
        toleranceCents={toleranceCents}
        onToleranceChange={setToleranceCents}
        noteRange={noteRange}
        onNoteRangeChange={handleNoteRangeChange}
      />
    </main>
  )
}
