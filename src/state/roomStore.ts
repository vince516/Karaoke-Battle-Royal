import { create } from 'zustand'
import type {
  Bubble, ChatKind, ChatMessage, Floater, GiftKind, Projectile, Singer,
} from '../lib/types'
import { GIFTS, TIERS } from '../lib/songs'
import { escapeHtml, fmt, nextId } from '../lib/format'
import type { ServerMsg, Transport } from '../net/roomClient'

/* ============================================================
   Room store — the client-side mirror of a room's authoritative
   state. In M1 it is driven locally (tone engine + simulated
   crowd). In M2 the same setters are fed by diffs a Durable
   Object broadcasts over the room WebSocket, so component code
   never changes.
   ============================================================ */

interface RoomState {
  // --- headline counters ---
  score: number
  viewers: number
  msgCount: number
  hypeTotal: number // endless — never capped

  // --- performers ---
  singer: Singer
  upNext: Singer

  // --- tone engine mirror ---
  lineResults: boolean[]
  match: number // live accuracy %
  scoreZoom: boolean

  // --- transient visuals ---
  messages: ChatMessage[]
  bubbles: Bubble[]
  floaters: Floater[]
  projectiles: Projectile[]
  stamps: { id: number; text: string; cls: 'splat' | 'bloom' | 'gift' }[]
  toast: string
  stagePunch: number // increments to re-trigger the punch animation

  // --- gift cooldowns (server-enforced in production) ---
  cooldowns: Record<'tomato' | 'flowers', number>

  // --- networking (M2) ---
  networked: boolean
  connected: boolean
  transport: Transport | null

  // --- chrome ---
  chatOpen: boolean

  // --- actions ---
  addScore: (n: number, label: string, plus: boolean) => void
  sendGift: (kind: GiftKind, fromSelf?: boolean) => void
  bumpHype: (n: number) => void
  decayHype: () => void
  tickCooldowns: () => void
  addMessage: (html: string, kind?: ChatKind) => void
  appendMessage: (html: string, kind?: ChatKind) => void
  sysMsg: (text: string, kind: ChatKind) => void
  addBubble: (html: string) => void
  sendChat: (text: string) => void
  removeFloater: (id: number) => void
  removeBubble: (id: number) => void
  removeProjectile: (id: number) => void
  spawnStamp: (text: string, cls: 'splat' | 'bloom' | 'gift') => void
  removeStamp: (id: number) => void
  showToast: (text: string) => void
  setLineResults: (r: boolean[]) => void
  setMatch: (m: number) => void
  toggleChat: () => void
  bumpViewers: (delta: number) => void

  // --- networking actions ---
  setTransport: (t: Transport | null) => void
  setConnected: (v: boolean) => void
  handleServerMsg: (msg: ServerMsg) => void
}

/** Derive hype tier index (0..4) from the endless total. */
export const tierOf = (hypeTotal: number) =>
  Math.min(Math.floor(hypeTotal / 100), TIERS.length - 1)

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useRoom = create<RoomState>((set, get) => ({
  score: 4120,
  viewers: 12418,
  msgCount: 12204,
  hypeTotal: 170,

  singer: { name: 'Nova Vega', initial: 'N', song: 'Gravity of You' },
  upNext: { name: 'Jax Motion', initial: 'J', song: 'Midnight Run' },

  lineResults: [],
  match: 92,
  scoreZoom: false,

  messages: [],
  bubbles: [],
  floaters: [],
  projectiles: [],
  stamps: [],
  toast: '',
  stagePunch: 0,

  cooldowns: { tomato: 0, flowers: 0 },

  networked: false,
  connected: false,
  transport: null,

  chatOpen: false,

  addScore: (n, label, plus) => {
    const score = Math.max(0, get().score + n)
    const floater: Floater = { id: nextId(), label, plus }
    set((s) => ({
      score,
      scoreZoom: true,
      floaters: [...s.floaters, floater],
    }))
    setTimeout(() => set({ scoreZoom: false }), 200)
  },

  sendGift: (kind, fromSelf = true) => {
    const g = GIFTS[kind]
    // free-gift cooldown — optimistic locally; the server also enforces it
    if (g.cooldown) {
      if (get().cooldowns[kind as 'tomato' | 'flowers'] > 0) return
      set((s) => ({ cooldowns: { ...s.cooldowns, [kind]: g.cooldown! } }))
    }
    // networked: send an intent; the visuals + score arrive as server echoes
    const transport = get().transport
    if (transport) {
      transport.send({ type: 'gift', kind })
      return
    }
    set((s) => ({
      projectiles: [...s.projectiles, { id: nextId(), em: g.em, stamp: g.stamp, cls: g.cls }],
    }))
    get().addScore(g.pts, `${g.pts > 0 ? '+' : ''}${g.pts} ${g.em}`, g.pts > 0)
    get().bumpHype(Math.abs(g.pts) / 25 + 3)
    const who = fromSelf ? 'You' : ''
    if (fromSelf) {
      get().sysMsg(
        `${g.em} You sent ${kind} · ${g.pts > 0 ? '+' : ''}${g.pts} pts`,
        g.pts > 0 ? (kind === 'flowers' ? 'sys-flower' : 'sys-gold') : 'sys-tomato',
      )
      get().addBubble(`${g.em} <span class="u" style="color:var(--gold)">${who}</span> ${g.pts > 0 ? '+' : ''}${g.pts}`)
    }
  },

  bumpHype: (n) => {
    set((s) => ({ hypeTotal: s.hypeTotal + n }))
  },
  decayHype: () => set((s) => ({ hypeTotal: Math.max(0, s.hypeTotal - 1.5) })),

  tickCooldowns: () =>
    set((s) => ({
      cooldowns: {
        tomato: Math.max(0, s.cooldowns.tomato - 1),
        flowers: Math.max(0, s.cooldowns.flowers - 1),
      },
    })),

  // append a message without touching msgCount (server owns the count)
  appendMessage: (html, kind = 'guest') =>
    set((s) => {
      const messages = [...s.messages, { id: nextId(), html, kind }]
      // cap client render at 60 (matches prototype + scale note)
      if (messages.length > 60) messages.splice(0, messages.length - 60)
      return { messages }
    }),

  addMessage: (html, kind = 'guest') => {
    get().appendMessage(html, kind)
    set((s) => ({ msgCount: s.msgCount + 1 }))
  },

  sysMsg: (text, kind) => get().addMessage(text, kind),

  addBubble: (html) =>
    set((s) => {
      if (s.chatOpen) return s
      const bubbles = [...s.bubbles, { id: nextId(), html }]
      if (bubbles.length > 4) bubbles.splice(0, bubbles.length - 4)
      return { bubbles }
    }),

  sendChat: (text) => {
    if (!text.trim()) return
    const transport = get().transport
    if (transport) {
      transport.send({ type: 'chat', text })
      return
    }
    get().addMessage(`<span class="u" style="color:var(--gold)">@you</span>: ${escapeHtml(text)}`, 'user')
  },

  removeFloater: (id) => set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) })),
  removeBubble: (id) => set((s) => ({ bubbles: s.bubbles.filter((b) => b.id !== id) })),
  removeProjectile: (id) =>
    set((s) => ({
      projectiles: s.projectiles.filter((p) => p.id !== id),
      stagePunch: s.stagePunch + 1,
    })),
  spawnStamp: (text, cls) =>
    set((s) => ({ stamps: [...s.stamps, { id: nextId(), text, cls }] })),
  removeStamp: (id) => set((s) => ({ stamps: s.stamps.filter((st) => st.id !== id) })),

  showToast: (text) => {
    set({ toast: text })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: '' }), 2600)
  },

  setLineResults: (lineResults) => set({ lineResults }),
  setMatch: (match) => set({ match }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  bumpViewers: (delta) => set((s) => ({ viewers: Math.max(0, s.viewers + delta) })),

  setTransport: (transport) => set({ transport, networked: transport !== null }),
  setConnected: (connected) => set({ connected }),

  // Apply an authoritative server message. `state` messages replace the
  // synced counters; `gift`/`chat` are events each client renders itself.
  handleServerMsg: (msg) => {
    if (msg.t === 'state') {
      set({
        score: msg.score,
        hypeTotal: msg.hypeTotal,
        msgCount: msg.msgCount,
        viewers: msg.viewers,
      })
      return
    }
    if (msg.t === 'gift') {
      const plus = msg.pts > 0
      set((s) => ({
        projectiles: [...s.projectiles, { id: nextId(), em: msg.em, stamp: msg.stamp, cls: msg.cls }],
        floaters: [...s.floaters, { id: nextId(), label: `${plus ? '+' : ''}${msg.pts} ${msg.em}`, plus }],
        scoreZoom: true,
      }))
      setTimeout(() => set({ scoreZoom: false }), 200)
      return
    }
    if (msg.t === 'chat') {
      get().appendMessage(msg.html, msg.kind as ChatKind)
      get().addBubble(msg.html)
    }
  },
}))

/** Formatted convenience selectors. */
export const selScore = (s: RoomState) => fmt(s.score)
export const selViewers = (s: RoomState) => fmt(s.viewers)

// Dev-only: expose the store for debugging in the browser console.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __room: typeof useRoom }).__room = useRoom
}
