import type { Intent, RtcSignal, ServerMsg } from './roomClient'

/* ============================================================
   WebRTC mesh. The publisher (live singer) holds a peer connection
   to every viewer and pushes camera/mic; viewers answer and render
   the incoming track as the stage background. Signaling (SDP + ICE)
   is relayed through the room Durable Object over the existing
   WebSocket — no external SFU needed for party-room scale (≤ ~50).
   At scale (M5) this path is replaced by SFU + LL-HLS egress.
   ============================================================ */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

interface Peer {
  pc: RTCPeerConnection
  remoteSet: boolean
  pendingIce: RTCIceCandidateInit[]
}

export class MediaMesh {
  private knownPeers = new Set<string>()
  private peers = new Map<string, Peer>()
  private localStream: MediaStream | null = null

  constructor(
    private send: (intent: Intent) => void,
    private onRemoteStream: (stream: MediaStream | null) => void,
  ) {}

  /** True once we're the live singer (publishing). */
  get isPublisher() {
    return this.localStream !== null
  }

  /** Route a server frame. Only signaling types are handled. */
  handle(msg: ServerMsg) {
    switch (msg.t) {
      case 'welcome':
        msg.peers.forEach((id) => this.knownPeers.add(id))
        break
      case 'peer-join':
        this.knownPeers.add(msg.id)
        // as publisher, immediately offer the newcomer our stream
        if (this.isPublisher) this.offerTo(msg.id)
        break
      case 'peer-leave':
        this.knownPeers.delete(msg.id)
        this.closePeer(msg.id)
        break
      case 'publisher':
        if (msg.id === null) this.onRemoteStream(null) // singer left → fallback rig
        break
      case 'rtc':
        void this.onSignal(msg.from, msg.data)
        break
    }
  }

  /** Become the live singer: publish this stream to all viewers. */
  async publish(stream: MediaStream) {
    this.localStream = stream
    this.send({ type: 'publish' })
    for (const id of this.knownPeers) this.offerTo(id)
  }

  /** Stop publishing and tear down all peer connections. */
  unpublish() {
    this.send({ type: 'unpublish' })
    this.localStream = null
    for (const id of [...this.peers.keys()]) this.closePeer(id)
  }

  dispose() {
    if (this.isPublisher) this.send({ type: 'unpublish' })
    for (const id of [...this.peers.keys()]) this.closePeer(id)
    this.localStream = null
  }

  // ---- internals ----

  private makePeer(id: string): Peer {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    const peer: Peer = { pc, remoteSet: false, pendingIce: [] }
    this.peers.set(id, peer)

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ type: 'rtc', to: id, data: { kind: 'ice', candidate: e.candidate.toJSON() } })
    }
    pc.ontrack = (e) => this.onRemoteStream(e.streams[0])
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.closePeer(id)
    }
    return peer
  }

  /** Publisher → send an offer with our local tracks to a viewer. */
  private async offerTo(id: string) {
    if (!this.localStream || this.peers.has(id)) return
    const { pc } = this.makePeer(id)
    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.send({ type: 'rtc', to: id, data: { kind: 'offer', sdp: offer } })
  }

  private async onSignal(from: string, data: RtcSignal) {
    if (data.kind === 'offer') {
      // viewer side: accept the publisher's offer and answer
      const peer = this.peers.get(from) ?? this.makePeer(from)
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      peer.remoteSet = true
      await this.flushIce(peer)
      const answer = await peer.pc.createAnswer()
      await peer.pc.setLocalDescription(answer)
      this.send({ type: 'rtc', to: from, data: { kind: 'answer', sdp: answer } })
    } else if (data.kind === 'answer') {
      const peer = this.peers.get(from)
      if (!peer) return
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      peer.remoteSet = true
      await this.flushIce(peer)
    } else if (data.kind === 'ice') {
      const peer = this.peers.get(from)
      if (!peer) return
      // buffer ICE that arrives before the remote description is set
      if (peer.remoteSet) await peer.pc.addIceCandidate(data.candidate).catch(() => {})
      else peer.pendingIce.push(data.candidate)
    }
  }

  private async flushIce(peer: Peer) {
    for (const c of peer.pendingIce) await peer.pc.addIceCandidate(c).catch(() => {})
    peer.pendingIce = []
  }

  private closePeer(id: string) {
    const peer = this.peers.get(id)
    if (!peer) return
    try {
      peer.pc.close()
    } catch {
      /* noop */
    }
    this.peers.delete(id)
  }
}
