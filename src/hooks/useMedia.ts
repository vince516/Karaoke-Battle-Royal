import { useCallback, useRef, useState } from 'react'

/* getUserMedia wrapper: the singer's real camera + mic. This stream
   becomes the full-bleed stage background and is published to viewers
   over WebRTC. */
export function useMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = s
      setStream(s)
      setError(null)
      setCamOn(true)
      setMicOn(true)
      return s
    } catch (e) {
      setError((e as Error).message || 'Camera/mic unavailable')
      return null
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const toggleCam = useCallback(() => {
    const s = streamRef.current
    if (!s) return
    const on = !s.getVideoTracks()[0]?.enabled
    s.getVideoTracks().forEach((t) => (t.enabled = on))
    setCamOn(on)
  }, [])

  const toggleMic = useCallback(() => {
    const s = streamRef.current
    if (!s) return
    const on = !s.getAudioTracks()[0]?.enabled
    s.getAudioTracks().forEach((t) => (t.enabled = on))
    setMicOn(on)
  }, [])

  return { stream, error, camOn, micOn, start, stop, toggleCam, toggleMic }
}
