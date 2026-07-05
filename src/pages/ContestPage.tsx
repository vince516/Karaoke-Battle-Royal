import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom, tierOf } from '../state/roomStore'
import { useAutoHide } from '../hooks/useAutoHide'
import { useSimulatedRoom } from '../hooks/useSimulatedRoom'
import { useRoomSocket } from '../hooks/useRoomSocket'
import { useMedia } from '../hooks/useMedia'
import { useWebRTC } from '../hooks/useWebRTC'
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
import { SingerView } from '../components/singer/SingerView'

/** A stable-ish anonymous identity per browser tab for this session. */
function useIdentity() {
  const ref = useRef<{ name: string; color: string }>(null)
  if (!ref.current) {
    const n = Math.floor(Math.random() * 9000) + 1000
    ref.current = { name: `Guest${n}`, color: GUEST_COLORS[n % GUEST_COLORS.length] }
  }
  return ref.current
}

type View = 'audience' | 'singer'

/**
 * The Tone Contest screen. With a `:code` route param it runs in
 * networked mode — connected to the room's Durable Object, syncing
 * score/hype/gifts/chat and carrying live WebRTC video. Swipe (or the
 * page dots) between the audience view and the singer's FPV.
 */
export default function ContestPage() {
  const { code } = useParams()
  const networked = !!code
  const identity = useIdentity()

  const stageRef = useRef<HTMLDivElement>(null)
  const { hidden, toggle } = useAutoHide()

  useRoomSocket(code, identity)
  useSimulatedRoom(!networked)

  // --- live media ---
  const media = useMedia()
  const { remoteStream, publish, unpublish } = useWebRTC(networked)
  const [view, setView] = useState<View>('audience')
  const [live, setLive] = useState(false)
  // the stage background = my camera if I'm the singer, else the singer's stream
  const stageStream = live ? media.stream : remoteStream

  const goLive = async () => {
    const s = await media.start()
    if (s) {
      publish(s)
      setLive(true)
    }
  }
  const endSet = () => {
    unpublish()
    media.stop()
    setLive(false)
    setView('audience')
  }

  // gift cooldown ticks run in both modes
  const tickCooldowns = useRoom((s) => s.tickCooldowns)
  useEffect(() => {
    const iv = setInterval(() => tickCooldowns(), 1000)
    return () => clearInterval(iv)
  }, [tickCooldowns])

  // horizontal swipe → switch view
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => (touch.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) setView(dx < 0 ? 'singer' : 'audience')
  }

  const hypeTotal = useRoom((s) => s.hypeTotal)
  const ti = tierOf(hypeTotal)
  const tierClass = TIERS[ti][1]

  const cls = ['contest', tierClass, ti === 4 ? 'supermax' : '', hidden ? 'ui-hidden' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <Stage stageRef={stageRef} onTap={toggle} stream={stageStream} />
      <div className="smflash" />

      {/* audience overlays */}
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

      {/* page dots: ARENA ⟷ MY CAM */}
      <div className="pagedots">
        <button className={`pd${view === 'audience' ? ' on' : ''}`} onClick={() => setView('audience')}>
          <i />
          ARENA
        </button>
        <button className={`pd${view === 'singer' ? ' on' : ''}`} onClick={() => setView('singer')}>
          <i />
          MY CAM
        </button>
      </div>

      {/* singer first-person view (slides in over the audience view) */}
      <SingerView
        on={view === 'singer'}
        live={live}
        stream={media.stream}
        camOn={media.camOn}
        micOn={media.micOn}
        error={media.error}
        song={GRAVITY_OF_YOU}
        onGoLive={goLive}
        onEndSet={endSet}
        toggleCam={media.toggleCam}
        toggleMic={media.toggleMic}
      />
    </div>
  )
}
