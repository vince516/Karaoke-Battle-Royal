import { useEffect, useRef } from 'react'
import { PitchDetector } from 'pitchy'

/* ============================================================
   Real-time pitch detection (M4). Runs the McLeod pitch method
   (pitchy) on the singer's mic ~50×/s and reports {hz, clarity}.
   The singer's client computes pitch and sends compact frames
   over the room WebSocket; the server relays them so every
   viewer's tone lane shows the same dot. This replaces the
   prototype's simulated singer pitch.
   ============================================================ */

export interface PitchFrame {
  hz: number
  clarity: number // 0..1 confidence
}

export function usePitchDetection(stream: MediaStream | null, onFrame: (f: PitchFrame) => void) {
  const cbRef = useRef(onFrame)
  cbRef.current = onFrame

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const detector = PitchDetector.forFloat32Array(analyser.fftSize)
    detector.minVolumeDecibels = -30
    const input = new Float32Array(detector.inputLength)
    let raf = 0
    let last = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 48) return // ~20 Hz, per the brief's pitch-frame rate
      last = now
      analyser.getFloatTimeDomainData(input)
      const [hz, clarity] = detector.findPitch(input, ctx.sampleRate)
      if (clarity > 0.85 && hz > 60 && hz < 1200) cbRef.current({ hz, clarity })
    }
    // resume() is a no-op if already running; needed after a user gesture
    void ctx.resume().catch(() => {})
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      void ctx.close().catch(() => {})
    }
  }, [stream])
}

/* Map a frequency to the tone lane's 0..1 vertical position across a
   two-octave singing window (C3≈130.8Hz … C5≈523.3Hz). 0 = top row. */
/* The 15 tone-lane rows map to a two-octave C-major scale from C3 upward,
   so encoded melodies sound like real (in-key) tunes and scoring stays
   consistent: hzToLane(noteToHz(row)) === 1 - row/(TOP). */
const BASE = 130.81 // C3
// semitones above C3 for rows 0..14 (two octaves of C-major)
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24]
const TOP = SCALE.length - 1 // 14

/** Row (0..14, may be fractional) → frequency. */
export function noteToHz(note: number): number {
  const n = Math.max(0, Math.min(TOP, note))
  const lo = Math.floor(n)
  const hi = Math.min(TOP, lo + 1)
  const semi = SCALE[lo] + (SCALE[hi] - SCALE[lo]) * (n - lo)
  return BASE * Math.pow(2, semi / 12)
}

/** Frequency → lane position 0 (top) … 1 (bottom), inverse of the row map. */
export function hzToLane(hz: number): number {
  const semi = 12 * Math.log2(hz / BASE)
  if (semi <= SCALE[0]) return 1
  if (semi >= SCALE[TOP]) return 0
  for (let r = 0; r < TOP; r++) {
    if (semi <= SCALE[r + 1]) {
      const row = r + (semi - SCALE[r]) / (SCALE[r + 1] - SCALE[r])
      return 1 - row / TOP
    }
  }
  return 0
}
