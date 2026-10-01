import * as THREE from 'three';

/** Linear-space colours for vertex colouring, from the palette in REFERENCE_ANALYSIS §4 (images 2 & 6). */
const c = (hex: string) => new THREE.Color(hex);

export const COL = {
  // buildings
  brick: c('#DE6443'),
  brickDark: c('#B44530'),
  frame: c('#EEF0F2'),
  mullion: c('#C3CBD4'),
  glass: c('#A2AEBF'),
  glassDark: c('#5F6B7A'),
  warm: c('#FFD98C'),
  white: c('#F1F2F0'),
  whiteShade: c('#E4E7EA'),
  windowDark: c('#2C333D'),
  baseDark: c('#3A414B'),
  roof: c('#FAFBFC'),
  roofDark: c('#4E545C'),
  parapet: c('#EEF1F4'),
  skylight: c('#4A5361'),
  hvac: c('#D9DDE2'),
  fan: c('#3C434D'),
  crate: c('#C9A579'),
  core: c('#5E6977'),
  sign: c('#2EC4C9'),
  // ground & roads
  asphalt: c('#3D434C'),
  line: c('#F4F5F6'),
  sidewalk: c('#F0F2F5'),
  curb: c('#D4DAE1'),
  paving: c('#E3E7EC'),
  pavingLine: c('#D2D8DF'),
  plaza: c('#E9ECEF'),
  // nature & props
  snow: c('#FBFCFD'),
  snowShade: c('#E8EDF2'),
  pine: c('#2F5947'),
  leaf: c('#79A353'),
  leafDark: c('#5E8A40'),
  hedge: c('#6F9A4E'),
  trunk: c('#7A6656'),
  metal: c('#59616D'),
  metalLight: c('#A9B1BB'),
  black: c('#1E2228'),
  red: c('#E2483D'),
  amber: c('#F4B63A'),
  green: c('#3FBF6B'),
  lampGlow: c('#FFE6A6'),
  ballast: c('#BFC4CB'),
  rail: c('#6B727C'),
  sleeper: c('#8E8073'),
  pipe: c('#DDE2E7'),
  truss: c('#8D96A1'),
};

/** Car paint colours seen in images 2 and 6. */
export const CAR_COLORS = ['#F2F3F5', '#B8BEC6', '#5B6470', '#C8452F', '#E07A2F', '#2F4F7A', '#D9D2C5', '#3A3F46'].map(c);
/** Freight wagon colours (images 2 and 6). */
export const WAGON_COLORS = ['#D9692E', '#C85A28', '#8E949C', '#3F454D', '#B9BDC3'].map(c);
