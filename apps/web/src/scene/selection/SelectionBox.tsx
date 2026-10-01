import { Line } from '@react-three/drei';
import type { SceneEntity } from '@scene/schema';
import { localBounds } from '../../lib/geometry.ts';
import { PALETTE } from '../environment/palette.ts';
import { useBoxEdges } from '../entities/Shapes.tsx';

/**
 * Orange bounding outline + ground footprint (video: orange outline/glow).
 * Drawn as extra objects; the entity's own materials are never modified.
 */
export function SelectionBox({ entity, strong }: { entity: SceneEntity; strong: boolean }) {
  const b = localBounds(entity);
  const points = useBoxEdges(b.size, b.center);
  return (
    <group raycast={() => null}>
      <Line
        points={points}
        segments
        color={PALETTE.accent}
        lineWidth={strong ? 3 : 1.5}
        transparent
        opacity={strong ? 1 : 0.6}
        raycast={() => null}
      />
      {strong && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} raycast={() => null} renderOrder={2}>
          <planeGeometry args={[b.size[0] + 0.6, b.size[2] + 0.6]} />
          <meshBasicMaterial color={PALETTE.accent} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
