# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export-full-form.spec.ts >> Full form → PDF export >> fill every section, use every control family, then export a clear PDF
- Location: e2e\export-full-form.spec.ts:20:3

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: browserContext._wrapApiCall: ENOENT: no such file or directory, open 'C:\Users\Garfield\Downloads\site diary\app\test-results-all\.playwright-artifacts-0\traces\4d9514481a79c5dde472-36a7890b93b346aff3c3.trace'
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e4]:
      - img "Pave-Con Ltd — Paving & Construction logo" [ref=e6]
      - generic [ref=e7]:
        - heading "Masterbuilders - Site Diary" [level=1] [ref=e8]
        - paragraph [ref=e9]: CHOOSE WISELY... BUILD WITH CONFIDENCE
      - button "Switch to dark theme" [ref=e10] [cursor=pointer]
      - button "Settings" [ref=e13] [cursor=pointer]
    - main [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - button "← All reports" [ref=e20] [cursor=pointer]
          - heading "Thursday, 5 November 2026" [level=2] [ref=e21]
        - status [ref=e22]
        - generic [ref=e24]:
          - generic [ref=e25]:
            - text: People
            - generic [ref=e26]: "19"
            - generic [ref=e28]: 19 Named
          - generic [ref=e29]:
            - text: Equipment
            - generic [ref=e30]: 26.5 h
          - generic [ref=e32]:
            - text: Deliveries
            - generic [ref=e33]: "0"
          - generic [ref=e35]:
            - text: Time lost
            - generic [ref=e36]: 0 h
          - generic [ref=e38]: Saved on phone
        - generic [ref=e42]:
          - generic [ref=e43]:
            - heading [level=2] [ref=e44]:
              - button "Project / Date Hatchfield Rd Rehabilitation road rehabilitation · Chainage 0+400 to 0+900" [expanded] [ref=e45]:
                - generic [ref=e53]: Project / Date
                - generic [ref=e54]: Hatchfield Rd Rehabilitation road rehabilitation · Chainage 0+400 to 0+900
            - generic [ref=e63]:
              - generic [ref=e64]:
                - generic [ref=e65]: Project
                - button "Use Hatfield Road Rehabilitation as Project" [ref=e67] [cursor=pointer]: Hatfield Road Rehabilitation
                - textbox "Project" [active] [ref=e68] [cursor=pointer]:
                  - /placeholder: Type…
                  - text: Hatchfield Rd Rehabilitation road rehabilitation
              - generic [ref=e69]:
                - generic [ref=e70]: Site
                - generic [ref=e71]:
                  - generic [ref=e72]:
                    - button "Linear ✓" [pressed] [ref=e73] [cursor=pointer]
                    - button "Zone" [ref=e76] [cursor=pointer]
                  - generic [ref=e81]:
                    - combobox "Site start" [ref=e82] [cursor=pointer]: Chainage 0+400
                    - generic [ref=e83]: to
                    - combobox "Site end" [ref=e84] [cursor=pointer]: 0+900
              - paragraph [ref=e85]: "Day: Thursday (from the date)"
              - generic [ref=e86]:
                - generic [ref=e87]:
                  - button "Previous day" [ref=e88] [cursor=pointer]: ‹
                  - textbox "Date" [ref=e89] [cursor=pointer]: 2026-11-05
                  - button "Next day" [ref=e90] [cursor=pointer]: ›
                - button "Today" [ref=e91] [cursor=pointer]
          - heading [level=2] [ref=e93]:
            - button "Weather AM — PM —" [ref=e94]:
              - generic [ref=e100]: Weather
              - generic [ref=e102]:
                - generic [ref=e103]:
                  - generic [ref=e104]: AM
                  - generic [ref=e105]: —
                - generic [ref=e106]:
                  - generic [ref=e107]: PM
                  - generic [ref=e108]: —
          - heading [level=2] [ref=e115]:
            - button "Time lost —" [ref=e116]:
              - generic [ref=e121]: Time lost
              - generic [ref=e122]: —
          - heading [level=2] [ref=e129]:
            - button "Equipment on site 4 machines · 26.5 h" [ref=e130]:
              - generic [ref=e139]: Equipment on site
              - generic [ref=e140]: 4 machines · 26.5 h
          - heading [level=2] [ref=e148]:
            - button "Materials delivered —" [ref=e149]:
              - generic [ref=e154]: Materials delivered
              - generic [ref=e155]: —
          - heading [level=2] [ref=e162]:
            - button "Workforce 19 on site" [ref=e163]:
              - generic [ref=e172]: Workforce
              - generic [ref=e173]: 19 on site
          - heading [level=2] [ref=e181]:
            - button "Work in progress —" [ref=e182]:
              - generic [ref=e188]: Work in progress
              - generic [ref=e189]: —
          - heading [level=2] [ref=e196]:
            - button "Visitors —" [ref=e197]:
              - generic [ref=e202]: Visitors
              - generic [ref=e203]: —
          - heading [level=2] [ref=e210]:
            - button "Instructions —" [ref=e211]:
              - generic [ref=e216]: Instructions
              - generic [ref=e217]: —
          - heading [level=2] [ref=e224]:
            - button "Toolbox talk —" [ref=e225]:
              - generic [ref=e231]: Toolbox talk
              - generic [ref=e232]: —
          - heading [level=2] [ref=e239]:
            - button "Photos —" [ref=e240]:
              - generic [ref=e245]: Photos
              - generic [ref=e246]: —
          - heading [level=2] [ref=e253]:
            - button "Recorded by required" [ref=e254]:
              - generic [ref=e259]: Recorded by
              - generic [ref=e260]: required
        - generic [ref=e267]:
          - button "Jump to section" [ref=e268] [cursor=pointer]
          - generic [ref=e271]:
            - 'button "Weather: not yet — jump to section" [ref=e272] [cursor=pointer]': Weather
            - 'button "Workforce: complete — jump to section" [ref=e274] [cursor=pointer]': Workforce
            - 'button "Work in progress: not yet — jump to section" [ref=e277] [cursor=pointer]': Work in progress
            - 'button "Recorded by: not yet — jump to section" [ref=e279] [cursor=pointer]': Recorded by
          - button "Create PDF" [ref=e281]
    - contentinfo [ref=e282]:
      - paragraph [ref=e283]: CHOOSE WISELY... BUILD WITH CONFIDENCE
      - paragraph [ref=e284]: Pave-Con Ltd — Paving & Construction
      - paragraph [ref=e285]: Lot 1 Dunsinane Hatfield P.O., Manchester, Jamaica W.I.
      - paragraph [ref=e286]: "[876] 625-7283 · info@paveconja.com"
      - paragraph [ref=e287]: Supplied by the client, not independently verified.
  - text: ✓
```