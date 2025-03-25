import { useEffect, useRef } from 'react'
import { AdviceType, AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { DashboardData } from '../types/DashboardData'
import { AlertConfig } from '../types/AlertConfig'

type UseFrictionFeedbackParams = {
  azimuthData: DashboardData
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
  sendToBackend: (data: unknown) => void
  alertConfig: AlertConfig
}

export function useFrictionFeedback({
  azimuthData,
  angleAdvices,
  thrustAdvices,
  sendToBackend,
  alertConfig
}: UseFrictionFeedbackParams) {
  const inThrustAdviceZoneRef = useRef(false)
  const inAngleAdviceZoneRef = useRef(false)

  useEffect(() => {
    if (!azimuthData) return

    let inThrustAdvice = false
    let inAngleAdvice = false

    // Check thrust advice
    for (const advice of thrustAdvices) {
      if (
        advice.type === AdviceType.advice &&
        azimuthData.position_pri >= advice.min &&
        azimuthData.position_pri <= advice.max
      ) {
        inThrustAdvice = true
      }
    }

    // Check angle advice
    for (const advice of angleAdvices) {
      if (
        advice.type === AdviceType.advice &&
        azimuthData.position_sec >= advice.minAngle &&
        azimuthData.position_sec <= advice.maxAngle
      ) {
        inAngleAdvice = true
        break
      }
    }

    const frictionInside = alertConfig.adviceHighResistance ? 3 : 1
    const frictionOutside = alertConfig.regularHighResistance ? 3 : 1

    // THRUST ENTRY
    if (inThrustAdvice && !inThrustAdviceZoneRef.current) {
      console.log('Entered THRUST advice zone')
      sendToBackend({
        command: 'set_friction_strength',
        friction: frictionInside
      })
      inThrustAdviceZoneRef.current = true
    }

    // THRUST EXIT
    if (!inThrustAdvice && inThrustAdviceZoneRef.current) {
      console.log('Exited THRUST advice zone')
      sendToBackend({
        command: 'set_friction_strength',
        friction: frictionOutside
      })
      inThrustAdviceZoneRef.current = false
    }

    // ANGLE ENTRY
    if (inAngleAdvice && !inAngleAdviceZoneRef.current) {
      console.log('Entered ANGLE advice zone')
      sendToBackend({
        command: 'set_friction_strength',
        friction: frictionInside
      })
      inAngleAdviceZoneRef.current = true
    }

    // ANGLE EXIT
    if (!inAngleAdvice && inAngleAdviceZoneRef.current) {
      console.log('Exited ANGLE advice zone')
      sendToBackend({
        command: 'set_friction_strength',
        friction: frictionOutside
      })
      inAngleAdviceZoneRef.current = false
    }
  }, [
    azimuthData,
    angleAdvices,
    thrustAdvices,
    sendToBackend,
    alertConfig.adviceHighResistance,
    alertConfig.regularHighResistance
  ])
}
