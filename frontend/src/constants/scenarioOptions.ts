export type ScenarioKey = 'maintain-speed' | 'turn-around' | 'navigate-buoys' | 'depart-harbor'

export const scenarioOptions: Record<ScenarioKey, string> = {
    'maintain-speed': 'Maintain Speed',
    'turn-around': 'Turn Around',
    'navigate-buoys': 'Navigate Buoys',
    'depart-harbor': 'Depart Harbor',
  }