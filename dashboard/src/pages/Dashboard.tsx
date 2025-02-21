import { AzimuthThruster } from '../components/AzimuthThruster'
import { Compass } from '../components/Compass'
import { InstrumentField } from '../components/InstrumentField'
import { UseWebSocket } from '../hooks/useWebSocket'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { memo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'
import '../styles/instruments.css'
import { DashboardData, SimulatorData } from '../types/DashboardData'
import {
  toHeading,
  gramsToKiloGrams,
  calculateAverage
} from '../utils/Convertion'

export function Dashboard() {
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false)
  const [speedData, setSpeedData] = useState<number[]>([])
  const [rpmData, setRpmData] = useState<number[]>([])
  const navigate = useNavigate()

  const initialData: DashboardData = {
    currentThrust: 20,
    currentAngle: 80 // Between -90 and 90
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
  const { sendMessage: sendToBackend, data } = UseWebSocket(
    'ws://127.0.0.1:8000/ws',
    initialData
  )

  // Store WebSocket data globally
  useEffect(() => {
    window.azimuthControllerData = data // Global variable for simulator
  }, [data])

  // Store speed and RPM when data arrives
  useEffect(() => {
    if (simulatorData) {
      setSpeedData((prev) => [...prev, simulatorData.speed])
      setRpmData((prev) => [...prev, simulatorData.rpm])
    }
  }, [simulatorData])

  /*
  const startSimulation = () => {
    sendToSimulator(JSON.stringify({ command: 'start_simulation' }))

    console.log('Start simulation command sent')
    setSimulationRunning(true)

    // Reload the iframe when simulation starts
    const iframe = document.querySelector(
      '.simulator-panel iframe'
    ) as HTMLIFrameElement
    if (iframe) {
      setTimeout(() => {
        // eslint-disable-next-line no-self-assign
        iframe.src = iframe.src
      }, 1000) // Wait 1 second to allow the server to start
    }
  }
  */
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
              value={data.currentThrust}
              tag="Power"
              unit="%"
              source="Azimuth"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={data.currentAngle}
              degree={true}
              tag="Angle"
              unit="°"
              source="Azimuth"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={simulatorData.rpm}
              tag="RPM"
              source="Simulator"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={simulatorData.speed}
              tag="Speed"
              unit="kn"
              source="Simulator"
              hasSource={true}
            />
          </div>
          <div className="instrument-panel-row">
            <MemoizedAzimuthThruster
              thrust={data.currentThrust}
              angle={data.currentAngle}
              setPoint={10}
              touching={true}
              atThrustSetpoint={false}
              atAngleSetpoint={false}
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
              maxDigits={3}
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
              maxDigits={3}
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
              tag="Cons"
              unit="kg/h"
              source="Simulator"
              hasSource={true}
              maxDigits={4}
              fractionDigits={1}
            ></InstrumentField>
            <InstrumentField
              value={gramsToKiloGrams(simulatorData.consumedTotal)}
              tag="ConsT"
              unit="kg"
              source="Simulator"
              hasSource={true}
              maxDigits={6}
              fractionDigits={2}
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
