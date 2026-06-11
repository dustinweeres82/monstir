/**
 * Pure milestone-condition evaluation.
 *
 * These functions take plain data (already extracted from app state) and return
 * the list of milestone IDs whose condition is currently satisfied. They are
 * idempotent and side-effect free — the caller passes each returned id to
 * checkMilestone(), which dedupes against already-earned milestones.
 *
 * Event-only milestones (night-owl, quick-draw, first-payout, etc.) are NOT
 * handled here — they fire inline at their trigger moment where the timestamp /
 * one-shot context lives. This module covers the count/streak/total-derived ones
 * that can be recomputed from durable history at any time (the "sweep").
 *
 * Dates are passed as `Date.toDateString()` values (local-day granularity).
 */

/** Local-day index (days since epoch) for a `toDateString()` value. */
function dayNum(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 86_400_000);
}

/** Monday (as a week index) for the week containing a given day. */
function weekNum(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay();                 // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;  // back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return Math.floor(Math.floor(d.getTime() / 86_400_000) / 7);
}

/** Longest run of consecutive calendar days present in the set. */
export function longestConsecutiveDays(dateStrs: string[]): number {
  const nums = [...new Set(dateStrs.map(dayNum))].sort((a, b) => a - b);
  let best = 0, cur = 0, prev = NaN;
  for (const n of nums) {
    cur = n === prev + 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = n;
  }
  return best;
}

/** Longest run of consecutive ISO weeks that each contain at least one day. */
export function longestConsecutiveWeeks(dateStrs: string[]): number {
  const nums = [...new Set(dateStrs.map(weekNum))].sort((a, b) => a - b);
  let best = 0, cur = 0, prev = NaN;
  for (const n of nums) {
    cur = n === prev + 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = n;
  }
  return best;
}

/** Inclusive day span from the earliest to latest date (1 if a single day). */
export function spanDays(dateStrs: string[]): number {
  if (dateStrs.length === 0) return 0;
  const nums = dateStrs.map(dayNum);
  return Math.max(...nums) - Math.min(...nums) + 1;
}

export interface KidMilestoneInput {
  /** toDateString() of every approved chore for this kid. */
  approvalDates: string[];
  /** Lifetime count of approved chores. */
  totalApproved: number;
  /** Lifetime earned cents (sum of approved chore pay — NOT current balance). */
  lifetimeEarnedCents: number;
  collectibleCount: number;
  bossCaptureCount: number;
  /** Consecutive boss wins with no loss in between. */
  battleWinStreak: number;
  /** All assigned chores hit their weekly target this week. */
  weekTargetMet: boolean;
  /** Same, for the previous week (approx, from history). */
  prevWeekTargetMet: boolean;
  /** Active goal reached its target. */
  goalReached: boolean;
  /** Chores this kid completed today, when today is Sunday (else 0). */
  sundayCompletions: number;
}

export function evalKidMilestones(i: KidMilestoneInput): string[] {
  const out: string[] = [];
  const run = longestConsecutiveDays(i.approvalDates);

  if (i.totalApproved >= 1)        out.push('first-chore');
  if (i.lifetimeEarnedCents > 0)   out.push('first-coins');
  if (i.totalApproved >= 10)       out.push('chores-10');
  if (i.totalApproved >= 50)       out.push('chores-50');

  if (run >= 3)                    out.push('streak-3');
  if (run >= 7)                    out.push('no-days-off');
  if (run >= 30)                   out.push('month-strong');

  if (i.weekTargetMet)                          out.push('week-warrior');
  if (i.weekTargetMet && i.prevWeekTargetMet)   out.push('two-peat');

  if (i.lifetimeEarnedCents >= 1000)   out.push('money-10');
  if (i.lifetimeEarnedCents >= 10000)  out.push('money-100');
  if (i.goalReached)                   out.push('goal-getter');

  if (i.bossCaptureCount >= 1)     out.push('boss-slayer');
  if (i.battleWinStreak >= 4)      out.push('kid-undefeated');
  if (i.collectibleCount >= 5)     out.push('collector');
  if (i.sundayCompletions >= 5)    out.push('last-minute-larry');

  return out;
}

export interface ParentMilestoneInput {
  /** One entry per approved chore, across all kids. */
  entries: { kidName: string; date: string }[];
  allKidNames: string[];
  lifetimePaidCents: number;
  /** Every kid has at least one assigned chore. */
  everyKidHasChore: boolean;
}

export function evalParentMilestones(i: ParentMilestoneInput): string[] {
  const out: string[] = [];
  const dates = i.entries.map(e => e.date);

  // Approvals grouped by exact day → speed-run / night-before
  const byDay = new Map<number, { count: number; dow: number }>();
  for (const e of i.entries) {
    const n = dayNum(e.date);
    const slot = byDay.get(n) ?? { count: 0, dow: new Date(e.date).getDay() };
    slot.count++;
    byDay.set(n, slot);
  }
  let maxPerDay = 0, maxSaturday = 0;
  for (const { count, dow } of byDay.values()) {
    if (count > maxPerDay) maxPerDay = count;
    if (dow === 6 && count > maxSaturday) maxSaturday = count;
  }
  if (maxPerDay >= 5)    out.push('parent-speed-run');
  if (maxSaturday >= 10) out.push('parent-night-before');

  // Every kid approved within a single week → no-favourites
  if (i.allKidNames.length > 0) {
    const byWeek = new Map<number, Set<string>>();
    for (const e of i.entries) {
      const w = weekNum(e.date);
      const set = byWeek.get(w) ?? new Set<string>();
      set.add(e.kidName);
      byWeek.set(w, set);
    }
    for (const set of byWeek.values()) {
      if (i.allKidNames.every(n => set.has(n))) { out.push('parent-no-favourites'); break; }
    }
  }

  if (longestConsecutiveDays(dates) >= 7)  out.push('parent-hands-on');
  if (longestConsecutiveWeeks(dates) >= 4) out.push('parent-habit-formed');
  if (spanDays(dates) >= 30)               out.push('parent-month-strong');
  if (spanDays(dates) >= 90)               out.push('parent-long-game');

  if (i.lifetimePaidCents >= 10000) out.push('parent-triple-digits');
  if (i.lifetimePaidCents >= 50000) out.push('parent-running-tab');

  if (i.everyKidHasChore) out.push('parent-full-roster');

  return out;
}
