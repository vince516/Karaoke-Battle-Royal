import { useEffect } from 'react'
import { useRoom } from '../state/roomStore'
import { GIFTS, GUEST_NAMES, CHAT_LINES, GUEST_COLORS } from '../lib/songs'
import type { GiftKind } from '../lib/types'

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/* ============================================================
   Simulated room feed (M1 only).

   Stands in for the crowd until M2 wires a Durable Object over
   WebSocket: ambient chat, crowd gifts that move the score/hype,
   hype decay, gift-cooldown ticks, and drifting viewer counts.
   Every effect here is replaced by real server diffs later.
   ============================================================ */
export function useSimulatedRoom() {
  useEffect(() => {
    const r = useRoom.getState

    // opening system message
    r().sysMsg(
      "🎯 Round 1: complete the tone. Audience gifts add to the singer's points. Hype has no ceiling — take it to SUPERMAX.",
      'sys-gold',
    )

    // crowd chatter
    const chat = setInterval(() => {
      const u = pick(GUEST_NAMES)
      const c = pick(GUEST_COLORS)
      const t = pick(CHAT_LINES)
      r().addMessage(`<span class="u" style="color:${c}">@${u}</span>: ${t}`)
      if (Math.random() < 0.4) r().addBubble(`<span class="u" style="color:${c}">@${u}</span>&nbsp;${t}`)
    }, 2100)

    // crowd gifts add points too + viewer drift
    const gifts = setInterval(() => {
      if (Math.random() < 0.55) {
        const kinds = Object.keys(GIFTS) as GiftKind[]
        const k = pick(kinds)
        const g = GIFTS[k]
        const u = pick(GUEST_NAMES)
        r().addScore(g.pts, `${g.pts > 0 ? '+' : ''}${g.pts} ${g.em}`, g.pts > 0)
        r().bumpHype(Math.abs(g.pts) / 30 + 2)
        r().sysMsg(`${g.em} @${u} · ${g.pts > 0 ? '+' : ''}${g.pts} pts`, g.pts > 0 ? 'sys-gold' : 'sys-tomato')
      }
      r().bumpViewers(Math.floor(Math.random() * 60) - 15)
    }, 3800)

    // endless hype decay
    const decay = setInterval(() => r().decayHype(), 2600)
    // free-gift cooldowns
    const cd = setInterval(() => r().tickCooldowns(), 1000)

    return () => {
      clearInterval(chat)
      clearInterval(gifts)
      clearInterval(decay)
      clearInterval(cd)
    }
  }, [])
}
