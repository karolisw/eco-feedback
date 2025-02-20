import { useEffect, useState, useRef } from 'react'
import { DashboardData } from '../types/DashboardData'

export function UseWebSocket(url: string, initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData)
  const ws = useRef<WebSocket | null>(null)
  const latestData = useRef<DashboardData>(initialData)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  useEffect(() => {
    if (ws.current) {
      ws.current.close()
    }

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connection established')
    }

    ws.current.onmessage = (event) => {
      try {
        const newData: DashboardData = JSON.parse(
          event.data as string
        ) as DashboardData
        if (
          isDashboardData(newData) &&
          hasDataChanged(newData, latestData.current)
        ) {
          console.log('Received correctly formatted data')
          latestData.current = newData
          setData(newData) // ✅ React state triggers re-render
        }
      } catch (error) {
        console.error('Error parsing WebSocket message', error)
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error', error)
    }

    ws.current.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket connection closed')
    }

    return () => {
      ws.current?.close() // ✅ Cleanup WebSocket on component unmount
    }
  }, [url]) // ✅ Depend only on `url` to avoid re-creating unnecessary WebSockets

  // To be able to send messages to the backend
  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message)
    } else {
      console.warn('WebSocket is not open')
    }
  }

  function isDashboardData(
    data: DashboardData | string
  ): data is DashboardData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'currentThrust' in data &&
      'currentAngle' in data &&
      'consumption' in data &&
      'currentEmissions' in data
    )
  }

  function hasDataChanged(
    newData: DashboardData,
    oldData: DashboardData
  ): boolean {
    return (
      newData.currentThrust !== oldData.currentThrust ||
      newData.currentAngle !== oldData.currentAngle
    )
  }

  return { data, isConnected, sendMessage }
}
