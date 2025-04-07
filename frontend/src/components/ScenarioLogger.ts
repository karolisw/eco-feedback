import { useEffect, useRef } from 'react'
import { LogEntry } from '../types/LogEntry'
import { saveAs } from 'file-saver'
import * as Papa from 'papaparse'
import '../styles/dashboard.css'
import { BoundaryConfig } from '../types/BoundaryConfig'

interface ScenarioLoggerProps {
  simulatorData: { thrust: number; angle: number }
  simulationRunning: boolean
  boundaryConfig: BoundaryConfig[]
  isLogging: boolean
  logData: LogEntry[]
  setLogData: (updater: (prev: LogEntry[]) => LogEntry[]) => void
  configFileName: string
  selectedScenario: string
  thrustAdvices: {
    min: number
    max: number
    type: 'advice' | 'caution'
  }[]
  angleAdvices: {
    minAngle: number
    maxAngle: number
    type: 'advice' | 'caution'
  }[]
}
export function ScenarioLogger({
  simulatorData,
  simulationRunning,
  isLogging,
  logData,
  setLogData,
  configFileName,
  thrustAdvices,
  angleAdvices,
  boundaryConfig,
  selectedScenario
}: ScenarioLoggerProps) {
  const lastAlertTime = useRef<{ thrust: number | null; angle: number | null }>(
    {
      thrust: null,
      angle: null
    }
  )

  const firstResponseTime = useRef<{
    thrust: number | null
    angle: number | null
  }>({
    thrust: null,
    angle: null
  })

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

  const boundaryActive = useRef<boolean>(false)
  const boundaryEnterTime = useRef<number | null>(null)


  // T1: Enter alert zone
  useEffect(() => {
    if (!isLogging) return

    let thrustAlert = false
    let angleAlert = false
    let thrustType: 'advice' | 'caution' | null = null
    let angleType: 'advice' | 'caution' | null = null

    for (const advice of thrustAdvices) {
      if (
        simulatorData.thrust >= advice.min &&
        simulatorData.thrust <= advice.max
      ) {
        thrustAlert = true
        thrustType = advice.type
      }
    }

    for (const advice of angleAdvices) {
      if (
        simulatorData.angle >= advice.minAngle &&
        simulatorData.angle <= advice.maxAngle
      ) {
        angleAlert = true
        angleType = advice.type
      }
    }

    if (thrustAlert && !alertActive.current.thrust) {
      alertActive.current.thrust = true
      lastAlertTime.current.thrust = Date.now()
      alertTypeRef.current.thrust = thrustType
      firstResponseTime.current.thrust = null
    }

    if (angleAlert && !alertActive.current.angle) {
      alertActive.current.angle = true
      lastAlertTime.current.angle = Date.now()
      alertTypeRef.current.angle = angleType
      firstResponseTime.current.angle = null
    }

    const inBoundary = boundaryConfig.some((b) => {
      if (!b.enabled) return false
      if (b.type === 'thrust') {
        return simulatorData.thrust >= b.lower && simulatorData.thrust <= b.upper
      }
      if (b.type === 'angle') {
        return simulatorData.angle >= b.lower && simulatorData.angle <= b.upper
      }
      return false
    })
    
    if (inBoundary && !boundaryActive.current) {
      console.log('Boundary entered')
      boundaryActive.current = true
      boundaryEnterTime.current = Date.now()
    
      const now = new Date().toISOString()
    
      setLogData((prev) => [
        ...prev,
        {
          timestamp: now,
          thrust: simulatorData.thrust,
          azimuthAngle: simulatorData.angle,
          reactionTime: null,
          exitTime: null,
          alertType: 'boundary',
          alertCategory: undefined,
          scenario: selectedScenario
        }
      ])
    }
    
  }, [simulatorData, thrustAdvices, angleAdvices, isLogging, boundaryConfig, setLogData, selectedScenario])

  // T2: Operator responds
  useEffect(() => {
    if (!isLogging) return
    const now = Date.now()

    if (
      alertActive.current.thrust &&
      firstResponseTime.current.thrust == null
    ) {
      firstResponseTime.current.thrust = now
    }

    if (alertActive.current.angle && firstResponseTime.current.angle == null) {
      firstResponseTime.current.angle = now
    }
  }, [simulatorData, isLogging])

  // T3: Exit alert zone
  useEffect(() => {
    if (!isLogging) return

    const now = new Date().toISOString()

    // Thrust exit
    const stillInThrustZone = thrustAdvices.some(
      (advice) =>
        simulatorData.thrust >= advice.min && simulatorData.thrust <= advice.max
    )
    if (alertActive.current.thrust && !stillInThrustZone) {
      alertActive.current.thrust = false
      const t1 = lastAlertTime.current.thrust ?? 0
      const t2 = firstResponseTime.current.thrust
      const reactionTime = t2 != null ? t2 - t1 : null
      const exitTime = Date.now() - t1

      setLogData((prev: LogEntry[]) => [
        ...prev,
        {
          timestamp: now,
          thrust: simulatorData.thrust,
          azimuthAngle: simulatorData.angle,
          reactionTime,
          exitTime,
          alertType: alertTypeRef.current.thrust,
          alertCategory: 'thrust',
          scenario: selectedScenario
        }
      ])

      lastAlertTime.current.thrust = null
      firstResponseTime.current.thrust = null
    }

    // Angle exit
    const stillInAngleZone = angleAdvices.some(
      (advice) =>
        simulatorData.angle >= advice.minAngle &&
        simulatorData.angle <= advice.maxAngle
    )
    if (alertActive.current.angle && !stillInAngleZone) {
      alertActive.current.angle = false
      const t1 = lastAlertTime.current.angle ?? 0
      const t2 = firstResponseTime.current.angle
      const reactionTime = t2 != null ? t2 - t1 : null
      const exitTime = Date.now() - t1

      setLogData((prev) => [
        ...prev,
        {
          timestamp: now,
          thrust: simulatorData.thrust,
          azimuthAngle: simulatorData.angle,
          reactionTime,
          exitTime,
          alertType: alertTypeRef.current.angle,
          alertCategory: 'angle',
          scenario: selectedScenario
        }
      ])

      lastAlertTime.current.angle = null
      firstResponseTime.current.angle = null
    }
    const stillInBoundary = boundaryConfig.some((b) => {
      if (!b.enabled) return false
      if (b.type === 'thrust') {
        return simulatorData.thrust >= b.lower && simulatorData.thrust <= b.upper
      }
      if (b.type === 'angle') {
        return simulatorData.angle >= b.lower && simulatorData.angle <= b.upper
      }
      return false
    })
    
    if (boundaryActive.current && !stillInBoundary) {
      boundaryActive.current = false
    
      const enter = boundaryEnterTime.current ?? 0
      const exitTime = Date.now() - enter
    
      setLogData((prev) => [
        ...prev,
        {
          timestamp: now,
          thrust: simulatorData.thrust,
          azimuthAngle: simulatorData.angle,
          reactionTime: null,
          exitTime,
          alertType: 'boundary',
          alertCategory: 'thrust',
          scenario: selectedScenario
        }
      ])
    
      boundaryEnterTime.current = null
    }
  }, [simulatorData, isLogging, angleAdvices, thrustAdvices, setLogData, selectedScenario, boundaryConfig])

  // Export on stop
  useEffect(() => {
    if (!simulationRunning && isLogging && logData.length > 0) {
      const csv = Papa.unparse(logData)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const fileName = `log-${new Date().toISOString()}-${configFileName}`
      saveAs(blob, fileName)
      console.log('Scenario CSV exported.')
    }
  }, [simulationRunning, isLogging, logData, configFileName])

  return null // Logic-only component
}
