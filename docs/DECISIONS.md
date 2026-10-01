# Decisions

**D-1 New editor lives in `apps/web` as a standalone npm project; the old clinic app stays at the root untouched.**
Root npm workspaces would hoist and share `node_modules` with the old app and risk breaking its GitHub Pages demo. `packages/scene-schema` is consumed via a Vite/TS path alias (`@scene/schema`) instead of a published package. We can switch to workspaces later without code changes.

**D-2 TypeScript 6.0.3.** 7.x is newer, but typescript-eslint 8.71 supports `<6.1`. Lint is a gate requirement, so we use the newest version both tools support.

**D-3 Camera: perspective, FOV 28°.** Video shows perspective with orbit; images look near-isometric. A narrow-FOV perspective satisfies both. An orthographic mode is kept behind `?ortho=1` for A/B comparison.

**D-4 Undo = command stack with before/after entity snapshots**, capped at 200. Simple, testable, covers add/delete/update/batch.

**D-5 Persistence = localStorage in Phase 1–2** (scene JSON is small). IndexedDB is introduced in Phase 3 for GLB blobs.

**D-6 Editor accent = orange `#FF8A1F`** (from the video), used only for previews, outlines, handles, active tools.

**D-7 Playwright via the already-installed `playwright-core` 1.56.1** with the preinstalled Chromium and SwiftShader GL. No browser download.

**D-8 Grid: 1 m for transforms, 2 m for roads and footprints.** Y-up, 1 unit = 1 m.

**D-9 Hosting:** the editor is built into `/editor/` (relative base) so GitHub Pages serves it next to the old demo without changing Pages settings.

**D-10 UI language: Uzbek labels** (the user's language), code and docs in English.

**D-11 Asset pipeline:** source GLBs live in `apps/web/assets-src/buildings/` (+ `assets.json` for labels and overrides); `npm run assets` normalises them into `public/assets/buildings/` with a `manifest.json` (size, fixes, warnings). Nodes are merged per material (thousands of nodes → ≤ 10 meshes) because the supplied models were 300–1,500 nodes each.

**D-12 New entity type `lot`** (paved / parking / plaza), added to the schema without a version bump: older documents never contain it, and validation drops unknown types.

**D-13 Procedural buildings are merged vertex-coloured geometry** (1–2 draw calls each) rather than many meshes; identical props share cached geometry.

**D-14 `?still` mode** freezes traffic and skips the construction animation, so screenshots and e2e tests are deterministic.

**D-15 Interaction e2e tests use a small fixture scene;** the full sample city is used for loading, GLB checks and screenshots. The dense city has no free, unoccluded ground near the centre of the screen.

**D-16 The clinic is a parametric stand-in** (`prim:clinic`: chamfered corner entrance, pilasters, rooftop plant), built from image 6. When the real clinic GLB arrives, it goes into `assets-src/buildings/` and the sample entity's `assetId` switches to `glb:<name>`.

**D-17 No post-processing pass for now.** `@react-three/postprocessing` (N8AO + SMAA) made every shadow map disappear with three 0.186, even at its lowest setting. The miniature look is built without it instead: baked vertex AO, contact-shadow decals, softened PCF shadows and a CSS backdrop-filter tilt-shift. This is also cheaper on phones. Revisit in Phase 6.
