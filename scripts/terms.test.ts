import { describe, expect, it } from "vitest";
import mnsp from "../data/trusts/mnsp/2026-27.json" with { type: "json" };
import { pupilTerms } from "./terms.ts";

describe("pupilTerms", () => {
  const terms = pupilTerms(mnsp.terms, mnsp.insetDays);

  it("starts Term 1 on Monday 7 September, after two inset days", () => {
    expect(terms[0]).toEqual({ term: 1, firstDay: "2026-09-07", lastDay: "2026-10-21" });
  });

  it("starts Term 3 on Tuesday 5 January, after the inset day", () => {
    expect(terms[2].firstDay).toBe("2027-01-05");
  });

  it("leaves terms without edge inset days alone", () => {
    expect(terms[5]).toEqual({ term: 6, firstDay: "2027-06-07", lastDay: "2027-07-23" });
  });
});
