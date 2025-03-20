import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulation } from '../hooks/useSimulation'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { SimulatorData } from '../types/DashboardData'
import { ConfigResponse } from '../types/ConfigResponse'
import { ConfigFiles } from '../types/ConfigFiles'
import {
  AngleAdvice,
  AdviceType
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'

import '../styles/startup.css'
import { AlertConfig } from '../types/AlertConfig'

export function Startup() {
  const [configFiles, setConfigFiles] = useState<string[]>([])
  const [selectedConfig, setSelectedConfig] = useState<string>('')

  const navigate = useNavigate()
  const { setSimulationRunning } = useSimulation()

  // Alert zone settings
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    vibrationApproach: 1,
    vibrationEnter: 2,
    vibrationRemain: 3,
    resistanceApproach: 0,
    resistanceEnter: 1,
    resistanceRemain: 2,
    detents: false,
    feedbackDuration: 4000, // Default 4s
    enableVibration: true,
    enableResistance: false,
    enableDetents: false
  })

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

  // ------------------------------
  // STATE FOR ALERT ZONES
  // ------------------------------

  const [angleAdvices, setAngleAdvices] = useState<AngleAdvice[]>([
    { minAngle: 20, maxAngle: 50, type: AdviceType.advice, hinted: true },
    { minAngle: 75, maxAngle: 100, type: AdviceType.caution, hinted: true }
  ])

  const [thrustAdvices, setThrustAdvices] = useState<LinearAdvice[]>([
    { min: 20, max: 50, type: AdviceType.advice, hinted: true },
    { min: 80, max: 100, type: AdviceType.caution, hinted: true }
  ])

  const updateAngleAdvice = <K extends keyof AngleAdvice>(
    index: number,
    key: K,
    value: AngleAdvice[K]
  ) => {
    setAngleAdvices((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const updateThrustAdvice = <K extends keyof LinearAdvice>(
    index: number,
    key: keyof LinearAdvice,
    value: LinearAdvice[K]
  ) => {
    const updated = [...thrustAdvices]
    updated[index] = { ...updated[index], [key]: value }
    setThrustAdvices(updated)
  }

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
      // Pass alert zones via navigation state
      await navigate('/simulator', {
        state: {
          angleAdvices,
          thrustAdvices,
          alertConfig,
          selectedConfig
        }
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
    }
  }

  return (
    <div className="startup-container">
      <h1>Ship Simulator</h1>
      <div className="row">
        <div className="info-section">
          <h2>What is this Simulation?</h2>
          <p>
            This simulator tests eco-feedback mechanisms for ships. It provides
            real-time data on fuel consumption, efficiency, and other key
            parameters.
          </p>
        </div>

        <div className="config-selection">
          <label>Select Configuration:</label>
          <select
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
      </div>

      {/* Alert Zone Configuration */}
      <div className="alert-config">
        <h3>Configure Alert Zones</h3>

        <h4>Angle Alerts</h4>
        {angleAdvices.map((advice, index) => (
          <div key={index} className="alert-input">
            <input
              type="number"
              value={advice.minAngle}
              onChange={(e) =>
                updateAngleAdvice(index, 'minAngle', Number(e.target.value))
              }
            />
            <input
              type="number"
              value={advice.maxAngle}
              onChange={(e) =>
                updateAngleAdvice(index, 'maxAngle', Number(e.target.value))
              }
            />
            <select
              value={advice.type}
              onChange={(e) =>
                updateAngleAdvice(index, 'type', e.target.value as AdviceType)
              }
            >
              <option value={AdviceType.advice}>Advice</option>
              <option value={AdviceType.caution}>Caution</option>
            </select>
          </div>
        ))}
        <h4>Thrust Alerts</h4>
        {thrustAdvices.map((advice, index) => (
          <div key={index} className="alert-input">
            <input
              type="number"
              value={advice.min}
              onChange={(e) =>
                updateThrustAdvice(index, 'min', Number(e.target.value))
              }
            />
            <input
              type="number"
              value={advice.max}
              onChange={(e) =>
                updateThrustAdvice(index, 'max', Number(e.target.value))
              }
            />
            <select
              value={advice.type}
              onChange={(e) =>
                updateThrustAdvice(index, 'type', e.target.value as AdviceType)
              }
            >
              <option value={AdviceType.advice}>Advice</option>
              <option value={AdviceType.caution}>Caution</option>
            </select>
          </div>
        ))}
        <div className="alert-config-container">
          <h3>Haptic Feedback Configuration</h3>

          {[
            {
              key: 'vibrationApproach',
              label: 'Vibration (Approaching)',
              tooltip: 'Vibration strength when approaching alert zone'
            },
            {
              key: 'vibrationEnter',
              label: 'Vibration (Entering)',
              tooltip: 'Vibration strength when entering alert zone'
            },
            {
              key: 'vibrationRemain',
              label: 'Vibration (Remaining)',
              tooltip: 'Vibration strength when remaining in alert zone'
            },
            {
              key: 'feedbackDuration',
              label: 'Feedback Duration (ms)',
              tooltip: 'How long feedback lasts (except remaining inside)'
            }
          ].map(({ key, label, tooltip }) => (
            <div key={key} className="label-container">
              <div className="label-wrapper">
                <span className="info-icon" data-tooltip={tooltip}>
                  ℹ
                </span>
                <label>{label}</label>
              </div>
              <input
                type="number"
                value={
                  typeof alertConfig[key as keyof AlertConfig] === 'boolean'
                    ? Number(alertConfig[key as keyof AlertConfig])
                    : alertConfig[key as keyof AlertConfig].toString()
                }
                onChange={(e) =>
                  setAlertConfig((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value)
                  }))
                }
              />
            </div>
          ))}

          {/* Checkbox options */}
          <div className="label-container">
            <div className="label-wrapper">
              <span
                className="info-icon"
                data-tooltip="Enable vibration feedback"
              >
                ℹ
              </span>
              <label>Enable Vibration</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.enableVibration}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  enableVibration: !prev.enableVibration
                }))
              }
            />
          </div>

          <div className="label-container">
            <div className="label-wrapper">
              <span
                className="info-icon"
                data-tooltip="Enable resistance feedback"
              >
                ℹ
              </span>
              <label>Enable Resistance</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.enableResistance}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  enableResistance: !prev.enableResistance
                }))
              }
            />
          </div>
        </div>
        <button onClick={() => void startSimulation()} className="start-button">
          Start Simulation
        </button>
      </div>
    </div>
  )
}
