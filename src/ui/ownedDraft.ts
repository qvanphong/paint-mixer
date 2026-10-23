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

/** A new set holding everything in `selected` plus `ids`. */
export function withAll(selected: ReadonlySet<PaintId>, ids: readonly PaintId[]): Set<PaintId> {
  return new Set([...selected, ...ids]);
}

/** A new set holding everything in `selected` except `ids`. */
export function withoutAll(selected: ReadonlySet<PaintId>, ids: readonly PaintId[]): Set<PaintId> {
  const drop = new Set(ids);
  return new Set([...selected].filter((id) => !drop.has(id)));
}
