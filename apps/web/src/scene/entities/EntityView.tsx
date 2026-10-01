import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { FaceKey, SceneEntity } from '@scene/schema';
import { getAppStore, useEditor, type FacadeTool } from '../../editor/store.ts';
import { buildingMeta, isGlb, localBounds } from '../../lib/geometry.ts';
import { CLICK_TOLERANCE, buildProgress, gizmoBusy } from '../interaction.ts';
import { PALETTE } from '../environment/palette.ts';
import type { Crossing } from '../build/roads.ts';
import { EntityShape } from './Shapes.tsx';
import { SelectionBox } from '../selection/SelectionBox.tsx';
import { TransformGizmo } from '../selection/TransformGizmo.tsx';
import { HeightHandle } from '../selection/HeightHandle.tsx';
import { FaceHighlight, faceAt } from '../selection/FaceHighlight.tsx';

const glowMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.6, depthWrite: false });
const easeOut = (k: number) => 1 - (1 - k) ** 3;

/**
 * Construction animation (video 10–12 s): an orange massing rises from the lot,
 * then the finished building grows to full height and the glow fades.
 */
function BuildAnimation({ id, body, size, center }: {
  id: string; body: RefObject<THREE.Group | null>; size: [number, number, number]; center: [number, number, number];
}) {
  const glow = useRef<THREE.Mesh>(null);
  const [done, setDone] = useState(false);
  const material = useMemo(() => glowMat.clone(), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ invalidate }) => {
    if (done) return;
    const k = buildProgress(id);
    const g = body.current;
    if (k === null) {
      if (g) g.scale.y = 1;
      setDone(true);
      invalidate();
      return;
    }
    if (g) g.scale.y = Math.max(0.02, easeOut(Math.min(1, k * 1.25)));
    if (glow.current) {
      glow.current.scale.y = Math.max(0.02, easeOut(Math.min(1, k * 1.6)));
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    }
    invalidate();
  });
  if (done) return null;
  return (
    <mesh ref={glow} position={[center[0], 0, center[2]]} raycast={() => null} material={material} renderOrder={4}>
      <boxGeometry args={[size[0] + 0.6, size[1] * 2, size[2] + 0.6]} />
    </mesh>
  );
}

/** One scene entity: transform group + shape + selection/hover/tool feedback. */
export const EntityView = memo(function EntityView({ entity, crossings }: { entity: SceneEntity; crossings?: readonly Crossing[] }) {
  const selected = useEditor((s) => s.selectedId === entity.id);
  const tool = useEditor((s) => s.tool);
  const selectMode = tool === 'select';
  const facadeTool = tool.startsWith('facade:') ? (tool.slice(7) as FacadeTool) : null;
  const procedural = entity.type === 'building' && !isGlb(entity);
  const [hovered, setHovered] = useState(false);
  const [face, setFace] = useState<FaceKey | 'ground' | null>(null);
  const [previewFloors, setPreviewFloors] = useState<number | null>(null);
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const body = useRef<THREE.Group>(null);
  const [animating] = useState(() => entity.type === 'building' && buildProgress(entity.id) !== null);

  const interactive = selectMode || (facadeTool !== null && entity.type === 'building');

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return; // other tools receive the click on the ground
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE || gizmoBusy()) return;
    const s = getAppStore().getState();
    if (facadeTool) {
      const local = group ? group.worldToLocal(e.point.clone()) : e.point;
      s.applyFacade(entity.id, facadeTool === 'storefront' ? null : faceAt(local, buildingMeta(entity)), facadeTool);
      return;
    }
    s.select(entity.id);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!facadeTool || !procedural || !group) return;
    e.stopPropagation();
    const next = facadeTool === 'storefront' ? 'ground' : faceAt(group.worldToLocal(e.point.clone()), buildingMeta(entity));
    if (next !== face) setFace(next);
  };

  const b = animating ? localBounds(entity) : null;
  const shown = previewFloors ? { ...entity, metadata: { ...entity.metadata, floors: previewFloors } } : entity;

  return (
    <>
      <group
        ref={setGroup}
        name={entity.id}
        userData={{ entityId: entity.id }}
        position={entity.position}
        rotation={entity.rotation}
        scale={entity.scale}
        onClick={onClick}
        onPointerOver={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerMove={onMove}
        onPointerOut={() => {
          setHovered(false);
          setFace(null);
        }}
      >
        <group ref={body}>
          <EntityShape entity={entity} crossings={crossings} previewFloors={previewFloors ?? undefined} />
        </group>
        {b && <BuildAnimation id={entity.id} body={body} size={b.size} center={b.center} />}
        {(selected || (hovered && selectMode)) && <SelectionBox entity={shown} strong={selected} />}
        {facadeTool && procedural && face && hovered && <FaceHighlight m={buildingMeta(entity)} face={face} />}
        {selected && selectMode && procedural && group && (
          <HeightHandle entity={entity} group={group} onPreview={setPreviewFloors} />
        )}
      </group>
      {selected && selectMode && group && <TransformGizmo entity={entity} object={group} />}
    </>
  );
});
