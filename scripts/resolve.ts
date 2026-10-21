import { existsSync, readFileSync } from "node:fs";
import type { DatesFile, School } from "./types.ts";

// Hard-coded until 2027-28 dates are published.
export const ACADEMIC_YEAR = "2026-27";

/** Which layer a school's dates came from. Only "council" lacks the school's inset days. */
export type Layer = "override" | "trust" | "council";

export interface Resolved {
  dates: DatesFile;
  layer: Layer;
}

/**
 * The most specific verified dates for a school: its own override, then its
 * trust, then its council. Draft files are skipped, so a draft override
 * leaves the trust or council dates in place until it is verified.
 */
export function resolveDates(school: School, year = ACADEMIC_YEAR, dataDir = "data"): Resolved | undefined {
  const candidates: [Layer, string | undefined][] = [
    ["override", school.urn],
    ["trust", school.trust],
    ["council", school.council],
  ];
  const folders: Record<Layer, string> = { override: "overrides", trust: "trusts", council: "councils" };

  for (const [layer, id] of candidates) {
    if (!id) continue;
    const path = `${dataDir}/${folders[layer]}/${id}/${year}.json`;
    if (!existsSync(path)) continue;
    const dates = JSON.parse(readFileSync(path, "utf8")) as DatesFile;
    if (dates.status === "verified") return { dates, layer };
  }
  return undefined;
}
