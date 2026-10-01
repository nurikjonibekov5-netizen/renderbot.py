// Asset pipeline: normalises every GLB in assets-src/buildings and writes
// public/assets/buildings/<id>.glb + manifest.json.
// Per model: auto-center (XZ), ground align (min Y = 0), unit/scale normalisation,
// up-axis / rotation correction, bounding-box check and material check.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, getBounds, join, prune, weld } from '@gltf-transform/functions';

const SRC = 'assets-src/buildings';
const OUT = 'public/assets/buildings';
mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const overrides = JSON.parse(readFileSync(`${SRC}/assets.json`, 'utf8'));
const r3 = (v) => Math.round(v * 1000) / 1000;

const manifest = [];
for (const file of readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.glb')).sort()) {
  const o = overrides[file] ?? {};
  const id = file.replace(/\.glb$/i, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const doc = await io.read(`${SRC}/${file}`);
  const root = doc.getRoot();
  const warnings = [];
  const fixes = [];

  // Lights baked into the GLB would add uncontrolled lights to the scene.
  for (const ext of root.listExtensionsUsed()) {
    if (ext.extensionName === 'KHR_lights_punctual') {
      for (const n of root.listNodes()) if (n.getExtension('KHR_lights_punctual')) n.setExtension('KHR_lights_punctual', null);
      ext.dispose();
      fixes.push('removed embedded lights');
    }
  }
  for (const cam of root.listCameras()) cam.dispose();

  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const wrapper = doc.createNode(`${id}-normalized`);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);

  // Mirrored nodes (negative scale determinant) flip normals.
  const mirrored = root.listNodes().filter((n) => {
    const s = n.getScale();
    return s[0] * s[1] * s[2] < 0;
  }).length;
  // three.js flips the winding of negatively scaled meshes itself, so this is information, not an error.
  if (mirrored) fixes.push(`${mirrored} mirrored nodes (winding handled by three.js)`);

  // Up axis: glTF is Y-up; Z-up exports can be forced with upAxis: 'z'.
  let rotation = [0, 0, 0, 1];
  if (o.upAxis === 'z') {
    rotation = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];
    fixes.push('Z-up → Y-up');
  }
  if (o.rotateY) {
    const a = (o.rotateY * Math.PI) / 360;
    const q = [0, Math.sin(a), 0, Math.cos(a)];
    // q * rotation
    const [x1, y1, z1, w1] = q;
    const [x2, y2, z2, w2] = rotation;
    rotation = [w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2];
    fixes.push(`rotated ${o.rotateY}° around Y`);
  }
  wrapper.setRotation(rotation);

  let b = getBounds(scene);
  let size = [0, 1, 2].map((i) => b.max[i] - b.min[i]);
  const maxDim = Math.max(...size);
  let scale = o.scale ?? 1;
  if (!o.scale) {
    if (maxDim > 5000) scale = 0.001;
    else if (maxDim > 500) scale = 0.01;
    else if (maxDim < 0.5) scale = 100;
    if (scale !== 1) fixes.push(`unit scale ×${scale}`);
  }
  wrapper.setScale([scale, scale, scale]);
  b = getBounds(scene);
  const center = [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2];
  if (Math.abs(center[0]) > 0.05 || Math.abs(center[2]) > 0.05) fixes.push(`centered (${r3(-center[0])}, ${r3(-center[2])})`);
  if (Math.abs(center[1]) > 0.005) fixes.push(`grounded (${r3(-center[1])})`);
  wrapper.setTranslation([-center[0], -center[1], -center[2]]);

  b = getBounds(scene);
  size = [0, 1, 2].map((i) => r3(b.max[i] - b.min[i]));
  if (size[1] < 2 || size[1] > 400) warnings.push(`implausible height ${size[1]} m`);
  if (Math.max(size[0], size[2]) > 300) warnings.push(`implausible footprint ${size[0]}×${size[2]} m`);
  if (size[1] < 0.15 * Math.max(size[0], size[2])) warnings.push('very flat: check up axis');

  const materials = root.listMaterials().map((m) => {
    const c = m.getBaseColorFactor();
    const issues = [];
    if (!m.getBaseColorTexture() && c[0] < 0.02 && c[1] < 0.02 && c[2] < 0.02 && m.getEmissiveFactor().every((v) => v < 0.02)) issues.push('black');
    if (m.getAlphaMode() !== 'OPAQUE') issues.push(`alpha ${m.getAlphaMode()}`);
    if (c[3] < 0.05) issues.push('invisible');
    return { name: m.getName(), color: c.slice(0, 3).map(r3), emissive: m.getEmissiveFactor().some((v) => v > 0), issues };
  });
  for (const m of materials) for (const i of m.issues) warnings.push(`material "${m.name}": ${i}`);
  if (root.listTextures().length === 0) fixes.push('no textures (colour materials only)');

  // Many GLBs are thousands of tiny nodes: bake them into one mesh per material (draw calls).
  const nodesBefore = root.listNodes().length;
  await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld(), prune());
  fixes.push(`merged ${nodesBefore} nodes into ${root.listMeshes().length} meshes`);
  let tris = 0;
  for (const mesh of root.listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      const idx = p.getIndices();
      tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
  }
  await io.write(`${OUT}/${id}.glb`, doc);
  const entry = {
    id: `glb:${id}`,
    file: `assets/buildings/${id}.glb`,
    source: `${SRC}/${file}`,
    label: o.label ?? id,
    hint: o.hint ?? '',
    size,
    tris: Math.round(tris),
    materials,
    fixes,
    warnings,
  };
  manifest.push(entry);
  console.log(`${file}: ${size.join(' × ')} m, ${entry.tris} tris; fixes: ${fixes.join('; ') || '—'}; warnings: ${warnings.join('; ') || '—'}`);
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync('src/lib/assetManifest.json', JSON.stringify(manifest, null, 2) + '\n');
