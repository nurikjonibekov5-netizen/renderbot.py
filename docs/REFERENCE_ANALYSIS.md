# Reference Analysis

Sources (stored in `docs/referens/`):

| # | File | Role (per master prompt §2) |
|---|---|---|
| V | `video_miniopolis.mp4` (38.5 s, 720×720, Miniopolis city-builder clip) | **Behaviour source of truth** |
| 1 | `rasm1_minora.webp` — tall red/grey tower | Reusable building asset |
| 2 | `rasm2_zlin_city.jpg` — Zlín City isometric world | **World appearance source of truth** |
| 3 | `rasm3_texnik_bino.webp` — red-brick industrial, two chimneys | Reusable building asset |
| 4 | `rasm4_majmua.webp` — multi-wing red complex | Reusable building asset |
| 5 | `rasm5_uzun_bino.webp` — long low red building | Reusable building asset |
| 6 | `rasm6_klinika_sahna.png` — white clinic on a corner lot | **World + composition source of truth** |

Frames were sampled at 1 fps (39 frames) and reviewed individually. Anything not visible is marked `ASSUMPTION:`.

---

## 1. Video — frame-by-frame log

| t (s) | What is on screen | Interaction it demonstrates |
|---|---|---|
| 0 | Existing district (buildings, parking, roads) at the top; empty grey ground below. Bottom bar: a separate square **road tool** button at far left (inactive) and a row of greyed icons. Caption "EXPANDING THE NEIGHBOORHOOD". | Initial state: world + build toolbar. |
| 0–1 | An **orange line** runs from an existing road intersection to the cursor; a small square node marker sits at the cursor end. | **Road tool, drag preview**: start snaps to an existing node, preview drawn in orange. |
| 1–2 | The orange preview becomes a finished road: dark asphalt, white edge lines, yellow centre line, white square markers at both ends. Road tool button is now **orange (active)**; the toolbar icons light up. Hover tooltip "Apartment II" above an icon. | Commit on release. Toolbar icons have hover tooltips. |
| 2–5 | Camera pans down along the new road; a second road is started from a mid-point of the first (orange glow at the start node). | Roads can branch from any point on an existing road (T-junction). Camera pans while tool stays active. |
| 5–6 | A long orange preview line at a different angle; earlier roads are already laid out in a grid. Road button inactive (brown). | Multiple roads; lines are straight segments. |
| 6–8 | Grid of rectangular blocks bounded by roads; crosswalk/stop markers appear at intersections automatically. Camera has tilted further towards top-down. | Intersections are generated automatically when roads meet. |
| 8 | An **orange rectangle outline** is dragged on the ground inside a block, starting from one corner (corner handle visible). Toolbar icons are dimmed/disabled. | **Lot / footprint tool**: drag a rectangle. ASSUMPTION: snaps to the block edges. |
| 9–10 | The lot rectangle stays orange; one toolbar icon (5th, "window grid") is **active orange**. | Choose a building style for the lot. |
| 10–11 | A building appears on the lot; its front face glows **solid orange** and the top edge has an orange outline. Camera moves closer and orbits slightly. | Building is created from the footprint; the face under the cursor is highlighted. |
| 11–13 | Different faces of the building glow orange as the cursor moves; one face changes to a different facade after a click. | **Per-face hover highlight + click to apply** the selected facade style. |
| 13–14 | Close-up of a corner: a vertical orange strip on one face. | Facade can be applied to narrow segments. |
| 15–16 | Top-down view, new orange rectangle on an empty lot with a round corner handle; then a dark box building with an **orange outlined roof**. | Second building via footprint → extruded massing. |
| 16–18 | A thin horizontal orange line across the facade with a **diamond handle** at the right end, moving up/down. | **Floor-height / floor-split handle**: drag vertically to set number of storeys. ASSUMPTION: integer floors snap. |
| 18–19 | A tall vertical orange rectangle drawn on the facade. | Select a vertical section of the facade. |
| 19–21 | Small square outlines on the ground inside a courtyard; paving tiles appear around one. | Small props / courtyard elements placed by footprint. |
| 21–22 | An orange outline on a building's lower part (podium). | Ground floor treatment. |
| 22–25 | Front close-up: ground floor glows orange, last toolbar icon (storefront) is active; ground floor becomes a glass storefront. | Ground-floor style is a separate choice. |
| 26–38 | Toolbar hidden; slow cinematic camera drift over the finished district at golden-hour light; "LIKE AND FOLLOW FOR MORE". | **Presentation / fly-through mode** with UI hidden. |

## 2. Video — editor behaviour summary

- **Camera**: perspective, high oblique angle (≈45–60° from horizontal), long-ish lens. Smooth damped motion. Pan (follows road while drawing), zoom (from district view down to a single facade), and orbit (several azimuths visible: front, side, top-down). ASSUMPTION: right-drag orbit, left-drag pan, wheel zoom — the clip shows results, not the input device.
- **Depth of field / tilt-shift** blur on the far background (miniature feel).
- **UI**: almost no chrome. One logo top-left. A single bottom toolbar row of ~11 square icons (parking, building massing types, facade types, tree, lamp, storefront). A separate **road tool** square at the far left. Active tool = orange fill/border. Inactive = dark translucent. Disabled = dimmed. Hover tooltip above the icon (white small text).
- **Selection / highlight colour**: one accent — **orange (#FF8A1F-ish)**, used for previews, outlines, active icons, handles. Highlight is additive (glow/outline/overlay); underlying materials are unchanged.
- **Previews**: every action shows an orange preview before commit (road line, lot rectangle, face glow, floor line).
- **Handles**: small square (corner) and diamond (height) handles in orange.
- **Commit**: on mouse release/click. ASSUMPTION: `Esc` cancels (not shown).
- **Rotate/delete/undo**: not shown in the clip. They are required by the master prompt (§9) and are added as standard editor shortcuts.
- **Grid/snap**: roads are straight segments, junctions snap to existing roads, lots align to blocks → there is snapping. ASSUMPTION: grid step ≈ one lane width.
- **Animation**: transitions are smooth; buildings appear instantly with a glow; no bouncy easing.
- **Always on screen**: logo, bottom toolbar (hidden only in fly-through). **Only during selection/hover**: orange outlines, handles, tooltip.

## 3. P0 interaction list (Phase 1 targets)

| ID | Interaction | Testable criterion |
|---|---|---|
| P0-1 | Pan / zoom / orbit camera, damped, limited | Wheel changes distance within [min,max]; camera never goes below ground; reset button restores default view. |
| P0-2 | Road tool: click start → orange preview line → click end | A road entity is added with start/end on the snap grid; Esc cancels without adding. |
| P0-3 | Footprint tool: drag rectangle → building massing created | New building entity whose footprint equals the rectangle (snapped). |
| P0-4 | Asset place: pick toolbar asset → ghost follows cursor → click to place | Ghost visible; invalid placement (overlap) shown red and refused; R rotates ghost 90°. |
| P0-5 | Select by click; orange outline highlight; inspector opens | Selected entity id in store; outline visible; original materials untouched. |
| P0-6 | Move / rotate / scale selected | Transform gizmo + arrow-key nudge; single undo step per drag. |
| P0-7 | Duplicate, delete | New unique id; Delete removes only the selected entity. |
| P0-8 | Undo / redo | Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y restore exact previous transforms. |
| P0-9 | Save / load / autosave | Reload restores the scene with identical transforms. |
| P0-10 | Floors handle (height) | Changing floors changes building height in whole storeys (inspector in Phase 1, on-model handle in Phase 3). |

## 4. World appearance (images 2 and 6, confirmed by 1, 3, 4, 5)

- **Projection**: image 6 is a near-true isometric look: parallel verticals, ≈30–35° camera elevation, 45° azimuth to the street grid. Image 2 is steeper (≈50°) with slight perspective. → Default: **perspective camera with narrow FOV (≈25–30°)** to imitate isometric while keeping the video's zoom/orbit freedom. Orthographic is kept as an A/B option (DECISIONS D-3).
- **Ground**: white/snowy (#F3F5F7…#FFFFFF), soft blue-grey shadows.
- **Roads**: dark asphalt (#3A3F46), white dashed centre line, white curbs/sidewalks raised slightly, zebra crossings at junctions, traffic lights at corners (image 6).
- **Buildings**: orange-red facade bands (#E2603F / #D9573A), cool blue-grey glass (#8E9BAE), warm lit windows (#FFE7A8, random ~20%), white roofs and parapets, light-grey trims. The clinic (image 6) is **white with pilasters**, 4 storeys + rooftop HVAC; corner entrance with canopy; dark windows.
- **Vegetation**: white snow-covered cone trees, rounded white low-poly deciduous trees, green box-cut hedges (image 6).
- **Infrastructure**: pipe bridges on lattice trusses, railway tracks with freight trains, factory chimneys (images 2, 6). These are Phase 2 props.
- **Light**: soft sun from upper-left/front-left (shadows fall right-back), strong ambient fill, low-contrast shadows, no harsh blacks. Slight atmospheric haze at the top of the frame (image 2).
- **Palette tokens** (approx.): ground `#F4F6F8`, shadow `#C9D3DF`, asphalt `#3B4048`, road line `#FFFFFF`, brick `#E0603E`, brick-dark `#B9462F`, glass `#8C99AC`, warm window `#FFE6A6`, roof `#F7F8FA`, trim `#D9DEE4`, clinic facade `#F2F2F0`, accent (editor) `#FF8A1F`.

## 5. Scale relationships (estimated, metres)

Measured against the GLB models already supplied (tower 24×9×42 m, industrial 32×14×16 m, complex 41×35×12 m, long building 30×12.5×10 m) and the clinic in image 6:

- Storey height ≈ 3.3 m; clinic ≈ 4 storeys ≈ 15 m high, footprint ≈ 30×30 m.
- Car ≈ 4.5×1.8 m; in image 6 a two-lane road ≈ 3.5 lanes of car width → **road width ≈ 8 m** (two lanes), sidewalk ≈ 3 m.
- Building spacing: 10–20 m between neighbouring buildings; blocks ≈ 60–80 m.
- **Grid step: 1 m for transforms, 2 m for roads/footprints** (ASSUMPTION; tuned in Phase 2).
- World coordinates: Y-up, 1 unit = 1 metre, origin at the scene centre, ground at Y = 0.

## 6. Conflicts between sources

- Video shows a dark asphalt-grey ground and realistic textures; images 2/6 show white snow and clean low-poly. Rule (§29): **video → behaviour, images → appearance**. The editor behaves like the video and looks like images 2/6.
- Video's accent is orange; images contain no editor UI. Orange is adopted as the editor accent (it also contrasts with the white world).
