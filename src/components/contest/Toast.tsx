import { useRoom } from '../../state/roomStore'

export function Toast() {
  const toast = useRoom((s) => s.toast)
  return <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
}
