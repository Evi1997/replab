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
function chatBuild(){
  const s = UI.chat.slots, pains = s.pain || [];
  let focus = s.focus === 'auto' ? autoFocus(pains) : s.focus;
  if (s.where === 'bw' && ['Arms','Pull'].includes(focus)) focus = 'Upper';
  const equip = equipFor(focus).includes(s.where) ? s.where : equipFor(focus).includes('db') && s.where !== 'gym' ? 'db' : 'gym';
  let time = s.time; if (s.feel === 'tired' && time > 45) time = 45;
  const format = ['Cardio','Core'].includes(focus) ? 'classic' : coachFormat(s.feel, time);
  const w = generateWorkout(focus, equip, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, format, {avoid:avoidFn(pains)});
  let list = w.fixed ? w.ex.map(x => [...x]) : applyGoal(w, w.ex.map(x => [...x]));
  if (s.feel === 'tired' || s.feel === 'sore') list = applyWeek(list, DELOAD_PHASE);
  list = trim(list, time);
  UI.chat.built = {w, list, time};
  const why = [];
  if (s.focus === 'auto') why.push(`You haven't trained <b>${focus.toLowerCase()}</b> in a while, so that's today.`);
  if (s.feel === 'tired') why.push('You\'re tired, so it\'s <b>fewer sets, same quality</b>. Showing up is the win today. Stop if anything feels off.');
  if (s.feel === 'sore') why.push('You\'re sore, so it\'s <b>lighter volume</b> to get blood flowing without digging a deeper hole.');
  if (s.feel === 'great') why.push(`You feel great, so it's <b>${FORMATS[format].n.toLowerCase()}</b> today. Push the main lifts.`);
  if (pains.length) why.push(`I've <b>left out moves that load your ${pains.map(p => PAINS[p]).join(' and ')}</b>. If pain is sharp or lasts more than a few days, see a physio.`);
  if (equip !== s.where) why.push(`Adjusted to <b>${EQUIP[equip].n.toLowerCase()}</b> so the session has enough variety.`);
  chatSay(`Here's your plan: <b>${esc(w.n)}</b><br>⏱ ~${estMin(list)} min · ${list.length} exercises<br><span class="mut">${list.map(r => esc(exById(r[0]).n)).join(' · ')}</span>${why.length ? '<br><br>' + why.join('<br>') : ''}`,
    {open:'▶ Open workout', again:'🎲 Another option', reset:'↺ Start over'});
}
function chatInput(text, quickKey){
  const c = UI.chat;
  if (quickKey) {
    if (quickKey === 'open') return chatOpen();
    if (quickKey === 'again') { c.msgs.push({from:'me', text:'Another option'}); return chatBuild(); }
    if (quickKey === 'reset') return chatStart();
    const s = c.slots, label = text;
    if (FEEL[quickKey] && !s.feel) s.feel = quickKey; else if (WHERE[quickKey] && !s.where) s.where = quickKey;
    else if (FOCUS_OPTS[quickKey] && !s.focus) s.focus = quickKey; else if (TIME_OPTS[quickKey] && !s.time) s.time = +quickKey;
    c.msgs.push({from:'me', text:label});
    return chatNext();
  }
  if (!text.trim()) return;
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
  return `<div class="tag">Coach chat · no AI, works offline</div>
    <div class="chat">${c.msgs.map(m => `<div class="msg ${m.from}">${m.text}</div>`).join('')}</div>
    ${last?.quick ? `<div class="quick">${Object.entries(last.quick).map(([k, v]) => `<button class="chip ${['open'].includes(k) ? 'on' : ''}" data-a="chatq" data-k="${k}">${v}</button>`).join('')}</div>` : ''}
    <div class="row chatbar"><input id="chatin" placeholder="e.g. tired, gym, legs, 45 min" autocomplete="off" enterkeyhint="send"><button class="btn pri s" data-a="chatsend">Send</button></div>`;
}
