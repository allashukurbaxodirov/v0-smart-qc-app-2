# Smart QC — Loyiha Rejasi

> Bu fayl loyihaning barcha muhim ma'lumotlarini o'z ichida saqlaydi.
> Har bir vazifa bajarilgach `[x]` qilib belgilang.

---

## 🔐 Muhim Ma'lumotlar

### GitHub
- **Repo:** https://github.com/allashukurbaxodirov/v0-smart-qc-app-2
- **Token:** `ghp_xxxx_TOKEN_GITHUBDAN_OLING`
- Push usuli:
  ```bash
  git add -A
  git commit -m "..."
  git push origin main
  ```

### Supabase
- **URL:** https://ndzbbhsipesblskmsfnu.supabase.co
- **DB Password:** `Ollashukur2004`
- **Connection string:**
  ```
  postgresql://postgres:Ollashukur2004@db.ndzbbhsipesblskmsfnu.supabase.co:5432/postgres
  ```
- **Dashboard:** https://supabase.com/dashboard/project/ndzbbhsipesblskmsfnu

### .env.local (lokal kompyuterda yaratiladi, GitHubga chiqmaydi)
```
DATABASE_URL=postgresql://postgres:Ollashukur2004@db.ndzbbhsipesblskmsfnu.supabase.co:5432/postgres
```

### Login hisoblar (test uchun)
| Email | Parol | Rol |
|-------|-------|-----|
| demo@uzauto.uz | demo123 | Admin |
| gca@uzauto.uz | gca123 | GCA Auditor |
| cmm@uzauto.uz | cmm123 | CMM Inspector |
| d10@uzauto.uz | d10123 | D10 Inspector |
| d20@uzauto.uz | d20123 | D20 Inspector |
| engineer@uzauto.uz | engineer123 | GA Engineer |

---

## 🚀 Yangi kompyuterda loyihani ishga tushirish

```bash
git clone https://github.com/allashukurbaxodirov/v0-smart-qc-app-2.git
cd v0-smart-qc-app-2
npm install
```

`.env.local` fayl yarating (loyiha papkasida):
```
DATABASE_URL=postgresql://postgres:Ollashukur2004@db.ndzbbhsipesblskmsfnu.supabase.co:5432/postgres
```

```bash
npm run dev
# http://localhost:3000
```

---

## ✅ Bajarilgan Ishlar (Sprint 1 & 2)

- [x] `middleware` / `proxy.ts` — `/dashboard` himoyalandi
- [x] `/api/auth` — login/logout server API (httpOnly cookie)
- [x] Login sahifadan hardcoded parollar olib tashlandi
- [x] `/api/me` — sidebar uchun user info endpointi
- [x] Sidebar sessionStorage → cookie/API ga o'tkazildi
- [x] `forgot-password` sahifasi yaratildi
- [x] `ignoreBuildErrors` olib tashlandi
- [x] Geist font to'g'ri ulandi
- [x] `lib/db.ts` — Supabase/postgres.js ulanishi
- [x] `supabase/schema.sql` — DB jadvallari (users, gca_records, defects)
- [x] `/api/gca` — GCA GET/POST/DELETE API
- [x] `lib/gca-context.tsx` — in-memory → real API
- [x] GCA faktor qiymatlari: 5, 10, 20, 50
- [x] `pnpm-lock.yaml` olib tashlandi

---

## 📋 Qilinishi Kerak Bo'lgan Ishlar

### 🗄 Backend & Ma'lumotlar Bazasi

- [ ] **CMM Admin DB ga ulash** — `cmm-admin/page.tsx` uchun `/api/cmm` endpoint
- [ ] **D10 Admin DB ga ulash** — `d10-admin/page.tsx` uchun `/api/d10` endpoint
- [ ] **D20 Admin DB ga ulash** — `d20-admin/page.tsx` uchun `/api/d20` endpoint
- [ ] **GA Engineer DB ga ulash** — `ga-engineer/page.tsx` uchun `/api/ga-issues` endpoint
- [ ] **Users sahifasi DB ga ulash** — `/api/users` CRUD endpoint
- [ ] **Analytics DB ga ulash** — `dailyProduction` mock o'rniga real data
- [ ] **DB jadvallari qo'shish** — `cmm_records`, `d10_records`, `d20_records`, `ga_issues`
- [ ] **Rasm yuklash** — Supabase Storage bilan integratsiya (barcha admin sahifalar)
- [ ] **Reports API** — hisobotlar real DB dan generatsiya

### 🔒 Xavfsizlik

- [ ] **Parollarni hash qilish** — bcrypt yoki argon2 bilan (hozir plain text)
- [ ] **Rol himoyasi (server side)** — har sahifada cookie dan rol tekshirish
- [ ] **"Parolni unutdim" email** — Nodemailer yoki Resend bilan
- [ ] **Settings saqlash** — sozlamalar DB ga saqlansin

### ⚙️ Biznes Mantiq

- [ ] **GCA filtr tuzatish** — simulatsiya (×0.85) o'rniga haqiqiy SQL filtr
- [ ] **CMM filtr tuzatish** — real DB filtr
- [ ] **D10 filtr tuzatish** — real DB filtr
- [ ] **D20 filtr tuzatish** — real DB filtr
- [ ] **GCA KPI formulasi** — `Math.max(85, 100 - total/500*15)` o'rniga haqiqiy formula
- [ ] **Dashboard KPI** — `kpiData` mock o'rniga real DB sonlar
- [ ] **Top Defects** — DB dan aggregatsiya

### 🎨 UI/UX

- [ ] **Loading skeleton** — API yuklanayotganda skeleton ko'rsatish
- [ ] **Error state UI** — xato bo'lganda toast/banner
- [ ] **Rasm preview** — upload qilganda kichik ko'rinish
- [ ] **Mobil responsive** — kichik ekranda tekshirish
- [ ] **Pagination** — jadvallar uchun (GCA, CMM, D10, D20)

### 🏗 Infratuzilma

- [ ] **turbopack.root** — `next.config.mjs` da belgilash (ogohlantirish yo'qoladi)
- [ ] **Ortiqcha Radix paketlar** — ishlatilmaganlarini olib tashlash
- [ ] **mock-data.ts bo'laklash** — kichik fayllarga ajratish
- [ ] **Environment variables** — `.env.example` fayl yaratish
- [ ] **Production deploy** — Vercel ga deploy qilish

---

## 📁 Loyiha Tuzilishi

```
v0-smart-qc-app-2/
├── app/
│   ├── api/
│   │   ├── auth/route.ts      ✅ Login/logout API
│   │   ├── gca/route.ts       ✅ GCA CRUD API
│   │   └── me/route.ts        ✅ Joriy user API
│   ├── dashboard/
│   │   ├── gca-admin/         ✅ DB ga ulangan
│   │   ├── cmm-admin/         ⏳ Mock data
│   │   ├── d10-admin/         ⏳ Mock data
│   │   ├── d20-admin/         ⏳ Mock data
│   │   ├── ga-engineer/       ⏳ Mock data
│   │   ├── analytics/         ⏳ Mock data
│   │   └── users/             ⏳ Mock data
│   └── login/                 ✅ Xavfsiz
├── lib/
│   ├── db.ts                  ✅ Supabase ulanish
│   ├── gca-context.tsx        ✅ Real API
│   └── mock-data.ts           ⏳ Asta-sekin almashtiriladi
├── supabase/
│   └── schema.sql             ✅ DB schema
├── proxy.ts                   ✅ Route himoyasi
└── PLAN.md                    ✅ Bu fayl
```

---

> **Eslatma:** Bu faylni har doim yangilab boring.
> Har bir vazifa bajarilgach `[ ]` → `[x]` ga o'zgartiring.
