import spectral from 'spectral.js';
import { parseHex, type Hex } from './color.ts';

type SpectralColor = InstanceType<typeof spectral.Color>;

export interface MixInput {
  hex: Hex;
  tinting: number;
  parts: number;
}

const colorCache = new Map<string, SpectralColor>();

function colorFor(hex: Hex, tinting: number): SpectralColor {
  const key = `${hex}/${tinting}`;
  let color = colorCache.get(key);
  if (!color) {
    if (colorCache.size > 512) colorCache.clear();
    color = new spectral.Color(hex);
    color.tintingStrength = tinting;
    colorCache.set(key, color);
  }
  return color;
}

/** Kubelka-Munk mix. `parts` are linear volumes: spectral.js squares its factor, so it gets sqrt(parts). */
export function mixHex(inputs: readonly MixInput[]): Hex {
  if (inputs.length === 0) throw new Error('mixHex needs at least one input');
  const mixed = spectral.mix(
    ...inputs.map((i): [SpectralColor, number] => [colorFor(i.hex, i.tinting), Math.sqrt(i.parts)]),
  );
  const hex = parseHex(mixed.toString());
  if (!hex) throw new Error(`spectral.js returned a non-hex color: ${mixed.toString()}`);
  return hex;
}

export const SPECTRUM_SIZE = 38;

/** What the fast mixer needs per pigment: spectral.js mixes K/S weighted by tinting^2 * luminance. */
export interface KmProfile {
  ks: Float64Array;
  weight: number;
}

export function kmProfile(hex: Hex, tinting: number): KmProfile {
  const color = colorFor(hex, tinting);
  return { ks: Float64Array.from(color.KS), weight: tinting ** 2 * color.luminance };
}

let reflectanceToLinearRgb: Float64Array | undefined;

/**
 * Row-major 3 x SPECTRUM_SIZE matrix taking a reflectance spectrum to linear sRGB.
 * spectral.js does not export its colour-matching functions, but R -> lRGB is linear,
 * so probing it with unit spectra recovers the exact matrix it uses.
 */
export function linearRgbMatrix(): Float64Array {
  if (reflectanceToLinearRgb) return reflectanceToLinearRgb;
  const m = new Float64Array(3 * SPECTRUM_SIZE);
  for (let i = 0; i < SPECTRUM_SIZE; i++) {
    const unit = new Array<number>(SPECTRUM_SIZE).fill(0);
    unit[i] = 1;
    const lrgb = new spectral.Color(unit).lRGB;
    for (let c = 0; c < 3; c++) m[c * SPECTRUM_SIZE + i] = lrgb[c];
  }
  reflectanceToLinearRgb = m;
  return m;
}
