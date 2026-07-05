import type { Song, GiftDef, GiftKind } from './types'

/* ============================================================
   Original song data. All lyrics are placeholder originals
   ("Suno-style") — NO licensed music anywhere in the repo, per
   the acceptance checks. In M4 these load from LRC+melody JSON.
   ============================================================ */

/** Beat clock — ms per beat (from the prototype's tone engine). */
export const BEAT = 520
/** Number of pitch rows in the tone lane — a full two octaves of C-major
    (rows 0..14 = C D E F G A B C' D' E' F' G' A' B' C''), so wide-range
    songs like anthems get real headroom instead of being squashed. */
export const NOTES = 15

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

/** Each original has its own lyrics + melody contour (all Suno-style originals). */
const MIDNIGHT_RUN: Song = {
  id: 'midnight-run', title: 'Midnight Run', desc: 'Synthwave banger · high-energy chorus', icon: '🌃', duration: '3:12',
  lines: [
    { t: 'Engine humming, headlights low', mel: [[2, 2], [2, 1], [3, 2], [4, 2], [3, 1], [2, 2]] },
    { t: 'Chasing dawn where the wild things go', mel: [[3, 1], [4, 2], [5, 2], [6, 1], [5, 2], [4, 2], [3, 1]] },
    { t: 'City fading in the mirror glow', mel: [[4, 2], [5, 1], [6, 2], [7, 2], [6, 1], [5, 2]] },
    { t: 'On a midnight run, we let it go', mel: [[6, 2], [7, 2], [8, 2], [8, 1], [7, 2], [6, 2]] },
    { t: 'Faster, harder, never slow', mel: [[5, 1], [6, 1], [7, 2], [8, 2], [7, 1], [6, 2], [5, 1]] },
    { t: 'Neon rivers start to flow', mel: [[4, 2], [3, 2], [2, 2], [3, 1], [4, 2], [5, 2]] },
  ],
}
const PAPER_CROWNS: Song = {
  id: 'paper-crowns', title: 'Paper Crowns', desc: 'Acoustic ballad · big belting bridge', icon: '👑', duration: '3:40',
  lines: [
    { t: 'We built our thrones from paper and rain', mel: [[2, 3], [3, 2], [4, 2], [3, 1], [2, 2]] },
    { t: 'Crowns that melt but we wore them the same', mel: [[3, 2], [4, 2], [5, 2], [4, 1], [3, 2], [2, 2]] },
    { t: 'Hold my hand while the kingdom falls', mel: [[4, 2], [5, 2], [6, 3], [5, 1], [4, 2]] },
    { t: 'We were golden, we were tall', mel: [[6, 2], [7, 3], [8, 3], [7, 2]] },
    { t: 'Paper crowns and a heart of stone', mel: [[5, 2], [6, 2], [7, 2], [6, 1], [5, 2], [4, 2]] },
    { t: 'Even paper kings go home', mel: [[4, 2], [3, 2], [2, 3], [3, 2], [2, 2]] },
  ],
}
const STATIC_BLOOM: Song = {
  id: 'static-bloom', title: 'Static Bloom', desc: 'Dance-pop · rap verse + sung hook', icon: '⚡', duration: '2:47',
  lines: [
    { t: 'Turn it up, feel the static bloom', mel: [[4, 1], [4, 1], [5, 1], [6, 2], [5, 1], [4, 2]] },
    { t: 'Colors bursting all across the room', mel: [[5, 1], [6, 1], [7, 2], [8, 2], [7, 1], [6, 1], [5, 1]] },
    { t: 'Every heartbeat is a firework', mel: [[6, 1], [7, 1], [8, 2], [7, 2], [6, 2], [5, 1]] },
    { t: 'Light me up until it hurts', mel: [[7, 2], [8, 2], [8, 2], [6, 2], [7, 2]] },
    { t: 'We are electric, we are new', mel: [[5, 2], [6, 2], [7, 1], [8, 2], [6, 2], [5, 1]] },
    { t: 'Bloom, bloom, the night is ours to use', mel: [[8, 2], [8, 1], [7, 2], [6, 2], [5, 2], [4, 2]] },
  ],
}
const FOUR_AM_FLOOR: Song = {
  id: 'four-am-floor', title: 'Four AM Floor', desc: 'Club track · call-and-response', icon: '🪩', duration: '2:39',
  lines: [
    { t: 'Four AM and the floor still shakes', mel: [[3, 1], [3, 1], [4, 1], [5, 2], [4, 1], [3, 2]] },
    { t: 'Bass so low that the ceiling breaks', mel: [[2, 2], [3, 1], [4, 2], [5, 1], [4, 2], [3, 1]] },
    { t: 'One more song before the sunrise', mel: [[4, 1], [5, 2], [6, 2], [7, 1], [6, 2], [5, 1]] },
    { t: 'Keep your hands up to the skylight', mel: [[6, 2], [7, 2], [8, 1], [8, 2], [7, 2], [6, 1]] },
    { t: 'Do not stop till the morning calls', mel: [[5, 1], [6, 1], [7, 2], [6, 1], [5, 2], [4, 2]] },
    { t: 'We own the four AM floor', mel: [[4, 2], [3, 2], [2, 3], [4, 2], [3, 2]] },
  ],
}

/* ---- Familiar public-domain classics — royalty-free AND known by heart, so
   you can actually sing them to test the pitch tracking. Rows are C-major
   scale degrees: 0=C 1=D 2=E 3=F 4=G 5=A 6=B 7=C' 8=D'. ---- */
const TWINKLE: Song = {
  id: 'twinkle-star', title: 'Twinkle, Twinkle, Little Star', desc: 'Nursery classic · public domain', icon: '⭐', duration: '1:20',
  lines: [
    { t: 'Twinkle, twinkle, little star', mel: [[0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2]] },
    { t: 'How I wonder what you are', mel: [[3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2]] },
    { t: 'Up above the world so high', mel: [[4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2]] },
    { t: 'Like a diamond in the sky', mel: [[4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2]] },
    { t: 'Twinkle, twinkle, little star', mel: [[0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2]] },
    { t: 'How I wonder what you are', mel: [[3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2]] },
  ],
}
const MARY_LAMB: Song = {
  id: 'mary-lamb', title: 'Mary Had a Little Lamb', desc: 'Nursery classic · public domain', icon: '🐑', duration: '1:10',
  lines: [
    { t: 'Mary had a little lamb', mel: [[2, 1], [1, 1], [0, 1], [1, 1], [2, 1], [2, 1], [2, 2]] },
    { t: 'Little lamb, little lamb', mel: [[1, 1], [1, 1], [1, 2], [2, 1], [4, 1], [4, 2]] },
    { t: 'Mary had a little lamb', mel: [[2, 1], [1, 1], [0, 1], [1, 1], [2, 1], [2, 1], [2, 1], [2, 1]] },
    { t: 'Its fleece was white as snow', mel: [[1, 1], [1, 1], [2, 1], [1, 1], [0, 2]] },
  ],
}
const HAPPY_BIRTHDAY: Song = {
  id: 'happy-birthday', title: 'Happy Birthday', desc: 'Public domain since 2016', icon: '🎂', duration: '0:40',
  lines: [
    { t: 'Happy birthday to you', mel: [[4, 1], [4, 1], [5, 2], [4, 2], [7, 2], [6, 3]] },
    { t: 'Happy birthday to you', mel: [[4, 1], [4, 1], [5, 2], [4, 2], [8, 2], [7, 3]] },
    { t: 'Happy birthday dear friend', mel: [[4, 1], [4, 1], [8, 2], [6, 2], [5, 1], [4, 2]] },
    { t: 'Happy birthday to you', mel: [[3, 1], [3, 1], [6, 2], [7, 2], [6, 2], [4, 3]] },
  ],
}
const ODE_TO_JOY: Song = {
  id: 'ode-to-joy', title: 'Ode to Joy', desc: 'Beethoven · public domain', icon: '🎼', duration: '1:40',
  lines: [
    { t: 'Joyful, joyful, we adore Thee', mel: [[2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1]] },
    { t: 'God of glory, Lord of love', mel: [[0, 1], [0, 1], [1, 1], [2, 1], [2, 1], [1, 1], [1, 2]] },
    { t: 'Hearts unfold like flowers before Thee', mel: [[2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1]] },
    { t: 'Opening to the sun above', mel: [[0, 1], [0, 1], [1, 1], [2, 1], [1, 1], [0, 1], [0, 2]] },
  ],
}
const JINGLE_BELLS: Song = {
  id: 'jingle-bells', title: 'Jingle Bells', desc: 'Holiday classic · public domain', icon: '🔔', duration: '1:30',
  lines: [
    { t: 'Jingle bells, jingle bells', mel: [[2, 1], [2, 1], [2, 2], [2, 1], [2, 1], [2, 2]] },
    { t: 'Jingle all the way', mel: [[2, 1], [4, 1], [0, 1], [1, 1], [2, 3]] },
    { t: 'Oh what fun it is to ride', mel: [[3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [2, 1], [2, 1], [2, 1]] },
    { t: 'In a one-horse open sleigh', mel: [[2, 1], [1, 1], [1, 1], [2, 1], [1, 1], [4, 2]] },
  ],
}

const LUPANG_HINIRANG: Song = {
  id: 'lupang-hinirang', title: 'Lupang Hinirang', desc: 'Philippine anthem · public domain', icon: '🇵🇭', duration: '1:20',
  lines: [
    // solfège fa-mi-sol-fa-do → rows 3-2-4-3-0
    { t: 'Bayang magiliw', mel: [[3, 2], [2, 2], [4, 2], [3, 2], [0, 3]] },
    // so-la-ti-la-so-la-fa
    { t: 'Perlas ng silanganan', mel: [[4, 2], [5, 2], [6, 2], [5, 1], [4, 1], [5, 2], [3, 3]] },
    { t: 'Alab ng puso', mel: [[3, 2], [2, 2], [4, 2], [3, 2], [0, 3]] },
    { t: "Sa dibdib mo'y buhay", mel: [[5, 2], [6, 2], [7, 2], [6, 1], [5, 1], [4, 3]] },
  ],
}

/** Song catalogue — familiar public-domain singalongs (great for testing the
    tone engine) + generic originals. All royalty-free. */
export const SONG_CATALOGUE: Song[] = [
  LUPANG_HINIRANG,
  HAPPY_BIRTHDAY,
  MARY_LAMB,
  TWINKLE,
  ODE_TO_JOY,
  JINGLE_BELLS,
  GRAVITY_OF_YOU,
  MIDNIGHT_RUN,
  PAPER_CROWNS,
  STATIC_BLOOM,
  FOUR_AM_FLOOR,
]

/** Public-domain classics (vs originals) — for the picker tag. */
export const CLASSIC_IDS = new Set<string>([
  'lupang-hinirang', 'happy-birthday', 'mary-lamb', 'twinkle-star', 'ode-to-joy', 'jingle-bells',
])

/** Classic titles (for views that only know the song's display name). */
export const CLASSIC_TITLES = new Set<string>(
  SONG_CATALOGUE.filter((s) => CLASSIC_IDS.has(s.id)).map((s) => s.title),
)
/** Provenance label: public-domain classics vs our Suno-style originals. */
export const classicArtist = (id: string) => (CLASSIC_IDS.has(id) ? 'Public domain' : 'Battle Royale Originals')
export const songTag = (title: string) => (CLASSIC_TITLES.has(title) ? 'Public domain' : 'Suno Original')

/* ================= DIFFICULTY ================= */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'pro'
export interface DiffSpec {
  label: string
  /** on-tone pixel tolerance (smaller = stricter). */
  tol: number
  /** partial-credit falloff span. */
  span: number
  /** line pass threshold (accuracy 0..1). */
  pass: number
}
/** Pitch-tracking strictness. Pro = contest / professional level. */
export const DIFFICULTY: Record<Difficulty, DiffSpec> = {
  easy: { label: 'Easy', tol: 26, span: 64, pass: 0.5 },
  normal: { label: 'Normal', tol: 18, span: 46, pass: 0.62 },
  hard: { label: 'Hard', tol: 12, span: 34, pass: 0.72 },
  pro: { label: 'Pro', tol: 8, span: 26, pass: 0.82 },
}

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
