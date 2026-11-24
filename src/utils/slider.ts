/** The shadcn Slider reports a number or an array of thumb values; these sliders have one thumb. */
export function firstValue(value: number | readonly number[]): number {
  return typeof value === 'number' ? value : value[0]
}
