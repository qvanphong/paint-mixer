import { describe, expect, it } from 'vitest';
import { makeCatalog, parseHex, parsePaintId, type Paint, type PaintId } from '../core/index.ts';
import { selectableIds, toggled, withAll, withoutAll } from './ownedDraft.ts';

const blue = parsePaintId('cobalt-blue')!;
const black = parsePaintId('ivory-black')!;

describe('toggled', () => {
  it('adds a missing id and removes a present one without touching the input', () => {
    const start = new Set<PaintId>([blue]);
    expect([...toggled(start, black)]).toEqual([blue, black]);
    expect([...toggled(start, blue)]).toEqual([]);
    expect([...start]).toEqual([blue]);
  });
});

describe('selectableIds', () => {
  it('lists every non-white catalog paint, custom ones included', () => {
    const custom: Paint = { id: 'custom-a1' as PaintId, name: 'A', pigment: '', hex: parseHex('#112233')!, tinting: 1, role: 'chromatic' };
    const customWhite: Paint = { ...custom, id: 'custom-w1' as PaintId, role: 'white' };
    const catalog = makeCatalog([custom, customWhite]);
    const ids = selectableIds(catalog);
    expect(ids).toContain(custom.id);
    expect(ids).toContain(blue);
    expect(ids).not.toContain(customWhite.id);
    expect(ids).not.toContain(parsePaintId('titanium-white')!);
    expect(ids.every((id) => catalog.byId(id)?.role !== 'white')).toBe(true);
  });
});

describe('withAll and withoutAll', () => {
  it('add or remove only the given ids and leave the input alone', () => {
    const start = new Set<PaintId>([blue]);
    expect([...withAll(start, [black, blue])].sort()).toEqual([black, blue].sort());
    expect([...withoutAll(new Set([blue, black]), [black])]).toEqual([blue]);
    expect([...start]).toEqual([blue]);
  });

  it('leave selections outside the given ids untouched, as when a search narrows the list', () => {
    const start = new Set<PaintId>([blue, black]);
    expect([...withoutAll(start, [])].sort()).toEqual([black, blue].sort());
    expect([...withAll(start, [])].sort()).toEqual([black, blue].sort());
  });
});
