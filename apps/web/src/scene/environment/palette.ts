import * as THREE from 'three';

/** Colour tokens from REFERENCE_ANALYSIS §4 (images 2 and 6). */
export const PALETTE = {
  ground: '#F5F7F9',
  shadow: '#C9D3DF',
  asphalt: '#3B4048',
  roadLine: '#FFFFFF',
  brick: '#E0603E',
  brickDark: '#B9462F',
  glass: '#8C99AC',
  warmWindow: '#FFE6A6',
  roof: '#F7F8FA',
  trim: '#D9DEE4',
  clinic: '#F2F2F0',
  hedge: '#7E9A63',
  trunk: '#8A7867',
  snow: '#FBFCFD',
  metal: '#5A6270',
  accent: '#FF8A1F',
  invalid: '#E5484D',
} as const;

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });

/**
 * Shared, never-mutated materials. Selection and ghosts use their own materials,
 * so the originals stay untouched (master prompt §9).
 */
export const MAT = {
  ground: std(PALETTE.ground, { roughness: 1 }),
  asphalt: std(PALETTE.asphalt, { roughness: 0.95 }),
  roadLine: std(PALETTE.roadLine, { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  brick: std(PALETTE.brick),
  brickDark: std(PALETTE.brickDark),
  white: std(PALETTE.clinic),
  glass: std(PALETTE.glass, { roughness: 0.35, metalness: 0.1 }),
  roof: std(PALETTE.roof),
  trim: std(PALETTE.trim),
  snow: std(PALETTE.snow, { flatShading: true }),
  hedge: std(PALETTE.hedge, { flatShading: true }),
  trunk: std(PALETTE.trunk),
  metal: std(PALETTE.metal, { roughness: 0.6 }),
  lampGlow: new THREE.MeshBasicMaterial({ color: PALETTE.warmWindow }),
};

export const GHOST_OK = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.45, depthWrite: false });
export const GHOST_BAD = new THREE.MeshBasicMaterial({ color: PALETTE.invalid, transparent: true, opacity: 0.45, depthWrite: false });

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 7),
  ico: new THREE.IcosahedronGeometry(1, 0),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  plane: new THREE.PlaneGeometry(1, 1),
};
