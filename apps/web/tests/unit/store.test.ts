import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDocument, createSampleDocument, type SceneEntity } from '@scene/schema';
import { createEditorStore, HISTORY_LIMIT, type EditorStore } from '../../src/editor/store.ts';

let store: EditorStore;
const s = () => store.getState();
const ids = () => s().doc.entities.map((e) => e.id);
const byId = (id: string) => s().doc.entities.find((e) => e.id === id) as SceneEntity;

beforeEach(() => {
  store = createEditorStore(createEmptyDocument());
});

describe('editor store', () => {
  it('places an asset on the snapped point and selects it', () => {
    s().setTool('place:prim:tree-cone');
    const id = s().placeAsset('prim:tree-cone', 10.4, -3.6)!;
    expect(id).toBeTruthy();
    expect(byId(id).position).toEqual([10, 0, -4]);
    expect(s().selectedId).toBe(id);
  });

  it('refuses overlapping placement', () => {
    s().placeAsset('prim:building-brick', 0, 0);
    expect(s().placeAsset('prim:building-brick', 2, 2)).toBeNull();
    expect(s().doc.entities).toHaveLength(1);
    expect(s().toast?.kind).toBe('error');
  });

  it('undo/redo restores exact state', () => {
    const id = s().placeAsset('prim:lamp', 3, 3)!;
    const before = structuredClone(byId(id));
    s().nudgeSelected(1, 0);
    expect(byId(id).position).toEqual([4, 0, 3]);
    s().undo();
    expect(byId(id)).toEqual(before);
    s().redo();
    expect(byId(id).position).toEqual([4, 0, 3]);
    s().undo();
    s().undo();
    expect(s().doc.entities).toHaveLength(0);
    expect(s().selectedId).toBeNull();
    s().redo();
    expect(ids()).toEqual([id]);
  });

  it('a new command clears redo', () => {
    s().placeAsset('prim:lamp', 3, 3);
    s().undo();
    s().placeAsset('prim:lamp', 9, 9);
    expect(s().future).toHaveLength(0);
  });

  it('delete removes only the selected entity and undo puts it back in place', () => {
    const a = s().placeAsset('prim:lamp', 0, 0)!;
    const b = s().placeAsset('prim:lamp', 10, 0)!;
    const c = s().placeAsset('prim:lamp', 20, 0)!;
    s().select(b);
    s().deleteSelected();
    expect(ids()).toEqual([a, c]);
    s().undo();
    expect(ids()).toEqual([a, b, c]);
  });

  it('duplicate gets a unique id and a free spot', () => {
    const a = s().placeAsset('prim:building-brick', 0, 0)!;
    const b = s().duplicateSelected()!;
    expect(b).not.toBe(a);
    expect(new Set(ids()).size).toBe(2);
    expect(byId(b).position).not.toEqual(byId(a).position);
    expect(s().selectedId).toBe(b);
  });

  it('floors change building height in whole storeys', () => {
    const id = s().placeAsset('prim:building-brick', 0, 0)!;
    s().updateEntity(id, (e) => ({ ...e, metadata: { ...e.metadata, floors: 7.6 } }));
    expect(byId(id).metadata!.floors).toBe(8);
  });

  it('no-op updates do not create history', () => {
    const id = s().placeAsset('prim:lamp', 0, 0)!;
    const n = s().past.length;
    expect(s().updateEntity(id, (e) => ({ ...e }))).toBe(false);
    expect(s().past.length).toBe(n);
  });

  it('roads: two points make one road; too short is ignored', () => {
    expect(s().addRoad(0, 0, 2, 0)).toBeNull();
    const id = s().addRoad(-10, 0, 10, 0)!;
    const road = byId(id);
    expect(road.metadata!.length).toBe(20);
    expect(road.position).toEqual([0, 0, 0]);
  });

  it('footprint creates a building with the dragged size', () => {
    const id = s().addFootprint(-10, -6, 10, 6)!;
    expect(byId(id).metadata).toMatchObject({ width: 20, depth: 12 });
    expect(s().addFootprint(0, 0, 2, 2)).toBeNull();
  });

  it('Esc semantics: leaves a tool first, then clears selection', () => {
    const id = s().placeAsset('prim:lamp', 0, 0)!;
    s().select(id);
    s().cancel();
    expect(s().selectedId).toBeNull();
    s().setTool('road');
    s().cancel();
    expect(s().tool).toBe('select');
  });

  it('history is capped', () => {
    const id = s().placeAsset('prim:lamp', 0, 0)!;
    s().select(id);
    for (let i = 0; i < HISTORY_LIMIT + 20; i += 1) s().nudgeSelected(i % 2 ? 1 : -1, 0);
    expect(s().past.length).toBe(HISTORY_LIMIT);
  });

  it('scale cannot reach zero or negative', () => {
    const id = s().placeAsset('prim:lamp', 0, 0)!;
    s().updateEntity(id, (e) => ({ ...e, scale: [0, -1, 0] }));
    expect(byId(id).scale.every((v) => v > 0)).toBe(true);
  });

  it('sample scene loads with no overlaps between solid entities', async () => {
    const { placementProblem } = await import('../../src/lib/geometry.ts');
    const doc = createSampleDocument();
    for (const e of doc.entities) expect(placementProblem(e, doc.entities), e.id).toBeNull();
  });
});
