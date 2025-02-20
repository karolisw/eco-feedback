export function gramsToKiloGrams(grams: number) {
  return grams / 1000
}

/**
 * If the value is negative, add 360 until it is positive
 * If the value is positive and smaller than 360, no need to do anything
 * If the value is positive and greater than 360, we need to subtract 360 until it is smaller than 360
 *
 * @param value a number from the simulator that needs to be converted to a heading
 * @returns a number between 0 and 360
 */
export function toHeading(value: number): number {
  return (value + 360) % 360
}

// Calculate averages
export function calculateAverage(arr: number[]) {
  return arr.length
    ? arr.reduce((sum, value) => sum + value, 0) / arr.length
    : 0
}
