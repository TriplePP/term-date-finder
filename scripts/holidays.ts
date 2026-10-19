import { addDays, nextWeekday, previousWeekday } from "./dates.ts";
import type { Term } from "./types.ts";

export interface Holiday {
  name: string;
  start: string; // first weekday off
  end: string; // last day off (inclusive)
}

// Names for the gaps after terms 1–5 in the usual six-term year.
const GAP_NAMES = ["October half term", "Christmas holiday", "February half term", "Easter holiday", "May half term"];

/**
 * Holidays are the gaps between terms, trimmed to weekdays at each edge.
 * Summer runs from after the last term to the day before next year's first
 * term, or to 31 August when next year's dates aren't known yet.
 */
export function deriveHolidays(terms: Term[], nextYearStart?: string): Holiday[] {
  const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
  const holidays: Holiday[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = nextWeekday(sorted[i].end);
    const end = previousWeekday(sorted[i + 1].start);
    if (start > end) continue; // terms run back to back
    holidays.push({ name: GAP_NAMES[i] ?? "Holiday", start, end });
  }

  const last = sorted.at(-1);
  if (last) {
    const start = nextWeekday(last.end);
    const end = nextYearStart ? addDays(nextYearStart, -1) : `${last.end.slice(0, 4)}-08-31`;
    holidays.push({ name: "Summer holiday", start, end });
  }

  return holidays;
}
