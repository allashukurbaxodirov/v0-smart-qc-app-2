-- Migration: gca_import_batches ga shift_label ustuni qo'shish
-- Run: node scripts/run-migration.js scripts/db-migrate-gca-shift.sql

ALTER TABLE gca_import_batches
  ADD COLUMN IF NOT EXISTS shift_label VARCHAR(1) CHECK (shift_label IN ('A', 'B', 'D'));

-- Mavjud batchlar uchun shift_label NULL bo'lishi mumkin (eski import)
