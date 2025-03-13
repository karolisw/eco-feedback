import { useContext } from 'react'
import { SimulationContext } from '../context/SimulationContext'

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}
