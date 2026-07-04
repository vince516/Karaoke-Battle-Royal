import { useCallback, useEffect, useRef, useState } from 'react'

/* Tap stage = hide/show chrome; auto-hides after 4.5s of no input. */
export function useAutoHide(timeout = 4500) {
  const [hidden, setHidden] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    setHidden(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHidden(true), timeout)
  }, [timeout])

  const hide = useCallback(() => setHidden(true), [])

  const toggle = useCallback(() => {
    setHidden((h) => {
      if (h) {
        // becoming visible → arm the auto-hide timer
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setHidden(true), timeout)
        return false
      }
      return true
    })
  }, [timeout])

  useEffect(() => {
    show()
    const onActivity = () => setHidden((h) => (h ? h : (show(), false)))
    const opts = { passive: true } as const
    document.addEventListener('mousemove', onActivity, opts)
    document.addEventListener('touchstart', onActivity, opts)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('mousemove', onActivity)
      document.removeEventListener('touchstart', onActivity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { hidden, show, hide, toggle }
}
