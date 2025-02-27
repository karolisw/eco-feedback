import { useEffect, useRef, useState } from 'react'
import { SimulatorData } from '../types/DashboardData'

export function UseSimulatorWebSocket(
  url: string,
  initialSimData: SimulatorData
) {
  const [data, setData] = useState<SimulatorData>(initialSimData)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (ws.current) {
      ws.current.close()
    }

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log('Simulator WebSocket connected')
    }

    ws.current.onmessage = (event) => {
      try {
        const message: SimulatorData = JSON.parse(
          event.data as string
        ) as SimulatorData
        // Prevent overwriting with bad data (0 or NaN)
        if (!isValidData(message)) {
          console.warn('Received invalid data, skipping update:', message)
          return
        }
        setData(message)
      } catch (error) {
        console.error('Error parsing WebSocket message from simulator', error)
      }
    }

    ws.current.onerror = (error) =>
      console.error('Simulator WebSocket error', error)

    ws.current.onclose = (event) => {
      console.log('Simulator WebSocket connection closed:', event.reason)
    }

    return () => ws.current?.close() // Cleanup on component unmount
  }, [url])

  // Function to send messages to the simulator WebSocket
  const sendMessage = (newMessage: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(newMessage)
    } else {
      console.warn('Simulator WebSocket is not connected')
    }
  }

  // Helper function to check if the received data is valid
  function isValidData(data: SimulatorData) {
    return (
      data && !isNaN(data.heading) && !isNaN(data.speed) && !isNaN(data.rpm)
    )
  }

  return { data, sendMessage }
}
