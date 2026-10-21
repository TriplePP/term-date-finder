# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 1 (one school's calendar) is done. Phase 2 (the page) is in progress: the site, share pages, resolver and GIAS importer are built; `data/schools.json` still holds only Midsomer Norton Primary until `import:gias` is run on a real GIAS CSV, and there is no BANES council dates file yet. `School Term Dates Calendar – Build Plan.md` is the source of truth for scope, stack, data model and later phases. Read it before starting new work.

## Commands

- `npm run build` — `astro build` into `dist/`, then `build:ics`. This is the Cloudflare Pages build command; output directory `dist`.
- `npm run dev` — Astro dev server (no `.ics` files; run `build:ics` for those)
- `npm run build:ics` — write `dist/cal/<urn>.ics` for every school with verified dates, and copy `public/` into `dist/`
- `npm run import:gias -- <csv>` — rebuild `data/schools.json` from a GIAS "All establishment data" CSV for the councils in `data/councils.json`; trusts are linked through `data/trusts.json` by GIAS trust name
- `npm test` — run all tests (vitest); one file: `npx vitest run scripts/ics.test.ts`; one test: add `-t "<name>"`
- `npm run typecheck` — `tsc --noEmit` over `scripts/` and `src/**/*.ts` (not `.astro` files; `@astrojs/check` conflicts with TypeScript 7)
- Scripts run with `tsx` and import each other with `.ts` extensions.
- Astro is pinned to 7.4.1: 7.4.2 needs Node ≥ 22.23.4. `.node-version` pins Node 22 for Cloudflare.

Code in `scripts/`: `dates.ts` (UTC date helpers on `YYYY-MM-DD` strings), `holidays.ts` (holidays = gaps between terms), `terms.ts` (first/last day for pupils), `resolve.ts` (override → trust → council, verified only; holds the hard-coded `ACADEMIC_YEAR`), `ics.ts` (hand-rolled iCalendar writer), `build-ics.ts`, `csv.ts` and `import-gias.ts`.

Site in `src/`: `site.ts` (build-time data), `layouts/Base.astro`, `pages/index.astro` (council + school search) and `pages/school/[urn].astro` (preview and subscribe). Calendar links are made absolute in the browser from `location.origin`, so no domain is configured anywhere. Astro is set to emit no inline scripts or styles, so the CSP in `public/_headers` can stay strict; check `dist/*.html` for inline `<script>`/`<style>` after changing config.

## What this is

A free static site where a parent picks a council and a school, then subscribes to a calendar (`.ics`) of that school's terms, holidays and inset days. Pilot: Bath and North East Somerset (BANES), starting with Midsomer Norton Primary (trust: Midsomer Norton Schools Partnership, id `mnsp`).

No server, database or user accounts. Budget is about 30 minutes a day, so prefer the simplest thing that works.

## Planned architecture

- **Stack:** Astro + TypeScript, static output, deployed to Cloudflare Pages. Data is JSON in Git.
- **Data layering:** each school resolves to the most specific dates file: `data/overrides/<urn>/<year>.json`, then `data/trusts/<trust>/<year>.json`, then `data/councils/<council>/<year>.json`. Trust files apply across council boundaries (one trust covers four councils).
- **School index:** `data/schools.json` is generated from the DfE GIAS (Get Information About Schools) CSV by `scripts/import-gias.ts`. Schools are keyed by URN (the official DfE school ID).
- **Holidays are not stored.** The build derives them as gaps between terms. Bank holidays come from the gov.uk bank holidays JSON feed.
- **Status:** dates files are `draft` (AI-extracted) or `verified`. Only `verified` files are published.
- **Scripts:** `resolve.ts` (school to dates), `build-ics.ts` (one `.ics` per school into `dist/cal/`), `validate.ts` (rule checks in CI), `extract/` (AI pipeline).
- **Pages:** `src/pages/` has the index and `/school/[urn]` share pages.
- **AI pipeline:** a GitHub Action fetches each source in `data/sources.json`, skips it if its hash is unchanged, asks the Claude API for dates in a strict JSON schema (with the source line for each date), and opens a pull request. AI output is untrusted data; the extraction step gets no tools and no secrets. Nothing reaches subscribers without a human-merged PR.

## Calendar file rules (easy to get wrong)

- The address `/cal/<urn>.ics` must never change; subscribers keep it for years.
- All-day events use `VALUE=DATE`, and `DTEND` is the day *after* the last day.
- `UID` must be stable, built from school, year, type and date (for example `144830-2026-27-inset-20261022@termdates`). The `@termdates` suffix is fixed on purpose and must not become the domain. Random or changed UIDs create duplicates on every refresh.
- `DTSTAMP` comes from `source.checked`, not the build time, so builds give identical files.
- Every event has `DTSTAMP`; bump `SEQUENCE` when an event changes. Remove an event by leaving it out.
- `TRANSP:TRANSPARENT`, `X-WR-TIMEZONE:Europe/London`, `REFRESH-INTERVAL` and `X-PUBLISHED-TTL` hints.
- CRLF line endings, lines folded at 75 characters.
- Served with `Content-Type: text/calendar; charset=utf-8` via `public/_headers`.

## Validation rules (`validate.ts`)

- Every date is inside the academic year and on a weekday, excluding bank holidays.
- Terms are in order, don't overlap, and have a sensible length.
- Inset days fall inside a term; allow up to **six** a year (the trust uses six, the council model five).
- Output matches the schema exactly; extra fields are rejected.

## Data quirks to respect

- Show "first day for pupils", not the official term start. The MNSP Term 1 starts 3 September 2026, but the 3rd and 4th are inset days.
- Use final source documents, never drafts. BANES's proposed PDF ended Term 4 on 26 March 2027; the final says 25 March.
- Escape school names from the GIAS CSV when rendering. Keep a strict Content-Security-Policy in `_headers`.
- Collect no personal data. "Always check with your school" goes on every page and in the calendar description.
- Cloudflare Pages allows 20,000 files per site. Past about 15,000 schools, switch to a Worker that builds each `.ics` on request, keeping the same URLs.
