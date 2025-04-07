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
    vibrationEnter: 1,
    enableVibration: true,
    enableDetents: true,
    adviceHighResistance: true,
    regularHighResistance: false,
    vibrationStrengthThruster: 1,
    vibrationStrengthAngle: 1,
    enableBoundaries: true
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
    thrust: 0,
    angle: 0
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
              key: 'vibrationEnter',
              label: 'Vibration (Entering)',
              tooltip: 'Vibration strength when entering alert zone'
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

          {alertConfig.enableVibration && (
            <>
              <div className="label-container">
                <div className="label-wrapper">
                  <span
                    className="info-icon"
                    data-tooltip="Set vibration strength for thruster caution zones"
                  >
                    ℹ
                  </span>
                  <label>Thruster Caution Vibration Strength</label>
                </div>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={alertConfig.vibrationStrengthThruster ?? 1}
                  onChange={(e) =>
                    setAlertConfig((prev) => ({
                      ...prev,
                      vibrationStrengthThruster: Number(e.target.value)
                    }))
                  }
                />
              </div>

              <div className="label-container">
                <div className="label-wrapper">
                  <span
                    className="info-icon"
                    data-tooltip="Set vibration strength for angle caution zones"
                  >
                    ℹ
                  </span>
                  <label>Angle Caution Vibration Strength</label>
                </div>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={alertConfig.vibrationStrengthAngle ?? 1}
                  onChange={(e) =>
                    setAlertConfig((prev) => ({
                      ...prev,
                      vibrationStrengthAngle: Number(e.target.value)
                    }))
                  }
                />
              </div>
            </>
          )}
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
              <span className="info-icon" data-tooltip="Enable detent feedback">
                ℹ
              </span>
              <label>Enable Detents</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.enableDetents}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  enableDetents: !prev.enableDetents
                }))
              }
            />
          </div>
          <div className="label-container">
            <div className="label-wrapper">
              <span
                className="info-icon"
                data-tooltip="Enable physical haptic boundary walls in the controller"
              >
                ℹ
              </span>
              <label>Enable Boundaries</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.enableBoundaries}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  enableBoundaries: !prev.enableBoundaries
                }))
              }
            />
          </div>

          {/* Toggle for High Resistance Inside Advice Zones */}
          <div className="label-container">
            <div className="label-wrapper">
              <span
                className="info-icon"
                data-tooltip="Sets high resistance inside advice zones"
              >
                ℹ
              </span>
              <label>High Resistance Inside Advice Zones</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.adviceHighResistance}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  adviceHighResistance: !prev.adviceHighResistance
                }))
              }
            />
          </div>

          {/* Toggle for High Resistance Outside Advice Zones */}
          <div className="label-container">
            <div className="label-wrapper">
              <span
                className="info-icon"
                data-tooltip="Sets high resistance outside advice zones"
              >
                ℹ
              </span>
              <label>High Resistance Outside Advice Zones</label>
            </div>
            <input
              type="checkbox"
              checked={alertConfig.regularHighResistance}
              onChange={() =>
                setAlertConfig((prev) => ({
                  ...prev,
                  regularHighResistance: !prev.regularHighResistance
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
