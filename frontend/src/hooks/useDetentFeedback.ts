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
  scenarioKey: string
  detentEnabled: boolean
  sendToBackend: (data: unknown) => void
}

export function useDetentFeedback({
  thrust,
  angle,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  scenarioKey,
  sendToBackend,
  detentEnabled
}: UseDetentFeedbackProps) {
  const detentsSentRef = useRef(false)

  // Reset detentsSentRef when advices change
  useEffect(() => { 
    console.log("advices changed -> resetting detentsSentRef")
    detentsSentRef.current = false
  }, [angleAdvices, thrustAdvices, scenarioKey]) 

  useEffect(() => {
    if (!alertConfig.enableDetents || !detentEnabled) return
    if (detentsSentRef.current) return
    
    const angleReady = angle != null && !isNaN(angle)
    const thrustReady = thrust != null && !isNaN(thrust)
    const hasAdviceZones = angleAdvices.length > 0 || thrustAdvices.length > 0
    
    if (!(angleReady || thrustReady)) return
    if (!hasAdviceZones) return


    // Set detents for angle-based advice zones
    for (const advice of angleAdvices) {
      if (advice.type === AdviceType.advice) {
        const pos = Math.round((advice.minAngle + advice.maxAngle) / 2)
        console.log('[Detent] Setting ANGLE detent at', pos)
        sendToBackend({
          command: 'set_detent',
          type: 'angle',
          pos,
          detent: 1
        })
      }
    }

    // Set detents for thrust-based advice zones
    for (const advice of thrustAdvices) {
      if (advice.type === AdviceType.advice) {
        const pos = Math.round((advice.min + advice.max) / 2)
        console.log('[Detent] Setting THRUST detent at', pos)
        sendToBackend({
          command: 'set_detent',
          type: 'thrust',
          pos,
          detent: 1
        })
        console.log('[Detent] WebSocket send attempted.')
      }
    }
    detentsSentRef.current = true


  }, [thrust, angle, angleAdvices, thrustAdvices, alertConfig.enableDetents, sendToBackend, detentEnabled])
}
