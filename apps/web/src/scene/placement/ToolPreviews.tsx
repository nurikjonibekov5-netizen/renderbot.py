import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { ROAD_WIDTH } from '@scene/schema';
import { getAppStore, MOVE_STEP, ROAD_STEP, useEditor } from '../../editor/store.ts';
import { catalogById, entityFromCatalog } from '../../lib/catalog.ts';
import { placementProblem, snap } from '../../lib/geometry.ts';
import { PALETTE } from '../environment/palette.ts';
import { EntityShape } from '../entities/Shapes.tsx';
import { draftStore, pointerStore } from '../interaction.ts';
import { snapRoadPoint } from './roadSnap.ts';

const noRaycast = () => null;

/** Asset ghost that follows the cursor: orange = can place, red = blocked (P0-4). */
function PlacementGhost({ assetId }: { assetId: string }) {
  const rotation = useEditor((s) => s.ghostRotation);
  const invalidate = useThree((s) => s.invalidate);
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const item = catalogById.get(assetId);
  const entity = useMemo(() => (item ? entityFromCatalog(item, '__ghost__', 0, 0, rotation) : null), [item, rotation]);

  useEffect(() => {
    if (!entity) return undefined;
    const update = () => {
      const g = group.current;
      if (!g) return;
      const p = pointerStore.getState();
      const s = getAppStore().getState();
      const x = s.snapOn ? snap(p.x, MOVE_STEP) : p.x;
      const z = s.snapOn ? snap(p.z, MOVE_STEP) : p.z;
      g.visible = p.inside;
      g.position.set(x, 0, z);
      const bad = placementProblem({ ...entity, position: [x, 0, z] }, s.doc.entities);
      material.color.set(bad ? PALETTE.invalid : PALETTE.accent);
      g.userData.valid = !bad;
      invalidate();
    };
    update();
    return pointerStore.subscribe(update);
  }, [entity, material, invalidate]);

  if (!entity) return null;
  return (
    <group ref={group} name="ghost" rotation={[0, rotation, 0]} raycast={noRaycast}>
      <EntityShape entity={entity} override={material} />
    </group>
  );
}

const accentMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.85, depthWrite: false });
const accentSoft = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.25, depthWrite: false });

/** Road tool: node marker at the cursor and an orange preview line from the start node (P0-2). */
function RoadPreview() {
  const start = useStore(draftStore, (s) => s.roadStart);
  const invalidate = useThree((s) => s.invalidate);
  const marker = useRef<THREE.Mesh>(null);
  const line = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const update = () => {
      const p = pointerStore.getState();
      const s = getAppStore().getState();
      const [x, z] = snapRoadPoint(p.x, p.z, s.doc.entities, s.snapOn);
      if (marker.current) {
        marker.current.visible = p.inside;
        marker.current.position.set(x, 0.1, z);
      }
      if (line.current && start) {
        const dx = x - start[0];
        const dz = z - start[1];
        const len = Math.hypot(dx, dz);
        line.current.visible = len > 0.01;
        line.current.position.set((x + start[0]) / 2, 0.08, (z + start[1]) / 2);
        line.current.rotation.set(0, -Math.atan2(dz, dx), 0);
        line.current.scale.set(Math.max(len, 0.01), 0.06, ROAD_WIDTH);
      }
      invalidate();
    };
    update();
    return pointerStore.subscribe(update);
  }, [start, invalidate]);

  return (
    <group name="road-preview" raycast={noRaycast}>
      <mesh ref={marker} material={accentMat} raycast={noRaycast} renderOrder={3}>
        <boxGeometry args={[1.6, 0.2, 1.6]} />
      </mesh>
      {start && (
        <>
          <mesh position={[start[0], 0.1, start[1]]} material={accentMat} raycast={noRaycast} renderOrder={3}>
            <boxGeometry args={[1.6, 0.2, 1.6]} />
          </mesh>
          <mesh ref={line} material={accentSoft} raycast={noRaycast} renderOrder={2}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Footprint tool: orange rectangle from the pressed corner to the cursor (P0-3). */
function FootprintPreview() {
  const start = useStore(draftStore, (s) => s.footprintStart);
  const invalidate = useThree((s) => s.invalidate);
  const rect = useRef<THREE.Mesh>(null);
  const corner = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const update = () => {
      const p = pointerStore.getState();
      const s = getAppStore().getState();
      const x = s.snapOn ? snap(p.x, ROAD_STEP) : p.x;
      const z = s.snapOn ? snap(p.z, ROAD_STEP) : p.z;
      if (corner.current) {
        corner.current.visible = p.inside;
        corner.current.position.set(x, 0.12, z);
      }
      if (rect.current && start) {
        rect.current.position.set((x + start[0]) / 2, 0.1, (z + start[1]) / 2);
        rect.current.scale.set(Math.max(Math.abs(x - start[0]), 0.1), 0.1, Math.max(Math.abs(z - start[1]), 0.1));
      }
      invalidate();
    };
    update();
    return pointerStore.subscribe(update);
  }, [start, invalidate]);

  return (
    <group name="footprint-preview" raycast={noRaycast}>
      <mesh ref={corner} material={accentMat} raycast={noRaycast}>
        <cylinderGeometry args={[0.8, 0.8, 0.24, 16]} />
      </mesh>
      {start && (
        <mesh ref={rect} material={accentSoft} raycast={noRaycast} renderOrder={2}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      )}
    </group>
  );
}

export function ToolPreviews() {
  const tool = useEditor((s) => s.tool);
  if (tool === 'road') return <RoadPreview />;
  if (tool === 'footprint') return <FootprintPreview />;
  if (tool.startsWith('place:')) return <PlacementGhost key={tool} assetId={tool.slice(6)} />;
  return null;
}
