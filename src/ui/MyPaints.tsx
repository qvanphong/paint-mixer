import { useRef, useState } from 'react';
import { MAX_CUSTOM_PAINTS, type Paint, type PaintId, type Preset } from '../core/index.ts';
import { countPresetsUsing } from './cascade.ts';
import { Swatch } from './controls.tsx';
import type { CustomPaintsApi } from './hooks.ts';
import { PlusIcon } from './icons.tsx';
import { strings } from './strings.ts';

interface Props {
  api: CustomPaintsApi;
  presets: readonly Preset[];
  onAdd(): void;
  onEdit(paint: Paint): void;
  onDelete(id: PaintId): void;
}

export function MyPaints({ api, presets, onAdd, onEdit, onDelete }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const t = strings.customPaints;

  return (
    <section className="preset-group my-paints" aria-labelledby="my-paints-title">
      <h3 id="my-paints-title" ref={heading} tabIndex={-1}>
        {t.heading} <span className="small">({t.count(api.paints.length, MAX_CUSTOM_PAINTS)})</span>
      </h3>
      {api.saveFailed && (
        <p className="notice" role="alert">
          {t.storageFailed}
        </p>
      )}
      {api.paints.length === 0 ? (
        <p className="muted small">{t.empty}</p>
      ) : (
        <ul className="preset-list">
          {api.paints.map((paint) => (
            <MyPaintItem
              key={paint.id}
              paint={paint}
              recipes={countPresetsUsing(presets, paint.id)}
              onEdit={onEdit}
              onDelete={(id) => {
                onDelete(id);
                // The item is about to unmount; keep keyboard focus inside the panel.
                heading.current?.focus();
              }}
            />
          ))}
        </ul>
      )}
      <button type="button" className="btn my-paints-add" disabled={!api.canAdd} onClick={onAdd}>
        <PlusIcon />
        <span>{t.add}</span>
      </button>
      {!api.canAdd && <p className="muted small">{t.limitReached(MAX_CUSTOM_PAINTS)}</p>}
    </section>
  );
}

function MyPaintItem({ paint, recipes, onEdit, onDelete }: {
  paint: Paint;
  recipes: number;
  onEdit(paint: Paint): void;
  onDelete(id: PaintId): void;
}) {
  const [confirming, setConfirming] = useState(false);
  const t = strings.customPaints;

  return (
    <li className="preset">
      <div className="preset-main">
        <Swatch hex={paint.hex} className="swatch-m" />
        <span className="preset-text">
          <span className="preset-name">{paint.name}</span>
          <span className="mono muted small">{paint.pigment || strings.customPaints.customTag}</span>
        </span>
      </div>
      {confirming ? (
        <div className="confirm" role="group" aria-label={t.deleteLabel(paint.name)}>
          <p className="small">{t.confirmDelete(paint.name, recipes)}</p>
          <div className="preset-actions">
            <button type="button" className="btn btn-danger btn-s" onClick={() => onDelete(paint.id)}>
              {t.confirmYes}
            </button>
            <button type="button" className="btn btn-s" autoFocus onClick={() => setConfirming(false)}>
              {t.confirmNo}
            </button>
          </div>
        </div>
      ) : (
        <div className="preset-actions">
          <button type="button" className="btn btn-s" aria-label={t.editLabel(paint.name)} onClick={() => onEdit(paint)}>
            {t.edit}
          </button>
          <button type="button" className="btn btn-s" aria-label={t.deleteLabel(paint.name)} onClick={() => setConfirming(true)}>
            {t.delete}
          </button>
        </div>
      )}
    </li>
  );
}
