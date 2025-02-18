import { DashboardData } from './types'
export {}

declare global {
  interface Window {
    azimuthControllerData: DashboardData
  }
}
