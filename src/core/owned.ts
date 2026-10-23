import { BUILTIN_CATALOG, type Catalog, type Paint, type PaintId } from './paints.ts';
import type { StorageLike } from './presets.ts';

export const OWNED_KEY = 'color-mixer:owned-paints:v1';

/** `ids` may name built-in or custom paints. `enabled` says whether Find formula restricts itself to them. */
export interface OwnedPaints {
  readonly enabled: boolean;
  readonly ids: readonly PaintId[];
}

export const NO_OWNED: OwnedPaints = { enabled: false, ids: [] };

interface StoredOwned {
  version: 1;
  enabled: boolean;
  ids: PaintId[];
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Boundary parser: null when the shape is wrong, otherwise ids missing from the catalog and duplicates are dropped. */
export function parseOwned(raw: unknown, catalog: Catalog = BUILTIN_CATALOG): OwnedPaints | null {
  if (!isRecord(raw) || raw.version !== 1 || typeof raw.enabled !== 'boolean' || !Array.isArray(raw.ids)) return null;
  const ids = new Set<PaintId>();
  for (const id of raw.ids) {
    if (typeof id === 'string' && catalog.byId(id as PaintId)) ids.add(id as PaintId);
  }
  return { enabled: raw.enabled, ids: [...ids] };
}

/** Never throws: unreadable storage or a corrupt blob yields the disabled, empty default. */
export function loadOwned(storage: StorageLike, catalog: Catalog = BUILTIN_CATALOG): OwnedPaints {
  try {
    const text = storage.getItem(OWNED_KEY);
    if (text === null) return NO_OWNED;
    return parseOwned(JSON.parse(text), catalog) ?? NO_OWNED;
  } catch {
    return NO_OWNED;
  }
}

/** Returns false when storage refuses the write (quota, private mode, disabled storage). */
export function saveOwned(storage: StorageLike, owned: OwnedPaints): boolean {
  const stored: StoredOwned = { version: 1, enabled: owned.enabled, ids: [...owned.ids] };
  try {
    storage.setItem(OWNED_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

/**
 * The owned paints the finder can use, in catalog order. Whites are left out: Titanium White is always
 * available to the finder and any other white is never used by it.
 */
export function ownedTubes(ids: readonly PaintId[], catalog: Catalog): Paint[] {
  const owned = new Set(ids);
  return catalog.paints.filter((p) => p.role !== 'white' && owned.has(p.id));
}

export function ownedWith(owned: OwnedPaints, id: PaintId): OwnedPaints {
  return owned.ids.includes(id) ? owned : { ...owned, ids: [...owned.ids, id] };
}

export function ownedWithout(owned: OwnedPaints, id: PaintId): OwnedPaints {
  return owned.ids.includes(id) ? { ...owned, ids: owned.ids.filter((x) => x !== id) } : owned;
}
