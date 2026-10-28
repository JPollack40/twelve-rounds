/* ================= static game data ================= */
const DIVS=[
  {k:'fly',name:'Flyweight',short:'FLY',lb:'112'},
  {k:'bantam',name:'Bantamweight',short:'BAN',lb:'118'},
  {k:'feather',name:'Featherweight',short:'FEA',lb:'126'},
  {k:'light',name:'Lightweight',short:'LW',lb:'135'},
  {k:'welter',name:'Welterweight',short:'WW',lb:'147'},
  {k:'middle',name:'Middleweight',short:'MW',lb:'160'},
  {k:'lightheavy',name:'Light Heavyweight',short:'LHW',lb:'175'},
  {k:'heavy',name:'Heavyweight',short:'HW',lb:'200+'},
];
const STATS=[
  ['pow','Power','Damage on every punch.'],
  ['spd','Speed','Faster hands, quicker recovery.'],
  ['sta','Stamina','Bigger gas tank, faster recovery.'],
  ['chin','Chin','Absorb head shots, beat the count.'],
  ['def','Defense','Stronger guard, longer dodges.'],
  ['foot','Footwork','Evasion and quicker dodge recovery.'],
  ['iq','Ring IQ','See tells sooner, win close rounds.'],
];
const STAT_KEYS=STATS.map(s=>s[0]);
const STAT_NAME=Object.fromEntries(STATS.map(s=>[s[0],s[1]]));
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BODIES=[
  {k:'WBF',name:'World Boxing Federation'},
  {k:'IBC',name:'International Boxing Council'},
  {k:'UBO',name:'Universal Boxing Organization'},
  {k:'GBA',name:'Global Boxing Association'},
];
const DIFF={
  contender:{name:'Contender',tell:1.3,react:.7,dmg:.8,agg:.85,combo:0,xp:.9,desc:'Longer tells, softer punches. Learn the game.'},
  champion:{name:'Champion',tell:.92,react:1.12,dmg:1.1,agg:1.08,combo:.08,xp:1,desc:'The intended balance. Fair, but it hits back.'},
  legend:{name:'Legend',tell:.72,react:1.4,dmg:1.3,agg:1.25,combo:.18,xp:1.25,desc:'Short tells, sharp AI, +25% XP. Losses hurt.'},
};

const ARCH={
  outboxer:{name:'Out-Boxer',blurb:'Long jab, quick feet. Wins rounds clean and makes you chase.',
    base:{pow:38,spd:52,sta:48,chin:40,def:50,foot:56,iq:48},ability:'stickmove',
    ai:{agg:.45,combo:.35,w:{jab:5,cross:3,hook:1,upper:.6},body:.15,block:.5,dodge:.55,counter:.35,guard:['low','high','high']}},
  slugger:{name:'Slugger',blurb:'Heavy hands and a granite chin. One shot changes everything.',
    base:{pow:60,spd:38,sta:44,chin:54,def:36,foot:36,iq:38},ability:'haymaker',
    ai:{agg:.6,combo:.25,w:{jab:1.5,cross:3,hook:4,upper:3},body:.2,block:.45,dodge:.15,counter:.2,guard:['high','high','low']}},
  swarmer:{name:'Swarmer',blurb:'Walks through fire, smothers you, and empties your tank.',
    base:{pow:46,spd:48,sta:58,chin:50,def:40,foot:42,iq:40},ability:'flurry',
    ai:{agg:.8,combo:.6,w:{jab:2,cross:2,hook:4,upper:2.5},body:.4,block:.4,dodge:.35,counter:.2,guard:['peek','peek','low']}},
  counter:{name:'Counter-Puncher',blurb:'Makes you miss, then makes you pay for it.',
    base:{pow:42,spd:46,sta:44,chin:42,def:56,foot:46,iq:58},ability:'counterread',
    ai:{agg:.35,combo:.35,w:{jab:2,cross:4,hook:3,upper:2},body:.2,block:.55,dodge:.6,counter:.7,guard:['high','high','low']}},
  boxerpuncher:{name:'Boxer-Puncher',blurb:'A complete fighter with no glaring weakness.',
    base:{pow:48,spd:47,sta:48,chin:46,def:46,foot:46,iq:46},ability:'onetwo',
    ai:{agg:.55,combo:.45,w:{jab:3,cross:3,hook:3,upper:2},body:.25,block:.5,dodge:.4,counter:.4,guard:['high','low','high']}},
};

const SKIN=['#f4d5b9','#e8b994','#cf9468','#ad744c','#87573a','#643e27','#46291a'];
const HAIRS=['bald','buzz','short','spiky','shaggy','curly','afro','mohawk','braids','slick','topknot'];
/* face and body options (Style A sheet) */
const NOSES={straight:'Straight',broken:'Broken',flat:'Flattened'};
const SCARS={none:'None',brow:'Brow',cheek:'Cheek',nose:'Nose',both:'Brow + cheek'};
const EARS={normal:'Normal',cauliflower:'Cauliflower'};
const EXPRS={grit:'Gritted teeth',stern:'Stern',calm:'Calm',cocky:'Cocky'};
const BODYTYPES={lanky:'Lanky',athletic:'Athletic',brawler:'Brawler',anvil:'Anvil'};
const HAIRC=['#151111','#3b2416','#6b4423','#a8742f','#dcb75e','#b23a1f','#8f8f8f','#ece6da'];
const BEARDS=['none','stubble','mustache','goatee','beard'];
const COLORS=['#d8392f','#2f6fe2','#f0be48','#f4efe3','#161616','#2e9e5b','#7b3fd1','#e86aa6','#ff7a1a','#0fb5c9','#7a1f1f','#1d2f63'];
const BUILDS={lean:{name:'Lean',off:-.6},medium:{name:'Medium',off:0},stocky:{name:'Stocky',off:.7}};
const ARMS={short:{name:'Short',d:-2},avg:{name:'Average',d:1},long:{name:'Long',d:4}};

/* active abilities: generic effect schema read by the fight engine */
const AB={
  stickmove:{name:'Stick & Move',cost:1,kind:'buff',dur:6,mods:{spd:1.3,jabDmg:1.45,evade:.12},desc:'6s: +30% speed, jabs hit 45% harder, some punches miss you outright.'},
  haymaker:{name:'Haymaker',cost:2,kind:'next',mult:2.3,window:3.5,desc:'Your next power punch within 3s lands at 2.3x and staggers them.'},
  flurry:{name:'Flurry',cost:2,kind:'combo',seq:['jab','cross','hook','cross','upper','hook'],mult:.9,desc:'Unload a blistering 6-punch combination.'},
  counterread:{name:'Counter Read',cost:1,kind:'buff',dur:7,mods:{dodgeCounter:1.6},desc:'7s: every successful slip or duck fires an automatic 1.6x counter.'},
  onetwo:{name:'Snap One-Two',cost:1,kind:'combo',seq:['jab','cross'],mult:1.5,pierce:.5,desc:'An instant 1-2 at 1.5x that cuts through half a guard.'},
  secondwind:{name:'Second Wind',cost:2,kind:'heal',sta:45,hp:14,desc:'Recover 45 stamina and 14 health on the spot.'},
  shoulderroll:{name:'Shoulder Roll',cost:1,kind:'buff',dur:6,mods:{parry:1},desc:'6s: while blocking, straights roll off your shoulder and leave them open.'},
  liver:{name:'Liver Shot',cost:2,kind:'strike',punch:'hook',body:true,mult:1.6,staDmg:35,desc:'A left hook to the liver: heavy body damage and drains 35 stamina.'},
  ironwill:{name:'Iron Will',cost:2,kind:'buff',dur:8,mods:{dmgTaken:.6,noKD:1},desc:'8s: take 40% less damage and you cannot be knocked down.'},
  cocoarain:{name:'Cocoa Rain',cost:2,kind:'combo',seq:['jab','hook','bhook','upper','cross','hook','bcross','upper'],mult:.85,legend:'gonzaga',desc:'An 8-punch head-and-body avalanche.'},
  goldenbantam:{name:'Golden Counter',cost:1,kind:'buff',dur:7,mods:{dodgeCounter:1.8,spd:1.15},legend:'joffrey',desc:'7s: dodges fire 1.8x counters, +15% speed.'},
  princeleap:{name:"Prince's Leap",cost:2,kind:'strike',punch:'upper',mult:2.2,pierce:.7,legend:'hameed',desc:'A leaping, unorthodox uppercut at 2.2x through most of a guard.'},
  stonehands:{name:'Hands of Stone',cost:2,kind:'buff',dur:8,mods:{dmg:1.35,staDmg:1.5},legend:'durante',desc:'8s: +35% damage, +50% stamina damage.'},
  shellgame:{name:'Shell Game',cost:2,kind:'buff',dur:8,mods:{parry:1,dodgeCounter:1.4},legend:'mayfield',desc:'8s: straights roll off the shoulder while blocking, and every dodge counters.'},
  bodybomb:{name:'Body Bombardment',cost:1,kind:'buff',dur:8,mods:{bodyDmg:1.6,staDmg:2},legend:'chavarria',desc:'8s: body shots hit 60% harder and drain double stamina.'},
  pacstorm:{name:'Southpaw Storm',cost:2,kind:'buff',dur:6,mods:{spd:1.4,dmg:1.1},legend:'pacheco',desc:'6s: +40% hand speed and +10% damage.'},
  bolo:{name:'Bolo Punch',cost:1,kind:'strike',punch:'upper',mult:1.9,stun:.9,legend:'raye',desc:'A wind-milling showboat uppercut at 1.9x that freezes them.'},
  hitman:{name:'Flicker Jab',cost:1,kind:'buff',dur:8,mods:{jabDmg:1.6,jabPierce:.6,spd:1.1},legend:'hurns',desc:'8s: whipping jabs at 1.6x that slip through guards.'},
  sweetscience:{name:'Sweet Science',cost:3,kind:'buff',dur:10,mods:{spd:1.2,dmg:1.2,dmgTaken:.8,evade:.1},legend:'robbins',desc:'10s: better at everything. +20% speed and power, 20% less damage taken.'},
  hurricane:{name:'Hurricane Hooks',cost:2,kind:'buff',dur:6,mods:{hookDmg:1.6,hookSpd:1.5},legend:'carver',chapter:'hurricane',desc:'6s: hooks hit 60% harder and come 50% faster.'},
  switchhit:{name:'Switch-Hitter',cost:1,kind:'buff',dur:8,mods:{pierce:.35,dmgTaken:.85},legend:'hagan',desc:'8s: switch stances. Punches find gaps in the guard and you take 15% less.'},
  mongoose:{name:'Cross-Arm Guard',cost:2,kind:'buff',dur:8,mods:{blockAbsorb:.95,blockRegen:1},legend:'moorland',desc:'8s: an old-school shell that absorbs 95% and lets you breathe behind it.'},
  ironjab:{name:'Iron Jab',cost:1,kind:'buff',dur:8,mods:{jabDmg:2,jabStagger:1},legend:'lister',desc:'8s: jabs land like crosses and stop them in their tracks.'},
  smokinhook:{name:"Smokin' Hook",cost:2,kind:'strike',punch:'hook',mult:2.4,pierce:1,legend:'frazee',desc:'A leaping left hook at 2.4x that ignores the guard.'},
  peekaboo:{name:'Peek-a-Boo',cost:2,kind:'buff',dur:7,mods:{dodgeCounter:1.7,spd:1.2},legend:'tyrell',desc:'7s: bob and weave. Every dodge fires a 1.7x counter, +20% speed.'},
  suzieq:{name:'Suzie Q',cost:2,kind:'strike',punch:'cross',mult:2.2,pierce:.6,legend:'marchetti',desc:'A looping overhand right at 2.2x that crashes through the guard.'},
  ropeadope:{name:'Rope-a-Dope',cost:2,kind:'buff',dur:8,mods:{blockAbsorb:.92,drainOnBlock:7},legend:'hollis',chapter:'jungle',desc:'8s: lay on the ropes. Blocks absorb 92% and every punch they throw costs them 7 stamina.'},
  phantom:{name:'Phantom Punch',cost:3,kind:'strike',punch:'cross',mult:2,instant:true,kdBelow:.5,chapter:'phantom',desc:'A short right nobody sees. Drops anyone under half health.'},
};

const SKILLS=[
  {id:'heavy1',br:'off',t:1,name:'Heavy Hands I',desc:'+6% punch damage.',mods:{dmg:.06}},
  {id:'combo1',br:'off',t:1,name:'Combo Artist',desc:'Combo damage bonus builds 50% faster.',mods:{combo:.5}},
  {id:'body1',br:'off',t:2,req:'heavy1',name:'Body Snatcher',desc:'Body shots +20% damage and stamina drain.',mods:{bodyDmg:.2}},
  {id:'heavy2',br:'off',t:2,req:'heavy1',name:'Heavy Hands II',desc:'+8% punch damage.',mods:{dmg:.08}},
  {id:'sniper',br:'off',t:2,req:'combo1',name:'Sniper',desc:'Opponents react to your punches 15% less often.',mods:{sneaky:.15}},
  {id:'ab_liver',br:'off',t:3,req:'body1',name:'Learn: Liver Shot',ability:'liver'},
  {id:'killer',br:'off',t:3,req:'heavy2',name:'Killer Instinct',desc:'+25% damage against a hurt opponent.',mods:{killer:.25}},
  {id:'heavy3',br:'off',t:4,req:'killer',name:'Heavy Hands III',desc:'+10% damage; flash knockdowns 50% likelier.',mods:{dmg:.1,flash:.5}},
  {id:'finisher',br:'off',t:4,req:'killer',name:'Finisher',desc:'Downed opponents are 20% less likely to beat the count.',mods:{finisher:.2}},
  {id:'guard1',br:'def',t:1,name:'Tight Guard',desc:'Blocks absorb 8% more.',mods:{block:.08}},
  {id:'slick',br:'def',t:1,name:'Slick',desc:'Dodges stay safe 20% longer.',mods:{dodgeWin:.2}},
  {id:'counter1',br:'def',t:2,req:'slick',name:'Counter Puncher',desc:'Counter punches +20% damage.',mods:{counter:.2}},
  {id:'ab_roll',br:'def',t:2,req:'guard1',name:'Learn: Shoulder Roll',ability:'shoulderroll'},
  {id:'radar',br:'def',t:3,req:'counter1',name:'Ring Radar',desc:'Their tells last 15% longer.',mods:{tell:.15}},
  {id:'guard2',br:'def',t:3,req:'guard1',name:'Iron Guard',desc:'Blocks absorb 8% more and cost 40% less stamina.',mods:{block:.08,blockSta:.4}},
  {id:'matador',br:'def',t:4,req:'radar',name:'Matador',desc:'Perfect-dodge window 50% wider; they stay open longer.',mods:{perfect:.5}},
  {id:'clinch',br:'def',t:4,req:'guard2',name:'Clinch Master',desc:'Clinches recover twice as much.',mods:{clinch:1}},
  {id:'gas1',br:'con',t:1,name:'Gas Tank I',desc:'+10% stamina regen.',mods:{regen:.1}},
  {id:'chin1',br:'con',t:1,name:'Iron Chin I',desc:'Take 6% less head damage.',mods:{chinRes:.06}},
  {id:'gas2',br:'con',t:2,req:'gas1',name:'Gas Tank II',desc:'+12% regen; punches cost 8% less.',mods:{regen:.12,cost:.08}},
  {id:'recover',br:'con',t:2,req:'chin1',name:'Quick Recovery',desc:'Recover 30% more between rounds.',mods:{between:.3}},
  {id:'cutpro',br:'con',t:2,req:'gas1',name:'Weight-Cut Pro',desc:'Weight-cut penalties halved.',mods:{cut:.5}},
  {id:'ab_wind',br:'con',t:3,req:'gas2',name:'Learn: Second Wind',ability:'secondwind'},
  {id:'chin2',br:'con',t:3,req:'recover',name:'Iron Chin II',desc:'Take 8% less head damage; easier to beat the count.',mods:{chinRes:.08,getup:.25}},
  {id:'ab_will',br:'con',t:4,req:'chin2',name:'Learn: Iron Will',ability:'ironwill'},
  {id:'durable',br:'con',t:4,req:'chin2',name:'Built to Last',desc:'40% less long-term damage; you age more slowly.',mods:{durable:.4}},
];
const BRANCH={off:'Offense',def:'Defense',con:'Conditioning'};

/* legends: fictional homages, original names */
const LEGENDS=[
  {id:'gonzaga',first:'Román',last:'Gonzaga',nick:'Cocoa',div:0,arch:'swarmer',rating:92,age:27,home:'Managua, NIC',skin:4,hair:'buzz',hc:0,trunks:'#e86aa6',homage:'Román "Chocolatito" González',ab:'cocoarain',ai:{sig:['jab','cross','hook','bhook'],sigP:.5,weak:'upper',scout:'Throws four-punch bursts that end downstairs. Small for the division: counter uppercuts hurt him.',agg:.85,combo:.75,body:.45}},
  {id:'joffrey',first:'Edir',last:'Joffrey',nick:'Golden Bantam',div:1,arch:'boxerpuncher',rating:92,age:29,home:'São Paulo, BRA',skin:2,hair:'slick',hc:1,trunks:'#f0be48',homage:'Éder "Golden Bantam" Jofre',ab:'goldenbantam',ai:{sig:['jab','jab','cross'],sigP:.45,weak:'body',scout:'Picture-perfect 1-1-2. He protects his head and forgets his body.'}},
  {id:'hameed',first:'Nas',last:'Hameed',nick:'The Prince',div:2,arch:'counter',rating:90,age:24,home:'Sheffield, ENG',skin:3,hair:'short',hc:0,trunks:'#7b3fd1',homage:'"Prince" Naseem Hamed',ab:'princeleap',southpaw:true,ai:{sig:['feint','upper'],sigP:.5,weak:'counter',scout:'Hands low, feints, then leaps in with an uppercut. Wild when he misses: counters hit him hard.',agg:.5,dodge:.75,counter:.6,guard:['low','low','high']}},
  {id:'pacheco',first:'Emman',last:'Pacheco',nick:'Pac-Storm',div:2,arch:'swarmer',rating:89,age:22,home:'General Santos, PHI',skin:3,hair:'short',hc:0,trunks:'#2f6fe2',homage:'Manny "Pac-Man" Pacquiao, who won titles in eight divisions',ab:'pacstorm',southpaw:true,movesUp:true,ai:{sig:['cross','hook','cross','hook'],sigP:.5,weak:'fader',scout:'A southpaw storm of straight-hook combinations. Burns bright early and fades in the late rounds.'}},
  {id:'durante',first:'Roberto',last:'Durante',nick:'Hands of Stone',div:3,arch:'slugger',rating:93,age:26,home:'Panama City, PAN',skin:3,hair:'short',hc:0,beard:'beard',trunks:'#d8392f',homage:'Roberto "Manos de Piedra" Durán',ab:'stonehands',ai:{sig:['hook','bhook','upper'],sigP:.5,weak:'frustrates',scout:'Hook, body hook, uppercut in a phone booth. Out-box him and he gets wild and careless.',agg:.8,combo:.5}},
  {id:'mayfield',first:'Lloyd',last:'Mayfield',nick:'Money',div:3,arch:'counter',rating:95,age:25,home:'Grand Rapids, MI',skin:5,hair:'bald',hc:0,trunks:'#161616',homage:'Floyd "Money" Mayweather Jr.',ab:'shellgame',ai:{sig:['jab','cross'],sigP:.4,weak:'body',scout:'Shoulder-rolls everything to the head and pot-shots back. The shell leaves the body open.',block:.75,dodge:.7,counter:.85,agg:.3}},
  {id:'chavarria',first:'Julio',last:'Chavarría',nick:'El Gran Campeón',div:3,arch:'swarmer',rating:92,age:28,home:'Culiacán, MEX',skin:2,hair:'short',hc:0,beard:'mustache',trunks:'#2e9e5b',homage:'Julio César Chávez',ab:'bodybomb',ai:{sig:['bhook','bhook','upper'],sigP:.55,weak:'cuts',scout:'Lives on body hooks, then an uppercut when your hands drop. Cuts easily.',body:.6}},
  {id:'raye',first:'Lenny',last:'Raye',nick:'Sweet',div:4,arch:'boxerpuncher',rating:93,age:24,home:'Palmer Park, MD',skin:4,hair:'short',hc:0,trunks:'#f4efe3',homage:'"Sugar" Ray Leonard',ab:'bolo',ai:{sig:['jab','cross','hook','upper','hook'],sigP:.4,weak:'flurry',scout:'Showboat flurries of five punches. He is wide open after a flurry ends.'}},
  {id:'hurns',first:'Tommy',last:'Hurns',nick:'The Hitman',div:4,arch:'outboxer',rating:92,age:25,home:'Detroit, MI',skin:5,hair:'short',hc:0,beard:'mustache',trunks:'#f0be48',homage:'Thomas "Hitman" Hearns',ab:'hitman',reach:6,ai:{sig:['jab','jab','cross'],sigP:.5,weak:'glass',scout:'A 81-inch jab and a right hand like a hammer. Famously fragile chin.',w:{jab:5,cross:5,hook:1,upper:.5},guard:['low','low','high']}},
  {id:'robbins',first:'Ray',last:'Robbins',nick:'Sugar',div:5,arch:'boxerpuncher',rating:97,age:28,home:'Harlem, NY',skin:4,hair:'slick',hc:0,beard:'mustache',trunks:'#f4efe3',homage:'"Sugar" Ray Robinson',ab:'sweetscience',ai:{sig:['jab','hook','upper'],sigP:.45,weak:'none',scout:'Perfect in every phase. No weakness anyone has found. Stay calm and take the long way.'}},
  {id:'carver',first:'Ruben',last:'Carver',nick:'Cyclone',div:5,arch:'slugger',rating:90,age:27,home:'Paterson, NJ',skin:5,hair:'bald',hc:0,beard:'beard',trunks:'#161616',homage:'Rubin "Hurricane" Carter',ab:'hurricane',ai:{sig:['hook','hook'],sigP:.55,weak:'openAfterHook',scout:'Double left hooks all night. After a hook misses, his guard hangs open.',w:{jab:1,cross:2,hook:6,upper:2}}},
  {id:'hagan',first:'Marv',last:'Hagan',nick:'Marvelous',div:5,arch:'boxerpuncher',rating:93,age:30,home:'Brockton, MA',skin:5,hair:'bald',hc:0,beard:'mustache',trunks:'#7a1f1f',homage:'"Marvelous" Marvin Hagler',ab:'switchhit',southpaw:true,ai:{sig:['cross','hook'],sigP:.45,weak:'slowStart',scout:'Switches stance and grinds. Slow starter: take the first two rounds before he warms up.'}},
  {id:'moorland',first:'Archie',last:'Moorland',nick:'The Old Mongoose',div:6,arch:'counter',rating:91,age:36,home:'St. Louis, MO',skin:5,hair:'short',hc:6,beard:'mustache',trunks:'#161616',homage:'Archie "The Old Mongoose" Moore',ab:'mongoose',ai:{sig:['upper','cross'],sigP:.4,weak:'fader',scout:'Cross-arm guard and ancient counter tricks. He is 36: the tank empties in the late rounds.'}},
  {id:'lister',first:'Sonny',last:'Lister',nick:'The Bear',div:7,arch:'slugger',rating:92,age:33,home:'Forrest City, AR',skin:6,hair:'buzz',hc:0,trunks:'#f4efe3',homage:'Sonny "The Big Bear" Liston',ab:'ironjab',reach:6,ai:{sig:['jab','jab','cross'],sigP:.5,weak:'frustrates',scout:'A jab that breaks noses, and a stare that wins before the bell. Make him miss and he loses his composure.',w:{jab:6,cross:3,hook:2,upper:1},agg:.55,intimidate:1}},
  {id:'frazee',first:'Billy',last:'Frazee',nick:'Smoke',div:7,arch:'swarmer',rating:93,age:27,home:'Philadelphia, PA',skin:6,hair:'short',hc:0,beard:'mustache',trunks:'#2e9e5b',homage:'"Smokin\'" Joe Frazier',ab:'smokinhook',ai:{sig:['bhook','hook','hook'],sigP:.55,weak:'upper',scout:'Bobs low and comes in behind the left hook. He ducks straight into uppercuts.',w:{jab:1,cross:1.5,hook:7,upper:1.5},agg:.85}},
  {id:'tyrell',first:'Mikey',last:'Tyrell',nick:'Iron',div:7,arch:'swarmer',rating:95,age:21,home:'Catskill, NY',skin:5,hair:'buzz',hc:0,trunks:'#161616',homage:'"Iron" Mike Tyson',ab:'peekaboo',ai:{sig:['hook','upper','hook'],sigP:.6,weak:'fader',scout:'A first-round blitz of hooks and uppercuts. Survive the storm; he fades badly after round four.',agg:.9,combo:.7,w:{jab:1,cross:2,hook:4,upper:4},dodge:.6,fadeLate:1}},
  {id:'marchetti',first:'Rocco',last:'Marchetti',nick:'The Rock',div:7,arch:'slugger',rating:91,age:29,home:'Brockton, MA',skin:1,hair:'short',hc:0,trunks:'#d8392f',homage:'Rocky Marciano, 49-0',ab:'suzieq',ai:{sig:['cross','cross'],sigP:.5,weak:'jab',scout:'Short arms, iron chin, and the Suzie Q overhand right. Keep him on the end of your jab.',agg:.85,chinBonus:12}},
  {id:'hollis',first:'Cass',last:'Hollis',nick:'The Lip',div:7,arch:'outboxer',rating:97,age:24,home:'Louisville, KY',skin:4,hair:'short',hc:0,trunks:'#f4efe3',homage:'Muhammad Ali, born Cassius Clay',ab:'ropeadope',ai:{sig:['jab','jab','jab','cross'],sigP:.5,weak:'body',scout:'Dances, talks, and pumps the jab. His hands hang low and he rests on the ropes: go to the body.',agg:.5,dodge:.8,guard:['low','low','high'],trash:1}},
];
/* how each legend homage looks in the inked renderer: body type, hair, nose, scars, game face. Homage cues only, no likeness details. */
const LEGEND_VIS={
  gonzaga:{bt:'brawler',nose:'flat',expr:'stern'},joffrey:{bt:'athletic',expr:'calm'},hameed:{bt:'lanky',hair:'spiky',expr:'cocky',trim:'#f0be48'},
  pacheco:{bt:'athletic',hair:'spiky',beard:'goatee',expr:'grit',shape:{jaw:1.1,chin:1.1,nose:1.05,cheek:1.25,brow:1.35}},durante:{bt:'brawler',hair:'shaggy',nose:'broken',scar:'brow',expr:'grit'},
  mayfield:{bt:'athletic',expr:'cocky'},chavarria:{bt:'brawler',nose:'flat',scar:'brow',expr:'stern'},raye:{bt:'athletic',expr:'cocky'},
  hurns:{bt:'lanky',expr:'stern'},robbins:{bt:'athletic',expr:'calm'},carver:{bt:'brawler',expr:'grit'},hagan:{bt:'brawler',scar:'nose',expr:'stern'},
  moorland:{bt:'athletic',expr:'calm'},lister:{bt:'anvil',nose:'flat',expr:'stern'},frazee:{bt:'brawler',expr:'grit'},
  tyrell:{bt:'anvil',hair:'buzz',expr:'stern',trim:'#161616',robe:'hood',robeCol:'#1d1d1f',robeTrim:'#1d1d1f',shape:{jaw:1.45,chin:1.15,nose:1.15,cheek:1.3,brow:1.5}},marchetti:{bt:'anvil',nose:'broken',scar:'cheek',expr:'stern'},
  hollis:{bt:'athletic',hair:'curly',expr:'cocky',trim:'#161616',robe:'satin',robeCol:'#f4efe3',robeTrim:'#d9a93a',shape:{jaw:1.1,chin:1.05,nose:.95,cheek:1.05,brow:1.15}},
};
/* gear: cosmetic kit, some with trade-off stat effects. unlock = condition shown in the Locker, price in dollars */
const GEAR_SLOTS={gloves:'Gloves',trunks:'Trunks',shoes:'Shoes',mg:'Mouthguard',wraps:'Hand wraps',robe:'Walkout robe'};
const GEAR=[
  {id:'g_std',slot:'gloves',name:'Standard 10 oz',desc:'Reliable sparring-weight gloves.',price:0},
  {id:'g_pillow',slot:'gloves',name:'Pillow 12 oz',desc:'Extra foam: your guard absorbs more, your punches carry less.',price:2500,unlock:{level:3},fx:{def:3,pow:-2},look:{gloveTape:'#f4efe3'}},
  {id:'g_puncher',slot:'gloves',name:"Puncher's 8 oz",desc:'Horsehair padding. Every shot lands harder, and so do theirs through your guard.',price:12000,unlock:{level:6},fx:{pow:3,def:-2},look:{gloveTape:'#161616'}},
  {id:'g_speed',slot:'gloves',name:'Featherweight laces',desc:'Light, fast, a little soft on impact.',price:22000,unlock:{level:8},fx:{spd:2,pow:-1},look:{gloveTape:'#f0be48'}},
  {id:'g_pro',slot:'gloves',name:'Pro lace-ups',desc:'Custom-fitted fight gloves.',price:45000,unlock:{level:12},fx:{pow:1,spd:1},look:{gloveTape:'#f4efe3'}},
  {id:'g_stone',slot:'gloves',name:'Hands of Stone',desc:'Worn by the man you beat. Brutal and heavy.',price:40000,unlock:{legend:'durante'},fx:{pow:4,spd:-1},look:{gloves:'#7a1f1f',gloveTape:'#161616'}},
  {id:'g_belt',slot:'gloves',name:'Championship gold',desc:'Gold-taped gloves for a world champion.',price:120000,unlock:{title:1},fx:{pow:1,def:1},look:{gloveTape:'#f0be48'}},
  {id:'t_std',slot:'trunks',name:'Plain satin',desc:'Your colors, nothing else.',price:0,look:{trunkPat:'solid'}},
  {id:'t_stripe',slot:'trunks',name:'Classic side stripes',desc:'Two stripes down each leg.',price:1500,look:{trunkPat:'stripe'}},
  {id:'t_panel',slot:'trunks',name:'Contrast panels',desc:'Trim-colored side panels.',price:4000,unlock:{level:4},look:{trunkPat:'panel'}},
  {id:'t_mesh',slot:'trunks',name:'Breathable mesh',desc:'Lighter and cooler under the lights.',price:15000,unlock:{level:7},fx:{sta:2},look:{trunkPat:'panel'}},
  {id:'t_flame',slot:'trunks',name:'Flames',desc:'For fighters who want to be noticed.',price:9000,unlock:{wins:5},look:{trunkPat:'flame'}},
  {id:'t_star',slot:'trunks',name:'Stars',desc:'A crowd favorite.',price:20000,unlock:{wins:12},look:{trunkPat:'star'}},
  {id:'t_champ',slot:'trunks',name:'Championship trunks',desc:'Black and gold, with your name on the band.',price:90000,unlock:{title:1},look:{trunkPat:'stripe',trunks:'#161616',trim:'#f0be48'}},
  {id:'s_std',slot:'shoes',name:'High-top boots',desc:'Standard ankle support.',price:0},
  {id:'s_low',slot:'shoes',name:'Low-cut speed boots',desc:'Lighter on your feet, less support late in fights.',price:6000,unlock:{level:5},fx:{foot:2,sta:-1},look:{shoes:'#f4efe3'}},
  {id:'s_grip',slot:'shoes',name:'Grip soles',desc:'Planted feet put your legs into every punch.',price:18000,unlock:{level:9},fx:{pow:1,foot:1},look:{shoes:'#161616'}},
  {id:'s_ankle',slot:'shoes',name:'Ankle-lock boots',desc:'Stable base, steadier defense.',price:9000,unlock:{level:6},fx:{def:1},look:{shoes:'#7a1f1f'}},
  {id:'m_std',slot:'mg',name:'Boil-and-bite',desc:'Gets the job done.',price:0,look:{mg:'#f3efe6'}},
  {id:'m_custom',slot:'mg',name:'Custom-molded',desc:'Fitted by a dentist. Your jaw takes shots better.',price:5000,unlock:{level:4},fx:{chin:2},look:{mg:'#2f6fe2'}},
  {id:'m_breathe',slot:'mg',name:'Breathe-easy',desc:'Open airway design. More gas in the tank.',price:12000,unlock:{level:6},fx:{sta:2},look:{mg:'#2e9e5b'}},
  {id:'m_gel',slot:'mg',name:'Double gel',desc:'Thick and protective, harder to breathe through.',price:26000,unlock:{level:10},fx:{chin:3,sta:-1},look:{mg:'#d8392f'}},
  {id:'m_gold',slot:'mg',name:'Gold grill',desc:'Pure flash. The crowd loves it.',price:60000,unlock:{wins:20},look:{mg:'#f0be48'},hype:1},
  {id:'w_std',slot:'wraps',name:'Gauze and tape',desc:'Standard wraps.',price:0},
  {id:'w_tight',slot:'wraps',name:'Tight tape job',desc:'Knuckles packed hard.',price:3000,unlock:{level:3},fx:{pow:1}},
  {id:'w_pro',slot:'wraps',name:"Cutman's wraps",desc:'Wrapped by a professional: firm and safe.',price:14000,unlock:{level:8},fx:{pow:1,def:1}},
  {id:'r_none',slot:'robe',name:'No robe',desc:'Just walk out.',price:0},
  {id:'r_satin',slot:'robe',name:'Classic silk robe',desc:'+1 hype for every win.',price:5000,unlock:{wins:3},hype:1,look:{robe:'satin'}},
  {id:'r_vest',slot:'robe',name:"Showman's hooded vest",desc:'Sleeveless, frayed, your name on the back. +1 hype for every win.',price:12000,unlock:{level:6},hype:1,look:{robe:'vest'}},
  {id:'r_hood',slot:'robe',name:"Heavy hooded robe",desc:'Terry cloth, hood pulled low. +2 hype for every win.',price:30000,unlock:{level:10},hype:2,look:{robe:'hood',hoodLow:true}},
  {id:'r_gold',slot:'robe',name:"Champion's robe",desc:'+3 hype for every win.',price:150000,unlock:{title:1},hype:3,look:{robe:'gold'}},
  {id:'r_amateur',slot:'robe',name:'Golden Gloves jacket',desc:'Earned with amateur gold. +1 hype for every win.',price:0,unlock:{amgold:1},hype:1,look:{robe:'satin'}},
];
const GEAR_BY=Object.fromEntries(GEAR.map(g=>[g.id,g]));
/* sponsors: pay a share of each purse (half on a loss) and put their name on your waistband for a set number of fights */
const SPONSORS=[
  {id:'ironbrew',name:'IronBrew Energy',band:'IRONBREW',cut:.12,min:1500,fights:5,hype:25,drop:2,perk:'',desc:'An energy drink that wants a scrapper.'},
  {id:'apex',name:'Apex Sportswear',band:'APEX',cut:.1,min:4000,fights:6,hype:45,drop:3,perk:'gear',desc:'Kit maker. Their fighters get 20% off everything in the Locker.'},
  {id:'goldline',name:'Goldline Watches',band:'GOLDLINE',cut:.18,min:25000,fights:4,hype:60,title:1,drop:2,perk:'',desc:'Luxury watches. They only sign champions.'},
];
/* the standard roster: designed recurring contenders from the character sheet */
const SIGNATURES=[
  {id:'basilio',first:'Nico',last:'Basilio',nick:'Scar Tissue',div:4,arch:'swarmer',rating:82,age:28,home:'Syracuse, NY',
    look:{skin:2,hair:'mohawk',hc:2,beard:'stubble',trunks:'#161616',trim:'#d8392f',gloves:'#2f6fe2',bt:'brawler',nose:'broken',scar:'both',ear:'cauliflower',expr:'grit',band:'BASILIO',fs:4711,robe:'vest',robeCol:'#f4efe3',robeTrim:'#2f6fe2',shape:{jaw:1.35,chin:1.25,nose:1.15,cheek:1.2,brow:1.55}}},
  {id:'spike',first:'Jae',last:'Moreno',nick:'Spike',div:2,arch:'outboxer',rating:80,age:23,home:'Los Angeles, CA',
    look:{skin:1,hair:'shaggy',hc:0,beard:'none',trunks:'#f4efe3',trim:'#161616',gloves:'#f4efe3',bt:'lanky',nose:'straight',scar:'none',ear:'normal',expr:'stern',band:'SPIKE',fs:1203,shape:{jaw:.85,chin:1.0,nose:.9,cheek:1.1,brow:1.15}}},
  {id:'anvil',first:'Rocco',last:'Brandt',nick:'The Anvil',div:7,arch:'slugger',rating:84,age:31,home:'Pittsburgh, PA',
    look:{skin:1,hair:'buzz',hc:1,beard:'stubble',trunks:'#161616',trim:'#cfcfcf',gloves:'#7a1f1f',bt:'anvil',nose:'broken',scar:'cheek',ear:'cauliflower',expr:'stern',band:'ROCCO',fs:8080,robe:'hood',hoodLow:true,robeCol:'#3a3330',robeTrim:'#3a3330',shape:{jaw:1.55,chin:1.3,nose:1.25,cheek:1.3,brow:1.65}}},
];
const LEGEND_BY=Object.fromEntries(LEGENDS.map(l=>[l.id,l]));

const FIRST=['Marcus','Danny','Luis','Andre','Tommy','Kenji','Mateo','Darnell','Sergei','Oscar','Jamal','Victor','Eddie','Ramon','Isaac','Felix','Dmitri','Kofi','Angelo','Raul','Terrence','Hector','Yuki','Bilal','Connor','Jesse','Malik','Pedro','Nikolai','Tyrone','Frankie','Javier','Omar','Sean','Leon','Carlos','Abdul','Ivan','Desmond','Rico','Gennady','Sammy','Antonio','Jermaine','Liam','Manny','Rafael','Dante','Joel','Vasyl','Takeshi','Emeka','Paulie','Bernard','Arturo','Mikkel','Teofilo','Curtis','Gilberto','Ray','Nate','Joe','Lamont','Abel','Santiago','Khalid','Brandon','Errol','Diego','Viktor'];
const LAST=['Rivera','Johnson','Okafor','Morales','Kovalenko','Tanaka','Brooks','Castillo','Walker','Delgado','Petrov','Mendez','Hayes','Santos','Barrera','Washington','Kim','O\'Brien','Fuentes','Ibrahim','Carter','Romero','Ward','Vargas','Mitchell','Novak','Sullivan','Guerrero','Bell','Ortiz','Lopez','Holloway','Asante','Reyes','Duran','Pryor','Spence','Malignaggi','Cotto','Klein','Abara','Moreno','Duval','Franco','Ellis','Quarry','Shavers','Lyle','Norton','Tate','Ruiz','Usyk','Benn','Eubank','Haye','Arreola','Bivol','Garcia','Pavlik','Taylor','Zale','Graziano','Basilio','Gavilan','Saddler','Pep','Ortega','Mancini','Arguello','Pintor','Zarate'];
const NICKS=['The Hammer','Lights Out','Kid Dynamite','The Professor','Bad Intentions','El Toro','The Ghost','Silk','Machete','Showtime','The Truth','Iceman','Thunder','The Jackal','Hitman Jr.','The Cobra','Mad Dog','Smooth','The Mechanic','Pitbull','Baby Face','The Saint','Gunner','Hurricane Jr.','Bomber','El Matador','Too Sharp','The Tank','Cyclone','Quicksilver','The Surgeon','Vandal','Mr. Clean','Sugar Shane','Dr. Steelhammer','The Bull','El Chico','Big Country','Razor','The Shadow','Chopper','Golden Boy','Boom Boom','The Dentist','Slick','Pretty Boy','The Executioner','Buzzsaw','No Mercy','Iron Lung','The Animal','Fast Eddie','Spider','The Rock Jr.','Midnight','Tiger','The Pride','Diamond','Cannonball','Steamroller'];
const HOMES=['Philadelphia, PA','Detroit, MI','Brooklyn, NY','Las Vegas, NV','Los Angeles, CA','Houston, TX','Chicago, IL','Mexico City, MEX','Tijuana, MEX','Guadalajara, MEX','San Juan, PUR','Manila, PHI','Kyiv, UKR','Almaty, KAZ','London, ENG','Manchester, ENG','Belfast, NIR','Glasgow, SCO','Accra, GHA','Lagos, NGA','Tokyo, JPN','Osaka, JPN','Havana, CUB','Santo Domingo, DOM','Buenos Aires, ARG','Caracas, VEN','Bogotá, COL','Panama City, PAN','Sydney, AUS','Toronto, CAN','Montreal, CAN','Paris, FRA','Berlin, GER','Moscow, RUS','Sheffield, ENG','Cardiff, WAL','Dublin, IRL','Newark, NJ','Atlantic City, NJ','Baltimore, MD','Oxnard, CA','El Paso, TX','Miami, FL','Cleveland, OH','St. Louis, MO','Youngstown, OH','Brockton, MA','Bangkok, THA','Seoul, KOR','Nairobi, KEN','Johannesburg, RSA','Kingston, JAM','Mumbai, IND','Auckland, NZL','Lviv, UKR','Sofia, BUL','Tashkent, UZB','Phoenix, AZ','Denver, CO','Fresno, CA'];

const PROMOTERS={
  reyes:{name:'Diane Reyes',co:'Clean Corner Boxing',cut:.15,purse:1,step:.85,title:.9,shady:0,drop:3,bonus:5000,minPts:0,fights:5,desc:'Fair deals and careful matchmaking. She protects her fighters.'},
  castellano:{name:'Lou Castellano',co:'Iron Gate Promotions',cut:.25,purse:1.15,step:1.3,title:1,shady:.35,drop:2,bonus:15000,minPts:0,fights:5,desc:'Pushes his fighters fast. Big fights, but read the fine print.'},
  golden:{name:'Max Golden',co:'Golden Glory Promotions',cut:.2,purse:1.25,step:1.1,title:1.1,shady:.1,drop:2,bonus:30000,minPts:260,fights:4,desc:'TV and pay-per-view money. Drops you the moment you stop selling.'},
  kingsley:{name:'Ray Kingsley',co:'Only In America Promotions',cut:.33,purse:1.45,step:1.15,title:1.6,shady:.5,drop:4,bonus:60000,minPts:480,fights:4,desc:'Hair to the sky and belts in his pocket. Takes a big cut, gets you title shots.'},
};
const TRAINERS={
  pops:{name:'Pops Delgado',fee:.05,train:1,corner:1,desc:'Your first coach from the neighborhood gym. Loyal and old-school.'},
  harmon:{name:'Dee Harmon',fee:.1,train:1.12,corner:2,req:{pts:200},desc:'A sharp technician who has built three regional champions.'},
  damato:{name:'Gus Damato',fee:.15,train:1.24,corner:3,teach:'peekaboo',req:{pts:220,maxAge:24},homage:"Cus D'Amato",desc:'Only takes young fighters. Teaches Peek-a-Boo.'},
  fitch:{name:'Eddie Fitch',fee:.15,train:1.2,corner:3,teach:'shoulderroll',req:{pts:350},homage:'Eddie Futch',desc:'A quiet genius of defense. Teaches the Shoulder Roll.'},
  stewart:{name:'Manny Stewart',fee:.2,train:1.28,corner:3,focus:'pow',teach:'haymaker',req:{pts:500},homage:'Emanuel Steward of the Kronk Gym',desc:'Kronk Gym. Turns boxers into punchers. Teaches Haymaker; power gains up.'},
  dunham:{name:'Angie Dunham',fee:.2,train:1.3,corner:4,req:{pts:650},homage:'Angelo Dundee',desc:'The best corner man alive. Fixes cuts and finds the plan.'},
};
const GYMS={
  basement:{name:"Delgado's Basement Gym",cost:0,train:1,desc:'Free. Leaky roof, good heart.'},
  city:{name:'Downtown Boxing Club',cost:2500,train:1.1,desc:'Real sparring partners. Cost per camp.'},
  elite:{name:'Elite Performance Center',cost:15000,train:1.22,desc:'Sports science and film rooms. Cost per camp.'},
  mountain:{name:'Deer Lake Mountain Camp',cost:45000,train:1.35,homage:"Ali's Deer Lake training camp",desc:'Log cabins, mountain roadwork, total focus. Cost per camp.'},
};
const INJ={
  cut:{name:'Facial Cut',wk:[3,6],eff:{cutProne:1},desc:'Reopens easily if you fight on it.'},
  hand:{name:'Broken Hand',wk:[8,12],eff:{pow:.75},desc:'Power -25% if you fight on it.'},
  ribs:{name:'Cracked Ribs',wk:[6,10],eff:{sta:.8},desc:'Stamina -20% if you fight on it.'},
  concussion:{name:'Concussion',wk:[6,12],eff:{chin:.8},desc:'Chin -20%. Fighting on it adds long-term damage.'},
  shoulder:{name:'Torn Rotator Cuff',wk:[12,20],eff:{spd:.8,pow:.9},desc:'Speed -20%, power -10%.'},
  knee:{name:'Sprained Knee',wk:[4,8],eff:{foot:.75},desc:'Footwork -25%.'},
  retina:{name:'Detached Retina',wk:[20,30],eff:{def:.7},severe:true,desc:'Serious. Defense -30% and fighting on it risks your career.'},
};
const VENUES=[
  {min:0,name:'Armory Club Show',city:'local'},
  {min:200,name:'Civic Center',city:'regional'},
  {min:380,name:'Hard Rock Arena',city:'Atlantic City'},
  {min:520,name:'Mandalay Events Center',city:'Las Vegas'},
  {min:680,name:'Madison Square Garden',city:'New York'},
  {min:820,name:'Caesars Outdoor Arena',city:'Las Vegas'},
];

/* generic opponent quirks: one pattern and one soft spot each */
const QUIRKS={
  doubleJab:{name:'Double jab',ai:{sig:['jab','jab'],sigP:.45},scout:'Doubles up the jab constantly.'},
  doubleHook:{name:'Double hook',ai:{sig:['hook','hook'],sigP:.45},weak:'openAfterHook',scout:'Loves the double hook and hangs open after it misses.'},
  bodyFirst:{name:'Body snatcher',ai:{sig:['bhook','cross'],sigP:.45,body:.4},scout:'Goes downstairs first, then up top.'},
  feinter:{name:'Feinter',ai:{sig:['feint','cross'],sigP:.45},weak:'counter',scout:'Feints before the right hand. Counters land clean on him.'},
  slowStarter:{name:'Slow starter',ai:{},weak:'slowStart',scout:'Takes two rounds to get going.'},
  fader:{name:'Front-runner',ai:{agg:.7},weak:'fader',scout:'All gas early, empty late.'},
  glassChin:{name:'Glass chin',ai:{},weak:'glass',scout:'Hits hard but does not take it well.'},
  ironChin:{name:'Iron chin',ai:{chinBonus:12},scout:'Walks through punches.'},
  counterBaiter:{name:'Counter baiter',ai:{counter:.7,agg:.35},weak:'flurry',scout:'Waits for you to lead, then counters. Over-commits when he finally opens up.'},
  swarmerBody:{name:'Pressure',ai:{agg:.8,body:.35},weak:'upper',scout:'Walks in low behind a high guard: uppercuts catch him coming in.'},
};
