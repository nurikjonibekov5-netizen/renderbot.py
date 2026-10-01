import { normalizeEntity, type SceneDocument, type SceneEntity } from '@scene/schema';

/** An undoable, pure edit of the scene document. */
export interface Command {
  label: string;
  apply(doc: SceneDocument): SceneDocument;
  revert(doc: SceneDocument): SceneDocument;
}

const withEntities = (doc: SceneDocument, entities: SceneEntity[]): SceneDocument => ({ ...doc, entities });

export function addCommand(entity: SceneEntity, label = "Qo'shish"): Command {
  const e = normalizeEntity(entity);
  return {
    label,
    apply: (doc) => withEntities(doc, [...doc.entities.filter((x) => x.id !== e.id), e]),
    revert: (doc) => withEntities(doc, doc.entities.filter((x) => x.id !== e.id)),
  };
}

export function removeCommand(doc: SceneDocument, id: string, label = "O'chirish"): Command | null {
  const index = doc.entities.findIndex((x) => x.id === id);
  const entity = doc.entities[index];
  if (!entity) return null;
  return {
    label,
    apply: (d) => withEntities(d, d.entities.filter((x) => x.id !== id)),
    revert: (d) => {
      const list = d.entities.filter((x) => x.id !== id);
      list.splice(Math.min(index, list.length), 0, entity);
      return withEntities(d, list);
    },
  };
}

/** Replaces an entity's state. Returns null when nothing actually changes. */
export function updateCommand(before: SceneEntity, after: SceneEntity, label = "O'zgartirish"): Command | null {
  const next = normalizeEntity(after);
  if (JSON.stringify(next) === JSON.stringify(before)) return null;
  const swap = (target: SceneEntity) => (doc: SceneDocument) =>
    withEntities(doc, doc.entities.map((x) => (x.id === before.id ? target : x)));
  return { label, apply: swap(next), revert: swap(before) };
}

export function batchCommand(commands: Command[], label: string): Command {
  return {
    label,
    apply: (doc) => commands.reduce((d, c) => c.apply(d), doc),
    revert: (doc) => [...commands].reverse().reduce((d, c) => c.revert(d), doc),
  };
}
