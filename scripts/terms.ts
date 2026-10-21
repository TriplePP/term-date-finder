import { isWeekend, nextWeekday, previousWeekday } from "./dates.ts";
import type { Term } from "./types.ts";

export interface PupilTerm {
  term: number;
  firstDay: string; // first day for pupils
  lastDay: string; // last day for pupils
}

/**
 * Terms as parents see them: inset days and weekends at either end are
 * trimmed, so MNSP's Term 1 (3 Sep–23 Oct) becomes 7 Sep–21 Oct.
 */
export function pupilTerms(terms: Term[], insetDays: string[]): PupilTerm[] {
  const inset = new Set(insetDays);
  const closed = (day: string) => isWeekend(day) || inset.has(day);

  return [...terms]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(({ term, start, end }) => {
      let firstDay = start;
      while (closed(firstDay) && firstDay < end) firstDay = nextWeekday(firstDay);
      let lastDay = end;
      while (closed(lastDay) && lastDay > firstDay) lastDay = previousWeekday(lastDay);
      return { term, firstDay, lastDay };
    });
}
