import { useEffect, useRef, useCallback } from 'react'
import {
  AdviceType,
  AngleAdvice
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AlertConfig } from '../types/AlertConfig'

type UseVibrationFeedbackProps = {
  thrust: number
  angle: number
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToBackend: (message: any) => void
}

export function useVibrationFeedback({
  thrust,
  angle,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  sendToBackend
}: UseVibrationFeedbackProps) {
  const lastSentVibration = useRef<number>(0)

  const getVibrationStrength = useCallback(() => {
    let strength = 0
    let type: AdviceType | null = null

    // Check thruster caution zone
    for (const advice of thrustAdvices) {
      if (
        thrust >= advice.min &&
        thrust <= advice.max &&
        advice.type === AdviceType.caution
      ) {
        type = AdviceType.caution
        strength = alertConfig.vibrationStrengthThruster ?? 1
      }
    }

    // Check angle caution zone
    for (const advice of angleAdvices) {
      if (
        angle >= advice.minAngle &&
        angle <= advice.maxAngle &&
        advice.type === AdviceType.caution
      ) {
        type = AdviceType.caution
        strength = Math.max(strength, alertConfig.vibrationStrengthAngle ?? 1)
      }
    }

    return [strength, type]
  }, [
    thrustAdvices,
    angleAdvices,
    thrust,
    angle,
    alertConfig.vibrationStrengthThruster,
    alertConfig.vibrationStrengthAngle
  ])

  useEffect(() => {
    if (thrust === undefined || angle === undefined) return

    const vibrationStrength = getVibrationStrength()[0]
    if (
      vibrationStrength !== lastSentVibration.current &&
      alertConfig.enableVibration
    ) {
      sendToBackend({
        command: 'set_vibration',
        strength: vibrationStrength
      })

      if (typeof vibrationStrength === 'number') {
        lastSentVibration.current = vibrationStrength
      }
    }
  }, [
    thrust,
    angle,
    getVibrationStrength,
    sendToBackend,
    alertConfig.enableVibration
  ])
}
