import { useEffect, useRef } from 'react'
import {
  AdviceType,
  AngleAdvice
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AlertConfig } from '../types/AlertConfig'

type UseDetentFeedbackProps = {
  thrust: number
  angle: number
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  sendToBackend: (data: unknown) => void
}

export function useDetentFeedback({
  thrust,
  angle,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  sendToBackend
}: UseDetentFeedbackProps) {
  const detentsSentRef = useRef(false)

  useEffect(() => {
    if (
      (!alertConfig.enableDetents ||
      detentsSentRef.current) && thrust != 0 && angle != 0 
      //thrust === 0 //TODO why would we check for 0?
    )
      return

    // ANGLE ADVICE: center-based detent
    for (const advice of angleAdvices) {
      if (advice.type === AdviceType.advice) {
        const center = (advice.minAngle + advice.maxAngle) / 2
        console.log('Setting detent at', center)
        console.log("for angle")
        sendToBackend({
          command: 'set_detent',
          type: 'angle',
          pos: center,
          detent: 1
        })
      }
    }

    // THRUST ADVICE: center-based detent
    for (const advice of thrustAdvices) {
      if (advice.type === AdviceType.advice) {
        const center = (advice.min + advice.max) / 2
        console.log('Setting detent at', center)
        console.log("for thrust")
        sendToBackend({
          command: 'set_detent',
          type: 'thrust',
          pos: center,
          detent: 1
        })
      }
    }

    detentsSentRef.current = true
  }, [thrust, angle, angleAdvices, thrustAdvices, alertConfig.enableDetents, sendToBackend])
}
