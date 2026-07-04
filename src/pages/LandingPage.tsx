import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="party">
      <div className="wrap">
        <div className="top">
          <div className="brand">
            ✕ Battle <b>Royale</b>
          </div>
          <span className="mode">LIVE TONE CONTEST</span>
        </div>

        <section className="screen">
          <h1>
            The live <i>singing</i> contest
            <br />
            where the crowd keeps score
          </h1>
          <p className="sub">
            A TikTok-Live stage built around one singer at a time. Follow the tone, throw tomatoes and
            crowns, and drive the endless hype bar to SUPERMAX. Every gift is points; every point
            feeds the prize pool.
          </p>

          <div className="hero-cta">
            <Link to="/contest" className="big red" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              ▶ Watch the live contest
            </Link>
            <Link to="/party" className="big ghost" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              🎤 Host or join a party room
            </Link>
          </div>

          <div className="feat">
            <div className="f">
              <div className="fe">🎯</div>
              <div className="ft">Follow the tone</div>
              <div className="fd">Ride the scrolling melody; each line passes or fails on live pitch accuracy.</div>
            </div>
            <div className="f">
              <div className="fe">🍅</div>
              <div className="ft">Gifts = points</div>
              <div className="fd">Tomatoes subtract, flowers &amp; crowns add — all straight onto the score.</div>
            </div>
            <div className="f">
              <div className="fe">🔥</div>
              <div className="ft">Endless hype</div>
              <div className="fd">No ceiling. Chain passes and gifts up through five tiers to SUPERMAX.</div>
            </div>
            <div className="f">
              <div className="fe">📲</div>
              <div className="ft">QR party rooms</div>
              <div className="fd">Scan, PIN, pick a Suno original — no account, no download.</div>
            </div>
          </div>

          <p className="linkrow">
            Milestone <b style={{ color: 'var(--txt)' }}>M1 — static parity</b>. Rooms, live WebRTC video, and the
            real tone engine land in M2–M4. <Link to="/contest">Jump to the stage →</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
