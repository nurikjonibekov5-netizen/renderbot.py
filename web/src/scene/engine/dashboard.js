// "Bosh sahifa" sahnasi (1-rasm ruhida): har qavat - oq izometrik maydoncha.
// Ustida katta och raqam (qavatdagi xodimlar soni), kichik odamchalar va qavatga xos belgi,
// maydonchalar ko'k punktir yo'l bilan bog'langan, ostida qisqa statistika.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { hashString } from '../../../../shared/time.js';
import { PALETTE } from './palette.js';
import { box, mat, ownMaterials } from './util.js';
import { createCharacter } from './characters.js';

export const PLATFORM = { w: 8, h: 1.5, d: 8, gap: 15 };
const MAX_FIGURES = 6;

function html(cls, inner = '') {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = inner;
  return el;
}

// Qavatga xos kichik belgi: qaysi xonalar bor bo'lsa, shunga qarab tanlanadi.
function floorIcon(kinds) {
  const g = new THREE.Group();
  const white = mat(0xffffff, { roughness: 0.6 });
  const teal = mat(PALETTE.accent, { roughness: 0.45 });
  const soft = mat(PALETTE.cushion, { roughness: 0.6 });
  const steel = mat(PALETTE.steel, { roughness: 0.4 });
  if (kinds.has('qabulxona')) {
    g.add(box(3.0, 1.1, 0.9, white, 0, 0.55, 0));
    g.add(box(3.1, 0.08, 1.0, teal, 0, 1.14, 0));
    const sign = box(0.9, 0.9, 0.12, mat(PALETTE.cross, { emissive: PALETTE.cross, emissiveIntensity: 0.2 }), 0, 1.9, -0.3);
    g.add(sign);
    g.add(box(0.28, 0.9, 0.14, white, 0, 1.9, -0.22), box(0.9, 0.28, 0.14, white, 0, 1.9, -0.22));
  } else if (kinds.has('operatsion')) {
    g.add(box(1.0, 0.9, 2.4, steel, 0, 0.45, 0));
    g.add(box(1.05, 0.12, 2.45, soft, 0, 0.96, 0));
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.22, 24), mat(0xffffff, { emissive: 0xfff4d6, emissiveIntensity: 0.5 }));
    lamp.position.set(0, 2.5, 0);
    lamp.castShadow = true;
    g.add(lamp, box(0.06, 0.6, 0.06, steel, 0, 2.9, 0));
  } else if (kinds.has('laboratoriya')) {
    g.add(box(2.6, 1.0, 1.0, white, 0, 0.5, 0));
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6 + (i % 2) * 0.25, 12), i % 2 ? soft : mat(0x9cc2e8, { roughness: 0.3 }));
      tube.position.set(-0.9 + i * 0.6, 1.35 + (i % 2) * 0.12, 0);
      tube.castShadow = true;
      g.add(tube);
    }
    g.add(box(0.5, 0.9, 0.5, steel, 1.0, 1.45, -0.1));
  } else if (kinds.has('oshxona')) {
    g.add(box(2.6, 1.0, 1.0, white, 0, 0.5, 0));
    g.add(box(1.0, 0.06, 0.8, mat(0x3a4048), -0.6, 1.03, 0));
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.45, 20), steel);
    pot.position.set(-0.6, 1.3, 0);
    pot.castShadow = true;
    g.add(pot, box(0.7, 0.5, 0.5, soft, 0.7, 1.25, 0));
  } else {
    g.add(box(1.4, 1.8, 0.6, white, 0, 0.9, 0));
  }
  return g;
}

function dottedPath(points) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(140));
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x3b82f6, dashSize: 0.32, gapSize: 0.28, transparent: true }));
  line.computeLineDistances();
  return line;
}

export function buildHome(config) {
  const group = new THREE.Group();
  group.name = 'home';
  const floors = [...config.floors].sort((a, b) => a - b);
  const n = floors.length;
  const platforms = new Map();
  // Maydonchalar ekranda gorizontal qator bo'lib, o'ngga biroz ko'tarilib turishi uchun
  // kamera yo'nalishiga perpendikulyar chiziq bo'ylab joylashadi.
  const dirX = new THREE.Vector3(0.93, 0, -0.36).normalize();
  const pos = floors.map((_, i) => dirX.clone().multiplyScalar((i - (n - 1) / 2) * PLATFORM.gap).add(new THREE.Vector3(0, 0, -(i - (n - 1) / 2) * 1.6)));

  // Yengil izometrik katak (1-rasmdagi romb plitkalar).
  const gridPts = [];
  const R = 70;
  for (let k = -R; k <= R; k += 7) {
    gridPts.push(new THREE.Vector3(k - R, 0, -R), new THREE.Vector3(k + R, 0, R));
    gridPts.push(new THREE.Vector3(k + R, 0, -R), new THREE.Vector3(k - R, 0, R));
  }
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), new THREE.LineBasicMaterial({ color: 0xdfe5eb, transparent: true, opacity: 0.55 }));
  grid.position.y = 0.005;
  group.add(grid);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.09 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  group.add(shadowCatcher);

  const geo = new RoundedBoxGeometry(PLATFORM.w, PLATFORM.h, PLATFORM.d, 4, 0.35);
  floors.forEach((f, i) => {
    const holder = new THREE.Group();
    holder.position.copy(pos[i]);
    group.add(holder);
    const lift = new THREE.Group();
    holder.add(lift);

    const slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, emissive: PALETTE.accent, emissiveIntensity: 0 }));
    slab.position.y = PLATFORM.h / 2;
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.userData.homeFloor = f;
    lift.add(slab);
    const top = box(PLATFORM.w - 0.9, 0.04, PLATFORM.d - 0.9, mat(0xf6f8fa, { roughness: 0.9 }), 0, PLATFORM.h + 0.02, 0, { cast: false });
    top.userData.homeFloor = f;
    lift.add(top);

    const kinds = new Set(config.rooms.filter((r) => r.floor === f).map((r) => r.kind.toLowerCase()));
    const icon = floorIcon(kinds);
    icon.position.set(1.6, PLATFORM.h, -1.4);
    icon.traverse((o) => { if (o.isMesh) o.userData.homeFloor = f; });
    lift.add(icon);

    const people = new THREE.Group();
    people.position.set(-1.6, PLATFORM.h, 1.0);
    lift.add(people);

    // Old tomonga yopishgan rangli yorliq (1-rasmdagi ko'k "线索" yorlig'i).
    const tagEl = html('home-tag', `${f}-qavat`);
    tagEl.dataset.floor = f;
    const tag = new CSS2DObject(tagEl);
    tag.position.set(-PLATFORM.w / 2 + 0.9, PLATFORM.h * 0.55, PLATFORM.d / 2);
    lift.add(tag);

    const numEl = html('home-num', '0');
    const num = new CSS2DObject(numEl);
    num.position.set(0, PLATFORM.h + 5.2, -1);
    lift.add(num);

    const statsEl = html('home-stats');
    statsEl.dataset.floor = f;
    const stats = new CSS2DObject(statsEl);
    stats.position.set(0.2, 0, PLATFORM.d / 2 + 4.6);
    holder.add(stats);

    platforms.set(f, { f, holder, lift, slab, people, tagEl, numEl, statsEl, liftY: 0, liftTarget: 0, key: '' });
  });

  // Punktir yo'l: maydonchalarni chapdan o'ngga bog'laydi, biroz to'lqinlanib.
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i].clone().add(new THREE.Vector3(PLATFORM.w / 2 + 0.4, 0.03, 1.6));
    const b = pos[i + 1].clone().add(new THREE.Vector3(-PLATFORM.w / 2 - 0.4, 0.03, 2.0));
    const m1 = a.clone().lerp(b, 0.35).add(new THREE.Vector3(0, 0, 1.8));
    const m2 = a.clone().lerp(b, 0.7).add(new THREE.Vector3(0, 0, -1.4));
    group.add(dottedPath([a, m1, m2, b]));
  }

  ownMaterials(group);
  const bounds = new THREE.Box3();
  for (const p of pos) {
    bounds.expandByPoint(p.clone().add(new THREE.Vector3(-PLATFORM.w / 2 - 1, 0, -PLATFORM.d / 2 - 1)));
    bounds.expandByPoint(p.clone().add(new THREE.Vector3(PLATFORM.w / 2 + 1, PLATFORM.h + 6.5, PLATFORM.d / 2 + 5.5)));
  }
  return { group, platforms, bounds };
}

// Joriy holat bo'yicha raqamlar, statistika va kichik odamchalarni yangilaydi.
export function updateHome(home, { snapshot, staffById, roles, roleFilter }) {
  let rebuilt = false;
  const byFloor = new Map();
  for (const st of snapshot.staff) {
    if (!st.present) continue;
    const s = staffById.get(st.id);
    if (!s || (roleFilter && !roleFilter.has(s.role))) continue;
    if (!byFloor.has(st.floor)) byFloor.set(st.floor, []);
    byFloor.get(st.floor).push({ st, s });
  }
  for (const [f, p] of home.platforms) {
    const list = byFloor.get(f) || [];
    const moving = list.filter((x) => x.st.status === 'yurmoqda').length;
    const idle = list.filter((x) => x.st.status === 'uzoq_harakatsiz').length;
    const lost = list.filter((x) => x.st.status === 'signal_yoq').length;
    const priv = list.filter((x) => x.st.private).length;
    p.numEl.textContent = String(list.length);
    p.tagEl.classList.toggle('alert', idle + lost > 0);
    p.statsEl.innerHTML = [
      `<div><b>${moving}</b> harakatda</div>`,
      `<div><b>${list.length - moving - idle - lost}</b> joyida ishlamoqda</div>`,
      idle + lost ? `<div class="warn"><b>${idle + lost}</b> e'tibor kerak${lost ? ` · ${lost} signalsiz` : ''}</div>` : `<div class="ok">hammasi joyida</div>`,
      priv ? `<div class="muted"><b>${priv}</b> maxfiy zonada</div>` : '',
    ].join('');

    // Kichik odamchalar: tarkib o'zgargandagina qayta quriladi.
    const shown = list.slice(0, MAX_FIGURES);
    const key = shown.map((x) => x.s.id).join(',');
    if (key !== p.key) {
      p.key = key;
      for (const c of [...p.people.children]) {
        p.people.remove(c);
        c.traverse((o) => { if (o.isCSS2DObject) o.element.remove(); });
      }
      shown.forEach(({ s }, i) => {
        const ch = createCharacter(s, roles[s.role]?.color || '#7a8594', hashString(s.id));
        ch.tag.userData.hidden = true;
        ch.tag.visible = false;
        ch.tag.element.remove();
        ch.ring.visible = false;
        ch.root.scale.setScalar(0.95);
        ch.root.position.set((i % 3) * 1.1 - 1.1, 0, Math.floor(i / 3) * 1.3 - 0.4);
        ch.root.rotation.y = 0.5 + (i % 2) * 0.3;
        p.people.add(ch.root);
      });
      rebuilt = true;
    }
  }
  return rebuilt;
}
