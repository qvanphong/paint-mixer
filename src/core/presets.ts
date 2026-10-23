import { parseHex, type Hex } from './color.ts';
import type { Recipe, RecipePart } from './mix.ts';
import { BUILTIN_CATALOG, parsePaintId, type Catalog } from './paints.ts';

export const PRESETS_KEY = 'color-mixer:presets:v1';

/** The subset of the Web Storage API presets need, so tests can pass a plain object. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface PresetBase {
  id: string;
  name: string;
  /** Epoch milliseconds. */
  createdAt: number;
  hex: Hex;
}

export type Preset = (PresetBase & { kind: 'color' }) | (PresetBase & { kind: 'recipe'; recipe: Recipe });

interface StoredPresets {
  version: 1;
  presets: Preset[];
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

function parseRecipe(raw: unknown, catalog: Catalog): Recipe | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parts: RecipePart[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.paintId !== 'string' || typeof item.parts !== 'number') return null;
    const paintId = parsePaintId(item.paintId, catalog);
    if (!paintId || !Number.isFinite(item.parts) || item.parts <= 0) return null;
    if (parts.some((p) => p.paintId === paintId)) return null;
    parts.push({ paintId, parts: item.parts });
  }
  return parts;
}

export function parsePreset(raw: unknown, catalog: Catalog = BUILTIN_CATALOG): Preset | null {
  if (!isRecord(raw)) return null;
  const { id, name, createdAt, kind } = raw;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string') return null;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
  const hex = typeof raw.hex === 'string' ? parseHex(raw.hex) : null;
  if (!hex) return null;
  if (kind === 'color') return { id, name, createdAt, hex, kind };
  if (kind === 'recipe') {
    const recipe = parseRecipe(raw.recipe, catalog);
    return recipe ? { id, name, createdAt, hex, kind, recipe } : null;
  }
  return null;
}

/** Never throws: unreadable storage or a corrupt blob yields [], corrupt records are dropped. */
export function loadPresets(storage: StorageLike, catalog: Catalog = BUILTIN_CATALOG): Preset[] {
  let parsed: unknown;
  try {
    const text = storage.getItem(PRESETS_KEY);
    if (text === null) return [];
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.presets)) return [];
  const seen = new Set<string>();
  const presets: Preset[] = [];
  for (const raw of parsed.presets) {
    const preset = parsePreset(raw, catalog);
    if (preset && !seen.has(preset.id)) {
      seen.add(preset.id);
      presets.push(preset);
    }
  }
  return presets;
}

/** Returns false when storage refuses the write (quota, private mode, disabled storage). */
export function savePresets(storage: StorageLike, presets: readonly Preset[]): boolean {
  const stored: StoredPresets = { version: 1, presets: [...presets] };
  try {
    storage.setItem(PRESETS_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}
