import { describe, expect, it } from 'vitest';
import { hueToWheel, wheelToHue } from '../core/index.ts';
import { formatNumber, isRatio, RATIO_CHIPS } from './ratio.ts';
import { discBackground, pointToXY, xyToPoint } from './wheelMath.ts';

describe('ratio helpers', () => {
  it('matches chips by ratio, not by raw parts', () => {
    expect(isRatio(8, 2, [4, 1])).toBe(true);
    expect(isRatio(1, 1, [1, 1])).toBe(true);
    expect(isRatio(2.5, 1, [3, 1])).toBe(false);
    expect(RATIO_CHIPS.filter(([x, y]) => isRatio(1, 3, [x, y]))).toEqual([[1, 3]]);
  });

  it('formats parts with at most one decimal', () => {
    expect(formatNumber(3)).toBe('3');
    expect(formatNumber(2.54)).toBe('2.5');
  });
});

describe('wheel math', () => {
  it('round-trips a point through x/y', () => {
    const { x, y } = pointToXY({ angle: 215, s: 0.6 });
    const back = xyToPoint(x, y);
    expect(back.angle).toBeCloseTo(215, 6);
    expect(back.s).toBeCloseTo(0.6, 6);
  });

  it('puts angle 0 at the top and clamps past the rim', () => {
    expect(xyToPoint(0, -50).angle).toBeCloseTo(0, 6);
    expect(xyToPoint(50, 0).angle).toBeCloseTo(90, 6);
    expect(xyToPoint(300, 0).s).toBe(1);
  });

  it('builds a different disc for each wheel mode but the same angles round-trip', () => {
    expect(discBackground('ryb', 1)).not.toBe(discBackground('rgb', 1));
    expect(wheelToHue(hueToWheel(200, 'ryb'), 'ryb')).toBeCloseTo(200, 6);
  });
});
