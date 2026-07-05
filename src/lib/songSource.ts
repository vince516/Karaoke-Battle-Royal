import type { Song } from './types'
import { GRAVITY_OF_YOU, SONG_CATALOGUE, classicArtist } from './songs'

/* ============================================================
   Client song source. Reads the catalogue from OUR backend
   (D1 via the Worker) — never from a third-party API at runtime.
   Falls back to the bundled originals when the backend is
   unreachable (offline / single-file build).
   ============================================================ */

const HTTP_BASE: string =
  (import.meta.env.VITE_ROOM_SERVER as string | undefined) ?? 'http://localhost:8787'

export interface SongSummary {
  id: string
  title: string
  artist: string
  duration: string
  icon: string
  source: string
  has_audio?: number
}

interface BackendSong {
  id: string
  title: string
  icon: string
  duration: string
  lines: Song['lines']
}

const toSong = (s: BackendSong): Song => ({
  id: s.id,
  title: s.title,
  desc: 'Loaded from catalogue',
  icon: s.icon,
  duration: s.duration,
  lines: s.lines,
})

/** List the catalogue. Falls back to bundled originals offline. */
export async function fetchCatalogue(): Promise<SongSummary[]> {
  try {
    const res = await fetch(`${HTTP_BASE}/api/songs`)
    const data = (await res.json()) as { songs: SongSummary[] }
    return data.songs
  } catch {
    return SONG_CATALOGUE.map((s) => ({
      id: s.id, title: s.title, artist: classicArtist(s.id),
      duration: s.duration, icon: s.icon, source: 'originals',
    }))
  }
}

/** Load a full playable song by id, with an offline fallback. */
export async function loadSong(id: string): Promise<Song> {
  try {
    const res = await fetch(`${HTTP_BASE}/api/songs/${id}`)
    if (!res.ok) throw new Error(String(res.status))
    return toSong((await res.json()) as BackendSong)
  } catch {
    const local = SONG_CATALOGUE.find((s) => s.id === id)
    return local ?? GRAVITY_OF_YOU
  }
}

/** Ingest a song into the catalogue from a source (admin/setup). */
export async function ingestSong(body: unknown): Promise<{ id?: string; error?: string }> {
  const res = await fetch(`${HTTP_BASE}/api/songs/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}
