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
const LO = 130.81
const HI = 523.25
export function hzToLane(hz: number): number {
  const semis = 12 * Math.log2(hz / LO)
  const span = 12 * Math.log2(HI / LO)
  return Math.max(0, Math.min(1, 1 - semis / span))
}
