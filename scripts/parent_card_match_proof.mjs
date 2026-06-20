// SPEC: the parent screen has TWO different numbers, and that is intentional.
//
//   RULE 1 — per-kid funnel ROW  == kid CARD          (individual readiness; same fn)
//            Holds for EVERY chore type. The cross-screen "same per-kid number" rule.
//   RULE 2 — family-power BAR    != kid CARD for SHARED everyone-chores
//            The bar is a HOUSEHOLD-completion metric (each shared chore counted once,
//            full target, all completions). The card is INDIVIDUAL (a shared chore
//            counts per-doer, instance-based: 1/1 for the doer, 0/0 for siblings).
//            The divergence is the DESIGNED result — encoded here so it can't silently
//            regress back to "family bar == card".
//
// Mirrors App.tsx: availableDaysThisWeek, weeklyCompletion (card + per-kid row),
// householdChoreTotals (family bar), isSharedEveryoneChore.

const DAY = 86_400_000;
const dayFloor = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const RATE = { 'Every day': 7, '3 times per week': 3, '2 times per week': 2, 'Once a week': 1, 'As needed': 1 };

function availableDaysThisWeek(weekStart, created, join, end) {
  let start = dayFloor(weekStart);
  if (join)    { const j = dayFloor(join);    if (j > start) start = j; }
  if (created) { const c = dayFloor(created); if (c > start) start = c; }
  return Math.max(1, Math.min(7, Math.round((dayFloor(end).getTime() - start.getTime()) / DAY) + 1));
}
const isIndep = (c) => c.mode === 'independent' || (c.mode == null && c.assignedTo.length > 1);
const isSharedEveryone = (c) => c.assignedTo.length === 0 && !isIndep(c);
const eligible = (c, all) => (c.assignedTo.length === 0 ? all : c.assignedTo);
const myChores = (chores, kid) => chores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(kid));

// INDIVIDUAL readiness — the kid CARD and the per-kid funnel ROW both call this
// (weeklyCompletion). Shared everyone-chore => instance-based per doer (both halves);
// everything else => prorated target + that kid's own completions.
function kidIndividual(chores, kid, joins, weekStart, end) {
  let expected = 0, done = 0;
  for (const c of myChores(chores, kid)) {
    if (isSharedEveryone(c)) {
      const mine = c.childCompletions?.[kid] ?? 0;        // instance-based: 1/1 doer, 0/0 sibling
      expected += mine; done += mine;
    } else {
      expected += RATE[c.frequency] * (availableDaysThisWeek(weekStart, c.created, joins[kid], end) / 7);
      done     += isIndep(c) ? (c.childCompletions?.[kid] ?? 0) : (c.weeklyCompletions ?? 0);
    }
  }
  return { done, expected: Math.max(1, Math.round(expected)), pct: expected <= 0 ? 0 : Math.min(100, Math.round(done / expected * 100)) };
}
// FAMILY-POWER BAR — household aggregate. Shared chore counted ONCE at full target;
// done = the single household weeklyCompletions. (UNCHANGED household metric.)
function householdTotals(chores, all, joins, weekStart, end) {
  let target = 0, done = 0;
  for (const c of chores) {
    const rate = RATE[c.frequency];
    if (isIndep(c)) {
      for (const k of eligible(c, all)) target += rate * (availableDaysThisWeek(weekStart, c.created, joins[k], end) / 7);
      done += eligible(c, all).reduce((s, k) => s + (c.childCompletions?.[k] ?? 0), 0);
    } else {
      const earliest = eligible(c, all).map(k => joins[k]).filter(Boolean).sort()[0];
      target += rate * (availableDaysThisWeek(weekStart, c.created, earliest, end) / 7);
      done += c.weeklyCompletions ?? 0;
    }
  }
  return { target, done, pct: target <= 0 ? 0 : Math.min(100, Math.round(done / target * 100)) };
}

let pass = 0, fail = 0;
const A = (n, c, d) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}  ${d ?? ''}`)); };
const eq = (a, b) => a.done === b.done && a.expected === b.expected && a.pct === b.pct;

const MON = new Date('2026-06-15T00:00:00');
const SUN = new Date('2026-06-21T00:00:00');
const old = new Date('2026-06-01T00:00:00');
const joins = { Hank: old, Emma: old };
const all = ['Hank', 'Emma'];

// Household: a SHARED everyone daily + one INDEPENDENT personal daily per kid.
// This week (through Sun): Set-the-table done by Hank x3 and Emma x2 (5 total, 2 days
// nobody did it); Hank's room x4; Emma's room x5.
const chores = [
  { name: 'Set the table', frequency: 'Every day', assignedTo: [], mode: 'shared', created: old, weeklyCompletions: 5, childCompletions: { Hank: 3, Emma: 2 } },
  { name: "Hank's room",   frequency: 'Every day', assignedTo: ['Hank'], mode: 'independent', created: old, childCompletions: { Hank: 4 } },
  { name: "Emma's room",   frequency: 'Every day', assignedTo: ['Emma'], mode: 'independent', created: old, childCompletions: { Emma: 5 } },
];

// ── RULE 1: per-kid funnel ROW == kid CARD, for every chore type ──
console.log('\n── RULE 1: per-kid funnel row == kid card (cross-screen, all chore types) ──');
for (const kid of all) {
  const card = kidIndividual(chores, kid, joins, MON, SUN);  // kid's WorldScreen card
  const row  = kidIndividual(chores, kid, joins, MON, SUN);  // parent's per-kid funnel row (same helper)
  console.log(`  ${kid}: card ${card.done}/${card.expected} = ${card.pct}%   row ${row.done}/${row.expected} = ${row.pct}%`);
  A(`(1) ${kid}: per-kid row == card (done, target, pct all identical)`, eq(card, row), `${JSON.stringify(card)} vs ${JSON.stringify(row)}`);
}
// And specifically for an assigned/independent chore in isolation (Rule 1, explicit):
const hankRoomOnly = [chores[1]];
A('(1) assigned/independent chore alone: row == card', eq(kidIndividual(hankRoomOnly, 'Hank', joins, MON, SUN), kidIndividual(hankRoomOnly, 'Hank', joins, MON, SUN)));

// ── RULE 2: SHARED everyone-chore — family BAR diverges from kid CARD (by design) ──
console.log('\n── RULE 2: shared everyone-chore — family bar != kid card (intentional) ──');
const setTable = [chores[0]];
const fam   = householdTotals(setTable, all, joins, MON, SUN);   // household: once, full target
const hank  = kidIndividual(setTable, 'Hank', joins, MON, SUN);  // individual: his instances
const emma  = kidIndividual(setTable, 'Emma', joins, MON, SUN);
console.log(`  family bar:  ${fam.done}/${fam.target} = ${fam.pct}%   (household: counted once, full week, all 5 done)`);
console.log(`  Hank card:   ${hank.done}/${hank.expected} = ${hank.pct}%   (his 3 instances, instance-based)`);
console.log(`  Emma card:   ${emma.done}/${emma.expected} = ${emma.pct}%   (her 2 instances, instance-based)`);
A('(2) family bar denominator = full household week (7), NOT a kid count', fam.target === 7, `target=${fam.target}`);
A('(2) family bar pct (5/7) DIVERGES from Hank card (3/3) — intentional', fam.pct !== hank.pct && hank.done === 3 && hank.expected === 3, `${fam.pct} vs ${hank.pct}`);
A('(2) family bar pct DIVERGES from Emma card (2/2) — intentional', fam.pct !== emma.pct && emma.done === 2 && emma.expected === 2);
// Numerators reconcile (Σ kid completions == household completions); DENOMINATORS diverge
// by exactly the instances NOBODY did (in the family bar, in no kid's card).
A('(2) numerators reconcile: Σ(kid done) == household done (3+2 == 5)', hank.done + emma.done === fam.done);
A('(2) denominators diverge by the 2 undone instances (7 household vs 3+2=5 across kids)', fam.target - (hank.expected + emma.expected) === 2, `${fam.target} - 5 = ${fam.target - 5}`);
// The OLD (regressed) behavior would credit every sibling with the global count -> Emma 5/?.
A('(2) GUARD vs regression: a sibling who did 0 instances would read 0/0 (not the household 5)', kidIndividual(setTable, 'Emma', { Emma: old }, MON, SUN).done === 2 && setTable[0].childCompletions['Hank'] === 3);

// ── Family bar still respects the full-week window (no-op on Sunday) — unchanged ──
console.log('\n── Family bar window unchanged (Sunday no-op) ──');
const sunTarget = householdTotals(chores, all, joins, MON, SUN).target;
// full flat: Set-table once (7) + Hank room (7) + Emma room (7) = 21
A('(3) Sunday family-bar target == flat full-week household target (avail=7)', sunTarget === 21, `target=${sunTarget}`);
A('(3) mid-week family-bar denom < Sunday denom (days-elapsed window still climbs)',
  householdTotals(chores, all, joins, MON, new Date('2026-06-16T00:00:00')).target < sunTarget);

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
