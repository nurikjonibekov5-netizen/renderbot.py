import {
  DEFAULT_STOREY,
  ROAD_WIDTH,
  SCHEMA_VERSION,
  createRng,
  type BuildingStyle,
  type SceneDocument,
  type SceneEntity,
} from './index.ts';

/**
 * Deterministic first-run scene: a crossroads with a white clinic on the corner lot
 * (image 6) and red-brick neighbours (images 1, 3, 4, 5). Primitives only (Phase 1).
 */
export function createSampleDocument(seed = 7): SceneDocument {
  const rng = createRng(seed);
  const entities: SceneEntity[] = [];
  const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

  const road = (id: string, x: number, z: number, length: number, angle: number) => entities.push({
    id, type: 'road', assetId: 'road', position: [x, 0, z], rotation: [0, r4(angle), 0], scale: [1, 1, 1],
    metadata: { length, width: ROAD_WIDTH },
  });
  road('road-ew', 0, 0, 160, 0);
  road('road-ns', 0, 0, 160, Math.PI / 2);

  const building = (
    id: string, x: number, z: number, width: number, depth: number, floors: number, style: BuildingStyle, name: string,
  ) => entities.push({
    id, type: 'building', assetId: `prim:building-${style}`, position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1],
    metadata: { width, depth, floors, storeyHeight: DEFAULT_STOREY, style, name },
  });
  building('bld-clinic', 24, -22, 30, 26, 4, 'white', 'Klinika');
  building('bld-long', -26, -18, 32, 12, 3, 'brick', 'Uzun bino');
  building('bld-tower', -20, 24, 16, 12, 11, 'glass', 'Minora');
  building('bld-complex', 30, 26, 34, 22, 3, 'brick', 'Majmua');

  let n = 0;
  for (let x = -68; x <= 68; x += 12) {
    if (Math.abs(x) < 12) continue;
    for (const z of [-6, 6]) {
      n += 1;
      const cone = rng() < 0.55;
      entities.push({
        id: `tree-${n}`, type: 'tree', assetId: cone ? 'prim:tree-cone' : 'prim:tree-round',
        position: [x, 0, z], rotation: [0, r4(rng() * Math.PI * 2), 0],
        scale: [1, r4(0.85 + rng() * 0.3), 1],
      });
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: 'klinika-1',
    name: 'Klinika va atrofi',
    environment: { season: 'winter', timeOfDay: 11 },
    entities,
  };
}
