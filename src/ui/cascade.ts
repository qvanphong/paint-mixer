import type { PaintId, Preset } from '../core/index.ts';

const usesPaint = (preset: Preset, paintId: PaintId): boolean =>
  preset.kind === 'recipe' && preset.recipe.some((part) => part.paintId === paintId);

/** How many saved recipes deleting this paint would also remove. */
export function countPresetsUsing(presets: readonly Preset[], paintId: PaintId): number {
  return presets.filter((preset) => usesPaint(preset, paintId)).length;
}

/** The presets that survive deleting a custom paint: a recipe that needs the paint cannot be mixed any more. */
export function presetsWithoutPaint(presets: readonly Preset[], paintId: PaintId): Preset[] {
  return presets.filter((preset) => !usesPaint(preset, paintId));
}
