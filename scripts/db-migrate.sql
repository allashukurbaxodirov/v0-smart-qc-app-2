-- ═══════════════════════════════════════════════════════════════════
--  SmartQC — DRL Tables Migration
--  Run on every new server before first use.
--  Safe to run multiple times (CREATE … IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════

-- 1. DRL Imports (raw rows from GSIP Excel)
CREATE TABLE IF NOT EXISTS drl_imports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID        NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_drl_imports_batch      ON drl_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_drl_imports_shop       ON drl_imports(shop);
CREATE INDEX IF NOT EXISTS idx_drl_imports_fault_code ON drl_imports(fault_code);

-- 2. Import Batch Summary
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
  status        TEXT        NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_drl_batches_imported_at ON drl_import_batches(imported_at DESC);

-- 3. DRL Escalations (sent to engineers)
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

CREATE INDEX IF NOT EXISTS idx_drl_esc_status  ON drl_escalations(status);
CREATE INDEX IF NOT EXISTS idx_drl_esc_role    ON drl_escalations(assigned_role);
CREATE INDEX IF NOT EXISTS idx_drl_esc_batch   ON drl_escalations(import_batch);
CREATE INDEX IF NOT EXISTS idx_drl_esc_created ON drl_escalations(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
--  DRR Tables — Daily Rejection Rate
-- ═══════════════════════════════════════════════════════════════════

-- 4. DRR Imports (raw rows from GSIP Excel)
CREATE TABLE IF NOT EXISTS drr_imports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID        NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_drr_imports_batch      ON drr_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_drr_imports_shop       ON drr_imports(shop);
CREATE INDEX IF NOT EXISTS idx_drr_imports_fault_code ON drr_imports(fault_code);

-- 5. DRR Import Batch Summary
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

CREATE INDEX IF NOT EXISTS idx_drr_batches_imported_at ON drr_import_batches(imported_at DESC);

-- 6. DRR Escalations (sent to engineers)
CREATE TABLE IF NOT EXISTS drr_escalations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch  UUID,
  fault_code    TEXT,
  fault_name    TEXT        NOT NULL,
  shop          TEXT,
  prod_team     TEXT,
  total_count   INT         NOT NULL DEFAULT 0,
  total_veh_cnt INT         NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_drr_esc_status  ON drr_escalations(status);
CREATE INDEX IF NOT EXISTS idx_drr_esc_role    ON drr_escalations(assigned_role);
CREATE INDEX IF NOT EXISTS idx_drr_esc_batch   ON drr_escalations(import_batch);
CREATE INDEX IF NOT EXISTS idx_drr_esc_created ON drr_escalations(created_at DESC);
