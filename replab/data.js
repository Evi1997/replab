// Exercise library. t: w = weight × reps, r = bodyweight reps (optional added kg), s = seconds
// e: equipment (bb barbell, db dumbbell, mach machine, cable, bar pull-up/dip bars, kb kettlebell, bw none)
// p: movement pattern — exercises with the same pattern are swappable
const EXERCISES = [
  // Legs
  ['squat','Back Squat','squat','bb','w','Quads, glutes'],
  ['fsquat','Front Squat','squat','bb','w','Quads, core'],
  ['hacksq','Hack Squat','squat','mach','w','Quads'],
  ['legpress','Leg Press','squat','mach','w','Quads, glutes'],
  ['gobsq','Goblet Squat','squat','db','w','Quads, glutes'],
  ['bwsq','Bodyweight Squat','squat','bw','r','Quads, glutes'],
  ['jumpsq','Jump Squat','squat','bw','r','Quads, power'],
  ['bss','Bulgarian Split Squat','lunge','db','w','Quads, glutes'],
  ['bwbss','Bulgarian Split Squat (bodyweight)','lunge','bw','r','Quads, glutes'],
  ['wlunge','Walking Lunge','lunge','db','w','Quads, glutes'],
  ['stepup','Step-Up','lunge','db','w','Quads, glutes'],
  ['revlunge','Reverse Lunge','lunge','bw','r','Quads, glutes'],
  ['cossack','Cossack Squat','lunge','bw','r','Adductors, quads'],
  ['legext','Leg Extension','quad','mach','w','Quads'],
  ['sissy','Sissy Squat','quad','bw','r','Quads'],
  ['wallsit','Wall Sit','quad','bw','s','Quads'],
  ['dl','Deadlift','hinge','bb','w','Posterior chain'],
  ['rdl','Romanian Deadlift','hinge','bb','w','Hamstrings, glutes'],
  ['dbrdl','Dumbbell RDL','hinge','db','w','Hamstrings, glutes'],
  ['kbswing','Kettlebell Swing','hinge','kb','w','Glutes, hamstrings'],
  ['slrdl','Single-Leg RDL','hinge','bw','r','Hamstrings, balance'],
  ['hipthrust','Hip Thrust','glute','bb','w','Glutes'],
  ['abduct','Hip Abduction Machine','glute','mach','w','Glutes'],
  ['sglute','Single-Leg Glute Bridge','glute','bw','r','Glutes'],
  ['legcurl','Lying Leg Curl','ham','mach','w','Hamstrings'],
  ['sleglcurl','Seated Leg Curl','ham','mach','w','Hamstrings'],
  ['nordic','Nordic Curl (negatives)','ham','bw','r','Hamstrings'],
  ['backext','Back Extension','lowback','mach','r','Lower back, glutes'],
  ['superman','Superman Raise','lowback','bw','r','Lower back'],
  ['calf','Standing Calf Raise','calf','mach','w','Calves'],
  ['scalf','Seated Calf Raise','calf','mach','w','Calves'],
  ['slcalf','Single-Leg Calf Raise','calf','bw','r','Calves'],
  // Push
  ['bench','Bench Press','hpush','bb','w','Chest, triceps'],
  ['inclbench','Incline Bench Press','hpush','bb','w','Upper chest'],
  ['dbbench','Dumbbell Bench Press','hpush','db','w','Chest'],
  ['incdb','Incline Dumbbell Press','hpush','db','w','Upper chest'],
  ['mchest','Machine Chest Press','hpush','mach','w','Chest'],
  ['pushup','Push-Up','hpush','bw','r','Chest, triceps'],
  ['decline','Decline Push-Up','hpush','bw','r','Upper chest'],
  ['archer','Archer Push-Up','hpush','bw','r','Chest, unilateral'],
  ['pseudopl','Pseudo Planche Push-Up','hpush','bw','r','Chest, front delts'],
  ['fly','Cable Fly','chestiso','cable','w','Chest'],
  ['pecdeck','Pec Deck','chestiso','mach','w','Chest'],
  ['ohp','Overhead Press','vpush','bb','w','Shoulders'],
  ['dbohp','Seated Dumbbell Press','vpush','db','w','Shoulders'],
  ['pike','Pike Push-Up','vpush','bw','r','Shoulders'],
  ['elevpike','Elevated Pike Push-Up','vpush','bw','r','Shoulders'],
  ['dip','Dip','dip','bar','r','Chest, triceps'],
  ['wdip','Weighted Dip','dip','bar','w','Chest, triceps'],
  ['chairdip','Chair Dip','dip','bw','r','Triceps'],
  ['lat','Lateral Raise','latraise','db','w','Side delts'],
  ['clat','Cable Lateral Raise','latraise','cable','w','Side delts'],
  // Pull
  ['pullup','Pull-Up','vpull','bar','r','Lats, biceps'],
  ['chinup','Chin-Up','vpull','bar','r','Lats, biceps'],
  ['wpullup','Weighted Pull-Up','vpull','bar','w','Lats, biceps'],
  ['pulldown','Lat Pulldown','vpull','cable','w','Lats'],
  ['bbrow','Barbell Row','hpull','bb','w','Upper back, lats'],
  ['dbrow','One-Arm Dumbbell Row','hpull','db','w','Lats'],
  ['cablerow','Seated Cable Row','hpull','cable','w','Mid back'],
  ['csrow','Chest-Supported Row','hpull','mach','w','Upper back'],
  ['invrow','Inverted Row','hpull','bar','r','Upper back'],
  ['towelrow','Doorframe Towel Row','hpull','bw','r','Upper back'],
  ['pullover','Cable Pullover','latiso','cable','w','Lats'],
  ['scappull','Scap Pull-Up','scap','bar','r','Scapular control'],
  ['facepull','Face Pull','reardelt','cable','w','Rear delts'],
  ['rdelt','Reverse Pec Deck','reardelt','mach','w','Rear delts'],
  ['ytw','Prone Y-T-W Raise','reardelt','bw','r','Rear delts, traps'],
  ['shrug','Dumbbell Shrug','traps','db','w','Traps'],
  ['deadhang','Dead Hang','grip','bar','s','Grip, shoulders'],
  ['farmer','Farmer\'s Carry','grip','db','w','Grip, traps'],
  // Arms
  ['bbcurl','Barbell Curl','biceps','bb','w','Biceps'],
  ['ezcurl','EZ-Bar Curl','biceps','bb','w','Biceps'],
  ['incurl','Incline Dumbbell Curl','biceps','db','w','Biceps (long head)'],
  ['hammer','Hammer Curl','biceps','db','w','Brachialis, forearms'],
  ['ccurl','Cable Curl','biceps','cable','w','Biceps'],
  ['preacher','Preacher Curl','biceps','mach','w','Biceps'],
  ['pushdown','Triceps Pushdown','triceps','cable','w','Triceps'],
  ['ropepd','Rope Pushdown','triceps','cable','w','Triceps'],
  ['ohtri','Overhead Cable Extension','triceps','cable','w','Triceps (long head)'],
  ['skull','Skull Crusher','triceps','bb','w','Triceps'],
  ['cgbench','Close-Grip Bench Press','triceps','bb','w','Triceps, chest'],
  ['diamond','Diamond Push-Up','triceps','bw','r','Triceps'],
  // Core
  ['hlr','Hanging Leg Raise','core','bar','r','Abs, hip flexors'],
  ['hkr','Hanging Knee Raise','core','bar','r','Abs'],
  ['ttb','Toes-to-Bar','core','bar','r','Abs'],
  ['abwheel','Ab Wheel Rollout','core','bw','r','Abs'],
  ['cabcrunch','Cable Crunch','core','cable','w','Abs'],
  ['legraise','Lying Leg Raise','core','bw','r','Lower abs'],
  ['plank','Plank','corehold','bw','s','Core'],
  ['sideplank','Side Plank','corehold','bw','s','Obliques'],
  ['hollow','Hollow Body Hold','corehold','bw','s','Core'],
  ['shtaps','Plank Shoulder Taps','corehold','bw','r','Core, anti-rotation'],
  // Conditioning
  ['burpee','Burpee','cardio','bw','r','Full body'],
  ['mclimb','Mountain Climbers','cardio','bw','s','Core, cardio'],
  ['highknees','High Knees','cardio','bw','s','Cardio'],
  ['jlunge','Jumping Lunges','cardio','bw','s','Legs, cardio'],
  ['jumprope','Jump Rope','cardio','bw','s','Cardio, calves'],
].map(([id,n,p,e,t,m]) => ({id,n,p,e,t,m}));

// Workouts: [exerciseId, sets, reps, restSeconds]. Order = priority (trimmed from the end for shorter sessions).
const WORKOUTS = [
  // ---- GYM ----
  {id:'legs-q',n:'Legs: Quad Day',cat:'Legs',d:'Heavy squats first, then volume for quads and calves.',ex:[
    ['squat',4,'5-8',180],['legpress',3,'10-12',120],['bss',3,'8-10',90],['legext',3,'12-15',60],['sleglcurl',3,'10-12',60],['calf',4,'10-15',60],['hkr',3,'12-15',45]]},
  {id:'legs-p',n:'Legs: Glutes & Hamstrings',cat:'Legs',d:'Hinge-focused lower day.',ex:[
    ['rdl',4,'6-10',150],['hipthrust',4,'8-12',120],['wlunge',3,'10/leg',90],['legcurl',3,'10-12',60],['backext',3,'12-15',60],['abduct',3,'15-20',45],['scalf',3,'12-15',45]]},
  {id:'push-a',n:'Push: Chest & Shoulders',cat:'Push',d:'Bench-led push day with plenty of shoulder and triceps volume.',ex:[
    ['bench',4,'5-8',180],['ohp',3,'6-10',150],['incdb',3,'8-12',90],['lat',4,'12-20',45],['fly',3,'12-15',60],['ropepd',3,'10-15',60],['ohtri',3,'10-12',60]]},
  {id:'pull-a',n:'Pull: Back & Biceps',cat:'Pull',d:'Vertical and horizontal pulling, then rear delts and arms.',ex:[
    ['wpullup',4,'5-8',150],['bbrow',4,'6-10',120],['pulldown',3,'10-12',90],['cablerow',3,'10-12',90],['facepull',3,'15-20',45],['bbcurl',3,'8-12',60],['hammer',3,'10-12',60]]},
  {id:'upper-a',n:'Upper Body Strength',cat:'Upper',d:'Balanced push/pull, heavier rep ranges.',ex:[
    ['bench',4,'4-6',180],['bbrow',4,'5-8',150],['ohp',3,'6-8',120],['pulldown',3,'8-10',90],['lat',3,'12-15',45],['ezcurl',3,'10-12',60],['pushdown',3,'10-12',60]]},
  {id:'upper-b',n:'Upper Body Hypertrophy',cat:'Upper',d:'Dumbbells and cables, higher reps, more pump.',ex:[
    ['incdb',4,'8-12',90],['csrow',4,'8-12',90],['dbohp',3,'10-12',90],['pulldown',3,'10-12',90],['pecdeck',3,'12-15',60],['rdelt',3,'15-20',45],['incurl',3,'10-12',60],['ohtri',3,'12-15',60]]},
  {id:'lower-a',n:'Lower Body Strength',cat:'Legs',d:'Squat + deadlift day.',ex:[
    ['squat',4,'4-6',180],['dl',3,'3-5',180],['bss',3,'8/leg',90],['legcurl',3,'10-12',60],['calf',4,'8-12',60],['abwheel',3,'8-12',60]]},
  {id:'arms',n:'Arms Pump',cat:'Arms',d:'Biceps/triceps supersets. Pair them back to back.',ex:[
    ['cgbench',3,'6-10',120],['ezcurl',3,'8-12',60],['skull',3,'10-12',60],['incurl',3,'10-12',60],['ropepd',3,'12-15',45],['hammer',3,'12',45],['ohtri',3,'12-15',45],['ccurl',2,'15-20',45]]},
  {id:'shoulders',n:'Shoulders & Abs',cat:'Push',d:'Boulder shoulders, rear delts and core.',ex:[
    ['ohp',4,'5-8',150],['dbohp',3,'8-12',90],['lat',4,'12-20',45],['clat',3,'12-15',45],['facepull',3,'15-20',45],['shrug',3,'10-15',60],['hlr',3,'10-15',60],['cabcrunch',3,'12-15',45]]},
  {id:'chest-back',n:'Chest & Back',cat:'Upper',d:'Antagonist pairs: one push, one pull.',ex:[
    ['inclbench',4,'6-10',120],['wpullup',4,'6-8',120],['dbbench',3,'8-12',90],['dbrow',3,'8-12',90],['fly',3,'12-15',60],['pullover',3,'12-15',60],['wdip',3,'8-12',90]]},
  {id:'fb-strength',n:'Full Body Strength',cat:'Full Body',d:'The big lifts in one session.',ex:[
    ['squat',4,'5',180],['bench',4,'5',180],['bbrow',3,'6-8',120],['rdl',3,'8',120],['pullup',3,'max',90],['plank',3,'45s',45]]},
  {id:'fb-hyper',n:'Full Body Dumbbell',cat:'Full Body',d:'One rack of dumbbells is all you need.',ex:[
    ['gobsq',4,'10-12',90],['dbbench',4,'8-12',90],['dbrow',4,'10-12',90],['dbrdl',3,'10-12',90],['dbohp',3,'10-12',90],['hammer',3,'12',60],['farmer',3,'40m',60]]},
  // ---- CALISTHENICS ----
  {id:'cali-pull',n:'Calisthenics Pull',cat:'Calisthenics',d:'Bar work. Pinned skills are added on top automatically.',ex:[
    ['scappull',2,'10',60],['pullup',4,'6-10',120],['chinup',3,'6-10',90],['invrow',3,'10-15',75],['hlr',3,'8-12',60],['deadhang',2,'30-60s',60]]},
  {id:'cali-push',n:'Calisthenics Push',cat:'Calisthenics',d:'Dips, push-up variations and pike work.',ex:[
    ['dip',4,'8-12',120],['pseudopl',3,'8-10',90],['elevpike',3,'6-10',90],['archer',3,'5/side',75],['diamond',3,'10-15',60],['hollow',3,'20-40s',45]]},
  {id:'cali-full',n:'Calisthenics Full Body',cat:'Calisthenics',d:'Pull, push, legs and core with bodyweight only.',ex:[
    ['pullup',4,'6-10',120],['dip',4,'8-12',120],['bwbss',3,'10/leg',90],['invrow',3,'10-15',75],['pike',3,'8-12',75],['nordic',3,'3-6',90],['ttb',3,'6-10',60]]},
  {id:'hybrid',n:'Hybrid: Weighted Calisthenics',cat:'Calisthenics',d:'Weighted pull-ups and dips with barbell legs. Strength plus skill.',ex:[
    ['wpullup',4,'4-6',180],['wdip',4,'5-8',150],['squat',3,'5-8',150],['rdl',3,'8',120],['hlr',3,'10',60],['lat',3,'15',45]]},
  // ---- TRAVEL (no equipment) ----
  {id:'tr-full',n:'Hotel Room Full Body',cat:'Travel',d:'No equipment. Do it in any room.',ex:[
    ['pushup',4,'12-20',60],['bwbss',3,'12/leg',60],['pike',3,'8-12',60],['slrdl',3,'10/leg',45],['towelrow',3,'12-15',60],['sglute',3,'12/leg',45],['plank',3,'45-60s',30]]},
  {id:'tr-legs',n:'Travel Legs Burner',cat:'Travel',d:'High-rep, unilateral and plyo work to make up for no weights.',ex:[
    ['bwbss',4,'12-15/leg',60],['jumpsq',4,'12',60],['cossack',3,'8/side',60],['slrdl',3,'12/leg',45],['wallsit',3,'45-60s',45],['slcalf',3,'15-20/leg',30],['sissy',3,'10-15',45]]},
  {id:'tr-upper',n:'Travel Upper Body',cat:'Travel',d:'Push-up variations and towel rows.',ex:[
    ['decline',4,'10-15',60],['towelrow',4,'12-15',60],['elevpike',3,'8-12',60],['archer',3,'6/side',60],['chairdip',3,'12-20',45],['ytw',3,'8 each',45],['shtaps',3,'20',30]]},
  {id:'tr-hiit',n:'20-Min HIIT',cat:'Travel',d:'40s on / 20s off. Go round the circuit 4 times.',ex:[
    ['burpee',4,'40s',20],['mclimb',4,'40s',20],['jlunge',4,'40s',20],['highknees',4,'40s',20],['hollow',4,'30s',20]]},
  {id:'tr-core',n:'Travel Core',cat:'Travel',d:'15-minute abs and lower back.',ex:[
    ['hollow',3,'30s',30],['legraise',3,'12-15',30],['sideplank',3,'30s/side',30],['shtaps',3,'20',30],['superman',3,'12',30]]},
];

// 5-day splits for the "Up next" card
const SPLITS = {
  ul_ppl: {n:'Upper / Lower / Push / Pull / Legs', seq:['upper-a','lower-a','push-a','pull-a','legs-q']},
  hybrid: {n:'Gym + Calisthenics hybrid', seq:['push-a','pull-a','legs-q','cali-full','upper-b']},
  strength_cali: {n:'Strength & Skills', seq:['hybrid','legs-p','cali-pull','cali-push','fb-strength']},
  ppl: {n:'Push / Pull / Legs (rotating)', seq:['push-a','pull-a','legs-q','shoulders','arms','legs-p']},
};

// Calisthenics skills. Steps: [name, type, target]. Everyone starts at step 0.
const SKILLS = [
  {id:'handstand',n:'Handstand',ic:'🤸',steps:[
    ['Wall Plank Hold (feet on wall)','s','3×30s'],['Chest-to-Wall Handstand','s','3×30s'],['Chest-to-Wall Handstand','s','3×60s'],
    ['Wall Toe-Pulls (off the wall)','r','5×5'],['Kick-Up Practice','s','10 min practice'],['Freestanding Handstand','s','5×10s'],['Freestanding Handstand','s','3×30s'],['Freestanding Handstand','s','60s']]},
  {id:'hspu',n:'Handstand Push-Up',ic:'⬇️',steps:[
    ['Pike Push-Up','r','3×12'],['Elevated Pike Push-Up','r','3×10'],['Wall HSPU Negatives','r','3×5 (5s down)'],['Partial-ROM Wall HSPU','r','3×6'],['Wall HSPU','r','3×5'],['Deficit Wall HSPU','r','3×5'],['Freestanding HSPU','r','3×1-3']]},
  {id:'lsit',n:'L-Sit',ic:'🪑',steps:[
    ['Foot-Supported L-Sit','s','3×20s'],['Tuck L-Sit','s','3×20s'],['One-Leg L-Sit','s','3×15s/leg'],['L-Sit','s','3×10s'],['L-Sit','s','3×30s'],['V-Sit Progression (hips higher)','s','3×10s']]},
  {id:'muscleup',n:'Muscle-Up',ic:'💪',steps:[
    ['Strict Pull-Up','r','3×10'],['Chest-to-Bar Pull-Up','r','3×6'],['Explosive High Pull-Up (to waist)','r','4×3'],['Straight Bar Dip','r','3×10'],['Muscle-Up Negatives','r','3×3'],['Band-Assisted Muscle-Up','r','3×3'],['Strict Muscle-Up','r','3×1-3'],['Muscle-Up','r','3×5']]},
  {id:'frontlever',n:'Front Lever',ic:'➖',steps:[
    ['Active Hang + Scap Pulls','r','3×10'],['Tuck Front Lever','s','4×10-15s'],['Advanced Tuck Front Lever','s','4×10s'],['One-Leg Front Lever','s','4×8s/leg'],['Straddle Front Lever','s','4×6s'],['Half-Lay Front Lever','s','4×6s'],['Full Front Lever','s','3×5s']]},
  {id:'backlever',n:'Back Lever',ic:'🔄',steps:[
    ['Skin the Cat','r','3×3'],['German Hang','s','3×20s'],['Tuck Back Lever','s','4×15s'],['Advanced Tuck Back Lever','s','4×10s'],['Straddle Back Lever','s','4×8s'],['Full Back Lever','s','3×8s']]},
  {id:'planche',n:'Planche',ic:'✈️',steps:[
    ['Planche Lean','s','3×20s'],['Pseudo Planche Push-Up','r','3×10'],['Frog Stand','s','3×20s'],['Tuck Planche','s','4×10s'],['Advanced Tuck Planche','s','4×10s'],['Straddle Planche','s','4×5s'],['Full Planche','s','3×3s']]},
  {id:'pistol',n:'Pistol Squat',ic:'🦵',steps:[
    ['Assisted Pistol (hold a post)','r','3×8/leg'],['Box Pistol (sit to bench)','r','3×6/leg'],['Pistol Negatives','r','3×5/leg'],['Pistol Squat','r','3×5/leg'],['Pistol Squat','r','3×10/leg'],['Weighted Pistol','w','3×5/leg']]},
  {id:'dragonflag',n:'Dragon Flag',ic:'🐉',steps:[
    ['Lying Leg Raise','r','3×15'],['Tuck Dragon Flag Negatives','r','3×5'],['One-Leg Dragon Flag Negatives','r','3×5'],['Full Dragon Flag Negatives','r','3×5'],['Dragon Flag','r','3×3'],['Dragon Flag','r','3×8']]},
];
