import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import type * as THREE from 'three';
import type { SceneEntity, Vec3 } from '@scene/schema';
import { getAppStore, useEditor } from '../../editor/store.ts';
import { placementProblem } from '../../lib/geometry.ts';
import { noteGizmoDragEnd, registerGizmo } from '../interaction.ts';

interface GizmoInstance {
  axis: string | null;
  dragging: boolean;
}

/**
 * Move / rotate / scale gizmo. While dragging only the three.js object moves;
 * on release exactly one undoable command is committed (P0-6).
 */
export function TransformGizmo({ entity, object }: { entity: SceneEntity; object: THREE.Object3D }) {
  const mode = useEditor((s) => s.transformMode);
  const snapOn = useEditor((s) => s.snapOn);
  const ref = useRef<GizmoInstance | null>(null);

  useEffect(() => {
    registerGizmo(ref.current);
    return () => registerGizmo(null);
  }, []);

  const restore = () => {
    object.position.fromArray(entity.position);
    object.rotation.set(entity.rotation[0], entity.rotation[1], entity.rotation[2]);
    object.scale.fromArray(entity.scale);
  };

  const commit = () => {
    noteGizmoDragEnd();
    const store = getAppStore().getState();
    const after: SceneEntity = {
      ...entity,
      position: object.position.toArray() as Vec3,
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: object.scale.toArray() as Vec3,
    };
    const problem = placementProblem(after, store.doc.entities);
    if (problem) {
      store.notify(`Bu joyga qo'yib bo'lmaydi: ${problem}`, 'error');
      restore();
      return;
    }
    const label = mode === 'translate' ? "Ko'chirish" : mode === 'rotate' ? 'Aylantirish' : "O'lcham";
    if (!store.updateEntity(entity.id, () => after, label)) restore();
  };

  return (
    <TransformControls
      ref={ref as never}
      object={object}
      mode={mode}
      size={0.9}
      showX={mode !== 'rotate'}
      showY={mode !== 'translate'}
      showZ={mode !== 'rotate'}
      translationSnap={snapOn ? 1 : null}
      rotationSnap={snapOn ? Math.PI / 12 : null}
      scaleSnap={snapOn ? 0.1 : null}
      onMouseUp={commit}
    />
  );
}
