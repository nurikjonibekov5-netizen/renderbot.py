import { describe, expect, it } from 'vitest';
import {
  SCALE_MAX,
  SCALE_MIN,
  createEmptyDocument,
  createSampleDocument,
  loadDocument,
  parseDocument,
  serializeDocument,
} from '@scene/schema';

describe('scene schema', () => {
  it('sample document is deterministic and valid', () => {
    const a = createSampleDocument();
    const b = createSampleDocument();
    expect(serializeDocument(a)).toBe(serializeDocument(b));
    const res = loadDocument(a);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.doc?.entities.length).toBe(a.entities.length);
    expect(new Set(a.entities.map((e) => e.id)).size).toBe(a.entities.length);
  });

  it('round-trips through JSON without drift', () => {
    const doc = createSampleDocument();
    const back = parseDocument(serializeDocument(doc));
    expect(back.doc).toEqual(doc);
  });

  it('drops broken entities but keeps the rest', () => {
    const doc = createEmptyDocument();
    const raw = {
      ...doc,
      entities: [
        { id: 'a', type: 'tree', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { id: 'a', type: 'tree', position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { id: 'b', type: 'spaceship', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { id: 'c', type: 'prop', position: [0, 'x', 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        'junk',
      ],
    };
    const res = loadDocument(raw);
    expect(res.ok).toBe(true);
    expect(res.doc?.entities.map((e) => e.id)).toEqual(['a']);
    expect(res.errors.length).toBe(4);
  });

  it('clamps scale, keeps objects above ground and floors integer', () => {
    const res = loadDocument({
      ...createEmptyDocument(),
      entities: [
        { id: 'p', type: 'prop', position: [0, -5, 0], rotation: [0, 0, 0], scale: [0, -3, 999] },
        { id: 'b', type: 'building', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], metadata: { floors: 2.7 } },
      ],
    });
    const [p, b] = res.doc!.entities;
    expect(p!.position[1]).toBe(0);
    expect(p!.scale).toEqual([SCALE_MIN, SCALE_MIN, SCALE_MAX]);
    expect(b!.metadata!.floors).toBe(3);
  });

  it('migrates drafts without schemaVersion and refuses future versions', () => {
    const { schemaVersion: _v, ...noVersion } = createEmptyDocument();
    expect(loadDocument(noVersion).ok).toBe(true);
    expect(loadDocument({ ...createEmptyDocument(), schemaVersion: 99 }).ok).toBe(false);
    expect(parseDocument('{nope').ok).toBe(false);
  });
});
