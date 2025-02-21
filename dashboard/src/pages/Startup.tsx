/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { SimulatorData } from '../types/DashboardData'

export function Startup() {
  const [configFiles, setConfigFiles] = useState<string[]>([])
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const navigate = useNavigate()

  const initialSimData: SimulatorData = {
    heading: 90,
    speed: 0,
    rpm: 0,
    xPos: -1.0,
    yPos: 0.0,
    resistance: 0,
    consumptionRate: 0,
    consumedTotal: 0,
    checkpoints: 3,
    power: 0, // Power of azimuth thruster
    angle: 0 // Angle of azimuth thruster
  }
  // Create WebSocket connection to the simulator
  const { sendMessage: sendToSimulator } = UseSimulatorWebSocket(
    'ws://localhost:8003',
    initialSimData
  )

  // Fetch config files from backend
  useEffect(() => {
    fetch('http://127.0.0.1:8000/get-config-files') // Backend API to list config files
      .then((res) => res.json())
      .then((data) => {
        setConfigFiles(data.files)
        if (data.files.length > 0) {
          setSelectedConfig(data.files[0]) // Select the first one by default
        }
      })
      .catch((error) => console.error('Error fetching config files:', error))
  }, [])

  // Handle Start Simulation (via WebSocket)
  const startSimulation = () => {
    sendToSimulator(
      JSON.stringify({ command: 'start_simulation' }) //, config: selectedConfig }) // TODO wrong: The config has nothing to do with the simulator
    )
    void navigate('/simulator')
  }

  return (
    <div className="startup-container">
      <h1>Ship Simulator</h1>
      <div className="config-selection">
        <label htmlFor="config">Select Configuration:</label>
        <select
          id="config"
          value={selectedConfig}
          onChange={(e) => setSelectedConfig(e.target.value)}
        >
          {configFiles.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>
      <button onClick={startSimulation} className="start-button">
        Start Simulation
      </button>
    </div>
  )
}
