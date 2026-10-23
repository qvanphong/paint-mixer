import { describe, expect, it } from 'vitest';
import { parseHex, type PaintId, type Preset } from '../core/index.ts';
import { countPresetsUsing, presetsWithoutPaint } from './cascade.ts';

const hex = parseHex('#336699')!;
const teal = 'custom-teal1' as PaintId;
const white = 'titanium-white' as PaintId;
const blue = 'ultramarine-blue' as PaintId;

const recipe = (id: string, ...paintIds: PaintId[]): Preset => ({
  id,
  name: id,
  createdAt: 1,
  hex,
  kind: 'recipe',
  recipe: paintIds.map((paintId) => ({ paintId, parts: 1 })),
});
const color: Preset = { id: 'c', name: 'c', createdAt: 1, hex, kind: 'color' };

const presets = [recipe('a', teal, white), recipe('b', blue, white), color, recipe('c2', blue, teal, white)];

describe('delete cascade', () => {
  it('counts the recipes that mix the paint', () => {
    expect(countPresetsUsing(presets, teal)).toBe(2);
    expect(countPresetsUsing(presets, blue)).toBe(2);
    expect(countPresetsUsing(presets, 'custom-none' as PaintId)).toBe(0);
  });

  it('removes exactly the counted recipes and keeps colors and unrelated recipes in order', () => {
    const kept = presetsWithoutPaint(presets, teal);
    expect(kept.map((p) => p.id)).toEqual(['b', 'c']);
    expect(presets.length - kept.length).toBe(countPresetsUsing(presets, teal));
  });

  it('is a no-op for a paint no preset uses', () => {
    expect(presetsWithoutPaint(presets, 'custom-none' as PaintId)).toEqual(presets);
  });
});
