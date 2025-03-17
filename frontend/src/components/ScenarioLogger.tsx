import { useState, useEffect, useCallback } from 'react'
import { saveAs } from 'file-saver'
import * as Papa from 'papaparse'
import '../styles/logger.css'
import '../styles/dashboard.css'

export function ScenarioLogger({
  simulatorData,
  simulationRunning
}: {
  simulatorData: { position_pri: number; angle_pri: number }
  simulationRunning: boolean
}) {
  const [isLogging, setIsLogging] = useState(false)
  const [logData, setLogData] = useState<
    { timestamp: string; thrust: number; azimuthAngle: number }[]
  >([])
  const [scenarioCount, setScenarioCount] = useState(1)

  const startLogging = () => {
    if (!simulationRunning) {
      console.warn('Cannot start logging when simulation is not running.')
      return
    }
    setIsLogging(true)
    setLogData([])
    console.log(`Started logging scenario ${scenarioCount}`)
  }

  const stopLogging = useCallback(() => {
    if (logData.length === 0) return

    const csv = Papa.unparse(logData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `scenario_${scenarioCount}.csv`)
    setScenarioCount(scenarioCount + 1)
    setIsLogging(false)
  }, [logData, scenarioCount])

  useEffect(() => {
    if (!isLogging) return

    const newEntry = {
      timestamp: new Date().toISOString(),
      thrust: simulatorData.position_pri,
      azimuthAngle: simulatorData.angle_pri
    }
    setLogData((prevData) => [...prevData, newEntry])
  }, [simulatorData, isLogging])

  // Automatically stop logging when simulation stops
  useEffect(() => {
    if (!simulationRunning && isLogging) {
      console.warn('Simulation stopped, automatically stopping logging.')
      stopLogging()
    }
  }, [simulationRunning, isLogging, stopLogging])

  const toggleLogging = () => {
    if (isLogging) {
      stopLogging()
    } else {
      startLogging()
    }
  }

  return (
    <div className="scenario-logger">
      <button
        onClick={toggleLogging}
        className={'scenario-button ${isLogging ? "stop" : "start" }'}
      >
        {isLogging ? 'Stop scenario' : 'Start scenario'}
      </button>
    </div>
  )
}
