// Coach: goal-based programming, nutrition targets and body assessments. Rule-based, no AI.
const GOALS = {
  lean:     {n:'Lean & toned', ic:'✨', d:'Look defined: keep or build muscle while losing some fat.', main:'8-12', acc:'12-15', mainRest:90,  accRest:45, fin:true,  kcal:-0.15, prot:2.0, steps:10000},
  fat:      {n:'Lose fat',     ic:'🔥', d:'Drop body fat steadily without losing strength.',            main:'8-12', acc:'12-15', mainRest:75,  accRest:45, fin:true,  kcal:-0.20, prot:2.2, steps:10000},
  muscle:   {n:'Build muscle', ic:'💪', d:'Add size: bigger, fuller muscles.',                          main:'6-10', acc:'10-15', mainRest:150, accRest:75, fin:false, kcal:0.10,  prot:1.8, steps:7000},
  strength: {n:'Get stronger', ic:'🏋️', d:'Lift heavier on squat, bench, deadlift and press.',          main:'3-6',  acc:'6-10',  mainRest:210, accRest:90, fin:false, kcal:0.05,  prot:1.8, steps:7000},
  athletic: {n:'Fit & athletic', ic:'⚡', d:'Strength, conditioning and skills. Move and feel great.',   main:'5-8',  acc:'8-12',  mainRest:120, accRest:60, fin:true,  kcal:0,     prot:1.6, steps:9000},
};
const FOCUS = {balanced:'Balanced', lower:'Glutes & legs', upper:'Upper body & arms'};
const LEVELS = {new:'New (under 1 year)', mid:'Intermediate (1–3 years)', adv:'Advanced (3+ years)'};
// Weekly plans by goal and days per week (workout ids from data.js).
const PLANS = {
  lean:     {2:['fb-lean','fb-metcon'], 3:['fb-lean','glutes-a','upper-tone'], 4:['upper-tone','glutes-a','upper-ss','legs-vol'], 5:['upper-tone','glutes-a','fb-metcon','upper-ss','glutes-b'], 6:['upper-tone','glutes-a','cardio-hiit','upper-ss','glutes-b','cardio-z2']},
  fat:      {2:['fb-lean','fb-metcon'], 3:['fb-lean','fb-metcon','fb-machine'], 4:['upper-tone','legs-vol','fb-metcon','glutes-a'], 5:['upper-tone','legs-vol','cardio-hiit','upper-ss','glutes-b'], 6:['upper-tone','legs-vol','cardio-hiit','upper-ss','glutes-b','cardio-z2']},
  muscle:   {2:['fb-a','fb-b'], 3:['push-a','pull-a','legs-q'], 4:['upper-a','lower-a','upper-b','legs-p'], 5:['upper-a','lower-a','push-b','pull-b','legs-vol'], 6:['push-a','pull-a','legs-q','push-b','pull-b','legs-p']},
  strength: {2:['fb-a','fb-b'], 3:['fb-strength','fb-a','fb-b'], 4:['upper-a','lower-a','push-c','pull-c'], 5:['upper-a','lower-a','push-c','pull-c','legs-power'], 6:['push-c','pull-c','lower-a','upper-a','hybrid','legs-power']},
  athletic: {2:['fb-a','fb-metcon'], 3:['fb-a','cali-full','legs-power'], 4:['upper-a','legs-power','cali-full','fb-metcon'], 5:['upper-a','legs-power','cali-pull','cali-push','fb-metcon'], 6:['upper-a','legs-power','cali-pull','cali-push','fb-metcon','cardio-z2']},
};
const FOCUS_SWAP = {
  upper: {'glutes-a':'upper-b', 'glutes-b':'arms-tone', 'legs-vol':'chest-back', 'legs-p':'shoulders-b', 'legs-q':'upper-b'},
  lower: {'upper-ss':'legs-uni', 'push-b':'glutes-a', 'upper-b':'glutes-b'},
  balanced: {'glutes-a':'legs-p', 'glutes-b':'legs-uni'},
};
const COMPOUND = ['squat','hinge','hpush','vpush','hpull','vpull','dip','lunge','glute'];

function planSeq(){
  const p = S.profile;
  if (!p || S.settings.split !== 'coach') return (SPLITS[S.settings.split] || SPLITS.ul_ppl).seq;
  const base = PLANS[p.goal][Math.min(6, Math.max(2, p.days))], swap = FOCUS_SWAP[p.focus] || {};
  // swap toward the focus, but never schedule the same session twice
  const out = [];
  base.forEach(id => out.push(swap[id] && !base.includes(swap[id]) && !out.includes(swap[id]) ? swap[id] : id));
  return out;
}

// Re-prescribe reps/rest for the goal. Bodyweight, skill, cardio and travel sessions keep their design.
function applyGoal(w, list){
  const p = S.profile; if (!p || ['Calisthenics','Travel','Cardio','Core'].includes(w.cat)) return list;
  const g = GOALS[p.goal];
  return list.map(([id, s, r, rest], i) => {
    const x = exById(id); if (x.t !== 'w') return [id, s, r, rest];
    const main = i < 2 && COMPOUND.includes(x.p);
    const uni = /\/(leg|arm|side)/.exec(r)?.[0] || '';
    let sets = p.level === 'new' ? Math.min(s, 3) : p.level === 'adv' && main ? Math.max(s, 4) : s;
    return [id, sets, (main ? g.main : g.acc) + uni, main ? g.mainRest : g.accRest];
  });
}
const FINISHER = () => wById('cardio-fin').ex.map(x => [...x]);

// ---------- numbers ----------
const latestBody = () => [...(S.body || [])].sort((a, b) => b.t - a.t)[0];
// most recent non-empty value for one measurement (a weigh-in without a scan keeps the last body-fat %)
const latestVal = k => +([...(S.body || [])].sort((a, b) => b.t - a.t).find(b => +b[k]) || {})[k] || 0;
function coachNumbers(){
  const p = S.profile, g = GOALS[p.goal];
  const kg = latestVal('kg') || +p.kg, bf = latestVal('bf'), h = p.cm / 100, bmi = kg / (h * h);
  const lbm = bf ? kg * (1 - bf / 100) : null;
  const bmr = lbm ? 370 + 21.6 * lbm : 10 * kg + 6.25 * p.cm - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * ({2:1.4, 3:1.45, 4:1.55, 5:1.6, 6:1.7}[p.days] || 1.55);
  let adj = g.kcal; if (bmi < 18.5 && adj < 0) adj = 0;
  const kcal = Math.round((tdee * (1 + adj) + (p.kcalAdj || 0)) / 50) * 50;
  const protKg = bmi > 30 && !lbm ? 25 * h * h : kg;
  const protein = Math.round(protKg * g.prot / 5) * 5, fat = Math.round(kcal * 0.27 / 9 / 5) * 5;
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
  return {kg, bf, bmi, lbm, ffmi: lbm ? lbm / (h * h) : null, bmr:Math.round(bmr), tdee:Math.round(tdee / 50) * 50, kcal, protein, fat, carbs, water:(kg * 0.035).toFixed(1)};
}
function bmiLabel(b){ return b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy range' : b < 30 ? 'Above range' : 'Well above range'; }
function bfLabel(bf, sex){
  const t = sex === 'm' ? [6, 14, 18, 25] : [14, 21, 25, 32];
  return bf < t[0] ? 'Very lean' : bf < t[1] ? 'Athletic' : bf < t[2] ? 'Fit' : bf < t[3] ? 'Average' : 'Above average';
}
function rateText(p, n){
  const lo = (n.kg * 0.005).toFixed(1), hi = (n.kg * 0.01).toFixed(1);
  if (p.goal === 'fat' || p.goal === 'lean') return `Aim to lose <b>${lo}–${hi} kg per week</b> (0.5–1% of body weight). Faster than that and you start losing muscle.`;
  if (p.goal === 'muscle') return `Aim to gain <b>${(n.kg * 0.0025).toFixed(2)}–${lo} kg per week</b>. Faster gains are mostly fat. Expect visible change in 8–12 weeks.`;
  if (p.goal === 'strength') return `Keep body weight roughly stable (±0.5 kg) and watch your main lifts climb week to week.`;
  return `Keep body weight roughly stable and track performance: reps, loads, and how you feel in conditioning work.`;
}
const COACH_TIPS = {
  lean: ['"Toned" means building muscle and losing fat. Lift weights where the last 2 reps are genuinely hard; light weights for endless reps won\'t change your shape.',
         'A modest deficit (~15%) keeps your strength up. Crash diets cost muscle and rebound.',
         'Get 30–40 g of protein at each meal. It keeps you full and protects muscle.',
         'Daily steps burn more than extra HIIT. Use finishers 2× a week, not every day.'],
  fat:  ['Your calorie deficit drives fat loss; lifting makes sure what you lose is fat, not muscle.',
         'Weigh yourself 3–7 mornings a week and judge the weekly average, not single days.',
         'Keep training heavy. If your strength drops fast, eat ~150 kcal more.',
         'Every 8–12 weeks, take 1–2 weeks at maintenance calories to reset.'],
  muscle: ['Progressive overload is everything: when you hit the top of the rep range on all sets, add weight. The app tells you when.',
           'Aim for 10–20 hard sets per muscle per week, finishing most sets 1–2 reps short of failure.',
           'A small surplus is enough. Eating a lot more just adds fat.',
           'Sleep 7–9 hours. Muscle is built while you recover, not in the gym.'],
  strength: ['Main lifts: 3–6 reps at about 2 reps in reserve, with 3+ minutes of rest. Quality over fatigue.',
             'Treat technique as a skill: same setup, same bar path, every single rep.',
             'Deload every 4–6 weeks: same weights, half the sets.',
             'Accessories build the muscle that moves the big lifts. Don\'t skip them.'],
  athletic: ['Mix heavy strength (low reps) with conditioning and skill work each week.',
             'Train power first in a session (jumps, explosive pulls), while you are fresh.',
             'Put your calisthenics skills on top of your workouts 2–3× a week. Pin them in Skills.',
             'Zone 2 cardio (conversational pace) builds the engine that makes everything else easier.'],
};
const LEVEL_TIPS = {
  new: 'For your first 2–3 weeks, leave 2–3 reps in the tank on every set and focus on form. Strength will climb fast, so log everything.',
  mid: 'Push most working sets to 1–2 reps from failure. Small, consistent jumps in weight are the goal.',
  adv: 'Use RPE and plan 4–6 week blocks: build volume, then intensity, then deload. Progress is slower, so trust the log.',
};

// ---------- onboarding ----------
function onboarding(){
  const d = UI.obd, st = UI.ob || 0;
  const dots = `<div class="obdots">${[0,1,2,3,4].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`;
  const nav = (ok, label = 'Next') => `<div class="row" style="margin-top:22px">${st ? `<button class="btn" data-a="obback">‹ Back</button>` : ''}<button class="btn pri sp" data-a="obnext" ${ok ? '' : 'disabled style="opacity:.4"'}>${label}</button></div>`;
  const choice = (key, opts) => `<div class="obopts">${Object.entries(opts).map(([k, v]) => `<button class="obopt ${d[key] === k ? 'on' : ''}" data-a="obset" data-k="${key}" data-v="${k}">${v}</button>`).join('')}</div>`;
  if (st === 0) return `${dots}<h1>What's your <em>goal?</em></h1><p class="mut" style="margin-top:-8px">I'll build your program, sets, reps and rest times around this.</p>
    <div class="obopts">${Object.entries(GOALS).map(([k, g]) => `<button class="obopt big ${d.goal === k ? 'on' : ''}" data-a="obset" data-k="goal" data-v="${k}"><span class="ti">${g.ic}</span><span><b>${g.n}</b><span class="sm mut">${g.d}</span></span></button>`).join('')}</div>${nav(d.goal)}`;
  if (st === 1) return `${dots}<h1>Any <em>priority?</em></h1><p class="mut" style="margin-top:-8px">I'll put more of your weekly volume where you want to see change.</p>${choice('focus', FOCUS)}${nav(d.focus)}`;
  if (st === 2) return `${dots}<h1>About <em>you</em></h1><p class="mut" style="margin-top:-8px">Used to work out your calories and protein. Stays on your phone.</p>
    <div class="field"><label>Sex (for calorie formulas)</label>${choice('sex', {f:'Female', m:'Male'})}</div>
    <div class="row"><div class="field sp"><label>Age</label><input inputmode="numeric" data-ob="age" value="${esc(d.age || '')}" placeholder="30"></div>
    <div class="field sp"><label>Height (cm)</label><input inputmode="numeric" data-ob="cm" value="${esc(d.cm || '')}" placeholder="170"></div>
    <div class="field sp"><label>Weight (kg)</label><input inputmode="decimal" data-ob="kg" value="${esc(d.kg || '')}" placeholder="65"></div></div>${nav(true)}`;
  if (st === 3) return `${dots}<h1>Your <em>training</em></h1>
    <div class="field"><label>Experience</label>${choice('level', LEVELS)}</div>
    <div class="field"><label>Days per week</label>${choice('days', {2:'2', 3:'3', 4:'4', 5:'5', 6:'6'})}</div>
    <div class="field"><label>Usual session length</label>${choice('mins', {30:'30 min', 45:'45 min', 60:'60 min', 75:'75+'})}</div>${nav(d.level && d.days && d.mins)}`;
  return `${dots}<h1>Gym <em>assessment</em></h1><p class="mut" style="margin-top:-8px">Optional. If your gym did a body scan (InBody, Tanita, Evolt…), copy the numbers here. Body fat % makes your calorie target much more accurate.</p>
    <div class="row"><div class="field sp"><label>Body fat %</label><input inputmode="decimal" data-ob="bf" value="${esc(d.bf || '')}" placeholder="—"></div>
    <div class="field sp"><label>Muscle mass (kg)</label><input inputmode="decimal" data-ob="smm" value="${esc(d.smm || '')}" placeholder="—"></div>
    <div class="field sp"><label>Waist (cm)</label><input inputmode="decimal" data-ob="waist" value="${esc(d.waist || '')}" placeholder="—"></div></div>
    ${nav(true, 'Build my plan ▶')}`;
}
function finishOnboarding(){
  const d = UI.obd, num = v => +String(v || '').replace(',', '.') || 0;
  const prev = S.profile || {};
  S.profile = {goal:d.goal, focus:d.focus, sex:d.sex, age:num(d.age), cm:num(d.cm), kg:num(d.kg), level:d.level, days:+d.days, mins:+d.mins, since:prev.since || Date.now(), kcalAdj:prev.goal === d.goal ? prev.kcalAdj || 0 : 0};
  S.body = S.body || [];
  const today = new Date().toDateString(), entry = {t:Date.now(), kg:num(d.kg), bf:num(d.bf), smm:num(d.smm), waist:num(d.waist)};
  const i = S.body.findIndex(b => new Date(b.t).toDateString() === today); if (i >= 0) S.body[i] = entry; else S.body.push(entry);
  S.settings.split = 'coach'; S.settings.pos = 0; UI.tmins = S.profile.mins === 75 ? 0 : S.profile.mins;
  UI.editing = false; save(); UI.modal = 'coach'; render();
}

// ---------- coach screen ----------
function coachView(){
  const p = S.profile, g = GOALS[p.goal], n = coachNumbers(), seq = planSeq();
  const days = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6'];
  const warn = n.bmi < 18.5 && (p.goal === 'fat' || p.goal === 'lean') ? `<div class="hint" style="margin-bottom:10px">⚠️ By BMI you're already lean, so I've set your calories to <b>maintenance</b>, not a deficit. Consider <b>Build muscle</b> to change your shape.</div>` : '';
  return `<div class="tag">Your coach plan</div><h3>${g.ic} ${g.n}</h3>
    <div class="sm mut">${FOCUS[p.focus]} · ${p.days} days/week · ${p.mins === 75 ? '75+' : p.mins} min · ${LEVELS[p.level].split(' (')[0]}</div>
    ${warn}
    <h2>Daily targets</h2>
    <div class="row"><div class="stat"><b>${n.kcal}</b><span class="sm mut">kcal / day</span></div><div class="stat"><b>${n.protein}g</b><span class="sm mut">protein</span></div></div>
    <div class="row" style="margin-top:10px"><div class="stat"><b>${n.carbs}g</b><span class="sm mut">carbs</span></div><div class="stat"><b>${n.fat}g</b><span class="sm mut">fat</span></div><div class="stat"><b>${(g.steps / 1000).toFixed(0)}k</b><span class="sm mut">steps</span></div></div>
    ${p.kcalAdj ? `<div class="sm acc" style="margin-top:8px">Includes your check-in adjustment: ${p.kcalAdj > 0 ? '+' : ''}${p.kcalAdj} kcal</div>` : ''}
    <div class="sm mut" style="margin-top:8px">Maintenance ≈ ${n.tdee} kcal${n.lbm ? ' (calculated from your lean mass)' : ''}. Water ≈ ${n.water} L/day. Sleep 7–9 h.</div>
    <h2>Your body</h2>
    <div class="card"><div class="row"><span class="sp">BMI</span><b>${n.bmi.toFixed(1)}</b><span class="pill">${bmiLabel(n.bmi)}</span></div>
    ${n.bf ? `<div class="row" style="margin-top:8px"><span class="sp">Body fat</span><b>${n.bf}%</b><span class="pill a">${bfLabel(n.bf, p.sex)}</span></div>
      <div class="row" style="margin-top:8px"><span class="sp">Lean mass</span><b>${n.lbm.toFixed(1)} kg</b><span class="pill">FFMI ${n.ffmi.toFixed(1)}</span></div>` :
      `<div class="sm mut" style="margin-top:8px">BMI can't tell muscle from fat. Add a gym body-scan in <b>Progress</b> for a sharper plan.</div>`}</div>
    <div class="hint">${rateText(p, n)}</div>
    <h2>How you'll train</h2>
    <div class="card sm">
      <div>🎯 Main lifts: <b>${g.main} reps</b>, rest ${fmtT(g.mainRest)}</div>
      <div style="margin-top:6px">🧩 Accessories: <b>${g.acc} reps</b>, rest ${fmtT(g.accRest)}</div>
      <div style="margin-top:6px">📈 Progression: hit the top of the range on every set → add weight next time</div>
      ${g.fin ? '<div style="margin-top:6px">🔥 Finishers: 10-min conditioning after 2 sessions a week</div>' : ''}
      <div style="margin-top:6px">🧘 Deload every 5–6 weeks (half the sets)</div></div>
    <h2>Your week</h2>
    ${seq.map((id, i) => { const w = wById(id); return w ? `<button class="card tap wcard" data-a="preview" data-id="${w.id}"><span class="num">${i + 1}</span><div class="sp"><div style="font-weight:900">${esc(w.n)}</div><div class="sm mut">${days[i]} · ${esc(w.cat)}</div></div><span class="chev">›</span></button>` : ''; }).join('')}
    <div class="sm mut">Rest or walk on the other days. Train in this order and the app moves you to the next day automatically.</div>
    <h2>Coach's notes</h2>
    <ol class="howto">${[...COACH_TIPS[p.goal], LEVEL_TIPS[p.level]].map(t => `<li>${t}</li>`).join('')}</ol>
    <p class="sm mut">General fitness guidance, not medical advice. If you have an injury, condition or are pregnant, check with a doctor or physio first.</p>
    <div class="row" style="margin-top:6px"><button class="btn sp" data-a="checkin">🗓️ Check-in</button><button class="btn sp" data-a="programs">📅 Programs</button></div>
    <button class="btn wide" style="margin-top:8px" data-a="editprofile">✏️ Change goal or details</button>`;
}

// ---------- body assessments ----------
function bodySection(){
  const B = [...(S.body || [])].sort((a, b) => a.t - b.t);
  const first = B[0], last = B[B.length - 1];
  const delta = (k, unit) => first && last && first !== last && +first[k] && +last[k] ? ` <span class="${(last[k] - first[k]) > 0 ? 'pink' : 'acc'} sm">${last[k] - first[k] > 0 ? '+' : ''}${(last[k] - first[k]).toFixed(1)}${unit}</span>` : '';
  const pts = B.filter(b => +b.kg), W = 300, H = 70;
  let spark = '';
  if (pts.length > 1) { const vs = pts.map(b => +b.kg), mn = Math.min(...vs), mx = Math.max(...vs), rg = mx - mn || 1;
    spark = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:10px"><polyline fill="none" stroke="#c6ff00" stroke-width="3" points="${pts.map((b, i) => `${8 + i * (W - 16) / (pts.length - 1)},${H - 8 - (b.kg - mn) / rg * (H - 16)}`).join(' ')}"/></svg>`; }
  return `<h2>Body</h2>
    <div class="card">${last ? `<div class="row"><div class="sp"><div class="tag">Weight</div><b style="font-size:22px">${last.kg || '—'} kg</b>${delta('kg', 'kg')}</div>
      <div class="sp"><div class="tag">Body fat</div><b style="font-size:22px">${latestVal('bf') ? latestVal('bf') + '%' : '—'}</b></div>
      <div class="sp"><div class="tag">Muscle</div><b style="font-size:22px">${latestVal('smm') ? latestVal('smm') + 'kg' : '—'}</b></div></div>${spark}` : '<div class="mut sm">No measurements yet.</div>'}
      <button class="btn wide s" style="margin-top:12px" data-a="addbody">＋ Add weigh-in / gym assessment</button></div>`;
}
function bodyForm(){
  const l = latestBody() || {};
  return `<h3>New measurement</h3><p class="sm mut">Weigh in the morning, after the bathroom, before eating. Copy any body-scan numbers from your gym.</p>
    <div class="row"><div class="field sp"><label>Weight (kg)</label><input inputmode="decimal" id="b_kg" placeholder="${l.kg || ''}"></div><div class="field sp"><label>Body fat %</label><input inputmode="decimal" id="b_bf" placeholder="${l.bf || '—'}"></div></div>
    <div class="row"><div class="field sp"><label>Muscle mass (kg)</label><input inputmode="decimal" id="b_smm" placeholder="${l.smm || '—'}"></div><div class="field sp"><label>Waist (cm)</label><input inputmode="decimal" id="b_waist" placeholder="${l.waist || '—'}"></div></div>
    <button class="btn pri wide" data-a="savebody">Save</button>
    ${(S.body || []).length ? `<h2>History</h2>${[...S.body].sort((a, b) => b.t - a.t).map(b => `<div class="exl"><span class="sp">${fmtDate(b.t)}</span><span class="sm">${[b.kg && b.kg + 'kg', b.bf && b.bf + '%', b.smm && b.smm + 'kg muscle', b.waist && b.waist + 'cm'].filter(Boolean).join(' · ')}</span><button class="danger" data-a="delbody" data-t="${b.t}">✕</button></div>`).join('')}` : ''}`;
}
