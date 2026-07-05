import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCode } from '../components/QRCode'
import { useCast } from '../hooks/useCast'

/* ============================================================
   Big-screen / TV view. Cast or mirror this to a smart TV: a giant
   scannable QR, the room code + PIN, and a bold stage backdrop.
   Guests scan with their phones to join and control from the couch.
   ============================================================ */
function randCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}

export default function TvPage() {
  const { code: paramCode } = useParams()
  // a stable code + pin for this display session
  const { code, pin } = useMemo(
    () => ({ code: paramCode ?? randCode(), pin: String(Math.floor(1000 + Math.random() * 9000)) }),
    [paramCode],
  )
  const { cast } = useCast()
  const [msg, setMsg] = useState('')

  // where a phone lands when it scans — the app on this same origin
  const origin = window.location.origin + import.meta.env.BASE_URL
  const joinUrl = `${origin}#/sing`
  const selfUrl = `${origin}#/tv/${code}`

  const doCast = () => {
    const r = cast(selfUrl)
    setMsg(
      r === 'casting'
        ? 'Pick your TV / Chromecast in the dialog…'
        : 'Opened the big-screen view — use your browser’s Cast, or your TV’s screen mirroring.',
    )
    setTimeout(() => setMsg(''), 6000)
  }

  return (
    <div className="tv">
      <div className="tv-bg">
        <span className="beam" />
        <span className="beam b2" />
        <span className="beam b3" />
      </div>

      <div className="tv-grid">
        <div className="tv-left">
          <div className="tv-brand">
            ✕ Battle <b>Royale</b>
          </div>
          <div className="tv-live">
            <i />LIVE · TV MODE
          </div>
          <h1 className="tv-title">Scan to join the room</h1>
          <p className="tv-sub">No app, no sign-up — point your camera at the code and you’re in.</p>

          <div className="tv-meta">
            <div className="tv-metacard">
              <span className="tv-lab">ROOM CODE</span>
              <span className="tv-code num">{code}</span>
            </div>
            <div className="tv-metacard">
              <span className="tv-lab">PIN</span>
              <span className="tv-pin num">{pin}</span>
            </div>
          </div>
          <div className="tv-url">{joinUrl.replace(/^https?:\/\//, '')}</div>

          <div className="tv-actions">
            <button className="tv-castbtn" onClick={doCast}>📺 Cast this screen to a TV</button>
            <Link to="/sing" className="tv-ghost">🎤 Start singing</Link>
          </div>
          {msg && <div className="tv-msg">{msg}</div>}
          <div className="tv-hint">
            On the TV browser you can also just open <b>{selfUrl.replace(/^https?:\/\//, '')}</b>
          </div>
        </div>

        <div className="tv-right">
          <div className="tv-qrcard">
            <QRCode text={joinUrl} size={300} />
          </div>
          <div className="tv-scan">SCAN TO JOIN</div>
        </div>
      </div>
    </div>
  )
}
