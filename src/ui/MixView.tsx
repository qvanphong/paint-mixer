import { useMemo, type Dispatch } from 'react';
import {
  describeRecipe,
  isCustomPaint,
  mixRecipe,
  paintById,
  partsToShare,
  ratioToParts,
  tints,
  withWhite,
  type Catalog,
  type Hex,
  type PaintId,
  type Recipe,
  type RecipePart,
} from '../core/index.ts';
import { CopyButton, Slider, Swatch } from './controls.tsx';
import { useFlash } from './hooks.ts';
import { CloseIcon, PlusIcon } from './icons.tsx';
import { PaintPicker } from './PaintPicker.tsx';
import { formatNumber, isRatio, RATIO_CHIPS, SHARE_MAX, SHARE_MIN, SHARE_STEP } from './ratio.ts';
import {
  MAX_PAINTS,
  MIN_PARTS,
  MIN_PAINTS,
  PARTS_MAX,
  PARTS_STEP,
  TINT_STEPS,
  WHITE_MAX,
  type Action,
  type AppState,
} from './state.ts';
import { strings } from './strings.ts';

interface Props {
  state: AppState;
  dispatch: Dispatch<Action>;
  catalog: Catalog;
  canAddCustom: boolean;
  onAddCustom(onCreated: (id: PaintId) => void): void;
  onSave(recipe: Recipe, hex: Hex): void;
}

interface PickerProps {
  catalog: Catalog;
  canAddCustom: boolean;
  onAddCustom(onCreated: (id: PaintId) => void): void;
}

function PaintRow({ part, others, canRemove, dispatch, ...picker }: PickerProps & {
  part: RecipePart;
  others: readonly RecipePart[];
  canRemove: boolean;
  dispatch: Dispatch<Action>;
}) {
  const paint = paintById(part.paintId, picker.catalog);
  const taken = [part.paintId, ...others.map((p) => p.paintId)];
  return (
    <li className="paint-row">
      <div className="paint-row-head">
        <PaintPicker
          label={strings.mix.changePaint(paint.name)}
          taken={taken}
          {...picker}
          onPick={(to) => dispatch({ type: 'replacePaint', from: part.paintId, to })}
        >
          <Swatch hex={paint.hex} className="swatch-m" />
          <span className="paint-name">
            <span>{paint.name}</span>
            <span className="mono muted">
              {[paint.pigment, isCustomPaint(paint) ? strings.customPaints.customTag : ''].filter(Boolean).join(' · ')}
            </span>
          </span>
        </PaintPicker>
        {canRemove && (
          <button
            type="button"
            className="btn btn-icon"
            aria-label={strings.mix.removePaint(paint.name)}
            onClick={() => dispatch({ type: 'removePaint', paintId: part.paintId })}
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <Slider
        label={strings.mix.partsOf(paint.name)}
        value={part.parts}
        min={MIN_PARTS}
        max={Math.max(PARTS_MAX, part.parts)}
        step={PARTS_STEP}
        display={strings.common.parts(formatNumber(part.parts))}
        onChange={(parts) => dispatch({ type: 'setParts', paintId: part.paintId, parts })}
      />
    </li>
  );
}

function RatioControls({ pair, catalog, dispatch }: { pair: readonly [RecipePart, RecipePart]; catalog: Catalog; dispatch: Dispatch<Action> }) {
  const [a, b] = pair;
  const nameA = paintById(a.paintId, catalog).name;
  const nameB = paintById(b.paintId, catalog).name;
  return (
    <div className="control-block">
      <h3>{strings.mix.ratioHeading}</h3>
      <Slider
        label={strings.mix.ratioLabel}
        value={partsToShare(a.parts, b.parts)}
        min={SHARE_MIN}
        max={SHARE_MAX}
        step={SHARE_STEP}
        display={`${formatNumber(a.parts)} : ${formatNumber(b.parts)}`}
        onChange={(share) => {
          const [ra, rb] = ratioToParts(a.paintId, b.paintId, share);
          dispatch({ type: 'setPairParts', parts: [ra.parts, rb.parts] });
        }}
      />
      <div className="chips" role="group" aria-label={strings.mix.ratioChips}>
        {RATIO_CHIPS.map(([x, y]) => (
          <button
            key={`${x}:${y}`}
            type="button"
            className="chip"
            aria-pressed={isRatio(a.parts, b.parts, [x, y])}
            aria-label={strings.mix.ratioChipLabel(x, y, nameA, nameB)}
            onClick={() => dispatch({ type: 'setPairParts', parts: [x, y] })}
          >
            {strings.mix.ratioChip(x, y)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MixView({ state, dispatch, catalog, canAddCustom, onAddCustom, onSave }: Props) {
  const { paints, extraWhite } = state;
  const recipe = useMemo(() => withWhite(paints, extraWhite), [paints, extraWhite]);
  // The reducer keeps `paints` non-empty; the guards keep a stray empty recipe from reaching mixRecipe.
  const result = useMemo(() => (recipe.length > 0 ? mixRecipe(recipe, catalog) : null), [recipe, catalog]);
  const tintHexes = useMemo(() => (paints.length > 0 ? tints(paints, TINT_STEPS, catalog) : []), [paints, catalog]);
  const [saved, flashSaved] = useFlash();

  return (
    <section className="view" aria-labelledby="view-mix">
      <header className="view-head">
        <h2 id="view-mix">{strings.mix.title}</h2>
        <p className="muted">{strings.mix.intro}</p>
      </header>

      <div className="mix-grid">
        <section className="card result-card" aria-labelledby="mix-result">
          <h3 id="mix-result">{strings.mix.resultHeading}</h3>
          {result ? (
            <>
              <Swatch hex={result} className="swatch-hero" label={strings.mix.resultLabel(result)} />
              <div className="hex-line">
                <code className="hex-value mono">{result}</code>
                <CopyButton text={result} />
              </div>
              <p className="recipe-text">{describeRecipe(recipe, catalog)}</p>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onSave(recipe, result);
                    flashSaved();
                  }}
                >
                  {strings.mix.saveToPresets}
                </button>
                <span className="muted" role="status">
                  {saved ? strings.mix.savedToPresets : ''}
                </span>
              </div>
            </>
          ) : (
            <p className="muted">{strings.mix.unmixable}</p>
          )}
        </section>

        <div className="controls">
          <section className="card" aria-labelledby="mix-paints">
            <h3 id="mix-paints">{strings.mix.paintsHeading}</h3>
            <ul className="paint-list">
              {paints.map((part) => (
                <PaintRow
                  key={part.paintId}
                  part={part}
                  others={paints.filter((p) => p !== part)}
                  canRemove={paints.length > MIN_PAINTS}
                  dispatch={dispatch}
                  catalog={catalog}
                  canAddCustom={canAddCustom}
                  onAddCustom={onAddCustom}
                />
              ))}
            </ul>
            {paints.length < MIN_PAINTS && <p className="muted">{strings.mix.addPaintHint}</p>}
            {paints.length < MAX_PAINTS ? (
              <PaintPicker
                label={strings.mix.addPaint}
                taken={paints.map((p) => p.paintId)}
                catalog={catalog}
                canAddCustom={canAddCustom}
                onAddCustom={onAddCustom}
                onPick={(paintId) => dispatch({ type: 'addPaint', paintId })}
                className="picker-add"
              >
                <PlusIcon />
                <span>{strings.mix.addPaint}</span>
              </PaintPicker>
            ) : (
              <p className="muted">{strings.mix.maxPaints}</p>
            )}
            {paints.length === 2 && <RatioControls pair={[paints[0], paints[1]]} catalog={catalog} dispatch={dispatch} />}
          </section>

          <section className="card" aria-labelledby="mix-white">
            <h3 id="mix-white">{strings.mix.whiteHeading}</h3>
            <Slider
              label={strings.mix.whiteLabel}
              value={extraWhite}
              min={0}
              max={Math.max(WHITE_MAX, extraWhite)}
              step={PARTS_STEP}
              display={strings.common.parts(formatNumber(extraWhite))}
              onChange={(parts) => dispatch({ type: 'setExtraWhite', parts })}
            />
            <ul className="tints" aria-label={strings.mix.tintChips}>
              {TINT_STEPS.map((n, i) => (
                <li key={n}>
                  <button
                    type="button"
                    className="tint"
                    aria-pressed={extraWhite === n}
                    aria-label={tintHexes[i] ? strings.mix.tintChipLabel(n, tintHexes[i]) : strings.mix.tintChip(n)}
                    onClick={() => dispatch({ type: 'setExtraWhite', parts: n })}
                  >
                    {tintHexes[i] && <Swatch hex={tintHexes[i]} className="swatch-tint" />}
                    <span className="tint-label">{strings.mix.tintChip(n)}</span>
                    <span className="tint-hex mono muted">{tintHexes[i]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
