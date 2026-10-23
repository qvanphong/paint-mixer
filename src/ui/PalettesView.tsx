import { useId, useMemo, useState, type Dispatch } from 'react';
import {
  HARMONY_RULES,
  hexToHsv,
  hsvToHex,
  paletteFor,
  suggestPalettes,
  type HarmonyRule,
  type Hex,
  type Hsv,
  type WheelMode,
} from '../core/index.ts';
import { ColorWheel } from './ColorWheel.tsx';
import { HexField, Slider, Swatch } from './controls.tsx';
import { useFlash } from './hooks.ts';
import type { Action } from './state.ts';
import { strings } from './strings.ts';

interface Props {
  main: Hex;
  harmony: HarmonyRule;
  wheel: WheelMode;
  dispatch: Dispatch<Action>;
  onSaveColor(hex: Hex): void;
}

const WHEEL_MODES: readonly WheelMode[] = ['ryb', 'rgb'];

export function PalettesView({ main, harmony, wheel, dispatch, onSaveColor }: Props) {
  // The wheel works in HSV. Round-tripping through hex loses the hue of near-gray colors
  // and the saturation of near-black ones, so the last HSV is kept while it still matches `main`.
  const [shadow, setShadow] = useState<{ hsv: Hsv; hex: Hex } | null>(null);
  const hsv = shadow?.hex === main ? shadow.hsv : hexToHsv(main);
  const setHsv = (next: Hsv) => {
    const hex = hsvToHex(next);
    setShadow({ hsv: next, hex });
    dispatch({ type: 'setMain', hex });
  };

  const palette = useMemo(() => paletteFor(main, harmony, wheel), [main, harmony, wheel]);
  const all = useMemo(() => suggestPalettes(main, wheel), [main, wheel]);
  const ruleId = useId();
  const modeName = useId();

  return (
    <section className="view" aria-labelledby="view-palettes">
      <header className="view-head">
        <h2 id="view-palettes">{strings.palettes.title}</h2>
        <p className="muted">{strings.palettes.intro}</p>
      </header>

      <div className="palette-top">
        <div className="card wheel-card">
          <ColorWheel hsv={hsv} mode={wheel} harmony={palette.colors.slice(1)} onChange={setHsv} />
        </div>

        <div className="card palette-controls">
          <HexField label={strings.palettes.mainHex} value={main} onChange={(hex) => dispatch({ type: 'setMain', hex })} />
          <Slider
            label={strings.palettes.brightness}
            value={Math.round(hsv.v * 100)}
            min={0}
            max={100}
            step={1}
            display={`${Math.round(hsv.v * 100)}%`}
            onChange={(v) => setHsv({ ...hsv, v: v / 100 })}
          />
          <div className="field">
            <label htmlFor={ruleId}>{strings.palettes.harmony}</label>
            <select
              id={ruleId}
              className="select"
              value={harmony}
              onChange={(e) => dispatch({ type: 'setHarmony', harmony: e.target.value as HarmonyRule })}
            >
              {HARMONY_RULES.map((rule) => (
                <option key={rule} value={rule}>
                  {strings.palettes.rules[rule]}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="field">
            <legend>{strings.palettes.wheelMode}</legend>
            <div className="segmented">
              {WHEEL_MODES.map((mode) => (
                <label key={mode} className="segment">
                  <input
                    type="radio"
                    name={modeName}
                    value={mode}
                    checked={wheel === mode}
                    onChange={() => dispatch({ type: 'setWheel', wheel: mode })}
                  />
                  <span>{strings.palettes.wheelModes[mode]}</span>
                </label>
              ))}
            </div>
            <p className="muted small">{strings.palettes.wheelModeHint[wheel]}</p>
          </fieldset>
        </div>
      </div>

      <section aria-labelledby="palette-swatches">
        <h3 id="palette-swatches">
          {strings.palettes.paletteHeading}: {strings.palettes.rules[harmony]}
        </h3>
        <ul className="palette-grid">
          {palette.colors.map((hex, i) => (
            <li key={`${i}-${hex}`} className="palette-item card">
              <Swatch hex={hex} className="swatch-xl" />
              <p className="palette-name">{i === 0 ? strings.palettes.main : strings.palettes.colorN(i + 1)}</p>
              <code className="mono">{hex}</code>
              <div className="palette-actions">
                <button
                  type="button"
                  className="btn"
                  aria-label={strings.palettes.getFormulaLabel(hex)}
                  onClick={() => dispatch({ type: 'findFormulaFor', hex })}
                >
                  {strings.palettes.getFormula}
                </button>
                <SaveColorButton hex={hex} onSave={onSaveColor} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="palette-all">
        <h3 id="palette-all">{strings.palettes.allHeading}</h3>
        <ul className="strips">
          {all.map(({ rule, colors }) => {
            const name = strings.palettes.rules[rule];
            return (
              <li key={rule} className="strip">
                <button
                  type="button"
                  className="strip-name"
                  aria-pressed={rule === harmony}
                  aria-label={strings.palettes.useRule(name)}
                  onClick={() => dispatch({ type: 'setHarmony', harmony: rule })}
                >
                  {name}
                </button>
                <span className="strip-colors" role="img" aria-label={strings.palettes.stripLabel(name, colors.join(', '))}>
                  {colors.map((hex, i) => (
                    <Swatch key={i} hex={hex} className="swatch-strip" />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}

function SaveColorButton({ hex, onSave }: { hex: Hex; onSave(hex: Hex): void }) {
  const [saved, flash] = useFlash();
  return (
    <>
      <button
        type="button"
        className="btn"
        aria-label={strings.palettes.saveColorLabel(hex)}
        onClick={() => {
          onSave(hex);
          flash();
        }}
      >
        {saved ? strings.common.saved : strings.common.save}
      </button>
      <span className="sr-only" role="status">
        {saved ? strings.common.saved : ''}
      </span>
    </>
  );
}
