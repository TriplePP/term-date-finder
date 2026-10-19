# School Term Dates Calendar – Build Plan

Oct 19, 2026 · @Pete Donaghy

## Overview

A free, single-page site where a parent picks their council and school, then subscribes to a calendar of that school's terms, half-terms and inset days. The pilot is Bath and North East Somerset (BANES), starting with Midsomer Norton Primary.

- **Why it's useful:** council calendars miss school-specific inset days. BANES's 2026–27 calendar runs Term 1 to 23 October, but Midsomer Norton Primary is closed to pupils on 22 and 23 October.
- **Core idea:** a subscription, not a download. Fix a date once and it updates on every subscriber's phone and laptop.
- **Shape:** a static site with no server, database or user accounts. The data only changes a few times a year.
- **Goal for v1:** free, useful and accurate. Money comes later, if at all.
- **Budget:** about 30 minutes a day and under £200, mostly a domain name.

## User experience

Three choices and one tap: council, school, subscribe.

1. **Choose a council.** A search box listing only councils that have data.
2. **Choose a school.** Search as you type, from the DfE school register, filtered to that council.
3. **See a preview.** The next holiday, upcoming inset days, the full year, the source link and a "last checked" date. A coverage badge says either "School dates confirmed" or "Council dates only – inset days not confirmed".
4. **Subscribe.**
   - iPhone / Mac: a `webcal://` link opens Apple Calendar's subscribe prompt.
   - Google Calendar / Android: a Google "add by URL" link. Android's Calendar app can't subscribe by itself; it syncs once the calendar is added on Google.
   - Outlook and others: a copy-link button with the `https://` address.
5. **Footer.** "Always check with your school" and a "Report a wrong date" link.

Each school also gets its own shareable page (`/school/<id>`). Parents can drop it in the class WhatsApp group, and search engines can find it. This is the main way the site will grow.

## Tech stack

A static Astro site, with the data as JSON in Git, built into one calendar file per school and deployed to Cloudflare Pages.

| Part | Choice | Why |
| --- | --- | --- |
| Site | Astro + TypeScript | Static HTML per school page; a little JavaScript for the dropdowns |
| Styling | Plain CSS (or Tailwind) | One page; keep it light and fast on phones |
| Data | JSON files in the repo | Git gives history, review and rollback for free |
| Calendar files | Build script, one `.ics` per school | Static and cacheable; no server needed |
| School list | DfE "Get Information About Schools" CSV download | Official school IDs (URNs), council, school type and trust |
| Bank holidays | gov.uk bank holidays JSON | Mark bank holidays without typing them in |
| Data pipeline | Node script + GitHub Actions + Claude API | Scheduled checks that open pull requests |
| Hosting | Cloudflare Pages | Free; see Hosting |
| Analytics | Cloudflare Web Analytics | Free and cookie-free, so no cookie banner |

Suggested repo layout:

```
term-dates/
  data/
    councils/bathnes/2026-27.json
    trusts/mnsp/2026-27.json
    overrides/<urn>/2026-27.json
    schools.json            # generated from the GIAS CSV
    sources.json            # where each council/trust publishes its dates
  scripts/
    import-gias.ts          # CSV -> schools.json
    resolve.ts              # school -> override / trust / council dates
    build-ics.ts            # one .ics per school into dist/cal/
    validate.ts             # rule checks, run in CI
    extract/                # AI pipeline (fetch, extract, open PR)
  src/pages/                # Astro: index + /school/[urn]
  public/_headers           # security + text/calendar headers
  .github/workflows/        # validate on PR, monthly extraction run
```

## Data model

Each school uses the most specific dates available: a school override first, then its trust, then its council.

- **Council file:** the council's recommended terms for council-run schools. One per council per year, entered by hand.
- **Trust file:** dates shared by every school in a trust, including inset days. One PDF often covers many schools, so this is the most efficient layer.
- **Override file:** the rare school that differs from its trust or council.
- **School index (`schools.json`):** generated from the GIAS CSV. Each entry holds the URN, name, council and trust.
- **Status:** every dates file is `draft` (AI-extracted, unreviewed) or `verified` (you checked it against the source). Only `verified` files are published.

Example trust file, using the 2026–27 dates you confirmed for Midsomer Norton Primary:

```json
{
  "id": "mnsp",
  "name": "Midsomer Norton Schools Partnership",
  "academicYear": "2026-27",
  "status": "verified",
  "source": {
    "url": "https://www.midsomernortonschoolspartnership.com/uploads/files/st.mary039s-ce-primary-school-term-dates-2026-27.pdf",
    "checked": "2026-10-19"
  },
  "terms": [
    { "term": 1, "start": "2026-09-03", "end": "2026-10-23" },
    { "term": 2, "start": "2026-11-02", "end": "2026-12-18" },
    { "term": 3, "start": "2027-01-04", "end": "2027-02-12" },
    { "term": 4, "start": "2027-02-22", "end": "2027-03-25" },
    { "term": 5, "start": "2027-04-12", "end": "2027-05-28" },
    { "term": 6, "start": "2027-06-07", "end": "2027-07-23" }
  ],
  "insetDays": [
    "2026-09-03", "2026-09-04", "2026-10-22",
    "2026-10-23", "2026-11-25", "2027-01-04"
  ]
}
```

Example school index entry (look up the real URN in GIAS):

```json
{ "urn": "<URN>", "name": "Midsomer Norton Primary School", "council": "bathnes", "trust": "mnsp" }
```

Holidays aren't stored; the build works them out as the gaps between terms. Bank holidays come from the gov.uk feed.

## Calendar files

One `.ics` file per school at a permanent address, `/cal/<urn>.ics`, holding only the days parents act on.

**Events to include**

- Holidays (half terms, Christmas, Easter, summer) as all-day events covering the weekdays off.
- Each inset day: "Inset day – school closed to pupils".
- Later: "First day back" and "Last day of term" markers.

**Rules that matter**

- All-day events use `VALUE=DATE`, and `DTEND` is the day *after* the last day.
- Every event gets a stable `UID` built from school, year, type and date, never a random one. Otherwise each update creates duplicates.
- Every event has a `DTSTAMP`; bump `SEQUENCE` when an event changes.
- `TRANSP:TRANSPARENT`, so school holidays don't show as "busy".
- Calendar name (`X-WR-CALNAME`) and time zone `Europe/London`, plus refresh hints (`REFRESH-INTERVAL`, `X-PUBLISHED-TTL`). Each calendar app decides how often it really refreshes, and Google can be slow.
- To remove an event, leave it out; subscribers' apps drop it on the next refresh.
- CRLF line endings and lines folded at 75 characters. The `ics` npm package handles this, or hand-roll about 60 lines.
- Serve with `Content-Type: text/calendar; charset=utf-8` (set in `_headers`).
- Never change the address. Subscribers keep it for years.

**Example**

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TermDates//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Midsomer Norton Primary – term dates
X-WR-TIMEZONE:Europe/London
REFRESH-INTERVAL;VALUE=DURATION:P1D
X-PUBLISHED-TTL:P1D
BEGIN:VEVENT
UID:<urn>-2026-27-inset-20261022@yourdomain
DTSTAMP:20261019T090000Z
DTSTART;VALUE=DATE:20261022
DTEND;VALUE=DATE:20261023
SUMMARY:Inset day – school closed to pupils
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR
```

## Hosting

Cloudflare Pages on the free plan; the only cost is a domain name (roughly £10 a year). It deploys on every push to GitHub, with HTTPS included.

| Free-plan limit | Allowance | When it matters |
| --- | --- | --- |
| Builds | 500 a month | Not for this project; data merges are occasional |
| Bandwidth and static requests | Unlimited | Never |
| Files per site | 20,000 | Going national: England has roughly that many schools |
| Size per file | 25 MiB | Never; a calendar file is a few KB |
| `_headers` rules | 100 | Plenty for security and calendar headers |

**Scaling plan:** before you pass about 15,000 schools, stop writing a static file per school. Instead, a small Cloudflare Pages Function or Worker builds each calendar on request from the same JSON. Keep the `/cal/<urn>.ics` address unchanged so no subscriber notices.

Alternatives: GitHub Pages or Netlify both work. Cloudflare wins on caching, headers and analytics in one place. Source: [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits), [free plan summary](https://freetier.co/directory/products/cloudflare-pages).

## Data collection pipeline

AI reads the sources and drafts the changes; nothing reaches subscribers until you approve a pull request.

&#91;embedded content: data pipeline · one decision, one human approval\]

A monthly GitHub Action checks each source in `sources.json` and does nothing if it hasn't changed. Weekly in spring, when councils publish next year's dates.

**Extraction**

- Pull the text from the PDF or page (for example `pdf-parse`), then ask Claude for the dates in the JSON schema, with structured output.
- Ask for the exact source line behind each date, so you can check it quickly.
- Save the source's hash and the date checked, so unchanged sources are skipped.

**Automatic checks (`validate.ts`)**

- Every date is inside the academic year and on a weekday (bank holidays excluded).
- Terms are in order and don't overlap; each term has a sensible number of days.
- Inset days fall inside a term; at most six a year.
- The output matches the schema exactly; anything extra is rejected.

**Review**

- The pull request shows the old and new dates side by side with the source link. Check them against the PDF in a couple of minutes and merge.
- Failed checks show on the pull request and block the merge. If a source can't be read at all, the Action opens an issue instead, for you to fill in by hand.

**How this reaches subscribers:** the scheduled Action only updates JSON files in the GitHub repo via the pull request above — it never touches Cloudflare. Merging that PR to `main` is what triggers Cloudflare Pages to rebuild and redeploy (it deploys on every push, per Hosting), which regenerates the `.ics` files parents are subscribed to.

Cost: the Claude API calls should come to pennies a month at BANES scale. Set a spending cap anyway.

## Security and privacy

A static site with no accounts leaves little to attack; the biggest risk is publishing a wrong date.

| Risk | Mitigation |
| --- | --- |
| Wrong dates published | Human review of every change, automatic checks, source link and "last checked" date on the page, a "report a wrong date" link |
| Prompt injection hidden in a source PDF | Treat AI output as untrusted data: strict JSON schema, rule checks, your review. The extraction step has no tools and no access to secrets |
| Leaked API key | Kept only in GitHub Actions secrets, never in site code; set a monthly spending cap on the API account |
| Someone tampering with the repo | Two-factor login on GitHub and Cloudflare; branch protection on `main`; only you can merge |
| Personal data | None collected: no accounts, no sign-up in v1, cookie-free analytics. Error reports ask only for school and date, never children's details |
| Spam through the report form | A GitHub issue form or a form service with spam filtering, not an endpoint of your own |
| Script injection | Static pages only; escape school names from the CSV; strict Content-Security-Policy, `X-Content-Type-Options` and `Referrer-Policy` in `_headers` |
| Being a bad web citizen | Fetch only listed public sources, at most weekly, with a contact address in the User-Agent; republish the dates (facts), never the PDFs |
| Liability | "Always check with your school" on every page and in the calendar description |

If you add an email sign-up later, that's when UK GDPR work starts: a privacy notice, consent and a way to unsubscribe.

## Build phases

Four phases at about 30 minutes a day, each ending in a check before you move on.

### Phase 1 – Your school's calendar (week 1)

- [ ] Create the repo and folder layout
- [ ] Hand-write the trust JSON for 2026–27
- [ ] Write `build-ics.ts` to output one calendar file
- [ ] Subscribe on your iPhone and in Google Calendar; check half-terms and inset days look right

**Gate:** the calendar looks right on your own phone for a week.

### Phase 2 – The page (weeks 2–3)

- [ ] Import GIAS for BANES schools and map each to its council or trust
- [ ] Add the BANES council 2026–27 file
- [ ] Build the Astro page: council and school dropdowns, preview, subscribe buttons
- [ ] Add per-school share pages
- [ ] Deploy to Cloudflare Pages on your domain; add `_headers` and analytics

**Gate:** five parents at your school subscribe.

### Phase 3 – AI pipeline (weeks 4–5)

- [ ] Write `sources.json` with the address for each council and trust
- [ ] Add change detection and Claude extraction into the JSON schema
- [ ] Write `validate.ts` and run it on every pull request
- [ ] Add the monthly GitHub Action that opens pull requests

**Gate:** the pipeline re-extracts your trust's dates from its PDF and matches your hand-written file exactly.

### Phase 4 – All of BANES, then neighbours

- [ ] Add the remaining trusts with schools in BANES
- [ ] Add 2027–28 dates as they're published
- [ ] Expand to neighbouring councils (Somerset, North Somerset, Wiltshire)

**Gate:** subscribers keep growing without you promoting it.

## Open questions and data quirks

These came up in the BANES research and should shape the code from day one.

- **Term start versus first day for pupils.** The trust's PDF starts Term 1 on Thursday 3 September, but 3 and 4 September are inset days, so pupils start Monday 7 September. Show "first day for pupils", not the official term start.
- **Six inset days, not five.** The trust lists six for 2026–27, while the council model allows five. The validator should accept up to six.
- **Draft versus final documents.** BANES's proposed PDF ended Term 4 on 26 March 2027; the final one says 25 March. The pipeline must use the final version.
- **One trust, several councils.** The trust has said it covers four councils with slightly different dates, so trust files must apply across council boundaries.
- **Holiday display.** Weekdays only (Mon–Fri) or the full span including weekends? Weekdays only is closer to how parents think about half term.
- **Beyond England.** GIAS covers England; Wales, Scotland and Northern Ireland need other school lists later.
- **Domain name.** Still to choose.

### Sources

- [BANES school term dates](https://www.bathnes.gov.uk/school-term-dates)
- [BANES final approved 2026–27 term dates (PDF)](https://www.bathnes.gov.uk/sites/default/files/2026-27%20Final%20Approved%20Term%20Dates.pdf)
- [BANES proposed 2026–27 term dates (PDF)](https://www.bathnes.gov.uk/sites/default/files/Proposed%20Term%20Dates%202026-27.pdf)
- [Midsomer Norton Schools Partnership 2026–27 term dates (St Mary's CE Primary, PDF)](https://www.midsomernortonschoolspartnership.com/uploads/files/st.mary039s-ce-primary-school-term-dates-2026-27.pdf)
- [High Littleton CE Primary 2026–27 term dates (PDF)](https://www.midsomernortonschoolspartnership.com/uploads/pdf-files/3883-Term_Dates_2026-2027.pdf)
- [Trust letter on 2023–24 dates across four councils (PDF)](https://www.midsomernortonschoolspartnership.com/uploads/files/term-dates-202324.pdf)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits)
