import { useEffect, useId, useMemo, useState, type Dispatch } from 'react';
import { WHITE, describeRecipe, findFormulas, type Catalog, type Formula, type Hex, type PaintId, type Preset } from '../core/index.ts';
import { HexField, Swatch } from './controls.tsx';
import type { OwnedPaintsApi } from './hooks.ts';
import type { Action } from './state.ts';
import { strings } from './strings.ts';

/** Long enough to skip the intermediate colors of a picker drag, short enough to feel live. */
const SEARCH_DELAY_MS = 150;

interface Search {
  target: Hex;
  catalog: Catalog;
  only: ReadonlySet<PaintId> | undefined;
  formulas: Formula[];
}

/** Whether every paint of the recipe may still be shown: it exists in the catalog and, when filtering, is owned or white. */
const isShowable = (f: Formula, catalog: Catalog, only: ReadonlySet<PaintId> | undefined) =>
  f.recipe.every((p) => catalog.byId(p.paintId) && (!only || p.paintId === WHITE.id || only.has(p.paintId)));

/** `only` is the owned set when the filter is on, undefined when it is off. `enabled` is false when there is nothing to search with. */
function useFormulas(target: Hex, catalog: Catalog, only: ReadonlySet<PaintId> | undefined, enabled: boolean) {
  const [done, setDone] = useState<Search | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(
      () => setDone({ target, catalog, only, formulas: findFormulas(target, { only }, catalog) }),
      SEARCH_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [target, catalog, only, enabled]);
  if (!enabled) return { formulas: [], pending: false };
  // Results from a previous search stay on screen, dimmed, while the new one runs, but never a recipe the rest
  // of the UI could not show: a deleted paint would fail its lookup, and an unowned paint breaks the filter.
  const formulas = (done?.formulas ?? []).filter((f) => isShowable(f, catalog, only));
  const current = done?.target === target && done.catalog === catalog && done.only === only;
  return { formulas, pending: !current };
}

interface Props {
  target: Hex;
  catalog: Catalog;
  presets: readonly Preset[];
  owned: OwnedPaintsApi;
  onEditOwned(): void;
  dispatch: Dispatch<Action>;
}

export function FindView({ target, catalog, presets, owned, onEditOwned, dispatch }: Props) {
  const restricted = owned.owned.enabled;
  const ownedCount = owned.tubes.length;
  const noOwnedPaints = restricted && ownedCount === 0;
  const only = useMemo(() => (restricted ? new Set(owned.tubes.map((p) => p.id)) : undefined), [restricted, owned.tubes]);
  const { formulas, pending } = useFormulas(target, catalog, only, !noOwnedPaints);
  const presetId = useId();
  const ownedCountId = useId();

  return (
    <section className="view" aria-labelledby="view-find">
      <header className="view-head">
        <h2 id="view-find">{strings.find.title}</h2>
        <p className="muted">{strings.find.intro}</p>
      </header>

      <section className="card target-card" aria-labelledby="find-target">
        <h3 id="find-target">{strings.find.targetHeading}</h3>
        <div className="target-row">
          <Swatch hex={target} className="swatch-l target-swatch" label={`${strings.find.target} ${target}`} />
          <div className="target-fields">
            <HexField label={strings.find.targetHex} value={target} onChange={(hex) => dispatch({ type: 'setTarget', hex })} />
            <div className="field">
              <label htmlFor={presetId}>{strings.find.fromPreset}</label>
              <select
                id={presetId}
                className="select"
                value=""
                disabled={presets.length === 0}
                onChange={(e) => {
                  const preset = presets.find((p) => p.id === e.target.value);
                  if (preset) dispatch({ type: 'setTarget', hex: preset.hex });
                }}
              >
                <option value="" disabled>
                  {presets.length === 0 ? strings.find.noPresets : strings.find.choosePreset}
                </option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.hex})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="card owned-filter" aria-label={strings.owned.filterLabel}>
        <label className="check">
          <input
            type="checkbox"
            checked={restricted}
            aria-describedby={ownedCountId}
            onChange={(e) => owned.setEnabled(e.target.checked)}
          />
          <span>{strings.owned.filterLabel}</span>
        </label>
        <p id={ownedCountId} className="muted small owned-count">
          {strings.owned.count(ownedCount)}
        </p>
        <button type="button" className="btn btn-s" onClick={onEditOwned}>
          {strings.owned.edit}
        </button>
        {owned.saveFailed && (
          <p className="notice owned-notice" role="alert">
            {strings.owned.storageFailed}
          </p>
        )}
      </section>

      <section className="results" aria-labelledby="find-results" aria-busy={pending}>
        <div className="results-head">
          <h3 id="find-results">{strings.find.resultsHeading}</h3>
          <p className="pending" role="status">
            {pending ? strings.find.searching : ''}
          </p>
        </div>
        {restricted && !noOwnedPaints && <p className="muted small">{strings.owned.usingHeader(ownedCount)}</p>}
        {noOwnedPaints && (
          <div className="owned-empty">
            <p>
              <strong>{strings.owned.emptyTitle}</strong>
            </p>
            <p className="muted">{strings.owned.emptyBody}</p>
            <button type="button" className="btn" onClick={onEditOwned}>
              {strings.owned.edit}
            </button>
          </div>
        )}
        {formulas.length === 0 && !pending && !noOwnedPaints ? <p className="muted">{strings.find.idle}</p> : null}
        <ol className={`formula-list${pending ? ' is-pending' : ''}`}>
          {formulas.map((f) => (
            <FormulaItem
              key={describeRecipe(f.recipe, catalog)}
              formula={f}
              target={target}
              catalog={catalog}
              hintMorePaints={restricted}
              dispatch={dispatch}
            />
          ))}
        </ol>
        <p className="muted small">{strings.find.deltaENote}</p>
      </section>
    </section>
  );
}

interface ItemProps {
  formula: Formula;
  target: Hex;
  catalog: Catalog;
  /** True when the search was limited to owned paints, where an approximate match may improve with more. */
  hintMorePaints: boolean;
  dispatch: Dispatch<Action>;
}

function FormulaItem({ formula, target, catalog, hintMorePaints, dispatch }: ItemProps) {
  const text = describeRecipe(formula.recipe, catalog);
  return (
    <li className="formula">
      <div className="pair" role="img" aria-label={strings.find.swatchPair(formula.result, target)}>
        <Swatch hex={formula.result} className="swatch-l pair-mix" />
        <Swatch hex={target} className="swatch-l pair-target" />
        <span className="pair-captions" aria-hidden="true">
          <span>{strings.find.mix}</span>
          <span>{strings.find.target}</span>
        </span>
      </div>
      <div className="formula-body">
        <p className="formula-meta">
          <span className={`badge badge-${formula.match}`}>{strings.find.match[formula.match]}</span>
          <span className="mono muted">{strings.find.deltaE(formula.deltaE)}</span>
          <span className="mono muted">{formula.result}</span>
        </p>
        <p className="recipe-text">{text}</p>
        {hintMorePaints && formula.match === 'approx' && <p className="muted small">{strings.find.approxHint}</p>}
        <button
          type="button"
          className="btn"
          aria-label={strings.find.openInMixerLabel(text)}
          onClick={() => dispatch({ type: 'loadRecipe', recipe: formula.recipe })}
        >
          {strings.find.openInMixer}
        </button>
      </div>
    </li>
  );
}
