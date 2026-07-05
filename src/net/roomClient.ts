/* ============================================================
   Room WebSocket client. Thin transport: opens the socket, sends
   the hello handshake, forwards intents, and hands every server
   message to a callback. All state application lives in the store.
   ============================================================ */

export type ServerMsg =
  | { t: 'state'; score: number; hypeTotal: number; msgCount: number; viewers: number; name: string; slots: number }
  | { t: 'gift'; kind: string; pts: number; em: string; stamp: string; cls: 'splat' | 'bloom' | 'gift'; from: string }
  | { t: 'chat'; html: string; kind: string }

export type Intent =
  | { type: 'hello'; name: string; color: string }
  | { type: 'gift'; kind: string }
  | { type: 'chat'; text: string }

export interface Transport {
  send: (intent: Intent) => void
  close: () => void
}

/** Base URL of the room server. Configurable per environment. */
const HTTP_BASE: string =
  (import.meta.env.VITE_ROOM_SERVER as string | undefined) ?? 'http://localhost:8787'
const WS_BASE = HTTP_BASE.replace(/^http/, 'ws')

export interface Identity {
  name: string
  color: string
}

export function connectRoom(
  code: string,
  identity: Identity,
  onMessage: (msg: ServerMsg) => void,
  onStatus?: (open: boolean) => void,
): Transport {
  const ws = new WebSocket(`${WS_BASE}/api/ws/${code}`)

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'hello', name: identity.name, color: identity.color }))
    onStatus?.(true)
  }
  ws.onclose = () => onStatus?.(false)
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data) as ServerMsg)
    } catch {
      /* ignore malformed frame */
    }
  }

  return {
    send: (intent) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(intent))
    },
    close: () => ws.close(),
  }
}

/** Create a fresh room on the server (party host flow). */
export async function createRoom(name: string, slots: number): Promise<string> {
  const res = await fetch(`${HTTP_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slots }),
  })
  const data = (await res.json()) as { code: string }
  return data.code
}
