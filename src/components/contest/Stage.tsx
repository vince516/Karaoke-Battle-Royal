import { useEffect, useMemo, useRef, useState } from 'react'
import { useRoom, tierOf } from '../../state/roomStore'
import { BEAT } from '../../lib/songs'
import { useHlsPlayback } from '../../hooks/useHlsPlayback'
import { Projectile } from './Projectile'
import { Stamp } from './Stamp'

const CUTS = ['c0', 'c1', 'c2', 'c3']
/* Paste a Higgsfield / CDN clip URL here and it takes over the stage,
   falling back to the broadcast rig on error — matches the prototype. */
const LIVE_VIDEO_URL = ''

/**
 * The full-screen singer stage. THE one critical concept: this layer
 * IS the singer's live video stream. In M1 it's the broadcast-rig
 * fallback (portrait + light beams + haze + bokeh); in M3 a WebRTC
 * <video> replaces the rig with the same CSS.
 */
export function Stage({
  stageRef,
  onTap,
  stream,
  hlsUrl,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>
  onTap: () => void
  /** Live WebRTC stream (singer's camera). When present it becomes the
      full-bleed background, replacing the broadcast-rig fallback. */
  stream?: MediaStream | null
  /** Scale-mode LL-HLS egress URL. Preferred over WebRTC when set. */
  hlsUrl?: string | null
}) {
  const projectiles = useRoom((s) => s.projectiles)
  const stamps = useRoom((s) => s.stamps)
  const stagePunch = useRoom((s) => s.stagePunch)
  const hypeTotal = useRoom((s) => s.hypeTotal)

  const [cut, setCut] = useState(0)
  const camRef = useRef<HTMLDivElement>(null)
  const cutFlashRef = useRef<HTMLDivElement>(null)
  const beatFlashRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<HTMLVideoElement>(null)

  // bind the live WebRTC stream to the stage <video>
  useEffect(() => {
    if (liveRef.current) liveRef.current.srcObject = stream ?? null
  }, [stream])
  // scale path: play the LL-HLS egress URL when present
  useHlsPlayback(hlsRef, hlsUrl)

  const hasLive = !!hlsUrl || !!stream

  // 16 crowd phone-lights with randomised drift (generated once)
  const bokeh = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        left: `${4 + Math.random() * 92}%`,
        animationDuration: `${6 + Math.random() * 7}s`,
        animationDelay: `${-Math.random() * 10}s`,
        size: `${4 + Math.random() * 6}px`,
      })),
    [],
  )

  // broadcast director: hard camera cuts every 3–5s + cut flash
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const doCut = () => {
      setCut((c) => (c + 1 + Math.floor(Math.random() * 2)) % CUTS.length)
      const f = cutFlashRef.current
      if (f) {
        f.classList.remove('hit')
        void f.offsetWidth
        f.classList.add('hit')
      }
      timer = setTimeout(doCut, 3000 + Math.random() * 2200)
    }
    timer = setTimeout(doCut, 3600)
    return () => clearTimeout(timer)
  }, [])

  // stage lights pulse on the beat, harder at SUPERMAX
  useEffect(() => {
    const iv = setInterval(() => {
      const f = beatFlashRef.current
      if (!f) return
      if (tierOf(useRoom.getState().hypeTotal) >= 4 || Math.random() < 0.5) {
        f.classList.remove('hit')
        void f.offsetWidth
        f.classList.add('hit')
      }
    }, BEAT * 2)
    return () => clearInterval(iv)
  }, [])

  // score-punch on gift impact
  useEffect(() => {
    if (!stagePunch) return
    const el = stageRef.current
    if (!el) return
    el.classList.remove('punch')
    void el.offsetWidth
    el.classList.add('punch')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagePunch])

  void hypeTotal // subscribe so beat pulse re-reads tier promptly

  return (
    <div ref={stageRef} className="stage" id="stage" onClick={onTap}>
      <div ref={innerRef} style={{ position: 'absolute', inset: 0 }}>
        {/* scale path: LL-HLS egress (CDN) — thousands of viewers */}
        <video
          ref={hlsRef}
          className="feedv"
          autoPlay
          muted
          playsInline
          style={{ display: hlsUrl ? 'block' : 'none' }}
        />
        {/* party path: live WebRTC stream — the singer's real camera */}
        <video
          ref={liveRef}
          className="feedv"
          autoPlay
          muted
          playsInline
          style={{ display: !hlsUrl && stream ? 'block' : 'none' }}
        />
        {LIVE_VIDEO_URL && !hasLive ? (
          <video className="feedv" src={LIVE_VIDEO_URL} autoPlay muted loop playsInline />
        ) : null}
        {/* fallback broadcast rig when no one is on stage */}
        <div ref={camRef} className={`camrig ${CUTS[cut]}`} style={{ display: hasLive ? 'none' : undefined }}>
          <img
            className="feed"
            src="https://randomuser.me/api/portraits/women/68.jpg"
            alt=""
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        <div className="beams">
          <span className="beam" />
          <span className="beam b2" />
          <span className="beam b3" />
        </div>
        <div className="haze" />
        <div className="bokeh">
          {bokeh.map((b, i) => (
            <i
              key={i}
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                animationDuration: b.animationDuration,
                animationDelay: b.animationDelay,
              }}
            />
          ))}
        </div>
        <div ref={beatFlashRef} className="beatflash" />
        <div ref={cutFlashRef} className="cutflash" />
        <div className="shade" />

        {/* gifts in flight + impact stamps live on the stage */}
        {projectiles.map((p) => (
          <Projectile key={p.id} data={p} stageRef={stageRef} />
        ))}
        {stamps.map((s) => (
          <Stamp key={s.id} id={s.id} text={s.text} cls={s.cls} stageRef={stageRef} />
        ))}
      </div>
    </div>
  )
}
