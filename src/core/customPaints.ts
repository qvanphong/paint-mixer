import { parseHex } from './color.ts';
import { BUILTIN_CATALOG, type Paint, type PaintId, type PaintRole } from './paints.ts';
import type { StorageLike } from './presets.ts';

export const CUSTOM_PAINTS_KEY = 'color-mixer:custom-paints:v1';

/** Each custom paint adds a candidate to the formula search, so the count is capped to keep it fast. */
export const MAX_CUSTOM_PAINTS = 30;
export const NAME_MAX_LENGTH = 40;
export const MAX_PIGMENT_LENGTH = 20;
export const MIN_TINTING = 0.2;
export const MAX_TINTING = 4;

const ROLES: readonly PaintRole[] = ['chromatic', 'earth', 'black', 'white'];
const ID_PATTERN = /^custom-[A-Za-z0-9_-]{1,64}$/;

interface StoredCustomPaints {
  version: 1;
  paints: Paint[];
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Out-of-range strengths are clamped rather than rejected, so a hand-edited blob still loads. */
export function clampTinting(tinting: number): number {
  return Math.min(MAX_TINTING, Math.max(MIN_TINTING, tinting));
}

export const isCustomPaint = (paint: Paint): boolean => BUILTIN_CATALOG.byId(paint.id) === undefined;

/** Boundary parser for one stored custom paint. Text fields are trimmed. */
export function parseCustomPaint(raw: unknown): Paint | null {
  if (!isRecord(raw)) return null;
  const { id, name, tinting, role, pigment = '' } = raw;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  if (typeof name !== 'string' || typeof pigment !== 'string') return null;
  const trimmedName = name.trim();
  const trimmedPigment = pigment.trim();
  if (trimmedName.length < 1 || trimmedName.length > NAME_MAX_LENGTH || trimmedPigment.length > MAX_PIGMENT_LENGTH) {
    return null;
  }
  const hex = typeof raw.hex === 'string' ? parseHex(raw.hex) : null;
  if (!hex) return null;
  if (typeof tinting !== 'number' || !Number.isFinite(tinting)) return null;
  const parsedRole = ROLES.find((r) => r === role);
  if (!parsedRole) return null;
  return {
    id: id as PaintId,
    name: trimmedName,
    pigment: trimmedPigment,
    hex,
    tinting: clampTinting(tinting),
    role: parsedRole,
  };
}

/** Never throws: unreadable storage or a corrupt blob yields [], corrupt or duplicate entries are dropped. */
export function loadCustomPaints(storage: StorageLike): Paint[] {
  let parsed: unknown;
  try {
    const text = storage.getItem(CUSTOM_PAINTS_KEY);
    if (text === null) return [];
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.paints)) return [];
  const seen = new Set<string>();
  const paints: Paint[] = [];
  for (const raw of parsed.paints) {
    const paint = parseCustomPaint(raw);
    if (paint && !seen.has(paint.id)) {
      seen.add(paint.id);
      paints.push(paint);
    }
  }
  return paints.slice(0, MAX_CUSTOM_PAINTS);
}

/** Returns false when storage refuses the write (quota, private mode, disabled storage). */
export function saveCustomPaints(storage: StorageLike, paints: readonly Paint[]): boolean {
  const stored: StoredCustomPaints = { version: 1, paints: [...paints] };
  try {
    storage.setItem(CUSTOM_PAINTS_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

/** Uses getRandomValues, unlike randomUUID it also works on plain-http origins. */
export function newCustomPaintId(): PaintId {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `custom-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as PaintId;
}
