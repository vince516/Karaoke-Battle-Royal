import { useEffect, useRef } from 'react'
import type { Projectile as ProjectileT } from '../../lib/types'
import { useRoom } from '../../state/roomStore'

/* One gift projectile: arcs from the gift rail onto the stage, then
   drops an impact stamp. Ported from the prototype's throwAt(). */
export function Projectile({ data, stageRef }: { data: ProjectileT; stageRef: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  const spawnStamp = useRoom((s) => s.spawnStamp)
  const removeProjectile = useRoom((s) => s.removeProjectile)

  useEffect(() => {
    const el = ref.current
    const stage = stageRef.current
    if (!el || !stage) {
      removeProjectile(data.id)
      return
    }
    const r = stage.getBoundingClientRect()
    const startX = r.width - 64
    const endX = r.width * 0.5 - 24
    const y = r.height * 0.34
    el.style.left = `${startX}px`
    el.style.top = `${r.height * 0.7}px`
    const anim = el.animate(
      [
        { transform: 'translate(0,0) rotate(0) scale(.6)' },
        {
          transform: `translate(${(endX - startX) * 0.55}px,-${r.height * 0.32}px) rotate(-300deg) scale(1.3)`,
          offset: 0.55,
        },
        { transform: `translate(${endX - startX}px,${y - r.height * 0.7}px) rotate(-540deg) scale(1)` },
      ],
      { duration: 850, easing: 'cubic-bezier(.3,.6,.6,1)' },
    )
    anim.onfinish = () => {
      spawnStamp(data.stamp, data.cls)
      removeProjectile(data.id)
    }
    return () => anim.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className="proj">
      {data.em}
    </div>
  )
}
