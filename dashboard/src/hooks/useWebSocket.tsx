import { useEffect, useState } from 'react'

type DashboardData = {
  currentThrust: number
  currentAngle: number
  consumption: number
  currentEmissions: number
  ecoScore: number
}

export function UseWebSocket(url: string, initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isConnected, setIsConnected] = useState<boolean>(false)

  useEffect(() => {
    const socket = new WebSocket(url)

    socket.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connection established')
    }

    socket.onmessage = (event) => {
      try {
        const newData: DashboardData = JSON.parse(
          event.data as string
        ) as DashboardData
        if (isDashboardData(newData)) {
          setData(newData)
        } else {
          console.error('Received data is not of type DashboardData', newData)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message', error)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error', error)
    }

    socket.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket connection closed')
    }

    return () => {
      socket.close()
    }
  }, [url])

  function isDashboardData(data: DashboardData | string) {
    return (
      data &&
      typeof data === 'object' &&
      'currentThrust' in data &&
      'currentAngle' in data &&
      'consumption' in data &&
      'currentEmissions' in data &&
      'ecoScore' in data
    )
  }

  return data
}
