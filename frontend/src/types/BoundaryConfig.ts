export interface BoundaryConfig {
    enabled: boolean
    boundary: number // Strength (e.g., 1–3)
    type: 'angle' | 'thrust'
    lower: number
    upper: number
  }