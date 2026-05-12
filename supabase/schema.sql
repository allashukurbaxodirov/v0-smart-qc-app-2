-- Smart QC Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','gca_auditor','cmm_inspector','d10_inspector','d20_inspector','ga_engineer')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gca_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  code        TEXT NOT NULL,
  code_name   TEXT NOT NULL,
  factor      INTEGER NOT NULL,
  count       INTEGER NOT NULL,
  notes       TEXT,
  image_url   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS defects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  workshop    TEXT NOT NULL,
  shift       TEXT NOT NULL,
  count       INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('critical','warning','normal')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default users
INSERT INTO users (email, password, name, role) VALUES
  ('demo@uzauto.uz',     'demo123',     'Demo Admin',    'admin'),
  ('gca@uzauto.uz',      'gca123',      'GCA Auditor',   'gca_auditor'),
  ('cmm@uzauto.uz',      'cmm123',      'CMM Inspector', 'cmm_inspector'),
  ('d10@uzauto.uz',      'd10123',      'D10 Inspector', 'd10_inspector'),
  ('d20@uzauto.uz',      'd20123',      'D20 Inspector', 'd20_inspector'),
  ('engineer@uzauto.uz', 'engineer123', 'GA Engineer',   'ga_engineer')
ON CONFLICT (email) DO NOTHING;

-- Seed initial GCA records
INSERT INTO gca_records (shop, code, code_name, factor, count, notes) VALUES
  ('PRESS SHOP', '63', 'O''lcham xatosi',         20, 8,  NULL),
  ('WELDING-1',  '45', 'Qaynash ekilmasa qolgan', 23, 12, NULL),
  ('PAINT SHOP', '86', 'Bo''yoq oqishi',           25, 34, NULL),
  ('GA',         '18', 'Detalda nuqson bor',       20, 24, NULL);
