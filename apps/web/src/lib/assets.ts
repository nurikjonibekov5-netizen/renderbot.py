import manifest from './assetManifest.json';

/** One normalised GLB produced by `npm run assets` (scripts/build-assets.mjs). */
export interface ManifestEntry {
  id: string;
  file: string;
  label: string;
  hint: string;
  /** width (X) × height (Y) × depth (Z) in metres after normalisation */
  size: [number, number, number];
  tris: number;
  fixes: string[];
  warnings: string[];
  materials: { name: string; color: number[]; emissive: boolean; issues: string[] }[];
}

export const MANIFEST = manifest as unknown as ManifestEntry[];
export const manifestById = new Map(MANIFEST.map((m) => [m.id, m]));

/** URL of a GLB relative to the app base (works under /editor/ on GitHub Pages). */
export function assetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}
