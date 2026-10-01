# Architecture

Reusable isometric 3D scene builder (digital-twin editor). The clinic is the first project; the engine must not know about clinics.

## 1. Layers and boundaries

```
┌──────────────────────────────────────────────────────────────┐
│ UI shell (React DOM)  TopBar · BuildToolbar · Inspector · Hint │  reads/writes store only
├──────────────────────────────────────────────────────────────┤
│ Editor core (pure TS, no React, no three)                     │
│   store (Zustand) · commands/history · tools state · persist │
├──────────────────────────────────────────────────────────────┤
│ Scene renderer (R3F)                                          │  reads store, emits intents
│   camera · environment · entities · selection · placement    │
├──────────────────────────────────────────────────────────────┤
│ packages/scene-schema (pure TS)                               │  types · validate · migrate
└──────────────────────────────────────────────────────────────┘
          (Phase 4) apps/server — Fastify, providers, storage
```

Rules:
- The **scene document is the single source of truth**. Three.js objects are derived from it; nothing is read back from three into the document except the final transform at the end of a gizmo drag.
- UI components never touch three objects. The renderer never imports UI components.
- Business data (floors, rooms, staff, sensors) lives in `entity.metadata` or future layers keyed by entity id. The engine ignores unknown metadata.
- No React state updates inside `useFrame`. Per-frame motion uses refs.

## 2. Folder structure

```
apps/web/                 the editor (React 19 + TS strict + Vite + R3F)
  src/
    app/                  App, ErrorBoundary, bootstrap
    components/           DOM UI: TopBar, BuildToolbar, Inspector, Hint, Toast, PerfPanel
    editor/               pure TS: commands.ts, history.ts, store.ts, persist.ts, ids.ts, snap.ts, collide.ts
    scene/
      camera/             CameraRig (OrbitControls/MapControls wrapper, limits, reset)
      environment/        Ground, Lights, Grid, palette
      entities/           EntityView + per-type renderers (building, road, tree, prop)
      selection/          SelectionOutline, TransformGizmo
      placement/          PlacementGhost, RoadTool, FootprintTool
    lib/                  rng, math, catalog (asset definitions)
    styles/
  tests/
    unit/                 Vitest
    e2e/                  Playwright scripts (playwright-core + local chromium)
packages/
  scene-schema/           SceneDocument types, validate(), migrate(), createEmpty(), sample scene
apps/server/              (Phase 4) Fastify + TS: projects, assets, image-to-3D jobs
```

The old clinic app at the repo root (`web/`, `server/`, `shared/`) is left untouched and keeps its own `package.json`. See DECISIONS D-1.

## 3. Data model (`packages/scene-schema`)

```ts
type Vec3 = [number, number, number]
type EntityType = 'building' | 'road' | 'vehicle' | 'tree' | 'prop' | 'character'

interface SceneEntity {
  id: string                 // unique, never reused (ids.ts: prefix + counter + random)
  type: EntityType
  assetId?: string           // catalog id ('prim:box', 'glb:minora', …)
  position: Vec3             // metres, Y-up, ground = 0
  rotation: Vec3             // radians (Euler XYZ); editor rotates around Y only in Phase 1
  scale: Vec3                // each component clamped to [0.05, 50]
  metadata?: Record<string, unknown>
}
// type-specific fields live in metadata, validated by the type's renderer:
//   building: { footprint:[w,d], floors:int>=1, storeyHeight:number, style:'brick'|'white'|'glass' }
//   road:     { start:[x,z], end:[x,z], width:number }
//   future:   { buildingId, floorId, roomId, … } — ignored by the engine

interface SceneDocument {
  schemaVersion: 1
  projectId: string
  name: string
  environment: { season: 'winter' | 'neutral'; timeOfDay: number }
  entities: SceneEntity[]
}
```

- `validate(doc)` → `{ ok, doc, errors }`; drops broken entities instead of failing the whole document (a broken asset must not blank the app).
- `migrate(raw)` upgrades older `schemaVersion`s step by step; unknown future versions are refused with a readable error.
- Serialization = `JSON.stringify(doc)`; numbers are rounded to 1e-4 on commit to avoid save/load drift.

## 4. Editor core

- **Store (Zustand)**: `{ doc, selectedId, tool, ghost, grid, snap, dirty, lastSavedAt }`. Selectors are narrow so the canvas does not rerender on UI-only changes.
- **Commands**: `add`, `remove`, `update(id, before, after)`, `batch`. Each has `do`/`undo` operating on the document immutably. Duplicate = `add` with a new id. Road edits and asset replacement are `update`.
- **History**: snapshot-based undo stack of commands, capped at 200. A gizmo drag mutates only the three object while dragging; on `mouseUp` one `update` command is committed (P0-6). New command clears the redo stack.
- **Tools**: `select` · `place:<assetId>` · `road` · `footprint`. `Esc` always returns to `select` and clears ghosts.
- **Persistence**: `localStorage` key `isoeditor:project:<projectId>`; explicit Save (Ctrl+S) and autosave debounce 800 ms after each committed command; also a `last-known-good` copy written only after a successful render. IndexedDB is introduced in Phase 3 when GLB blobs need storing.

## 5. Renderer

- `<Canvas>` with `frameloop="demand"` outside interactions (saves battery), `dpr={[1, 2]}` capped, shadows (PCFSoft, bias −0.0006, normalBias 0.05).
- **Camera**: perspective, FOV 28°, default elevation ≈ 35°, azimuth 45°. `MapControls`-style: left-drag pan, right-drag orbit, wheel/pinch zoom, damping. Limits: distance 15–400 m, polar angle 10°–80° (never below ground), target clamped to the world bounds. Controls are disabled while a gizmo drag or a tool drag is active (resolves the drag-vs-orbit conflict).
- **Picking**: R3F pointer events on entity groups. A click counts as a click only if the pointer moved < 5 px between down and up (otherwise it was a camera drag).
- **Selection highlight**: drei `<Outlines>`/back-face hull in accent orange plus a ground bounding rectangle. Original materials are never modified.
- **Ghost**: same geometry with a shared translucent orange (valid) / red (invalid) material.
- **Validity**: AABB overlap test on the XZ plane against other buildings/props (roads excluded in Phase 1).

## 6. Provider interfaces (Phase 4, server side only)

```ts
interface ImageTo3DProvider {
  id: 'tripo' | 'meshy' | 'mock'
  createTask(input: { images: Upload[]; mode: 'single' | 'multiview'; options?: object }): Promise<{ taskId: string }>
  getTask(taskId: string): Promise<{ status: JobStatus; progress: number; resultUrl?: string; error?: string }>
  cancelTask?(taskId: string): Promise<void>
}
type JobStatus = 'queued' | 'uploading' | 'generating' | 'processing' | 'optimizing' | 'ready' | 'failed' | 'cancelled'
```

API keys only in server `.env` (never in `apps/web`). The client talks to `/api/ai3d/*`. Fallback to another paid provider requires user confirmation. Manual GLB import is always available.

## 7. Extensibility

- New asset = one catalog entry (`lib/catalog.ts`): id, label, icon, type, default metadata, renderer (primitive now, GLB URL later).
- New entity type = schema union member + one renderer component.
- Digital-twin layers (floors/rooms/staff) attach through `metadata` ids and separate overlay components, not by changing the engine.
