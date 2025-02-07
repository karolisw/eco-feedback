import { Rudder } from '../components/Rudder'
import { Emissions } from '../components/Emissions'
import { Thruster } from '../components/Thruster'
import { UseWebSocket } from '../hooks/useWebSocket'

type DashboardData = {
  currentThrust: number
  currentAngle: number
  consumption: number
  currentEmissions: number
  ecoScore: number
}

export function Dashboard() {
  const targetEmissions = 30 //TODO unsure if targetEmissions should originate from the server
  const initialData: DashboardData = {
    currentThrust: 20,
    currentAngle: 80, // Between -90 and 90
    consumption: 0,
    currentEmissions: 20,
    ecoScore: 100
  }

  const data = UseWebSocket('ws://127.0.0.1:8000/ws', initialData)

  console.log(data)
  return (
    <div>
      <div>
        <h1>Ship Dashboard</h1>
        <Thruster
          thrust={data.currentThrust}
          setPoint={10}
          touching={true}
          atThrustSetpoint={false}
          atAngleSetpoint={false}
        />
        <Rudder angle={data.currentAngle} />
        <Emissions
          currentEmissions={data.currentEmissions}
          targetEmissions={targetEmissions}
        />
      </div>
    </div>
  )
}
