'use client'

import { useRef, useEffect, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { noteToFrequency } from './PitchDetector'

interface PitchGraphProps {
  frequency: number | null
  targetNote: string
  isActive: boolean
  onToggle: () => void
  onTargetChange: (note: string) => void
  toleranceCents: number
  onToleranceChange: (cents: number) => void
  noteRange: { from: string; to: string }
  onNoteRangeChange: (from: string, to: string) => void
}

// Time window in seconds
const TIME_WINDOW = 6

// Note names and properties
const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const BLACK_KEYS = [1, 3, 6, 8, 10]

// All available notes for selection
const ALL_NOTES: string[] = []
for (let midi = 36; midi <= 84; midi++) {
  const noteIndex = midi % 12
  const octave = Math.floor(midi / 12) - 1
  ALL_NOTES.push(`${NOTE_NAMES[noteIndex]}${octave}`)
}


function generateSemitones(minFreq: number, maxFreq: number): { note: string; freq: number; isBlack: boolean }[] {
  const A4 = 440
  const semitones: { note: string; freq: number; isBlack: boolean }[] = []

  for (let midi = 24; midi <= 96; midi++) {
    const freq = A4 * Math.pow(2, (midi - 69) / 12)
    if (freq >= minFreq && freq <= maxFreq) {
      const noteIndex = midi % 12
      const octave = Math.floor(midi / 12) - 1
      const noteName = NOTE_NAMES[noteIndex]
      semitones.push({
        note: `${noteName}${octave}`,
        freq,
        isBlack: BLACK_KEYS.includes(noteIndex)
      })
    }
  }
  return semitones
}

export { ALL_NOTES }

export function PitchGraph({
  frequency,
  targetNote,
  isActive,
  onToggle,
  onTargetChange,
  toleranceCents,
  onToleranceChange,
  noteRange,
  onNoteRangeChange,
}: PitchGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const uplotRef = useRef<uPlot | null>(null)
  const dataRef = useRef<[number[], (number | null)[]]>([[], []])
  const startTimeRef = useRef<number>(0)
  const lastFreqRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const targetFreqRef = useRef<number>(noteToFrequency(targetNote))
  const toleranceRef = useRef(toleranceCents)
  const freqRangeRef = useRef({ min: noteToFrequency(noteRange.from), max: noteToFrequency(noteRange.to) })
  const semitonesRef = useRef(generateSemitones(noteToFrequency(noteRange.from), noteToFrequency(noteRange.to)))
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [showSettings, setShowSettings] = useState(false)

  // Update refs
  useEffect(() => {
    targetFreqRef.current = noteToFrequency(targetNote)
    dataRef.current = [[], []]
  }, [targetNote])

  useEffect(() => {
    toleranceRef.current = toleranceCents
  }, [toleranceCents])

  useEffect(() => {
    const minFreq = noteToFrequency(noteRange.from)
    const maxFreq = noteToFrequency(noteRange.to)
    freqRangeRef.current = { min: minFreq, max: maxFreq }
    semitonesRef.current = generateSemitones(minFreq, maxFreq)
    if (uplotRef.current) {
      uplotRef.current.setScale('y', { min: minFreq, max: maxFreq })
    }
  }, [noteRange])

  useEffect(() => {
    lastFreqRef.current = frequency
  }, [frequency])

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (uplotRef.current) {
      uplotRef.current.setSize(size)
    }
  }, [size])

  // Initialize uPlot
  useEffect(() => {
    if (!containerRef.current) return

    const opts: uPlot.Options = {
      width: size.width,
      height: size.height,
      class: 'pitch-graph-fullscreen',
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: false, auto: false, range: [0, TIME_WINDOW] },
        y: { auto: false, range: [noteToFrequency(noteRange.from), noteToFrequency(noteRange.to)], distr: 3 },
      },
      axes: [{ show: false }, { show: false }],
      series: [
        {},
        { stroke: 'rgba(255,255,255,0.9)', width: 3, spanGaps: false, points: { show: false } },
      ],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx
            const { left, top, width, height } = u.bbox
            const targetFreq = targetFreqRef.current
            const tolerance = toleranceRef.current
            const range = freqRangeRef.current
            const semitones = semitonesRef.current
            const cents = { perfect: tolerance, close: tolerance * 2, far: tolerance * 3 }

            // Draw piano-style semitone bands
            ctx.font = '14px system-ui, sans-serif'
            ctx.textBaseline = 'middle'

            semitones.forEach(({ note, freq, isBlack }) => {
              const y = u.valToPos(freq, 'y', true)
              const nextFreq = freq * Math.pow(2, 1 / 12)
              const prevFreq = freq * Math.pow(2, -1 / 12)
              const topY = u.valToPos(Math.sqrt(freq * nextFreq), 'y', true)
              const bottomY = u.valToPos(Math.sqrt(freq * prevFreq), 'y', true)

              ctx.fillStyle = isBlack ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)'
              ctx.fillRect(left, topY, width, bottomY - topY)

              ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)'
              ctx.textAlign = 'right'
              ctx.fillText(note, left + width - 10, y)
            })

            // Draw tolerance bands around target
            if (targetFreq >= range.min && targetFreq <= range.max) {
              // Far band (red)
              const farUpper = targetFreq * Math.pow(2, cents.far / 1200)
              const farLower = targetFreq * Math.pow(2, -cents.far / 1200)
              ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
              ctx.fillRect(left, u.valToPos(Math.min(farUpper, range.max), 'y', true), width,
                u.valToPos(Math.max(farLower, range.min), 'y', true) - u.valToPos(Math.min(farUpper, range.max), 'y', true))

              // Close band (yellow)
              const closeUpper = targetFreq * Math.pow(2, cents.close / 1200)
              const closeLower = targetFreq * Math.pow(2, -cents.close / 1200)
              ctx.fillStyle = 'rgba(234, 179, 8, 0.2)'
              ctx.fillRect(left, u.valToPos(closeUpper, 'y', true), width,
                u.valToPos(closeLower, 'y', true) - u.valToPos(closeUpper, 'y', true))

              // Perfect band (green)
              const perfectUpper = targetFreq * Math.pow(2, cents.perfect / 1200)
              const perfectLower = targetFreq * Math.pow(2, -cents.perfect / 1200)
              ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
              ctx.fillRect(left, u.valToPos(perfectUpper, 'y', true), width,
                u.valToPos(perfectLower, 'y', true) - u.valToPos(perfectUpper, 'y', true))

              // Target line
              const targetY = u.valToPos(targetFreq, 'y', true)
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
              ctx.lineWidth = 2
              ctx.setLineDash([10, 5])
              ctx.beginPath()
              ctx.moveTo(left, targetY)
              ctx.lineTo(left + width, targetY)
              ctx.stroke()
              ctx.setLineDash([])
            }

            // Center line
            const centerX = left + width / 2
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(centerX, top)
            ctx.lineTo(centerX, top + height)
            ctx.stroke()

            // Current point
            const data = dataRef.current
            if (data[0].length > 0 && data[1].length > 0) {
              const lastFreq = data[1][data[1].length - 1]
              if (lastFreq !== null && lastFreq >= range.min && lastFreq <= range.max) {
                const x = centerX
                const y = u.valToPos(lastFreq, 'y', true)
                const centsOff = Math.abs(1200 * Math.log2(lastFreq / targetFreq))
                let color = '#ef4444'
                if (centsOff <= cents.perfect) color = '#22c55e'
                else if (centsOff <= cents.close) color = '#eab308'

                ctx.beginPath()
                ctx.fillStyle = color + '40'
                ctx.arc(x, y, 24, 0, Math.PI * 2)
                ctx.fill()
                ctx.beginPath()
                ctx.fillStyle = color
                ctx.arc(x, y, 12, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          },
        ],
      },
    }

    uplotRef.current = new uPlot(opts, [[], []], containerRef.current)
    return () => {
      uplotRef.current?.destroy()
      uplotRef.current = null
    }
  }, [noteRange.from, noteRange.to, size.width, size.height])

  // Animation loop
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      dataRef.current = [[], []]
      uplotRef.current?.setData([[], []])
      return
    }

    dataRef.current = [[], []]
    startTimeRef.current = performance.now()

    const update = () => {
      if (!uplotRef.current) return
      const now = (performance.now() - startTimeRef.current) / 1000
      const data = dataRef.current

      data[0].push(now)
      data[1].push(lastFreqRef.current)

      const minTime = now - TIME_WINDOW / 2
      while (data[0].length > 0 && data[0][0] < minTime) {
        data[0].shift()
        data[1].shift()
      }

      uplotRef.current.setScale('x', { min: now - TIME_WINDOW / 2, max: now + TIME_WINDOW / 2 })
      uplotRef.current.setData([data[0], data[1]])
      animationRef.current = requestAnimationFrame(update)
    }

    animationRef.current = requestAnimationFrame(update)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isActive])

  useEffect(() => {
    uplotRef.current?.redraw()
  }, [targetNote, toleranceCents, noteRange])

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Target note label */}
      <div className="absolute top-6 left-6 text-white">
        <div className="text-lg opacity-60">Canta:</div>
        <div className="text-6xl font-bold">{targetNote}</div>
      </div>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-20 right-6 w-80 bg-slate-800/95 backdrop-blur rounded-xl p-4 space-y-4 text-white">
          <h3 className="font-bold text-lg">Configuracion</h3>

          {/* Target note */}
          <div>
            <label className="block text-sm opacity-70 mb-1">Nota objetivo</label>
            <select
              value={targetNote}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full bg-slate-700 rounded px-3 py-2"
            >
              {ALL_NOTES.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>

          {/* Note range */}
          <div>
            <label className="block text-sm opacity-70 mb-1">Rango de notas</label>
            <div className="flex gap-2 items-center">
              <select
                value={noteRange.from}
                onChange={(e) => onNoteRangeChange(e.target.value, noteRange.to)}
                className="flex-1 bg-slate-700 rounded px-3 py-2"
              >
                {ALL_NOTES.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
              <span className="opacity-50">a</span>
              <select
                value={noteRange.to}
                onChange={(e) => onNoteRangeChange(noteRange.from, e.target.value)}
                className="flex-1 bg-slate-700 rounded px-3 py-2"
              >
                {ALL_NOTES.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tolerance */}
          <div>
            <label className="block text-sm opacity-70 mb-1">Tolerancia: {toleranceCents} cents</label>
            <input
              type="range"
              min="5"
              max="50"
              value={toleranceCents}
              onChange={(e) => onToleranceChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs opacity-50 mt-1">
              <span>Perfecto: ±{toleranceCents}</span>
              <span>Cerca: ±{toleranceCents * 2}</span>
              <span>Lejos: ±{toleranceCents * 3}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={onToggle}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isActive ? (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {/* Instructions */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white/40 text-2xl">Pulsa el boton para empezar</div>
        </div>
      )}
    </div>
  )
}
