import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildIcs } from "./ics.ts";
import { resolveDates } from "./resolve.ts";
import type { School } from "./types.ts";

const OUT_DIR = "dist/cal";

const schools = JSON.parse(readFileSync("data/schools.json", "utf8")) as School[];
mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const school of schools) {
  const resolved = resolveDates(school);
  if (!resolved) {
    console.warn(`skip ${school.urn} ${school.name}: no verified dates`);
    continue;
  }
  writeFileSync(`${OUT_DIR}/${school.urn}.ics`, buildIcs(school, resolved.dates, resolved.layer));
  written++;
}

cpSync("public", "dist", { recursive: true });
console.log(`wrote ${written} calendar file(s) to ${OUT_DIR}`);
