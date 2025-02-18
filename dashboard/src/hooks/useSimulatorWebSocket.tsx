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

    ws.current.onmessage = (event) => {
      try {
        const message: SimulatorData = JSON.parse(
          event.data as string
        ) as SimulatorData

        setData(message)
      } catch (error) {
        console.error('Error parsing WebSocket message', error)
      }
    }

    ws.current.onerror = (error) => console.error('WebSocket error', error)
    ws.current.onclose = () => console.log('WebSocket connection closed')

    return () => ws.current?.close()
  }, [url])

  return { data }
}
