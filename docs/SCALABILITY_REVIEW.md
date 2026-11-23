# Scalability plan — technical review and corrections

**Reviewed:** 2026-11-23  
**Subject:** [`docs/SCALABILITY_PLAN.md`](./SCALABILITY_PLAN.md)  
**Verdict:** The plan is a strong first draft and the phase order is right. It is **not yet safe to hand to an implementation agent** without the corrections below. Eight issues are blockers; the rest are correctness, cost, and operations improvements.

This review changes no application code. It adds one thing the plan lacks: a schema draft that already contains the fixes ([`docs/backend/schema-v2.sql`](./backend/schema-v2.sql)).

---

## 1. What was checked

| Checked | How |
|---|---|
| Plan against the current repo | Read `wrangler.jsonc`, `app/src/db.ts`, `sync.ts`, `lib/route.ts`, `App.tsx`, `Home.tsx`, `diary/DiaryScreen.tsx`, `components/ActivationGate.tsx` |
| Cloudflare platform claims | Live Cloudflare docs for D1 limits/pricing/read replication, Workers limits, R2 pricing and S3 API, Browser Rendering, Queues, Rate Limiting, Logs, Time Travel |
| Security defaults | OWASP Password Storage Cheat Sheet, OWASP ASVS themes, cookie/CSRF practice |
| Legal/operational exposure | Jamaica Data Protection Act 2020 (personal data of workers, photos of people) |

Platform facts used here are listed with dates in §12. Re-verify them at implementation time; Cloudflare changes limits.

---

## 2. Blockers — fix before any code is written

### B1. R2 presigned uploads do not work through the Workers binding

**Plan says** (§8.5): the Worker returns “a short-lived presigned R2 `PUT` URL”.

**Reality:** the R2 Workers binding cannot sign S3 URLs. Presigning needs the **R2 S3 API** with an access key/secret and a signer such as `aws4fetch`. That means storing long-lived R2 credentials as Worker secrets and adding CORS rules on the bucket.

**Recommendation:** do **not** presign in v1. Proxy the upload through the Worker:

```
POST /api/v1/reports/:id/photos
Content-Type: image/jpeg
Body: the compressed JPEG (≤ 400 KB today)

Worker: authenticate → check report scope → stream body to R2 → insert blob row
```

Why this is better here:

- No extra R2 credentials, no bucket CORS, no signature clock skew.
- Photos are already ≤ 400 KB after the existing client-side shrink, well inside the Worker request body limit.
- The Worker can verify `sha256`, dimensions, and content type before writing.
- One auth check, one audit entry, one code path.

If direct-to-R2 is later needed for large files, add the S3 signer then. Keep the API shape (`init` → upload → `complete`) only if you actually presign; otherwise collapse it into one request.

### B2. Do not run pdfmake inside a Worker

**Plan says** (acceptance criterion 8, §12 P3): “the branded PDF can be regenerated from cloud data”.

Running the existing PDF builder server-side drags in pdfmake, fonts, image decoding, and a large bundle into a 128 MB / 30 s Worker. That is fragile and duplicates the client output.

**Recommendation (two layers):**

1. **Archive what already works.** When a report is uploaded, the client also uploads the PDF it just generated to R2 (`reports/<org>/<report>/<revision>.pdf`). Record it in `report_artifacts` (or on the revision) with `r2_key`, `sha256`, `generated_at`, and `generator`. This is the audit copy and the fast download path.
2. **Regenerate only on demand** with **Browser Rendering `/pdf`** against a server-rendered HTML view, or re-run the client builder in the browser and upload the result. Do not bundle pdfmake in the Worker.

The plan’s own decision table (§14 #8) says “on demand; archive only if audit requires it”. For a construction diary that may be used in a dispute, **archive is the safer default**. Make archiving the default and make it cheap: the client already has the bytes.

### B3. “Build auth” is under-costed; decide buy vs build first

The plan treats authentication as a 2–3 week P1 item. For a small company, a correct auth build includes password reset, invites, lockout, session revocation, MFA, audit, email deliverability, and support. That is usually **4–6 weeks**, not 2–3.

Also, the plan implies Argon2id. Workers’ Web Crypto exposes **PBKDF2**, not Argon2id. Argon2id via WASM is possible but needs a spike to prove it fits the 128 MB memory and CPU budget under login load. PBKDF2-HMAC-SHA256 at OWASP’s 600,000 iterations is the realistic native option.

**Recommendation:** answer this before P1:

| Option | Fit | Cost / risk |
|---|---|---|
| **A. Buy identity** (Cloudflare Access for staff + magic link/OTP, or Clerk/WorkOS/Auth0) | Fastest, least security risk | Monthly fee per user; vendor dependency; field-device flow needs design |
| **B. Build app passwords** with PBKDF2 600k + TOTP MFA | Full control, works offline-ish | 4–6 weeks; you own reset, lockout, deliverability, breach response |
| **C. Hybrid** — Access/SSO for PM/executive/admin, app passwords for field supervisors | Good security/effort balance | Two login paths to test and support |

The plan currently assumes B without saying so. Record the choice in §14.

### B4. Add tenancy (`org_id`) from day one

The schema has no organisation boundary. A single company can live with that, but the moment there are two legal entities, a subcontractor, or a bought-out division, every table needs a backfill and every query needs a new predicate. Adding `org_id` now costs one column and one index per root table.

**Recommendation:** add `orgs`, put `org_id` on the root business tables (`projects`, `sites`, `reports`, `audit_log`), and resolve scope inside an org. Keep `users` global by email and link them through `org_memberships`, so one person can work for two entities without duplicate accounts. Even if there is exactly one row in `orgs` forever, the boundary is explicit and testable.

The draft schema does this.

### B5. `UNIQUE (site_id, date)` is the wrong constraint to bake in before §14 is answered

The plan simultaneously says:

- “One canonical report per site/day” (§14 #1 default),
- “one per supervisor” may be the real model, and
- soft-deleted reports must be undeleted because the unique key still occupies the slot (§6.2 comment).

That is three behaviours fighting one index. It also blocks the common case of a day shift and a night shift, or two crews on one large site.

**Recommendation:** do not put a plain `UNIQUE (site_id, date)` on the head table. Use one of these, explicitly:

- **Default (one active report per site/day):** a **partial unique index**:
  ```sql
  CREATE UNIQUE INDEX ux_reports_active_slot
    ON reports(org_id, site_id, date)
    WHERE deleted_at IS NULL AND superseded_at IS NULL;
  ```
  Deleting frees the slot without an undelete trick.
- **If multiple reports per day are allowed:** add `slot TEXT NOT NULL DEFAULT 'day'` and `UNIQUE (org_id, site_id, date, slot)`.

Both are in the draft schema, with the second commented out. Pick one in §14 and delete the other.

### B6. The server must not trust the client’s derived numbers

`reports.headcount`, `equipment_hours`, `time_lost_hours`, and `photo_count` are replicated from the client. If they are written as-is, the dashboard can disagree with the report body and there is no single source of truth.

**Recommendation:** validate the payload against a shared schema (Zod or similar) and **recompute every derived field server-side** before writing the head row. Store the validated canonical JSON, not the raw request body. Reject payloads over a size cap (e.g. 512 KB) and unknown top-level keys.

Also canonicalise JSON (stable key order) before hashing, or the same logical payload will produce different `payload_hash` values and defeat idempotency.

### B7. Report date needs an explicit timezone

`date` is `YYYY-MM-DD`, but nothing defines which midnight. A supervisor finishing at 00:30 in Jamaica must not file into the next day because the Worker runs in UTC. Jamaica is UTC−5 year-round, which makes the bug easy to miss in testing and painful in production.

**Recommendation:** store `timezone` on the org (default `America/Jamaica`), compute `date` on the device in that zone, and have the server accept only a date within ±1 day of “now in org timezone”. Record both `date` and `client_recorded_at` so an auditor can see the wall-clock time.

### B8. Backups are named but not designed

The plan relies on D1 Time Travel and an R2 export “drill”. Time Travel is a **destructive in-place restore** with 30-day retention on Paid; it is not a logical backup, not cross-account, and not protection against a bad migration that is discovered after 30 days.

**Recommendation:** define three layers and a runbook:

1. **D1 logical export** on a schedule (`wrangler d1 export` or the D1 export API) to R2 in a separate bucket/prefix, with 90-day retention.
2. **R2 object versioning + lifecycle** for photos and archived PDFs.
3. **Quarterly restore drill** into a scratch database, with the restore time recorded. A backup that has never been restored is a hope, not a backup.

Add `docs/runbooks/backup-restore.md` in P5, and rehearse it earlier — ideally in P2, before real data exists.

---

## 3. Correctness improvements (should fix)

### 3.1 Sessions, cookies and CSRF

The schema stores only `token_hash`; there is nowhere to bind a CSRF token. Add:

- Cookie name `__Host-sd_session` (forces `Secure`, `Path=/`, no `Domain`).
- `HttpOnly; Secure; SameSite=Lax`.
- 32 random bytes for the session token; store SHA-256 only.
- Sliding idle expiry (e.g. 14 days) **plus** an absolute cap (e.g. 90 days). Store both.
- CSRF: signed double-submit token bound to the session id, rotated on login. Reject state-changing requests without it.
- “Sign out all devices” = revoke every session row for the user.
- Rotate the session id on privilege change (role/scope edit, password change).

The draft schema adds `csrf_hash`, `absolute_expires_at`, `rotated_at`, and `device_id`.

### 3.2 Photo storage: content-address it

The plan stores `sha256` and `r2_key` per photo row. If the same photo appears on two reports (copy-from-yesterday, duplicate upload), it is stored twice and deduplicated only by `r2_key`.

**Recommendation:** content-address the blob: `blobs(sha256 UNIQUE, r2_key, bytes, width, height, content_type)` plus `report_photos(report_id, blob_id, …)`. Upload becomes: hash → if blob exists, reuse; else write object. This saves storage and makes retries naturally idempotent. Generate a small thumbnail (e.g. 480 px) at upload for the dashboard; never send full-size photos to a list view.

### 3.3 Revision storage grows without bound

Every revision stores the full `payload_json`. With 7-year retention and a 512 KB cap, one busy site can dominate the 10 GB D1 ceiling.

**Recommendation:** keep the head payload plus the **last 20 revisions** in D1, gzip older payloads into R2 (`revisions/<report>/<n>.json.gz`), and keep the revision metadata row. Set a retention rule per org. At minimum, record `payload_bytes` and alert on growth.

### 3.4 Recompute, don’t duplicate, search text

`workforce_names` is a denormalised field. That is fine for FTS, but it must be built server-side from the validated payload. Do not accept it from the client, and do not let it drift: write the FTS row in the same `batch()` as the report/revision rows. If a batch is not possible, use an outbox row and a scheduled repair job.

### 3.5 Search: FTS5 is right, with caveats

- Use FTS5 for free text and names, as planned.
- Keep exact filters (`site_id`, `date`, `recorded_by_user_id`) on normal indexes.
- Do not use leading-wildcard `LIKE`; D1 caps the pattern at 50 bytes and it scans.
- Do not stem names (`porter` tokenizer would mangle surnames); `unicode61 remove_diacritics 2` is the right choice.
- Consider an external-content FTS table only after measuring duplication; a standalone table is simpler and the data is small.
- Add a `rebuild` command and test it. FTS indexes get out of sync after bulk imports.

### 3.6 Scope resolution needs one function, not scattered checks

`role` + `scope` + project/site memberships can disagree. Define one authority:

```
can(user, action, resource) -> allow | deny
```

with a written precedence order (global > project > site > own), and test it as a pure function. Every API route calls it. Never duplicate the rule in the dashboard guard, the SQL `WHERE`, and the UI.

### 3.7 Idempotency beyond sync

The plan only makes report sync idempotent. Add an `Idempotency-Key` header (or reuse `client_report_id`) for:

- invites,
- password reset requests,
- CSV/PDF export jobs,
- admin mutations.

Store the key and response hash for 24 hours. Retried mobile requests are normal, not exceptional.

### 3.8 Validation and limits

- One shared schema module used by client and Worker (Zod is a good fit; it tree-shakes).
- Cap: report JSON ≤ 512 KB, ≤ 30 photos per report, ≤ 10 reports per sync batch, text fields ≤ defined lengths.
- Reject non-finite numbers, negative hours, future dates, and unknown enum values.
- Sanitise all text at render time; never build HTML from user text.
- Reject `clientUpdatedAt` more than 10 minutes ahead of server time (plan already says this — keep it).

### 3.9 Deleting and retention

Tombstones are correct for sync. Add a retention job:

- Reports: 7 years (or the client’s legal requirement), then purge payload + photos, keep an audit stub.
- Photos: 2 years after report lock, unless the report is under dispute.
- Audit log: 2 years hot in D1, then export to R2.
- Honour data-subject requests (access/correction/erasure) with a documented process; erasure may be limited by legal retention.

### 3.10 Audit log must be append-only and complete

- Write the audit row in the same `batch()` as the mutation where possible. If the mutation succeeds and the audit write fails, you have an unauditable change.
- `UPDATE`/`DELETE` on `audit_log` should be blocked by policy and by code review; D1 has no row-level security, so enforce it in the Worker.
- Hash or drop raw IPs if you do not need them; keep `request_id` and `user_agent` for investigations.
- Add `org_id`, `request_id`, `before_hash`, `after_hash` to the schema (the draft does).

### 3.11 API shape

- Version the path from day one: `/api/v1/...`.
- Return a stable error envelope with `code`, `message`, `details`, `requestId`.
- `GET /api/v1/reports` must support keyset pagination (`(date, id)`), never `OFFSET`.
- Cap `limit` at 100; default 25.
- Add `ETag`/`If-None-Match` for report detail and reference data.
- Publish an OpenAPI file and generate the client types from it; otherwise the client and Worker will drift.

### 3.12 Worker routing and static assets

`wrangler.jsonc` currently has no `main` Worker. When the API is added:

- Set `main` to the Worker entry.
- Keep `assets` with `not_found_handling: "single-page-application"`.
- Use `run_worker_first` only for `/api/*`, so static assets stay on the CDN fast path.
- Add a `/api/health` route that checks D1 with a trivial query and returns the deployed version.
- Add `compatibility_flags` deliberately; do not float the compatibility date without a test run.

---

## 4. Cost and performance corrections

### 4.1 The $5–10/month estimate is plausible but incomplete

The Workers Paid minimum dominates. The variable costs the plan underplays:

| Cost | When it appears | Control |
|---|---|---|
| D1 rows read/written | Dashboard queries, FTS, sync retries | Indexes, keyset pagination, caching summaries |
| R2 storage + Class A/B ops | Photos, archived PDFs, thumbnails | Content addressing, lifecycle rules, thumbnails only in lists |
| Browser Rendering hours | PDF regeneration | Archive PDFs at upload; regenerate rarely |
| Queues operations | Thumbnails, email, audit shipping | Batch, and only enqueue when needed |
| Logs | High-cardinality request logs | Sample, and set a retention/export policy |
| Email | Invites and resets | One vendor, rate-limited |

Add a **budget alert** and a monthly cost review. A pilot with 30 users and 20 photos/day is cheap; a company-wide rollout with 5,000 photos/day and on-demand PDFs is not.

### 4.2 D1 write throughput is the real ceiling

D1 is single-threaded per database. Report + revision + FTS + audit + photo metadata in one request is several writes. At pilot scale this is fine; at company scale, batch aggressively and consider a Queue for non-critical writes (audit shipping, thumbnails).

If write volume or relational complexity outgrows D1, move to Postgres + Hyperdrive. Do it on measured need, as the plan says.

### 4.3 Read replication changes consistency

If read replication is enabled:

- Use the Sessions API. `first-primary` for read-your-writes (e.g. immediately after a sync), `first-unconstrained` for dashboard lists.
- Do not assume a write is visible in a replica. Test the sync-then-read path explicitly.
- Replicas do not help write throughput.

### 4.4 Rate limiting needs a Durable Object for strict login limits

The Workers Rate Limiting binding is approximate and per-location. That is fine for general API protection. For **login lockout** and **password reset**, use a Durable Object (or D1 counter with a unique constraint) so the limit is global. Add Turnstile to the login and reset forms if abuse appears.

### 4.5 Dashboard performance

- Precompute the overview cards in a `daily_site_summary` table, updated on report write and by a nightly job. Do not `COUNT(*)` across all reports on every page load.
- Serve thumbnails, not originals, in lists.
- Cache reference data (`/sites`, `/projects`, `/users?q=`) with a short TTL and `ETag`.
- Measure on a throttled mid-range phone, not a desktop.

---

## 5. Operations and governance

### 5.1 Observability

- Workers Logs retain 7 days. For audit-grade retention, ship to R2 or an external sink.
- Add structured logs with `request_id`, `org_id`, `user_id`, `route`, `status`, `duration_ms`. Never log passwords, tokens, or full payloads.
- Alerts: error rate, p95 latency, login failures, sync backlog > 50, D1 size > 70% of 10 GB, R2 growth, queue depth.
- Add a synthetic check that logs in, lists reports, and opens one report every 5 minutes.

### 5.2 Security headers and CSP

The app currently sets only `X-Content-Type-Options` and `Referrer-Policy`. Add:

- `Strict-Transport-Security`
- `Content-Security-Policy` (see below)
- `Permissions-Policy`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
- `Cross-Origin-Opener-Policy: same-origin`

CSP caution: `app/index.html` contains an inline theme script. A strict CSP needs a nonce (injected at build/serve time) or a hash. Do not ship `unsafe-inline` for scripts. `style-src` will need `unsafe-inline` unless you refactor inline styles; document that trade-off.

### 5.3 Legal and privacy (Jamaica)

The diary contains **personal data**: worker names, roles, attendance, and photos that may show identifiable people.

- Publish a privacy notice: what is collected, why, where it is stored, retention, who can see it.
- Define a lawful basis and a data-subject request process.
- Get consent/notice for photos of identifiable people; avoid publishing faces in exports where not needed.
- Confirm data residency expectations. Cloudflare’s global network is not a single-country store; if residency is required, that changes the architecture.
- Have the client’s lawyer review retention and employee-monitoring implications. This review is engineering, not legal advice.

### 5.4 Support and rollout

- A feature flag per capability (`cloudSync`, `multiSite`, `pmDashboard`), default off.
- Canary one site, then one project, then company-wide.
- A kill switch that returns the app to local-only without deleting data.
- A one-page support runbook: “user cannot log in”, “report stuck uploading”, “photo missing”, “wrong site”.
- Training material for supervisors and the PM; the form must not change under them mid-rollout.

---

## 6. Recommended answers to §14 (decisions)

| # | Decision | Recommendation | Note |
|---|---|---|---|
| 1 | One report per site/day? | **One active report per site/day**, with day/night `slot` added only if the client confirms shifts | Use a partial unique index |
| 2 | Roles | `worker`, `supervisor`, `pm`, `executive`, `admin`; scope separate | Keep role and scope orthogonal |
| 3 | PM edit/approve | **Read + approve/lock + comment**; no field editing in v1 | Approval is cheap and valuable; editing is not |
| 4 | Passwords vs SSO | **Hybrid**: SSO/Access for office roles, app passwords for field | Decide before P1 |
| 5 | MFA for executives | **Required** (SSO MFA or TOTP) | Add recovery codes |
| 6 | Retention | Reports 7 years; photos 2 years after lock; audit 2 years hot | Configurable per org |
| 7 | Worker cross-site visibility | **No**; assigned sites only | Test by URL and by direct API |
| 8 | PDF | **Archive at upload**, regenerate on demand via Browser Rendering | Cheapest audit trail |
| 9 | Data location | Closest primary (ENAM); read replication on | Confirm residency with client |
| 10 | Budget | Approve Workers Paid; set alerts; review monthly | Expect > $10 at company scale |
| 11 | Admin | Office admin, not the PM | Separation of duties |
| 12 | Demo gate | Keep behind `demoMode` | Do not break the demo |
| 13 | Email | One transactional vendor; verify SPF/DKIM | Resend/Postmark are fine |
| 14 | PM comments | Captions in v1; threaded comments later | Scope control |

---

## 7. Revised phase plan

The original 12–16 weeks is optimistic if auth is built from scratch and PDFs are regenerated server-side. A realistic range is **14–20 weeks** for one experienced developer, or **10–14 weeks** with a bought identity provider.

| Phase | Deliverable | Exit gate |
|---|---|---|
| **P0 — Decisions + spikes** (1–2 wk) | Answer §14; run three spikes: D1 schema/FTS, R2 upload path, PDF archive/regenerate | Spike notes with timings; signed decisions |
| **P1 — Identity + org + sites** (3–5 wk) | Orgs, users, sessions, CSRF, invites, reset, MFA (if chosen), projects/sites, scope resolver | Auth/RBAC gate |
| **P2 — Cloud reports + photos** (4–5 wk) | Schema v2, sync push, revisions, R2 upload, validation, audit, backup runbook | Sync integrity + restore drill |
| **P3 — Dashboard** (2–3 wk) | Overview, search, detail, archived PDF, CSV, approval/lock | Dashboard + accessibility gates |
| **P4 — Two-way sync** (2 wk) | Pull cursor, tombstones, conflict UI, offline polish | Conflict + offline gates |
| **P5 — Hardening + rollout** (2–3 wk) | Rate limits, CSP, logs/alerts, load test, UAT, training, canary | Security + scale + UAT |

Do not start P2 before the P1 scope resolver exists. Do not start P3 before the sync contract is stable.

---

## 8. Additional test gates

These extend G18–G24 in the plan.

| Gate | What it proves |
|---|---|
| **G25 — Validation** | Oversized payload, unknown fields, negative hours, future date, bad enum all return `400` with a stable code |
| **G26 — Derived fields** | Server-recomputed headcount/hours/photo_count match the payload; tampered client values are ignored |
| **G27 — Timezone** | A report saved at 23:55 and 00:05 Jamaica time lands on the correct local dates |
| **G28 — Tenancy** | A user in org A cannot read/write any org B row, by ID or by search |
| **G29 — Photo dedupe** | Uploading the same image to two reports creates one blob and two links; retry is a no-op |
| **G30 — PDF archive** | Archived PDF hash matches the client-generated PDF; download works with the API down (signed URL path) |
| **G31 — Restore** | A full D1 + R2 restore into a scratch environment reproduces a sample report byte-for-byte; time recorded |
| **G32 — CSP** | Production CSP blocks inline script injection; the PWA, PDF and service worker still work |
| **G33 — Rate limit** | Login lockout is global (not per-location) and resets correctly |
| **G34 — Audit atomicity** | A failed audit write rolls back the mutation, or the mutation is queued for retry |

---

## 9. Concrete P0 spike list

Run these before estimating P1. Each should produce a short note in `docs/spikes/` with commands, timings, and limits observed.

1. **D1 schema + FTS:** apply `schema-v2.sql` to a local D1, insert 10,000 reports, run `EXPLAIN QUERY PLAN` for search and list queries. Record p95.
2. **R2 upload through Worker:** upload a 400 KB JPEG, verify hash, measure CPU and request size. Confirm no presign needed.
3. **PDF archive + Browser Rendering:** archive a client PDF; regenerate one via `/pdf`; compare text and layout.
4. **Password hashing:** PBKDF2 600k timing in a Worker; if Argon2id is required, measure a WASM build against the 128 MB limit.
5. **Auth provider:** price Cloudflare Access / Clerk / WorkOS for the expected user count; test a field-device magic-link flow.
6. **Backup/restore:** export a D1 database to R2 and restore into a scratch DB; time it.
7. **Rate limit:** prove the Rate Limiting binding is per-location; implement a DO counter and prove it is global.

---

## 10. What is already good and should not be changed

- Local-first form and Dexie storage; cloud is additive.
- `clientReportId` as the sync idempotency key; `payloadHash` for cheap retries.
- Optimistic concurrency with a human conflict choice; no automatic field merge.
- The phase order: identity → sync → dashboard → two-way → hardening.
- Keeping the demo gate behind a flag.
- The existing gates and evidence culture. Keep it.
- Cloudflare as the platform: one deploy, static assets + API, D1 + R2, predictable cost.

---

## 11. Files to add before implementation

| File | Purpose |
|---|---|
| `docs/backend/schema-v2.sql` | Reviewed DDL draft (this review) |
| `docs/backend/api-v1.md` | Frozen request/response contract + error codes |
| `docs/backend/scope-matrix.md` | Role × action × scope truth table |
| `docs/runbooks/backup-restore.md` | Step-by-step restore drill |
| `docs/runbooks/incident.md` | Login outage, sync outage, data loss |
| `docs/spikes/*.md` | P0 spike evidence |
| `docs/PRIVACY.md` | Privacy notice and data-subject process |
| `docs/THREAT_MODEL.md` | Assets, actors, threats, mitigations |

---

## 12. Verified platform notes

Checked 2026-11-23 against live Cloudflare documentation. Limits change; re-check before implementation.

| Topic | Fact used in this review |
|---|---|
| D1 limits | 10 GB per database, 2 MB row, 100 bound parameters per query, 30 s query, 1,000 queries per invocation (Paid), single-threaded per database; FTS5 supported |
| D1 transactions | `batch()` executes statements atomically; there is no interactive transaction across requests |
| D1 read replication | Available; Sessions API provides `first-primary` / `first-unconstrained` consistency |
| D1 Time Travel | 30 days on Paid; restore is in-place and destructive; not a substitute for logical backups |
| Workers | Paid plan: 5 min max CPU (30 s default), 128 MB memory, 10M requests and 30M CPU-ms included |
| R2 | 10 GB free, 1M Class A and 10M Class B operations/month, egress free; presigned URLs require the S3 API and credentials — the Workers binding cannot sign |
| Browser Rendering | `/pdf` Quick Action with a Workers binding; 10 browser hours/month included, then usage-priced |
| Queues | 1M operations/month included, then $0.40 per million |
| Rate Limiting binding | Approximate, per-location; not a global lockout mechanism |
| Workers Logs | 7-day retention, 20M log events/month included |
| OWASP | Argon2id preferred; PBKDF2-HMAC-SHA256 600,000 iterations is an acceptable fallback (and the native Workers option) |

---

## 13. Bottom line

The plan’s architecture and sequencing are sound. The blockers are not conceptual — they are specific implementation traps that would cost weeks if discovered mid-build:

1. Presigning R2 through the binding (B1).
2. Bundling pdfmake into the Worker (B2).
3. Under-scoping auth (B3).
4. No tenancy boundary (B4).
5. A uniqueness constraint that fights the product (B5).
6. Trusting client-derived numbers (B6).
7. Undefined report timezone (B7).
8. Backups named but not designed (B8).

Fix those, adopt the draft schema, run the seven P0 spikes, and the plan is ready to fund.
