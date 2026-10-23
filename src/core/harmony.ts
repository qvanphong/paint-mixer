import { hexToHsv, hsvToHex, type Hex } from './color.ts';
import { mixHex } from './engine.ts';
import { BLACK, WHITE, type Paint } from './paints.ts';
import { hueToWheel, wheelToHue, type WheelMode } from './wheel.ts';

export type HarmonyRule =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'
  | 'shades';

export interface Palette {
  rule: HarmonyRule;
  /** colors[0] is always the main color. */
  colors: readonly Hex[];
}

type HueRule = Exclude<HarmonyRule, 'monochromatic' | 'shades'>;

const HUE_OFFSETS: Record<HueRule, readonly number[]> = {
  analogous: [0, -30, 30],
  complementary: [0, 180],
  'split-complementary': [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

/** main:paint ratios; mixed through Kubelka-Munk so every swatch is reachable in real paint. */
const TINT_STEPS: readonly [number, number][] = [
  [1, 1],
  [1, 3],
  [1, 8],
  [1, 20],
];
const SHADE_STEPS: readonly [number, number][] = [
  [16, 1],
  [6, 1],
  [2, 1],
  [1, 1],
];

export const HARMONY_RULES: readonly HarmonyRule[] = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'shades',
];

function mixSteps(main: Hex, paint: Paint, steps: readonly [number, number][]): Hex[] {
  return steps.map(([m, p]) =>
    mixHex([
      { hex: main, tinting: 1, parts: m },
      { hex: paint.hex, tinting: paint.tinting, parts: p },
    ]),
  );
}

/** Rotates the main color's hue on the chosen wheel, keeping its HSV saturation and value. */
function rotate(main: Hex, offset: number, wheel: WheelMode): Hex {
  if (offset === 0) return main;
  const { h, s, v } = hexToHsv(main);
  return hsvToHex({ h: wheelToHue(hueToWheel(h, wheel) + offset, wheel), s, v });
}

export function paletteFor(main: Hex, rule: HarmonyRule, wheel: WheelMode): Palette {
  switch (rule) {
    case 'monochromatic':
      return { rule, colors: [main, ...mixSteps(main, WHITE, TINT_STEPS)] };
    case 'shades':
      return { rule, colors: [main, ...mixSteps(main, BLACK, SHADE_STEPS)] };
    default:
      return { rule, colors: HUE_OFFSETS[rule].map((offset) => rotate(main, offset, wheel)) };
  }
}

export function suggestPalettes(main: Hex, wheel: WheelMode): Palette[] {
  return HARMONY_RULES.map((rule) => paletteFor(main, rule, wheel));
}
