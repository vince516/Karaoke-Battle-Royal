import { useCallback, useRef, useState } from 'react'

/* ============================================================
   Guide-melody synth (Web Audio). Plays the song's melody notes
   as soft synth tones in time with the tone lane, so there's
   actual music to sing along to — fully synthesised, no audio
   files, no licensing. Toggle to mute.

   Routing: master gain → MediaStreamDestination → <audio> element.
   On iOS, plain Web Audio (ctx.destination) obeys the RINGER/SILENT
   switch — phones on silent hear nothing. Playing through a media
   element follows the media volume instead (like YouTube), so the
   guide is audible even with the mute switch on. Falls back to
   ctx.destination if element playback is refused.
   ============================================================ */
export function useMelodySynth() {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const elRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  const tone = useCallback((freq: number, durMs: number, at = 0, vol = 0.5) => {
    const ctx = ctxRef.current
    const master = masterRef.current
    if (!ctx || !master) return
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
    g.connect(master)
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
      const ctx = new Ctx()
      ctxRef.current = ctx
      const master = ctx.createGain()
      master.gain.value = 1
      masterRef.current = master

      // media-element route (iOS silent-switch safe)
      const dest = ctx.createMediaStreamDestination()
      master.connect(dest)
      const el = new Audio()
      el.srcObject = dest.stream
      el.setAttribute('playsinline', '')
      elRef.current = el
      el.play().catch(() => {
        // element playback refused → direct route so we're never silent
        master.connect(ctx.destination)
      })
    }
    void ctxRef.current.resume()
    // element can pause when the tab was backgrounded — re-kick it
    void elRef.current?.play().catch(() => {})
    tone(523.25, 160, 0, 0.3) // C5
    tone(659.25, 160, 0.18, 0.3) // E5
    tone(783.99, 300, 0.36, 0.3) // G5 — "ready!" arpeggio
  }, [tone])

  /** Play one melody note (skips while muted). */
  const playNote = useCallback((freq: number, durMs: number) => {
    if (mutedRef.current) return
    tone(freq, durMs)
  }, [tone])

  /** Count-in tick (higher "go!" on zero). Skips while muted. */
  const tick = useCallback((go = false) => {
    if (mutedRef.current) return
    tone(go ? 880 : 660, go ? 420 : 140, 0, 0.35)
  }, [tone])

  const toggle = useCallback(() => setMuted((m) => !m), [])
  return { unlock, playNote, tick, muted, toggle }
}
