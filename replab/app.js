// Rep Lab — offline personal trainer. No AI, no server: everything lives in localStorage.
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS = ['Legs','Push','Pull','Upper','Arms','Full Body','Calisthenics','Travel'];
const PATTERNS = {squat:'Squat',lunge:'Lunge',quad:'Quads',hinge:'Hinge',glute:'Glutes',ham:'Hamstrings',lowback:'Lower back',calf:'Calves',hpush:'Horizontal push',chestiso:'Chest isolation',vpush:'Vertical push',dip:'Dips',latraise:'Side delts',vpull:'Vertical pull',hpull:'Rows',latiso:'Lat isolation',scap:'Scapula',reardelt:'Rear delts',traps:'Traps',grip:'Grip / carry',biceps:'Biceps',triceps:'Triceps',core:'Core',corehold:'Core holds',cardio:'Conditioning',skill:'Skill',other:'Custom'};
const EXMAP = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// ---------- state ----------
const KEY = 'replab.v1';
const DEFAULT_SETTINGS = {split:'ul_ppl', pos:0, rest:90, inc:2.5};
function defaults(){ return {history:[], workouts:[], exercises:[], skills:{}, pinned:[], settings:{...DEFAULT_SETTINGS}, active:null}; }
function load(){
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { const d = defaults(); return {...d, ...s, settings:{...d.settings, ...s.settings}}; } } catch(e) {}
  return defaults();
}
let S = load();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) { toast('⚠️ Could not save'); } }
if (navigator.storage?.persist) navigator.storage.persist();

const UI = {tab:'train', cat:'All', modal:null, showActive:true, q:'', pick:null, P:null, E:null, hid:null, prog:null, skill:null, summary:null, menu:null};

// ---------- helpers ----------
function exById(id){
  if (id.startsWith('sk:')) {
    const [, sid, i] = id.split(':'); const sk = SKILLS.find(x => x.id === sid); const st = sk?.steps[+i];
    if (st) return {id, n:st[0], p:'skill', e:'bar', t:st[1], m:`${sk.n} · step ${+i+1}`, skill:sid};
  }
  return EXMAP[id] || S.exercises.find(e => e.id === id) || {id, n:id, p:'other', e:'bw', t:'w', m:''};
}
const demoKey = x => DEMO_MAP[x.id] || (x.skill ? DEMO_MAP[x.n] : null);
const thumb = (x, size = 56) => { const k = demoKey(x); return k ? `<img class="thumb" style="width:${size}px;height:${size}px" src="img/${k}-1.jpg" alt="" loading="lazy">` : `<span class="thumb ph" style="width:${size}px;height:${size}px">${x.skill ? '⭐' : '💪'}</span>`; };
const allWorkouts = () => [...S.workouts, ...WORKOUTS];
const wById = id => allWorkouts().find(w => w.id === id);
const estMin = list => Math.round(list.reduce((t, [, s, , r]) => t + s * (45 + (+r || 60)) + 60, 0) / 60);
function trim(list, mins){
  if (!mins) return list.map(x => [...x]);
  const out = []; let t = 0;
  for (const [id, s0, reps, rest] of list) {
    let s = s0, c = s * (45 + rest) + 60;
    while (out.length >= 3 && s > 2 && t + c > mins * 60) { s--; c = s * (45 + rest) + 60; }
    if (out.length >= 3 && t + c > mins * 60) break;
    out.push([id, s, reps, rest]); t += c;
  }
  return out;
}
function alternatives(id, travel){
  const x = exById(id);
  return EXERCISES.filter(e => e.p === x.p && e.id !== id && (!travel || e.e === 'bw'));
}
function range(reps){
  const m = /(\d+)\s*-\s*(\d+)/.exec(reps || ''); if (m) return [+m[1], +m[2]];
  const n = /(\d+)/.exec(reps || ''); return n ? [+n[1], +n[1]] : [0, 0];
}
const parseTarget = t => { const m = /^(\d+)×(.+)$/.exec(t); return m ? [+m[1], m[2]] : [1, t]; };
const fmtT = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const fmtDur = ms => { const m = Math.round(ms/60000); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
const e1rm = (kg, r) => kg * (1 + r / 30);
const platform = u => /tiktok/.test(u) ? ['TikTok','🎵'] : /instagram/.test(u) ? ['Instagram','📸'] : /youtu/.test(u) ? ['YouTube','▶️'] : ['Link','🔗'];
function incFor(x){ return x.e === 'db' ? 2 : (x.e === 'bb' && ['squat','hinge','glute'].includes(x.p)) ? 5 : +S.settings.inc || 2.5; }

function lastSets(id){
  for (let i = S.history.length - 1; i >= 0; i--) { const e = S.history[i].ex.find(x => x.id === id); if (e?.sets.length) return e.sets; }
  return null;
}
// Double progression: hit the top of the rep range on every set → add weight, otherwise add a rep.
function suggest(e){
  const x = exById(e.id), last = lastSets(e.id); if (!last) return null;
  const [lo, hi] = range(e.reps);
  const nums = last.map(s => ({kg:+s.kg || 0, r:+s.r || 0}));
  const top = Math.max(...nums.map(s => s.kg));
  const minR = Math.min(...nums.filter(s => s.kg === top).map(s => s.r));
  const best = Math.max(...nums.map(s => s.r));
  if (x.t === 's') return {kg:top || '', r:best + 5, msg:`Hold <b>${best + 5}s</b> today`};
  if (!hi) return {kg:top || '', r:best, msg:`Match or beat <b>${top ? top + 'kg × ' : ''}${best}</b>`};
  if (x.t === 'w') {
    if (minR >= hi) { const k = +(top + incFor(x)).toFixed(2); return {kg:k, r:lo, msg:`🔥 Level up: <b>${k}kg × ${lo}</b>`}; }
    const r = Math.min(hi, minR + 1); return {kg:top, r, msg:`Beat it: <b>${top}kg × ${r}</b>`};
  }
  if (minR >= hi) return {kg:top ? top + 2.5 : '', r:lo, msg: top ? `🔥 Add weight: <b>+${top + 2.5}kg × ${lo}</b>` : `🔥 Top of range hit. <b>Add 2.5kg or go harder</b>`};
  const r = Math.min(hi, minR + 1); return {kg:top || '', r, msg:`Aim for <b>${r} reps</b>`};
}

function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
function beep(){
  try {
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    [0, .25, .5].forEach(d => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(.3, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + d + .2); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + .2); });
  } catch(e) {}
  navigator.vibrate?.([200, 100, 200]);
}

// ---------- views ----------
function tabbar(){
  const tabs = [['train','🏋️','Train'],['skills','⭐','Skills'],['videos','🎬','Videos'],['history','📈','Progress']];
  return `<nav class="tabbar">${tabs.map(([k, i, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><span class="i">${i}</span>${l}</button>`).join('')}</nav>`;
}
function resumeBar(){
  if (!S.active || UI.showActive) return '';
  return `<button class="resume" data-a="resume">▶ <span class="sp" style="text-align:left">${esc(S.active.name)}</span><span class="timer" style="color:inherit;font-size:18px" data-elapsed>${fmtT((Date.now() - S.active.start) / 1000)}</span></button>`;
}
function wCard(w){
  const pl = w.v ? platform(w.v) : null;
  return `<div class="card tap" data-a="preview" data-id="${w.id}">
    <div class="row"><span class="tag">${esc(w.cat)}${w.custom ? ' · mine' : ''}</span><span class="sp"></span>${pl ? `<span class="pill p">${pl[1]} ${pl[0]}</span>` : ''}<span class="pill">~${estMin(w.ex)} min</span></div>
    <h3 style="margin-top:6px">${esc(w.n)}</h3>
    <div class="mut sm" style="margin-top:4px">${w.ex.length} exercises · ${esc(w.ex.slice(0, 3).map(e => exById(e[0]).n).join(', '))}…</div></div>`;
}
const VIEWS = {
  train(){
    const sp = SPLITS[S.settings.split], nextId = sp.seq[S.settings.pos % sp.seq.length], next = wById(nextId);
    const day = (S.settings.pos % sp.seq.length) + 1;
    let list = allWorkouts();
    if (UI.cat === 'Mine') list = S.workouts; else if (UI.cat !== 'All') list = list.filter(w => w.cat === UI.cat);
    return `<div class="row"><h1>Let's <em>train</em></h1><span class="sp"></span><button class="ib" data-a="settings">⚙️</button></div>
      ${next ? `<div class="card hero tap" data-a="preview" data-id="${next.id}">
        <div class="tag">Up next · Day ${day}/${sp.seq.length} · ${esc(sp.n)}</div>
        <h3 style="font-size:28px;margin:6px 0">${esc(next.n)}</h3>
        <div class="mut sm">${esc(next.d || '')}</div>
        <div class="row" style="margin-top:14px"><button class="btn pri sp" data-a="quickstart" data-id="${next.id}">Start ▶</button><button class="btn" data-a="skipday">Skip</button></div></div>` : ''}
      <h2>Workout library</h2>
      <div class="chips">${['All', ...CATS, 'Mine'].map(c => `<button class="chip ${UI.cat === c ? 'on' : ''}" data-a="cat" data-v="${c}">${c === 'Travel' ? '✈️ ' : ''}${c}</button>`).join('')}</div>
      ${UI.cat === 'Mine' || UI.cat === 'All' ? `<button class="btn wide" style="margin-bottom:12px" data-a="newworkout">＋ Build your own workout</button>` : ''}
      ${UI.cat === 'Travel' ? `<div class="hint" style="margin-bottom:12px">✈️ No equipment needed. Hit <b>Shuffle</b> on any workout for a fresh mix.</div>` : ''}
      ${list.map(wCard).join('') || `<div class="empty"><div class="big">🧱</div>No workouts here yet.</div>`}`;
  },
  skills(){
    return `<h1>Skill <em>tree</em></h1>
      <p class="mut" style="margin-top:-8px">Everything starts at zero. Hit the target in a session and you can level up. 📌 Pinned skills get added to every Calisthenics workout.</p>
      ${S.pinned.length ? `<button class="btn pri wide" style="margin-bottom:14px" data-a="skillsession">Train pinned skills ▶</button>` : ''}
      ${SKILLS.map(sk => {
        const lv = S.skills[sk.id] || 0, n = sk.steps.length, st = sk.steps[Math.min(lv, n - 1)];
        return `<div class="card tap" data-a="skill" data-id="${sk.id}">
          <div class="row"><span style="font-size:28px">${sk.ic}</span><div class="sp"><h3>${sk.n}</h3>
          <div class="sm mut">${lv >= n ? '🏆 Mastered' : `Step ${lv + 1}/${n}: <span style="color:var(--txt)">${esc(st[0])}</span> · ${esc(st[2])}`}</div></div>
          ${S.pinned.includes(sk.id) ? '<span class="pill a">📌</span>' : ''}</div>
          <div class="bar"><i style="width:${Math.round(lv / n * 100)}%"></i></div></div>`;
      }).join('')}`;
  },
  videos(){
    const vids = S.workouts.filter(w => w.v);
    return `<h1>Saved <em>videos</em></h1>
      <p class="mut" style="margin-top:-8px">Saw a workout on TikTok or Instagram? Copy the link, paste it here, and add the exercises. You can mix it with any other workout.</p>
      <button class="btn pri wide" style="margin-bottom:16px" data-a="newvideo">＋ Add from TikTok / Instagram</button>
      ${vids.map(w => { const [pn, pi] = platform(w.v); return `<div class="card">
        <div class="row"><span class="pill p">${pi} ${pn}</span><span class="pill">${esc(w.cat)}</span><span class="sp"></span><a class="btn s" href="${esc(w.v)}" target="_blank" rel="noopener">Watch ↗</a></div>
        <h3 style="margin:8px 0 4px">${esc(w.n)}</h3>
        ${w.notes ? `<div class="sm mut">${esc(w.notes)}</div>` : ''}
        <div class="sm mut" style="margin-top:4px">${w.ex.length ? esc(w.ex.map(e => exById(e[0]).n).join(' · ')) : '<span class="pink">No exercises added yet</span>'}</div>
        <div class="row" style="margin-top:12px"><button class="btn pri s sp" data-a="preview" data-id="${w.id}">Open</button><button class="btn s" data-a="mix" data-id="${w.id}">🔀 Mix with…</button><button class="btn s" data-a="edit" data-id="${w.id}">Edit</button></div></div>`; }).join('')
      || `<div class="empty"><div class="big">🎬</div>No saved videos yet.<br><span class="sm">Tip: in TikTok/Instagram tap Share → Copy link.</span></div>`}`;
  },
  history(){
    const now = new Date(), monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const thisWeek = S.history.filter(h => h.start >= monday).length;
    const days = new Set(S.history.map(h => new Date(h.start).toDateString()));
    let streak = 0; for (let w = 0; w < 200; w++) { const a = monday - w * 7 * 864e5, b = a + 7 * 864e5; if (S.history.some(h => h.start >= a && h.start < b)) streak++; else if (w > 0) break; }
    const cal = []; const start = new Date(monday - 21 * 864e5);
    for (let i = 0; i < 28; i++) { const d = new Date(start.getTime() + i * 864e5); cal.push(`<div class="${days.has(d.toDateString()) ? 'on' : ''} ${d.toDateString() === now.toDateString() ? 'today' : ''}"></div>`); }
    const logged = [...new Set(S.history.flatMap(h => h.ex.map(e => e.id)))];
    return `<div class="row"><h1>Your <em>progress</em></h1><span class="sp"></span><button class="ib" data-a="settings">⚙️</button></div>
      <div class="row"><div class="stat"><b>${thisWeek}</b><span class="sm mut">this week</span></div><div class="stat"><b>${streak}</b><span class="sm mut">week streak</span></div><div class="stat"><b>${S.history.length}</b><span class="sm mut">workouts</span></div></div>
      <div class="card" style="margin-top:12px"><div class="row sm mut"><span>Last 4 weeks</span><span class="sp"></span><span>M T W T F S S</span></div><div class="cal">${cal.join('')}</div></div>
      ${logged.length ? `<h2>Exercise progress</h2><div class="chips">${logged.map(id => `<button class="chip" data-a="prog" data-id="${id}">${esc(exById(id).n)}</button>`).join('')}</div>` : ''}
      <h2>History</h2>
      ${[...S.history].reverse().map(h => `<div class="card tap" data-a="hist" data-id="${h.id}">
        <div class="row"><span class="tag">${fmtDate(h.start)}</span><span class="sp"></span><span class="pill">${fmtDur(h.end - h.start)}</span>${h.prs?.length ? `<span class="pill p">🏆 ${h.prs.length} PR</span>` : ''}</div>
        <h3 style="margin-top:6px">${esc(h.name)}</h3>
        <div class="sm mut">${h.ex.length} exercises · ${h.ex.reduce((a, e) => a + e.sets.length, 0)} sets${h.vol ? ` · ${Math.round(h.vol).toLocaleString()} kg` : ''}</div></div>`).join('')
      || `<div class="empty"><div class="big">📈</div>Finish your first workout to see it here.</div>`}`;
  },
};

// ---------- active workout ----------
function activeView(){
  const A = S.active;
  return `<div class="aw"><div class="awh"><div class="row">
      <button class="ib" data-a="minimize">⌄</button>
      <div class="sp" style="min-width:0"><div style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(A.name)}</div><div class="timer" data-elapsed>${fmtT((Date.now() - A.start) / 1000)}</div></div>
      <button class="btn pri s" data-a="finish">Finish</button></div></div>
    ${A.video ? `<a class="btn wide" style="margin-bottom:12px" href="${esc(A.video)}" target="_blank" rel="noopener">${platform(A.video)[1]} Watch the original video ↗</a>` : ''}
    ${A.ex.map((e, i) => exCard(e, i)).join('')}
    <button class="btn wide" data-a="addex">＋ Add exercise</button>
    <button class="btn wide ghost danger" style="margin-top:8px" data-a="discard">Discard workout</button></div>`;
}
function exCard(e, i){
  const x = exById(e.id), sug = suggest(e), last = lastSets(e.id) || [];
  const kgL = x.t === 'w' ? 'KG' : '+KG', rL = x.t === 's' ? 'SEC' : 'REPS';
  const [lo] = range(e.reps);
  return `<div class="card">
    <div class="row"><button class="row sp" style="min-width:0;text-align:left" data-a="form" data-id="${e.id}">${thumb(x, 48)}<h3 style="font-size:18px">${esc(x.n)} <span class="acc sm">ⓘ</span></h3></button>
    <button class="ib" data-a="exmenu" data-i="${i}">⋯</button></div>
    <div class="sm mut">${e.sets.length} × ${esc(e.reps)} · rest ${fmtT(e.rest)}${x.m ? ' · ' + esc(x.m) : ''}</div>
    ${sug ? `<div class="hint">${sug.msg}</div>` : x.skill ? '' : `<div class="hint">First time: pick a weight you can do for <b>${esc(e.reps)}</b> with 1–2 reps left.</div>`}
    <table class="sets"><tr><th>SET</th><th>PREV</th><th>${kgL}</th><th>${rL}</th><th></th></tr>
    ${e.sets.map((s, j) => { const p = last[j];
      return `<tr class="${s.done ? 'done' : ''}"><td class="setn">${j + 1}</td>
      <td class="prev">${p ? `${+p.kg ? p.kg + '×' : ''}${p.r}` : '—'}</td>
      <td><input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="kg" value="${esc(s.kg)}" placeholder="${sug?.kg !== undefined && sug.kg !== '' ? sug.kg : (x.t === 'w' ? '' : 'BW')}"></td>
      <td><input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${sug?.r || lo || ''}"></td>
      <td><button class="chk" data-a="check" data-i="${i}" data-j="${j}">✓</button></td></tr>`; }).join('')}
    </table>
    <div class="row" style="margin-top:8px"><button class="btn s sp" data-a="addset" data-i="${i}">＋ Set</button>${e.sets.length > 1 ? `<button class="btn s" data-a="rmset" data-i="${i}">− Set</button>` : ''}</div></div>`;
}
function mkEx(id, sets, reps, rest){ return {id, reps:String(reps), rest:+rest || S.settings.rest, sets:Array.from({length:+sets || 3}, () => ({kg:'', r:'', done:false}))}; }
function skillEntry(sid){
  const sk = SKILLS.find(s => s.id === sid), lv = Math.min(S.skills[sid] || 0, sk.steps.length - 1);
  const [sets, reps] = parseTarget(sk.steps[lv][2]); return [`sk:${sid}:${lv}`, sets, reps, 90];
}
function startWorkout(w, list){
  if (S.active && !confirm(`You have "${S.active.name}" in progress. Replace it?`)) return;
  let items = list.map(x => [...x]);
  if (w.cat === 'Calisthenics') items = [...S.pinned.map(skillEntry), ...items];
  S.active = {id:uid(), name:w.n, src:w.id, video:w.v || '', start:Date.now(), ex:items.map(x => mkEx(...x))};
  UI.showActive = true; UI.modal = null; save(); render();
}

// ---------- rest timer ----------
let REST = null;
function startRest(sec){ REST = {end:Date.now() + sec * 1000, total:sec, beeped:false}; tickRest(); }
function tickRest(){
  const el = $('#rest');
  if (!REST || !S.active) { el.innerHTML = ''; return; }
  const left = (REST.end - Date.now()) / 1000;
  if (left <= 0 && !REST.beeped) { REST.beeped = true; beep(); }
  if (left < -20) { REST = null; el.innerHTML = ''; return; }
  el.innerHTML = `<div class="restbar ${left <= 0 ? 'over' : ''}"><span>⏱</span><span class="t">${left > 0 ? fmtT(Math.ceil(left)) : 'GO!'}</span><span class="sp sm">${left > 0 ? 'Rest' : 'Next set'}</span>
    <button data-a="rest" data-v="-15">−15</button><button data-a="rest" data-v="15">+15</button><button data-a="rest" data-v="0">✕</button></div>`;
}
setInterval(() => {
  tickRest();
  if (S.active) document.querySelectorAll('[data-elapsed]').forEach(el => el.textContent = fmtT((Date.now() - S.active.start) / 1000));
}, 500);

// ---------- finishing ----------
function finish(){
  const A = S.active;
  const ex = A.ex.map(e => ({id:e.id, reps:e.reps, sets:e.sets.filter(s => s.done).map(s => ({kg:+s.kg || 0, r:+s.r || 0}))})).filter(e => e.sets.length);
  if (!ex.length) { if (confirm('No sets ticked. Discard this workout?')) { S.active = null; REST = null; save(); render(); } return; }
  if (!confirm('Finish workout?')) return;
  const prs = []; let vol = 0;
  for (const e of ex) {
    const x = exById(e.id);
    const prevBest = Math.max(0, ...S.history.flatMap(h => h.ex.filter(y => y.id === e.id).flatMap(y => y.sets.map(s => x.t === 'w' ? e1rm(s.kg, s.r) : s.r + s.kg * 3))));
    const best = Math.max(...e.sets.map(s => x.t === 'w' ? e1rm(s.kg, s.r) : s.r + s.kg * 3));
    if (prevBest > 0 && best > prevBest) prs.push(x.n);
    vol += e.sets.reduce((a, s) => a + s.kg * (x.t === 's' ? 0 : s.r), 0);
  }
  // Skill level-up check: hit the target sets × reps for the current step?
  const levelUps = [];
  for (const e of ex) {
    const x = exById(e.id); if (!x.skill) continue;
    const [, sid, i] = e.id.split(':'); if ((S.skills[sid] || 0) !== +i) continue;
    const sk = SKILLS.find(s => s.id === sid); const [ns, rs] = parseTarget(sk.steps[+i][2]); const [, hi] = range(rs);
    if (hi && e.sets.filter(s => s.r >= hi).length >= ns) levelUps.push(sid);
  }
  const h = {id:A.id, name:A.name, src:A.src, start:A.start, end:Date.now(), ex, vol, prs};
  S.history.push(h);
  const sp = SPLITS[S.settings.split];
  if (A.src === sp.seq[S.settings.pos % sp.seq.length]) S.settings.pos++;
  S.active = null; REST = null; save();
  UI.summary = {h, levelUps}; UI.modal = 'summary'; render();
}

// ---------- modals ----------
const MODALS = {
  preview(){
    const P = UI.P, w = P.w, travel = w.cat === 'Travel';
    const list = trim(P.list, P.mins);
    return `<div class="tag">${esc(w.cat)}</div><h3>${esc(w.n)}</h3><div class="mut sm">${esc(w.d || w.notes || '')}</div>
      ${w.v ? `<a class="btn wide s" style="margin-top:10px" href="${esc(w.v)}" target="_blank" rel="noopener">${platform(w.v)[1]} Watch video ↗</a>` : ''}
      <div class="chips" style="margin-top:14px">${[[30,'30 min'],[45,'45 min'],[60,'60 min'],[0,`Full ~${estMin(P.list)}m`]].map(([m, l]) => `<button class="chip ${P.mins === m ? 'on' : ''}" data-a="mins" data-v="${m}">${l}</button>`).join('')}</div>
      <div>${list.map(([id, s, r, rest], i) => { const x = exById(id), alt = alternatives(id, travel).length;
        return `<div class="exl"><button data-a="form" data-id="${id}">${thumb(x, 44)}</button><div class="sp" style="min-width:0"><button data-a="form" data-id="${id}" style="font-weight:800;text-align:left">${esc(x.n)}</button>
        <div class="sm mut">${s} × ${esc(r)} · rest ${fmtT(rest)}</div></div>${alt ? `<button class="ib" data-a="swap" data-i="${i}">🔁</button>` : ''}</div>`; }).join('')}</div>
      ${w.cat === 'Calisthenics' && S.pinned.length ? `<div class="hint" style="margin-top:10px">📌 Plus your pinned skills: <b>${S.pinned.map(id => SKILLS.find(s => s.id === id).n).join(', ')}</b></div>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn s sp" data-a="shuffle">🎲 Shuffle</button><button class="btn s sp" data-a="customize">✏️ Customize</button>${w.custom ? `<button class="btn s" data-a="edit" data-id="${w.id}">Edit</button>` : ''}</div>
      <button class="btn pri wide" style="margin-top:12px" data-a="start">Start workout ▶</button>`;
  },
  editor(){
    const E = UI.E;
    return `<h3>${E.id ? 'Edit workout' : E.v !== undefined ? 'Add video workout' : 'New workout'}</h3>
      ${E.v !== undefined ? `<div class="field"><label>TikTok / Instagram link</label><div class="row"><input id="f_v" value="${esc(E.v)}" placeholder="https://www.tiktok.com/…" data-ef="v"><button class="btn s" data-a="paste">Paste</button></div></div>` : ''}
      <div class="field"><label>Name</label><input value="${esc(E.n)}" placeholder="e.g. Glute burner from @coach" data-ef="n"></div>
      <div class="field"><label>Category</label><select data-ef="cat">${CATS.map(c => `<option ${E.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Notes</label><textarea rows="2" data-ef="notes" placeholder="Cues, tempo, anything from the video">${esc(E.notes)}</textarea></div>
      <div class="field"><label>Exercises · sets · reps · rest(s)</label>
      ${E.list.map(([id, s, r, rest], i) => `<div class="erow"><span style="font-weight:800;font-size:14px">${esc(exById(id).n)}</span>
        <input inputmode="numeric" value="${s}" data-el="${i}" data-k="1"><input value="${esc(r)}" data-el="${i}" data-k="2"><input inputmode="numeric" value="${rest}" data-el="${i}" data-k="3">
        <button data-a="erm" data-i="${i}" class="danger">✕</button></div>`).join('') || '<div class="mut sm">No exercises yet.</div>'}
      <button class="btn wide s" style="margin-top:10px" data-a="eadd">＋ Add exercise</button></div>
      <button class="btn pri wide" data-a="esave">Save</button>
      ${E.id ? `<button class="btn wide ghost danger" style="margin-top:6px" data-a="edel">Delete workout</button>` : ''}`;
  },
  picker(){
    return `<h3>${UI.pick.mode === 'swap' ? 'Swap exercise' : 'Add exercise'}</h3>
      <input id="pq" placeholder="Search 100+ exercises…" value="${esc(UI.q)}" autocomplete="off">
      <div id="plist" style="margin-top:8px">${pickList()}</div>
      <h2>Not in the list?</h2>
      <div class="card"><div class="field"><input id="cx_n" placeholder="Exercise name (e.g. from the video)"></div>
      <div class="row"><select id="cx_t"><option value="w">Weight × reps</option><option value="r">Bodyweight reps</option><option value="s">Timed (seconds)</option></select>
      <button class="btn s pk" data-a="cxsave">Create</button></div>
      <input id="cx_l" style="margin-top:8px" placeholder="Optional: video link for this exercise"></div>`;
  },
  menu(){
    const i = UI.menu, e = S.active.ex[i], x = exById(e.id);
    return `<h3>${esc(x.n)}</h3>
      <div class="row" style="margin:12px 0"><span class="mut sm sp">Rest between sets</span>${[60,90,120,180].map(r => `<button class="chip ${e.rest === r ? 'on' : ''}" data-a="setrest" data-v="${r}">${fmtT(r)}</button>`).join('')}</div>
      <button class="btn wide" data-a="mswap">🔁 Swap exercise</button>
      <div class="row" style="margin-top:8px"><button class="btn sp" data-a="mmove" data-v="-1">↑ Move up</button><button class="btn sp" data-a="mmove" data-v="1">↓ Move down</button></div>
      <button class="btn wide" style="margin-top:8px" data-a="form" data-id="${e.id}">▶️ How to do it</button>
      <button class="btn wide danger" style="margin-top:8px" data-a="mremove">Remove exercise</button>`;
  },
  summary(){
    const {h, levelUps} = UI.summary;
    return `<div style="text-align:center;padding:10px 0"><div style="font-size:54px">🔥</div><h3 style="font-size:32px">Workout done</h3><div class="mut">${esc(h.name)}</div></div>
      <div class="row"><div class="stat"><b>${fmtDur(h.end - h.start)}</b><span class="sm mut">time</span></div><div class="stat"><b>${h.ex.reduce((a, e) => a + e.sets.length, 0)}</b><span class="sm mut">sets</span></div><div class="stat"><b>${Math.round(h.vol).toLocaleString()}</b><span class="sm mut">kg lifted</span></div></div>
      ${h.prs.length ? `<div class="card" style="margin-top:12px"><div class="pr">🏆 New personal records</div><div class="sm" style="margin-top:4px">${h.prs.map(esc).join(' · ')}</div></div>` : ''}
      ${levelUps.map(sid => { const sk = SKILLS.find(s => s.id === sid); return `<div class="card hero" style="margin-top:12px"><div class="tag">Skill target hit</div><h3>${sk.ic} ${sk.n}</h3><button class="btn pri wide" style="margin-top:10px" data-a="levelup" data-id="${sid}">Level up ⬆</button></div>`; }).join('')}
      <button class="btn wide" style="margin-top:12px" data-a="close">Done</button>`;
  },
  skill(){
    const sk = SKILLS.find(s => s.id === UI.skill), lv = S.skills[sk.id] || 0, pinned = S.pinned.includes(sk.id);
    return `<h3>${sk.ic} ${sk.n}</h3>
      <div>${sk.steps.map(([n, , t], i) => `<div class="step ${i < lv ? 'done' : i === lv ? 'cur' : 'lock'}"><span class="dot">${i < lv ? '✓' : i + 1}</span>
        <div class="sp"><button data-a="form" data-id="sk:${sk.id}:${i}" style="font-weight:800;text-align:left">${esc(n)} <span class="acc sm">ⓘ</span></button><div class="sm mut">Target: ${esc(t)}</div></div></div>`).join('')}</div>
      <button class="btn pri wide" style="margin-top:14px" data-a="trainskill">${S.active ? 'Add current step to workout' : 'Practice now ▶'}</button>
      <div class="row" style="margin-top:8px"><button class="btn sp" data-a="pin">${pinned ? '📌 Unpin' : '📌 Pin to Calisthenics days'}</button></div>
      <div class="row" style="margin-top:8px"><button class="btn sp" data-a="lvl" data-v="-1">← Step back</button><button class="btn sp" data-a="lvl" data-v="1">I've got it →</button></div>`;
  },
  hist(){
    const h = S.history.find(x => x.id === UI.hid);
    return `<div class="tag">${fmtDate(h.start)} · ${fmtDur(h.end - h.start)}</div><h3>${esc(h.name)}</h3>
      ${h.ex.map(e => { const x = exById(e.id); return `<div class="exl"><div class="sp"><b>${esc(x.n)}</b>${h.prs?.includes(x.n) ? ' <span class="pr">🏆</span>' : ''}
        <div class="sm mut">${e.sets.map(s => `${s.kg ? s.kg + 'kg × ' : ''}${s.r}${x.t === 's' ? 's' : ''}`).join(' · ')}</div></div></div>`; }).join('')}
      <div class="row" style="margin-top:14px"><button class="btn sp" data-a="redo">↻ Repeat</button><button class="btn danger" data-a="hdel">Delete</button></div>`;
  },
  prog(){
    const id = UI.prog, x = exById(id);
    const pts = S.history.filter(h => h.ex.some(e => e.id === id)).map(h => { const e = h.ex.find(e => e.id === id);
      return {t:h.start, v:Math.max(...e.sets.map(s => x.t === 'w' ? e1rm(s.kg, s.r) : s.r)), top:e.sets.reduce((a, s) => (s.kg > a.kg || (s.kg === a.kg && s.r > a.r)) ? s : a, {kg:-1, r:0})}; });
    const W = 320, H = 140, vs = pts.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs), rg = mx - mn || 1;
    const xy = pts.map((p, i) => [pts.length > 1 ? 10 + i * (W - 20) / (pts.length - 1) : W / 2, H - 15 - (p.v - mn) / rg * (H - 30)]);
    return `<h3>${esc(x.n)}</h3><div class="mut sm">${x.t === 'w' ? 'Estimated 1-rep max (kg)' : x.t === 's' ? 'Best hold (s)' : 'Best set (reps)'}</div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;margin:14px 0;background:var(--card);border-radius:14px">
        <polyline fill="none" stroke="#c6ff00" stroke-width="3" stroke-linejoin="round" points="${xy.map(p => p.join(',')).join(' ')}"/>
        ${xy.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4" fill="#ff2e88"/>`).join('')}
        <text x="8" y="16" fill="#8b8b8b" font-size="11">${Math.round(mx)}</text><text x="8" y="${H - 4}" fill="#8b8b8b" font-size="11">${Math.round(mn)}</text></svg>
      ${[...pts].reverse().map(p => `<div class="exl"><span class="sp">${fmtDate(p.t)}</span><b>${p.top.kg ? p.top.kg + 'kg × ' : ''}${p.top.r}</b><span class="mut sm">${x.t === 'w' ? '≈' + Math.round(p.v) : ''}</span></div>`).join('')}`;
  },
  form(){
    const x = exById(UI.form), k = demoKey(x), info = k && DEMO_INFO[k];
    const cues = CUES[x.id] || (x.skill && SKILL_CUES[x.skill]) || null;
    return `<div class="tag">${esc(PATTERNS[x.p] || '')}</div><h3>${esc(x.n)}</h3>
      <div class="sm mut" style="margin-bottom:12px">${esc(info ? info.mus.join(', ') : x.m || '')}</div>
      ${k ? `<div class="demo"><img src="img/${k}-0.jpg" alt=""><img class="b" src="img/${k}-1.jpg" alt=""><span class="lbl">START ⇄ FINISH</span></div>` : ''}
      ${cues ? `<h2>${info ? 'Key points' : 'How to do it'}</h2><ol class="howto">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
      ${info ? `<h2>Step by step</h2><ol class="howto">${info.steps.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
      ${!k && !cues ? `<div class="empty"><div class="big">💪</div>No demo for this one yet.</div>` : ''}
      ${x.link ? `<a class="btn wide" style="margin-top:12px" href="${esc(x.link)}" target="_blank" rel="noopener">${platform(x.link)[1]} Watch your saved video ↗</a>` : ''}
      <button class="btn wide" style="margin-top:14px" data-a="formback">${UI.formBack ? '← Back' : 'Close'}</button>`;
  },
  mix(){
    const src = wById(UI.mixId);
    return `<h3>Mix "${esc(src.n)}" with…</h3><div class="mut sm">Combines both into a new workout you can edit.</div>
      ${allWorkouts().filter(w => w.id !== src.id).map(w => `<div class="exl tap" data-a="domix" data-id="${w.id}" style="cursor:pointer"><div class="sp"><b>${esc(w.n)}</b><div class="sm mut">${esc(w.cat)} · ${w.ex.length} ex</div></div><span class="acc">＋</span></div>`).join('')}`;
  },
  settings(){
    const st = S.settings;
    return `<h3>Settings</h3>
      <div class="field"><label>Weekly split (Up next)</label><select data-set="split">${Object.entries(SPLITS).map(([k, v]) => `<option value="${k}" ${st.split === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select></div>
      <div class="field"><label>Default weight jump (kg)</label><input inputmode="decimal" data-set="inc" value="${st.inc}"></div>
      <h2>Backup</h2><p class="sm mut">Your data lives only on this phone. Export a backup now and then (e.g. save to Files or AirDrop it to your Mac).</p>
      <button class="btn wide" data-a="export">⬇ Export backup</button>
      <label class="btn wide" style="margin-top:8px">⬆ Import backup<input type="file" accept="application/json,.json" id="imp" hidden></label>
      <button class="btn wide ghost danger" style="margin-top:16px" data-a="reset">Erase all data</button>`;
  },
};
function pickList(){
  const q = UI.q.trim().toLowerCase();
  let list = [...S.exercises, ...EXERCISES];
  if (UI.pick.mode === 'swap') { const p = exById(UI.pick.from).p; list.sort((a, b) => (b.p === p) - (a.p === p)); }
  if (q) list = list.filter(e => (e.n + ' ' + e.m + ' ' + (PATTERNS[e.p] || '')).toLowerCase().includes(q));
  return list.slice(0, 60).map(e => `<div class="exl" data-a="pickex" data-id="${e.id}" style="cursor:pointer"><div class="sp"><b>${esc(e.n)}</b><div class="sm mut">${esc(PATTERNS[e.p] || '')} · ${esc(e.m || '')}</div></div><span class="acc" style="font-size:22px">＋</span></div>`).join('') || '<div class="mut sm">No match. Create it below 👇</div>';
}

// ---------- render ----------
function render(){
  const aw = $('#overlay .aw')?.scrollTop, sh = $('#modal .sheet')?.scrollTop;
  $('#app').innerHTML = `<main class="view">${VIEWS[UI.tab]()}</main>${resumeBar()}${tabbar()}`;
  $('#overlay').innerHTML = S.active && UI.showActive ? activeView() : '';
  $('#modal').innerHTML = UI.modal ? `<div class="bg" data-a="bgclose"><div class="sheet"><div class="grab"></div>${MODALS[UI.modal]()}</div></div>` : '';
  if (aw && $('#overlay .aw')) $('#overlay .aw').scrollTop = aw;
  if (sh && $('#modal .sheet')) $('#modal .sheet').scrollTop = sh;
  document.body.classList.toggle('lock', !!(UI.modal || (S.active && UI.showActive)));
  tickRest();
}
const open = m => { UI.modal = m; render(); };
const close = () => { UI.modal = null; render(); };
function openPreview(w){ UI.P = {w, list:w.ex.map(x => [...x]), mins:0}; open('preview'); }
function openEditor(base){ UI.E = {id:'', n:'', cat:'Upper', notes:'', list:[], ...JSON.parse(JSON.stringify(base || {}))}; open('editor'); }
function openPicker(mode, from){ UI.pick = {mode, from}; UI.q = ''; open('picker'); }

// ---------- actions ----------
const A = {
  tab: el => { UI.tab = el.dataset.v; window.scrollTo(0, 0); render(); },
  cat: el => { UI.cat = el.dataset.v; render(); },
  preview: el => openPreview(wById(el.dataset.id)),
  quickstart: el => { const w = wById(el.dataset.id); startWorkout(w, w.ex); },
  skipday: () => { S.settings.pos++; save(); render(); },
  mins: el => { UI.P.mins = +el.dataset.v; render(); },
  swap: el => {
    const P = UI.P, i = +el.dataset.i, id = P.list[i][0], travel = P.w.cat === 'Travel';
    const pool = EXERCISES.filter(e => e.p === exById(id).p && (!travel || e.e === 'bw')).map(e => e.id);
    if (!pool.includes(id)) pool.unshift(id);
    P.list[i][0] = pool[(pool.indexOf(id) + 1) % pool.length]; render();
  },
  shuffle: () => {
    const P = UI.P, travel = P.w.cat === 'Travel';
    P.list = P.list.map(([id, s, r, rest]) => { const pool = [id, ...alternatives(id, travel).map(e => e.id)].filter(x => !x.startsWith('sk:'));
      return [pool[Math.floor(Math.random() * pool.length)] || id, s, r, rest]; });
    toast('🎲 New mix'); render();
  },
  customize: () => { const P = UI.P; openEditor({n:P.w.n + ' (my version)', cat:P.w.cat, v:P.w.v, notes:P.w.d || P.w.notes || '', list:trim(P.list, P.mins)}); if (!P.w.v) delete UI.E.v; render(); },
  start: () => { const P = UI.P; startWorkout(P.w, trim(P.list, P.mins)); },
  newworkout: () => { openEditor({cat:'Upper'}); },
  newvideo: () => { openEditor({v:'', cat:'Full Body'}); },
  edit: el => { const w = S.workouts.find(x => x.id === el.dataset.id); openEditor({...w, list:w.ex}); if (!w.v) delete UI.E.v; render(); },
  paste: async () => { try { const t = await navigator.clipboard.readText(); UI.E.v = t.trim(); if (!UI.E.n) UI.E.n = platform(UI.E.v)[0] + ' workout'; render(); } catch(e) { toast('Long-press the field and tap Paste'); } },
  eadd: () => openPicker('editor'),
  erm: el => { UI.E.list.splice(+el.dataset.i, 1); render(); },
  esave: () => {
    const E = UI.E; if (!E.n.trim()) return toast('Give it a name');
    const w = {id:E.id || 'u' + uid(), n:E.n.trim(), cat:E.cat, notes:E.notes, d:E.notes, ex:E.list, custom:true}; if (E.v !== undefined) w.v = E.v.trim();
    const i = S.workouts.findIndex(x => x.id === w.id); if (i >= 0) S.workouts[i] = w; else S.workouts.unshift(w);
    save(); toast('Saved ✓'); openPreview(w);
  },
  edel: () => { if (!confirm('Delete this workout?')) return; S.workouts = S.workouts.filter(w => w.id !== UI.E.id); save(); close(); },
  mix: el => { UI.mixId = el.dataset.id; open('mix'); },
  domix: el => { const a = wById(UI.mixId), b = wById(el.dataset.id);
    openEditor({n:`${a.n} + ${b.n}`, cat:b.cat, v:a.v || '', notes:a.notes || '', list:[...a.ex, ...b.ex].map(x => [...x])}); },
  pickex: el => {
    const id = el.dataset.id, x = exById(id), reps = x.t === 's' ? '30s' : '8-12';
    if (UI.pick.mode === 'editor') { UI.E.list.push([id, 3, reps, 90]); open('editor'); }
    else if (UI.pick.mode === 'swap') { const e = S.active.ex[UI.pick.from]; e.id = id; save(); close(); }
    else { S.active.ex.push(mkEx(id, 3, reps, S.settings.rest)); save(); close(); }
  },
  cxsave: () => {
    const n = $('#cx_n').value.trim(); if (!n) return toast('Type a name');
    const x = {id:'c' + uid(), n, p:'other', e:'bw', t:$('#cx_t').value, m:'Custom', link:$('#cx_l').value.trim()};
    S.exercises.unshift(x); save(); A.pickex({dataset:{id:x.id}});
  },
  // active workout
  resume: () => { UI.showActive = true; render(); },
  minimize: () => { UI.showActive = false; render(); },
  addex: () => openPicker('active'),
  addset: el => { const e = S.active.ex[+el.dataset.i], l = e.sets[e.sets.length - 1]; e.sets.push({kg:l?.kg || '', r:'', done:false}); save(); render(); },
  rmset: el => { S.active.ex[+el.dataset.i].sets.pop(); save(); render(); },
  check: el => {
    const e = S.active.ex[+el.dataset.i], s = e.sets[+el.dataset.j];
    if (!s.done) {
      const sug = suggest(e), x = exById(e.id);
      if (s.kg === '' && sug?.kg !== undefined && sug.kg !== '') s.kg = String(sug.kg);
      if (s.r === '') s.r = String(sug?.r || range(e.reps)[0] || '');
      if (s.r === '') return toast(x.t === 's' ? 'Enter seconds' : 'Enter reps');
      s.done = true; startRest(e.rest);
      // carry weight forward to the next empty set
      const nx = e.sets[+el.dataset.j + 1]; if (nx && nx.kg === '') nx.kg = s.kg;
    } else s.done = false;
    save(); render();
  },
  exmenu: el => { UI.menu = +el.dataset.i; open('menu'); },
  setrest: el => { S.active.ex[UI.menu].rest = +el.dataset.v; save(); render(); },
  mswap: () => openPicker('swap', UI.menu),
  mmove: el => { const ex = S.active.ex, i = UI.menu, j = i + +el.dataset.v; if (j < 0 || j >= ex.length) return; [ex[i], ex[j]] = [ex[j], ex[i]]; UI.menu = j; save(); render(); },
  mremove: () => { S.active.ex.splice(UI.menu, 1); save(); close(); },
  rest: el => { const v = +el.dataset.v; if (!v) REST = null; else if (REST) REST.end += v * 1000; tickRest(); },
  finish: () => finish(),
  discard: () => { if (confirm('Discard this workout? Nothing will be saved.')) { S.active = null; REST = null; save(); render(); } },
  levelup: el => { const id = el.dataset.id; S.skills[id] = (S.skills[id] || 0) + 1; save(); toast('⬆ Level up!'); el.closest('.card').remove(); },
  // skills
  skill: el => { UI.skill = el.dataset.id; open('skill'); },
  trainskill: () => {
    const entry = skillEntry(UI.skill);
    if (S.active) { S.active.ex.push(mkEx(...entry)); save(); UI.modal = null; UI.showActive = true; render(); toast('Added to workout'); }
    else { const sk = SKILLS.find(s => s.id === UI.skill); startWorkout({id:'skill', n:sk.n + ' practice', cat:'Skill'}, [entry]); }
  },
  skillsession: () => startWorkout({id:'skills', n:'Skill session', cat:'Skill'}, S.pinned.map(skillEntry)),
  pin: () => { const id = UI.skill; S.pinned = S.pinned.includes(id) ? S.pinned.filter(x => x !== id) : [...S.pinned, id]; save(); render(); },
  lvl: el => { const sk = SKILLS.find(s => s.id === UI.skill); S.skills[sk.id] = Math.max(0, Math.min(sk.steps.length, (S.skills[sk.id] || 0) + +el.dataset.v)); save(); render(); },
  // history
  hist: el => { UI.hid = el.dataset.id; open('hist'); },
  hdel: () => { if (!confirm('Delete this workout from history?')) return; S.history = S.history.filter(h => h.id !== UI.hid); save(); close(); },
  redo: () => { const h = S.history.find(x => x.id === UI.hid); startWorkout({id:h.src, n:h.name, cat:''}, h.ex.map(e => [e.id, e.sets.length, e.reps || e.sets[0].r, exById(e.id).t === 'w' ? 120 : 90])); },
  form: el => { UI.formBack = UI.modal && UI.modal !== 'form' ? UI.modal : null; UI.form = el.dataset.id; open('form'); },
  formback: () => { const b = UI.formBack; UI.formBack = null; b ? open(b) : close(); },
  prog: el => { UI.prog = el.dataset.id; open('prog'); },
  settings: () => open('settings'),
  export: async () => {
    const blob = new Blob([JSON.stringify(S)], {type:'application/json'}), name = `replab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, {type:'application/json'});
    if (navigator.canShare?.({files:[file]})) { try { await navigator.share({files:[file]}); return; } catch(e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  },
  reset: () => { if (confirm('Erase ALL workouts, history and skills? This cannot be undone.') && confirm('Really erase everything?')) { S = defaults(); save(); close(); } },
  close: () => close(),
  bgclose: (el, ev) => { if (ev.target === el) close(); },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.dataset.a === 'bgclose') return fn(el, ev);
  if (el.tagName !== 'A') ev.preventDefault();
  ev.stopPropagation(); fn(el, ev);
});
document.addEventListener('input', ev => {
  const t = ev.target, d = t.dataset;
  if (d.f) { const s = S.active.ex[+d.i].sets[+d.j]; s[d.f] = t.value.replace(',', '.'); save(); }
  else if (d.ef) UI.E[d.ef] = t.value;
  else if (d.el !== undefined) { const row = UI.E.list[+d.el], k = +d.k; row[k] = k === 2 ? t.value : +t.value || 0; }
  else if (t.id === 'pq') { UI.q = t.value; $('#plist').innerHTML = pickList(); }
  else if (d.set) { S.settings[d.set] = d.set === 'inc' ? +t.value.replace(',', '.') || 2.5 : t.value; if (d.set === 'split') S.settings.pos = 0; save(); }
});
document.addEventListener('change', ev => {
  if (ev.target.dataset.set) { render(); return; }
  if (ev.target.id !== 'imp') return;
  const f = ev.target.files[0]; if (!f) return;
  f.text().then(t => { const d = JSON.parse(t); if (!d.history) throw 0; if (confirm(`Import backup with ${d.history.length} workouts? This replaces current data.`)) { S = {...defaults(), ...d}; save(); close(); toast('Imported ✓'); } })
    .catch(() => toast('Not a valid backup file'));
});

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
