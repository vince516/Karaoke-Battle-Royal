import { useEffect, useRef } from 'react'
import { useRoom } from '../../state/roomStore'

/* Impact stamp (SPLAT! / BRAVO! / TONE COMPLETE! …). Positioned
   over the singer's chest area, self-removes after the animation. */
export function Stamp({
  id,
  text,
  cls,
  stageRef,
}: {
  id: number
  text: string
  cls: 'splat' | 'bloom' | 'gift'
  stageRef: React.RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const removeStamp = useRoom((s) => s.removeStamp)

  useEffect(() => {
    const el = ref.current
    const stage = stageRef.current
    if (el && stage) {
      const r = stage.getBoundingClientRect()
      el.style.left = `${r.width * 0.5 - 24}px`
      el.style.top = `${r.height * 0.34}px`
    }
    const t = setTimeout(() => removeStamp(id), 1950)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className={`stamp ${cls}`}>
      {text}
    </div>
  )
}
