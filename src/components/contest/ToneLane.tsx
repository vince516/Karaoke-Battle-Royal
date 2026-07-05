import { useRef } from 'react'
import type { Song } from '../../lib/types'
import { DIFFICULTY, type DiffSpec } from '../../lib/songs'
import { useRoom } from '../../state/roomStore'
import { useToneEngine } from '../../hooks/useToneEngine'

export function ToneLane({
  song,
  networked = false,
  onSegment,
  diff = DIFFICULTY.normal,
  resetKey = 0,
}: {
  song: Song
  networked?: boolean
  onSegment?: (note: number, durMs: number) => void
  diff?: DiffSpec
  /** Changing this restarts the song from the top. */
  resetKey?: unknown
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<HTMLSpanElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)

  const match = useRoom((s) => s.match)
  const lineResults = useRoom((s) => s.lineResults)

  useToneEngine(canvasRef, baseRef, fillRef, song, networked, onSegment, diff, resetKey)

  const now = lineResults.length // the next unfinished line is "now"

  return (
    <div className="tonewrap">
      <div className="tonehead">
        <span className="tl">FOLLOW THE TONE</span>
        <span className="difftag">{diff.label.toUpperCase()}</span>
        <span className={`match num${match < 62 ? ' off' : ''}`}>{match}%</span>
        <span className="linesdone">
          {song.lines.map((_, i) => {
            const cls =
              i < lineResults.length ? (lineResults[i] ? 'pass' : 'fail') : i === now ? 'now' : ''
            const mark = i < lineResults.length ? (lineResults[i] ? '✓' : '✗') : ''
            return (
              <span key={i} className={`ld${cls ? ' ' + cls : ''}`}>
                {mark}
              </span>
            )
          })}
        </span>
      </div>
      <canvas ref={canvasRef} className="tone" />
      <div className="lyricline">
        {/* inline-block wrapper shrink-wraps the text so the gold "fill"
            wipe overlays the grey base exactly (no doubled/offset text) */}
        <span className="lwrap">
          <span className="base" ref={baseRef} />
          <span className="fill" ref={fillRef} />
        </span>
      </div>
    </div>
  )
}
