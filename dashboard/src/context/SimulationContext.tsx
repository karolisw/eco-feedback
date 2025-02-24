import { createContext } from 'react'
import { SimulationContextType } from '../types/SimulationContext'

export const SimulationContext = createContext<
  SimulationContextType | undefined
>(undefined)
