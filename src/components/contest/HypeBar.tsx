import { useRoom, tierOf } from '../../state/roomStore'
import { TIERS } from '../../lib/songs'

export function HypeBar() {
  const hypeTotal = useRoom((s) => s.hypeTotal)
  const lv = Math.floor(hypeTotal / 100)
  const ti = tierOf(hypeTotal)
  const pct = hypeTotal % 100
  const [label] = TIERS[ti]

  return (
    <div className="hypewrap">
      <div className="hypehead">
        <span className="hl" style={{ color: 'var(--mut)' }}>
          HYPE
        </span>
        <span className="lv num">LV.{lv + 1}</span>
        <span className="tier">{label}</span>
      </div>
      <div className="hypebar">
        {/* SUPERMAX (t4) stays visually full & animated */}
        <div className="hf" style={{ width: `${ti === 4 ? 100 : pct}%` }} />
      </div>
    </div>
  )
}
