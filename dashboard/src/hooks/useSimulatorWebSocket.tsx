import { useEffect, useRef, useState } from 'react'
import { SimulatorData } from '../types/DashboardData'

export function UseSimulatorWebSocket(
  url: string,
  initialSimData: SimulatorData
) {
  const [data, setData] = useState<SimulatorData>(initialSimData)
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  useEffect(() => {
    if (ws.current) {
      ws.current.close()
    }

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setIsConnected(true)
      console.log('Simulator WebSocket connected')
    }

    ws.current.onmessage = (event) => {
      try {
        const message: SimulatorData = JSON.parse(
          event.data as string
        ) as SimulatorData
        setData(message)
      } catch (error) {
        console.error('Error parsing WebSocket message from simulator', error)
      }
    }

    ws.current.onerror = (error) =>
      console.error('Simulator WebSocket error', error)

    ws.current.onclose = () => {
      setIsConnected(false)
      console.log('Simulator WebSocket connection closed')
    }

    return () => ws.current?.close()
  }, [url]) // WebSocket should reconnect when simulation state changes

  // Function to send messages to the simulator WebSocket
  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message)
    } else {
      console.warn('Simulator WebSocket is not connected')
    }
  }

  return { data, isConnected, sendMessage }
}
