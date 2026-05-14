/**
 * Foydalanuvchilar uchun global singleton kesh.
 * - globalThis: Next.js HMR da modul qayta yuklanishdan himoya
 * - JSON fayl: server to'liq restart bo'lsa ham ma'lumotlar saqlanadi
 */

import fs   from 'fs'
import path from 'path'

export interface CachedUser {
  id: string
  tabelNumber: string
  email: string | null
  password: string
  name: string
  role: string
  created_at: string
}

// ─── JSON fayl yo'li ──────────────────────────────────────────────────────────
const DB_FILE = path.join(process.cwd(), '.users-local.json')

// ─── Seed foydalanuvchilar ────────────────────────────────────────────────────
const SEED: CachedUser[] = [
  { id: 'seed-1',  tabelNumber: 'T001', email: 'superadmin@uzauto.uz', password: 'super123',    name: 'Super Admin',        role: 'superadmin',        created_at: new Date().toISOString() },
  { id: 'seed-2',  tabelNumber: 'T002', email: 'demo@uzauto.uz',        password: 'demo123',     name: 'Demo Admin',         role: 'admin',             created_at: new Date().toISOString() },
  { id: 'seed-3',  tabelNumber: 'T003', email: 'gca@uzauto.uz',         password: 'gca123',      name: 'GCA Auditor',        role: 'gca_auditor',       created_at: new Date().toISOString() },
  { id: 'seed-4',  tabelNumber: 'T004', email: 'cmm@uzauto.uz',         password: 'cmm123',      name: 'CMM Inspector',      role: 'cmm_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-5',  tabelNumber: 'T005', email: 'd10@uzauto.uz',         password: 'd10123',      name: 'D10 Inspector',      role: 'd10_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-6',  tabelNumber: 'T006', email: 'd20@uzauto.uz',         password: 'd20123',      name: 'D20 Inspector',      role: 'd20_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-7',  tabelNumber: 'T007', email: 'engineer@uzauto.uz',    password: 'engineer123', name: 'GA Engineer',        role: 'ga_engineer',       created_at: new Date().toISOString() },
  { id: 'seed-8',  tabelNumber: 'T008', email: 'welding@uzauto.uz',     password: 'welding123',  name: 'Welding Engineer',   role: 'welding_engineer',  created_at: new Date().toISOString() },
  { id: 'seed-9',  tabelNumber: 'T009', email: 'manager@uzauto.uz',     password: 'manager123',  name: 'Rahbar',             role: 'manager',           created_at: new Date().toISOString() },
  { id: 'seed-10', tabelNumber: 'T010', email: 'drr@uzauto.uz',         password: 'drr123',      name: 'DRR Inspector',      role: 'drr_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-11', tabelNumber: 'T011', email: 'drl@uzauto.uz',         password: 'drl123',      name: 'DRL Inspector',      role: 'drl_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-12', tabelNumber: 'T012', email: 'pdi@uzauto.uz',         password: 'pdi123',      name: 'PDI Inspector',      role: 'pdi_inspector',     created_at: new Date().toISOString() },
  { id: 'seed-13', tabelNumber: 'T013', email: 'incoming@uzauto.uz',    password: 'incoming123', name: 'Incoming Inspector', role: 'incoming_inspector', created_at: new Date().toISOString() },
]

// ─── JSON fayldan o'qish ──────────────────────────────────────────────────────
function readFile(): CachedUser[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
      if (Array.isArray(data)) return data
    }
  } catch (e) {
    console.warn('[users-cache] Fayl o\'qishda xato:', (e as Error).message)
  }
  return []
}

// ─── JSON faylga yozish ───────────────────────────────────────────────────────
function writeFile(users: CachedUser[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (e) {
    console.warn('[users-cache] Faylga yozishda xato:', (e as Error).message)
  }
}

// ─── Global singleton ─────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __qc_users_store: { users: CachedUser[]; dbLoaded: boolean } | undefined
}

function initStore(): { users: CachedUser[]; dbLoaded: boolean } {
  // JSON fayldan yuklash
  const fromFile = readFile()

  // Seed + fayl ma'lumotlarini birlashtirish
  const merged = [...SEED]
  for (const u of fromFile) {
    const idx = merged.findIndex(m => m.tabelNumber === u.tabelNumber)
    if (idx >= 0) {
      // Fayldagi versiya yangroq — uni ishlatamiz (admin parol o'zgartirgan bo'lishi mumkin)
      merged[idx] = u
    } else {
      merged.push(u)
    }
  }
  return { users: merged, dbLoaded: false }
}

if (!globalThis.__qc_users_store) {
  globalThis.__qc_users_store = initStore()
  console.log(`[users-cache] Yuklandi: ${globalThis.__qc_users_store.users.length} ta foydalanuvchi`)
}

const store = globalThis.__qc_users_store

// ─── Yordamchi: faylga saqlash (faqat seed bo'lmagan yoki o'zgartirilganlar) ──
function persist() {
  // Barcha foydalanuvchilarni saqlaymiz (seed ham, yangilar ham)
  writeFile(store.users)
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const usersCache = {
  isDbLoaded: () => store.dbLoaded,

  /** DB dan to'liq ro'yxatni yuklash */
  loadFromDb: (rows: any[]) => {
    const fromDb: CachedUser[] = rows.map(r => ({
      id:          r.id,
      tabelNumber: r.tabel_number ?? '',
      email:       r.email ?? null,
      password:    r.password ?? '',
      name:        r.name,
      role:        r.role,
      created_at:  r.created_at ?? new Date().toISOString(),
    }))
    // DB va seed ni birlashtirish (seed foydalanuvchilar tabel_number bo'lmasa ham kiritilsin)
    store.users = [...fromDb]
    for (const seed of SEED) {
      if (!store.users.find(u => u.tabelNumber === seed.tabelNumber)) {
        store.users.push(seed)
      }
    }
    store.dbLoaded = true
    persist()
  },

  /** Tabel raqami va parol bilan autentifikatsiya */
  authenticate: (tabelNumber: string, password: string): CachedUser | undefined =>
    store.users.find(
      u => u.tabelNumber === tabelNumber.toUpperCase() && u.password === password
    ),

  /** Tabel raqami bo'yicha qidirish */
  findByTabel: (tabelNumber: string): CachedUser | undefined =>
    store.users.find(u => u.tabelNumber === tabelNumber.toUpperCase()),

  /** Email bo'yicha qidirish */
  findByEmail: (email: string): CachedUser | undefined =>
    store.users.find(u => u.email === email),

  /** Barcha foydalanuvchilar (parolsiz) */
  getAll: (): Omit<CachedUser, 'password'>[] =>
    store.users.map(({ password: _p, ...rest }) => rest),

  /** Tabel raqami mavjudligini tekshirish */
  tabelExists: (tabelNumber: string): boolean =>
    store.users.some(u => u.tabelNumber === tabelNumber.toUpperCase()),

  /** Yangi foydalanuvchi qo'shish */
  add: (user: CachedUser) => {
    const idx = store.users.findIndex(u => u.tabelNumber === user.tabelNumber)
    if (idx >= 0) store.users.splice(idx, 1)
    store.users.unshift(user)
    persist()  // Faylga saqlash
  },

  /** Foydalanuvchini yangilash */
  update: (id: string, updates: Partial<CachedUser>) => {
    const idx = store.users.findIndex(u => u.id === id)
    if (idx >= 0) {
      store.users[idx] = { ...store.users[idx], ...updates }
      persist()
    }
  },

  /** Foydalanuvchini o'chirish */
  remove: (id: string) => {
    const idx = store.users.findIndex(u => u.id === id)
    if (idx >= 0) {
      store.users.splice(idx, 1)
      persist()
    }
  },
}
