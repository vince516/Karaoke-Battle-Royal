# Deploying Battle Royale

Two pieces ship separately: the **static frontend** (any static host) and the
**room server** (Cloudflare Worker + Durable Objects + D1 + R2). Media at scale
needs an **SFU + LL-HLS** provider. Everything below uses the free tiers where
possible.

---

## 1. Room server — Cloudflare Worker + Durable Objects + D1 + R2

Prereqs: a Cloudflare account, `npx wrangler login`.

```bash
# one-time: create the storage the Worker binds to
npx wrangler d1 create battle-royale-songs      # copy the printed database_id
npx wrangler r2 bucket create battle-royale-assets
```

Paste the `database_id` into `wrangler.jsonc` (`d1_databases[0].database_id`),
then apply the schema and deploy:

```bash
# the songs table is created lazily on first request, but you can also
# seed/inspect it directly:
npx wrangler d1 execute battle-royale-songs --command "SELECT count(*) FROM songs"

npm run deploy:server        # wrangler deploy → https://battle-royale-rooms.<sub>.workers.dev
```

Durable Objects use `new_sqlite_classes` (free plan). One DO per room code owns
`{members, queue, currentSinger, scores, hypeTotal, giftLog, chat}` and does the
scale-mode gift aggregation.

### Populating the catalogue

Songs live in **D1** (metadata + melody + timed lyrics) and **R2** (audio).
Ingest from a source into the catalogue:

```bash
# an original with raw LRC (melody is synthesised from the timing):
curl -X POST https://<worker>/api/songs/ingest \
  -H 'content-type: application/json' \
  -d '{"title":"Neon Sunrise","source":"suno","icon":"🌅",
       "syncedLyrics":"[00:12.30]Chasing the neon sunrise\n[00:15.80]Racing the dawn"}'

# from LRCLIB (only for lyrics you have the right to use):
curl -X POST https://<worker>/api/songs/ingest \
  -d '{"lrclib":{"artist":"<artist>","track":"<track>"}}'
```

**Sources** (all researched, all real):
- **Suno API** (`api.sunoapi.org`) — generate *original* songs + timestamped
  lyrics. The compliant path: originals only, you own the output. Upload the
  audio to R2 and pass its key as `audioKey`.
- **Jamendo API** (`developer.jamendo.com`) — ~400k Creative-Commons tracks,
  legal audio for backing music. Needs a free client id.
- **LRCLIB** (`lrclib.net`, keyless) — synced lyrics for ~3M tracks. Those are
  copyrighted, so ingest only what you're licensed for. **No copyrighted lyrics
  are committed to this repo** — the default catalogue is originals.

---

## 2. Frontend — any static host

```bash
npm run build          # → dist/
# point the client at the deployed Worker:
echo "VITE_ROOM_SERVER=https://battle-royale-rooms.<sub>.workers.dev" > .env.production
# optional scale egress:
echo "VITE_HLS_URL=https://<cdn>/live/contest.m3u8" >> .env.production
npm run build
```

Deploy `dist/` to Cloudflare Pages, Netlify, Vercel, or GitHub Pages. A Pages
workflow is already committed (`.github/workflows/deploy.yml`).

> Live camera (`getUserMedia`) requires a **secure context** — works on
> `localhost` and any `https://` origin, not plain `http://` over a network.

---

## 3. Media: WebRTC now, SFU + LL-HLS at scale

- **Party rooms (≤ ~50):** the singer publishes over **WebRTC** and viewers
  subscribe directly (mesh), signalled through the room DO. Nothing extra to
  deploy — it already works.
- **Contest scale (thousands):** stand up an **SFU** that ingests the singer's
  WebRTC track and fans it out as **Low-Latency HLS** via a CDN. Options:
  - **Cloudflare Stream / Realtime (Calls)** — same account as the Worker.
  - **LiveKit Cloud** — WebRTC ingest + HLS egress.
  Point `VITE_HLS_URL` at the resulting `.m3u8`. The client already prefers
  HLS → WebRTC → broadcast rig (`useHlsPlayback` + hls.js, lazily loaded).

Judges/host stay on WebRTC (sub-500 ms); the crowd takes the 2–5 s HLS path.

---

## Scale sanity check

```bash
npm run server
node scripts/loadtest.mjs 500 40 6   # 500 viewers, 40 gifters
# ~1000 gifts/sec → ~2 aggregated frames/sec/viewer, bounded fan-out
```
