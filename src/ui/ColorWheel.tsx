import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { hexToHsv, hsvToHex, hueToWheel, wheelToHue, type Hex, type Hsv, type WheelMode } from '../core/index.ts';
import { strings } from './strings.ts';
import { discBackground, pointToXY, WHEEL_RADIUS, xyToPoint } from './wheelMath.ts';

/** Below this value the whole disc is near black and a drag would do nothing visible. */
const MIN_WHEEL_VALUE = 0.15;
const VIEW = WHEEL_RADIUS * 1.1;
const DISC_INSET = `${((1 - WHEEL_RADIUS / VIEW) / 2) * 100}%`;

interface Props {
  /** Main color as HSV, kept by the caller so hue survives colors that round to gray. */
  hsv: Hsv;
  mode: WheelMode;
  /** Colors after the main one, drawn as smaller handles. */
  harmony: readonly Hex[];
  onChange(hsv: Hsv): void;
}

function place(hsv: Hsv, mode: WheelMode) {
  return pointToXY({ angle: hueToWheel(hsv.h, mode), s: hsv.s });
}

export function ColorWheel({ hsv, mode, harmony, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const handle = useRef<SVGCircleElement>(null);
  const value = Math.max(hsv.v, MIN_WHEEL_VALUE);
  const main = place(hsv, mode);
  const mainHex = hsvToHex(hsv);
  const angle = hueToWheel(hsv.h, mode);

  const moveTo = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const scale = (2 * VIEW) / rect.width;
    const { angle: a, s } = xyToPoint(
      (e.clientX - rect.left - rect.width / 2) * scale,
      (e.clientY - rect.top - rect.height / 2) * scale,
    );
    onChange({ h: wheelToHue(a, mode), s, v: value });
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    handle.current?.focus();
    moveTo(e);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e);
  };

  const onKeyDown = (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey;
    const turn = big ? 10 : 1;
    const reach = big ? 0.1 : 0.01;
    let nextAngle = angle;
    let nextS = hsv.s;
    switch (e.key) {
      case 'ArrowRight':
        nextAngle += turn;
        break;
      case 'ArrowLeft':
        nextAngle -= turn;
        break;
      case 'ArrowUp':
        nextS += reach;
        break;
      case 'ArrowDown':
        nextS -= reach;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange({ h: wheelToHue(nextAngle, mode), s: Math.min(1, Math.max(0, nextS)), v: value });
  };

  return (
    <div className="wheel">
      <div className="wheel-disc" style={{ inset: DISC_INSET, background: discBackground(mode, value) }} />
      <svg
        ref={svg}
        className="wheel-svg"
        viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`}
        role="group"
        aria-label={strings.palettes.wheelLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <circle className="wheel-rim" r={WHEEL_RADIUS} />
        <line className="wheel-spoke" x1={0} y1={0} x2={main.x} y2={main.y} />
        {harmony.map((hex, i) => {
          const { x, y } = place(hexToHsv(hex), mode);
          return (
            <g key={i}>
              <line className="wheel-spoke" x1={0} y1={0} x2={x} y2={y} />
              <circle className="wheel-dot-outline" cx={x} cy={y} r={7.5} />
              <circle className="wheel-dot" cx={x} cy={y} r={6} fill={hex} />
            </g>
          );
        })}
        <g transform={`translate(${main.x} ${main.y})`}>
          <circle
            ref={handle}
            className="wheel-handle"
            r={10}
            fill={mainHex}
            tabIndex={0}
            role="slider"
            aria-label={strings.palettes.handleLabel}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(angle)}
            aria-valuetext={strings.palettes.handleValue(Math.round(angle), Math.round(hsv.s * 100), mainHex)}
            onKeyDown={onKeyDown}
          />
          <circle className="wheel-focus" r={15} />
        </g>
      </svg>
    </div>
  );
}
