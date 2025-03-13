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
    position_pri: 0,
    angle_pri: 0,
    position_sec: 0,
    angle_sec: 0,
    pos_setpoint_pri: 0,
    pos_setpoint_sec: 0
  }

  const data = UseWebSocket('ws://127.0.0.1:8000/ws', initialData)

  return (
    <div className="mini-dashboard">
      <Tabs>
        <TabPanel>
          <MemoizedAzimuthThruster
            thrust={data.data.position_pri}
            angle={data.data.angle_pri}
            angleSetpoint={0}
            thrustSetPoint={0}
            onSetPointChange={() => {}} // Dummy function
            touching={true}
            atThrustSetpoint={false}
            atAngleSetpoint={false}
          />
        </TabPanel>
        <TabPanel>
          <MemoizedRudder angle={data.data.angle_pri} />
        </TabPanel>
        <TabPanel>
          <MemoizedThruster thrust={data.data.position_pri} />
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
