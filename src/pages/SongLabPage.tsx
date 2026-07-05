import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCatalogue, loadSong, ingestSong, type SongSummary } from '../lib/songSource'
import type { Song } from '../lib/types'

/* ============================================================
   Song Lab — a window onto the backend song catalogue (D1 + R2).
   Lists what's stored, previews a song's synthesised melody, and
   ingests new songs from raw LRC (Suno originals / licensed lyrics
   you have rights to). Everything here reads/writes OUR backend.
   ============================================================ */

const SOURCE_LABEL: Record<string, string> = {
  originals: 'ORIGINAL', suno: 'SUNO', jamendo: 'CC', lrclib: 'LRC',
}

function MelodyPreview({ song }: { song: Song }) {
  const NOTES = 9
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <label className="lab">{song.title.toUpperCase()} · MELODY ({song.lines.length} LINES)</label>
      {song.lines.slice(0, 6).map((l, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 3 }}>{l.t}</div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
            {l.mel.map(([note, beats], j) => (
              <div
                key={j}
                title={`note ${note} · ${beats} beat(s)`}
                style={{
                  width: 10 + beats * 8,
                  height: `${(note / (NOTES - 1)) * 100}%`,
                  background: 'linear-gradient(180deg,#FFB300,#c76b00)',
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SongLabPage() {
  const [catalogue, setCatalogue] = useState<SongSummary[]>([])
  const [preview, setPreview] = useState<Song | null>(null)
  const [title, setTitle] = useState('Neon Sunrise')
  const [lrc, setLrc] = useState(
    '[00:12.30]Chasing the neon sunrise\n[00:15.80]Racing the dawn in your eyes\n[00:19.10]Hold on we are almost home\n[00:22.90]Never gonna face it alone',
  )
  const [msg, setMsg] = useState('')

  const refresh = () => fetchCatalogue().then(setCatalogue)
  useEffect(() => { refresh() }, [])

  const open = async (id: string) => setPreview(await loadSong(id))

  const doIngest = async () => {
    setMsg('Ingesting…')
    const r = await ingestSong({ title, source: 'suno', icon: '🌅', syncedLyrics: lrc })
    if (r.error) setMsg('⚠️ ' + r.error)
    else {
      setMsg('✅ Ingested ' + r.id + ' — melody synthesised from LRC')
      await refresh()
      if (r.id) open(r.id)
    }
  }

  return (
    <div className="party">
      <div className="wrap">
        <div className="top">
          <div className="brand">✕ Battle <b>Royale</b></div>
          <span className="mode">SONG CATALOGUE · BACKEND</span>
        </div>

        <h1>Song Lab</h1>
        <p className="sub">
          The catalogue lives on our backend — D1 for melody + timed lyrics, R2 for audio. External
          APIs (Suno, Jamendo, LRCLIB) are ingestion sources that populate it; the app only ever reads
          from <b style={{ color: 'var(--txt)' }}>/api/songs</b>.
        </p>

        <div className="card">
          <label className="lab">CATALOGUE · {catalogue.length} SONGS</label>
          {catalogue.map((s) => (
            <button key={s.id} className="song" onClick={() => open(s.id)}>
              <span className="sic">{s.icon}</span>
              <span className="si">
                <span className="snm">
                  {s.title} <span className="sunotag">{SOURCE_LABEL[s.source] ?? s.source.toUpperCase()}</span>
                </span>
                <span className="sdt">{s.artist}</span>
              </span>
              <span className="dur num">{s.duration}</span>
            </button>
          ))}
          {catalogue.length === 0 && <div className="note">Backend unreachable — showing nothing. Run <b>npm run server</b>.</div>}
        </div>

        {preview && <MelodyPreview song={preview} />}

        <div className="copycard">
          <div className="cc-t">🎛️ Ingest a song from LRC (Suno original or lyrics you have rights to)</div>
          <input className="fld" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ marginBottom: 8 }} />
          <textarea
            className="fld"
            value={lrc}
            onChange={(e) => setLrc(e.target.value)}
            rows={5}
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, resize: 'vertical' }}
          />
          <button className="copybtn" style={{ marginTop: 10 }} onClick={doIngest}>Ingest → melody</button>
          {msg && <div className="note" style={{ color: 'var(--gold)' }}>{msg}</div>}
        </div>

        <p className="linkrow" style={{ marginTop: 20 }}>
          <Link to="/">← Home</Link> &nbsp;·&nbsp; <Link to="/party">Party room</Link> &nbsp;·&nbsp; <Link to="/contest">Contest</Link>
        </p>
      </div>
    </div>
  )
}
