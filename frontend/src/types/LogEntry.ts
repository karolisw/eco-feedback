export interface LogEntry {
    timestamp: string;
    thrust: number;
    azimuthAngle: number;
    reactionTime?: number | null;
    exitTime?: number | null;
    alertType?: 'advice' | 'caution' | null;
    alertCategory?: 'thrust' | 'angle';
  }