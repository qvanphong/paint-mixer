import { linearRgbToOklab, type Oklab } from './color.ts';
import { kmProfile, linearRgbMatrix, SPECTRUM_SIZE } from './engine.ts';
import type { Paint } from './paints.ts';

export interface FastPaint {
  /** K/S per wavelength pre-multiplied by the paint's weight. */
  weightedKs: Float64Array;
  weight: number;
}

const profiles = new Map<string, FastPaint>();

export function fastPaint(paint: Paint): FastPaint {
  let fp = profiles.get(paint.id);
  if (!fp) {
    const { ks, weight } = kmProfile(paint.hex, paint.tinting);
    fp = { weightedKs: ks.map((k) => k * weight), weight };
    profiles.set(paint.id, fp);
  }
  return fp;
}

const N = SPECTRUM_SIZE;

/**
 * spectral.js's Kubelka-Munk mix of paints[i] x parts[i] for i < count, without its per-call
 * Color construction, 8-bit rounding and gamut search (out-of-gamut is clipped instead).
 * For the formula finder's inner loop only; shown results must come from mixRecipe.
 */
export function fastMixOklab(paints: readonly FastPaint[], parts: readonly number[], count: number): Oklab {
  const m = linearRgbMatrix();
  let total = 0;
  for (let k = 0; k < count; k++) total += parts[k] * paints[k].weight;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < N; i++) {
    let ks = 0;
    for (let k = 0; k < count; k++) ks += parts[k] * paints[k].weightedKs[i];
    ks /= total;
    const refl = 1 + ks - Math.sqrt(ks * ks + 2 * ks);
    r += m[i] * refl;
    g += m[N + i] * refl;
    b += m[2 * N + i] * refl;
  }
  const clip = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  return linearRgbToOklab(clip(r), clip(g), clip(b));
}
