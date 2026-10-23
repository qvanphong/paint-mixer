import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { makeCatalog, type Paint, type PaintId, type Preset } from './core/index.ts';
import { FindView } from './ui/FindView.tsx';
import { useCustomPaints, useOwnedPaints, usePresets, useTheme } from './ui/hooks.ts';
import { MoonIcon, SunIcon } from './ui/icons.tsx';
import { MixView } from './ui/MixView.tsx';
import { OwnedPaintsDialog } from './ui/OwnedPaintsDialog.tsx';
import { PaintEditor } from './ui/PaintEditor.tsx';
import { PalettesView } from './ui/PalettesView.tsx';
import { PresetsPanel } from './ui/PresetsPanel.tsx';
import { initialState, reducer, VIEWS } from './ui/state.ts';
import { strings } from './ui/strings.ts';
import './ui/app.css';

/** Keep in sync with the sidebar breakpoint in app.css. */
const WIDE_QUERY = '(min-width: 960px)';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle className="dab dab-a" cx="11" cy="12" r="8" />
      <circle className="dab dab-b" cx="21" cy="12" r="8" />
      <circle className="dab dab-c" cx="16" cy="21" r="8" />
    </svg>
  );
}

/** What the paint editor dialog is doing; null while it is closed. */
interface EditorRequest {
  paint: Paint | null;
  /** Called with the saved paint's id after an add, e.g. to put the new paint straight into the mix. */
  onCreated?(id: PaintId): void;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Custom paints load first: presets are validated against the catalog they build.
  const customPaints = useCustomPaints();
  const catalog = useMemo(() => makeCatalog(customPaints.paints), [customPaints.paints]);
  const presets = usePresets(catalog);
  const owned = useOwnedPaints(catalog);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [ownedDialogOpen, setOwnedDialogOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
    else if (wasOpen.current) toggleRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = () => query.matches && setDrawerOpen(false);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const loadPreset = (preset: Preset) => {
    dispatch(
      preset.kind === 'recipe' ? { type: 'loadRecipe', recipe: preset.recipe } : { type: 'loadColor', hex: preset.hex },
    );
    setDrawerOpen(false);
  };

  const addCustomPaint = useCallback((onCreated?: (id: PaintId) => void) => setEditor({ paint: null, onCreated }), []);

  const saveCustomPaint = (paint: Paint) => {
    if (editor?.paint) customPaints.update(paint);
    else {
      customPaints.add(paint);
      owned.add(paint.id);
      editor?.onCreated?.(paint.id);
    }
    setEditor(null);
  };

  // One handler, so React renders the catalog, the presets, the owned list and the mix without the paint in one pass.
  const deleteCustomPaint = (paintId: PaintId) => {
    customPaints.remove(paintId);
    presets.removeUsing(paintId);
    owned.remove(paintId);
    dispatch({ type: 'customPaintDeleted', paintId });
  };

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {strings.skipToContent}
      </a>
      <header className="topbar" inert={drawerOpen}>
        <div className="brand">
          <BrandMark />
          <div>
            <h1>{strings.appName}</h1>
            <p className="tagline">{strings.tagline}</p>
          </div>
        </div>
        <nav className="views" aria-label={strings.viewsNav}>
          {VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              className="view-tab"
              aria-current={state.view === view ? 'page' : undefined}
              onClick={() => dispatch({ type: 'setView', view })}
            >
              {strings.views[view]}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button
            ref={toggleRef}
            type="button"
            className="btn drawer-toggle"
            aria-expanded={drawerOpen}
            aria-controls="presets"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {strings.presets.open(presets.presets.length)}
          </button>
          <button type="button" className="btn btn-icon" onClick={toggle} aria-label={theme === 'dark' ? strings.theme.toLight : strings.theme.toDark}>
            {nextTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      <div className="shell">
        <main id="main" className="content" tabIndex={-1} inert={drawerOpen}>
          {state.view === 'mix' && (
            <MixView
              state={state}
              dispatch={dispatch}
              catalog={catalog}
              canAddCustom={customPaints.canAdd}
              onAddCustom={addCustomPaint}
              onSave={presets.addRecipe}
            />
          )}
          {state.view === 'find' && (
            <FindView
              target={state.target}
              catalog={catalog}
              presets={presets.presets}
              owned={owned}
              onEditOwned={() => setOwnedDialogOpen(true)}
              dispatch={dispatch}
            />
          )}
          {state.view === 'palettes' && (
            <PalettesView
              main={state.main}
              harmony={state.harmony}
              wheel={state.wheel}
              dispatch={dispatch}
              onSaveColor={presets.addColor}
            />
          )}
        </main>

        <div className="backdrop" data-open={drawerOpen} onClick={() => setDrawerOpen(false)} />
        <aside
          id="presets"
          className="presets"
          data-open={drawerOpen}
          aria-labelledby="presets-title"
          onKeyDown={(e) => e.key === 'Escape' && setDrawerOpen(false)}
        >
          <PresetsPanel
            api={presets}
            catalog={catalog}
            customPaints={customPaints}
            owned={owned}
            onEditOwned={() => setOwnedDialogOpen(true)}
            onAddCustom={() => addCustomPaint()}
            onEditCustom={(paint) => setEditor({ paint })}
            onDeleteCustom={deleteCustomPaint}
            onLoad={loadPreset}
            onClose={() => setDrawerOpen(false)}
            closeRef={closeRef}
          />
        </aside>
      </div>

      <footer className="footer" inert={drawerOpen}>
        <p>{strings.footer.approximation}</p>
        <p className="muted small">{strings.footer.engine}</p>
      </footer>

      {editor && <PaintEditor paint={editor.paint} onSubmit={saveCustomPaint} onClose={() => setEditor(null)} />}
      {ownedDialogOpen && (
        <OwnedPaintsDialog
          catalog={catalog}
          initial={owned.tubes.map((p) => p.id)}
          onSave={(ids) => {
            owned.setOwned(ids);
            setOwnedDialogOpen(false);
          }}
          onClose={() => setOwnedDialogOpen(false)}
        />
      )}
    </div>
  );
}
