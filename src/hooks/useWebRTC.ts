import { useCallback, useEffect, useRef, useState } from 'react'
import { roomBus, type Intent } from '../net/roomClient'
import { MediaMesh } from '../net/webrtc'
import { useRoom } from '../state/roomStore'

/* Owns the WebRTC mesh for a networked room. Feeds it every server
   frame (via roomBus) and exposes publish/unpublish plus the remote
   stream a viewer should render as the stage background. */
export function useWebRTC(enabled: boolean) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const meshRef = useRef<MediaMesh | null>(null)

  useEffect(() => {
    if (!enabled) return
    const send = (intent: Intent) => useRoom.getState().transport?.send(intent)
    const mesh = new MediaMesh(send, setRemoteStream)
    meshRef.current = mesh
    const off = roomBus.on((msg) => mesh.handle(msg))
    return () => {
      off()
      mesh.dispose()
      meshRef.current = null
      setRemoteStream(null)
    }
  }, [enabled])

  const publish = useCallback((stream: MediaStream) => {
    void meshRef.current?.publish(stream)
  }, [])
  const unpublish = useCallback(() => meshRef.current?.unpublish(), [])

  return { remoteStream, publish, unpublish }
}
