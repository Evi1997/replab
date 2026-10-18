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
  // Added: glutes, core, conditioning, variety
  ['smithsq','Smith Machine Squat','squat','mach','w','Quads, glutes'],
  ['sumodl','Sumo Deadlift','hinge','bb','w','Glutes, adductors, back'],
  ['goodam','Good Morning','hinge','bb','w','Hamstrings, lower back'],
  ['pullthru','Cable Pull-Through','hinge','cable','w','Glutes, hamstrings'],
  ['glutebr','Barbell Glute Bridge','glute','bb','w','Glutes'],
  ['kickback','Cable Glute Kickback','glute','cable','w','Glutes'],
  ['donkey','Donkey Kick','glute','bw','r','Glutes'],
  ['firehyd','Fire Hydrant','glute','bw','r','Glute medius'],
  ['frogpump','Frog Pump','glute','bw','r','Glutes'],
  ['curtsy','Curtsy Lunge','lunge','db','w','Glutes, quads'],
  ['boxjump','Box Jump','power','bw','r','Power, quads'],
  ['arnold','Arnold Press','vpush','db','w','Shoulders'],
  ['uprow','Cable Upright Row','latraise','cable','w','Side delts, traps'],
  ['dbfly','Dumbbell Fly','chestiso','db','w','Chest'],
  ['tbarrow','T-Bar Row','hpull','bb','w','Mid back, lats'],
  ['renegade','Renegade Row','hpull','db','w','Back, core'],
  ['conc','Concentration Curl','biceps','db','w','Biceps'],
  ['tkick','Triceps Kickback','triceps','db','w','Triceps'],
  ['woodchop','Cable Woodchop','core','cable','w','Obliques'],
  ['pallof','Pallof Press','corehold','cable','w','Anti-rotation core'],
  ['russian','Russian Twist','core','bw','r','Obliques'],
  ['deadbug','Dead Bug','core','bw','r','Deep core'],
  ['bicycle','Bicycle Crunch','core','bw','r','Abs, obliques'],
  ['vup','V-Up','core','bw','r','Abs'],
  ['thruster','Dumbbell Thruster','full','db','w','Full body'],
  ['rower','Rowing Machine','cardio','mach','s','Full-body cardio'],
  ['bike','Air Bike Sprints','cardio','mach','s','Conditioning'],
  ['inclinewalk','Incline Treadmill Walk','cardio','mach','s','Low-impact cardio'],
  ['stairs','StairMaster','cardio','mach','s','Glutes, cardio'],
  ['skater','Skater Jumps','cardio','bw','s','Legs, agility'],
  ['jjack','Jumping Jacks','cardio','bw','s','Cardio'],
  ['dbcurl','Dumbbell Curl','biceps','db','w','Biceps'],
  ['dbohtri','Overhead Dumbbell Extension','triceps','db','w','Triceps (long head)'],
  ['dbrear','Bent-Over Rear Delt Raise','reardelt','db','w','Rear delts'],
  ['dbrow2','Bent-Over Dumbbell Row','hpull','db','w','Upper back, lats'],
  ['dbpullover','Dumbbell Pullover','latiso','db','w','Lats, chest'],
  ['tablerow','Under-Table Row','hpull','bw','r','Upper back, biceps'],
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
  // ---- MORE LEGS ----
  {id:'legs-vol',n:'Legs: Squat Volume',cat:'Legs',d:'Moderate weight, lots of quality reps. Classic hypertrophy leg day.',ex:[
    ['smithsq',4,'8-10',120],['legpress',4,'12',90],['wlunge',3,'12/leg',90],['legext',3,'15',60],['sleglcurl',3,'12',60],['calf',4,'12',45]]},
  {id:'legs-mach',n:'Legs: Machine Day',cat:'Legs',d:'Joint-friendly, high effort. Great when your back needs a break.',ex:[
    ['hacksq',4,'8-10',120],['legpress',3,'12-15',90],['legext',3,'12-15',60],['legcurl',3,'10-12',60],['abduct',3,'15-20',45],['scalf',4,'15',45]]},
  {id:'legs-uni',n:'Legs: Single-Leg Strength',cat:'Legs',d:'Fix imbalances and build stable, athletic legs.',ex:[
    ['bss',4,'8/leg',90],['stepup',3,'10/leg',75],['dbrdl',3,'10',75],['curtsy',3,'12/leg',60],['nordic',3,'4-6',90],['slcalf',3,'15/leg',45]]},
  {id:'legs-power',n:'Legs: Power & Athletic',cat:'Legs',d:'Jump, squat, hinge. Builds explosive, athletic legs.',ex:[
    ['boxjump',4,'5',90],['fsquat',4,'4-6',180],['rdl',3,'6-8',120],['wlunge',3,'10/leg',90],['kbswing',3,'15',60],['hlr',3,'10',60]]},
  // ---- GLUTES ----
  {id:'glutes-a',n:'Glutes: Shape & Strength',cat:'Glutes',d:'Heavy thrusts plus hinge and single-leg work, all three glute muscles.',ex:[
    ['hipthrust',4,'8-12',120],['rdl',3,'8-10',120],['bss',3,'10/leg',90],['abduct',3,'15-20',45],['kickback',3,'12-15/leg',45],['backext',3,'15',60]]},
  {id:'glutes-b',n:'Glutes & Hamstrings Pump',cat:'Glutes',d:'Posterior chain volume with short rests.',ex:[
    ['glutebr',4,'12',90],['sumodl',3,'6-8',150],['pullthru',3,'12-15',60],['legcurl',3,'12',60],['curtsy',3,'12/leg',60],['frogpump',2,'25',45]]},
  {id:'glutes-db',n:'Glutes: Dumbbells Only',cat:'Glutes',d:'Everything with one pair of dumbbells and a bench.',ex:[
    ['dbrdl',4,'10',90],['gobsq',3,'12',75],['stepup',3,'10/leg',75],['sglute',3,'12/leg',45],['wlunge',3,'12/leg',75],['donkey',2,'15/leg',30]]},
  {id:'glutes-bw',n:'Glutes: No Equipment',cat:'Glutes',d:'Hotel room or living room glute burner.',ex:[
    ['sglute',4,'15/leg',45],['bwbss',3,'12/leg',60],['frogpump',3,'30',30],['donkey',3,'20/leg',30],['firehyd',3,'15/leg',30],['wallsit',2,'60s',45]]},
  // ---- MORE PUSH ----
  {id:'push-b',n:'Push: Hypertrophy',cat:'Push',d:'Dumbbells and machines, chasing the pump.',ex:[
    ['incdb',4,'8-12',90],['mchest',3,'10-12',90],['dbohp',3,'10-12',90],['pecdeck',3,'12-15',60],['clat',4,'15',45],['ropepd',3,'12-15',45],['ohtri',3,'12',45]]},
  {id:'push-c',n:'Push: Strength',cat:'Push',d:'Low reps, long rests, heavy pressing.',ex:[
    ['bench',5,'3-5',210],['ohp',4,'4-6',180],['wdip',3,'6-8',150],['cgbench',3,'6-8',120],['lat',3,'12-15',45]]},
  {id:'chest',n:'Chest Focus',cat:'Push',d:'Upper, middle and lower chest from every angle.',ex:[
    ['inclbench',4,'6-10',150],['dbbench',3,'8-12',90],['wdip',3,'8-10',90],['fly',3,'12-15',60],['dbfly',2,'12',60],['pushup',2,'max',60]]},
  {id:'shoulders-b',n:'Shoulder Sculpt',cat:'Push',d:'Capped delts: front, side and rear.',ex:[
    ['arnold',4,'10-12',90],['lat',4,'15-20',45],['uprow',3,'12-15',60],['facepull',3,'15-20',45],['rdelt',3,'15-20',45],['shrug',3,'12',60]]},
  // ---- MORE PULL ----
  {id:'pull-b',n:'Pull: Width (Lats)',cat:'Pull',d:'V-taper focus: vertical pulls and lat isolation.',ex:[
    ['pulldown',4,'8-12',90],['pullup',3,'max',120],['dbrow',3,'10-12',75],['pullover',3,'12-15',60],['facepull',3,'15',45],['ccurl',3,'12',45],['hammer',2,'12',45]]},
  {id:'pull-c',n:'Pull: Thickness',cat:'Pull',d:'Heavy rows for a dense, strong back.',ex:[
    ['dl',3,'3-5',210],['tbarrow',4,'6-10',120],['csrow',3,'10-12',90],['shrug',3,'10-12',60],['rdelt',3,'15',45],['bbcurl',3,'8-10',60]]},
  {id:'back-pump',n:'Back & Biceps Pump',cat:'Pull',d:'Short rests, high reps, big pump.',ex:[
    ['pulldown',4,'12-15',60],['cablerow',4,'12-15',60],['renegade',3,'10',60],['rdelt',3,'15-20',45],['incurl',3,'12',45],['conc',2,'12/arm',45]]},
  // ---- MORE UPPER ----
  {id:'upper-ss',n:'Upper Body Supersets',cat:'Upper',d:'Pairs: do A then B back to back, then rest. Big work in less time.',ex:[
    ['incdb',3,'10-12',30],['csrow',3,'10-12',75],['dbohp',3,'10-12',30],['pulldown',3,'10-12',75],['lat',3,'15',20],['facepull',3,'15',45],['ccurl',3,'12',20],['ropepd',3,'12',45]]},
  {id:'upper-tone',n:'Upper Body Tone',cat:'Upper',d:'Moderate weights, higher reps, short rests. Great for a lean, defined look.',ex:[
    ['mchest',3,'12-15',60],['cablerow',3,'12-15',60],['arnold',3,'12',60],['pulldown',3,'12-15',60],['clat',3,'15',45],['tkick',3,'15',45],['conc',3,'12',45]]},
  // ---- MORE ARMS ----
  {id:'arms-b',n:'Arms: Strength',cat:'Arms',d:'Heavy compound arm work, then isolation.',ex:[
    ['cgbench',4,'6-8',120],['bbcurl',4,'6-8',90],['wdip',3,'8',90],['preacher',3,'10',60],['skull',3,'10',60],['hammer',3,'10',60]]},
  {id:'arms-tone',n:'Arms: Toning Circuit',cat:'Arms',d:'Light to moderate weight, little rest. Move quickly.',ex:[
    ['conc',3,'12-15',30],['tkick',3,'12-15',30],['hammer',3,'12',30],['ropepd',3,'15',30],['ccurl',3,'15',30],['diamond',3,'max',45]]},
  {id:'arms-cable',n:'Arms: Cable Station',cat:'Arms',d:'One cable stack, constant tension.',ex:[
    ['ccurl',4,'10-12',45],['ropepd',4,'10-12',45],['ohtri',3,'12',45],['preacher',3,'12',45],['pushdown',3,'15',45],['hammer',2,'15',45]]},
  // ---- MORE FULL BODY ----
  {id:'fb-a',n:'Full Body A',cat:'Full Body',d:'Squat, bench, row. Pair with Full Body B on alternate days.',ex:[
    ['squat',4,'5-8',180],['bench',4,'5-8',150],['csrow',3,'8-10',90],['legcurl',3,'10-12',60],['lat',3,'12-15',45],['plank',3,'45s',45]]},
  {id:'fb-b',n:'Full Body B',cat:'Full Body',d:'Deadlift, press, pull-down. Pair with Full Body A.',ex:[
    ['rdl',4,'6-8',150],['ohp',4,'6-8',150],['pulldown',3,'8-12',90],['bss',3,'8/leg',90],['incdb',3,'10',75],['hlr',3,'10',60]]},
  {id:'fb-lean',n:'Full Body Lean & Toned',cat:'Full Body',d:'Moderate weight, 12-15 reps, short rests: strength plus calorie burn.',ex:[
    ['gobsq',3,'12-15',60],['dbbench',3,'12',60],['cablerow',3,'12-15',60],['dbrdl',3,'12',60],['arnold',3,'12',60],['stepup',3,'10/leg',60],['deadbug',3,'10/side',30]]},
  {id:'fb-metcon',n:'Full Body Fat Burner',cat:'Full Body',d:'Metabolic circuit. Heart rate up, every muscle working.',ex:[
    ['thruster',4,'12',45],['renegade',3,'10',45],['kbswing',4,'15',45],['boxjump',3,'8',45],['rower',4,'45s',30],['burpee',3,'10',45]]},
  {id:'fb-machine',n:'Full Body Machines',cat:'Full Body',d:'Simple, safe and fast. Ideal on busy days.',ex:[
    ['legpress',3,'10-12',90],['mchest',3,'10-12',75],['pulldown',3,'10-12',75],['legcurl',3,'12',60],['cablerow',3,'12',60],['cabcrunch',3,'15',45]]},
  // ---- CORE ----
  {id:'core-a',n:'Core Strength',cat:'Core',d:'A strong, stable trunk for heavier lifts.',ex:[
    ['abwheel',3,'8-12',60],['hlr',3,'10-12',60],['pallof',3,'10/side',45],['woodchop',3,'12/side',45],['sideplank',3,'30s/side',30],['deadbug',3,'10/side',30]]},
  {id:'core-burn',n:'Abs Burner (15 min)',cat:'Core',d:'Quick finisher: 40s each, minimal rest.',ex:[
    ['bicycle',3,'20/side',20],['vup',3,'12',20],['legraise',3,'15',20],['russian',3,'20',20],['plank',3,'45s',20],['hollow',3,'30s',30]]},
  {id:'core-hang',n:'Hanging Core',cat:'Core',d:'Bar-based abs: the hardest and most effective.',ex:[
    ['hkr',3,'12-15',45],['hlr',3,'8-12',60],['ttb',3,'6-10',60],['cabcrunch',3,'12-15',45],['hollow',3,'30s',30]]},
  {id:'tr-core',n:'Core: No Equipment',cat:'Core',d:'15-minute abs and lower back anywhere.',ex:[
    ['hollow',3,'30s',30],['legraise',3,'12-15',30],['sideplank',3,'30s/side',30],['shtaps',3,'20',30],['superman',3,'12',30]]},
  // ---- CARDIO ----
  {id:'cardio-z2',n:'Zone 2 Cardio',cat:'Cardio',d:'Steady effort: you could still hold a conversation. Best for fat loss and heart health.',ex:[
    ['inclinewalk',1,'30-40 min',0],['plank',2,'45s',30]]},
  {id:'cardio-hiit',n:'Bike & Row HIIT',cat:'Cardio',d:'Short, very hard intervals. 20 minutes total.',ex:[
    ['bike',8,'20s',40],['rower',5,'60s',60],['mclimb',3,'40s',20]]},
  {id:'cardio-mix',n:'Gym Conditioning Circuit',cat:'Cardio',d:'Rotate machines: row, stairs, bike. 30 minutes of mixed cardio.',ex:[
    ['rower',3,'3 min',60],['stairs',3,'3 min',60],['bike',3,'2 min',60],['jumprope',3,'60s',30]]},
  {id:'cardio-fin',n:'10-Min Finisher',cat:'Cardio',d:'Add after any lifting session.',ex:[
    ['bike',6,'20s',40],['burpee',2,'10',30],['mclimb',2,'30s',30]]},
  // ---- MORE CALISTHENICS ----
  {id:'cali-base',n:'Calisthenics Foundations',cat:'Calisthenics',d:'The base every skill is built on. Start here.',ex:[
    ['scappull',3,'10',45],['invrow',3,'10-12',60],['pushup',3,'10-15',60],['bwsq',3,'20',45],['pike',3,'8-10',60],['plank',3,'45s',30],['hollow',3,'20s',30]]},
  {id:'cali-legs',n:'Calisthenics Legs',cat:'Calisthenics',d:'Bodyweight legs that are actually hard.',ex:[
    ['bwbss',4,'10-12/leg',60],['cossack',3,'8/side',60],['nordic',3,'4-6',90],['sissy',3,'8-12',60],['jumpsq',3,'10',60],['slcalf',3,'15/leg',30]]},
  // ---- MORE TRAVEL ----
  {id:'tr-db',n:'Hotel Gym Dumbbells',cat:'Travel',d:'For the hotel gym with just a dumbbell rack and a bench.',ex:[
    ['gobsq',4,'10-12',75],['dbbench',4,'8-12',75],['dbrow',4,'10/arm',60],['dbrdl',3,'10-12',75],['arnold',3,'10-12',60],['renegade',2,'8',60]]},
  {id:'tr-tabata',n:'Tabata Blast (16 min)',cat:'Travel',d:'20s all-out / 10s rest, 8 rounds per move.',ex:[
    ['skater',8,'20s',10],['jumpsq',8,'20s',10],['burpee',8,'20s',10],['mclimb',8,'20s',10]]},
  {id:'tr-glutes',n:'Hotel Room Glutes & Legs',cat:'Travel',d:'No equipment, high reps, slow tempo.',ex:[
    ['bwbss',4,'15/leg',45],['sglute',3,'15/leg',30],['cossack',3,'10/side',45],['frogpump',3,'30',30],['firehyd',3,'15/leg',30],['wallsit',2,'60s',30]]},
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
