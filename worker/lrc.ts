/* ============================================================
   LRC parsing + melody synthesis (server-side, used at ingest).

   External sources (LRCLIB, Suno) give timed lyrics in LRC format
   but no pitch line. We parse the LRC into timed lines and, when no
   melody is supplied, synthesise a singable contour from the line's
   duration + a deterministic seed so the tone engine has something
   to ride. Real melody data (e.g. from Suno stems) overrides this.
   ============================================================ */

export interface TimedLine {
  time: number // seconds
  text: string
}

export type MelodySegment = [note: number, beats: number]
export interface SongLine {
  t: string
  mel: MelodySegment[]
}

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/

/** Parse standard LRC text into ordered timed lines (metadata tags skipped). */
export function parseLrc(lrc: string): TimedLine[] {
  const out: TimedLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(LRC_LINE)
    if (!m) continue
    const min = Number(m[1])
    const sec = Number(m[2])
    const frac = m[3] ? Number((m[3] + '00').slice(0, 3)) / 1000 : 0
    const text = m[4].trim()
    if (!text) continue // skip blank/instrumental lines
    out.push({ time: min * 60 + sec + frac, text })
  }
  return out.sort((a, b) => a.time - b.time)
}

// small deterministic PRNG so a given lyric always yields the same melody
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
const hash = (str: string) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const BEAT = 520 // ms per beat, matches the tone engine
const NOTES = 9

/**
 * Synthesise a melody for one line: a smooth-ish walk across the 0..8
 * pitch rows, segment count ≈ syllables, total beats ≈ the line's real
 * on-screen duration. Deterministic per lyric text.
 */
function synthMelody(text: string, durationMs: number): MelodySegment[] {
  const rnd = seeded(hash(text))
  const sylla = Math.max(3, Math.min(9, text.split(/\s+/).length + 1))
  const totalBeats = Math.max(sylla, Math.round(durationMs / BEAT))
  const segs: MelodySegment[] = []
  let note = 3 + Math.floor(rnd() * 3) // start mid-low
  let beatsLeft = totalBeats
  for (let i = 0; i < sylla; i++) {
    const remaining = sylla - i
    const beats = i === sylla - 1 ? Math.max(1, beatsLeft) : Math.max(1, Math.round(beatsLeft / remaining + (rnd() - 0.5)))
    beatsLeft -= beats
    segs.push([note, Math.min(3, Math.max(1, beats))])
    // step the melody by -2..+2, clamped to the lane
    note = Math.max(1, Math.min(NOTES - 1, note + Math.round((rnd() - 0.5) * 4)))
    if (beatsLeft <= 0) break
  }
  return segs
}

/** Convert timed LRC lines into tone-engine SongLines with a melody. */
export function linesFromLrc(timed: TimedLine[]): SongLine[] {
  return timed.map((line, i) => {
    const next = timed[i + 1]
    const durMs = next ? (next.time - line.time) * 1000 : 3000
    return { t: line.text, mel: synthMelody(line.text, durMs) }
  })
}
