import { ScenarioKey } from '../constants/scenarioOptions'
import {
  AngleAdvice,
  AdviceType
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'

export const scenarioAdviceMap: Record<
  ScenarioKey,
  {
    angleAdvices: AngleAdvice[]
    thrustAdvices: LinearAdvice[]
  }
> = {
  // This scenario only focuses on thruster feedback
  // Advice zone is from 0 to about 40
  // Detent is at the end of the advice zone
  // Caution zone is right behind the advice zone
  'maintain-speed': {
    angleAdvices: [],
    thrustAdvices: [
      { min: 10, max: 40, type: AdviceType.advice, hinted: true },
      { min: 41, max: 100, type: AdviceType.caution, hinted: true }
    ]
  },
  // The operator should turn the vessel around, but they should not turn around too quickly
  'turn-around': {
    angleAdvices: [
      { minAngle: -40, maxAngle: -1, type: AdviceType.advice, hinted: true },
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: -41, maxAngle: -179, type: AdviceType.caution, hinted: true },
      { minAngle: 180, maxAngle: 41, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [{ min: 10, max: 30, type: AdviceType.advice, hinted: true }]
  },
  // The operator should aim to hit the buoys
  'navigate-buoys': {
    angleAdvices: [
      { minAngle: -40, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: 60, maxAngle: 180, type: AdviceType.caution, hinted: true },
      { minAngle: -180, maxAngle: -60, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 20, max: 60, type: AdviceType.advice, hinted: true },
      { min: 80, max: 100, type: AdviceType.caution, hinted: true }
    ]
  },
  // The operator shuold leave the harbor. The harbor has a speed limit of 4 knots
  // After leaving the harbor, they should aim for 8 knots
  // Due to the speed limit, boundaries should be set at 4 knots
  'depart-harbor': {
    angleAdvices: [
      { minAngle: -40, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: 60, maxAngle: 180, type: AdviceType.caution, hinted: true },
      { minAngle: -180, maxAngle: -60, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 0, max: 40, type: AdviceType.advice, hinted: true },
      { min: 41, max: 100, type: AdviceType.caution, hinted: true }
    ]
  }
}
