import { useRoom, selViewers } from '../../state/roomStore'
import { useFullscreen } from '../../hooks/useFullscreen'

export function TopBar({ roomCode }: { roomCode?: string }) {
  const viewers = useRoom(selViewers)
  const connected = useRoom((s) => s.connected)
  const toggleChat = useRoom((s) => s.toggleChat)
  const { active, toggle } = useFullscreen()

  return (
    <header className="ui top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30 }}>
      <span className="live" style={roomCode && !connected ? { background: 'var(--dim)' } : undefined}>
        <i />
        {roomCode ? (connected ? 'LIVE' : '···') : 'LIVE'}
      </span>
      <span className="ttl">
        {roomCode ? (
          <>
            Room <i>· {roomCode}</i>
          </>
        ) : (
          <>
            Tone Contest <i>· Round 1 of 3</i>
          </>
        )}
      </span>
      <div className="r">
        <span className="chip glass">
          👀 <b className="num">{viewers}</b>
        </span>
        <button
          className="iconbtn glass"
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          aria-label="Full screen"
        >
          {active ? '✕' : '⛶'}
        </button>
        <button
          className="iconbtn glass"
          onClick={(e) => {
            e.stopPropagation()
            toggleChat()
          }}
          aria-label="Toggle chat"
        >
          💬
        </button>
      </div>
    </header>
  )
}
