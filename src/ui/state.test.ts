import { describe, expect, it } from 'vitest';
import { mixRecipe, paintById, parseHex, parsePaintId, WHITE, type Hex, type PaintId, type Recipe } from '../core/index.ts';
import { initialState, MAX_PAINTS, reducer, type Action, type AppState } from './state.ts';

const paint = (raw: string): PaintId => {
  const id = parsePaintId(raw);
  if (!id) throw new Error(raw);
  return id;
};
const hex = (raw: string): Hex => parseHex(raw)!;
const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state);

const RED = paint('cadmium-red-medium');
const OCHRE = paint('yellow-ochre');
const BLUE = paint('ultramarine-blue');

describe('reducer', () => {
  it('starts with a mixable recipe', () => {
    expect(initialState.paints.length).toBeGreaterThanOrEqual(2);
    expect(() => mixRecipe(initialState.paints)).not.toThrow();
  });

  it('adds paints up to the cap and ignores duplicates', () => {
    const full = run(
      initialState,
      { type: 'addPaint', paintId: RED },
      { type: 'addPaint', paintId: RED },
      { type: 'addPaint', paintId: OCHRE },
      { type: 'addPaint', paintId: paint('raw-umber') },
    );
    expect(full.paints).toHaveLength(MAX_PAINTS);
    expect(new Set(full.paints.map((p) => p.paintId)).size).toBe(MAX_PAINTS);
  });

  it('never removes below two paints', () => {
    const [first] = initialState.paints;
    expect(reducer(initialState, { type: 'removePaint', paintId: first.paintId })).toBe(initialState);
    const three = run(initialState, { type: 'addPaint', paintId: RED });
    expect(reducer(three, { type: 'removePaint', paintId: RED }).paints).toHaveLength(2);
  });

  it('replaces a paint in place, keeping its parts, and refuses a paint already in the mix', () => {
    const [first, second] = initialState.paints;
    const sized = run(initialState, { type: 'setParts', paintId: first.paintId, parts: 6 });
    const swapped = reducer(sized, { type: 'replacePaint', from: first.paintId, to: RED });
    expect(swapped.paints[0]).toEqual({ paintId: RED, parts: 6 });
    expect(reducer(sized, { type: 'replacePaint', from: first.paintId, to: second.paintId })).toBe(sized);
  });

  it('clamps parts to the slider minimum and rejects non-finite values', () => {
    const [first] = initialState.paints;
    expect(reducer(initialState, { type: 'setParts', paintId: first.paintId, parts: 0 }).paints[0].parts).toBe(0.5);
    expect(reducer(initialState, { type: 'setParts', paintId: first.paintId, parts: NaN }).paints[0].parts).toBe(0.5);
    expect(reducer(initialState, { type: 'setExtraWhite', parts: -3 }).extraWhite).toBe(0);
  });

  it('sets pair parts only when exactly two paints are mixed', () => {
    const pair = reducer(initialState, { type: 'setPairParts', parts: [3, 1] });
    expect(pair.paints.map((p) => p.parts)).toEqual([3, 1]);
    const three = run(initialState, { type: 'addPaint', paintId: RED });
    expect(reducer(three, { type: 'setPairParts', parts: [3, 1] })).toBe(three);
  });

  it('loads a recipe into Mix and moves its white onto the extra-white slider', () => {
    const recipe: Recipe = [
      { paintId: BLUE, parts: 3 },
      { paintId: RED, parts: 1 },
      { paintId: WHITE.id, parts: 36 },
    ];
    const next = reducer({ ...initialState, view: 'find' }, { type: 'loadRecipe', recipe });
    expect(next.view).toBe('mix');
    expect(next.paints.map((p) => paintById(p.paintId).role)).not.toContain('white');
    expect(next.extraWhite).toBe(36);
  });

  it('keeps a white-only recipe as a paint row and ignores an empty recipe', () => {
    const white: Recipe = [{ paintId: WHITE.id, parts: 1 }];
    const next = reducer(initialState, { type: 'loadRecipe', recipe: white });
    expect(next.paints).toEqual(white);
    expect(next.extraWhite).toBe(0);
    expect(reducer(initialState, { type: 'loadRecipe', recipe: [] })).toBe(initialState);
  });

  it('jumps to Find formula with the chosen color', () => {
    const next = reducer({ ...initialState, view: 'palettes' }, { type: 'findFormulaFor', hex: hex('#112233') });
    expect(next.view).toBe('find');
    expect(next.target).toBe('#112233');
  });

  it('routes a color preset by the current view', () => {
    const color = hex('#445566');
    expect(reducer(initialState, { type: 'loadColor', hex: color }).view).toBe('find');
    const onPalettes = reducer({ ...initialState, view: 'palettes' }, { type: 'loadColor', hex: color });
    expect(onPalettes.view).toBe('palettes');
    expect(onPalettes.main).toBe(color);
    expect(onPalettes.target).toBe(color);
  });

  describe('customPaintDeleted', () => {
    const custom = 'custom-teal1' as PaintId;
    const other = 'custom-other' as PaintId;
    const mix = (...paintIds: PaintId[]): AppState => ({
      ...initialState,
      paints: paintIds.map((paintId) => ({ paintId, parts: 2 })),
      extraWhite: 4,
    });

    it('leaves the mix untouched when the paint is not in it', () => {
      const state = mix(BLUE, RED);
      expect(reducer(state, { type: 'customPaintDeleted', paintId: custom })).toBe(state);
    });

    it('drops the paint and keeps the rest of the mix while two or more paints remain', () => {
      const next = reducer(mix(BLUE, custom, RED), { type: 'customPaintDeleted', paintId: custom });
      expect(next.paints).toEqual([
        { paintId: BLUE, parts: 2 },
        { paintId: RED, parts: 2 },
      ]);
      expect(next.extraWhite).toBe(4);
    });

    it('falls back to the default starting recipe when fewer than two paints remain', () => {
      for (const state of [mix(BLUE, custom), mix(custom, other)]) {
        const next = reducer(state, { type: 'customPaintDeleted', paintId: custom });
        expect(next.paints).toEqual(initialState.paints);
        expect(next.extraWhite).toBe(initialState.extraWhite);
        expect(() => mixRecipe(next.paints)).not.toThrow();
      }
    });

    it('keeps the view and the other views state', () => {
      const state = { ...mix(BLUE, custom), view: 'find' as const, target: hex('#112233') };
      const next = reducer(state, { type: 'customPaintDeleted', paintId: custom });
      expect(next.view).toBe('find');
      expect(next.target).toBe('#112233');
    });
  });
});
