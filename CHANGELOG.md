# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
date-based demo releases until the funded backend ships.

## [Unreleased]

### Added

- Reviewed cloud backend plan and corrected D1 schema draft
  (`docs/SCALABILITY_REVIEW.md`, `docs/backend/schema-v2.sql`).
- Ownership credit in the app footer and activation screen, linked to
  [github.com/garfiel-pixel](https://github.com/garfiel-pixel).
- Repository branding: README, proprietary licence, notice, code of conduct,
  contributing guide, security policy, privacy notice, citation metadata, and
  GitHub issue/PR templates.
- CI workflow for build and Playwright gates; CodeQL workflow; Dependabot.
- Security headers in `app/public/_headers`, including a strict CSP.
- External pre-paint theme bootstrap (`app/public/theme.js`) so the CSP can use
  `script-src 'self'`.

### Changed

- Seed writes the sample report and its photos in one Dexie transaction, so a
  reload during first-run seeding cannot leave a report without photos.
- Report action bar appears reliably at maximum scroll after the footer grew
  (IntersectionObserver root margin).
- Artifact script navigates by route now that the app launches on Home; G2
  requires the artifact script to succeed.

### Fixed

- Owner credit meets the project's 48 px minimum touch target.

## [1.0.0] — 2026-11-04

### Added

- Offline-first daily site diary: weather, workforce, equipment, materials,
  work in progress, visitors, instructions, delays, photos, toolbox talk.
- Named workforce with role totals and v1 migration.
- Branded A4 PDF with self-hosted fonts and byte-for-byte logo.
- PWA with prompt-based updates, Dexie storage, and boot recovery.
- Demo activation gate and mock uploader.
- Playwright gates G0–G17, typing audit, Lighthouse evidence, and accessibility
  checks.

[Unreleased]: https://github.com/garfiel-pixel/SITE-diary/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/garfiel-pixel/SITE-diary/releases/tag/v1.0.0
