import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from './color.ts';
import { makeCatalog, parsePaintId, type Paint, type PaintId } from './paints.ts';
import { PRESETS_KEY, loadPresets, savePresets, type Preset, type StorageLike } from './presets.ts';

const hex = (s: string): Hex => parseHex(s)!;
const id = (s: string): PaintId => parsePaintId(s)!;

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const color: Preset = { id: 'a', name: 'Sky', createdAt: 1, kind: 'color', hex: hex('#87CEEB') };
const recipe: Preset = {
  id: 'b',
  name: 'Olive',
  createdAt: 2,
  kind: 'recipe',
  hex: hex('#769540'),
  recipe: [
    { paintId: id('ultramarine-blue'), parts: 1 },
    { paintId: id('cadmium-yellow-medium'), parts: 1.5 },
  ],
};

describe('presets', () => {
  it('round-trips saved presets', () => {
    const storage = memoryStorage();
    expect(savePresets(storage, [color, recipe])).toBe(true);
    expect(loadPresets(storage)).toEqual([color, recipe]);
  });

  it('starts empty when nothing is stored', () => {
    expect(loadPresets(memoryStorage())).toEqual([]);
  });

  it('returns [] for corrupt or foreign data instead of throwing', () => {
    for (const blob of ['not json', 'null', '[]', '{"version":2,"presets":[]}', '{"version":1,"presets":{}}']) {
      expect(loadPresets(memoryStorage({ [PRESETS_KEY]: blob })), blob).toEqual([]);
    }
  });

  it('drops corrupt records and keeps the good ones', () => {
    const bad = [
      { ...color, id: 'no-hex', hex: 'blue' },
      { ...color, id: '' },
      { ...color, id: 'bad-kind', kind: 'gradient' },
      { ...color, id: 'bad-date', createdAt: 'yesterday' },
      { ...recipe, id: 'unknown-paint', recipe: [{ paintId: 'unobtainium', parts: 1 }] },
      { ...recipe, id: 'zero-parts', recipe: [{ paintId: 'ultramarine-blue', parts: 0 }] },
      { ...recipe, id: 'dup-paint', recipe: [recipe.recipe[0], recipe.recipe[0]] },
      { ...recipe, id: 'empty-recipe', recipe: [] },
      { ...color, id: 'a', name: 'duplicate id' },
      null,
      42,
    ];
    const storage = memoryStorage({ [PRESETS_KEY]: JSON.stringify({ version: 1, presets: [color, ...bad, recipe] }) });
    expect(loadPresets(storage)).toEqual([color, recipe]);
  });

  it('normalizes stored hex to canonical form', () => {
    const storage = memoryStorage({
      [PRESETS_KEY]: JSON.stringify({ version: 1, presets: [{ ...color, hex: 'abc' }] }),
    });
    expect(loadPresets(storage)[0].hex).toBe('#AABBCC');
  });

  it('never throws when storage itself fails', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadPresets(broken)).toEqual([]);
    expect(savePresets(broken, [color])).toBe(false);
  });

  describe('against a catalog with custom paints', () => {
    const teal: Paint = {
      id: 'custom-teal1' as PaintId,
      name: 'My Teal',
      pigment: '',
      hex: hex('#00A6A6'),
      tinting: 1,
      role: 'chromatic',
    };
    const withCustom: Preset = {
      ...recipe,
      id: 'c',
      recipe: [
        { paintId: teal.id, parts: 2 },
        { paintId: id('titanium-white'), parts: 1 },
      ],
    };
    const stored = (presets: Preset[]) => memoryStorage({ [PRESETS_KEY]: JSON.stringify({ version: 1, presets }) });

    it('keeps a preset that uses a custom paint when the catalog contains it', () => {
      expect(loadPresets(stored([color, withCustom]), makeCatalog([teal]))).toEqual([color, withCustom]);
    });

    it('drops a preset that uses an unknown paint id', () => {
      expect(loadPresets(stored([color, withCustom, recipe]))).toEqual([color, recipe]);
    });
  });
});
