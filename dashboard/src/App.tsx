import '@oicl/openbridge-webcomponents/src/palettes/variables.css' //TODO was this correct?
import './App.css'
import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { MiniDashboard } from './pages/MiniDashboard'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mini" element={<MiniDashboard />} />
      </Routes>
    </div>
  )
}

export default App
