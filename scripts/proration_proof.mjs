// Standalone proof for the date-aware weekly denominator (MON weakness-threshold fix).
// Mirrors App.tsx: getWeekMondayKey, frequencyToWeeklyTarget, availableDaysThisWeek,
// weeklyCompletion. Asserts the control case is a byte-identical no-op vs the old flat
// lookup, and that the off-by-one / late-join / day-0 cases behave as specified.

const DAY = 86_400_000;

// ── copied verbatim from App.tsx ───────────────────────────────────────────
function getWeekMondayKey(now) {
  const d = new Date(now);
  const day = d.getDay();              // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toDateString();
}
function frequencyToWeeklyTarget(frequency) {
  switch (frequency) {
    case 'Every day': case 'daily': return 7;
    case '3 times per week': case '3x': return 3;
    case '2 times per week': case '2x': return 2;
    case 'Once a week': case 'weekly': case '1x': return 1;
    case 'As needed': return 1;
    default: return 1;
  }
}
function availableDaysThisWeek(choreCreatedAt, kidJoinDate, today, nowForWeek) {
  const dayFloor = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const end = dayFloor(today);
  let start = dayFloor(new Date(getWeekMondayKey(nowForWeek ?? today)));
  if (kidJoinDate)    { const j = dayFloor(new Date(kidJoinDate));    if (!isNaN(j.getTime()) && j > start) start = j; }
  if (choreCreatedAt) { const c = dayFloor(new Date(choreCreatedAt)); if (!isNaN(c.getTime()) && c > start) start = c; }
  const span = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  return Math.max(1, Math.min(7, span));
}
function weeklyCompletionDenominator(chores, kidJoinDate, today) {
  let expected = 0;
  for (const c of chores) {
    expected += frequencyToWeeklyTarget(c.frequency) * (availableDaysThisWeek(c.createdAt, kidJoinDate, today, today) / 7);
  }
  return expected;
}
function oldFlatDenominator(chores) {
  return chores.reduce((s, c) => s + frequencyToWeeklyTarget(c.frequency), 0);
}
// ───────────────────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
const assert = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail ?? ''}`); }
};

// A representative board: 16 daily + a couple sub-weekly (mirrors the real 24-chore mix).
const board = [
  ...Array.from({ length: 16 }, (_, i) => ({ name: `daily${i}`, frequency: 'Every day' })),
  { name: 'twice', frequency: '2 times per week' },
  { name: 'thrice', frequency: '3 times per week' },
  { name: 'weekly', frequency: 'Once a week' },
  { name: 'asneeded', frequency: 'As needed' },
];
// Established: chores created well before the week, kid joined long ago.
const monthAgo = '2026-05-20T10:00:00.000Z';
const establishedBoard = board.map(c => ({ ...c, createdAt: monthAgo }));

// Battle day = Sunday 2026-06-21 (the week's Mon is 2026-06-15).
const sundayBattle = new Date('2026-06-21T17:00:00');
const weekMonday  = new Date('2026-06-15T00:00:00');
const friday      = new Date('2026-06-19T09:00:00');

console.log('\n── CONTROL CASE: established family, full week, pre-existing chores ──');
const dControl = weeklyCompletionDenominator(establishedBoard, monthAgo, sundayBattle);
const dFlat    = oldFlatDenominator(establishedBoard);
console.log(`  flat (old) denominator = ${dFlat}`);
console.log(`  date-aware denominator = ${dControl}`);
assert('availDays for a full week == 7 (NOT 6)',
  availableDaysThisWeek(monthAgo, monthAgo, sundayBattle, sundayBattle) === 7,
  `got ${availableDaysThisWeek(monthAgo, monthAgo, sundayBattle, sundayBattle)}`);
assert('control denominator EXACTLY equals old flat lookup (strict no-op)',
  dControl === dFlat, `${dControl} !== ${dFlat}`);
// Per-frequency no-op check
for (const freq of ['Every day', '3 times per week', '2 times per week', 'Once a week', 'As needed']) {
  const one = [{ name: 'x', frequency: freq, createdAt: monthAgo }];
  assert(`  '${freq}': expected == frequencyToWeeklyTarget`,
    weeklyCompletionDenominator(one, monthAgo, sundayBattle) === frequencyToWeeklyTarget(freq));
}

console.log('\n── MONDAY-START EDGE: chore created exactly on week-start Monday ──');
assert('created Monday 00:00 → availDays == 7',
  availableDaysThisWeek(weekMonday.toISOString(), monthAgo, sundayBattle, sundayBattle) === 7,
  `got ${availableDaysThisWeek(weekMonday.toISOString(), monthAgo, sundayBattle, sundayBattle)}`);

console.log('\n── LATE-JOIN: kid joined Friday, battle Sunday ──');
const availFri = availableDaysThisWeek(monthAgo, friday.toISOString(), sundayBattle, sundayBattle);
console.log(`  availDays(Fri→Sun, inclusive) = ${availFri}`);
assert('Fri→Sun inclusive == 3 (Fri,Sat,Sun)', availFri === 3, `got ${availFri}`);
const dLate = weeklyCompletionDenominator(establishedBoard, friday.toISOString(), sundayBattle);
console.log(`  late-join denominator = ${dLate.toFixed(2)} (was ${dFlat})`);
assert('late-join denominator strictly LOWER than flat (bar prorates down)', dLate < dFlat);
// The true invariant: a DILIGENT Friday-joiner who completes every instance
// available to them in the 3-day window does `dLate` completions. Under the new
// math that clears 75%; under flat math the ceiling is mathematically unreachable
// (you can't do a full week's worth of chores in 3 days).
const diligentDone = Math.round(dLate);   // did everything available
const flatPct = Math.min(100, Math.round((diligentDone / dFlat) * 100));
const newPct  = Math.min(100, Math.round((diligentDone / dLate) * 100));
console.log(`  diligent joiner did all ${diligentDone} available: flat=${flatPct}%  date-aware=${newPct}%`);
assert('diligent Friday-joiner clears 75% under new math but is locked below it under old',
  newPct >= 75 && flatPct < 75, `flat=${flatPct} new=${newPct}`);

console.log('\n── DAY-0 FLOOR: kid joined today (Sunday) ──');
const avail0 = availableDaysThisWeek(monthAgo, sundayBattle.toISOString(), sundayBattle, sundayBattle);
assert('availDays floors at 1 (no collapse to 0)', avail0 === 1, `got ${avail0}`);
const d0 = weeklyCompletionDenominator(establishedBoard, sundayBattle.toISOString(), sundayBattle);
assert('day-0 denominator > 0 (no div-by-zero)', d0 > 0, `got ${d0}`);

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
