import type { Song, GiftDef, GiftKind } from './types'

/* ============================================================
   Original song data. All lyrics are placeholder originals
   ("Suno-style") — NO licensed music anywhere in the repo, per
   the acceptance checks. In M4 these load from LRC+melody JSON.
   ============================================================ */

/** Beat clock — ms per beat (from the prototype's tone engine). */
export const BEAT = 520
/** Number of pitch rows in the tone lane. */
export const NOTES = 9

/** "Gravity of You" — the flagship contest song (Nova Vega's set). */
export const GRAVITY_OF_YOU: Song = {
  id: 'gravity-of-you',
  title: 'Gravity of You',
  desc: 'Pop duet · trading lines · 100 bpm',
  icon: '💞',
  duration: '2:58',
  lines: [
    { t: 'City lights are calling out my name', mel: [[3, 2], [4, 1], [5, 2], [4, 1], [3, 2], [5, 2], [6, 2]] },
    { t: 'Every echo pulls me to your flame', mel: [[5, 2], [6, 1], [7, 2], [6, 1], [5, 2], [4, 2], [3, 2]] },
    { t: "I've been falling faster than the rain", mel: [[2, 2], [3, 2], [4, 1], [5, 1], [6, 2], [5, 2], [4, 2]] },
    { t: "Say the word and I'll be yours again", mel: [[4, 2], [5, 2], [6, 2], [7, 1], [8, 1], [7, 2], [6, 2]] },
    { t: "We're caught in the gravity of you", mel: [[6, 2], [7, 2], [8, 2], [7, 1], [6, 1], [5, 2], [4, 2]] },
    { t: 'Spinning through a sky of neon blue', mel: [[5, 2], [4, 1], [3, 1], [4, 2], [5, 2], [6, 2], [7, 2]] },
    { t: 'Hold the note and never let it land', mel: [[7, 3], [6, 1], [5, 2], [6, 2], [7, 2], [8, 2]] },
    { t: 'Gravity, gravity of you', mel: [[8, 2], [7, 2], [6, 2], [5, 2], [4, 2], [3, 2]] },
  ],
}

/** Song catalogue for the party-room picker (all originals). */
export const SONG_CATALOGUE: Song[] = [
  GRAVITY_OF_YOU,
  { id: 'midnight-run', title: 'Midnight Run', desc: 'Synthwave banger · high-energy chorus', icon: '🌃', duration: '3:12', lines: GRAVITY_OF_YOU.lines },
  { id: 'paper-crowns', title: 'Paper Crowns', desc: 'Acoustic ballad · big belting bridge', icon: '👑', duration: '3:40', lines: GRAVITY_OF_YOU.lines },
  { id: 'static-bloom', title: 'Static Bloom', desc: 'Dance-pop · rap verse + sung hook', icon: '⚡', duration: '2:47', lines: GRAVITY_OF_YOU.lines },
  { id: 'last-train-home', title: 'Last Train Home', desc: 'Slow-burn OPM-style anthem', icon: '🚉', duration: '3:55', lines: GRAVITY_OF_YOU.lines },
  { id: 'four-am-floor', title: 'Four AM Floor', desc: 'Club track · call-and-response', icon: '🪩', duration: '2:39', lines: GRAVITY_OF_YOU.lines },
]

/* ================= GIFTS = POINTS ================= */
export const GIFTS: Record<GiftKind, GiftDef> = {
  tomato: { pts: -50, em: '🍅', stamp: 'SPLAT!', cls: 'splat', cooldown: 30, label: '30s' },
  flowers: { pts: 50, em: '💐', stamp: 'BRAVO!', cls: 'bloom', cooldown: 30, label: '30s' },
  rose: { pts: 100, em: '🌹', stamp: 'RESPECT!', cls: 'gift', label: '+100' },
  storm: { pts: 500, em: '💞', stamp: 'LOVE STORM!', cls: 'gift', label: '+500' },
  crown: { pts: 2000, em: '👑', stamp: 'ROYALTY!', cls: 'gift', label: '+2K' },
}

/** Endless-hype tiers: [label, css class]. LV5+ = SUPERMAX. */
export const TIERS: [string, string][] = [
  ['CHILL', 't0'],
  ['GROOVE', 't1'],
  ['FIRE', 't2'],
  ['BLAZE', 't3'],
  ['SUPERMAX', 't4'],
]

/* Ambient sim data — crowd chatter + guest names (no real users in M1). */
export const GUEST_NAMES = [
  'GuestKoala59', 'GuestHawk94', 'GuestWolf42', 'GuestFox62',
  'GuestPuma70', 'GuestHawk20', 'GuestFox31', 'GuestRaven60',
]
export const CHAT_LINES = [
  'she is ON the tone 😤', 'SUPERMAX incoming', 'that run was clean', 'LV.5 LETS GO 🔥',
  "don't miss the bridge!!", 'tomato ready in 3..2..1', 'crown her already 👑', '92%!!!',
]
export const GUEST_COLORS = ['#ff8093', '#5ecbff', '#FFB300', '#17E8A0', '#b98cff', '#ff6fb0']
