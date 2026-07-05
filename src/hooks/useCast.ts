import { useCallback, useState } from 'react'

/* One-tap screencast via the Presentation API (Chrome → Chromecast /
   Android TV). Falls back to opening the big-screen view in a new tab
   so the user can mirror it (AirPlay, Smart View, or the TV's browser). */
type PresentationRequestCtor = new (urls: string[]) => { start: () => Promise<unknown> }

export function useCast() {
  const [supported] = useState(
    () => typeof (window as unknown as { PresentationRequest?: unknown }).PresentationRequest !== 'undefined',
  )

  const cast = useCallback((url: string): 'casting' | 'opened' => {
    const Ctor = (window as unknown as { PresentationRequest?: PresentationRequestCtor }).PresentationRequest
    if (Ctor) {
      try {
        const req = new Ctor([url])
        req.start().catch(() => window.open(url, '_blank'))
        return 'casting'
      } catch {
        /* fall through */
      }
    }
    window.open(url, '_blank', 'noopener')
    return 'opened'
  }, [])

  return { supported, cast }
}
