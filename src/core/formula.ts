import { deltaE, deltaEOklab, hexToOklab, type Hex, type Oklab } from './color.ts';
import { fastMixOklab, fastPaint, type FastPaint } from './fastmix.ts';
import { mixRecipe, type Recipe } from './mix.ts';
import { BUILTIN_CATALOG, WHITE, type Catalog, type Paint, type PaintId } from './paints.ts';

export type MatchQuality = 'exact' | 'close' | 'approx';

export interface Formula {
  recipe: Recipe;
  result: Hex;
  deltaE: number;
  match: MatchQuality;
}

export interface FindFormulasOptions {
  /** Number of formulas to return. Default 5. */
  limit?: number;
  /**
   * Restrict the tubes to these paints. Titanium White stays available either way. An empty set leaves only
   * the white candidate, so callers should check for it first.
   */
  only?: ReadonlySet<PaintId>;
}

const MAX_TOTAL_PARTS = 12;
/** Paints that seed the 3-paint stage, ranked by their best single or pair result. */
const BEAM_PAINTS = 10;
/** White amounts tried past the 12-part cap, so pale tints ("a touch of sienna in white") are reachable. */
const EXTRA_WHITE_STEPS = [14, 16, 20, 24, 30, 36, 48, 60];

export function matchQuality(dE: number): MatchQuality {
  return dE < 2 ? 'exact' : dE < 5 ? 'close' : 'approx';
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Every way to split at most MAX_TOTAL_PARTS into `k` positive integer parts, keeping only
 * reduced ratios: 2:2 mixes the same color as 1:1.
 */
function compositions(k: number): number[][] {
  const out: number[][] = [];
  const walk = (prefix: number[], remaining: number) => {
    if (prefix.length === k) {
      if (prefix.reduce(gcd) === 1) out.push(prefix);
      return;
    }
    const slotsLeft = k - prefix.length - 1;
    for (let p = 1; p <= remaining - slotsLeft; p++) walk([...prefix, p], remaining - p);
  };
  walk([], MAX_TOTAL_PARTS);
  return out;
}

const COMPOSITIONS: readonly (readonly number[][])[] = [[], compositions(1), compositions(2), compositions(3), compositions(4)];

/** The best ratio found for one paint set; white, when present, is last. */
interface Candidate {
  dE: number;
  paints: readonly Paint[];
  parts: readonly number[];
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Below the "exact" threshold the eye cannot pick a winner, so the simpler recipe ranks first;
 * above it, deltaE decides and simplicity only breaks ties at display precision.
 */
function compareFormulas(a: { dE: number; n: number; total: number }, b: { dE: number; n: number; total: number }): number {
  const tier = (dE: number) => (dE < 2 ? 0 : Math.round(dE * 10));
  return tier(a.dE) - tier(b.dE) || a.n - b.n || a.total - b.total || a.dE - b.dE;
}

class Search {
  readonly candidates: Candidate[] = [];
  private readonly target: Oklab;
  private readonly fast: FastPaint[] = [];

  constructor(target: Oklab) {
    this.target = target;
  }

  /** Records the best ratio of `paints` alone and of `paints` plus white. Returns the better deltaE. */
  run(paints: readonly Paint[]): number {
    const k = paints.length;
    for (let i = 0; i < k; i++) this.fast[i] = fastPaint(paints[i]);
    this.fast[k] = fastPaint(WHITE);
    const plain = this.best(paints, COMPOSITIONS[k]);
    const white = this.extendWhite(this.best([...paints, WHITE], COMPOSITIONS[k + 1]));
    this.candidates.push(plain, white);
    return Math.min(plain.dE, white.dE);
  }

  private mix(parts: readonly number[], count: number): number {
    return deltaEOklab(this.target, fastMixOklab(this.fast, parts, count));
  }

  private best(paints: readonly Paint[], comps: readonly number[][]): Candidate {
    let bestDE = Infinity;
    let bestParts = comps[0];
    for (const parts of comps) {
      const dE = this.mix(parts, paints.length);
      if (dE < bestDE) {
        bestDE = dE;
        bestParts = parts;
      }
    }
    return { dE: bestDE, paints, parts: bestParts };
  }

  private extendWhite(c: Candidate): Candidate {
    const w = c.parts.length - 1;
    if (sum(c.parts) < MAX_TOTAL_PARTS || c.parts[w] < Math.max(...c.parts.slice(0, w))) return c;
    let best = c;
    const parts = [...c.parts];
    for (const white of EXTRA_WHITE_STEPS) {
      parts[w] = white;
      const dE = this.mix(parts, parts.length);
      if (dE < best.dE) best = { dE, paints: c.paints, parts: [...parts] };
    }
    return best;
  }
}

/** Largest share first, white last, so the recipe reads the way a painter would mix it. */
function toRecipe({ paints, parts }: Candidate): Recipe {
  return paints
    .map((p, i) => ({ paintId: p.id, parts: parts[i], white: p.role === 'white' }))
    .sort((a, b) => Number(a.white) - Number(b.white) || b.parts - a.parts)
    .map(({ paintId, parts: n }) => ({ paintId, parts: n }));
}

/**
 * The simplest recipes (up to 3 paints plus white, small integer parts) whose Kubelka-Munk
 * mix lands closest to `target`. Exhaustive over single paints and pairs; triples come only
 * from the BEAM_PAINTS paints that did best alone or in a pair. One formula per paint set:
 * other ratios of the same paints are the same advice, tuned.
 */
export function findFormulas(target: Hex, opts: FindFormulasOptions = {}, catalog: Catalog = BUILTIN_CATALOG): Formula[] {
  const limit = opts.limit ?? 5;
  const search = new Search(hexToOklab(target));
  search.candidates.push({ dE: deltaE(target, WHITE.hex), paints: [WHITE], parts: [1] });

  const { only } = opts;
  const tubes = catalog.paints.filter((p) => p.role !== 'white' && (!only || only.has(p.id)));
  const bestByPaint = new Map<Paint, number>();
  const note = (p: Paint, dE: number) => bestByPaint.set(p, Math.min(bestByPaint.get(p) ?? Infinity, dE));
  for (const a of tubes) note(a, search.run([a]));
  for (let i = 0; i < tubes.length; i++) {
    for (let j = i + 1; j < tubes.length; j++) {
      const dE = search.run([tubes[i], tubes[j]]);
      note(tubes[i], dE);
      note(tubes[j], dE);
    }
  }

  const beam = [...bestByPaint].sort((a, b) => a[1] - b[1]).slice(0, BEAM_PAINTS).map(([p]) => p);
  for (let i = 0; i < beam.length; i++) {
    for (let j = i + 1; j < beam.length; j++) {
      for (let k = j + 1; k < beam.length; k++) search.run([beam[i], beam[j], beam[k]]);
    }
  }

  return search.candidates
    .map((c) => ({ c, dE: c.dE, n: c.paints.length, total: sum(c.parts) }))
    .sort(compareFormulas)
    .slice(0, limit * 3)
    .map(({ c }) => {
      const recipe = toRecipe(c);
      const result = mixRecipe(recipe, catalog);
      const dE = deltaE(target, result);
      return { formula: { recipe, result, deltaE: dE, match: matchQuality(dE) }, dE, n: recipe.length, total: sum(c.parts) };
    })
    .sort(compareFormulas)
    .slice(0, limit)
    .map(({ formula }): Formula => formula);
}
