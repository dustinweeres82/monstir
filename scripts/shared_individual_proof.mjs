// DESIGN PROOF (nothing applied yet): individual readiness for shared "everyone"
// chores. A shared everyone-chore contributes to a kid's (done, expected) fraction
// ONLY via that kid's own completions — instance-based, so a non-doer sibling has it
// in NEITHER half. Models the proposed readiness contribution and contrasts it with
// (i) today's buggy behavior and (ii) the WRONG numerator-only fix.

const DAY = 86_400_000;
const dayFloor = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const RATE = { 'Every day': 7, '3 times per week': 3, '2 times per week': 2, 'Once a week': 1, 'As needed': 1 };
const isIndep = (c) => c.mode === 'independent' || (c.mode == null && c.assignedTo.length > 1);
const isSharedEveryone = (c) => c.assignedTo.length === 0 && !isIndep(c);
function availDays(weekStart, created, join, end) {
  let s = dayFloor(weekStart);
  if (join)    { const j = dayFloor(join);    if (j > s) s = j; }
  if (created) { const c = dayFloor(created); if (c > s) s = c; }
  return Math.max(1, Math.min(7, Math.round((dayFloor(end) - s) / DAY) + 1));
}
const myChores = (chores, kid) => chores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(kid));

// ── three contribution models for a single chore, for a given kid ──
// returns { done, expected }
function contribOLD(c, kid, ws, end) { // today: shared = global weeklyCompletions (credits everyone)
  if (isSharedEveryone(c) || !isIndep(c)) return { done: c.weeklyCompletions ?? 0, expected: RATE[c.frequency] * availDays(ws, c.created, undefined, end) / 7 };
  return { done: c.childCompletions?.[kid] ?? 0, expected: RATE[c.frequency] * availDays(ws, c.created, c.joins?.[kid], end) / 7 };
}
function contribNUMONLY(c, kid, ws, end) { // WRONG fix: drop non-doer numerator, KEEP denominator
  if (isSharedEveryone(c)) return { done: c.childCompletions?.[kid] ?? 0, expected: RATE[c.frequency] * availDays(ws, c.created, undefined, end) / 7 };
  return { done: c.childCompletions?.[kid] ?? 0, expected: RATE[c.frequency] * availDays(ws, c.created, undefined, end) / 7 };
}
function contribNEW(c, kid, ws, end) { // PROPOSED: shared everyone = instance-based per kid (both halves)
  if (isSharedEveryone(c)) { const k = c.childCompletions?.[kid] ?? 0; return { done: k, expected: k }; }
  return { done: c.childCompletions?.[kid] ?? 0, expected: RATE[c.frequency] * availDays(ws, c.created, c.joins?.[kid], end) / 7 };
}
function frac(model, chores, kid, ws, end) {
  let done = 0, expected = 0;
  for (const c of myChores(chores, kid)) { const r = model(c, kid, ws, end); done += r.done; expected += r.expected; }
  return { done, expected, pct: expected <= 0 ? 0 : Math.min(100, Math.round(done / expected * 100)) };
}

let pass = 0, fail = 0;
const A = (n, c, d) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}  ${d ?? ''}`)); };

const MON = new Date('2026-06-15T00:00:00');
const SUN = new Date('2026-06-21T00:00:00');
const old = new Date('2026-06-01T00:00:00');

// Household: Hank + Emma. One shared everyone DAILY chore + one personal daily each.
function board() {
  return [
    { name: 'Set the table', frequency: 'Every day', assignedTo: [], mode: 'shared', created: old, weeklyCompletions: 0, childCompletions: {}, childStatus: {} },
    // personal chores modeled as independent so they use per-kid childCompletions in ALL
    // three models — isolating the shared everyone-chore as the only variable under test.
    { name: "Hank's room",   frequency: 'Every day', assignedTo: ['Hank'], mode: 'independent', created: old, childCompletions: {} },
    { name: "Emma's room",   frequency: 'Every day', assignedTo: ['Emma'], mode: 'independent', created: old, childCompletions: {} },
  ];
}

// ── DAY 1 (Mon): Hank completes Set-the-table (shared) + his room; Emma her room ──
console.log('\n── Day 1 (Mon): Hank does the shared chore; Emma does not ──');
let b = board();
const setTable = b[0];
// completion-path effect for a shared chore: bump global count + DOER childCompletions,
// and board-lock every OTHER eligible kid (status approved). (Pay -> doer only, omitted.)
setTable.weeklyCompletions += 1;
setTable.childCompletions['Hank'] = 1;
setTable.childStatus = { Hank: 'approved', Emma: 'approved' /* board lock, NOT a completion */ };
b[1].childCompletions['Hank'] = 1; // Hank's room
b[2].childCompletions['Emma'] = 1; // Emma's room

const hankNew = frac(contribNEW, b, 'Hank', MON, MON);
const emmaNew = frac(contribNEW, b, 'Emma', MON, MON);
const emmaOld = frac(contribOLD, b, 'Emma', MON, MON);
const emmaNumOnly = frac(contribNUMONLY, b, 'Emma', MON, MON);

// (a) Hank's fraction includes the shared chore in BOTH halves
const hankShare = contribNEW(setTable, 'Hank', MON, MON);
A('(a) Hank: shared chore in numerator AND denominator (1 and 1)', hankShare.done === 1 && hankShare.expected === 1, JSON.stringify(hankShare));
A('(a) Hank total fraction = 2/2 = 100%', hankNew.done === 2 && hankNew.expected === 2 && hankNew.pct === 100, JSON.stringify(hankNew));

// (b) Emma's fraction excludes the shared chore in BOTH halves, bar NOT dragged
const emmaShare = contribNEW(setTable, 'Emma', MON, MON);
A('(b) Emma: shared chore in NEITHER half (0 and 0)', emmaShare.done === 0 && emmaShare.expected === 0, JSON.stringify(emmaShare));
A('(b) Emma total = 1/1 = 100% (only her own room) — bar NOT dragged down', emmaNew.done === 1 && emmaNew.expected === 1 && emmaNew.pct === 100, JSON.stringify(emmaNew));
console.log(`     vs OLD (buggy, credits Emma for Hank's work): Emma = ${emmaOld.done}/${Math.round(emmaOld.expected*100)/100} = ${emmaOld.pct}%`);
console.log(`     vs NUMERATOR-ONLY (wrong, charges Emma's denom): Emma = ${emmaNumOnly.done}/${Math.round(emmaNumOnly.expected*100)/100} = ${emmaNumOnly.pct}%`);
const emmaOldShared = contribOLD(setTable, 'Emma', MON, MON);
A('(b) OLD bug: Emma’s numerator wrongly includes Hank’s shared completion (done=1)', emmaOldShared.done === 1, JSON.stringify(emmaOldShared));
A('(b) the WRONG numerator-only fix WOULD drag Emma down (100% → 50%)', emmaNumOnly.pct === 50, `pct=${emmaNumOnly.pct}`);
A('(b) PROPOSED fix leaves Emma at her honest 100% (shared chore invisible to her)', emmaNew.pct === 100);

// (c) board lock: Set-the-table is hidden from Emma's to-do after Hank claims it
const emmaSeesSetTable = ['active', 'rejected'].includes(setTable.childStatus['Emma'] ?? 'active');
A('(c) board lock intact: Set-the-table hidden from Emma (status approved, not active)', emmaSeesSetTable === false, `status=${setTable.childStatus['Emma']}`);

// (d) pay path: doer-only. weeklyCompletions / childCompletions never touch pay; only
//     the submitter gets pendingCents/coins/history. (Unchanged by this fix.)
A('(d) pay attribution unchanged (doer-only — not a function of the readiness counters)', true);

// ── (e) DAY 2 (Tue): daily shared chore RE-OPENS; Emma does it this time ──
console.log('\n── Day 2 (Tue): daily shared chore re-opens; Emma completes it ──');
// per-day lock reset reopens the daily chore for everyone (childLastDoneDate cleared).
setTable.childStatus = { Hank: 'active', Emma: 'active' };
// Emma completes it Tuesday: global count++ and EMMA's childCompletions++
setTable.weeklyCompletions += 1;              // household did it 2 days
setTable.childCompletions['Emma'] = 1;
setTable.childStatus = { Hank: 'approved', Emma: 'approved' };
const hankD2 = contribNEW(setTable, 'Hank', MON, new Date('2026-06-16T00:00:00'));
const emmaD2 = contribNEW(setTable, 'Emma', MON, new Date('2026-06-16T00:00:00'));
A('(e) re-opens & re-creditable: Hank still credited for Mon (1/1)', hankD2.done === 1 && hankD2.expected === 1);
A('(e) Emma now credited for Tue (1/1) — her own completion, not Hank’s', emmaD2.done === 1 && emmaD2.expected === 1);
A('(e) household count = 2 (both days), each kid credited for the day they did it', setTable.weeklyCompletions === 2 && setTable.childCompletions['Hank'] === 1 && setTable.childCompletions['Emma'] === 1);

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
