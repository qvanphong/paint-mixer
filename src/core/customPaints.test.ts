import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from './color.ts';
import {
  CUSTOM_PAINTS_KEY,
  MAX_CUSTOM_PAINTS,
  loadCustomPaints,
  newCustomPaintId,
  parseCustomPaint,
  saveCustomPaints,
} from './customPaints.ts';
import { findFormulas } from './formula.ts';
import { describeRecipe, mixRecipe, tints } from './mix.ts';
import { BUILTIN_CATALOG, PAINTS, makeCatalog, paintById, parsePaintId, type Paint, type PaintId } from './paints.ts';
import type { StorageLike } from './presets.ts';

const hex = (s: string): Hex => parseHex(s)!;
const builtin = (s: string): PaintId => parsePaintId(s)!;

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

const teal: Paint = {
  id: 'custom-teal1' as PaintId,
  name: 'My Teal',
  pigment: '',
  hex: hex('#00A6A6'),
  tinting: 1.5,
  role: 'chromatic',
};
const catalog = makeCatalog([teal]);

describe('catalog', () => {
  it('lists built-ins first, then custom paints in insertion order', () => {
    const second: Paint = { ...teal, id: 'custom-two' as PaintId, name: 'Second' };
    const ids = makeCatalog([teal, second]).paints.map((p) => p.id);
    expect(ids.slice(0, PAINTS.length)).toEqual(PAINTS.map((p) => p.id));
    expect(ids.slice(PAINTS.length)).toEqual([teal.id, second.id]);
  });

  it('finds custom paints only through the catalog that contains them', () => {
    expect(paintById(teal.id, catalog)).toBe(teal);
    expect(parsePaintId(teal.id, catalog)).toBe(teal.id);
    expect(parsePaintId(teal.id)).toBeNull();
    expect(() => paintById(teal.id)).toThrow();
    expect(paintById(builtin('burnt-sienna'), catalog).name).toBe('Burnt Sienna');
  });

  it('never lets a custom paint shadow a built-in id', () => {
    const impostor: Paint = { ...teal, id: builtin('burnt-sienna') };
    expect(paintById(impostor.id, makeCatalog([impostor])).name).toBe('Burnt Sienna');
    expect(makeCatalog([impostor]).paints).toHaveLength(PAINTS.length);
  });
});

describe('mixing with custom paints', () => {
  const recipe = [
    { paintId: teal.id, parts: 2 },
    { paintId: builtin('cadmium-yellow-medium'), parts: 1 },
  ];

  it('mixes a custom paint exactly like the same hex and strength passed raw', () => {
    const yellow = paintById(builtin('cadmium-yellow-medium'));
    const rawTeal = { ...teal, id: 'raw' as PaintId };
    const viaRaw = makeCatalog([rawTeal]);
    expect(mixRecipe(recipe, catalog)).toBe(
      mixRecipe([{ paintId: rawTeal.id, parts: 2 }, { paintId: yellow.id, parts: 1 }], viaRaw),
    );
  });

  it('returns the custom masstone for a lone custom paint, and honors strength', () => {
    expect(mixRecipe([{ paintId: teal.id, parts: 4 }], catalog)).toBe(teal.hex);
    const weak = makeCatalog([{ ...teal, tinting: 0.2 }]);
    const strong = makeCatalog([{ ...teal, tinting: 4 }]);
    expect(mixRecipe(recipe, weak)).not.toBe(mixRecipe(recipe, strong));
  });

  it('describes and tints recipes that contain a custom paint', () => {
    expect(describeRecipe(recipe, catalog)).toBe('2 parts My Teal + 1 part Cadmium Yellow Medium');
    const swatches = tints(recipe, [1, 4], catalog);
    expect(swatches).toEqual([
      mixRecipe([...recipe, { paintId: builtin('titanium-white'), parts: 1 }], catalog),
      mixRecipe([...recipe, { paintId: builtin('titanium-white'), parts: 4 }], catalog),
    ]);
  });

  it('throws for a custom paint missing from the catalog', () => {
    expect(() => mixRecipe(recipe)).toThrow();
  });
});

describe('findFormulas with custom paints', () => {
  it('ranks a custom paint alone first when the target is its own masstone', () => {
    const [best] = findFormulas(teal.hex, {}, catalog);
    expect(best.recipe).toEqual([{ paintId: teal.id, parts: 1 }]);
    expect(best.match).toBe('exact');
  });

  it('ignores a custom white as the finder pool white, but offers it as a paint', () => {
    const cream: Paint = { ...teal, id: 'custom-cream' as PaintId, hex: hex('#F2E8C9'), role: 'white' };
    const formulas = findFormulas(cream.hex, { limit: 20 }, makeCatalog([cream]));
    expect(formulas.some((f) => f.recipe.some((p) => p.paintId === cream.id))).toBe(false);
  });

  it('stays fast with the maximum number of custom paints', () => {
    const many: Paint[] = Array.from({ length: MAX_CUSTOM_PAINTS }, (_, i) => ({
      id: `custom-p${i}` as PaintId,
      name: `Paint ${i}`,
      pigment: '',
      hex: hex(`#${(((i * 8_388_593) % 0xffffff) + 0x101010).toString(16).slice(-6).padStart(6, '0')}`),
      tinting: 0.5 + (i % 5) * 0.5,
      role: i % 4 === 0 ? 'earth' : 'chromatic',
    }));
    const full = makeCatalog(many);
    const targets = ['#769E6C', '#E0B79A', '#8B5A2B', '#7A7A7A', '#C0392B', '#1A1A40', '#F0E8E0', '#00FF00'];
    findFormulas(hex(targets[0]), {}, full);
    const times = targets
      .map((t) => {
        const start = performance.now();
        findFormulas(hex(t), {}, full);
        return performance.now() - start;
      })
      .sort((a, b) => a - b);
    const median = (times[3] + times[4]) / 2;
    console.log(`findFormulas with ${MAX_CUSTOM_PAINTS} custom paints, ms per call: ${times.map((t) => t.toFixed(0)).join(', ')} (median ${median.toFixed(0)})`);
    expect(times[times.length - 1]).toBeLessThan(1500);
  });
});

describe('parseCustomPaint', () => {
  const valid = { id: 'custom-abc', name: ' Teal ', pigment: ' PG36 ', hex: 'abc', tinting: 9, role: 'earth' };

  it('trims text, normalizes hex and clamps strength', () => {
    expect(parseCustomPaint(valid)).toEqual({
      id: 'custom-abc',
      name: 'Teal',
      pigment: 'PG36',
      hex: '#AABBCC',
      tinting: 4,
      role: 'earth',
    });
    expect(parseCustomPaint({ ...valid, tinting: 0.01 })?.tinting).toBe(0.2);
  });

  it('allows a missing pigment', () => {
    const { pigment: _pigment, ...rest } = valid;
    expect(parseCustomPaint(rest)?.pigment).toBe('');
  });

  it('rejects invalid fields', () => {
    const bad = [
      { ...valid, id: 'titanium-white' },
      { ...valid, id: 'custom-' },
      { ...valid, id: 'custom-a b' },
      { ...valid, id: 7 },
      { ...valid, name: '   ' },
      { ...valid, name: 'x'.repeat(41) },
      { ...valid, hex: 'teal' },
      { ...valid, tinting: Number.NaN },
      { ...valid, tinting: '1' },
      { ...valid, role: 'metallic' },
      { ...valid, pigment: 3 },
      { ...valid, pigment: 'x'.repeat(21) },
      null,
      'paint',
    ];
    for (const raw of bad) expect(parseCustomPaint(raw), JSON.stringify(raw)).toBeNull();
  });
});

describe('custom paint persistence', () => {
  it('round-trips and starts empty', () => {
    const storage = memoryStorage();
    expect(loadCustomPaints(storage)).toEqual([]);
    expect(saveCustomPaints(storage, [teal])).toBe(true);
    expect(loadCustomPaints(storage)).toEqual([teal]);
  });

  it('returns [] for corrupt or foreign blobs', () => {
    for (const blob of ['not json', 'null', '[]', '{"version":2,"paints":[]}', '{"version":1,"paints":{}}']) {
      expect(loadCustomPaints(memoryStorage({ [CUSTOM_PAINTS_KEY]: blob })), blob).toEqual([]);
    }
  });

  it('drops corrupt and duplicate entries and keeps the good ones in order', () => {
    const other: Paint = { ...teal, id: 'custom-other' as PaintId, name: 'Other' };
    const blob = JSON.stringify({
      version: 1,
      paints: [teal, { ...teal, id: 'custom-bad', hex: 'nope' }, { ...teal, name: 'duplicate id' }, null, 5, other],
    });
    expect(loadCustomPaints(memoryStorage({ [CUSTOM_PAINTS_KEY]: blob }))).toEqual([teal, other]);
  });

  it('keeps at most the limit', () => {
    const paints = Array.from({ length: MAX_CUSTOM_PAINTS + 5 }, (_, i) => ({ ...teal, id: `custom-n${i}` }));
    const storage = memoryStorage({ [CUSTOM_PAINTS_KEY]: JSON.stringify({ version: 1, paints }) });
    expect(loadCustomPaints(storage)).toHaveLength(MAX_CUSTOM_PAINTS);
  });

  it('never throws when storage fails, and save reports false', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadCustomPaints(broken)).toEqual([]);
    expect(saveCustomPaints(broken, [teal])).toBe(false);
  });

  it('generates distinct ids that parse as custom paints', () => {
    const ids = new Set(Array.from({ length: 100 }, newCustomPaintId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(parseCustomPaint({ ...teal, id })?.id).toBe(id);
    expect(ids.has(BUILTIN_CATALOG.paints[0].id)).toBe(false);
  });
});
