import { useEffect, useRef } from 'react'
import { BoundaryConfig } from '../types/BoundaryConfig'


interface UseBoundaryFeedbackProps {
  config: BoundaryConfig[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToBackend: (message: any) => void
}

export function useBoundaryFeedback({ config, sendToBackend }: UseBoundaryFeedbackProps) {
    const sentRef = useRef<string>('')

  useEffect(() => {
    const serialized = JSON.stringify(config)
    if (sentRef.current === serialized) return // skip repeat sends of the same boundaries

    if (!config || config.length === 0) return

    config.forEach((boundary) => {
      const command = {
        command: 'set_boundary',
        enable: boundary.enabled,
        boundary: boundary.boundary,
        type: boundary.type,
        lower: boundary.lower,
        upper: boundary.upper
      }

      sendToBackend(command)
    })
    sentRef.current = serialized

  }, [config, sendToBackend])
}
