import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from './color.ts';
import { mixHex } from './engine.ts';

const hex = (s: string): Hex => parseHex(s)!;

describe('mixHex', () => {
  it('treats parts as linear volumes (calibrated against the reference mixer)', () => {
    const blue = hex('#1C3A94');
    const yellow = hex('#F7E11B');
    expect(mixHex([{ hex: blue, tinting: 1, parts: 1 }, { hex: yellow, tinting: 1, parts: 1 }])).toBe('#69A245');
    expect(mixHex([{ hex: blue, tinting: 1, parts: 4 }, { hex: yellow, tinting: 1, parts: 1 }])).toBe('#35784E');
  });

  it('returns a lone color unchanged', () => {
    expect(mixHex([{ hex: hex('#8A3F22'), tinting: 0.7, parts: 3 }])).toBe('#8A3F22');
  });
});
