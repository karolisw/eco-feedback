import React from 'react'
import '../styles/setpointSliders.css'

type SetpointSlidersProps = {
  thrustSetpoint: number
  angleSetpoint: number
  onSetPointChange: (type: 'thrust' | 'angle', value: number) => void
}

export function SetpointSliders({
  thrustSetpoint,
  angleSetpoint,
  onSetPointChange
}: SetpointSlidersProps) {
  return (
    <div className="setpoint-container">
      <h3>Setpoints</h3>

      <div className="setpoint-slider">
        <label>
          Thrust Setpoint: <span>{thrustSetpoint}%</span>
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={thrustSetpoint}
          onChange={(e) => onSetPointChange('thrust', Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="setpoint-slider">
        <label>
          Angle Setpoint: <span>{angleSetpoint}°</span>
        </label>
        <input
          type="range"
          min="-180"
          max="180"
          value={angleSetpoint}
          onChange={(e) => onSetPointChange('angle', Number(e.target.value))}
          className="slider"
        />
      </div>
    </div>
  )
}
