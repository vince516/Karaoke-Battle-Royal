/** Locale number formatter used on every tabular counter. */
export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US')

/** Escape user chat input before it lands in innerHTML-rendered lists. */
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let _id = 0
/** Monotonic id source for transient list items (floaters, bubbles…). */
export const nextId = (): number => ++_id
