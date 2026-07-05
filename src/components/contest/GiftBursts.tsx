import { useEffect, useRef } from 'react'
import { useRoom } from '../../state/roomStore'

/* A single aggregated burst: "🍅 ×214". At scale the server batches
   gifts per 500ms and sends counts; we render one popping badge per
   kind instead of hundreds of projectiles. */
function BurstItem({ id, em, count, cls }: { id: number; em: string; count: number; cls: 'splat' | 'bloom' | 'gift' }) {
  const remove = useRoom((s) => s.removeBurst)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) {
      // scatter across the mid-stage so simultaneous bursts don't stack
      el.style.left = `${30 + Math.random() * 40}%`
      el.style.top = `${34 + Math.random() * 24}%`
    }
    const t = setTimeout(() => remove(id), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div ref={ref} className={`burst ${cls}`}>
      <span className="be">{em}</span>
      <span className="bc num">×{count}</span>
    </div>
  )
}

export function GiftBursts() {
  const bursts = useRoom((s) => s.bursts)
  return (
    <div className="bursts-layer">
      {bursts.map((b) => (
        <BurstItem key={b.id} id={b.id} em={b.em} count={b.count} cls={b.cls} />
      ))}
    </div>
  )
}
