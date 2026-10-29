/* ================= career / world simulation ================= */
const START_YEAR=2027;
const SAVE_V=1;
let G=null;
/* RNG streams live in G so a reloaded career keeps rolling the same dice */
function careerRng(){if(!G)return null;if(!G._rng)G._rng={career:new Rng(G.rng?.career??G.seed),world:new Rng(G.rng?.world??(G.seed^0x5bd1e995))};return G._rng}
function syncRng(){if(G&&G._rng)G.rng={career:G._rng.career.s,world:G._rng.world.s}}
function useCareerRng(){const r=careerRng();RNG.cur=r?r.career:null}

const B=()=>G.boxer;
function ageOf(born){return Math.floor((G.week-born)/52)}
function dateStr(w){w=w??G.week;const y=START_YEAR+Math.floor(w/52);const m=Math.min(11,Math.floor((w%52)/52*12));return MONTHS[m]+' '+y}
/* circuit: every career is in the men's or the women's world; legends, names, frames and pronouns follow it */
function isW(){return !!(typeof G!=='undefined'&&G&&G.circuit==='w')}
function inCircuit(x){return !!x.w===isW()}
function divLb(d){return isW()&&DIVS[d].lbW?DIVS[d].lbW:DIVS[d].lb}
const W_HAIRS=['ponytail','ponytail','ponytail','bun','bun','twinbraids','twinbraids','braids','short','curly','afro','slick','buzz','topknot'];
/* fighter text is written with he/him; the women's world swaps the pronouns */
function gtxt(t){if(!isW()||!t)return t;const m={he:'she',He:'She',him:'her',Him:'Her',his:'her',His:'Her',himself:'herself',men:'women',man:'woman'};return t.replace(/\b(he|He|him|Him|his|His|himself|men|man)\b/g,w=>m[w])}
function fullName(f){return f.nick?`${f.first} “${f.nick}” ${f.last}`:`${f.first} ${f.last}`}
function shortName(f){return `${f.first} ${f.last}`}
function recStr(f){return `${f.w}-${f.l}${f.d?'-'+f.d:''}`}
function randomLook(){const w=isW();return {skin:randi(0,SKIN.length-1),hair:pick(w?W_HAIRS:HAIRS.slice(0,11)),hc:chance(.8)?randi(0,2):randi(0,HAIRC.length-1),beard:w||chance(.6)?'none':pick(BEARDS),fem:w?1:undefined,trunks:pick(COLORS),trim:pick(COLORS),gloves:chance(.5)?'#d8392f':pick(COLORS),
  nose:pick(['straight','straight','broken','flat']),scar:chance(.28)?pick(['brow','cheek','nose']):'none',ear:chance(.15)?'cauliflower':'normal',expr:pick(['grit','stern','stern','calm','cocky']),fs:randi(0,9999)}}
/* visual traits for fighters made before the inked renderer: derived from a hash so the world RNG stream is untouched */
function fillLook(f){const L=f.look=f.look||{};const r=new Rng(hashStr(String(f.id||f.last||'x')));const p=a=>a[Math.floor(r.next()*a.length)];
  if(L.fs==null)L.fs=Math.floor(r.next()*10000);if(!L.nose)L.nose=p(['straight','straight','broken','flat']);if(!L.scar)L.scar=r.next()<.28?p(['brow','cheek','nose']):'none';
  if(!L.ear)L.ear=r.next()<.15?'cauliflower':'normal';if(!L.expr)L.expr=p(['grit','stern','stern','calm','cocky']);
  if(!L.bt)L.bt=r.next()<.75?(R3_BT_BY_ARCH[f.arch]||'athletic'):p(['lanky','athletic','brawler','anvil']);
  if(f.legend&&LEGEND_VIS[f.legend]&&!L.legendVis){Object.assign(L,LEGEND_VIS[f.legend]);L.legendVis=1}
  return L}
const R3_BT_BY_ARCH={outboxer:'lanky',counter:'athletic',boxerpuncher:'athletic',swarmer:'brawler',slugger:'anvil'};

function ovr(s){return Math.round((s.pow*1.1+s.spd*1.1+s.sta+s.chin+s.def+s.foot*.9+s.iq*.9)/7)}
function statsFromRating(r,arch){const base=ARCH[arch].base,s={};for(const k of STAT_KEYS)s[k]=clamp(Math.round(r+(base[k]-47)*.8+rand(-4,4)),15,99);return s}

/* ---------- world ---------- */
function makeFighter(div,rating,age,o={}){
  const arch=o.arch||pick(Object.keys(ARCH));
  const h=(isW()?[60,62,63,65,66,68,70,72]:[63,65,66,68,70,72,74,76])[div]+randi(-2,2);
  const f={id:'f'+uid(),first:o.first||pick(isW()?FIRST_W:FIRST),last:o.last||pick(LAST),nick:o.nick!==undefined?o.nick:(chance(.55)?pick(NICKS):''),
    home:o.home||pick(HOMES),div,arch,rating:Math.round(clamp(rating,25,99)),born:G.week-age*52-randi(0,51),w:0,l:0,d:0,ko:0,pts:0,
    look:o.look||randomLook(),stance:o.southpaw?'southpaw':(chance(.18)?'southpaw':'orthodox'),height:h,reach:h+randi(-1,4)+(o.reach||0),
    legend:o.legend||null,active:true,pot:o.pot||Math.round(clamp(rating+rand(0,18),40,97)),quirk:o.legend?null:(chance(.65)?pick(Object.keys(QUIRKS)):null)};
  const n=clamp(Math.round((age-19)*2.3+rand(-3,3)),0,55);
  const wp=clamp(.3+f.rating/150+rand(-.08,.08),.3,1);
  f.w=Math.round(n*wp);f.l=n-f.w;f.d=chance(.25)?randi(0,2):0;
  f.ko=Math.round(f.w*(arch==='slugger'?.75:arch==='swarmer'?.6:.45));
  if(f.legend&&f.l>3)f.l=randi(0,2);
  if(!f.look.bt)f.look.bt=chance(.75)?R3_BT_BY_ARCH[arch]:pick(['lanky','athletic','brawler','anvil']);
  f.pts=Math.round(clamp(f.rating*10-180+(f.w-f.l)*3+rand(-40,40),20,1000));
  return f;
}
function legendFighter(L){
  const look=Object.assign({skin:L.skin,hair:L.hair,hc:L.hc||0,beard:L.beard||'none',fem:L.w?1:undefined,trunks:L.trunks,trim:'#f4efe3',gloves:L.trunks==='#d8392f'?'#f4efe3':'#d8392f',nose:'straight',scar:'none',ear:'normal',expr:'stern',fs:hashStr(L.id)%10000,band:L.last.toUpperCase()},LEGEND_VIS[L.id]||{},{legendVis:1});
  const f=makeFighter(L.div,L.rating,L.age,{first:L.first,last:L.last,nick:L.nick,home:L.home,arch:L.arch,look,southpaw:L.southpaw,reach:L.reach||0,legend:L.id,pot:L.rating});
  f.pts=Math.round(clamp(f.rating*10-120+rand(0,40),600,1000));
  return f;
}
function genWorld(){
  const W={f:{},divs:[],champs:[]};
  for(let d=0;d<8;d++){
    const ids=[];
    const add=f=>{W.f[f.id]=f;ids.push(f.id)};
    LEGENDS.filter(l=>l.div===d&&inCircuit(l)).forEach(l=>add(legendFighter(l)));
    SIGNATURES.filter(x=>x.div===d&&inCircuit(x)).forEach(x=>{const f=makeFighter(d,x.rating,x.age,{first:x.first,last:x.last,nick:x.nick,home:x.home,arch:x.arch,look:deep(x.look),pot:x.rating+4});f.sig=x.id;f.quirk=null;add(f)});
    const tiers=[[2,85,91],[6,75,85],[10,63,75],[18,40,63]];
    for(const [n,a,b] of tiers)for(let i=0;i<n;i++)add(makeFighter(d,rand(a,b),randi(20,35)));
    W.divs.push(ids);
  }
  G.world=W;
  for(let d=0;d<8;d++)assignChamps(d,true);
}
function divFighters(d){return G.world.divs[d].map(id=>G.world.f[id]).filter(f=>f&&f.active)}
function assignChamps(d,init){
  const list=divFighters(d).sort((a,b)=>b.pts-a.pts);
  const ch=G.world.champs[d]||{};
  BODIES.forEach((bd,i)=>{
    if(init||!ch[bd.k]||(ch[bd.k]!=='P'&&!G.world.f[ch[bd.k]]?.active)||(ch[bd.k]!=='P'&&G.world.f[ch[bd.k]]?.div!==d)){
      const taken=new Set(Object.values(ch));
      let c=list[init?(i%3):0];
      if(!init)c=list.find(f=>!taken.has(f.id))||list[0];
      if(init&&i===3&&chance(.5))c=list[0];
      ch[bd.k]=c?c.id:null;
    }
  });
  G.world.champs[d]=ch;
}
function beltsOf(id,d){const ch=G.world.champs[d]||{};return BODIES.filter(b=>ch[b.k]===id).map(b=>b.k)}
function playerBelts(){const out=[];for(let d=0;d<8;d++)beltsOf('P',d).forEach(k=>out.push({k,d}));return out}
function ranking(d){
  const list=divFighters(d).map(f=>({id:f.id,pts:f.pts,f}));
  if(G.phase==='pro'&&B().div===d)list.push({id:'P',pts:B().pts,f:null});
  list.sort((a,b)=>b.pts-a.pts);
  return list;
}
function playerRank(){if(G.phase!=='pro')return null;const r=ranking(B().div).findIndex(e=>e.id==='P');return r<0?null:r+1}
function rankOf(id,d){const r=ranking(d).findIndex(e=>e.id===id);return r+1}

/* ---------- player stats ---------- */
function skillMods(){
  const m={};for(const id of B().skills){const s=SKILLS.find(x=>x.id===id);if(s&&s.mods)for(const k in s.mods)m[k]=(m[k]||0)+s.mods[k]}
  return m;
}
function weightInfo(div){
  const b=B();div=div??b.div;const d=div-b.natural;
  const red=Math.min(.8,(G.staff.nutri?.4:0)+(skillMods().cut||0)+(G.next?.cutWork||0)*.2);
  const T={
    '-2':{pow:1.12,chin:1.1,spd:1,sta:.74,miss:.25,label:'Brutal weight cut',tone:'bad',note:'Much bigger than them, but drained on fight night.'},
    '-1':{pow:1.06,chin:1.05,spd:1,sta:.9,miss:.06,label:'Weight cut',tone:'warn',note:'Size advantage, slight stamina cost.'},
    '0':{pow:1,chin:1,spd:1,sta:1,miss:0,label:'Natural weight',tone:'good',note:'No penalties.'},
    '1':{pow:.92,chin:.92,spd:1.06,sta:1.04,miss:0,label:'Moved up',tone:'warn',note:'Faster than them, but they hit harder.'},
    '2':{pow:.84,chin:.84,spd:1.1,sta:1.06,miss:0,label:'Way above natural',tone:'bad',note:'Fighting much bigger opponents.'},
  }[String(d)];
  if(!T)return null;
  const r=Object.assign({},T);
  if(r.sta<1)r.sta=1-(1-r.sta)*(1-red);
  r.miss*=(1-red);r.diff=d;
  return r;
}
/* ---------- gear ---------- */
function gearState(){const b=B();if(!b.gear)b.gear={owned:GEAR.filter(g=>!g.price&&!g.unlock).map(g=>g.id),eq:{gloves:'g_std',trunks:'t_std',shoes:'s_std',mg:'m_std',wraps:'w_std',robe:'r_none'},seen:[]};return b.gear}
function gearUnlock(g){const b=B(),u=g.unlock;if(!u)return {ok:true};
  if(u.level&&b.level<u.level)return {ok:false,why:`Reach level ${u.level}`};
  if(u.wins&&b.record.w<u.wins)return {ok:false,why:`Win ${u.wins} pro fights`};
  if(u.title&&!b.titleWins)return {ok:false,why:'Win a world title'};
  if(u.amgold&&!(G.flags.am_gold_0||G.flags.am_gold_1))return {ok:false,why:'Win amateur gold'};
  const lg=isW()&&u.legendW?u.legendW:u.legend;
  if(lg&&!b.legendsBeaten.includes(lg)){const L=LEGEND_BY[lg];return {ok:false,why:`Beat ${L.first} "${L.nick}" ${L.last}`}}
  return {ok:true}}
function gearEquipped(){const st=gearState();return Object.values(st.eq).map(id=>GEAR_BY[id]).filter(Boolean)}
function gearMods(){const m={};for(const g of gearEquipped())for(const k in g.fx||{})m[k]=(m[k]||0)+g.fx[k];for(const k in m)m[k]=clamp(m[k],-5,5);return m}
function gearHype(){return gearEquipped().reduce((s,g)=>s+(g.hype||0),0)}
function playerLook(){const b=B();const L=Object.assign({},b.look);for(const g of gearEquipped())Object.assign(L,g.look||{});if(G.sponsor){const S=SPONSORS.find(x=>x.id===G.sponsor.id);if(S)L.band=S.band}return L}
function gearPrice(g){return Math.round(g.price*(G.sponsor&&G.sponsor.id==='apex'?.8:1)/100)*100}
function buyGear(id){const g=GEAR_BY[id],st=gearState(),b=B();if(!g||st.owned.includes(id))return 'owned';const u=gearUnlock(g);if(!u.ok)return u.why;if(b.money<gearPrice(g))return `You need ${money(gearPrice(g))}`;
  b.money-=gearPrice(g);st.owned.push(id);st.eq[g.slot]=id;news(`You buy ${g.name}.`);return ''}
function equipGear(id){const g=GEAR_BY[id],st=gearState();if(!g||!st.owned.includes(id))return false;st.eq[g.slot]=id;return true}
/* free unlocks (price 0 with a condition) are granted; newly purchasable items are announced once */
function gearCheckUnlocks(lines){const st=gearState();st.seen=st.seen||[];const fresh=[];
  for(const g of GEAR){if(!g.unlock||st.seen.includes(g.id))continue;if(gearUnlock(g).ok){st.seen.push(g.id);if(!g.price&&!st.owned.includes(g.id))st.owned.push(g.id);fresh.push(g)}}
  if(fresh.length){const t=`New in the Locker: ${fresh.map(g=>g.name).join(', ')}.`;news(t,'gold');lines&&lines.push(t)}return fresh.length}
function effectiveStats(){
  const b=B(),s=Object.assign({},b.stats),w=weightInfo()||{pow:1,chin:1,spd:1,sta:1};
  const gm=gearMods();for(const k in gm)if(s[k]!=null)s[k]+=gm[k];
  s.pow*=w.pow;s.chin*=w.chin;s.spd*=w.spd;s.sta*=w.sta;
  s.chin-=b.damage*.22;
  for(const inj of b.injuries){const e=INJ[inj.id].eff;for(const k in e)if(s[k]!=null)s[k]*=e[k]}
  for(const k of STAT_KEYS)s[k]=clamp(Math.round(s[k]),10,110);
  return s;
}
function playerOvr(){return ovr(B().stats)}
function xpNeed(l){return 150+l*80}
function addXP(n){
  const b=B();let ups=0;b.xp+=Math.round(n);
  while(b.level<60&&b.xp>=xpNeed(b.level)){b.xp-=xpNeed(b.level);b.level++;ups++;b.statPts+=3;b.skillPts+=1+(b.level%5===0?1:0)}
  return ups;
}
function gainStat(k,n){const b=B();const before=b.stats[k];b.stats[k]=clamp(b.stats[k]+n,1,99);return b.stats[k]-before}
function hasAbility(id){return B().abilities.includes(id)}
function unlockAbility(id,why){const b=B();if(b.abilities.includes(id))return false;b.abilities.push(id);if(b.equipped.length<slotsCount())b.equipped.push(id);news(`New ability: ${AB[id].name}${why?' ('+why+')':''}.`,'gold');return true}
function slotsCount(){return B().level>=15?3:2}

/* ---------- new career ---------- */
function newCareer(o){
  const seed=(o.seed??RNG.seed())>>>0;
  G={v:SAVE_V,slot:o.slot,created:Date.now(),diff:o.diff,circuit:o.circuit==='w'?'w':'m',week:0,phase:'amateur',seed,rng:{career:seed,world:(seed^0x5bd1e995)>>>0},sandbox:!!o.sandbox,
    boxer:null,world:null,rival:null,promoter:null,trainer:'pops',gym:'basement',staff:{cutman:false,nutri:false},
    offers:[],next:null,newsList:[],flags:{},chapters:[],history:[],am:{stage:0,round:0,opps:[],results:[]},pending:[],seen:{}};
  useCareerRng();
  const base=ARCH[o.arch].base,stats={};for(const k of STAT_KEYS)stats[k]=base[k];
  const natural=clamp(Math.round((o.height-(G.circuit==='w'?58:62))/2+BUILDS[o.build].off),0,7);
  G.boxer={name:o.name,first:o.first,last:o.last,nick:o.nick,home:o.home,stance:o.stance,look:o.look,height:o.height,build:o.build,
    reach:o.height+ARMS[o.arms].d,arch:o.arch,born:-(o.age*52)-randi(0,40),natural,div:natural,stats,level:1,xp:0,statPts:0,skillPts:1,
    skills:[],abilities:[ARCH[o.arch].ability],equipped:[ARCH[o.arch].ability],damage:0,injuries:[],hype:5,money:1500,pts:0,
    record:{w:0,l:0,d:0,ko:0},am:{w:0,l:0},form:[],streak:0,legendsBeaten:[],regional:null,formerChamp:false,titleWins:0,defenses:0,undisputed:0,titleDivs:[],retired:false};
  genWorld();
  const rv=makeFighter(natural,Math.max(40,playerOvr()+1),o.age,{arch:counterArch(o.arch)});
  rv.rival=true;rv.pts=60;rv.w=rv.l=rv.d=rv.ko=0;rv.pro=false;rv.edge=rand(0,4);
  G.world.f[rv.id]=rv;G.world.divs[natural].push(rv.id);rv.active=false;
  G.rival={id:rv.id,w:0,l:0,met:0,lastMet:-99,since:0};G.heat={[rv.id]:60};
  news(`${o.first} ${o.last} walks into Delgado's Basement Gym. Pops Delgado agrees to train you.`);
  news(`Across town, ${shortName(rv)} is also making noise in the amateurs. Pops says: "That kid wants what you want."`,'red');
  startAmateur(0);
  return G;
}
function counterArch(a){return {outboxer:'swarmer',slugger:'counter',swarmer:'outboxer',counter:'slugger',boxerpuncher:pick(['slugger','swarmer','counter'])}[a]}
function rivalF(){return G.rival?G.world.f[G.rival.id]:null}
/* ---------- rivalries: every fighter carries "heat" with you. Fights, close or stolen decisions, losses, callouts and living next to
   each other in the rankings build it; it cools every fight, faster when they fall behind you or leave the division. The hottest
   fighter in your division becomes your rival, so a rival who can't keep pace is replaced by someone who can. ---------- */
const RIVAL_MIN=30;
function heatOf(id){return (G.heat||{})[id]||0}
function addHeat(id,v){if(!id||id==='P'||!G.world.f[id])return;const H=G.heat=G.heat||{};H[id]=Math.min(150,(H[id]||0)+v)}
function rivalTick(f,res,o){
  const b=B(),d=b.div,H=G.heat=G.heat||{};G.heatPrev=Object.assign({},H);
  for(const id in H){const x=G.world.f[id];if(!x||!x.active){delete H[id];continue}
    let k=x.rival?.93:.88;if(x.div!==d)k*=.7;if(Math.abs((x.pts||0)-b.pts)>300)k*=.8;else if(Math.abs(rankOf(id,d)-(playerRank()||99))>15)k*=.85;H[id]*=k;if(H[id]<1)delete H[id]}
  if(f&&f.id&&!o.amateur){const win=res.winner==='p',loss=res.winner==='o',ko=['KO','TKO','RTD','DQ'].includes(res.method);
    let h=8;if(loss)h+=ko?18:14;if(win&&!ko)h+=5;if(win&&ko)h-=4;if(res.robbery)h+=25;if(['SD','MD'].includes(res.method)||res.winner==='draw')h+=10;if(o.title)h+=6;
    addHeat(f.id,h)}
  const rk=ranking(d),my=rk.findIndex(e=>e.id==='P');
  if(my>=0)rk.forEach((e,i)=>{if(e.id==='P')return;if(Math.abs(i-my)<=2)addHeat(e.id,3);if(my<=6&&beltsOf(e.id,d).length)addHeat(e.id,3)});
  rivalPick();
}
function rivalPick(){
  const H=G.heat||{},b=B(),cur=rivalF();
  if(cur&&!cur.active){news(`${shortName(cur)} retires. Your rivalry is over: ${G.rival.w}-${G.rival.l} head to head.`,'red');endRival();}
  const now=rivalF(),curH=now?heatOf(now.id):0;
  let best=null,bh=0;for(const id in H){const x=G.world.f[id];if(!x||!x.active||x.div!==b.div||x.id===now?.id)continue;if(H[id]>bh){bh=H[id];best=x}}
  // a rivalry lasts at least eighteen months unless it has gone cold or they left the division; a challenger must clearly burn hotter
  const settled=now&&now.div===b.div&&curH>=10&&G.week-(G.rival.since||0)<78;
  if(best&&!settled&&bh>=RIVAL_MIN&&bh>=curH+18)setRival(best);
}
function endRival(){const old=rivalF();if(!old)return;old.rival=false;(G.rivalHist=G.rivalHist||[]).push({id:old.id,name:fullName(old),w:G.rival.w,l:G.rival.l,from:G.rival.since||0,to:G.week});G.rival=null}
function setRival(f){
  const old=rivalF();if(old){news(`Your rivalry with ${shortName(old)} has cooled (${G.rival.w}-${G.rival.l} head to head).`);endRival()}
  f.rival=true;f.edge=f.edge||0;const h=G.history.filter(x=>x.pro&&x.oppId===f.id);
  G.rival={id:f.id,w:h.filter(x=>x.res==='W').length,l:h.filter(x=>x.res==='L').length,met:h.length,lastMet:h.length?h[h.length-1].w:-99,since:G.week};
  const q=h.some(x=>x.res==='L')?pick(['"I beat you once. I\'ll do it again."','"You know who owns you."']):h.some(x=>x.robbery)?pick(['"The judges saw it right. Cry about it."']):h.length?pick(['"Run it back. This time there\'s no doubt."','"That night still keeps me up. Not anymore."']):pick(['"Everybody keeps saying your name. Say mine."','"There\'s only room for one of us at the top."','"I\'m coming for everything you have."']);
  news(`Bad blood: ${fullName(f)} (${recStr(f)}) is your new rival. ${q}`,'red');
}
/* ---------- back of the line: after a loss, title shots and champion callouts wait until you win your way back.
   A robbery costs nothing, a split or majority decision one win, a clear decision two, a stoppage three ---------- */
function titleLock(){
  const H=G.history.filter(h=>h.pro);let wins=0,i=H.length-1;for(;i>=0&&H[i].res!=='L';i--)if(H[i].res==='W')wins++;
  if(i<0)return 0;const L=H[i];const need=L.robbery?0:['SD','MD'].includes(L.method)?1:['KO','TKO','RTD','DQ'].includes(L.method)?3:2;
  return Math.max(0,need-wins)}
/* ---------- pound for pound: the best fighters in the world regardless of weight ---------- */
function p4pScore(f){const titles=f.titles||0,bl=beltsOf(f.id,f.div).length;return f.rating+bl*4+(bl===4?6:0)+Math.min(10,Math.max(-6,(f.w-2*f.l)*.15))+titles*1.5+(f.legend?2:0)}
function p4pList(n=10){
  const L=Object.values(G.world.f).filter(f=>f.active&&f.pro!==false&&!f.amateur).map(f=>({id:f.id,f,s:p4pScore(f)}));
  if(G.phase==='pro'){const b=B(),bl=beltsOf('P',b.div).length;L.push({id:'P',f:null,s:playerOvr()+bl*4+(bl===4?6:0)+Math.min(10,Math.max(-6,(b.record.w-2*b.record.l)*.15))+b.titleWins*1.5+b.defenses*.4})}
  return L.sort((a,c)=>c.s-a.s).slice(0,n)}
function p4pRank(){const i=p4pList(10).findIndex(e=>e.id==='P');return i<0?null:i+1}
function rivalryWins(){return (G.rival?.w||0)+(G.rivalHist||[]).reduce((s,r)=>s+r.w,0)}
/* ---------- callouts: a request, not a guarantee. The champion only answers contenders who have earned it ---------- */
function calloutChance(t){
  const b=B(),d=b.div,me=playerRank()||99,tr=rankOf(t.id,d),champ=beltsOf(t.id,d).length>0,mine=beltsOf('P',d).length>0;
  let p;
  if(champ)p=(mine?.75:me<=3?.85:me<=5?.65:me<=10?.3:me<=15?.1:me<=25?.03:0)*(!mine&&titleLock()?.15:1);
  else if(t.rival)p=.85;
  else if(tr>me)p=.9;
  else{const gap=me-tr;p=gap<=2?.8:gap<=5?.6:gap<=10?.3:gap<=20?.08:.02}
  if(p>0)p+=clamp((b.hype-40)*.002,-.06,.08)+(heatOf(t.id)>=20?.06:0);
  if(champ&&!mine&&me>15)p=Math.min(p,.04);
  return clamp(p,0,.95)}
function chanceLabel(p){return p>=.75?'Likely':p>=.5?'Good chance':p>=.25?'Possible':p>=.08?'Long shot':p>0?'Very unlikely':'No chance'}
function calloutTargets(beaten){
  const b=B(),d=b.div,me=playerRank()||99,seen=new Set([beaten?.id]),out=[];
  const add=f=>{if(f&&f.active&&f.div===d&&!seen.has(f.id)){seen.add(f.id);out.push(f)}};
  BODIES.forEach(x=>{const id=G.world.champs[d][x.k];if(id&&id!=='P')add(G.world.f[id])});
  const rv=rivalF();if(rv)add(rv);
  ranking(d).forEach((e,i)=>{if(e.id!=='P'&&i+1>=me-10&&i+1<=me+2&&!beltsOf(e.id,d).length)add(e.f)});
  return out.slice(0,8)}

/* ---------- news ---------- */
function news(t,tone){G.newsList.unshift({w:G.week,t:gtxt(t),tone:tone||''});if(G.newsList.length>80)G.newsList.length=80}

/* ---------- amateurs ---------- */
const AM_TOURNEYS=[
  {name:'City Golden Gloves',rounds:['Quarterfinal','Semifinal','Final'],base:[38,43,48]},
  {name:'National Championships',rounds:['Quarterfinal','Semifinal','Final'],base:[48,53,58]},
];
function startAmateur(stage){
  G.am.stage=stage;G.am.round=0;G.am.results=[];
  const T=AM_TOURNEYS[stage],d=B().div,o=[];
  for(let i=0;i<3;i++){
    let f;
    if(i===2&&stage===0){f=rivalF();f.rating=Math.max(f.rating,T.base[2]+2)}
    else{f=makeFighter(d,T.base[i]+rand(-2,3),randi(18,22),{});f.w=randi(4,20);f.l=randi(0,5);f.d=0;f.ko=0;f.amateur=true;f.active=false;G.world.f[f.id]=f}
    o.push(f.id);
  }
  G.am.opps=o;
  news(`Entered the ${T.name}.`);
}
function amateurOffer(){
  const T=AM_TOURNEYS[G.am.stage],f=G.world.f[G.am.opps[G.am.round]];
  return {id:'am'+uid(),oppId:f.id,type:'amateur',label:`${T.name}: ${T.rounds[G.am.round]}`,rounds:3,purse:0,weeks:G.am.round===0?4:1,amateur:true,desc:'Three rounds, headgear on. Win and advance.'};
}

/* ---------- momentum & matchmaking ---------- */
function momentum(){
  const f=B().form.slice(-4);let m=0;
  f.forEach((r,i)=>{const w=.6+.4*((i+1)/f.length);m+=({WKO:1.6,W:1,D:0,L:-1.5,LKO:-2}[r]||0)*w});
  return m;
}
function momentumLabel(m){return m>=3.5?'Red hot':m>=2?'On a roll':m>=.5?'Building':m>-.5?'Steady':m>-2?'Needs a win':'Must prove it'}
function venueFor(pts){let v=VENUES[0];for(const x of VENUES)if(pts>=x.min)v=x;return v}
function purseFor(opp,type,rounds){
  const b=B();const top=Math.max(b.pts,opp?opp.pts:0);
  let p=700+Math.pow(top/100,2.25)*850;
  p*=1+b.hype/110;p*=.7+rounds*.05;
  if(opp?.legend)p*=1.5;
  p*={world:8,unify:11,regional:2,grudge:1.6,rematch:1.4,chapter:2}[type]||1;
  if(G.promoter)p*=PROMOTERS[G.promoter.id].purse;
  return Math.round(p/100)*100;
}
function roundsFor(type){
  const n=B().record.w+B().record.l+B().record.d;
  // women's championship fights are scheduled for ten rounds, the rest top out at eight
  if(type==='world'||type==='unify'||type==='chapter')return isW()?10:12;
  if(type==='regional')return isW()?8:10;
  return n<4?4:n<8?6:n<13||isW()?8:10;
}
function pickOpp(target,used,d){
  const list=divFighters(d).filter(f=>!used.has(f.id)&&!f.amateur&&f.pro!==false);
  if(!list.length)return null;
  list.sort((a,b)=>Math.abs(a.pts-target)-Math.abs(b.pts-target));
  const f=pick(list.slice(0,3));used.add(f.id);return f;
}
function mkOffer(f,type,label,desc,extra={}){
  if(!f)return null;
  const rounds=extra.rounds||roundsFor(type);
  return Object.assign({id:'o'+uid(),oppId:f.id,type,label,desc,rounds,purse:purseFor(f,type,rounds),weeks:extra.weeks||({tuneup:5,prove:5,level:6,stepup:7,regional:8,world:9,unify:9,grudge:8,rematch:8,chapter:9,defense:8}[type]||6),venue:venueFor(Math.max(B().pts,f.pts)).name},extra);
}
function genOffers(){
  const b=B(),d=b.div,me=b.pts,mom=momentum(),pr=G.promoter?PROMOTERS[G.promoter.id]:null,rank=playerRank()||99;
  const used=new Set(),offers=[];
  const last=G.history.filter(h=>h.pro).slice(-1)[0];
  if(last)used.add(last.oppId);
  const rv=rivalF();
  if(rv)used.add(rv.id);
  const myBelts=beltsOf('P',d);
  // a callout or rematch demanded in the post-fight interview
  const later=G.calloutLater;if(!G.callout&&later){if(G.week>later.until)G.calloutLater=null;else if(chance(later.p)){G.callout=later.id;G.calloutLater=null;news(`${shortName(G.world.f[later.id])}'s team calls back. The fight you asked for is on the table.`,'gold')}}
  if(G.callout){const cf=G.world.f[G.callout];G.callout=null;if(cf&&cf.active&&cf.div===d){used.add(cf.id);const re=cf.id===(last&&last.oppId),cb=beltsOf(cf.id,d);
    const desc=re?`You demanded the rematch with ${shortName(cf)}. You got it.`:`You called out ${shortName(cf)} on live TV. The fight is on.`;
    offers.push(cb.length?(myBelts.length?mkOffer(cf,'unify','Callout: Unification',desc,{title:{belts:[...myBelts,...cb],unify:true}}):mkOffer(cf,'world','Callout: World Title',desc+` For the ${cb.join(' & ')} title.`,{title:{belts:cb}}))
      :mkOffer(cf,'grudge',re?'Rematch':'Callout Fight',desc))}}
  // chapters first
  for(const ch of CHAPTERS){if(ch.circ&&ch.circ!==(G.circuit||'m'))continue;if(ch.offer&&!G.chapters.includes(ch.id)&&!G.flags['ch_'+ch.id+'_off']){const o=ch.offer();if(o){o.chapter=ch.id;offers.push(o);used.add(o.oppId);break}}}
  if(myBelts.length){
    const cont=ranking(d).filter(e=>e.id!=='P'&&!beltsOf(e.id,d).length);
    const mand=cont[0]?.f;if(mand&&!used.has(mand.id)){used.add(mand.id);offers.push(mkOffer(mand,'world','Mandatory Title Defense',`The ${myBelts.join(', ')} ordered this one. Your #1 contender.`,{title:{belts:myBelts.slice(),defense:true}}))}
    const vol=cont.slice(3,9);const v=vol.length?pick(vol).f:null;
    if(v&&!used.has(v.id)){used.add(v.id);offers.push(mkOffer(v,'world','Voluntary Defense','A softer defense that keeps the belts busy.',{title:{belts:myBelts.slice(),defense:true}}))}
    const other=BODIES.map(x=>G.world.champs[d][x.k]).filter(id=>id&&id!=='P');
    if(other.length){const oc=G.world.f[pick(other)];if(oc&&!used.has(oc.id)){used.add(oc.id);const ob=beltsOf(oc.id,d);offers.push(mkOffer(oc,'unify','Unification Bout',`Your ${myBelts.join(', ')} against their ${ob.join(', ')}. Winner takes everything.`,{title:{belts:[...myBelts,...ob],unify:true}}))}}
  }else{
    if(mom<0)offers.push(mkOffer(pickOpp(me-110,used,d),'prove','Prove-It Fight','Coming off a loss. Nobody gives you a big fight until you show you still belong.'));
    else offers.push(mkOffer(pickOpp(me-90,used,d),'tuneup','Tune-Up','A winnable fight to stay busy and sharp.'));
    offers.push(mkOffer(pickOpp(me+(mom>=2?60:mom>=0?25:-50),used,d),'level','Matched Fight','An even fight at your level.'));
    // ranked contenders just above you: pick who to climb past
    if(rank<=40&&mom>=0&&b.record.w>=3){ranking(d).forEach((e,i)=>{const r=i+1;if(e.id!=='P'&&r<rank&&r>=rank-5&&!used.has(e.id)&&!beltsOf(e.id,d).length&&offers.filter(x=>x&&x.type==='ranked').length<2){used.add(e.id);offers.push(mkOffer(e.f,'ranked',`Ranked Contender #${r}`,`A fighter ranked above you. Beat them and you take their place.`))}})}
    if(mom>=.5||b.record.w>=3){
      const jump=(mom>=3.5?260:mom>=2?170:110)*(pr?pr.step:1);
      offers.push(mkOffer(pickOpp(me+jump,used,d),'stepup',mom>=3.5?'Fast-Track Fight':'Step-Up Fight',mom>=3.5?'Your streak has the whole division talking. A win here skips you up the ladder.':'A bigger name and a bigger purse. Win and you jump the rankings.'));
    }
    const titleOK=!titleLock()&&((rank<=3)||(rank<=6&&mom>=2)||(pr&&pr.title>=1.5&&rank<=10&&mom>=1.5));
    if(titleOK){
      const champs=BODIES.map(x=>({k:x.k,id:G.world.champs[d][x.k]})).filter(x=>x.id&&x.id!=='P');
      if(champs.length){const c=pick(champs);const cf=G.world.f[c.id];if(cf&&!used.has(cf.id)){used.add(cf.id);const bl=beltsOf(cf.id,d);offers.unshift(mkOffer(cf,'world',rank<=3?'Mandatory Title Shot':'World Title Shot',`For the ${bl.join(' & ')} ${DIVS[d].name} title${bl.length>1?'s':''}.`,{title:{belts:bl}}))}}
    }
    if(!b.regional&&me>=280&&rank>8&&b.record.w>=5){
      const f=pickOpp(me+60,used,d);if(f)offers.push(mkOffer(f,'regional','Continental Title',`For the vacant Continental ${DIVS[d].name} belt. A regional title gets you noticed.`,{title:{regional:true}}));
    }
  }
  if(rv&&rv.active&&rv.div===d&&G.week-G.rival.lastMet>30&&b.record.w>=4&&Math.abs(rv.pts-me)<260){
    const bl=beltsOf(rv.id,d);
    offers.push(mkOffer(rv,bl.length?'world':'grudge',G.rival.met?'Grudge Rematch':'Grudge Match',`${shortName(rv)}. Years of trash talk end in the ring.`,bl.length?{title:{belts:bl},grudge:true}:{grudge:true}));
  }
  if(last&&(last.res==='L'||last.robbery)&&(last.robbery||last.rematchClause||last.rmRoll!==false)&&G.world.f[last.oppId]?.active&&G.world.f[last.oppId].div===d&&!last.rematched){
    const f=G.world.f[last.oppId];offers.push(mkOffer(f,'rematch','Rematch',last.robbery?'Everyone saw the robbery. The commission ordered an immediate rematch.':last.rematchClause?'Your rematch clause kicks in. Get it back.':'They agreed to run it back. Get it back.',{rematchOf:last.id}));
  }
  G.offers=offers.filter(Boolean).slice(0,6);
  return G.offers;
}

/* ---------- fight booking & camp ---------- */
function acceptOffer(o){
  G.next={offer:o,weeksLeft:o.weeks,sessions:[],fatigue:0,scout:0,cutWork:0,gameplan:0,keys:keyDrills(G.world.f[o.oppId]).map(k=>k[0]),edge:{}};
  G.offers=[];
  if(o.chapter)G.flags['ch_'+o.chapter+'_off']=true;
  const f=G.world.f[o.oppId];
  news(`Signed: ${fullName(B())} vs ${fullName(f)}, ${o.rounds} rounds${o.venue?' at the '+o.venue:''}.`);
  if(f.legend&&LEGEND_BY[f.legend].ai?.trash)news(`${shortName(f)} at the press conference: "I'm so fast I turned off the light and was in bed before the room got dark!"`,'gold');
}
function campBoosts(){const t=TRAINERS[G.trainer],g=GYMS[G.gym];const age=ageOf(B().born);return t.train*g.train*(age>=34?.72:age>=30?.86:age<=22?1.1:1)}
const CAMP={
  bag:{name:'Heavy Bag',stat:'pow',alt:'sta',desc:'Rhythm combos on the heavy bag. Builds Power.'},
  speed:{name:'Speed Bag',stat:'spd',alt:'iq',desc:'Keep the rhythm as it speeds up. Builds Speed.'},
  rope:{name:'Jump Rope',stat:'sta',alt:'foot',desc:'Time each jump. Builds Stamina and Footwork.'},
  mitts:{name:'Mitt Work',stat:'def',alt:'iq',desc:'React to your trainer\'s calls. Builds Defense and Ring IQ.'},
  spar:{name:'Sparring',stat:'iq',alt:'chin',desc:'One live round against a partner who fights like your opponent. Big XP, small injury risk.'},
  film:{name:'Film Study',desc:'Study their fights. Their tells last longer on fight night (stacks twice).'},
  cut:{name:'Weight Management',desc:'Dial in the diet. Reduces weight-cut penalties.'},
  rest:{name:'Rest Day',desc:'Recover. Fatigue down, heal injuries one week faster.'},
};
function campResult(kind,q,auto){
  const b=B(),n=G.next,C=CAMP[kind],out={kind,q,lines:[]};
  const boost=campBoosts();
  if(['bag','speed','rope','mitts','spar'].includes(kind)){
    let xp=(kind==='spar'?110:55)+q*(kind==='spar'?150:95);xp*=boost*(auto?.7:1);
    out.xp=Math.round(xp);
    const tf=TRAINERS[G.trainer].focus;
    const sloppy=!auto&&q<.4&&kind!=='spar';
    let g=q>=.85?2:q>=.6?1:(chance(q)?1:0);if(auto)g=chance(.45)?1:0;
    if(boost>=1.25&&chance(.35))g++;
    if(tf&&C.stat===tf)g++;
    out.deltas=[];
    const gain=(k,n)=>{const before=b.stats[k];const got=gainStat(k,n);if(got){out.lines.push(`+${got} ${STAT_NAME[k]}`);out.deltas.push([k,before,b.stats[k]])}};
    if(sloppy){out.xp=Math.round(out.xp*.5);out.lines.push('Sloppy session: no stat gain, and it wore you out. Drill it again or rest.');out.sloppy=true;n.fatigue+=6}
    else{if(g)gain(C.stat,g);if(chance(q*.45))gain(C.alt,1)}
    if(!auto){G.pb=G.pb||{};if(q>(G.pb[kind]||0)){if(G.pb[kind]!=null)out.pb=true;G.pb[kind]=q}out.best=G.pb[kind]}
    n.fatigue+=kind==='spar'?22:13;
    if(G.flags.teamBoost){G.flags.teamBoost=0;n.fatigue=Math.max(0,n.fatigue-14);out.lines.push('Your team is fired up: fatigue down.')}
    const ups=addXP(out.xp);out.ups=ups;
    if(kind==='spar'){n.scout=Math.min(2,n.scout+.5)}
  }else if(kind==='film'){n.scout=Math.min(2,n.scout+1);out.lines.push('Their tells will last longer on fight night.');n.fatigue=Math.max(0,n.fatigue-6);addXP(25)}
  else if(kind==='cut'){n.cutWork=Math.min(2,n.cutWork+1);out.lines.push('Weight-cut penalty reduced.');n.fatigue+=4}
  else if(kind==='rest'){n.fatigue=Math.max(0,n.fatigue-35);b.injuries.forEach(i=>i.wk=Math.max(0,i.wk-1));out.lines.push('Fatigue down.')}
  if(n.fatigue>60&&kind!=='rest'&&chance((n.fatigue-55)/180)){
    const id=pick(['knee','ribs','hand','shoulder']);addInjury(id,true);out.lines.push(`Overtraining injury: ${INJ[id].name}!`);out.injury=id;
  }
  n.sessions.push({kind,q:Math.round(q*100)});
  if(q>=.6&&G.next&&G.next.keys&&G.next.keys.includes(kind)){n.edge=n.edge||{};if(!n.edge[kind]){n.edge[kind]=1;out.lines.push('Key drill done: fight-night edge.')}}
  checkGoals('camp',Object.assign({auto},out),out.lines);
  n.weeksLeft--;
  advanceWeeks(1,true);
  return out;
}
function addInjury(id,minor){
  const I=INJ[id];let wk=randi(I.wk[0],I.wk[1]);if(minor)wk=Math.ceil(wk*.6);
  const ex=B().injuries.find(i=>i.id===id);if(ex)ex.wk=Math.max(ex.wk,wk);else B().injuries.push({id,wk});
  news(`Injury: ${I.name} (${wk} weeks).`,'red');
}

/* ---------- time ---------- */
function advanceWeeks(n,inCamp){
  const b=B();
  for(let i=0;i<n;i++){
    const oldAge=ageOf(b.born);
    G.week++;
    b.injuries.forEach(x=>x.wk--);b.injuries=b.injuries.filter(x=>x.wk>0);
    worldWeek();
    if(ageOf(b.born)>oldAge)birthday();
    showTick();
  }
}
function birthday(){
  const b=B(),a=ageOf(b.born),dur=skillMods().durable||0,lines=[];
  if(a<=24){const k=pick(STAT_KEYS);gainStat(k,1);lines.push(`+1 ${STAT_NAME[k]}`)}
  if(a>=31){
    const dec=a>=36?3:a>=33?2:1;
    for(const k of ['spd','foot','sta']){const v=Math.round(dec*(1-dur*.6)*rand(.5,1.2));if(v>0){b.stats[k]=Math.max(20,b.stats[k]-v);lines.push(`-${v} ${STAT_NAME[k]}`)}}
    gainStat('iq',1);lines.push('+1 Ring IQ');
    if(!G.flags.ageTalk){G.flags.ageTalk=1;if(typeof modal==='function'&&!(typeof UI!=='undefined'&&UI.silent))setTimeout(()=>modal(`<div class="kicker">Age ${a}</div><h2 class="sec">Father Time</h2><p>Your legs aren't what they were. From now on each birthday costs a little Speed, Footwork and Stamina, a bit more after 33 and 36.</p><p>Your skills and abilities never fade, and Ring IQ keeps climbing. Durability skills slow the decline.</p><button class="btn primary" data-close="ok">Understood</button>`),400)}
  }
  if([25,29,33].includes(a)&&b.natural<7&&chance(.4)){b.natural++;news(`You've filled out. Your natural weight is now ${DIVS[b.natural].name}.`,'gold')}
  news(`Happy ${ordinal(a)} birthday.${lines.length?' Age changes: '+lines.join(', ')+'.':''}`);
}
function worldWeek(){
  const W=G.world,rv=rivalF();
  const prev=RNG.use(careerRng().world);try{worldWeekInner(W,rv)}finally{RNG.use(prev)}
}
function worldWeekInner(W,rv){
  for(let d=0;d<8;d++){
    if(chance(.45)){
      const list=divFighters(d).filter(f=>f.pro!==false&&!f.amateur);
      if(list.length>3){
        const a=pick(list);const near=list.filter(f=>f!==a&&Math.abs(f.pts-a.pts)<140);const c=near.length?pick(near):pick(list.filter(f=>f!==a));
        simWorldFight(a,c,d,false);
      }
    }
    if(chance(.035)){
      const ch=G.world.champs[d],k=pick(BODIES).k,cid=ch[k];
      if(cid&&cid!=='P'){const c=W.f[cid];const top=ranking(d).filter(e=>e.id!=='P'&&e.id!==cid&&!beltsOf(e.id,d).length).slice(0,5);if(c&&top.length)simWorldFight(c,pick(top).f,d,true)}
    }
  }
  if(G.week%52===0)yearTick();
  if(rv&&rv.active){rv.rating+=((playerOvr()+rv.edge)-rv.rating)*.03;rv.rating=clamp(rv.rating,30,97)}
}
/* ---------- career goals: three short-term targets at a time, with rewards ---------- */
const GOALS=[
  {id:'ko',t:'Win a fight by knockout',xp:180,hype:2,fight:c=>c.win&&c.ko},
  {id:'streak3',t:'Win three fights in a row',xp:260,hype:3,elig:()=>B().streak<3,fight:()=>B().streak>=3},
  {id:'body10',t:'Land 10 body shots in one fight',xp:160,fight:c=>(c.res.stats.p.bodyL||0)>=10},
  {id:'perfect5',t:'Make 5 perfect dodges in one fight',xp:180,fight:c=>(c.res.stats.p.perfect||0)>=5},
  {id:'acc50',t:'Land half your punches in a fight (30+ thrown)',xp:170,fight:c=>c.res.stats.p.thrown>=30&&c.res.stats.p.landed/c.res.stats.p.thrown>=.5},
  {id:'clean',t:'Win without being knocked down',xp:140,fight:c=>c.win&&!c.res.kdAgainst},
  {id:'drillS',t:'Score an S grade in a camp drill',xp:120,camp:r=>r.q>=.9&&r.xp&&!r.sloppy},
  {id:'top10',t:"Break into your division's top 10",xp:300,hype:4,elig:()=>G.phase==='pro'&&(playerRank()||99)>10,fight:()=>(playerRank()||99)<=10},
  {id:'top3',t:'Climb into the top 3',xp:400,hype:5,elig:()=>G.phase==='pro'&&(playerRank()||99)<=10&&(playerRank()||99)>3,fight:()=>(playerRank()||99)<=3},
  {id:'title',t:'Win a world title',xp:600,hype:8,elig:()=>G.phase==='pro'&&(playerRank()||99)<=5&&!playerBelts().length,fight:c=>c.win&&c.o.title&&!c.o.title.regional},
  {id:'defend2',t:'Defend your title twice',xp:500,hype:6,elig:()=>G.phase==='pro'&&playerBelts().length>0,base:()=>B().defenses,fight:(c,g)=>B().defenses>=g.base+2},
  {id:'legend',t:'Beat a legend',xp:450,hype:6,elig:()=>G.phase==='pro'&&(playerRank()||99)<=15,fight:c=>c.win&&!!c.f.legend},
  {id:'rival',t:'Beat your rival',xp:350,hype:5,elig:()=>{const r=rivalF();return !!(r&&r.active)},fight:c=>c.win&&!!c.f.rival},
];
const GOAL_ONCE=['title','top10','top3','legend'];
function ensureGoals(){
  if(!G||G.phase==='retired')return;G.goals=(G.goals||[]).filter(g=>{const d=GOALS.find(x=>x.id===g.id);return d&&(!d.elig||d.elig())});G.goalsDone=G.goalsDone||[];
  let guard=0;while(G.goals.length<3&&guard++<20){
    const recent=G.goalsDone.slice(-4);const c=GOALS.filter(d=>!G.goals.some(x=>x.id===d.id)&&(!d.elig||d.elig())&&!recent.includes(d.id)&&!(GOAL_ONCE.includes(d.id)&&G.goalsDone.includes(d.id)));if(!c.length)break;
    const d=c[hashStr((G.seed||1)+':'+(G.goalsDone.length+G.goals.length)+':'+guard)%c.length];G.goals.push({id:d.id,base:d.base?d.base():0})}
}
function checkGoals(kind,ctx,lines){
  if(!G.goals)ensureGoals();G.goalsDone=G.goalsDone||[];const done=[];
  for(const g of G.goals){const d=GOALS.find(x=>x.id===g.id);if(!d)continue;
    if((kind==='fight'&&d.fight&&d.fight(ctx,g))||(kind==='camp'&&d.camp&&d.camp(ctx)))done.push(g)}
  for(const g of done){const d=GOALS.find(x=>x.id===g.id);G.goals=G.goals.filter(x=>x!==g);G.goalsDone.push(g.id);addXP(d.xp);B().hype=clamp(B().hype+(d.hype||0),0,100);
    lines&&lines.push(`Goal complete: ${d.t} (+${d.xp} XP)`);news(`Goal complete: ${d.t}.`,'gold')}
  ensureGoals();return done.length;
}
/* ---------- yearly awards and the Hall of Fame ---------- */
function yrState(){return G.yr=G.yr||{fw:{},ko:null,up:null}}
function recYear(w,l,ko,titleWin){
  const Y=yrState(),id=w.id||'P';const e=Y.fw[id]=Y.fw[id]||{w:0,ko:0,tw:0,name:w.first?fullName(w):'',div:w.div};e.w++;if(ko)e.ko++;if(titleWin)e.tw++;
  const wr=w.rating??playerOvr(),lr=l.rating??playerOvr();
  if(ko&&(!Y.ko||lr>Y.ko.r))Y.ko={by:e.name,on:l.first?shortName(l):'',r:lr,id};
  if(lr-wr>6&&(!Y.up||lr-wr>Y.up.gap))Y.up={by:e.name,on:l.first?shortName(l):'',gap:lr-wr,id};
}
function hofWorthy(f,beltsNow){return !!f.legend||(f.titles||0)>=2||((f.titles||0)>=1||beltsNow>0)&&f.w>=22||f.w>=38&&f.l<=6}
function yearAwards(){
  const Y=G.yr;const year=START_YEAR+Math.floor(G.week/52)-1;
  if(Y){
    const fw=Object.entries(Y.fw).filter(([,e])=>e.w>=2).map(([id,e])=>({id,e,sc:e.w*2+e.ko+e.tw*6})).sort((a,b)=>b.sc-a.sc)[0];
    const aw=G.awards=G.awards||[];const b=B();b.awards=b.awards||[];
    if(fw){aw.push({year,type:'Fighter of the Year',who:fw.e.name,player:fw.id==='P'});if(fw.id==='P'){b.awards.push('foy');news(`You are ${year} Fighter of the Year!`,'gold')}else news(`${year} Fighter of the Year: ${fw.e.name}.`)}
    if(Y.ko){aw.push({year,type:'Knockout of the Year',who:`${Y.ko.by} over ${Y.ko.on}`,player:Y.ko.id==='P'});if(Y.ko.id==='P'){b.awards.push('koy');news(`Your knockout of ${Y.ko.on} is ${year} Knockout of the Year.`,'gold')}}
    if(Y.up){aw.push({year,type:'Upset of the Year',who:`${Y.up.by} over ${Y.up.on}`,player:Y.up.id==='P'});if(Y.up.id==='P'){b.awards.push('uoy');news(`Your win over ${Y.up.on} is ${year} Upset of the Year.`,'gold')}}
  }
  if(G.yrP&&G.phase==='pro'){const Y=G.yrP;G.recap=Object.assign({year,ovr1:playerOvr(),pts1:B().pts,rank1:playerRank(),awards:(G.awards||[]).filter(a=>a.year===year&&a.player).map(a=>a.type)},Y)}
  G.yrP={w:0,l:0,d:0,ko:0,titles:0,money:0,ovr0:G.boxer?playerOvr():0,pts0:G.boxer?B().pts:0,rank0:G.boxer?playerRank():null};
  if(G.hofQ&&G.hofQ.length){G.hof=G.hof||[];const cls=G.hofQ.splice(0);cls.forEach(h=>G.hof.push(Object.assign({year:year+1},h)));news(`Hall of Fame class of ${year+1}: ${cls.map(h=>h.name.replace(/ “.*” /,' ')).join(', ')}.`,'gold')}
  G.yr={fw:{},ko:null,up:null};
}
function simWorldFight(a,c,d,title){
  const pa=1/(1+Math.pow(10,(c.rating-a.rating)/12));
  const draw=chance(.04);const aw=!draw&&chance(pa);const w=aw?a:c,l=aw?c:a;
  if(draw){a.d++;c.d++;return}
  w.w++;l.l++;const ko=chance(w.arch==='slugger'?.6:.4);if(ko)w.ko++;
  const g=clamp(18+(l.pts-w.pts)*.12+(ko?6:0),4,60);w.pts=Math.min(1000,w.pts+g);l.pts=Math.max(0,l.pts-clamp(22+(l.pts-w.pts)*.05,8,50));
  recYear(w,l,ko,title&&beltsOf(l.id,d).length>0);
  if(title){
    const lb=beltsOf(l.id,d);if(lb.length){lb.forEach(k=>G.world.champs[d][k]=w.id);w.titles=(w.titles||0)+1;
      if(w.legend||l.legend||w.rival||l.rival||chance(.5))news(`${DIVS[d].name}: ${shortName(w)} beats ${shortName(l)}${ko?' by KO':''} to take the ${lb.join(' & ')} title.`,w.rival?'red':'')}
  }else if(w.rival&&chance(.6))news(`Your rival ${shortName(w)} beats ${shortName(l)}${ko?' by knockout':''}. Now ${recStr(w)}.`,'red');
  else if((w.legend||l.legend)&&chance(.25))news(`${shortName(w)} defeats ${shortName(l)}${ko?' by KO':''} (${DIVS[d].short}).`);
}
function yearTick(){
  const W=G.world;
  yearAwards();
  for(const id in W.f){
    const f=W.f[id];if(!f.active||f.amateur)continue;const a=ageOf(f.born);
    if(a<26)f.rating=Math.min(f.pot,f.rating+randi(0,3));else if(a>31)f.rating-=randi(1,3)*(f.legend?.6:1);
    const retireAge=f.legend?39:36;
    if(!f.rival&&(a>=retireAge&&chance(.5)||f.rating<32||(a>33&&f.l>f.w&&chance(.4)))){
      f.active=false;const bl=beltsOf(f.id,f.div);if(hofWorthy(f,bl.length))(G.hofQ=G.hofQ||[]).push({name:fullName(f),rec:recStr(f),ko:f.ko,div:f.div,titles:f.titles||0,legend:!!f.legend});bl.forEach(k=>G.world.champs[f.div][k]=null);
      if(f.legend||bl.length)news(`${fullName(f)} retires at ${a} with a record of ${recStr(f)}.`);
      if(bl.length)assignChamps(f.div,false);
      const nf=makeFighter(f.div,rand(45,64),randi(19,22));nf.pts=randi(120,300);nf.w=randi(3,10);nf.l=randi(0,2);nf.ko=Math.floor(nf.w*.6);W.f[nf.id]=nf;W.divs[f.div].push(nf.id);
    }
    if(f.legend&&LEGEND_BY[f.legend].movesUp&&f.div<5&&chance(.45)){
      const bl=beltsOf(f.id,f.div);bl.forEach(k=>G.world.champs[f.div][k]=null);if(bl.length)assignChamps(f.div,false);
      W.divs[f.div]=W.divs[f.div].filter(x=>x!==f.id);f.div++;W.divs[f.div].push(f.id);f.pts=Math.max(f.pts-120,500);
      news(`${fullName(f)} moves up to ${DIVS[f.div].name}, chasing titles in another division.`,'gold');
    }
  }
  for(let d=0;d<8;d++){W.divs[d]=W.divs[d].filter(id=>W.f[id]&&(W.f[id].active||id===G.rival?.id));assignChamps(d,false)}
  const keep=new Set([G.rival?.id,G.flags.tookFrom,G.next?.offer.oppId,...G.am.opps,...W.divs.flat()]);
  for(const id in W.f){const f=W.f[id];if(!keep.has(id)&&!f.legend)delete W.f[id]}
}

/* ---------- fight setup & results ---------- */
function oppCombat(f,o={}){
  const L=f.legend?LEGEND_BY[f.legend]:null;
  // stat spread is seeded by the fighter and their rating, so the tale of the tape is stable across screens and doesn't draw on the career RNG
  const st=RNG.with(new Rng(hashStr(f.id+'|'+Math.round(f.rating)+(o.spar?'s':''))),()=>statsFromRating(f.rating+(o.spar?-6:0),f.arch));
  if(L?.ai?.chinBonus)st.chin=Math.min(99,st.chin+L.ai.chinBonus);
  const ai=deep(ARCH[f.arch].ai);if(L?.ai)Object.assign(ai,deep(L.ai));
  const Q=!L&&f.quirk?QUIRKS[f.quirk]:null;if(Q){Object.assign(ai,deep(Q.ai));if(Q.weak)ai.weak=Q.weak}
  if(ai.weak==='glass')st.chin=Math.max(15,st.chin-15);
  const scout=gtxt(L?L.ai?.scout:(Q?Q.scout:''));
  return {scout,quirk:Q?Q.name:null,name:shortName(f),first:f.first,last:f.last,stats:st,look:fillLook(f),arch:f.arch,height:f.height,stance:f.stance,reach:f.reach,ai,abilities:L?[L.ab]:(f.rating>=80?[ARCH[f.arch].ability]:[]),mods:{},legend:f.legend,rival:!!f.rival};
}
function playerCombat(){
  const b=B();
  return {name:b.first+' '+b.last,first:b.first,last:b.last,stats:effectiveStats(),look:playerLook(),height:b.height,arch:b.arch,stance:b.stance,reach:b.reach,abilities:b.equipped.slice(),mods:skillMods(),weight:weightInfo()};
}
function ptsDelta(my,opp,win,ko,title){
  if(win){let g=20+clamp((opp-my)*.13,-14,70)+(ko?8:0)+(title?70:0);if(opp<my-160)g*=.5;return Math.round(clamp(g,4,150))}
  return -Math.round(clamp(26+clamp((my-opp)*.08,-14,30)+(ko?10:0),8,70));
}
function applyResult(o,res){
  const b=B(),f=G.world.f[o.oppId],win=res.winner==='p',loss=res.winner==='o',ko=['KO','TKO','RTD','DQ'].includes(res.method);
  const out={lines:[],levelUps:0,money:0,news:[]};
  const pro=!o.amateur;
  const prevRank=playerRank();
  if(pro){if(win){b.record.w++;if(ko)b.record.ko++}else if(loss)b.record.l++;else b.record.d++}
  if(pro){const Y=G.yrP=G.yrP||{w:0,l:0,d:0,ko:0,titles:0,ovr0:playerOvr(),pts0:b.pts,rank0:prevRank};if(win){Y.w++;if(ko)Y.ko++;if(o.title&&!o.title.regional&&!o.title.defense)Y.titles++}else if(loss)Y.l++;else Y.d++}
  if(pro){const me={id:'P',first:b.first,last:b.last,nick:b.nick,div:b.div,rating:playerOvr()};if(win)recYear(me,f,ko,!!(o.title&&!o.title.regional&&!o.title.defense));else if(loss)recYear(f,me,ko,false)}
  else{if(win)b.am.w++;else b.am.l++}
  if(win){f.l++}else if(loss){f.w++;if(ko)f.ko++}else f.d++;
  b.form.push(win?(ko?'WKO':'W'):loss?(ko?'LKO':'L'):'D');if(b.form.length>8)b.form.shift();
  b.streak=win?Math.max(1,b.streak+1):loss?Math.min(-1,b.streak-1):0;
  // xp (capped so one upset can't grant a burst of levels)
  const diffR=f.rating-playerOvr();
  let xp=140+o.rounds*18+(win?160:loss?45:90)+(ko&&win?70:0)+clamp(diffR*7,-60,180)+(o.title?180:0)+(f.legend?120:0)+(res.stats.p.landed*.6);
  xp*=DIFF[G.diff].xp*(pro?1:.75)*(o.sim?.6:1);
  xp=Math.min(xp,xpNeed(b.level)*1.6);
  out.xp=Math.round(xp);out.levelUps=addXP(xp);
  // pts and belts
  if(pro){
    const dp=win||loss?ptsDelta(b.pts,f.pts,win,ko,o.title&&!o.title.regional&&win):0;
    b.pts=clamp(b.pts+dp,0,1000);out.pts=dp;
    if(win)f.pts=Math.max(0,f.pts-25);else if(loss)f.pts=Math.min(1000,f.pts+20);
    if(o.title&&!o.title.regional){
      const d=b.div;
      if(win){
        const prev=beltsOf('P',d).length;
        o.title.belts.forEach(k=>G.world.champs[d][k]='P');
        if(o.title.defense){b.defenses++;out.lines.push('Title defended!')}
        else{b.titleWins++;b.formerChamp=true;if(!b.titleDivs.includes(d))b.titleDivs.push(d);G.flags.tookFrom=f.id;G.flags.tookWeek=G.week;
          out.lines.push(`NEW ${o.title.belts.join(' & ')} ${DIVS[d].name.toUpperCase()} CHAMPION`)}
        if(beltsOf('P',d).length===4&&prev<4){b.undisputed++;out.lines.push('UNDISPUTED CHAMPION OF THE WORLD');news(`${fullName(b)} is the undisputed ${DIVS[d].name} champion of the world.`,'gold')}
        G.flags.lastDefWeek=G.week;
      }else if(loss){
        const lost=beltsOf('P',d);lost.forEach(k=>G.world.champs[d][k]=f.id);
        if(lost.length)out.lines.push(`Lost the ${lost.join(' & ')} title.`);
      }
    }
    if(o.title?.regional&&win){b.regional=b.div;out.lines.push(`Continental ${DIVS[b.div].name} Champion`)}
  }
  // money
  if(pro){
    const pr=G.promoter?PROMOTERS[G.promoter.id]:null,t=TRAINERS[G.trainer],g=GYMS[G.gym];
    let gross=o.purse*(win?1:.85);if(o.missedWeight)gross*=.8;
    const lines=[['Purse',gross]];
    if(pr)lines.push([`${pr.co} (${Math.round(pr.cut*100)}%)`,-gross*pr.cut]);
    lines.push([`${t.name} (${Math.round(t.fee*100)}%)`,-gross*t.fee]);
    if(g.cost)lines.push([g.name,-g.cost]);
    if(G.staff.cutman)lines.push(['Cutman',-1500]);
    if(G.staff.nutri)lines.push(['Nutritionist',-2500]);
    const med=Math.round(res.dmgTaken*15+(res.kdAgainst*500));if(med>200)lines.push(['Medical',-med]);
    if(G.sponsor){const S=SPONSORS.find(x=>x.id===G.sponsor.id);if(S){const pay=Math.round(Math.max(S.min,gross*S.cut)*(win?1:.5)/100)*100;lines.push([S.name,pay])}}
    const net=sum(lines.map(l=>l[1]));
    b.money+=net;out.money=net;out.moneyLines=lines;(G.yrP=G.yrP||{w:0,l:0,d:0,ko:0,titles:0,money:0,ovr0:playerOvr(),pts0:b.pts,rank0:prevRank}).money=(G.yrP.money||0)+net;
    if(G.sponsor){const S=SPONSORS.find(x=>x.id===G.sponsor.id);G.sponsor.left--;if(loss)G.sponsor.losses++;else if(win)G.sponsor.losses=0;
      if(S&&G.sponsor.losses>=S.drop){news(`${S.name} drops you after ${G.sponsor.losses} straight losses.`,'red');out.lines.push(`Dropped by ${S.name}`);(G.flags.spDropped=G.flags.spDropped||[]).push(S.id);G.sponsor=null}
      else if(S&&G.sponsor.left<=0){news(`Your deal with ${S.name} has run its course.`);out.lines.push(`${S.name} deal finished`);G.sponsor=null}}
    if(G.promoter){G.promoter.left--;if(loss)G.promoter.losses=(G.promoter.losses||0)+1;else if(win)G.promoter.losses=0}
  }
  // hype
  let hy=win?(ko?6:3)+gearHype():loss?-6:0;if(o.title&&win)hy+=15;if(f.legend&&win)hy+=10;if(res.kdFor&&res.kdAgainst)hy+=4;
  b.hype=clamp(b.hype+hy,0,100);
  // damage & injuries
  const dur=skillMods().durable||0;
  const dmg=(res.dmgTaken*.0045+res.kdAgainst*.5+(loss&&ko?2:0))*(1-dur)*(pro?1:.5)*(b.injuries.some(i=>i.id==='concussion')?1.6:1);
  b.damage=clamp(b.damage+dmg,0,100);out.damage=dmg;
  const injP=.05+res.dmgTaken/1600+res.kdAgainst*.05+(b.injuries.length?.05:0);
  const inj=[];
  if(res.cut>45&&chance(.7))inj.push('cut');
  if(chance(injP)){inj.push(wpick({hand:3,ribs:2,concussion:res.kdAgainst?3:.5,shoulder:1,knee:1,retina:b.damage>50?.6:.1}))}
  inj.forEach(i=>addInjury(i));out.injuries=inj;
  if(b.injuries.some(i=>i.id==='retina')&&o.foughtHurt&&chance(.3)){G.flags.forceRetire='Your retina detached again in the fight. The commission will not license you.'}
  // rival / legends
  if(f.rival){G.rival.met++;G.rival.lastMet=G.week;if(win)G.rival.w++;else if(loss)G.rival.l++}
  if(pro&&G.phase==='pro')rivalTick(f,res,o);
  if(pro&&loss&&!beltsOf('P',b.div).length){const n=titleLock();out.lines.push(n?`Back of the line: win ${n} more before title shots come back.`:'The judges robbed you, and everyone knows it. Your place in line is safe.')}
  if(pro&&G.phase==='pro'){const pr=p4pRank(),best=G.flags.p4pBest||99;if(pr&&pr<best){G.flags.p4pBest=pr;if(pr===1)news(`The boxing writers name you the best fighter in the world, pound for pound.`,'gold');else if(best>10)news(`You enter the pound-for-pound top 10 at #${pr}.`,'gold');out.lines.push(`Pound for pound: #${pr} in the world`)}}
  if(win&&f.legend&&!b.legendsBeaten.includes(f.legend)){b.legendsBeaten.push(f.legend);out.lines.push(`Beat a legend: ${fullName(f)}`);out.legendUnlock=f.legend;news(`You beat ${fullName(f)}. Their signature move, ${AB[LEGEND_BY[f.legend].ab].name}, is now learnable in Skills.`,'gold')}
  // rematch tracking
  if(o.rematchOf){const h=G.history.find(x=>x.id===o.rematchOf);if(h)h.rematched=true}
  // history
  const h={id:'h'+uid(),w:G.week,oppId:f.id,opp:fullName(f),oppRec:recStr(f),oppRating:Math.round(f.rating),res:win?'W':loss?'L':'D',method:res.method,round:res.round,time:res.time,level:b.level,ovr:playerOvr(),ptsAfter:b.pts,age:ageOf(b.born),sim:!!o.sim,
    title:o.title?(o.title.regional?'Continental':o.title.belts.join('/')):'',type:o.type,label:o.label,purse:o.purse,pro,robbery:res.robbery,rematchClause:o.terms==='rematch',rmRoll:loss?chance(.45):null,terms:o.terms||null,cards:res.cards,div:b.div,chapter:o.chapter||null};
  G.history.push(h);out.hist=h;
  // chapters
  if(o.chapter){const ch=CHAPTERS.find(c=>c.id===o.chapter);if(ch&&ch.done){const t=ch.done(win,res,o);if(t)out.lines.push(t)}}
  // news
  const how=res.method==='KO'||res.method==='TKO'?`by ${res.method} in round ${res.round}`:res.method==='RTD'?`when the corner stopped it after round ${res.round}`:`by ${res.method==='UD'?'unanimous':res.method==='SD'?'split':res.method==='MD'?'majority':''} decision`;
  if(win)news(`${fullName(b)} def. ${fullName(f)} ${how}.${o.title&&!o.title.defense&&!o.title.regional?' A new champion!':''}`,o.title?'gold':'');
  else if(loss)news(`${fullName(f)} def. ${fullName(b)} ${how}.${res.robbery?' Ringside is calling it a robbery.':''}`,'red');
  else news(`${fullName(b)} and ${fullName(f)} fight to a draw.`);
  // amateur progression
  if(!pro){
    G.am.results.push(win?'W':'L');
    if(win&&G.am.round<2){G.am.round++}
    else{
      const T=AM_TOURNEYS[G.am.stage];
      if(win){G.flags['am_gold_'+G.am.stage]=true;out.lines.push(`${T.name} CHAMPION`);news(`Gold at the ${T.name}!`,'gold');b.hype+=6}
      else out.lines.push(`Eliminated in the ${T.rounds[G.am.round]}`);
      G.am.done=true;
    }
  }
  // recovery time
  const rec=Math.round(2+res.dmgTaken/55+res.kdAgainst+(pro?1:0)+(o.amateur&&!G.am.done?-2:0));
  out.recovery=Math.max(o.amateur&&!G.am.done?0:1,rec);
  if(out.recovery)advanceWeeks(out.recovery);
  // promoter drop
  if(G.promoter){const P=PROMOTERS[G.promoter.id];
    if((G.promoter.losses||0)>=P.drop){news(`${P.name} releases you from your contract after ${G.promoter.losses} straight losses.`,'red');out.lines.push(`Dropped by ${P.co}`);G.promoter=null}
    else if(G.promoter.left<=0){news(`Your contract with ${P.co} has ended. You're a free agent.`);out.lines.push('Contract finished: free agent');G.promoter=null}
  }
  if(pro)checkStripped();
  if(prevRank&&pro){const nr=playerRank();out.rank=[prevRank,nr]}
  // rival reacts
  {const rv=rivalF();if(pro&&rv&&rv.active&&rv.id!==f.id&&G.week-(G.flags.rivalQ||-99)>=8){const n=shortName(rv),i=b.record.w+b.record.l;
    const Q=win&&(o.title||f.legend)?['"Enjoy it. That belt is coming to me."','"Big win. Now come fight a real one."','"Everybody looks good until they meet me."']
      :win&&ko?['"Lucky shot. He hasn\'t fought anybody real yet."','"Knocking out tomato cans. Call me when you\'re ready."','"Nice highlight. I\'d still walk right through him."']
      :loss?['"Told you he was overrated."','"That\'s what happens when you skip the line."','"I\'d have finished the job."']:null;
    if(Q){news(`${n}: ${Q[i%Q.length]}`,'red');G.flags.rivalQ=G.week}}}
  // personal records
  if(!o.sim){const R=G.records=G.records||{},P=res.stats.p;const nm=shortName(f);
    const secs=(()=>{const m=/^(\d+):(\d+)/.exec(res.time||'');return m?(res.round-1)*180+(+m[1])*60+(+m[2]):null})();
    if(win&&['KO','TKO'].includes(res.method)&&secs!=null&&(!R.fastKO||secs<R.fastKO.s)){if(R.fastKO)out.lines.push(`Record: fastest stoppage (round ${res.round}, ${res.time})`);R.fastKO={s:secs,opp:nm,round:res.round,time:res.time}}
    if(P.landed>(R.mostLanded?.n||0)){if(R.mostLanded)out.lines.push(`Record: most punches landed (${P.landed})`);R.mostLanded={n:P.landed,opp:nm}}
    if((P.perfect||0)>(R.perfect?.n||0)){if(R.perfect)out.lines.push(`Record: most perfect dodges (${P.perfect})`);R.perfect={n:P.perfect,opp:nm}}
    if(win&&b.streak>(R.streak||0)){if(R.streak&&b.streak>=3)out.lines.push(`Record: ${b.streak}-fight win streak`);R.streak=b.streak}
    if(win&&f.rating-playerOvr()>(R.upset?.gap||5)){if(R.upset)out.lines.push(`Record: biggest upset win (${nm})`);R.upset={gap:Math.round(f.rating-playerOvr()),opp:nm}}}
  checkGoals('fight',{res,win,ko,o,f},out.lines);
  out.trophies=trophyCheck('fight',{res,win,ko,o,f,pro});
  gearCheckUnlocks(out.lines);
  G.next=null;
  return out;
}
function checkStripped(){
  const b=B();for(let d=0;d<8;d++){const bl=beltsOf('P',d);if(bl.length&&(d!==b.div)){bl.forEach(k=>G.world.champs[d][k]=null);assignChamps(d,false);news(`You vacate your ${bl.join(' & ')} ${DIVS[d].name} title${bl.length>1?'s':''}.`)}}
  const bl=beltsOf('P',b.div);
  if(bl.length&&G.flags.lastDefWeek!=null&&G.week-G.flags.lastDefWeek>45){const k=pick(bl);G.world.champs[b.div][k]=null;assignChamps(b.div,false);news(`The ${k} strips you of its title for failing to defend it in time.`,'red')}
}

/* ---------- quick sim ---------- */
function simFight(o){
  const pc=playerCombat(),f=G.world.f[o.oppId],oc=oppCombat(f);
  const ps=ovr(pc.stats),os=ovr(oc.stats)*({contender:.95,champion:1,legend:1.04}[G.diff]);
  const pw=1/(1+Math.pow(10,(os-ps)/9.5));
  const r=R(),draw=r<.04,win=!draw&&R()<pw;
  const ko=chance(.35+Math.abs(ps-os)/80);
  const round=ko?randi(1,o.rounds):o.rounds;
  const res={winner:draw?'draw':win?'p':'o',method:draw?'DRAW':ko?pick(['KO','TKO']):pick(['UD','UD','SD','MD']),round,time:ko?fmtTime(rand(10,170)):'3:00',
    cards:[],stats:{p:{thrown:randi(300,600),landed:0},o:{thrown:randi(300,600),landed:0}},dmgTaken:rand(60,220)*(win?.7:1.3),kdFor:win&&ko?randi(1,2):0,kdAgainst:!win&&ko?randi(1,2):0,cut:0};
  res.stats.p.landed=Math.round(res.stats.p.thrown*rand(.25,.45));res.stats.o.landed=Math.round(res.stats.o.thrown*rand(.25,.45));
  return res;
}

/* ---------- promoters / team ---------- */
function promoterOffers(){
  const b=B(),out=[];
  for(const k in PROMOTERS){const P=PROMOTERS[k];if(b.pts>=P.minPts||(k==='golden'&&G.flags.am_gold_1)){
    let bonus=P.bonus*(1+b.hype/60)*(G.flags.am_gold_1?1.6:G.flags.am_gold_0?1.2:1);
    if(b.streak<0)bonus*=.5;
    out.push({id:k,bonus:Math.round(bonus/500)*500,fights:P.fights})}}
  return out;
}
function signPromoter(id,bonus){G.promoter={id,left:PROMOTERS[id].fights,losses:0};B().money+=bonus;news(`Signed a ${PROMOTERS[id].fights}-fight deal with ${PROMOTERS[id].co}. Signing bonus ${money(bonus)}.`,'gold')}
function turnPro(){G.phase='pro';const b=B();b.pts=G.flags.am_gold_1?260:G.flags.am_gold_0?180:120;b.hype+=G.flags.am_gold_1?15:5;
  const rv=rivalF();if(rv){rv.active=true;rv.pro=true;rv.pts=b.pts+randi(-10,30);rv.w=0;rv.l=0;rv.ko=0;news(`${shortName(rv)} turns pro the same month. "I'll see you at the top, or I'll see you on the canvas."`,'red')}
  news(`${fullName(b)} turns professional.`,'gold');}
function moveDivision(d){
  const b=B();const old=b.div;
  const bl=beltsOf('P',old);bl.forEach(k=>G.world.champs[old][k]=null);if(bl.length)assignChamps(old,false);
  b.div=d;b.pts=Math.round(b.pts*.62);b.regional=null;G.offers=[];
  news(`${fullName(b)} moves ${d>old?'up':'down'} to ${DIVS[d].name}.${bl.length?' Belts vacated.':''}`,'gold');
  const rv=rivalF();if(rv&&rv.active&&rv.div===old&&chance(.5)&&Math.abs(d-old)===1){G.world.divs[old]=G.world.divs[old].filter(x=>x!==rv.id);rv.div=d;G.world.divs[d].push(rv.id);news(`${shortName(rv)} follows you to ${DIVS[d].name}: "You can't run from me."`,'red')}
}

/* ---------- legacy ---------- */
function legacy(){
  const b=B(),r=b.record;
  const parts=[
    ['Pro wins',r.w*2],['Knockouts',r.ko],['Losses',-r.l*3],
    ['World titles won',b.titleWins*25],['Title defenses',b.defenses*10],['Undisputed reigns',b.undisputed*60],
    ['Multi-division champion',Math.max(0,b.titleDivs.length-1)*40],['Legends beaten',b.legendsBeaten.length*15],
    ['Story chapters',G.chapters.length*20],['Rivalry wins',rivalryWins()*8],['Regional title',b.regional!=null||G.history.some(h=>h.title==='Continental'&&h.res==='W')?5:0],
    ['Amateur gold',(G.flags.am_gold_0?5:0)+(G.flags.am_gold_1?10:0)],
  ];
  const aw=b.awards||[];parts.push(['Fighter of the Year',aw.filter(x=>x==='foy').length*20],['Knockout of the Year',aw.filter(x=>x==='koy').length*10],['Upset of the Year',aw.filter(x=>x==='uoy').length*8]);
  if(G.flags.exile)parts.push(['Took a stand',40]);
  if(b.retired&&r.l===0&&r.w>=25)parts.push(['Retired undefeated',50]);
  const score=Math.max(0,Math.round(sum(parts.map(p=>p[1]))));
  const tiers=[[0,'Journeyman'],[60,'Contender'],[150,'Champion'],[300,'Hall of Famer'],[500,'All-Time Great'],[800,'The Greatest of All Time']];
  let tier=tiers[0][1],next=null;for(let i=0;i<tiers.length;i++){if(score>=tiers[i][0]){tier=tiers[i][1];next=tiers[i+1]||null}}
  return {score,tier,parts,next};
}

/* key drills: which camp sessions matter most against this opponent */
function keyDrills(f){
  const oc=oppCombat(f),ai=oc.ai,out=[];
  const g=(ai.guard||['high'])[0];
  if(g==='high'||g==='peek')out.push(['bag','Their guard is high: heavy-bag body work.']);
  if((ai.counter||0)>.5)out.push(['mitts','They counter: sharpen reactions on the mitts.']);
  if((ai.agg||0)>.7)out.push(['rope','They pressure: build the tank on the rope.']);
  if(oc.stats.spd>=60)out.push(['speed','Fast hands: speed-bag timing.']);
  if(ai.weak==='body')out.push(['bag','Soft body: heavy bag.']);
  if(!out.length)out.push(['spar','An even matchup: live sparring.']);
  const seen=new Set();return out.filter(x=>!seen.has(x[0])&&seen.add(x[0])).slice(0,2);
}
