import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AdviceType } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { Compass } from '../components/Compass'
import { InstrumentField } from '../components/InstrumentField'
import { UseWebSocket } from '../hooks/useWebSocket'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { memo, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/dashboard.css'
import '../styles/instruments.css'
import { DashboardData, SimulatorData } from '../types/DashboardData'
import {
  toHeading,
  gramsToKiloGrams,
  calculateAverage,
  newtonsToKiloNewtons
} from '../utils/Convertion'
import { useSimulation } from '../hooks/useSimulation'

type LocationState = {
  angleAdvices?: AngleAdvice[]
  thrustAdvices?: LinearAdvice[]
}

export function Dashboard() {
  const { simulationRunning, setSimulationRunning } = useSimulation() // Retrieving simulation running state from context
  const [thrustSetpoint, setThrustSetpoint] = useState<number>(0)
  const [angleSetpoint, setAngleSetpoint] = useState<number>(0)
  const [speedData, setSpeedData] = useState<number[]>([])
  const [rpmData, setRpmData] = useState<number[]>([])
  const navigate = useNavigate()

  // Keep track of last sent command
  const lastSentCommand = useRef<{ position: number; angle: number } | null>(
    null
  )

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

  // Fetch advices from location state (set in startup page) or use default values
  const angleAdvices: AngleAdvice[] =
    state?.angleAdvices ??
    ([
      { minAngle: 20, maxAngle: 50, type: 'advice', hinted: true },
      { minAngle: 75, maxAngle: 100, type: 'caution', hinted: true }
    ] as AngleAdvice[])

  const thrustAdvices: LinearAdvice[] =
    state?.thrustAdvices ??
    ([
      { min: 20, max: 50, type: 'advice', hinted: true },
      { min: 60, max: 100, type: 'caution', hinted: true }
    ] as LinearAdvice[])

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
        console.log('Skipping invalid command, data is NaN or undefined.')
        return
      }

      // Only send if data changed
      if (
        !lastSentCommand.current ||
        lastSentCommand.current.position !== newCommand.position ||
        lastSentCommand.current.angle !== newCommand.angle
      ) {
        console.log('Sending new navigate command:', newCommand)
        sendToSimulator(JSON.stringify(newCommand))
        lastSentCommand.current = newCommand // Update last sent command
      } else {
        console.log('Skipping redundant command, data unchanged.')
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

  useEffect(() => {
    if (!azimuthData) return

    const currentThrust = azimuthData.position_pri
    const currentAngle = azimuthData.angle_pri

    const vibrationStrength = getVibrationStrength(currentThrust, currentAngle)

    if (vibrationStrength > 0) {
      console.log(`🚨 Sending vibration command: Strength ${vibrationStrength}`)

      // Send vibration command to backend
      sendToBackend(
        JSON.stringify({
          command: 'set_vibration',
          strength: vibrationStrength
        })
      )

      // Stop vibration after 2 seconds for "approaching" and "entering" cases
      if (vibrationStrength < 3) {
        setTimeout(() => {
          sendToBackend(
            JSON.stringify({
              command: 'set_vibration',
              strength: 0
            })
          )
        }, 2000)
      }
    }
  }, [azimuthData, sendToBackend])

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

    console.log(`Avg Speed: ${avgSpeed}, Avg RPM: ${avgRpm}`)

    // Send data to backend for storage
    sendToBackend(
      JSON.stringify({
        command: 'stop_simulation',
        avg_speed: avgSpeed,
        avg_rpm: avgRpm,
        total_consumption: totalConsumption,
        run_time: runTime,
        configuration_number: configurationNumber
      })
    )

    // Clear local storage for next run
    setSpeedData([])
    setRpmData([])

    // Redirect back to startup page
    void navigate('/')
  }

  const handleSetPointChange = (type: 'thrust' | 'angle', value: number) => {
    console.log(`🛠 Attempting to set ${type} to`, value) // ✅ Debugging log

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

  const getVibrationStrength = (thrust: number, angle: number): number => {
    let strength = 0

    // Check thrust alert zones
    for (const advice of thrustAdvices) {
      if (thrust >= advice.min && thrust <= advice.max) {
        strength = advice.type === AdviceType.caution ? 2 : 1 // Caution → Medium, Advice → Light
      }
    }

    // Check angle alert zones
    for (const advice of angleAdvices) {
      if (angle >= advice.minAngle && angle <= advice.maxAngle) {
        strength = Math.max(
          strength,
          advice.type === AdviceType.caution ? 3 : 2
        ) // Caution → Strong, Advice → Medium
      }
    }

    return strength
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
          <button
            onClick={stopSimulation}
            className="button"
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
              onSetPointChange={handleSetPointChange}
            />
          </div>
        </div>
        <hr className="solid"></hr>
        <h3>Navigation</h3>
        <div className="instrument-panel-col">
          <div className="instrument-panel-row">
            <InstrumentField
              setPoint={0}
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
