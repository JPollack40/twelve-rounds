/* ================= trophies: milestones kept across every career on this device ================= */
const TROPHIES=[
  {id:'first_win',name:'First Blood',desc:'Win your first pro fight.',fight:c=>c.win&&c.pro},
  {id:'first_ko',name:'Lights Out',desc:'Win a pro fight by knockout.',fight:c=>c.win&&c.ko&&c.pro},
  {id:'r1_ko',name:'Early Night',desc:'Knock someone out in the first round.',fight:c=>c.win&&c.ko&&c.res.round===1&&c.pro},
  {id:'canvas',name:'Off the Canvas',desc:'Get knocked down and still win.',fight:c=>c.win&&c.res.kdAgainst>0},
  {id:'untouch',name:'Untouchable',desc:'Win with 15 perfect dodges and no knockdowns against you.',fight:c=>c.win&&!c.res.kdAgainst&&(c.res.stats?.p?.perfect||0)>=15},
  {id:'upset',name:'Upset Special',desc:'Beat a fighter rated 8 or more above you.',fight:c=>c.win&&c.pro&&c.f.rating>=playerOvr()+8},
  {id:'legend1',name:'Giant Killer',desc:'Beat a legend.',fight:c=>c.win&&!!c.f.legend},
  {id:'legend5',name:'Pantheon',desc:'Beat five legends in one career.',fight:()=>B().legendsBeaten.length>=5},
  {id:'champ',name:'Champion',desc:'Win a world title.',fight:()=>B().titleWins>0},
  {id:'unified',name:'Unified',desc:'Hold two world titles in one division at once.',fight:()=>beltsOf('P',B().div).length>=2},
  {id:'undisputed',name:'Undisputed',desc:'Hold all four belts at once.',fight:()=>beltsOf('P',B().div).length>=4},
  {id:'twodiv',name:'Two-Weight World Champion',desc:'Win world titles in two divisions.',fight:()=>B().titleDivs.length>=2},
  {id:'reign',name:'Long Reign',desc:'Make five title defenses.',fight:()=>B().defenses>=5},
  {id:'unbeaten',name:'Perfect Record',desc:'Start your pro career 20-0.',fight:()=>B().record.w>=20&&!B().record.l&&!B().record.d},
  {id:'rival',name:'Settled',desc:'Beat your rival three times.',fight:()=>(G.rival?.w||0)>=3},
  {id:'chapters',name:'Storyteller',desc:'Complete three story chapters in one career.',fight:()=>G.chapters.length>=3},
  {id:'p4p',name:'Pound-for-Pound King',desc:'Be ranked the best fighter in the world, pound for pound.',fight:()=>p4pRank()===1},
  {id:'women',name:'Trailblazer',desc:"Win a world title in women's boxing.",fight:()=>isW()&&B().titleWins>0},
  {id:'men',name:'Lineal',desc:"Win a world title in men's boxing.",fight:()=>!isW()&&B().titleWins>0},
  {id:'hof',name:'Canastota',desc:'Retire as a Hall of Famer.',retire:L=>L.score>=300},
  {id:'goat',name:'The Greatest',desc:'Retire as The Greatest of All Time.',retire:L=>L.score>=800},
  {id:'d_win',name:'Daily Grind',desc:'Win a daily challenge.',daily:c=>c.sc.win},
  {id:'d_three',name:'Three Gloves',desc:'Stop a daily challenge legend for three gloves.',daily:c=>c.sc.stars>=3},
  {id:'d_streak',name:'Week of Wins',desc:'Win the daily challenge seven days running.',daily:c=>c.st.streak>=7},
];
function trophyState(){return Store.get('tr_trophies')||{}}
/* kind: 'fight' | 'retire' | 'daily'. Sandbox careers (dev tools, tests) never award trophies */
function trophyCheck(kind,ctx){
  if(kind!=='daily'&&(!G||G.sandbox))return [];
  const st=trophyState(),got=[];
  for(const T of TROPHIES){if(st[T.id]||!T[kind])continue;let ok=false;try{ok=!!T[kind](ctx)}catch(e){}
    if(ok){st[T.id]={t:Date.now(),who:kind==='daily'?'Daily challenge':G&&G.boxer?`${B().first} ${B().last}`:''};got.push(T)}}
  if(got.length){Store.set('tr_trophies',st);if(!UI.silent)got.forEach((T,i)=>setTimeout(()=>{toast(`🏆 Trophy: ${T.name}`);Sfx.great()},600+i*1400))}
  return got}
SCR.trophies=()=>{
  const st=trophyState(),n=TROPHIES.filter(T=>st[T.id]).length;
  const body=`<p class="muted" style="font-size:13.5px;margin-top:0">${n} of ${TROPHIES.length} won. Trophies carry across every career on this device.</p>
    <div class="bar" style="margin:6px 0 14px"><i style="width:${n/TROPHIES.length*100}%"></i></div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">${TROPHIES.map(T=>{const g=st[T.id];return `<div class="card row" style="gap:12px;align-items:center;${g?'border-color:var(--gold)':'opacity:.55'}">
      <div style="font-size:30px;filter:${g?'none':'grayscale(1)'}">${g?'🏆':'🔒'}</div><div class="grow"><b class="ui ${g?'goldt':''}" style="font-size:16px;text-transform:uppercase;letter-spacing:.04em">${esc(T.name)}</b>
      <div style="font-size:13.5px">${esc(T.desc)}</div>${g?`<div class="dim" style="font-size:12px">${new Date(g.t).toLocaleDateString()}${g.who?' · '+esc(g.who):''}</div>`:''}</div></div>`}).join('')}</div>`;
  if(G&&G.boxer)return shell('legacy','Trophies',body);
  return `<div class="scr"><div class="wrap" style="max-width:900px"><div class="topbar"><button class="btn sm back" data-go="title">◀</button><div class="t">Trophies</div></div>${body}</div></div>`;
};
