import { useCallback, useRef, useState } from 'react'

/* ============================================================
   Guide-melody synth (Web Audio). Plays the song's melody notes
   as soft synth tones in time with the tone lane, so there's
   actual music to sing along to — fully synthesised, no audio
   files, no licensing. Toggle to mute.
   ============================================================ */
export function useMelodySynth() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  /** Must be called from a user gesture to unlock audio. */
  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new Ctx()
    }
    void ctxRef.current.resume()
  }, [])

  /** Play one note (a soft plucked tone) for durMs. */
  const playNote = useCallback((freq: number, durMs: number) => {
    const ctx = ctxRef.current
    if (!ctx || mutedRef.current) return
    const t0 = ctx.currentTime
    const dur = Math.min(durMs / 1000, 1.4)

    const osc = ctx.createOscillator()
    const sub = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    sub.type = 'sine'
    osc.frequency.value = freq
    sub.frequency.value = freq / 2 // warm sub-octave
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.14, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    sub.connect(g)
    g.connect(ctx.destination)
    osc.start(t0)
    sub.start(t0)
    osc.stop(t0 + dur)
    sub.stop(t0 + dur)
  }, [])

  const toggle = useCallback(() => setMuted((m) => !m), [])
  return { unlock, playNote, muted, toggle }
}
