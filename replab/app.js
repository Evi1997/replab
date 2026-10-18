// Rep Lab — offline personal trainer. No AI, no server: everything lives in localStorage.
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS = ['Legs','Glutes','Push','Pull','Upper','Arms','Full Body','Core','Cardio','Calisthenics','Travel'];
const PATTERNS = {squat:'Squat',lunge:'Lunge',quad:'Quads',hinge:'Hinge',glute:'Glutes',ham:'Hamstrings',lowback:'Lower back',calf:'Calves',hpush:'Horizontal push',chestiso:'Chest isolation',vpush:'Vertical push',dip:'Dips',latraise:'Side delts',vpull:'Vertical pull',hpull:'Rows',latiso:'Lat isolation',scap:'Scapula',reardelt:'Rear delts',traps:'Traps',grip:'Grip / carry',biceps:'Biceps',triceps:'Triceps',core:'Core',corehold:'Core holds',cardio:'Conditioning',skill:'Skill',other:'Custom'};
const EXMAP = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// ---------- state ----------
const KEY = 'replab.v1';
const DEFAULT_SETTINGS = {split:'coach', pos:0, rest:90, inc:2.5, helper:''};
function defaults(){ return {history:[], workouts:[], exercises:[], skills:{}, pinned:[], settings:{...DEFAULT_SETTINGS}, active:null, profile:null, body:[]}; }
function load(){
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { const d = defaults(); return {...d, ...s, settings:{...d.settings, ...s.settings}}; } } catch(e) {}
  return defaults();
}
let S = load();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) { toast('⚠️ Could not save on this phone'); } queuePush(); }
if (navigator.storage?.persist) navigator.storage.persist();

const UI = {signup:false, stack:[], tab:'today', group:'', tmins:0, ob:0, obd:{}, editing:false, modal:null, showActive:true, q:'', pick:null, P:null, E:null, hid:null, prog:null, skill:null, summary:null, menu:null};

// ---------- helpers ----------
function exById(id){
  if (id.startsWith('sk:')) {
    const [, sid, i] = id.split(':'); const sk = SKILLS.find(x => x.id === sid); const st = sk?.steps[+i];
    if (st) return {id, n:st[0], p:'skill', e:'bar', t:st[1], m:`${sk.n} · step ${+i+1}`, skill:sid};
  }
  return EXMAP[id] || S.exercises.find(e => e.id === id) || {id, n:id, p:'other', e:'bw', t:'w', m:''};
}
function embedUrl(u, id){
  if (id) return id;
  let m = /tiktok\.com\/.*video\/(\d+)/.exec(u || ''); if (m) return `https://www.tiktok.com/player/v1/${m[1]}?loop=1&rel=0`;
  m = /instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/.exec(u || ''); if (m) return `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed`;
  m = /(?:youtu\.be\/|[?&]v=|shorts\/)([\w-]{11})/.exec(u || ''); if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?playsinline=1&rel=0`;
  return null;
}
const player = (src, tall) => `<div class="vid ${tall ? 'tall' : ''}"><iframe src="${esc(src)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
const socialPlayer = w => { const src = embedUrl(w.v, w.embed); return src ? player(src, !/youtube/.test(src)) : `<a class="btn wide s" href="${esc(w.v)}" target="_blank" rel="noopener">${platform(w.v)[1]} Open video ↗</a>`; };
const demoKey = x => DEMO_MAP[x.id] || (x.skill ? DEMO_MAP[x.n] : null);
const thumb = (x, size = 56) => { const k = demoKey(x); return k ? `<img class="thumb" style="width:${size}px;height:${size}px" src="img/${k}-1.jpg" alt="" loading="lazy">` : `<span class="thumb ph" style="width:${size}px;height:${size}px">${x.skill ? '⭐' : '💪'}</span>`; };
const allWorkouts = () => [...S.workouts, ...WORKOUTS];
const wById = id => allWorkouts().find(w => w.id === id) || (typeof GENERATED !== 'undefined' && GENERATED[id]);
const estMin = list => Math.round(list.reduce((t, [, s, , r]) => t + s * (40 + (+r || 60)) + 45, 0) / 60);
// Fit a workout into a time budget: trim accessory sets first, then drop accessories, then trim main lifts.
function trim(list, mins){
  const out = list.map(x => [...x]);
  if (!mins) return out;
  const over = () => estMin(out) > mins;
  for (let i = out.length - 1; i >= 2 && over(); i--) out[i][1] = Math.min(out[i][1], 2);
  while (over() && out.length > 4) out.pop();
  for (let i = 0; i < out.length && over(); i++) out[i][1] = Math.min(out[i][1], 3);
  while (over() && out.length > 3) out.pop();
  for (let i = out.length - 1; i >= 0 && over(); i--) out[i][1] = 2;
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
  const tabs = [['today','🏠','Today'],['workouts','🏋️','Workouts'],['programs','📅','Programs'],['coach','💬','Coach'],['history','📈','Progress']];
  return `<nav class="tabbar">${tabs.map(([k, i, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-a="tab" data-v="${k}"><span class="i">${i}</span>${l}</button>`).join('')}</nav>`;
}
function resumeBar(){
  if (!S.active || UI.showActive) return '';
  return `<button class="resume" data-a="resume">▶ <span class="sp" style="text-align:left">${esc(S.active.name)}</span><span class="timer" style="color:inherit;font-size:18px" data-elapsed>${fmtT((Date.now() - S.active.start) / 1000)}</span></button>`;
}
// Revolut-style building blocks: grouped list rows and round quick actions
function lrow({a, id = '', v = '', ic, title, sub = '', right = '›', tint = ''}){
  return `<button class="lrow" data-a="${a}"${id ? ` data-id="${esc(id)}"` : ''}${v !== '' ? ` data-v="${esc(v)}"` : ''}><span class="lic"${tint ? ` style="background:${tint}"` : ''}>${ic}</span><span class="lt"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span><span class="lr">${right}</span></button>`;
}
const listGroup = (title, rows) => rows.length ? `${title ? `<h2>${title}</h2>` : ''}<div class="group">${rows.join('')}</div>` : '';
const qa = (a, ic, label, dot) => `<button class="qa" data-a="${a}"><span class="qai">${ic}${dot ? '<i class="dot"></i>' : ''}</span>${label}</button>`;
function wCard(w){
  const t = trim(w.ex, UI.tmins);
  return lrow({a:'preview', id:w.id, ic:(GROUPS.find(g => g[0] === w.cat) || ['', '🏋️'])[1], title:esc(w.n), sub:`${estMin(t)} min · ${t.length} exercises${w.custom ? ' · mine' : ''}`});
}
const GROUPS = [['Legs','🦵'],['Glutes','🍑'],['Push','🏋️'],['Pull','🧗'],['Upper','💪'],['Arms','🦾'],['Full Body','🔥'],['Core','🎯'],['Cardio','❤️'],['Calisthenics','🤸'],['Travel','✈️']];
function nextWorkout(){
  const seq = planSeq(), st = programState();
  if (st && !st.finished) return {w:st.next, label:`${esc(st.P.n)} · week ${st.week + 1} · ${st.phase.n}`};
  return {w:wById(seq[S.settings.pos % seq.length]), label:`Your plan · day ${S.settings.pos % seq.length + 1} of ${seq.length}`};
}
const VIEWS = {
  coach(){ if (!UI.chat) chatStart(); return chatView(); },
  today(){
    const {w:next, label} = nextWorkout(), st = programState(), g = S.profile && GOALS[S.profile.goal], seq = st && !st.finished ? st.P.days : planSeq();
    const hr = new Date().getHours(), hi = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const doneIds = S.history.filter(h => h.start >= monday).map(h => h.src);
    const alerts = [
      checkinDue() && lrow({a:'checkin', ic:'🗓️', tint:'rgba(198,255,0,.15)', title:'Coach check-in due', sub:'2 minutes to fine-tune your plan'}),
      deloadActive() && lrow({a:'coach', ic:'🧘', title:'Deload week', sub:`Half the sets until ${fmtDate(S.deloadUntil)}`}),
      st?.finished && lrow({a:'progstop', ic:'🏆', title:`${esc(st.P.n)} complete`, sub:'Tap to go back to your plan'}),
    ].filter(Boolean);
    return `<div class="row topbar"><div class="sp"><div class="mut sm">${new Date().toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})}</div><h1 style="margin:2px 0 0">${hi}</h1></div>
        <button class="avatar" data-a="settings" aria-label="Settings">${esc((SESSION?.email || 'R')[0].toUpperCase())}</button></div>
      ${next ? `<div class="hero2"><div class="tag">Up next</div><div class="h2t">${esc(next.n)}</div><div class="sm mut">${label}</div>
        <div class="sm" style="margin:10px 0 16px">⏱ ~${estMin(next.ex)} min · ${next.ex.length} exercises</div>
        <button class="btn pri wide" data-a="startnext" data-id="${next.id}">Start workout</button>
        <div class="row" style="margin-top:8px"><button class="btn ghost sp s" data-a="preview" data-id="${next.id}">Preview</button><button class="btn ghost sp s" data-a="skipday">Skip</button></div></div>` : ''}
      <div class="qas">${qa('gotab', '⚡', 'Generate')}${qa('chat', '💬', 'Ask coach')}${qa('addbody', '⚖️', 'Weigh in')}${qa('checkin', '🗓️', 'Check-in', checkinDue())}</div>
      ${listGroup('For you', alerts)}
      ${listGroup('This week', seq.map((id, i) => { const w = wById(id); if (!w) return ''; const done = doneIds.includes(id);
        return lrow({a:'preview', id, ic:done ? '✓' : i + 1, tint:done ? 'var(--acc)' : '', title:esc(w.n), sub:done ? 'Done this week' : `${w.cat} · ~${estMin(w.ex)} min`}); }).filter(Boolean))}
      ${g ? listGroup('Your goal', [lrow({a:'coach', ic:g.ic, title:g.n, sub:`${S.profile.days}× a week · calories, protein & plan`})]) : ''}`;
  },
  workouts(){
    const groups = S.workouts.length ? [...GROUPS, ['Mine','⭐']] : GROUPS;
    return `<h1>Workouts</h1>
      <div class="tiles3">${groups.map(([g, i]) => `<button class="tile" data-a="group" data-v="${g}"><span class="ti">${i}</span>${g}</button>`).join('')}</div>
      ${listGroup('', [lrow({a:'newworkout', ic:'＋', title:'Build your own', sub:'Pick exercises, sets and reps'})])}`;
  },
  programs(){
    const st = programState();
    return `<h1>Programs</h1><p class="mut" style="margin-top:-8px">Structured multi-week plans that progress for you.</p>
      ${st && !st.finished ? `<div class="hero2"><div class="tag">Your program · week ${st.week + 1} of ${st.P.weeks}</div><div class="h2t">${st.P.ic} ${esc(st.P.n)}</div>
        <div class="bar"><i style="width:${st.pct}%"></i></div><div class="sm mut" style="margin:8px 0 14px">${st.phase.n} week · next: ${esc(st.next?.n || '')}</div>
        <button class="btn pri wide" data-a="progpage" data-id="${st.P.id}">View program</button></div>` : ''}
      ${listGroup('Training programs', PROGRAMS.map(P => lrow({a:'progpage', id:P.id, ic:P.ic, title:esc(P.n), sub:`${P.weeks} weeks · ${P.days.length} days a week${S.program?.id === P.id ? ' · active' : ''}`})))}
      ${listGroup('Skill paths', SKILLS.map(sk => { const lv = S.skills[sk.id] || 0, n = sk.steps.length;
        return lrow({a:'skill', id:sk.id, ic:sk.ic, title:sk.n + (S.pinned.includes(sk.id) ? ' 📌' : ''), sub:lv >= n ? 'Mastered 🏆' : `Step ${lv + 1} of ${n} · ${esc(sk.steps[lv][0])}`, right:`<span class="ring" style="--p:${Math.round(lv / n * 100)}"></span>`}); }))}
      ${S.pinned.length ? `<button class="btn wide" style="margin-top:12px" data-a="skillsession">Train pinned skills ▶</button>` : ''}`;
  },
  history(){
    const now = new Date(), monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const thisWeek = S.history.filter(h => h.start >= monday).length;
    const days = new Set(S.history.map(h => new Date(h.start).toDateString()));
    let streak = 0; for (let w = 0; w < 200; w++) { const a = monday - w * 7 * 864e5, b = a + 7 * 864e5; if (S.history.some(h => h.start >= a && h.start < b)) streak++; else if (w > 0) break; }
    const cal = []; const start = new Date(monday - 21 * 864e5);
    for (let i = 0; i < 28; i++) { const d = new Date(start.getTime() + i * 864e5); cal.push(`<div class="${days.has(d.toDateString()) ? 'on' : ''} ${d.toDateString() === now.toDateString() ? 'today' : ''}"></div>`); }
    const logged = [...new Set(S.history.flatMap(h => h.ex.map(e => e.id)))];
    return `<h1>Progress</h1>
      <div class="row"><div class="stat"><b>${thisWeek}</b><span class="sm mut">this week</span></div><div class="stat"><b>${streak}</b><span class="sm mut">week streak</span></div><div class="stat"><b>${S.history.length}</b><span class="sm mut">workouts</span></div></div>
      ${S.profile ? bodySection() : ''}
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
    ${A.video ? (UI.showVid ? `${socialPlayer({v:A.video, embed:A.embed})}<button class="btn wide s" style="margin-bottom:12px" data-a="togvid">Hide video</button>` : `<button class="btn wide" style="margin-bottom:12px" data-a="togvid">${platform(A.video)[1]} Show the video</button>`) : ''}
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
    ${swapRow(e.id, 'swapeq', i, S.active.ex.map(y => y.id))}
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
  S.active = {id:uid(), name:w.n, src:w.id, video:w.v || '', embed:w.embed || '', start:Date.now(), ex:items.map(x => mkEx(...x))};
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
  const st = programState(), seq = planSeq();
  if (st && !st.finished && A.src === st.next?.id) S.program.done = (S.program.done || 0) + 1;
  else if (A.src === seq[S.settings.pos % seq.length]) S.settings.pos++;
  S.active = null; REST = null; save();
  UI.summary = {h, levelUps}; UI.modal = 'summary'; render();
}

// ---------- modals ----------
const MODALS = {
  preview(){
    const P = UI.P, w = P.w, travel = w.cat === 'Travel';
    const list = trim(P.list, P.mins);
    return `<div class="tag">${esc(w.cat)}</div><h3>${esc(w.n)}</h3><div class="mut sm">${esc(w.d || w.notes || '')}</div>
      ${w.v ? `<div style="margin-top:12px">${socialPlayer(w)}</div>` : ''}
      <div class="chips" style="margin-top:14px">${[[30,'30 min'],[45,'45 min'],[60,'60 min'],[0,`Full ~${estMin(P.list)}m`]].map(([m, l]) => `<button class="chip ${P.mins === m ? 'on' : ''}" data-a="mins" data-v="${m}">${l}</button>`).join('')}</div>
      <div>${list.map(([id, s, r, rest], i) => { const x = exById(id), alt = alternatives(id, travel).length;
        return `<div class="exl"><button data-a="form" data-id="${id}">${thumb(x, 44)}</button><div class="sp" style="min-width:0"><button data-a="form" data-id="${id}" style="font-weight:800;text-align:left">${esc(x.n)}</button>
        <div class="sm mut">${s} × ${esc(r)} · rest ${fmtT(rest)}</div>${swapRow(id, 'pswapeq', i, list.map(y => y[0]))}</div>${alt ? `<button class="ib" data-a="swap" data-i="${i}">🔁</button>` : ''}</div>`; }).join('')}</div>
      ${w.cat === 'Calisthenics' && S.pinned.length ? `<div class="hint" style="margin-top:10px">📌 Plus your pinned skills: <b>${S.pinned.map(id => SKILLS.find(s => s.id === id).n).join(', ')}</b></div>` : ''}
      ${S.profile && !w.fixed && !['Calisthenics','Travel','Cardio','Core'].includes(w.cat) ? `<div class="hint" style="margin-top:10px">${GOALS[S.profile.goal].ic} Sets, reps & rest tuned for <b>${GOALS[S.profile.goal].n}</b></div>` : ''}
      ${P.phase ? `<div class="hint" style="margin-top:10px">📅 <b>${P.phase.n} week:</b> ${P.phase.note}</div>` : ''}
      ${!['Cardio','Core'].includes(w.cat) ? `<button class="btn wide s" style="margin-top:10px;${P.fin ? 'border-color:var(--acc);color:var(--acc)' : ''}" data-a="fin">${P.fin ? '✓ 10-min finisher added' : '＋ Add 10-min finisher'}</button>` : ''}
      <div class="row" style="margin-top:14px">${w.gen ? `<button class="btn s sp" data-a="regen">⚡ Another one</button>` : `<button class="btn s sp" data-a="shuffle">🎲 Shuffle</button>`}<button class="btn s sp" data-a="customize">✏️ Customize</button>${w.custom ? `<button class="btn s" data-a="edit" data-id="${w.id}">Edit</button>` : ''}</div>
      <button class="btn pri wide" style="margin-top:12px" data-a="start">Start workout ▶</button>`;
  },
  editor(){
    const E = UI.E;
    return `<h3>${E.id ? 'Edit workout' : E.v !== undefined ? 'Add video workout' : 'New workout'}</h3>
      ${E.v !== undefined ? `<div class="field"><label>TikTok / Instagram link</label><div class="row"><input id="f_v" value="${esc(E.v)}" placeholder="https://www.tiktok.com/…" data-ef="v"></div></div>` : ''}
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
  coach: () => coachView(),
  chat: () => chatView(),
  programs: () => programsView(),
  checkin: () => checkinForm(),
  checkres: () => checkinResult(),
  body: () => bodyForm(),
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
      <div class="field"><label>Weekly split (Up next)</label><select data-set="split"><option value="coach" ${st.split === 'coach' ? 'selected' : ''}>Coach plan (from your goal)</option>${Object.entries(SPLITS).map(([k, v]) => `<option value="${k}" ${st.split === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select></div>
      <div class="field"><label>Default weight jump (kg)</label><input inputmode="decimal" data-set="inc" value="${st.inc}"></div>
      <button class="btn wide" data-a="editprofile">✏️ Goal, body & training details</button>
      <h2>AI coach helper</h2><p class="sm mut">Your free Cloudflare helper link. It powers the AI chat coach (free daily allowance). Without it the coach uses built-in rules.</p>
      <input data-set="helper" value="${esc(st.helper || '')}" placeholder="https://replab-import.yourname.workers.dev">
      <h2>What ${COACH_NAME} remembers</h2>
      <div class="group">${(S.coachNotes || []).length ? S.coachNotes.map((n, i) => `<div class="lrow"><span class="lic">🌿</span><span class="lt"><b style="font-weight:500;font-size:15px">${esc(n.text)}</b><span>${fmtDate(n.t)}</span></span><button class="lr danger" data-a="delnote" data-i="${i}" aria-label="Forget">✕</button></div>`).join('')
        : `<div class="lrow"><span class="lic">🌿</span><span class="lt"><b style="font-weight:500;font-size:15px">Nothing yet</b><span>${COACH_NAME} saves lasting things you mention, like an injury or when you like to train.</span></span></div>`}</div>
      ${accountSection()}
      <h2>Backup</h2><p class="sm mut">Your data lives only on this phone. Export a backup now and then (e.g. save to Files or AirDrop it to your Mac).</p>
      <button class="btn wide" data-a="export">⬇ Export backup</button>
      <label class="btn wide" style="margin-top:8px">⬆ Import backup<input type="file" accept="application/json,.json" id="imp" hidden></label>
      <button class="btn wide ghost danger" style="margin-top:16px" data-a="reset">Erase all data</button>
      <p class="sm mut" style="text-align:center;margin-top:14px">Screen ${screen.width}×${screen.height} · view ${innerWidth}×${innerHeight} · ${navigator.standalone ? 'home screen' : 'browser'}</p>`;
  },
};
function pickList(){
  const q = UI.q.trim().toLowerCase();
  let list = [...S.exercises, ...EXERCISES];
  if (UI.pick.mode === 'swap') { const p = exById(UI.pick.from).p; list.sort((a, b) => (b.p === p) - (a.p === p)); }
  if (q) list = list.filter(e => (e.n + ' ' + e.m + ' ' + (PATTERNS[e.p] || '')).toLowerCase().includes(q));
  return list.slice(0, 60).map(e => `<div class="exl" data-a="pickex" data-id="${e.id}" style="cursor:pointer"><div class="sp"><b>${esc(e.n)}</b><div class="sm mut">${esc(PATTERNS[e.p] || '')} · ${esc(e.m || '')}</div></div><span class="acc" style="font-size:22px">＋</span></div>`).join('') || '<div class="mut sm">No match. Create it below 👇</div>';
}

// ---------- pages (slide in with a back button, like Revolut) ----------
const PAGES = {
  group: () => { const g = UI.group, list = g === 'Mine' ? S.workouts : allWorkouts().filter(w => w.cat === g), eq = UI.equip?.[g] || defaultEquip(g);
    return [esc(g), `${g !== 'Mine' && TEMPLATES[g] ? `<div class="hero2"><div class="tag">Generate</div><div class="sm mut" style="margin:4px 0 12px">A fresh ${esc(g.toLowerCase())} session built for your goal. Never the same twice.</div>
        <div class="seg">${Object.entries(EQUIP).filter(([k]) => equipFor(g).includes(k)).map(([k, v]) => `<button class="${eq === k ? 'on' : ''}" data-a="equip" data-v="${k}">${v.n}</button>`).join('')}</div>
        ${!['Cardio','Core'].includes(g) ? `<div class="chips" style="margin:10px -20px 12px;padding:0 20px">${Object.entries(FORMATS).map(([k, v]) => `<button class="chip ${(UI.format || 'classic') === k ? 'on' : ''}" data-a="format" data-v="${k}">${v.n}</button>`).join('')}</div>` : '<div style="height:12px"></div>'}
        <button class="btn pri wide" data-a="gen">Generate workout</button></div>` : ''}
      <h2>Ready-made · how long have you got?</h2>
      <div class="seg">${[[30,'30 min'],[45,'45 min'],[60,'60 min'],[0,'Any']].map(([m, l]) => `<button class="${UI.tmins === m ? 'on' : ''}" data-a="tmins" data-v="${m}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="group" style="margin-top:12px">${list.map(wCard).join('')}</div>` : `<div class="empty">No workouts here yet.</div>`}`]; },
  prog: p => { const P = progById(p.id), active = S.program?.id === P.id, st = active ? programState() : null, ph = PHASES[P.phase];
    return [P.n, `<div class="hero2" style="text-align:center"><div style="font-size:44px">${P.ic}</div><div class="h2t">${esc(P.n)}</div><div class="sm mut" style="margin-top:6px">${esc(P.d)}</div>
        <div class="stats3"><div><b>${P.weeks}</b><span>weeks</span></div><div><b>${P.days.length}</b><span>days / week</span></div><div><b>${P.weeks * P.days.length}</b><span>sessions</span></div></div>
        ${st && !st.finished ? `<div class="bar"><i style="width:${st.pct}%"></i></div><div class="sm mut" style="margin-top:6px">Week ${st.week + 1} · ${st.phase.n} · ${st.pct}% done</div>` : ''}</div>
      ${listGroup('How it progresses', ph.map((x, i) => lrow({a:'noop', ic:i + 1, tint:x.deload ? '' : 'rgba(198,255,0,.15)', title:`${(w => (w.length > 1 ? 'Weeks ' : 'Week ') + w.join(', '))([i + 1, i + 5, i + 9].filter(n => n <= P.weeks))}: ${x.n}`, sub:esc(x.note), right:''})))}
      ${listGroup('Your training week', P.days.map((id, i) => { const w = wById(id); return w ? lrow({a:'preview', id, ic:GROUPS.find(g => g[0] === w.cat)?.[1] || '🏋️', title:`Day ${i + 1}: ${esc(w.n)}`, sub:`${w.cat} · ~${estMin(w.ex)} min · ${w.ex.length} exercises`}) : ''; }))}
      <div class="sm mut" style="margin:12px 4px">Rest or walk between sessions. Weights and sets adjust automatically each week. Do the days in order.</div>
      ${active ? `<button class="btn wide danger" data-a="progstop">Stop program</button>` : `<button class="btn pri wide" data-a="progstart" data-id="${P.id}">Start this program</button>`}`]; },
  skill: () => { const sk = SKILLS.find(s => s.id === UI.skill); return [sk.n, MODALS.skill().replace(/^<h3>.*?<\/h3>/, '')]; },
  plan: () => ['Your plan', coachView().replace(/^<div class="tag">Your coach plan<\/div><h3>.*?<\/h3>/, '')],
  settings: () => ['Settings', MODALS.settings().replace(/^<h3>Settings<\/h3>/, '')],
};
const pushPage = (t, extra = {}) => { UI.stack = [...(UI.stack || []), {t, ...extra}]; UI.modal = null; render(); };

// ---------- render ----------
function render(){
  const top = UI.stack?.[UI.stack.length - 1], aw = $('#overlay .aw')?.scrollTop, sh = $('#modal .sheet')?.scrollTop, key = UI.tab + '|' + JSON.stringify(top || ''), main = key === render.key ? $('#scroller')?.scrollTop : 0;
  render.key = key;
  $('#app').innerHTML = cloudOn() && !SESSION ? `<div class="scroll" id="scroller"><main class="view">${loginView()}</main></div>` : S.profile && !UI.editing ? `<div class="scroll" id="scroller"><main class="view ${top ? 'page' : ''}">${top ? (([t, body]) => `<div class="phead"><button class="pback" data-a="back" aria-label="Back">‹</button><b>${esc(t)}</b><span></span></div>${body}`)(PAGES[top.t](top)) : VIEWS[UI.tab]()}</main></div>${UI.tab === 'coach' && !top ? chatBar() : ''}${resumeBar()}${tabbar()}` : `<div class="scroll" id="scroller"><main class="view">${onboarding()}</main></div>`;
  if (main) $('#scroller').scrollTop = main;
  $('#overlay').innerHTML = S.active && UI.showActive ? activeView() : '';
  $('#modal').innerHTML = UI.modal ? `<div class="bg" data-a="bgclose"><div class="sheet"><div class="sheethead"><div class="grab"></div><button class="x" data-a="close" aria-label="Close">✕</button></div>${MODALS[UI.modal]()}</div></div>` : '';
  if (aw && $('#overlay .aw')) $('#overlay .aw').scrollTop = aw;
  if (sh && $('#modal .sheet')) $('#modal .sheet').scrollTop = sh;
  if (UI.tab === 'coach' && !UI.modal && $('#scroller')) $('#scroller').scrollTop = 1e6;
  document.body.classList.toggle('lock', !!(UI.modal || (S.active && UI.showActive)));
  tickRest();
}
const open = m => { UI.modal = m; render(); };
const close = () => { UI.modal = null; render(); };
function openPreview(w){
  let list = w.fixed ? w.ex.map(x => [...x]) : applyGoal(w, w.ex.map(x => [...x])), phase = null;
  const st = programState();
  if (deloadActive()) phase = DELOAD_PHASE; else if (st && !st.finished && st.next?.id === w.id) phase = st.phase;
  UI.P = {w, list:applyWeek(list, phase), mins:UI.tmins, fin:false, phase}; open('preview');
}
function openEditor(base){ UI.E = {id:'', n:'', cat:'Upper', notes:'', list:[], ...JSON.parse(JSON.stringify(base || {}))}; open('editor'); }
function openPicker(mode, from){ UI.pick = {mode, from}; UI.q = ''; open('picker'); }

// ---------- actions ----------
const A = {
  tab: el => { UI.tab = el.dataset.v; UI.stack = []; render(); },
  gotab: () => { UI.tab = 'workouts'; UI.stack = []; render(); },
  back: () => { UI.stack = (UI.stack || []).slice(0, -1); render(); },
  noop: () => {},
  startnext: el => { openPreview(wById(el.dataset.id)); A.start(); },
  progpage: el => pushPage('prog', {id:el.dataset.id}),
  group: el => { UI.group = el.dataset.v; pushPage('group', {g:el.dataset.v}); },
  equip: el => { UI.equip = {...(UI.equip || {}), [UI.group]:el.dataset.v}; render(); },
  swapeq: el => { const e = S.active.ex[+el.dataset.i]; e.id = el.dataset.v; save(); render(); toast('Swapped to ' + exById(el.dataset.v).n); },
  pswapeq: el => { UI.P.list[+el.dataset.i][0] = el.dataset.v; render(); toast('Swapped to ' + exById(el.dataset.v).n); },
  format: el => { UI.format = el.dataset.v; render(); },
  gen: () => { const g = UI.group, eq = UI.equip?.[g] || defaultEquip(g), f = ['Cardio','Core'].includes(g) ? 'classic' : UI.format || 'classic'; openPreview(generateWorkout(g, eq, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, f)); },
  regen: () => { const w = UI.P.w; openPreview(generateWorkout(w.cat, w.equip, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, w.format)); },
  tmins: el => { UI.tmins = +el.dataset.v; render(); },
  preview: el => openPreview(wById(el.dataset.id)),
  quickstart: el => { const w = wById(el.dataset.id); startWorkout(w, w.ex); },
  skipday: () => { const st = programState(); if (st && !st.finished) S.program.done = (S.program.done || 0) + 1; else S.settings.pos++; save(); render(); },
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
  start: () => { const P = UI.P; startWorkout(P.w, [...trim(P.list, P.mins), ...(P.fin ? FINISHER() : [])]); },
  fin: () => { UI.P.fin = !UI.P.fin; render(); },
  newworkout: () => { openEditor({cat:'Upper'}); },
  edit: el => { const w = S.workouts.find(x => x.id === el.dataset.id); openEditor({...w, list:w.ex}); if (!w.v) delete UI.E.v; render(); },
  eadd: () => openPicker('editor'),
  erm: el => { UI.E.list.splice(+el.dataset.i, 1); render(); },
  esave: () => {
    const E = UI.E; if (!E.n.trim()) return toast('Give it a name');
    const w = {id:E.id || 'u' + uid(), n:E.n.trim(), cat:E.cat, notes:E.notes, d:E.notes, ex:E.list, custom:true}; if (E.v !== undefined) { w.v = E.v.trim(); w.embed = E.embed || ''; w.cap = E.cap || ''; }
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
  togvid: () => { UI.showVid = !UI.showVid; render(); },
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
  skill: el => { UI.skill = el.dataset.id; pushPage('skill'); },
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
  coach: () => pushPage('plan'),
  delnote: el => { S.coachNotes.splice(+el.dataset.i, 1); save(); render(); },
  chat: () => { UI.tab = 'coach'; UI.modal = null; render(); },
  chatnew: () => { chatStart(); render(); },
  chatq: el => { const k = el.dataset.k; if (k.startsWith('ai:')) chatInput(k.slice(3)); else chatInput(el.textContent, k); render(); },
  chatsend: () => { const i = $('#chatin'); const t = i.value; i.value = ''; chatInput(t); render(); $('#chatin')?.focus(); },
  programs: () => { UI.tab = 'programs'; UI.stack = []; UI.modal = null; render(); },
  progstart: el => { if (S.program && !confirm('Replace your current program?')) return; S.program = {id:el.dataset.id, start:Date.now(), done:0}; save(); close(); toast('Program started 💪'); },
  progstop: () => { if (!confirm('Stop this program and go back to your coach plan?')) return; S.program = null; save(); close(); },
  checkin: () => { UI.ci = {}; open('checkin'); },
  ciset: el => { UI.ci[el.dataset.k] = el.dataset.v; render(); },
  cisubmit: () => { const d = UI.ci; if (!d.feel || !d.sleep || !d.hunger) return toast('Answer the three questions'); runCheckin(); save(); open('checkres'); },
  ciapply: () => { applyCheckin(); save(); close(); toast('Plan updated ✓'); },
  ciskip: () => { UI.ciResult.changes = []; applyCheckin(); save(); close(); },
  togsignup: () => { UI.signup = !UI.signup; render(); },
  login: async el => {
    const email = $('#l_em').value.trim(), pw = $('#l_pw').value;
    if (!/^\S+@\S+\.\S+$/.test(email) || pw.length < 6) return toast('Enter your email and a 6+ character password');
    el.disabled = true; el.textContent = 'One moment…';
    try {
      await (UI.signup ? signUp(email, pw) : signIn(email, pw));
      await syncOnOpen(); UI.tab = 'today'; UI.stack = []; render(); toast(S.profile ? 'Welcome back 💪' : 'Account ready ✓');
    } catch(e) { toast(e.message.includes('Invalid login') ? 'Wrong email or password' : e.message); el.disabled = false; el.textContent = UI.signup ? 'Create account' : 'Log in'; }
  },
  syncnow: async () => { toast('Syncing…'); const ok = await push(); toast(ok ? 'Backed up ✓' : 'Offline. Will sync later'); render(); },
  logout: async () => {
    if (!confirm('Log out? Your data stays safe in your account.')) return;
    await push(); setSession(null); try { localStorage.removeItem(KEY); } catch(e) {}
    S = defaults(); UI.modal = null; render();
  },
  obset: el => { UI.obd[el.dataset.k] = el.dataset.v; render(); },
  obback: () => { UI.ob = Math.max(0, UI.ob - 1); render(); },
  obnext: () => {
    const d = UI.obd;
    if (UI.ob === 2) { const a = +d.age, c = +d.cm, k = +String(d.kg || '').replace(',', '.');
      if (!d.sex || !(a >= 14 && a <= 90) || !(c >= 120 && c <= 230) || !(k >= 30 && k <= 250)) return toast('Check sex, age, height and weight'); }
    if (UI.ob >= 4) return finishOnboarding();
    UI.ob++; render(); $('#scroller').scrollTop = 0;
  },
  editprofile: () => { UI.stack = []; UI.obd = {...S.profile, ...(latestBody() || {}), kg:(latestBody() || {}).kg || S.profile.kg}; UI.ob = 0; UI.editing = true; UI.modal = null; render(); },
  addbody: () => open('body'),
  savebody: () => {
    const v = id => +($(id).value || '').replace(',', '.') || 0, e = {t:Date.now(), kg:v('#b_kg'), bf:v('#b_bf'), smm:v('#b_smm'), waist:v('#b_waist')};
    if (!e.kg && !e.bf && !e.smm && !e.waist) return toast('Enter at least one number');
    S.body = [...(S.body || []), e]; if (e.kg) S.profile.kg = e.kg; save(); close(); toast('Saved ✓ Targets updated');
  },
  delbody: el => { S.body = S.body.filter(b => b.t !== +el.dataset.t); save(); render(); },
  prog: el => { UI.prog = el.dataset.id; open('prog'); },
  settings: () => pushPage('settings'),
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
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'chatin') { ev.preventDefault(); A.chatsend(); } });
document.addEventListener('input', ev => {
  const t = ev.target, d = t.dataset;
  if (d.f) { const s = S.active.ex[+d.i].sets[+d.j]; s[d.f] = t.value.replace(',', '.'); save(); }
  else if (d.ef) UI.E[d.ef] = t.value;
  else if (d.el !== undefined) { const row = UI.E.list[+d.el], k = +d.k; row[k] = k === 2 ? t.value : +t.value || 0; }
  else if (d.ob) UI.obd[d.ob] = t.value;
  else if (d.ci) UI.ci[d.ci] = t.value;
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

function goBack(){
  if (UI.modal === 'form' && UI.formBack) return A.formback();
  if (UI.modal) return close();
  if (S.active && UI.showActive) { UI.showActive = false; return render(); }
  if (UI.stack?.length) return A.back();
}
let G = null;
document.addEventListener('touchstart', e => {
  const t = e.touches[0], sheet = e.target.closest('.sheet');
  if (t.clientX < 24) G = {edge:true, x:t.clientX, y:t.clientY};
  else if (sheet && (sheet.scrollTop <= 0 || e.target.closest('.sheethead'))) G = {sheet, x:t.clientX, y:t.clientY, dy:0};
  else G = null;
}, {passive:true});
document.addEventListener('touchmove', e => {
  if (!G?.sheet) return;
  const dy = e.touches[0].clientY - G.y;
  if (dy > 0 && Math.abs(dy) > Math.abs(e.touches[0].clientX - G.x)) { G.dy = dy; G.sheet.style.transform = `translateY(${dy}px)`; G.sheet.style.transition = 'none'; e.preventDefault(); }
}, {passive:false});
document.addEventListener('touchend', e => {
  if (!G) return; const t = e.changedTouches[0];
  if (G.edge && t.clientX - G.x > 70 && Math.abs(t.clientY - G.y) < 80) goBack();
  if (G.sheet) { if (G.dy > 110) close(); else { G.sheet.style.transition = 'transform .2s'; G.sheet.style.transform = ''; } }
  G = null;
});
// iOS sometimes leaves the page shifted after the keyboard closes
document.addEventListener('focusout', () => setTimeout(() => window.scrollTo(0, 0), 50));

// iPhone Home Screen apps can report a viewport shorter than the screen, leaving a black strip under the tab bar.
// When that happens, size the app to the real screen height instead.
function fitScreen(){
  const app = $('#app'), portrait = innerHeight > innerWidth, standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const full = portrait ? screen.height : screen.width;
  const short = standalone && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && full - innerHeight > 20;
  app.style.bottom = short ? 'auto' : ''; app.style.height = short ? full + 'px' : '';
  document.documentElement.style.height = document.body.style.height = short ? full + 'px' : '';
}
['resize', 'orientationchange', 'pageshow'].forEach(e => addEventListener(e, () => setTimeout(fitScreen, 60)));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(fitScreen, 60); });
document.addEventListener('focusout', () => setTimeout(fitScreen, 120));

render();
fitScreen();
syncOnOpen();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
