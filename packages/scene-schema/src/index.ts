// Serializable scene document shared by the editor, the future server and tests.
// Pure TypeScript: no React, no three.js.

export const SCHEMA_VERSION = 1 as const;

export type Vec3 = [number, number, number];
export type EntityType = 'building' | 'road' | 'lot' | 'vehicle' | 'tree' | 'prop' | 'character';
export const ENTITY_TYPES: readonly EntityType[] = ['building', 'road', 'lot', 'vehicle', 'tree', 'prop', 'character'];

export type BuildingStyle = 'brick' | 'white' | 'glass';
/** Facade sides in local space: n = -Z, s = +Z, e = +X, w = -X. */
export type FaceKey = 'n' | 's' | 'e' | 'w';
export const FACE_KEYS: readonly FaceKey[] = ['n', 'e', 's', 'w'];

/**
 * metadata of a procedural `building` entity (footprint centred on position, base at y = position[1]).
 * GLB buildings (assetId 'glb:*') carry only width/depth/height measured by the asset pipeline.
 */
export interface BuildingMeta {
  width: number;
  depth: number;
  floors: number;
  storeyHeight: number;
  /** default facade style for every side */
  style: BuildingStyle;
  /** per-side overrides applied with the facade tool (video 11–13 s) */
  faces?: Partial<Record<FaceKey, BuildingStyle>>;
  /** ground-floor treatment (video 22–25 s) */
  ground?: 'same' | 'storefront';
  /** 'clinic' = parametric stand-in for the clinic (image 6) until its real GLB exists */
  kind?: 'standard' | 'clinic';
  /** roof finish: snowy light (default) or dark membrane (large Zlín blocks, image 2) */
  roof?: 'light' | 'dark';
  name?: string;
}

export type LotSurface = 'paved' | 'parking' | 'plaza';
/** metadata of a `lot` entity: a ground parcel drawn with the lot tool (video 8–10 s). */
export interface LotMeta {
  width: number;
  depth: number;
  surface: LotSurface;
}

/** metadata of a `road` entity: a straight segment centred on position, running along local +X. */
export interface RoadMeta {
  length: number;
  width: number;
}

export interface SceneEntity {
  id: string;
  type: EntityType;
  assetId?: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  metadata?: Record<string, unknown>;
}

export interface SceneEnvironment {
  season: 'winter' | 'neutral';
  timeOfDay: number;
}

export interface SceneDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  projectId: string;
  name: string;
  environment: SceneEnvironment;
  entities: SceneEntity[];
}

export const SCALE_MIN = 0.05;
export const SCALE_MAX = 50;
export const FLOORS_MAX = 60;
export const DEFAULT_STOREY = 3.3;
export const ROAD_WIDTH = 8;

/** Rounds to 1e-4 so that save → load never drifts. */
export function round4(n: number): number {
  const r = Math.round(n * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function clampScale(n: number): number {
  return round4(clamp(Number.isFinite(n) ? n : 1, SCALE_MIN, SCALE_MAX));
}

/** Normalises an entity: rounds numbers, clamps scale, keeps ground contact for solid objects. */
export function normalizeEntity(e: SceneEntity): SceneEntity {
  const position = e.position.map(round4) as Vec3;
  if (e.type !== 'road' && position[1] < 0) position[1] = 0;
  const out: SceneEntity = {
    ...e,
    position,
    rotation: e.rotation.map(round4) as Vec3,
    scale: e.scale.map(clampScale) as Vec3,
  };
  if (e.type === 'building' && e.metadata && e.metadata.floors !== undefined) {
    const m = e.metadata as Partial<BuildingMeta>;
    out.metadata = {
      ...e.metadata,
      floors: Math.round(clamp(Number(m.floors) || 1, 1, FLOORS_MAX)),
    };
  }
  return out;
}

export function createEmptyDocument(projectId = 'project-1', name = 'Yangi sahna'): SceneDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId,
    name,
    environment: { season: 'winter', timeOfDay: 11 },
    entities: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

export interface ValidationResult {
  ok: boolean;
  doc: SceneDocument | null;
  errors: string[];
}

/**
 * Validates a (migrated) document. Broken entities are dropped and reported
 * instead of rejecting the whole scene, so one bad asset never blanks the app.
 */
export function validateDocument(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, doc: null, errors: ['Sahna fayli obyekt emas.'] };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, doc: null, errors: [`Noma'lum schemaVersion: ${String(raw.schemaVersion)}`] };
  }
  const env = isObj(raw.environment) ? raw.environment : {};
  const doc: SceneDocument = {
    schemaVersion: SCHEMA_VERSION,
    projectId: typeof raw.projectId === 'string' && raw.projectId ? raw.projectId : 'project-1',
    name: typeof raw.name === 'string' ? raw.name : 'Sahna',
    environment: {
      season: env.season === 'neutral' ? 'neutral' : 'winter',
      timeOfDay: typeof env.timeOfDay === 'number' && Number.isFinite(env.timeOfDay) ? env.timeOfDay : 11,
    },
    entities: [],
  };
  const list = Array.isArray(raw.entities) ? raw.entities : [];
  if (!Array.isArray(raw.entities)) errors.push("entities ro'yxati yo'q.");
  const seen = new Set<string>();
  list.forEach((e, i) => {
    if (!isObj(e)) return void errors.push(`#${i}: obyekt emas`);
    const id = e.id;
    if (typeof id !== 'string' || !id) return void errors.push(`#${i}: id yo'q`);
    if (seen.has(id)) return void errors.push(`#${i}: takroriy id ${id}`);
    if (!ENTITY_TYPES.includes(e.type as EntityType)) return void errors.push(`${id}: noma'lum tur ${String(e.type)}`);
    if (!isVec3(e.position) || !isVec3(e.rotation) || !isVec3(e.scale)) {
      return void errors.push(`${id}: position/rotation/scale noto'g'ri`);
    }
    seen.add(id);
    doc.entities.push(normalizeEntity({
      id,
      type: e.type as EntityType,
      ...(typeof e.assetId === 'string' ? { assetId: e.assetId } : {}),
      position: e.position,
      rotation: e.rotation,
      scale: e.scale,
      ...(isObj(e.metadata) ? { metadata: e.metadata } : {}),
    }));
  });
  return { ok: true, doc, errors };
}

/** Upgrades older documents step by step. Version 0 = early drafts without schemaVersion. */
export function migrateDocument(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  let cur: Record<string, unknown> = raw;
  if (cur.schemaVersion === undefined) cur = { ...cur, schemaVersion: 1 };
  return cur;
}

export function loadDocument(raw: unknown): ValidationResult {
  return validateDocument(migrateDocument(raw));
}

export function serializeDocument(doc: SceneDocument): string {
  return JSON.stringify(doc);
}

export function parseDocument(json: string): ValidationResult {
  try {
    return loadDocument(JSON.parse(json));
  } catch (err) {
    return { ok: false, doc: null, errors: [`JSON o'qilmadi: ${(err as Error).message}`] };
  }
}

/** Deterministic PRNG (mulberry32) for reproducible sample scenes and tests. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { createSampleDocument } from './sample.ts';
