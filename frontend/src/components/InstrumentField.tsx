import { useState, useEffect } from 'react'
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
  hasSource = false
}: InstrumentFieldProps) {
  const [instrumentSize, setInstrumentSize] = useState<InstrumentFieldSize>(
    InstrumentFieldSize.small
  )

  // Listening for changes in window size
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth

      if (width < 1200) {
        setInstrumentSize(InstrumentFieldSize.small)
      } else if (width >= 1200 && width < 1600) {
        setInstrumentSize(InstrumentFieldSize.regular)
      } else {
        setInstrumentSize(InstrumentFieldSize.large)
      }
    }

    updateSize() // Call once initially
    window.addEventListener('resize', updateSize)

    return () => window.removeEventListener('resize', updateSize)
  }, [])

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
        size={instrumentSize}
      ></ObcInstrumentField>
    </div>
  )
}
