-- ============================================================
-- Smart QC Database Schema  (to'liq versiya)
-- PostgreSQL 14+ | local test server uchun
-- ============================================================

-- ─── 1. USERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabel_number TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN (
    'superadmin','admin','gca_auditor','cmm_inspector',
    'd10_inspector','d20_inspector','ga_engineer','welding_engineer',
    'manager','drr_inspector','drl_inspector','pdi_inspector','incoming_inspector'
  )),
  shift        TEXT CHECK (shift IN ('A','B','D')),
  shop         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. GCA RECORDS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gca_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  sector      TEXT,
  pono        TEXT,                        -- Part Order Number (yangi)
  code        TEXT NOT NULL,
  code_name   TEXT NOT NULL,
  factor      INTEGER NOT NULL CHECK (factor > 0),
  count       INTEGER NOT NULL CHECK (count > 0),
  notes       TEXT,
  image_url   TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  shift       TEXT CHECK (shift IN ('A','B','D')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Mavjud GCA jadvaliga yetishmayotgan ustunlarni qo'shish
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS date   DATE    NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS shift  TEXT    CHECK (shift IN ('A','B','D'));
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS pono   TEXT;

-- ─── 3. D_RECORDS (D10 / D20) ───────────────────────────────
CREATE TABLE IF NOT EXISTS d_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('d10','d20')),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2')),
  sector      TEXT,
  pono        TEXT,                        -- Part Order Number (yangi)
  code        TEXT NOT NULL,
  code_name   TEXT NOT NULL,
  factor      INTEGER NOT NULL CHECK (factor > 0),
  count       INTEGER NOT NULL CHECK (count > 0),
  notes       TEXT,
  image_url   TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  shift       TEXT CHECK (shift IN ('A','B','D')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE d_records ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE d_records ADD COLUMN IF NOT EXISTS pono   TEXT;
ALTER TABLE d_records ADD COLUMN IF NOT EXISTS date   DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE d_records ADD COLUMN IF NOT EXISTS shift  TEXT CHECK (shift IN ('A','B','D'));

-- ─── 4. QRECORDS (DRR / DRL / PDI / GCA) ───────────────────
CREATE TABLE IF NOT EXISTS qrecords (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL CHECK (type IN ('drr','drl','pdi','gca')),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  shift            TEXT NOT NULL CHECK (shift IN ('A','B','D')),
  shop             TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  sector           TEXT,
  code             TEXT NOT NULL,
  code_name        TEXT NOT NULL,
  factor           INTEGER NOT NULL CHECK (factor IN (5,10,20,50)),
  count            INTEGER NOT NULL CHECK (count > 0),
  notes            TEXT,
  image_url        TEXT,
  created_by_name  TEXT,
  -- Corrective action maydonlari
  cause            TEXT,
  corrective_action TEXT,
  brake_point      TEXT,
  photo_after      TEXT,
  is_resolved      BOOLEAN DEFAULT FALSE,
  resolved_by_name TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Mavjud qrecords jadvaliga corrective action ustunlarini qo'shish
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS cause             TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS brake_point       TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS photo_after       TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS is_resolved       BOOLEAN DEFAULT FALSE;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS resolved_by_name  TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS resolved_at       TIMESTAMPTZ;

-- ─── 5. INCOMING RECORDS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS incoming_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number      TEXT NOT NULL,
  warehouse        TEXT NOT NULL CHECK (warehouse IN ('WAREHOUSE-1','WAREHOUSE-2','SP ZONE')),
  supplier         TEXT NOT NULL,
  part_name        TEXT NOT NULL,
  total_count      INTEGER NOT NULL CHECK (total_count > 0),
  defect_count     INTEGER NOT NULL DEFAULT 0 CHECK (defect_count >= 0),
  defect_code      TEXT,
  defect_code_name TEXT,
  defect_reason    TEXT,
  shift            TEXT CHECK (shift IN ('A','B','D')),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. RESOLUTIONS (Engineer chora-tadbirlar) ──────────────
CREATE TABLE IF NOT EXISTS resolutions (
  id                  TEXT PRIMARY KEY,          -- format: "{recordId}_{type}"
  record_id           TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('ga','welding','d10','d20','drr','drl','pdi')),
  status              TEXT NOT NULL DEFAULT 'ochiq' CHECK (status IN ('ochiq','jarayonda','yopilgan')),
  problem_description TEXT NOT NULL DEFAULT '',
  root_cause          TEXT NOT NULL DEFAULT '',
  immediate_action    TEXT NOT NULL DEFAULT '',
  main_action         TEXT NOT NULL DEFAULT '',
  decision            TEXT NOT NULL DEFAULT 'resolved',
  transfer_target     TEXT,
  transfer_reason     TEXT,
  resolved_at         TIMESTAMPTZ DEFAULT NOW(),
  created_by          TEXT,
  created_by_name     TEXT,
  UNIQUE (record_id, type)
);

-- ─── 7. SHIFT ENTRIES (Smena hisoboti) ──────────────────────
CREATE TABLE IF NOT EXISTS shift_entries (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  shift       TEXT NOT NULL CHECK (shift IN ('A','B','D')),
  shop        TEXT NOT NULL,
  line        TEXT DEFAULT '',
  drr         INTEGER DEFAULT 0 CHECK (drr >= 0),
  drl         INTEGER DEFAULT 0 CHECK (drl >= 0),
  incoming    INTEGER DEFAULT 0 CHECK (incoming >= 0),
  pdi         INTEGER DEFAULT 0 CHECK (pdi >= 0),
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. AUDIT LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  ts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor      TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT DEFAULT '',
  details    TEXT DEFAULT '',
  ok         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS audit_log_ts_idx    ON audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor);

-- ─── 9. DEFECTS (legacy) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS defects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  workshop    TEXT NOT NULL,
  shift       TEXT NOT NULL,
  count       INTEGER NOT NULL CHECK (count > 0),
  status      TEXT NOT NULL CHECK (status IN ('critical','warning','normal')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. APP SETTINGS (superadmin sozlamalari) ─────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default WDPV settings
INSERT INTO app_settings (key, value, updated_at) VALUES (
  'wdpv_settings',
  '{"vehicles":50,"targets":{"PLANT":2.50,"PRESS SHOP":0.40,"WELDING-1":0.45,"WELDING-2":0.45,"PAINT SHOP":0.70,"GA":0.50}}'::jsonb,
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- ─── INDEXES (performance) ──────────────────────────────────
CREATE INDEX IF NOT EXISTS gca_records_date_idx  ON gca_records (date DESC);
CREATE INDEX IF NOT EXISTS gca_records_shop_idx  ON gca_records (shop);
CREATE INDEX IF NOT EXISTS d_records_type_idx    ON d_records   (type);
CREATE INDEX IF NOT EXISTS d_records_date_idx    ON d_records   (date DESC);
CREATE INDEX IF NOT EXISTS qrecords_type_idx     ON qrecords    (type);
CREATE INDEX IF NOT EXISTS qrecords_date_idx     ON qrecords    (date DESC);
CREATE INDEX IF NOT EXISTS resolutions_rid_idx   ON resolutions (record_id);

-- ─── SEED FOYDALANUVCHILAR ───────────────────────────────────
-- DIQQAT: Test uchun! Produksionga o'tishdan oldin parollarni o'zgartiring
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
