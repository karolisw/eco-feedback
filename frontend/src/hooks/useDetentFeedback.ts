import { useEffect, useRef } from 'react'
import { 
  AngleAdvice
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AlertConfig } from '../types/AlertConfig'

type DetentStrengthMap = {
  advice: number
  caution: number
}

type UseDetentFeedbackProps = {
  thrust: number
  angle: number
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  scenarioKey: string
  angleDetents: DetentStrengthMap
  thrustDetents: DetentStrengthMap
  sendToBackend: (data: unknown) => void
}

export function useDetentFeedback({
  thrust,
  angle,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  scenarioKey,
  angleDetents,
  thrustDetents,
  sendToBackend
}: UseDetentFeedbackProps) {
  const detentsSentRef = useRef(false)

  useEffect(() => {
    detentsSentRef.current = false
  }, [angleAdvices, thrustAdvices, scenarioKey]) 

  useEffect(() => {
    if (!alertConfig.enableDetents) return
    if (detentsSentRef.current) return

    const angleReady = angle != null && !isNaN(angle)
    const thrustReady = thrust != null && !isNaN(thrust)
    const hasAdviceZones = angleAdvices.length > 0 || thrustAdvices.length > 0

    if (!(angleReady || thrustReady)) return
    if (!hasAdviceZones) return

    // ANGLE DETENTS
    for (const advice of angleAdvices) {
      const strength = angleDetents[advice.type]
      if (strength > 0) {
        const entries = [advice.minAngle, advice.maxAngle] // Entry + Exit detents
        for (const pos of entries) {
          console.log(`[Detent] Setting ANGLE detent at ${pos} (strength ${strength})`)
          sendToBackend({
            command: 'set_detent',
            type: 'angle',
            pos,
            detent: strength
          })
        }
      }
    }
    

    // THRUST DETENTS
    for (const advice of thrustAdvices) {
      const strength = thrustDetents[advice.type]
      if (strength > 0) {
        const entries = [advice.min, advice.max]
        for (const pos of entries) {
          console.log(`[Detent] Setting THRUST detent at ${pos} (strength ${strength})`)
          sendToBackend({
            command: 'set_detent',
            type: 'thrust',
            pos,
            detent: strength
          })
        }
      }
    }

    detentsSentRef.current = true
  }, [
    thrust,
    angle,
    angleAdvices,
    thrustAdvices,
    alertConfig.enableDetents,
    angleDetents,
    thrustDetents,
    sendToBackend
  ])
}
