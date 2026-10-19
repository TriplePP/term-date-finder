// All dates are plain YYYY-MM-DD strings. Maths is done in UTC so the
// machine's time zone and clock changes never shift a day.

const DAY_MS = 86_400_000;

const toTime = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const fromTime = (time: number): string => new Date(time).toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string => fromTime(toTime(date) + days * DAY_MS);

export const isWeekend = (date: string): boolean => {
  const day = new Date(toTime(date)).getUTCDay();
  return day === 0 || day === 6;
};

/** First weekday strictly after `date`. */
export const nextWeekday = (date: string): string => {
  let d = addDays(date, 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
};

/** Last weekday strictly before `date`. */
export const previousWeekday = (date: string): string => {
  let d = addDays(date, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
};

export const compact = (date: string): string => date.replaceAll("-", "");
