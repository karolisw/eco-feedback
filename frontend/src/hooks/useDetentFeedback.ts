import { useEffect, useRef } from 'react'
import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { AlertConfig } from '../types/AlertConfig'

type UseDetentFeedbackProps = {
  thrust: number
  angle: number
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  alertConfig: AlertConfig
  scenarioKey: string
  angleDetentStrength: number
  thrustDetentStrength: number
  sendToBackend: (data: unknown) => void
}

export function useDetentFeedback({
  thrust,
  angle,
  angleAdvices,
  thrustAdvices,
  alertConfig,
  scenarioKey,
  thrustDetentStrength,
  angleDetentStrength,
  sendToBackend
}: UseDetentFeedbackProps) {
  const detentsSentRef = useRef(false)

  useEffect(() => {
    console.log('advices changed -> resetting detentsSentRef')
    detentsSentRef.current = false
  }, [angleAdvices, thrustAdvices, scenarioKey])

  useEffect(() => {
    if (!alertConfig.enableDetents || detentsSentRef.current) return

    const angleReady = angle != null && !isNaN(angle)
    const thrustReady = thrust != null && !isNaN(thrust)
    const hasZones = angleAdvices.length > 0 || thrustAdvices.length > 0
    if (!(angleReady || thrustReady) || !hasZones) return

    // Collect angle detents
    // angleDetentList is a list of pos only

    const angleDetentList: number[] = []
    for (const advice of angleAdvices) {
      if (angleDetentStrength > 0) {
        angleDetentList.push(advice.minAngle)
        angleDetentList.push(advice.maxAngle)
      }
      
    }

    // Collect thrust detents
    const thrustDetentList: number[]= []
    for (const advice of thrustAdvices) {
      if (thrustDetentStrength > 0) {
        thrustDetentList.push(advice.min)
        thrustDetentList.push(advice.max)
      }
    }

    // Send to backend
    if (angleDetentList.length > 0) {
      console.log('[Detent] Sending ANGLE detents:', angleDetentList)
      sendToBackend({
        command: 'set_detents',
        type: 'angle',
        detent: angleDetentStrength,
        detents: angleDetentList
      })
    }

    if (thrustDetentList.length > 0) {
      console.log('[Detent] Sending THRUST detents:', thrustDetentList)
      sendToBackend({
        command: 'set_detents',
        type: 'thrust',
        detent: thrustDetentStrength,
        detents: thrustDetentList
      })
    }

    detentsSentRef.current = true
  }, [thrust, angle, angleAdvices, thrustAdvices, alertConfig.enableDetents, sendToBackend, angleDetentStrength, thrustDetentStrength])
}
