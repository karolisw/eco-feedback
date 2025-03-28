import React from 'react'

interface TaskSelectorProps {
  currentTask: number
  onChange: (taskNumber: number) => void
}

export function TaskSelector({ currentTask, onChange }: TaskSelectorProps) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label htmlFor="task-select" style={{ marginRight: '8px' }}>
        Select Task:
      </label>
      <select
        id="task-select"
        value={currentTask}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={1}>Task 1</option>
        <option value={2}>Task 2</option>
        <option value={3}>Task 3</option>
      </select>
    </div>
  )
}
