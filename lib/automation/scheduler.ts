import { emitBusinessEvent } from "@/lib/automation/runtime";
import type { AutomationSchedule } from "@/lib/automation/types";
import { loadPersisted } from "@/modules/core/services/local-persist";
import {
  listSchedules,
  touchScheduleRun
} from "@/modules/automation/services/automation.store";

const TICK_MS = 30_000;
let timer: ReturnType<typeof setInterval> | null = null;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localParts(d = new Date()) {
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    day: d.getDate(),
    hh: d.getHours(),
    mm: d.getMinutes(),
    weekday: d.getDay()
  };
}

function parseHhmm(hhmm: string) {
  const [h, m] = (hhmm || "08:00").split(":").map((x) => Number(x));
  return { h: Number.isFinite(h) ? h : 8, m: Number.isFinite(m) ? m : 0 };
}

/** Next run instant for a schedule after `from`. */
export function computeNextRunAt(schedule: AutomationSchedule, from = new Date()): string {
  const { h, m } = parseHhmm(schedule.time_hhmm);
  const start = new Date(from.getTime());

  if (schedule.frequency === "hourly") {
    const next = new Date(start.getTime());
    next.setMinutes(m, 0, 0);
    if (next <= start) next.setHours(next.getHours() + 1);
    return next.toISOString();
  }

  if (schedule.frequency === "daily") {
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0, 0);
    if (next <= start) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  // weekly
  const targetDow = schedule.weekday ?? 1;
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0, 0);
  let guard = 0;
  while ((next.getDay() !== targetDow || next <= start) && guard < 14) {
    next.setDate(next.getDate() + 1);
    next.setHours(h, m, 0, 0);
    guard += 1;
  }
  return next.toISOString();
}

function isDue(schedule: AutomationSchedule, now = new Date()) {
  if (!schedule.enabled) return false;
  const last = schedule.last_run_at ? new Date(schedule.last_run_at).getTime() : 0;
  const parts = localParts(now);
  const { h, m } = parseHhmm(schedule.time_hhmm);

  if (schedule.frequency === "hourly") {
    // Fire once per hour when minute matches (within tick window)
    if (parts.mm !== m && Math.abs(parts.mm - m) > 1) return false;
    const hourKey = `${parts.y}-${parts.m}-${parts.day}-${parts.hh}`;
    const lastKey = last
      ? (() => {
          const d = new Date(last);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        })()
      : "";
    return hourKey !== lastKey;
  }

  if (schedule.frequency === "daily") {
    if (parts.hh !== h) return false;
    if (Math.abs(parts.mm - m) > 2) return false;
    const dayKey = `${parts.y}-${pad(parts.m + 1)}-${pad(parts.day)}`;
    const lastDay = last
      ? (() => {
          const d = new Date(last);
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })()
      : "";
    return dayKey !== lastDay;
  }

  // weekly
  if ((schedule.weekday ?? 1) !== parts.weekday) return false;
  if (parts.hh !== h) return false;
  if (Math.abs(parts.mm - m) > 2) return false;
  const weekKey = `${parts.y}-W${Math.ceil(parts.day / 7)}-${parts.weekday}`;
  const lastWeek = last
    ? (() => {
        const d = new Date(last);
        return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}-${d.getDay()}`;
      })()
    : "";
  return weekKey !== lastWeek;
}

export function runDueSchedules(tenantId: string) {
  const now = new Date();
  const due = listSchedules(tenantId).filter((s) => isDue(s, now));
  for (const schedule of due) {
    emitBusinessEvent({
      tenantId,
      module: schedule.module,
      eventKey: schedule.event_key || "platform.schedule.tick",
      title: `Schedule: ${schedule.name}`,
      message: schedule.description,
      payload: {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        frequency: schedule.frequency,
        ...(schedule.payload || {})
      }
    });
    const next = computeNextRunAt(schedule, now);
    touchScheduleRun(schedule.id, next);
  }
  return due.length;
}

/** Run schedules for every tenant that has seeded schedules. */
export function tickAllSchedules() {
  if (typeof window === "undefined") return 0;
  const schedules = loadPersisted<AutomationSchedule[]>("businesssuite:automation:schedules:v1") ?? [];
  const tenantIds = [...new Set(schedules.map((s) => s.tenant_id))];
  let n = 0;
  for (const tenantId of tenantIds) n += runDueSchedules(tenantId);
  return n;
}

export function startAutomationScheduler() {
  if (typeof window === "undefined") return;
  if (timer) return;
  timer = setInterval(() => {
    try {
      tickAllSchedules();
    } catch {
      /* ignore */
    }
  }, TICK_MS);
  // Initial pass
  try {
    tickAllSchedules();
  } catch {
    /* ignore */
  }
}

export function stopAutomationScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
