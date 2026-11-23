# GitHub repository setup

A checklist for making the repository look and behave like a maintained,
owned project. Most items are settings, not code.

Repository: <https://github.com/garfiel-pixel/SITE-diary>

---

## 1. About panel

On the repository home page, click the gear next to **About**.

| Field | Suggested value |
|---|---|
| Description | `Offline-first daily site diary for paving & construction — React PWA, branded PDF, Cloudflare-ready.` |
| Website | `https://site-diary.garfieldprocis.workers.dev` (or the current deployment URL) |
| Topics | `site-diary`, `construction`, `paving`, `react`, `typescript`, `pwa`, `offline-first`, `indexeddb`, `pdfmake`, `cloudflare-workers` |

Tick **Releases**, **Packages** only if used, and **Deployments** if the
Cloudflare integration is connected.

## 2. Social preview

Upload a 1280 × 640 PNG (or 640 × 320) under **Settings → General → Social
preview**. Use the logo on the black band with the title “Masterbuilders Site
Diary”. This controls how the link looks when shared.

## 3. Branch protection / rulesets

Create a ruleset for the default branch (`main` or `master`):

- Require a pull request before merging.
- Require approvals: 1 (or 0 for a solo repo, but keep the PR habit).
- Require status checks: `build` and `e2e` from the CI workflow.
- Require conversation resolution.
- Require linear history (optional).
- Block force pushes.
- Block deletion.
- Do not allow bypass except the Owner.

If the Owner works alone, a lighter option is: block force pushes and deletions,
keep CI required, and use PRs for anything larger than a docs typo.

## 4. Actions

**Settings → Actions → General**

- Allow enterprise/selected actions only; allow `actions/*` and the official
  CodeQL action.
- Workflow permissions: **Read repository contents**.
- Do not allow GitHub Actions to create or approve pull requests.
- Require approval for first-time contributors.

The workflows in `.github/workflows/` assume Node 22 and run from `app/`.

## 5. Security

**Settings → Code security and analysis**

- Enable **Dependabot alerts**.
- Enable **Dependabot security updates**.
- Enable **Secret scanning** and **push protection**.
- Enable **CodeQL** using **either** default setup **or** the advanced workflow
  in `.github/workflows/codeql.yml` — not both. Default setup is the least
  maintenance; delete the workflow first if you choose default setup.
- Enable **Private vulnerability reporting**.
- Enable **Dependency graph**.

`SECURITY.md` already tells researchers how to report privately.

## 6. Issues and pull requests

- Enable **Issues**.
- Disable the blank issue; keep the bug and feature templates in
  `.github/ISSUE_TEMPLATE/`.
- Enable **Discussions** only if the Owner intends to answer questions there;
  otherwise leave it off to avoid an empty support channel.
- Enable **Preserve this repository** only if the Owner wants an Arctic Code
  Vault copy (optional).

## 7. Releases

Create a first release so the repo has a citable version:

```bash
git tag -a v1.0.0 -m "Site Diary v1.0.0 — demo release"
git push origin v1.0.0
```

Then **Releases → Draft a new release**, choose the tag, and attach the built
`app/dist` zip if useful. Do not attach personal data or `.env` files.

## 8. Profile-level ownership

To make ownership obvious outside the repository:

1. Create (or update) the profile repository `garfiel-pixel/garfiel-pixel` with
   a README that lists this project.
2. Pin `SITE-diary` on the GitHub profile.
3. Use the same avatar and name across the profile and the deployment.
4. Add the GitHub link to the deployed site (already done in the footer and the
   activation screen).

## 9. Repository name and description

The current name is `SITE-diary`. A lowercase, hyphenated name such as
`site-diary` looks more conventional, but renaming changes the URL and breaks
existing clones and links. Rename only if the Owner accepts that trade-off.

## 10. Licence detection

GitHub's licence detector recognises standard licences. A proprietary
“All rights reserved” file will usually show as **Other** or nothing. That is
expected. Do not add an MIT/Apache badge unless the Owner actually relicenses
the work. The `LICENSE` and `NOTICE` files are the authoritative statement.

## 11. Housekeeping

- Archive or delete stale branches after merge.
- Keep `.gitignore` current; never commit `app/dist`, `artifacts/`, `.env`, or
  `.wrangler`.
- Rotate any credential that was ever committed, even if the commit was later
  removed.
- Review Dependabot PRs monthly; do not merge a major upgrade without running
  `npm run verify`.
- Keep the deployment URL and the About website in sync.

## 12. Files added for this setup

| File | Purpose |
|---|---|
| `README.md` | Project overview, quick start, architecture, ownership |
| `LICENSE`, `NOTICE` | Proprietary licence and third-party/brand notices |
| `CODE_OF_CONDUCT.md` | Community standard |
| `CONTRIBUTING.md` | Contribution workflow and checklist |
| `SECURITY.md` | Private vulnerability reporting and scope |
| `PRIVACY.md` | Demo privacy notice and planned cloud obligations |
| `CHANGELOG.md` | Dated change log |
| `CITATION.cff` | Citation metadata |
| `docs/OWNERSHIP.md` | Ownership record and licence-change process |
| `docs/LICENSING-HISTORY.md` | Date-stamped licence changes |
| `.github/CODEOWNERS` | Default review ownership |
| `.github/ISSUE_TEMPLATE/*` | Bug and feature templates |
| `.github/pull_request_template.md` | PR checklist |
| `.github/dependabot.yml` | Pinned dependency updates |
| `.github/workflows/ci.yml` | Build and end-to-end checks |
| `.github/workflows/codeql.yml` | Code scanning |
| `.gitattributes`, `.editorconfig` | Consistent line endings and editor defaults |
