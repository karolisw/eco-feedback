import { AdviceType, AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'


export function getAdviceZoneStatus({
    thrust,
    angle,
    angleAdvices,
    thrustAdvices
  }: {
    thrust: number
    angle: number
    angleAdvices: AngleAdvice[]
    thrustAdvices: LinearAdvice[]
  }) {
    let inThrustAdvice = false
    let inAngleAdvice = false
    let thrustType: AdviceType | null = null
    let angleType: AdviceType | null = null
  
    for (const advice of thrustAdvices) {
      if (thrust >= advice.min && thrust <= advice.max) {
        inThrustAdvice = true
        thrustType = advice.type
      }
    }
  
    for (const advice of angleAdvices) {
      if (angle >= advice.minAngle && angle <= advice.maxAngle) {
        inAngleAdvice = true
        angleType = advice.type
      }
    }
  
    return { inThrustAdvice, inAngleAdvice, thrustType, angleType }
  }
  