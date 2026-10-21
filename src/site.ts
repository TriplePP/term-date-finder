// Build-time data for the pages. Everything here runs during `astro build`.

import { readFileSync } from "node:fs";
import { deriveHolidays } from "../scripts/holidays.ts";
import { resolveDates, type Resolved } from "../scripts/resolve.ts";
import { pupilTerms, type PupilTerm } from "../scripts/terms.ts";
import type { Council, School } from "../scripts/types.ts";

export const REPORT_URL = "https://github.com/TriplePP/term-date-finder/issues/new?template=wrong-date.yml";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

export const schools = readJson<School[]>("data/schools.json");
export const councilList = readJson<Council[]>("data/councils.json");

export interface CalendarItem {
  kind: "holiday" | "inset";
  name: string;
  start: string;
  end: string; // inclusive
}

export interface SchoolView {
  school: School;
  council?: Council;
  resolved?: Resolved;
  terms: PupilTerm[];
  items: CalendarItem[];
}

export function schoolView(school: School): SchoolView {
  const council = councilList.find((c) => c.id === school.council);
  const resolved = resolveDates(school);
  if (!resolved) return { school, council, terms: [], items: [] };

  const { terms, insetDays } = resolved.dates;
  const items: CalendarItem[] = [
    ...deriveHolidays(terms).map((h) => ({ kind: "holiday" as const, ...h })),
    ...insetDays.map((day) => ({ kind: "inset" as const, name: "Inset day", start: day, end: day })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  return { school, council, resolved, terms: pupilTerms(terms, insetDays), items };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "Mon 7 Sep 2026" */
export const formatDate = (date: string): string => dateFormat.format(new Date(`${date}T00:00:00Z`));

/** "Mon 26 Oct 2026 – Fri 30 Oct 2026", or one date when start and end match. */
export const formatRange = (start: string, end: string): string =>
  start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
