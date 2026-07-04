import { useRoom } from '../../state/roomStore'

export function SingerPlate() {
  const singer = useRoom((s) => s.singer)
  return (
    <div className="plate glass">
      <span className="av">{singer.initial}</span>
      <span>
        <div className="nm">{singer.name}</div>
        <div className="sg">
          🎵 <b>“{singer.song}”</b> · Suno Original
        </div>
      </span>
    </div>
  )
}
