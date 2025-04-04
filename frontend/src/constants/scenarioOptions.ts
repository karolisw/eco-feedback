export type ScenarioKey = 'maintain-speed' | 'turn-around' | 'navigate-buoys' | 'depart-harbor' 
| 'advice-detent-1' | 'advice-detent-2' | 'advice-detent-3' | 'caution-detent-1' | 
'caution-detent-2' | 'caution-detent-3' 

export const scenarioOptions: Record<ScenarioKey, string> = {
    'maintain-speed': 'Maintain Speed',
    'turn-around': 'Turn Around',
    'navigate-buoys': 'Navigate Buoys',
    'depart-harbor': 'Depart Harbor',
    'advice-detent-1': 'Advice Detent 1',
    'advice-detent-2': 'Advice Detent 2',
    'advice-detent-3': 'Advice Detent 3',
    'caution-detent-1': 'Caution Detent 1',
    'caution-detent-2': 'Caution Detent 2',
    'caution-detent-3': 'Caution Detent 3'
  }