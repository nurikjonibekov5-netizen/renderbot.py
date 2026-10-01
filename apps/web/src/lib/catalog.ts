import { DEFAULT_STOREY, type BuildingMeta, type EntityType, type SceneEntity } from '@scene/schema';
import { MANIFEST } from './assets.ts';

export type IconName =
  | 'cursor' | 'road' | 'footprint' | 'lot' | 'parking' | 'facade' | 'brick' | 'white' | 'glass' | 'storefront'
  | 'clinic' | 'tower' | 'factory' | 'complex' | 'long' | 'buildings'
  | 'cone' | 'pine' | 'round' | 'boxtree' | 'trees' | 'hedge' | 'lamp' | 'traffic' | 'car' | 'street';

export type CatalogGroup = 'buildings' | 'trees' | 'street';

/** A placeable asset: a procedural primitive or a normalised GLB from the asset pipeline. */
export interface CatalogItem {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  type: EntityType;
  group: CatalogGroup;
  metadata?: Record<string, unknown>;
}

const GLB_ICON: Record<string, IconName> = {
  'glb:minora': 'tower', 'glb:texnik_bino': 'factory', 'glb:majmua': 'complex', 'glb:uch_qavatli': 'long',
};

export const CATALOG: CatalogItem[] = [
  {
    id: 'prim:clinic', label: 'Klinika', hint: "Klinika (6-rasm asosida vaqtinchalik model; GLB kelganda almashtiriladi)",
    icon: 'clinic', type: 'building', group: 'buildings',
    metadata: { width: 30, depth: 28, floors: 4, storeyHeight: 3.6, style: 'white', kind: 'clinic', name: 'Klinika' } satisfies BuildingMeta,
  },
  ...MANIFEST.map((m): CatalogItem => ({
    id: m.id, label: m.label, hint: m.hint || m.label, icon: GLB_ICON[m.id] ?? 'buildings', type: 'building', group: 'buildings',
    metadata: { width: m.size[0], depth: m.size[2], height: m.size[1], name: m.label },
  })),
  {
    id: 'prim:building-brick', label: 'Zlín bino', hint: "Qizil g'isht + oq karkas, 4 qavat", icon: 'brick', type: 'building', group: 'buildings',
    metadata: { width: 30, depth: 13, floors: 4, storeyHeight: DEFAULT_STOREY, style: 'brick' } satisfies BuildingMeta,
  },
  { id: 'prim:tree-cone', label: 'Archa', hint: 'Qorli oq archa', icon: 'cone', type: 'tree', group: 'trees' },
  { id: 'prim:tree-pine', label: "Qarag'ay", hint: "Yashil qarag'ay, qor bilan", icon: 'pine', type: 'tree', group: 'trees' },
  { id: 'prim:tree-round', label: 'Daraxt', hint: 'Dumaloq qorli daraxt', icon: 'round', type: 'tree', group: 'trees' },
  { id: 'prim:tree-box', label: "To'rtburchak", hint: "Yashil kesilgan daraxt (klinika oldida)", icon: 'boxtree', type: 'tree', group: 'trees' },
  { id: 'prim:snow-bush', label: 'Qorli buta', hint: 'Qor bosgan buta', icon: 'round', type: 'prop', group: 'trees' },
  { id: 'prim:hedge', label: 'Butazor', hint: "Yashil to'siq", icon: 'hedge', type: 'prop', group: 'trees' },
  { id: 'prim:lamp', label: 'Chiroq', hint: "Ko'cha chirog'i", icon: 'lamp', type: 'prop', group: 'street' },
  { id: 'prim:traffic-light', label: 'Svetofor', hint: 'Chorraha svetofori', icon: 'traffic', type: 'prop', group: 'street' },
  { id: 'prim:chimney', label: "Mo'ri", hint: "Zavodning baland mo'risi", icon: 'factory', type: 'prop', group: 'street' },
  { id: 'prim:car', label: 'Mashina', hint: 'Turgan mashina', icon: 'car', type: 'vehicle', group: 'street', metadata: { color: 0 } },
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
