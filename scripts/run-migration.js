#!/usr/bin/env node
/**
 * Migration runner: node scripts/run-migration.js scripts/db-migrate-gca.sql
 */

const fs       = require('fs')
const path     = require('path')
const postgres = require('postgres')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: node scripts/run-migration.js <sql-file>')
  process.exit(1)
}

const sqlText = fs.readFileSync(path.resolve(sqlFile), 'utf8')
const dbUrl   = process.env.DATABASE_URL

if (!dbUrl) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

;(async () => {
  const sql = postgres(dbUrl, { ssl: false })
  try {
    console.log(`Running migration: ${sqlFile}`)
    await sql.unsafe(sqlText)
    console.log('✓ Migration complete')
  } catch (e) {
    console.error('✗ Migration failed:', e.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
})()
