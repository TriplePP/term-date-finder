import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDates } from "./resolve.ts";
import type { DatesFile } from "./types.ts";

const dir = mkdtempSync(join(tmpdir(), "resolve-"));
const write = (path: string, id: string, status: DatesFile["status"]) => {
  mkdirSync(join(dir, path), { recursive: true });
  const file: DatesFile = {
    id,
    name: id,
    academicYear: "2026-27",
    status,
    source: { url: "https://example.org", checked: "2026-10-19" },
    terms: [],
    insetDays: [],
  };
  writeFileSync(join(dir, path, "2026-27.json"), JSON.stringify(file));
};

write("councils/county", "county", "verified");
write("councils/draftcounty", "draftcounty", "draft");
write("trusts/trust", "trust", "verified");
write("overrides/111", "111", "verified");
write("overrides/222", "222", "draft");

const resolve = (urn: string, council: string, trust?: string) =>
  resolveDates({ urn, name: "School", council, trust }, "2026-27", dir);

describe("resolveDates", () => {
  it("prefers the school override", () => {
    expect(resolve("111", "county", "trust")?.layer).toBe("override");
  });

  it("falls back to the trust, then the council", () => {
    expect(resolve("333", "county", "trust")).toMatchObject({ layer: "trust", dates: { id: "trust" } });
    expect(resolve("333", "county")).toMatchObject({ layer: "council", dates: { id: "county" } });
    expect(resolve("333", "county", "trust-without-file")?.layer).toBe("council");
  });

  it("skips draft files", () => {
    expect(resolve("222", "county", "trust")?.layer).toBe("trust");
    expect(resolve("333", "draftcounty")).toBeUndefined();
  });
});
