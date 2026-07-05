/// <reference types="@cloudflare/workers-types" />
/* ============================================================
   Room Durable Object — one instance per room code, the single
   authoritative owner of that room's live state. Clients open a
   WebSocket, send intents (gift, chat, hello), and the DO mutates
   state and broadcasts to everyone. This is the server the M1
   room store was designed to be fed by.
   ============================================================ */

interface GiftDef {
  pts: number
  em: string
  stamp: string
  cls: 'splat' | 'bloom' | 'gift'
  cooldown?: number
}
const GIFTS: Record<string, GiftDef> = {
  tomato: { pts: -50, em: '🍅', stamp: 'SPLAT!', cls: 'splat', cooldown: 30 },
  flowers: { pts: 50, em: '💐', stamp: 'BRAVO!', cls: 'bloom', cooldown: 30 },
  rose: { pts: 100, em: '🌹', stamp: 'RESPECT!', cls: 'gift' },
  storm: { pts: 500, em: '💞', stamp: 'LOVE STORM!', cls: 'gift' },
  crown: { pts: 2000, em: '👑', stamp: 'ROYALTY!', cls: 'gift' },
}

interface Session {
  ws: WebSocket
  id: string
  name: string
  color: string
  /** last-sent time per free-gift kind, for server-enforced cooldown */
  cd: Record<string, number>
  /** chat rate-limit timestamps */
  chatTimes: number[]
}

interface RoomState {
  code: string
  name: string
  slots: number
  score: number
  hypeTotal: number
  msgCount: number
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export class Room {
  private sessions = new Set<Session>()
  private state: RoomState | null = null
  private decayTimer: ReturnType<typeof setInterval> | null = null
  private nextId = 0
  /** session id currently publishing camera/mic (the live singer), or null */
  private publisherId: string | null = null

  constructor(_state: DurableObjectState, _env: unknown) {}

  private init(seed?: Partial<RoomState>) {
    if (this.state) return
    this.state = {
      code: seed?.code ?? 'ROOM',
      name: seed?.name ?? 'Live Contest',
      slots: seed?.slots ?? 8,
      score: 4120,
      hypeTotal: 170,
      msgCount: 0,
    }
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/init' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as Partial<RoomState>
      this.init(body)
      return Response.json({ ok: true, code: this.state!.code })
    }
    if (url.pathname === '/meta') {
      this.init()
      return Response.json({ exists: true, name: this.state!.name, slots: this.state!.slots })
    }

    if (req.headers.get('Upgrade') === 'websocket') {
      this.init({ code: url.searchParams.get('code') ?? undefined })
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]
      server.accept()
      this.onConnect(server)
      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('not found', { status: 404 })
  }

  private onConnect(ws: WebSocket) {
    const sess: Session = {
      ws,
      id: `s${++this.nextId}`,
      name: 'Guest',
      color: '#FFB300',
      cd: {},
      chatTimes: [],
    }
    this.sessions.add(sess)

    ws.addEventListener('message', (ev) => this.onMessage(sess, ev))
    const drop = () => this.onClose(sess)
    ws.addEventListener('close', drop)
    ws.addEventListener('error', drop)

    // WebRTC bootstrap: tell the newcomer who it is, who else is here, and
    // whether someone is already publishing (the live singer).
    this.safeSend(sess, {
      t: 'welcome',
      selfId: sess.id,
      peers: [...this.sessions].filter((x) => x !== sess).map((x) => x.id),
      publisherId: this.publisherId,
    })
    // announce this peer to everyone else so publishers can offer them media
    for (const other of this.sessions) {
      if (other !== sess) this.safeSend(other, { t: 'peer-join', id: sess.id })
    }

    this.sendState(sess) // snapshot to the newcomer
    this.startDecay()
  }

  private onMessage(sess: Session, ev: MessageEvent) {
    let msg: { type: string; [k: string]: unknown }
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '')
    } catch {
      return
    }
    const s = this.state!

    switch (msg.type) {
      case 'hello': {
        sess.name = String(msg.name || 'Guest').slice(0, 16)
        sess.color = String(msg.color || '#FFB300')
        this.broadcastEvent({
          t: 'chat',
          html: `👋 <span class="u" style="color:${sess.color}">${escapeHtml(sess.name)}</span> joined`,
          kind: 'sys-gold',
        })
        s.msgCount++
        this.broadcastState()
        break
      }
      case 'gift': {
        const g = GIFTS[String(msg.kind)]
        if (!g) return
        const now = Date.now()
        if (g.cooldown) {
          const last = sess.cd[String(msg.kind)] || 0
          if (now - last < g.cooldown * 1000) return // server-enforced cooldown
          sess.cd[String(msg.kind)] = now
        }
        s.score = Math.max(0, s.score + g.pts)
        s.hypeTotal += Math.abs(g.pts) / 25 + 3
        this.broadcastEvent({
          t: 'gift',
          kind: String(msg.kind),
          pts: g.pts,
          em: g.em,
          stamp: g.stamp,
          cls: g.cls,
          from: sess.name,
        })
        s.msgCount++
        this.broadcastEvent({
          t: 'chat',
          html: `${g.em} <span class="u" style="color:${sess.color}">@${escapeHtml(sess.name)}</span> · ${g.pts > 0 ? '+' : ''}${g.pts} pts`,
          kind: g.pts > 0 ? 'sys-gold' : 'sys-tomato',
        })
        this.broadcastState()
        break
      }
      case 'chat': {
        const text = String(msg.text || '').slice(0, 120)
        if (!text.trim()) return
        // rate-limit: max 5 messages / 5s per session
        const now = Date.now()
        sess.chatTimes = sess.chatTimes.filter((t) => now - t < 5000)
        if (sess.chatTimes.length >= 5) return
        sess.chatTimes.push(now)
        s.msgCount++
        this.broadcastEvent({
          t: 'chat',
          html: `<span class="u" style="color:${sess.color}">@${escapeHtml(sess.name)}</span>: ${escapeHtml(text)}`,
          kind: 'user',
        })
        this.broadcastState()
        break
      }
      // ---- WebRTC signaling ----
      case 'publish': {
        this.publisherId = sess.id
        this.broadcastEvent({ t: 'publisher', id: sess.id })
        break
      }
      case 'unpublish': {
        if (this.publisherId === sess.id) {
          this.publisherId = null
          this.broadcastEvent({ t: 'publisher', id: null })
        }
        break
      }
      case 'rtc': {
        // relay an SDP offer/answer or ICE candidate to one specific peer
        const target = [...this.sessions].find((x) => x.id === msg.to)
        if (target) this.safeSend(target, { t: 'rtc', from: sess.id, data: msg.data })
        break
      }
    }
  }

  private onClose(sess: Session) {
    if (!this.sessions.has(sess)) return
    this.sessions.delete(sess)
    try {
      sess.ws.close()
    } catch {
      /* already closing */
    }
    // if the live singer left, clear the publisher so viewers fall back
    if (this.publisherId === sess.id) {
      this.publisherId = null
      this.broadcastEvent({ t: 'publisher', id: null })
    }
    this.broadcastEvent({ t: 'peer-leave', id: sess.id })
    if (this.sessions.size === 0) this.stopDecay()
    else this.broadcastState()
  }

  private snapshot() {
    const s = this.state!
    return {
      t: 'state' as const,
      score: s.score,
      hypeTotal: s.hypeTotal,
      msgCount: s.msgCount,
      viewers: this.sessions.size,
      name: s.name,
      slots: s.slots,
    }
  }

  private sendState(sess: Session) {
    this.safeSend(sess, this.snapshot())
  }
  private broadcastState() {
    const snap = this.snapshot()
    for (const sess of this.sessions) this.safeSend(sess, snap)
  }
  private broadcastEvent(evt: Record<string, unknown>) {
    for (const sess of this.sessions) this.safeSend(sess, evt)
  }
  private safeSend(sess: Session, obj: unknown) {
    try {
      sess.ws.send(JSON.stringify(obj))
    } catch {
      this.sessions.delete(sess)
    }
  }

  private startDecay() {
    if (this.decayTimer) return
    // endless hype decays ~1.5 every 2.6s, server-authoritative
    this.decayTimer = setInterval(() => {
      const s = this.state!
      if (s.hypeTotal > 0) {
        s.hypeTotal = Math.max(0, s.hypeTotal - 1.5)
        this.broadcastState()
      }
    }, 2600)
  }
  private stopDecay() {
    if (this.decayTimer) {
      clearInterval(this.decayTimer)
      this.decayTimer = null
    }
  }
}
