import { useEffect, type RefObject } from 'react'

/* ============================================================
   LL-HLS viewer path (scale media egress, M5).

   Party rooms (≤ ~50) subscribe to the singer over WebRTC. At
   contest scale (thousands of viewers) the SFU fans the singer's
   feed out as Low-Latency HLS via a CDN, and viewers play that URL
   here — 2–5s latency, but effectively unlimited concurrency.
   hls.js is loaded lazily so it never ships unless a stream URL is
   actually present; Safari/iOS use native HLS.
   ============================================================ */
export function useHlsPlayback(videoRef: RefObject<HTMLVideoElement | null>, url: string | null | undefined) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    // native HLS (Safari / iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      void video.play().catch(() => {})
      return
    }

    let destroyed = false
    let hls: { destroy: () => void } | null = null
    import('hls.js').then(({ default: Hls }) => {
      if (destroyed) return
      if (Hls.isSupported()) {
        const inst = new Hls({ lowLatencyMode: true, backBufferLength: 30 })
        inst.loadSource(url)
        inst.attachMedia(video)
        void video.play().catch(() => {})
        hls = inst
      }
    })

    return () => {
      destroyed = true
      hls?.destroy()
    }
  }, [videoRef, url])
}
