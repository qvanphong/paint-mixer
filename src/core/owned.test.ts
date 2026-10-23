import { describe, expect, it } from 'vitest';
import {
  NO_OWNED,
  OWNED_KEY,
  loadOwned,
  ownedTubes,
  ownedWith,
  ownedWithout,
  parseOwned,
  saveOwned,
  type OwnedPaints,
} from './owned.ts';
import { makeCatalog, parsePaintId, type Paint, type PaintId } from './paints.ts';
import { parseHex } from './color.ts';
import type { StorageLike } from './presets.ts';

const id = (s: string): PaintId => parsePaintId(s)!;
const BLUE = id('cobalt-blue');
const BLACK = id('ivory-black');
const OCHRE = id('yellow-ochre');
const WHITE = id('titanium-white');

const teal: Paint = {
  id: 'custom-teal1' as PaintId,
  name: 'My Teal',
  pigment: '',
  hex: parseHex('#00A6A6')!,
  tinting: 1,
  role: 'chromatic',
};
const catalog = makeCatalog([teal]);

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

const stored = (value: unknown) => memoryStorage({ [OWNED_KEY]: JSON.stringify(value) });

describe('loadOwned', () => {
  it('defaults to disabled and empty when nothing is stored', () => {
    expect(loadOwned(memoryStorage(), catalog)).toEqual({ enabled: false, ids: [] });
  });

  it('round-trips through saveOwned, custom paints included', () => {
    const storage = memoryStorage();
    const owned: OwnedPaints = { enabled: true, ids: [BLUE, teal.id, BLACK] };
    expect(saveOwned(storage, owned)).toBe(true);
    expect(JSON.parse(storage.data[OWNED_KEY])).toEqual({ version: 1, enabled: true, ids: [BLUE, teal.id, BLACK] });
    expect(loadOwned(storage, catalog)).toEqual(owned);
  });

  it('drops ids that are not in the catalog and duplicates, keeping first-seen order', () => {
    const storage = stored({ version: 1, enabled: true, ids: [BLUE, 'nope', BLACK, BLUE, 7, null, 'custom-gone', teal.id] });
    expect(loadOwned(storage, catalog)).toEqual({ enabled: true, ids: [BLUE, BLACK, teal.id] });
  });

  it('drops a custom id when the catalog no longer has that paint', () => {
    const storage = stored({ version: 1, enabled: true, ids: [BLUE, teal.id] });
    expect(loadOwned(storage).ids).toEqual([BLUE]);
  });

  it.each([
    ['unparseable text', 'not json{'],
    ['a different version', JSON.stringify({ version: 2, enabled: true, ids: [BLUE] })],
    ['a non-boolean flag', JSON.stringify({ version: 1, enabled: 'yes', ids: [BLUE] })],
    ['ids that are not a list', JSON.stringify({ version: 1, enabled: true, ids: BLUE })],
    ['a bare array', JSON.stringify([BLUE])],
    ['null', 'null'],
  ])('falls back to the default for %s', (_name, text) => {
    expect(loadOwned(memoryStorage({ [OWNED_KEY]: text }), catalog)).toEqual(NO_OWNED);
  });

  it('does not throw when reading storage throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
    };
    expect(loadOwned(broken, catalog)).toEqual(NO_OWNED);
  });
});

describe('saveOwned', () => {
  it('returns false when storage throws', () => {
    const full: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(saveOwned(full, { enabled: true, ids: [BLUE] })).toBe(false);
  });
});

describe('parseOwned', () => {
  it('returns null for a wrong shape so callers can tell corrupt data from an empty set', () => {
    expect(parseOwned({ version: 1, enabled: false, ids: [] }, catalog)).toEqual({ enabled: false, ids: [] });
    expect(parseOwned(undefined, catalog)).toBeNull();
  });
});

describe('owned helpers', () => {
  it('lists owned non-white paints in catalog order, ignoring unknown ids', () => {
    const ids = [teal.id, WHITE, OCHRE, BLUE, 'custom-gone' as PaintId];
    expect(ownedTubes(ids, catalog).map((p) => p.id)).toEqual([OCHRE, BLUE, teal.id]);
  });

  it('adds an id once and removes it when present, returning the same object for a no-op', () => {
    const owned: OwnedPaints = { enabled: true, ids: [BLUE] };
    expect(ownedWith(owned, teal.id)).toEqual({ enabled: true, ids: [BLUE, teal.id] });
    expect(ownedWith(owned, BLUE)).toBe(owned);
    expect(ownedWithout(owned, BLUE)).toEqual({ enabled: true, ids: [] });
    expect(ownedWithout(owned, teal.id)).toBe(owned);
  });
});
