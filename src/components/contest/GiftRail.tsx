import { useRoom } from '../../state/roomStore'
import { GIFTS } from '../../lib/songs'
import type { GiftKind } from '../../lib/types'

const RING_LEN = 182.2 // 2πr, r=29

/** A free gift button with a 30s reload ring (tomato / flowers). */
function CoolGift({ kind }: { kind: 'tomato' | 'flowers' }) {
  const g = GIFTS[kind]
  const remaining = useRoom((s) => s.cooldowns[kind])
  const sendGift = useRoom((s) => s.sendGift)
  const cooling = remaining > 0

  return (
    <button
      className={`call ${kind}${cooling ? ' cooling' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        sendGift(kind)
      }}
    >
      <span className="em">{g.em}</span>
      <span className={`pts ${g.pts > 0 ? 'plus' : 'minus'}`}>
        {g.pts > 0 ? '+' : '−'}
        {Math.abs(g.pts)}
      </span>
      <span className="lb">{cooling ? `${remaining}s` : g.label}</span>
      {cooling && (
        <span className="ring">
          <svg viewBox="0 0 66 66">
            <circle className="track" cx="33" cy="33" r="29" />
            <circle
              className="bar"
              cx="33"
              cy="33"
              r="29"
              strokeDasharray={RING_LEN}
              strokeDashoffset={RING_LEN * (1 - remaining / (g.cooldown ?? 30))}
            />
          </svg>
          <span className="sec num">{remaining}</span>
        </span>
      )}
    </button>
  )
}

function PaidGift({ kind }: { kind: GiftKind }) {
  const g = GIFTS[kind]
  const sendGift = useRoom((s) => s.sendGift)
  return (
    <button
      className="call"
      onClick={(e) => {
        e.stopPropagation()
        sendGift(kind)
      }}
    >
      <span className="em">{g.em}</span>
      <span className="pts plus">{g.label}</span>
    </button>
  )
}

export function GiftRail() {
  return (
    <nav className="ui dock">
      <CoolGift kind="tomato" />
      <CoolGift kind="flowers" />
      <PaidGift kind="rose" />
      <PaidGift kind="storm" />
      <PaidGift kind="crown" />
    </nav>
  )
}
