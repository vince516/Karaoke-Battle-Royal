/// <reference types="@cloudflare/workers-types" />
import { parseLrc, linesFromLrc, type SongLine } from './lrc'

/* ============================================================
   Song catalogue on OUR backend (D1 metadata + R2 assets).

   Songs live here — not fetched from a third party at runtime.
   External APIs (Suno for originals, Jamendo for CC audio, LRCLIB
   for timed lyrics) are *ingestion* sources that populate this
   table. Clients only ever read from /api/songs.
   ============================================================ */

export interface SongRow {
  id: string
  title: string
  artist: string
  duration: string
  icon: string
  source: string // originals | suno | jamendo | lrclib
  audio_key: string | null // R2 object key, if audio is stored
  lines: SongLine[]
  synced_lyrics: string | null
}

export interface SongsEnv {
  DB: D1Database
  ASSETS?: R2Bucket
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Battle Royale Originals',
  duration TEXT NOT NULL DEFAULT '3:00',
  icon TEXT NOT NULL DEFAULT '🎵',
  source TEXT NOT NULL DEFAULT 'originals',
  audio_key TEXT,
  lines TEXT NOT NULL,
  synced_lyrics TEXT,
  created_at INTEGER NOT NULL
);`

// The flagship original melody (Suno-style placeholder — no licensed music).
const GRAVITY_LINES: SongLine[] = [
  { t: 'City lights are calling out my name', mel: [[3, 2], [4, 1], [5, 2], [4, 1], [3, 2], [5, 2], [6, 2]] },
  { t: 'Every echo pulls me to your flame', mel: [[5, 2], [6, 1], [7, 2], [6, 1], [5, 2], [4, 2], [3, 2]] },
  { t: "I've been falling faster than the rain", mel: [[2, 2], [3, 2], [4, 1], [5, 1], [6, 2], [5, 2], [4, 2]] },
  { t: "Say the word and I'll be yours again", mel: [[4, 2], [5, 2], [6, 2], [7, 1], [8, 1], [7, 2], [6, 2]] },
  { t: "We're caught in the gravity of you", mel: [[6, 2], [7, 2], [8, 2], [7, 1], [6, 1], [5, 2], [4, 2]] },
  { t: 'Spinning through a sky of neon blue', mel: [[5, 2], [4, 1], [3, 1], [4, 2], [5, 2], [6, 2], [7, 2]] },
  { t: 'Hold the note and never let it land', mel: [[7, 3], [6, 1], [5, 2], [6, 2], [7, 2], [8, 2]] },
  { t: 'Gravity, gravity of you', mel: [[8, 2], [7, 2], [6, 2], [5, 2], [4, 2], [3, 2]] },
]

const ORIGINALS: Omit<SongRow, 'lines' | 'audio_key' | 'synced_lyrics'>[] = [
  { id: 'gravity-of-you', title: 'Gravity of You', artist: 'Battle Royale Originals', duration: '2:58', icon: '💞', source: 'originals' },
  { id: 'midnight-run', title: 'Midnight Run', artist: 'Battle Royale Originals', duration: '3:12', icon: '🌃', source: 'originals' },
  { id: 'paper-crowns', title: 'Paper Crowns', artist: 'Battle Royale Originals', duration: '3:40', icon: '👑', source: 'originals' },
  { id: 'static-bloom', title: 'Static Bloom', artist: 'Battle Royale Originals', duration: '2:47', icon: '⚡', source: 'originals' },
  { id: 'last-train-home', title: 'Last Train Home', artist: 'Battle Royale Originals', duration: '3:55', icon: '🚉', source: 'originals' },
  { id: 'four-am-floor', title: 'Four AM Floor', artist: 'Battle Royale Originals', duration: '2:39', icon: '🪩', source: 'originals' },
]

let seeded = false
export async function ensureSeed(env: SongsEnv) {
  await env.DB.exec(SCHEMA.replace(/\n/g, ' '))
  if (seeded) return
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM songs').first<{ n: number }>()
  if ((row?.n ?? 0) === 0) {
    const now = Date.now()
    const stmt = env.DB.prepare(
      'INSERT INTO songs (id,title,artist,duration,icon,source,audio_key,lines,synced_lyrics,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    )
    await env.DB.batch(
      ORIGINALS.map((s, i) =>
        stmt.bind(s.id, s.title, s.artist, s.duration, s.icon, s.source, null, JSON.stringify(GRAVITY_LINES), null, now + i),
      ),
    )
  }
  seeded = true
}

export async function listSongs(env: SongsEnv) {
  await ensureSeed(env)
  const { results } = await env.DB.prepare(
    'SELECT id,title,artist,duration,icon,source,(audio_key IS NOT NULL) AS has_audio FROM songs ORDER BY created_at',
  ).all()
  return results
}

export async function getSong(env: SongsEnv, id: string): Promise<SongRow | null> {
  await ensureSeed(env)
  const r = await env.DB.prepare('SELECT * FROM songs WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!r) return null
  return {
    id: r.id as string,
    title: r.title as string,
    artist: r.artist as string,
    duration: r.duration as string,
    icon: r.icon as string,
    source: r.source as string,
    audio_key: (r.audio_key as string) ?? null,
    lines: JSON.parse(r.lines as string),
    synced_lyrics: (r.synced_lyrics as string) ?? null,
  }
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'song'

/** Ingest a fully-formed song (e.g. a Suno original with melody). */
export async function ingestSong(
  env: SongsEnv,
  input: { title: string; artist?: string; duration?: string; icon?: string; source?: string; lines?: SongLine[]; syncedLyrics?: string; audioKey?: string },
) {
  await ensureSeed(env)
  // accept either a ready melody or raw LRC (parsed into a melody here)
  const lines = input.lines?.length ? input.lines : input.syncedLyrics ? linesFromLrc(parseLrc(input.syncedLyrics)) : []
  if (!lines.length) throw new Error('ingest needs lines or syncedLyrics')
  const id = `${input.source ?? 'ingest'}-${slug(input.title)}`
  await env.DB.prepare(
    'INSERT OR REPLACE INTO songs (id,title,artist,duration,icon,source,audio_key,lines,synced_lyrics,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      input.title,
      input.artist ?? 'Unknown',
      input.duration ?? '3:00',
      input.icon ?? '🎶',
      input.source ?? 'ingest',
      input.audioKey ?? null,
      JSON.stringify(lines),
      input.syncedLyrics ?? null,
      Date.now(),
    )
    .run()
  return id
}

/** Ingest timed lyrics from LRCLIB (server-side; no CORS, cacheable).
    Note: LRCLIB serves copyrighted lyrics — only ingest tracks you have
    the right to use. The default catalogue is originals. */
export async function ingestFromLrclib(env: SongsEnv, q: { artist: string; track: string; album?: string; duration?: number }) {
  const url = new URL('https://lrclib.net/api/get')
  url.searchParams.set('artist_name', q.artist)
  url.searchParams.set('track_name', q.track)
  if (q.album) url.searchParams.set('album_name', q.album)
  if (q.duration) url.searchParams.set('duration', String(q.duration))
  const res = await fetch(url, { headers: { 'User-Agent': 'BattleRoyale/0.1 (https://github.com/vince516/Karaoke-Battle-Royal)' } })
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`)
  const data = (await res.json()) as { trackName?: string; artistName?: string; syncedLyrics?: string; duration?: number }
  if (!data.syncedLyrics) throw new Error('no synced lyrics for that track')
  const lines = linesFromLrc(parseLrc(data.syncedLyrics))
  const mins = Math.floor((data.duration ?? 0) / 60)
  const secs = Math.round((data.duration ?? 0) % 60)
  const id = await ingestSong(env, {
    title: data.trackName ?? q.track,
    artist: data.artistName ?? q.artist,
    duration: data.duration ? `${mins}:${String(secs).padStart(2, '0')}` : '3:00',
    icon: '🎤',
    source: 'lrclib',
    lines,
    syncedLyrics: data.syncedLyrics,
  })
  return { id, lineCount: lines.length }
}
