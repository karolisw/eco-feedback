import '../../styles/navBar.css'
import { ScenarioKey, scenarioOptions } from '../../constants/scenarioOptions'

interface ScenarioControlPanelProps {
  selectedScenario: ScenarioKey
  onScenarioChange: (scenario: ScenarioKey) => void
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
  onStopSimulation,
  simulationRunning
}: ScenarioControlPanelProps) {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <label>Scenario</label>
        <select
          value={selectedScenario}
          onChange={(e) => {
            const newValue = e.target.value as ScenarioKey
            if (newValue !== selectedScenario) {
              onScenarioChange(newValue)
            }
          }}
        >
          {Object.entries(scenarioOptions).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
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
