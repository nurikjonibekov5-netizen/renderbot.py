import { Grid } from '@react-three/drei';
import { useEditor } from '../../editor/store.ts';
import { PALETTE } from './palette.ts';

/** Soft winter daylight (images 2/6): strong sky fill, sun from front-left, low-contrast shadows. */
export function Lights({ mobile }: { mobile: boolean }) {
  const size = 215;
  const map = mobile ? 2048 : 4096;
  return (
    <>
      {/* cool sky fill + warm low sun: the warm/cool split of images 2 and 6 */}
      <hemisphereLight args={['#E4ECFF', PALETTE.shadow, 1.2]} />
      <ambientLight intensity={0.22} color="#DCE6F5" />
      <directionalLight
        position={[-90, 170, 110]}
        intensity={2.9}
        color="#FFF3E6"
        castShadow
        shadow-mapSize={[map, map]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={2.5}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={10}
        shadow-camera-far={600}
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
