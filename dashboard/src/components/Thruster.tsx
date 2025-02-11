// Import thruster from
import { ObcThruster } from '@oicl/openbridge-webcomponents-react/navigation-instruments/thruster/thruster'
import '../styles/dashboard.css'
// Create Thruster and thrust props
type ThrusterProps = {
  thrust: number //  The thrust of the thruster in percent (0-100)
}

// Create Thruster component
export function Thruster({ thrust }: ThrusterProps) {
  return (
    <div className="dashboard-component">
      <ObcThruster thrust={thrust}></ObcThruster>
    </div>
  )
}
