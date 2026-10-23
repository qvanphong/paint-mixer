import { useId, useMemo, useState, type FormEvent } from 'react';
import { WHITE, isCustomPaint, type Catalog, type PaintId } from '../core/index.ts';
import { Swatch } from './controls.tsx';
import { selectableIds, toggled } from './ownedDraft.ts';
import { ROLE_ORDER } from './paintRoles.ts';
import { strings } from './strings.ts';
import { useModalDialog } from './useModalDialog.ts';

interface Props {
  catalog: Catalog;
  /** The saved selection the dialog starts from. */
  initial: readonly PaintId[];
  /** Receives the chosen ids in catalog order. */
  onSave(ids: PaintId[]): void;
  onClose(): void;
}

/**
 * Modal dialog for choosing the paints you own. Changes apply on Save; Escape and Cancel discard them.
 * Clicking outside does not close it, so a stray click cannot throw away a long selection.
 */
export function OwnedPaintsDialog({ catalog, initial, onSave, onClose }: Props) {
  const t = strings.owned.dialog;
  const dialog = useModalDialog();
  const titleId = useId();
  const [selected, setSelected] = useState<ReadonlySet<PaintId>>(() => new Set(initial));
  const selectable = useMemo(() => selectableIds(catalog), [catalog]);
  const count = selectable.filter((id) => selected.has(id)).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(selectable.filter((id) => selected.has(id)));
  };

  return (
    <dialog
      ref={dialog}
      className="dialog owned-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form className="dialog-form" onSubmit={submit}>
        <div className="owned-head">
          <h2 id={titleId} className="dialog-title">
            {t.title}
          </h2>
          <p className="muted small">{t.intro}</p>
          <div className="owned-tools">
            <p className="owned-selected" role="status">
              {t.selected(count, selectable.length)}
            </p>
            <div className="preset-actions">
              <button type="button" className="btn btn-s" onClick={() => setSelected(new Set(selectable))}>
                {t.selectAll}
              </button>
              <button type="button" className="btn btn-s" onClick={() => setSelected(new Set())}>
                {t.clear}
              </button>
            </div>
          </div>
        </div>

        <div className="owned-list">
          {ROLE_ORDER.map((role) => {
            const inRole = catalog.paints.filter((p) => p.role === role);
            if (inRole.length === 0) return null;
            return (
              <fieldset key={role} className="owned-group">
                <legend className="owned-legend">{strings.roles[role]}</legend>
                {role === 'white' ? (
                  <>
                    <div className="owned-item owned-item-fixed">
                      <Swatch hex={WHITE.hex} className="swatch-s" />
                      <span className="catalog-name">{WHITE.name}</span>
                      <span className="tag">{t.alwaysIncluded}</span>
                    </div>
                    <p className="muted small owned-note">{t.whiteNote}</p>
                  </>
                ) : (
                  inRole.map((paint) => (
                    <label key={paint.id} className="owned-item">
                      <input
                        type="checkbox"
                        checked={selected.has(paint.id)}
                        onChange={() => setSelected((s) => toggled(s, paint.id))}
                      />
                      <Swatch hex={paint.hex} className="swatch-s" />
                      <span className="catalog-name">
                        {paint.name}
                        {isCustomPaint(paint) && <span className="tag">{strings.customPaints.customTag}</span>}
                      </span>
                      <span className="catalog-code mono">{paint.pigment}</span>
                    </label>
                  ))
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {t.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
