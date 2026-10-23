export type WheelMode = 'ryb' | 'rgb';

// Itten's painter wheel puts red, yellow and blue 120 degrees apart. Each RYB anchor maps to
// the screen (HSV) hue of that color, so complements land where painters expect them:
// red opposite green, blue opposite orange, yellow opposite violet.
const RYB_ANCHORS = [0, 60, 120, 180, 240, 300, 360];
const HSV_ANCHORS = [0, 30, 60, 120, 240, 280, 360];

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

function remap(deg: number, from: readonly number[], to: readonly number[]): number {
  const x = wrap(deg);
  let i = 1;
  while (x > from[i]) i++;
  const t = (x - from[i - 1]) / (from[i] - from[i - 1]);
  return wrap(to[i - 1] + t * (to[i] - to[i - 1]));
}

/** Screen (HSV) hue to an angle on the chosen wheel, both in degrees. */
export function hueToWheel(hue: number, mode: WheelMode): number {
  return mode === 'rgb' ? wrap(hue) : remap(hue, HSV_ANCHORS, RYB_ANCHORS);
}

/** Angle on the chosen wheel back to a screen (HSV) hue. */
export function wheelToHue(angle: number, mode: WheelMode): number {
  return mode === 'rgb' ? wrap(angle) : remap(angle, RYB_ANCHORS, HSV_ANCHORS);
}
