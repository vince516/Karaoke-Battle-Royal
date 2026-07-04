import { useEffect, useRef, useState } from 'react'
import { useRoom } from '../../state/roomStore'
import { fmt } from '../../lib/format'
import type { ChatKind } from '../../lib/types'

const sysClass = (kind: ChatKind) =>
  kind === 'sys-gold'
    ? 'm sys gold'
    : kind === 'sys-tomato'
      ? 'm sys tomato'
      : kind === 'sys-flower'
        ? 'm sys flower'
        : 'm'

export function ChatDrawer() {
  const open = useRoom((s) => s.chatOpen)
  const toggleChat = useRoom((s) => s.toggleChat)
  const messages = useRoom((s) => s.messages)
  const msgCount = useRoom((s) => s.msgCount)
  const sendChat = useRoom((s) => s.sendChat)
  const [text, setText] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)

  // pin to newest
  useEffect(() => {
    const el = msgsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = () => {
    sendChat(text)
    setText('')
  }

  return (
    <aside className={`chat${open ? ' open' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="chathd">
        <b>
          Live chat · <span className="num">{fmt(msgCount)}</span>
        </b>
        <button onClick={toggleChat}>✕</button>
      </div>
      <div className="msgs" ref={msgsRef}>
        {messages.map((m) => (
          <div key={m.id} className={sysClass(m.kind)} dangerouslySetInnerHTML={{ __html: m.html }} />
        ))}
      </div>
      <div className="chatin">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Send a message"
          maxLength={120}
        />
        <button onClick={submit}>Send</button>
      </div>
    </aside>
  )
}
