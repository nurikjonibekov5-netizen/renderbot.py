import type { EntityType } from '@scene/schema';

const PREFIX: Record<EntityType, string> = {
  building: 'bld', road: 'road', lot: 'lot', vehicle: 'car', tree: 'tree', prop: 'prop', character: 'chr',
};

let counter = 0;

/** Unique, never-reused entity id. `taken` guards against ids loaded from a saved scene. */
export function newId(type: EntityType, taken: ReadonlySet<string>): string {
  for (;;) {
    counter += 1;
    const id = `${PREFIX[type]}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.has(id)) return id;
  }
}
