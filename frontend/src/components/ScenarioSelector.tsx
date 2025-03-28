import { scenarioOptions } from '../constants/scenarioOptions'
import { ScenarioKey } from '../constants/scenarioOptions'

interface ScenarioSelectorProps {
  selectedScenario: ScenarioKey
  onChange: (scenario: ScenarioKey) => void
}

export function ScenarioSelector({
  selectedScenario,
  onChange
}: ScenarioSelectorProps) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label htmlFor="scenario-select" style={{ marginRight: '8px' }}>
        Select Scenario:
      </label>
      <select
        id="scenario-select"
        value={selectedScenario}
        onChange={(e) => onChange(e.target.value as ScenarioKey)}
      >
        {Object.entries(scenarioOptions).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
