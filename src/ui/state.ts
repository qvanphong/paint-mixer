import {
  parseHex,
  parsePaintId,
  WHITE,
  type HarmonyRule,
  type Hex,
  type PaintId,
  type Recipe,
  type WheelMode,
} from '../core/index.ts';

export type View = 'mix' | 'find' | 'palettes';
export const VIEWS: readonly View[] = ['mix', 'find', 'palettes'];

export const MIN_PAINTS = 2;
export const MAX_PAINTS = 4;
export const MIN_PARTS = 0.5;
export const PARTS_MAX = 20;
export const PARTS_STEP = 0.5;
export const WHITE_MAX = 20;
export const TINT_STEPS: readonly number[] = [1, 2, 4, 8, 16];

export interface AppState {
  view: View;
  /** The paints being mixed, 1 to MAX_PAINTS entries. Never empty: mixRecipe throws on an empty recipe. */
  paints: Recipe;
  /** Extra Titanium White, kept apart from `paints` so the tint strip can vary it. */
  extraWhite: number;
  /** Main color of the Palettes view. */
  main: Hex;
  harmony: HarmonyRule;
  wheel: WheelMode;
  /** Color the Find formula view searches for. */
  target: Hex;
}

export type Action =
  | { type: 'setView'; view: View }
  | { type: 'addPaint'; paintId: PaintId }
  | { type: 'removePaint'; paintId: PaintId }
  | { type: 'replacePaint'; from: PaintId; to: PaintId }
  | { type: 'setParts'; paintId: PaintId; parts: number }
  | { type: 'setPairParts'; parts: readonly [number, number] }
  | { type: 'setExtraWhite'; parts: number }
  | { type: 'loadRecipe'; recipe: Recipe }
  | { type: 'setMain'; hex: Hex }
  | { type: 'setHarmony'; harmony: HarmonyRule }
  | { type: 'setWheel'; wheel: WheelMode }
  | { type: 'setTarget'; hex: Hex }
  | { type: 'findFormulaFor'; hex: Hex }
  | { type: 'loadColor'; hex: Hex }
  | { type: 'customPaintDeleted'; paintId: PaintId };

function requireHex(raw: string): Hex {
  const hex = parseHex(raw);
  if (!hex) throw new Error(`Invalid hex: ${raw}`);
  return hex;
}

function requirePaint(raw: string): PaintId {
  const id = parsePaintId(raw);
  if (!id) throw new Error(`Unknown paint: ${raw}`);
  return id;
}

export const initialState: AppState = {
  view: 'mix',
  paints: [
    { paintId: requirePaint('ultramarine-blue'), parts: 1 },
    { paintId: requirePaint('cadmium-yellow-medium'), parts: 1 },
  ],
  extraWhite: 0,
  main: requireHex('#D2693C'),
  harmony: 'complementary',
  wheel: 'ryb',
  target: requireHex('#7BA05B'),
};

const clampParts = (parts: number) => (Number.isFinite(parts) ? Math.max(MIN_PARTS, parts) : MIN_PARTS);
const clampWhite = (parts: number) => (Number.isFinite(parts) ? Math.max(0, parts) : 0);

/**
 * Moves the white of a finished recipe onto the extra-white slider, so the paint rows keep
 * showing only the tubes. A recipe that is white alone stays as it is.
 */
export function splitWhite(recipe: Recipe): { paints: Recipe; extraWhite: number } {
  const white = recipe.find((p) => p.paintId === WHITE.id);
  const rest = recipe.filter((p) => p.paintId !== WHITE.id);
  return white && rest.length > 0 ? { paints: rest, extraWhite: white.parts } : { paints: recipe, extraWhite: 0 };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view };
    case 'addPaint': {
      if (state.paints.length >= MAX_PAINTS || state.paints.some((p) => p.paintId === action.paintId)) return state;
      return { ...state, paints: [...state.paints, { paintId: action.paintId, parts: 1 }] };
    }
    case 'removePaint': {
      if (state.paints.length <= MIN_PAINTS) return state;
      return { ...state, paints: state.paints.filter((p) => p.paintId !== action.paintId) };
    }
    case 'replacePaint': {
      const present = state.paints.some((p) => p.paintId === action.from);
      const taken = state.paints.some((p) => p.paintId === action.to);
      if (!present || taken) return state;
      return {
        ...state,
        paints: state.paints.map((p) => (p.paintId === action.from ? { ...p, paintId: action.to } : p)),
      };
    }
    case 'setParts':
      return {
        ...state,
        paints: state.paints.map((p) => (p.paintId === action.paintId ? { ...p, parts: clampParts(action.parts) } : p)),
      };
    case 'setPairParts': {
      if (state.paints.length !== 2) return state;
      const [a, b] = state.paints;
      const [pa, pb] = action.parts;
      return { ...state, paints: [{ ...a, parts: clampParts(pa) }, { ...b, parts: clampParts(pb) }] };
    }
    case 'setExtraWhite':
      return { ...state, extraWhite: clampWhite(action.parts) };
    case 'loadRecipe': {
      if (action.recipe.length === 0) return state;
      return { ...state, view: 'mix', ...splitWhite(action.recipe) };
    }
    case 'setMain':
      return { ...state, main: action.hex };
    case 'setHarmony':
      return { ...state, harmony: action.harmony };
    case 'setWheel':
      return { ...state, wheel: action.wheel };
    case 'setTarget':
      return { ...state, target: action.hex };
    case 'findFormulaFor':
      return { ...state, view: 'find', target: action.hex };
    case 'loadColor':
      // Staying on Palettes keeps the wheel the user is working on; elsewhere a color is a search target.
      return { ...state, main: action.hex, target: action.hex, view: state.view === 'mix' ? 'find' : state.view };
    case 'customPaintDeleted': {
      if (!state.paints.some((p) => p.paintId === action.paintId)) return state;
      const kept = state.paints.filter((p) => p.paintId !== action.paintId);
      // Below the minimum there is no mix worth keeping, so restart from the default recipe.
      return kept.length >= MIN_PAINTS
        ? { ...state, paints: kept }
        : { ...state, paints: initialState.paints, extraWhite: initialState.extraWhite };
    }
    default:
      return action satisfies never;
  }
}
