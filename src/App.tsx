import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ContestPage from './pages/ContestPage'
import PartyPage from './pages/PartyPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/contest" element={<ContestPage />} />
      <Route path="/party" element={<PartyPage />} />
      {/* /join/:code will deep-link straight into the guest PIN gate in M2 */}
      <Route path="/join/:code" element={<PartyPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
