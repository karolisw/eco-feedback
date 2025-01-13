import { useEffect, useState } from 'react'
//import { ObcTopBar } from '@oicl/openbridge-webcomponents-react/components/top-bar/top-bar'
//import { ObcAlertButton } from '@oicl/openbridge-webcomponents-react/components/alert-button/alert-button'
//import { ObcAlertTopbarElement } from '@oicl/openbridge-webcomponents-react/components/alert-topbar-element/alert-topbar-element'
import { ObcAzimuthThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster/azimuth-thruster'
type DashboardData = {
  speed: number
  direction: number
  consumption: number
  emissions: number
  eco_score: number
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    speed: 0,
    direction: 0,
    consumption: 0,
    emissions: 0,
    eco_score: 100,
  })

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws')

    socket.onmessage = (event) => {
      const newData: DashboardData = JSON.parse(
        event.data as string
      ) as DashboardData
      setData(newData)
    }

    return () => {
      socket.close()
    }
  }, [])

  return (
    <div>
      <div className="wrapper" style={{ width: '384px', height: '384px' }}>
        <ObcAzimuthThruster></ObcAzimuthThruster>
      </div>
      <div>
        <h1>Ship Dashboard</h1>
        <p>Speed: {data.speed}</p>
        <p>Direction: {data.direction}</p>
        <p>Consumption: {data.consumption}</p>
        <p>Emissions: {data.emissions}</p>
        <p>Eco-Score: {data.eco_score}</p>
      </div>
    </div>
  )
}
