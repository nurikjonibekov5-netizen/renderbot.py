// 3D sahna boshqaruvchisi. Uch xil ko'rinish:
//   'overview' - binoning tashqi ko'rinishi (hudud bilan), binoni bosib ichkariga kiriladi;
//   'floor'    - bitta qavatning ichki ko'rinishi, boshqa qavatlar yashiriladi;
//   'all'      - barcha qavatlar ichkaridan, bir-biridan ajratib ko'rsatiladi.
// Ko'rinishlar orasida kamera va qavatlar silliq animatsiya bilan o'tadi.
// React'ga bog'liq emas: BuildingScene.jsx uni yaratadi va ma'lumot uzatadi.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { doorPoint } from '../../../../shared/layout.js';
import { hashString, rng } from '../../../../shared/time.js';
import { PALETTE } from './palette.js';
import { V, easeInOut, setGroupOpacity, removeGroup } from './util.js';
import { buildSite } from './site.js';
import { buildExterior, highlightStorey, STOREY } from './exterior.js';
import { buildInteriorFloor } from './interior.js';
import { loadModelFloor } from './gltf.js';
import { createCharacter } from './characters.js';
import { buildHome, updateHome } from './dashboard.js';

const EXPLODE_GAP = 8.5;
// "Bosh sahifa" maydonchalari binodan old tomonda, alohida joyda turadi.
const HOME_Z = 95;
const FADE_SPEED = 5;

export class ClinicScene {
  constructor(container, handlers = {}) {
    this.container = container;
    this.h = { onSelect() {}, onViewChange() {}, onModelInfo() {}, onHoverFloor() {}, ...handlers };
    this.view = { mode: 'home', floor: null };
    this.homeVis = 0;
    this.homeTarget = 0;
    this.hoverHome = null;
    this.roleFilter = null;
    this.selectedId = null;
    this.people = new Map();
    this.floors = new Map();
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    this.flight = null;
    this.hoverFloor = null;
    this.exteriorVis = 1;
    this.disposed = false;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(PALETTE.fog, 90, 230);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'label-layer';
    container.appendChild(this.labels.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 900);
    this.camera.position.set(70, 60, 80);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 260;
    this.controls.addEventListener('start', () => { this.flight = null; });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6de, 1.15));
    const sun = new THREE.DirectionalLight(0xfff3e2, 2.6);
    sun.position.set(-30, 60, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    const sc = sun.shadow.camera;
    sc.left = -60;
    sc.right = 60;
    sc.top = 60;
    sc.bottom = -60;
    sc.near = 1;
    sc.far = 200;
    this.sun = sun;
    this.scene.add(sun, sun.target);

    this.world = new THREE.Group();
    this.scene.add(this.world);

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
      this.#frame(Math.min(this.clock.getDelta(), 0.25));
    };
    loop();
  }

  // ------------------------------------------------------------------ o'lchamlar
  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    const { left, right, top, bottom } = this.insets;
    const ox = (left - right) / 2;
    const oy = (bottom - top) / 2;
    if (ox || oy) this.camera.setViewOffset(w, h, -ox, oy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // Panellar egallagan joy: kamera bo'sh qism markaziga qaraydi.
  setInsets(insets) {
    const next = { left: 0, right: 0, top: 0, bottom: 0, ...insets };
    if (Object.keys(next).every((k) => Math.round(next[k]) === Math.round(this.insets[k]))) return;
    this.insets = next;
    this.resize();
  }

  // ------------------------------------------------------------------ qurish
  setConfig(config) {
    this.config = config;
    this.roomById = new Map(config.rooms.map((r) => [r.id, r]));
    this.floorList = [...config.floors].sort((a, b) => a - b);
    this.minFloor = this.floorList[0];
    this.layout = structuredClone(config.layout.floors);

    const all = this.#allBounds();
    this.site = buildSite(all);
    this.world.add(this.site);
    this.siteVis = 1;
    this.#buildExterior();

    for (const f of this.floorList) {
      const group = buildInteriorFloor(this.layout[f], f, this.roomById);
      const state = { f, group, vis: 0, visTarget: 0, y: this.#naturalY(f), yTarget: this.#naturalY(f), source: 'auto' };
      group.position.y = state.y;
      setGroupOpacity(group, 0);
      this.world.add(group);
      this.floors.set(f, state);
    }
    for (const s of config.staff) this.#createPerson(s);
    this.home = buildHome(config);
    this.home.group.position.z = HOME_Z;
    this.world.add(this.home.group);
    for (const p of this.home.platforms.values()) {
      for (const el of [p.tagEl, p.statsEl]) {
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setView('floor', p.f);
        });
        el.addEventListener('pointerenter', () => this.#hoverPlatform(p.f));
        el.addEventListener('pointerleave', () => this.#hoverPlatform(null));
      }
    }
    this.setView('home', null, { animate: false });
    this.#loadModels(config.models || {});
  }

  #allBounds() {
    const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const f of this.floorList) {
      const x = this.layout[f].bounds;
      b.minX = Math.min(b.minX, x.minX);
      b.maxX = Math.max(b.maxX, x.maxX);
      b.minZ = Math.min(b.minZ, x.minZ);
      b.maxZ = Math.max(b.maxZ, x.maxZ);
    }
    return b;
  }

  #buildExterior() {
    if (this.exterior) removeGroup(this.exterior.group);
    const all = this.#allBounds();
    this.exterior = buildExterior({ bounds: all, floors: this.floorList, stairs: this.layout[this.minFloor]?.stairs });
    this.world.add(this.exterior.group);
    for (const chip of this.exterior.chips.values()) {
      chip.element.addEventListener('pointerdown', (e) => e.stopPropagation());
      chip.element.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setView('floor', chip.userData.floor);
      });
    }
    setGroupOpacity(this.exterior.group, this.exteriorVis);
    this.exterior.applied = this.exteriorVis;
    this.#updateChips();
  }

  #naturalY(f) {
    return (f - this.minFloor) * STOREY + 0.35;
  }

  async #loadModels(models) {
    const entries = Object.entries(models).filter(([f]) => this.floors.has(Number(f)));
    if (!entries.length) {
      this.h.onModelInfo({ source: 'auto', floors: [] });
      return;
    }
    const loader = new GLTFLoader();
    const infos = [];
    for (const [fs, url] of entries) {
      const f = Number(fs);
      try {
        const res = await loadModelFloor(loader, url, f, { rooms: this.config.rooms, roomById: this.roomById }, { scale: this.config.modelScale });
        if (this.disposed) return;
        const st = this.floors.get(f);
        removeGroup(st.group);
        st.group = res.group;
        st.group.position.y = st.y;
        st.source = 'model';
        setGroupOpacity(st.group, st.vis);
        st.applied = st.vis;
        this.world.add(st.group);
        this.layout[f] = res.layout;
        infos.push({ ...res.info, ok: true });
      } catch (err) {
        infos.push({ floor: f, ok: false, error: String(err?.message || err) });
      }
    }
    // Model o'lchamlari boshqacha bo'lishi mumkin: tashqi ko'rinish va odamchalar qayta joylanadi.
    this.#buildExterior();
    for (const p of this.people.values()) {
      p.cur = null;
      p.path = [];
    }
    if (this.lastSnapshot) this.update(this.lastSnapshot);
    this.setView(this.view.mode, this.view.floor);
    this.h.onModelInfo({ source: 'model', floors: infos });
  }

  // ------------------------------------------------------------------ odamchalar
  #createPerson(staff) {
    const color = this.config.roles[staff.role]?.color || '#7a8594';
    const seed = hashString(staff.id);
    const ch = createCharacter(staff, color, seed);
    ch.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    ch.el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.h.onSelect(staff.id);
    });
    ch.root.visible = false;
    this.world.add(ch.root);
    const r = rng(seed);
    this.people.set(staff.id, { staff, ch, rand: r, slot: { u: r(), v: r() }, phase: r() * 10, state: null, cur: null, path: [], wanderAt: 0 });
  }

  // Xona ichidagi joy (qavat koordinatasida). Har xodimning o'z doimiy joyi bor.
  #spot(p, f, roomId, fresh = false) {
    const fl = this.layout[f];
    const r = fl?.rooms[roomId];
    if (!r) return { f, x: fl?.corridor.x ?? 0, z: fl?.corridor.z ?? 0 };
    const u = fresh ? p.rand() : p.slot.u;
    const v = fresh ? p.rand() : p.slot.v;
    const mx = Math.min(0.9, r.w * 0.25);
    const mz = Math.min(0.9, r.d * 0.25);
    return { f, x: r.x - r.w / 2 + mx + u * (r.w - 2 * mx), z: r.z - r.d / 2 + mz + v * (r.d - 2 * mz) };
  }

  #target(p, st) {
    if (st.private) {
      const pad = this.layout[st.floor]?.privatePad;
      if (!pad) return null;
      const a = p.rand() * Math.PI * 2;
      return { f: st.floor, x: pad.x + Math.cos(a) * 0.6, z: pad.z + Math.sin(a) * 0.6 };
    }
    return this.#spot(p, st.floor, st.room);
  }

  // Yo'l: xona eshigi -> koridor -> zinapoya -> boshqa qavat -> eshik -> xona.
  #plan(p, st) {
    const target = this.#target(p, st);
    if (!target) return;
    if (!p.cur || !p.state?.present) {
      p.cur = { ...target };
      p.path = [];
      return;
    }
    const pts = [];
    const from = this.layout[p.cur.f];
    const to = this.layout[st.floor];
    const prev = p.state;
    if (from && prev?.room && prev.room !== from.corridorRoomId && !prev.private) pts.push({ f: p.cur.f, ...doorPoint(from, prev.room) });
    if (p.cur.f !== st.floor && from && to) pts.push({ f: p.cur.f, ...from.stairs }, { f: st.floor, ...to.stairs });
    if (to && st.room && st.room !== to.corridorRoomId) pts.push({ f: st.floor, ...doorPoint(to, st.room) });
    pts.push(target);
    p.path = pts;
  }

  update(snapshot) {
    if (!this.layout) return;
    this.lastSnapshot = snapshot;
    for (const st of snapshot.staff) {
      const p = this.people.get(st.id);
      if (!p) continue;
      const prev = p.state;
      const moved = !prev || prev.present !== st.present || prev.room !== st.room || prev.floor !== st.floor || prev.private !== st.private;
      if (st.present && (moved || !p.cur)) this.#plan(p, st);
      p.state = st;
      p.ch.setStatus(st.status);
    }
    this.#updateChips();
    this.#updateHome();
  }

  #updateHome() {
    if (!this.home || !this.lastSnapshot) return;
    const staffById = new Map([...this.people.values()].map((p) => [p.staff.id, p.staff]));
    const rebuilt = updateHome(this.home, { snapshot: this.lastSnapshot, staffById, roles: this.config.roles, roleFilter: this.roleFilter });
    if (rebuilt) {
      this.home.group.userData.fadeList = null;
      setGroupOpacity(this.home.group, this.homeVis);
      this.homeApplied = this.homeVis;
    }
  }

  #hoverPlatform(f) {
    if (this.hoverHome === f) return;
    this.hoverHome = f;
    for (const p of this.home.platforms.values()) {
      p.liftTarget = p.f === f ? 0.45 : 0;
      p.slab.material.emissiveIntensity = p.f === f ? 0.06 : 0;
      p.tagEl.classList.toggle('hover', p.f === f);
    }
    this.h.onHoverFloor(f);
  }

  #updateChips() {
    if (!this.exterior || !this.lastSnapshot) return;
    const counts = new Map();
    for (const st of this.lastSnapshot.staff) {
      if (!st.present) continue;
      const role = this.people.get(st.id)?.staff.role;
      if (this.roleFilter && !this.roleFilter.has(role)) continue;
      counts.set(st.floor, (counts.get(st.floor) || 0) + 1);
    }
    for (const [f, chip] of this.exterior.chips) {
      chip.element.innerHTML = `<b>${f}F</b><span>${counts.get(f) || 0} kishi</span>`;
    }
  }

  // ------------------------------------------------------------------ ko'rinishlar
  setView(mode, floor = null, { animate = true } = {}) {
    if (mode === 'floor' && !this.floors.has(floor)) mode = 'home';
    this.view = { mode, floor: mode === 'floor' ? floor : null };
    for (const [f, st] of this.floors) {
      st.visTarget = mode === 'all' || (mode === 'floor' && f === floor) ? 1 : 0;
      const i = f - this.minFloor;
      st.yTarget = mode === 'all' ? i * EXPLODE_GAP + 0.35 : this.#naturalY(f);
    }
    this.exteriorTarget = mode === 'overview' ? 1 : 0;
    this.siteTarget = mode === 'overview' ? 1 : mode === 'home' ? 0 : 0.14;
    this.homeTarget = mode === 'home' ? 1 : 0;
    if (mode !== 'home' && this.home) this.#hoverPlatform(null);
    if (!animate) {
      for (const st of this.floors.values()) {
        st.vis = st.visTarget;
        st.y = st.yTarget;
        st.group.position.y = st.y;
        setGroupOpacity(st.group, st.vis);
        st.applied = st.vis;
      }
      this.exteriorVis = this.exteriorTarget;
      setGroupOpacity(this.exterior.group, this.exteriorVis);
      this.exterior.applied = this.exteriorVis;
      this.siteVis = this.siteTarget;
      setGroupOpacity(this.site, this.siteVis);
      this.homeVis = this.homeTarget;
      setGroupOpacity(this.home.group, this.homeVis);
      this.homeApplied = this.homeVis;
    }
    highlightStorey(this.exterior.bands, null);
    this.#frameView(animate);
    this.h.onViewChange({ ...this.view });
  }

  #frameView(animate) {
    const { mode, floor } = this.view;
    if (mode === 'home') {
      const box = this.home.bounds.clone().translate(this.home.group.position);
      this.#fly(box, V(0.38, 0.62, 1), animate, 0.98);
    } else if (mode === 'overview') {
      const box = this.exterior.box.clone();
      box.expandByVector(V(10, 0, 10));
      this.#fly(box, V(1, 0.78, 1.15), animate, 0.95);
    } else if (mode === 'floor') {
      const st = this.floors.get(floor);
      this.#fly(this.#floorBox(floor, st.yTarget), V(0.95, 1.25, 1.2), animate, 0.9);
    } else {
      const box = new THREE.Box3();
      for (const [f, st] of this.floors) box.union(this.#floorBox(f, st.yTarget));
      this.#fly(box, V(1, 0.62, 1.25), animate, 0.95);
    }
  }

  #floorBox(f, y) {
    const b = this.layout[f].bounds;
    const pad = this.layout[f].privatePad;
    return new THREE.Box3(V(b.minX - 2.5, y - 0.4, b.minZ - 0.6), V(Math.max(b.maxX, (pad?.x ?? b.maxX) + 1.3), y + 2.6, b.maxZ + 0.6));
  }

  // Kamera shu masofada tursa, quti panellar egallamagan qismga to'liq sig'adi.
  #fitDistance(box, dir) {
    const center = box.getCenter(new THREE.Vector3());
    const d = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(V(0, 1, 0), d).normalize();
    const up = new THREE.Vector3().crossVectors(d, right).normalize();
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const freeW = Math.max(160, w - this.insets.left - this.insets.right);
    const freeH = Math.max(160, h - this.insets.top - this.insets.bottom);
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360) * (freeH / h);
    const tanH = tanV * (freeW / freeH);
    let dist = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = V(x, y, z).sub(center);
      const depth = p.dot(d);
      dist = Math.max(dist, Math.abs(p.dot(right)) / tanH + depth, Math.abs(p.dot(up)) / tanV + depth);
    }
    return dist;
  }

  #fly(box, dir, animate, k = 1) {
    const target = box.getCenter(new THREE.Vector3());
    const dist = this.#fitDistance(box, dir) * k;
    this.flyTo(target, dir.clone().normalize().multiplyScalar(dist).add(target), animate);
  }

  flyTo(target, position, animate = true, duration = 1300) {
    if (!animate) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.flight = null;
      return;
    }
    this.flight = {
      start: performance.now(),
      duration,
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      fromPos: this.camera.position.clone(),
      toPos: position.clone(),
    };
  }

  setRoleFilter(roles) {
    this.roleFilter = roles && roles.size ? roles : null;
    this.#updateChips();
    this.#updateHome();
  }

  setSelected(id) {
    this.selectedId = id;
    for (const [pid, p] of this.people) p.ch.setSelected(pid === id);
  }

  // Xodimni topish: uning qavati ochiladi va kamera odamcha oldiga uchib boradi.
  focusStaff(id) {
    const p = this.people.get(id);
    if (!p?.state?.present || !p.cur) return null;
    const f = p.state.floor;
    if (this.view.mode !== 'floor' || this.view.floor !== f) {
      this.view = { mode: 'floor', floor: f };
      for (const [ff, st] of this.floors) {
        st.visTarget = ff === f ? 1 : 0;
        st.yTarget = this.#naturalY(ff);
      }
      this.exteriorTarget = 0;
      this.siteTarget = 0.14;
      this.homeTarget = 0;
      this.h.onViewChange({ ...this.view });
    }
    const dest = p.path.length ? p.path[p.path.length - 1] : p.cur;
    const target = V(dest.x, this.floors.get(f).yTarget + 0.8, dest.z);
    this.flyTo(target, V(0.85, 1.15, 1.25).normalize().multiplyScalar(22).add(target), true);
    return f;
  }

  // ------------------------------------------------------------------ har kadr
  #frame(dt) {
    const t = performance.now() / 1000;
    const a = Math.min(1, dt * FADE_SPEED);
    for (const st of this.floors.values()) {
      const vis = st.vis + (st.visTarget - st.vis) * a;
      st.vis = Math.abs(vis - st.visTarget) < 0.004 ? st.visTarget : vis;
      const y = st.y + (st.yTarget - st.y) * a;
      st.y = Math.abs(y - st.yTarget) < 0.002 ? st.yTarget : y;
      st.group.position.y = st.y;
      if (st.applied !== st.vis) {
        setGroupOpacity(st.group, st.vis);
        st.applied = st.vis;
      }
      st.group.traverse((o) => {
        if (!o.isCSS2DObject) return;
        o.userData.hidden = (o.userData.roomLabel && this.view.mode === 'all') || (o.userData.floorTitle && this.view.mode !== 'all');
        o.visible = st.vis >= 0.5 && !o.userData.hidden;
      });
    }
    if (this.exterior) {
      const ev = this.exteriorVis + (this.exteriorTarget - this.exteriorVis) * a;
      this.exteriorVis = Math.abs(ev - this.exteriorTarget) < 0.004 ? this.exteriorTarget : ev;
      if (this.exterior.applied !== this.exteriorVis) {
        setGroupOpacity(this.exterior.group, this.exteriorVis);
        this.exterior.applied = this.exteriorVis;
      }
    }
    if (this.home) {
      const hv = this.homeVis + (this.homeTarget - this.homeVis) * a;
      this.homeVis = Math.abs(hv - this.homeTarget) < 0.004 ? this.homeTarget : hv;
      if (this.homeApplied !== this.homeVis) {
        setGroupOpacity(this.home.group, this.homeVis);
        this.homeApplied = this.homeVis;
      }
      for (const p of this.home.platforms.values()) {
        p.liftY += (p.liftTarget - p.liftY) * Math.min(1, dt * 10);
        p.lift.position.y = p.liftY;
        p.people.children.forEach((c, i) => {
          c.children[0].position.y = Math.abs(Math.sin(performance.now() / 600 + i * 1.3)) * 0.04;
        });
      }
    }
    if (this.site && this.siteTarget != null) {
      const sv = this.siteVis + (this.siteTarget - this.siteVis) * a;
      this.siteVis = Math.abs(sv - this.siteTarget) < 0.004 ? this.siteTarget : sv;
      if (this.siteApplied !== this.siteVis) {
        setGroupOpacity(this.site, this.siteVis);
        this.siteApplied = this.siteVis;
        // Xiralashgan atrof soya tashlamaydi (diqqat qavatda bo'lsin).
        const cast = this.siteVis > 0.6;
        if (this.siteCasts !== cast) {
          this.siteCasts = cast;
          this.site.traverse((o) => { if (o.isMesh) o.castShadow = cast && o.userData.cast !== false; });
        }
      }
    }
    this.#animatePeople(dt, t);
    this.#animateCamera();
    this.controls.update();
    this.sun.target.position.copy(this.controls.target);
    this.sun.position.copy(this.controls.target).add(V(-30, 60, 40));
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  #animatePeople(dt, t) {
    for (const [id, p] of this.people) {
      const st = p.state;
      const floorState = p.cur ? this.floors.get(p.cur.f) : null;
      const roleOk = !this.roleFilter || this.roleFilter.has(p.staff.role) || id === this.selectedId;
      const show = Boolean(st?.present && p.cur && floorState && floorState.vis > 0.6 && roleOk);
      p.ch.root.visible = show;
      p.ch.tag.visible = show;
      if (!st?.present || !p.cur) continue;
      if (!p.path.length && st.moving && st.room && !st.private && t > p.wanderAt) {
        p.path = [this.#spot(p, st.floor, st.room, true)];
        p.wanderAt = t + 2 + p.rand() * 4;
      }
      let walking = false;
      if (p.path.length) {
        let remaining = 0;
        let prev = p.cur;
        for (const q of p.path) {
          remaining += q.f === prev.f ? Math.hypot(q.x - prev.x, q.z - prev.z) : 0;
          prev = q;
        }
        let step = Math.max(1.5, remaining / 3) * dt;
        while (step > 0 && p.path.length) {
          const next = p.path[0];
          if (next.f !== p.cur.f) {
            p.cur = { ...next };
            p.path.shift();
            continue;
          }
          const dx = next.x - p.cur.x;
          const dz = next.z - p.cur.z;
          const d = Math.hypot(dx, dz);
          if (d <= step) {
            p.cur = { ...next };
            p.path.shift();
            step -= d;
          } else {
            p.cur.x += (dx / d) * step;
            p.cur.z += (dz / d) * step;
            p.ch.root.rotation.y = Math.atan2(dx, dz);
            step = 0;
          }
          walking = true;
        }
      }
      const fs = this.floors.get(p.cur.f);
      p.ch.root.position.set(p.cur.x, fs ? fs.y : 0, p.cur.z);
      p.ch.animate(t, walking, p.phase);
    }
  }

  #animateCamera() {
    const f = this.flight;
    if (!f) return;
    const k = Math.min(1, (performance.now() - f.start) / f.duration);
    const e = easeInOut(k);
    this.controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    this.camera.position.lerpVectors(f.fromPos, f.toPos, e);
    // Uzoq o'tishlarda kamera biroz yuqoriga ko'tarilib o'tadi (yo'qolib qolmaslik uchun).
    this.camera.position.y += Math.sin(Math.PI * e) * Math.min(12, f.fromPos.distanceTo(f.toPos) * 0.08);
    if (k >= 1) this.flight = null;
  }

  // ------------------------------------------------------------------ sichqoncha
  #pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  #platformUnderPointer() {
    if (this.homeVis < 0.6) return null;
    const targets = [...this.home.platforms.values()].map((p) => p.lift);
    const hit = this.raycaster.intersectObjects(targets, true).find((h) => h.object.userData.homeFloor);
    return hit?.object.userData.homeFloor ?? null;
  }

  #storeyUnderPointer() {
    if (this.view.mode !== 'overview' || this.exteriorVis < 0.6) return null;
    const hits = this.raycaster.intersectObjects([...this.exterior.bands.values()], true);
    return hits.find((h) => h.object.userData.floor)?.object.userData.floor ?? null;
  }

  #bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointermove', (e) => {
      if (!this.exterior) return;
      this.#pick(e);
      if (this.view.mode === 'home') {
        const hf = this.#platformUnderPointer();
        el.style.cursor = hf ? 'pointer' : '';
        this.#hoverPlatform(hf);
        return;
      }
      const f = this.#storeyUnderPointer();
      let overPerson = false;
      if (this.view.mode !== 'overview') {
        const targets = [...this.people.values()].filter((p) => p.ch.root.visible).map((p) => p.ch.root);
        overPerson = this.raycaster.intersectObjects(targets, true).some((h) => h.object.userData.staffId);
      }
      el.style.cursor = f || overPerson ? 'pointer' : '';
      if (f !== this.hoverFloor) {
        this.hoverFloor = f;
        highlightStorey(this.exterior.bands, f);
        this.h.onHoverFloor(f);
      }
    });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      this.#pick(e);
      if (this.view.mode === 'home') {
        const hf = this.#platformUnderPointer();
        if (hf) this.setView('floor', hf);
        return;
      }
      if (this.view.mode === 'overview') {
        const f = this.#storeyUnderPointer();
        if (f) this.setView('floor', f);
        return;
      }
      const targets = [...this.people.values()].filter((p) => p.ch.root.visible).map((p) => p.ch.root);
      const hit = this.raycaster.intersectObjects(targets, true).find((h) => h.object.userData.staffId);
      if (hit) {
        this.h.onSelect(hit.object.userData.staffId);
        return;
      }
      // "Barchasi" ko'rinishida qavatni bossa, o'sha qavatga kiriladi.
      if (this.view.mode === 'all') {
        const groups = [...this.floors.values()].map((st) => st.group);
        const fh = this.raycaster.intersectObjects(groups, true)[0];
        if (fh) {
          let o = fh.object;
          while (o && !groups.includes(o)) o = o.parent;
          const st = [...this.floors.values()].find((x) => x.group === o);
          if (st) this.setView('floor', st.f);
        }
      }
    });
  }

  dispose() {
    this.disposed = true;
    removeGroup(this.world);
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
