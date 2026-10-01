# Acceptance Criteria

Status legend: `[x]` verified by an automated test or a recorded check, `[ ]` not yet.

## Gate 0
- [x] `apps/web`: `npm run typecheck`, `lint`, `test`, `build` exit 0.
- [x] App loads with zero console errors (Playwright).

## Gate 1 — P0 interactions (see REFERENCE_ANALYSIS §3)
| ID | Criterion | Test |
|---|---|---|
| P0-1 | Wheel zoom stays within 15–600 m; polar angle ≤ 80°; Reset restores the default camera | unit (limits) + e2e |
| P0-2 | Road tool: two clicks add one road with snapped endpoints; Esc mid-way adds nothing | e2e |
| P0-3 | Footprint drag creates a building with the dragged (snapped) size | e2e |
| P0-4 | Placing an asset adds exactly one entity at the snapped cursor point; overlap is refused; R rotates 90° | unit (collide) + e2e |
| P0-5 | Click selects (id in store, inspector shows it); click on empty ground deselects; drag ≥ 5 px does not select | e2e |
| P0-6 | Move via inspector/arrow keys/gizmo changes position; one drag = one undo step | unit (history) + e2e |
| P0-7 | Duplicate gets a new unique id; Delete removes only the selected entity | unit + e2e |
| P0-8 | Undo/redo restore exact transforms (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) | unit + e2e |
| P0-9 | After reload the scene equals the saved one (same ids and transforms) | e2e |
| P0-10 | Changing floors changes building height = floors × storey height | unit + e2e |
- [x] Screenshots at 1440×900 and 390×844 produced and reviewed.
- [x] No uncaught errors during the e2e run.

Gate 1 result: 23 unit tests (`tests/unit`) and 15 e2e tests (`tests/e2e/run.mjs`) pass; every P0 row above is covered by them.

## Gate 2 — Reference world
- [ ] Screenshot side-by-side with images 2 and 6: white ground, red/white buildings, dark roads, soft shadows from upper-left.
- [ ] All supplied GLBs stand on the ground (min Y = 0 ± 0.05 m), correct orientation, plausible size.
- [ ] Roads and buildings do not intersect; no z-fighting at road junctions.

## Final checklist (master prompt §38)
### Video fidelity
- [ ] camera feel close to the video · [ ] placement flow · [ ] selection/highlight · [ ] UI behaviour · [ ] no jerky transitions
### Visual world
- [ ] miniature/isometric spirit · [ ] one palette family · [ ] clinic can be the focal asset · [ ] roads/buildings don't intersect · [ ] parking not on roads · [ ] props touch the ground · [ ] consistent shadow direction
### Editor
- [x] add · [x] select · [x] move · [x] rotate · [x] scale · [x] duplicate · [x] delete · [x] undo/redo · [x] save/load · [x] autosave · [ ] GLB import (Phase 3)
### AI asset generation
- [ ] image upload · [ ] job status · [ ] generation · [ ] preview · [ ] GLB ingestion · [ ] failure/retry · [ ] manual import fallback
### Performance
- [ ] no React state updates in the frame loop · [ ] repeated props instanced · [ ] GLBs optimised · [ ] mobile quality adapts · [ ] no memory leak after repeated add/delete
### Reliability
- [ ] missing asset does not blank the app · [x] reload restores autosave · [ ] provider failure has a human-readable error · [ ] API key never in the client bundle
