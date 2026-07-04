import { useRoom } from '../../state/roomStore'

export function UpNext() {
  const upNext = useRoom((s) => s.upNext)
  return (
    <button className="upnext glass">
      <span className="ul">UP NEXT</span>
      <span className="ut">
        {upNext.name} <i>· “{upNext.song}”</i>
      </span>
    </button>
  )
}
