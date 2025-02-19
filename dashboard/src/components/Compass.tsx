import { ObcCompass } from '@oicl/openbridge-webcomponents-react/navigation-instruments/compass/compass'
import '../styles/dashboard.css'

type CompassProps = {
  heading: number // The heading of the vessel in degrees
  courseOverGround: number | undefined // The setpoint of the heading in degrees
  headingAdvices: []
}

export function Compass({
  heading,
  courseOverGround,
  headingAdvices
}: CompassProps) {
  return (
    <div className="dashboard-component">
      <ObcCompass
        heading={heading}
        courseOverGround={courseOverGround}
        headingAdvices={headingAdvices}
      ></ObcCompass>
    </div>
  )
}
