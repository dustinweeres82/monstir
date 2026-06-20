// Proof for the card/gate denominator split.
// CARD denominator = full-week window (start → this week's SUNDAY)  → monotonic.
// GATE denominator = days-elapsed window (start → TODAY)           → honest, prorated.
// Mirrors App.tsx availableDaysThisWeek / weeklyCompletion.

const DAY = 86_400_000;
const dayFloor = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// inclusive span from max(weekStart, join, created) → `end`, floored 1, capped 7
function availDays(weekStart, created, join, end) {
  let start = dayFloor(weekStart);
  if (join)    { const j = dayFloor(join);    if (j > start) start = j; }
  if (created) { const c = dayFloor(created); if (c > start) start = c; }
  const span = Math.round((dayFloor(end).getTime() - start.getTime()) / DAY) + 1;
  return Math.max(1, Math.min(7, span));
}
const rate = { 'Every day': 7, '3 times per week': 3, '2 times per week': 2, 'Once a week': 1, 'As needed': 1 };
// denominator for a kid's chore set, with window end = `end`
function denom(chores, weekStart, join, end) {
  return chores.reduce((s, c) => s + rate[c.frequency] * (availDays(weekStart, c.created, join, end) / 7), 0);
}
function pct(done, d) { return d <= 0 ? 0 : Math.min(100, Math.round((done / d) * 100)); }

let pass = 0, fail = 0;
const assert = (name, cond, detail) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}  ${detail ?? ''}`)); };

const MON = new Date('2026-06-15T00:00:00');
const SUN = new Date('2026-06-21T00:00:00');
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((n, i) => ({ n, d: new Date(MON.getTime() + i * DAY) }));
const beforeWeek = new Date('2026-06-01T00:00:00');

// ── Scenario A: established kid, 5 daily chores pre-existing, present all week ──
// Does all 5 dailies EVERY day. Check the card meter is a monotonic climb (not flat
// 100), the gate stays honest, and — the warm-floor point — the card never drops
// overnight the way a gate-on-card meter would.
console.log('\n── A: established kid, 5 daily chores, does all 5 every day ──');
const chores5 = Array.from({ length: 5 }, (_, i) => ({ frequency: 'Every day', created: beforeWeek }));
const cardDenomA = denom(chores5, MON, beforeWeek, SUN);          // fixed all week
console.log(`  CARD denominator (fixed, full week) = ${cardDenomA}`);
let prevCardPct = -1, monotonic = true, sawAnyClimb = false, sawtoothIfGate = false;
const tbl = [];
for (let i = 0; i < 7; i++) {
  const done = 5 * (i + 1);                       // cumulative completions through evening of day i
  const doneMorning = 5 * i;                      // before doing today's chores
  const cP = pct(done, cardDenomA);               // CARD: full-week denom, evening
  const cPmorning = pct(doneMorning, cardDenomA); // CARD morning (denom fixed)
  const gateDenom = denom(chores5, MON, beforeWeek, days[i].d);
  const gPmorning = pct(doneMorning, gateDenom);  // what a GATE-on-card meter would show in the morning
  tbl.push({ day: days[i].n, cardMorning: cPmorning, cardEve: cP, gateOnCardMorning: gPmorning });
  if (cPmorning < prevCardPct) monotonic = false; // card morning must never be below prior evening
  if (i > 0 && gPmorning < pct(5 * i, denom(chores5, MON, beforeWeek, days[i-1].d))) sawtoothIfGate = true;
  if (cP > prevCardPct) sawAnyClimb = true;
  prevCardPct = cP;
}
console.table(tbl);
assert('(1) CARD is a real climbing meter, not flat 100 (Mon ' + tbl[0].cardEve + '% → Sun ' + tbl[6].cardEve + '%)',
  tbl[0].cardEve < 100 && tbl[6].cardEve === 100 && sawAnyClimb);
assert('(warm-floor) CARD never drops overnight (each morning ≥ prior evening)', monotonic);
assert('  (contrast) a gate-on-card meter WOULD sawtooth overnight', sawtoothIfGate);

// ── Scenario B: GATE honesty + Sunday no-op ──
console.log('\n── B: gate reads true days-elapsed pct; card == gate on Sunday ──');
const cardSun = denom(chores5, MON, beforeWeek, SUN);
const gateSun = denom(chores5, MON, beforeWeek, SUN);
assert('(2) gate denominator == card denominator on Sunday (avail=7 no-op, they converge)',
  Math.abs(cardSun - gateSun) < 1e-9 && cardSun === 35, `card=${cardSun} gate=${gateSun}`);
// Mid-week the gate is honest: did everything available → 100% of threshold so far.
const gateWed = denom(chores5, MON, beforeWeek, days[2].d);
assert('gate honest mid-week: all-available done → 100% (Wed)', pct(15, gateWed) === 100, `denom=${gateWed}`);
// And a kid who slacked reads true-low on the gate:
assert('gate honest mid-week: did 1 of 15 available → 7% (Wed)', pct(1, gateWed) === 7, `denom=${gateWed}`);

// ── Scenario C: mid-week joiner CARD is not artificially low ──
console.log('\n── C: mid-week joiner (Emma, joined Thu) — card not re-broken ──');
const joinThu = days[3].d; // Thu Jun 18
const cardEmma = denom(chores5, MON, joinThu, SUN);   // window = Thu→Sun = 4 days
const flatBug  = chores5.reduce((s, c) => s + rate[c.frequency], 0); // the ORIGINAL bug: full flat 7-day
console.log(`  Emma CARD denominator (Thu→Sun window) = ${cardEmma}   |  original-bug flat denominator = ${flatBug}`);
assert('(3) joiner card denom uses join→Sunday window, NOT full flat week', cardEmma === 20 && flatBug === 35);
// Emma does all 5 dailies Thu–Sun → reaches 100% on the card by Sunday.
assert('(3) diligent joiner reaches 100% on the CARD by Sunday', pct(20, cardEmma) === 100);
// Under the original bug she would be locked out even doing everything:
assert('(3) under the old flat bug she would cap at 57% doing everything (locked out)', pct(20, flatBug) === 57);
// Her card is never LOWER than the old buggy card for the same completions:
let joinerNeverWorse = true;
for (let i = 3; i < 7; i++) { // Thu..Sun
  const done = 5 * (i - 2);
  if (pct(done, cardEmma) < pct(done, flatBug)) joinerNeverWorse = false;
}
assert('(3) joiner card pct ≥ old-flat-card pct for every day (never artificially low)', joinerNeverWorse);

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
