/// <reference types="@cloudflare/workers-types" />
import { Room } from './room'

export { Room }

interface Env {
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
