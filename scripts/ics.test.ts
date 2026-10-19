import { describe, expect, it } from "vitest";
import mnsp from "../data/trusts/mnsp/2026-27.json" with { type: "json" };
import { buildIcs, foldLine } from "./ics.ts";
import type { DatesFile } from "./types.ts";

const school = { urn: "144830", name: "Midsomer Norton Primary School", council: "bathnes", trust: "mnsp" };
const ics = buildIcs(school, mnsp as DatesFile);
const events = ics.split("BEGIN:VEVENT").slice(1);

describe("buildIcs", () => {
  it("has six inset days and six holidays", () => {
    expect(events.filter((e) => e.includes("SUMMARY:Inset day"))).toHaveLength(6);
    expect(events.filter((e) => e.includes("-holiday-"))).toHaveLength(6);
  });

  it("makes an inset day a one-day event with DTEND the day after", () => {
    const event = events.find((e) => e.includes("UID:144830-2026-27-inset-20261022@termdates"));
    expect(event).toContain("DTSTART;VALUE=DATE:20261022\r\n");
    expect(event).toContain("DTEND;VALUE=DATE:20261023\r\n");
  });

  it("covers half term Mon 26 to Fri 30 October", () => {
    const event = events.find((e) => e.includes("SUMMARY:October half term"));
    expect(event).toContain("DTSTART;VALUE=DATE:20261026\r\n");
    expect(event).toContain("DTEND;VALUE=DATE:20261031\r\n");
  });

  it("never shows as busy", () => {
    expect(events.every((e) => e.includes("TRANSP:TRANSPARENT"))).toBe(true);
  });

  it("uses CRLF and lines of at most 75 octets", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });

  it("gives unique UIDs and the same output every run", () => {
    const uids = ics.match(/^UID:.*$/gm) ?? [];
    expect(new Set(uids).size).toBe(uids.length);
    expect(buildIcs(school, mnsp as DatesFile)).toBe(ics);
  });
});

describe("foldLine", () => {
  it("does not split a multi-byte character", () => {
    const folded = foldLine("X:" + "–".repeat(40));
    for (const part of folded.split("\r\n")) expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe("X:" + "–".repeat(40));
  });
});
