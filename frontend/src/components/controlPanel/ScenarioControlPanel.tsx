import '../../styles/navBar.css'
import { ScenarioKey, scenarioOptions } from '../../constants/scenarioOptions'

interface ScenarioControlPanelProps {
  selectedScenario: ScenarioKey
  onScenarioChange: (scenario: ScenarioKey) => void
  currentTask: number
  onTaskChange: (taskNumber: number) => void
  showAzimuth: boolean
  toggleAzimuth: () => void
  onStopSimulation: () => void
  simulationRunning: boolean
  onToggleScenario: () => void
  isLogging: boolean
}

export function ScenarioControlPanel({
  selectedScenario,
  onScenarioChange,
  currentTask,
  onTaskChange,
  showAzimuth,
  toggleAzimuth,
  onStopSimulation,
  simulationRunning,
  onToggleScenario,
  isLogging
}: ScenarioControlPanelProps) {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <label>Scenario</label>
        <select
          value={selectedScenario}
          onChange={(e) => onScenarioChange(e.target.value as ScenarioKey)}
        >
          {Object.entries(scenarioOptions).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label>Task</label>
        <select
          value={currentTask}
          onChange={(e) => onTaskChange(Number(e.target.value))}
        >
          <option value={1}>Task 1</option>
          <option value={2}>Task 2</option>
          <option value={3}>Task 3</option>
        </select>

        <button className="azimuth-button" onClick={toggleAzimuth}>
          {showAzimuth ? 'Hide Azimuth' : 'Show Azimuth'}
        </button>
        <button
          onClick={onToggleScenario}
          className={isLogging ? 'stop-button' : 'start-button'}
        >
          {isLogging ? 'Stop Scenario' : 'Start Scenario'}
        </button>
        <button
          onClick={onStopSimulation}
          className={simulationRunning ? 'stop-button' : 'disabled-button'}
          disabled={!simulationRunning}
        >
          Stop Simulation
        </button>
      </div>
    </div>
  )
}
