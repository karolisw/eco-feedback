export type DashboardData = {
  position_pri: number
  position_sec: number
  angle_pri: number
  angle_sec: number
  pos_setpoint_pri: number
  pos_setpoint_sec: number
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
