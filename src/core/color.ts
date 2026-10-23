export type Hex = string & { readonly __brand: 'Hex' };

export type Oklab = readonly [L: number, a: number, b: number];
export interface Hsv {
  h: number; // degrees [0, 360)
  s: number; // [0, 1]
  v: number; // [0, 1]
}

const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;

/** Parses '#RGB', '#RRGGBB' (with or without '#', any case) into a canonical uppercase '#RRGGBB'. */
export function parseHex(input: string): Hex | null {
  const s = input.trim();
  const long = HEX6.exec(s);
  if (long) return `#${long[1].toUpperCase()}` as Hex;
  const short = HEX3.exec(s);
  if (short) {
    const [r, g, b] = short[1].toUpperCase();
    return `#${r}${r}${g}${g}${b}${b}` as Hex;
  }
  return null;
}

/** Channels in 0..255; clamped and rounded. */
export function toHex(r: number, g: number, b: number): Hex {
  const byte = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x)))
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase() as Hex;
}

export function hexToRgb(hex: Hex): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function hexToOklab(hex: Hex): Oklab {
  const [r, g, b] = hexToRgb(hex).map((c) => srgbToLinear(c / 255));
  return linearRgbToOklab(r, g, b);
}

/** Out-of-gamut values are clipped per channel. */
export function oklabToHex([L, a, b]: Oklab): Hex {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [r, g, bl] = lin.map((c) => linearToSrgb(Math.min(1, Math.max(0, c))) * 255);
  return toHex(r, g, bl);
}

/** OKLab chroma and hue angle in degrees [0, 360). */
export function oklabToLch([L, a, b]: Oklab): { L: number; C: number; h: number } {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

export function hexToHsv(hex: Hex): Hsv {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): Hex {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const sector: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = sector[Math.floor(hh) % 6];
  const m = v - c;
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Perceptual distance: euclidean OKLab distance scaled by 100 (about 2 is a just-noticeable difference). */
export function deltaE(a: Hex, b: Hex): number {
  return deltaEOklab(hexToOklab(a), hexToOklab(b));
}

export function deltaEOklab(a: Oklab, b: Oklab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100;
}

/** WCAG relative luminance in [0, 1]. */
export function luminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
