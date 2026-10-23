import { describe, expect, it } from 'vitest';
import { MAX_TINTING, MIN_TINTING, parseHex, type PaintId } from '../core/index.ts';
import {
  DEFAULT_DRAFT,
  SLIDER_MAX,
  SLIDER_MIN,
  SLIDER_STEP,
  draftToPaint,
  nameIsEmpty,
  previewMixes,
  sliderToTinting,
  strengthBand,
  tintingToSlider,
} from './paintDraft.ts';

describe('paint draft', () => {
  it('turns a valid draft into a custom paint and keeps the given id', () => {
    const id = 'custom-abc123' as PaintId;
    const paint = draftToPaint({ ...DEFAULT_DRAFT, name: '  My Teal ', pigment: ' PG36 ' }, id);
    expect(paint).toMatchObject({ id, name: 'My Teal', pigment: 'PG36', tinting: 1, role: 'chromatic' });
  });

  it('rejects a blank name', () => {
    expect(nameIsEmpty('   ')).toBe(true);
    expect(draftToPaint(DEFAULT_DRAFT, 'custom-x' as PaintId)).toBeNull();
  });

  it('keeps strength inside the allowed range at both ends of the slider', () => {
    expect(sliderToTinting(SLIDER_MIN)).toBeGreaterThanOrEqual(MIN_TINTING);
    expect(sliderToTinting(SLIDER_MAX)).toBe(MAX_TINTING);
  });

  it('can land exactly on normal strength and round-trips through the slider', () => {
    const steps = Math.round((0 - SLIDER_MIN) / SLIDER_STEP);
    expect(sliderToTinting(SLIDER_MIN + steps * SLIDER_STEP)).toBe(1);
    for (const t of [0.55, 1, 1.3, 2.5, 4]) expect(sliderToTinting(tintingToSlider(t))).toBeCloseTo(t, 2);
  });

  it('names weak, normal and strong strengths like the catalog does', () => {
    expect(strengthBand(0.55)).toBe('weak');
    expect(strengthBand(1)).toBe('normal');
    expect(strengthBand(1.3)).toBe('normal');
    expect(strengthBand(2.5)).toBe('strong');
  });

  it('previews the paint alone and against white and ultramarine, and strength changes the mixes', () => {
    const hex = parseHex('#00A6A6')!;
    const weak = previewMixes({ ...DEFAULT_DRAFT, hex, tinting: 0.2 });
    const strong = previewMixes({ ...DEFAULT_DRAFT, hex, tinting: 4 });
    expect(weak.alone).toBe(hex);
    expect(strong.alone).toBe(hex);
    expect(strong.withWhite).not.toBe(weak.withWhite);
    expect(strong.withBlue).not.toBe(weak.withBlue);
  });
});
