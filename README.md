# 📄 Microsoft Word 365 / 2021 Web Edition (Frontend + Backend)

Ushbu loyiha oddiy HTML/CSS faylini **haqiqiy Microsoft Word** dasturiga aylantirilgan to'liq veb-versiyasidir. Unda **Frontend** (1:1 Microsoft Word lentasi, A4 varaq muharriri, chap navigatsiya paneli, lineyka, status bar) va **Backend** (Node.js REST API, avtomatik saqlash, fayllarni boshqarish, rasm yuklash va eksport) to'liq mujassamlashgan.

---

## 🚀 Ishga Tushirish (Oddiy va Tez)

### 1-usul: `start.bat` orqali (Tavsiya etiladi)
Papka ichidagi **`start.bat`** faylini ikki marta bosing:
- Server avtomatik ishga tushadi
- Standart brauzeringizda `http://localhost:3000` ochiladi

### 2-usul: Terminal orqali
```bash
agy-node server.js
# yoki
node server.js
```
Brauzerda: `http://localhost:3000` manziliga kiring.

### 3-usul: Serversiz to'g'ridan-to'g'ri (Offline)
Agar serverni yoqmasangiz ham, **`index.html`** faylini to'g'ridan-to'g'ri brauzerda ochishingiz mumkin — dastur avtomatik ravishda **LocalStorage** (brauzer xotirasi) rejimiga o'tadi va barcha ma'lumotlaringiz saqlanib qoladi!

---

## 🌟 1-ga-1 O'xshatilgan Bo'limlar va Imkoniyatlar

### 1. Sarlavha Paneli (Title Bar & Quick Access)
- **Word Logotipi**
- **Avtosaqlash (AutoSave)**: Har bir o'zgarishda serverga avtomatik sinxronizatsiya qiluvchi rejim (Yoniq / O'chiq kaliti va holat ko'rsatkichi).
- **Tezkor kirish paneli (Quick Access Toolbar)**: Saqlash (`Ctrl+S`), Bekor qilish (`Ctrl+Z`), Qaytarish (`Ctrl+Y`), Chop etish (`Ctrl+P`), Yangi hujjat.
- **Hujjat Nomi**: Bosib to'g'ridan-to'g'ri o'zgartirish mumkin, server bilan bog'langan.
- **Qidiruv paneli (Alt+Q)**: Office uslubidagi universal qidiruv (buyruqlar va matn qidirish).
- **Qorong'i / Yengil mavzu almashtirgich**: Microsoft Word Dark Mode va Classic Light Mode.
- **Foydalanuvchi profili va oyna boshqaruv tugmalari** (`-`, `▢`, `✕`).

### 2. Backstage Ko'rinishi (Fayl / File Menyu)
"Fayl" tugmasi bosilganda ochiladigan to'liq ekranli Office menyusi:
- **Ma'lumot (Info)**: Hujjat hajmi, so'zlar, belgilar soni, yaratilgan va o'zgartirilgan vaqti, Read-only himoya qilish.
- **Yangi (New)**: Bo'sh hujjat, Zamonaviy Rezyume (CV), Biznes Hisoboti va Rasmiy Hamkorlik Xati shablonlari.
- **Ochish (Open)**: Serverda saqlangan barcha hujjatlar ro'yxati, kompyuterdan `.html`/`.txt` fayllarni yuklash.
- **Boshqacha saqlash (Save As)**: Yangi nom bilan serverga nusxa saqlash.
- **Eksport (Export)**: PDF sifatida chop etish, Word (.doc) formati, toza matn (.txt) formatida yuklab olish.
- **Chop etish (Print)**.

### 3. Lenta Bo'limlari (Ribbon Bar Tabs)

#### 🅰️ Bosh sahifa (Home)
- **Bufer (Clipboard)**: Qo'yish (Paste), Qirqish (Cut), Nusxa olish (Copy), Format bo'yicha nusxa.
- **Shrift (Font)**:
  - Shrift oilasi (Calibri, Arial, Times New Roman, Segoe UI, Georgia, Courier New va h.k.)
  - Shrift o'lchami (8 dan 72 gacha)
  - Kattalashtirish (A▲), Kichraytirish (A▼), Formatni tozalash (🧹)
  - Qalin (**B**), Qiya (*I*), Tagiga chizilgan (<u>U</u>), Ustiga chizilgan (~~ab~~), Pastki indeks (X₂), Yuqori indeks (X²)
  - Matn foni bo'yash (Highlight marker ranglar palitrasi bilan)
  - Matn rangi (Color picker bilan istalgan rang)
- **Abzas (Paragraph)**:
  - Belgili ro'yxat (Bulleted list)
  - Raqamlangan ro'yxat (Numbered list)
  - Xatboshini kamaytirish / oshirish (Indent / Outdent)
  - Saralash (A-Z)
  - Matnni tekislash: Chapga, Markazga, O'ngga, Kenglik bo'yicha (Justify)
  - Qatorlar oralig'i: 1.0, 1.15, 1.5, 2.0
  - Fonga bo'yoq berish (Shading)
- **Stillar (Styles Gallery)**: Normal, Heading 1, Heading 2, Heading 3, Quote.
- **Tahrirlash (Editing)**: Qidirish, Almashtirish, Hammasini belgilash (`Ctrl+A`).

#### 🅱️ Qo'yish (Insert)
- **Sahifalar**: Bo'sh sahifa qo'shish, Sahifa uzilishi (`Ctrl+Enter`).
- **Jadvallar (Tables)**: 1x1 dan 10x8 gacha bo'lgan interaktiv vizual panjara orqali jadval tanlash + Maxsus qator va ustun kiritish oynasi.
- **Rasmlar (Illustrations)**: Kompyuterdan rasm yuklash (avtomatik server `/uploads` papkasiga yuklanadi) yoki Internet havolasi (URL) orqali rasm qo'yish.
- **Shakllar (Shapes)**: To'rtburchak, Aylana, Gorizontal ajratuvchi chiziq.
- **Havola (Links)**: Matn va URL bilan giperhavola kiritish dialogi (`Ctrl+K`).
- **Kolontitullar**: Yuqori va quyi kolontitul, sahifa raqami.
- **Matn va Belgilar**: Matn bloki (Quote card), Sana va vaqt qo'yish, Maxsus belgilar (Ω, π, ∑, √, ∞, ©, ®, ™ va h.k.).

#### 🅲 Dizayn (Design)
- **Hujjat mavzulari**: Office, Zamonaviy Moviy, Klassik.
- **Suv belgisi (Watermark)**: "MAXFIY", "QORALAMA", "NAMUNA", "SHOSHILINCH" yoki istalgan o'z matningizni sahifa foniga 45° qiya qilib qo'yish.
- **Sahifa rangi**: Varaq fonini oq, qora, krem yoki istalgan rangga o'zgartirish.
- **Sahifa hoshiyalari (Borders)**.

#### 🅳 Sahifa tartibi (Layout)
- **Hoshiyalar (Margins)**: Normal (2.54cm), Tor (1.27cm), O'rtacha, Keng (5cm).
- **Yo'nalish (Orientation)**: Portret (Tik) va Albom (Yotiq).
- **O'lcham (Size)**: A4, Letter, Legal.
- **Ustunlar (Columns)**: 1, 2 yoki 3 ustunli matn tartibi.

#### 🅴 Havolalar (References)
- **Mundarija tuzish (Table of Contents)**: Hujjatdagi barcha H1, H2, H3 sarlavhalarni tahlil qilib, avtomatik bosiladigan (linkli) mundarija hosil qiladi!
- **Snoska kiritish (Footnotes)**: Matn ichiga indeks raqami va sahifa ostiga izoh qo'shadi.

#### 🅵 Taqriz (Review)
- **Imlo tekshiruvi (Proofing)** va **Statistika (Word Count)**: Sahifalar, so'zlar, belgilar, xatboshilar va qatorlar hisoboti.
- **Nutq / O'qib berish (Read Aloud)**: Web Speech API orqali matnni ovoz chiqarib o'qish (Play ▶️, Pause ⏸️, Stop ⏹️).
- **Hujjatni himoyalash (Read-only)**: Hujjatni faqat o'qish rejimiga qulflash.

#### 🅶 Ko'rinish (View)
- **Rejimlar**: Varaq ko'rinishi (Print Layout), Veb ko'rinishi (Web Layout), Fokus rejimi (chalg'ituvchi barcha elementlarni yashirib matnni qoldiradi).
- **Ko'rsatish**: Gorizontal lineyka (Ruler), Chap navigatsiya paneli, Qorong'i varaq rejimi.
- **Masshtab (Zoom)**: 50% dan 200% gacha silliq masshtablash, 100% tugmasi.

#### 🅷 Yordam (Help)
- **Tezkor tugmalar (Shortcuts cheat sheet)**: Ctrl+S, Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Ctrl+P, Ctrl+F, Ctrl+H, Ctrl+K va h.k.

---

### 4. Gorizontal Lineyka (Horizontal Ruler)
Varaq tepasida 0 dan 21 santimetrgacha bo'lgan A4 o'lchov shkalasi, chap va o'ng hoshiya ko'rsatkichlari bilan.

### 5. Chap Navigatsiya Paneli (Navigation Sidebar)
- **Sarlavhalar (Headings)**: Hujjatdagi sarlavhalar daraxtini real vaqtda ko'rsatadi, istalgan birini bossangiz matndagi o'sha joyga silliq siljiydi.
- **Sahifalar (Pages)**: Sahifalarning kichik miniatyura (thumbnail) ko'rinishlari.
- **Natijalar (Results)**: Qidiruv so'zining hujjatdagi barcha uchragan joylarini kontekst bilan ko'rsatadi va bosingiz bilan matn ichida sariq qilib belgilaydi.

### 6. Holat Paneli (Status Bar)
- Sahifa raqami (`Sahifa 1 / 1`)
- So'zlar va belgilar soni (bosilsa batafsil statistika oynasi ochiladi)
- Imlo tekshiruv belgisi (`✓ Xatolarsiz`)
- Til ko'rsatkichi (`O'zbekcha (UZ)`)
- Serverga saqlanganlik holati (`Saqlandi ✓`)
- Varaq / Veb / Fokus rejimlarini almashtirish
- Masshtab slayderi (`[-] ━━━━●━━━━ [+] 100%`)

---

## 🛠️ Backend Arxitekturasi (`server.js`)

Node.js standart kutubxonasi yordamida qurilgan REST API:
- `GET /api/documents`: Barcha saqlangan hujjatlar ro'yxatini qaytaradi
- `GET /api/documents/:id`: Bitta hujjatni to'liq yuklaydi
- `POST /api/documents`: Yangi hujjat yaratadi
- `PUT /api/documents/:id`: Hujjatni saqlaydi va avtosaqlashni amalga oshiradi
- `DELETE /api/documents/:id`: Hujjatni o'chiradi
- `POST /api/upload`: Rasmlarni qabul qilib `/uploads/` papkasiga saqlaydi
- Statik fayllarni (HTML, CSS, JS, rasmlar) brauzerga uzatadi
- Hujjatlar `data/documents/` papkasida JSON formatida ishonchli saqlanadi.
