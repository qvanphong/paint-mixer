import type { Catalog, PaintId } from '../core/index.ts';

/** A new set with `id` flipped; the input is not modified. */
export function toggled(ids: ReadonlySet<PaintId>, id: PaintId): Set<PaintId> {
  const next = new Set(ids);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** Every paint the owned list can usefully hold: the finder never uses a white from it. */
export function selectableIds(catalog: Catalog): PaintId[] {
  return catalog.paints.filter((p) => p.role !== 'white').map((p) => p.id);
}
