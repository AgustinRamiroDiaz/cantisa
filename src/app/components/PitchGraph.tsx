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
  onNext: () => void
  onPrevious: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  currentIndex: number
  totalNotes: number
}

// Frequency range for vocal (roughly C3 to C6)
const MIN_FREQ = 120
const MAX_FREQ = 600

// Time window in seconds
const TIME_WINDOW = 6

// Cents thresholds for bands
const CENTS_PERFECT = 10
const CENTS_CLOSE = 25
const CENTS_FAR = 50

// Note names and properties
const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const BLACK_KEYS = [1, 3, 6, 8, 10] // Indices of sharps/flats

// Generate all semitones in frequency range
function generateSemitones(minFreq: number, maxFreq: number): { note: string; freq: number; isBlack: boolean }[] {
  const A4 = 440
  const semitones: { note: string; freq: number; isBlack: boolean }[] = []

  // Start from C2 (65.41 Hz) and go up
  for (let midi = 36; midi <= 84; midi++) { // C2 to C6
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

const SEMITONES = generateSemitones(MIN_FREQ, MAX_FREQ)

export function PitchGraph({
  frequency,
  targetNote,
  isActive,
  onToggle,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentIndex,
  totalNotes
}: PitchGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const uplotRef = useRef<uPlot | null>(null)
  const dataRef = useRef<[number[], (number | null)[]]>([[], []])
  const startTimeRef = useRef<number>(0)
  const lastFreqRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const targetFreqRef = useRef<number>(noteToFrequency(targetNote))
  const [size, setSize] = useState({ width: 800, height: 600 })

  // Update target frequency ref
  useEffect(() => {
    targetFreqRef.current = noteToFrequency(targetNote)
    // Clear data when target changes
    dataRef.current = [[], []]
  }, [targetNote])

  // Store latest frequency in ref
  useEffect(() => {
    lastFreqRef.current = frequency
  }, [frequency])

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Resize uPlot when size changes
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
        x: {
          time: false,
          auto: false,
          range: [0, TIME_WINDOW],
        },
        y: {
          auto: false,
          range: [MIN_FREQ, MAX_FREQ],
          distr: 3, // Log scale
        },
      },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {},
        {
          stroke: 'rgba(255,255,255,0.9)',
          width: 3,
          spanGaps: false,
          points: { show: false },
        },
      ],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx
            const { left, top, width, height } = u.bbox
            const targetFreq = targetFreqRef.current

            // Draw piano-style semitone lines
            ctx.font = '14px system-ui, sans-serif'
            ctx.textBaseline = 'middle'

            SEMITONES.forEach(({ note, freq, isBlack }) => {
              const y = u.valToPos(freq, 'y', true)

              // Background stripe for each semitone
              const nextFreq = freq * Math.pow(2, 1 / 12)
              const prevFreq = freq * Math.pow(2, -1 / 12)
              const topY = u.valToPos(Math.sqrt(freq * nextFreq), 'y', true)
              const bottomY = u.valToPos(Math.sqrt(freq * prevFreq), 'y', true)

              // Alternate colors like piano keys
              if (isBlack) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
              }
              ctx.fillRect(left, topY, width, bottomY - topY)

              // Draw line at exact note frequency
              ctx.strokeStyle = isBlack ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(left, y)
              ctx.lineTo(left + width, y)
              ctx.stroke()

              // Note label on the right side
              ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)'
              ctx.textAlign = 'right'
              ctx.fillText(note, left + width - 10, y)
            })

            // Draw bands around target frequency
            if (targetFreq >= MIN_FREQ && targetFreq <= MAX_FREQ) {
              // Far band (red)
              const farUpper = targetFreq * Math.pow(2, CENTS_FAR / 1200)
              const farLower = targetFreq * Math.pow(2, -CENTS_FAR / 1200)
              const farUpperY = u.valToPos(Math.min(farUpper, MAX_FREQ), 'y', true)
              const farLowerY = u.valToPos(Math.max(farLower, MIN_FREQ), 'y', true)
              ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
              ctx.fillRect(left, farUpperY, width, farLowerY - farUpperY)

              // Close band (yellow)
              const closeUpper = targetFreq * Math.pow(2, CENTS_CLOSE / 1200)
              const closeLower = targetFreq * Math.pow(2, -CENTS_CLOSE / 1200)
              const closeUpperY = u.valToPos(closeUpper, 'y', true)
              const closeLowerY = u.valToPos(closeLower, 'y', true)
              ctx.fillStyle = 'rgba(234, 179, 8, 0.2)'
              ctx.fillRect(left, closeUpperY, width, closeLowerY - closeUpperY)

              // Perfect band (green)
              const perfectUpper = targetFreq * Math.pow(2, CENTS_PERFECT / 1200)
              const perfectLower = targetFreq * Math.pow(2, -CENTS_PERFECT / 1200)
              const perfectUpperY = u.valToPos(perfectUpper, 'y', true)
              const perfectLowerY = u.valToPos(perfectLower, 'y', true)
              ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
              ctx.fillRect(left, perfectUpperY, width, perfectLowerY - perfectUpperY)

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

            // Draw center line (now)
            const centerX = left + width / 2
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(centerX, top)
            ctx.lineTo(centerX, top + height)
            ctx.stroke()

            // Draw current point at center
            const data = dataRef.current
            if (data[0].length > 0 && data[1].length > 0) {
              const lastFreq = data[1][data[1].length - 1]

              if (lastFreq !== null && lastFreq >= MIN_FREQ && lastFreq <= MAX_FREQ) {
                const x = centerX
                const y = u.valToPos(lastFreq, 'y', true)

                // Color based on distance from target
                const cents = Math.abs(1200 * Math.log2(lastFreq / targetFreq))
                let color = '#ef4444' // Red
                if (cents <= CENTS_PERFECT) color = '#22c55e' // Green
                else if (cents <= CENTS_CLOSE) color = '#eab308' // Yellow

                // Glow
                ctx.beginPath()
                ctx.fillStyle = color + '40'
                ctx.arc(x, y, 24, 0, Math.PI * 2)
                ctx.fill()

                // Point
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

    const initialData: [number[], (number | null)[]] = [[], []]
    uplotRef.current = new uPlot(opts, initialData, containerRef.current)

    return () => {
      uplotRef.current?.destroy()
      uplotRef.current = null
    }
  }, [])

  // Animation loop for continuous scrolling
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      dataRef.current = [[], []]
      if (uplotRef.current) {
        uplotRef.current.setData([[], []])
      }
      return
    }

    dataRef.current = [[], []]
    startTimeRef.current = performance.now()

    const update = () => {
      if (!uplotRef.current) return

      const now = (performance.now() - startTimeRef.current) / 1000
      const data = dataRef.current
      const freq = lastFreqRef.current

      data[0].push(now)
      data[1].push(freq)

      const minTime = now - TIME_WINDOW / 2
      while (data[0].length > 0 && data[0][0] < minTime) {
        data[0].shift()
        data[1].shift()
      }

      const halfWindow = TIME_WINDOW / 2
      uplotRef.current.setScale('x', { min: now - halfWindow, max: now + halfWindow })
      uplotRef.current.setData([data[0], data[1]])

      animationRef.current = requestAnimationFrame(update)
    }

    animationRef.current = requestAnimationFrame(update)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isActive])

  // Redraw when target changes
  useEffect(() => {
    if (uplotRef.current) {
      uplotRef.current.redraw()
    }
  }, [targetNote])

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Graph container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Target note label */}
      <div className="absolute top-6 left-6 text-white">
        <div className="text-lg opacity-60">Canta:</div>
        <div className="text-6xl font-bold">{targetNote}</div>
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 right-6 flex gap-2">
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

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={onToggle}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isActive
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
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

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 right-6 flex flex-col gap-2 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/50" />
          <span>Perfecto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500/50" />
          <span>Cerca</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/50" />
          <span>Lejos</span>
        </div>
      </div>

      {/* Instructions when not active */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white/40 text-2xl">Pulsa el boton para empezar</div>
        </div>
      )}
    </div>
  )
}
