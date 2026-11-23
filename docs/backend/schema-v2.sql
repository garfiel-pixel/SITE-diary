-- ============================================================================
-- Masterbuilders Site Diary — cloud schema v2 (reviewed draft)
-- ============================================================================
-- Status: PLANNING DRAFT. Do not apply to production without a D1 spike.
-- Target: Cloudflare D1 (SQLite). Timestamps are Unix milliseconds (INTEGER).
--
-- This file is the corrected counterpart to §6.2 of docs/SCALABILITY_PLAN.md.
-- It implements the fixes in docs/SCALABILITY_REVIEW.md:
--   * explicit org tenancy (B4)
--   * a partial unique index instead of UNIQUE(site_id, date) (B5)
--   * server-authoritative derived fields + payload versioning (B6)
--   * org timezone for report dates (B7)
--   * content-addressed photo blobs (3.2)
--   * archived PDFs/artifacts (B2)
--   * CSRF + absolute session expiry (3.1)
--   * append-only audit with request ids (3.10)
--   * idempotency keys, outbox, summary cache, migrations
--
-- Decisions still open (see §14 of the plan):
--   D1. One report per site/day, or more than one?
--       Default below = one ACTIVE report per (org, site, date).
--       If shifts/crews are allowed, use the `slot` column + the alternative
--       index at the end of the reports section, and drop the partial index.
--   D2. Retention windows per org (seeded with sensible defaults).
--   D3. Whether archived PDFs are mandatory (recommended: yes).
--
-- D1 notes:
--   * `batch()` is atomic; use it for report + revision + FTS + audit writes.
--   * Max 100 bound parameters per statement; chunk any IN (...) list.
--   * Max row 2 MB; the payload size cap below is 512 KB by application rule.
--   * Foreign keys: do not rely on a per-session PRAGMA. Keep app-level checks
--     and test cascade behaviour in a spike before depending on it.
--   * FTS5 is available; keep it in sync in application code (same batch).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Migration bookkeeping
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  applied_at  INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- 1. Tenancy and identity
-- ---------------------------------------------------------------------------

CREATE TABLE orgs (
  id                 TEXT PRIMARY KEY NOT NULL,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  timezone           TEXT NOT NULL DEFAULT 'America/Jamaica',
  -- Retention policy (days). 0 = keep forever (not recommended).
  report_retention_days   INTEGER NOT NULL DEFAULT 2555,  -- ~7 years
  photo_retention_days    INTEGER NOT NULL DEFAULT 730,   -- 2 years
  audit_retention_days    INTEGER NOT NULL DEFAULT 730,
  archive_pdf        INTEGER NOT NULL DEFAULT 1 CHECK (archive_pdf IN (0, 1)),
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'suspended')),
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

-- Users are global by email so one person can belong to more than one org.
CREATE TABLE users (
  id                  TEXT PRIMARY KEY NOT NULL,
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name                TEXT NOT NULL,
  -- Encoded hash, e.g. "pbkdf2-sha256$600000$<salt-b64>$<hash-b64>".
  -- NULL for SSO-only users. Algorithm and parameters live in the string so
  -- they can be upgraded without a schema change.
  password_hash       TEXT,
  password_updated_at INTEGER,
  email_verified_at   INTEGER,
  mfa_required        INTEGER NOT NULL DEFAULT 0 CHECK (mfa_required IN (0, 1)),
  status              TEXT NOT NULL DEFAULT 'invited'
                        CHECK (status IN ('invited', 'active', 'suspended')),
  created_at          INTEGER NOT NULL,
  last_login_at       INTEGER,
  CHECK (email = lower(email))  -- store lowercase; compare with NOCASE anyway
);

CREATE INDEX idx_users_status ON users(status);

-- Role and scope belong to the membership, not the global user: the same
-- person can be a supervisor for one org and a PM for another.
CREATE TABLE org_memberships (
  org_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL
               CHECK (role IN ('worker', 'supervisor', 'pm', 'executive', 'admin')),
  scope      TEXT NOT NULL DEFAULT 'site'
               CHECK (scope IN ('own', 'site', 'project', 'global')),
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('invited', 'active', 'suspended')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_memberships_user ON org_memberships(user_id, status);

CREATE TABLE sessions (
  id                  TEXT PRIMARY KEY NOT NULL,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id              TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- SHA-256 of the random session token. The raw token exists only in the
  -- cookie, never in the database or logs.
  token_hash          TEXT NOT NULL UNIQUE,
  -- SHA-256 of the CSRF token bound to this session (double-submit).
  csrf_hash           TEXT NOT NULL,
  device_id           TEXT,
  ip_hash             TEXT,             -- hashed; raw IP is not needed
  user_agent          TEXT,
  created_at          INTEGER NOT NULL,
  last_seen_at        INTEGER NOT NULL,
  idle_expires_at     INTEGER NOT NULL,
  absolute_expires_at INTEGER NOT NULL,
  rotated_at          INTEGER,
  revoked_at          INTEGER
);

CREATE INDEX idx_sessions_user     ON sessions(user_id, revoked_at);
CREATE INDEX idx_sessions_expiry   ON sessions(idle_expires_at);

CREATE TABLE devices (
  id            TEXT PRIMARY KEY NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  label         TEXT,
  platform      TEXT,
  public_key    TEXT,                  -- optional device-bound key later
  last_seen_at  INTEGER,
  created_at    INTEGER NOT NULL,
  revoked_at    INTEGER
);

CREATE INDEX idx_devices_user ON devices(user_id, revoked_at);

CREATE TABLE password_resets (
  id          TEXT PRIMARY KEY NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_password_resets_user ON password_resets(user_id, expires_at);

CREATE TABLE invites (
  id          TEXT PRIMARY KEY NOT NULL,
  org_id      TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL COLLATE NOCASE,
  role        TEXT NOT NULL
                CHECK (role IN ('worker', 'supervisor', 'pm', 'executive', 'admin')),
  scope       TEXT NOT NULL DEFAULT 'site'
                CHECK (scope IN ('own', 'site', 'project', 'global')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  accepted_at INTEGER,
  revoked_at  INTEGER,
  created_by  TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_invites_org   ON invites(org_id, created_at DESC);
CREATE INDEX idx_invites_email ON invites(email, expires_at);

-- TOTP secrets must be encrypted with a key held in Worker secrets
-- (e.g. AES-GCM). Never store a plaintext TOTP secret.
CREATE TABLE mfa_factors (
  id               TEXT PRIMARY KEY NOT NULL,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL DEFAULT 'totp' CHECK (kind IN ('totp')),
  secret_encrypted TEXT NOT NULL,
  confirmed_at     INTEGER,
  last_used_at     INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE INDEX idx_mfa_user ON mfa_factors(user_id);

CREATE TABLE mfa_recovery_codes (
  id         TEXT PRIMARY KEY NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL UNIQUE,
  used_at    INTEGER,
  created_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. Projects, sites, scope
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
  id         TEXT PRIMARY KEY NOT NULL,
  org_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  client     TEXT,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'on_hold', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (org_id, name)
);

CREATE INDEX idx_projects_org ON projects(org_id, status);

-- A project can have several sites/chainages. `code` is the human label used
-- on the paper form and in exports, e.g. "HAT-0+400".
CREATE TABLE sites (
  id         TEXT PRIMARY KEY NOT NULL,
  org_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name       TEXT NOT NULL,
  code       TEXT,
  address    TEXT,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'on_hold', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (org_id, project_id, name),
  UNIQUE (org_id, code)
);

CREATE INDEX idx_sites_project ON sites(org_id, project_id, status);

CREATE TABLE project_memberships (
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, project_id),
  FOREIGN KEY (org_id, user_id) REFERENCES org_memberships(org_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_project_memberships_project ON project_memberships(project_id);

CREATE TABLE site_memberships (
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id    TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, site_id),
  FOREIGN KEY (org_id, user_id) REFERENCES org_memberships(org_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_site_memberships_site ON site_memberships(site_id);

-- ---------------------------------------------------------------------------
-- 3. Reports (head row)
-- ---------------------------------------------------------------------------
-- The head row holds the current canonical payload plus denormalised fields
-- for lists and search. Derived fields are recomputed server-side from the
-- validated payload; client-supplied totals are ignored.
--
-- DECISION D1 (one active report per site/day):
--   The partial unique index at the end of this section enforces it.
--   `slot` stays in the table so a future shift model is a small migration,
--   not a redesign.
--
-- `superseded_at` is reserved for a future "replace this report with a
-- corrected one" workflow. Leave NULL in v1.

CREATE TABLE reports (
  id                  TEXT PRIMARY KEY NOT NULL,
  org_id              TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_report_id    TEXT NOT NULL,             -- idempotency key from device
  site_id             TEXT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  date                TEXT NOT NULL,             -- YYYY-MM-DD in org timezone
  slot                TEXT NOT NULL DEFAULT 'day', -- day | night | crew-a ...
  recorded_by_user_id TEXT REFERENCES users(id),
  recorded_by_name    TEXT NOT NULL,
  -- Canonical, validated JSON. Store stable key order for hash stability.
  payload_json        TEXT NOT NULL,
  payload_sha256      TEXT NOT NULL,
  payload_bytes       INTEGER NOT NULL,
  payload_schema      INTEGER NOT NULL DEFAULT 1,
  revision            INTEGER NOT NULL DEFAULT 1,
  -- Denormalised, server-computed. Never accept these from the client.
  headcount           INTEGER NOT NULL DEFAULT 0,
  equipment_hours     REAL NOT NULL DEFAULT 0,
  time_lost_hours     REAL NOT NULL DEFAULT 0,
  photo_count         INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  approved_by_user_id TEXT REFERENCES users(id),
  approved_at         INTEGER,
  locked_at           INTEGER,
  client_recorded_at  INTEGER,                    -- wall clock from the device
  client_updated_at   INTEGER NOT NULL,
  server_updated_at   INTEGER NOT NULL,
  created_at          INTEGER NOT NULL,
  deleted_at          INTEGER,
  superseded_at       INTEGER,
  UNIQUE (org_id, client_report_id)
);

CREATE INDEX idx_reports_site_date   ON reports(org_id, site_id, date DESC);
CREATE INDEX idx_reports_date        ON reports(org_id, date DESC, id DESC);
CREATE INDEX idx_reports_recorded    ON reports(org_id, recorded_by_name COLLATE NOCASE);
CREATE INDEX idx_reports_recorded_id ON reports(org_id, recorded_by_user_id, date DESC);
CREATE INDEX idx_reports_updated     ON reports(org_id, server_updated_at, id);
CREATE INDEX idx_reports_status      ON reports(org_id, status, date DESC);
CREATE INDEX idx_reports_deleted     ON reports(org_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- DEFAULT (D1): one active report per site/day. A soft-deleted report frees
-- the slot immediately, with no undelete trick.
CREATE UNIQUE INDEX ux_reports_active_slot
  ON reports(org_id, site_id, date)
  WHERE deleted_at IS NULL AND superseded_at IS NULL;

-- ALTERNATIVE (only if the client confirms shifts/crews): drop the partial
-- index above and use this instead.
-- CREATE UNIQUE INDEX ux_reports_slot
--   ON reports(org_id, site_id, date, slot)
--   WHERE deleted_at IS NULL AND superseded_at IS NULL;

-- Full payload per revision. Keep recent revisions in D1; gzip older payloads
-- to R2 per the retention job (see docs/SCALABILITY_REVIEW.md §3.3).
CREATE TABLE report_revisions (
  id             TEXT PRIMARY KEY NOT NULL,
  report_id      TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  revision       INTEGER NOT NULL,
  payload_json   TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  payload_bytes  INTEGER NOT NULL,
  actor_user_id  TEXT REFERENCES users(id),
  source         TEXT NOT NULL
                   CHECK (source IN ('device', 'dashboard', 'migration', 'system')),
  reason         TEXT,
  created_at     INTEGER NOT NULL,
  UNIQUE (report_id, revision)
);

CREATE INDEX idx_revisions_report ON report_revisions(report_id, revision DESC);
CREATE INDEX idx_revisions_actor  ON report_revisions(actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Photos: content-addressed blobs + report links
-- ---------------------------------------------------------------------------
-- The same image uploaded to two reports costs one R2 object and two rows.
-- `r2_key` is derived from the hash and is stable across retries.

CREATE TABLE blobs (
  id           TEXT PRIMARY KEY NOT NULL,
  org_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sha256       TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  bytes        INTEGER NOT NULL,
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg'
                 CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  created_at   INTEGER NOT NULL,
  UNIQUE (org_id, sha256)
);

CREATE INDEX idx_blobs_org ON blobs(org_id, created_at DESC);

CREATE TABLE report_photos (
  id           TEXT PRIMARY KEY NOT NULL,
  org_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  report_id    TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  blob_id      TEXT NOT NULL REFERENCES blobs(id) ON DELETE RESTRICT,
  group_id     TEXT,                       -- caption group shared by photos
  description  TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  taken_at     INTEGER,
  uploaded_by_user_id TEXT REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  UNIQUE (report_id, blob_id)
);

CREATE INDEX idx_report_photos_report ON report_photos(report_id, sort_order);
CREATE INDEX idx_report_photos_group  ON report_photos(report_id, group_id);

-- Archived outputs: the PDF generated on the device at upload time, CSV
-- exports, and any server-regenerated PDF. This is the audit copy.
CREATE TABLE report_artifacts (
  id           TEXT PRIMARY KEY NOT NULL,
  org_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  report_id    TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  revision     INTEGER NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('pdf', 'csv', 'json')),
  r2_key       TEXT NOT NULL UNIQUE,
  sha256       TEXT NOT NULL,
  bytes        INTEGER NOT NULL,
  generator    TEXT NOT NULL,              -- client-pdfmake-0.3 | browser-run/pdf
  generated_at INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_artifacts_report ON report_artifacts(report_id, revision, kind);

-- ---------------------------------------------------------------------------
-- 5. Full-text search (standalone FTS5)
-- ---------------------------------------------------------------------------
-- Written in the same batch() as the report head + revision. Rebuild command
-- must exist and be tested after bulk imports.

CREATE VIRTUAL TABLE reports_fts USING fts5(
  report_id       UNINDEXED,
  org_id          UNINDEXED,
  site_id         UNINDEXED,
  date            UNINDEXED,
  recorded_by,
  workforce_names,
  project,
  site,
  wip,
  visitors,
  instructions,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- ---------------------------------------------------------------------------
-- 6. Audit, idempotency, outbox, summaries
-- ---------------------------------------------------------------------------

-- Append-only. The Worker must never UPDATE or DELETE these rows. Ship older
-- rows to R2 on the retention schedule.
CREATE TABLE audit_log (
  id            TEXT PRIMARY KEY NOT NULL,
  org_id        TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  request_id    TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  action        TEXT NOT NULL,             -- auth.login, report.view, report.export, ...
  entity_type   TEXT,
  entity_id     TEXT,
  site_id       TEXT,
  before_hash   TEXT,
  after_hash    TEXT,
  detail_json   TEXT,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_audit_org    ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_actor  ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_site   ON audit_log(site_id, created_at DESC);
CREATE INDEX idx_audit_req    ON audit_log(request_id);

-- 24-hour idempotency for non-sync writes (invites, exports, admin edits).
CREATE TABLE idempotency_keys (
  org_id        TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method        TEXT NOT NULL,
  path          TEXT NOT NULL,
  request_hash  TEXT NOT NULL,
  response_code INTEGER,
  response_json TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  PRIMARY KEY (org_id, key)
);

CREATE INDEX idx_idempotency_expiry ON idempotency_keys(expires_at);

-- Async work: thumbnails, email, audit shipping, export jobs.
CREATE TABLE outbox_jobs (
  id           TEXT PRIMARY KEY NOT NULL,
  org_id       TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  run_after    INTEGER NOT NULL,
  last_error   TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_outbox_pending ON outbox_jobs(status, run_after);

-- Precomputed overview cards. Updated in the report write batch and by a
-- nightly reconciliation job. Do not COUNT(*) all reports per page load.
CREATE TABLE daily_site_summary (
  org_id          TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  site_id         TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  reports_count   INTEGER NOT NULL DEFAULT 0,
  headcount       INTEGER NOT NULL DEFAULT 0,
  equipment_hours REAL NOT NULL DEFAULT 0,
  time_lost_hours REAL NOT NULL DEFAULT 0,
  photo_count     INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER NOT NULL,
  PRIMARY KEY (org_id, site_id, date)
);

CREATE INDEX idx_summary_date ON daily_site_summary(org_id, date DESC);

-- ---------------------------------------------------------------------------
-- 7. Seed rows for the first deploy (edit before running)
-- ---------------------------------------------------------------------------

INSERT INTO orgs (id, name, slug, timezone, created_at, updated_at)
VALUES ('org_pavecon', 'Pave-Con Ltd', 'pavecon', 'America/Jamaica',
        unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO projects (id, org_id, name, client, created_at, updated_at)
VALUES ('prj_legacy', 'org_pavecon', 'Legacy import', NULL,
        unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO sites (id, org_id, project_id, name, code, created_at, updated_at)
VALUES ('site_legacy', 'org_pavecon', 'prj_legacy', 'Unmapped legacy site',
        'LEGACY', unixepoch() * 1000, unixepoch() * 1000);
