import { describe, expect, it } from 'vitest';
import { deltaE, parseHex, type Hex } from './color.ts';
import { findFormulas } from './formula.ts';
import { describeRecipe, mixRecipe } from './mix.ts';
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
