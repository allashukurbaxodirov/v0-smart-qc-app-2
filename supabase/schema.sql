-- Smart QC Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabel_number TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN (
    'superadmin','admin','gca_auditor','cmm_inspector','d10_inspector','d20_inspector',
    'ga_engineer','welding_engineer','manager',
    'drr_inspector','drl_inspector','pdi_inspector','incoming_inspector'
  )),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Mavjud jadvalga tabel_number ustunini qo'shish (upgrade uchun)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tabel_number TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS gca_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  sector      TEXT,
  code        TEXT NOT NULL,
  code_name   TEXT NOT NULL,
  factor      INTEGER NOT NULL,
  count       INTEGER NOT NULL,
  notes       TEXT,
  image_url   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS sector TEXT;

CREATE TABLE IF NOT EXISTS d_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('d10','d20')),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2')),
  sector      TEXT,
  code        TEXT NOT NULL,
  code_name   TEXT NOT NULL,
  factor      INTEGER NOT NULL,
  count       INTEGER NOT NULL,
  notes       TEXT,
  image_url   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE d_records ADD COLUMN IF NOT EXISTS sector TEXT;

CREATE TABLE IF NOT EXISTS qrecords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL CHECK (type IN ('drr','drl','pdi','gca')),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  shift           TEXT NOT NULL CHECK (shift IN ('A','B','D')),
  shop            TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  sector          TEXT,
  code            TEXT NOT NULL,
  code_name       TEXT NOT NULL,
  factor          INTEGER NOT NULL CHECK (factor IN (5,10,20,50)),
  count           INTEGER NOT NULL CHECK (count > 0),
  notes           TEXT,
  image_url       TEXT,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incoming_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number      TEXT NOT NULL,
  warehouse        TEXT NOT NULL CHECK (warehouse IN ('WAREHOUSE-1','WAREHOUSE-2','SP ZONE')),
  supplier         TEXT NOT NULL,
  part_name        TEXT NOT NULL,
  total_count      INTEGER NOT NULL CHECK (total_count > 0),
  defect_count     INTEGER NOT NULL DEFAULT 0,
  defect_code      TEXT,
  defect_code_name TEXT,
  defect_reason    TEXT,
  shift            TEXT CHECK (shift IN ('A','B','D')),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
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

-- Seed default users (tabel_number bilan)
INSERT INTO users (tabel_number, email, password, name, role) VALUES
  ('T001', 'superadmin@uzauto.uz', 'super123',    'Super Admin',        'superadmin'),
  ('T002', 'demo@uzauto.uz',       'demo123',     'Demo Admin',         'admin'),
  ('T003', 'gca@uzauto.uz',        'gca123',      'GCA Auditor',        'gca_auditor'),
  ('T004', 'cmm@uzauto.uz',        'cmm123',      'CMM Inspector',      'cmm_inspector'),
  ('T005', 'd10@uzauto.uz',        'd10123',      'D10 Inspector',      'd10_inspector'),
  ('T006', 'd20@uzauto.uz',        'd20123',      'D20 Inspector',      'd20_inspector'),
  ('T007', 'engineer@uzauto.uz',   'engineer123', 'GA Engineer',        'ga_engineer'),
  ('T008', 'welding@uzauto.uz',    'welding123',  'Welding Engineer',   'welding_engineer'),
  ('T009', 'manager@uzauto.uz',    'manager123',  'Rahbar',             'manager'),
  ('T010', 'drr@uzauto.uz',        'drr123',      'DRR Inspector',      'drr_inspector'),
  ('T011', 'drl@uzauto.uz',        'drl123',      'DRL Inspector',      'drl_inspector'),
  ('T012', 'pdi@uzauto.uz',        'pdi123',      'PDI Inspector',      'pdi_inspector'),
  ('T013', 'incoming@uzauto.uz',   'incoming123', 'Incoming Inspector', 'incoming_inspector')
ON CONFLICT (tabel_number) DO NOTHING;

-- Seed initial GCA records
INSERT INTO gca_records (shop, code, code_name, factor, count, notes) VALUES
  ('PRESS SHOP', '63', 'O''lcham xatosi',         20, 8,  NULL),
  ('WELDING-1',  '45', 'Qaynash ekilmasa qolgan', 23, 12, NULL),
  ('PAINT SHOP', '86', 'Bo''yoq oqishi',           25, 34, NULL),
  ('GA',         '18', 'Detalda nuqson bor',       20, 24, NULL);
