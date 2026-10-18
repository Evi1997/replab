// Chat coach: understands buttons and simple sentences, then builds today's workout with the generator. No AI.
const FEEL = {great:'💥 Great', ok:'🙂 OK', tired:'😴 Tired', sore:'🤕 Sore'};
const WHERE = {gym:'🏋️ Gym', db:'🏠 Home, dumbbells', bw:'🏨 No equipment', bar:'🌳 Park / pull-up bar'};
const FOCUS_OPTS = {auto:'🎲 You choose', Legs:'🦵 Legs', Glutes:'🍑 Glutes', Push:'Push', Pull:'Pull', Upper:'💪 Upper', Arms:'🦾 Arms', 'Full Body':'🔥 Full body', Core:'🎯 Core', Cardio:'❤️ Cardio'};
const TIME_OPTS = {20:'20 min', 30:'30 min', 45:'45 min', 60:'60 min'};
const PAINS = {knee:'knee', back:'lower back', shoulder:'shoulder', wrist:'wrist', elbow:'elbow'};

// word lists → slot values (first match wins, so more specific phrases come first)
const LEX = {
  feel: [[/exhaust|tired|sleepy|no energy|low energy|drained|stress|hungover|didn.?t sleep|bad sleep/, 'tired'], [/sore|doms|stiff|achy|aching/, 'sore'],
         [/great|amazing|strong|energi|pumped|motivated|fresh|good|ready/, 'great'], [/\bok\b|okay|fine|normal|alright|meh/, 'ok']],
  where: [[/hotel gym|dumbbell|dumbell|\bdbs?\b|home gym/, 'db'], [/\bgym\b/, 'gym'], [/park|pull.?up bar|\bbars?\b|playground/, 'bar'],
          [/hotel|travel|airbnb|home|room|outside|no equipment|nothing|bodyweight/, 'bw']],
  focus: [[/glute|booty|\bbum\b|\bbutt/, 'Glutes'], [/leg|quad|hamstring|calf|calves|squat/, 'Legs'], [/full.?body|everything|whole body|total body/, 'Full Body'],
          [/upper/, 'Upper'], [/\barms?\b|bicep|tricep/, 'Arms'], [/chest|push|shoulder day|delts/, 'Push'], [/\bback\b(?! pain| hurt| is| feels)|pull|lats/, 'Pull'],
          [/\babs?\b|core|six.?pack/, 'Core'], [/cardio|hiit|sweat|conditioning|run|burn/, 'Cardio'], [/surprise|you (choose|pick|decide)|whatever|anything|don.?t know|no idea/, 'auto']],
  pain: [[/knee/, 'knee'], [/lower back|back (pain|hurt|is|feels)|my back/, 'back'], [/shoulder (pain|hurt|is)|my shoulder|shoulder hurts/, 'shoulder'], [/wrist/, 'wrist'], [/elbow/, 'elbow']],
};
function parseMessage(text){
  const t = ' ' + text.toLowerCase() + ' ', out = {};
  for (const [slot, rules] of Object.entries(LEX)) for (const [re, v] of rules) if (re.test(t)) { if (slot === 'pain') (out.pain = out.pain || []).includes(v) || out.pain.push(v); else if (!out[slot]) out[slot] = v; }
  const m = /(\d{2,3})\s*(?:min|mins|minutes|m\b)/.exec(t);
  if (m) out.time = Math.min(90, Math.max(15, +m[1]));
  else if (/half (an )?hour/.test(t)) out.time = 30; else if (/(an|1|one) hour/.test(t)) out.time = 60; else if (/quick|short|not much time|in a rush/.test(t)) out.time = 20;
  if (/start over|reset|restart|new chat/.test(t)) out.reset = true;
  return out;
}

// patterns / exercises to avoid per sore joint (conservative, like a coach would program around it)
const AVOID = {
  knee:     {p:['squat','lunge','quad','power'], ids:['jumpsq','burpee','jlunge','skater','boxjump','jjack','highknees','sissy']},
  back:     {p:['hinge','lowback'], ids:['squat','fsquat','bbrow','tbarrow','goodam','superman','thruster']},
  shoulder: {p:['vpush','dip'], ids:['bench','inclbench','uprow','pullover','archer','pseudopl','ttb']},
  wrist:    {p:['dip'], ids:['pushup','decline','archer','pseudopl','diamond','pike','elevpike','plank','shtaps','mclimb','burpee','renegade','fsquat']},
  elbow:    {p:['triceps','dip'], ids:['cgbench','skull','preacher']},
};
const avoidFn = pains => { if (!pains?.length) return null; const p = pains.flatMap(k => AVOID[k].p), ids = pains.flatMap(k => AVOID[k].ids); return e => p.includes(e.p) || ids.includes(e.id); };

// When the user says "you choose": the muscle group trained longest ago (from history), avoiding painful areas.
function autoFocus(pains){
  const pool = ['Legs','Glutes','Push','Pull','Upper','Full Body'].filter(c => !(pains?.includes('knee') && ['Legs','Glutes'].includes(c)) && !(pains?.includes('shoulder') && c === 'Push'));
  const last = c => Math.max(0, ...S.history.filter(h => (wById(h.src)?.cat || '') === c).map(h => h.start));
  return pool.sort((a, b) => last(a) - last(b))[0] || 'Full Body';
}
function coachFormat(feel, time){
  const goal = S.profile?.goal || 'muscle';
  if (feel === 'tired' || feel === 'sore') return 'classic';
  if (time <= 30) return goal === 'strength' ? 'classic' : 'superset';
  if (feel === 'great') return {strength:'five', muscle:'pyramid', lean:'superset', fat:'circuit', athletic:'circuit'}[goal] || 'classic';
  return 'classic';
}

function chatSay(text, quick){ UI.chat.msgs.push({from:'coach', text, quick}); }
function chatStart(){
  UI.chat = {slots:{}, msgs:[]};
  const name = S.profile ? GOALS[S.profile.goal].n.toLowerCase() : 'your goals';
  if (aiReady()) return chatSay(`Hey! 👋 I'm your coach. I'll build today's session around ${esc(name)}.<br><br><b>How are you feeling today?</b>`);
  chatSay(`Hey! 👋 I'll build today's session around ${esc(name)}. Tell me in your own words, e.g. <i>"tired, hotel room, legs, 30 min, knee hurts"</i>, or tap below.<br><br><b>How are you feeling today?</b>`, FEEL);
}
function chatNext(){
  const s = UI.chat.slots;
  if (!s.feel) return chatSay('<b>How are you feeling today?</b>', FEEL);
  if (!s.where) return chatSay('<b>Where are you training?</b>', WHERE);
  if (!s.focus) return chatSay('<b>What do you want to train?</b> Or let me pick based on what you did recently.', FOCUS_OPTS);
  if (!s.time) return chatSay('<b>How much time have you got?</b>', TIME_OPTS);
  chatBuild();
}
// extra (from the AI coach): include / exclude exercise ids and its own explanation
function chatBuild(extra = {}){
  const s = UI.chat.slots, pains = s.pain || [];
  let focus = s.focus === 'auto' ? autoFocus(pains) : s.focus;
  if (s.where === 'bw' && ['Arms','Pull'].includes(focus)) focus = 'Upper';
  const equip = equipFor(focus).includes(s.where) ? s.where : equipFor(focus).includes('db') && s.where !== 'gym' ? 'db' : 'gym';
  let time = s.time; if (s.feel === 'tired' && time > 45) time = 45;
  const format = ['Cardio','Core'].includes(focus) ? 'classic' : coachFormat(s.feel, time);
  const painAvoid = avoidFn(pains), exclude = extra.exclude || [];
  const w = generateWorkout(focus, equip, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, format, {avoid:e => exclude.includes(e.id) || !!(painAvoid && painAvoid(e))});
  // exercises the coach specifically wants: swap into the slot with the same movement, or add at the end
  for (const id of (extra.include || []).filter(id => EXMAP[id] && EQUIP[equip].ok(EXMAP[id]) && !(painAvoid && painAvoid(EXMAP[id])))) {
    if (w.ex.some(r => r[0] === id)) continue;
    const slot = w.ex.findIndex(r => exById(r[0]).p === EXMAP[id].p && !(extra.include || []).includes(r[0]));
    if (slot >= 0) w.ex[slot][0] = id; else w.ex.push([id, 3, EXMAP[id].t === 's' ? '30-45s' : '8-12', 75]);
  }
  if (extra.include?.length) w.n = `${focus}: ${w.ex.slice(0, 2).map(r => exById(r[0]).n.replace(/^(Barbell|Dumbbell|Cable|Machine|Seated|Standing|Bodyweight) /, '').replace(/ \(.*\)/, '')).join(' & ')}`;
  let list = w.fixed ? w.ex.map(x => [...x]) : applyGoal(w, w.ex.map(x => [...x]));
  if (s.feel === 'tired' || s.feel === 'sore') list = applyWeek(list, DELOAD_PHASE);
  list = trim(list, time);
  UI.chat.built = {w, list, time};
  const why = extra.reply ? [esc(extra.reply)] : [];
  if (!extra.reply) {
  if (s.focus === 'auto') why.push(`You haven't trained <b>${focus.toLowerCase()}</b> in a while, so that's today.`);
  if (s.feel === 'tired') why.push('You\'re tired, so it\'s <b>fewer sets, same quality</b>. Showing up is the win today. Stop if anything feels off.');
  if (s.feel === 'sore') why.push('You\'re sore, so it\'s <b>lighter volume</b> to get blood flowing without digging a deeper hole.');
  if (s.feel === 'great') why.push(`You feel great, so it's <b>${FORMATS[format].n.toLowerCase()}</b> today. Push the main lifts.`);
  if (pains.length) why.push(`I've <b>left out moves that load your ${pains.map(p => PAINS[p]).join(' and ')}</b>. If pain is sharp or lasts more than a few days, see a physio.`);
  if (equip !== s.where) why.push(`Adjusted to <b>${EQUIP[equip].n.toLowerCase()}</b> so the session has enough variety.`);
  }
  UI.chat.lastExtra = {include:extra.include, exclude:extra.exclude};
  chatSay(`${why.length && extra.reply ? why.join('<br>') + '<br><br>' : ''}Here's your plan: <b>${esc(w.n)}</b><br>⏱ ~${estMin(list)} min · ${list.length} exercises<br><span class="mut">${list.map(r => esc(exById(r[0]).n)).join(' · ')}</span>${why.length && !extra.reply ? '<br><br>' + why.join('<br>') : ''}`,
    {open:'▶ Open workout', again:'🎲 Another option', reset:'↺ Start over'});
}
function chatInput(text, quickKey){
  const c = UI.chat;
  if (quickKey) {
    if (quickKey === 'open') return chatOpen();
    if (quickKey === 'again') { c.msgs.push({from:'me', text:'Another option'}); return chatBuild(c.lastExtra || {}); }
    if (quickKey === 'reset') return chatStart();
    if (aiReady()) return aiSend(text);
    const s = c.slots, label = text;
    if (FEEL[quickKey] && !s.feel) s.feel = quickKey; else if (WHERE[quickKey] && !s.where) s.where = quickKey;
    else if (FOCUS_OPTS[quickKey] && !s.focus) s.focus = quickKey; else if (TIME_OPTS[quickKey] && !s.time) s.time = +quickKey;
    c.msgs.push({from:'me', text:label});
    return chatNext();
  }
  if (!text.trim()) return;
  if (aiReady() && !/start over|reset|restart/i.test(text)) return aiSend(text);
  c.msgs.push({from:'me', text:esc(text)});
  const p = parseMessage(text);
  if (p.reset) return chatStart();
  const got = Object.keys(p).filter(k => k !== 'pain');
  // free text after a plan is shown can change any slot
  Object.assign(c.slots, Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'pain')));
  if (p.pain) c.slots.pain = [...new Set([...(c.slots.pain || []), ...p.pain])];
  if (!got.length && !p.pain) { chatSay('Sorry, I didn\'t catch that. Try something like <i>"gym, glutes, 45 min"</i>, or tap a button.'); return chatNext(); }
  if (p.pain && !got.length) chatSay(`Noted. I'll avoid loading your ${p.pain.map(x => PAINS[x]).join(' and ')}.`);
  chatNext();
}
function chatOpen(){
  const {w, list} = UI.chat.built;
  UI.P = {w, list, mins:0, fin:false, phase:null}; open('preview');
}
function chatView(){
  const c = UI.chat, last = c.msgs[c.msgs.length - 1];
  return `<div class="row"><h1 class="sp">Your <em>coach</em></h1><button class="btn s" data-a="chatnew">↺ New</button></div>
    <div class="tag" style="margin-top:-10px">${aiReady() ? '✨ AI coach · free' : 'Built-in coach · works offline'}</div>
    <div class="chat">${c.msgs.map(m => `<div class="msg ${m.from}">${m.text}</div>`).join('')}${c.pending ? '<div class="msg coach mut">Coach is typing…</div>' : ''}</div>
    ${last?.quick ? `<div class="quick">${Object.entries(last.quick).map(([k, v]) => `<button class="chip ${['open'].includes(k) ? 'on' : ''}" data-a="chatq" data-k="${k}">${v}</button>`).join('')}</div>` : ''}
    <div class="row chatbar"><input id="chatin" placeholder="e.g. tired, gym, legs, 45 min" autocomplete="off" enterkeyhint="send"><button class="btn pri s" data-a="chatsend">Send</button></div>`;
}

// ---------- AI coach (Cloudflare Workers AI free allowance, via your helper) ----------
const aiReady = () => cloudOn() && SESSION && navigator.onLine && /^https:\/\//.test(S.settings.helper || '') && !UI.chat?.aiOff;
function aiSystemPrompt(){
  const p = S.profile, g = p ? GOALS[p.goal] : null, st = typeof programState === 'function' ? programState() : null;
  const recent = S.history.slice(-6).map(h => `${new Date(h.start).toDateString()}: ${h.name}`).join('\n') || 'none yet';
  const catalog = EXERCISES.map(e => `${e.id}|${e.n}|${e.p}|${e.e}`).join('\n');
  return `You are Rep Lab's personal trainer: a certified strength & conditioning coach with 10+ years of experience. Warm, direct, evidence-based, never preachy. Keep replies to 2-4 short sentences.
How you work, like a real coach in a consultation:
1. Before building ANY workout you must know four things the client has actually told you in this chat (never assume or fill in defaults): (a) how they feel / energy today, (b) where they are or what equipment they have, (c) what they want to train, or that they want you to choose, (d) how much time they have.
2. If anything is missing, ask about ONE missing thing per message, naturally, reacting to what they just said (e.g. "Tired days still count. Where are you training?"). Offer 2-4 short quick-reply options. If they mention feeling tired or sore, also check gently whether anything hurts.
3. Think like a coach: their goal, their recent workouts (don't hammer the same muscles two days running), recovery, and time available. Tired = moderate effort and fewer sets, never skip warm-up. "You choose" = what they've trained least recently.
4. Only when all four are known, use action "build" and explain your reasoning in 2-3 sentences.
5. For sharp or persistent pain, recommend a physio and train around it. Never diagnose.

Client: ${p ? `${g.n} goal, ${LEVELS[p.level]}, trains ${p.days}x/week, usual session ${p.mins} min, ${p.sex === 'f' ? 'female' : 'male'}, ${p.age}y, ${p.kg}kg` : 'no profile'}.${st && !st.finished ? ` On program "${st.P.n}", week ${st.week + 1} (${st.phase.n}).` : ''}${deloadActive() ? ' Currently in a deload week.' : ''}
Today: ${new Date().toDateString()}. Recent workouts:
${recent}

ALWAYS answer with ONLY one JSON object, no other text. Use null for anything the client has not told you:
{"reply":"what you say to the client","action":"ask" or "build","quick":["up to 4 short tap-to-answer options, only when asking"],
 "feel":"great|ok|tired|sore","where":"gym|db|bw|bar","focus":"Legs|Glutes|Push|Pull|Upper|Arms|Full Body|Core|Cardio|Calisthenics|Travel|auto",
 "time":minutes,"pain":["knee|back|shoulder|wrist|elbow"],"include":["exercise ids you specifically want"],"exclude":["exercise ids to avoid"]}
where: gym = full gym, db = dumbbells only, bw = no equipment, bar = bodyweight + pull-up bar. For "build", fill every field you can; the app builds the workout from these fields and the catalog, applying the client's goal, sets, reps and rest. Only use ids from this catalog (id|name|movement|equipment, equipment: bb barbell, db dumbbell, mach machine, cable, bar, kb, bw none):
${catalog}`;
}
async function aiSend(text){
  const c = UI.chat;
  c.msgs.push({from:'me', text:esc(text)});
  c.ai = [...(c.ai || []), {role:'user', content:text}];
  c.pending = true; if (UI.tab === 'coach') render();
  try {
    const token = await accessToken(); if (!token) throw new Error('auth');
    const r = await fetch(S.settings.helper.replace(/\/$/, '') + '/coach', {method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer ' + token},
      body:JSON.stringify({system:aiSystemPrompt(), messages:c.ai.slice(-12)})});
    const j = await r.json(); if (!r.ok || !j.text) throw new Error(j.error || 'AI unavailable');
    const o = JSON.parse((j.text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    if (!o.reply) throw new Error('bad reply');
    c.ai.push({role:'assistant', content:JSON.stringify(o)});
    const pick = (v, ok) => ok.includes(v) ? v : undefined;
    const slots = {feel:pick(o.feel, Object.keys(FEEL)), where:pick(o.where, Object.keys(WHERE)), focus:pick(o.focus, [...Object.keys(FOCUS_OPTS), 'Calisthenics', 'Travel']),
      time:+o.time > 0 ? Math.min(90, Math.max(15, Math.round(+o.time))) : undefined, pain:(o.pain || []).filter(x => PAINS[x])};
    Object.entries(slots).forEach(([k, v]) => { if (v !== undefined && !(Array.isArray(v) && !v.length)) c.slots[k] = v; });
    const missing = ['feel', 'where', 'focus', 'time'].find(k => !c.slots[k]);
    if (o.action === 'build' && missing) {
      const ask = {feel:['How are you feeling today?', FEEL], where:['Where are you training today?', WHERE], focus:['What would you like to train? Or I can choose.', FOCUS_OPTS], time:['How much time have you got?', TIME_OPTS]}[missing];
      c.ai.push({role:'assistant', content:JSON.stringify({reply:ask[0], action:'ask'})});
      chatSay(`${o.reply && missing !== 'feel' ? esc(o.reply.split(/(?<=[.!?])\s/)[0]) + ' ' : ''}<b>${ask[0]}</b>`, ask[1]);
    } else if (o.action === 'build') {
      chatBuild({reply:o.reply, include:(o.include || []).filter(id => EXMAP[id]), exclude:(o.exclude || []).filter(id => EXMAP[id])});
    } else chatSay(esc(o.reply), Array.isArray(o.quick) && o.quick.length ? Object.fromEntries(o.quick.slice(0, 4).map(q => [`ai:${String(q).slice(0, 40)}`, esc(String(q).slice(0, 40))])) : undefined);
  } catch(e) {
    // fall back to the built-in coach for the rest of this chat
    c.aiOff = true; c.msgs.pop();
    chatSay(`<span class="mut">${e.message === 'auth' ? 'Log in again to use the AI coach.' : 'AI coach unavailable right now.'} Switching to the built-in coach.</span>`);
    chatInput(text);
  }
  c.pending = false; if (UI.tab === 'coach') render();
}
