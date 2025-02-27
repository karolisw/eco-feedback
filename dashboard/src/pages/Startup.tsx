import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulation } from '../hooks/useSimulation'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { SimulatorData } from '../types/DashboardData'
import { ConfigResponse } from '../types/ConfigResponse'
import { ConfigFiles } from '../types/ConfigFiles'
import '../styles/startup.css'

export function Startup() {
  const [configFiles, setConfigFiles] = useState<string[]>([])
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const navigate = useNavigate()
  const { setSimulationRunning } = useSimulation()

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
    const fetchConfigFiles = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/get-config-files')
        if (!response.ok) {
          throw new Error(`Failed to fetch config files: ${response.status}`)
        }
        const data: ConfigFiles = (await response.json()) as ConfigFiles

        setConfigFiles(data.files)

        if (data.files.length > 0) {
          setSelectedConfig(data.files[0]) // Select the first one by default
        }
      } catch (error) {
        console.error('Error fetching config files:', error)
      }
    }

    void fetchConfigFiles()
  }, [])

  // Handle Start Simulation
  const startSimulation = async () => {
    try {
      console.log('file name is: ', selectedConfig)
      // Send selected config file to backend
      const response = await fetch('http://127.0.0.1:8000/load-config', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_name: selectedConfig })
      })

      const data: ConfigResponse = (await response.json()) as ConfigResponse

      // Not able to connect to the controller
      if (data.error) {
        //console.error('Error loading config:', data.error)
        return
      }

      console.log(data.message)

      // Set simulationRunning to true globally
      setSimulationRunning(true)

      // Now start the simulation
      sendToSimulator(JSON.stringify({ command: 'start_simulation' }))
      void navigate('/simulator') // Move to dashboard
    } catch (error) {
      console.error('Failed to start simulation:', error)
    }
  }

  return (
    <div className="startup-container">
      <h1>Ship Simulator</h1>

      {/* Information Section */}
      <div className="row">
        <div className="info-section">
          <h2>What is this Simulation?</h2>
          <p>
            This simulator is designed to test eco-feedback mechanisms for
            ships. It provides real-time data on fuel consumption, efficiency,
            and other key parameters. The goal is to study how feedback can help
            operators optimize energy use.
          </p>
          <h3>How to Control the Ship</h3>
          <ul>
            <li>
              <b>Controller Support</b> - If a controller is connected, you can
              use the joystick to steer.
            </li>
          </ul>
        </div>

        {/* Configuration Selection */}
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
          <button
            onClick={() => void startSimulation()}
            className="start-button"
          >
            Start Simulation
          </button>
        </div>
      </div>

      {/* Start Simulation Button */}
    </div>
  )
}
