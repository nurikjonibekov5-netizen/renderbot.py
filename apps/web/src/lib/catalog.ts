import { DEFAULT_STOREY, type BuildingMeta, type BuildingStyle, type EntityType, type SceneEntity } from '@scene/schema';

export type IconName =
  | 'cursor' | 'road' | 'footprint' | 'brick' | 'white' | 'glass' | 'cone' | 'round' | 'hedge' | 'lamp';

/** A placeable asset. Phase 1: primitives; Phase 2+: `glbUrl` on the same entry. */
export interface CatalogItem {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  type: EntityType;
  metadata?: Record<string, unknown>;
}

const building = (style: BuildingStyle, label: string, hint: string, w: number, d: number, floors: number): CatalogItem => ({
  id: `prim:building-${style}`,
  label,
  hint,
  icon: style,
  type: 'building',
  metadata: { width: w, depth: d, floors, storeyHeight: DEFAULT_STOREY, style } satisfies BuildingMeta,
});

export const CATALOG: CatalogItem[] = [
  building('brick', "G'isht bino", "Qizil g'ishtli 3 qavatli bino", 20, 12, 3),
  building('white', 'Oq bino', 'Oq 4 qavatli bino (klinika uslubi)', 24, 18, 4),
  building('glass', 'Minora', 'Baland shisha minora', 14, 12, 10),
  { id: 'prim:tree-cone', label: 'Archa', hint: 'Qorli archa', icon: 'cone', type: 'tree' },
  { id: 'prim:tree-round', label: 'Daraxt', hint: 'Dumaloq daraxt', icon: 'round', type: 'tree' },
  { id: 'prim:hedge', label: 'Butazor', hint: "Yashil to'siq (butazor)", icon: 'hedge', type: 'prop' },
  { id: 'prim:lamp', label: 'Chiroq', hint: "Ko'cha chirog'i", icon: 'lamp', type: 'prop' },
];

export const catalogById = new Map(CATALOG.map((c) => [c.id, c]));

/** Entity created from a catalog item at a ground point. */
export function entityFromCatalog(item: CatalogItem, id: string, x: number, z: number, rotY: number): SceneEntity {
  return {
    id,
    type: item.type,
    assetId: item.id,
    position: [x, 0, z],
    rotation: [0, rotY, 0],
    scale: [1, 1, 1],
    ...(item.metadata ? { metadata: { ...item.metadata } } : {}),
  };
}
