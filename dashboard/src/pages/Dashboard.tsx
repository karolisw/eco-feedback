import { AzimuthThruster } from '../components/AzimuthThruster'
import { Compass } from '../components/Compass'
import { InstrumentField } from '../components/InstrumentField'
import { UseWebSocket } from '../hooks/useWebSocket'
import { UseSimulatorWebSocket } from '../hooks/useSimulatorWebSocket'
import { memo, useEffect } from 'react'
import '../styles/dashboard.css'
import '../styles/instruments.css'
import { DashboardData, SimulatorData } from '../types/DashboardData'
import { toHeading, gramsToKiloGrams } from '../utils/Convertion'

export function Dashboard() {
  const initialData: DashboardData = {
    currentThrust: 20,
    currentAngle: 80, // Between -90 and 90
    consumption: 0,
    currentEmissions: 20
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

  const data = UseWebSocket('ws://127.0.0.1:8000/ws', initialData)
  const simulatorData = UseSimulatorWebSocket(
    'ws://127.0.0.1:8003',
    initialSimData
  )
  // Store WebSocket data globally
  useEffect(() => {
    window.azimuthControllerData = data.data // Global variable for simulator
  }, [data])

  return (
    <div className="dashboard">
      {/* Simulator Panel */}
      <div className="simulator-panel">
        <iframe src="http://127.0.0.1:8002/index.html" />
      </div>
      <div className="ui-panel">
        <h3>Propulsion</h3>
        <div className="intrument-panel-col">
          <div className="instrument-panel-row">
            <InstrumentField
              value={data.data.currentThrust}
              tag="Power"
              unit="%"
              source="Azimuth"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={data.data.currentAngle}
              degree={true}
              tag="Angle"
              unit="°"
              source="Azimuth"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={simulatorData.data.rpm}
              tag="RPM"
              source="Simulator"
              hasSource={true}
            ></InstrumentField>
            <InstrumentField
              value={simulatorData.data.speed}
              tag="Speed"
              unit="kn"
              source="Simulator"
              hasSource={true}
            />
          </div>
          <div className="instrument-panel-row">
            <MemoizedAzimuthThruster
              thrust={data.data.currentThrust}
              angle={data.data.currentAngle}
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
              value={toHeading(simulatorData.data.heading)}
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
              value={simulatorData.data.xPos}
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
              value={simulatorData.data.yPos}
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
              heading={simulatorData.data.heading}
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
              value={simulatorData.data.consumptionRate}
              tag="Cons"
              unit="kg/h"
              source="Simulator"
              hasSource={true}
              maxDigits={4}
              fractionDigits={1}
            ></InstrumentField>
            <InstrumentField
              value={gramsToKiloGrams(simulatorData.data.consumedTotal)}
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
          <p>Remaining: {simulatorData.data.checkpoints} out of 3</p>
        </div>
      </div>
    </div>
  )
}

// Memoized Component to prevent unnecessary re-renders
const MemoizedAzimuthThruster = memo(AzimuthThruster)
const MemoizedCompass = memo(Compass)
