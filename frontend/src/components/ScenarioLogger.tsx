import { useState, useEffect, useRef, useCallback } from 'react'
import { saveAs } from 'file-saver'
import * as Papa from 'papaparse'
import '../styles/dashboard.css'

export function ScenarioLogger({
  simulatorData,
  simulationRunning,
  thrustAdvices,
  angleAdvices,
  configFileName
}: {
  simulatorData: { position_pri: number; angle_pri: number }
  simulationRunning: boolean
  thrustAdvices: { min: number; max: number; type: 'advice' | 'caution' }[]
  angleAdvices: {
    minAngle: number
    maxAngle: number
    type: 'advice' | 'caution'
  }[]
  configFileName: string
}) {
  const [isLogging, setIsLogging] = useState(false)
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [logData, setLogData] = useState<
    {
      timestamp: string
      thrust: number
      azimuthAngle: number
      reactionTime?: number | null
      exitTime?: number | null
      alertType?: 'advice' | 'caution' | null
      alertCategory?: 'thrust' | 'angle' // Marks if entry is thrust or angle
    }[]
  >([])

  const [scenarioCount, setScenarioCount] = useState(1)

  const lastAlertTime = useRef<{ thrust: number | null; angle: number | null }>(
    {
      thrust: null,
      angle: null
    }
  ) // T1
  const firstResponseTime = useRef<{
    thrust: number | null
    angle: number | null
  }>({
    thrust: null,
    angle: null
  }) // T2
  const alertActive = useRef<{ thrust: boolean; angle: boolean }>({
    thrust: false,
    angle: false
  })
  const alertTypeRef = useRef<{
    thrust: 'advice' | 'caution' | null
    angle: 'advice' | 'caution' | null
  }>({
    thrust: null,
    angle: null
  })

  const isStoppingRef = useRef<boolean>(false)

  const startLogging = () => {
    if (!simulationRunning) {
      console.warn('Cannot start logging when simulation is not running.')
      return
    }

    const newScenarioId = new Date().toISOString()

    setScenarioId(newScenarioId)
    setIsLogging(true)
    setLogData([])

    console.log(`Started logging scenario ${scenarioCount}`)
  }

  const stopLogging = useCallback(() => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true

    setTimeout(() => {
      // Ensure there is data before exporting
      if (logData.length > 0) {
        console.log('Exporting CSV...')
        const csv = Papa.unparse(logData)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        saveAs(blob, `${scenarioId}-${configFileName}`)

        setScenarioCount((prev) => prev + 1)
        console.log('CSV file saved.')
      } else {
        console.warn('No log data found, CSV not exported.')
      }

      setIsLogging(false)
      isStoppingRef.current = false
    }, 200)
  }, [logData, configFileName, scenarioId])

  // ** Capture T1 (Alert Triggered)**
  useEffect(() => {
    if (!isLogging) return

    let thrustAlertNow = false
    let angleAlertNow = false

    let detectedAngleType: 'advice' | 'caution' | null = null
    let detectedThrustType: 'advice' | 'caution' | null = null

    for (const advice of thrustAdvices) {
      if (
        simulatorData.position_pri >= advice.min &&
        simulatorData.position_pri <= advice.max
      ) {
        thrustAlertNow = true
        detectedThrustType = advice.type
      }
    }

    for (const advice of angleAdvices) {
      if (
        simulatorData.angle_pri >= advice.minAngle &&
        simulatorData.angle_pri <= advice.maxAngle
      ) {
        angleAlertNow = true
        detectedAngleType = advice.type
      }
    }

    // Log new thrust alert
    if (thrustAlertNow && !alertActive.current.thrust) {
      alertActive.current.thrust = true
      lastAlertTime.current.thrust = Date.now()
      alertTypeRef.current.thrust = detectedThrustType
      firstResponseTime.current.thrust = null
    }
    // Log new angle alert
    if (angleAlertNow && !alertActive.current.angle) {
      alertActive.current.angle = true
      lastAlertTime.current.angle = Date.now()
      alertTypeRef.current.angle = detectedAngleType
      firstResponseTime.current.angle = null
    }
  }, [simulatorData, thrustAdvices, angleAdvices, isLogging])

  // ** Capture T2 (Operator Response)**
  useEffect(() => {
    if (!isLogging) return

    const currentTime = Date.now()

    // Thrust response
    if (
      alertActive.current.thrust &&
      firstResponseTime.current.thrust === null
    ) {
      firstResponseTime.current.thrust = currentTime
    }

    // Angle response
    if (alertActive.current.angle && firstResponseTime.current.angle === null) {
      firstResponseTime.current.angle = currentTime
    }
  }, [simulatorData, isLogging])

  // ** Capture T3 (Exit Alert Zone)**
  useEffect(() => {
    if (!isLogging) return

    const currentTime = new Date().toISOString()

    // Check if thrust alert exits
    if (
      alertActive.current.thrust &&
      !thrustAdvices.some(
        (advice) =>
          simulatorData.position_pri >= advice.min &&
          simulatorData.position_pri <= advice.max
      )
    ) {
      alertActive.current.thrust = false
      const exitTime = Date.now() - (lastAlertTime.current.thrust ?? 0)

      // Store in a single log with alertCategory = "thrust"
      setLogData((prevData) => [
        ...prevData,
        {
          timestamp: currentTime,
          thrust: simulatorData.position_pri,
          azimuthAngle: simulatorData.angle_pri,
          reactionTime: firstResponseTime.current.thrust
            ? firstResponseTime.current.thrust -
              (lastAlertTime.current.thrust ?? 0)
            : null,
          exitTime: exitTime,
          alertType: alertTypeRef.current.thrust,
          alertCategory: 'thrust'
        }
      ])

      lastAlertTime.current.thrust = null
      firstResponseTime.current.thrust = null
    }

    // Check if angle alert exits
    if (
      alertActive.current.angle &&
      !angleAdvices.some(
        (advice) =>
          simulatorData.angle_pri >= advice.minAngle &&
          simulatorData.angle_pri <= advice.maxAngle
      )
    ) {
      alertActive.current.angle = false
      const exitTime = Date.now() - (lastAlertTime.current.angle ?? 0)

      // Store in a single log with alertCategory = "angle"
      setLogData((prevData) => [
        ...prevData,
        {
          timestamp: currentTime,
          thrust: simulatorData.position_pri,
          azimuthAngle: simulatorData.angle_pri,
          reactionTime: firstResponseTime.current.angle
            ? firstResponseTime.current.angle -
              (lastAlertTime.current.angle ?? 0)
            : null,
          exitTime: exitTime,
          alertType: alertTypeRef.current.angle,
          alertCategory: 'angle'
        }
      ])

      lastAlertTime.current.angle = null
      firstResponseTime.current.angle = null
    }
  }, [simulatorData, isLogging, thrustAdvices, angleAdvices])

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
        className={`scenario-button ${isLogging ? 'stop' : 'start'}`}
      >
        {isLogging ? 'Stop scenario' : 'Start scenario'}
      </button>
    </div>
  )
}
