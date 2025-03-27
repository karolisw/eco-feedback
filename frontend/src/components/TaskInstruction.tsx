import { useState, useEffect } from 'react'

interface TaskInstructionProps {
  scenario: number
  taskNumber: number
}

const taskInstructions: Record<number, Record<number, string>> = {
  1: {
    1: 'The most eco-friendly speed is 4 knots. Use haptic feedback to reach and maintain this speed.',
    2: 'You have diverged from the route. Use haptic feedback to correct your course (180° deviation).',
    3: 'Use only haptic cues to steer the boat between the yellow buoys ahead.'
  },
  2: {
    1: 'The most eco-friendly speed is 4 knots. Use visual + haptic feedback to reach it.',
    2: 'You have diverged from the route. Use all feedback to correct course (180° deviation).',
    3: 'Navigate toward the yellow buoys. Use both visual highlights and haptic feedback.'
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
