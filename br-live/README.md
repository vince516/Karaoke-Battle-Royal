# Battle Royale — Live Tone Contest (Prototype)

Interactive UI prototype for a live singing-contest platform: TikTok-style full-screen stage,
tone-following contest lane, audience gifts that add points (tomatoes subtract), an endless
leveling hype bar up to SUPERMAX, contestant queue with nominations, and a QR party-room flow.

## Pages
- `index.html` — **Tone Contest** (main product screen, singer video embedded, works offline)
- `arena.html` — Duet battle variant (Smule-style videoke layer, swipe between audience/singer views)
- `party.html` — Group party room: QR + PIN entry, lobby, song queue (Suno originals)

## Run locally
Just open `index.html` in any browser. No build, no dependencies.

## Deploy
This repo is GitHub Pages-ready: Settings → Pages → Deploy from branch → `main` / root.

## Notes
- All songs are original (Suno-style placeholders) — no licensed music included.
- Streams are simulated; production would use WebRTC ingest + HLS out, WebSocket room state,
  pub/sub chat fan-out, and server-side gift aggregation.
- Demo build · no real payments.
