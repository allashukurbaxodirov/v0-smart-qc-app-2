-- ============================================================
--  Smart QC — TO'LIQ DATABASE SETUP
--  IT Guruhi uchun — bitta fayl, ketma-ket ishlatiladi
--  PostgreSQL 14+
--  Ishlatish: psql -U postgres -d smart_qc -f SETUP_DATABASE.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabel_number TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN (
    'superadmin','admin','gca_auditor',
    'd10_inspector','d20_inspector','ga_engineer','welding_engineer',
    'manager','drr_inspector','drl_inspector','pdi_inspector','incoming_inspector'
  )),
  shift        TEXT CHECK (shift IN ('A','B','D')),
  shop         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. GCA RECORDS (qo'lda kiritilgan)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gca_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA')),
  sector      TEXT,
  pono        TEXT,
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

ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS date   DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS shift  TEXT CHECK (shift IN ('A','B','D'));
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE gca_records ADD COLUMN IF NOT EXISTS pono   TEXT;

-- ─────────────────────────────────────────────────────────────
-- 3. D_RECORDS (D10 / D20)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS d_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('d10','d20')),
  shop        TEXT NOT NULL CHECK (shop IN ('PRESS SHOP','WELDING-1','WELDING-2')),
  sector      TEXT,
  pono        TEXT,
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

-- ─────────────────────────────────────────────────────────────
-- 4. QRECORDS (DRR / DRL / PDI / GCA inspektorlar)
-- ─────────────────────────────────────────────────────────────
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
  cause            TEXT,
  corrective_action TEXT,
  brake_point      TEXT,
  photo_after      TEXT,
  is_resolved      BOOLEAN DEFAULT FALSE,
  resolved_by_name TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS cause             TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS brake_point       TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS photo_after       TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS is_resolved       BOOLEAN DEFAULT FALSE;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS resolved_by_name  TEXT;
ALTER TABLE qrecords ADD COLUMN IF NOT EXISTS resolved_at       TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────
-- 5. INCOMING RECORDS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 6. RESOLUTIONS (Engineer chora-tadbirlar)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resolutions (
  id                  TEXT PRIMARY KEY,
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

-- ─────────────────────────────────────────────────────────────
-- 7. SHIFT ENTRIES (Smena hisoboti)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 8. AUDIT LOG
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 9. APP SETTINGS (WDPV maqsadlari)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value, updated_at) VALUES (
  'wdpv_settings',
  '{"vehicles":50,"targets":{"PLANT":2.50,"PRESS SHOP":0.40,"WELDING-1":0.45,"WELDING-2":0.45,"PAINT SHOP":0.70,"GA":0.50}}'::jsonb,
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. DRL GSIP IMPORT JADVALLARI
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drl_import_batches (
  import_batch  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by   TEXT,
  file_name     TEXT,
  date_from     DATE,
  date_to       DATE,
  shift_from    TEXT,
  shift_to      TEXT,
  row_count     INT         NOT NULL DEFAULT 0,
  total_count   INT         NOT NULL DEFAULT 0,
  models        TEXT,
  status        TEXT        NOT NULL DEFAULT 'active',
  shift_label   TEXT
);

CREATE TABLE IF NOT EXISTS drl_imports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID        NOT NULL REFERENCES drl_import_batches(import_batch) ON DELETE CASCADE,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by   TEXT,
  file_name     TEXT,
  date_from     DATE,
  date_to       DATE,
  shift_from    TEXT,
  shift_to      TEXT,
  row_type      CHAR(1),
  model_group   TEXT,
  model_label   TEXT,
  part_lv1      TEXT,
  part_lv2      TEXT,
  part_lv3      TEXT,
  part_lv4      TEXT,
  fault_id      INT,
  fault_code    TEXT,
  fault_name    TEXT,
  prod_team     TEXT,
  shop          TEXT,
  count         INT         NOT NULL DEFAULT 0,
  drl_ratio     NUMERIC(8,2),
  veh_cnt       INT
);

CREATE TABLE IF NOT EXISTS drl_escalations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID,
  fault_code    TEXT,
  fault_name    TEXT        NOT NULL,
  shop          TEXT,
  prod_team     TEXT,
  total_count   INT         NOT NULL DEFAULT 0,
  drl_ratio     NUMERIC(8,2),
  model_damas   INT         NOT NULL DEFAULT 0,
  model_labo    INT         NOT NULL DEFAULT 0,
  assigned_role TEXT        NOT NULL DEFAULT 'ga_engineer',
  assigned_name TEXT,
  priority      TEXT        NOT NULL DEFAULT 'high',
  status        TEXT        NOT NULL DEFAULT 'open',
  engineer_note TEXT,
  root_cause    TEXT,
  action_taken  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

ALTER TABLE drl_import_batches ADD COLUMN IF NOT EXISTS shift_label TEXT;

-- ─────────────────────────────────────────────────────────────
-- 11. DRR GSIP IMPORT JADVALLARI
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drr_import_batches (
  import_batch  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by   TEXT,
  file_name     TEXT,
  date_from     DATE,
  date_to       DATE,
  shift_from    TEXT,
  shift_to      TEXT,
  row_count     INT         NOT NULL DEFAULT 0,
  total_count   INT         NOT NULL DEFAULT 0,
  models        TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS drr_imports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID        NOT NULL REFERENCES drr_import_batches(import_batch) ON DELETE CASCADE,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by   TEXT,
  file_name     TEXT,
  date_from     DATE,
  date_to       DATE,
  shift_from    TEXT,
  shift_to      TEXT,
  row_type      CHAR(1),
  model_group   TEXT,
  model_label   TEXT,
  part_lv1      TEXT,
  part_lv2      TEXT,
  part_lv3      TEXT,
  part_lv4      TEXT,
  fault_id      INT,
  fault_code    TEXT,
  fault_name    TEXT,
  defect_note   TEXT,
  crew          TEXT,
  prod_team     TEXT,
  shop          TEXT,
  count         INT         NOT NULL DEFAULT 0,
  drr_ratio     NUMERIC(8,2) NOT NULL DEFAULT 0,
  veh_cnt       INT          NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- 12. GCA GSIP IMPORT JADVALLARI
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gca_import_batches (
  import_batch  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by   TEXT,
  file_name     TEXT,
  date_from     DATE,
  date_to       DATE,
  shift_from    TEXT,
  shift_to      TEXT,
  row_count     INTEGER     DEFAULT 0,
  total_weight  NUMERIC     DEFAULT 0,
  veh_count     INTEGER     DEFAULT 0,
  status        TEXT        DEFAULT 'active',
  shift_label   VARCHAR(1)  CHECK (shift_label IN ('A','B','D'))
);

CREATE TABLE IF NOT EXISTS gca_imports (
  id              BIGSERIAL   PRIMARY KEY,
  import_batch    UUID        NOT NULL REFERENCES gca_import_batches(import_batch) ON DELETE CASCADE,
  reporting_date  DATE,
  part_lv1        TEXT,
  part_lv2        TEXT,
  part_lv3        TEXT,
  part_lv4        TEXT,
  part_lv5        TEXT,
  fault_code      TEXT,
  fault_name      TEXT,
  gca_weight      NUMERIC     DEFAULT 0,
  defect_note     TEXT,
  fault_desc      TEXT,
  zone_desc       TEXT,
  category        TEXT,
  prod_team       TEXT,
  shop            TEXT,
  seq_no          TEXT,
  vin             TEXT,
  model_group     TEXT,
  model_label     TEXT
);

ALTER TABLE gca_import_batches ADD COLUMN IF NOT EXISTS shift_label VARCHAR(1) CHECK (shift_label IN ('A','B','D'));

-- ─────────────────────────────────────────────────────────────
-- INDEXLAR (tezlashtirish)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drl_imports_batch      ON drl_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_drl_imports_shop       ON drl_imports(shop);
CREATE INDEX IF NOT EXISTS idx_drl_batches_at         ON drl_import_batches(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_drr_imports_batch      ON drr_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_drr_imports_shop       ON drr_imports(shop);
CREATE INDEX IF NOT EXISTS idx_drr_batches_at         ON drr_import_batches(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_gca_imports_batch      ON gca_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_gca_imports_shop       ON gca_imports(shop);
CREATE INDEX IF NOT EXISTS idx_gca_imports_date       ON gca_imports(reporting_date);
CREATE INDEX IF NOT EXISTS idx_gca_imports_model      ON gca_imports(model_group);
CREATE INDEX IF NOT EXISTS gca_records_date_idx       ON gca_records(date DESC);
CREATE INDEX IF NOT EXISTS d_records_date_idx         ON d_records(date DESC);
CREATE INDEX IF NOT EXISTS qrecords_date_idx          ON qrecords(date DESC);
CREATE INDEX IF NOT EXISTS resolutions_rid_idx        ON resolutions(record_id);

-- ─────────────────────────────────────────────────────────────
-- FOYDALANUVCHILAR (boshlang'ich)
-- DIQQAT: Produksionga o'tishdan oldin parollarni o'zgartiring!
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (tabel_number, email, password, name, role) VALUES
  ('T001', 'superadmin@uzauto.uz', 'super123',    'Super Admin',        'superadmin'),
  ('T002', 'admin@uzauto.uz',      'admin123',    'Admin',              'admin'),
  ('T009', 'manager@uzauto.uz',    'manager123',  'Rahbar',             'manager')
ON CONFLICT (tabel_number) DO NOTHING;

-- ============================================================
-- SETUP TUGADI ✓
-- ============================================================
