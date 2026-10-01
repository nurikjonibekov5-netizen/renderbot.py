// Gate 1 end-to-end tests (P0 interactions) + screenshots.
// Usage: npm run build && npm run e2e
import { mkdirSync } from 'node:fs';
import { BASE, launch, startServer } from './browser.mjs';

const OUT = 'test-results';
mkdirSync(OUT, { recursive: true });

const results = [];
let page;
let errors = [];

async function open(query = '?fresh&nohint', viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__editor && document.querySelector('canvas'));
  await page.waitForTimeout(700);
}

const doc = () => page.evaluate(() => window.__editor.store.getState().doc);
const state = (fn) => page.evaluate(`(${fn})(window.__editor.store.getState())`);
const entity = (id) => page.evaluate((i) => window.__editor.store.getState().doc.entities.find((e) => e.id === i) ?? null, id);
const count = async () => (await doc()).entities.length;
const screen = (x, y, z) => page.evaluate(([a, b, c]) => window.__editor.project(a, b, c), [x, y, z]);
async function clickWorld(x, y, z) {
  const p = await screen(x, y, z);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(120);
}
const settle = (ms = 400) => page.waitForTimeout(ms);

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

console.log('Gate 1 — editor e2e');

await test('loads sample scene without errors', async () => {
  await open();
  const d = await doc();
  assert(d.schemaVersion === 1, 'schemaVersion');
  assert(d.entities.some((e) => e.id === 'bld-clinic'), 'clinic missing');
  assert(await page.isVisible('[data-testid="tool-road"]'), 'toolbar missing');
});

await test('select: click a building selects it, empty ground deselects (P0-5)', async () => {
  await open();
  await clickWorld(24, 13.8, -22);
  assert((await state((s) => s.selectedId)) === 'bld-clinic', 'clinic not selected');
  assert(await page.isVisible('[data-testid="inspector"]'), 'inspector hidden');
  assert((await page.textContent('[data-testid="inspector-title"]')) === 'Klinika', 'inspector title');
  await clickWorld(-40, 0, 44);
  assert((await state((s) => s.selectedId)) === null, 'not deselected');
  assert(!(await page.isVisible('[data-testid="inspector"]')), 'inspector still visible');
});

await test('select: a camera drag over a building does not select it', async () => {
  await open();
  const p = await screen(24, 13.8, -22);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y + 30, { steps: 6 });
  await page.mouse.up();
  await settle();
  assert((await state((s) => s.selectedId)) === null, 'drag selected the building');
});

await test('place: asset ghost + click adds one entity at the snapped point (P0-4)', async () => {
  await open();
  const n = await count();
  await page.click('[data-testid="tool-place:prim:tree-cone"]');
  assert(await page.isVisible('[data-testid="tool-hint"]'), 'tool hint');
  const p = await screen(-60, 0, -60);
  await page.mouse.move(p.x, p.y);
  await settle(150);
  const ghost = await page.evaluate(() => window.__editor.ghost());
  assert(ghost && ghost.visible && ghost.valid, `ghost ${JSON.stringify(ghost)}`);
  await page.mouse.click(p.x, p.y);
  await settle(200);
  assert((await count()) === n + 1, 'not placed');
  const added = (await doc()).entities.at(-1);
  assert(added.type === 'tree' && added.position[0] === -60 && added.position[2] === -60, `position ${added.position}`);
});

await test('place: overlapping placement is refused with a message; R rotates; Esc cancels', async () => {
  await open();
  const n = await count();
  await page.click('[data-testid="tool-place:prim:building-brick"]');
  await page.keyboard.press('r');
  assert(Math.abs((await state((s) => s.ghostRotation)) - Math.PI / 2) < 1e-3, 'R did not rotate ghost');
  await clickWorld(24, 0, -22);
  assert((await count()) === n, 'overlap was placed');
  assert(await page.isVisible('[data-testid="toast"]'), 'no error toast');
  await page.keyboard.press('Escape');
  assert((await state((s) => s.tool)) === 'select', 'Esc did not cancel tool');
});

await test('road tool: two clicks add a road, Esc cancels a started road (P0-2)', async () => {
  await open();
  const n = await count();
  await page.click('[data-testid="tool-road"]');
  await clickWorld(-50, 0, -60);
  await page.keyboard.press('Escape');
  await clickWorld(-40, 0, -60);
  await page.waitForTimeout(300);
  // Esc cleared the start; this click started a new draft, so nothing added yet.
  assert((await count()) === n, 'Esc did not cancel the road');
  await clickWorld(0, 0, -60);
  await settle(300);
  assert((await count()) === n + 1, 'road not added');
  const road = (await doc()).entities.at(-1);
  assert(road.type === 'road' && Math.abs(road.metadata.length - 40) < 0.01, `road length ${road.metadata.length}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  assert((await state((s) => s.tool)) === 'select', 'tool not reset');
});

await test('footprint tool: drag a rectangle creates a building of that size (P0-3)', async () => {
  await open();
  const n = await count();
  await page.click('[data-testid="tool-footprint"]');
  const a = await screen(50, 0, -100);
  const b = await screen(70, 0, -86);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await settle(300);
  assert((await count()) === n + 1, 'building not created');
  const bld = (await doc()).entities.at(-1);
  assert(bld.type === 'building' && bld.metadata.width === 20 && bld.metadata.depth === 14, `size ${bld.metadata.width}x${bld.metadata.depth}`);
  assert((await state((s) => s.tool)) === 'select', 'tool not back to select');
});

await test('move: arrow keys, inspector field and gizmo drag; one undo step per drag (P0-6)', async () => {
  await open();
  await clickWorld(24, 13.8, -22);
  await page.keyboard.press('ArrowRight');
  assert((await entity('bld-clinic')).position[0] === 25, 'arrow nudge');
  await page.fill('[data-testid="field-z"]', '-30');
  await page.press('[data-testid="field-z"]', 'Enter');
  assert((await entity('bld-clinic')).position[2] === -30, 'inspector Z');

  // Gizmo: drag the X arrow (it extends ~4–12 m along +X from the object origin at this zoom).
  await settle(300);
  const before = await entity('bld-clinic');
  const hist = await state((s) => s.past.length);
  let moved = false;
  for (const k of [8, 6, 10, 5]) {
    const a = await screen(before.position[0] + k, 0, before.position[2]);
    const b = await screen(before.position[0] + k + 12, 0, before.position[2]);
    await page.mouse.move(a.x, a.y);
    await settle(120);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
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
  await open();
  await clickWorld(24, 13.8, -22);
  await page.click('[data-testid="floors-plus"]');
  assert((await entity('bld-clinic')).metadata.floors === 5, 'floors');
  await page.click('[data-testid="rotate-90"]');
  assert(Math.abs((await entity('bld-clinic')).rotation[1] - Math.PI / 2) < 1e-3, 'rotate 90');
  // Scale field on a tree.
  await page.keyboard.press('Escape');
  const tree = (await doc()).entities.find((e) => e.type === 'tree' && e.position[0] === 52 && e.position[2] === 6);
  await clickWorld(52, 3.5, 6);
  const id = await state((s) => s.selectedId);
  assert(id === tree.id, `wrong selection ${id} (expected ${tree.id})`);
  assert(id && id.startsWith('tree'), `tree not selected (${id})`);
  await page.fill('[data-testid="field-scale"]', '2');
  await page.press('[data-testid="field-scale"]', 'Enter');
  assert((await entity(id)).scale[0] === 2, 'scale');
  await page.fill('[data-testid="field-scale"]', '0');
  await page.press('[data-testid="field-scale"]', 'Enter');
  assert((await entity(id)).scale[0] >= 0.05, 'scale reached zero');
});

await test('duplicate + delete + undo/redo (P0-7, P0-8)', async () => {
  await open();
  const n = await count();
  await clickWorld(24, 13.8, -22);
  await page.keyboard.press('Control+d');
  const dup = await state((s) => s.selectedId);
  assert(dup && dup !== 'bld-clinic', 'duplicate id');
  assert((await count()) === n + 1, 'duplicate count');
  await page.keyboard.press('Delete');
  assert((await count()) === n && !(await entity(dup)), 'delete removed wrong entity');
  assert(await entity('bld-clinic'), 'original deleted');
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

await test('save + reload restores the exact scene (P0-9)', async () => {
  await open();
  await page.click('[data-testid="tool-place:prim:lamp"]');
  await clickWorld(-60, 0, -60);
  await page.keyboard.press('Escape');
  await clickWorld(24, 13.8, -22);
  await page.keyboard.press('ArrowLeft');
  await page.click('[data-testid="floors-plus"]');
  await page.keyboard.press('Control+s');
  await page.waitForSelector('[data-testid="save-status"]:has-text("Saqlandi")');
  const saved = JSON.stringify(await doc());
  await page.goto(BASE + '?nohint');
  await page.waitForFunction(() => window.__editor);
  const restored = JSON.stringify(await doc());
  assert(saved === restored, 'reloaded scene differs');
});

await test('autosave without pressing Save survives reload', async () => {
  await open();
  await page.click('[data-testid="tool-place:prim:hedge"]');
  await clickWorld(-60, 0, -40);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="save-status"]:has-text("Saqlandi")', { timeout: 5000 });
  const saved = JSON.stringify(await doc());
  await page.goto(BASE + '?nohint'); // without ?fresh, which would clear storage
  await page.waitForFunction(() => window.__editor);
  assert(JSON.stringify(await doc()) === saved, 'autosave not restored');
});

await test('corrupted storage falls back to the sample scene with a message', async () => {
  await open();
  await page.evaluate(() => localStorage.setItem('isoeditor:project:current', '{broken json'));
  await page.goto(BASE + '?nohint');
  await page.waitForFunction(() => window.__editor);
  assert((await doc()).entities.some((e) => e.id === 'bld-clinic'), 'sample not loaded');
  assert(await page.isVisible('[data-testid="toast"]'), 'no message');
});

await test('screenshots 1440×900 and 390×844, no horizontal overflow on mobile', async () => {
  await open('?fresh&nohint');
  await settle(800);
  await page.screenshot({ path: `${OUT}/desktop-1440x900.png` });
  await clickWorld(24, 13.8, -22);
  await settle(500);
  await page.screenshot({ path: `${OUT}/desktop-selected.png` });
  await page.click('[data-testid="tool-road"]');
  await clickWorld(-70, 0, -60);
  const p = await screen(-20, 0, -60);
  await page.mouse.move(p.x, p.y);
  await settle(400);
  await page.screenshot({ path: `${OUT}/desktop-road-tool.png` });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await open('?fresh', { width: 390, height: 844 });
  await settle(800);
  await page.screenshot({ path: `${OUT}/mobile-390x844-hint.png` });
  await page.click('[data-testid="hint-ok"]');
  await clickWorld(24, 13.8, -22);
  await settle(500);
  await page.screenshot({ path: `${OUT}/mobile-390x844.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!overflow, 'horizontal overflow on mobile');
});

await browser.close();
server.kill();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
