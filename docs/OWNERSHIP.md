# Ownership

## Statement

This repository is the work of **garfiel-pixel** (the “Owner”).

Copyright © 2026 garfiel-pixel. All rights reserved.

The Owner holds the copyright in the original source code, documentation,
design, and written content in this repository, except for:

- third-party open-source components, which remain under their own licences
  (see [`NOTICE`](../NOTICE));
- the Pave-Con name, logo, and supplied brand artwork, which remain the
  property of their respective owner and are used for the client project only;
- any material explicitly marked otherwise.

The software is proprietary. See [`LICENSE`](../LICENSE).

## If there is a client contract

If a separate written contract covers this work, that contract controls where it
conflicts with this note. Record the contract reference, the deliverable owner,
and the licence granted to the client here:

| Item | Value |
|---|---|
| Contract / statement of work | _to be recorded_ |
| Deliverable owner | _to be recorded_ |
| Licence granted to client | _to be recorded_ |
| Support / warranty period | _to be recorded_ |

Do not publish a claim of exclusive ownership that contradicts a signed
contract. If the client owns the deliverable, change [`LICENSE`](../LICENSE) and
this page together.

## What the Owner controls

- The GitHub repository, its settings, and its releases.
- The Cloudflare account and deployment named in `wrangler.jsonc`.
- The brand credit and the project name.
- The decision to change the licence.

## Recommended proof of authorship

Ownership is strongest when it is easy to evidence. Keep these in place:

1. **Git history** with the Owner's commits and consistent author email.
2. **Signed commits and tags** (GPG or SSH) for releases.
3. **A dated release** with a changelog and a source archive.
4. **This file and `LICENSE` committed early** in the history.
5. **The public repository URL** recorded in `package.json`, `CITATION.cff`,
   and the site metadata.
6. **A private backup** of the repository outside GitHub (mirror or bundle).

Useful commands:

```bash
git log --format='%h %ad %an <%ae> %s' --date=short
git bundle create site-diary-backup.bundle --all
git tag -s v1.0.0 -m "Site Diary v1.0.0"
```

## Changing the licence

The Owner may relicense the original work at any time. To do so:

1. Update [`LICENSE`](../LICENSE) and [`NOTICE`](../NOTICE).
2. Update the `license` field in `app/package.json` and `CITATION.cff`.
3. Add a `docs/LICENSING-HISTORY.md` entry with the date, the old terms, the new
   terms, and who approved the change.
4. Confirm that the new terms are compatible with every third-party dependency.
5. If a client contract exists, confirm the change is permitted.

A permissive licence (MIT, Apache-2.0) is friendlier for a portfolio or public
release. A proprietary licence is the safer default while the work is
commercial and client-specific.

## Brand credit

The app shows a small `garfiel-pixel` link to
[github.com/garfiel-pixel](https://github.com/garfiel-pixel) in the footer and on
the activation screen. It is intentionally subtle: it identifies the author
without competing with Pave-Con's brand. The link is defined once in
`app/src/config.ts` (`CONFIG.owner`) and rendered by
`app/src/components/OwnerCredit.tsx`.

## Legal name

The copyright line currently uses the GitHub handle `garfiel-pixel`. Before
commercial distribution, replace it with the Owner's full legal name or registered
company name if that is preferred, in:

- [`LICENSE`](../LICENSE)
- [`NOTICE`](../NOTICE)
- [`CITATION.cff`](../CITATION.cff)
- `app/package.json` (`author`)
- `app/index.html` (`author` meta tag)

Then commit the change with a clear message.

## Not legal advice

This page is an engineering record, not legal advice. Have a lawyer review the
licence, the client contract, and the privacy obligations before a commercial
launch.
