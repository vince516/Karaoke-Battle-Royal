# Battle Royale — Live Tone Contest

Production web app for **Battle Royale**, a TikTok-Live–style singing-contest
platform: a full-screen singer stage, a tone-following contest lane, audience
gifts that move the score (tomatoes subtract, flowers/crowns add), an endless
leveling **hype bar** up to **SUPERMAX**, a contestant queue with nominations,
and a QR party-room join flow.

> **The one critical concept:** the full-screen background *is* the singer's
> live video stream. Every other element — tone lane, gifts, score, hype, chat
> — is an overlay on top of that stream.

## Status — M1 ✅ · M2 rooms ✅ · M3 video ✅ · M4 tone+songs ✅ · M5 scale ✅

**M4 — real tone engine + backend song catalogue.** The tone dot is now driven
by **real mic pitch** (pitchy / McLeod method, ~20 Hz) off the singer's WebRTC
audio, relayed through the room DO so **every viewer's lane shows the same dot**
(verified singer→viewer). Songs live on **our backend** — a Cloudflare **D1**
table (melody + timed lyrics) with **R2** for audio — not a third-party API at
runtime. External APIs are *ingestion* sources: **Suno** (originals + timestamped
lyrics), **Jamendo** (Creative-Commons audio), **LRCLIB** (synced lyrics). Raw
**LRC ingests into a singable melody** automatically (`/api/songs/ingest`); browse
and ingest at **`/songs`**. No copyrighted lyrics are committed — the default
catalogue is originals. See `DEPLOY.md` for wiring the SFU/HLS + D1/R2.



**M5 — scale mode (Twitch-like volume).** Above a viewer threshold the room
switches from per-event broadcast to **server-side aggregation**: gifts batch
into one 500 ms tick (`🍅 ×214` bursts, never N DOM nodes), joins stop
announcing per-viewer (was O(N²) on a ramp), and chat fan-out is rate-capped.
The result: **per-viewer inbound message rate is bounded and independent of
crowd size.** Load-tested locally — 500 concurrent WebSocket viewers, ~1,000
gifts/sec collapses to **~2 aggregated frames/sec/viewer (≈490× reduction)**,
2.3 msgs/sec/viewer total, all connections stable. (500 is the sandbox's file-
descriptor ceiling on `workerd`; the aggregation is O(1) per viewer per tick, so
it holds at far higher counts.) The media path scales via an **LL-HLS egress**
URL (`VITE_HLS_URL`, played through hls.js, lazily loaded) — WebRTC mesh for
party rooms, HLS/CDN for the contest firehose. `node scripts/loadtest.mjs` runs
the test.



**M3 — live WebRTC video.** The singer's real camera (`getUserMedia`) becomes
the full-bleed stage background and is published to every viewer over **real
WebRTC** — SDP/ICE relayed through the room Durable Object, no external SFU
(a mesh, right for the ≤ ~50-viewer party rooms; SFU + LL-HLS is M5). Swipe (or
the page dots) between the audience view and the **singer FPV**: mirrored
self-cam, giant lyrics + "🎤 YOUR PART" pill, get-ready dots, mic/cam/end-set
controls, and incoming-gift banners. Verified two browsers: singer goes live,
viewer receives the live track as its background in **~850 ms**. When the singer
ends the set the room falls back to the broadcast rig.



**M2 — real multi-device rooms.** A Cloudflare Worker + Durable Object (one DO
per room code) owns the authoritative room state and broadcasts over WebSocket.
Open `/room/:code` in two browsers and gifts, points, hype, chat, and viewer
count stay in lock-step — measured **~40 ms** cross-device on localhost, scores
identical, cooldowns and chat rate-limits enforced server-side. Without a room
code the same screen runs the M1 local simulation, so the offline single-file
build still works.

Run it locally (two terminals):

```bash
npm run server    # wrangler dev — room DO on http://localhost:8787
npm run dev        # vite — client on http://localhost:5173
# open http://localhost:5173/Karaoke-Battle-Royal/#/room/PARTY1 in two windows
```



A pixel-close React port of the design-source prototype (`br-live/index.html`,
`arena.html`, `party.html`), running on **simulated data**. Everything you see
is wired to a single room store shaped exactly like the server-authoritative
room state that a Durable Object will own in M2 — so the UI never changes as
real infrastructure lands.

What works now:

- **Tone Contest** (`/contest`) — the flagship screen. Faithful port of
  `index.html`: full-bleed broadcast-rig stage (light beams, haze, crowd bokeh,
  hard camera cuts, beat flashes), tone lane with scrolling gold pitch blocks and
  a pitch-riding dot, per-line pass/fail scoring, live match %, gift rail with
  30 s reload rings, gift projectiles + impact stamps, floating chat bubbles, a
  full chat drawer, tap-to-hide chrome (4.5 s auto-hide), and fullscreen.
- **Endless hype** — `hypeTotal` never caps; five tiers CHILL → GROOVE → FIRE →
  BLAZE → **SUPERMAX** (locked-full animated rainbow bar, screen glow, beat
  flashes), fed by gifts, tone passes, and crowd velocity, decaying over time.
- **Party room** (`/party`) — port of `party.html`: host setup → 6-char code +
  QR + PIN + slot count → live lobby (guests "scan in") → singing-order queue →
  Suno-original song picker → start.
- **Landing** (`/`) — entry with the two flows.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind (tokens) + ported prototype CSS (`src/styles/`) |
| State | Zustand room store (`src/state/roomStore.ts`) |
| Routing | React Router |
| Realtime server | Cloudflare Worker + Durable Objects over WebSocket (`worker/`) |

Design tokens are extracted verbatim from the prototype — Virgin red `#E10A17`,
gold `#FFB300`, mint `#17E8A0`, splat `#FF5330`, bloom `#FF7AA8`, ink `#0E0E10`;
Archivo 800/900 for display/numbers, Inter for UI, tabular numerals on counters.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Mobile-first 9:16 — best viewed in a phone-sized viewport.

### Scale load test

```bash
npm run server                     # wrangler dev
node scripts/loadtest.mjs 500 40 6 # 500 viewers, 40 gifters, 6s window
```

## Architecture (built to grow into M2–M5)

- **`src/state/roomStore.ts`** — the client mirror of a room's authoritative
  state (`score`, `viewers`, `hypeTotal`, `messages`, gift log, cooldowns,
  singer, queue…). In M1 it's driven locally; in M2 the same setters are fed by
  diffs a Durable Object broadcasts over the room WebSocket. Component code
  won't change.
- **`src/hooks/useToneEngine.ts`** — the canvas draw loop. Singer pitch is
  *simulated* in M1; in M4 the same head position is fed by real Web Audio pitch
  frames off the singer's mic, relayed so every viewer sees one dot. Server stays
  authoritative for line pass/fail.
- **`src/hooks/useSimulatedRoom.ts`** — the only throwaway module: ambient chat,
  crowd gifts, hype decay, viewer drift. Deleted when the DO feed arrives.
- **`src/lib/songs.ts`** — song data as ordered lines of `{note, beats}` melody
  segments at 520 ms/beat. All originals (Suno-style placeholders) — **no
  licensed music anywhere in the repo**. M4 loads these from LRC+melody JSON.

### Roadmap

- **M2 — Rooms:** ✅ Cloudflare Worker + Durable Objects room state, WebSocket
  sync of chat/gifts/points/hype/viewers across devices, server-side cooldowns
  and rate-limits. (`worker/`, `src/net/`, `src/hooks/useRoomSocket.ts`.)
- **M3 — Live video:** ✅ WebRTC publish/subscribe (mesh, signaled via the room
  DO), singer's real camera as the background, singer FPV view with swipe pager
  and mic/cam/end-set controls. (`worker/room.ts` signaling, `src/net/webrtc.ts`,
  `src/hooks/useMedia.ts` + `useWebRTC.ts`, `src/components/singer/`.) Still to
  come: opponent/duet PiP and queue auto-advance.
- **M4 — Real tone engine:** ✅ mic pitch detection (pitchy) + shared pitch
  frames + backend song catalogue (D1/R2) with LRC→melody ingestion.
  (`usePitchDetection`, `worker/songs.ts`, `worker/lrc.ts`, `/songs`.) Remaining:
  server-authoritative line scoring (clients currently score locally off the
  shared dot) and real audio assets in R2.
- **M5 — Scale mode:** ✅ server-side gift aggregation ticks, bounded fan-out
  (join/leave/chat), LL-HLS viewer path (`useHlsPlayback` + hls.js), 500-viewer
  load test. (`worker/room.ts`, `scripts/loadtest.mjs`.)

## Prototype

The original UI prototype is preserved under `br-live/` as the design source of
truth. All songs are original Suno-style placeholders — no copyrighted lyrics or
audio anywhere in the repo.
