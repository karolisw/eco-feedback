import { ObcInstrumentField } from '@oicl/openbridge-webcomponents-react/navigation-instruments/instrument-field/instrument-field'
import { InstrumentFieldSize } from '@oicl/openbridge-webcomponents/dist/navigation-instruments/instrument-field/instrument-field'
import '../styles/dashboard.css'

type InstrumentFieldProps = {
  value?: number
  setPoint?: number
  hasSetPoint?: boolean
  degree?: boolean
  maxDigits?: number
  fractionDigits?: number
  tag?: string
  unit?: string
  source?: string
  hasSource?: boolean
  size?: InstrumentFieldSize | undefined
}

export function InstrumentField({
  value = 0,
  setPoint = 0,
  hasSetPoint = false,
  degree = false,
  maxDigits = 3,
  fractionDigits = 0,
  tag = '',
  unit = '',
  source = '',
  hasSource = false,
  size = InstrumentFieldSize.small
}: InstrumentFieldProps) {
  return (
    <div className="instrument-field">
      <ObcInstrumentField
        setpoint={setPoint}
        hasSetpoint={hasSetPoint}
        value={value}
        degree={degree}
        maxDigits={maxDigits}
        fractionDigits={fractionDigits}
        tag={tag}
        unit={unit}
        source={source}
        hasSource={hasSource}
        size={size}
      ></ObcInstrumentField>
    </div>
  )
}
