# Known Risks (master prompt §23) and mitigations

| Area | Risk | Mitigation | Phase |
|---|---|---|---|
| 3D | GLB too big/small, cm/mm units | Normaliser: measure bbox; if largest side > 500 → ×0.01, > 5000 → ×0.001; then fit to catalog's target size if given | 2 |
| 3D | Pivot not centred; floating / sunk building | Recentre to footprint centre and set min Y = 0 on import | 2 |
| 3D | Y-up/Z-up, mirrored, inverted normals | Detect tall-axis heuristics, `scale` sign check, `side: FrontSide` + recompute normals option in inspector | 2–3 |
| 3D | Missing/washed-out textures, black materials | sRGB colour space on colour maps, ACES tone mapping, fallback grey material, log per asset | 2 |
| 3D | Transparent sorting | Glass rendered opaque-tinted by default; `depthWrite` off only for real transparency | 2 |
| 3D | Shadow acne / peter-panning | bias −0.0006, normalBias 0.05, tight shadow camera fitted to the scene | 1 |
| 3D | Z-fighting (roads, markings, ground) | Fixed Y layers: ground 0, road 0.02, markings 0.04, sidewalk 0.15; `polygonOffset` on decals | 1–2 |
| 3D | Near/far clipping | near 0.5, far 3000; controls max distance 600 | 1 |
| Editor | Click becomes camera drag / drag orbits camera | 5 px click threshold; controls disabled during gizmo/tool drags | 1 |
| Editor | Delete removes wrong entity; stale selection | Delete acts on `selectedId` only; selection cleared when entity disappears (undo/delete) | 1 |
| Editor | Undo/redo corruption | Pure immutable commands; unit tests for every command round-trip | 1 |
| Editor | Duplicate same id | `newId()` = type prefix + monotonic counter + random suffix; collision check against doc | 1 |
| Editor | Save/load transform drift | Round to 1e-4 on commit; e2e compares reload JSON | 1 |
| Editor | Scale 0/negative | Clamp each axis to [0.05, 50] in command and inspector | 1 |
| Editor | Object under ground | Y clamped ≥ 0 for buildings/props | 1 |
| Editor | Accidental double placement | Placement ignores clicks within 250 ms of the previous placement and `detail > 1` | 1 |
| Assets | 404, CORS, malformed GLB, slow/cancelled load | Per-entity Suspense + ErrorBoundary → red placeholder box with "Reload / Remove" | 2–3 |
| Assets | Draco / KTX2 decoder paths | Decoders bundled locally under `public/decoders/`, no CDN | 3 |
| Assets | WebGL context lost | `webglcontextlost` listener → overlay "3D qayta yuklanmoqda", restore on `webglcontextrestored` | 1 |
| Mobile | Pinch vs browser zoom; page scroll | `touch-action: none` on canvas, viewport `user-scalable=no` only on canvas page | 1 |
| Mobile | Small buttons | Min 40 px touch targets; toolbar scrolls horizontally | 1 |
| Mobile | Memory/GPU | DPR cap 2 (1.5 on mobile), shadow map 1024 on mobile | 1, 6 |
| Provider | Missing/invalid key, no credit, 429, 5xx, stuck jobs, bad URL, download fail | Server-side adapters with typed errors, exponential backoff, polling timeout 10 min, URL host allow-list + content-type/size check; no automatic switch to another paid provider | 4 |
| Security | Key leakage | Keys only in `apps/server/.env` (gitignored), `.env.example` committed; CI grep of client bundle for key patterns | 4 |
| Security | Upload abuse / SSRF | Type + size limits, sanitised filenames, no arbitrary remote URL fetch (allow-list) | 4 |
| Privacy | Real staff names in a public repo | Editor and demo use only fake data; real CSVs never bundled | all |
| Env | TypeScript 7 vs typescript-eslint | Pinned TS 6.0.3 (DECISIONS D-2) | 0 |
| Env | Headless WebGL in CI | Chromium with SwiftShader (`--use-angle=swiftshader`); screenshot thresholds relaxed | 1 |
