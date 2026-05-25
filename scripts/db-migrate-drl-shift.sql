-- Migration: drl_import_batches ga shift_label ustuni qo'shish
-- Run: node scripts/run-migration.js scripts/db-migrate-drl-shift.sql

ALTER TABLE drl_import_batches
  ADD COLUMN IF NOT EXISTS shift_label TEXT;

-- Mavjud batchlar uchun shift_label NULL bo'lishi mumkin (eski import)
