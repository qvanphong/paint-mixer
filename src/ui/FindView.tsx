import { useEffect, useId, useState, type Dispatch } from 'react';
import { describeRecipe, findFormulas, type Catalog, type Formula, type Hex, type Preset } from '../core/index.ts';
import { HexField, Swatch } from './controls.tsx';
import type { Action } from './state.ts';
import { strings } from './strings.ts';

/** Long enough to skip the intermediate colors of a picker drag, short enough to feel live. */
const SEARCH_DELAY_MS = 150;

interface Search {
  target: Hex;
  catalog: Catalog;
  formulas: Formula[];
}

function useFormulas(target: Hex, catalog: Catalog): { formulas: Formula[]; pending: boolean } {
  const [done, setDone] = useState<Search | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDone({ target, catalog, formulas: findFormulas(target, {}, catalog) }),
      SEARCH_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [target, catalog]);
  // Results from a previous catalog stay on screen, dimmed, while the new search runs, but never a recipe
  // whose paint was just deleted: the rest of the UI would look that paint up.
  const formulas = (done?.formulas ?? []).filter((f) => f.recipe.every((p) => catalog.byId(p.paintId)));
  return { formulas, pending: done?.target !== target || done.catalog !== catalog };
}

interface Props {
  target: Hex;
  catalog: Catalog;
  presets: readonly Preset[];
  dispatch: Dispatch<Action>;
}

export function FindView({ target, catalog, presets, dispatch }: Props) {
  const { formulas, pending } = useFormulas(target, catalog);
  const presetId = useId();

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

      <section className="results" aria-labelledby="find-results" aria-busy={pending}>
        <div className="results-head">
          <h3 id="find-results">{strings.find.resultsHeading}</h3>
          <p className="pending" role="status">
            {pending ? strings.find.searching : ''}
          </p>
        </div>
        {formulas.length === 0 && !pending ? <p className="muted">{strings.find.idle}</p> : null}
        <ol className={`formula-list${pending ? ' is-pending' : ''}`}>
          {formulas.map((f) => (
            <FormulaItem key={describeRecipe(f.recipe, catalog)} formula={f} target={target} catalog={catalog} dispatch={dispatch} />
          ))}
        </ol>
        <p className="muted small">{strings.find.deltaENote}</p>
      </section>
    </section>
  );
}

function FormulaItem({ formula, target, catalog, dispatch }: { formula: Formula; target: Hex; catalog: Catalog; dispatch: Dispatch<Action> }) {
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
