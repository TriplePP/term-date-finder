// Build data/schools.json from the DfE "Get Information About Schools" CSV.
//
// Download "All establishment data" from
// https://get-information-schools.service.gov.uk/Downloads, then run:
//   npm run import:gias -- path/to/edubasealldataYYYYMMDD.csv

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCsv, toRecords } from "./csv.ts";
import type { Council, School, TrustLink } from "./types.ts";

// Schools that follow council or trust term dates. Independent schools set
// their own, and colleges, universities and children's centres aren't schools.
const INCLUDED_GROUPS = new Set(["Academies", "Free Schools", "Local authority maintained schools", "Special schools"]);
const OPEN_STATUSES = new Set(["Open", "Open, but proposed to close"]);

const COLUMNS = {
  urn: "URN",
  name: "EstablishmentName",
  laCode: "LA (code)",
  group: "EstablishmentTypeGroup (name)",
  status: "EstablishmentStatus (name)",
  trust: "Trusts (name)",
} as const;

export interface ImportResult {
  schools: School[];
  /** Trusts with schools in our councils that have no entry in data/trusts.json, with school counts. */
  unlinkedTrusts: Map<string, number>;
}

export function selectSchools(records: Record<string, string>[], councils: Council[], trusts: TrustLink[]): ImportResult {
  const missing = Object.values(COLUMNS).filter((column) => records.length > 0 && !(column in records[0]));
  if (missing.length > 0) throw new Error(`GIAS CSV is missing columns: ${missing.join(", ")}`);

  const councilByCode = new Map(councils.map((c) => [c.laCode, c.id]));
  const trustByName = new Map(trusts.map((t) => [t.giasName.toLowerCase(), t.id]));
  const unlinkedTrusts = new Map<string, number>();
  const schools: School[] = [];

  for (const record of records) {
    const council = councilByCode.get(record[COLUMNS.laCode]);
    if (!council) continue;
    if (!INCLUDED_GROUPS.has(record[COLUMNS.group]) || !OPEN_STATUSES.has(record[COLUMNS.status])) continue;

    const school: School = { urn: record[COLUMNS.urn], name: record[COLUMNS.name].trim(), council };
    const trustName = record[COLUMNS.trust].trim();
    if (trustName) {
      const trust = trustByName.get(trustName.toLowerCase());
      if (trust) school.trust = trust;
      else unlinkedTrusts.set(trustName, (unlinkedTrusts.get(trustName) ?? 0) + 1);
    }
    schools.push(school);
  }

  schools.sort((a, b) => a.name.localeCompare(b.name, "en-GB") || a.urn.localeCompare(b.urn));
  return { schools, unlinkedTrusts };
}

function main(csvPath: string | undefined) {
  if (!csvPath) {
    console.error("usage: npm run import:gias -- path/to/edubasealldata.csv");
    process.exit(1);
  }
  // GIAS publishes its CSV in Windows-1252, not UTF-8.
  const text = new TextDecoder("windows-1252").decode(readFileSync(csvPath));
  const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

  const { schools, unlinkedTrusts } = selectSchools(
    toRecords(parseCsv(text)),
    readJson<Council[]>("data/councils.json"),
    readJson<TrustLink[]>("data/trusts.json"),
  );

  const lines = schools.map((s) => `  ${JSON.stringify(s)}`);
  writeFileSync("data/schools.json", `[\n${lines.join(",\n")}\n]\n`);
  console.log(`wrote ${schools.length} schools to data/schools.json`);

  if (unlinkedTrusts.size > 0) {
    console.log("\nTrusts without dates yet (their schools fall back to council dates):");
    for (const [name, count] of [...unlinkedTrusts].sort((a, b) => b[1] - a[1])) console.log(`  ${count}\t${name}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]);
