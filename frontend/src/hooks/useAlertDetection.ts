import { useEffect, useRef } from 'react'
import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'

type AlertType = 'advice' | 'caution' | null

type UseAlertDetectionParams = {
  angle: number
  thrust: number
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  simulationRunning: boolean
  onAlertDetected: (type: AlertType, timestamp: number) => void
}

export function useAlertDetection({
  angle,
  thrust,
  angleAdvices,
  thrustAdvices,
  simulationRunning,
  onAlertDetected
}: UseAlertDetectionParams) {
  const alertTriggeredRef = useRef(false)

  useEffect(() => {
    if (!simulationRunning) return

    let alertNow = false
    let detectedType: AlertType = null

    for (const advice of thrustAdvices) {
      if (thrust >= advice.min && thrust <= advice.max) {
        alertNow = true
        detectedType = advice.type
      }
    }

    for (const advice of angleAdvices) {
      if (angle >= advice.minAngle && angle <= advice.maxAngle) {
        alertNow = true
        detectedType = advice.type
      }
    }

    if (alertNow && !alertTriggeredRef.current) {
      alertTriggeredRef.current = true
      onAlertDetected(detectedType, Date.now())
    }
  }, [
    angle,
    thrust,
    angleAdvices,
    thrustAdvices,
    simulationRunning,
    onAlertDetected
  ])
}
