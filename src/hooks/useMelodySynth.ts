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

  const tone = useCallback((freq: number, durMs: number, at = 0, vol = 0.3) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const t0 = ctx.currentTime + at
    const dur = Math.min(durMs / 1000, 1.4)

    const osc = ctx.createOscillator()
    const sub = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    sub.type = 'sine'
    osc.frequency.value = freq
    sub.frequency.value = freq / 2 // warm sub-octave
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    sub.connect(g)
    g.connect(ctx.destination)
    osc.start(t0)
    sub.start(t0)
    osc.stop(t0 + dur)
    sub.stop(t0 + dur)
  }, [])

  /** Must be called from a user gesture to unlock audio. Plays a short
      "get ready" chime — instant proof that sound is working. */
  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new Ctx()
    }
    void ctxRef.current.resume()
    tone(523.25, 160, 0, 0.22) // C5
    tone(659.25, 160, 0.18, 0.22) // E5
    tone(783.99, 300, 0.36, 0.22) // G5 — "ready!" arpeggio
  }, [tone])

  /** Play one melody note (skips while muted). */
  const playNote = useCallback((freq: number, durMs: number) => {
    if (mutedRef.current) return
    tone(freq, durMs)
  }, [tone])

  const toggle = useCallback(() => setMuted((m) => !m), [])
  return { unlock, playNote, muted, toggle }
}
