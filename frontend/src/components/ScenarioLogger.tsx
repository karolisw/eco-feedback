import { useState, useEffect, useCallback } from 'react'
import { saveAs } from 'file-saver'
import * as Papa from 'papaparse'
import '../styles/dashboard.css'

export function ScenarioLogger({
  simulatorData,
  simulationRunning,
  alertTriggered,
  alertType
}: {
  simulatorData: { position_pri: number; angle_pri: number }
  simulationRunning: boolean
  alertTriggered: boolean
  alertType?: 'advice' | 'caution' | null
}) {
  const [isLogging, setIsLogging] = useState(false)
  const [logData, setLogData] = useState<
    {
      timestamp: string
      thrust: number
      azimuthAngle: number
      alertType: 'advice' | 'caution' | null | undefined
    }[]
  >([])
  const [scenarioCount, setScenarioCount] = useState(1)
  const [lastAlertTime, setLastAlertTime] = useState<number | null>(null)

  const startLogging = () => {
    if (!simulationRunning) return
    setIsLogging(true)
    setLogData([])
  }

  const stopLogging = useCallback(() => {
    if (logData.length === 0) return
    const csv = Papa.unparse(logData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `scenario_${scenarioCount}.csv`)
    setScenarioCount(scenarioCount + 1)
    setIsLogging(false)
  }, [logData, scenarioCount])

  // Capture T1 when alert is triggered
  useEffect(() => {
    if (isLogging && alertTriggered) {
      console.log('🚨 Scenario Logger: Alert detected!')
      setLastAlertTime(Date.now())
    }
  }, [alertTriggered, alertType, isLogging])

  // Capture T2 when thrust or angle changes
  useEffect(() => {
    if (!isLogging) return

    const currentTime = Date.now()
    let reactionTime = null

    if (lastAlertTime) {
      reactionTime = currentTime - lastAlertTime
      setLastAlertTime(null)
    }

    setLogData((prevData) => [
      ...prevData,
      {
        timestamp: new Date().toISOString(),
        thrust: simulatorData.position_pri,
        azimuthAngle: simulatorData.angle_pri,
        reactionTime,
        alertType
      }
    ])
  }, [
    simulatorData.position_pri,
    simulatorData.angle_pri,
    isLogging,
    lastAlertTime,
    alertType
  ])

  return (
    <div className="scenario-logger">
      <button
        onClick={() => (isLogging ? stopLogging() : startLogging())}
        className="scenario-button"
      >
        {isLogging ? 'Stop Scenario' : 'Start Scenario'}
      </button>
    </div>
  )
}
