# Privacy notice

**Last updated:** 2026-11-23  
**Status:** This notice describes the **demo** in this repository. It is a draft for the funded backend phase and is not legal advice.

## The short version

- The demo stores everything **on your device**, in the browser's IndexedDB.
- The demo has **no server, no accounts, and no analytics**.
- The “upload” is simulated. Nothing is sent anywhere.
- Do not enter real worker names, client data, or photos of identifiable people into the demo.

## What the demo stores

| Data | Where | Why |
|---|---|---|
| Report fields (project, site, weather, workforce names and roles, equipment, materials, work in progress, visitors, instructions, delays) | Browser IndexedDB on the device | To keep the diary between visits and offline |
| Photos you add | Browser IndexedDB on the device, after client-side resizing | To attach them to the report and PDF |
| Settings (theme, activation state, memo suggestions) | Browser IndexedDB and one `localStorage` theme key | To remember your preferences |
| Generated PDF | Created in memory; saved only if you choose to download or share it | To export the report |

There are no cookies for analytics, no tracking pixels, and no third-party scripts. The optional weather suggestion is off by default; if enabled in a future build, it would call `api.open-meteo.com` with a location, not personal data.

## Sharing and retention

- Data remains until you clear the site's storage, uninstall the PWA, or delete the report.
- A downloaded PDF is under your control. Treat it as a personnel record.
- Browser storage can be cleared by the browser, by private browsing, or by the device owner. Keep exported PDFs for records you need to retain.

## The planned cloud phase

The funded plan adds accounts, cloud sync to Cloudflare D1, photos in R2, and a PM dashboard. Before that phase handles real data, the project must publish:

- the lawful basis and purpose for processing worker data;
- who can see which site, role, and report;
- retention periods (draft defaults: reports 7 years, photos 2 years after lock, audit 2 years hot);
- a data-subject request process (access, correction, erasure where legally permitted);
- a breach notification process;
- the data residency position;
- a photo/consent notice for identifiable people.

Jamaica's Data Protection Act 2020 is relevant to worker names, attendance, and photos. Have the client's lawyer review the final notice and the employment implications before launch.

## Contact

For privacy questions about this repository, contact the owner through
[github.com/garfiel-pixel](https://github.com/garfiel-pixel). Do not include
personal data in a public issue.
