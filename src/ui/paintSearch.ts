import type { Paint } from '../core/index.ts';

type Searchable = Pick<Paint, 'name' | 'pigment'>;

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Every whitespace-separated word of the query must appear in the name or pigment code, in any order. */
export function matchesQuery(paint: Searchable, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(`${paint.name} ${paint.pigment}`);
  return words.every((word) => haystack.includes(word));
}

export function filterPaints<T extends Searchable>(paints: readonly T[], query: string): T[] {
  return paints.filter((paint) => matchesQuery(paint, query));
}
