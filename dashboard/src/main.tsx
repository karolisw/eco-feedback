import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App'
import { SimulationContextProvider } from './context/SimulationContextProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimulationContextProvider>
      <Router>
        <App />
      </Router>
    </SimulationContextProvider>
  </StrictMode>
)
