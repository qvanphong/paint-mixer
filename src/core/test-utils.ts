import type { Recipe } from './mix.ts';
import { PAINTS, WHITE } from './paints.ts';

/** Deterministic PRNG (mulberry32) so failures reproduce. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A recipe inside the formula finder's search space: 1-3 non-white paints, optional white, at most 12 parts. */
export function randomRecipe(rand: () => number): Recipe {
  const pool = PAINTS.filter((p) => p.role !== 'white');
  const count = 1 + Math.floor(rand() * 3);
  const chosen = new Set<number>();
  while (chosen.size < count) chosen.add(Math.floor(rand() * pool.length));
  const ids = [...chosen].map((i) => pool[i].id);
  if (rand() < 0.5) ids.push(WHITE.id);
  let budget = 12 - ids.length;
  return ids.map((paintId) => {
    const extra = Math.floor(rand() * (budget + 1) * 0.6);
    budget -= extra;
    return { paintId, parts: 1 + extra };
  });
}
