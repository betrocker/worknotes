export const OFFLINE_DB_VERSION = 1;

export const OFFLINE_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete', 'upload_file')),
  payload TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  name TEXT,
  phone TEXT,
  address TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  client_id TEXT,
  title TEXT,
  description TEXT,
  pending_reason TEXT,
  price REAL,
  status TEXT,
  scheduled_date TEXT,
  completed_at TEXT,
  archived_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  job_id TEXT,
  amount REAL,
  payment_date TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  job_id TEXT,
  title TEXT,
  amount REAL,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS job_invoice_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  job_id TEXT,
  title TEXT,
  unit TEXT,
  quantity REAL,
  unit_price REAL,
  total REAL,
  position INTEGER,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS job_images (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  job_id TEXT,
  kind TEXT,
  image_url TEXT,
  storage_path TEXT,
  local_uri TEXT,
  upload_status TEXT NOT NULL DEFAULT 'synced',
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  job_id TEXT,
  invoice_number TEXT,
  sequence_number INTEGER,
  year INTEGER,
  issued_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS sync_operations_pending_idx
  ON sync_operations (created_at, attempts);

CREATE INDEX IF NOT EXISTS clients_user_updated_at_idx
  ON clients (user_id, updated_at);

CREATE INDEX IF NOT EXISTS clients_user_deleted_at_idx
  ON clients (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS jobs_user_updated_at_idx
  ON jobs (user_id, updated_at);

CREATE INDEX IF NOT EXISTS jobs_client_idx
  ON jobs (client_id);

CREATE INDEX IF NOT EXISTS jobs_user_deleted_at_idx
  ON jobs (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS payments_user_updated_at_idx
  ON payments (user_id, updated_at);

CREATE INDEX IF NOT EXISTS payments_job_idx
  ON payments (job_id);

CREATE INDEX IF NOT EXISTS expenses_user_updated_at_idx
  ON expenses (user_id, updated_at);

CREATE INDEX IF NOT EXISTS expenses_job_idx
  ON expenses (job_id);

CREATE INDEX IF NOT EXISTS job_invoice_items_user_updated_at_idx
  ON job_invoice_items (user_id, updated_at);

CREATE INDEX IF NOT EXISTS job_invoice_items_job_idx
  ON job_invoice_items (job_id, position);

CREATE INDEX IF NOT EXISTS job_images_user_updated_at_idx
  ON job_images (user_id, updated_at);

CREATE INDEX IF NOT EXISTS job_images_job_kind_idx
  ON job_images (job_id, kind, created_at);

CREATE INDEX IF NOT EXISTS invoices_user_updated_at_idx
  ON invoices (user_id, updated_at);

CREATE INDEX IF NOT EXISTS invoices_job_idx
  ON invoices (job_id);
`;
