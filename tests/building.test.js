import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessScale } from '../web/src/scene/engine/gltf.js';
import { autoLayout, doorPoint } from '../shared/layout.js';
import { clinic } from './helpers.js';

test("3ds Max o'lchov birligi to'g'ri aniqlanadi", () => {
  assert.equal(guessScale({ x: 32, z: 13 }, 0), 1); // metr
  assert.equal(guessScale({ x: 3200, z: 1300 }, 0), 0.01); // santimetr
  assert.equal(guessScale({ x: 32000, z: 13000 }, 0), 0.001); // millimetr
  assert.equal(guessScale({ x: 3200, z: 1300 }, 0.1), 0.1); // sozlamada qo'lda berilgan
});

test("avtomatik chizmada xonalar ustma-ust tushmaydi va zinapoya bir joyda", () => {
  const c = clinic();
  const layout = autoLayout(c);
  const stairs = new Set();
  for (const f of c.floors) {
    const fl = layout.floors[f];
    stairs.add(`${fl.stairs.x},${fl.stairs.z}`);
    const rects = Object.entries(fl.rooms).filter(([id]) => id !== fl.corridorRoomId).map(([, r]) => r);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap = Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.01 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.01;
        assert.ok(!overlap, `${f}-qavat: xonalar ustma-ust`);
      }
    }
    for (const r of c.rooms.filter((x) => x.floor === f)) assert.ok(fl.rooms[r.id], `${r.id} chizmada bor`);
    // Har xona eshigi koridor ichida.
    for (const id of Object.keys(fl.rooms)) {
      const d = doorPoint(fl, id);
      assert.ok(Math.abs(d.z - fl.corridor.z) <= fl.corridor.d / 2 + 1e-9);
    }
  }
  assert.equal(stairs.size, 1);
});
