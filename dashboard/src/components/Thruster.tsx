//import { ObcThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/thruster/thruster'
import { ObcAzimuthThrusterLabeled } from '@oicl/openbridge-webcomponents-react/navigation-instruments/azimuth-thruster-labeled/azimuth-thruster-labeled'

type ThrusterProps = {
  thrust: number //  The thrust of the thruster in percent (0-100)
  angle: number // The angle of the propeller (?)
  setPoint: number | undefined // The setpoint of the thruster in percent (0-100)
  touching: boolean // Whether the thruster is being touched by the operator'
  atThrustSetpoint: boolean // Whether the thruster is at the setpoint
  atAngleSetpoint: boolean // Whether the angle is at the setpoint
}

export function Thruster({
  thrust,
  angle,
  setPoint,
  touching,
  atThrustSetpoint,
  atAngleSetpoint
}: ThrusterProps) {
  return (
    <div>
      <ObcAzimuthThrusterLabeled
        thrust={thrust}
        angle={angle}
        thrustSetpoint={setPoint}
        touching={touching}
        atThrustSetpoint={atThrustSetpoint}
        atAngleSetpoint={atAngleSetpoint}
      ></ObcAzimuthThrusterLabeled>
    </div>
  )
}
