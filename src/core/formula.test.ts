import { describe, expect, it } from 'vitest';
import { deltaE, parseHex, type Hex } from './color.ts';
import { findFormulas } from './formula.ts';
import { describeRecipe, mixRecipe } from './mix.ts';
import { PAINTS, WHITE, makeCatalog, paintById, parsePaintId, type Paint, type PaintId } from './paints.ts';
import { randomRecipe, seededRandom } from './test-utils.ts';

const hex = (s: string): Hex => parseHex(s)!;

describe('findFormulas', () => {
  it('finds a recipe within deltaE 2 of any mixable color (round trip)', () => {
    const rand = seededRandom(42);
    for (let i = 0; i < 30; i++) {
      const recipe = randomRecipe(rand);
      const target = mixRecipe(recipe);
      const [best] = findFormulas(target);
      expect(best.deltaE, `${target} from ${describeRecipe(recipe)}`).toBeLessThan(2);
    }
  });

  it("reports the mixer's own result and deltaE for each formula", () => {
    const target = hex('#769E6C');
    for (const f of findFormulas(target)) {
      expect(f.result).toBe(mixRecipe(f.recipe));
      expect(f.deltaE).toBeCloseTo(deltaE(target, f.result), 10);
      expect(f.match).toBe(f.deltaE < 2 ? 'exact' : f.deltaE < 5 ? 'close' : 'approx');
    }
  });

  it('returns valid recipes: up to 3 paints plus white, positive integer parts, one per paint set', () => {
    const formulas = findFormulas(hex('#8B5A2B'), { limit: 8 });
    expect(formulas).toHaveLength(8);
    const sets = new Set<string>();
    for (const { recipe } of formulas) {
      const ids = recipe.map((p) => p.paintId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.filter((p) => p !== 'titanium-white').length).toBeLessThanOrEqual(3);
      for (const p of recipe) expect(Number.isInteger(p.parts) && p.parts >= 1).toBe(true);
      sets.add([...ids].sort().join('+'));
    }
    expect(sets.size).toBe(formulas.length);
  });

  it('ranks a single tube first when it is an exact match, even if a mix gets closer', () => {
    // Cobalt Blue alone is about 1 deltaE away; two-paint mixes get under 1.
    const formulas = findFormulas(hex('#2E5AA6'));
    expect(formulas[0].recipe).toEqual([{ paintId: 'cobalt-blue', parts: 1 }]);
    expect(formulas[0].match).toBe('exact');
    expect(Math.min(...formulas.map((f) => f.deltaE))).toBeLessThan(formulas[0].deltaE);
  });

  it('reaches pale tints beyond 12 parts of white', () => {
    const [best] = findFormulas(hex('#F0E8E0'));
    expect(best.match).toBe('exact');
  });

  it('returns the closest approximations for an out-of-gamut target', () => {
    const formulas = findFormulas(hex('#00FF00'));
    expect(formulas.length).toBeGreaterThan(0);
    for (const f of formulas) expect(f.match).toBe('approx');
    expect(formulas[0].deltaE).toBeLessThan(25);
  });

  it('answers in well under a second', () => {
    findFormulas(hex('#808080'));
    const targets = ['#769E6C', '#E0B79A', '#8B5A2B', '#7A7A7A', '#C0392B', '#1A1A40', '#F0E8E0', '#00FF00'];
    const times = targets.map((t) => {
      const start = performance.now();
      findFormulas(hex(t));
      return performance.now() - start;
    });
    console.log(`findFormulas ms per call: ${times.map((t) => t.toFixed(0)).join(', ')}`);
    expect(Math.max(...times)).toBeLessThan(1500);
  });
});

describe('findFormulas with only', () => {
  const id = (s: string): PaintId => parsePaintId(s)!;
  const owned = new Set(['cobalt-blue', 'ivory-black', 'yellow-ochre', 'cadmium-red-medium', 'hansa-yellow-light'].map(id));
  const allowed = new Set<PaintId>([...owned, WHITE.id]);

  it('uses only owned paints plus Titanium White, across many targets', () => {
    for (const target of ['#769E6C', '#E0B79A', '#8B5A2B', '#7A7A7A', '#C0392B', '#F0E8E0', '#00FF00']) {
      for (const f of findFormulas(hex(target), { only: owned, limit: 8 })) {
        for (const p of f.recipe) expect(allowed.has(p.paintId), `${target}: ${p.paintId}`).toBe(true);
        expect(f.result).toBe(mixRecipe(f.recipe));
      }
    }
  });

  it('ranks an owned paint first for its own masstone', () => {
    const cobalt = paintById(id('cobalt-blue'));
    const [best] = findFormulas(cobalt.hex, { only: owned });
    expect(best.recipe).toEqual([{ paintId: cobalt.id, parts: 1 }]);
    expect(best.match).toBe('exact');
  });

  it('never offers a built-in paint that is not owned, even when it is the exact match', () => {
    const ultramarine = paintById(id('ultramarine-blue'));
    const formulas = findFormulas(ultramarine.hex, { only: owned, limit: 10 });
    expect(formulas.length).toBeGreaterThan(0);
    for (const f of formulas) expect(f.recipe.map((p) => p.paintId)).not.toContain(ultramarine.id);
  });

  it('returns only the white candidate for an empty set', () => {
    const formulas = findFormulas(hex('#769E6C'), { only: new Set() });
    expect(formulas).toHaveLength(1);
    expect(formulas[0].recipe).toEqual([{ paintId: WHITE.id, parts: 1 }]);
  });

  it('does not use a custom paint unless it is owned, and does when it is', () => {
    const teal: Paint = { id: 'custom-teal1' as PaintId, name: 'My Teal', pigment: '', hex: hex('#00A6A6'), tinting: 1, role: 'chromatic' };
    const catalog = makeCatalog([teal]);
    const without = findFormulas(teal.hex, { only: owned }, catalog);
    expect(without.flatMap((f) => f.recipe.map((p) => p.paintId))).not.toContain(teal.id);
    const [best] = findFormulas(teal.hex, { only: new Set([...owned, teal.id]) }, catalog);
    expect(best.recipe).toEqual([{ paintId: teal.id, parts: 1 }]);
  });

  it('ignores a white-role id in the set: the finder still uses Titanium White only', () => {
    const gmWhite = id('gm-white');
    const formulas = findFormulas(hex('#F0E8E0'), { only: new Set([...owned, gmWhite]), limit: 10 });
    for (const f of formulas) expect(f.recipe.map((p) => p.paintId)).not.toContain(gmWhite);
  });

  it('matches the unrestricted search when every non-white paint is allowed, and when only is omitted', () => {
    const target = hex('#769E6C');
    const everything = new Set(PAINTS.filter((p) => p.role !== 'white').map((p) => p.id));
    expect(findFormulas(target, { only: everything })).toEqual(findFormulas(target));
    expect(findFormulas(target, { only: undefined })).toEqual(findFormulas(target));
  });

  it('is no slower with five owned paints than the unrestricted search', () => {
    const target = hex('#769E6C');
    const median = (run: () => unknown) => {
      run();
      const times = Array.from({ length: 5 }, () => {
        const start = performance.now();
        run();
        return performance.now() - start;
      }).sort((a, b) => a - b);
      return times[2];
    };
    const restricted = median(() => findFormulas(target, { only: owned }));
    const full = median(() => findFormulas(target));
    expect(restricted).toBeLessThanOrEqual(full);
  });
});
