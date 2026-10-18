// Workout generator: fills a coach-style template of movement slots from the exercise library. No AI, just rules.
// Each slot lists the movement patterns that may fill it, in a trainer's usual order (big lifts first).
const TEMPLATES = {
  'Legs':         [['squat'], ['hinge'], ['lunge'], ['quad','ham'], ['ham','glute'], ['calf'], ['core','corehold']],
  'Glutes':       [['glute'], ['hinge'], ['lunge'], ['glute'], ['ham'], ['glute','lowback']],
  'Push':         [['hpush'], ['vpush'], ['hpush','dip'], ['chestiso'], ['latraise'], ['triceps'], ['triceps']],
  'Pull':         [['vpull'], ['hpull'], ['vpull','hpull'], ['latiso','reardelt'], ['reardelt','traps'], ['biceps'], ['biceps']],
  'Upper':        [['hpush'], ['hpull'], ['vpush'], ['vpull'], ['latraise','reardelt'], ['biceps'], ['triceps']],
  'Arms':         [['triceps'], ['biceps'], ['triceps'], ['biceps'], ['triceps'], ['biceps']],
  'Full Body':    [['squat'], ['hpush'], ['hpull'], ['hinge'], ['vpush','vpull'], ['lunge'], ['core','corehold']],
  'Core':         [['core'], ['corehold'], ['core'], ['corehold'], ['core']],
  'Cardio':       [['cardio'], ['cardio'], ['cardio'], ['cardio']],
  'Calisthenics': [['vpull'], ['dip','hpush'], ['hpull'], ['vpush'], ['lunge','squat'], ['core','corehold']],
  'Travel':       [['squat','lunge'], ['hpush'], ['hinge','glute'], ['vpush'], ['lunge'], ['hpull'], ['corehold','core'], ['cardio']],
};
const EQUIP = {
  gym: {n:'Full gym',         ok:e => true},
  db:  {n:'Dumbbells',        ok:e => ['db','kb','bw'].includes(e.e)},
  bar: {n:'Bodyweight + bar', ok:e => ['bw','bar'].includes(e.e)},
  bw:  {n:'No equipment',     ok:e => e.e === 'bw'},
};
// Equipment options that give enough variety for each category
const EQUIP_FOR = {'Arms':['gym','db'], 'Pull':['gym','db','bar'], 'Push':['gym','db','bar','bw'], 'Cardio':['gym','bw']};
const equipFor = cat => EQUIP_FOR[cat] || Object.keys(EQUIP);
// Training formats a coach rotates between. Each one re-prescribes sets / reps / rest.
const FORMATS = {
  classic:  {n:'Classic',     d:'Straight sets: finish all sets of one exercise, then move on.'},
  superset: {n:'Supersets',   d:'Do exercises in pairs (1+2, 3+4…) back to back, rest after each pair. Same work, less time.'},
  circuit:  {n:'Circuit',     d:'One set of each exercise in a row with ~15s between, rest 90s, repeat for 3–4 rounds.'},
  five:     {n:'5×5 Strength', d:'Main lifts 5 sets of 5 at a heavy weight with long rests, then lighter accessories.'},
  pump:     {n:'Pump',        d:'Higher reps, short rests, chasing the burn. Great for shape and conditioning.'},
  pyramid:  {n:'Pyramid',     d:'Main lifts: 12, 10, 8, 6 reps, adding weight every set.'},
};
function applyFormat(list, f){
  return list.map(([id, s, r, rest], i) => {
    const x = exById(id), main = i < 2, timed = x.t === 's';
    if (f === 'superset') return [id, 3, r, i % 2 === 0 && i < list.length - 1 ? 10 : 90];
    if (f === 'circuit') return [id, 4, timed ? '40s' : x.t === 'w' ? '10-12' : '12-15', i === list.length - 1 ? 90 : 15];
    if (f === 'five' && main && !timed) return [id, 5, '5', 180];
    if (f === 'pump') return [id, 3, timed ? '45s' : '12-20', 45];
    if (f === 'pyramid' && main && !timed) return [id, 4, '12-10-8-6', 120];
    return [id, s, r, rest];
  });
}
const defaultEquip = cat => cat === 'Travel' ? 'bw' : cat === 'Calisthenics' ? 'bar' : 'gym';
const GENERATED = {};

// mulberry32: small, well-mixed PRNG so nearby seeds give very different workouts
function seededRandom(seed){ return () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// "No machine?" swaps: closest same-movement exercise for the equipment you actually have
const SWAP_KINDS = {db:{n:'Dumbbells', ok:e => ['db','kb'].includes(e.e)}, bw:{n:'Bodyweight', ok:e => e.e === 'bw'}, bar:{n:'Barbell / bar', ok:e => ['bb','bar'].includes(e.e)}};
const RELATED = {squat:['lunge','quad'], lunge:['squat','glute'], hinge:['glute','ham'], hpush:['dip','chestiso'], vpush:['latraise','hpush'], chestiso:['hpush'], latiso:['vpull','hpull'], quad:['squat','lunge'], ham:['hinge','glute'], glute:['hinge','lunge'], lowback:['hinge'],
  latraise:['vpush'], reardelt:['hpull'], vpull:['hpull'], hpull:['vpull'], calf:[], traps:['hpull'], scap:['vpull'], core:['corehold'], corehold:['core'], dip:['hpush','triceps'], triceps:['dip','hpush'], biceps:['vpull']};
const EQN = {bb:'Barbell', db:'Dumbbells', kb:'Kettlebell', mach:'Machine', cable:'Cable', bar:'Pull-up bar', bw:'Bodyweight'};
const EQ_FILTERS = {all:['All', () => true], db:['Dumbbells', e => ['db','kb'].includes(e.e)], bw:['Bodyweight', e => e.e === 'bw' || e.e === 'bar'], bb:['Barbell', e => e.e === 'bb'], mach:['Machine', e => e.e === 'mach'], cable:['Cable', e => e.e === 'cable']};
// every sensible replacement: same movement first, then related movements
function swapOptions(id){
  const x = exById(id), seen = new Set([id]), out = [];
  for (const p of [x.p, ...(RELATED[x.p] || [])]) for (const e of [...S.exercises, ...EXERCISES]) if (e.p === p && !seen.has(e.id)) { seen.add(e.id); out.push({e, same:p === x.p}); }
  return out;
}
const needsMachine = x => x.e === 'mach' || x.e === 'cable';
function swapFor(id, kind, taken = []){
  const x = exById(id), ok = SWAP_KINDS[kind].ok;
  for (const p of [x.p, ...(RELATED[x.p] || [])]) { const hit = EXERCISES.find(e => e.p === p && e.id !== id && !taken.includes(e.id) && ok(e)); if (hit) return hit; }
  return null;
}
// taken = exercises already in this workout, so a swap never duplicates one
const swapRow = (id, act, i, taken = []) => { const x = exById(id); if (!needsMachine(x)) return '';
  const opts = Object.entries(SWAP_KINDS).map(([k, v]) => [k, v, swapFor(id, k, taken)]).filter(o => o[2]);
  return opts.length ? `<div class="swaprow"><span class="sm mut">No ${x.e === 'cable' ? 'cable' : 'machine'}?</span>${opts.map(([k, v, e]) => `<button class="chip s" data-a="${act}" data-i="${i}" data-v="${e.id}" title="${esc(e.n)}">${v.n}</button>`).join('')}</div>` : ''; };

function generateWorkout(cat, equip, seed, format = 'classic', opts = {}){
  const rand = seededRandom(seed), used = new Set(), list = [];
  const recent = new Set(S.history.slice(-3).flatMap(h => h.ex.map(e => e.id)));
  const heavy = equip === 'gym' || equip === 'db';
  (TEMPLATES[cat] || TEMPLATES['Full Body']).forEach((slot, i) => {
    let pool = EXERCISES.filter(e => slot.includes(e.p) && EQUIP[equip].ok(e) && !used.has(e.id) && !(opts.avoid && opts.avoid(e)));
    const main = i < 2 && !['Core','Cardio'].includes(cat);
    if (main && heavy) { const loaded = pool.filter(e => e.t === 'w'); if (loaded.length) pool = loaded; }
    const fresh = pool.filter(e => !recent.has(e.id)); if (fresh.length) pool = fresh;
    if (!pool.length) return;
    const x = pool[Math.floor(rand() * pool.length)]; used.add(x.id);
    const timed = x.t === 's';
    const reps = timed ? (x.p === 'cardio' ? '40s' : '30-45s') : main ? (x.t === 'w' ? '6-10' : '6-12') : x.t === 'w' ? '10-15' : '10-20';
    list.push([x.id, main ? 4 : 3, reps, timed ? 30 : main ? 120 : 60]);
  });
  const final = applyFormat(list, format);
  const short = id => exById(id).n.replace(/^(Barbell|Dumbbell|Cable|Machine|Seated|Standing|Bodyweight) /, '').replace(/ \(.*\)/, '');
  const w = {id:`gen-${seed}`, n:`${cat}${format !== 'classic' ? ' ' + FORMATS[format].n : ''}: ${final.slice(0, 2).map(r => short(r[0])).join(' & ')}`, cat,
    d:`${FORMATS[format].d} (${EQUIP[equip].n.toLowerCase()})`, ex:final, gen:true, equip, format, fixed:format !== 'classic'};
  GENERATED[w.id] = w;
  return w;
}
