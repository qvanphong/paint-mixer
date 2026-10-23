import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { describeRecipe, type Catalog, type Paint, type PaintId, type Preset } from '../core/index.ts';
import { Swatch } from './controls.tsx';
import { CloseIcon } from './icons.tsx';
import type { CustomPaintsApi, OwnedPaintsApi, PresetsApi } from './hooks.ts';
import { MyPaints } from './MyPaints.tsx';
import { strings } from './strings.ts';

interface Props {
  api: PresetsApi;
  catalog: Catalog;
  customPaints: CustomPaintsApi;
  owned: OwnedPaintsApi;
  onEditOwned(): void;
  onAddCustom(): void;
  onEditCustom(paint: Paint): void;
  onDeleteCustom(id: PaintId): void;
  onLoad(preset: Preset): void;
  onClose(): void;
  closeRef: Ref<HTMLButtonElement>;
}

export function PresetsPanel({ api, catalog, customPaints, owned, onEditOwned, onAddCustom, onEditCustom, onDeleteCustom, onLoad, onClose, closeRef }: Props) {
  const mixes = api.presets.filter((p) => p.kind === 'recipe');
  const colors = api.presets.filter((p) => p.kind === 'color');

  return (
    <>
      <div className="presets-head">
        <h2 id="presets-title">{strings.presets.heading}</h2>
        <button ref={closeRef} type="button" className="btn btn-icon drawer-close" onClick={onClose} aria-label={strings.common.close}>
          <CloseIcon />
        </button>
      </div>
      {api.saveFailed && (
        <p className="notice" role="alert">
          {strings.presets.storageFailed}
        </p>
      )}
      {api.presets.length === 0 ? (
        <p className="muted">{strings.presets.empty}</p>
      ) : (
        <>
          <PresetGroup title={strings.presets.mixes} items={mixes} api={api} catalog={catalog} onLoad={onLoad} />
          <PresetGroup title={strings.presets.colors} items={colors} api={api} catalog={catalog} onLoad={onLoad} />
        </>
      )}
      <MyPaints
        api={customPaints}
        presets={api.presets}
        owned={owned}
        onEditOwned={onEditOwned}
        onAdd={onAddCustom}
        onEdit={onEditCustom}
        onDelete={onDeleteCustom}
      />
    </>
  );
}

function PresetGroup({ title, items, api, catalog, onLoad }: { title: string; items: readonly Preset[]; api: PresetsApi; catalog: Catalog; onLoad(p: Preset): void }) {
  if (items.length === 0) return null;
  return (
    <section className="preset-group">
      <h3>{title}</h3>
      <ul className="preset-list">
        {items.map((preset) => (
          <PresetItem key={preset.id} preset={preset} api={api} catalog={catalog} onLoad={onLoad} />
        ))}
      </ul>
    </section>
  );
}

function PresetItem({ preset, api, catalog, onLoad }: { preset: Preset; api: PresetsApi; catalog: Catalog; onLoad(p: Preset): void }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm'>('view');
  const [draft, setDraft] = useState(preset.name);

  const renameButton = useRef<HTMLButtonElement>(null);
  // Set by Enter/Escape so focus returns to the Rename button; a blur-commit must not steal focus.
  const refocus = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (mode === 'view' && refocus.current) renameButton.current?.focus();
    refocus.current = false;
  }, [mode]);

  const finishRename = (commit: boolean) => {
    if (commit) api.rename(preset.id, draft);
    setMode('view');
  };
  const onRenameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      refocus.current = true;
      finishRename(true);
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      refocus.current = true;
      cancelled.current = true;
      finishRename(false);
    }
  };

  return (
    <li className="preset">
      {mode === 'rename' ? (
        <div className="preset-main">
          <Swatch hex={preset.hex} className="swatch-m" />
          <input
            className="text-input"
            aria-label={strings.presets.renameLabel(preset.name)}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onRenameKey}
            onBlur={() => !cancelled.current && finishRename(true)}
          />
        </div>
      ) : (
        <button type="button" className="preset-main preset-load" aria-label={strings.presets.load(preset.name)} onClick={() => onLoad(preset)}>
          <Swatch hex={preset.hex} className="swatch-m" />
          <span className="preset-text">
            <span className="preset-name">{preset.name}</span>
            <span className="muted small">
              {preset.kind === 'recipe' ? describeRecipe(preset.recipe, catalog) : strings.presets.colorKind}
            </span>
            <span className="mono muted small">{preset.hex}</span>
          </span>
        </button>
      )}
      <div className="preset-actions">
        {mode === 'confirm' ? (
          <>
            <span className="small">{strings.presets.confirmDelete}</span>
            <button type="button" className="btn btn-danger btn-s" onClick={() => api.remove(preset.id)}>
              {strings.presets.confirmYes}
            </button>
            <button type="button" className="btn btn-s" autoFocus onClick={() => setMode('view')}>
              {strings.presets.confirmNo}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-s"
              disabled={mode === 'rename'}
              ref={renameButton}
              onClick={() => {
                cancelled.current = false;
                setDraft(preset.name);
                setMode('rename');
              }}
            >
              {strings.presets.rename}
            </button>
            <button
              type="button"
              className="btn btn-s"
              aria-label={strings.presets.deleteLabel(preset.name)}
              onClick={() => setMode('confirm')}
            >
              {strings.presets.delete}
            </button>
          </>
        )}
      </div>
    </li>
  );
}
