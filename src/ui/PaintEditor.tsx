import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { NAME_MAX_LENGTH, MAX_PIGMENT_LENGTH, newCustomPaintId, type Paint, type PaintRole } from '../core/index.ts';
import { HexField, Slider, Swatch } from './controls.tsx';
import { eyeDropperSupported, pickScreenColor } from './eyedropper.ts';
import {
  DEFAULT_DRAFT,
  SLIDER_MAX,
  SLIDER_MIN,
  SLIDER_STEP,
  draftFromPaint,
  draftToPaint,
  nameIsEmpty,
  previewMixes,
  sliderToTinting,
  strengthBand,
  tintingToSlider,
  type PaintDraft,
} from './paintDraft.ts';
import { strings } from './strings.ts';

const ROLE_OPTIONS: readonly PaintRole[] = ['chromatic', 'earth', 'black', 'white'];

interface Props {
  /** The paint being edited, or null to add a new one. */
  paint: Paint | null;
  onSubmit(paint: Paint): void;
  onClose(): void;
}

/**
 * Modal dialog for adding or editing a custom paint. The native <dialog> traps focus and makes the
 * page inert; focus goes to the name field on open and back to the opener on close.
 */
export function PaintEditor({ paint, onSubmit, onClose }: Props) {
  const t = strings.paintEditor;
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PaintDraft>(() => (paint ? draftFromPaint(paint) : DEFAULT_DRAFT));
  const [showNameError, setShowNameError] = useState(false);
  const [failed, setFailed] = useState(false);
  const ids = { title: useId(), name: useId(), nameError: useId(), role: useId(), roleHint: useId(), pigment: useId() };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => {
      element.close();
      opener?.focus();
    };
  }, []);

  const set = <K extends keyof PaintDraft>(key: K, value: PaintDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const preview = useMemo(() => previewMixes(draft), [draft]);
  const band = strengthBand(draft.tinting);
  const nameError = showNameError && nameIsEmpty(draft.name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (nameIsEmpty(draft.name)) {
      setShowNameError(true);
      nameInput.current?.focus();
      return;
    }
    const next = draftToPaint(draft, paint?.id ?? newCustomPaintId());
    if (next) onSubmit(next);
    else setFailed(true);
  };

  const pickFromScreen = async () => {
    const hex = await pickScreenColor();
    if (hex) set('hex', hex);
  };

  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby={ids.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="dialog-form" onSubmit={submit} noValidate>
        <h2 id={ids.title} className="dialog-title">
          {paint ? t.editTitle(paint.name) : t.addTitle}
        </h2>

        <div className="field">
          <label htmlFor={ids.name}>{t.name}</label>
          <input
            ref={nameInput}
            id={ids.name}
            className="text-input"
            type="text"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            value={draft.name}
            aria-invalid={nameError}
            aria-describedby={nameError ? ids.nameError : undefined}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => setShowNameError(true)}
          />
          {nameError ? (
            <p id={ids.nameError} className="field-error">
              {t.nameRequired}
            </p>
          ) : (
            <p className="muted small">{t.nameHint}</p>
          )}
        </div>

        <div className="field">
          <HexField label={t.color} value={draft.hex} onChange={(hex) => set('hex', hex)} />
          <div className="color-extras">
            <p className="muted small">{t.colorHint}</p>
            {eyeDropperSupported() && (
              <button type="button" className="btn btn-s" onClick={pickFromScreen}>
                {t.eyedropper}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <Slider
            label={t.strength}
            value={tintingToSlider(draft.tinting)}
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            display={t.strengthValue(t.bands[band].label, draft.tinting)}
            onChange={(position) => set('tinting', sliderToTinting(position))}
          />
          <p className="muted small">{t.bands[band].examples}</p>
          <p className="muted small">{t.strengthHint}</p>
        </div>

        <div className="dialog-row">
          <div className="field">
            <label htmlFor={ids.role}>{t.role}</label>
            <select
              id={ids.role}
              className="select"
              value={draft.role}
              aria-describedby={draft.role === 'white' ? ids.roleHint : undefined}
              onChange={(e) => set('role', ROLE_OPTIONS.find((r) => r === e.target.value) ?? draft.role)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {t.roles[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.pigment}>{t.pigment}</label>
            <input
              id={ids.pigment}
              className="text-input mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_PIGMENT_LENGTH}
              placeholder={t.pigmentPlaceholder}
              value={draft.pigment}
              onChange={(e) => set('pigment', e.target.value)}
            />
          </div>
        </div>
        {draft.role === 'white' && (
          <p id={ids.roleHint} className="muted small">
            {t.roleHintWhite}
          </p>
        )}

        <section className="preview" aria-labelledby={`${ids.title}-preview`}>
          <h3 id={`${ids.title}-preview`} className="preview-heading">
            {t.previewHeading}
          </h3>
          <ul className="preview-grid">
            {(
              [
                [t.previewAlone, preview.alone],
                [t.previewWhite, preview.withWhite],
                [t.previewBlue, preview.withBlue],
              ] as const
            ).map(([caption, hex]) => (
              <li key={caption} className="preview-item">
                <Swatch hex={hex} className="swatch-xl" />
                <span className="small">{caption}</span>
                <span className="mono muted small">{hex}</span>
              </li>
            ))}
          </ul>
        </section>

        {failed && (
          <p className="field-error" role="alert">
            {t.saveFailed}
          </p>
        )}

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
