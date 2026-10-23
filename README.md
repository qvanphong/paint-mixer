# Color Mixer

Color Mixer helps painters learn to mix acrylic and oil paint. Choose real tube colors, see what they make together, find the paints that match a color you want, and build palettes you can actually mix on the palette.

## Features

- **Mix.** Pick 2 to 4 paints, set their parts with sliders or ratio chips, add titanium white to lighten, and see the mixed color with its tint steps.
- **Find formula.** Enter a target color and get the simplest recipes (up to 3 paints plus white) that mix closest to it.
- **Palettes.** A hue and saturation color wheel in painter's (RYB) or screen (RGB) mode. Pick a harmony rule (complementary, analogous, triadic, and more) and get a formula for any swatch.
- **My paints.** Add your own paints, with a name, color, strength, and optional pigment code. A live preview shows how the paint behaves alone and when mixed.
- **Presets.** Save colors and recipes in your browser. Light and dark themes follow your system setting.

## Getting started

You need [Node.js](https://nodejs.org/) (a current LTS release) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` folder locally |
| `npm test` | Run the core and UI test suites |
| `npm run lint` | Lint with oxlint |

### Hosting the build locally

```bash
npm run build
npm run preview
```

Then open http://localhost:4173. Open the built page through a server rather than by double-clicking `dist/index.html`, because the scripts load from absolute paths.

## How it works

Mixing uses Kubelka-Munk pigment physics through [spectral.js](https://github.com/rvanwijnen/spectral.js), the same engine behind the reference tool this project draws on. Each paint is stored as an approximate on-screen masstone with a relative tinting strength.

The formula finder mixes candidate recipes with the same model the Mix view uses, so the result you see is the result you get. It searches small whole-number ratios, ranks matches by perceptual color difference (OKLab ΔE), and reports each match as exact, close, or approximate.

For the model, the search method, and the reasoning behind them, see [DESIGN.md](DESIGN.md).

## Limitations

- Paint colors are approximate. Test-mix a small amount before committing paint.
- Acrylic and oil are modeled the same way. Differences between mediums are not simulated, and the app says so in an info note.
- The UI is in English. All strings live in `src/ui/strings.ts`, so another language can be added there.

## Project layout

```
src/core/   Pure color library: paints, mixing, formula search, harmony, presets
src/ui/     React app: views, controls, state, styles
DESIGN.md   Model, formula search method, and design decisions
```

## Tech stack

React 19, TypeScript, Vite, spectral.js, Vitest, and oxlint.
