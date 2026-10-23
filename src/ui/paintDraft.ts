import {
  MAX_TINTING,
  clampTinting,
  makeCatalog,
  mixRecipe,
  parseCustomPaint,
  parseHex,
  parsePaintId,
  type Hex,
  type Paint,
  type PaintId,
  type PaintRole,
} from '../core/index.ts';

/** The editor's working copy. It becomes a Paint only through parseCustomPaint. */
export interface PaintDraft {
  name: string;
  hex: Hex;
  tinting: number;
  role: PaintRole;
  pigment: string;
}

export const DEFAULT_DRAFT: PaintDraft = {
  name: '',
  hex: parseHex('#3A7BD5')!,
  tinting: 1,
  role: 'chromatic',
  pigment: '',
};

export const draftFromPaint = ({ name, hex, tinting, role, pigment }: Paint): PaintDraft => ({
  name,
  hex,
  tinting,
  role,
  pigment,
});

export const nameIsEmpty = (name: string): boolean => name.trim() === '';

export function draftToPaint(draft: PaintDraft, id: PaintId): Paint | null {
  return parseCustomPaint({ ...draft, id });
}

// Strength is multiplicative (2 is twice as strong as 1, as 1 is twice 0.5), so the slider runs on a log2 scale.
// SLIDER_MIN sits on the step grid so that 0, which is strength 1, can be reached exactly.
export const SLIDER_MIN = -2.3;
export const SLIDER_MAX = Math.log2(MAX_TINTING);
export const SLIDER_STEP = 0.05;

export const tintingToSlider = (tinting: number): number => Math.log2(clampTinting(tinting));

export const sliderToTinting = (position: number): number => clampTinting(Math.round(2 ** position * 100) / 100);

export type StrengthBand = 'weak' | 'normal' | 'strong';

export function strengthBand(tinting: number): StrengthBand {
  if (tinting < 0.75) return 'weak';
  return tinting > 1.75 ? 'strong' : 'normal';
}

export interface PreviewMixes {
  alone: Hex;
  withWhite: Hex;
  withBlue: Hex;
}

/** The draft alone and mixed 1:1 with titanium white and with ultramarine, so strength can be judged by eye. */
export function previewMixes(draft: PaintDraft): PreviewMixes {
  const id = 'custom-preview' as PaintId;
  const catalog = makeCatalog([{ ...draft, id }]);
  const against = (other: string): Hex =>
    mixRecipe(
      [
        { paintId: id, parts: 1 },
        { paintId: parsePaintId(other)!, parts: 1 },
      ],
      catalog,
    );
  return { alone: draft.hex, withWhite: against('titanium-white'), withBlue: against('ultramarine-blue') };
}
