import { memo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import type { SceneEntity } from '@scene/schema';
import { getAppStore, useEditor } from '../../editor/store.ts';
import { CLICK_TOLERANCE, gizmoBusy } from '../interaction.ts';
import { EntityShape } from './Shapes.tsx';
import { SelectionBox } from '../selection/SelectionBox.tsx';
import { TransformGizmo } from '../selection/TransformGizmo.tsx';

/** One scene entity: transform group + shape + selection/hover feedback. */
export const EntityView = memo(function EntityView({ entity }: { entity: SceneEntity }) {
  const selected = useEditor((s) => s.selectedId === entity.id);
  const selectMode = useEditor((s) => s.tool === 'select');
  const [hovered, setHovered] = useState(false);
  const [group, setGroup] = useState<THREE.Group | null>(null);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectMode) return; // other tools receive the click on the ground
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE || gizmoBusy()) return;
    getAppStore().getState().select(entity.id);
  };

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
          if (!selectMode) return;
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <EntityShape entity={entity} />
        {(selected || (hovered && selectMode)) && <SelectionBox entity={entity} strong={selected} />}
      </group>
      {selected && selectMode && group && <TransformGizmo entity={entity} object={group} />}
    </>
  );
});
