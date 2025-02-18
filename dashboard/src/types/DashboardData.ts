export type DashboardData = {
    currentThrust: number
    currentAngle: number
    consumption: number
    currentEmissions: number
    ecoScore: number
  }

  export type SimulatorData = {
    heading: number
    speed: number
    rpm: number
    xPos: number
    yPos: number
    resistance: number
    consumptionRate: number
    consumedTotal: number
    checkpoints: number
    angle: number
    power: number
  }