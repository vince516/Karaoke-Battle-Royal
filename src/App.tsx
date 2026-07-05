import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ContestPage from './pages/ContestPage'
import PartyPage from './pages/PartyPage'
import SongLabPage from './pages/SongLabPage'
import SingPickerPage from './pages/SingPickerPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/contest" element={<ContestPage />} />
      {/* solo karaoke: real camera + mic score the chosen song */}
      <Route path="/sing" element={<SingPickerPage />} />
      <Route path="/sing/:songId" element={<ContestPage />} />
      {/* networked multi-device room (M2): synced score/hype/gifts/chat */}
      <Route path="/room/:code" element={<ContestPage />} />
      <Route path="/party" element={<PartyPage />} />
      <Route path="/songs" element={<SongLabPage />} />
      {/* /join/:code will deep-link straight into the guest PIN gate in M2 */}
      <Route path="/join/:code" element={<PartyPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
