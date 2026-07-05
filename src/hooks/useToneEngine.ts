import { useEffect, useRef, type RefObject } from 'react'
import type { Song, SongLine } from '../lib/types'
import { BEAT, NOTES, DIFFICULTY, type DiffSpec } from '../lib/songs'
import { useRoom } from '../state/roomStore'
import { hzToLane } from './usePitchDetection'

/* ============================================================
   Tone engine — a faithful port of the prototype's canvas loop.

   Song = ordered lines; each line = melody segments {note, beats}
   at 520 ms/beat. Scrolling gold pitch blocks; the singer dot
   rides them (mint on-tone / splat off, dist < 14px). Per-line
   accuracy → pass (≥62%) or fail. Completing with ≥ n-1 passes =
   TONE COMPLETE + hype surge.

   In M1 the singer's pitch is *simulated* (follows the target
   melody with noise + occasional slips). In M4 this same head
   position is fed by real Web Audio pitch frames off the singer's
   mic, relayed through the room so every viewer sees one dot.
   ============================================================ */

const lineDur = (L: SongLine) => L.mel.reduce((s, m) => s + m[1], 0) * BEAT

/** Target note (0..1, y-normalised) at time `ms` into the line. */
function noteAt(L: SongLine, ms: number): number {
  let t = 0
  for (const [n, len] of L.mel) {
    t += len * BEAT
    if (ms < t) return 1 - n / (NOTES - 1)
  }
  return 1 - L.mel[L.mel.length - 1][0] / (NOTES - 1)
}

export function useToneEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  baseRef: RefObject<HTMLSpanElement | null>,
  fillRef: RefObject<HTMLSpanElement | null>,
  song: Song,
  /** When networked, the tone lane is a local visual only — score/hype
      are server-authoritative, so we don't mutate them here. */
  networked = false,
  /** Fired at each melody-segment onset so a synth can play the note. */
  onSegment?: (note: number, durMs: number) => void,
  /** Pitch-tracking strictness (contest = pro). */
  diff: DiffSpec = DIFFICULTY.normal,
  /** Changing this restarts the song from the top (e.g. going live). */
  resetKey: unknown = 0,
) {
  const segCb = useRef(onSegment)
  segCb.current = onSegment
  const diffRef = useRef(diff)
  diffRef.current = diff

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const LINES = song.lines
    // Row spacing shrinks as NOTES grows; scale pixel tolerances (and the
    // simulated-singer wobble) so difficulty is invariant to lane height.
    // =1 at the original 9-row geometry.
    const geomScale = 8 / (NOTES - 1)
    let raf = 0
    let lineIdx = 0
    let lineStart = performance.now()
    let lineResults: boolean[] = []
    let lineAcc: number[] = []
    let singerY = 38 // mid-canvas
    let lastSegKey = -1 // fire the melody synth once per segment onset

    const room = useRoom.getState
    room().setLineResults([])

    function sizeCanvas() {
      if (!cv || !ctx) return
      const r = cv.getBoundingClientRect()
      cv.width = r.width * devicePixelRatio
      cv.height = 76 * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    // Lead-in before line 1 so the first notes scroll IN toward the head
    // instead of the song starting mid-note the moment the screen mounts.
    // Long enough for the 3-2-1 count-in overlay.
    const LEAD = 4000

    function startLine(delay = 0) {
      const L = LINES[lineIdx]
      lineStart = performance.now() + delay
      if (delay > 0) room().setIntro(lineStart) // drives the count-in overlay
      lineAcc = []
      if (baseRef.current) baseRef.current.textContent = L.t
      const f = fillRef.current
      if (f) {
        f.textContent = L.t
        f.style.transition = 'none'
        f.style.width = '0%'
        void f.offsetWidth
        f.style.transition = `width ${lineDur(L)}ms linear ${delay}ms`
        f.style.width = '100%'
      }
    }

    function endLine() {
      const acc = lineAcc.length ? lineAcc.reduce((a, b) => a + b, 0) / lineAcc.length : 0
      const pass = acc >= diffRef.current.pass
      lineResults = [...lineResults, pass]
      const pts = Math.round(acc * 300)
      if (!networked) {
        room().addScore(
          pass ? pts : Math.round(pts * 0.3),
          pass ? `+${pts} TONE ✓` : `+${Math.round(pts * 0.3)} missed`,
          pass,
        )
        if (pass) room().bumpHype(14)
        else room().sysMsg(`⚠️ ${room().singer.name} missed the tone on line ${lineResults.length}`, 'sys-tomato')
      }

      lineIdx++
      if (lineIdx >= LINES.length) {
        const passed = lineResults.filter(Boolean).length
        const done = passed >= LINES.length - 1
        if (!networked) {
          room().sysMsg(
            done
              ? `🏆 TONE COMPLETED — ${passed}/${LINES.length} lines! ${room().singer.name} advances`
              : `❌ Tone not completed — ${passed}/${LINES.length}. Judges' call…`,
            'sys-gold',
          )
          room().showToast(done ? '🏆 TONE COMPLETED!' : 'Tone incomplete…')
          if (done) {
            room().bumpHype(60)
            room().spawnStamp('TONE COMPLETE!', 'gift')
          }
        }
        lineIdx = 0
        lineResults = []
      }
      room().setLineResults(lineResults)
      startLine(lineIdx === 0 ? LEAD : 0) // fresh run-up when the song loops
    }

    function draw(now: number) {
      if (!cv || !ctx) return
      const L = LINES[lineIdx]
      const dur = lineDur(L)
      const ms = now - lineStart
      if (ms >= dur) {
        endLine()
        raf = requestAnimationFrame(draw)
        return
      }
      const W = cv.getBoundingClientRect().width
      const H = 76
      const headX = W * 0.26
      ctx.clearRect(0, 0, W, H)

      // pitch grid
      ctx.strokeStyle = 'rgba(255,255,255,.05)'
      for (let i = 1; i < NOTES - 1; i++) {
        const y = 12 + ((H - 24) * i) / (NOTES - 1)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // scrolling melody blocks
      const speed = (W * 0.9) / dur
      let t = 0
      ctx.lineCap = 'round'
      L.mel.forEach(([n, len], si) => {
        const x0 = headX + (t - ms) * speed
        const x1 = headX + (t + len * BEAT - ms) * speed
        const y = 12 + (H - 24) * (1 - n / (NOTES - 1))
        const active = ms >= t && ms < t + len * BEAT
        // note onset → play the guide-melody note (once per segment)
        if (active) {
          const key = lineIdx * 100 + si
          if (key !== lastSegKey) {
            lastSegKey = key
            segCb.current?.(n, len * BEAT)
          }
        }
        ctx.strokeStyle = active ? '#FFB300' : 'rgba(255,255,255,.28)'
        ctx.lineWidth = active ? 12 : 9
        ctx.beginPath()
        ctx.moveTo(Math.max(x0 + 6, -40), y)
        ctx.lineTo(Math.min(x1 - 6, W + 40), y)
        ctx.stroke()
        t += len * BEAT
      })

      // singer pitch: REAL shared mic pitch if a fresh frame exists
      // (M4 — everyone sees the same dot), else the simulated fallback.
      const target = 12 + (H - 24) * noteAt(L, ms)
      const rs = room()
      const havePitch = rs.livePitchHz > 0 && now - rs.livePitchAt < 300
      if (havePitch) {
        const py = 12 + (H - 24) * hzToLane(rs.livePitchHz)
        singerY += (py - singerY) * 0.35
      } else {
        const wobble = (Math.sin(now / 130) * 4 + Math.sin(now / 47) * 2) * geomScale
        const drift = (Math.sin(now / 2400) > 0.82 ? 26 : 0) * geomScale
        singerY += (target + wobble + drift - singerY) * 0.18
      }
      const dist = Math.abs(singerY - target)
      const onTone = dist < diffRef.current.tol * geomScale
      if (ms >= 0) lineAcc.push(onTone ? 1 : Math.max(0, 1 - dist / (diffRef.current.span * geomScale)))

      // head dot + trail
      ctx.fillStyle = onTone ? 'rgba(23,232,160,.9)' : 'rgba(255,83,48,.9)'
      ctx.beginPath()
      ctx.arc(headX, singerY, 8, 0, 7)
      ctx.fill()
      ctx.strokeStyle = onTone ? 'rgba(23,232,160,.25)' : 'rgba(255,83,48,.25)'
      ctx.lineWidth = 16
      ctx.beginPath()
      ctx.moveTo(headX - 46, singerY)
      ctx.lineTo(headX, singerY)
      ctx.stroke()

      // live match%
      const recent = lineAcc.slice(-60)
      if (recent.length) {
        const m = Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 100)
        room().setMatch(m)
      }

      raf = requestAnimationFrame(draw)
    }

    sizeCanvas()
    addEventListener('resize', sizeCanvas)
    startLine(LEAD)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', sizeCanvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, networked, resetKey])
}
