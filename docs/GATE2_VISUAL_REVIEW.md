# Gate 2 — B. Visual fidelity review

Side-by-side images (reference left, editor right, same framing, `?still` deterministic frame):
- `docs/gate2/compare_image6.jpg` — image 6 (clinic on the corner lot)
- `docs/gate2/compare_image2.jpg` — image 2 (Zlín City district)

The editor's default view (1440×900) and the phone view (390×844) are in `apps/web/test-results/`.

## Review rounds

### Round 1 (first Phase 2 render)
Differences found:
1. GLB models were drawn as 1,000+ separate meshes each (6,334 draw calls).
2. Zlín glazing was too dark and grey compared with the pale blue-grey glass in image 2.
3. The clinic's chamfered entrance was turned away from the camera, unlike image 6 where it faces the crossroads and the viewer.
4. The clinic was not the focal point of the default view.

Fixes:
- The pipeline now merges each GLB per material: 289 draw calls in total.
- Brighter glass `#A2AEBF`, warmer brick.
- The clinic moved to the NW corner lot and was rotated 90° so the entrance faces the crossroads.
- The camera now targets the clinic.

### Round 2
Differences found:
1. The entrance windows were hidden inside the wall.
2. Image 6 has parking bays right in front of the clinic; ours had none.
3. Trees on sidewalks collided under rotation, because their collision box was the full crown.

Fixes:
- Windows moved out of the wall.
- Front parking bays added.
- Trees now collide with their inner crown, not the full outline.

### Round 3
Differences found:
1. In image 6 the rail yard with freight trains and a pipe bridge sits directly behind the clinic block; ours was 150 m away.
2. Image 2 has dark roofs on large blocks and warmer facades.
3. The reference streets have cars, but our screenshots had empty streets.

Fixes:
- The city was re-laid out: a rail corridor (3 tracks, freight trains) now runs behind the clinic block, with the pipe bridge and the plant (texnik_bino GLB) behind it.
- Optional dark roofs for large blocks.
- Warm sun (`#FFEEDA`) with a cool sky fill, and a sky-haze gradient.
- Traffic is now shown frozen in screenshot mode.

### Round 4 (user: "still about 40% missing — render quality")
Differences found:
1. The render looked flat next to the path-traced references: weak shadows, no contact darkening, no miniature depth of field.
2. The clinic lacked the deep pilasters, tall narrow windows and fifth storey of image 6.
3. The Zlín blocks were too low and too sparse compared with image 2; there were no stair cores, no dark roofs on large blocks and no chimney.
4. The rail yard had no switches, there were no snow-covered bushes, and the pipe bridge did not pass behind the clinic.

Fixes:
- Stronger cool-blue sun shadows with softened edges.
- Baked ambient occlusion: darker wall feet plus soft contact shadows under buildings, trees and cars.
- Tilt-shift blur at the top and bottom of the view (CSS backdrop filter: free on phones), stronger in presentation mode.
- Clinic facade redone: deep pilasters, tall windows with sills and lintels, a dark ground-floor band, a cornice, a framed corner entrance, and 5 storeys.
- Zlín blocks raised to 5–9 storeys, with protruding red-brick stair cores and dark roofs on large blocks.
- Six extra blocks, a plant chimney, rail switches and snow bushes; a pipe bridge now runs behind the clinic.
- A post-processing attempt (SSAO + tone mapping) was dropped because it removed all shadow maps (DECISIONS D-17).

## Gate 2 checklist (visual)

| Requirement | Status | Evidence |
|---|---|---|
| 1. Generic boxes replaced by reference assets | ✅ | Zlín facade generator (white concrete frame, red brick spandrels, blue-grey glazing, warm windows), clinic stand-in, 4 GLBs |
| 2. 4 GLBs in the asset library | ✅ | Toolbar → Binolar; `public/assets/buildings/manifest.json` |
| 3. Per-GLB normalisation | ✅ | Pipeline: auto-centre, ground align, unit scale, up-axis/rotation override, bbox check, material check, embedded lights removed, nodes merged; runtime bbox check in e2e (min Y = 0 ± 0.05, size = manifest) |
| 4. White ground, red/orange facades, blue-grey glass, warm windows, soft shadow | ✅ | compare_image2/6 |
| 5. Buildings don't overlap | ✅ | `placementProblem` OBB rules; unit test "sample scene has no overlaps" |
| 6. Parking not on roads | ✅ | rule + e2e "a lot on the road is refused" |
| 7. Roads don't cut buildings | ✅ | rule + e2e "a road through a building is refused" |
| 8. Clinic is the focal point | ✅ | default camera targets the clinic; entrance faces the camera |
| 9. Camera angle/zoom close to the reference | ✅ | ~35° elevation, 45° azimuth, narrow 28° lens (near-isometric) |
| 10. Not empty: density + props | ✅ | ~40 buildings, lots, rail yard, pines, lamps, traffic lights |
| 11. Trees, street lights, traffic lights, parked cars | ✅ | sample world |
| 12. Alive without heavy simulation | ✅ | lane traffic with signal stops and car gaps (instanced, no React state per frame) |

## Known remaining differences (accepted for Gate 2, tracked for later phases)
- Rail switches are simple straight diagonals; there are no level crossings.
- No true global illumination (snow bounce light) or bevelled edge highlights; the references are path-traced offline renders. Approximated with baked AO, contact shadows and tilt-shift.
- Facades restyle per side, not per vertical segment (Phase 3).
- The clinic is a parametric stand-in until the real clinic GLB is supplied; it can be swapped through the catalog.
