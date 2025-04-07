import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { InstrumentField } from '../components/InstrumentField'
import { ScenarioLogger } from '../components/ScenarioLogger'
import { UseWebSocket } from '../hooks/useWebSocket'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { memo, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/dashboard.css'
import '../styles/instruments.css'
import { DashboardData, SimulatorData } from '../types/DashboardData'
import { AlertConfig } from '../types/AlertConfig'
import { BoundaryConfig } from '../types/BoundaryConfig'
import { ScenarioControlPanel } from '../components/controlPanel/ScenarioControlPanel'

import {
  gramsToKiloGrams,
  calculateAverage,
  newtonsToKiloNewtons,
  negativeAngleToRealAngle
} from '../utils/Convertion'
import { useSimulation } from '../hooks/useSimulation'
import { useFrictionFeedback } from '../hooks/useFrictionFeedback'
import { useVibrationFeedback } from '../hooks/useVibrationFeedback'
import { useDetentFeedback } from '../hooks/useDetentFeedback'
import { useAlertDetection } from '../hooks/useAlertDetection'
import { useOperatorResponse } from '../hooks/useOperatorResponse'
import { useBoundaryFeedback } from '../hooks/useBoundaryFeedback'
import { ScenarioKey } from '../constants/scenarioOptions'
import { scenarioAdviceMap } from '../utils/ScenarioMap'
import { LogEntry } from '../types/LogEntry'
import Papa from 'papaparse'
import saveAs from 'file-saver'

type LocationState = {
  angleAdvices?: AngleAdvice[]
  thrustAdvices?: LinearAdvice[]
  alertConfig?: AlertConfig
  selectedConfig: string
}

export function Dashboard() {
  const { simulationRunning, setSimulationRunning } = useSimulation() // Retrieving simulation running state from context
  const [thrustSetpoint] = useState<number>(0)
  const [angleSetpoint] = useState<number>(0)
  const [speedData, setSpeedData] = useState<number[]>([])
  const [rpmData, setRpmData] = useState<number[]>([])
  const [alertTime, setAlertTime] = useState<number | null>(null)
  const [, setAlertType] = useState<'advice' | 'caution' | null>(null)
  const [showAzimuth, setShowAzimuth] = useState(true)
  const [boundaryConfig, setBoundaryConfig] = useState<BoundaryConfig[]>([])
  const [isLogging, setIsLogging] = useState(false)
  const [logData, setLogData] = useState<LogEntry[]>([])
  const scenarioId = useRef<string | null>(null)
  const scenarioCount = useRef<number>(1)

  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioKey>('maintain-speed')
  const [angleAdvices, setAngleAdvices] = useState<AngleAdvice[]>(
    scenarioAdviceMap['maintain-speed'].angleAdvices
  )
  const [thrustAdvices, setThrustAdvices] = useState<LinearAdvice[]>(
    scenarioAdviceMap['maintain-speed'].thrustAdvices
  )

  const navigate = useNavigate()

  // Keep track of last sent command
  const lastSentCommand = useRef<{ thrust: number; angle: number } | null>(null)

  const initialData: DashboardData = {
    position_pri: 0,
    position_sec: 0,
    pos_setpoint_pri: 0,
    pos_setpoint_sec: 0
  }

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
    thrust: 0, // Power of azimuth thruster
    angle: 0 // Angle of azimuth thruster
  }

  const { sendMessage: sendToSimulator, data: simulatorData } =
    UseSimulatorWebSocket('ws://127.0.0.1:8003', initialSimData)

  const { sendMessage: sendToBackend, data: azimuthData } = UseWebSocket(
    'ws://127.0.0.1:8000/ws',
    initialData
  )

  // Memoized Component to prevent unnecessary re-renders
  const MemoizedAzimuthThruster = memo(AzimuthThruster)
  const thrust = useMemo(
    () => azimuthData.position_pri,
    [azimuthData.position_pri]
  )
  const angle = useMemo(
    () => azimuthData.position_sec,
    [azimuthData.position_sec]
  )

  // Alert zones
  const location = useLocation()
  const state = location.state as LocationState | null // Type casting for safety

  const configFileName = state?.selectedConfig ?? 'unknown'

  const alertConfig: AlertConfig = useMemo(
    () =>
      state?.alertConfig ||
      ({
        vibrationEnter: 2,
        enableVibration: false,
        enableDetents: false,
        enableBoundaries: false,
        adviceHighResistance: true,
        regularHighResistance: true
      } as AlertConfig),
    [state?.alertConfig]
  )

  const previousScenario = useRef<ScenarioKey | null>(null)

  useEffect(() => {
    if (previousScenario.current === selectedScenario) return

    previousScenario.current = selectedScenario

    console.log(`[Scenario] Switched to ${selectedScenario}, clearing haptics`)
    sendToBackend({ command: 'clear_haptics' })

    const config = scenarioAdviceMap[selectedScenario]
    setAngleAdvices(config.angleAdvices)
    setThrustAdvices(config.thrustAdvices)
    if (config.boundaries) {
      setBoundaryConfig(config.boundaries)
    }
  }, [selectedScenario, sendToBackend])

  useEffect(() => {
    if (azimuthData) {
      // Prepare new command
      const newCommand = {
        command: 'navigate',
        thrust: azimuthData.position_pri,
        angle: azimuthData.position_sec
      }
      // Skip if either of the newCommand values are NaN or undefined
      if (
        isNaN(newCommand.thrust) ||
        isNaN(newCommand.angle) ||
        newCommand.thrust === undefined ||
        newCommand.angle === undefined
      ) {
        return
      }

      // Only send if data changed
      if (
        !lastSentCommand.current ||
        lastSentCommand.current.thrust !== newCommand.thrust ||
        lastSentCommand.current.angle !== newCommand.angle
      ) {
        sendToSimulator(JSON.stringify(newCommand))
        lastSentCommand.current = newCommand // Update last sent command
      } else {
        return
      }
    }
  }, [azimuthData, sendToSimulator])

  useAlertDetection({
    angle,
    thrust,
    angleAdvices,
    thrustAdvices,
    simulationRunning,
    onAlertDetected: (type, timestamp) => {
      setAlertType(type)
      setAlertTime(timestamp)
    }
  })

  // **2. Detect operator response (T2)**
  useOperatorResponse({
    simulationRunning,
    alertTime,
    thrust,
    angle,
    thrustSetpoint,
    angleSetpoint,
    onResponse: () => {
      setAlertTime(null)
    }
  })

  // Hook determines vibration strength based on alertConfig
  useVibrationFeedback({
    thrust,
    angle,
    angleAdvices,
    thrustAdvices,
    alertConfig,
    sendToBackend
  })

  // Use custom hook to handle friction feedback
  useFrictionFeedback({
    thrust,
    angle,
    angleAdvices,
    thrustAdvices,
    sendToBackend,
    alertConfig
  })

  // Use custom hook to handle detent feedback
  useDetentFeedback({
    thrust,
    angle,
    angleAdvices,
    thrustAdvices,
    alertConfig,
    sendToBackend,
    scenarioKey: selectedScenario,
    angleDetentStrength:
      scenarioAdviceMap[selectedScenario].angleDetentStrength,
    thrustDetentStrength:
      scenarioAdviceMap[selectedScenario].thrustDetentStrength
  })

  useBoundaryFeedback({
    enabled: alertConfig.enableBoundaries,
    config: boundaryConfig,
    sendToBackend
  })

  const stopSimulation = () => {
    // Send stop signal to simulator (8003)
    sendToSimulator(JSON.stringify({ command: 'stop_simulation' }))

    // Set simulation as stopped
    setSimulationRunning(false)

    // Calculate Averages
    const avgSpeed = calculateAverage(speedData)
    const avgRpm = calculateAverage(rpmData)

    // Assume emissions and runtime are stored or calculated in frontend
    const totalConsumption = simulatorData.consumedTotal
    const runTime = 100 //TODO this can be calculated from the start and stop time of the simulation
    const configurationNumber = 1 // TODO Hardcoded for now, this will be selected from dropdown (issue 34)

    // Send data to backend for storage
    sendToBackend({
      command: 'stop_simulation',
      avg_speed: avgSpeed,
      avg_rpm: avgRpm,
      total_consumption: totalConsumption,
      run_time: runTime,
      configuration_number: configurationNumber
    })

    // Clear local storage for next run
    setSpeedData([])
    setRpmData([])

    // Redirect back to startup page
    void navigate('/')
  }

  const handleScenarioChange = (newScenario: ScenarioKey) => {
    if (newScenario !== selectedScenario) {
      // If logging is active, stop it and save current data
      if (isLogging) {
        stopLogging() // you can expand this to also export/save if needed
      }

      setSelectedScenario(newScenario)

      // Start new logging session if simulation is running
      if (simulationRunning) {
        scenarioId.current = new Date().toISOString()
        setLogData([])
        setIsLogging(true)
        console.log(`Started logging for scenario ${newScenario}`)
      } else {
        console.warn(
          'Scenario changed but simulation is not running. Logging not started.'
        )
      }
    }
  }

  /*
  const startLogging = () => {
    if (!simulationRunning) {
      console.warn('Cannot start logging when simulation is not running.')
      return
    }
    scenarioId.current = new Date().toISOString()
    setLogData([])
    setIsLogging(true)
    console.log(`Started logging scenario ${scenarioCount.current}`)
  }
    */

  const stopLogging = () => {
    if (logData.length > 0 && scenarioId.current) {
      const csv = Papa.unparse(logData)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `${scenarioId.current}-${configFileName}`)
      scenarioCount.current += 1
    }
    setIsLogging(false)
  }

  const toggleScenario = () => {
    if (isLogging) stopLogging()
    else handleScenarioChange(selectedScenario)
  }

  return (
    <div>
      <ScenarioControlPanel
        selectedScenario={selectedScenario}
        onScenarioChange={handleScenarioChange}
        showAzimuth={showAzimuth}
        toggleAzimuth={() => setShowAzimuth((prev) => !prev)}
        onStopSimulation={stopSimulation}
        simulationRunning={simulationRunning}
        onToggleScenario={toggleScenario}
        isLogging={isLogging}
      />

      <div className="dashboard">
        {/* Logical-only logger (no UI) */}
        <ScenarioLogger
          simulatorData={{ thrust, angle }}
          simulationRunning={simulationRunning}
          thrustAdvices={thrustAdvices}
          angleAdvices={angleAdvices}
          configFileName={configFileName}
          logData={logData}
          setLogData={setLogData}
          isLogging={isLogging}
          selectedScenario={selectedScenario}
          boundaryConfig={boundaryConfig}
        />

        {/* Simulator Panel */}
        {simulationRunning && (
          <div className="simulator-panel">
            <iframe src="http://127.0.0.1:8002/index.html" />
          </div>
        )}
        <div className="ui-panel">
          <div style={{ margin: '10px 10px' }}>
            <h3>Propulsion</h3>
            <div className="intrument-panel-col">
              <div className="instrument-panel-row">
                <InstrumentField
                  value={azimuthData.position_pri}
                  tag="Power"
                  unit="%"
                  source="Azimuth"
                  fractionDigits={1}
                  maxDigits={4}
                  hasSource={true}
                ></InstrumentField>
                <InstrumentField
                  value={negativeAngleToRealAngle(azimuthData.position_sec)}
                  degree={true}
                  tag="Angle"
                  unit="°"
                  source="Azimuth"
                  fractionDigits={1}
                  maxDigits={4}
                  hasSource={true}
                ></InstrumentField>
                <InstrumentField
                  value={simulatorData.rpm}
                  tag="RPM"
                  maxDigits={4}
                  source="Simulator"
                  hasSource={true}
                ></InstrumentField>
                <InstrumentField
                  value={simulatorData.speed}
                  tag="Speed"
                  unit="kn"
                  source="Simulator"
                  fractionDigits={1}
                  hasSource={true}
                />
              </div>
              <div className="instrument-panel-row"></div>
              {showAzimuth && (
                <MemoizedAzimuthThruster
                  thrust={thrust}
                  angle={negativeAngleToRealAngle(angle)}
                  thrustSetPoint={thrustSetpoint}
                  angleSetpoint={angleSetpoint}
                  touching={true}
                  atThrustSetpoint={false}
                  atAngleSetpoint={false}
                  angleAdvices={angleAdvices}
                  thrustAdvices={thrustAdvices}
                />
              )}
            </div>
          </div>
          <hr className="solid"></hr>
          {/* Others */}
          <div className="info-card">
            <h3>Eco Parameters</h3>
            <div className="instrument-panel-row">
              <InstrumentField
                value={simulatorData.consumptionRate}
                tag="FuelR"
                unit="kg/h"
                source="Simulator"
                hasSource={true}
                maxDigits={4}
                fractionDigits={1}
              ></InstrumentField>
              <InstrumentField
                value={gramsToKiloGrams(simulatorData.consumedTotal)}
                tag="FuelT"
                unit="kg"
                source="Simulator"
                hasSource={true}
                maxDigits={4}
                fractionDigits={2}
              ></InstrumentField>
              <InstrumentField
                value={newtonsToKiloNewtons(simulatorData.resistance)}
                tag="Res"
                unit="KN"
                source="Simulator"
                hasSource={true}
                maxDigits={4}
                fractionDigits={1}
              ></InstrumentField>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
