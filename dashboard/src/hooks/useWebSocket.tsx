import { useEffect, useState } from 'react'

type DashboardData = {
  currentThrust: number
  currentAngle: number
  consumption: number
  currentEmissions: number
  ecoScore: number
}

export function useWebSocket(url: string, initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData)

  useEffect(() => {
    const socket = new WebSocket(url)

    socket.onmessage = (event) => {
      const newData: DashboardData = JSON.parse(
        event.data as string
      ) as DashboardData
      setData(newData)
    }

    return () => {
      socket.close()
    }
  }, [url])

  return data
}
