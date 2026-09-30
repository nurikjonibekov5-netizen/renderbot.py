# Klinika 3D nazorati

4 qavatli klinikaning **raqamli egizagi**. Kompyuter ekranida klinika binosi 3D ko'rinishda turadi,
xodimlar esa kichkina kubik odamchalar bo'lib, qaysi qavat va qaysi xonada ekani ko'rinib turadi.

Hozir dastur **simulyatsiya rejimida** ishlaydi: nishon (beydj) va qabul qiluvchi qurilmalar hali yo'q,
shuning uchun soxta xodimlar real ishga o'xshab yuradi.

## Nimalar bor (1-bosqich)

- **Bino ko'rinishi:** sayt ochilganda klinika binosi tashqaridan, atrofi bilan ko'rinadi.
  Qavatni bossangiz, kamera silliq yaqinlashadi va o'sha qavat ichi ochiladi.
- **Qavat tanlagich (o'ngda):** 🏢 Bino, 4F, 3F, 2F, 1F va ☰ Barchasi. Qavat tanlanganda faqat o'sha qavat ko'rinadi.
- **Xodimlar:** lavozim rangidagi kubik odamchalar, boshi ustida ismi. Oyog'i ostidagi halqa holatni bildiradi:
  yashil - yurmoqda, ko'k - turibdi, sariq - uzoq vaqt harakatsiz, kulrang - signal yo'q.
- **Xodim paneli:** odamchani bosganda chapda ochiladi. Unda qavat, xona, shu joyda qancha vaqtdan beri turgani,
  bugungi faollik foizi, smena va kunlik tasma bor.
- **Qidiruv:** tepada "Dilnoza qayerda?" deb yozing. Kamera o'sha xodim oldiga uchib boradi.
- **Filtr:** chapda lavozimni bossangiz, faqat shu lavozimdagilar ko'rinadi.
- **Faollik:** "Xodimlar" bo'limida jadval, "Faollik" bo'limida kunlik tasma, "Hisobot" bo'limida Excel fayl.
- **Maxfiy zonalar** (hojatxona, kiyinish xonasi): bu yerda faqat qavat ko'rsatiladi, aniq xona hech qayerga yozilmaydi.
- **Parol:** faqat parolni biladigan rahbar va administrator kiradi.

## Kompyuterda ishga tushirish

1. **Node.js** o'rnating: <https://nodejs.org>, LTS versiyasi (22.13 yoki undan yangi).
2. Loyiha papkasini oching.
   - **Windows:** `ishga_tushirish.bat` faylini ikki marta bosing.
   - **Mac / Linux:** terminalda `./ishga_tushirish.sh` ni ishga tushiring.
3. Birinchi marta kutubxonalar yuklanadi (bir necha daqiqa). Keyin brauzerda `http://localhost:8080` ochiladi.
4. **Parol:** birinchi ishga tushishda dastur parolni o'zi yaratadi. U qora oynada ko'rinadi va
   `data/parol.txt` faylida saqlanadi. O'z parolingizni qo'ymoqchi bo'lsangiz, `sozlamalar.json` dagi
   `"parol"` qatoriga yozing.

To'xtatish uchun qora oynani yoping (yoki `Ctrl + C`).

## Ro'yxatlarni o'zgartirish

Hammasi `data/` papkasida, Excel'da ochsa bo'ladigan CSV fayllarda:

| Fayl | Nima |
|---|---|
| `xonalar.csv` | Klinikaning haqiqiy xonalari (`obyekt_nomi` 3ds Max'dagi nom bilan bir xil) |
| `xodimlar.csv` | Haqiqiy xodimlar, lavozim, asosiy xona, smena |
| `lavozimlar.csv` | Lavozim rangi, harakat normasi (%), ish zonalari |
| `namuna_xonalar.csv`, `namuna_xodimlar.csv` | Sinov uchun soxta xona va xodimlar |

Soxta ma'lumotlarni o'chirish: `sozlamalar.json` da `"namuna_malumotlar": false`.
O'zgartirgandan keyin dasturni qayta ishga tushiring. Xato bo'lsa, chap paneldagi **⚠ Ogohlantirishlar** da ko'rinadi.

## 3ds Max modellari

Har qavat modelini `models/qavat_1.glb` … `models/qavat_4.glb` nomi bilan qo'ying.
Batafsil: [models/README.md](models/README.md). Model bo'lmagan qavat vaqtincha bloklar bilan chiziladi.

## Faollik foizi qanday hisoblanadi

Har lavozimning o'z harakat normasi bor (`lavozimlar.csv`): sanitarka 70%, shifokor 20% va hokazo.

**Faollik = 60% × (harakat ulushi ÷ norma, ko'pi bilan 1) + 40% × (ish zonasida o'tgan vaqt ulushi)**

Masalan, shifokor vaqtining 20% ida harakatlanib, qolgan vaqtni kabinetida o'tkazsa, faolligi ~100% bo'ladi.
Bu **yordamchi ko'rsatkich**, jazo uchun emas.

## Sozlamalar (`sozlamalar.json`)

| Kalit | Ma'nosi |
|---|---|
| `rejim` | `simulyatsiya` (hozir) yoki `haqiqiy` (qurilmalar ulanganda) |
| `namuna_malumotlar` | soxta xona va xodimlarni qo'shish |
| `port` | brauzer manzilidagi raqam (standart 8080) |
| `parol` | kirish paroli (bo'sh bo'lsa, dastur o'zi yaratadi) |
| `qabul_qiluvchi_kaliti` | ESP32 qurilmalari uchun maxfiy kalit |
| `tarix_saqlash_kunlari` | joylashuv tarixi necha kun saqlanadi (standart 90) |
| `uzoq_harakatsizlik_daqiqa` | necha daqiqadan keyin "uzoq harakatsiz" deyiladi |
| `model_masshtabi` | 3ds Max modeli juda katta/kichik chiqsa (santimetr: 0.01) |

---

## Dasturchilar uchun

```
npm install          # kutubxonalar
npm run build        # ekran qismini yig'ish (web/dist)
npm start            # server: http://localhost:8080
npm run dev          # ishlab chiqish rejimi (server + vite, http://localhost:5173)
npm test             # yadro va server testlari (node:test)
npm run test:e2e     # brauzer testlari (Chromium kerak, CHROME_PATH)
npm run build:demo   # serversiz namunaviy versiya (dist-demo/)
```

### Tuzilma

```
shared/        yadro: server va brauzerda bir xil ishlaydi
  clinic.js      CSV ro'yxatlardan klinika tuzilmasi
  simulation.js  soxta xodimlar harakati
  tracker.js     joylashuv, holatlar, faollik, kunlik tasma
  receivers.js   ESP32 signallaridan xonani aniqlash (haqiqiy rejim)
  engine.js      hammasini bog'lovchi yadro
  layout.js      avtomatik qavat chizmasi
server/        Node.js: HTTP + WebSocket, parol, SQLite tarix
web/src/
  state/         useClinicData - ma'lumot oqimi
  layout/        AppLayout, TopBar, SidePanel
  scene/         BuildingScene (React) + engine/ (Three.js)
    engine/ClinicScene.js  ko'rinishlar (bino / qavat / barchasi), kamera, odamchalar
    engine/exterior.js     binoning tashqi ko'rinishi
    engine/site.js         atrof: yo'llar, daraxtlar, qo'shni binolar
    engine/interior.js     qavat ichi: shisha devorlar, mebel
    engine/characters.js   kubik odamchalar
    engine/gltf.js         3ds Max GLB modellarini yuklash
  components/    FloorSelector, SearchBar, FiltersPanel, EmployeeInfoCard,
                 StatsStrip, ViewHeader, TodayPanel, Timeline, Login
models/        3ds Max GLB fayllari uchun joy
data/          CSV ro'yxatlar, tarix bazasi (tarix.db)
```

### Haqiqiy qurilmalar (keyingi bosqich)

`rejim: "haqiqiy"` bo'lganda qabul qiluvchilar `POST /api/signal` ga yuboradi
(`X-Kalit` sarlavhasida `qabul_qiluvchi_kaliti`):

```json
{ "nishon": "dilnoza-karimova", "xona": "ROOM_2_204_Palata", "rssi": -61, "harakat": true }
```

Bir nechta signalni massiv qilib yuborish mumkin. Eng kuchli eshitgan xona tanlanadi,
devor orqali "sakrashlar" 10 soniyalik o'rtacha va 4 dB farq bilan silliqlanadi.
