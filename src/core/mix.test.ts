import { describe, expect, it } from 'vitest';
import { hexToOklab, oklabToLch, type Hex } from './color.ts';
import { describeRecipe, mixRecipe, partsToShare, ratioToParts, tints, withWhite, type Recipe } from './mix.ts';
import { PAINTS, WHITE, parsePaintId, type PaintId } from './paints.ts';

const id = (s: string): PaintId => {
  const parsed = parsePaintId(s);
  if (!parsed) throw new Error(`no paint ${s}`);
  return parsed;
};
const mix = (...parts: [string, number][]): Hex => mixRecipe(parts.map(([p, n]) => ({ paintId: id(p), parts: n })));
const lch = (hex: Hex) => oklabToLch(hexToOklab(hex));
const masstone = (p: string) => mix([p, 1]);

// OKLab hue families, bounded by the hues of sRGB primaries/secondaries (red 29, yellow 110, cyan 195).
const GREEN: [number, number] = [115, 185];
const ORANGE: [number, number] = [35, 80];
const PURPLE: [number, number] = [285, 355];
const BLUE: [number, number] = [240, 285];

describe('paint catalog', () => {
  it('has unique ids and exactly one white and one black', () => {
    expect(new Set(PAINTS.map((p) => p.id)).size).toBe(PAINTS.length);
    expect(PAINTS.filter((p) => p.role === 'white')).toHaveLength(1);
    expect(PAINTS.filter((p) => p.role === 'black')).toHaveLength(1);
  });
});

describe('mixRecipe', () => {
  it('returns the masstone for a single paint', () => {
    for (const p of PAINTS) expect(mixRecipe([{ paintId: p.id, parts: 3 }]), p.name).toBe(p.hex);
  });

  it('is order independent and scale invariant', () => {
    expect(mix(['ultramarine-blue', 1], ['cadmium-yellow-medium', 2])).toBe(
      mix(['cadmium-yellow-medium', 2], ['ultramarine-blue', 1]),
    );
    expect(mix(['burnt-sienna', 2], ['titanium-white', 2])).toBe(mix(['burnt-sienna', 1], ['titanium-white', 1]));
  });

  it('mixes ultramarine and cadmium yellow into a green', () => {
    expect(lch(mix(['ultramarine-blue', 1], ['cadmium-yellow-medium', 1])).h).toSatisfy(inRange(GREEN));
  });

  it('mixes cadmium red and cadmium yellow into an orange', () => {
    expect(lch(mix(['cadmium-red-light', 1], ['cadmium-yellow-medium', 1])).h).toSatisfy(inRange(ORANGE));
  });

  it('mixes a red and a blue into a muted purple', () => {
    const purple = lch(mix(['alizarin-crimson', 1], ['ultramarine-blue', 1]));
    expect(purple.h).toSatisfy(inRange(PURPLE));
    expect(purple.C).toBeLessThan(Math.min(lch(masstone('alizarin-crimson')).C, lch(masstone('ultramarine-blue')).C));
  });

  it('mixes burnt sienna and ultramarine into a near-black', () => {
    const dark = lch(mix(['burnt-sienna', 1], ['ultramarine-blue', 1]));
    expect(dark.L).toBeLessThan(Math.min(lch(masstone('burnt-sienna')).L, lch(masstone('ultramarine-blue')).L));
    expect(dark.C).toBeLessThan(0.03);
  });

  it('desaturates a color mixed with its complement', () => {
    for (const [a, b] of [
      ['cadmium-red-medium', 'phthalo-green'],
      ['ultramarine-blue', 'cadmium-orange'],
      ['dioxazine-purple', 'hansa-yellow-light'],
    ]) {
      const parents = Math.min(lch(masstone(a)).C, lch(masstone(b)).C);
      expect(lch(mix([a, 1], [b, 1])).C, `${a} + ${b}`).toBeLessThan(parents * 0.7);
    }
  });

  it('lightens ultramarine 1:1 with white into a light blue', () => {
    const tint = lch(mix(['ultramarine-blue', 1], ['titanium-white', 1]));
    expect(tint.L).toBeGreaterThanOrEqual(0.55);
    expect(tint.L).toBeLessThanOrEqual(0.85);
    expect(tint.h).toSatisfy(inRange(BLUE));
  });

  it('keeps one part white from swamping three parts of a dark color', () => {
    const tint = lch(mix(['ultramarine-blue', 3], ['titanium-white', 1]));
    expect(tint.L).toBeLessThan(0.55);
    expect(tint.C).toBeGreaterThan(0.12);
  });

  it('gives phthalos more tinting strength than earths: white closes more of an earth gap to white', () => {
    const whiteL = lch(WHITE.hex).L;
    const lift = (p: string) => {
      const L = lch(masstone(p)).L;
      return (lch(mix([p, 1], ['titanium-white', 4])).L - L) / (whiteL - L);
    };
    const phthaloLift = Math.max(lift('phthalo-blue'), lift('phthalo-green'));
    for (const earth of PAINTS.filter((p) => p.role === 'earth')) {
      expect(lift(earth.id), earth.name).toBeGreaterThan(phthaloLift);
    }
  });
});

describe('describeRecipe', () => {
  it('reads like a painter recipe', () => {
    const recipe: Recipe = [
      { paintId: id('ultramarine-blue'), parts: 3 },
      { paintId: id('cadmium-yellow-medium'), parts: 1 },
      { paintId: WHITE.id, parts: 2.5 },
    ];
    expect(describeRecipe(recipe)).toBe(
      '3 parts Ultramarine Blue + 1 part Cadmium Yellow Medium + 2.5 parts Titanium White',
    );
  });
});

describe('tints', () => {
  it('gets lighter with each extra part of white', () => {
    const recipe: Recipe = [{ paintId: id('burnt-umber'), parts: 1 }];
    const ls = tints(recipe, [1, 2, 4, 8, 16]).map((h) => lch(h).L);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1]);
  });

  it('adds to white already in the recipe', () => {
    const recipe: Recipe = [
      { paintId: id('burnt-umber'), parts: 1 },
      { paintId: WHITE.id, parts: 1 },
    ];
    expect(withWhite(recipe, 2)).toEqual([
      { paintId: id('burnt-umber'), parts: 1 },
      { paintId: WHITE.id, parts: 3 },
    ]);
    expect(tints(recipe, [2])[0]).toBe(mix(['burnt-umber', 1], ['titanium-white', 3]));
  });
});

describe('ratioToParts', () => {
  const a = id('ultramarine-blue');
  const b = id('burnt-sienna');

  it('gives the minority paint one part', () => {
    expect(ratioToParts(a, b, 0.75)).toEqual([
      { paintId: a, parts: 3 },
      { paintId: b, parts: 1 },
    ]);
    expect(ratioToParts(a, b, 0.2)).toEqual([
      { paintId: a, parts: 1 },
      { paintId: b, parts: 4 },
    ]);
    expect(ratioToParts(a, b, 0.5)).toEqual([
      { paintId: a, parts: 1 },
      { paintId: b, parts: 1 },
    ]);
  });

  it('round-trips through partsToShare', () => {
    for (const share of [0.1, 0.25, 0.5, 0.8, 0.9]) {
      const [pa, pb] = ratioToParts(a, b, share);
      expect(partsToShare(pa.parts, pb.parts)).toBeCloseTo(share, 2);
    }
  });
});

function inRange([lo, hi]: [number, number]) {
  return (h: number) => h >= lo && h <= hi;
}
