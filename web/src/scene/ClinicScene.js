// 3D sahna: bino, odamchalar, kamera. React'dan mustaqil ishlaydi.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { doorPoint } from '../../../shared/layout.js';
import { hashString, rng } from '../../../shared/time.js';
import { buildAutoFloor, loadModelFloor } from './building.js';

// "Hammasi" ko'rinishida qavatlar zinapoya kabi: har biri biroz yuqorida va orqada turadi,
// shunda old tomondan qaraganda hech bir qavat boshqasini to'sib qo'ymaydi.
export const FLOOR_RISE = 4;
export const FLOOR_GAP_Z = 4;

export const STATUS_COLORS = {
  yurmoqda: '#16a34a',
  turibdi: '#2563eb',
  uzoq_harakatsiz: '#f59e0b',
  signal_yoq: '#9ca3af',
  binoda_emas: '#9ca3af',
};

const SKIN = 0xf1c9a5;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function shortName(name) {
  const [first, last] = String(name).split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
}

export class ClinicScene {
  constructor(container, { onSelect = () => {}, onModelInfo = () => {} } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.onModelInfo = onModelInfo;
    this.floorMode = 'all';
    this.roleFilter = null;
    this.selectedId = null;
    this.people = new Map();
    this.floorGroups = new Map();
    this.layout = null;
    this.flight = null;
    this.disposed = false;
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };

    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(dark ? 0x10161d : 0xeef2f6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'label-layer';
    container.appendChild(this.labels.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera.position.set(30, 38, 42);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 220;
    this.controls.addEventListener('start', () => { this.flight = null; });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(20, 40, 25);
    this.scene.add(sun);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.peopleRoot = new THREE.Group();
    this.scene.add(this.peopleRoot);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.#bindPointer();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.#frame(Math.min(this.clock.getDelta(), 0.1));
    };
    loop();
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    // Panellar egallamagan qismning markazi ekran markazi bo'ladi.
    const { left, right, top, bottom } = this.insets;
    const ox = (left - right) / 2;
    const oy = (bottom - top) / 2;
    if (ox || oy) this.camera.setViewOffset(w, h, -ox, oy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // Ekranning panellar bilan yopilgan qismlari (pikselda).
  setInsets(insets) {
    const next = { left: 0, right: 0, top: 0, bottom: 0, ...insets };
    const same = Object.keys(next).every((k) => Math.round(next[k]) === Math.round(this.insets[k]));
    if (same) return;
    this.insets = next;
    this.resize();
  }

  #computeOffsets() {
    let depth = 0;
    for (const f of this.config.floors) {
      const b = this.layout.floors[f]?.bounds;
      if (b) depth = Math.max(depth, b.maxZ - b.minZ);
    }
    this.floorShift = depth + FLOOR_GAP_Z;
  }

  floorOffset(f) {
    const i = f - this.minFloor;
    return V(0, i * FLOOR_RISE, -i * this.floorShift);
  }

  // Klinika tuzilishi keldi: binoni quradi, keyin 3ds Max modellarini fonda yuklaydi.
  setConfig(config) {
    this.config = config;
    this.roomById = new Map(config.rooms.map((r) => [r.id, r]));
    this.staffById = new Map(config.staff.map((s) => [s.id, s]));
    this.minFloor = Math.min(...config.floors);
    this.layout = { floors: structuredClone(config.layout.floors) };
    this.#computeOffsets();
    for (const f of config.floors) this.#setFloorGroup(f, buildAutoFloor(this.layout.floors[f], f, this.roomById));
    for (const s of config.staff) this.#createPerson(s);
    this.#applyVisibility();
    this.frameAll(false);
    this.#loadModels(config.models || {});
  }

  #setFloorGroup(f, group) {
    const old = this.floorGroups.get(f);
    if (old) {
      this.world.remove(old);
      old.traverse((o) => {
        if (o.isCSS2DObject) o.element.remove();
        o.geometry?.dispose?.();
      });
    }
    group.position.copy(this.floorOffset(f));
    this.world.add(group);
    this.floorGroups.set(f, group);
  }

  async #loadModels(models) {
    const entries = Object.entries(models).filter(([f]) => this.config.floors.includes(Number(f)));
    if (!entries.length) {
      this.onModelInfo({ source: 'auto', floors: [] });
      return;
    }
    const loader = new GLTFLoader();
    const infos = [];
    for (const [fs, url] of entries) {
      const f = Number(fs);
      try {
        const res = await loadModelFloor(loader, url, f, { rooms: this.config.rooms, roomById: this.roomById }, {
          scale: this.config.modelScale,
        });
        if (this.disposed) return;
        this.layout.floors[f] = res.layout;
        this.#setFloorGroup(f, res.group);
        infos.push({ ...res.info, ok: true });
      } catch (err) {
        infos.push({ floor: f, ok: false, error: String(err?.message || err) });
      }
    }
    // Model o'lchamlari boshqacha bo'lishi mumkin: qavatlar oralig'ini qayta hisoblaymiz.
    this.#computeOffsets();
    for (const [f, g] of this.floorGroups) g.position.copy(this.floorOffset(f));
    for (const p of this.people.values()) {
      p.pos = null;
      p.path = [];
      p.needsReplan = true;
    }
    if (this.lastSnapshot) this.update(this.lastSnapshot);
    this.#applyVisibility();
    if (this.floorMode === 'all') this.frameAll(true);
    else this.frameFloor(this.floorMode, true);
    this.onModelInfo({ source: 'model', floors: infos });
  }

  #createPerson(staff) {
    const role = this.config.roles[staff.role];
    const color = new THREE.Color(role?.color || '#7a8594');
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, transparent: true });
    const headMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7, transparent: true });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.62, 4, 12), bodyMat);
    body.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), headMat);
    head.position.y = 1.26;
    const ringMat = new THREE.MeshBasicMaterial({ color: STATUS_COLORS.turibdi, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.9;
    for (const m of [body, head, hit]) m.userData.staffId = staff.id;
    group.add(body, head, ring, hit);

    const el = document.createElement('div');
    el.className = 'person-label';
    el.innerHTML = `<span class="dot"></span><span class="nm"></span>`;
    el.querySelector('.nm').textContent = shortName(staff.name);
    el.style.setProperty('--role', role?.color || '#7a8594');
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelect(staff.id);
    });
    const label = new CSS2DObject(el);
    label.position.y = 1.75;
    group.add(label);

    group.visible = false;
    this.peopleRoot.add(group);
    const r = rng(hashString(staff.id));
    this.people.set(staff.id, {
      staff,
      group,
      body,
      head,
      ring,
      label,
      el,
      mats: [bodyMat, headMat],
      rand: r,
      slot: { u: r(), v: r() },
      state: null,
      path: [],
      pos: null,
      floor: null,
      wanderAt: 0,
      needsReplan: false,
      phase: r() * 10,
    });
  }

  // Xona ichidagi joy: har xodimning o'z doimiy joyi bor (ustma-ust tushmasligi uchun).
  #spot(p, floor, roomId, fresh = false) {
    const fl = this.layout.floors[floor];
    const r = fl?.rooms[roomId];
    if (!r) return this.#pt(floor, fl ? fl.corridor : { x: 0, z: 0 });
    const u = fresh ? p.rand() : p.slot.u;
    const v = fresh ? p.rand() : p.slot.v;
    const mx = Math.min(0.8, r.w * 0.25);
    const mz = Math.min(0.8, r.d * 0.25);
    return this.#pt(floor, { x: r.x - r.w / 2 + mx + u * (r.w - 2 * mx), z: r.z - r.d / 2 + mz + v * (r.d - 2 * mz) });
  }

  #pt(floor, p) {
    return this.floorOffset(floor).add(V(p.x, 0, p.z));
  }

  #targetFor(p, st) {
    if (st.private) {
      const pad = this.layout.floors[st.floor]?.privatePad;
      const a = p.rand() * Math.PI * 2;
      return pad ? this.#pt(st.floor, { x: pad.x + Math.cos(a) * 0.9, z: pad.z + Math.sin(a) * 0.9 }) : null;
    }
    return this.#spot(p, st.floor, st.room);
  }

  // Yangi joyga yo'l: xona eshigi -> koridor -> zinapoya -> kerakli qavat -> eshik -> xona.
  #plan(p, st) {
    const target = this.#targetFor(p, st);
    if (!target) return;
    if (!p.pos || !p.group.visible || p.floor == null) {
      p.pos = target.clone();
      p.path = [];
      p.floor = st.floor;
      return;
    }
    const pts = [];
    const fromFl = this.layout.floors[p.floor];
    const toFl = this.layout.floors[st.floor];
    const prev = p.state;
    if (fromFl && prev?.room && prev.room !== fromFl.corridorRoomId && !prev.private) {
      pts.push(this.#pt(p.floor, doorPoint(fromFl, prev.room)));
    }
    if (p.floor !== st.floor && fromFl && toFl) {
      pts.push(this.#pt(p.floor, fromFl.stairs), this.#pt(st.floor, toFl.stairs));
    }
    if (toFl && st.room && st.room !== toFl.corridorRoomId) pts.push(this.#pt(st.floor, doorPoint(toFl, st.room)));
    pts.push(target);
    p.path = pts;
    p.floor = st.floor;
  }

  // Serverdan (yoki namunadan) yangi holat keldi.
  update(snapshot) {
    if (!this.layout) return;
    this.lastSnapshot = snapshot;
    for (const st of snapshot.staff) {
      const p = this.people.get(st.id);
      if (!p) continue;
      const prev = p.state;
      const placeChanged = !prev || prev.present !== st.present || prev.room !== st.room
        || prev.floor !== st.floor || prev.private !== st.private;
      if (st.present && (placeChanged || p.needsReplan)) this.#plan(p, st);
      p.needsReplan = false;
      p.state = st;
      p.statusColor = STATUS_COLORS[st.status] || STATUS_COLORS.turibdi;
      p.ring.material.color.set(p.statusColor);
      const lost = st.status === 'signal_yoq';
      for (const m of p.mats) m.opacity = lost ? 0.35 : 1;
      p.el.classList.toggle('lost', lost);
      p.el.classList.toggle('idle', st.status === 'uzoq_harakatsiz');
      p.el.style.setProperty('--status', p.statusColor);
    }
    this.#applyVisibility();
  }

  setFloor(mode) {
    this.floorMode = mode;
    this.#applyVisibility();
    if (mode === 'all') this.frameAll(true);
    else this.frameFloor(mode, true);
  }

  setRoleFilter(roles) {
    this.roleFilter = roles && roles.size ? roles : null;
    this.#applyVisibility();
  }

  setSelected(id) {
    this.selectedId = id;
    for (const [pid, p] of this.people) {
      const sel = pid === id;
      p.group.scale.setScalar(sel ? 1.35 : 1);
      p.el.classList.toggle('selected', sel);
    }
    this.#applyVisibility();
  }

  #floorVisible(f) {
    return this.floorMode === 'all' || this.floorMode === f;
  }

  #applyVisibility() {
    for (const [f, g] of this.floorGroups) {
      g.visible = this.#floorVisible(f);
      g.traverse((o) => {
        if (o.isCSS2DObject) {
          o.element.style.display = g.visible ? '' : 'none';
          if (o.userData.roomLabel) o.element.classList.toggle('compact', this.floorMode === 'all');
        }
      });
    }
    for (const [id, p] of this.people) {
      const st = p.state;
      const roleOk = !this.roleFilter || this.roleFilter.has(p.staff.role) || id === this.selectedId;
      const show = Boolean(st?.present && p.pos && roleOk && this.#floorVisible(p.floor));
      p.group.visible = show;
      p.el.style.display = show ? '' : 'none';
    }
  }

  #frame(dt) {
    const t = performance.now() / 1000;
    for (const p of this.people.values()) {
      if (!p.group.visible || !p.pos) continue;
      const st = p.state;
      // Xonada yurib turgan xodim xona ichida u yoqdan bu yoqqa yuradi.
      if (!p.path.length && st?.moving && st.room && !st.private && t > p.wanderAt) {
        p.path = [this.#spot(p, st.floor, st.room, true)];
        p.wanderAt = t + 2 + p.rand() * 4;
      }
      if (p.path.length) {
        let remaining = 0;
        let prev = p.pos;
        for (const q of p.path) {
          remaining += prev.distanceTo(q);
          prev = q;
        }
        const speed = Math.max(1.6, remaining / 2.5);
        let step = speed * dt;
        while (step > 0 && p.path.length) {
          const next = p.path[0];
          const d = p.pos.distanceTo(next);
          if (d <= step) {
            p.pos.copy(next);
            p.path.shift();
            step -= d;
          } else {
            const dir = next.clone().sub(p.pos).normalize();
            p.pos.addScaledVector(dir, step);
            if (Math.abs(dir.x) + Math.abs(dir.z) > 0.01) p.group.rotation.y = Math.atan2(dir.x, dir.z);
            step = 0;
          }
        }
      }
      const walking = p.path.length > 0;
      p.group.position.copy(p.pos);
      p.body.position.y = 0.6 + (walking ? Math.abs(Math.sin(t * 9 + p.phase)) * 0.08 : 0);
      if (st?.status === 'uzoq_harakatsiz') {
        const s = 1 + 0.25 * (0.5 + 0.5 * Math.sin(t * 4));
        p.ring.scale.set(s, s, s);
      } else p.ring.scale.set(1, 1, 1);
    }
    this.#fly();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  #fly() {
    const f = this.flight;
    if (!f) return;
    const k = Math.min(1, (performance.now() - f.start) / f.duration);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    this.controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    this.camera.position.lerpVectors(f.fromPos, f.toPos, e);
    if (k >= 1) this.flight = null;
  }

  flyTo(target, distance, animate = true, direction = V(0.55, 0.85, 0.75)) {
    const toPos = target.clone().addScaledVector(direction.clone().normalize(), distance);
    if (!animate) {
      this.controls.target.copy(target);
      this.camera.position.copy(toPos);
      this.flight = null;
      return;
    }
    this.flight = {
      start: performance.now(),
      duration: 900,
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      fromPos: this.camera.position.clone(),
      toPos,
    };
  }

  #floorBox(f) {
    const fl = this.layout.floors[f];
    const b = fl?.bounds;
    if (!b) return null;
    const o = this.floorOffset(f);
    const maxX = Math.max(b.maxX, (fl.privatePad?.x ?? b.maxX) + 1.5);
    return new THREE.Box3(V(b.minX - 3, 0, b.minZ).add(o), V(maxX, 2, b.maxZ).add(o));
  }

  // Kamera shu masofada tursa, quti to'liq ekranga sig'adi.
  #fitDistance(box, direction) {
    const center = box.getCenter(new THREE.Vector3());
    const dir = direction.clone().normalize();
    const up = V(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();
    const camUp = new THREE.Vector3().crossVectors(dir, right).normalize();
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const freeW = Math.max(120, w - this.insets.left - this.insets.right);
    const freeH = Math.max(120, h - this.insets.top - this.insets.bottom);
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360) * (freeH / h);
    const tanH = tanV * (freeW / freeH);
    let dist = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = V(x, y, z).sub(center);
      const depth = p.dot(dir);
      dist = Math.max(dist, Math.abs(p.dot(right)) / tanH + depth, Math.abs(p.dot(camUp)) / tanV + depth);
    }
    return dist * 1.06;
  }

  frameAll(animate = true) {
    const box = new THREE.Box3();
    for (const f of this.config.floors) {
      const b = this.#floorBox(f);
      if (b) box.union(b);
    }
    if (box.isEmpty()) return;
    const dir = V(0.25, 0.75, 1);
    this.flyTo(box.getCenter(new THREE.Vector3()), this.#fitDistance(box, dir), animate, dir);
  }

  frameFloor(f, animate = true) {
    const box = this.#floorBox(f);
    if (!box) return;
    const dir = V(0.2, 1.1, 0.8);
    this.flyTo(box.getCenter(new THREE.Vector3()), this.#fitDistance(box, dir), animate, dir);
  }

  // Qidiruvda topilgan xodim tomon kamera uchib boradi.
  focusStaff(id) {
    const p = this.people.get(id);
    if (!p?.state?.present || !p.pos) return false;
    // Xodimning qavati ochiladi (xona nomlari ko'rinadi) va kamera uning oldiga uchadi.
    if (this.floorMode !== p.floor) {
      this.floorMode = p.floor;
      this.#applyVisibility();
    }
    const dest = p.path.length ? p.path[p.path.length - 1] : p.pos;
    this.flyTo(dest.clone(), 20, true, V(0.2, 1, 0.9));
    return p.floor;
  }

  #bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const targets = [];
      for (const p of this.people.values()) if (p.group.visible) targets.push(p.group);
      const hit = this.raycaster.intersectObjects(targets, true).find((h) => h.object.userData.staffId);
      this.onSelect(hit ? hit.object.userData.staffId : null);
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
