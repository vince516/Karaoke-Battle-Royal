/* ============================================================
   Shared domain types.
   These mirror the room-state shape a Durable Object will own in
   M2 (members, queue, currentSinger, scores, hypeTotal, giftLog,
   chat). Keeping them here means the client store and the future
   server contract stay in lock-step.
   ============================================================ */

/** A single melody segment: note row 0..8 held for N beats. */
export type MelodySegment = [note: number, beats: number]

export interface SongLine {
  /** Lyric text for this line (original / Suno-generated — never licensed). */
  t: string
  /** Ordered melody segments the singer must ride. */
  mel: MelodySegment[]
}

export interface Song {
  id: string
  title: string
  /** Short descriptor shown in pickers. */
  desc: string
  icon: string
  duration: string
  lines: SongLine[]
}

export type GiftKind = 'tomato' | 'flowers' | 'rose' | 'storm' | 'crown'

export interface GiftDef {
  pts: number
  em: string
  /** Stamp shown on impact. */
  stamp: string
  /** Stamp css class: splat | bloom | gift. */
  cls: 'splat' | 'bloom' | 'gift'
  /** Free gifts have a server-enforced reload window (seconds). */
  cooldown?: number
  label: string
}

export interface Singer {
  name: string
  initial: string
  song: string
}

export type ChatKind = 'user' | 'guest' | 'sys-gold' | 'sys-tomato' | 'sys-flower'

export interface ChatMessage {
  id: number
  html: string
  kind: ChatKind
}

export interface Bubble {
  id: number
  html: string
}

/** Transient floating ±value off the score. */
export interface Floater {
  id: number
  label: string
  plus: boolean
}

/** A gift projectile + impact stamp in flight over the stage. */
export interface Projectile {
  id: number
  em: string
  stamp: string
  cls: 'splat' | 'bloom' | 'gift'
}

/** Per-line pass/fail as scored by the tone engine. */
export type LineResult = boolean
