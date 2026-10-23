import { hsvToHex, wheelToHue, type WheelMode } from '../core/index.ts';

/** Wheel radius in SVG units; the viewBox leaves a margin so edge handles are not clipped. */
export const WHEEL_RADIUS = 100;

export interface WheelPoint {
  /** Degrees on the chosen wheel, 0 at the top, clockwise. */
  angle: number;
  /** Distance from the center as a fraction of the radius, 0 to 1. */
  s: number;
}

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

export function pointToXY({ angle, s }: WheelPoint): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: WHEEL_RADIUS * s * Math.sin(rad), y: -WHEEL_RADIUS * s * Math.cos(rad) };
}

/** Inverse of pointToXY. Distance past the rim clamps to saturation 1. */
export function xyToPoint(x: number, y: number): WheelPoint {
  return {
    angle: wrap((Math.atan2(x, -y) * 180) / Math.PI),
    s: Math.min(1, Math.hypot(x, y) / WHEEL_RADIUS),
  };
}

/**
 * CSS for the disc behind the SVG handles. Conic stops walk the chosen wheel, so RYB puts
 * red/yellow/blue 120 degrees apart. A white radial fades hue to white (HSV saturation is
 * linear in RGB), and a black layer applies the fixed value.
 */
export function discBackground(mode: WheelMode, value: number): string {
  const stops: string[] = [];
  for (let angle = 0; angle <= 360; angle += 5) {
    stops.push(`${hsvToHex({ h: wheelToHue(angle, mode), s: 1, v: 1 })} ${angle}deg`);
  }
  const dark = `rgb(0 0 0 / ${(1 - value).toFixed(3)})`;
  return [
    `linear-gradient(${dark}, ${dark})`,
    'radial-gradient(circle closest-side, #fff, rgb(255 255 255 / 0))',
    `conic-gradient(from 0deg, ${stops.join(', ')})`,
  ].join(', ');
}
