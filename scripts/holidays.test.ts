import { describe, expect, it } from "vitest";
import mnsp from "../data/trusts/mnsp/2026-27.json" with { type: "json" };
import { deriveHolidays } from "./holidays.ts";

describe("deriveHolidays", () => {
  it("finds every MNSP 2026–27 holiday, trimmed to weekdays", () => {
    expect(deriveHolidays(mnsp.terms)).toEqual([
      { name: "October half term", start: "2026-10-26", end: "2026-10-30" },
      { name: "Christmas holiday", start: "2026-12-21", end: "2027-01-01" },
      { name: "February half term", start: "2027-02-15", end: "2027-02-19" },
      { name: "Easter holiday", start: "2027-03-26", end: "2027-04-09" },
      { name: "May half term", start: "2027-05-31", end: "2027-06-04" },
      { name: "Summer holiday", start: "2027-07-26", end: "2027-08-31" },
    ]);
  });

  it("ends summer the day before next year's first term when known", () => {
    const summer = deriveHolidays(mnsp.terms, "2027-09-02").at(-1);
    expect(summer).toEqual({ name: "Summer holiday", start: "2027-07-26", end: "2027-09-01" });
  });
});
