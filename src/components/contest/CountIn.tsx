import { useEffect, useRef, useState } from 'react'
import { useRoom } from '../../state/roomStore'

/* Count-in overlay: title card → 3 · 2 · 1 → SING! Synced to the tone
   engine's lead-in (store.introUntil), with tick sounds per beat. */
export function CountIn({ icon, title, onTick }: {
  icon: string
  title: string
  onTick?: (go: boolean) => void
}) {
  const introUntil = useRoom((s) => s.introUntil)
  // seconds remaining: 4+ = "get ready", 3..1 = count, 0 = SING! flash, -1 = hidden
  const [left, setLeft] = useState(-1)
  const tickRef = useRef(onTick)
  tickRef.current = onTick
  const lastRef = useRef(-2)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const remain = introUntil - performance.now()
      setLeft(remain > 0 ? Math.ceil(remain / 1000) : remain > -900 ? 0 : -1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [introUntil])

  useEffect(() => {
    if (left === lastRef.current) return
    lastRef.current = left
    if (left >= 1 && left <= 3) tickRef.current?.(false)
    if (left === 0) tickRef.current?.(true)
  }, [left])

  if (left < 0) return null
  return (
    <div className="countin">
      <div className="ci-song">{icon} {title}</div>
      <div className={`ci-num${left === 0 ? ' go' : left > 3 ? ' ready' : ''}`} key={left}>
        {left === 0 ? 'SING!' : left > 3 ? 'GET READY' : left}
      </div>
      <div className="ci-hint">🎤 follow the gold notes</div>
    </div>
  )
}
