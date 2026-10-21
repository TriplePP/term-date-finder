import { addDays, compact } from "./dates.ts";
import { deriveHolidays } from "./holidays.ts";
import type { Layer } from "./resolve.ts";
import type { DatesFile, School } from "./types.ts";

// Never change this: it is part of every event UID, and changing a UID
// makes subscribers' calendars show duplicates.
const UID_DOMAIN = "termdates";

const DISCLAIMER = "Always check with your school.";

interface CalEvent {
  uid: string;
  start: string; // first day
  end: string; // last day (inclusive)
  summary: string;
  description?: string;
}

/** Escape TEXT values (RFC 5545 section 3.3.11). */
const escapeText = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold a line to at most 75 octets, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(school: School, dates: DatesFile, layer: Layer = "trust"): string {
  const year = dates.academicYear;
  const uid = (type: string, date: string) => `${school.urn}-${year}-${type}-${compact(date)}@${UID_DOMAIN}`;
  const sourceNote = `${DISCLAIMER} Source: ${dates.source.url}`;
  const calDesc =
    layer === "council"
      ? `School holidays for ${school.name}, from the council's term dates. Inset days are not included. ${DISCLAIMER}`
      : `School holidays and inset days for ${school.name}. ${DISCLAIMER}`;

  const events: CalEvent[] = [
    ...deriveHolidays(dates.terms).map((h) => ({
      uid: uid("holiday", h.start),
      start: h.start,
      end: h.end,
      summary: h.name,
      description: sourceNote,
    })),
    ...dates.insetDays.map((day) => ({
      uid: uid("inset", day),
      start: day,
      end: day,
      summary: "Inset day – school closed to pupils",
      description: sourceNote,
    })),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.uid.localeCompare(b.uid));

  // Taken from the date the source was checked, not the build time, so the
  // same data always produces the same file.
  const stamp = `${compact(dates.source.checked)}T000000Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TermDates//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`${school.name} – term dates`)}`,
    `X-WR-CALDESC:${escapeText(calDesc)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "X-PUBLISHED-TTL:P1D",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.end, 1))}`, // DTEND is the day after
      `SUMMARY:${escapeText(e.summary)}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      "SEQUENCE:0",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
