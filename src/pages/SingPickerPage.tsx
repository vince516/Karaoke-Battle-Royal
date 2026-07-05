import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCatalogue, type SongSummary } from '../lib/songSource'

/* Choose a song to sing. Reads the catalogue (backend, or bundled
   originals offline) and hands the pick to the solo karaoke screen. */
export default function SingPickerPage() {
  const nav = useNavigate()
  const [songs, setSongs] = useState<SongSummary[]>([])
  useEffect(() => {
    fetchCatalogue().then(setSongs)
  }, [])

  return (
    <div className="party">
      <div className="wrap">
        <div className="top">
          <div className="brand">✕ Battle <b>Royale</b></div>
          <span className="mode">CHOOSE A SONG</span>
        </div>

        <h1>Pick a track to sing</h1>
        <p className="sub">
          Tap a song — your camera becomes the stage and your voice rides the tone lane. All originals;
          you'll be asked to allow camera &amp; mic.
        </p>

        <div className="card">
          {songs.map((s) => (
            <button key={s.id} className="song" onClick={() => nav(`/sing/${s.id}`)}>
              <span className="sic">{s.icon}</span>
              <span className="si">
                <span className="snm">
                  {s.title} <span className="sunotag">ORIGINAL</span>
                </span>
                <span className="sdt">{s.artist}</span>
              </span>
              <span className="dur num">{s.duration}</span>
            </button>
          ))}
          {songs.length === 0 && <div className="note">Loading songs…</div>}
        </div>

        <p className="linkrow" style={{ marginTop: 18 }}>
          <Link to="/">← Home</Link> &nbsp;·&nbsp; <Link to="/songs">Manage catalogue</Link>
        </p>
      </div>
    </div>
  )
}
