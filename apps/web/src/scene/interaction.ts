import { createStore } from 'zustand/vanilla';

/**
 * Transient interaction state that changes on every pointer move.
 * Kept out of the editor store and read through subscriptions + refs,
 * so pointer motion never re-renders React components.
 */
export interface PointerState {
  x: number;
  z: number;
  inside: boolean;
}
export const pointerStore = createStore<PointerState>()(() => ({ x: 0, z: 0, inside: false }));

/** In-progress tool drafts (road start point, rectangle corner of lot/parking/footprint). Changes only on clicks. */
export interface DraftState {
  roadStart: [number, number] | null;
  footprintStart: [number, number] | null;
}
export const draftStore = createStore<DraftState>()(() => ({ roadStart: null, footprintStart: null }));

/**
 * Screenshot/test mode (`?still`): no construction animation, no traffic motion,
 * so frames are deterministic (master prompt §30–31).
 */
let still = false;
export function setStill(v: boolean): void {
  still = v;
}
export function isStill(): boolean {
  return still;
}

/** Construction animation registry: entity id → start time (video 10–12 s: the massing rises, then floors). */
const builtAt = new Map<string, number>();
export const BUILD_ANIM_MS = 900;
export function markBuilt(id: string): void {
  if (!still) builtAt.set(id, performance.now());
}
/** 0…1 progress of the construction animation, or null when none is running. */
export function buildProgress(id: string): number | null {
  const t0 = builtAt.get(id);
  if (t0 === undefined) return null;
  const k = (performance.now() - t0) / BUILD_ANIM_MS;
  if (k >= 1) {
    builtAt.delete(id);
    return null;
  }
  return Math.max(0, k);
}

export function clearDrafts(): boolean {
  const d = draftStore.getState();
  if (!d.roadStart && !d.footprintStart) return false;
  draftStore.setState({ roadStart: null, footprintStart: null });
  return true;
}

/** A pointer that moved more than this (px) between down and up was a camera drag, not a click. */
export const CLICK_TOLERANCE = 5;

/** Gizmo guard: clicks that land on or right after a transform-gizmo drag must not select/deselect. */
interface GizmoLike {
  axis: string | null;
  dragging: boolean;
}
let gizmo: GizmoLike | null = null;
let lastGizmoDragEnd = 0;
export function registerGizmo(g: GizmoLike | null): void {
  gizmo = g;
}
export function noteGizmoDragEnd(): void {
  lastGizmoDragEnd = performance.now();
}
export function gizmoBusy(): boolean {
  if (gizmo && (gizmo.dragging || gizmo.axis)) return true;
  return performance.now() - lastGizmoDragEnd < 250;
}

/** Double-click / rapid repeat guard for placement. */
let lastPlaceAt = 0;
export function placementAllowed(): boolean {
  const now = performance.now();
  if (now - lastPlaceAt < 250) return false;
  lastPlaceAt = now;
  return true;
}
