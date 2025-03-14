// Uses the rudder OICL component to display the direction value it receives from the Dashboard page.

import { ObcRudder } from '@oicl/openbridge-webcomponents-react/navigation-instruments/rudder/rudder'
import '../styles/dashboard.css'

type RudderProps = {
  angle: number
}

export function Rudder({ angle }: RudderProps) {
  return (
    <div className="dashboard-component">
      <ObcRudder
        angle={angle}
        maxAngle={90}
        autoAtSetpointDeadband={2}
      ></ObcRudder>
    </div>
  )
}
