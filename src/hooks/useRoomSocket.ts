import { useEffect } from 'react'
import { connectRoom, roomBus, type Identity } from '../net/roomClient'
import { useRoom } from '../state/roomStore'

/* Connects the store to a room's Durable Object over WebSocket for the
   lifetime of the component. Server messages flow into the store;
   sendGift/sendChat flow out as intents. */
export function useRoomSocket(code: string | undefined, identity: Identity) {
  useEffect(() => {
    if (!code) return
    const { handleServerMsg, setTransport, setConnected } = useRoom.getState()

    // fan every server frame out to the store (counters) and the bus (media)
    const transport = connectRoom(
      code,
      identity,
      (msg) => {
        handleServerMsg(msg)
        roomBus.emit(msg)
      },
      setConnected,
    )
    setTransport(transport)

    return () => {
      transport.close()
      setTransport(null)
      setConnected(false)
    }
    // identity is captured once on connect; code drives reconnection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])
}
