import { parseHex, type Hex } from '../core/index.ts';

interface EyeDropperLike {
  open(): Promise<{ sRGBHex: string }>;
}
type EyeDropperConstructor = new () => EyeDropperLike;

// EyeDropper is not in lib.dom yet, so the browser API is read through a narrow structural type.
const constructorOf = (): EyeDropperConstructor | undefined =>
  (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;

export const eyeDropperSupported = (): boolean => 'EyeDropper' in window;

/** Null when the user cancels or the browser refuses. */
export async function pickScreenColor(): Promise<Hex | null> {
  const EyeDropper = constructorOf();
  if (!EyeDropper) return null;
  try {
    const { sRGBHex } = await new EyeDropper().open();
    return parseHex(sRGBHex);
  } catch {
    return null;
  }
}
