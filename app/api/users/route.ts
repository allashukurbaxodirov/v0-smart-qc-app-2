import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { usersCache, CachedUser } from '@/lib/users-cache'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { tabelNumber?: string; email?: string; role: string; name: string } }
  catch { return null }
}

function isAdmin(role: string) {
  return role === 'superadmin' || role === 'admin'
}

const VALID_ROLES = [
  'superadmin', 'admin', 'manager',
  'gca_auditor', 'cmm_inspector', 'd10_inspector', 'd20_inspector',
  'ga_engineer', 'welding_engineer',
  'drr_inspector', 'drl_inspector', 'pdi_inspector', 'incoming_inspector',
]

// ─── GET: barcha foydalanuvchilar ─────────────────────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT id, tabel_number, email, name, role, password, created_at::text
      FROM users
      ORDER BY tabel_number ASC
    `
    // Shared cache ni yangilaymiz (auth route ham ko'ra olsin)
    usersCache.loadFromDb(rows as any[])
    return NextResponse.json(usersCache.getAll())
  } catch (e) {
    console.warn('users GET (DB unavailable):', (e as Error).message)
    // DB o'chiq — shared cache dan qaytaramiz (seed + qo'shilganlar)
    return NextResponse.json(usersCache.getAll())
  }
}

// ─── POST: yangi foydalanuvchi qo'shish ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const { tabelNumber, password, name, role } = await req.json()
    if (!tabelNumber || !password || !name || !role) {
      return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Noto'g'ri rol tanlandi" }, { status: 400 })
    }
    const tNum = String(tabelNumber).toUpperCase().trim()

    if (usersCache.tabelExists(tNum)) {
      return NextResponse.json({ error: 'Bu tabel raqami allaqachon mavjud' }, { status: 409 })
    }

    const newUser: CachedUser = {
      id:          `mem-${Date.now()}`,
      tabelNumber: tNum,
      email:       null,
      password,
      name,
      role,
      created_at:  new Date().toISOString(),
    }

    try {
      // DB ga saqlashga urinish
      const [row] = await sql`
        INSERT INTO users (tabel_number, password, name, role)
        VALUES (${tNum}, ${password}, ${name}, ${role})
        RETURNING id, tabel_number, email, name, role, created_at::text
      `
      // DB dan kelgan haqiqiy id ni ishlatamiz
      newUser.id         = row.id
      newUser.tabelNumber = row.tabel_number
      newUser.email      = row.email ?? null
    } catch (dbErr: any) {
      if (dbErr?.code === '23505' || dbErr?.message?.includes('unique')) {
        return NextResponse.json({ error: 'Bu tabel raqami allaqachon mavjud' }, { status: 409 })
      }
      // DB o'chiq — faqat xotirada saqlaymiz (auth route ko'ra oladi)
      console.warn('users POST (DB unavailable), saving to shared cache:', (dbErr as Error).message)
    }

    // Ikkala holatda ham shared cache ga qo'shamiz
    usersCache.add(newUser)

    const { password: _p, ...safeUser } = newUser
    return NextResponse.json(safeUser, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

// ─── PATCH: foydalanuvchini tahrirlash ────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const { id, name, role, password } = await req.json()
    if (!id || !name || !role) {
      return NextResponse.json({ error: 'id, name va role kerak' }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Noto'g'ri rol" }, { status: 400 })
    }

    // Shared cache ni yangilaymiz
    const updates: Partial<CachedUser> = { name, role }
    if (password) updates.password = password
    usersCache.update(id, updates)

    try {
      if (password) {
        await sql`UPDATE users SET name=${name}, role=${role}, password=${password} WHERE id=${id}::uuid`
      } else {
        await sql`UPDATE users SET name=${name}, role=${role} WHERE id=${id}::uuid`
      }
    } catch (dbErr) {
      console.warn('users PATCH (DB unavailable), updated in cache only:', (dbErr as Error).message)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

// ─── DELETE: foydalanuvchini o'chirish ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 })

    // Shared cache dan o'chiramiz
    usersCache.remove(id)

    try {
      const myTabel = session.tabelNumber ?? ''
      if (myTabel) {
        await sql`DELETE FROM users WHERE id=${id}::uuid AND tabel_number != ${myTabel}`
      } else {
        await sql`DELETE FROM users WHERE id=${id}::uuid`
      }
    } catch (dbErr) {
      console.warn('users DELETE (DB unavailable), removed from cache only:', (dbErr as Error).message)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}
