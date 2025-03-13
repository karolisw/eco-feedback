import '@oicl/openbridge-webcomponents/src/palettes/variables.css' //TODO was this correct?
import './App.css'
import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { MiniDashboard } from './pages/MiniDashboard'
import { Startup } from './pages/Startup'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Startup />} />
        <Route path="/simulator" element={<Dashboard />} />
        <Route path="/mini" element={<MiniDashboard />} />
      </Routes>
    </div>
  )
}

export default App
