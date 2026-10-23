import type { Hex } from './color.ts';
import { mixHex } from './engine.ts';
import { BUILTIN_CATALOG, paintById, WHITE, type Catalog, type PaintId } from './paints.ts';

export interface RecipePart {
  paintId: PaintId;
  parts: number;
}

/** Each part > 0, no duplicate paintIds. White is an ordinary paint. */
export type Recipe = readonly RecipePart[];

export function mixRecipe(recipe: Recipe, catalog: Catalog = BUILTIN_CATALOG): Hex {
  return mixHex(
    recipe.map(({ paintId, parts }) => {
      const paint = paintById(paintId, catalog);
      return { hex: paint.hex, tinting: paint.tinting, parts };
    }),
  );
}

function formatParts(parts: number): string {
  const n = Number.isInteger(parts) ? String(parts) : String(Math.round(parts * 100) / 100);
  return `${n} ${parts === 1 ? 'part' : 'parts'}`;
}

/** e.g. "3 parts Ultramarine Blue + 1 part Cadmium Yellow Medium". */
export function describeRecipe(recipe: Recipe, catalog: Catalog = BUILTIN_CATALOG): string {
  return recipe.map(({ paintId, parts }) => `${formatParts(parts)} ${paintById(paintId, catalog).name}`).join(' + ');
}

export function withWhite(recipe: Recipe, extraWhite: number): Recipe {
  if (extraWhite <= 0) return recipe;
  if (!recipe.some((p) => p.paintId === WHITE.id)) return [...recipe, { paintId: WHITE.id, parts: extraWhite }];
  return recipe.map((p) => (p.paintId === WHITE.id ? { ...p, parts: p.parts + extraWhite } : p));
}

/** The recipe lightened by each amount of extra white, e.g. tints(r, [1, 2, 4, 8, 16]). */
export function tints(recipe: Recipe, whiteParts: readonly number[], catalog: Catalog = BUILTIN_CATALOG): Hex[] {
  return whiteParts.map((w) => mixRecipe(withWhite(recipe, w), catalog));
}

/**
 * Two-paint recipe from a ratio slider. `share` is paint a's fraction of the mix in (0, 1);
 * the minority paint gets 1 part so the text reads like a painter's ratio ("3 parts A + 1 part B").
 */
export function ratioToParts(a: PaintId, b: PaintId, share: number): Recipe {
  const s = Math.min(0.99, Math.max(0.01, share));
  const round = (x: number) => Math.round(x * 10) / 10;
  return s >= 0.5
    ? [
        { paintId: a, parts: round(s / (1 - s)) },
        { paintId: b, parts: 1 },
      ]
    : [
        { paintId: a, parts: 1 },
        { paintId: b, parts: round((1 - s) / s) },
      ];
}

/** Inverse of ratioToParts: paint a's fraction of a two-paint mix. */
export function partsToShare(aParts: number, bParts: number): number {
  return aParts / (aParts + bParts);
}
