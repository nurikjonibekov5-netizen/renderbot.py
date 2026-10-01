# Implementation Plan

Each phase ends with: `npm run typecheck && npm run lint && npm run test && npm run build` in `apps/web`, Playwright e2e + screenshots, a checkpoint commit, and a short Uzbek report to the user. A phase does not start before the previous gate passes.

## Phase 0 — Discovery / tooling
- Reference analysis (done: `REFERENCE_ANALYSIS.md`), environment check, version matrix (`DECISIONS.md`).
- Scaffold `apps/web` (React 19.3, TS 6.0.3 strict, Vite 8, R3F 9.8, drei 10.7, Zustand 5, Vitest 5, ESLint 10 flat) and `packages/scene-schema`.
- **Gate 0**: app starts clean (no console errors), typecheck/lint/test/build pass.

## Phase 1 — Video interaction skeleton (primitives)
1. Scene schema + sample scene (deterministic, seeded).
2. Store, commands, history, persistence (+ unit tests).
3. Canvas: ground, lights, grid, camera rig with limits and reset.
4. Entity renderers: box building (floors × storey height), road strip, cone/round tree, prop.
5. Selection: click (<5 px move), orange outline, inspector.
6. Placement: toolbar → ghost → valid/invalid → click; R rotates; Esc cancels.
7. Road tool (click start → orange preview → click end, snap to 2 m and existing endpoints).
8. Footprint tool (drag rectangle → building).
9. Transform gizmo (move/rotate/scale modes, W/E/T keys), arrow nudge, single undo per drag.
10. Duplicate (Ctrl+D), Delete, undo/redo, Save (Ctrl+S), autosave, reload restore, grid/snap toggle.
11. UI shell: top bar, bottom toolbar (video style), right inspector, first-run hint, toasts, ErrorBoundary, `?debug` perf panel.
- **Gate 1**: Playwright: select, place, move, delete, undo, reload/save; screenshots 1440×900 and 390×844.

## Phase 2 — Reference world
- Import the supplied GLBs (minora, texnik_bino, majmua, uch_qavatli) through a normalising loader (scale, pivot to footprint centre, ground contact, Y-up).
- Procedural clinic massing (white, 4 storeys, pilasters, rooftop HVAC) until a real model is provided.
- Snowy ground, roads with markings and crosswalks, trees, hedges, lamps, traffic lights; light + palette tuned to images 2/6.
- **Gate 2**: screenshots side-by-side with images 2 and 6.

## Phase 3 — Real editor
- Asset library panel with categories and search, GLB import (type/size validation, normalisation), IndexedDB blob storage, project list, scene JSON export/import, on-model floor handle, face highlight.
- **Gate 3**: a new scene can be assembled without code.

## Phase 4 — Image-to-3D
- `apps/server` (Fastify + TS): upload validation, job queue, provider adapters (Tripo primary, Meshy fallback with confirmation, mock when no key), GLB download validation, optimisation (glTF Transform).
- **Gate 4**: image → job → GLB → library → scene (mock flow without keys).

## Phase 5 — Roads / cars / people
- Lane graph from road segments, deterministic waypoint vehicles (instanced), simple pedestrians on sidewalks, parking.
- **Gate 5**: living scene at ≥ 50 FPS desktop.

## Phase 6 — Hardening
- LOD, instancing audit, KTX2/Draco/Meshopt, adaptive DPR/shadows, touch gestures, context-loss recovery, migrations, security review.
- **Gate 6**: full `ACCEPTANCE_CRITERIA.md` checklist.

## Hosting
The editor is built with `base: './'` into `/editor/` at the repo root so GitHub Pages serves it at `https://nurikjonibekov5-netizen.github.io/renderbot.py/editor/` next to the old demo.
