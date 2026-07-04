import { useEffect } from 'react'
import { useRoom } from '../../state/roomStore'

/* Floating comments bottom-left that rise and fade (TikTok grammar). */
function BubbleItem({ id, html }: { id: number; html: string }) {
  const remove = useRoom((s) => s.removeBubble)
  useEffect(() => {
    const t = setTimeout(() => remove(id), 4600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div className="bub" dangerouslySetInnerHTML={{ __html: html }} />
}

export function ChatBubbles() {
  const bubbles = useRoom((s) => s.bubbles)
  return (
    <div className="bubbles">
      {bubbles.map((b) => (
        <BubbleItem key={b.id} id={b.id} html={b.html} />
      ))}
    </div>
  )
}
