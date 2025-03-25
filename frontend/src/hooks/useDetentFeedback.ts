import { useEffect, useRef } from 'react'
import { AdviceType, AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { DashboardData } from '../types/DashboardData'
import { AlertConfig } from '../types/AlertConfig'

type UseDetentFeedbackProps = {
  azimuthData: DashboardData
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  sendToBackend: (data: unknown) => void
}

export function useDetentFeedback({
  azimuthData,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  sendToBackend
}: UseDetentFeedbackProps) {
  const detentsSentRef = useRef(false)

  useEffect(() => {
    if (
      !alertConfig.enableDetents ||
      detentsSentRef.current ||
      azimuthData.position_pri === 0
    )
      return

    // ANGLE ADVICE: center-based detent
    for (const advice of angleAdvices) {
      if (advice.type === AdviceType.advice) {
        const center = (advice.minAngle + advice.maxAngle) / 2
        sendToBackend({
          command: 'set_detent',
          type: 'angle',
          pos1: center,
          pos2: center,
          detent: 1
        })
      }
    }

    // THRUST ADVICE: center-based detent
    for (const advice of thrustAdvices) {
      if (advice.type === AdviceType.advice) {
        const center = (advice.min + advice.max) / 2
        sendToBackend({
          command: 'set_detent',
          type: 'thrust',
          pos1: center,
          pos2: center,
          detent: 1
        })
      }
    }

    detentsSentRef.current = true
  }, [
    azimuthData,
    angleAdvices,
    thrustAdvices,
    alertConfig.enableDetents,
    sendToBackend
  ])
}
