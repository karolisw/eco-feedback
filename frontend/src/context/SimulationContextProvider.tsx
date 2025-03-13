import { ReactNode, useState } from 'react'
import { SimulationContext } from './SimulationContext'

export function SimulationContextProvider({
  children
}: {
  children: ReactNode
}) {
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false)

  return (
    <SimulationContext.Provider
      value={{ simulationRunning, setSimulationRunning }}
    >
      {children}
    </SimulationContext.Provider>
  )
}
