import './App.css'
//import { Routes, Route, Link } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import '@oicl/openbridge-webcomponents/src/palettes/variables.css' //TODO was this correct?

function App() {
  return (
    <div>
      {/*
      <nav>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/another">Another Page</Link>
          </li>
        </ul>
      </nav>
      
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
      */}
      <Dashboard></Dashboard>
    </div>
  )
}

export default App
