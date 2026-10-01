import { Grid } from '@react-three/drei';
import { useEditor } from '../../editor/store.ts';
import { PALETTE } from './palette.ts';

/** Soft winter daylight (images 2/6): strong sky fill, sun from front-left, low-contrast shadows. */
export function Lights({ mobile }: { mobile: boolean }) {
  const size = 170;
  return (
    <>
      <hemisphereLight args={['#ffffff', PALETTE.shadow, 1.6]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[-70, 150, 90]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[mobile ? 1024 : 2048, mobile ? 1024 : 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={10}
        shadow-camera-far={500}
      />
    </>
  );
}

export function EditorGrid() {
  const visible = useEditor((s) => s.gridVisible);
  if (!visible) return null;
  return (
    <Grid
      position={[0, 0.012, 0]}
      args={[400, 400]}
      cellSize={2}
      cellThickness={0.6}
      cellColor="#dfe5ec"
      sectionSize={20}
      sectionThickness={1}
      sectionColor="#cdd6e0"
      fadeDistance={420}
      fadeStrength={1.5}
      infiniteGrid={false}
      raycast={() => null}
    />
  );
}
