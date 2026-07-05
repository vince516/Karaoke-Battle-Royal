import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SONG_CATALOGUE } from '../lib/songs'
import { createRoom as createServerRoom } from '../net/roomClient'

/* ============================================================
   Party room / join flow — React port of party.html.
   Host → 6-char code + QR + PIN + slots. Guests: scan → PIN gate
   → name + color → lobby → claim slot + pick Suno track → start.
   State lives in component state here; in M2 it moves into the
   room's Durable Object and syncs over WebSocket.
   ============================================================ */

const HUES = [
  'linear-gradient(135deg,#E10A17,#ff5d78)',
  'linear-gradient(135deg,#0e8f6b,#17E8A0)',
  'linear-gradient(135deg,#7b2ff7,#b98cff)',
  'linear-gradient(135deg,#c76b00,#FFB300)',
  'linear-gradient(135deg,#0a6fb0,#5ecbff)',
  'linear-gradient(135deg,#a30a5e,#ff6fb0)',
]
const GUESTS: [string, string][] = [
  ['Enrico', 'E'], ['Stephen', 'S'], ['Kaye', 'K'], ['Mika', 'M'],
  ['Dre', 'D'], ['Bianca', 'B'], ['JC', 'J'],
]
const SUNO_PROMPT =
  'upbeat OPM-style pop duet, male + female vocals trading lines, karaoke-friendly clear melody, catchy singalong chorus, 100 bpm, clean mix, radio structure verse-chorus-verse, emotional bridge — theme: [your theme]. Then export audio + request timestamped lyrics (.lrc).'

type Screen = 's0' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6'
interface Member { n: string; ini: string; hue: string; host?: boolean }
interface Slot { name: string; ini: string; hue: string; song: string }

/** 4-digit PIN entry. Module-level so it keeps focus across renders. */
function PinInputs({ vals, onChange }: { vals: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="pinrow">
      {vals.map((v, i) => (
        <input
          key={i}
          className="pin num"
          maxLength={1}
          inputMode="numeric"
          value={v}
          onChange={(e) => {
            const next = [...vals]
            next[i] = e.target.value.replace(/\D/g, '').slice(-1)
            onChange(next)
          }}
        />
      ))}
    </div>
  )
}

export default function PartyPage() {
  const nav = useNavigate()
  const [screen, setScreen] = useState<Screen>('s0')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // host setup
  const [roomName, setRoomName] = useState('Friday Night Videoke')
  const [hostPin, setHostPin] = useState(['7', '7', '2', '4'])
  const [slots, setSlots] = useState(8)

  // room
  const [code, setCode] = useState('BRDK52')
  const [pin, setPin] = useState('7724')
  const [members, setMembers] = useState<Member[]>([{ n: 'You (Host)', ini: 'Y', hue: HUES[0], host: true }])
  const [queue, setQueue] = useState<(Slot | null)[]>([])

  // guest
  const [joinCode, setJoinCode] = useState('BRDK52')
  const [joinPin, setJoinPin] = useState(['', '', '', ''])
  const [gname, setGname] = useState('')
  const [myHue, setMyHue] = useState(HUES[3])
  const [me, setMe] = useState<Member | null>(null)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)

  const flash = (t: string) => {
    setToast(t)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }
  const go = (s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }

  // ---- host: create room + simulate the barkada scanning in ----
  const createRoom = () => {
    const newPin = hostPin.map((c) => c || '0').join('')
    const newCode = 'BR' + Math.random().toString(36).slice(2, 6).toUpperCase()
    setPin(newPin)
    setCode(newCode)
    setQueue(Array(slots).fill(null))
    setMembers([{ n: 'You (Host)', ini: 'Y', hue: HUES[0], host: true }])
    go('s2')
  }

  // simulate scan-ins once we're on the room screen
  useEffect(() => {
    if (screen !== 's2') return
    let i = 0
    const iv = setInterval(() => {
      if (i >= 5) {
        clearInterval(iv)
        return
      }
      const g = GUESTS[i]
      const hue = HUES[(i + 1) % 6]
      setMembers((m) => [...m, { n: g[0], ini: g[1], hue }])
      flash(`📲 ${g[0]} scanned in`)
      if (i < 3) {
        setQueue((q) => {
          const open = q.indexOf(null)
          if (open < 0) return q
          const next = [...q]
          next[open] = { name: g[0], ini: g[1], hue, song: SONG_CATALOGUE[(i + 1) % SONG_CATALOGUE.length].title }
          return next
        })
      }
      i++
    }, 2600)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const checkPin = () => {
    if (joinPin.join('') === pin) {
      flash('✅ PIN accepted')
      go('s4')
    } else flash('❌ Wrong PIN — ask your host')
  }
  const joinLobby = () => {
    const n = (gname || 'Guest').trim()
    const m: Member = { n, ini: n[0].toUpperCase(), hue: myHue }
    setMe(m)
    setMembers((prev) => [...prev, m])
    flash(`🎉 Welcome, ${n}!`)
    go('s5')
  }
  const claimSong = (title: string) => {
    if (pendingSlot === null) return
    const who = me ?? { n: 'You (Host)', ini: 'Y', hue: HUES[0] }
    setQueue((q) => {
      const next = [...q]
      next[pendingSlot] = { name: who.n, ini: who.ini, hue: who.hue, song: title }
      return next
    })
    flash(`🔒 Slot ${pendingSlot + 1} · “${title}”`)
    go('s5')
  }
  const startBattle = async () => {
    flash('🎤 Launching the arena…')
    try {
      // spin up a real synced room (Durable Object) and enter it
      const serverCode = await createServerRoom(roomName, slots)
      nav(`/room/${serverCode}`)
    } catch {
      // no room server reachable (e.g. offline single-file build) → local demo
      nav('/contest')
    }
  }

  const filled = queue.filter(Boolean).length
  const qrSrc =
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=6&data=' +
    encodeURIComponent('https://battleroyale.app/join/' + code)

  return (
    <div className="party">
      <div className="wrap">
        <div className="top">
          <div className="brand">
            ✕ Battle <b>Royale</b>
          </div>
          <span className="mode">PARTY ROOM · M1</span>
        </div>

        {screen === 's0' && (
          <section className="screen">
            <h1>
              Group videoke,
              <br />
              one <i>QR</i> away
            </h1>
            <p className="sub">
              Host a private room for your barkada. Everyone joins by scanning — no download, no
              sign-up. This small-room flow runs the same engine as the thousands-viewer live arena.
            </p>
            <button className="big red" onClick={() => go('s1')}>
              🎤 Host a room
            </button>
            <div style={{ height: 10 }} />
            <button className="big ghost" onClick={() => go('s3')}>
              📲 I have a room code
            </button>
          </section>
        )}

        {screen === 's1' && (
          <section className="screen">
            <div className="steps">
              <i className="on" />
              <i />
              <i />
            </div>
            <h1>Set up your room</h1>
            <p className="sub">Name it, protect it with a PIN, and choose how many singer slots tonight gets.</p>
            <div className="card">
              <label className="lab">ROOM NAME</label>
              <input className="fld" value={roomName} maxLength={30} onChange={(e) => setRoomName(e.target.value)} />
            </div>
            <div className="card">
              <label className="lab">ROOM PIN (guests need this)</label>
              <PinInputs vals={hostPin} onChange={setHostPin} />
            </div>
            <div className="card">
              <label className="lab">SINGER SLOTS</label>
              <div className="slotpick">
                {[4, 6, 8, 10].map((n) => (
                  <button key={n} className={slots === n ? 'on' : ''} onClick={() => setSlots(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button className="big red" onClick={createRoom}>
              Create room →
            </button>
          </section>
        )}

        {screen === 's2' && (
          <section className="screen">
            <div className="steps">
              <i className="on" />
              <i className="on" />
              <i />
            </div>
            <h1>{roomName || 'Party Room'}</h1>
            <p className="sub">
              Show this screen (or cast it to the TV). Guests scan the QR, enter the PIN, and land in
              the lobby.
            </p>
            <div className="card">
              <div className="roomhead">
                <div className="qr">
                  <img
                    src={qrSrc}
                    alt="Room QR"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      ;(e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                    }}
                  />
                  <div className="qrfall" style={{ display: 'none' }}>
                    SCAN
                    <br />/{code}
                  </div>
                </div>
                <div className="codebox">
                  <span className="lab">ROOM CODE</span>
                  <div className="rcode">{code}</div>
                  <div className="pinshow">
                    PIN <i>{pin}</i>
                  </div>
                  <div className="rmeta">
                    battleroyale.app/join/<b>{code}</b>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <label className="lab">
                IN THE LOBBY · <span className="num">{members.length}</span>
              </label>
              <div className="members">
                {members.map((m, i) => (
                  <div key={i} className={`mem${m.host ? ' host' : ''}`}>
                    <div className="mav" style={{ background: m.hue }}>
                      {m.ini}
                    </div>
                    <div className="mn">{m.n}</div>
                  </div>
                ))}
                <div className="mem ghosty">
                  <div className="mav">📲</div>
                  <div className="mn">scan to join</div>
                </div>
              </div>
            </div>
            <button className="big gold" onClick={() => go('s5')}>
              Open lobby & queue →
            </button>
            <p className="note">
              <b>Production note:</b> this room state (members, queue, votes) lives in one WebSocket
              room / Durable Object for small groups. The live arena is the same state machine behind
              a broadcast layer — HLS out, pub/sub chat fan-out, and server-side gift aggregation for
              thousands of viewers.
            </p>
          </section>
        )}

        {screen === 's3' && (
          <section className="screen">
            <div className="steps">
              <i className="on" />
              <i />
              <i />
            </div>
            <h1>Join the room</h1>
            <p className="sub">Scanned the QR? The code is pre-filled — just add the PIN your host gave you.</p>
            <div className="card">
              <label className="lab">ROOM CODE</label>
              <input
                className="fld"
                value={joinCode}
                maxLength={6}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: 4, fontFamily: 'Archivo', fontWeight: 900, fontSize: 20, textTransform: 'uppercase' }}
              />
            </div>
            <div className="card">
              <label className="lab">ROOM PIN</label>
              <PinInputs vals={joinPin} onChange={setJoinPin} />
            </div>
            <button className="big red" onClick={checkPin}>
              Unlock →
            </button>
          </section>
        )}

        {screen === 's4' && (
          <section className="screen">
            <div className="steps">
              <i className="on" />
              <i className="on" />
              <i />
            </div>
            <h1>Who's singing?</h1>
            <p className="sub">Pick a name and a color. No account — you exist only in this room.</p>
            <div className="card">
              <label className="lab">DISPLAY NAME</label>
              <input className="fld" placeholder="e.g. Vince" maxLength={14} value={gname} onChange={(e) => setGname(e.target.value)} />
            </div>
            <div className="card">
              <label className="lab">COLOR</label>
              <div className="members">
                {HUES.map((h, i) => (
                  <button key={i} className="mem" onClick={() => setMyHue(h)}>
                    <div
                      className="mav"
                      style={{ background: h, boxShadow: h === myHue ? '0 0 0 3px var(--gold)' : undefined }}
                    >
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button className="big red" onClick={joinLobby}>
              Enter lobby →
            </button>
          </section>
        )}

        {screen === 's5' && (
          <section className="screen">
            <div className="steps">
              <i className="on" />
              <i className="on" />
              <i className="on" />
            </div>
            <h1>{roomName || 'Party Room'}</h1>
            <p className="sub">
              Claim a slot, pick your Suno track, and hit start when the room is ready. Tomatoes
              reload every 30s once the battle begins. 🍅
            </p>
            <div className="card">
              <label className="lab">
                SINGING ORDER · <span className="num">{filled}</span>/<span className="num">{queue.length}</span> SLOTS
              </label>
              <div>
                {queue.map((q, i) =>
                  q ? (
                    <div key={i} className={`qrow${me && q.name === me.n ? ' mine' : ''}`}>
                      <span className="qn num">{i + 1}</span>
                      <span className="qa" style={{ background: q.hue }}>
                        {q.ini}
                      </span>
                      <span className="qi">
                        <span className="qname">{q.name}</span>
                        <span className="qsong">
                          🎵 <b>“{q.song}”</b> <span className="sunotag">SUNO ORIGINAL</span>
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="qrow open">
                      <span className="qn num">{i + 1}</span>
                      <span className="qa">👤</span>
                      <span className="qi">
                        <span className="qname" style={{ color: 'var(--gold)' }}>
                          Open slot
                        </span>
                        <span className="qsong">Claim it and pick a track</span>
                      </span>
                      <button
                        className="pickbtn"
                        onClick={() => {
                          setPendingSlot(i)
                          go('s6')
                        }}
                      >
                        Claim
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>
            <button className="big red" onClick={startBattle}>
              ▶ Start the battle
            </button>
            <div style={{ height: 10 }} />
            <button className="big ghost" onClick={() => go('s2')}>
              ↺ Back to room QR
            </button>
          </section>
        )}

        {screen === 's6' && (
          <section className="screen">
            <h1>Pick your track</h1>
            <p className="sub">
              All originals generated with Suno — zero licensing risk. Timed lyrics ship in the same
              LRC format the arena's karaoke engine reads.
            </p>
            <div>
              {SONG_CATALOGUE.map((s) => (
                <button key={s.id} className="song" onClick={() => claimSong(s.title)}>
                  <span className="sic">{s.icon}</span>
                  <span className="si">
                    <span className="snm">
                      {s.title} <span className="sunotag">SUNO</span>
                    </span>
                    <span className="sdt">{s.desc}</span>
                  </span>
                  <span className="dur num">{s.duration}</span>
                </button>
              ))}
            </div>
            <div className="copycard">
              <div className="cc-t">🎛️ Need another track? Suno prompt template:</div>
              <div className="cc-p">{SUNO_PROMPT}</div>
              <button
                className="copybtn"
                onClick={() => {
                  navigator.clipboard?.writeText(SUNO_PROMPT)
                  flash('📋 Suno prompt copied')
                }}
              >
                Copy prompt
              </button>
            </div>
            <div style={{ height: 14 }} />
            <button className="big ghost" onClick={() => go('s5')}>
              ← Back to lobby
            </button>
          </section>
        )}
      </div>

      <div className={`toast${toast ? ' show' : ''}`} style={{ top: 'auto', bottom: 'calc(26px + var(--sab))', transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(90px)' }}>
        {toast}
      </div>
    </div>
  )
}
