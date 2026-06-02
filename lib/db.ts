import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

/**
 * SSL rejimini aniqlash:
 *  - Cloud (Railway/Supabase) → 'require'
 *  - Lokal / on-prem PostgreSQL → false (SSL sozlanmagan)
 *
 * DATABASE_SSL env bilan boshqariladi:
 *   DATABASE_SSL=require  → SSL majburiy (cloud)
 *   DATABASE_SSL=false    → SSL o'chiq (lokal server)
 * Agar berilmasa: production'da default 'require', dev'da false.
 */
function resolveSsl(): 'require' | false {
  const mode = process.env.DATABASE_SSL?.toLowerCase()
  if (mode === 'require' || mode === 'true')   return 'require'
  if (mode === 'false'   || mode === 'disable') return false
  return process.env.NODE_ENV === 'production' ? 'require' : false
}

const sql = postgres(connectionString, {
  ssl: resolveSsl(),
  max: 10,
})

export default sql
