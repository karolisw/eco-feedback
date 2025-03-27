import { useEffect } from 'react'
import { BoundaryConfig } from '../types/BoundaryConfig'


interface UseBoundaryFeedbackProps {
  config: BoundaryConfig[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToBackend: (message: any) => void
}

export function useBoundaryFeedback({ config, sendToBackend }: UseBoundaryFeedbackProps) {
  useEffect(() => {
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

      console.log('[Boundary] Sending boundary update:', command)
      sendToBackend(command)
    })
  }, [config, sendToBackend])
}
