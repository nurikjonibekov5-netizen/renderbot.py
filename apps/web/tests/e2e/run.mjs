// Gate 1 + Gate 2 end-to-end tests (video interactions, reference world) and screenshots.
// Usage: npm run build && npm run e2e
import { mkdirSync } from 'node:fs';
import { BASE, launch, startServer } from './browser.mjs';

const OUT = 'test-results';
mkdirSync(OUT, { recursive: true });

const results = [];
let page;
let errors = [];

// ?still = deterministic frames: no traffic motion, no construction animation.
async function open(query = '?fresh&nohint&still', viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__editor && document.querySelector('canvas'));
  await page.waitForTimeout(900);
}

/**
 * Small deterministic fixture for interaction tests: the clinic, one GLB, two roads and a tree,
 * with free ground in front of the camera (the full sample city has no empty ground near the centre).
 */
const FIXTURE = {
  schemaVersion: 1, projectId: 'fixture', name: 'Test', environment: { season: 'winter', timeOfDay: 11 },
  entities: [
    { id: 'road-main', type: 'road', assetId: 'road', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], metadata: { length: 200, width: 8 } },
    { id: 'road-centre', type: 'road', assetId: 'road', position: [0, 0, -4], rotation: [0, 1.5708, 0], scale: [1, 1, 1], metadata: { length: 200, width: 8 } },
    { id: 'bld-clinic', type: 'building', assetId: 'prim:clinic', position: [-24, 0, -28], rotation: [0, 1.5708, 0], scale: [1, 1, 1],
      metadata: { width: 30, depth: 28, floors: 4, storeyHeight: 3.6, style: 'white', kind: 'clinic', name: 'Klinika' } },
    { id: 'bld-majmua', type: 'building', assetId: 'glb:majmua', position: [30, 0, -30], rotation: [0, 0, 0], scale: [1, 1, 1],
      metadata: { width: 41.24, depth: 35.17, height: 11.665, name: 'Majmua' } },
    { id: 'tree-1', type: 'tree', assetId: 'prim:tree-cone', position: [5.9, 0, -15], rotation: [0, 0, 0], scale: [1, 1, 1] },
  ],
};
async function openFixture() {
  await open();
  await page.evaluate((d) => window.__editor.store.getState().replaceDocument(d), FIXTURE);
  await settle(500);
}

const doc = () => page.evaluate(() => window.__editor.store.getState().doc);
const state = (fn) => page.evaluate(`(${fn})(window.__editor.store.getState())`);
const entity = (id) => page.evaluate((i) => window.__editor.store.getState().doc.entities.find((e) => e.id === i) ?? null, id);
const count = async () => (await doc()).entities.length;
const last = async () => (await doc()).entities.at(-1);
const screen = (x, y, z) => page.evaluate(([a, b, c]) => window.__editor.project(a, b, c), [x, y, z]);
async function clickWorld(x, y, z) {
  const p = await screen(x, y, z);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
}
async function dragWorld(a, b) {
  const p = await screen(a[0], 0, a[1]);
  const q = await screen(b[0], 0, b[1]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
async function tool(id, group) {
  if (group && !(await page.isVisible(`[data-testid="tool-${id}"]`))) await page.click(`[data-testid="group-${group}"]`);
  await page.click(`[data-testid="tool-${id}"]`);
}
const settle = (ms = 400) => page.waitForTimeout(ms);
const toastText = () => page.textContent('[data-testid="toast"]').catch(() => '');

// Fixed reference points of the sample world (packages/scene-schema/src/sample.ts).
const CLINIC_ROOF = [-24, 16, -28];
const EMPTY = [-30, 30]; // free ground in front of the clinic (fixture)
const EMPTY_FAR = [-90, 0, -100]; // never used for clicks; documentation only

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function test(name, fn) {
  errors = [];
  const t0 = Date.now();
  try {
    await fn();
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: String(err.message || err) });
    console.log(`  ✗ ${name}\n      ${err.message || err}`);
    await page.screenshot({ path: `${OUT}/fail-${name.replace(/\W+/g, '_')}.png` }).catch(() => {});
  }
}

const server = await startServer();
const browser = await launch();
page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
void EMPTY_FAR;

console.log('Editor e2e (Gate 1 + Gate 2)');

await test('loads the reference world without errors', async () => {
  await open();
  const d = await doc();
  assert(d.schemaVersion === 1, 'schemaVersion');
  for (const id of ['bld-clinic', 'bld-minora', 'bld-texnik_bino', 'bld-majmua', 'bld-uch_qavatli']) {
    assert(d.entities.some((e) => e.id === id), `${id} missing`);
  }
  assert(d.entities.filter((e) => e.type === 'lot' && e.metadata.surface === 'parking').length >= 3, 'parking lots');
  for (const a of ['prim:traffic-light', 'prim:lamp', 'prim:tree-box', 'prim:rail', 'prim:pipe-bridge']) {
    assert(d.entities.some((e) => e.assetId === a), `${a} missing`);
  }
  assert(await page.isVisible('[data-testid="tool-road"]'), 'toolbar missing');
  const stats = await page.evaluate(() => window.__editor.stats());
  assert(stats.calls < 600, `too many draw calls: ${stats.calls}`);
});

await test('GLB assets: grounded, centred, measured size, no embedded lights (Gate 2)', async () => {
  await open();
  await page.waitForFunction(() => window.__editor.assets().every((a) => a.runtime), null, { timeout: 15000 });
  const assets = await page.evaluate(() => window.__editor.assets());
  assert(assets.length === 4, `expected 4 GLBs, got ${assets.length}`);
  for (const a of assets) {
    assert(Math.abs(a.runtime.minY) < 0.05, `${a.id} not on ground: minY ${a.runtime.minY}`);
    for (let i = 0; i < 3; i += 1) assert(Math.abs(a.runtime.size[i] - a.manifest[i]) < 0.05, `${a.id} size drift`);
    assert(a.runtime.size[1] > 5 && a.runtime.size[1] < 60, `${a.id} implausible height`);
    assert(a.runtime.lights === 0, `${a.id} has lights`);
    assert(a.runtime.meshes <= 20, `${a.id} not merged: ${a.runtime.meshes} meshes`);
    assert(a.warnings.length === 0, `${a.id} warnings: ${a.warnings}`);
  }
});

await test('select: click a building selects it, empty ground deselects (P0-5)', async () => {
  await openFixture();
  await clickWorld(...CLINIC_ROOF);
  assert((await state((s) => s.selectedId)) === 'bld-clinic', 'clinic not selected');
  assert((await page.textContent('[data-testid="inspector-title"]')) === 'Klinika', 'inspector title');
  await clickWorld(EMPTY[0], 0, EMPTY[1]);
  assert((await state((s) => s.selectedId)) === null, 'not deselected');
  assert(!(await page.isVisible('[data-testid="inspector"]')), 'inspector still visible');
});

await test('select: a camera drag over a building does not select it', async () => {
  await open();
  const p = await screen(...CLINIC_ROOF);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y + 30, { steps: 6 });
  await page.mouse.up();
  await settle();
  assert((await state((s) => s.selectedId)) === null, 'drag selected the building');
});

await test('place: ghost + click adds one entity at the snapped point (P0-4)', async () => {
  await openFixture();
  const n = await count();
  await tool('place:prim:tree-cone', 'trees');
  assert(await page.isVisible('[data-testid="tool-hint"]'), 'tool hint');
  const p = await screen(EMPTY[0], 0, EMPTY[1]);
  await page.mouse.move(p.x, p.y);
  await settle(150);
  const ghost = await page.evaluate(() => window.__editor.ghost());
  assert(ghost && ghost.visible && ghost.valid, `ghost ${JSON.stringify(ghost)}`);
  await page.mouse.click(p.x, p.y);
  await settle(200);
  assert((await count()) === n + 1, 'not placed');
  const added = await last();
  assert(added.type === 'tree' && added.position[0] === EMPTY[0] && added.position[2] === EMPTY[1], `position ${added.position}`);
});

await test('place: GLB asset from the library; overlap refused with a message; R rotates; Esc cancels', async () => {
  await open();
  const n = await count();
  await tool('place:glb:minora', 'buildings');
  await page.keyboard.press('r');
  assert(Math.abs((await state((s) => s.ghostRotation)) - Math.PI / 2) < 1e-3, 'R did not rotate ghost');
  await clickWorld(CLINIC_ROOF[0], 0, CLINIC_ROOF[2]);
  assert((await count()) === n, 'overlap was placed');
  assert((await toastText()).includes("Qo'yib bo'lmaydi"), 'no error toast');
  await page.keyboard.press('Escape');
  assert((await state((s) => s.tool)) === 'select', 'Esc did not cancel tool');
});

await test('road tool: two clicks add a road, Esc cancels a started road (P0-2)', async () => {
  await openFixture();
  const n = await count();
  await tool('road');
  await clickWorld(-40, 0, 20);
  await page.keyboard.press('Escape');
  await clickWorld(-40, 0, 22);
  await settle(200);
  assert((await count()) === n, 'Esc did not cancel the road');
  await clickWorld(-40, 0, 32);
  await settle(300);
  assert((await count()) === n + 1, 'road not added');
  const road = await last();
  assert(road.type === 'road' && Math.abs(road.metadata.length - 10) < 0.01, `road length ${road.metadata.length}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  assert((await state((s) => s.tool)) === 'select', 'tool not reset');
});

await test('road tool: a road through a building is refused', async () => {
  await openFixture();
  const n = await count();
  await tool('road');
  await clickWorld(-40, 0, -28);
  await clickWorld(-10, 0, -28);
  assert((await count()) === n, 'road crossed the clinic');
  assert((await toastText()).includes("Qo'yib bo'lmaydi"), 'no message');
});

await test('lot + parking tools: drag a rectangle; a lot on the road is refused (video 8–10 s)', async () => {
  await openFixture();
  const n = await count();
  await tool('lot');
  await dragWorld([-40, 20], [-30, 30]);
  const lot = await last();
  assert((await count()) === n + 1 && lot.type === 'lot' && lot.metadata.width === 10 && lot.metadata.depth === 10, `lot ${JSON.stringify(lot.metadata)}`);
  assert((await state((s) => s.tool)) === 'lot', 'lot tool should stay active (video)');
  await tool('parking');
  await dragWorld([-60, -4], [-50, 4]);
  assert((await count()) === n + 1, 'parking on the road was placed');
  assert((await toastText()).includes("yo'l"), 'no road message');
});

await test('footprint → building rises, selected, height handle adds floors with one undo (video 10–18 s)', async () => {
  await openFixture();
  const n = await count();
  await tool('footprint');
  await dragWorld([-40, 20], [-30, 30]);
  const b = await last();
  assert((await count()) === n + 1 && b.type === 'building' && b.metadata.width === 10 && b.metadata.depth === 10, 'building size');
  assert((await state((s) => s.selectedId)) === b.id && (await state((s) => s.tool)) === 'select', 'new building not selected');
  const hist = await state((s) => s.past.length);
  const h = b.metadata.floors * b.metadata.storeyHeight + 1.4;
  const a = await screen(b.position[0] + 5.2, h, b.position[2] + 5.2);
  const up = await screen(b.position[0] + 5.2, h + 10, b.position[2] + 5.2);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(up.x, up.y, { steps: 10 });
  await page.mouse.up();
  await settle(300);
  const after = await entity(b.id);
  assert(after.metadata.floors >= b.metadata.floors + 2, `floors ${b.metadata.floors} → ${after.metadata.floors}`);
  assert((await state((s) => s.past.length)) === hist + 1, 'height drag made more than one undo step');
  assert((await state((s) => s.selectedId)) === b.id, 'selection lost after handle drag');
  await page.keyboard.press('Control+z');
  assert((await entity(b.id)).metadata.floors === b.metadata.floors, 'undo floors');
});

await test('facade tool: hover highlights a side, click restyles that side; storefront (video 11–25 s)', async () => {
  await openFixture();
  await tool('footprint');
  await dragWorld([-44, 20], [-30, 30]);
  const b = await last();
  await tool('facade:glass', 'facade');
  // the +Z side faces the camera
  await clickWorld(b.position[0], 3, b.position[2] + b.metadata.depth / 2);
  const styled = await entity(b.id);
  assert(styled.metadata.faces?.s === 'glass', `faces ${JSON.stringify(styled.metadata.faces)}`);
  await tool('facade:storefront', 'facade');
  await clickWorld(b.position[0] + b.metadata.width / 2, 2, b.position[2]);
  assert((await entity(b.id)).metadata.ground === 'storefront', 'storefront not applied');
  await tool('facade:brick', 'facade');
  await clickWorld(30, 11.6, -30); // GLB building (majmua roof): refused with a message
  assert((await toastText()).includes('tayyor 3D model'), 'GLB facade message');
});

await test('move: arrow keys, inspector field and gizmo drag; one undo step per drag (P0-6)', async () => {
  await openFixture();
  await clickWorld(...CLINIC_ROOF);
  await page.keyboard.press('ArrowLeft');
  assert((await entity('bld-clinic')).position[0] === -25, 'arrow nudge');
  await page.fill('[data-testid="field-z"]', '-30');
  await page.press('[data-testid="field-z"]', 'Enter');
  assert((await entity('bld-clinic')).position[2] === -30, 'inspector Z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await settle(300);
  const before = await entity('bld-clinic');
  const hist = await state((s) => s.past.length);
  let moved = false;
  for (const k of [-8, -6, -10, -5]) {
    // drag the gizmo's Z arrow towards the camera… along -X it is the X arrow mirrored; use Z
    const a = await screen(before.position[0], 0, before.position[2] + Math.abs(k));
    const bb = await screen(before.position[0], 0, before.position[2] + Math.abs(k) - 6);
    await page.mouse.move(a.x, a.y);
    await settle(120);
    await page.mouse.down();
    await page.mouse.move(bb.x, bb.y, { steps: 10 });
    await page.mouse.up();
    await settle(300);
    const now = await entity('bld-clinic');
    if (now.position[0] !== before.position[0] || now.position[2] !== before.position[2]) {
      moved = true;
      break;
    }
  }
  assert(moved, 'gizmo drag did not move the building');
  assert((await state((s) => s.past.length)) === hist + 1, 'drag created more than one history step');
  assert((await state((s) => s.selectedId)) === 'bld-clinic', 'selection lost after drag');
  await page.keyboard.press('Control+z');
  const back = await entity('bld-clinic');
  assert(back.position[0] === before.position[0] && back.position[2] === before.position[2], 'undo did not restore');
});

await test('rotate, scale, floors via inspector (P0-6, P0-10)', async () => {
  await openFixture();
  await clickWorld(...CLINIC_ROOF);
  await page.click('[data-testid="floors-plus"]');
  assert((await entity('bld-clinic')).metadata.floors === 5, 'floors');
  const rot = (await entity('bld-clinic')).rotation[1];
  await page.click('[data-testid="rotate-90"]');
  const r2 = (await entity('bld-clinic')).rotation[1];
  assert(Math.abs(Math.abs(r2 - rot) - Math.PI / 2) < 1e-3 || Math.abs(Math.abs(r2 - rot) - (3 * Math.PI) / 2) < 1e-3, `rotate 90 (${rot} → ${r2})`);
  await page.keyboard.press('Escape');
  const tree = (await doc()).entities.find((e) => e.type === 'tree' && e.position[0] === 5.9 && e.position[2] === -15);
  await clickWorld(5.9, 3.5, -15);
  const id = await state((s) => s.selectedId);
  assert(id === tree.id, `wrong selection ${id} (expected ${tree.id})`);
  await page.fill('[data-testid="field-scale"]', '2');
  await page.press('[data-testid="field-scale"]', 'Enter');
  assert((await entity(id)).scale[0] === 2, 'scale');
  await page.fill('[data-testid="field-scale"]', '0');
  await page.press('[data-testid="field-scale"]', 'Enter');
  assert((await entity(id)).scale[0] >= 0.05, 'scale reached zero');
});

await test('duplicate + delete + undo/redo (P0-7, P0-8)', async () => {
  await openFixture();
  const n = await count();
  await clickWorld(5.9, 3.5, -15);
  const src = await state((s) => s.selectedId);
  assert(src && src.startsWith('tree'), `tree not selected (${src})`);
  await page.keyboard.press('Control+d');
  const dup = await state((s) => s.selectedId);
  assert(dup && dup !== src, 'duplicate id');
  assert((await count()) === n + 1, 'duplicate count');
  await page.keyboard.press('Delete');
  assert((await count()) === n && !(await entity(dup)), 'delete removed wrong entity');
  assert(await entity(src), 'original deleted');
  await page.keyboard.press('Control+z');
  assert(await entity(dup), 'undo delete');
  await page.keyboard.press('Control+Shift+z');
  assert(!(await entity(dup)), 'redo delete');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  assert(!(await entity(dup)) && (await count()) === n, 'undo duplicate');
  await page.keyboard.press('Control+y');
  assert(await entity(dup), 'Ctrl+Y redo');
  await page.click('[data-testid="undo"]');
  await page.click('[data-testid="redo"]');
  assert(await entity(dup), 'toolbar undo/redo');
});

await test('camera: zoom limits and reset (P0-1)', async () => {
  await open();
  const start = await page.evaluate(() => window.__editor.camera());
  const vp = await page.locator('canvas').boundingBox();
  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  for (let i = 0; i < 25; i += 1) await page.mouse.wheel(0, 600);
  await settle(1200);
  const far = await page.evaluate(() => window.__editor.camera());
  assert(far.distance <= 600.5, `max distance ${far.distance}`);
  for (let i = 0; i < 50; i += 1) await page.mouse.wheel(0, -600);
  await settle(1200);
  const near = await page.evaluate(() => window.__editor.camera());
  assert(near.distance >= 14.9, `min distance ${near.distance}`);
  assert(near.position[1] > 0, 'camera under ground');
  await page.click('[data-testid="camera-reset"]');
  await settle(600);
  const reset = await page.evaluate(() => window.__editor.camera());
  assert(Math.abs(reset.distance - start.distance) < 1, `reset distance ${reset.distance} vs ${start.distance}`);
});

await test('presentation mode hides the UI; Esc returns (video 26–38 s)', async () => {
  await open();
  await page.click('[data-testid="present"]');
  await settle(300);
  assert(!(await page.isVisible('[data-testid="tool-road"]')) && !(await page.isVisible('[data-testid="undo"]')), 'UI still visible');
  await page.screenshot({ path: `${OUT}/desktop-presentation.png` });
  await page.keyboard.press('Escape');
  await settle(200);
  assert(await page.isVisible('[data-testid="tool-road"]'), 'UI not restored');
});

await test('save + reload restores the exact scene (P0-9)', async () => {
  await openFixture();
  await tool('place:prim:lamp', 'street');
  await clickWorld(EMPTY[0], 0, EMPTY[1]);
  await page.keyboard.press('Escape');
  await clickWorld(...CLINIC_ROOF);
  await page.keyboard.press('ArrowLeft');
  await page.click('[data-testid="floors-plus"]');
  await page.keyboard.press('Control+s');
  await page.waitForSelector('[data-testid="save-status"]:has-text("Saqlandi")');
  const saved = JSON.stringify(await doc());
  await page.goto(BASE + '?nohint&still');
  await page.waitForFunction(() => window.__editor);
  assert(saved === JSON.stringify(await doc()), 'reloaded scene differs');
});

await test('autosave without pressing Save survives reload', async () => {
  await openFixture();
  await tool('place:prim:hedge', 'trees');
  await clickWorld(EMPTY[0], 0, EMPTY[1]);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="save-status"]:has-text("Saqlandi")', { timeout: 5000 });
  const saved = JSON.stringify(await doc());
  await page.goto(BASE + '?nohint&still'); // without ?fresh, which would clear storage
  await page.waitForFunction(() => window.__editor);
  assert(JSON.stringify(await doc()) === saved, 'autosave not restored');
});

await test('corrupted storage falls back to the sample scene with a message', async () => {
  await open();
  await page.evaluate(() => localStorage.setItem('isoeditor:project:v2', '{broken json'));
  await page.goto(BASE + '?nohint&still');
  await page.waitForFunction(() => window.__editor);
  assert((await doc()).entities.some((e) => e.id === 'bld-clinic'), 'sample not loaded');
  assert(await page.isVisible('[data-testid="toast"]'), 'no message');
});

await test('construction animation runs without ?still and ends at full height', async () => {
  await open('?fresh&nohint');
  await page.evaluate((d) => window.__editor.store.getState().replaceDocument(d), FIXTURE);
  await settle(400);
  await tool('footprint');
  const p0 = await screen(-40, 0, 20);
  const p1 = await screen(-30, 0, 30);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p1.x, p1.y, { steps: 6 });
  await page.mouse.up();
  await page.screenshot({ path: `${OUT}/desktop-construction-mid.png` });
  await settle(1200);
  await page.screenshot({ path: `${OUT}/desktop-construction-done.png` });
  const b = await last();
  const scaleY = await page.evaluate((id) => {
    const g = window.__editor.scene?.getObjectByName(id);
    return g ? g.children[0].scale.y : 1;
  }, b.id);
  assert(Math.abs(scaleY - 1) < 1e-6, `building not at full height: ${scaleY}`);
});

await test('screenshots 1440×900 and 390×844, no horizontal overflow on mobile', async () => {
  await open();
  await settle(1500);
  await page.screenshot({ path: `${OUT}/desktop-1440x900.png` });
  await clickWorld(...CLINIC_ROOF);
  await settle(500);
  await page.screenshot({ path: `${OUT}/desktop-selected.png` });
  await page.keyboard.press('Escape');
  await tool('road');
  await clickWorld(-58, 0, -40);
  const p = await screen(-58, 0, -60);
  await page.mouse.move(p.x, p.y);
  await settle(400);
  await page.screenshot({ path: `${OUT}/desktop-road-tool.png` });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await open('?fresh&still', { width: 390, height: 844 });
  await settle(1500);
  await page.screenshot({ path: `${OUT}/mobile-390x844-hint.png` });
  await page.click('[data-testid="hint-ok"]');
  await settle(300);
  await page.screenshot({ path: `${OUT}/mobile-390x844.png` });
  await clickWorld(...CLINIC_ROOF);
  await settle(500);
  await page.screenshot({ path: `${OUT}/mobile-390x844-selected.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!overflow, 'horizontal overflow on mobile');
});

await browser.close();
server.kill();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
