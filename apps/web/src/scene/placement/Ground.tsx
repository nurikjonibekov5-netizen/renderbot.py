import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { getAppStore, ROAD_STEP } from '../../editor/store.ts';
import { snap } from '../../lib/geometry.ts';
import { MAT } from '../environment/palette.ts';
import { CLICK_TOLERANCE, draftStore, gizmoBusy, placementAllowed, pointerStore } from '../interaction.ts';
import { snapRoadPoint } from './roadSnap.ts';

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

/** Ground point under the pointer, independent of what object the ray hit first. */
function groundPoint(e: ThreeEvent<PointerEvent | MouseEvent>): [number, number] | null {
  return e.ray.intersectPlane(GROUND_PLANE, hit) ? [hit.x, hit.z] : null;
}

/**
 * The ground receives every pointer interaction of the build tools.
 * Entity groups stop propagation only in select mode, so tools work on top of buildings too.
 */
export function Ground() {
  const size = 1200;
  const handlers = useMemo(() => ({
    onPointerMove(e: ThreeEvent<PointerEvent>) {
      const p = groundPoint(e);
      if (p) pointerStore.setState({ x: p[0], z: p[1], inside: true });
    },
    onPointerLeave() {
      pointerStore.setState({ inside: false });
    },
    onPointerDown(e: ThreeEvent<PointerEvent>) {
      const s = getAppStore().getState();
      if (s.tool !== 'footprint' || e.button !== 0) return;
      const p = groundPoint(e);
      if (!p) return;
      (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
      const step = s.snapOn ? ROAD_STEP : 0;
      draftStore.setState({ footprintStart: step ? [snap(p[0], step), snap(p[1], step)] : p });
    },
    onPointerUp(e: ThreeEvent<PointerEvent>) {
      const s = getAppStore().getState();
      const start = draftStore.getState().footprintStart;
      if (s.tool !== 'footprint' || !start) return;
      draftStore.setState({ footprintStart: null });
      const p = groundPoint(e);
      if (!p) return;
      const end = s.snapOn ? [snap(p[0], ROAD_STEP), snap(p[1], ROAD_STEP)] : p;
      if (s.addFootprint(start[0], start[1], end[0]!, end[1]!)) s.setTool('select');
    },
    onClick(e: ThreeEvent<MouseEvent>) {
      if (e.delta > CLICK_TOLERANCE) return; // camera drag
      const s = getAppStore().getState();
      const p = groundPoint(e);
      if (!p) return;
      if (s.tool === 'select') {
        if (!gizmoBusy()) s.select(null);
      } else if (s.tool.startsWith('place:')) {
        if (e.detail > 1 || !placementAllowed()) return;
        s.placeAsset(s.tool.slice(6), p[0], p[1]);
      } else if (s.tool === 'road') {
        const pt = snapRoadPoint(p[0], p[1], s.doc.entities, s.snapOn);
        const start = draftStore.getState().roadStart;
        if (!start) {
          draftStore.setState({ roadStart: pt });
        } else if (s.addRoad(start[0], start[1], pt[0], pt[1])) {
          // Continue drawing from the end point, like the video's chained roads.
          draftStore.setState({ roadStart: pt });
        }
      }
    },
  }), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT.ground} name="ground" {...handlers}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

