export const RATIO_CHIPS: readonly (readonly [number, number])[] = [
  [4, 1],
  [3, 1],
  [2, 1],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
];

/** The ratio slider runs 1:9 to 9:1. Steps of 0.05 so every key press changes the parts ratio. */
export const SHARE_MIN = 0.1;
export const SHARE_MAX = 0.9;
export const SHARE_STEP = 0.05;

/** Does a:b equal the chip's x:y? Compared as ratios, so 8:2 matches 4:1. */
export function isRatio(a: number, b: number, [x, y]: readonly [number, number]): boolean {
  return Math.abs(a / b - x / y) < 0.01;
}

/** Whole numbers print bare, anything else with one decimal: 3, 2.5. */
export function formatNumber(n: number): string {
  return String(Math.round(n * 10) / 10);
}
