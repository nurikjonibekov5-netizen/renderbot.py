import { createStore, useStore } from 'zustand';
import {
  DEFAULT_STOREY,
  ROAD_WIDTH,
  createSampleDocument,
  round4,
  type SceneDocument,
  type SceneEntity,
} from '@scene/schema';
import { addCommand, removeCommand, updateCommand, type Command } from './commands.ts';
import { newId } from './ids.ts';
import { saveToStorage } from './persist.ts';
import { catalogById, entityFromCatalog } from '../lib/catalog.ts';
import { localBounds, placementProblem, snap } from '../lib/geometry.ts';

export type Tool = 'select' | 'road' | 'footprint' | `place:${string}`;
export type TransformMode = 'translate' | 'rotate' | 'scale';

export const HISTORY_LIMIT = 200;
export const MOVE_STEP = 1;
export const ROAD_STEP = 2;

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

export interface EditorState {
  doc: SceneDocument;
  selectedId: string | null;
  tool: Tool;
  ghostRotation: number;
  gridVisible: boolean;
  snapOn: boolean;
  transformMode: TransformMode;
  past: Command[];
  future: Command[];
  dirty: boolean;
  savedAt: number | null;
  toast: Toast | null;
  cameraResetTick: number;

  execute(cmd: Command | null): boolean;
  undo(): void;
  redo(): void;
  select(id: string | null): void;
  setTool(tool: Tool): void;
  cancel(): void;
  rotateGhost(): void;
  setTransformMode(mode: TransformMode): void;
  toggleGrid(): void;
  toggleSnap(): void;
  resetCamera(): void;
  notify(text: string, kind?: Toast['kind']): void;

  placeAsset(assetId: string, x: number, z: number): string | null;
  addRoad(ax: number, az: number, bx: number, bz: number): string | null;
  addFootprint(ax: number, az: number, bx: number, bz: number): string | null;
  updateEntity(id: string, change: (e: SceneEntity) => SceneEntity, label?: string): boolean;
  nudgeSelected(dx: number, dz: number): void;
  rotateSelected(deg: number): void;
  duplicateSelected(): string | null;
  deleteSelected(): void;
  save(): void;
  markSaved(): void;
  replaceDocument(doc: SceneDocument): void;
}

const idsOf = (doc: SceneDocument) => new Set(doc.entities.map((e) => e.id));
const keepSelection = (doc: SceneDocument, id: string | null) => (id && doc.entities.some((e) => e.id === id) ? id : null);
let toastSeq = 0;

export function createEditorStore(initial: SceneDocument = createSampleDocument()) {
  return createStore<EditorState>()((set, get) => {
    const step = (v: number, s: number) => (get().snapOn ? snap(v, s) : round4(v));

    /** Adds a new entity if it is placeable; returns its id or null (and tells the user why). */
    const addChecked = (entity: SceneEntity, label: string): string | null => {
      const problem = placementProblem(entity, get().doc.entities);
      if (problem) {
        get().notify(`Qo'yib bo'lmaydi: ${problem}`, 'error');
        return null;
      }
      get().execute(addCommand(entity, label));
      set({ selectedId: entity.id });
      return entity.id;
    };

    return {
      doc: initial,
      selectedId: null,
      tool: 'select',
      ghostRotation: 0,
      gridVisible: true,
      snapOn: true,
      transformMode: 'translate',
      past: [],
      future: [],
      dirty: false,
      savedAt: null,
      toast: null,
      cameraResetTick: 0,

      execute(cmd) {
        if (!cmd) return false;
        const { doc, past, selectedId } = get();
        const next = cmd.apply(doc);
        set({
          doc: next,
          past: [...past, cmd].slice(-HISTORY_LIMIT),
          future: [],
          dirty: true,
          selectedId: keepSelection(next, selectedId),
        });
        return true;
      },
      undo() {
        const { past, future, doc, selectedId } = get();
        const cmd = past[past.length - 1];
        if (!cmd) return;
        const next = cmd.revert(doc);
        set({ doc: next, past: past.slice(0, -1), future: [...future, cmd], dirty: true, selectedId: keepSelection(next, selectedId) });
      },
      redo() {
        const { past, future, doc, selectedId } = get();
        const cmd = future[future.length - 1];
        if (!cmd) return;
        const next = cmd.apply(doc);
        set({ doc: next, past: [...past, cmd], future: future.slice(0, -1), dirty: true, selectedId: keepSelection(next, selectedId) });
      },
      select(id) {
        set({ selectedId: keepSelection(get().doc, id) });
      },
      setTool(tool) {
        set({ tool, ghostRotation: 0, ...(tool === 'select' ? {} : { selectedId: null }) });
      },
      cancel() {
        if (get().tool !== 'select') set({ tool: 'select', ghostRotation: 0 });
        else set({ selectedId: null });
      },
      rotateGhost() {
        set({ ghostRotation: round4((get().ghostRotation + Math.PI / 2) % (Math.PI * 2)) });
      },
      setTransformMode(transformMode) {
        set({ transformMode });
      },
      toggleGrid() {
        set({ gridVisible: !get().gridVisible });
      },
      toggleSnap() {
        set({ snapOn: !get().snapOn });
      },
      resetCamera() {
        set({ cameraResetTick: get().cameraResetTick + 1 });
      },
      notify(text, kind = 'info') {
        toastSeq += 1;
        set({ toast: { id: toastSeq, text, kind } });
      },

      placeAsset(assetId, x, z) {
        const item = catalogById.get(assetId);
        if (!item) return null;
        const id = newId(item.type, idsOf(get().doc));
        return addChecked(entityFromCatalog(item, id, step(x, MOVE_STEP), step(z, MOVE_STEP), get().ghostRotation), `${item.label} qo'shish`);
      },
      addRoad(ax, az, bx, bz) {
        const dx = bx - ax;
        const dz = bz - az;
        const length = round4(Math.hypot(dx, dz));
        if (length < ROAD_STEP * 2) return null;
        const entity: SceneEntity = {
          id: newId('road', idsOf(get().doc)),
          type: 'road',
          assetId: 'road',
          position: [(ax + bx) / 2, 0, (az + bz) / 2],
          rotation: [0, -Math.atan2(dz, dx), 0],
          scale: [1, 1, 1],
          metadata: { length, width: ROAD_WIDTH },
        };
        return addChecked(entity, "Yo'l qo'shish");
      },
      addFootprint(ax, az, bx, bz) {
        const width = round4(Math.abs(bx - ax));
        const depth = round4(Math.abs(bz - az));
        if (width < 4 || depth < 4) {
          get().notify("Bino uchun maydon juda kichik (kamida 4×4 m).", 'error');
          return null;
        }
        const entity: SceneEntity = {
          id: newId('building', idsOf(get().doc)),
          type: 'building',
          assetId: 'prim:building-brick',
          position: [(ax + bx) / 2, 0, (az + bz) / 2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          metadata: { width, depth, floors: 3, storeyHeight: DEFAULT_STOREY, style: 'brick' },
        };
        return addChecked(entity, "Bino chizish");
      },
      updateEntity(id, change, label) {
        const before = get().doc.entities.find((e) => e.id === id);
        if (!before) return false;
        return get().execute(updateCommand(before, change(before), label));
      },
      nudgeSelected(dx, dz) {
        const id = get().selectedId;
        if (!id) return;
        get().updateEntity(id, (e) => ({ ...e, position: [e.position[0] + dx, e.position[1], e.position[2] + dz] }), 'Surish');
      },
      rotateSelected(deg) {
        const id = get().selectedId;
        if (!id) return;
        const rad = (deg * Math.PI) / 180;
        get().updateEntity(id, (e) => {
          let y = (e.rotation[1] + rad) % (Math.PI * 2);
          if (y > Math.PI) y -= Math.PI * 2;
          if (y <= -Math.PI) y += Math.PI * 2;
          return { ...e, rotation: [e.rotation[0], y, e.rotation[2]] };
        }, 'Aylantirish');
      },
      duplicateSelected() {
        const { doc, selectedId } = get();
        const src = doc.entities.find((e) => e.id === selectedId);
        if (!src) return null;
        const b = localBounds(src);
        const gap = Math.max(b.size[0] * Math.abs(src.scale[0]), b.size[2] * Math.abs(src.scale[2])) + 2;
        const id = newId(src.type, idsOf(doc));
        // Try free spots around the original; fall back to the first offset.
        const offsets: [number, number][] = [[gap, 0], [0, gap], [-gap, 0], [0, -gap], [gap, gap]];
        for (const [ox, oz] of offsets) {
          const copy: SceneEntity = {
            ...structuredClone(src),
            id,
            position: [src.position[0] + ox, src.position[1], src.position[2] + oz],
          };
          if (!placementProblem(copy, doc.entities)) {
            get().execute(addCommand(copy, 'Nusxa olish'));
            set({ selectedId: id });
            return id;
          }
        }
        get().notify("Nusxa uchun bo'sh joy topilmadi.", 'error');
        return null;
      },
      deleteSelected() {
        const { doc, selectedId } = get();
        if (!selectedId) return;
        get().execute(removeCommand(doc, selectedId));
        set({ selectedId: null });
      },
      save() {
        const ok = saveToStorage(get().doc);
        if (ok) {
          set({ dirty: false, savedAt: Date.now() });
          get().notify('Saqlandi');
        } else {
          get().notify("Saqlab bo'lmadi: brauzer xotirasi yopiq yoki to'la.", 'error');
        }
      },
      markSaved() {
        set({ dirty: false, savedAt: Date.now() });
      },
      replaceDocument(doc) {
        set({ doc, past: [], future: [], selectedId: null, tool: 'select', dirty: false });
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;

let appStore: EditorStore | null = null;
export function setAppStore(store: EditorStore): void {
  appStore = store;
}
export function getAppStore(): EditorStore {
  if (!appStore) throw new Error('Editor store not initialised');
  return appStore;
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(getAppStore(), selector);
}
