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
