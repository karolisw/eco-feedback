import { ObcThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/thruster/thruster'

type ThrusterProps = {
  thrust: number //  The thrust of the thruster in percent (0-100)
  setPoint: number | undefined // The setpoint of the thruster in percent (0-100)
  touching: boolean // Whether the thruster is being touched by the operator'
  atSetpoint: boolean // Whether the thruster is at the setpoint
}

export function Thruster({
  thrust,
  setPoint,
  atSetpoint,
  touching
}: ThrusterProps) {
  return (
    <div>
      <ObcThruster
        thrust={thrust}
        setpoint={setPoint}
        touching={touching}
        atSetpoint={atSetpoint}
      ></ObcThruster>
    </div>
  )
}
