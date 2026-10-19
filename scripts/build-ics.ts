import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildIcs } from "./ics.ts";
import type { DatesFile, School } from "./types.ts";

const YEAR = "2026-27";
const OUT_DIR = "dist/cal";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

const schools = readJson<School[]>("data/schools.json");
mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const school of schools) {
  // Phase 1: trust dates only. Override and council layers come in Phase 2.
  const path = `data/trusts/${school.trust}/${YEAR}.json`;
  if (!school.trust || !existsSync(path)) {
    console.warn(`skip ${school.urn} ${school.name}: no trust dates`);
    continue;
  }
  const dates = readJson<DatesFile>(path);
  if (dates.status !== "verified") {
    console.warn(`skip ${school.urn} ${school.name}: ${path} is ${dates.status}`);
    continue;
  }
  writeFileSync(`${OUT_DIR}/${school.urn}.ics`, buildIcs(school, dates));
  written++;
}

cpSync("public", "dist", { recursive: true });
console.log(`wrote ${written} calendar file(s) to ${OUT_DIR}`);
