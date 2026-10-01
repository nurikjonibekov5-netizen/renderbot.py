# Video fidelity checklist (Gate 2 — A. Technical fidelity)

The video (`docs/referens/video_miniopolis.mp4`) was re-sampled at **4 fps** for the key moments
(8–12.5 s and 14.5–19 s) and at 1 fps for the whole clip. Only what is visible on screen is listed as
*observed*. The mouse/keyboard is never shown in the clip, so input bindings are marked **ASSUMPTION**.
Features required by the master prompt but **not shown in the video** are listed separately at the end and are
never described as "like the video".

| # | Video moment | Observed behaviour | Implemented behaviour | Difference | Fix (Phase 2) |
|---|---|---|---|---|---|
| V1 | 0–5 s | Camera pans smoothly along a new road while the road tool stays active. | Left-drag pans on the ground plane (MapControls, damping 0.12); tools stay active while panning. | Input device not visible (ASSUMPTION: left-drag pan). | — |
| V2 | 8→14 s | Zoom from a whole district down to one facade; no clipping into the ground. | Wheel / pinch zoom, 15–600 m, target clamped to the world, camera never below ground (e2e P0-1). | — | Max distance raised so phones see the same district. |
| V3 | 10–11 s, 15 s | Camera orbits a little and also reaches a near top-down view. | Right-drag / two-finger orbit; polar angle 10°–80°. | — | — |
| V4 | 0–2 s | Orange preview line from an existing road node to the cursor with a square node marker; release → asphalt with markings. | Road tool: orange preview strip + square markers, snaps to road end nodes (4 m). Clicking chains roads. | Phase 1 snapped only to end nodes; the video (2–5 s) starts a road from the *middle* of an existing road. | Added T-junction snapping to any point on a road centre line. |
| V5 | 6–8 s | Where roads meet, the junction is cleaned up automatically, with crosswalks. | Road network: crossings computed for X and T junctions; centre dashes and sidewalks are cut at junctions; zebra crossings on every arm. | Phase 1 roads simply overlapped. | Added `scene/build/roads.ts` (unit + visual check). |
| V6 | 8–10 s | Lot tool: orange outline grows from a corner and locks to the block edge; toolbar dims while drawing; on release the lot is paved and the toolbar lights up; the next block is drawn straight away. | Lot and Parking tools: press–drag–release rectangle, corner snaps to sidewalk edges (3 m) or 2 m grid; toolbar dims during the drag; the tool stays active after a lot. Lots on roads are refused. | Phase 1 had no lots. | Added `lot` entity type, `snapRectPoint`, toolbar dimming (e2e "lot + parking tools"). |
| V7 | 10–11 s, 15–16 s | Footprint rectangle inside a lot → an orange glowing massing appears → the building with floors replaces it; the new building is outlined. | Building tool: drag a footprint → orange massing rises and fades (0.9 s) while the building grows; the new building is selected with its handles. | Phase 1 created the building instantly with no feedback. | Construction animation (`BuildAnimation`), auto-select (e2e "construction animation"). |
| V8 | 16–18 s | Orange handle at the roof corner; dragging it up/down changes the number of storeys; a line marks the roof edge. | Orange diamond handle at the roof corner of the selected building; vertical drag changes whole storeys live, shows "N qavat", commits **one** undo step on release. | Phase 1 only had the inspector +/− buttons. | `HeightHandle` (e2e "height handle adds floors with one undo"). |
| V9 | 11–14 s, 18–19 s | With a facade style active, the facade under the cursor glows orange; a click applies the style. | Facade tools (Zlín / Oq / Shisha): hovering a building highlights the side under the cursor in orange; a click restyles that side. | The video can also pick a **vertical segment** of a facade; we restyle a whole side. | Per-side facades (`metadata.faces`). Segment-level picking is planned for Phase 3. |
| V10 | 22–25 s | The ground floor glows orange, the storefront icon is active, and the ground floor becomes a glass shopfront. | Storefront tool: hovering highlights the ground floor; a click toggles the shopfront (also in the inspector). | The video applies it to part of the ground floor; we apply it to the whole ground floor. | `metadata.ground = 'storefront'`. |
| V11 | whole clip | One bottom row of ~11 square icons, a separate road tool on the far left; active = orange, inactive = dark, disabled = dim; a tooltip appears above the hovered icon. | Same layout. Library groups (Fasad / Binolar / Daraxtlar / Ko'cha) open a second row of icons above the main row. | The flyout row is not in the video; it is needed because our library has more items than fit in one row. | Toolbar rebuilt as one row plus a flyout. |
| V12 | 10–19 s | Selection/hover feedback is orange (outline and glow); the building's own materials stay unchanged. | Orange outline box plus a soft orange footprint; the materials are never touched (separate meshes). | The video outlines the real roof and facade edges; we outline the bounding box (close equivalent). | — |
| V13 | 26–38 s | UI hidden, slow cinematic drift over the finished district, golden-hour light. | "Ko'rish" mode hides all UI and slowly auto-rotates the camera; Esc or the small button exits. | No golden-hour relight and no tilt-shift blur (DOF). | Presentation mode (e2e). Golden hour and DOF are optional extras for Phase 6 (performance). |
| V14 | 10 s, 14 s, 19 s | How the camera reacts to a new object can't be seen: the clip cuts at these moments. | The camera does not move on its own. | Unknown from the video. | Nothing guessed. |
| V15 | 19–21 s | Small square footprints in a courtyard are paved around them. | Lots and props can be placed inside blocks; paving comes from lots. | Minor. | — |
| V16 | whole clip | Transitions are smooth; no bouncy easing. | Camera damping, ease-out construction animation, 0.18 s UI fades. | — | — |

## Interactions required by the spec but not shown in the video

| Feature | Implemented | Note |
|---|---|---|
| Esc cancel | Esc cancels a road/lot draft, then the active tool, then the selection, and exits presentation mode. | ASSUMPTION (Esc is never shown). |
| Move / rotate / scale | Gizmo (W/E/T), arrow-key nudge, inspector fields; one undo step per drag. | Spec §9. |
| Duplicate / delete | Ctrl+D (finds a free spot), Delete. | Spec §9. |
| Undo / redo | Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, top-bar buttons. | Spec §10. |
| Save / load / autosave | Ctrl+S, autosave 0.8 s after each change, reload restores the scene. | Spec §25. |
| Placement rules | Buildings never sit on roads, sidewalks or other buildings; lots and parking never sit on roads; roads never cut through buildings or lots; props stand on sidewalks but not on asphalt. | Gate 2 items 5–7. |

## Evidence

`npm run e2e` → 21/21 pass. Screenshots are in `apps/web/test-results/`:
- `desktop-1440x900.png`, `desktop-selected.png`, `desktop-road-tool.png`
- `desktop-construction-mid.png`, `desktop-construction-done.png`, `desktop-presentation.png`
- `mobile-390x844*.png`
