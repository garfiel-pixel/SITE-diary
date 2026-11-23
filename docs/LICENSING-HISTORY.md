# Licensing history

This file records every change to the project's licence terms. Keep it in the
repository so the ownership trail is explicit.

| Date | Version | Terms | Approved by | Notes |
|---|---|---|---|---|
| 2026-11-23 | 1.0.0 | Proprietary, all rights reserved (`LICENSE`) | garfiel-pixel | Initial licence for the public repository. No permission granted for reuse. |

## Rules for future changes

1. Update `LICENSE` and `NOTICE` first.
2. Update `app/package.json` (`license`), `CITATION.cff`, and the README.
3. Add a row above with the date, version, old and new terms, and who approved.
4. Confirm third-party licence compatibility.
5. If a client contract exists, confirm the change is permitted.
6. Commit the licence change separately from feature work.

## Relicensing to an open-source licence

If the Owner later chooses MIT or Apache-2.0:

- replace `LICENSE` with the full text of the chosen licence;
- change `"license": "UNLICENSED"` to the SPDX identifier (e.g. `"MIT"`);
- keep `NOTICE` for brand assets and third-party components;
- update the README's ownership section and this table;
- tag a release so the change is unambiguous.

Do not describe the project as open source until the new licence file is
committed.
