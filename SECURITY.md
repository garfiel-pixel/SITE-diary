# Security policy

## Supported versions

This repository is a demo and does not yet have a production release. Security
fixes are applied to the default branch only. Once a production backend is
funded, this section will list supported release lines.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Preferred: use GitHub's **private vulnerability reporting** on this repository
(Security → Report a vulnerability). If that is unavailable, contact the owner
privately through [github.com/garfiel-pixel](https://github.com/garfiel-pixel).

Please include:

- a description of the issue and its impact;
- the affected commit, build, or URL;
- reproduction steps or a proof of concept;
- any suggested mitigation;
- whether you want to be credited.

## What to expect

- Acknowledgement within 5 working days.
- An initial assessment within 10 working days.
- A fix or a documented decision as soon as is practical, coordinated with you.
- Credit in the release notes if you want it.

Please give reasonable time to fix the issue before any public disclosure.

## Scope

In scope:

- the web app and PWA (client-side code, service worker, offline storage);
- the PDF generation path;
- the deployment configuration in `wrangler.jsonc`;
- the planned backend design in `docs/` (design flaws are worth reporting);
- dependency vulnerabilities that affect the shipped build.

Out of scope:

- the demo activation gate — it is explicitly **not security**;
- the mock uploader — it sends nothing;
- missing security headers on a local preview server;
- social engineering, physical access, or denial-of-service against a demo;
- reports that require a compromised device or browser extension.

## Safe harbour

We will not pursue legal action for good-faith research that:

- stays within the scope above;
- avoids privacy violations, data destruction, and service disruption;
- does not access other people's data;
- gives us reasonable time to respond before disclosure.

## Current known limitations

These are documented, not vulnerabilities:

- uploads are mocked (`app/src/sync.ts`);
- the activation code is a demo gate;
- there is no server-side authentication or authorisation yet;
- reports are stored unencrypted in the browser's IndexedDB;
- the demo contains fictional sample data.

Do not deploy this demo with real personal data until the funded backend and the
privacy controls in [`docs/SCALABILITY_REVIEW.md`](docs/SCALABILITY_REVIEW.md)
are in place.
