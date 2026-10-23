import { useId, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { parseHex, type Hex } from '../core/index.ts';
import { useFlash } from './hooks.ts';
import { CheckIcon, CopyIcon, SearchIcon } from './icons.tsx';
import { strings } from './strings.ts';

interface SwatchProps {
  hex: Hex;
  className?: string;
  /** Without a label the swatch is decorative: the hex or name next to it carries the meaning. */
  label?: string;
}

export function Swatch({ hex, className = '', label }: SwatchProps) {
  return (
    <span
      className={`swatch ${className}`}
      style={{ backgroundColor: hex }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Text shown beside the label, e.g. "3 parts". */
  display: string;
  onChange(value: number): void;
}

export function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  const id = useId();
  const clamped = Math.min(max, Math.max(min, value));
  const style = { '--pct': `${((clamped - min) / (max - min)) * 100}%` } as CSSProperties;
  return (
    <div className="slider">
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        style={style}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

interface SearchFieldProps {
  value: string;
  onChange(value: string): void;
  onKeyDown?(e: KeyboardEvent<HTMLInputElement>): void;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

export function SearchField({ value, onChange, onKeyDown, inputRef, className = '' }: SearchFieldProps) {
  return (
    <div className={`search ${className}`}>
      <SearchIcon />
      <input
        ref={inputRef}
        type="search"
        className="text-input search-input"
        aria-label={strings.search.label}
        placeholder={strings.search.placeholder}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

interface HexFieldProps {
  label: string;
  value: Hex;
  onChange(hex: Hex): void;
}

/** Hex text input plus the native color picker. Valid text commits immediately; invalid text stays as typed. */
export function HexField({ label, value, onChange }: HexFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseHex(draft) === null;
  return (
    <div className="hexfield">
      <label htmlFor={id}>{label}</label>
      <div className="hexfield-row">
        <input
          type="color"
          className="color-input"
          aria-label={strings.common.pickColor}
          value={value.toLowerCase()}
          onChange={(e) => {
            const hex = parseHex(e.target.value);
            if (hex) onChange(hex);
          }}
        />
        <input
          id={id}
          type="text"
          className="text-input mono"
          spellCheck={false}
          autoComplete="off"
          maxLength={9}
          value={draft ?? value}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            const hex = parseHex(e.target.value);
            if (hex) onChange(hex);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      {invalid && (
        <p id={errorId} className="field-error">
          {strings.common.hexInvalid}
        </p>
      )}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'copied' | 'failed' | null>(null);
  const [flash, trigger] = useFlash();
  const shown = flash ? state : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    trigger();
  };

  return (
    <>
      <button type="button" className="btn" onClick={copy} aria-label={strings.common.copyHex(text)}>
        {shown === 'copied' ? <CheckIcon /> : <CopyIcon />}
        <span>{shown === 'copied' ? strings.common.copied : strings.common.copy}</span>
      </button>
      <span className="sr-only" role="status">
        {shown === 'copied' ? strings.common.copied : shown === 'failed' ? strings.common.copyFailed : ''}
      </span>
    </>
  );
}
