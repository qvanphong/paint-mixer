import { describe, expect, it } from 'vitest';
import { deltaE, hexToHsv, hexToOklab, hsvToHex, luminance, oklabToHex, parseHex, toHex, type Hex } from './color.ts';

const hex = (s: string): Hex => parseHex(s)!;

describe('parseHex', () => {
  it('accepts 3 and 6 digit hex with or without # and normalizes to uppercase #RRGGBB', () => {
    expect(parseHex('#abc')).toBe('#AABBCC');
    expect(parseHex('a1b2c3')).toBe('#A1B2C3');
    expect(parseHex('  #A1B2C3 ')).toBe('#A1B2C3');
  });

  it('rejects anything else', () => {
    for (const bad of ['', '#12', '#12345', '#1234567', 'red', '#GGGGGG', 'rgb(0,0,0)']) expect(parseHex(bad)).toBeNull();
  });
});

describe('conversions', () => {
  it('clamps and rounds channels in toHex', () => {
    expect(toHex(-5, 127.6, 300)).toBe('#0080FF');
  });

  it('round-trips through OKLab and HSV', () => {
    for (const s of ['#000000', '#FFFFFF', '#C0392B', '#769E6C', '#1C3A94', '#F7E11B', '#808080']) {
      expect(oklabToHex(hexToOklab(hex(s)))).toBe(s);
      expect(hsvToHex(hexToHsv(hex(s)))).toBe(s);
    }
  });

  it('puts OKLab lightness at 0 for black and 1 for white', () => {
    expect(hexToOklab(hex('#000000'))[0]).toBeCloseTo(0, 5);
    expect(hexToOklab(hex('#FFFFFF'))[0]).toBeCloseTo(1, 3);
  });

  it('reads HSV hue of the primaries', () => {
    expect(hexToHsv(hex('#FF0000')).h).toBe(0);
    expect(hexToHsv(hex('#00FF00')).h).toBe(120);
    expect(hexToHsv(hex('#0000FF')).h).toBe(240);
  });
});

describe('deltaE', () => {
  it('is zero for identical colors, symmetric, and about 100 between black and white', () => {
    expect(deltaE(hex('#123456'), hex('#123456'))).toBe(0);
    expect(deltaE(hex('#C0392B'), hex('#769E6C'))).toBeCloseTo(deltaE(hex('#769E6C'), hex('#C0392B')), 12);
    expect(deltaE(hex('#000000'), hex('#FFFFFF'))).toBeCloseTo(100, 0);
  });
});

describe('luminance', () => {
  it('follows WCAG relative luminance', () => {
    expect(luminance(hex('#000000'))).toBe(0);
    expect(luminance(hex('#FFFFFF'))).toBeCloseTo(1, 10);
    expect(luminance(hex('#808080'))).toBeCloseTo(0.2159, 3);
  });
});
