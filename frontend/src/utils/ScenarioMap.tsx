import { ScenarioKey } from '../constants/scenarioOptions'
import {
  AngleAdvice,
  AdviceType
} from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'
import { BoundaryConfig } from '../types/BoundaryConfig'

export const scenarioAdviceMap: Record<
  ScenarioKey,
  {
    angleDetentStrength: number
    thrustDetentStrength: number
    angleAdvices: AngleAdvice[]
    thrustAdvices: LinearAdvice[]
    boundaries?: BoundaryConfig[]
  }
> = {
  // This scenario only focuses on thruster feedback
  // Advice zone is from 0 to about 40
  // Detent is at the end of the advice zone
  // Caution zone is right behind the advice zone
  'maintain-speed': {
    angleDetentStrength: 0,
    thrustDetentStrength: 1,
    angleAdvices: [],
    thrustAdvices: [
      { min: 20, max: 50, type: AdviceType.advice, hinted: true },
      { min: 60, max: 100, type: AdviceType.caution, hinted: true }
    ]
  },
  // The operator should turn the vessel around, but they should not turn around too quickly
  'turn-around': {
    angleDetentStrength: 1,
    thrustDetentStrength: 1,
    angleAdvices: [
      { minAngle: 320, maxAngle: 359, type: AdviceType.advice, hinted: true },
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: 70, maxAngle: 180, type: AdviceType.caution, hinted: true },
      { minAngle: -180, maxAngle: -70, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [{ min: 10, max: 30, type: AdviceType.advice, hinted: true }]
  },
  // The operator should aim to hit the buoys
  'navigate-buoys': {
    angleDetentStrength: 1,
    thrustDetentStrength: 1,
    angleAdvices: [
      { minAngle: 320, maxAngle: 359, type: AdviceType.advice, hinted: true },
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: 70, maxAngle: 180, type: AdviceType.caution, hinted: true },
      { minAngle: -180, maxAngle: -70, type: AdviceType.caution, hinted: true }
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
    angleDetentStrength: 1,
    thrustDetentStrength: 1,
    angleAdvices: [
      { minAngle: 320, maxAngle: 359, type: AdviceType.advice, hinted: true },
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true },
      { minAngle: 60, maxAngle: 240, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 0, max: 40, type: AdviceType.advice, hinted: true },
      { min: 50, max: 100, type: AdviceType.caution, hinted: true }
    ],
    boundaries: [
      {
        enabled: true,
        boundary: 3,
        type: 'thrust',
        lower: 1,
        upper: 41
      }
    ]
  },
  'advice-detent-1': {
    angleDetentStrength: 1,
    thrustDetentStrength: 1,
    angleAdvices: [
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true }
    ],
    thrustAdvices: [{ min: 30, max: 80, type: AdviceType.advice, hinted: true }]
  },
  'advice-detent-2': {
    angleDetentStrength: 2,
    thrustDetentStrength: 2,
    angleAdvices: [
      { minAngle: 30, maxAngle: 50, type: AdviceType.advice, hinted: true }
    ],
    thrustAdvices: [{ min: 10, max: 40, type: AdviceType.advice, hinted: true }]
  },
  'advice-detent-3': {
    angleDetentStrength: 3,
    thrustDetentStrength: 3,
    angleAdvices: [
      { minAngle: 320, maxAngle: 359, type: AdviceType.advice, hinted: true },
      { minAngle: 1, maxAngle: 40, type: AdviceType.advice, hinted: true }
    ],
    thrustAdvices: [{ min: 0, max: 40, type: AdviceType.advice, hinted: true }]
  },
  'caution-detent-1': {
    angleDetentStrength: 1,
    thrustDetentStrength: 1,
    angleAdvices: [
      { minAngle: 60, maxAngle: 110, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 80, max: 100, type: AdviceType.caution, hinted: true }
    ]
  },
  'caution-detent-2': {
    angleDetentStrength: 2,
    thrustDetentStrength: 2,
    angleAdvices: [
      { minAngle: 60, maxAngle: 120, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 50, max: 100, type: AdviceType.caution, hinted: true }
    ]
  },
  'caution-detent-3': {
    angleDetentStrength: 3,
    thrustDetentStrength: 3,
    angleAdvices: [
      { minAngle: 60, maxAngle: 130, type: AdviceType.caution, hinted: true }
    ],
    thrustAdvices: [
      { min: 50, max: 100, type: AdviceType.caution, hinted: true }
    ]
  }
}
