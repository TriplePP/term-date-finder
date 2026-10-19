export interface Term {
  term: number;
  start: string; // YYYY-MM-DD
  end: string;
}

export interface DatesFile {
  id: string;
  name: string;
  academicYear: string; // e.g. "2026-27"
  status: "draft" | "verified";
  source: { url: string; checked: string };
  terms: Term[];
  insetDays: string[];
}

export interface School {
  urn: string;
  name: string;
  council: string;
  trust?: string;
}
