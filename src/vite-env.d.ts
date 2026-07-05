/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROOM_SERVER?: string
  /** Scale-mode LL-HLS egress URL (SFU → CDN). Viewers play this at scale. */
  readonly VITE_HLS_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
