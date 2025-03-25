import { useEffect, useRef, useCallback } from 'react'
import { AdviceType, AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { DashboardData } from '../types/DashboardData'
import { AlertConfig } from '../types/AlertConfig'

type UseVibrationFeedbackProps = {
  azimuthData: DashboardData
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToBackend: (message: any) => void
}

export function useVibrationFeedback({
  azimuthData,
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
        azimuthData.position_pri >= advice.min &&
        azimuthData.position_pri <= advice.max &&
        advice.type === AdviceType.caution
      ) {
        type = AdviceType.caution
        strength = alertConfig.vibrationStrengthThruster ?? 1
      }
    }

    // Check angle caution zone
    for (const advice of angleAdvices) {
      if (
        azimuthData.position_sec >= advice.minAngle &&
        azimuthData.position_sec <= advice.maxAngle &&
        advice.type === AdviceType.caution
      ) {
        type =  AdviceType.caution
        strength = Math.max(strength, alertConfig.vibrationStrengthAngle ?? 1)
      }
    }

    return [strength, type]
  }, [
    angleAdvices,
    thrustAdvices,
    azimuthData.position_pri,
    azimuthData.position_sec,
    alertConfig.vibrationStrengthThruster,
    alertConfig.vibrationStrengthAngle
  ])

  useEffect(() => {
    if (!azimuthData) return

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
    azimuthData,
    getVibrationStrength,
    sendToBackend,
    alertConfig.enableVibration
  ])
}