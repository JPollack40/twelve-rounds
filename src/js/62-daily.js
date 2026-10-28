/* ================= daily challenge + legends gallery ================= */
/* One seeded fight a day: a legend from either circuit plus a twist. Same fight for everyone on that date.
   Best score per day and a win streak live in localStorage; the result card copies a spoiler-free share line. */
const DAILY_EPOCH=Date.UTC(2026,0,1);
function dailyNo(d=new Date()){return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-DAILY_EPOCH)/864e5)+1}
const DAILY_TWISTS=[
  {k:'std',name:'Straight up',desc:'Four rounds, no tricks.'},
  {k:'heat',name:'Jungle heat',desc:'Brutal heat: stamina recovers 25% slower for both of you.',mods:{heat:1}},
  {k:'power',name:'Small gloves',desc:'Everything lands 35% harder, both ways.',mods:{dmg:1.35}},
  {k:'hurt',name:'Short notice',desc:'You took the fight on two days\' notice: you start at 70% health.'},
  {k:'sprint',name:'Two-round sprint',desc:'Only two rounds. Bank them early.',rounds:2},
];
function dailySpec(n=dailyNo()){const r=new Rng(hashStr('daily'+n));const L=LEGENDS[Math.floor(r.next()*LEGENDS.length)];
  const tw=DAILY_TWISTS[Math.floor(r.next()*DAILY_TWISTS.length)];return {n,L,tw,seed:hashStr('dseed'+n)>>>0,rounds:tw.rounds||4}}
function dailyState(){return Object.assign({best:{},streak:0,lastWin:0,wins:0,played:0},Store.get('tr_daily')||{})}
/* the legend as a fight opponent, built outside any career (a throwaway world in the legend's circuit) */
function dailyOpp(S){const keep=G;G={week:0,circuit:S.L.w?'w':'m',world:{f:{},divs:[[],[],[],[],[],[],[],[]],champs:[]},flags:{}};
  try{const r=new Rng(S.seed);const f=RNG.with(r,()=>legendFighter(S.L));const o=RNG.with(r,()=>oppCombat(f));return {f,o}}finally{G=keep}}
function dailyMe(S){const look={skin:2,hair:S.L.w?'ponytail':'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f',fem:S.L.w?1:undefined};
  return {name:'You',first:'You',last:'You',stats:Object.fromEntries(STAT_KEYS.map(k=>[k,88])),look,stance:'orthodox',reach:71,abilities:['onetwo','secondwind','counterread'],mods:{}}}
function dailyScore(res,rounds){const P=res.stats?.p||{},win=res.winner==='p',ko=win&&['KO','TKO','RTD'].includes(res.method);
  const s=(win?1000:0)+(ko?(rounds-res.round+1)*250:0)+(P.landed||0)*4+(P.perfect||0)*15+(res.kdFor||0)*100-(res.kdAgainst||0)*100;
  const acc=P.thrown?P.landed/P.thrown:0;const stars=!win?0:ko?3:(acc>=.45||(P.perfect||0)>=8)?2:1;return {score:Math.max(0,Math.round(s)),stars,win,ko}}
function dailyShare(S,res,sc){const nick=S.L.nick;return `Twelve Rounds Daily #${S.n} ${'🥊'.repeat(sc.stars)}${'▫️'.repeat(3-sc.stars)}\n${sc.win?'W':res.winner==='draw'?'D':'L'} ${res.method} R${res.round} vs "${nick}" · ${S.tw.name}\nScore ${sc.score}`}
function dailyModal(){
  const S=dailySpec(),st=dailyState(),best=st.best[S.n];const {f,o}=dailyOpp(S);
  const img=R3P.ok()?R3P.shot(f.look,{mode:'bust',size:220,arch:f.arch,legend:S.L.id,guard:'down'}):portrait(f.look);
  const m=modal(`<div class="kicker">Daily challenge #${S.n} · ${S.L.w?"Women's":"Men's"} legend</div>
    <div class="slot" style="margin:8px 0"><img src="${img}" alt="" style="width:84px;height:84px"><div class="grow"><b class="ui" style="font-size:20px;text-transform:uppercase">${esc(S.L.first)} <span class="goldt">“${esc(S.L.nick)}”</span> ${esc(S.L.last)}</b>
      <div class="muted" style="font-size:13px">${DIVS[S.L.div].name} · ${ARCH[S.L.arch].name}${S.L.southpaw?' · Southpaw':''}</div></div></div>
    <div class="card flat col" style="gap:4px"><span class="lbl">Twist: ${esc(S.tw.name)}</span><p style="margin:0">${esc(S.tw.desc)}</p></div>
    <p style="font-size:14px"><b>Scouting report:</b> ${esc(o.scout)}</p>
    <div class="row sp muted num" style="font-size:13.5px"><span>Today's best: ${best?best.score+' '+'🥊'.repeat(best.stars):'—'}</span><span>Win streak: ${st.streak}</span></div>
    <button class="btn primary" id="dgo">Fight</button><button class="btn ghost" data-close="x">Not now</button>`);
  $('#dgo',m).onclick=()=>{m.remove();dailyFight(S)};
}
function dailyFight(S){
  const {o}=dailyOpp(S);Sfx.init();
  const F=new Fight({p:dailyMe(S),o,rounds:S.rounds,roundLen:Settings.roundLen,diff:'champion',practice:true,corner:3,trainerName:'Pops Delgado',seed:S.seed,mods:Object.assign({},S.tw.mods||{}),label:'Daily #'+S.n,onEnd:res=>dailyDone(S,res)});
  if(S.tw.k==='hurt')F.p.hp=70;
  F.mount();
}
function dailyDone(S,res){
  const sc=dailyScore(res,S.rounds),st=dailyState();st.played++;
  const prev=st.best[S.n];const isBest=!prev||sc.score>prev.score;if(isBest)st.best[S.n]={score:sc.score,stars:sc.stars};
  if(sc.win&&st.lastWin!==S.n){st.streak=st.lastWin===S.n-1?st.streak+1:1;st.lastWin=S.n;st.wins++}
  for(const k of Object.keys(st.best))if(+k<S.n-60)delete st.best[k];
  Store.set('tr_daily',st);
  const txt=dailyShare(S,res,sc);
  const m=modal(`<div class="kicker">Daily challenge #${S.n}</div><h2 class="sec">${sc.win?(sc.ko?'Knockout!':'You win'):res.winner==='draw'?'A draw':'Not today'}</h2>
    <p class="disp" style="font-size:34px;margin:4px 0">${'🥊'.repeat(sc.stars)}${'<span style="opacity:.25">🥊</span>'.repeat(3-sc.stars)}</p>
    <dl class="kv"><dt>Score</dt><dd class="num">${sc.score}${isBest&&prev?' <span class="pill gold">New best</span>':''}</dd><dt>Result</dt><dd>${esc(res.method)}, round ${res.round}</dd>
    <dt>Landed</dt><dd class="num">${res.stats.p.landed}/${res.stats.p.thrown}</dd><dt>Perfect dodges</dt><dd class="num">${res.stats.p.perfect||0}</dd><dt>Win streak</dt><dd class="num">${st.streak}</dd></dl>
    <p class="muted" style="font-size:13px">${sc.win?(sc.ko?'Three gloves: the stoppage.':'Two gloves for 45% accuracy or 8 perfect dodges; three for a stoppage.'):'Same legend all day: study the pattern and run it back.'}</p>
    <button class="btn gold" id="dshare">Copy result</button><button class="btn" id="dagain">Run it back</button><button class="btn ghost" data-close="ok">Done</button>`,{onClose:()=>UI.render()});
  $('#dshare',m).onclick=async()=>{let ok=false;try{if(navigator.share){await navigator.share({text:txt});ok=true}}catch(e){}
    if(!ok){try{await navigator.clipboard.writeText(txt);ok=true}catch(e){}}toast(ok?'Result copied':'Copy failed: '+txt.split('\n')[0])};
  $('#dagain',m).onclick=()=>{m.remove();dailyFight(S)};
}

/* ---------- legends gallery ---------- */
SCR.legends=()=>{
  const circ=UI.lgC||(G&&G.circuit)||'m';const list=LEGENDS.filter(l=>(l.w?'w':'m')===circ);const beaten=G&&G.boxer?B().legendsBeaten:[];
  const cards=list.map(l=>{const ab=AB[l.ab];return `<div class="card col" style="gap:6px"><div class="slot"><img data-lg="${l.id}" alt="" style="width:72px;height:72px"><div class="grow">
      <b class="ui" style="font-size:17px;text-transform:uppercase;letter-spacing:.03em">${esc(l.first)} ${esc(l.last)}</b><div class="goldt" style="font-size:13.5px">“${esc(l.nick)}”</div>
      <div class="muted" style="font-size:12.5px">${DIVS[l.div].name} · ${ARCH[l.arch].name}${l.southpaw?' · Southpaw':''} · ${esc(l.home)}</div></div>${beaten.includes(l.id)?'<span class="pill gold">Beaten</span>':''}</div>
    <div class="dim" style="font-size:12.5px">Inspired by ${esc(l.homage)}</div>
    <div style="font-size:13.5px">${esc(l.ai.scout)}</div>
    <div style="font-size:13px"><b class="goldt">${esc(ab.name)}:</b> ${esc(ab.desc)}</div></div>`}).join('');
  const body=`<div class="row sp" style="flex-wrap:wrap;gap:8px"><p class="muted" style="font-size:13.5px;margin:0;max-width:52ch">Fictional fighters with original names, each a tribute to a great of the sport. Beat one in your career to learn their signature move.</p>
    <div class="chips">${[['m',"Men's"],['w',"Women's"]].map(([k,n])=>`<button class="chip${circ===k?' on':''}" data-act="lgcirc" data-v="${k}">${n}</button>`).join('')}</div></div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));margin-top:10px">${cards}</div>`;
  if(G&&G.boxer)return shell('legends','Legends',body);
  return `<div class="scr"><div class="wrap" style="max-width:980px"><div class="topbar"><button class="btn sm back" data-go="title">◀</button><div class="t">Legends</div></div>${body}</div></div>`;
};
/* portraits fill in one per frame so the screen appears at once */
AFTER.legends=()=>{const imgs=$$('img[data-lg]');let i=0;const tok=UI._lgTok=(UI._lgTok||0)+1;
  const next=()=>{if(UI._lgTok!==tok||i>=imgs.length||!imgs[i].isConnected)return;const im=imgs[i++],L=LEGEND_BY[im.dataset.lg];
    const f={look:Object.assign({skin:L.skin,hair:L.hair,hc:L.hc||0,beard:L.beard||'none',trunks:L.trunks,trim:'#f4efe3',gloves:L.trunks==='#d8392f'?'#f4efe3':'#d8392f',fs:hashStr(L.id)%10000,band:L.last.toUpperCase(),fem:L.w?1:undefined},LEGEND_VIS[L.id]||{})};
    try{im.src=R3P.ok()?R3P.shot(f.look,{mode:'bust',size:160,arch:L.arch,legend:L.id,guard:'down'}):portrait(f.look)}catch(e){}setTimeout(next,16)};next()};
Object.assign(ACT,{
  daily(){dailyModal()},
  lgcirc(el){UI.lgC=el.dataset.v;UI.render()},
});
