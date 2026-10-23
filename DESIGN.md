# Color Mixer: design

Web app that teaches artists to mix acrylic and oil paint. Reference: https://colorme.vn/tools/color-mixer (Kubelka-Munk mixing, "mix" mode and "find formula" mode, tube colors in integer parts, ratio chips, white tints). Palette reference: https://color.adobe.com/create/color-wheel.

Improvements over the reference: saved presets, sliders for ratio and extra white, palette suggestions from a main color, an interactive color wheel with harmony rules.

Stack: Vite, React 19, TypeScript (strict), Vitest, `spectral.js` 3.0.0 (MIT, Kubelka-Munk engine, same one the reference ships).

## Verified facts about the engine

- `spectral.mix([a, f1], [b, f2])` weights each color by `f^2 * tintingStrength^2 * luminance`.
- To make `parts` linear (what a painter measures), pass `f = Math.sqrt(parts)`.
- Calibrated against the reference: `#1C3A94` + `#F7E11B` at 1:1 gives `#69A245`, at 4:1 gives `#35784E`, both with `f = sqrt(parts)`.
- `spectral.js` is untyped UMD (`require`/global). Wrap it once in `src/core/engine.ts`, nothing else imports it.
- `Color` exposes `.OKLab`, `.KS` (38 wavelengths), `.luminance`, `.tintingStrength` (settable), `.toString()` (hex).

## Domain model (src/core)

```ts
type Hex = string & { readonly __brand: 'Hex' };      // '#RRGGBB' uppercase, parsed at the boundary
type PaintId = string & { readonly __brand: 'PaintId' };

interface Paint {
  id: PaintId; name: string; pigment: string;         // e.g. 'PB29'
  hex: Hex;                                           // on-screen masstone
  tinting: number;                                    // relative tinting strength, 1 = average
  role: 'white' | 'black' | 'chromatic' | 'earth';
}

interface RecipePart { paintId: PaintId; parts: number }   // parts > 0, may be fractional (sliders)
type Recipe = readonly RecipePart[];                       // no duplicate paintIds, white is just a Paint
```

Organizing structure: the paint catalog is a typed table (`PAINTS`, `paintById`), the mix result is a pure function of `Recipe`, presets are a validated, versioned record.

## Modules

| File | Contract |
| --- | --- |
| `engine.ts` | Only importer of `spectral.js`. Exports `mixHex(inputs: {hex: Hex; tinting: number; parts: number}[]): Hex`. |
| `color.ts` | `parseHex`, `toHex`, `hexToOklab`, `oklabToHex`, `hexToHsv`, `hsvToHex`, `deltaE(a, b)` (OKLab euclidean x100), `luminance`. |
| `paints.ts` | `PAINTS`: about 24 real artist paints (white, black, yellows, ochre, oranges, reds, magentas, violet, blues, greens, earths). Name, pigment code (PW6, PB29, PY35, PR108, PBr7...), masstone hex, tinting strength. |
| `mix.ts` | `mixRecipe(recipe: Recipe): Hex` (throws on an empty recipe). `describeRecipe(recipe): string`. `withWhite(recipe, extra)`, `tints(recipe, whiteParts[]): Hex[]`. `ratioToParts(a, b, share)` where `share` is a's fraction in (0, 1) and the minority paint gets 1 part; `partsToShare(aParts, bParts)` is its inverse. |
| `formula.ts` | `findFormulas(target: Hex, opts?): Formula[]` where `Formula = { recipe: Recipe; result: Hex; deltaE: number; match: 'exact' \| 'close' \| 'approx' }`. |
| `wheel.ts` | RYB and RGB color wheels: `hueToWheel(h, mode)`, `wheelToHue(w, mode)`. |
| `harmony.ts` | `suggestPalettes(main: Hex, wheel: 'ryb' \| 'rgb'): Palette[]` for monochromatic, analogous, complementary, split-complementary, triadic, tetradic, shades. `paletteFor(main, rule, wheel)` for one rule (live drag). `Palette = { rule, colors }`, `colors[0]` is always the main color. |
| `presets.ts` | `Preset = { id, name, createdAt, hex } & ({ kind: 'color' } \| { kind: 'recipe', recipe })`. `loadPresets(storage)`, `savePresets(storage, presets): boolean` (false when storage refuses). `StorageLike = { getItem, setItem }`. Stored as `{ version: 1, presets }`. Validates on load (drop bad records and duplicate ids, never throw), key `color-mixer:presets:v1`. |
| `index.ts` | Public API re-exports. `fastmix.ts` is internal to `formula.ts`. |

## Formula finder (the "discover, do not pick randomly" requirement)

Goal: given a target color, return the simplest real recipes (up to 3 paints plus optional white, small integer parts) that mix closest to it under the Kubelka-Munk model.

Method:
1. Mix model is the same `mixRecipe` the UI uses, so the formula's `result` is exactly what the mixer shows.
2. Candidate paints: all chromatic, earth and black paints, plus white as an optional fourth component.
3. Search integer parts, total at most 12, each component from 1, reduced ratios only (2:2 is 1:1). Singles and pairs (each with and without white) are exhaustive; triples come only from the 10 paints that did best alone or in a pair (beam). When the best white recipe hits the 12-part cap with white as the largest share, white alone is extended (14 to 60 parts) so pale tints are reachable. The inner loop uses `fastmix.ts`, a copy of spectral.js's K/S math on precomputed `.KS` and weights (agrees with `mixRecipe` within deltaE 0.18 over 200 random recipes); shown `result` and `deltaE` always come from `mixRecipe`. Measured about 57 ms per call (148k fast mixes).
4. One formula per paint set (other ratios of the same paints are the same advice). Rank: every `exact` (deltaE < 2) recipe first, ordered fewer paints, then fewer total parts, because below 2 the eye cannot pick a winner; past that, deltaE at 0.1 precision, ties to fewer paints then fewer parts.
5. `match`: `exact` when deltaE < 2, `close` < 5, otherwise `approx`.
6. Targets outside the paint gamut return the closest reachable recipes with `approx`.

Correctness checks (tests, not vibes):
- Known outcomes: ultramarine + cadmium yellow gives a green hue, cadmium red + cadmium yellow gives orange, red + blue gives a muted purple, burnt sienna + ultramarine gives a near-black, a color plus its complement desaturates, ultramarine + white at 1:1 gives a light blue (OKLab L between 0.55 and 0.85).
- Round trip: for 30 random recipes, `findFormulas(mixRecipe(r))[0].deltaE < 2`.
- `mixRecipe` with one paint returns that paint's masstone.
- `mixRecipe` is order independent and scale invariant (2:2 equals 1:1).

## Harmony and wheel

- Artists think on the RYB wheel (red, yellow, blue primaries), screens on the RGB/HSV wheel. Offer both. RYB is a piecewise-linear hue remap through Itten anchors: red 0, orange 60, yellow 120, green 180, blue 240, violet 300 in RYB degrees, mapped to HSV hues 0, 30, 60, 120, 240, 280. (Primaries 120 degrees apart is what makes red/green, blue/orange and yellow/violet complements.)
- Harmony rotates the main color's hue on the chosen wheel, keeps its HSV saturation and value, then maps back.
- Monochromatic and shades vary lightness by mixing with white and black through the Kubelka-Munk engine, so the tints are mixable in real paint.

## UI (src/ui)

Three views in one page with a header (title, theme toggle):

1. **Mix.** Pick 2 to 4 paints from a catalog popover. Per-paint parts slider (0.5 to 20, step 0.5). For two paints a single ratio slider from 1:9 to 9:1 plus ratio chips (4:1, 3:1, 2:1, 1:1, 1:2, 1:3, 1:4). Extra white slider (0 to 20 parts) plus tint strip chips (+1, +2, +4, +8, +16) showing the resulting swatches. Result swatch with hex, copy, recipe text (e.g. `3 parts Ultramarine + 1 part Cadmium Yellow + 2 parts Titanium White`), save to presets.
2. **Find formula.** Color input (picker + hex field), or pick from a saved preset. Shows the top 3 to 5 recipes with result swatch, deltaE label and a button that opens the recipe in Mix.
3. **Palettes.** SVG hue/saturation color wheel (Adobe style), draggable main handle, harmony handles update live, harmony selector, RYB/RGB toggle. Palette swatches below, each with hex, "get formula" (jumps to Find formula) and "save".

Presets panel (sidebar, drawer on narrow screens): saved colors and recipes, click to load, rename, delete, persists in `localStorage`.

Light and dark theme: CSS custom properties on `:root[data-theme]`, default follows `prefers-color-scheme`, toggle persisted in `localStorage`, no flash on load (inline script in `index.html`).

State: one `useReducer` for the mixer (recipe), main color and view; presets in their own hook backed by `presets.ts`. No global state library.

Accessibility: every control labeled, keyboard-operable sliders, visible focus, contrast checked in both themes, swatches have text labels, not color alone.

## Custom paints

Artists own paints that are not in the built-in list, so users can add their own.

Data shape: a custom paint is a `Paint` (same type as built-ins) with `id` of the form `custom-<random>`, a name of 1 to 40 characters, a masstone `hex`, a `tinting` strength clamped to 0.2..4 (default 1), a `role` (`chromatic` | `earth` | `black` | `white`, default `chromatic`) and an optional `pigment` code (empty string allowed). Custom ids never collide with built-in ids.

Organizing structure: an explicit `Catalog` value, not a global registry.

```ts
interface Catalog { readonly paints: readonly Paint[]; byId(id: PaintId): Paint | undefined }
const BUILTIN_CATALOG: Catalog
function makeCatalog(custom: readonly Paint[]): Catalog   // built-ins first, then custom, in insertion order
```

Every core function that looks a paint up (`mixRecipe`, `describeRecipe`, `tints`, `findFormulas`, `parsePreset`, `loadPresets`, `parsePaintId`) takes an optional trailing `catalog` argument defaulting to `BUILTIN_CATALOG`, so existing callers and tests keep working. `paintById(id, catalog?)` still throws on unknown ids. `WHITE` stays Titanium White and is always the extra-white paint. A custom `white` or `black` role paint is a normal paint in the picker, and a custom white is not used as the finder's white.

Persistence: `src/core/customPaints.ts` with key `color-mixer:custom-paints:v1`, stored as `{version: 1, paints: [...]}`, pure functions over `StorageLike` like presets. Load validates every field, drops corrupt entries and duplicate ids, never throws. Save returns false when storage refuses. Limit 30 custom paints so the formula search stays fast. The UI loads custom paints first, builds the catalog, then loads presets against it.

Deleting or editing: editing keeps the id so saved recipes follow the new color. Deleting a custom paint also removes recipe presets that use it and drops it from the current mix. The UI states the count before confirming.

UI: an "Add custom paint" entry at the end of the paint picker, plus a "My paints" section in the Saved panel (list, edit, delete, add). One `PaintEditor` dialog does add and edit: name, color (native picker, hex field, and the EyeDropper API button when `'EyeDropper' in window`), strength slider with plain labels (weak, normal, strong) and typical examples, paint type select, optional pigment code, and a live preview showing the paint alone, mixed 1:1 with titanium white, and mixed 1:1 with ultramarine so the user can calibrate strength by eye. Custom paints appear in the picker under their role group with a "Custom" marker, are included in Find formula, and are used everywhere a paint name is shown.

## Scope notes

- English UI. The reference is Vietnamese. Strings live in `src/ui/strings.ts` so a Vietnamese table can be added.
- No separate acrylic/oil switch: Kubelka-Munk on masstones does not model medium differences, so the app says so in an info note instead of faking it.
- On-screen mixing is an approximation. The app tells users to test-mix a little first.
