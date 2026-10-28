/* ================= dev mode: scenarios, fight lab, flags, logs, sims =================
   Everything here works on the sandbox slot (0). Real careers are never modified. */
const DevState={tab:'lab',lab:{opp:'arch:boxerpuncher',rating:60,diff:'champion',rounds:3,god:false,onehit:false,freeze:false,dummy:'',tellMul:1,timescale:1,overlay:true,seed:''},simYears:2,lastLog:null};

/* ---------- fixtures: deterministic career states ---------- */
function sandboxCareer(seed,o={}){
  const look={skin:2,hair:'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f'};
  newCareer(Object.assign({slot:0,sandbox:true,seed,first:'Dev',last:'Tester',nick:'The Fixture',home:'Philadelphia, PA',age:19,stance:'orthodox',look,height:70,build:'medium',arms:'avg',arch:'boxerpuncher',diff:'champion',name:'Dev Tester'},o));
  return G;
}
/* play n pro fights in the sandbox, forcing results, to reach a career stage quickly */
function ffFights(n,how='W'){
  for(let i=0;i<n;i++){
    ensureState();if(G.phase!=='pro')return;
    if(!G.offers.length)genOffers();
    const o=G.offers.find(o=>o.type==='stepup')||G.offers.find(o=>o.type==='level')||G.offers[0];if(!o)return;
    acceptOffer(o);while(G.next.weeksLeft>0)campResult('bag',.8,true);
    const res=simFight(o);
    if(how==='W'){res.winner='p';res.method=i%3===0?'KO':'UD';res.round=res.method==='KO'?randi(2,o.rounds):o.rounds;res.kdFor=res.method==='KO'?1:0;res.kdAgainst=0;res.dmgTaken=40}
    else if(how==='L'){res.winner='o';res.method='UD';res.round=o.rounds;res.kdFor=0;res.kdAgainst=0}
    applyResult(o,res);G.offers=[];
  }
}
function goPro(promo='castellano'){G.am.done=true;turnPro();signPromoter(promo,15000);G.next=null;G.flags.am_gold_0=true;G.flags.am_gold_1=true}
function bookOffer(o){if(!o)return false;acceptOffer(o);G.next.weeksLeft=0;G.next.scout=1;return true}
function bookVs(f,label,extra={}){const o=mkOffer(f,extra.type||'level',label,extra.desc||'Dev scenario.',extra);return bookOffer(o)}
const SCENARIOS=[
  {id:'am1',title:'First amateur bout',desc:'Fresh career, Golden Gloves quarterfinal on fight night.',build(seed){sandboxCareer(seed);ensureState();G.next.weeksLeft=0}},
  {id:'pro1',title:'First pro fight',desc:'Just turned pro with a promoter, a 4-rounder booked.',build(seed){sandboxCareer(seed);goPro();ensureState();bookOffer(G.offers.find(o=>o.type==='tuneup')||G.offers[0])}},
  {id:'stepup',title:'Step-up fight on a streak',desc:'6-0 with a step-up offer booked.',build(seed){sandboxCareer(seed);goPro();ffFights(6);genOffers();bookOffer(G.offers.find(o=>o.type==='stepup')||G.offers[0])}},
  {id:'proveit',title:'Prove-it fight after two losses',desc:'Momentum negative, prove-it offer booked.',build(seed){sandboxCareer(seed);goPro();ffFights(5);ffFights(2,'L');genOffers();bookOffer(G.offers.find(o=>o.type==='prove')||G.offers[0])}},
  {id:'title',title:'World title shot',desc:'Top-3 contender with a title shot booked.',build(seed){sandboxCareer(seed);goPro();ffFights(14);B().pts=Math.max(B().pts,ranking(B().div)[2].pts+5);genOffers();if(!bookOffer(G.offers.find(o=>o.type==='world'))){const c=champsIn(B().div)[0];bookVs(c,'World Title Shot',{type:'world',title:{belts:beltsOf(c.id,B().div)}})}}},
  {id:'champ',title:'Champion: mandatory defense',desc:'Holding two belts, mandatory defense booked.',build(seed){sandboxCareer(seed);goPro();ffFights(14);const d=B().div;G.world.champs[d].WBF='P';G.world.champs[d].IBC='P';B().titleWins=1;B().formerChamp=true;G.flags.lastDefWeek=G.week;genOffers();bookOffer(G.offers.find(o=>o.type==='world'&&o.title?.defense)||G.offers[0])}},
  {id:'unify',title:'Unification bout',desc:'Two belts each. Winner takes four.',build(seed){sandboxCareer(seed);goPro();ffFights(14);const d=B().div;G.world.champs[d].WBF='P';G.world.champs[d].IBC='P';B().titleWins=1;G.flags.lastDefWeek=G.week;genOffers();bookOffer(G.offers.find(o=>o.type==='unify')||G.offers[0])}},
  {id:'rival',title:'Grudge match with your rival',desc:'The rival is ranked beside you and the grudge fight is booked.',build(seed){sandboxCareer(seed);goPro();ffFights(6);const rv=rivalF();rv.pts=B().pts+20;G.rival.lastMet=-99;genOffers();if(!bookOffer(G.offers.find(o=>o.grudge)))bookVs(rv,'Grudge Match',{type:'grudge',grudge:true})}},
  {id:'veteran',title:'Aging veteran (35)',desc:'Former champ at 35, speed fading, comeback fight booked.',build(seed){sandboxCareer(seed,{age:22});goPro();ffFights(14);B().born-=13*52;B().formerChamp=true;B().titleWins=2;B().stats.spd-=12;B().stats.foot-=10;B().damage=45;genOffers();bookOffer(G.offers[0])}},
  {id:'weight',title:'Weight move decision',desc:'Ranked pro at the Division screen, no fight booked.',build(seed){sandboxCareer(seed);goPro();ffFights(8);G.offers=[];G.next=null;G._screen='division'}},
  {id:'injury',title:'Fighting hurt (broken hand)',desc:'A broken hand with a fight booked anyway.',build(seed){sandboxCareer(seed);goPro();ffFights(5);B().injuries=[{id:'hand',wk:6}];genOffers();bookOffer(G.offers[0])}},
  {id:'cut',title:'Cut-prone, long fight',desc:'A 10-rounder with an open cut going in.',build(seed){sandboxCareer(seed);goPro();ffFights(9);B().injuries=[{id:'cut',wk:3}];genOffers();bookOffer(G.offers.find(o=>o.rounds>=10)||G.offers[0])}},
  {id:'retire',title:'Near retirement',desc:'Age 38, damage 92. The end is close.',build(seed){sandboxCareer(seed,{age:22});goPro();ffFights(20);B().born-=16*52;B().damage=92;G.offers=[];G.next=null;genOffers();G._screen='legacy'}},
  {id:'legend',title:'Legend fight…',desc:'Pick any of the 18 legends; the fight is booked in their division.',pick:'legend'},
  {id:'chapter',title:'Story chapter…',desc:'Force a chapter offer. Shows why if the chapter cannot fire.',pick:'chapter'},
  {id:'event',title:'Life event…',desc:'Trigger a specific life event on a mid-career sandbox.',pick:'event'},
  {id:'mini',title:'Mini-game…',desc:'Run a single training mini-game.',pick:'mini'},
];
function buildLegend(id,seed){
  sandboxCareer(seed);goPro();const L=LEGEND_BY[id];
  const f=Object.values(G.world.f).find(x=>x.legend===id)||legendFighter(L);
  if(!G.world.f[f.id]){G.world.f[f.id]=f;G.world.divs[f.div].push(f.id)}
  if(f.div!==B().div){B().natural=f.div;B().div=f.div}
  ffFights(10);const bl=beltsOf(f.id,f.div);
  bookVs(f,`vs ${fullName(f)}`,bl.length?{type:'world',title:{belts:bl}}:{type:'stepup'});
}
function buildChapter(id,seed){
  sandboxCareer(seed);goPro();
  const b=B();
  const pre={
    century(){ffFights(12);b.record.l=0;b.pts=ranking(b.div)[1].pts+1},
    jungle(){ffFights(12);b.born-=6*52;b.pts=ranking(b.div)[5].pts+1;const c=champsIn(b.div)[0];if(c)c.rating=Math.max(c.rating,playerOvr()+8)},
    buster(){ffFights(10);b.pts=ranking(b.div)[9].pts+1;const c=champsIn(b.div)[0];if(c)c.rating=Math.max(c.rating,playerOvr()+12)},
    thrilla(){ffFights(8);G.rival.met=2;G.rival.lastMet=G.week-40;const rv=rivalF();rv.active=true;rv.div=b.div},
    phantom(){ffFights(12);const c=champsIn(b.div)[0];G.flags.tookFrom=c.id;G.flags.tookWeek=G.week-30;const d=b.div;const bl=beltsOf(c.id,d);bl.forEach(k=>G.world.champs[d][k]='P');if(!bl.length)G.world.champs[d].WBF='P'},
    nomas(){ffFights(6);ffFights(1,'L');ffFights(2)},
    comeback(){ffFights(12);b.born-=14*52;b.formerChamp=true;b.titleWins=1;b.pts=ranking(b.div)[10].pts+1},
  }[id];
  if(pre)pre();
  G.offers=[];G.next=null;
  const ch=CHAPTERS.find(c=>c.id===id);
  if(ch&&ch.offer){const o=ch.offer();if(o){o.chapter=id;bookOffer(o);return 'Booked: '+ch.title}return 'Conditions not met for '+ch.title+' (check offer() in 25-events.js).'}
  if(id==='hurricane'||id==='exile'){ffFights(12);if(id==='exile'){G.world.champs[b.div].WBF='P'}G._event=id;return 'Event ready: '+id}
  if(id==='longcount'){const c=champsIn(b.div)[0];ffFights(12);bookVs(c,'Title fight (long count armed)',{type:'world',title:{belts:beltsOf(c.id,b.div)}});return 'Booked a title fight: get knocked down once to see the long count.'}
  if(id==='fortynine'){ffFights(25);G._screen='legacy';return 'Record 25-0 in the sandbox. Retire from Legacy to trigger 49-0.'}
  return 'No builder for '+id;
}
function buildEvent(id,seed){sandboxCareer(seed);goPro();ffFights(8);B().money=250000;G._event=id}

/* ---------- screen ---------- */
SCR.dev=()=>{
  const tabs=[['lab','Fight lab'],['scen','Scenarios'],['flags','Flags'],['logs','Fight logs'],['sim','Sim'],['tools','Tools']];
  const body=({lab:devLab,scen:devScen,flags:devFlags,logs:devLogs,sim:devSim,tools:devTools})[DevState.tab]();
  const inner=`<div class="topbar"><button class="btn sm back" data-go="${G?'home':'title'}">◀</button><div class="t">Dev mode</div></div>
    <div class="chips">${tabs.map(t=>`<button class="chip${DevState.tab===t[0]?' on':''}" data-act="devtab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>${body}`;
  return G?shell('dev','Dev mode',inner):`<div class="scr"><div class="wrap">${inner}</div></div>`;
};
function devLab(){
  const L=DevState.lab;
  const opts=[['arch:boxerpuncher','Generic · Boxer-Puncher'],['arch:slugger','Generic · Slugger'],['arch:swarmer','Generic · Swarmer'],['arch:outboxer','Generic · Out-Boxer'],['arch:counter','Generic · Counter-Puncher']]
    .concat(G&&G.next?[['next','Next booked opponent']]:[]).concat(G&&rivalF()?[['rival','Your rival']]:[]).concat(LEGENDS.map(l=>['legend:'+l.id,`Legend · ${l.first} ${l.last} (${DIVS[l.div].short})`]));
  const sel=(k,arr)=>`<select data-lab="${k}">${arr.map(([v,t])=>`<option value="${v}"${String(L[k])===String(v)?' selected':''}>${t}</option>`).join('')}</select>`;
  const tg=(k,l)=>`<button class="chip${L[k]?' on':''}" data-act="labtg" data-k="${k}">${l}</button>`;
  return `<div class="grid2">
    <div class="card col"><h3>Opponent</h3>
      <label class="field"><span class="lbl">Fighter</span>${sel('opp',opts)}</label>
      <label class="field"><span class="lbl">Generic rating: <span id="labr">${L.rating}</span></span><input type="range" data-lab="rating" min="30" max="97" value="${L.rating}" style="accent-color:var(--gold)"></label>
      <div class="grid2" style="gap:8px"><label class="field"><span class="lbl">Difficulty</span>${sel('diff',Object.keys(DIFF).map(k=>[k,DIFF[k].name]))}</label>
      <label class="field"><span class="lbl">Rounds</span>${sel('rounds',[[1,'1'],[3,'3'],[6,'6'],[10,'10'],[12,'12']])}</label></div>
      <label class="field"><span class="lbl">Seed (blank = random)</span><input data-lab="seed" value="${esc(L.seed)}" placeholder="e.g. 42" inputmode="numeric"></label>
      <p class="muted" style="font-size:13px">Your boxer: ${G?`${B().first} ${B().last} (OVR ${playerOvr()}, level ${B().level})`:'a standard 55-rated boxer (no career loaded)'}.</p></div>
    <div class="card col"><h3>Cheats & overlays</h3>
      <div class="chips">${tg('god','God mode')}${tg('onehit','One-hit KO')}${tg('freeze','Freeze AI')}${tg('overlay','Telegraph overlay')}</div>
      <label class="field"><span class="lbl">Dummy mode</span>${sel('dummy',[['','Normal AI'],['idle','Idle (never punches)'],['jab','Only jabs'],['cross','Only crosses'],['hook','Only hooks'],['upper','Only uppercuts']])}</label>
      <label class="field"><span class="lbl">Tell length ×<span id="labt">${L.tellMul}</span></span><input type="range" data-lab="tellMul" min="0.5" max="2.5" step="0.1" value="${L.tellMul}" style="accent-color:var(--gold)"></label>
      <label class="field"><span class="lbl">Time scale ×<span id="labs">${L.timescale}</span></span><input type="range" data-lab="timescale" min="0.25" max="1.5" step="0.25" value="${L.timescale}" style="accent-color:var(--gold)"></label>
      <button class="btn primary" data-act="labgo">Start lab fight</button>
      <p class="muted" style="font-size:12.5px">Lab fights never touch a career. Pause → Flag this moment works inside them. Each fight is logged in Fight logs.</p></div></div>`;
}
function devScen(){
  const seedIn=`<label class="field"><span class="lbl">Seed</span><input id="scseed" value="${esc(DevState.scSeed||'1234')}" inputmode="numeric"></label>`;
  return `<div class="card col"><p style="font-size:14px">Each scenario builds a fresh <b>sandbox career</b> (slot 0) from the seed, so the same seed always gives the same world, opponents and rolls. Your real careers are untouched.</p>${seedIn}</div>
    <div class="grid2">${SCENARIOS.map(s=>`<button class="navb" data-act="scen" data-id="${s.id}" style="min-height:64px"><b>${esc(s.title)}</b><small>${esc(s.desc)}</small></button>`).join('')}</div>`;
}
function devFlags(){
  const fl=Flags.list();
  return `<div class="row sp"><h2 class="sec">Flags (${fl.length})</h2><div class="row"><button class="btn sm" data-act="flagnow">⚑ Flag now</button><button class="btn sm gold" data-act="flagexp">Export all</button>${fl.length?'<button class="btn sm ghost" data-act="flagclear">Clear</button>':''}</div></div>
    ${fl.length?fl.map(f=>`<div class="card col" style="gap:6px"><div class="row sp"><span class="pill ${f.tag==='bug'?'red':f.tag==='idea'?'blue':f.tag==='balance'?'gold':''}">${esc(f.tag)}</span><span class="dim num" style="font-size:12px">${new Date(f.when).toLocaleString()}</span></div>
      <p>${esc(f.note)||'<span class="dim">(no note)</span>'}</p>
      <p class="muted" style="font-size:12.5px">${esc(f.screen)}${f.career?` · ${esc(f.career.name)} L${f.career.level} ${f.career.phase}${f.career.sandbox?' (sandbox)':''}`:''}${f.fight?` · fight seed ${f.fight.seed} R${f.fight.round} ${f.fight.clock}s vs ${esc(f.fight.cfg.o)} · you ${f.fight.p.hp}hp / them ${f.fight.o.hp}hp`:''}</p>
      <div class="row">${f.fight?`<button class="btn sm" data-act="flagreplay" data-id="${f.id}">Replay fight seed</button>`:''}<button class="btn sm ghost" data-act="flagdel" data-id="${f.id}">Delete</button></div></div>`).join(''):'<div class="card dim">No flags yet. Pause a fight and tap "Flag this moment", or use Flag now on any screen.</div>'}`;
}
function devLogs(){
  const logs=Logs.list();
  const cur=DevState.lastLog?logs.find(l=>l.id===DevState.lastLog)||logs[0]:logs[0];
  return `<div class="row sp"><h2 class="sec">Fight logs</h2><button class="btn sm gold" data-act="logexp">Export</button></div>
    <div class="chips">${logs.map(l=>`<button class="chip${cur&&l.id===cur.id?' on':''}" data-act="logpick" data-id="${l.id}">${esc(l.meta.o)} · ${l.res?l.res.winner==='p'?'W':l.res.winner==='o'?'L':'D':'?'} ${esc(l.res?.method||'')}</button>`).join('')||'<span class="dim">No fights logged yet.</span>'}</div>
    ${cur?logView(cur):''}`;
}
function logView(L){
  const ev=L.ev,tells=ev.filter(e=>e.ev==='tell');
  // pair each tell with the next inputs and its resolution
  const rows=[];for(let i=0;i<ev.length;i++){const e=ev[i];if(e.ev!=='tell')continue;const inputs=[],res=null;let r=null;
    for(let j=i+1;j<ev.length&&!r;j++){const x=ev[j];if(x.ev==='in'&&x.os==='wind')inputs.push(x);if(x.ev==='res'&&x.who==='o')r=x;if(x.ev==='tell')break}
    rows.push({tell:e,inputs,r})}
  const types=['jab','cross','hook','upper'],resp={};const label=x=>x.r?(x.r.r==='miss'?(x.r.fl==='dodge'?'dodged':'missed'):x.r.r==='block'?'blocked':x.r.r==='hit'?'hit':x.r.r):'—';
  for(const t of types)resp[t]={dodged:0,blocked:0,hit:0,missed:0,n:0};
  const rts=[];
  for(const x of rows){const k=label(x);if(resp[x.tell.type]&&resp[x.tell.type][k]!=null){resp[x.tell.type][k]++;resp[x.tell.type].n++}
    const first=x.inputs.find(i=>i.a.startsWith('slip')||i.a==='duck'||i.a==='block');if(first)rts.push(first.oT)}
  rts.sort((a,b)=>a-b);const med=rts.length?rts[Math.floor(rts.length/2)]:null;
  const grid=`<div class="tblw"><table class="t"><tr><th>Their punch</th><th class="r">n</th><th class="r">dodged</th><th class="r">blocked</th><th class="r">hit you</th><th class="r">missed</th></tr>
    ${types.map(t=>{const r=resp[t];const pc=k=>r.n?Math.round(r[k]/r.n*100)+'%':'–';return `<tr><td style="color:${TELL_COL[t]}">${t}</td><td class="r">${r.n}</td><td class="r good">${pc('dodged')}</td><td class="r">${pc('blocked')}</td><td class="r bad">${pc('hit')}</td><td class="r">${pc('missed')}</td></tr>`}).join('')}</table></div>`;
  // timeline canvas per round
  const rounds=Math.max(1,...ev.map(e=>e.r||1));
  const tl=`<canvas id="tlcv" data-log="${L.id}" width="900" height="${rounds*46+10}" style="width:100%;height:auto;background:var(--ink);border-radius:8px"></canvas>`;
  const stats=L.res?.stats;
  return `<div class="card col"><div class="row sp"><h3>${esc(L.meta.p)} vs ${esc(L.meta.o)}</h3><span class="pill">${esc(L.meta.diff)} · ${L.meta.rounds}×${L.meta.roundLen}s · seed ${L.meta.seed}</span></div>
    <div class="grid3"><div class="card flat"><span class="lbl">Result</span><p class="rec">${L.res?(L.res.winner==='p'?'Win':L.res.winner==='o'?'Loss':'Draw')+' · '+L.res.method+' R'+L.res.round:'—'}</p></div>
      <div class="card flat"><span class="lbl">Median reaction</span><p class="rec num">${med!=null?Math.round(med*1000)+' ms':'–'}</p><span class="dim" style="font-size:12px">after the tell started (${rts.length} samples)</span></div>
      <div class="card flat"><span class="lbl">Punches</span><p class="rec num">${stats?`${stats.p.landed}/${stats.p.thrown} · ${stats.o.landed}/${stats.o.thrown}`:'–'}</p></div></div>
    <span class="lbl">Timeline (gold = their tells, blue = your dodges/blocks, red = you got hit, green = you landed, ✕ knockdown)</span>${tl}
    <span class="lbl">Tell vs. your response</span>${grid}
    <div class="row"><button class="btn sm" data-act="logreplay" data-id="${L.id}">Replay this seed in the lab</button></div></div>`;
}
function drawTimeline(cv,L){
  const x=cv.getContext('2d'),W=cv.width,ev=L.ev,len=L.meta.roundLen||45,rounds=Math.max(1,...ev.map(e=>e.r||1));
  x.fillStyle='#0d0f1d';x.fillRect(0,0,W,cv.height);
  const X=t=>60+(t/len)*(W-70);
  const rt0={};for(const e of ev){if(e.ev==='tell'&&rt0[e.r]==null)rt0[e.r]=0}
  // time within round: events carry absolute fight time; subtract the round's first time
  const first={};for(const e of ev){if(first[e.r]==null)first[e.r]=e.t}
  for(let r=1;r<=rounds;r++){const y=10+(r-1)*46;x.fillStyle='#a0a7c6';x.font='12px Barlow Condensed, sans-serif';x.fillText('R'+r,10,y+20);x.fillStyle='#1a1f38';x.fillRect(60,y+4,W-70,30)}
  for(const e of ev){const y=10+((e.r||1)-1)*46,t=e.t-(first[e.r]||0);if(t<0||t>len+1)continue;const px=X(t);
    if(e.ev==='tell'){x.fillStyle=TELL_COL[e.type]||'#fff';x.fillRect(px,y+6,Math.max(2,(e.dur/len)*(W-70)),8)}
    else if(e.ev==='in'&&(e.a.startsWith('slip')||e.a==='duck'||e.a==='block')){x.fillStyle='#7fb0ff';x.fillRect(px,y+16,2,8)}
    else if(e.ev==='res'&&e.who==='o'&&e.r==='hit'){x.fillStyle='#f05a55';x.fillRect(px-1,y+26,3,8)}
    else if(e.ev==='res'&&e.who==='p'&&e.r==='hit'){x.fillStyle='#4fca8e';x.fillRect(px-1,y+26,3,8)}
    else if(e.ev==='kd'){x.fillStyle=e.who==='o'?'#4fca8e':'#f05a55';x.font='bold 16px sans-serif';x.fillText('✕',px-6,y+30)}
  }
}
function devSim(){
  return `<div class="card col"><h3>Sim N years</h3><p style="font-size:14px">Auto-plays the <b>sandbox</b> career: accepts the best offer, auto-trains, simulates fights by the stats, resolves events randomly. Use it to check pacing, money, aging and matchmaking.</p>
    ${G?G.sandbox?'':'<p class="warnt">A real career is loaded. Clone it to the sandbox first (Tools) or run a scenario.</p>':'<p class="warnt">No career loaded. Run a scenario first.</p>'}
    <div class="chips">${[1,2,4,8].map(n=>`<button class="chip${DevState.simYears===n?' on':''}" data-act="simyears" data-n="${n}">${n} year${n>1?'s':''}</button>`).join('')}</div>
    <button class="btn primary" data-act="simrun" ${G&&G.sandbox?'':'disabled'}>Run</button>
    ${DevState.simOut?`<div class="card flat"><pre style="white-space:pre-wrap;font-size:12.5px;margin:0">${esc(DevState.simOut)}</pre></div>`:''}</div>`;
}
function devTools(){
  return `<div class="grid2">
    <div class="card col"><h3>Sandbox</h3><p class="muted" style="font-size:13.5px">Slot 0. Never listed on the title screen.</p>
      ${G&&!G.sandbox?'<button class="btn" data-act="clonesb">Clone current career into sandbox</button>':''}
      ${Save.peek(0)?'<button class="btn" data-act="loadsb">Load sandbox</button><button class="btn ghost" data-act="delsb">Delete sandbox</button>':'<p class="dim">Empty.</p>'}</div>
    <div class="card col"><h3>Quick cheats (sandbox only)</h3>
      <div class="chips"><button class="chip" data-act="cheat" data-k="money">+$100K</button><button class="chip" data-act="cheat" data-k="xp">+Level</button><button class="chip" data-act="cheat" data-k="pts">+100 rank pts</button><button class="chip" data-act="cheat" data-k="heal">Heal all</button><button class="chip" data-act="cheat" data-k="age">+1 year</button><button class="chip" data-act="cheat" data-k="abil">All abilities</button></div></div>
    <div class="card col"><h3>Trigger life event</h3><div class="chips">${EVENTS.map(e=>`<button class="chip" data-act="devevent" data-id="${e.id}">${esc(e.title)}</button>`).join('')}</div><p class="dim" style="font-size:12px">Needs a loaded career; the event's own conditions are skipped.</p></div>
    <div class="card col"><h3>Dev mode</h3><p class="muted" style="font-size:13.5px">Build ${typeof PWA_BUILD!=='undefined'?PWA_BUILD:'dev'} · ${esc(navigator.userAgent.slice(0,60))}… · ${innerWidth}×${innerHeight} @${devicePixelRatio}</p><button class="btn ghost" data-act="devoff">Turn dev mode off</button></div></div>`;
}
AFTER.dev=()=>{
  const cv=$('#tlcv');if(cv){const L=Logs.list().find(l=>l.id===cv.dataset.log);if(L)drawTimeline(cv,L)}
  $$('[data-lab]').forEach(el=>{el.addEventListener(el.type==='range'?'input':'change',()=>{const k=el.dataset.lab;let v=el.value;if(['rating','rounds','tellMul','timescale'].includes(k))v=+v;DevState.lab[k]=v;const sp={rating:'#labr',tellMul:'#labt',timescale:'#labs'}[k];if(sp&&$(sp))$(sp).textContent=v})});
  const ss=$('#scseed');if(ss)ss.addEventListener('input',()=>DevState.scSeed=ss.value);
};
function labFight(seedOverride){
  const L=DevState.lab;Sfx.init();
  let pc;
  if(G){pc=playerCombat()}else{const look={skin:2,hair:'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f'};pc={name:'You',first:'You',last:'You',stats:Object.fromEntries(STAT_KEYS.map(k=>[k,55])),look,stance:'orthodox',reach:71,abilities:['onetwo','secondwind'],mods:{}}}
  let oc,label;
  if(L.opp.startsWith('arch:')){const arch=L.opp.slice(5);oc={name:ARCH[arch].name+' '+L.rating,first:'Lab',last:ARCH[arch].name,stats:statsFromRating(L.rating,arch),look:RNG.with(new Rng(hashStr(L.opp+L.rating)),()=>randomLook()),stance:'orthodox',reach:71,ai:deep(ARCH[arch].ai),abilities:L.rating>=80?[ARCH[arch].ability]:[]};label='Lab: '+oc.name}
  else if(L.opp.startsWith('legend:')){const id=L.opp.slice(7);const f=(G&&Object.values(G.world.f).find(x=>x.legend===id))||RNG.with(new Rng(7),()=>{const g=G;G=G||{week:0,world:{f:{},divs:[[],[],[],[],[],[],[],[]],champs:[]}};const lf=legendFighter(LEGEND_BY[id]);if(!g)G=null;return lf});oc=oppCombat(f);label='Lab: '+oc.name}
  else if(L.opp==='next'&&G&&G.next){oc=oppCombat(G.world.f[G.next.offer.oppId]);label='Lab: next opponent'}
  else if(L.opp==='rival'&&G&&rivalF()){oc=oppCombat(rivalF());label='Lab: rival'}
  else{oc={name:'Lab',first:'Lab',last:'Partner',stats:statsFromRating(55,'boxerpuncher'),look:randomLook(),stance:'orthodox',reach:71,ai:deep(ARCH.boxerpuncher.ai),abilities:[]};label='Lab'}
  const seed=seedOverride??(L.seed!==''&&!isNaN(+L.seed)?+L.seed:undefined);
  const F=new Fight({p:pc,o:oc,rounds:+L.rounds,roundLen:Settings.roundLen,diff:L.diff,practice:true,corner:2,trainerName:'Lab',label,seed,overlay:L.overlay,
    cheats:{god:L.god,onehit:L.onehit,freeze:L.freeze,dummy:L.dummy||null,tellMul:L.tellMul!==1?L.tellMul:0,timescale:L.timescale!==1?L.timescale:0},
    onEnd:res=>{DevState.lastLog=res.log?.id||null;DevState.tab='logs';UI.go('dev')}});
  F.mount();
}
function runScenario(id,seed){
  const s=SCENARIOS.find(x=>x.id===id);if(!s)return;
  seed=(+seed||1234)>>>0;
  if(s.pick==='legend'){const m=modal(`<h2 class="sec">Pick a legend</h2><div class="chips">${LEGENDS.map(l=>`<button class="chip" data-leg="${l.id}">${l.first} ${l.last} · ${DIVS[l.div].short}</button>`).join('')}</div><button class="btn ghost" data-close="x">Cancel</button>`,{wide:true});
    m.addEventListener('click',e=>{const b=e.target.closest('[data-leg]');if(!b)return;m.remove();buildLegend(b.dataset.leg,seed);finishScenario()});return}
  if(s.pick==='chapter'){const m=modal(`<h2 class="sec">Pick a chapter</h2><div class="chips">${CHAPTER_INFO.map(c=>`<button class="chip" data-ch="${c.id}">${esc(c.title)}</button>`).join('')}</div><button class="btn ghost" data-close="x">Cancel</button>`,{wide:true});
    m.addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(!b)return;m.remove();const msg=buildChapter(b.dataset.ch,seed);finishScenario(msg)});return}
  if(s.pick==='event'){const m=modal(`<h2 class="sec">Pick an event</h2><div class="chips">${EVENTS.map(ev=>`<button class="chip" data-ev="${ev.id}">${esc(ev.title)}</button>`).join('')}</div><button class="btn ghost" data-close="x">Cancel</button>`,{wide:true});
    m.addEventListener('click',e=>{const b=e.target.closest('[data-ev]');if(!b)return;m.remove();buildEvent(b.dataset.ev,seed);finishScenario()});return}
  if(s.pick==='mini'){const m=modal(`<h2 class="sec">Pick a mini-game</h2><div class="chips">${Object.keys(MG).map(k=>`<button class="chip" data-mg="${k}">${MG[k].title}</button>`).join('')}</div><button class="btn ghost" data-close="x">Cancel</button>`);
    m.addEventListener('click',e=>{const b=e.target.closest('[data-mg]');if(!b)return;m.remove();runMinigame(b.dataset.mg,q=>{toast('Score '+Math.round(q*100)+'%');UI.render()})});return}
  s.build(seed);finishScenario();
}
function finishScenario(msg){
  const screen=G._screen||'home',ev=G._event;delete G._screen;delete G._event;
  Save.write();UI.go(screen);
  if(msg)toast(msg);
  if(ev)setTimeout(()=>checkEvent(true,ev),200);
}
function simYears(n){
  const weeks=n*52,w0=G.week,out=[],b=B();let fights=0,inj=0,evs=0;const t0=performance.now();
  const start={pts:b.pts,rank:playerRank(),money:b.money,level:b.level,ovr:playerOvr(),rec:recStr(b.record),belts:playerBelts().length,age:ageOf(b.born)};
  let guard=0;
  while(G.week-w0<weeks&&G.phase!=='retired'&&guard++<400){
    if(G.phase==='amateur'){if(G.am.done){if(G.am.stage===0){startAmateur(1);G.am.done=false;G.next=null}else goPro('reyes')}}
    ensureState();
    if(!G.next){if(!G.offers.length)genOffers();const o=G.offers.find(o=>o.type==='world'||o.type==='unify')||G.offers.find(o=>o.type==='stepup')||G.offers[0];if(!o){advanceWeeks(2);continue}acceptOffer(o)}
    if(b.injuries.length&&G.next.weeksLeft<Math.max(...b.injuries.map(i=>i.wk)))advanceWeeks(1);
    while(G.next.weeksLeft>0)campResult(G.next.fatigue>45?'rest':pick(['bag','speed','rope','mitts','film']),.6,true);
    while(b.statPts>0){const k=pick(STAT_KEYS);if(b.stats[k]<99){b.stats[k]++;b.statPts--}else b.statPts--}
    for(const s of SKILLS)if(canBuySkill(s)){b.skillPts-=s.t;b.skills.push(s.id);if(s.ability)unlockAbility(s.ability)}
    const o=G.next.offer,res=simFight(o);applyResult(o,res);fights++;if(res.winner!=='p'&&o.title){}
    G.offers=[];
    const e=maybeEvent();if(e){evs++;pick(e.choices).fx()}
    inj+=b.injuries.length?1:0;
    if(b.damage>=100||ageOf(b.born)>=45){retireNow('Sim: forced retirement');break}
  }
  const end={pts:b.pts,rank:playerRank(),money:b.money,level:b.level,ovr:playerOvr(),rec:recStr(b.record),belts:playerBelts().length,age:ageOf(b.born)};
  out.push(`${n} year(s) simulated in ${Math.round(performance.now()-t0)} ms · ${fights} fights · ${evs} events · ${inj} fight-weeks injured`);
  for(const k in start)out.push(`${k.padEnd(6)} ${String(start[k]).padEnd(14)} → ${end[k]}`);
  out.push(`titles won ${b.titleWins} · defenses ${b.defenses} · legends beaten ${b.legendsBeaten.length} · chapters ${G.chapters.join(',')||'none'} · damage ${Math.round(b.damage)}`);
  out.push('Recent fights:');G.history.slice(-8).forEach(h=>out.push(`  ${dateStr(h.w)} ${h.res} ${h.method} vs ${h.opp} (${h.label||h.type}) OVR ${h.oppRating}`));
  Save.write();
  return out.join('\n');
}
Object.assign(ACT,{
  devtab(el){DevState.tab=el.dataset.v;UI.render()},
  labtg(el){DevState.lab[el.dataset.k]=!DevState.lab[el.dataset.k];UI.render()},
  labgo(){labFight()},
  scen(el){runScenario(el.dataset.id,DevState.scSeed||$('#scseed')?.value||'1234')},
  flagnow(){flagMoment(null,()=>UI.render())},
  flagdel(el){Flags.remove(el.dataset.id);UI.render()},
  flagclear(){confirmBox('Clear all flags?','This deletes every saved flag.','Clear',()=>{Flags.clear();UI.render()},true)},
  flagexp(){const code=JSON.stringify(Flags.list(),null,1);const m=modal(`<h2 class="sec">Flags export</h2><p class="muted" style="font-size:13px">Copy and paste this to Claude for a review pass.</p><textarea id="exp" rows="10" readonly style="font-size:11px;font-family:monospace">${esc(code)}</textarea><div class="row"><button class="btn gold grow" id="cpy">Copy</button><button class="btn ghost" data-close="x">Close</button></div>`,{wide:true});$('#cpy',m).onclick=()=>{navigator.clipboard?.writeText(code).then(()=>toast('Copied')).catch(()=>{$('#exp',m).select();toast('Selected, copy manually')})}},
  flagreplay(el){const f=Flags.list().find(x=>x.id===el.dataset.id);if(!f||!f.fight)return;DevState.lab.seed=String(f.fight.seed);if(f.fight.cfg.legend)DevState.lab.opp='legend:'+f.fight.cfg.legend;DevState.lab.diff=f.fight.cfg.diff||'champion';DevState.lab.rounds=f.fight.cfg.rounds||3;labFight(f.fight.seed)},
  logpick(el){DevState.lastLog=el.dataset.id;UI.render()},
  logreplay(el){const L=Logs.list().find(x=>x.id===el.dataset.id);if(!L)return;DevState.lab.seed=String(L.meta.seed);if(L.meta.oLegend)DevState.lab.opp='legend:'+L.meta.oLegend;DevState.lab.diff=L.meta.diff||'champion';DevState.lab.rounds=L.meta.rounds||3;labFight(L.meta.seed)},
  logexp(){const L=Logs.list();const code=JSON.stringify(L.map(l=>({meta:l.meta,res:l.res,n:l.ev.length,ev:l.ev})));const m=modal(`<h2 class="sec">Fight logs export</h2><textarea id="exp" rows="10" readonly style="font-size:11px;font-family:monospace">${esc(code)}</textarea><div class="row"><button class="btn gold grow" id="cpy">Copy</button><button class="btn ghost" data-close="x">Close</button></div>`,{wide:true});$('#cpy',m).onclick=()=>{navigator.clipboard?.writeText(code).then(()=>toast('Copied')).catch(()=>{$('#exp',m).select()})}},
  simyears(el){DevState.simYears=+el.dataset.n;UI.render()},
  simrun(){if(!G||!G.sandbox)return;DevState.simOut=simYears(DevState.simYears);UI.render()},
  clonesb(){if(!G)return;const g=JSON.parse(Save.serialize());g.slot=0;g.sandbox=true;loadCareer(g);Save.write();toast('Cloned into the sandbox');UI.render()},
  loadsb(){const g=Save.read(0);if(!g)return;loadCareer(g);UI.go('home')},
  delsb(){Save.remove(0);if(G&&G.slot===0){G=null;UI.go('title')}else UI.render()},
  cheat(el){if(!G||!G.sandbox){toast('Sandbox only');return}const b=B(),k=el.dataset.k;
    if(k==='money')b.money+=100000;if(k==='xp')addXP(xpNeed(b.level)-b.xp+1);if(k==='pts')b.pts=Math.min(1000,b.pts+100);if(k==='heal'){b.injuries=[];b.damage=0}if(k==='age')advanceWeeks(52);if(k==='abil')for(const id in AB)unlockAbility(id);
    Save.write();UI.render();toast('Done')},
  devevent(el){if(!G){toast('Load a career first');return}checkEvent(true,el.dataset.id)},
  devoff(){toggleDev(false)},
});
