# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 1 (one school's calendar) is built. `School Term Dates Calendar – Build Plan.md` is the source of truth for scope, stack, data model and later phases. Read it before starting new work.

## Commands

- `npm run build:ics` — write `dist/cal/<urn>.ics` for every school with verified dates, and copy `public/` into `dist/`
- `npm test` — run all tests (vitest); one file: `npx vitest run scripts/ics.test.ts`; one test: add `-t "<name>"`
- `npm run typecheck` — `tsc --noEmit`
- Scripts run with `tsx` and import each other with `.ts` extensions.

Phase 1 code lives in `scripts/`: `dates.ts` (UTC date helpers on `YYYY-MM-DD` strings), `holidays.ts` (holidays = gaps between terms), `ics.ts` (hand-rolled iCalendar writer) and `build-ics.ts`. For now the build reads only the trust layer, and the year is hard-coded.

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
