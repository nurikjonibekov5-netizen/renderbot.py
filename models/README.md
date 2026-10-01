# 3ds Max modellari uchun joy

Bu papkaga har bir qavatning 3D modelini **GLB** formatda qo'yasiz. Fayl qo'yilmagan qavatni dastur
xonalar ro'yxatidan oddiy qutichalar ko'rinishida o'zi chizadi.

## Fayl nomlari

| Qavat | Fayl nomi |
|---|---|
| 1-qavat | `qavat_1.glb` |
| 2-qavat | `qavat_2.glb` |
| 3-qavat | `qavat_3.glb` |
| 4-qavat | `qavat_4.glb` |

Faylni qo'ygandan keyin brauzerda sahifani yangilang (F5). Serverni qayta ishga tushirish shart emas.

## 3ds Max'da nimalarga e'tibor berish kerak

1. **Har bir xona alohida obyekt.** Nomi qoida bo'yicha: `ROOM_<qavat>_<raqam>_<Nomi>`.
   Masalan: `ROOM_2_205_Operatsion`, `ROOM_1_CORR_Koridor`, `ROOM_2_WC1_Hojatxona`.
   Nom `data/xonalar.csv` faylidagi `obyekt_nomi` ustuni bilan **harfma-harf bir xil** bo'lishi kerak.
2. **Xona obyekti:** xonaning poli (tekis plita) yoki xona hajmi (quti) bo'lishi mumkin. Dastur uning
   o'rtasi va o'lchamidan xonani taniydi. Hajm (quti) bo'lsa, ichidagi odamchalar ko'rinishi uchun
   dastur uni yarim shaffof qiladi.
3. **Koridor ham xona:** har qavatda `ROOM_<qavat>_CORR_Koridor` bo'lsin. Odamchalar xonadan xonaga shu
   koridor orqali yuradi.
4. **Zinapoya (ixtiyoriy):** zinapoya obyektini `ZINA_<qavat>` deb nomlasangiz (masalan `ZINA_2`),
   odamchalar qavatdan qavatga shu joy orqali o'tadi. Bo'lmasa, koridor uchidan o'tadi.
5. **Shift va tom qo'ymang.** Bino tepadan ko'rinadi, shift bo'lsa ichi ko'rinmaydi.
6. **Hamma qavatlar bir xil nuqtaga nisbatan** chizilsin (masalan, zinapoya har qavatda bir joyda
   bo'lsin). Qavat balandligi muhim emas, dastur qavatlarni o'zi joylashtiradi.
7. **O'lchov birligi:** santimetr, millimetr yoki metr. Dastur o'zi aniqlaydi. Agar model juda katta
   yoki juda kichik chiqsa, `sozlamalar.json` dagi `model_masshtabi` ga qiymat yozing
   (santimetr uchun `0.01`, millimetr uchun `0.001`).

## Eksport qilish (3ds Max)

1. `File → Export → Export...` (yoki `Export Selected`, faqat bitta qavatni belgilab).
2. Fayl turi: **glTF Binary (*.glb)**. 3ds Max 2023 va undan yangi versiyalarda bor.
   Eski versiyada **Babylon.js exporter** plaginini o'rnatib, GLB tanlang.
3. Nomini `qavat_1.glb` kabi qo'yib, shu papkaga saqlang.

## Tekshirish

Model qo'yilgach, ekranning pastki o'ng burchagida "3D model: 2-qavat 3ds Max faylidan" yozuvi chiqadi.
Agar modelda ro'yxatdagi biror xona topilmasa yoki ortiqcha xona bo'lsa, chap paneldagi
**⚠ Ogohlantirishlar** bo'limida ro'yxati ko'rinadi.

Sinov uchun namunaviy fayl yasash (dasturchilar uchun):
`node scripts/namuna-glb.js 2 models/qavat_2.glb --santimetr`

## Klinika atrofidagi binolar (`models/atrof/`)

Atrofdagi binolar (qo'shni uylar, zavod, minora) shu papkada turadi. Ular faqat chiroy uchun, xodimlar bilan bog'liq emas.

| Fayl | Bino |
|---|---|
| `uch_qavatli.glb` | 3 qavatli bino (klinika orqasida) |
| `majmua.glb` | Tutash korpusli majmua (chap tomonda) |
| `minora.glb` | Baland minora (orqa-chapda) |
| `texnik_bino.glb` | G'ishtli texnik bino, ikki mo'rili (orqa-o'ngda) |

Qaysi bino qayerda turishi `joylashuv.json` faylida yozilgan:

- `x` - o'ngga (+) yoki chapga (−), metrda; klinika markazi 0;
- `z` - oldinga (+) yoki orqaga (−), metrda;
- `burilish` - gradusda (masalan 90).

Yangi bino qo'shish: GLB faylni shu papkaga qo'ying va `joylashuv.json` dagi ro'yxatga yangi qator qo'shing.
Model qaysi joyga qo'yilsa, o'sha joydagi oddiy oq qutichalar va daraxtlar o'zi olib tashlanadi.
Ko'p mayda bo'lakdan iborat modellar yuklashda avtomatik birlashtiriladi, shuning uchun sayt sekinlashmaydi.
