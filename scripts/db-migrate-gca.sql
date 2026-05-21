-- GCA GSIP Import jadvallar
-- Ishlatish: node scripts/run-migration.js scripts/db-migrate-gca.sql

-- ─── Import batches ───────────────────────────────────────────────────────────
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
  status        TEXT        DEFAULT 'active'
);

-- ─── Import rows ──────────────────────────────────────────────────────────────
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

-- ─── Indexlar ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gca_imports_batch   ON gca_imports(import_batch);
CREATE INDEX IF NOT EXISTS idx_gca_imports_shop    ON gca_imports(shop);
CREATE INDEX IF NOT EXISTS idx_gca_imports_lv1     ON gca_imports(part_lv1);
CREATE INDEX IF NOT EXISTS idx_gca_imports_model   ON gca_imports(model_group);
CREATE INDEX IF NOT EXISTS idx_gca_imports_date    ON gca_imports(reporting_date);
