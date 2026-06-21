// INTERNAL correctness check for reconstructBoardFromAudit (NOT the proof — proof is the
// on-device cross-device re-run). Mirrors the App.tsx helper, incl. the childStatus pass.
const RATE = { 'Every day':7,'3 times per week':3,'2 times per week':2,'Once a week':1,'As needed':1 };
const isIndep = c => c.mode==='independent' || (c.mode==null && c.assignedTo.length>1);
const TODAY = new Date('2026-06-20T18:00:00').toDateString();
function reconstruct(board, completions, idToName, allKids){
  const dayOf = iso => new Date(iso).toDateString();
  const today = TODAY;
  const byChore = new Map();
  for(const r of completions){ const name=idToName[r.kid_id]; if(!name) continue;
    let kids=byChore.get(r.chore_id); if(!kids){kids=new Map();byChore.set(r.chore_id,kids);}
    let a=kids.get(name); if(!a){a={approvedDays:new Set(),latestTs:0,latestDay:'',approvedToday:false,pendingToday:false};kids.set(name,a);}
    const day=dayOf(r.completed_at), ts=new Date(r.completed_at).getTime();
    if(ts>a.latestTs){a.latestTs=ts;a.latestDay=day;}
    if(r.status==='approved'){a.approvedDays.add(day); if(day===today)a.approvedToday=true;}
    else if(r.status==='pending'&&day===today)a.pendingToday=true; }
  return board.map(c=>{ const target=RATE[c.frequency]; const eligible=c.assignedTo.length?c.assignedTo:allKids;
    const perKid=byChore.get(c.id); const childCompletions={}; const childLastDoneDate={};
    const childStatus={...(c.childStatus||{})};   // PRESERVE
    const hhDays=new Set(); let hhTs=0,hhDay='';
    if(perKid) for(const [name,a] of perKid){ if(!eligible.includes(name)) continue;
      if(a.approvedDays.size) childCompletions[name]=Math.min(target,a.approvedDays.size);
      for(const d of a.approvedDays) hhDays.add(d);
      if(isIndep(c)){ if(a.latestDay) childLastDoneDate[name]=a.latestDay; }
      else if(a.latestTs>hhTs){ hhTs=a.latestTs; hhDay=a.latestDay; }
      if(a.approvedToday) childStatus[name]='approved'; else if(a.pendingToday) childStatus[name]='pending'; }
    if(!isIndep(c)&&hhDay) for(const name of eligible) childLastDoneDate[name]=hhDay;
    return {...c, weeklyCompletions: isIndep(c)?0:Math.min(target,hhDays.size), childCompletions, childStatus, childLastDoneDate}; });
}
let pass=0,fail=0; const A=(n,c,d)=>{c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${d??''}`));};
const all=['Chris','Emma','Millie']; const idToName={c:'Chris',e:'Emma',m:'Millie'};
const T='2026-06-20T18:00:00';

// (lock cases retained, abbreviated)
let r=reconstruct([{id:'set',frequency:'Every day',assignedTo:[],mode:'shared',childLastDoneDate:null}],
  [{chore_id:'set',kid_id:'c',completed_at:T,status:'approved'}], idToName, all)[0];
A('lock: shared household-stamped, doer credited', r.childLastDoneDate.Chris===new Date(T).toDateString() && r.childCompletions.Chris===1);

// ── childStatus pass ──
console.log('  -- childStatus --');
// (1) approved TODAY → approved → closes parent re-approve (getPendingCount would be 0)
r=reconstruct([{id:'set',frequency:'Every day',assignedTo:[],mode:'shared',childStatus:{Chris:'pending'}}],
  [{chore_id:'set',kid_id:'c',completed_at:T,status:'approved'}], idToName, all)[0];
A('(1) stale childStatus pending → reconstructed APPROVED (parent door closed)', r.childStatus.Chris==='approved', JSON.stringify(r.childStatus));

// (2) pending TODAY → pending
r=reconstruct([{id:'set',frequency:'Every day',assignedTo:[],mode:'shared',childStatus:{Chris:'active'}}],
  [{chore_id:'set',kid_id:'c',completed_at:T,status:'pending'}], idToName, all)[0];
A('(2) pending-today → childStatus pending', r.childStatus.Chris==='pending');

// (3) CRITICAL no-row=preserve: rejected chore, no audit row → stays rejected (NOT active)
r=reconstruct([{id:'x',frequency:'Every day',assignedTo:['Chris'],mode:'independent',childStatus:{Chris:'rejected'}}],
  [], idToName, all)[0];
A('(3) no row → rejected PRESERVED (not reset to active)', r.childStatus.Chris==='rejected', JSON.stringify(r.childStatus));

// (4) CRITICAL shared board-lock: non-doer marked approved, no row → preserved (drops off list, no double-do)
r=reconstruct([{id:'set',frequency:'Every day',assignedTo:[],mode:'shared',childStatus:{Chris:'approved',Emma:'approved',Millie:'approved'}}],
  [{chore_id:'set',kid_id:'c',completed_at:T,status:'approved'}], idToName, all)[0];
A('(4) shared non-doer Emma board-lock approved PRESERVED', r.childStatus.Emma==='approved' && r.childStatus.Millie==='approved');
A('(4) ...and the household lock still stamps non-doers (off their list)', r.childLastDoneDate.Emma===new Date(T).toDateString());

// (5) approved YESTERDAY (not today), blob reopened to active → preserve active (don't wrongly lock)
r=reconstruct([{id:'x',frequency:'Every day',assignedTo:['Chris'],mode:'independent',childStatus:{Chris:'active'}}],
  [{chore_id:'x',kid_id:'c',completed_at:'2026-06-19T10:00:00',status:'approved'}], idToName, all)[0];
A('(5) approved YESTERDAY + blob active → childStatus stays active (not approved)', r.childStatus.Chris==='active', JSON.stringify(r.childStatus));

console.log(`\n${fail===0?'✅ ALL PASS':'❌ FAIL'}: ${pass} passed, ${fail} failed`);
process.exit(fail===0?0:1);
