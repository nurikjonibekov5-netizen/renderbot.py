import {
  DEFAULT_STOREY,
  ROAD_WIDTH,
  SCHEMA_VERSION,
  createRng,
  type BuildingStyle,
  type LotSurface,
  type SceneDocument,
  type SceneEntity,
} from './index.ts';

/** GLB footprints as measured by the asset pipeline (apps/web/public/assets/buildings/manifest.json). */
const GLB = {
  minora: { width: 24.4, depth: 8.9, height: 42.37, name: 'Minora' },
  texnik_bino: { width: 32.385, depth: 13.615, height: 15.872, name: 'Texnik bino' },
  majmua: { width: 41.24, depth: 35.17, height: 11.665, name: 'Majmua' },
  uch_qavatli: { width: 30.53, depth: 12.53, height: 9.87, name: 'Uch qavatli' },
} as const;

/**
 * Deterministic first-run world (Phase 2): the clinic on the corner of the central
 * crossroads (image 6) inside a Zlín-style district (image 2) with the four supplied
 * GLB buildings, parking, rail yard, pipe bridge, trees, lamps and traffic lights.
 *
 * Coordinates: metres, Y-up; roads are 8 m with 3 m sidewalks, so a block edge is 7 m from a road axis.
 */
export function createSampleDocument(seed = 7): SceneDocument {
  const rng = createRng(seed);
  const entities: SceneEntity[] = [];
  const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
  let n = 0;
  const nid = (p: string) => `${p}-${(n += 1)}`;

  const road = (id: string, x: number, z: number, length: number, alongZ: boolean) => entities.push({
    id, type: 'road', assetId: 'road', position: [x, 0, z], rotation: [0, alongZ ? r4(Math.PI / 2) : 0, 0], scale: [1, 1, 1],
    metadata: { length, width: ROAD_WIDTH },
  });
  road('road-main', 0, 0, 392, false);
  road('road-north', 0, -50, 392, false);
  road('road-front', 0, 96, 392, false);
  road('road-centre', 0, 23, 146, true);
  road('road-west', -100, 23, 146, true);
  road('road-east', 104, 23, 146, true);

  const building = (
    x: number, z: number, width: number, depth: number, floors: number, style: BuildingStyle,
    extra: Record<string, unknown> = {}, id = nid('bld'),
  ) => entities.push({
    id, type: 'building', assetId: `prim:building-${style}`, position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1],
    metadata: { width, depth, floors, storeyHeight: DEFAULT_STOREY, style, ...extra },
  });
  const glb = (key: keyof typeof GLB, x: number, z: number, rot = 0) => entities.push({
    id: `bld-${key}`, type: 'building', assetId: `glb:${key}`, position: [x, 0, z], rotation: [0, r4(rot), 0], scale: [1, 1, 1],
    metadata: { ...GLB[key] },
  });
  const lot = (x: number, z: number, width: number, depth: number, surface: LotSurface) => entities.push({
    id: nid('lot'), type: 'lot', assetId: surface === 'parking' ? 'lot:parking' : 'lot:paved', position: [x, 0, z],
    rotation: [0, 0, 0], scale: [1, 1, 1], metadata: { width, depth, surface },
  });
  const prop = (assetId: string, x: number, z: number, rot = 0, type: SceneEntity['type'] = 'prop', metadata?: Record<string, unknown>) => entities.push({
    id: nid(type === 'tree' ? 'tree' : 'prop'), type, assetId, position: [x, 0, z], rotation: [0, r4(rot), 0], scale: [1, 1, 1],
    ...(metadata ? { metadata } : {}),
  });
  const tree = (assetId: string, x: number, z: number) => prop(assetId, x, z, rng() * Math.PI * 2, 'tree');

  // --- NW block: the clinic on the corner of the central crossroads (image 6).
  // Rotated 90° so its chamfered entrance faces the crossroads and the default camera.
  entities.push({
    id: 'bld-clinic', type: 'building', assetId: 'prim:clinic', position: [-24, 0, -28], rotation: [0, r4(Math.PI / 2), 0], scale: [1, 1, 1],
    metadata: { width: 30, depth: 28, floors: 5, storeyHeight: 3.6, style: 'white', kind: 'clinic', name: 'Klinika' },
  });
  // pipe bridge passing right behind the clinic (image 6)
  prop('prim:pipe-bridge', -47.5, -46, 0, 'prop', { length: 95 });
  // front parking bays between the clinic and the street, and a side car park (image 6)
  lot(-31, -10, 15, 5.6, 'parking');
  lot(-51, -16.5, 18, 15, 'parking');
  building(-77, -22, 26, 12, 5, 'brick');
  building(-55, -36, 30, 10, 3, 'brick');
  for (let z = -15; z >= -40; z -= 5) tree('prim:tree-box', -5.6, z);
  for (let x = -14; x >= -38; x -= 7) tree('prim:tree-cone', x, -5.8);

  // traffic lights on the four corners of the central crossroads
  prop('prim:traffic-light', 5.6, -5.6, Math.PI / 2);
  prop('prim:traffic-light', -5.6, -5.6, Math.PI);
  prop('prim:traffic-light', -5.6, 5.6, -Math.PI / 2);
  prop('prim:traffic-light', 5.6, 5.6, 0);

  // --- NE block: the multi-wing complex, the long building, a car park ---
  glb('majmua', 30, -25);
  glb('uch_qavatli', 80, -20);
  building(75, -37, 30, 10, 5, 'brick');
  lot(57.5, -22, 12, 16, 'parking');
  for (const z of [-15, -22, -29, -36]) tree('prim:tree-cone', 5.9, z);

  // --- rail yard right behind the clinic block, pipe bridge to the plant (images 2 and 6) ---
  prop('prim:rail', 0, -74.5, 0, 'prop', { length: 390, tracks: 3 });
  prop('prim:pipe-bridge', 56, -68, Math.PI / 2, 'prop', { length: 56 });
  glb('texnik_bino', 60, -105);
  glb('minora', 25, -100);
  building(-40, -105, 50, 18, 6, 'brick', { roof: 'dark' });
  building(-115, -104, 40, 16, 4, 'brick');
  building(-170, -110, 34, 20, 5, 'glass');
  building(125, -104, 40, 16, 4, 'brick');
  building(172, -110, 30, 20, 6, 'brick', { roof: 'dark' });
  building(-60, -150, 60, 20, 7, 'brick', { roof: 'dark' });
  building(60, -150, 50, 20, 5, 'brick');
  building(-150, -160, 40, 16, 3, 'brick');
  building(150, -160, 40, 16, 4, 'glass');
  building(0, -185, 50, 16, 4, 'brick');
  prop('prim:chimney', 92, -104);
  for (let x = -185; x <= 185; x += 15) {
    if (Math.abs(x - 56) < 6) continue;
    tree('prim:tree-pine', x, -89.5);
  }

  // --- SE block: courtyard bars around a parking lot (image 2) ---
  building(40, 20, 60, 12, 5, 'brick', { ground: 'storefront' });
  building(84, 34, 12, 36, 4, 'brick');
  lot(40, 46, 44, 18, 'parking');
  building(40, 76, 50, 13, 6, 'brick', { roof: 'dark' });
  for (const [x, z] of [[75, 62], [81, 70], [88, 63], [72, 72]] as const) tree('prim:tree-cone', x, z);

  // --- SW block ---
  building(-35, 20, 40, 13, 6, 'brick', { roof: 'dark' });
  building(-80, 40, 13, 40, 3, 'glass');
  building(-40, 72, 45, 13, 7, 'brick', { roof: 'dark' });
  lot(-40, 45, 30, 20, 'plaza');
  for (const [x, z] of [[-48, 45], [-32, 45], [-40, 51]] as const) tree('prim:tree-round', x, z);
  for (const z of [36, 44, 52, 60]) tree('prim:tree-pine', -12, z);

  // --- outer blocks: keep the city dense out to the fog ---
  building(-150, -25, 50, 14, 6, 'brick', { roof: 'dark' });
  building(-150, 30, 50, 14, 8, 'brick', { roof: 'dark' });
  building(-140, 70, 30, 14, 3, 'brick');
  building(-180, 66, 16, 26, 5, 'glass');
  building(150, -25, 50, 14, 5, 'glass');
  building(150, 30, 50, 14, 7, 'brick', { roof: 'dark' });
  building(150, 70, 40, 14, 3, 'brick');
  building(-60, 128, 60, 14, 9, 'brick', { roof: 'dark' });
  building(55, 128, 60, 14, 8, 'brick', { roof: 'dark' });
  building(150, 130, 40, 14, 5, 'brick');
  building(-150, 128, 40, 14, 3, 'brick');
  building(-5, 165, 50, 14, 4, 'brick');
  building(110, 168, 40, 14, 4, 'glass');
  building(-120, 168, 50, 14, 4, 'brick');

  // --- extra Zlín blocks to reach the density of image 2 ---
  building(-66, 44, 10, 24, 6, 'brick');
  building(68, 46, 8, 16, 3, 'brick');
  building(-116, -27, 14, 12, 7, 'brick', { roof: 'dark' });
  building(118, -30, 12, 12, 6, 'brick');
  building(-117, 50, 12, 40, 6, 'brick', { roof: 'dark' });
  building(118, 50, 12, 40, 5, 'brick');

  // --- snow-covered bushes (the white blobs of images 2 and 6) ---
  for (const [x, z] of [[-44, -28], [-66, -12], [68, 10], [14, 10], [-20, 10], [-60, 58], [62, 60], [-88, 88]] as const) {
    prop('prim:snow-bush', x, z, rng() * Math.PI);
  }

  // --- street furniture along the main road ---
  for (let x = -186; x <= 186; x += 24) {
    if (Math.abs(x) < 12 || Math.abs(x + 100) < 12 || Math.abs(x - 104) < 12) continue;
    prop('prim:lamp', x, 5.2, Math.PI / 2);
    const tx = x + 12;
    if (Math.abs(tx) > 12 && Math.abs(tx + 100) > 12 && Math.abs(tx - 104) > 12) {
      tree(rng() < 0.5 ? 'prim:tree-cone' : 'prim:tree-round', tx, 5.8);
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
