import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom, tierOf } from '../state/roomStore'
import { useAutoHide } from '../hooks/useAutoHide'
import { useSimulatedRoom } from '../hooks/useSimulatedRoom'
import { useRoomSocket } from '../hooks/useRoomSocket'
import { TIERS, GRAVITY_OF_YOU, GUEST_COLORS } from '../lib/songs'
import { Stage } from '../components/contest/Stage'
import { TopBar } from '../components/contest/TopBar'
import { SingerPlate } from '../components/contest/SingerPlate'
import { Score } from '../components/contest/Score'
import { ToneLane } from '../components/contest/ToneLane'
import { HypeBar } from '../components/contest/HypeBar'
import { UpNext } from '../components/contest/UpNext'
import { GiftRail } from '../components/contest/GiftRail'
import { ChatBubbles } from '../components/contest/ChatBubbles'
import { ChatDrawer } from '../components/contest/ChatDrawer'
import { Toast } from '../components/contest/Toast'

/** A stable-ish anonymous identity per browser tab for this session. */
function useIdentity() {
  const ref = useRef<{ name: string; color: string }>(null)
  if (!ref.current) {
    const n = Math.floor(Math.random() * 9000) + 1000
    ref.current = { name: `Guest${n}`, color: GUEST_COLORS[n % GUEST_COLORS.length] }
  }
  return ref.current
}

/**
 * The Tone Contest screen. With a `:code` route param it runs in
 * networked mode — connected to the room's Durable Object, syncing
 * score / hype / gifts / chat / viewers across every browser in the
 * room. Without one it runs the M1 local simulation.
 */
export default function ContestPage() {
  const { code } = useParams()
  const networked = !!code
  const identity = useIdentity()

  const stageRef = useRef<HTMLDivElement>(null)
  const { hidden, toggle } = useAutoHide()

  // networked: connect the socket. local: run the simulated crowd.
  useRoomSocket(code, identity)
  useSimulatedRoom(!networked)

  // gift cooldown ticks run in both modes
  const tickCooldowns = useRoom((s) => s.tickCooldowns)
  useEffect(() => {
    const iv = setInterval(() => tickCooldowns(), 1000)
    return () => clearInterval(iv)
  }, [tickCooldowns])

  const hypeTotal = useRoom((s) => s.hypeTotal)
  const ti = tierOf(hypeTotal)
  const tierClass = TIERS[ti][1]

  const cls = ['contest', tierClass, ti === 4 ? 'supermax' : '', hidden ? 'ui-hidden' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Stage stageRef={stageRef} onTap={toggle} />
      <div className="smflash" />

      <TopBar roomCode={code} />
      <SingerPlate />
      <Score />
      <UpNext />

      <HypeBar />
      <ToneLane song={GRAVITY_OF_YOU} networked={networked} />

      <ChatBubbles />
      <GiftRail />

      <ChatDrawer />
      <Toast />
    </div>
  )
}
