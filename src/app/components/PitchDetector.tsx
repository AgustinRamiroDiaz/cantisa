'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PitchDetector as Pitchy } from 'pitchy'

export interface PitchData {
  frequency: number | null
  clarity: number
  note: string | null
  cents: number
}

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const A4_FREQUENCY = 440

function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
  const semitonesFromA4 = 12 * Math.log2(frequency / A4_FREQUENCY)
  const roundedSemitones = Math.round(semitonesFromA4)
  const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100)

  // A4 is the 9th note (La) in the scale, in octave 4
  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12
  const octave = 4 + Math.floor((roundedSemitones + 9) / 12)

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents
  }
}

export function usePitchDetector() {
  const [isListening, setIsListening] = useState(false)
  const [pitchData, setPitchData] = useState<PitchData>({
    frequency: null,
    clarity: 0,
    note: null,
    cents: 0
  })
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafIdRef = useRef<number | null>(null)

  const startListening = useCallback(async () => {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const detector = Pitchy.forFloat32Array(analyser.fftSize)
      const dataArray = new Float32Array(analyser.fftSize)

      const detectPitch = () => {
        analyser.getFloatTimeDomainData(dataArray)
        const [frequency, clarity] = detector.findPitch(dataArray, audioContext.sampleRate)

        if (clarity > 0.9 && frequency > 60 && frequency < 1000) {
          const { note, octave, cents } = frequencyToNote(frequency)
          setPitchData({
            frequency,
            clarity,
            note: `${note}${octave}`,
            cents
          })
        } else {
          setPitchData({
            frequency: null,
            clarity,
            note: null,
            cents: 0
          })
        }

        rafIdRef.current = requestAnimationFrame(detectPitch)
      }

      detectPitch()
      setIsListening(true)
    } catch (err) {
      setError('No se pudo acceder al microfono. Por favor, permite el acceso.')
      console.error('Error accessing microphone:', err)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsListening(false)
    setPitchData({
      frequency: null,
      clarity: 0,
      note: null,
      cents: 0
    })
  }, [])

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    isListening,
    pitchData,
    error,
    startListening,
    stopListening
  }
}

// Helper to get frequency for a given note
export function noteToFrequency(noteName: string): number {
  const match = noteName.match(/^([A-Za-z#]+)(\d+)$/)
  if (!match) return 0

  const [, note, octaveStr] = match
  const octave = parseInt(octaveStr)

  const noteIndex = NOTE_NAMES.indexOf(note)
  if (noteIndex === -1) return 0

  // Calculate semitones from A4
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9)
  return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12)
}

export { NOTE_NAMES }
