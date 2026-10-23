import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_CUSTOM_PAINTS,
  loadCustomPaints,
  loadPresets,
  paintById,
  saveCustomPaints,
  savePresets,
  type Catalog,
  type Hex,
  type Paint,
  type PaintId,
  type Preset,
  type Recipe,
  type StorageLike,
} from '../core/index.ts';
import { presetsWithoutPaint } from './cascade.ts';

/** Reading `window.localStorage` itself can throw (blocked site data), so it is wrapped once here. */
function getStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A list loaded from storage once and written back after every change made through `update`.
 * `saveFailed` is true when the last write was refused.
 */
function usePersistedList<T>(
  load: (storage: StorageLike) => readonly T[],
  save: (storage: StorageLike, items: readonly T[]) => boolean,
) {
  const [items, setItems] = useState<readonly T[]>(() => {
    const storage = getStorage();
    return storage ? load(storage) : [];
  });
  const [saveFailed, setSaveFailed] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    const storage = getStorage();
    setSaveFailed(!(storage && save(storage, items)));
  }, [items, save]);

  const update = useCallback((fn: (prev: readonly T[]) => readonly T[]) => {
    dirty.current = true;
    setItems(fn);
  }, []);

  return { items, saveFailed, update };
}

export interface PresetsApi {
  presets: readonly Preset[];
  /** True when the last write was refused, so the panel can say presets will not survive a reload. */
  saveFailed: boolean;
  addColor(hex: Hex): void;
  addRecipe(recipe: Recipe, hex: Hex): void;
  rename(id: string, name: string): void;
  remove(id: string): void;
  /** Removes every recipe preset that mixes this paint. */
  removeUsing(paintId: PaintId): void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Presets are validated against `catalog` on first load, so the custom paints must already be loaded. */
export function usePresets(catalog: Catalog): PresetsApi {
  const { items: presets, saveFailed, update } = usePersistedList(
    (storage) => loadPresets(storage, catalog),
    savePresets,
  );

  return {
    presets,
    saveFailed,
    addColor: (hex) => update((prev) => [{ id: newId(), name: hex, createdAt: Date.now(), hex, kind: 'color' }, ...prev]),
    addRecipe: (recipe, hex) =>
      update((prev) => [
        {
          id: newId(),
          name: recipe.map((p) => paintById(p.paintId, catalog).name).join(' + '),
          createdAt: Date.now(),
          hex,
          kind: 'recipe',
          recipe,
        },
        ...prev,
      ]),
    rename: (id, name) => {
      const trimmed = name.trim();
      if (trimmed) update((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    },
    remove: (id) => update((prev) => prev.filter((p) => p.id !== id)),
    removeUsing: (paintId) => update((prev) => presetsWithoutPaint(prev, paintId)),
  };
}

export interface CustomPaintsApi {
  paints: readonly Paint[];
  saveFailed: boolean;
  /** False once MAX_CUSTOM_PAINTS is reached. */
  canAdd: boolean;
  add(paint: Paint): void;
  /** Replaces the paint with the same id, so recipes that use it follow the new color. */
  update(paint: Paint): void;
  remove(id: PaintId): void;
}

export function useCustomPaints(): CustomPaintsApi {
  const { items: paints, saveFailed, update } = usePersistedList(loadCustomPaints, saveCustomPaints);

  return {
    paints,
    saveFailed,
    canAdd: paints.length < MAX_CUSTOM_PAINTS,
    add: (paint) =>
      update((prev) => (prev.length >= MAX_CUSTOM_PAINTS || prev.some((p) => p.id === paint.id) ? prev : [...prev, paint])),
    update: (paint) => update((prev) => prev.map((p) => (p.id === paint.id ? paint : p))),
    remove: (id) => update((prev) => prev.filter((p) => p.id !== id)),
  };
}

export type Theme = 'light' | 'dark';
const THEME_KEY = 'color-mixer:theme';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The inline script in index.html has already set data-theme before first paint; this mirrors it. */
export function useTheme(): { theme: Theme; toggle(): void } {
  const [theme, setTheme] = useState<Theme>(() => {
    const attr = document.documentElement.dataset.theme;
    return attr === 'light' || attr === 'dark' ? attr : (storedTheme() ?? systemTheme());
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      if (!storedTheme()) setTheme(query.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this page view only.
    }
  }, [theme]);

  return { theme, toggle };
}

/** A boolean that turns on for `ms` after `trigger()`, for "Copied" and "Saved" feedback. */
export function useFlash(ms = 1600): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const trigger = useCallback(() => {
    setOn(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), ms);
  }, [ms]);
  return [on, trigger];
}
