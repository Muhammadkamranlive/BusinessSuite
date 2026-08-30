/** Working-day leave math used by leave requests, attendance, and payroll LWP. */

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime()) || last < cur) return out;
  while (cur <= last) {
    out.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

export function countWorkingDays(start: string, end: string, holidayDates: Iterable<string>): number {
  const holidays = new Set(holidayDates);
  return eachDateInclusive(start, end).filter((d) => !isWeekend(d) && !holidays.has(d)).length;
}

export function workingDates(start: string, end: string, holidayDates: Iterable<string>): string[] {
  const holidays = new Set(holidayDates);
  return eachDateInclusive(start, end).filter((d) => !isWeekend(d) && !holidays.has(d));
}

export function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return { start: period, end: period };
  const start = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function minutesOfDay(isoOrTime: string): number | null {
  const time = isoOrTime.includes("T") ? isoOrTime.slice(11, 16) : isoOrTime.slice(0, 5);
  const [h, min] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

export function isLateVsShift(checkInIso: string, shiftStart: string, graceMinutes: number): boolean {
  const inMin = minutesOfDay(checkInIso);
  const startMin = minutesOfDay(shiftStart);
  if (inMin == null || startMin == null) return false;
  return inMin > startMin + Math.max(0, graceMinutes);
}
