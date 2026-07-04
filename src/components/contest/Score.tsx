import { useEffect, useRef } from 'react'
import { useRoom, selScore } from '../../state/roomStore'

/** Floating ±value that rises off the score and fades. */
function FloaterItem({ id, label, plus }: { id: number; label: string; plus: boolean }) {
  const remove = useRoom((s) => s.removeFloater)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // anchor just under the score, top-right
    const el = ref.current
    const score = document.getElementById('score')
    if (el && score) {
      const sr = score.getBoundingClientRect()
      el.style.right = `${window.innerWidth - sr.right}px`
      el.style.top = `${sr.bottom + 6}px`
    }
    const t = setTimeout(() => remove(id), 1300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div ref={ref} className={`floater ${plus ? 'plus' : 'minus'}`}>
      {label}
    </div>
  )
}

export function Score() {
  const score = useRoom(selScore)
  const zoom = useRoom((s) => s.scoreZoom)
  const floaters = useRoom((s) => s.floaters)

  return (
    <>
      <div className="score">
        <div className="lab">POINTS</div>
        <div id="score" className={`amt num${zoom ? ' zoom' : ''}`}>
          {score}
        </div>
      </div>
      {floaters.map((f) => (
        <FloaterItem key={f.id} id={f.id} label={f.label} plus={f.plus} />
      ))}
    </>
  )
}
