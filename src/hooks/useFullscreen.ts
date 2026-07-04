import { useCallback, useEffect, useState } from 'react'
import { useRoom } from '../state/roomStore'

type FsDoc = Document & {
  webkitFullscreenElement?: Element
  webkitExitFullscreen?: () => void
}
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void }

export function useFullscreen() {
  const [active, setActive] = useState(false)
  const showToast = useRoom((s) => s.showToast)

  const toggle = useCallback(() => {
    const d = document as FsDoc
    const el = document.documentElement as FsEl
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      ;(d.exitFullscreen || d.webkitExitFullscreen)?.call(d)
      return
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() =>
        showToast('📱 iPhone: Share → "Add to Home Screen" for true full screen'),
      )
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
    } else {
      showToast('📱 iPhone: Share → "Add to Home Screen" for true full screen')
    }
  }, [showToast])

  useEffect(() => {
    const onChange = () => {
      const d = document as FsDoc
      const on = !!(d.fullscreenElement || d.webkitFullscreenElement)
      setActive(on)
      showToast(on ? 'Full screen — Esc or ✕ to exit' : 'Windowed')
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [showToast])

  return { active, toggle }
}
