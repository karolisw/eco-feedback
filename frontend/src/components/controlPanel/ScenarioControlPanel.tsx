import { ScenarioKey, scenarioOptions } from '../../constants/scenarioOptions'

interface ScenarioControlPanelProps {
  selectedScenario: ScenarioKey
  onScenarioChange: (scenario: ScenarioKey) => void
  currentTask: number
  onTaskChange: (taskNumber: number) => void
  onReset?: () => void
}

export function ScenarioControlPanel({
  selectedScenario,
  onScenarioChange,
  currentTask,
  onTaskChange,
  onReset
}: ScenarioControlPanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        flexWrap: 'wrap'
      }}
    >
      {/* Scenario Selector */}
      <div>
        <label htmlFor="scenario-select" style={{ marginRight: '6px' }}>
          Scenario:
        </label>
        <select
          id="scenario-select"
          value={selectedScenario}
          onChange={(e) => onScenarioChange(e.target.value as ScenarioKey)}
        >
          {Object.entries(scenarioOptions).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Task Selector */}
      <div>
        <label htmlFor="task-select" style={{ marginRight: '6px' }}>
          Task:
        </label>
        <select
          id="task-select"
          value={currentTask}
          onChange={(e) => onTaskChange(Number(e.target.value))}
        >
          <option value={1}>Task 1</option>
          <option value={2}>Task 2</option>
          <option value={3}>Task 3</option>
        </select>
      </div>

      {/* Optional Reset Button */}
      {onReset && (
        <button onClick={onReset} style={{ padding: '4px 12px' }}>
          Reset
        </button>
      )}
    </div>
  )
}
