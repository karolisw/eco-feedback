//import { ObcThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/thruster/thruster'
//import { ObcAzimuthThrusterLabeled } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster-labeled/azimuth-thruster-labeled'
import { ObcAzimuthThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster/azimuth-thruster'
import '../styles/dashboard.css'

type AzimuthThrusterProps = {
  thrust: number //  The thrust of the thruster in percent (0-100)
  angle: number // The angle of the propeller (?)
  thrustSetPoint: number | undefined // Undefined means that there is no setpoint
  angleSetpoint: number | undefined
  touching: boolean // Whether the thruster is being touched by the operator'
  atThrustSetpoint: boolean // Whether the thruster is at the setpoint
  atAngleSetpoint: boolean // Whether the angle is at the setpoint
  onSetPointChange: (type: 'thrust' | 'angle', value: number) => void // Callback function
}

export function AzimuthThruster({
  thrust,
  angle,
  thrustSetPoint = 0,
  angleSetpoint = 0,
  touching,
  atThrustSetpoint,
  atAngleSetpoint,
  onSetPointChange
}: AzimuthThrusterProps) {
  return (
    <div className="dashboard-component">
      <ObcAzimuthThruster
        thrust={thrust}
        angle={angle}
        angleSetpoint={angleSetpoint}
        thrustSetpoint={thrustSetPoint}
        touching={touching}
        atThrustSetpoint={atThrustSetpoint}
        atAngleSetpoint={atAngleSetpoint}
      ></ObcAzimuthThruster>
      <div className="setpoint-controls">
        <label>Thrust Setpoint</label>
        <input
          type="range"
          min="-100"
          max="100"
          value={thrustSetPoint}
          onChange={(e) => onSetPointChange('thrust', Number(e.target.value))}
        />
        <label>Angle Setpoint</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={angleSetpoint}
          onChange={(e) => onSetPointChange('angle', Number(e.target.value))}
        />
      </div>
    </div>
  )
}
