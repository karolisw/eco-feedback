import { useEffect, useRef } from 'react'

type UseOperatorResponseParams = {
  simulationRunning: boolean
  alertTime: number | null
  thrust: number
  angle: number
  thrustSetpoint: number
  angleSetpoint: number
  onResponse: () => void
}

export function useOperatorResponse({
  simulationRunning,
  alertTime,
  thrust,
  angle,
  thrustSetpoint,
  angleSetpoint,
  onResponse
}: UseOperatorResponseParams) {
  const alertHandledRef = useRef(false)

  useEffect(() => {
    if (!simulationRunning || alertTime === null || alertHandledRef.current)
      return

    const hasResponded =
      thrust !== thrustSetpoint || angle !== angleSetpoint

    if (hasResponded) {
      alertHandledRef.current = true
      onResponse()
    }
  }, [
    simulationRunning,
    alertTime,
    thrust,
    angle,
    thrustSetpoint,
    angleSetpoint,
    onResponse
  ])
}
