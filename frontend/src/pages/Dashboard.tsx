import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AdviceType } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { Compass } from '../components/Compass'
import { InstrumentField } from '../components/InstrumentField'
import { ScenarioLogger } from '../components/ScenarioLogger'
import { UseWebSocket } from '../hooks/useWebSocket'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/dashboard.css'
import '../styles/instruments.css'
import { DashboardData, SimulatorData } from '../types/DashboardData'
import { AlertConfig } from '../types/AlertConfig'
import {
  toHeading,
  gramsToKiloGrams,
  calculateAverage,
  newtonsToKiloNewtons
} from '../utils/Convertion'
import { useSimulation } from '../hooks/useSimulation'
import { SetpointSliders } from '../components/SetpointSliders'

type LocationState = {
  angleAdvices?: AngleAdvice[]
  thrustAdvices?: LinearAdvice[]
  alertConfig?: AlertConfig //TODO could write this into a csv by passing it to ScenarioLogger if necessary
  selectedConfig: string
}

export function Dashboard() {
  const { simulationRunning, setSimulationRunning } = useSimulation() // Retrieving simulation running state from context
  const [thrustSetpoint, setThrustSetpoint] = useState<number>(0)
  const [angleSetpoint, setAngleSetpoint] = useState<number>(0)
  const [speedData, setSpeedData] = useState<number[]>([])
  const [rpmData, setRpmData] = useState<number[]>([])
  //const [alertTriggered, setAlertTriggered] = useState<boolean>(false) // For logging purposes
  const [alertTime, setAlertTime] = useState<number | null>(null)
  const [, setAlertType] = useState<'advice' | 'caution' | null>(null)
  const navigate = useNavigate()

  // Keep track of last sent command
  const lastSentCommand = useRef<{ position: number; angle: number } | null>(
    null
  )

  const alertTriggeredRef = useRef<boolean>(false)

  const initialData: DashboardData = {
    position_pri: 0,
    position_sec: 0,
    angle_pri: 0,
    angle_sec: 0,
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
    power: 0, // Power of azimuth thruster
    angle: 0 // Angle of azimuth thruster
  }

  const { sendMessage: sendToSimulator, data: simulatorData } =
    UseSimulatorWebSocket('ws://127.0.0.1:8003', initialSimData)

  const { sendMessage: sendToBackend, data: azimuthData } = UseWebSocket(
    'ws://127.0.0.1:8000/ws',
    initialData
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
        vibrationApproach: 1,
        vibrationEnter: 2,
        vibrationRemain: 3,
        resistanceApproach: 0,
        resistanceEnter: 1,
        resistanceRemain: 2,
        detents: false,
        feedbackDuration: 4000,
        enableVibration: true,
        enableResistance: false,
        enableDetents: false
      } as AlertConfig),
    [state?.alertConfig]
  )

  useEffect(() => {
    if (azimuthData) {
      // Prepare new command
      const newCommand = {
        command: 'navigate',
        position: azimuthData.position_pri,
        angle: azimuthData.angle_pri
      }
      // Skip if either of the newCommand values are NaN or undefined
      if (
        isNaN(newCommand.position) ||
        isNaN(newCommand.angle) ||
        newCommand.position === undefined ||
        newCommand.angle === undefined
      ) {
        return
      }

      // Only send if data changed
      if (
        !lastSentCommand.current ||
        lastSentCommand.current.position !== newCommand.position ||
        lastSentCommand.current.angle !== newCommand.angle
      ) {
        sendToSimulator(JSON.stringify(newCommand))
        lastSentCommand.current = newCommand // Update last sent command
      } else {
        return
      }
    }
  }, [azimuthData, sendToSimulator])

  // Store speed and RPM when data arrives
  useEffect(() => {
    if (simulatorData) {
      setSpeedData((prev) => [...prev, simulatorData.speed])
      setRpmData((prev) => [...prev, simulatorData.rpm])
    }
  }, [simulatorData])

  // Function to determine vibration strength based on alertConfig
  const getVibrationStrength = useCallback(() => {
    let strength = 0
    const thrust = azimuthData.position_pri
    const angle = azimuthData.angle_pri

    // Check thrust alert zones
    for (const advice of thrustAdvices) {
      if (thrust >= advice.min && thrust <= advice.max) {
        strength =
          advice.type === AdviceType.caution
            ? alertConfig.vibrationEnter
            : alertConfig.vibrationApproach
      }
    }

    // Check angle alert zones
    for (const advice of angleAdvices) {
      if (angle >= advice.minAngle && angle <= advice.maxAngle) {
        strength = Math.max(
          strength,
          advice.type === AdviceType.caution
            ? alertConfig.vibrationRemain
            : alertConfig.vibrationEnter
        )
      }
    }

    return strength
  }, [
    angleAdvices,
    azimuthData.angle_pri,
    azimuthData.position_pri,
    thrustAdvices,
    alertConfig
  ])

  useEffect(() => {
    if (!azimuthData) return

    const vibrationStrength = getVibrationStrength()

    if (vibrationStrength > 0 && alertConfig.enableVibration) {
      // Send vibration command to backend
      sendToBackend({
        command: 'set_vibration',
        strength: vibrationStrength
      })

      // Stop vibration after "feedbackDuration" seconds for "approaching" and "entering" cases
      if (vibrationStrength < alertConfig.vibrationRemain) {
        // TODO this depends on the meaning of "vibrationRemain"
        setTimeout(() => {
          sendToBackend({
            command: 'set_vibration',
            strength: 0
          })
        }, alertConfig.feedbackDuration)
      }
    }
  }, [
    azimuthData,
    sendToBackend,
    getVibrationStrength,
    alertConfig.enableVibration,
    alertConfig.vibrationRemain,
    alertConfig.feedbackDuration
  ])

  // **1. Detect when an alert is triggered (T1) and what type it is**
  useEffect(() => {
    if (!simulationRunning || !azimuthData) return

    let alertNow = false
    let detectedType: 'advice' | 'caution' | null = null

    for (const advice of thrustAdvices) {
      if (
        azimuthData.position_pri >= advice.min &&
        azimuthData.position_pri <= advice.max
      ) {
        alertNow = true
        detectedType = advice.type
      }
    }

    for (const advice of angleAdvices) {
      if (
        azimuthData.angle_pri >= advice.minAngle &&
        azimuthData.angle_pri <= advice.maxAngle
      ) {
        alertNow = true
        detectedType = advice.type
      }
    }

    if (alertNow && !alertTriggeredRef.current) {
      alertTriggeredRef.current = true
      setAlertTime(Date.now()) // Set T1
      setAlertType(detectedType) // Store type of alert
    }
  }, [azimuthData, thrustAdvices, angleAdvices, simulationRunning])

  // **2. Detect operator response (T2)**
  useEffect(() => {
    if (!alertTriggeredRef.current || !simulationRunning || alertTime === null)
      return

    if (
      azimuthData.position_pri !== thrustSetpoint ||
      azimuthData.angle_pri !== angleSetpoint
    ) {
      alertTriggeredRef.current = false // Reset alert
      setAlertTime(null) // Reset T1
    }
  }, [
    azimuthData.position_pri,
    azimuthData.angle_pri,
    simulationRunning,
    alertTime,
    thrustSetpoint,
    angleSetpoint
  ])

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
    // Update state immediately
    if (type === 'thrust') {
      setThrustSetpoint(value)
    } else {
      setAngleSetpoint(value)
    }

    // Send a command to the backend
    sendToBackend({
      command: 'set_setpoint',
      thrust_setpoint: 70,
      angle_setpoint: -30
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
              position_pri: azimuthData.position_pri,
              angle_pri: azimuthData.angle_pri
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
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={azimuthData.angle_pri}
              degree={true}
              tag="Angle"
              unit="°"
              source="Azimuth"
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
              thrust={azimuthData.position_pri}
              angle={azimuthData.angle_pri}
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

// Memoized Component to prevent unnecessary re-renders
const MemoizedAzimuthThruster = memo(AzimuthThruster)
const MemoizedCompass = memo(Compass)
