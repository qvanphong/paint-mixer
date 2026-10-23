import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MAX_CUSTOM_PAINTS, isCustomPaint, type Catalog, type PaintId } from '../core/index.ts';
import { SearchField, Swatch } from './controls.tsx';
import { filterPaints } from './paintSearch.ts';
import { ROLE_ORDER } from './paintRoles.ts';
import { ChevronIcon, PlusIcon } from './icons.tsx';
import { strings } from './strings.ts';

interface Props {
  /** Accessible name of the trigger when its visible content is a paint, not a verb. */
  label: string;
  /** Paints already in the mix, shown but not pickable. */
  taken: readonly PaintId[];
  catalog: Catalog;
  /** False at the custom paint limit: the add entry stays visible but explains why it is disabled. */
  canAddCustom: boolean;
  onPick(id: PaintId): void;
  /** Opens the paint editor; `onCreated` receives the new paint's id so it can go straight into the mix. */
  onAddCustom(onCreated: (id: PaintId) => void): void;
  className?: string;
  children: ReactNode;
}

export function PaintPicker({ label, taken, catalog, canAddCustom, onPick, onAddCustom, className = '', children }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const shown = filterPaints(catalog.paints, query);

  useEffect(() => {
    if (!open) return;
    // A touch keyboard covering half the list on every open is worse than no search focus.
    if (window.matchMedia('(pointer: fine)').matches) search.current?.focus();
    else root.current?.querySelector<HTMLButtonElement>('.catalog-item:not(:disabled)')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && query !== '') {
      e.preventDefault();
      e.stopPropagation();
      setQuery('');
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = shown.find((p) => !taken.includes(p.id));
    if (!first) return;
    onPick(first.id);
    close();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('.catalog-item:not(:disabled)') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (document.activeElement === search.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[0]?.focus();
      }
      return;
    }
    if (at === -1) return;
    e.preventDefault();
    items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
  };

  return (
    <div className={`picker ${className}`} ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="picker-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setQuery('');
          setOpen((v) => !v);
        }}
      >
        {children}
        <ChevronIcon />
      </button>
      {open && (
        <div className="popover" role="group" aria-label={strings.mix.catalogLabel}>
          <div className="popover-search">
            <SearchField value={query} onChange={setQuery} onKeyDown={onSearchKeyDown} inputRef={search} />
          </div>
          <div className="popover-scroll">
            {shown.length === 0 && (
              <p className="muted search-empty" role="status">
                {strings.search.noMatch(query)}
              </p>
            )}
            {ROLE_ORDER.map((role) => {
              const inRole = shown.filter((p) => p.role === role);
              if (inRole.length === 0) return null;
              return (
                <section key={role}>
                  <h4 className="popover-heading">{strings.roles[role]}</h4>
                  <ul className="catalog">
                    {inRole.map((paint) => {
                      const inMix = taken.includes(paint.id);
                      return (
                        <li key={paint.id}>
                          <button
                            type="button"
                            className="catalog-item"
                            disabled={inMix}
                            onClick={() => {
                              onPick(paint.id);
                              close();
                            }}
                          >
                            <Swatch hex={paint.hex} className="swatch-s" />
                            <span className="catalog-name">
                              {paint.name}
                              {isCustomPaint(paint) && <span className="tag">{strings.customPaints.customTag}</span>}
                            </span>
                            <span className="catalog-code mono">{inMix ? strings.mix.inMix : paint.pigment}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            <div className="popover-footer">
              <button
                type="button"
                className="catalog-item catalog-add"
                disabled={!canAddCustom}
                onClick={() => {
                  close();
                  onAddCustom(onPick);
                }}
              >
                <PlusIcon />
                <span className="catalog-name">{strings.customPaints.add}</span>
              </button>
              {!canAddCustom && <p className="muted small">{strings.customPaints.limitReached(MAX_CUSTOM_PAINTS)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
