# CLAUDE CODE MASTER PROMPT
## Isometric Digital Twin / Scene Builder — klinika va kelajakdagi boshqa obyektlar uchun

> **Bu faylni Claude Code'ga to‘liq ber.**
> Avval video, keyin foydalanuvchi bergan 6 ta referens rasm aynan shu ketma-ketlikda biriktiriladi.
> Maqsad — avval videodagi ishlash mantig‘i va vizual tajribani iloji boricha 1:1 qayta yaratish, lekin dunyo va assetlar foydalanuvchining referens rasmlaridagi vizual tilga mos bo‘ladi.

---

# 0. SENGA BERILAYOTGAN ROL

Sen oddiy kod yozuvchi emassan. Sen **Tech Lead + 3D/WebGL Engineer + Frontend Engineer + Backend/Integration Engineer + QA/Performance Engineer** sifatida ishlaysan.

Agar Claude Code muhitida parallel subagent/agent ishlatish imkoniyati bo‘lsa, quyidagicha bo‘l:
1. **Tech Lead / Architect** — umumiy arxitektura, tasklar, integratsiya chegaralari.
2. **3D Engineer** — Three.js/R3F sahna, kamera, asset, material, yoritish, picking, LOD/instancing.
3. **UI/UX Engineer** — videodagi editor UX, toolbar, panels, states, responsive/touch.
4. **Backend/Integration Engineer** — image-to-3D provider adapterlari, API key xavfsizligi, polling, storage, project persistence.
5. **QA/Performance Engineer** — testlar, screenshot diff, FPS/draw-call/memory nazorati, bug regression.

Agar parallel agentlar mavjud bo‘lmasa, shu rollarni ketma-ket bajargin.

**Muhim:** foydalanuvchi dasturchi emas. Undan keraksiz texnik qarorlarni so‘rama. Oddiy va qaytarib bo‘lmaydigan qaror bo‘lmasa, o‘zing professional default tanla. Faqat API key, login, to‘lov yoki tashqi servisga ruxsat kabi foydalanuvchi berishi shart bo‘lgan narsalarda so‘ra.

---

# 1. ASOSIY MAQSAD

Biz hozir oddiy "klinika sayti" yasamayapmiz.

Biz **qayta ishlatiladigan 3D isometric scene builder / digital twin editor** yaratyapmiz.

Birinchi real loyiha — klinika va uning atrof-muhiti.

Keyinchalik shu engine yordamida:
- boshqa klinikalarni,
- boshqa binolarni,
- boshqa hududlarni

tezroq yig‘ish va pullik xizmat/mahsulotga aylantirish mumkin bo‘lishi kerak.

Platformaning markaziy g‘oyasi:

**Rasm yoki tayyor 3D asset → 3D asset kutubxonasi → sahnaga joylashtirish → yo‘l/parking/landshaft → mashinalar/odamlar → saqlash → keyinchalik digital twin ma’lumotlari.**

---

# 2. ATTACHMENTLAR VA REFERENS PRIORITETI

Claude Code'ga quyidagi ketma-ketlikda fayllar beriladi:

1. **VIDEO — ENG MUHIM FUNKSIONAL REFERENS**
   - Videoni shunchaki ilhom sifatida emas, **interaction specification** sifatida tahlil qil.
   - Kamera qanday harakat qiladi?
   - Object qanday tanlanadi?
   - UI qayerda?
   - Bino/asset qo‘shish jarayoni qanday?
   - Drag/drop bormi?
   - Placement preview bormi?
   - Highlight/outline bormi?
   - Rotate/delete/confirm qanday?
   - Grid/snap bormi?
   - Transition va animation qanchalik yumshoq?
   - Qaysi element doim ekranda?
   - Qaysi element faqat selection paytida chiqadi?
   - Videoda ko‘rinadigan narsalarni frame-by-frame yozib ol.

2. **IMAGE 1 — baland qizil/kulrang tower**
3. **IMAGE 2 — to‘liq isometrik “referens olam” / Zlín City**
4. **IMAGE 3 — qizil g‘isht industrial bino, tomida 2 mo‘ri**
5. **IMAGE 4 — bir nechta qizil korpuslardan tuzilgan bino kompleksi**
6. **IMAGE 5 — uzun past qizil bino**
7. **IMAGE 6 — klinika markazda turgan yakuniy referens sahna**

## Prioritet qoidasi

- **Video = interaction va editor xatti-harakatlari uchun source of truth.**
- **Image 2 va Image 6 = umumiy world composition, kamera, palette, atmosfera uchun source of truth.**
- **Images 1, 3, 4, 5 = reusable building asset reference.**
- Asosiy klinika keyinchalik foydalanuvchining o‘z GLB modeli bilan almashtirilishi mumkin.
- Referensdagi kompozitsiyani to‘liq copy-paste qilish shart emas, lekin **vizual til bir xil oilada** bo‘lsin.

---

# 3. BIRINCHI ISH — KOD YOZISH EMAS

Avval repository va mavjud fayllarni tekshir.

Keyin quyidagi fayllarni yarat:

```text
/docs/REFERENCE_ANALYSIS.md
/docs/ARCHITECTURE.md
/docs/IMPLEMENTATION_PLAN.md
/docs/ACCEPTANCE_CRITERIA.md
/docs/KNOWN_RISKS.md
/docs/DECISIONS.md
```

## `REFERENCE_ANALYSIS.md`
Videoni va rasmlarni batafsil tahlil qil:
- camera angle,
- projection,
- zoom range,
- pan/orbit limits,
- object scale relationships,
- street width,
- building spacing,
- palette,
- lighting,
- shadows,
- fog/haze,
- UI placement,
- selection behavior,
- editor workflow,
- animation speed,
- likely grid size,
- likely world coordinate assumptions.

Videoda ko‘rinmagan narsani "video shunday qilgan" deb uydirma.

Noaniq narsani:
`ASSUMPTION:` deb alohida belgilagin.

## `ARCHITECTURE.md`
Component boundaries, data model, provider interfaces, scene serialization, folder structure va future extensibility.

## `IMPLEMENTATION_PLAN.md`
Quyidagi phase/gatelarga ajrat.

## `ACCEPTANCE_CRITERIA.md`
"Done" degan so‘zni faqat measurable shartlar bajarilganda ishlat.

## `KNOWN_RISKS.md`
Quyidagi buglar va mitigationlarni yoz.

---

# 4. TEXNOLOGIYA STACKI

Avval mavjud muhitni tekshir. Mavjud working project bo‘lsa uni buzma.

Yangi project bo‘lsa:

## Frontend
- React
- TypeScript (`strict: true`)
- Vite
- Three.js
- React Three Fiber
- `@react-three/drei`
- Zustand

**Stable versiyalarni tanla. Alpha paketlardan foydalanma, agar juda kuchli texnik sabab bo‘lmasa.**

Hozirgi stable React/R3F compatibility'ni package o‘rnatishdan oldin tekshir.

## 3D asset format
**Runtime canonical format = GLB/glTF.**

Sabab:
- web uchun yaxshi ecosystem,
- material + texture + hierarchy birga,
- Three.js/R3F support kuchli,
- compression va optimization bor.

FBX/OBJ import qilish mumkin, lekin **runtime'da GLB'ga normalize** qil.

## Backend
Image-to-3D API keylari browserga chiqmasligi uchun kichik server layer bo‘lsin.

Tavsiya:
- Node.js + TypeScript
- Fastify yoki mavjud stack bilan mos lightweight server
- SQLite MVP uchun
- keyinchalik PostgreSQL'ga o‘tishga tayyor schema
- API provider keylari faqat server-side `.env`

Backendni faqat haqiqatan kerak joyda ishlat. 3D render frontendda bo‘ladi.

## Testing
- Vitest: pure logic/unit tests
- Playwright: editor interaction + screenshot regression
- TypeScript typecheck
- ESLint
- production build test

---

# 5. MUHIM RESEARCH-GROUNDED QOIDALAR

Quyidagilarni implementatsiyada hisobga ol:

### React Three Fiber performance
- Har frame'da React `setState` ishlatma.
- Tez harakat/animationni `useFrame` + refs/mutation orqali qil.
- Material/geometrylarni keraksiz qayta yaratma.
- Bir xil obyektlar ko‘p bo‘lsa instancingdan foydalan.
- Assetlarni cache/preload qil.

### Three.js / GLB
`GLTFLoader` kerak bo‘lganda:
- Draco,
- Meshopt,
- KTX2

compressed assetlarni support qilsin.

### Asset optimization
Offline/ingest pipeline orqali:
- glTF Transform,
- texture resize,
- meshopt yoki Draco,
- kerak bo‘lsa KTX2/Basis

qo‘llashga tayyor qil.

### LOD
Uzoqdagi binolar uchun full-detail meshni majburan render qilma.
LOD strategy bo‘lsin.

---

# 6. FOLDER ARXITEKTURASI

Taxminiy strukturani shunday yoki undan yaxshi qilib tashkil qil:

```text
/
  apps/
    web/
      src/
        app/
        components/
        editor/
        scene/
          camera/
          environment/
          entities/
          roads/
          traffic/
          pedestrians/
          selection/
          placement/
        stores/
        hooks/
        lib/
        styles/
        tests/
    server/
      src/
        api/
        providers/
          image-to-3d/
        storage/
        projects/
        jobs/
  packages/
    scene-schema/
    asset-pipeline/
    shared/
  public/
    assets/
      buildings/
      vehicles/
      props/
      vegetation/
      characters/
  docs/
  scripts/
```

Monorepo ortiqcha murakkab bo‘lsa MVP uchun soddalashtir, lekin boundaries saqlansin.

---

# 7. SCENE DATA MODEL

Hard-coded JSX ichiga sahnani mixlab tashlama.

Scene JSON orqali serializable bo‘lsin.

Masalan:

```ts
type SceneEntity = {
  id: string
  type: 'building' | 'road' | 'vehicle' | 'tree' | 'prop' | 'character'
  assetId?: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  metadata?: Record<string, unknown>
}

type SceneDocument = {
  schemaVersion: number
  projectId: string
  name: string
  environment: {
    season: 'winter' | 'neutral'
    timeOfDay: number
  }
  entities: SceneEntity[]
}
```

**`schemaVersion` majburiy.**
Kelajakda eski projectlarni migration qilish mumkin bo‘lsin.

---

# 8. CAMERA — VIDEO BILAN MOSLIK

Video tahlilidan keyin camera rejimini tanla.

Referens olamga qarab boshlang‘ich default:
- isometric/near-isometric feel,
- PerspectiveCamera yoki OrthographicCamera'ni video bilan A/B test qil,
- qaysi biri video ko‘rinishini aniqroq bersa o‘shani tanla.

Kamera:
- smooth pan,
- smooth zoom,
- optional rotate agar videoda bo‘lsa,
- min/max zoom,
- ground ostiga kirib ketmasin,
- sahnadan haddan tashqari uzoqlashmasin,
- touch: pinch zoom + one/two finger gesture,
- mouse: wheel zoom + drag pan,
- object drag paytida camera bilan konflikt qilmasin.

**Selection/placement paytida OrbitControls va object drag event konfliklarini alohida yech.**

---

# 9. EDITOR UX — CORE FUNKSIYA

MVP'da quyidagilar bo‘lishi shart:

1. Asset Library
2. Scene canvas
3. Select
4. Place
5. Move
6. Rotate
7. Scale
8. Duplicate
9. Delete
10. Undo
11. Redo
12. Save
13. Load
14. Import GLB
15. Object properties panel
16. Camera reset
17. Grid/snap toggle
18. Placement cancel (`Esc`)
19. Delete shortcut
20. Autosave

## Placement
Asset tanlanganda:
- ghost preview,
- valid/invalid placement feedback,
- click to place,
- `Esc` cancel,
- rotate shortcut,
- optional grid snap.

## Selection
Selected object:
- videodagi kabi outline/highlight yoki close equivalent,
- bounding indicator,
- transform controls.

Selection highlight binoning asl materiallarini buzmasin.

---

# 10. UNDO / REDO

Professional editor sifatida command history bo‘lsin.

Quyidagilar undoable:
- add,
- delete,
- move,
- rotate,
- scale,
- duplicate,
- road edit,
- asset replacement.

Drag jarayonidagi har pixel movement historyga kirmasin.
Drag tugagach bitta command sifatida commit bo‘lsin.

---

# 11. REFERENS OLAMNING VIZUAL TILI

Bizning olam:
- miniature city / architectural model feel,
- low-poly-ish, lekin juda qo‘pol emas,
- clean geometry,
- oq/snowy yoki juda light ground,
- qizil/orange industrial-modern facades,
- cool blue-gray glass,
- warm lit windows,
- soft directional sunlight,
- soft ambient fill,
- controlled shadows,
- clean edges,
- clutter kam,
- high readability,
- premium simulation look.

**Photorealism kerak emas.**
**Cartoon ham bo‘lib ketmasin.**
Referensdagi professional isometric architectural visualization oralig‘ida tur.

## Lighting
Yagona consistent lighting rig yarat.
Har GLB o‘z lighting'ini olib kelmasin.

## Color management
sRGB / renderer color-space to‘g‘ri ishlasin.
Imported GLB ranglari yuvilib ketmasin yoki haddan tashqari yorqinlashmasin.

---

# 12. REFERENS BINOLARINI ASSET SIFATIDA QABUL QILISH

Images 1,3,4,5 dagi binolarning 3D modellarini foydalanuvchi Tripo3D/Meshy yoki boshqa servisda generatsiya qilib GLB olib kelishi mumkin.

Shuning uchun import pipeline shunday bo‘lsin:

1. GLB tanlash/upload
2. Parse
3. Bounding box hisoblash
4. Auto-center
5. Ground alignment
6. Auto-scale suggestion
7. Preview
8. Confirm
9. Asset Libraryga save
10. Scene'ga place

Har asset uchun metadata:

```ts
{
  id,
  name,
  category,
  source,
  thumbnail,
  glbUrl,
  dimensions,
  triangleCount,
  textureMemoryEstimate,
  defaultScale,
  tags
}
```

---

# 13. IMAGE → 3D FUNKSIYASI

Bu kelajakdagi eng muhim product feature'lardan biri.

Foydalanuvchi:
1. bino rasmini yuklaydi,
2. "3D model yaratish" bosadi,
3. progress ko‘radi,
4. natija preview chiqadi,
5. "Scene'ga qo‘shish" qiladi.

## Provider abstraction

Bitta providerga qattiq bog‘lanib qolma.

```ts
interface ImageTo3DProvider {
  createTask(input: ImageTo3DInput): Promise<{taskId: string}>
  getTask(taskId: string): Promise<GenerationStatus>
  cancelTask?(taskId: string): Promise<void>
}
```

Providerlar:

### Primary: Tripo3D
- image-to-model
- kerak bo‘lsa multiview-to-model
- GLB output
- async task polling
- low-poly/game-ready variantni test qil

### Fallback: Meshy
- image-to-3D
- smart topology
- GLB output
- multi-image support

### Guaranteed fallback
**Manual GLB import hech qachon yo‘qolmasin.**
AI provider ishlamasa ham user ishni davom ettira olishi kerak.

Optional future:
- local/open model provider adapter.

## Provider fallback qoidasi

Agar primary provider:
- 5xx,
- timeout,
- unsupported input,
- repeated generation failure

bersa, userga aniq sabab ko‘rsat va fallback provider tanlashni taklif qil.

**Lekin billing/credit yetishmasligi paytida avtomatik boshqa pullik providerda pul sarflama.**
User confirmation kerak.

---

# 14. SINGLE IMAGE VA MULTIVIEW

Bir rasm ba’zan binoning orqa va yon tomonlarini to‘g‘ri topa olmaydi.

Shuning uchun UI:
- `Single image` mode
- `Multi-view (recommended for accuracy)` mode

bo‘lsin.

Multi-view:
- front,
- left,
- back,
- right

rasmlarni qabul qila olsin.

Agar faqat bitta rasm bo‘lsa — foydalanuvchini bloklama.

---

# 15. AI GENERATION JOB SYSTEM

Generation synchronous request sifatida browserni kutdirib qo‘ymasin.

Job states:
```text
queued
uploading
generating
processing
optimizing
ready
failed
cancelled
```

UI:
- progress,
- provider,
- retry,
- cancel,
- error reason.

Polling:
- exponential backoff yoki provider `Retry-After`ni hisobga ol.
- tab yopilib ochilganda job status qayta tiklansin.

Signed model URLs expire qilishi mumkin.
Natijani vaqtida **bizning storage/local dev asset folderga copy** qilish strategiyasi bo‘lsin.

---

# 16. SECURITY

QAT’IY:
- API keylarni frontendga embed qilma.
- Gitga `.env` qo‘shma.
- `.env.example` yarat.
- server-side proxy/provider integration.
- file upload type/size validation.
- filename sanitization.
- remote URL import bo‘lsa SSRF xavfini hisobga ol.
- generated download URLni validate qil.

---

# 17. ROAD SYSTEM

Yo‘l rasmdan "random mesh" bo‘lmasin.

Editor'da alohida road model bo‘lsin:
- road segment,
- intersection,
- curve yoki spline,
- lane centerline data.

Road visual va traffic graphni ajrat:
1. **visual mesh**
2. **navigation graph**

Shunda kelajakda mashina yo‘ldan chiqib ketmaydi.

## Z-fighting
Road ground ustida miltillamasin.
Yechim:
- slight Y offset,
- polygon offset,
- yoki proper mesh layer.

---

# 18. VEHICLES

Foydalanuvchi yaratgan:
- oq avtomobil,
- sariq taxi,
- SUV,
- oq van,
- sariq scooter

kabi assetlarni reusable library sifatida qo‘sha olsin.

MVP traffic:
- waypoint/lane graph,
- deterministic movement,
- delta-time based animation,
- basic speed,
- stop points,
- intersection rules keyinchalik.

**Mashinalar uchun full rigid-body physics ishlatish shart emas.**
Traffic uchun path-following ko‘proq deterministic va arzon.

Collision kerak bo‘ladigan joyda Rapierni keyin qo‘shish mumkin.

---

# 19. PEOPLE / CHARACTERS

Birinchi versiyada:
- simple low-poly people,
- idle/walk,
- nav points bo‘ylab yurish.

Keyinchalik clinic staff digital twin:
- employeeId,
- floorId,
- roomId,
- status,
- lastUpdate

metadata bilan bog‘lanadi.

Lekin **hozir real-time klinika backendiga shoshilma.**
Avval editor/game engine stabil bo‘lsin.

---

# 20. ASSET OPTIMIZATION PIPELINE

Har imported/generated GLB tekshirilsin.

Checks:
- file size,
- triangle count,
- texture dimensions,
- embedded texture count,
- missing normals,
- invalid material,
- empty scene,
- absurd bounding box,
- wrong origin,
- wrong scale.

Optimize script:
- glTF Transform
- meshopt/Draco
- 1K/2K texture default
- kerak bo‘lsa KTX2

**Original assetni yo‘qotma.**
`original/` va `optimized/` nusxalar bo‘lsin.

---

# 21. INSTANCING

Ko‘p qaytariladigan:
- daraxt,
- svetofor,
- streetlight,
- odam placeholder,
- bir xil parked car,
- mayda props

uchun InstancedMesh yoki drei Instances ishlat.

Lekin individually editable objectni premature instancing bilan murakkablashtirma.

Editor mode va runtime/simulation mode uchun rendering strategy farq qilishi mumkin.

---

# 22. PERFORMANCE TARGETLARI

Target:
- desktop: odatiy sahnada 60 FPSga yaqin,
- mid-range mobile: kamida usable ~30 FPS,
- first useful render: iloji boricha tez,
- loading progress aniq.

Adaptive quality:
- devicePixelRatio cap,
- shadow resolution scaling,
- optional SSAO/post-processingni low-endda o‘chir,
- LOD,
- instancing,
- texture compression.

Performance panel dev-mode'da:
- FPS,
- draw calls,
- triangles,
- geometries,
- textures

ko‘rsata olsin.

Productionda yashirin bo‘lsin.

---

# 23. MUHIM EHTIMOLIY BUGLAR — OLDINDAN TEKSHIR

Quyidagilarni "keyin ko‘ramiz" deb qoldirma.

## 3D
- GLB juda katta yoki juda kichik chiqishi
- pivot markazda emas
- bino ground ustida "uchib" qolishi
- bino yerga kirib ketishi
- Y-up / Z-up orientation xatosi
- mirrored model
- inverted normals
- texture missing
- texture washed-out
- material black
- transparent material sorting
- shadow acne
- peter-panning
- z-fighting
- far/near clipping
- lightmap/emissive noto‘g‘ri

## Editor
- click select camera drag sifatida ketishi
- object drag camera orbitni harakatlantirishi
- delete noto‘g‘ri assetni o‘chirishi
- selection stale qolishi
- undo/redo state corruption
- duplicate bir xil ID olishi
- save/load transform drift
- scale zero yoki negative bo‘lib model yo‘qolishi
- object ground ostiga tushishi
- accidental placement double-click

## Asset loading
- 404
- CORS
- expired signed URL
- malformed GLB
- Draco decoder missing
- KTX2 transcoder path missing
- slow network
- cancelled load
- WebGL context lost

## Mobile
- pinch browser zoom bilan konflikt
- scroll page vs scene pan
- small buttons
- memory pressure
- GPU crash
- orientation resize

## Provider
- API key missing
- invalid key
- credit insufficient
- 429 rate limit
- provider 5xx
- generation stuck
- polling infinite loop
- malformed result URL
- provider task succeeded but model download failed

Har biriga graceful error UX va log bo‘lsin.

---

# 24. ERROR BOUNDARIES VA RECOVERY

3D scene crash qilsa butun app oq ekran bo‘lmasin.

- React ErrorBoundary
- asset-level fallback placeholder
- "Reload asset"
- "Remove broken asset"
- autosaved project recovery
- last-known-good scene state

bo‘lsin.

---

# 25. AUTOSAVE VA PROJECTLAR

MVP:
- local persistence (IndexedDB yoki browser storage, scene hajmiga qarab)
- explicit Save
- autosave debounce

Backend qo‘shilganda:
- Projects
- Scenes
- Assets

strukturasi bo‘lsin.

Kelajak multi-clinic:
```text
Organization
  Project / Clinic
    Scene
    Asset Library
    Users
```

ga kengayishi mumkin.

Hozir auth/multi-tenantni to‘liq qurish shart emas, lekin data modelni kelajakni berkitadigan qilib yozma.

---

# 26. UI LAYOUT

Video source-of-truth.

Agar videoda noaniq bo‘lsa, default:
- center = 3D viewport,
- left = Asset Library / build tools,
- right = selected object properties,
- top = project/save/undo/redo,
- bottom/right = camera controls only if necessary.

UI 3D sahnani yopib tashlamasin.

No-code feeling:
- icon + short label,
- professional tooltip,
- obvious hover/active states,
- destructive action confirmation faqat kerak joyda.

---

# 27. FIRST-RUN EXPERIENCE

Foydalanuvchi dasturchi emas.

Birinchi ochilganda:
- sample scene avtomatik load bo‘lsin,
- "Bino qo‘shish" aniq,
- "Rasm → 3D" aniq,
- "GLB import" aniq,
- camera controls qisqa hint.

Dev console'ga qarash talab qilinmasin.

---

# 28. PHASELAR VA ACCEPTANCE GATELAR

## PHASE 0 — Discovery / Tooling
Bajar:
- attachments tahlili,
- environment check,
- package/version compatibility,
- repo structure,
- docs,
- lint/typecheck/test baseline.

**Gate 0:** app clean start qiladi, test/build ishlaydi.

---

## PHASE 1 — Video Interaction Replica Skeleton
Avval oddiy primitive/placeholderlar bilan:
- camera,
- pan/zoom/rotate (videoga qarab),
- selection,
- placement,
- move/rotate/scale,
- duplicate/delete,
- UI shell,
- undo/redo.

Bu phase'da vizual assetlar mukammal bo‘lishi shart emas.

**Gate 1:** video interactionining P0 qismi ishlaydi.

Playwright orqali:
- object select,
- place,
- move,
- delete,
- undo,
- reload/save

test qil.

---

## PHASE 2 — Reference World
Images 1–6 bilan:
- actual building assets,
- white/snowy ground,
- roads,
- lighting,
- environment,
- city composition.

**Gate 2:** screenshotlar reference olamga yaqin va vizual bir xil tilga ega.

---

## PHASE 3 — Real Scene Editor
- Asset Library
- GLB import
- drag/place
- inspector
- snap
- grid
- autosave
- scene JSON
- project save/load.

**Gate 3:** foydalanuvchi kodga tegmasdan yangi sahna yig‘a oladi.

---

## PHASE 4 — Image-to-3D Integration
- Tripo provider
- Meshy provider adapter
- manual GLB fallback
- queue/progress/error/retry
- preview/confirm/import
- API keys server-side.

**Gate 4:** rasm yuklab, provider orqali GLB kelib, asset libraryga qo‘shilib, scene'ga qo‘yiladi.

Agar API key hozir yo‘q bo‘lsa:
- mock provider + manual GLB bilan feature flow to‘liq ishlasin,
- key berilganda adapter real API'ga ulanadi.

---

## PHASE 5 — Roads / Cars / People
- lane/path graph
- vehicle movement
- simple pedestrians
- parking
- lightweight simulation.

**Gate 5:** sahna "tirik" ko‘rinadi, lekin FPS buzilmaydi.

---

## PHASE 6 — Production Hardening
- asset optimization
- LOD
- instancing
- adaptive quality
- mobile/touch
- error recovery
- persistence migration
- security checks.

**Gate 6:** desktop va mobile acceptance checklistdan o‘tadi.

---

# 29. "1:1 VIDEO" QABUL QILISH USULI

"Ko‘rinishi o‘xshaydi" yetarli emas.

Video tahlilidan keyin:
1. P0 interaction list tuz.
2. Har interaction uchun testable criterion ber.
3. Screenshot checkpoints yarat.
4. Implementationni shu checkpoints bilan solishtir.
5. Kamera speed/zoom/rotationni tuning qil.
6. UI spacing/size/placementni tuning qil.
7. Transition timingsni tuning qil.

Agar video bilan reference rasmlar to‘qnashsa:
- **video — behavior**
- **rasmlar — appearance**

---

# 30. VISUAL REGRESSION

Playwright orqali kamida:
- 1440×900 desktop
- 390×844 mobile

screenshot testlari yarat.

Stable screenshot uchun:
- fixed seed,
- fixed camera,
- fixed time,
- deterministic animation pause/snapshot mode.

GPU/anti-aliasing farqi tufayli pixel-perfect thresholdni realist tanla.

---

# 31. DETERMINISM

Simulation va screenshot testlar reproducible bo‘lsin:
- random seed abstraction,
- seeded vehicle spawn,
- fixed test clock.

Har reloadda random boshqa city chiqib acceptance testni buzmasin.

---

# 32. GIT WORKFLOW

Agar repo git bo‘lsa:
- destructive rewrite qilma.
- phase boshida status tekshir.
- kichik logical commits.
- har Gate'da checkpoint commit.

Masalan:
```text
feat(editor): add camera and selection
feat(editor): add placement and transforms
feat(scene): add serializable scene schema
feat(assets): add glb import pipeline
feat(ai3d): add provider abstraction
test(e2e): add editor smoke flow
perf(scene): add instancing and lod
```

Userning existing o‘zgarishlarini revert qilma.

---

# 33. CLAUDE CODE O‘ZI ISHNI TEKSHIRISHI SHART

Har phase oxirida:
```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Project scriptlari boshqa bo‘lsa ularga moslash.

Keyin Playwright/screenshot.

Xato chiqsa:
- userga tashlab qo‘yma,
- logni o‘qi,
- root cause top,
- tuzat,
- qayta test qil.

"Build passed" — faqat command haqiqatan success bo‘lsa yoz.

---

# 34. ISHNI TO‘XTATMASLIK QOIDASI

Bitta yechim ishlamasa darrov "bo‘lmaydi" deme.

Misol:
- Orthographic camera video bilan mos kelmasa → Perspective + restricted controls test qil.
- Tripo output yomon bo‘lsa → multiview yoki Meshy adapter test qil.
- Draco muammo bersa → Meshopt yoki uncompressed fallback.
- KTX2 device'da muammo bersa → WebP texture fallback.
- high-poly GLB FPSni tushirsa → decimate + LOD.
- automatic road mesh yomon bo‘lsa → modular road segments.
- physics traffic unstable bo‘lsa → deterministic waypoint traffic.

Lekin xizmat/pullik API ishlatish uchun userda credential/credit kerak bo‘lsa, yashirmasdan ayt.

---

# 35. USERGA QANDAY HISOBOT BERASAN

User dasturchi emas.

Har phase tugagach juda qisqa:
- nima tayyor,
- ekranda nimani bosib tekshiradi,
- nima hali keyingi phase,
- agar undan bitta narsa kerak bo‘lsa aynan nimani yuborishi kerak.

Uzun terminal logni userga bermagin.

---

# 36. HOZIR QILINMAYDIGAN NARSALAR

Scope creep qilma.

Hozir:
- klinika patient management,
- billing,
- medical records,
- katta CRM,
- to‘liq staff tracking backend,
- murakkab multiplayer,
- enterprise auth

qurma.

Bular keyinchalik website/digital twin layer sifatida qo‘shiladi.

**Hozir priority = editor + reference world + reusable asset pipeline.**

---

# 37. FUTURE WEBSITE / DIGITAL TWIN READY

Kelajakda 3D editor/simulation ichiga:
- qavatlar,
- xonalar,
- xodimlar,
- real-time location,
- dashboard,
- notifications,
- statistics,
- admin

qo‘shiladi.

Shu sabab:
- SceneEntity metadata extensible bo‘lsin.
- Building / Floor / Room ID tushunchasini keyin qo‘shishga to‘sqinlik qilma.
- 3D engine UI/business data'dan ajratilgan bo‘lsin.

---

# 38. ACCEPTANCE CHECKLIST — USER QABUL QILISHIDAN OLDIN

## Video fidelity
- [ ] kamera feel videoga yaqin
- [ ] placement flow videoga yaqin
- [ ] selection/highlight videoga yaqin
- [ ] UI behavior videoga yaqin
- [ ] transitions jerk qilmaydi

## Visual world
- [ ] referens rasmlardagi miniature/isometric ruh
- [ ] binolar bir palette/oilada
- [ ] clinic dominant focal asset bo‘lishi mumkin
- [ ] roads/buildings intersect qilmaydi
- [ ] parking road ustiga chiqmaydi
- [ ] props ground bilan to‘g‘ri contactda
- [ ] shadow direction consistent

## Editor
- [ ] add
- [ ] select
- [ ] move
- [ ] rotate
- [ ] scale
- [ ] duplicate
- [ ] delete
- [ ] undo/redo
- [ ] save/load
- [ ] autosave
- [ ] GLB import

## AI asset generation
- [ ] image upload
- [ ] job status
- [ ] generation
- [ ] preview
- [ ] GLB ingestion
- [ ] failure/retry
- [ ] manual import fallback

## Performance
- [ ] no constant React state updates in frame loop
- [ ] repeated props instanced where appropriate
- [ ] GLBs optimized
- [ ] mobile quality adapts
- [ ] no obvious memory leak after repeated add/delete

## Reliability
- [ ] missing asset does not blank entire app
- [ ] reload restores autosave
- [ ] provider failure has human-readable error
- [ ] API key never in client bundle

---

# 39. RESEARCH REFERENCES — OFFICIAL DOCS

Implementation vaqtida kerak bo‘lsa shu official manbalarni tekshir va aktual API'ni ulardan ol:

### React Three Fiber
- https://r3f.docs.pmnd.rs/
- https://r3f.docs.pmnd.rs/advanced/pitfalls
- https://r3f.docs.pmnd.rs/advanced/scaling-performance
- https://r3f.docs.pmnd.rs/tutorials/loading-models

### Three.js
- https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- https://threejs.org/docs/#api/en/objects/InstancedMesh
- https://threejs.org/docs/#examples/en/loaders/DRACOLoader
- https://threejs.org/docs/#examples/en/loaders/KTX2Loader

### glTF optimization
- https://gltf-transform.dev/

### Zustand
- https://zustand.docs.pmnd.rs/

### Tripo3D API
- https://developers.tripo3d.ai/
- Image → model
- Multiview → model
- File upload
- Task status

### Meshy API
- https://docs.meshy.ai/
- Image → 3D
- Multi-image → 3D

**API endpointlarni taxmin qilib yozma — implementatsiya kunida official docsni qayta tekshir.**

---

# 40. ISHNI BOSHLASH BUYRUG‘I

Endi quyidagi tartibda ishlagin:

1. Repository/environmentni tekshir.
2. Video va barcha 6 rasmni tahlil qil.
3. `/docs/REFERENCE_ANALYSIS.md` yarat.
4. `/docs/ARCHITECTURE.md` yarat.
5. `/docs/IMPLEMENTATION_PLAN.md` yarat.
6. `/docs/ACCEPTANCE_CRITERIA.md` va `/docs/KNOWN_RISKS.md` yarat.
7. Mavjud loyiha bo‘lsa uni audit qil; yo‘q bo‘lsa stable React + TypeScript + Vite + stable R3F project yarat.
8. PHASE 1ni bajar.
9. Test/build/screenshot bilan tekshir.
10. Gate 1 o'tmaguncha PHASE 2ga o'tma.
11. Har phase'da shu tartibni takrorla.
12. Ish davomida foydalanuvchidan keraksiz texnik tanlov so‘rama.
13. "Tayyor" demasdan oldin acceptance checklistni real test bilan tekshir.

## Eng muhim yakuniy prinsip

**Biz bir martalik demo yasamayapmiz.**
**Biz foydalanuvchi keyingi klinikani ham o‘zi tez yig‘a oladigan reusable 3D editor/engine yasayapmiz.**

Video — workflow.
Referens rasmlar — dunyo.
GLB assetlar — qurilish bloklari.
Image-to-3D providerlar — tez asset ishlab chiqarish mexanizmi.
Scene schema — kelajakdagi product platformaning poydevori.

Ishni professional software team kabi olib bor.
