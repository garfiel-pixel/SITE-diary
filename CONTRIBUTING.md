# Contributing

Thanks for your interest. This is a proprietary project; contributions are
accepted at the owner's discretion. By submitting a contribution you agree that
it may be used, modified, and distributed under the project's licence without
additional compensation, and you confirm you have the right to submit it.

## Before you start

- Read [`README.md`](README.md), [`docs/SCALABILITY_PLAN.md`](docs/SCALABILITY_PLAN.md),
  and [`docs/SCALABILITY_REVIEW.md`](docs/SCALABILITY_REVIEW.md).
- For anything larger than a typo or a small bug fix, open an issue first so the
  approach can be agreed. Out-of-scope ideas belong in [`docs/BACKLOG.md`](docs/BACKLOG.md).
- Do not include real worker names, site addresses, client data, API keys, or
  photos of identifiable people in code, tests, fixtures, or screenshots.

## Setup

```bash
cd app
npm ci
npm run dev
```

Node 22 or newer is recommended. Dependencies are pinned exactly; do not add
`^` or `~` ranges.

## Making a change

1. Create a branch: `feat/short-name`, `fix/short-name`, or `docs/short-name`.
2. Keep the change focused. One concern per pull request.
3. Match the existing style: TypeScript, functional React, Tailwind tokens,
   comments that explain *why*, not *what*.
4. Add or update a Playwright gate when behaviour changes. A change without
   evidence is not complete.
5. Run the checks locally:

   ```bash
   cd app
   npm run build
   npm run test:e2e
   npm run verify
   ```

6. Update documentation when the data model, PDF, activation flow, or scripts
   change.

## Pull request checklist

- [ ] The change is in scope and linked to an issue (where applicable).
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e` passes (or the affected gates pass and the reason is explained).
- [ ] `npm run verify` passes, or the failure is documented and unrelated.
- [ ] No secrets, personal data, or real client data are included.
- [ ] Docs are updated.
- [ ] The diff has no unrelated formatting churn.

## Commit messages

Use the imperative mood and a short summary:

```
Add named workforce totals to the PDF
Fix photo caption grouping when two photos share a caption
Docs: record the R2 upload decision
```

## Code style

- TypeScript strict mode; avoid `any`.
- Prefer small pure helpers in `src/lib/` for logic that can be tested.
- Use the design tokens in `src/index.css`; do not hard-code colours.
- Keep the form local-first: never make the network a hard dependency.
- Keep accessibility: labels, focus states, 56 px targets, reduced motion.

## Reporting bugs

Use the bug report template. Include the build/commit, device, browser, steps,
expected result, actual result, and a screenshot if it is visual. Remove
personal data from screenshots.

## Security

Do not report vulnerabilities in a public issue. Follow [`SECURITY.md`](SECURITY.md).
