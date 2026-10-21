import { describe, expect, it } from "vitest";
import { parseCsv, toRecords } from "./csv.ts";
import { selectSchools } from "./import-gias.ts";

const HEADER =
  "URN,EstablishmentName,LA (code),EstablishmentTypeGroup (name),EstablishmentStatus (name),Trusts (name)";
const csv = [
  HEADER,
  '144830,Midsomer Norton Primary School,800,Academies,Open,MIDSOMER NORTON SCHOOLS PARTNERSHIP',
  '100001,"St Mary\'s, Bath",800,Local authority maintained schools,Open,',
  "100002,Closed School,800,Local authority maintained schools,Closed,",
  "100003,Private School,800,Independent schools,Open,",
  "100004,Somewhere Else Primary,801,Local authority maintained schools,Open,",
  '100005,"The ""Other"" Academy",800,Academies,Open,Another Trust',
].join("\r\n");

const councils = [{ id: "bathnes", name: "Bath and North East Somerset", laCode: "800" }];
const trusts = [{ id: "mnsp", giasName: "Midsomer Norton Schools Partnership" }];

describe("parseCsv", () => {
  it("handles quoted commas and doubled quotes", () => {
    const rows = parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n');
    expect(rows).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("selectSchools", () => {
  const { schools, unlinkedTrusts } = selectSchools(toRecords(parseCsv(csv)), councils, trusts);

  it("keeps open state schools in our councils, sorted by name", () => {
    expect(schools.map((s) => s.urn)).toEqual(["144830", "100001", "100005"]);
  });

  it("links trusts by name, ignoring case", () => {
    expect(schools[0]).toEqual({
      urn: "144830",
      name: "Midsomer Norton Primary School",
      council: "bathnes",
      trust: "mnsp",
    });
    expect(schools[1].trust).toBeUndefined();
  });

  it("reports trusts we have no dates for", () => {
    expect([...unlinkedTrusts]).toEqual([["Another Trust", 1]]);
  });

  it("fails loudly when GIAS renames a column", () => {
    const renamed = toRecords(parseCsv(csv.replace("Trusts (name)", "Trust name")));
    expect(() => selectSchools(renamed, councils, trusts)).toThrow("Trusts (name)");
  });
});
