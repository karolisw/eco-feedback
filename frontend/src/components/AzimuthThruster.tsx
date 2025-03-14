//import { ObcThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/thruster/thruster'
//import { ObcAzimuthThrusterLabeled } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster-labeled/azimuth-thruster-labeled'
import { ObcAzimuthThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster/azimuth-thruster'
import '../styles/dashboard.css'
import { AngleAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/watch/advice'
import { LinearAdvice } from '@oicl/openbridge-webcomponents/src/navigation-instruments/thruster/advice'

type AzimuthThrusterProps = {
  thrust: number //  The thrust of the thruster in percent (0-100)
  angle: number // The angle of the propeller (?)
  thrustSetPoint: number | undefined // Undefined means that there is no setpoint
  angleSetpoint: number | undefined
  touching: boolean // Whether the thruster is being touched by the operator'
  atThrustSetpoint: boolean // Whether the thruster is at the setpoint
  atAngleSetpoint: boolean // Whether the angle is at the setpoint
  onSetPointChange: (type: 'thrust' | 'angle', value: number) => void // Callback function
  angleAdvices: AngleAdvice[]
  thrustAdvices: LinearAdvice[]
}

export function AzimuthThruster({
  thrust,
  angle,
  thrustSetPoint = 0,
  angleSetpoint = 0,
  touching,
  atThrustSetpoint,
  atAngleSetpoint,
  angleAdvices,
  thrustAdvices,
  onSetPointChange
}: AzimuthThrusterProps) {
  return (
    <div className="azimuth-thruster">
      <ObcAzimuthThruster
        thrust={thrust}
        angle={angle}
        angleSetpoint={angleSetpoint}
        thrustSetpoint={thrustSetPoint}
        touching={touching}
        atThrustSetpoint={atThrustSetpoint}
        atAngleSetpoint={atAngleSetpoint}
        thrustAdvices={thrustAdvices}
        angleAdvices={angleAdvices}
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
