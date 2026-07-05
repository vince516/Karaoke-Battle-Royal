/* ============================================================
   Scale load test (M5). Opens N raw-WebSocket viewers against a
   running room server and has a subset fire gifts as fast as they
   can. Proves the server-side 500ms aggregation keeps each viewer's
   inbound message rate BOUNDED regardless of gift volume — the core
   requirement for Twitch-like concurrency.

   Usage:  node scripts/loadtest.mjs [viewers] [gifters] [seconds]
   Needs:  npm run server   (wrangler dev on :8787)
   ============================================================ */
const VIEWERS = Number(process.argv[2] ?? 1000)
const GIFTERS = Number(process.argv[3] ?? 40)
const SECONDS = Number(process.argv[4] ?? 6)
const BASE = process.env.ROOM_SERVER ?? 'ws://127.0.0.1:8787'
const ROOM = 'LOAD' + Math.floor(Math.random() * 900 + 100)
const KINDS = ['tomato', 'flowers', 'rose', 'storm', 'crown']

const sockets = []
let connected = 0
let dropped = 0
let giftsSent = 0

// message counters on a representative sample of viewers
const SAMPLE = 25
const sample = Array.from({ length: SAMPLE }, () => ({ gifts: 0, state: 0, chat: 0, giftFrames: 0, other: 0 }))
let counting = false
const typeHist = {}

function open(i) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BASE}/api/ws/${ROOM}`)
    const s = sample[i] // undefined for i >= SAMPLE
    ws.onopen = () => {
      connected++
      ws.send(JSON.stringify({ type: 'hello', name: `L${i}`, color: '#FFB300' }))
      resolve(ws)
    }
    ws.onerror = () => {
      dropped++
      resolve(null)
    }
    ws.onclose = () => {}
    ws.onmessage = (e) => {
      if (!counting || !s) return
      let m
      try {
        m = JSON.parse(e.data)
      } catch {
        return
      }
      if (i === 0) typeHist[m.t] = (typeHist[m.t] || 0) + 1
      if (m.t === 'gifts') { s.giftFrames++; s.gifts += (m.counts || []).reduce((a, c) => a + c.count, 0) }
      else if (m.t === 'gift') s.gifts++
      else if (m.t === 'state') s.state++
      else if (m.t === 'chat') s.chat++
      else s.other++
    }
    sockets.push(ws)
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log(`\n▶ load test: ${VIEWERS} viewers, ${GIFTERS} gifters, ${SECONDS}s window · room ${ROOM}\n`)
  const t0 = Date.now()
  // connect in batches so we don't thundering-herd the accept loop
  for (let i = 0; i < VIEWERS; i += 50) {
    await Promise.all(Array.from({ length: Math.min(50, VIEWERS - i) }, (_, j) => open(i + j)))
    await sleep(20)
  }
  console.log(`connected ${connected}/${VIEWERS} in ${Date.now() - t0}ms (dropped ${dropped})`)
  await sleep(2000) // let any connection-ramp traffic drain before measuring steady state

  // steady-state measurement window with a gift firehose
  const openNow = sockets.filter((w) => w && w.readyState === 1).length
  console.log(`open at window start: ${openNow}`)
  counting = true
  const gifters = sockets.filter((w) => w && w.readyState === 1).slice(0, GIFTERS)
  const firehose = setInterval(() => {
    for (const ws of gifters) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'gift', kind: KINDS[(Math.random() * KINDS.length) | 0] }))
        giftsSent++
      }
    }
  }, 40) // ~25 rounds/s × GIFTERS gifts = thousands of gifts/sec

  await sleep(SECONDS * 1000)
  clearInterval(firehose)
  counting = false

  // aggregate the sample
  const tot = sample.reduce(
    (a, s) => ({
      giftFrames: a.giftFrames + s.giftFrames,
      gifts: a.gifts + s.gifts,
      state: a.state + s.state,
      chat: a.chat + s.chat,
      other: a.other + s.other,
    }),
    { giftFrames: 0, gifts: 0, state: 0, chat: 0, other: 0 },
  )
  const perViewerFramesPerSec = tot.giftFrames / SAMPLE / SECONDS
  const perViewerMsgsPerSec = (tot.giftFrames + tot.state + tot.chat + tot.other) / SAMPLE / SECONDS
  const giftRate = giftsSent / SECONDS

  console.log(`\nviewer[0] message types over ${SECONDS}s:`, JSON.stringify(typeHist))
  console.log(`\n── results ──`)
  console.log(`gifts SENT (all gifters):        ~${Math.round(giftRate)}/sec  (${giftsSent} total)`)
  console.log(`gift-count DELIVERED per viewer: ~${Math.round(tot.gifts / SAMPLE / SECONDS)}/sec (inside aggregated frames)`)
  console.log(`aggregated FRAMES per viewer:    ${perViewerFramesPerSec.toFixed(2)}/sec`)
  console.log(`TOTAL inbound msgs per viewer:   ${perViewerMsgsPerSec.toFixed(2)}/sec`)
  console.log(`still connected:                 ${sockets.filter((w) => w && w.readyState === 1).length}/${VIEWERS}`)

  const bounded = perViewerFramesPerSec <= 4 && perViewerMsgsPerSec <= 12
  console.log(
    `\nVERDICT: ${bounded ? 'PASS ✅' : 'FAIL ❌'} — ~${Math.round(giftRate)} gifts/sec collapses to ` +
      `~${perViewerFramesPerSec.toFixed(1)} frames/sec/viewer (${(giftRate / Math.max(perViewerFramesPerSec, 0.01)).toFixed(0)}× reduction)\n`,
  )
  sockets.forEach((w) => w && w.close())
  setTimeout(() => process.exit(0), 300)
}

main()
