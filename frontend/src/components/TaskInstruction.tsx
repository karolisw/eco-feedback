import { useState, useEffect } from 'react'
import { ScenarioKey } from '../constants/scenarioOptions'

interface TaskInstructionProps {
  scenario: ScenarioKey
  taskNumber: number
}
const taskInstructions: Record<ScenarioKey, Record<number, string>> = {
  'maintain-speed': {
    1: 'Use haptic feedback to reach and maintain 4 knots.',
    2: 'Speed is fluctuating. Try keeping it as close to 4 knots as possible.',
    3: 'Adjust thrust gradually while monitoring resistance.'
  },
  'turn-around': {
    1: 'You’ve drifted off-course. Begin turning the vessel around slowly.',
    2: 'Avoid rapid changes. Stay within advice angle zones.',
    3: 'Complete your turn and stabilize the course.'
  },
  'navigate-buoys': {
    1: 'Align the boat between the yellow buoys ahead.',
    2: 'Adjust both thrust and angle to maintain a centered path.',
    3: 'Use caution zones as boundaries — don’t drift too far.'
  },
  'depart-harbor': {
    1: 'Maintain under 4 knots until outside the harbor.',
    2: 'Once outside, increase to 8 knots smoothly.',
    3: 'Follow the green navigation markers to exit safely.'
  }
}
export function TaskInstruction({
  scenario,
  taskNumber
}: TaskInstructionProps) {
  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    const current = taskInstructions[scenario]?.[taskNumber]
    setInstruction(current || 'No task loaded')
  }, [scenario, taskNumber])

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: 'black',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '16px',
        maxWidth: '400px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000
      }}
    >
      <strong>Task {taskNumber}:</strong> <br />
      {instruction}
    </div>
  )
}
