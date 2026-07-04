import { useRef } from 'react'
import { useRoom, tierOf } from '../state/roomStore'
import { useAutoHide } from '../hooks/useAutoHide'
import { useSimulatedRoom } from '../hooks/useSimulatedRoom'
import { TIERS, GRAVITY_OF_YOU } from '../lib/songs'
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

/**
 * The Tone Contest — the flagship product screen. A faithful React
 * port of the prototype's index.html, wired to the room store.
 * Hype tier + SUPERMAX + tap-hide are expressed as container
 * classes so every descendant's CSS behaves exactly as the
 * prototype's body-level classes did.
 */
export default function ContestPage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const { hidden, toggle } = useAutoHide()
  useSimulatedRoom()

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

      <TopBar />
      <SingerPlate />
      <Score />
      <UpNext />

      <HypeBar />
      <ToneLane song={GRAVITY_OF_YOU} />

      <ChatBubbles />
      <GiftRail />

      <ChatDrawer />
      <Toast />
    </div>
  )
}
