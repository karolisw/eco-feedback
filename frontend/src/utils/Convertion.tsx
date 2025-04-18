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

// Newtons to kiloNewtons
export function newtonsToKiloNewtons(newtons: number) {
  return newtons / 1000
}

// Negative angle to real angle
// If the angle is returned (from modbus) as a negative number 'x', the real angle 'y' can be found like this:
// y = x + 360
// Example: -90 degrees is the same as 270 degrees, because -90 + 360 = 270
export function negativeAngleToRealAngle(angle: number) {
  return angle < 0 ? 360 + angle : angle
}
