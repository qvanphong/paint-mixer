import { describe, expect, it } from 'vitest';
import { hexToHsv, hexToOklab, parseHex, type Hex } from './color.ts';
import { HARMONY_RULES, paletteFor, suggestPalettes } from './harmony.ts';
import { hueToWheel, wheelToHue, type WheelMode } from './wheel.ts';

const hex = (s: string): Hex => parseHex(s)!;

// HSV hue families on screen.
const families: Record<string, [number, number]> = {
  green: [90, 160],
  orange: [15, 45],
  violet: [260, 310],
};
const hueOf = (h: Hex) => hexToHsv(h).h;
const isIn = ([lo, hi]: [number, number]) => (h: number) => h >= lo && h <= hi;

describe('color wheels', () => {
  it('round-trips hue through both wheels', () => {
    for (const mode of ['ryb', 'rgb'] as WheelMode[]) {
      for (let h = 0; h < 360; h += 7.5) expect(wheelToHue(hueToWheel(h, mode), mode)).toBeCloseTo(h, 9);
    }
  });

  it('places red, yellow and blue 120 degrees apart on the RYB wheel', () => {
    expect(hueToWheel(hueOf(hex('#FF0000')), 'ryb')).toBeCloseTo(0);
    expect(hueToWheel(hueOf(hex('#FFFF00')), 'ryb')).toBeCloseTo(120);
    expect(hueToWheel(hueOf(hex('#0000FF')), 'ryb')).toBeCloseTo(240);
  });
});

describe('suggestPalettes', () => {
  const complement = (main: string, wheel: WheelMode) => paletteFor(hex(main), 'complementary', wheel).colors[1];

  it('pairs painter complements on the RYB wheel', () => {
    expect(hueOf(complement('#E02020', 'ryb'))).toSatisfy(isIn(families.green));
    expect(hueOf(complement('#2040C0', 'ryb'))).toSatisfy(isIn(families.orange));
    expect(hueOf(complement('#F0D020', 'ryb'))).toSatisfy(isIn(families.violet));
  });

  it('pairs screen complements on the RGB wheel', () => {
    expect(hueOf(complement('#FF0000', 'rgb'))).toBeCloseTo(180);
  });

  it('keeps the main color first and rotates hue without changing HSV saturation and value', () => {
    const main = hex('#C0392B');
    const { s, v } = hexToHsv(main);
    for (const rule of ['analogous', 'complementary', 'split-complementary', 'triadic', 'tetradic'] as const) {
      const { colors } = paletteFor(main, rule, 'ryb');
      expect(colors[0]).toBe(main);
      for (const c of colors) {
        expect(hexToHsv(c).s).toBeCloseTo(s, 1);
        expect(hexToHsv(c).v).toBeCloseTo(v, 1);
      }
    }
  });

  it('builds monochromatic tints and shades that get lighter and darker', () => {
    const main = hex('#2B57A8');
    const L = (h: Hex) => hexToOklab(h)[0];
    const tints = paletteFor(main, 'monochromatic', 'ryb').colors.map(L);
    const shades = paletteFor(main, 'shades', 'ryb').colors.map(L);
    for (let i = 1; i < tints.length; i++) expect(tints[i]).toBeGreaterThan(tints[i - 1]);
    for (let i = 1; i < shades.length; i++) expect(shades[i]).toBeLessThan(shades[i - 1]);
  });

  it('returns one palette per rule with only valid hex colors', () => {
    for (const main of ['#C0392B', '#808080', '#000000', '#FFFFFF', '#3E1F5C']) {
      for (const wheel of ['ryb', 'rgb'] as WheelMode[]) {
        const palettes = suggestPalettes(hex(main), wheel);
        expect(palettes.map((p) => p.rule)).toEqual(HARMONY_RULES);
        for (const p of palettes) {
          expect(p.colors.length).toBeGreaterThanOrEqual(2);
          for (const c of p.colors) expect(parseHex(c)).toBe(c);
        }
      }
    }
  });
});
