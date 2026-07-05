/// <reference types="@cloudflare/workers-types" />
import { Room } from './room'
import { listSongs, getSong, ingestSong, ingestFromLrclib, type SongsEnv } from './songs'

export { Room }

interface Env extends SongsEnv {
  ROOMS: DurableObjectNamespace
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function genCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

    // create a room with a fresh code (party host flow)
    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { name?: string; slots?: number }
      const code = genCode()
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
      await stub.fetch('https://do/init', {
        method: 'POST',
        body: JSON.stringify({ code, name: body.name, slots: body.slots }),
      })
      return json({ code })
    }

    // room metadata (for join validation)
    const meta = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/)
    if (meta && req.method === 'GET') {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(meta[1]))
      const res = await stub.fetch('https://do/meta')
      return json(await res.json())
    }

    // ---- song catalogue (our backend: D1 + R2) ----
    if (url.pathname === '/api/songs' && req.method === 'GET') {
      return json({ songs: await listSongs(env) })
    }
    const audio = url.pathname.match(/^\/api\/songs\/([A-Za-z0-9-]+)\/audio$/)
    if (audio && req.method === 'GET') {
      const song = await getSong(env, audio[1])
      if (!song?.audio_key || !env.ASSETS) return new Response('no audio', { status: 404, headers: CORS })
      const obj = await env.ASSETS.get(song.audio_key)
      if (!obj) return new Response('not found', { status: 404, headers: CORS })
      return new Response(obj.body, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000', ...CORS },
      })
    }
    const song = url.pathname.match(/^\/api\/songs\/([A-Za-z0-9-]+)$/)
    if (song && req.method === 'GET') {
      const s = await getSong(env, song[1])
      return s ? json(s) : new Response('not found', { status: 404, headers: CORS })
    }
    // ingest from a source into our catalogue (Suno original payload, or LRCLIB ref)
    if (url.pathname === '/api/songs/ingest' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
      try {
        if (body.lrclib) {
          const q = body.lrclib as { artist: string; track: string; album?: string; duration?: number }
          return json(await ingestFromLrclib(env, q))
        }
        const id = await ingestSong(env, body as never)
        return json({ id })
      } catch (e) {
        return json({ error: (e as Error).message }, 400)
      }
    }

    // websocket upgrade → forward to the room's DO
    const ws = url.pathname.match(/^\/api\/ws\/([A-Za-z0-9]+)$/)
    if (ws) {
      const code = ws[1]
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
      const fwd = new Request(`https://do/ws?code=${code}`, req)
      return stub.fetch(fwd)
    }

    return new Response('not found', { status: 404, headers: CORS })
  },
}
