import { describe, expect, it } from 'vitest';
import { PAINTS } from '../core/index.ts';
import { filterPaints, matchesQuery } from './paintSearch.ts';

const names = (query: string) => filterPaints(PAINTS, query).map((p) => p.name);

describe('filterPaints', () => {
  it('returns every paint for an empty or blank query', () => {
    expect(filterPaints(PAINTS, '')).toHaveLength(PAINTS.length);
    expect(filterPaints(PAINTS, '   ')).toHaveLength(PAINTS.length);
  });

  it('matches names ignoring case', () => {
    expect(names('ULTRAMARINE')).toContain('Ultramarine Blue');
    expect(names('ultramarine')).not.toContain('Cadmium Red Light');
  });

  it('matches pigment codes', () => {
    expect(names('pb29')).toContain('Ultramarine Blue');
    expect(names('PB15:3').length).toBeGreaterThan(0);
  });

  it('requires every word but not in order', () => {
    expect(names('blue ultramarine')).toEqual(['Ultramarine Blue']);
    expect(names('cadmium zzz')).toEqual([]);
  });

  it('ignores accents on both sides', () => {
    expect(matchesQuery({ name: 'Rouge Écarlate', pigment: '' }, 'ecarlate')).toBe(true);
    expect(matchesQuery({ name: 'Rouge Ecarlate', pigment: '' }, 'écarlate')).toBe(true);
  });

  it('keeps catalog order and does not modify its input', () => {
    const before = [...PAINTS];
    const hits = filterPaints(PAINTS, 'blue');
    expect(hits).toEqual(PAINTS.filter((p) => hits.includes(p)));
    expect(PAINTS).toEqual(before);
  });
});
