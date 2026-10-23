import type { Hex } from './color.ts';

export type PaintId = string & { readonly __brand: 'PaintId' };

export type PaintRole = 'white' | 'black' | 'chromatic' | 'earth';

export interface Paint {
  id: PaintId;
  name: string;
  pigment: string;
  hex: Hex;
  tinting: number;
  role: PaintRole;
}

type PaintRow = [id: string, name: string, pigment: string, hex: string, tinting: number, role: PaintRole];

// Hex is an on-screen masstone estimate, tinting a relative strength (1 = ultramarine).
// White sits well below 1 because spectral.js also weights by luminance, which alone
// would let one part white wash out several parts of a dark pigment.
const ROWS: PaintRow[] = [
  ['titanium-white', 'Titanium White', 'PW6', '#F4F3EE', 0.55, 'white'],
  ['ivory-black', 'Ivory Black', 'PBk9', '#23211F', 1.2, 'black'],
  ['hansa-yellow-light', 'Hansa Yellow Light', 'PY3', '#F5E23A', 0.9, 'chromatic'],
  ['cadmium-yellow-medium', 'Cadmium Yellow Medium', 'PY35', '#F8CB1A', 1, 'chromatic'],
  ['yellow-ochre', 'Yellow Ochre', 'PY43', '#C8953A', 0.6, 'earth'],
  ['cadmium-orange', 'Cadmium Orange', 'PO20', '#EE7322', 1, 'chromatic'],
  ['cadmium-red-light', 'Cadmium Red Light', 'PR108', '#DD3B26', 1, 'chromatic'],
  ['cadmium-red-medium', 'Cadmium Red Medium', 'PR108', '#B92128', 1, 'chromatic'],
  ['alizarin-crimson', 'Alizarin Crimson', 'PR83', '#7E1A2B', 1.3, 'chromatic'],
  ['quinacridone-rose', 'Quinacridone Rose', 'PV19', '#C42A5A', 1.2, 'chromatic'],
  ['quinacridone-magenta', 'Quinacridone Magenta', 'PR122', '#9E2763', 1.3, 'chromatic'],
  ['dioxazine-purple', 'Dioxazine Purple', 'PV23', '#3B2058', 2.5, 'chromatic'],
  ['ultramarine-blue', 'Ultramarine Blue', 'PB29', '#24348C', 1, 'chromatic'],
  ['cobalt-blue', 'Cobalt Blue', 'PB28', '#2B57A8', 0.6, 'chromatic'],
  ['cerulean-blue', 'Cerulean Blue', 'PB35', '#2D7FB8', 0.7, 'chromatic'],
  ['phthalo-blue', 'Phthalo Blue (Green Shade)', 'PB15:3', '#13306A', 2.5, 'chromatic'],
  ['prussian-blue', 'Prussian Blue', 'PB27', '#1A2A48', 1.8, 'chromatic'],
  ['phthalo-green', 'Phthalo Green (Blue Shade)', 'PG7', '#0F4D40', 2.5, 'chromatic'],
  ['viridian', 'Viridian', 'PG18', '#1D6A57', 0.8, 'chromatic'],
  ['chromium-oxide-green', 'Chromium Oxide Green', 'PG17', '#5B7444', 0.6, 'chromatic'],
  ['raw-sienna', 'Raw Sienna', 'PBr7', '#B06C30', 0.6, 'earth'],
  ['burnt-sienna', 'Burnt Sienna', 'PBr7', '#8B3E22', 0.7, 'earth'],
  ['venetian-red', 'Venetian Red', 'PR101', '#8C3A2E', 0.8, 'earth'],
  ['raw-umber', 'Raw Umber', 'PBr7', '#594633', 0.7, 'earth'],
  ['burnt-umber', 'Burnt Umber', 'PBr7', '#4C2E22', 0.8, 'earth'],
  // Golden Maple 18-color miniature set. Pigment column holds the product code (GM.xxx), not a pigment index.
  // Hex values are estimated from the product photo; strengths are defaults to calibrate by test mixing.
  ['gm-white', 'Golden Maple White', 'GM.001', '#EFEFEC', 0.55, 'white'],
  ['gm-bright-red', 'Golden Maple Bright Red', 'GM.003', '#D8100C', 1, 'chromatic'],
  ['gm-orange', 'Golden Maple Orange', 'GM.083', '#ED580A', 1, 'chromatic'],
  ['gm-medium-yellow', 'Golden Maple Medium Yellow', 'GM.002', '#EFBB0A', 1, 'chromatic'],
  ['gm-bright-yellow', 'Golden Maple Bright Yellow', 'GM.949', '#EEC90A', 1, 'chromatic'],
  ['gm-warm-green', 'Golden Maple Warm Green', 'GM.044', '#60AF0F', 1, 'chromatic'],
  ['gm-turquoise', 'Golden Maple Turquoise', 'GM.808', '#0F9D8B', 1, 'chromatic'],
  ['gm-dark-blue', 'Golden Maple Dark Blue', 'GM.004', '#0B2B82', 1, 'chromatic'],
  ['gm-sky-blue', 'Golden Maple Sky Blue', 'GM.118', '#11A8C0', 1, 'chromatic'],
  ['gm-purple', 'Golden Maple Purple', 'GM.592', '#57268F', 1, 'chromatic'],
  ['gm-light-beige', 'Golden Maple Light Beige', 'GM.928', '#E3B08D', 1, 'earth'],
  ['gm-comet-streak', 'Golden Maple Comet Streak', 'GM.885', '#76884A', 1, 'chromatic'],
  ['gm-brown', 'Golden Maple Brown', 'GM.115', '#3E1C1A', 1, 'earth'],
  ['gm-cool-gray', 'Golden Maple Cool Gray', 'GM.989', '#636067', 1, 'black'],
  ['gm-micron', 'Golden Maple Micron', 'GM.836', '#424040', 1, 'black'],
  ['gm-metallic-silver', 'Golden Maple Metallic Silver', 'GM.B001', '#58555C', 1, 'black'],
  ['gm-metallic-gold', 'Golden Maple Metallic Gold', 'GM.B002', '#81310C', 1, 'chromatic'],
  ['gm-black', 'Golden Maple Black', 'GM.752', '#1C1C1C', 1.2, 'black'],
];

export const PAINTS: readonly Paint[] = ROWS.map(([id, name, pigment, hex, tinting, role]) => ({
  id: id as PaintId,
  name,
  pigment,
  hex: hex as Hex,
  tinting,
  role,
}));

/** The set of paints a recipe may reference: the built-ins plus the user's own. */
export interface Catalog {
  readonly paints: readonly Paint[];
  byId(id: PaintId): Paint | undefined;
}

/** Built-ins first, then custom paints in insertion order. A custom paint can never shadow a built-in id. */
export function makeCatalog(custom: readonly Paint[]): Catalog {
  const byId = new Map<string, Paint>();
  for (const paint of [...PAINTS, ...custom]) if (!byId.has(paint.id)) byId.set(paint.id, paint);
  return { paints: [...byId.values()], byId: (id) => byId.get(id) };
}

export const BUILTIN_CATALOG: Catalog = makeCatalog([]);

export function paintById(id: PaintId, catalog: Catalog = BUILTIN_CATALOG): Paint {
  const paint = catalog.byId(id);
  if (!paint) throw new Error(`Unknown paint: ${id}`);
  return paint;
}

/** Boundary parser for ids read from storage or URLs. */
export function parsePaintId(id: string, catalog: Catalog = BUILTIN_CATALOG): PaintId | null {
  return catalog.byId(id as PaintId) ? (id as PaintId) : null;
}

export const WHITE: Paint = PAINTS.find((p) => p.role === 'white')!;
export const BLACK: Paint = PAINTS.find((p) => p.role === 'black')!;
