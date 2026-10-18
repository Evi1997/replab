// Multi-week programs and two-weekly coach check-ins. Rule-based, no AI.

// Week phases repeat every 4 weeks: build volume / effort for 3 weeks, then deload.
const PHASES = {
  hyp: [
    {n:'Base',   note:'Leave about 3 reps in the tank. Own the technique and find your working weights.', main:0, acc:0},
    {n:'Build',  note:'2 reps in reserve. One extra set on accessories.', main:0, acc:1},
    {n:'Push',   note:'1 rep in reserve on most sets. Extra set on main lifts and accessories.', main:1, acc:1},
    {n:'Deload', note:'Half the sets, same weights, nothing hard. This is where you recover and grow.', deload:true},
  ],
  str: [
    {n:'Volume', note:'Main lifts 5×5 at a weight you could lift 7–8 times.', mainSets:5, mainReps:'5'},
    {n:'Build',  note:'Main lifts 5×4: add 2.5–5 kg to last week.', mainSets:5, mainReps:'4'},
    {n:'Heavy',  note:'Main lifts 5×3: the heaviest weights of the block. Perfect reps only.', mainSets:5, mainReps:'3'},
    {n:'Deload', note:'Half the sets at ~80% of last week. Let your joints and nerves recover.', deload:true},
  ],
};
const PROGRAMS = [
  {id:'p-glute8',   n:'8-Week Glute Builder',      ic:'🍑', weeks:8,  phase:'hyp', d:'3 days a week: two glute-focused days and one upper day. Progressive overload with planned deloads.', days:['glutes-a','upper-tone','glutes-b']},
  {id:'p-lean6',    n:'6-Week Lean & Toned',       ic:'✨', weeks:6,  phase:'hyp', d:'4 days: full-body strength, glutes, upper body and a HIIT session. Build muscle, lose fat.', days:['fb-lean','glutes-a','upper-tone','cardio-hiit']},
  {id:'p-muscle12', n:'12-Week Muscle Builder',    ic:'💪', weeks:12, phase:'hyp', d:'4-day upper/lower split. Three 4-week blocks, each ending with a deload.', days:['upper-a','lower-a','upper-b','legs-p']},
  {id:'p-ppl8',     n:'8-Week Push Pull Legs',     ic:'🔁', weeks:8,  phase:'hyp', d:'6 days: push, pull, legs twice a week. For experienced lifters with time.', days:['push-a','pull-a','legs-q','push-b','pull-b','legs-p']},
  {id:'p-str8',     n:'8-Week Strength (5×5 → 5×3)', ic:'🏋️', weeks:8, phase:'str', d:'3 full-body days. Main lifts climb from 5×5 to 5×3, then deload and repeat heavier.', days:['fb-a','fb-b','fb-strength']},
  {id:'p-cali6',    n:'6-Week Calisthenics Foundations', ic:'🤸', weeks:6, phase:'hyp', d:'3 days: the base strength for pull-ups, dips, handstands and pistols.', days:['cali-base','cali-legs','cali-full']},
  {id:'p-travel4',  n:'4-Week Travel Program',     ic:'✈️', weeks:4,  phase:'hyp', d:'3 days, no equipment. Keep your progress while you are away.', days:['tr-full','tr-legs','tr-upper']},
];
const progById = id => PROGRAMS.find(p => p.id === id);
function programState(){
  const P = S.program && progById(S.program.id); if (!P) return null;
  const n = S.program.done || 0, per = P.days.length, week = Math.floor(n / per);
  if (week >= P.weeks) return {P, finished:true};
  const phase = PHASES[P.phase][week % 4];
  return {P, week, day:n % per, phase, next:wById(P.days[n % per]), pct:Math.round(n / (P.weeks * per) * 100)};
}
// Adjust a workout for this week's phase (and for a coach-prescribed deload week).
function applyWeek(list, phase){
  if (!phase) return list;
  return list.map(([id, s, r, rest], i) => {
    const x = exById(id), main = i < 2 && x.t === 'w';
    if (phase.deload) return [id, Math.max(2, Math.ceil(s / 2)), r, rest];
    if (phase.mainReps && main) return [id, phase.mainSets, phase.mainReps, 180];
    return [id, s + (main ? phase.main || 0 : phase.acc || 0), r, rest];
  });
}
const deloadActive = () => S.deloadUntil && Date.now() < S.deloadUntil;
const DELOAD_PHASE = PHASES.hyp[3];

// ---------- check-ins ----------
const CHECKIN_DAYS = 14;
const lastCheckin = () => (S.checkins || [])[(S.checkins || []).length - 1];
const checkinDue = () => { if (!S.profile) return false; const from = lastCheckin()?.t || S.profile.since || (S.body || [])[0]?.t || Date.now(); return Date.now() - from > CHECKIN_DAYS * 864e5; };
// target weekly change as % of body weight [min, max]
const RATE = {fat:[-1, -0.5], lean:[-0.75, -0.25], muscle:[0.1, 0.5], strength:[-0.25, 0.25], athletic:[-0.25, 0.25]};

function avgWeight(from, to){
  const v = (S.body || []).filter(b => +b.kg && b.t >= from && b.t < to).map(b => +b.kg);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function checkinForm(){
  const d = UI.ci || {};
  const opt = (k, o) => `<div class="obopts">${Object.entries(o).map(([v, l]) => `<button class="obopt ${d[k] === v ? 'on' : ''}" data-a="ciset" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<div class="tag">Coach check-in</div><h3>How are the last 2 weeks?</h3>
    <p class="sm mut">Honest answers = better adjustments. Weigh yourself in the morning before eating.</p>
    <div class="row"><div class="field sp"><label>Weight today (kg)</label><input inputmode="decimal" data-ci="kg" value="${esc(d.kg || '')}" placeholder="${latestVal('kg') || ''}"></div>
    <div class="field sp"><label>Waist (cm, optional)</label><input inputmode="decimal" data-ci="waist" value="${esc(d.waist || '')}" placeholder="${latestVal('waist') || '—'}"></div></div>
    <div class="field"><label>Training felt…</label>${opt('feel', {easy:'Too easy', good:'Challenging, good', hard:'Exhausting'})}</div>
    <div class="field"><label>Hunger</label>${opt('hunger', {low:'Low', ok:'Normal', high:'Starving'})}</div>
    <div class="field"><label>Sleep</label>${opt('sleep', {bad:'Under 6h', mid:'6–7h', good:'7h+'})}</div>
    <button class="btn pri wide" data-a="cisubmit">Get my coach's verdict</button>`;
}
function runCheckin(){
  const d = UI.ci, p = S.profile, now = Date.now(), num = v => +String(v || '').replace(',', '.') || 0;
  const kg = num(d.kg), waist = num(d.waist);
  if (kg || waist) S.body = [...(S.body || []), {t:now, kg, waist}];
  if (kg) p.kg = kg;
  const recent = avgWeight(now - 7 * 864e5, now + 1), before = avgWeight(now - 21 * 864e5, now - 7 * 864e5);
  const done = S.history.filter(h => h.start > now - 14 * 864e5).length, planned = p.days * 2;
  const notes = [], changes = [];
  // 1. weight trend vs goal
  if (recent && before) {
    const pct = (recent - before) / before * 100 / 2, [lo, hi] = RATE[p.goal];
    const txt = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% per week (${(recent - before >= 0 ? '+' : '')}${(recent - before).toFixed(1)} kg in 2 weeks)`;
    if (pct < lo) { changes.push({kcal:+150}); notes.push(`📉 You're changing faster than ideal: ${txt}. <b>+150 kcal/day</b> to protect muscle and energy.`); }
    else if (pct > hi) { changes.push({kcal:-150}); notes.push(`📈 ${p.goal === 'muscle' ? 'Gaining faster than muscle can be built' : 'Not losing as planned'}: ${txt}. <b>−150 kcal/day</b>.`); }
    else notes.push(`✅ Weight trend is right on target: ${txt}. No calorie change.`);
  } else notes.push('⚖️ Not enough weigh-ins to judge your trend yet. Weigh in 3+ mornings a week and I can fine-tune calories at the next check-in.');
  if (d.hunger === 'high' && (p.goal === 'fat' || p.goal === 'lean')) notes.push('🍽️ Hunger is high: prioritise protein and high-volume foods (vegetables, potatoes, berries, lean meat) before cutting more calories.');
  // 2. consistency
  if (done < planned * 0.6 && p.days > 2) { changes.push({days:p.days - 1}); notes.push(`🗓️ You logged ${done} of ${planned} planned sessions. Consistency beats ambition: I'd drop to <b>${p.days - 1} days a week</b> so you can hit every one.`); }
  else if (done >= planned) notes.push(`🔥 ${done}/${planned} sessions done. Excellent consistency.`);
  else notes.push(`👍 ${done}/${planned} sessions done.`);
  // 3. recovery
  if (d.feel === 'hard' || d.sleep === 'bad') { changes.push({deload:true}); notes.push(`😮‍💨 ${d.sleep === 'bad' ? 'Short sleep' : 'Training feels exhausting'}: take a <b>deload week</b> (half the sets, same weights). You'll come back stronger.`); }
  else if (d.feel === 'easy') notes.push('💪 Feels too easy: add weight as soon as you hit the top of a rep range. The app flags it on each exercise. Consider adding a training day.');
  if (d.sleep === 'mid') notes.push('😴 Aim for 7+ hours. Sleep is the cheapest performance enhancer there is.');
  UI.ciResult = {notes, changes, rec:{t:now, kg, waist, feel:d.feel, hunger:d.hunger, sleep:d.sleep, done, planned}};
}
function applyCheckin(){
  const {changes, rec} = UI.ciResult, p = S.profile;
  changes.forEach(c => {
    if (c.kcal) p.kcalAdj = Math.max(-600, Math.min(600, (p.kcalAdj || 0) + c.kcal));
    if (c.days) { p.days = c.days; S.settings.pos = 0; }
    if (c.deload) S.deloadUntil = Date.now() + 7 * 864e5;
  });
  S.checkins = [...(S.checkins || []), {...rec, changes}];
}
function checkinResult(){
  const r = UI.ciResult;
  return `<div class="tag">Coach's verdict</div><h3>Your 2-week review</h3>
    <ol class="howto" style="margin-top:12px">${r.notes.map(n => `<li>${n}</li>`).join('')}</ol>
    ${r.changes.length ? `<button class="btn pri wide" style="margin-top:12px" data-a="ciapply">Apply ${r.changes.length} change${r.changes.length > 1 ? 's' : ''}</button><button class="btn wide ghost" data-a="ciskip">Keep things as they are</button>` : `<button class="btn pri wide" style="margin-top:12px" data-a="ciapply">Done</button>`}`;
}

// ---------- programs screen ----------
function programsView(){
  const st = programState();
  return `<div class="tag">Programs</div><h3>Structured plans</h3>
    <p class="sm mut">Multi-week blocks: each week is Base → Build → Push → Deload, and sets and effort change automatically. Starting one replaces your "Up next" until it's done.</p>
    ${st && !st.finished ? `<div class="card hero"><div class="tag">Active · week ${st.week + 1} of ${st.P.weeks} · ${st.phase.n}</div><div style="font-weight:900;font-size:18px;margin-top:4px">${st.P.ic} ${esc(st.P.n)}</div>
      <div class="bar"><i style="width:${st.pct}%"></i></div><button class="btn wide s danger" style="margin-top:10px" data-a="progstop">Stop program</button></div>` : ''}
    ${PROGRAMS.map(P => `<div class="card"><div class="row"><span style="font-size:26px">${P.ic}</span><div class="sp"><div style="font-weight:900">${esc(P.n)}</div><div class="sm mut">${P.weeks} weeks · ${P.days.length} days/week</div></div></div>
      <div class="sm mut" style="margin-top:6px">${esc(P.d)}</div>
      <div class="sm" style="margin-top:6px">${P.days.map(id => esc(wById(id)?.n || id)).join(' · ')}</div>
      ${S.program?.id === P.id ? '' : `<button class="btn wide s" style="margin-top:10px" data-a="progstart" data-id="${P.id}">Start this program</button>`}</div>`).join('')}`;
}
