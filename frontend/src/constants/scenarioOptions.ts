export type ScenarioKey = 'maintain-speed' | 'turn-around' | 'depart-harbor'  | 'narrow-fjord'
/* | 'unknown-vibration' | 'advice-detent-1' | 'advice-detent-2' | 'advice-detent-3' | 'caution-detent-1' | 
'caution-detent-2' | 'caution-detent-3' */

export const scenarioOptions: Record<ScenarioKey, string> = {
    'maintain-speed': 'Maintain Speed',
    'turn-around': 'Turn Around',
    'depart-harbor': 'Depart Harbor',
    'narrow-fjord': 'Narrow Fjord'
    /*
    'unknown-vibration': 'Unknown Vibration',
    'advice-detent-1': 'Advice Detent 1',
    'advice-detent-2': 'Advice Detent 2',
    'advice-detent-3': 'Advice Detent 3',
    'caution-detent-1': 'Caution Detent 1',
    'caution-detent-2': 'Caution Detent 2',
    'caution-detent-3': 'Caution Detent 3'
    */
  }