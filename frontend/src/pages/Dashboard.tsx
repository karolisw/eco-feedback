import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { Compass } from '../components/Compass'
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
import {
  toHeading,
  gramsToKiloGrams,
  calculateAverage,
  newtonsToKiloNewtons,
  negativeAngleToRealAngle
} from '../utils/Convertion'
import { useSimulation } from '../hooks/useSimulation'
import { SetpointSliders } from '../components/SetpointSliders'
import { useFrictionFeedback } from '../hooks/useFrictionFeedback'
import { useVibrationFeedback } from '../hooks/useVibrationFeedback'
import { useDetentFeedback } from '../hooks/useDetentFeedback'
import { useAlertDetection } from '../hooks/useAlertDetection'
import { useOperatorResponse } from '../hooks/useOperatorResponse'

type LocationState = {
  angleAdvices?: AngleAdvice[]
  thrustAdvices?: LinearAdvice[]
  alertConfig?: AlertConfig
  selectedConfig: string
}

export function Dashboard() {
  const { simulationRunning, setSimulationRunning } = useSimulation() // Retrieving simulation running state from context
  const [thrustSetpoint, setThrustSetpoint] = useState<number>(0)
  const [angleSetpoint, setAngleSetpoint] = useState<number>(0)
  const [speedData, setSpeedData] = useState<number[]>([])
  const [rpmData, setRpmData] = useState<number[]>([])
  const [alertTime, setAlertTime] = useState<number | null>(null)
  const [, setAlertType] = useState<'advice' | 'caution' | null>(null)
  const navigate = useNavigate()

  // Keep track of last sent command
  const lastSentCommand = useRef<{ thrust: number; angle: number } | null>(null)

  //const alertTriggeredRef = useRef<boolean>(false)

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
  const MemoizedCompass = memo(Compass)
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

  // Fetch advices from location state (set in startup page) or use default values
  const angleAdvices: AngleAdvice[] = useMemo(
    () =>
      state?.angleAdvices ??
      ([
        { minAngle: 20, maxAngle: 50, type: 'advice', hinted: true },
        { minAngle: 75, maxAngle: 100, type: 'caution', hinted: true }
      ] as AngleAdvice[]),
    [state?.angleAdvices]
  )

  const thrustAdvices: LinearAdvice[] = useMemo(
    () =>
      state?.thrustAdvices ??
      ([
        { min: 20, max: 50, type: 'advice', hinted: true },
        { min: 60, max: 100, type: 'caution', hinted: true }
      ] as LinearAdvice[]),
    [state?.thrustAdvices]
  )

  const alertConfig: AlertConfig = useMemo(
    () =>
      state?.alertConfig ||
      ({
        vibrationEnter: 2,
        enableVibration: true,
        enableDetents: false,
        adviceHighResistance: true,
        regularHighResistance: true
      } as AlertConfig),
    [state?.alertConfig]
  )

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
        console.log('sending this to simulator: ', newCommand)
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
      // optionally reset alert type or add logging
      // alertTriggeredRef.current = false
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

  const handleSetPointChange = (type: 'thrust' | 'angle', value: number) => {
    console.log('handling set point change')
    // Update state immediately
    if (type === 'thrust') {
      setThrustSetpoint(value)
    } else {
      setAngleSetpoint(value)
    }

    // Send a command to the backend
    sendToBackend({
      command: 'set_setpoint',
      thrust_setpoint: type === 'thrust' ? value : thrustSetpoint,
      angle_setpoint: type === 'angle' ? value : angleSetpoint
    })
  }

  return (
    <div className="dashboard">
      {/* Simulator Panel */}
      {simulationRunning && (
        <div className="simulator-panel">
          <iframe src="http://127.0.0.1:8002/index.html" />
        </div>
      )}
      <div className="ui-panel">
        <div className="button-row">
          <ScenarioLogger
            simulatorData={{
              thrust: azimuthData.position_pri,
              angle: azimuthData.position_sec
            }}
            configFileName={configFileName}
            thrustAdvices={thrustAdvices}
            angleAdvices={angleAdvices}
            simulationRunning={simulationRunning}
          />
          <button
            onClick={stopSimulation}
            className="stop-button"
            disabled={!simulationRunning}
          >
            Stop Simulation
          </button>
        </div>
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
          <div className="instrument-panel-row">
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
          </div>
          <div className="instrument-panel-row">
            <SetpointSliders
              thrustSetpoint={thrustSetpoint}
              angleSetpoint={angleSetpoint}
              onSetPointChange={handleSetPointChange}
            />
          </div>
        </div>
        <hr className="solid"></hr>
        <h3>Navigation</h3>
        <div className="instrument-panel-col">
          <div className="instrument-panel-row">
            <InstrumentField
              setPoint={angleSetpoint}
              hasSetPoint={true}
              value={toHeading(simulatorData.heading)}
              degree={true}
              maxDigits={3}
              fractionDigits={0}
              tag="Heading"
              unit="°"
              source="Simulator"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              setPoint={0}
              hasSetPoint={true}
              value={simulatorData.xPos}
              degree={false}
              maxDigits={4}
              fractionDigits={1}
              tag="X"
              unit="m"
              source="Simulator"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              setPoint={0}
              hasSetPoint={true}
              value={simulatorData.yPos}
              degree={false}
              maxDigits={4}
              fractionDigits={1}
              tag="Y"
              unit="m"
              source="Simulator"
              hasSource={true}
            ></InstrumentField>
          </div>
          <div className="instrument-panel-row">
            <MemoizedCompass
              heading={simulatorData.heading}
              courseOverGround={90}
              headingAdvices={[]}
            />
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
        <hr className="solid"></hr>
        {/* Checkpoints */}
        <div className="info-card">
          <h3>Checkpoints</h3>
          <p>Remaining: {simulatorData.checkpoints} out of 3</p>
        </div>
      </div>
    </div>
  )
}
