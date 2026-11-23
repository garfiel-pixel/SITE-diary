# Scalability & Multi-User Access — Planning Directive

**Project:** Masterbuilders Site Diary (Pave-Con Ltd)  
**Status:** Planning only — no application code changed  
**Date:** 2026-11-09  
**Owner:** Pave-Con (client)  
**Implementation:** Dormant until the client funds scalability

> **Directive for the future implementation agent**
> 1. Read this whole file before writing code.
> 2. Do not guess an API, limit, or platform behaviour. Verify it against current docs or the installed package, and record the check in `docs/`.
> 3. Build phase by phase (P0 → P5). A phase is done only when its gate passes with output shown.
> 4. Keep the current offline-first form working at all times. Cloud sync is additive, never a hard dependency.
> 5. Keep cloud features behind `config.features.cloudSync`, default **off**, until the client signs off.
> 6. Do not silently change the data model, the PDF, or the demo activation flow. Any change to those needs an explicit decision in §14.
> 7. This plan is a scope boundary. Anything not listed here goes to `docs/BACKLOG.md`, not into the build.

> **Review status (2026-11-23):** read [`docs/SCALABILITY_REVIEW.md`](./SCALABILITY_REVIEW.md) **before** implementing this file. It records eight blockers (R2 presigning, server PDF, auth scope, tenancy, the site/date unique key, server-side validation, report timezone, backups) and points to the corrected DDL in [`docs/backend/schema-v2.sql`](./backend/schema-v2.sql). Where this plan and the review disagree, the review wins until the client decides otherwise.

---

## Executive summary (one page for the client)

- **What this adds:** real user accounts, a project/site registry, cloud sync from field devices, and a read-only PM/executive dashboard. The field form, offline behaviour, PDF and Dexie storage stay.
- **How it works:** a device saves locally as it does today → when online it pushes the report and photos to a Cloudflare Worker → the Worker stores the report in D1 and the photos in R2 → the PM signs in and sees every report they are scoped to.
- **Search:** the PM can type a **Recorded by** name, a **workforce member's name**, a **site**, or pick a **date range**, then click a result to open the full report.
- **Roles:** `worker`, `supervisor`, `pm`, `executive` (Director/Owner/CEO), `admin`. Role is the label; **scope** (`own`, `site`, `project`, `global`) is the actual control. A PM can be given global scope if the client wants them to see every site.
- **Cost at pilot scale:** roughly **$5–10/month**, dominated by the Workers Paid minimum. Photos are the only growing cost (R2 at $0.015/GB-month after 10 GB free).
- **Timeline:** about **12–16 weeks** for one experienced full-stack developer after the decisions in §14 are answered.
- **What we need from the client:** answer §14 (one report per site/day, roles, edit vs read-only, SSO, retention, budget). Do not start coding before those are settled.
- **What changed today:** only this document. No application code, schema, or deployment was touched.

---

## 0. What the client asked for

The PM wants a scalable, multi-user version of the Site Diary:

- A **PM login** that behaves like an administrator.
- The PM can see **all reports done by everyone, across every site**.
- The PM can **type a person's name** ("Recorded by"), **filter by date**, **click a result**, and open that report.
- Separate logins for **Director, PM, Owner, CEO**, each seeing only what they are allowed to see.
- Reports are created on local devices (phones/laptops) and **pushed to the cloud**; authorised people can then see them.
- Database queries connect each local report to the cloud record.
- This is **planning only**. No code changes now. If the client pays for scalability later, this plan is the starting point.

---

## 1. Acceptance criteria (what "done" means)

The future build is done when all of these are true:

1. A user can sign in with a company account and is identified by role and scope.
2. A field worker sees only assigned sites and can create/edit reports for those sites.
3. A field worker cannot read another site's report by editing the URL or calling the API directly.
4. A PM sees every report for the projects/sites assigned to them.
5. A PM can search by **Recorded by** name, by **any named workforce member**, by **site**, and by **date range**, then open a report.
6. A Director/Owner/CEO with global scope sees every site, with no field editing unless explicitly granted.
7. A report created offline on a device appears in the cloud **exactly once** after reconnecting, even if the upload is retried.
8. Photos attached to a report are visible in the cloud and the branded PDF can be regenerated from cloud data.
9. Unauthenticated or unauthorised API calls return `401`/`403` and are written to the audit log.
10. The dashboard returns its first page in under 2 seconds on a mid-range phone over 4G, and a name search in under 300 ms at pilot scale.
11. The existing local-only demo still works when `cloudSync` is off.
12. Every export, edit, delete, role change and login is auditable.

---

## 2. Current state — verified facts (not assumptions)

These are the real constraints in the repository today.

| Area | Verified fact | Consequence for this plan |
|---|---|---|
| Hosting | `wrangler.jsonc` serves only static assets from `./app/dist` with SPA fallback. It has **no `main` Worker script and no D1/R2 bindings**. | The cloud API is a new Worker entry point plus bindings. The existing static hosting stays. |
| Local database | `app/src/db.ts` uses Dexie v2. `Report` has free-text `project`/`site`, no `siteId`, no `projectId`, no `recordedByUserId`. | Site identity must be added before cloud scoping can work. |
| One report per day | `reportForDate()` in `app/src/db.ts` returns `all[0]`; the route is `#/report/YYYY-MM-DD`. | Today a device can hold only one report per date, regardless of site. Multi-site work needs `(siteId, date)` and a route change. |
| Routing | `app/src/lib/route.ts` knows only `home` and `report/date`. | The PM dashboard needs new routes and a role guard. |
| Sync | `app/src/sync.ts` is a **mock** upload with a 10% simulated failure. No endpoint, no auth, no idempotency key. | Real sync is a new subsystem. The retry/backoff and `navigator.locks` guard are reusable. |
| Login | `app/src/components/ActivationGate.tsx` is a demo activation code, explicitly "NOT SECURITY". | It can stay as `demoMode`, but it is not the production login. |
| Original directive | `PaveCon_SiteDiary_Directive.md` says "no backend, no real accounts, no payments, no production claims". | This plan deliberately supersedes that boundary **only when funded**. |
| Known gap | `docs/IMPROVEMENTS.md` already notes the mock upload needs a real endpoint, an idempotency key per report, and a documented conflict rule. | Those are requirements here, not new ideas. |

**Bottom line:** scalability is not a single login screen. It is four new subsystems — identity, site registry, cloud sync, and a read-only dashboard — plus one migration of the local data model. The form itself can stay.

---

## 3. Target architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ FIELD DEVICE (phone/laptop)                                     │
│  PWA · React · Dexie (offline) · existing diary form            │
│  Outbox: reports + photos waiting to upload                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS  /api/*
                            │ session cookie + CSRF
┌───────────────────────────▼─────────────────────────────────────┐
│ CLOUDFLARE WORKER (same deployment)                             │
│  ├─ Static assets (existing app/dist)                            │
│  ├─ Auth API (login, session, password reset)                    │
│  ├─ Sync API (push/pull, idempotency, conflicts)                 │
│  ├─ Dashboard API (search, report detail, exports)               │
│  └─ Admin API (users, sites, audit)                              │
└───────────────┬───────────────────────────┬─────────────────────┘
                │                           │
        ┌───────▼────────┐          ┌───────▼────────┐
        │ D1 (SQLite)    │          │ R2 (photos)    │
        │ users, sites,  │          │ compressed     │
        │ reports,       │          │ JPEGs +        │
        │ revisions,     │          │ metadata       │
        │ audit, FTS5    │          └────────────────┘
        └────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│ PM / DIRECTOR / OWNER / CEO (browser)                           │
│  Same PWA, different route: #/admin                             │
│  Read-only overview → search → report detail → PDF/CSV          │
└─────────────────────────────────────────────────────────────────┘
```

### Why Cloudflare

- The app is already deployed as a Cloudflare Worker (`site-diary.garfieldprocis.workers.dev`).
- D1 and R2 bind to the same Worker; no second vendor, no separate server to patch.
- Static asset requests are free and unlimited on Workers (`Workers pricing`, verified 2026-11-09).
- D1 read replication is available at no extra cost if the PM dashboard is read-heavy (`D1 read replication`, verified).
- D1 supports FTS5 full-text search, which is the clean way to search names and notes (`D1 SQL statements`, verified).

**Not chosen for v1:** a separate Node/Postgres server, Supabase, Firebase, or a native app. They add cost and operational surface without a pilot-scale benefit. Revisit only if D1's 10 GB per-database ceiling or single-threaded writes become a measured problem.

---

## 4. Roles, scopes, and permissions

The client named PM, Director, Owner, CEO. Those are job titles, not all distinct permission sets. Model **role + scope** so titles can change without a schema change.

### 4.1 Role definitions

| Role | Default scope | Intended user |
|---|---|---|
| `worker` | `own` + assigned sites | Field supervisor/foreman creating diaries |
| `supervisor` | `site` | Site lead who reviews all reports on their sites |
| `pm` | `project` | Project Manager; multi-site oversight |
| `executive` | `global` | Director, Owner, CEO; read-only company-wide |
| `admin` | `global` | Office/IT administrator; manages users, sites, audit |

`scope` values: `own` (only reports they recorded), `site` (all reports on assigned sites), `project` (all sites in assigned projects), `global` (everything).

**Important:** the role name and the scope are separate. If the client wants the PM to see **every site company-wide**, set `pm.scope = 'global'`; the `pm` label does not have to imply project-only. The same applies to a Director who should only see one project: keep `executive` or `pm` as the label and set `scope = 'project'`.

### 4.2 Permission matrix

| Capability | worker | supervisor | pm | executive | admin |
|---|---|---|---|---|---|
| Create/edit own report | ✓ | ✓ | — | — | — |
| Edit any report on assigned site | — | ✓ | — | — | — |
| View own reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| View assigned site reports | — | ✓ | ✓ | ✓ | ✓ |
| View all sites | — | — | project scope | ✓ | ✓ |
| Search by name/date/site | own scope | site scope | project scope | global | global |
| Download PDF | own | site | project | global | global |
| Export CSV | — | site | project | global | global |
| Delete/soft-delete report | — | ✓ | — | — | ✓ |
| View audit log | — | — | — | ✓ | ✓ |
| Manage users/roles | — | — | — | — | ✓ |
| Manage projects/sites | — | — | — | — | ✓ |
| Approve/flag report (future) | — | ✓ | ✓ | ✓ | — |

**Rules**

- The server enforces every row of this matrix. Hiding a button in React is not enforcement.
- `executive` is read-only by default. The Owner/CEO can be given `admin` separately if they actually want to manage accounts.
- A PM is **not** automatically an admin. The client's phrase "like an administrator" means "sees everything they are scoped to", not "can change roles".
- A worker can never see another worker's report unless their role/scope says so.

### 4.3 Scope resolution (server-side)

For a request from user `u`:

1. If `u.scope = 'global'` → allowed sites = all active sites.
2. If `u.scope = 'project'` → allowed sites = sites in `project_memberships` for `u`.
3. If `u.scope = 'site'` → allowed sites = `site_memberships` for `u`.
4. If `u.scope = 'own'` → allowed sites = assigned sites, **and** report filter adds `recorded_by_user_id = u.id`.
5. No match → `403`, and log the attempt.

The same resolver is used by the sync push, report list, report detail, PDF, CSV, and photo endpoints. One function, one source of truth.

---

## 5. Identity and authentication

### 5.1 Options

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. App-native email + password** | Worker stores PBKDF2 hash; sets an HttpOnly session cookie | One login for everyone; no external identity provider; works on any phone | We own password reset, lockout, MFA; security burden |
| **B. Cloudflare Access SSO** | Cloudflare Zero Trust in front of `/admin/*` and `/api/*`; Worker validates `Cf-Access-Jwt-Assertion` | Google/Microsoft SSO, MFA, no password storage, strong audit | Requires a Zero Trust setup and company identity provider; field phones may find SSO friction |
| **C. Hybrid (recommended)** | Field workers use app login; PM/executives use SSO when available | Best fit: simple for the field, strong for the office | Two flows to test |

**Recommendation:** ship **A** in Phase 1 because it works for every user and every device, then add **B** for `executive`/`admin` in Phase 5 behind `AUTH_MODE=hybrid`. If the client already uses Google Workspace or Microsoft 365, move B earlier.

### 5.2 Password login (Option A)

- Hash: **PBKDF2-HMAC-SHA256**, 16-byte random salt, 32-byte derived key, 600,000 iterations (OWASP 2023 guidance). Verify the CPU cost against the Worker CPU limit during P1; if it is too slow, use a vetted library or Cloudflare Access instead of weakening the iteration count.
- Compare in constant time.
- Password minimum: 12 characters, checked against a breached-password list if a vendor is available. Do not impose composition rules that push users to `Password1!`.
- Session token: 32 random bytes, base64url. Store only `SHA-256(token)` in `sessions.token_hash`. Cookie: `sd_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30-day sliding expiry.
- CSRF: `sd_csrf` readable cookie plus `X-CSRF-Token` header on every `POST`/`PATCH`/`DELETE`. Reject mismatches.
- Login rate limit: 10 attempts / 15 min / IP and 10 failures / 15 min / account, then a 15-minute lock. Add a Cloudflare WAF rate-limit rule as the outer layer.
- Password reset: 32-byte single-use token, stored hashed, 30-minute expiry, generic response whether or not the email exists. Email vendor decision in §14.
- "Sign out all devices": delete all sessions for the user.
- On password change: revoke all other sessions.

### 5.3 Cloudflare Access (Option B)

- Put Access in front of `/admin/*` and `/api/*` with a policy that allows the company identity provider.
- Worker validates the JWT using `jose` with the team's JWKS, `issuer`, and `audience` (`Cloudflare Access: Validate JWTs`, verified 2026-11-09).
- Or use `ctx.access` where the runtime supports it, after reading its limitations for static assets and service bindings.
- Map the Access email to a `users` row. Do not auto-create an admin from an unknown email; unknown users get `403` until invited.

### 5.4 Offline behaviour

- The session cookie persists while offline, so the PWA still opens and local reports remain editable.
- Cloud-only screens (`#/admin`) show an offline notice and cached last results if available; they do not pretend to be live.
- If the session expired while offline, local work is never lost. On reconnect, the app asks the user to sign in before uploading.
- **Never cache the password.** Never put the session token in `localStorage` or IndexedDB.

---

## 6. Data model

### 6.1 Local Dexie changes (future migration v2 → v3)

Add to `Report`:

| Field | Type | Purpose |
|---|---|---|
| `siteId` | `string` | Canonical site key |
| `projectId` | `string` | Canonical project key |
| `recordedByUserId` | `string \| null` | Link to the account; null for legacy/unclaimed names |
| `clientId` | `string` | Stable device id, created once in `settings` |
| `serverRevision` | `number` | Last revision acknowledged by the server (0 = never synced) |
| `lastSyncedAt` | `number \| null` | For the sync badge |
| `deletedAt` | `number \| null` | Tombstone; never hard-delete a synced report |
| `syncError` | `string \| null` | Last failure reason for the UI |
| `payloadHash` | `string` | SHA-256 of the canonical payload; detects no-op retries |

New local tables:

| Table | Key / indexes | Purpose |
|---|---|---|
| `sites` | `id, name, projectId` | Read-only cache of authorised sites |
| `projects` | `id, name` | Read-only cache of authorised projects |
| `users` | `id, email, name` | Display names for `recordedByUserId` |
| `syncMeta` | `key` | Device id, pull cursor, last sync time |

Index changes:

```
reports:  "id, [siteId+date], date, syncState, updatedAt, siteId"
photos:   "id, reportId, groupId, [reportId+groupId]"
sites:    "id, name, projectId"
projects: "id, name"
users:    "id, email, name"
syncMeta: "key"
```

**Uniqueness:** at most one local report per `(siteId, date)`. Dexie does not enforce uniqueness on compound indexes, so enforce it in `reportForSiteDate()` and on create.

**Migration rules**

1. Run a dry-run export of all existing reports before migrating.
2. For each existing report, derive `siteId`/`projectId` from a registry mapping of the free-text `project` and `site` values. If no mapping exists, create one `legacy-default` site under a `legacy` project and attach the report there.
3. `recordedByUserId = null` until an admin links the name to an account.
4. `serverRevision = 0`, `lastSyncedAt = null`, `deletedAt = null`.
5. Keep the old `date`-only route working: `#/report/YYYY-MM-DD` redirects to the default site's report for that date.
6. The migration must be idempotent and must not lose photos.

### 6.2 Cloud schema (D1)

The DDL below is a plan, not a migration to run today. Verify each statement in a D1 spike before applying.

> **Superseded draft:** [`docs/backend/schema-v2.sql`](./backend/schema-v2.sql) is the reviewed version of this schema. It adds `org_id` tenancy, a partial unique index for the active site/date slot, content-addressed photo blobs, archived PDFs, CSRF/session fields, idempotency and outbox tables. Use it as the starting point; keep the SQL below only as historical context.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name               TEXT NOT NULL,
  role               TEXT NOT NULL,              -- worker | supervisor | pm | executive | admin
  scope              TEXT NOT NULL DEFAULT 'site', -- own | site | project | global
  password_hash      TEXT,                       -- NULL for SSO-only users
  password_salt      TEXT,
  password_iterations INTEGER,
  status             TEXT NOT NULL DEFAULT 'active', -- invited | active | suspended
  created_at         INTEGER NOT NULL,
  last_login_at      INTEGER
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  ip           TEXT,
  user_agent   TEXT,
  revoked_at   INTEGER
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  client     TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE TABLE sites (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name       TEXT NOT NULL,
  code       TEXT UNIQUE,
  address    TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  UNIQUE (project_id, name)
);
CREATE INDEX idx_sites_project ON sites(project_id);

CREATE TABLE project_memberships (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE site_memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE reports (
  id                  TEXT PRIMARY KEY,
  client_report_id    TEXT NOT NULL UNIQUE,      -- idempotency key from the device
  site_id             TEXT NOT NULL REFERENCES sites(id),
  date                TEXT NOT NULL,              -- YYYY-MM-DD
  recorded_by_user_id TEXT REFERENCES users(id),
  recorded_by_name    TEXT NOT NULL,
  payload_json        TEXT NOT NULL,              -- full diary payload
  payload_hash        TEXT NOT NULL,              -- SHA-256
  revision            INTEGER NOT NULL DEFAULT 1,
  headcount           INTEGER NOT NULL DEFAULT 0,
  equipment_hours     REAL NOT NULL DEFAULT 0,
  time_lost_hours     REAL NOT NULL DEFAULT 0,
  photo_count         INTEGER NOT NULL DEFAULT 0,
  client_updated_at   INTEGER NOT NULL,
  server_updated_at   INTEGER NOT NULL,
  created_at          INTEGER NOT NULL,
  deleted_at          INTEGER,
  UNIQUE (site_id, date)
);
CREATE INDEX idx_reports_site_date  ON reports(site_id, date DESC);
CREATE INDEX idx_reports_date       ON reports(date DESC);
CREATE INDEX idx_reports_recorded   ON reports(recorded_by_name COLLATE NOCASE);
CREATE INDEX idx_reports_updated    ON reports(server_updated_at);
CREATE INDEX idx_reports_deleted    ON reports(deleted_at);

-- Soft delete and re-creation: UNIQUE (site_id, date) means a deleted report
-- still occupies its site/date slot. Do not hard-delete it and do not insert a
-- duplicate. When a new report is created for a tombstoned site/date, undelete
-- the same row (deleted_at = NULL), write a new revision, and return "created"
-- to the device. A true hard delete is an admin-only maintenance task with an
-- explicit audit entry.

CREATE TABLE report_revisions (
  id           TEXT PRIMARY KEY,
  report_id    TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  revision     INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  source       TEXT NOT NULL,                    -- device | dashboard | migration
  created_at   INTEGER NOT NULL,
  UNIQUE (report_id, revision)
);
CREATE INDEX idx_revisions_report ON report_revisions(report_id, revision DESC);

CREATE TABLE photos (
  id                  TEXT PRIMARY KEY,
  report_id           TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  group_id            TEXT,
  r2_key              TEXT NOT NULL UNIQUE,
  sha256              TEXT NOT NULL,
  bytes               INTEGER NOT NULL,
  width               INTEGER NOT NULL,
  height              INTEGER NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  taken_at            INTEGER,
  uploaded_by_user_id TEXT REFERENCES users(id),
  created_at          INTEGER NOT NULL
);
CREATE INDEX idx_photos_report ON photos(report_id);
CREATE INDEX idx_photos_group  ON photos(report_id, group_id);

CREATE TABLE audit_log (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action        TEXT NOT NULL,                   -- auth.login, report.view, report.export, ...
  entity_type   TEXT,
  entity_id     TEXT,
  site_id       TEXT,
  detail_json   TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_audit_actor  ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_site   ON audit_log(site_id, created_at DESC);

CREATE TABLE invites (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL COLLATE NOCASE,
  role       TEXT NOT NULL,
  scope      TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE devices (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT,
  last_seen_at INTEGER,
  created_at   INTEGER NOT NULL
);
```

### 6.3 Full-text search (FTS5)

D1 supports FTS5 (`D1 SQL statements`, verified 2026-11-09). Use it for the PM's name search and free-text search.

```sql
CREATE VIRTUAL TABLE reports_fts USING fts5(
  report_id UNINDEXED,
  site_id   UNINDEXED,
  date      UNINDEXED,
  recorded_by,
  workforce_names,
  project,
  site,
  wip,
  visitors,
  instructions,
  tokenize = 'unicode61 remove_diacritics 2'
);
```

- `workforce_names` is a space-joined list of every named person in both workforce groups.
- Keep the FTS row in the **same D1 batch** as the report write so they cannot drift. If triggers behave differently in D1, do it in application code; do not rely on an unverified trigger.
- Search with `MATCH` and rank with `bm25()`:

```sql
SELECT report_id, bm25(reports_fts) AS rank
FROM reports_fts
WHERE reports_fts MATCH ?1
ORDER BY rank
LIMIT ?2;
```

- Do **not** use `LIKE '%name%'` for free text. D1 limits a `LIKE`/`GLOB` pattern to 50 bytes (`D1 limits`, verified), and leading-wildcard scans are slow.
- Exact/prefix filters (`site_id`, `date`, `recorded_by_user_id`) use normal indexes.

### 6.4 D1 constraints that shape the design

| Limit | Value | Design response |
|---|---|---|
| Max row size | 2 MB | Keep `payload_json` small; photos live in R2, never in the row |
| Max bound parameters | 100 | Batch inserts in chunks; never build a 500-item `IN (...)` |
| Max SQL statement | 100 KB | Keep queries short |
| Max result size | 50 MB | Keyset pagination, `limit` max 100 |
| Query duration | 30 s | Index every filter; no full scans |
| DB size | 10 GB | Years of text reports fit; photos are in R2 |
| Concurrency | Single-threaded per DB | Batch writes; cache dashboard aggregates if needed |
| `LIKE` pattern | 50 bytes | FTS5 for names/notes |
| Read replicas | Available, no extra cost | Enable for dashboard reads; use Sessions API for consistency |

---

## 7. API contract

Base path: `/api`. JSON in/out. Auth via `sd_session` cookie. State-changing requests require `X-CSRF-Token`. Every response carries `X-Request-Id`.

Error shape:

```json
{
  "error": {
    "code": "FORBIDDEN_SITE",
    "message": "You do not have access to this site.",
    "details": { "siteId": "site_hatfield" }
  }
}
```

### 7.1 Auth

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` → user, role, scope, `csrfToken`; sets cookie |
| `POST` | `/api/auth/logout` | Revoke session |
| `GET` | `/api/auth/me` | Current user, scope, authorised sites/projects |
| `POST` | `/api/auth/password/forgot` | Send reset link; always generic response |
| `POST` | `/api/auth/password/reset` | `{ token, newPassword }`; revokes old sessions |
| `POST` | `/api/auth/password/change` | `{ currentPassword, newPassword }`; revokes other sessions |

### 7.2 Reference data

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sites` | Authorised sites only |
| `GET` | `/api/projects` | Authorised projects only |
| `GET` | `/api/users?q=` | Name/email lookup for linking `recordedBy` (admin/PM only) |

### 7.3 Sync (field devices)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/sync/reports` | Push a batch of up to 10 reports |
| `GET` | `/api/sync/changes?since=<cursor>&siteId=<id>` | Pull changes after a cursor |
| `POST` | `/api/reports/:id/photos/init` | Get a presigned R2 upload URL |
| `POST` | `/api/reports/:id/photos/complete` | Register uploaded photo metadata |

Push request:

```json
{
  "deviceId": "dev_01J...",
  "reports": [
    {
      "clientReportId": "6f1c...",
      "siteId": "site_hatfield",
      "date": "2026-11-09",
      "recordedByUserId": "usr_...",
      "recordedByName": "Andre Anderson",
      "baseRevision": 3,
      "clientUpdatedAt": 1762700000000,
      "payload": { "...full Report..." },
      "payloadHash": "sha256:..."
    }
  ]
}
```

Push response (per item, HTTP 200 even when one item conflicts):

```json
{
  "results": [
    {
      "clientReportId": "6f1c...",
      "status": "updated",
      "serverReportId": "rpt_...",
      "serverRevision": 4,
      "serverUpdatedAt": 1762700001234,
      "serverPayloadHash": "sha256:..."
    }
  ]
}
```

Statuses: `created`, `updated`, `unchanged`, `conflict`, `rejected`.

### 7.4 Dashboard (PM/executive)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports` | Search/list with filters and keyset cursor |
| `GET` | `/api/reports/:id` | Full report + photos + revision summary |
| `PATCH` | `/api/reports/:id` | Edit with optimistic concurrency (if role allows) |
| `DELETE` | `/api/reports/:id` | Soft delete (tombstone) |
| `GET` | `/api/reports/:id/history` | Revision list |
| `GET` | `/api/reports/:id/pdf` | Generate and stream the branded PDF |
| `GET` | `/api/export.csv` | CSV of the current filtered result set |
| `GET` | `/api/summary?date=YYYY-MM-DD` | Overview cards for the dashboard |

List query:

```
GET /api/reports?q=anderson&siteId=site_hatfield&from=2026-10-01&to=2026-11-09&limit=50
```

Response:

```json
{
  "data": [
    {
      "id": "rpt_...",
      "date": "2026-11-08",
      "project": "Hatfield Road Rehabilitation",
      "site": "Chainage 0+400 to 0+900",
      "recordedBy": "Andre Anderson",
      "headcount": 19,
      "equipmentHours": 26.5,
      "timeLostHours": 1.5,
      "photoCount": 3,
      "revision": 4,
      "updatedAt": 1762700001234
    }
  ],
  "nextCursor": "eyJkIjoiMjAyNi0xMS0wOCIsImlkIjoicnB0Xy4uLiJ9"
}
```

### 7.5 Admin

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/users` | List users |
| `POST` | `/api/admin/users` | Invite user with role/scope |
| `PATCH` | `/api/admin/users/:id` | Change role, scope, status |
| `DELETE` | `/api/admin/users/:id` | Suspend (never hard-delete a user with reports) |
| `GET` | `/api/admin/sites` | List all sites |
| `POST` | `/api/admin/sites` | Create site |
| `PATCH` | `/api/admin/sites/:id` | Edit site |
| `GET` | `/api/admin/audit` | Filter audit log |
| `GET` | `/api/health` | Liveness/readiness |

---

## 8. Sync protocol and conflict rules

### 8.1 Push flow

1. The field device saves locally as it does today.
2. When online, `sync.ts` takes reports with `syncState = saved` (plus any `conflict` rows the user chose to retry).
3. Send up to 10 per batch, with `clientReportId` and `payloadHash`.
4. Server:
   - Looks up `client_report_id`.
   - If absent → insert report + revision 1 + FTS row, return `created`.
   - If present and `payload_hash` matches → return `unchanged`.
   - If present and `baseRevision` matches the server's current revision → insert a new revision, update the head row, return `updated`.
   - If `baseRevision` is stale → return `conflict` with the server's current revision and hash.
   - If the site/date is outside the user's scope → `rejected` / `403`.
5. Client marks `uploaded` only on `created`/`updated`/`unchanged`; on `conflict`, it stores the server revision and opens the conflict UI.

### 8.2 Idempotency

- `client_report_id` is unique in D1. A retried request can never create a second report.
- `payload_hash` makes a retry that changes nothing cheap and safe.
- Photo uploads use `sha256` + `r2_key` uniqueness; re-uploading the same photo is a no-op.

### 8.3 Conflict rule (explicit, not guessed)

**Default rule: optimistic concurrency, human choice on conflict.**

- Every report has a `revision`. The device sends the revision it based its edit on.
- If the server has moved on, the device must not silently overwrite it.
- The conflict sheet shows:
  - "This report was updated in the cloud at 14:32 by <name>."
  - **Keep mine** → send the local payload with the current server revision as the new base; server writes revision N+1.
  - **Keep cloud** → discard the local pending edit (but keep a local copy in `report_revisions` for 30 days).
  - **Save as copy** → create a new report with a new `clientReportId` and a note; only if the client decides duplicates are acceptable.
- **No automatic field-level merge in v1.** Merging weather/equipment/materials field-by-field is complex and easy to get wrong. One report per site per day means conflicts should be rare; if they are common, the client has a process problem to fix, not a merge problem.
- Server timestamps are authoritative. Reject `clientUpdatedAt` more than 10 minutes in the future.

### 8.4 Pull flow

- `GET /api/sync/changes?since=<cursor>` returns reports whose `server_updated_at` is greater than the cursor, including tombstones (`deleted_at`).
- The cursor is opaque: base64 of `server_updated_at|id`.
- Field devices pull only sites they are assigned to. They use the pull to show "updated by office" notices and to avoid stale edits.
- PM/executive dashboards do **not** mirror the cloud into IndexedDB in v1. They query live, with a short cache. This keeps the dashboard simple and avoids a second sync engine.

### 8.5 Photos

1. Client requests `POST /api/reports/:id/photos/init` with `{ sha256, bytes, width, height, description, groupId }`.
2. Server returns a short-lived presigned R2 `PUT` URL (or a Worker upload endpoint if presigning is not available in the chosen setup).

> **Correction (2026-11-23):** the R2 Workers binding cannot generate presigned URLs. Presigning requires the R2 S3 API plus stored credentials and bucket CORS. For v1, upload the photo through the Worker (`POST /api/v1/reports/:id/photos`) — the JPEG is already ≤ 400 KB. See `docs/SCALABILITY_REVIEW.md` §B1. If presigning is added later, use `aws4fetch` and a dedicated R2 key with a narrow scope.

3. Client uploads the compressed JPEG (already ≤ 1600 px / ≤ 400 KB from the existing worker).
4. Client calls `POST /api/reports/:id/photos/complete`; server verifies the object exists, records metadata, bumps `photo_count`.
5. Failed photo uploads retry independently; a report can be visible before all photos finish.
6. A scheduled cleanup removes R2 objects with no `photos` row after 24 hours.

### 8.6 Offline and retry

- Reuse the existing retry shape: 2 s, 8 s, 30 s, then cap at 2 minutes, with jitter.
- Reuse `navigator.locks` so two tabs do not sync the same report.
- Trigger on: `online`, `visibilitychange`, after a local save (debounced), manual "Sync now", and a 5-minute interval while online.
- Never block the form on the network. The form's save path stays local-first.

---

## 9. PM / Executive dashboard

### 9.1 Routes

| Route | Screen | Access |
|---|---|---|
| `#/admin` | Overview | pm, executive, admin |
| `#/admin/reports?q=&site=&from=&to=` | Search/list | pm, executive, admin |
| `#/admin/reports/:id` | Report detail | scoped |
| `#/admin/sites/:id` | Site timeline | scoped |
| `#/admin/people?q=` | People search (phase 2) | pm, executive, admin |
| `#/admin/users` | User management | admin |
| `#/admin/audit` | Audit log | executive, admin |

Keep the hash router. Add a role guard that runs before rendering an admin screen. A guard is convenience, not security; the API still checks every request.

### 9.2 Overview

- Date selector, default today.
- Cards:
  - Active sites
  - Reports submitted today / expected
  - Total workers on site
  - Equipment hours
  - Time lost hours
  - Photos uploaded
- "Reports today" list: site, project, recorded by, headcount, status (Submitted / Pending / No report), last updated.
- Click a row → report detail.
- A prominent search field: "Search by name, site, or date".
- Filter chips: Today, This week, This month, Custom.
- Empty states that say what to do, not just "No data".

### 9.3 Search and list

- Search box with 250 ms debounce; query goes to FTS5.
- Filters: site, project, date range, recorded by, has photos, sync status.
- Results as a table on desktop, cards on phones.
- Columns: Date · Site · Project · Recorded by · People · Equip. hrs · Time lost · Photos · Updated.
- Sort: date desc (default), updated desc.
- Keyset pagination with "Load more"; no page numbers.
- URL reflects every filter so a PM can bookmark or share a search.
- "Export CSV" uses the same filters; the export is audited.

### 9.4 Report detail

- Reuse the existing section components in read-only mode (a `readOnly` prop rather than a second renderer).
- Header: date, project, site, recorded by, revision, last updated, sync badge.
- Sections in paper order, same as the form: Project/Site/Day/Date → Weather → Time lost → Equipment → Materials → Workforce → Work in progress → Visitors → Instructions → Toolbox talk → Photos → Recorded by.
- Photos: grid with captions, click to enlarge, keyboard accessible.
- Actions:
  - Download PDF (regenerated from cloud data)
  - Export this report as CSV
  - Copy link
  - View history (revisions)
  - Flag for review (phase 2)
  - Comment (phase 3)
- If the role allows editing: "Edit" opens the form with the current revision; saving uses optimistic concurrency.
- If the report is deleted: show a tombstone banner, not a 404.

### 9.5 People search (phase 2)

- Search a worker name across all authorised sites.
- Result: days worked, sites, last report date, total hours if available.
- Click a person → filtered report list.
- Only names and work history; no phone numbers, addresses, or pay data.
- This directly answers "if they want to find someone, they just type in their name".

### 9.6 Mobile behaviour

- PMs will check this on a phone. Cards under 768 px, not a squeezed table.
- Sticky search, bottom navigation: Overview · Reports · Sites · More.
- 56 px touch targets, high-contrast sunlight theme, same tokens as the field app.
- No horizontal scroll at 400 px.

---

## 10. Security, privacy, and audit

- **Authorization:** one `resolveScope(user)` function used by every endpoint. Deny by default.
- **SQL:** parameterised statements only. No string interpolation of user input into SQL.
- **CSRF:** double-submit token on all mutations.
- **XSS:** React escapes by default; do not add `dangerouslySetInnerHTML` for report text. If rich text is ever added, sanitise it.
- **CSP:** add a strict `Content-Security-Policy` in `app/public/_headers`; allow only self-hosted assets. Re-check the existing PWA/service-worker needs.
- **Rate limits:** login 10/15 min/IP; sync 60/min/user; export 10/hour/user; admin 30/min/user.
- **Session security:** revoke on password change; "sign out all devices"; rotate token on privilege change.
- **Audit log:** login, logout, failed login, report view, report export, report edit, report delete, role change, invite, site change. Include actor, IP, user agent, entity, timestamp. Do not log passwords or tokens.
- **PII:** worker names and photos are personal data. Define retention, access, and deletion handling before launch. Jamaica's Data Protection Act (2020) is relevant; confirm with the client's adviser. This plan is not legal advice.
- **Backups:** D1 Time Travel (30 days on Workers Paid, 7 days on Free — verified). Add a weekly logical export to R2 for disaster recovery, and test a restore.
- **Secrets:** `wrangler secret put`; never in the client bundle or the repo.
- **Least privilege:** only the `admin` role manages users; executives read and export. No shared accounts.
- **Data location:** choose the D1 primary region closest to the client (for Jamaica, likely ENAM). Enable read replication for dashboard reads if latency warrants it.

---

## 11. Scale and cost envelope

All figures verified against Cloudflare docs on 2026-11-09. Re-check before quoting the client.

| Item | Included / price | Source |
|---|---|---|
| Workers Paid | $5/month minimum; 10M requests/month included; 30M CPU ms included; static assets free and unlimited | Workers pricing |
| D1 Paid | 25B rows read/month; 50M rows written/month; 5 GB storage included; $0.75/GB-month after; 10 GB max per database | D1 pricing / limits |
| D1 read replication | No extra storage or compute cost; Sessions API required | D1 read replication |
| R2 | 10 GB-month free; $0.015/GB-month; free egress | R2 pricing |

### Pilot estimate

Assume 20 active sites, one report per site per day, 250 working days, 30 photos per report at 400 KB:

- Reports: 5,000/year. Payload ~20 KB each → ~100 MB/year. Ten years ~1 GB.
- Photos: 5,000 × 30 × 400 KB ≈ 60 GB/year. After the 10 GB free tier, ~50 GB × $0.015 ≈ **$0.75/month** in year one, growing with retention.
- D1 reads: dashboard queries with indexes are thousands per day, far below 25B/month.
- D1 writes: 5,000 reports × a few rows each, far below 50M/month.

**Expected steady state: roughly $5–10/month at pilot scale**, dominated by the Workers Paid minimum. The cost only becomes interesting when photo retention grows into hundreds of GB or when many concurrent users hit one D1 database.

### Scaling path if the pilot outgrows one D1 database

1. Add a `daily_site_summary` table (or KV cache) so the overview does not scan reports.
2. Enable D1 read replication and use Sessions API for dashboard reads.
3. Partition by year (`reports_2026`, `reports_2027`) or by region if the 10 GB ceiling is near.
4. If write throughput or relational needs exceed D1, move to Postgres + Hyperdrive. This is a re-architecture, not a toggle; only do it on measured need.

**Monitoring:** D1 rows read/written, query duration, Worker errors, login failures, sync backlog, R2 storage. Alert when the daily sync backlog exceeds 50 reports or the login failure rate exceeds 5%.

---

## 12. Rollout plan

| Phase | Deliverable | Gate | Rough effort |
|---|---|---|---|
| **P0 — Decisions** | Answer §14; confirm roles, site registry, auth mode, retention, budget | Signed decision record | 1 week |
| **P1 — Identity & sites** | Users, sessions, login/logout, password reset, projects/sites, memberships, admin seed, route guard | G18 | 2–3 weeks |
| **P2 — Cloud reports & photos** | D1 schema, `/api/sync/reports`, idempotency, revisions, R2 photo upload, FTS row | G19 | 3–4 weeks |
| **P3 — PM dashboard** | Overview, search, report detail, PDF regeneration, CSV, audit of exports | G20 | 2–3 weeks |
| **P4 — Two-way sync & conflicts** | Pull cursor, tombstones, conflict UI, offline queue polish | G21 | 2 weeks |
| **P5 — Governance & hardening** | Audit screens, rate limits, backups/restore drill, SSO/MFA, load test, UAT, rollout | G22–G24 | 2–3 weeks |

**Total:** roughly 12–16 weeks for one experienced full-stack developer, plus client review time. Do not compress P1/P2; identity and sync are where the risk lives.

### Migration sequence

1. Back up the existing local database (export all reports and photos).
2. Build the project/site registry and map every existing free-text `project`/`site` pair.
3. Ship the Dexie v3 migration with `cloudSync` **off**; verify old reports still open and PDFs still match.
4. Turn on cloud sync for one pilot site and a handful of users.
5. Run both local PDF and cloud PDF for the same report; compare text and photo layout.
6. Expand site by site. Keep local-only mode available as a fallback.
7. After 4 weeks of clean pilot data, enable PM/executive accounts company-wide.

### Rollback

- Set `cloudSync` off: the app returns to local-only; no data is deleted.
- Cloud remains read-only for the PM; no field data is lost.
- Keep the last Dexie schema version readable for at least one release cycle.
- A failed migration must restore the pre-migration export, not attempt a second migration in place.

---

## 13. Test gates

These are additions to the existing G0–G17 suite. Each gate must show output; "it looks fine" is not a pass.

### G18 — Auth and RBAC

- Login with valid/invalid credentials; lockout after 10 failures.
- Session expiry and revocation; "sign out all devices".
- CSRF token missing/wrong → `403`.
- Worker cannot `GET /api/reports?siteId=other` → `403`.
- Worker cannot open another site's report by ID → `403`.
- PM sees assigned projects only; executive sees all; admin can manage users.
- Password reset token is single-use and expires.
- Unauthenticated API call → `401`; attempt is audited.

### G19 — Sync integrity

- Create a report offline, reconnect, upload; cloud row exists once.
- Retry the same upload 5 times; still one report, one revision.
- Edit on the device, upload, edit again; revisions increment correctly.
- Simulate a stale `baseRevision`; conflict is returned and the UI offers the three choices.
- Delete a report; tombstone syncs; detail shows the deleted banner.
- Upload a photo; R2 object and metadata row exist; `photo_count` matches.
- Re-upload the same photo; no duplicate.
- Future `clientUpdatedAt` is rejected.
- App closed mid-upload; boot recovery returns it to `saved` and it uploads later.

### G20 — Dashboard

- Search by `recordedBy` returns the expected reports.
- Search by a workforce member's name returns reports where they appear but did not record.
- Date range and site filters combine correctly.
- Keyset pagination returns no duplicates and no gaps.
- Deep link with filters restores the same result set.
- Report detail matches the device's PDF text for the same report.
- CSV export contains exactly the filtered rows and is audited.
- Empty state and error state are usable.

### G21 — Scale

- Seed 10,000 reports and 100,000 photo rows.
- `EXPLAIN QUERY PLAN` shows index use; no full table scans on the dashboard queries.
- p95 list/search < 300 ms; overview < 2 s on a throttled mid-range phone.
- Sync batch of 10 reports completes < 5 s on 4G.
- D1 rows read/written per pilot day stays within the included tier.

### G22 — Security

- OWASP Top 10 checklist: injection, broken access control, auth, CSRF, XSS, misconfiguration, dependencies.
- Rate limits actually fire.
- Session fixation and cookie flags checked.
- Audit log has no passwords/tokens.
- CSP does not break the PWA or PDF generation.
- `npm audit` / dependency review has no unresolved critical issue.

### G23 — Accessibility and mobile

- Lighthouse Accessibility ≥ 95 on the dashboard.
- Keyboard-only search, filter, open report, download PDF.
- Screen reader announces results count and loading state.
- 400 px width, no horizontal scroll, 56 px targets.
- Sunlight contrast passes the existing token rules.

### G24 — Data integrity and recovery

- Dexie v2 → v3 migration on a copy of real data; every report and photo still present.
- D1 Time Travel restore drill; document the recovery time.
- Weekly R2 export restore drill.
- Revision history reconstructs any prior report.

---

## 14. Decisions the client must make before coding

These are deliberately unanswered. Do not guess them.

| # | Decision | Recommended default | Why it matters |
|---|---|---|---|
| 1 | Is there **one report per site per day**, or one per supervisor? | One canonical report per site/day, with revisions | Drives the unique key, conflict rules, and dashboard rows |
| 2 | Exact roles: which titles are global, which are project-scoped? | worker, supervisor, pm, executive (director/owner/CEO), admin | Drives the permission matrix and user onboarding |
| 3 | Can PMs edit/approve, or only read? | Read-only + flag/comment in v1 | Editing adds conflict and audit complexity |
| 4 | App passwords or company SSO? | App passwords in P1; SSO for execs in P5 | Changes the auth build and support burden |
| 5 | Is MFA required for executives? | Yes, via SSO or TOTP | Security and rollout friction |
| 6 | Retention for reports and photos? | Reports 7 years; photos 2 years, configurable | Storage cost and legal exposure |
| 7 | Can field workers see other sites? | No, only assigned sites | Scope resolver and UI |
| 8 | PDF generated on demand or archived? | On demand; archive only if audit requires it | Storage and staleness |
| 9 | Where should data live / any residency requirement? | Closest D1 primary (ENAM for Jamaica); read replication on | Latency and compliance |
| 10 | Monthly budget ceiling? | Approve Workers Paid; expect $5–10/month at pilot scale | Prevents a surprise bill |
| 11 | Who administers users? | Office admin, not the PM | Separation of duties |
| 12 | Keep the demo activation gate? | Yes, behind `demoMode` | Avoids breaking the current demo |
| 13 | Email vendor for invites/resets? | Choose one (e.g., Resend/Postmark) in P1 | Needed for password reset |
| 14 | Do photos need captions/comments from PMs? | Captions only in v1; comments in v2 | Scope control |

---

## 15. Out of scope for this phase

Do not build these under this plan:

- Payroll, wages, or accounting.
- GPS/location tracking or geofencing.
- Client-facing portal.
- Live chat or push notifications.
- AI summaries or anomaly detection.
- Scheduling, inventory, or equipment telematics.
- Native iOS/Android apps.
- Offline access to the PM dashboard.
- Field-level automatic merge of conflicting reports.
- Billing/subscriptions.

Add them to `docs/BACKLOG.md` and decide separately.

---

## 16. Definition of done

- [ ] All decisions in §14 are answered and recorded.
- [ ] G18–G24 pass with output attached to `artifacts/`.
- [ ] A field worker can create a report offline and see it in the PM dashboard after reconnect.
- [ ] A PM can search by a worker's name, filter by date, and open the report in two taps.
- [ ] An executive sees all sites; a worker cannot see another site even by URL.
- [ ] The PDF generated from the cloud matches the PDF generated on the device.
- [ ] The audit log answers "who viewed/exported/changed this report?"
- [ ] The demo still works with `cloudSync` off.
- [ ] The client has signed off on cost, retention, and roles.

---

## 17. Evidence and references

Checked on 2026-11-09:

- D1 limits — https://developers.cloudflare.com/d1/platform/limits/
- D1 pricing — https://developers.cloudflare.com/d1/platform/pricing/
- D1 SQL statements / FTS5 — https://developers.cloudflare.com/d1/sql-api/sql-statements/
- D1 read replication — https://developers.cloudflare.com/d1/best-practices/read-replication/
- Workers static assets binding / `run_worker_first` — https://developers.cloudflare.com/workers/static-assets/binding/
- Workers pricing — https://developers.cloudflare.com/workers/platform/pricing/
- R2 pricing — https://developers.cloudflare.com/r2/pricing/
- Cloudflare Access JWT validation — https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

Repository files inspected for this plan:

- `wrangler.jsonc`
- `app/src/db.ts`
- `app/src/sync.ts`
- `app/src/lib/route.ts`
- `app/src/Home.tsx`
- `app/src/App.tsx`
- `app/src/components/ActivationGate.tsx`
- `app/src/diary/DiaryScreen.tsx`
- `PaveCon_SiteDiary_Directive.md`
- `docs/IMPROVEMENTS.md`
- `docs/BACKLOG.md`

Platform docs change. Re-verify every limit and API before implementation.
