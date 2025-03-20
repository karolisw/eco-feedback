import useWebSocket, { ReadyState } from 'react-use-websocket'
import { useEffect, useState } from 'react'
import { DashboardData } from '../types/DashboardData'

export function UseWebSocket(url: string, initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData)

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(url, {
    onOpen: () => console.log('WebSocket connected'),
    onClose: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket Error:', error),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldReconnect: (closeEvent) => true, // Auto-reconnect if disconnected
    reconnectAttempts: 10, // Max 10 reconnect attempts
    reconnectInterval: 3000 // Try reconnecting every 3s
  })

  // Update state when a new message arrives
  useEffect(() => {
    if (lastJsonMessage !== null) {
      setData(lastJsonMessage as DashboardData)
    }
  }, [lastJsonMessage])

  // Function to send a message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessage = (message: any) => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage(message)
    } else {
      console.warn('WebSocket is not open, cannot send message.')
    }
  }

  return { data, isConnected: readyState === ReadyState.OPEN, sendMessage }
}
