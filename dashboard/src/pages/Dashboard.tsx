import { Rudder } from '../components/Rudder'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { Thruster } from '../components/Thruster'
import { UseWebSocket } from '../hooks/useWebSocket'
import { memo } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import 'react-tabs/style/react-tabs.css'
import '../styles/dashboard.css'

type DashboardData = {
  currentThrust: number
  currentAngle: number
  consumption: number
  currentEmissions: number
  ecoScore: number
}

export function Dashboard() {
  //const targetEmissions = 30 //TODO unsure if targetEmissions should originate from the server
  const initialData: DashboardData = {
    currentThrust: 20,
    currentAngle: 80, // Between -90 and 90
    consumption: 0,
    currentEmissions: 20,
    ecoScore: 100
  }

  const data = UseWebSocket('ws://127.0.0.1:8000/ws', initialData)

  //console.log(data)
  return (
    <div className="dashboard">
      <Tabs>
        <TabPanel>
          <MemoizedAzimuthThruster
            thrust={data.data.currentThrust}
            angle={data.data.currentAngle}
            setPoint={10}
            touching={true}
            atThrustSetpoint={false}
            atAngleSetpoint={false}
          />
        </TabPanel>
        <TabPanel>
          <MemoizedRudder angle={data.data.currentAngle} />
        </TabPanel>
        <TabPanel>
          <MemoizedThruster thrust={data.data.currentThrust} />
        </TabPanel>
        <TabList>
          <Tab>Azimuth</Tab>
          <Tab>Rudder</Tab>
          <Tab>Thruster</Tab>
        </TabList>
      </Tabs>
    </div>
  )
}

// Memoized Components to prevent unnecessary re-renders
const MemoizedAzimuthThruster = memo(AzimuthThruster)
const MemoizedThruster = memo(Thruster)
const MemoizedRudder = memo(Rudder)
