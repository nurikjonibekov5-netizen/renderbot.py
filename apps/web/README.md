# IsoEditor — isometric 3D scene builder

Reusable digital-twin editor (React 19 + TypeScript + Vite + React Three Fiber + Zustand).
Docs: `../../docs/` (ARCHITECTURE, IMPLEMENTATION_PLAN, ACCEPTANCE_CRITERIA, KNOWN_RISKS, DECISIONS).

```bash
npm install
npm run dev          # http://localhost:5180
npm run typecheck && npm run lint && npm run test && npm run build
npm run e2e          # Playwright (uses preinstalled Chromium, see tests/e2e/browser.mjs)
npm run build:pages  # builds into /editor at the repo root for GitHub Pages
npm run assets       # normalise GLBs from assets-src/buildings → public/assets/buildings
```

**Adding a 3D model:** put the `.glb` file into `apps/web/assets-src/buildings/`, optionally give it a label in
`assets.json`, then run `npm run assets`. It appears under Toolbar → Binolar.

URL flags: `?fresh` (ignore autosave), `?nohint`, `?still` (deterministic frame: no traffic motion or build animation), `?debug` (FPS/draw-call panel), `?ortho` (orthographic A/B camera).

Controls: left-drag pan, right-drag orbit, wheel zoom. Esc cancel, Delete, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y,
Ctrl+D duplicate, Ctrl+S save, R rotate, W/E/T move/rotate/scale gizmo, arrows nudge (Shift = 5 m), G grid.
