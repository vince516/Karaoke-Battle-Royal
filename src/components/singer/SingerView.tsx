import { useEffect, useRef, useState } from 'react'
import type { Song } from '../../lib/types'
import { BEAT } from '../../lib/songs'
import { roomBus } from '../../net/roomClient'

interface Props {
  on: boolean
  live: boolean
  stream: MediaStream | null
  camOn: boolean
  micOn: boolean
  error: string | null
  song: Song
  onGoLive: () => void
  onEndSet: () => void
  toggleCam: () => void
  toggleMic: () => void
}

const lineDur = (mel: [number, number][]) => mel.reduce((s, m) => s + m[1], 0) * BEAT

/**
 * Singer first-person view. Mirrored self-cam background, giant
 * lyrics with the "YOUR PART" pill + get-ready dots, mic/cam/end-set
 * controls, and incoming-gift banners. Ported from arena.html's
 * singer layer. This is the publisher's own screen.
 */
export function SingerView({
  on, live, stream, camOn, micOn, error, song, onGoLive, onEndSet, toggleCam, toggleMic,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [lineIdx, setLineIdx] = useState(0)
  const [ready, setReady] = useState(true)
  const [banner, setBanner] = useState<{ em: string; text: string } | null>(null)

  // bind the live stream to the <video>
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  // lyric stepper (believable FPV while singing)
  useEffect(() => {
    if (!live) return
    setReady(true)
    const warm = setTimeout(() => setReady(false), 1800)
    let i = 0
    const step = setInterval(() => {
      i = (i + 1) % song.lines.length
      setLineIdx(i)
    }, lineDur(song.lines[0].mel))
    return () => {
      clearTimeout(warm)
      clearInterval(step)
    }
  }, [live, song])

  // incoming-gift banners (from the shared room)
  useEffect(() => {
    return roomBus.on((msg) => {
      if (msg.t === 'gift') {
        setBanner({ em: msg.em, text: `${msg.from} sent ${msg.pts > 0 ? '+' : ''}${msg.pts}` })
        setTimeout(() => setBanner(null), 2200)
      }
    })
  }, [])

  const cur = song.lines[lineIdx]
  const next = song.lines[(lineIdx + 1) % song.lines.length]

  return (
    <div className={`fpv${on ? ' on' : ''}`}>
      {live ? (
        <>
          <video ref={videoRef} className="selffeed" autoPlay muted playsInline />
          {!camOn && (
            <div className="camoff">
              <span className="big">📷</span>
              CAMERA OFF — AUDIO ONLY
            </div>
          )}
          <div className="selfgrain" />

          <span className="fpvtag">
            <span className="dot" />
            YOU'RE LIVE
          </span>

          <div className={`inbanner${banner ? ' show' : ''}`}>
            <span className="em">{banner?.em}</span>
            <span>{banner?.text}</span>
          </div>

          <div className="singlyr">
            {ready ? (
              <span className="readydots">
                <i />
                <i />
                <i />
              </span>
            ) : (
              <span className="partpill">🎤 YOUR PART</span>
            )}
            <div className="lline">{cur.t}</div>
            <div className="lnext">{next.t}</div>
          </div>

          <div className="fpvcontrols">
            <button className={`ctrlbtn${micOn ? '' : ' off'}`} onClick={toggleMic} aria-label="Toggle mic">
              {micOn ? '🎙️' : '🔇'}
            </button>
            <button className="ctrlbtn end" onClick={onEndSet} aria-label="End set">
              ⏹
            </button>
            <button className={`ctrlbtn${camOn ? '' : ' off'}`} onClick={toggleCam} aria-label="Toggle camera">
              {camOn ? '📹' : '🚫'}
            </button>
          </div>
        </>
      ) : (
        <div className="golive">
          <h2>Take the stage</h2>
          <p>
            Go live and your camera becomes the contest background for everyone in the room. Sing the
            tone, ride the hype — the crowd scores you in real time.
          </p>
          <button className="startbtn" onClick={onGoLive}>
            🔴 Go live
          </button>
          {error && <div className="err">⚠️ {error}</div>}
        </div>
      )}
    </div>
  )
}
