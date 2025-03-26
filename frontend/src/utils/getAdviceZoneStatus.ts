import { AdviceType, AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { DashboardData } from '../types/DashboardData'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'


export function getAdviceZoneStatus({
    azimuthData,
    angleAdvices,
    thrustAdvices
  }: {
    azimuthData: DashboardData
    angleAdvices: AngleAdvice[]
    thrustAdvices: LinearAdvice[]
  }) {
    let inThrustAdvice = false
    let inAngleAdvice = false
    let thrustType: AdviceType | null = null
    let angleType: AdviceType | null = null
  
    for (const advice of thrustAdvices) {
      if (azimuthData.position_pri >= advice.min && azimuthData.position_pri <= advice.max) {
        inThrustAdvice = true
        thrustType = advice.type
      }
    }
  
    for (const advice of angleAdvices) {
      if (azimuthData.position_sec >= advice.minAngle && azimuthData.position_sec <= advice.maxAngle) {
        inAngleAdvice = true
        angleType = advice.type
      }
    }
  
    return { inThrustAdvice, inAngleAdvice, thrustType, angleType }
  }
  