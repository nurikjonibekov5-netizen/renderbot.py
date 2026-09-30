# Klinika 3D nazorati: g'oya hujjati

*To'liq konsepsiya, 1-versiya (2026-yil sentabr)*

---

## 1. Muammo

Klinikamiz 4 qavatli binoda joylashgan. Unda turli lavozimdagi xodimlar ishlaydi: shifokorlar, hamshiralar, sanitarkalar, laborantlar, oshpazlar, administratorlar.

Hozir rahbar quyidagilarni bilmaydi:
- qaysi xodim hozir qaysi qavatda va qaysi xonada ekanini;
- kim kun davomida qanchalik faol ishlaganini;
- qaysi qavatda xodim yetishmayotganini;
- xonalar qachon tozalanganini;
- kim ishga qachon kelib, qachon ketganini.

Buni bilish uchun odam yuborish yoki telefon qilish kerak bo'ladi. Bu vaqt oladi va aniq javob bermaydi.

---

## 2. Yechim: klinikaning "raqamli egizagi"

Kompyuter ekranida **klinika binosining aniq 3D nusxasi** turadi. U o'yin ko'rinishida bo'ladi: qavatlar, xonalar va koridorlar haqiqiy binodagidek, xona nomlarigacha bir xil.

Bu bino ichida har bir xodim **kichkina o'yinchoq odamcha** bo'lib yuradi. Boshining ustida ismi yozilgan, rangi lavozimini bildiradi. Xodim haqiqatda boshqa xonaga o'tsa, ekrandagi odamcha ham o'sha xonaga yurib o'tadi.

Rahbar bir qarashda butun klinikani ko'radi: kim qayerda, nima qilyapti, qaysi qavat bo'sh qolgan.

---

## 3. Qanday ishlaydi

### 3.1. 3D bino
- Bino 3ds Max'da modellanadi. Har bir qavat alohida fayl, GLB formatda eksport qilinadi.
- Har bir xona alohida obyekt bo'ladi, qoida bo'yicha nomlanadi: `ROOM_<qavat>_<raqam>_<Nomi>`, masalan `ROOM_2_205_Operatsion`.
- Dastur shu nomlardan xonalarni o'zi taniydi.
- Ta'mirdan keyin bino o'zgarsa, faqat model fayli yangilanadi.

### 3.2. Xodimni aniqlash
Issiqlik datchigi odamning **kimligini** bilmaydi, telefon GPS'i esa bino ichida qavatni ajrata olmaydi. Shuning uchun quyidagi usul tanlangan:

- **BLE nishon.** Har bir xodim ko'kragiga kichik nishon (beydj) yoki bilaguzuk taqadi. Nishon ichida akselerometr bor, u harakatni sezadi.
- **Qabul qiluvchi.** Har bir xona va koridorga kichik qurilma o'rnatiladi (ESP32 plata). U yaqin atrofdagi nishonlarni "eshitadi".
- **Server.** Qaysi qabul qiluvchi nishonni eng kuchli eshitsa, xodim o'sha xonada deb hisoblanadi. Nishon harakat haqidagi ma'lumotni ham yuboradi.
- **Ekran.** Server ma'lumotni real vaqtda 3D binoga uzatadi.

```
[Xodim + nishon] → [Xonadagi qabul qiluvchi] → [Server + baza] → [Ekrandagi 3D bino]
```

### 3.3. Simulyatsiya rejimi
Qurilmalar sotib olinmasidan oldin dastur **soxta xodimlar** bilan ishlaydi. Ular real ishga o'xshab yuradi: sanitarka kun bo'yi koridorlarda, laborant laboratoriyada, oshpaz oshxonada. Shu tariqa tizimni qurilmalarga pul sarflamasdan to'liq sinab ko'rish mumkin.

---

## 4. 1-bosqich: xodimlar joylashuvi

- 3D bino: aylantirish, yaqinlashtirish, qavatlarni alohida yoki birga ko'rish.
- Lavozimga qarab rangli odamchalar, boshi ustida ismi.
- Holatlar: yurmoqda, turibdi, uzoq vaqt harakatsiz, signal yo'q.
- Odamchani bosganda kartochka ochiladi: ism, lavozim, xona, shu xonada qancha vaqtdan beri turgani, bugungi faollik foizi.
- Qidiruv: "Dilnoza qayerda?" deb yozilsa, kamera o'sha xonaga uchib boradi.
- Lavozim bo'yicha filtr, har qavatdagi xodimlar soni.
- **Maxfiy zonalar** (hojatxona, kiyinish xonasi): bu yerda faqat qavat ko'rsatiladi, aniq xona ko'rsatilmaydi.

---

## 5. Kunlik faollik

### Maqsad
Har bir xodim kun davomida qanchalik faol bo'lganini foizda ko'rish.

### Asosiy tamoyil
**Faollik lavozimga qarab baholanadi.** Sanitarka kun bo'yi yurib pol yuvadi, shifokor esa kabinetda o'tirib bemor qabul qiladi. Ikkalasi ham ishlayapti. Shuning uchun har bir lavozimning o'z normasi bor:

| Lavozim | Harakat normasi | Ish zonalari |
|---|---|---|
| Sanitarka | ~70% | barcha xona va koridorlar |
| Oshpaz | ~50% | oshxona |
| Hamshira | ~45% | palatalar, protsedura, post |
| Laborant | ~25% | laboratoriya |
| Shifokor | ~20% | kabinet, palata, operatsion |

*Bu raqamlar boshlang'ich taxmin. Haqiqiy ma'lumot to'plangach, ular o'zgartiriladi.*

### Nimalar o'lchanadi
- harakatda o'tgan vaqt;
- o'z ish zonasida o'tgan vaqt;
- dam olish zonasida o'tgan vaqt;
- uzoq harakatsizlik davrlari;
- qadamlar soni va taxminiy bosib o'tilgan masofa;
- kirilgan xonalar soni.

Shulardan lavozim normasiga nisbatan **faollik foizi** hisoblanadi.

### Ko'rinishi
- **"Bugun" jadvali:** barcha xodimlar faollik foizi bo'yicha saralangan holda.
- **Kunlik tasma:** xodim qaysi soatda qaysi xonada bo'lgani, harakatlanganmi yoki turganmi, ranglar bilan.
- **Haftalik va oylik grafiklar.**
- **Hisobotni Excel'ga yuklash.**

---

## 6. Qo'shimcha imkoniyatlar

### Tez foyda beradiganlar
- **Avtomatik davomat.** Xodim binoga kirgan va chiqqan vaqti o'zi yoziladi, kechikishlar ko'rinadi.
- **Tozalash nazorati.** Har bir xona oxirgi marta qachon tozalangani ko'rinadi. Uzoq tozalanmagan xona ekranda qizaradi.
- **Kunni qayta ko'rish.** Vaqt chizig'ini surib, o'tgan kunda kim qayerda bo'lganini ko'rish mumkin.
- **Issiqlik xaritasi.** Qaysi joylarda eng ko'p vaqt o'tkazilishini ko'rsatadi.
- **Telegram hisobot.** Har kuni kechqurun rahbarga qisqa xulosa keladi.
- **Smena rejasi bilan solishtirish.** Smenada bo'lishi kerak, lekin binoda yo'q xodimlar ko'rinadi.
- **Xodim yetishmasligi ogohlantirishi.** Masalan: "3-qavatda 10 daqiqadan beri hamshira yo'q."

### Xavfsizlik va tartib
- **Ruxsatsiz zona ogohlantirishi.** Operatsion yoki laboratoriyaga ruxsati yo'q odam kirsa, xabar keladi.
- **SOS tugmasi.** Nishondagi tugma bosilsa, eng yaqin xodimlarga xabar boradi.
- **Eng yaqin xodimni topish.** Masalan: "205-xonaga eng yaqin hamshira kim?"

---

## 7. 2-bosqich: bemorlar

- **Palata bandligi.** Qaysi palata bo'sh yoki band ekanini rang bilan ko'rsatish.
- **Bemorlarni ko'rish.** Xonada odam borligini issiqlik yoki harakat datchiklari aniqlaydi, nishon kerak emas.
- **Bemor chaqiruv tugmasi.** Palatadan chaqiruv tushadi va hamshira qanchalik tez yetib kelgani o'lchanadi.
- **Kutish vaqti.** Bemor qabulxonadan shifokorgacha qancha kutgani.

## 8. Uzoq muddatli g'oyalar

- **Uskunalarni kuzatish.** Arava, EKG apparati va boshqa ko'chma jihozlarga nishon osib, ular qayerdaligini bilish.
- **Telefon ilovasi.** Rahbar uyda turib ham klinikani ko'ra oladi.
- **Ish yuklamasi tahlili.** Qaysi bo'limga qo'shimcha xodim kerakligini ma'lumot asosida aniqlash.

---

## 9. Kerakli qurilmalar va dastur

| Qism | Nima | Soni |
|---|---|---|
| Nishon | Akselerometrli BLE beydj yoki bilaguzuk | har xodimga 1 ta + zaxira |
| Qabul qiluvchi | ESP32 plata + quvvat bloki | har xona va koridorga 1 ta |
| Server | Oddiy kompyuter yoki mini-PC | 1 ta |
| Ekran | Rahbar kompyuteri yoki devordagi televizor | 1+ |
| Dastur | React + Three.js (3D), Node.js (server), SQLite (baza) | Claude Code yozadi |

*Narxlar bozorga qarab o'zgaradi, sotib olishdan oldin aniqlashtirish kerak. Nishon odatda bir necha dollardan, ESP32 esa har bir xonaga taxminan 5–15$ turadi.*

---

## 10. Maxfiylik va qoidalar

- **Xodimlarning yozma roziligi olinadi.** Kuzatish haqida oldindan tushuntiriladi.
- **Maxfiy zonalarda** aniq joy ko'rsatilmaydi.
- **Joylashuv tarixi** cheklangan muddat saqlanadi (standart 90 kun), keyin avtomatik o'chadi.
- **Kirish huquqi:** faqat rahbar va administrator.
- **Faollik foizi yordamchi ko'rsatkich, jazo quroli emas.** U ish taqsimotini to'g'rilash uchun ishlatiladi. Aks holda xodimlar nishonni joyida qoldirib ketish kabi yo'llar bilan tizimni "aldashadi".

---

## 11. Amalga oshirish rejasi

1. **3D model.** Nurik 4 qavatni 3ds Max'da modellab, GLB qilib eksport qiladi. Xonalar va xodimlar ro'yxati tayyorlanadi.
2. **Dastur (simulyatsiya).** Claude Code 3D binoni, soxta xodimlarni va faollik modulini quradi.
3. **Sinov.** Simulyatsiya rejimida ko'rinish va hisobotlar tekshiriladi, kamchiliklar tuzatiladi.
4. **Pilot.** Bitta qavatga 5–10 ta nishon va qabul qiluvchilar o'rnatiladi, haqiqiy ma'lumot bilan sinaladi.
5. **Kengaytirish.** Butun binoga tarqatiladi, lavozim normalari haqiqiy ma'lumotga qarab moslanadi.
6. **Qo'shimchalar.** Tanlangan qo'shimcha imkoniyatlar va 2-bosqich (bemorlar) qo'shiladi.

---

## 12. Xavflar va ularning yechimi

| Xavf | Yechim |
|---|---|
| Signal devordan o'tib, xodim qo'shni xonada ko'rinadi | Signalni silliqlash, qabul qiluvchilarni to'g'ri joylashtirish, pilotda sozlash |
| Xodim nishonni taqmaydi yoki qoldirib ketadi | Rozilik va tushuntirish; uzoq harakatsiz nishonga ogohlantirish |
| Nishon batareyasi tugaydi | Batareya past ekani haqida ogohlantirish |
| Xodimlar noroziligi | Maqsadni ochiq tushuntirish, maxfiy zonalar, foizni jazo uchun ishlatmaslik |

---

## 13. Muvaffaqiyat mezonlari

- Rahbar istalgan xodimni **10 soniyadan kam vaqtda** topa oladi.
- Joylashuv **xona darajasida** to'g'ri ko'rsatiladi (pilotda tekshiriladi).
- Kunlik faollik va davomat hisoboti **qo'lda hech narsa kiritmasdan** tayyor bo'ladi.
- Tozalanmagan xonalar va xodim yetishmayotgan qavatlar **darhol ko'rinadi**.
