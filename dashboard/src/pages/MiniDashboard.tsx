import { Rudder } from '../components/Rudder'
import { AzimuthThruster } from '../components/AzimuthThruster'
import { Thruster } from '../components/Thruster'
import { UseWebSocket } from '../hooks/useWebSocket'
import { memo } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import 'react-tabs/style/react-tabs.css'
import '../styles/dashboard.css'
import { DashboardData } from '../types/DashboardData'

export function MiniDashboard() {
  const initialData: DashboardData = {
    currentThrust: 20,
    currentAngle: 80, // Between -90 and 90
    consumption: 0,
    currentEmissions: 20,
  }

  const data = UseWebSocket('ws://127.0.0.1:8000/ws', initialData)

  return (
    <div className="mini-dashboard">
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
