import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom, tierOf } from '../state/roomStore'
import { useAutoHide } from '../hooks/useAutoHide'
import { useSimulatedRoom } from '../hooks/useSimulatedRoom'
import { useRoomSocket } from '../hooks/useRoomSocket'
import { useMedia } from '../hooks/useMedia'
import { useWebRTC } from '../hooks/useWebRTC'
import { usePitchDetection, noteToHz } from '../hooks/usePitchDetection'
import { useMelodySynth } from '../hooks/useMelodySynth'
import { TIERS, GRAVITY_OF_YOU, GUEST_COLORS, DIFFICULTY, type Difficulty } from '../lib/songs'
import { loadSong } from '../lib/songSource'
import type { Song } from '../lib/types'
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
import { GiftBursts } from '../components/contest/GiftBursts'
import { SingerView } from '../components/singer/SingerView'

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
 * The stage screen in three modes:
 *  - sim   (/contest)       demo: simulated crowd, no camera
 *  - room  (/room/:code)    networked: synced gifts/chat + WebRTC video
 *  - solo  (/sing/:songId)  real karaoke: your camera + mic score the chosen song
 */
export default function ContestPage() {
  const { code, songId } = useParams()
  const mode: 'sim' | 'room' | 'solo' = code ? 'room' : songId ? 'solo' : 'sim'
  const networked = mode === 'room'
  const identity = useIdentity()

  const stageRef = useRef<HTMLDivElement>(null)
  const { hidden, toggle } = useAutoHide()

  useRoomSocket(code, identity)
  useSimulatedRoom(mode === 'sim')

  // --- difficulty: solo picks; the room (real contest) is Pro level ---
  const [soloDiff, setSoloDiff] = useState<Difficulty>('normal')
  const diff = mode === 'room' ? DIFFICULTY.pro : mode === 'solo' ? DIFFICULTY[soloDiff] : DIFFICULTY.normal

  // --- chosen song (solo loads from the catalogue) ---
  const [song, setSong] = useState<Song>(GRAVITY_OF_YOU)
  useEffect(() => {
    if (mode === 'solo' && songId) loadSong(songId).then(setSong)
  }, [mode, songId])

  // --- live media ---
  const media = useMedia()
  const { remoteStream, publish, unpublish } = useWebRTC(networked)
  const [view, setView] = useState<View>('audience')
  const [live, setLive] = useState(false)
  const stageStream = live ? media.stream : remoteStream

  // guide-melody synth (plays the song's notes so there's music to sing to)
  const synth = useMelodySynth()

  // solo: one tap starts camera + mic and the song
  const startSolo = async () => {
    synth.unlock() // AudioContext must resume from a user gesture
    const s = await media.start()
    if (s) {
      setLive(true)
      useRoom.setState({ singer: { name: 'You', initial: 'U', song: song.title } })
    }
  }
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

  // real mic pitch drives the tone dot (solo scores locally; room relays it)
  usePitchDetection(live ? media.stream : null, (f) => {
    if (networked) useRoom.getState().transport?.send({ type: 'pitch', hz: f.hz, clarity: f.clarity })
    useRoom.setState({ livePitchHz: f.hz, livePitchAt: performance.now() })
  })

  const tickCooldowns = useRoom((s) => s.tickCooldowns)
  useEffect(() => {
    const iv = setInterval(() => tickCooldowns(), 1000)
    return () => clearInterval(iv)
  }, [tickCooldowns])

  // swipe between audience/singer view (room mode only)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => (touch.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current
    touch.current = null
    if (!t || mode !== 'room') return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) setView(dx < 0 ? 'singer' : 'audience')
  }

  const hlsUrl = mode === 'room' && !live ? (import.meta.env.VITE_HLS_URL ?? null) : null

  const hypeTotal = useRoom((s) => s.hypeTotal)
  const ti = tierOf(hypeTotal)
  const cls = ['contest', TIERS[ti][1], ti === 4 ? 'supermax' : '', hidden ? 'ui-hidden' : '']
    .filter(Boolean)
    .join(' ')

  const soloGate = mode === 'solo' && !live

  return (
    <div
      className={cls}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <Stage stageRef={stageRef} onTap={toggle} stream={stageStream} hlsUrl={hlsUrl} />
      <div className="smflash" />

      <TopBar roomCode={code} />
      <SingerPlate />
      <Score />
      {mode !== 'solo' && <UpNext />}

      <HypeBar />
      <ToneLane
        song={mode === 'solo' ? song : GRAVITY_OF_YOU}
        networked={networked}
        diff={diff}
        onSegment={mode === 'solo' && live ? (note, durMs) => synth.playNote(noteToHz(note), durMs) : undefined}
        // going live restarts the song from the top (it idles behind the gate)
        resetKey={live}
      />

      {/* crowd + gifts belong to the demo/room, not solo karaoke */}
      {mode !== 'solo' && (
        <>
          <ChatBubbles />
          <GiftBursts />
          <GiftRail />
          <ChatDrawer />
        </>
      )}
      <Toast />

      {/* solo karaoke: one tap to grant camera + mic and begin */}
      {soloGate && (
        <div className="solo-gate">
          <div className="sg-song">{song.icon} {song.title}</div>
          <h2>Ready to sing?</h2>
          <p>Grant camera &amp; mic — your camera becomes the stage and your voice rides the tone lane.</p>
          <div className="diffpick">
            {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
              <button key={d} className={soloDiff === d ? 'on' : ''} onClick={() => setSoloDiff(d)}>
                {DIFFICULTY[d].label}
              </button>
            ))}
          </div>
          <button className="startbtn" onClick={startSolo}>🎤 Start singing</button>
          {media.error && <div className="err">⚠️ {media.error} — check browser permissions</div>}
        </div>
      )}

      {/* solo mic/cam controls */}
      {mode === 'solo' && live && (
        <div className="fpvcontrols" style={{ zIndex: 30 }}>
          <button className={`ctrlbtn${synth.muted ? ' off' : ''}`} onClick={synth.toggle} aria-label="Music">
            {synth.muted ? '🎵' : '🎶'}
          </button>
          <button className={`ctrlbtn${media.micOn ? '' : ' off'}`} onClick={media.toggleMic} aria-label="Mic">
            {media.micOn ? '🎙️' : '🔇'}
          </button>
          <button className="ctrlbtn end" onClick={endSet} aria-label="End">⏹</button>
          <button className={`ctrlbtn${media.camOn ? '' : ' off'}`} onClick={media.toggleCam} aria-label="Camera">
            {media.camOn ? '📹' : '🚫'}
          </button>
        </div>
      )}

      {mode === 'room' && (
        <>
          <div className="pagedots">
            <button className={`pd${view === 'audience' ? ' on' : ''}`} onClick={() => setView('audience')}>
              <i />ARENA
            </button>
            <button className={`pd${view === 'singer' ? ' on' : ''}`} onClick={() => setView('singer')}>
              <i />MY CAM
            </button>
          </div>
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
        </>
      )}
    </div>
  )
}
