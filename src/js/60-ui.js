/* ================= UI ================= */
const app=()=>$('#app');
const UI={cur:'title',arg:null,cr:null,lastResult:null,
  go(s,arg){this.cur=s;this.arg=arg;Sfx.click();this.render();const m=$('.main .scr')||$('.scr');if(m)m.scrollTop=0},
  render(){const f=SCR[this.cur]||SCR.title;app().innerHTML=f(this.arg);const after=AFTER[this.cur];if(after)after(this.arg)},
};
const isWide=()=>innerWidth>=680;
let _rw=isWide();
window.addEventListener('resize',()=>{const w=isWide();if(w!==_rw){_rw=w;if(!$('.fight')&&!$('.mg')&&!$('.modal'))UI.render()}});

function toast(t){if(UI.silent)return;const el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}
function modal(html,opts={}){
  const el=document.createElement('div');el.className='modal';el.innerHTML=`<div class="box${opts.wide?' wide':''}">${html}</div>`;
  if(!UI.silent)document.body.appendChild(el);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b){el.remove();opts.onClose&&opts.onClose(b.dataset.close)}});
  return el;
}
function confirmBox(title,text,yes,onYes,danger){
  const m=modal(`<h2 class="sec">${esc(title)}</h2><p>${text}</p><div class="row"><button class="btn ${danger?'primary':'gold'} grow" id="cyes">${esc(yes)}</button><button class="btn ghost" data-close="no">Cancel</button></div>`);
  $('#cyes',m).onclick=()=>{m.remove();onYes()};
}

/* ---------- shared bits ---------- */
function beltsHTML(){const bl=playerBelts();let h=bl.map(b=>`<span class="belt" title="${esc(BODIES.find(x=>x.k===b.k).name)}">${b.k} ${DIVS[b.d].short}</span>`).join('');if(B().regional!=null)h+=`<span class="pill gold">Continental</span>`;return h}
function rankLabel(){if(G.phase!=='pro')return G.phase==='retired'?'Retired':'Amateur';const r=playerRank();const bl=beltsOf('P',B().div);return bl.length?`Champion · ${DIVS[B().div].name}`:`#${r} ${DIVS[B().div].name}`}
function profileHTML(){
  const b=B(),age=ageOf(b.born),need=xpNeed(b.level);
  return `<div class="prof"><img src="${portrait(b.look)}" alt=""><div class="grow">
    ${b.nick?`<div class="nk">“${esc(b.nick)}”</div>`:''}<div class="nm">${esc(b.first)} ${esc(b.last)}</div>
    <div class="rec num">${b.record.w}-${b.record.l}${b.record.d?'-'+b.record.d:''} <span class="muted" style="font-size:14px">${b.record.ko} KO${G.phase==='amateur'?` · Am ${b.am.w}-${b.am.l}`:''}</span></div></div></div>
    <div class="belts">${G.sandbox?'<span class="pill red">Sandbox</span>':''}${beltsHTML()}</div>
    <dl class="kv"><dt>Status</dt><dd>${esc(rankLabel())}</dd><dt>Level</dt><dd class="num">${b.level} <span class="muted">(${b.xp}/${need} XP)</span></dd>
    <dt>Overall</dt><dd class="num">${playerOvr()}</dd><dt>Money</dt><dd class="num">${money(b.money)}</dd><dt>Age</dt><dd class="num">${age} · ${dateStr()}</dd></dl>
    <div class="bar g"><i style="width:${b.xp/need*100}%"></i></div>`;
}
const NAV=[
  ['home','Home','Next steps'],['fight','Fight','Offers & camp'],['boxer','Boxer','Stats & abilities'],['skills','Skills','Skill tree'],
  ['division','Division','Weight class'],['team','Team','Promoter, trainer'],['rankings','Rankings','Divisions & belts'],['record','Record','History & chapters'],
  ['news','News','The boxing wire'],['legacy','Legacy','Hall of Fame'],['settings','Settings','Sound, saves'],
];
function navHTML(active){
  const b=B();const dot={boxer:b.statPts>0,skills:b.skillPts>0&&SKILLS.some(s=>canBuySkill(s)),fight:!!G.next||G.offers.length>0};
  return `<div class="nav">${(Settings.dev?NAV.concat([['dev','Dev','Lab & scenarios']]):NAV).map(n=>`<button class="navb${n[0]===active?' on':''}" data-go="${n[0]}">${dot[n[0]]?'<span class="dot"></span>':''}<b>${n[1]}</b><small>${n[2]}</small></button>`).join('')}</div>`;
}
function shell(active,title,content){
  const wide=isWide();
  if(wide)return `<div class="shell two"><aside class="side">${profileHTML()}${navHTML(active)}<button class="btn ghost sm" data-act="quit">Save & exit to title</button></aside><main class="main"><div class="scr"><div class="wrap">${content}</div></div></main></div>`;
  return `<div class="shell"><main class="main"><div class="scr"><div class="wrap">${active!=='home'?`<div class="topbar"><button class="btn sm back" data-go="home" aria-label="Back">◀</button><div class="t">${esc(title)}</div></div>`:''}${content}</div></div></main></div>`;
}
function oppCard(f,extra=''){
  const r=G.phase==='pro'?rankOf(f.id,f.div):0,bl=beltsOf(f.id,f.div),L=f.legend?LEGEND_BY[f.legend]:null;
  return `<div class="vs"><img src="${portrait(f.look)}" alt=""><div class="grow">
    <div class="on">${esc(f.first)} ${f.nick?`<span class="goldt">“${esc(f.nick)}”</span> `:''}${esc(f.last)}</div>
    <div class="muted num" style="font-size:13.5px">${recStr(f)} (${f.ko} KO) · ${ARCH[f.arch].name} · ${esc(f.home)} · Age ${ageOf(f.born)}</div>
    <div class="tags" style="margin-top:4px">${bl.map(k=>`<span class="belt">${k}</span>`).join('')}${r&&!bl.length&&!f.amateur?`<span class="pill">#${r}</span>`:''}${L?`<span class="pill gold" title="Homage to ${esc(L.homage)}">Legend</span>`:''}${f.rival?'<span class="pill red">Rival</span>':''}<span class="pill ${f.rating>playerOvr()+5?'red':f.rating<playerOvr()-5?'green':'blue'}">OVR ${Math.round(f.rating)}</span>${extra}</div></div></div>`;
}

/* ---------- screens ---------- */
const SCR={},AFTER={};

SCR.title=()=>{
  const slots=[1,2,3].map(n=>({n,s:Save.peek(n)}));
  return `<div class="scr"><div class="wrap" style="max-width:640px">
    <div class="title-hero"><div class="logo" id="logo" data-act="logotap">TWELVE<span>ROUNDS</span></div><p class="muted" style="max-width:34ch">A boxing career, from the Golden Gloves to the Hall of Fame.</p></div>
    <div class="col">${slots.map(({n,s})=>s?`<div class="card slot"><img src="${portrait(s.look)}" alt=""><div class="grow"><b class="ui" style="font-size:18px;text-transform:uppercase;letter-spacing:.04em">${esc(s.name)}</b><div class="muted num" style="font-size:13.5px">${esc(s.line)}</div></div><button class="btn primary" data-act="load" data-n="${n}">Continue</button></div>`
      :`<div class="card slot"><div class="grow"><b class="ui" style="font-size:18px;text-transform:uppercase;letter-spacing:.04em">Empty slot ${n}</b><div class="muted" style="font-size:13.5px">Start a new career</div></div><button class="btn gold" data-act="new" data-n="${n}">New career</button></div>`).join('')}</div>
    <div class="row">${Settings.dev?'<button class="btn gold grow" data-act="devgo">Dev mode</button>':''}<button class="btn grow" data-act="practice">Practice spar</button><button class="btn grow" data-go="help">How to play</button><button class="btn grow" data-go="tsettings">Settings</button></div>
    <p class="dim" style="font-size:12.5px;text-align:center">${esc(Save.status())}</p>
  </div></div>`;
};

SCR.help=()=>`<div class="scr"><div class="wrap" style="max-width:720px"><div class="topbar"><button class="btn sm back" data-go="${G?'home':'title'}">◀</button><div class="t">How to play</div></div>
  <div class="card col"><h3>Fighting</h3>
  <p>Your opponent telegraphs every punch: the glove pulls back and <b class="goldt">glows</b>. The color tells you what's coming.</p>
  <table class="t"><tr><th>Glow</th><th>Punch</th><th>How to avoid it</th></tr>
  <tr><td style="color:${TELL_COL.jab}">Pale yellow</td><td>Jab</td><td>Slip either way, duck, or block</td></tr>
  <tr><td style="color:${TELL_COL.cross}">Amber</td><td>Cross</td><td>Slip either way, duck, or block</td></tr>
  <tr><td style="color:${TELL_COL.hook}">Orange, swings wide</td><td>Hook</td><td>Duck, or slip <b>away</b> from that side</td></tr>
  <tr><td style="color:${TELL_COL.upper}">Red, drops low</td><td>Uppercut</td><td>Slip. Never duck. It breaks through a block.</td></tr></table>
  <p>Their eyes flash before power punches. Dodge at the last moment for a <b>Perfect</b> dodge: they're left open and your next punch is a counter at 1.45x damage.</p>
  <p>A high guard blocks head shots, so hold or tap <b>Body</b> before a punch to go downstairs. Body shots drain their stamina and lower their guard. Punching into a wind-up interrupts it for counter damage.</p>
  <p>Missed punches cost extra stamina. Below 40 stamina you slow down and hit softer. <b>Clinch</b> to recover, but holding too often costs points.</p>
  <p>Landing punches and dodging fills your <b>meter</b> (3 bars). Spend it on abilities.</p></div>
  <div class="card col"><h3>Career</h3>
  <p>Start in the amateurs, then turn pro. <b>Offers depend on how you're doing</b>: win streaks and knockouts bring step-up fights and title shots, and losses bring prove-it fights.</p>
  <p>Before each fight you get a training camp, one session per week. Mini-games build stats and XP. Film study makes their tells last longer. Watch your fatigue: overtraining causes injuries.</p>
  <p>Level up for stat points and skill points. Beat legends to learn their signature moves. Story chapters, modeled on famous fights, unlock when your career matches the moment.</p>
  <p>Your frame sets a natural weight. Cutting down makes you bigger than your opponents but drains your stamina. Moving up makes you faster but smaller. You peak in your late 20s, and after 31 your speed starts to fade.</p></div>
  <div class="card"><h3>Keyboard</h3><p class="muted">J K U I punches · A S D slip/duck · Space block · Shift body · E clinch · 1-3 abilities · Esc pause</p></div>
</div></div>`;

SCR.tsettings=()=>`<div class="scr"><div class="wrap" style="max-width:640px"><div class="topbar"><button class="btn sm back" data-go="title">◀</button><div class="t">Settings</div></div>${settingsHTML(false)}</div></div>`;
function settingsHTML(inCareer){
  const tg=(k,l,d)=>`<div class="row sp card flat"><div class="grow"><b class="ui" style="text-transform:uppercase;letter-spacing:.05em">${l}</b><div class="muted" style="font-size:13px">${d}</div></div><button class="btn sm ${Settings[k]?'gold':''}" data-act="toggle" data-k="${k}">${Settings[k]?'On':'Off'}</button></div>`;
  return `<div class="col">
    ${tg('sound','Sound','Punches, bell and crowd, all synthesized.')}
    ${tg('haptics','Vibration','Buzz on big hits and knockdowns, where the browser allows it.')}
    ${tg('slowmo','Knockdown slow motion','Slow motion on knockdowns.')}
    ${tg('hints','Fight hints','Show the how-to-fight card in practice and your first bout.')}
    ${tg('lefty','Swap control sides','Punches on the left thumb, defense on the right.')}
    ${tg('audioTells','Audio tells','A different wind-up sound for each punch, and a chime before power shots.')}
    ${tg('gfx3d','3D fighters','Stylized 3D opponent and gloves. Off uses the 2D renderer.')}
    ${tg('gfxHi','High detail','Shadows, antialiasing and a sharper render. Turn off on a hot or slow phone.')}
    ${tg('hitstop','Hit-stop','A split-second freeze on heavy punches and knockdowns.')}
    ${tg('fps60','Battery saver (60 fps)','Caps the fight at 60 frames per second. Off for 120 Hz.')}
    ${tg('lowlat','Low-latency drawing','Draws to the screen sooner. Turn off if you see tearing.')}
    <div class="card flat col"><b class="ui" style="text-transform:uppercase;letter-spacing:.05em">Fight button size</b>
    <div class="chips">${[[.85,'Small'],[1,'Normal'],[1.2,'Large'],[1.4,'Huge']].map(([v,l])=>`<button class="chip${(Settings.btnSize||1)===v?' on':''}" data-act="btnsize" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="card flat col"><b class="ui" style="text-transform:uppercase;letter-spacing:.05em">Round length</b><div class="muted" style="font-size:13px">Real seconds per round. The fight clock still reads as boxing time.</div>
    <div class="chips">${[45,60,90].map(s=>`<button class="chip${Settings.roundLen===s?' on':''}" data-act="roundlen" data-s="${s}">${s}s</button>`).join('')}</div></div>
    ${inCareer?`<div class="card col"><h3>Save</h3><p class="muted" style="font-size:13.5px">${esc(Save.status())}</p>
      <div class="row"><button class="btn grow" data-act="export">Export save code</button><button class="btn grow" data-act="import">Import save code</button></div>
      <button class="btn ghost" data-act="quit">Save & exit to title</button><button class="btn ghost" data-act="delslot" style="color:var(--bad)">Delete this career</button></div>`:
      `<div class="card col"><h3>Saves</h3><p class="muted" style="font-size:13.5px">${esc(Save.status())}</p><button class="btn" data-act="import">Import save code</button></div>`}
  </div>`;
}

/* ---------- creator ---------- */
function crDefault(){return {step:0,first:'',last:'',nick:'',home:'',age:19,stance:'orthodox',look:{skin:2,hair:'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f'},height:70,build:'medium',arms:'avg',arch:'boxerpuncher',diff:'champion'}}
function crNatural(c){return clamp(Math.round((c.height-62)/2+BUILDS[c.build].off),0,7)}
SCR.create=()=>{
  const c=UI.cr,steps=['Identity','Look','Frame','Style','Difficulty'];
  let body='';
  if(c.step===0)body=`<div class="col">
    <div class="grid2"><label class="field"><span class="lbl">First name</span><input id="f_first" maxlength="16" value="${esc(c.first)}" placeholder="Jake" autocomplete="off"></label>
    <label class="field"><span class="lbl">Last name</span><input id="f_last" maxlength="18" value="${esc(c.last)}" placeholder="Morrison" autocomplete="off"></label></div>
    <label class="field"><span class="lbl">Nickname (optional)</span><input id="f_nick" maxlength="20" value="${esc(c.nick)}" placeholder="The Hammer" autocomplete="off"></label>
    <label class="field"><span class="lbl">Hometown</span><input id="f_home" maxlength="28" value="${esc(c.home)}" placeholder="Philadelphia, PA" autocomplete="off"></label>
    <div class="field"><span class="lbl">Starting age</span><div class="chips">${[18,19,20,21,22].map(a=>`<button class="chip${c.age===a?' on':''}" data-act="cr" data-k="age" data-v="${a}">${a}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Stance</span><div class="chips">${['orthodox','southpaw'].map(s=>`<button class="chip${c.stance===s?' on':''}" data-act="cr" data-k="stance" data-v="${s}">${s}</button>`).join('')}</div></div>
    <button class="btn ghost sm" data-act="crrandom" style="align-self:flex-start">Random name</button></div>`;
  if(c.step===1){const sw=(k,arr,isIdx)=>arr.map((col,i)=>`<button class="sw${(isIdx?c.look[k]===i:c.look[k]===col)?' on':''}" style="background:${col}" data-act="crl" data-k="${k}" data-v="${isIdx?i:col}" aria-label="${k} ${i}"></button>`).join('');
    body=`<div class="col"><div class="field"><span class="lbl">Skin</span><div class="chips">${sw('skin',SKIN,true)}</div></div>
    <div class="field"><span class="lbl">Hair</span><div class="chips">${HAIRS.map(h=>`<button class="chip${c.look.hair===h?' on':''}" data-act="crl" data-k="hair" data-v="${h}">${h}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Hair color</span><div class="chips">${sw('hc',HAIRC,true)}</div></div>
    <div class="field"><span class="lbl">Facial hair</span><div class="chips">${BEARDS.map(h=>`<button class="chip${c.look.beard===h?' on':''}" data-act="crl" data-k="beard" data-v="${h}">${h}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Trunks</span><div class="chips">${sw('trunks',COLORS)}</div></div>
    <div class="field"><span class="lbl">Trim</span><div class="chips">${sw('trim',COLORS)}</div></div>
    <div class="field"><span class="lbl">Gloves</span><div class="chips">${sw('gloves',COLORS)}</div></div></div>`}
  if(c.step===2){const nat=crNatural(c);const reach=c.height+ARMS[c.arms].d;
    body=`<div class="col"><div class="field"><span class="lbl">Height: ${ftIn(c.height)}</span><input type="range" id="f_h" min="62" max="78" value="${c.height}" style="accent-color:var(--gold)"></div>
    <div class="field"><span class="lbl">Build</span><div class="chips">${Object.keys(BUILDS).map(k=>`<button class="chip${c.build===k?' on':''}" data-act="cr" data-k="build" data-v="${k}">${BUILDS[k].name}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Arm length</span><div class="chips">${Object.keys(ARMS).map(k=>`<button class="chip${c.arms===k?' on':''}" data-act="cr" data-k="arms" data-v="${k}">${ARMS[k].name}</button>`).join('')}</div></div>
    <div class="card flat col"><div class="row sp"><span class="lbl">Natural division</span><b class="ui goldt" style="font-size:20px;text-transform:uppercase">${DIVS[nat].name}</b></div>
    <div class="row sp"><span class="lbl">Reach</span><b class="num">${reach}″</b></div>
    <div class="muted" style="font-size:13.5px">You can fight anywhere from ${DIVS[Math.max(0,nat-2)].name} to ${DIVS[Math.min(7,nat+2)].name}. Cutting down makes you bigger but drains stamina; moving up makes you faster but smaller. A longer reach makes your jab hit harder.</div></div></div>`}
  if(c.step===3)body=`<div class="grid2">${Object.keys(ARCH).map(k=>{const A=ARCH[k];return `<button class="arch${c.arch===k?' on':''}" data-act="cr" data-k="arch" data-v="${k}"><b>${A.name}</b><small>${A.blurb}</small>
    <div class="col" style="gap:3px;width:100%;margin-top:6px">${STAT_KEYS.map(s=>`<div class="stat" style="grid-template-columns:62px 1fr 26px"><span class="lbl" style="font-size:10.5px">${STAT_NAME[s]}</span><div class="bar"><i style="width:${A.base[s]}%"></i></div><span class="num" style="font-size:12px">${A.base[s]}</span></div>`).join('')}</div>
    <small style="margin-top:4px"><b class="goldt">${AB[A.ability].name}:</b> ${AB[A.ability].desc}</small></button>`}).join('')}</div>`;
  if(c.step===4)body=`<div class="col">${Object.keys(DIFF).map(k=>`<button class="arch${c.diff===k?' on':''}" data-act="cr" data-k="diff" data-v="${k}"><b>${DIFF[k].name}</b><small>${DIFF[k].desc}</small></button>`).join('')}
    <div class="card flat"><span class="lbl">Ready</span><p style="margin-top:6px">${esc(c.first||'Your boxer')} ${c.nick?'“'+esc(c.nick)+'” ':''}${esc(c.last)}, ${c.age}, ${ftIn(c.height)} ${ARCH[c.arch].name} from ${esc(c.home||'nowhere in particular')}. Natural ${DIVS[crNatural(c)].name}.</p></div></div>`;
  const prev=`<div class="card" style="display:flex;justify-content:center;padding:6px"><canvas id="crcv" width="300" height="300" style="width:min(100%,300px);aspect-ratio:1;max-width:100%"></canvas></div>`;
  const nav=`<div class="row">${c.step>0?`<button class="btn" data-act="crstep" data-d="-1">Back</button>`:`<button class="btn" data-go="title">Cancel</button>`}<button class="btn ${c.step===4?'primary':'gold'} grow" data-act="crstep" data-d="1">${c.step===4?'Start career':'Next: '+steps[c.step+1]}</button></div>`;
  return `<div class="scr"><div class="wrap" style="max-width:980px"><div class="topbar"><div class="t">Build your boxer</div><span class="pill">${c.step+1} / 5 · ${steps[c.step]}</span></div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:start"><div class="col">${prev}</div><div class="col">${body}${nav}</div></div></div></div>`;
};
AFTER.create=()=>{
  const c=UI.cr,cv=$('#crcv');
  if(cv){const x=cv.getContext('2d');const g=x.createLinearGradient(0,0,0,300);g.addColorStop(0,'#232a4a');g.addColorStop(1,'#0e1122');x.fillStyle=g;x.fillRect(0,0,300,300);
    const s=(.62+(c.height-62)*.012)*.78;
    const sp=x.createRadialGradient(150,40,10,150,120,200);sp.addColorStop(0,'rgba(255,240,200,.22)');sp.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=sp;x.fillRect(0,0,300,300);
    x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(150,292,70*s,14*s,0,0,7);x.fill();
    x.save();x.translate(150,292);x.scale(s,s);
    const G=GUARDS[c.arch==='slugger'?'low':c.arch==='swarmer'?'peek':'high'];
    drawFighter(x,c.look,{hip:[0,-150],chest:[0,-232],head:[0,-322],headTilt:0,twist:0,lean:0,crouch:0,lg:G.lg.slice(),rg:G.rg.slice(),legSpread:52,face:'normal',dmg:{}},{});x.restore();
    x.fillStyle='rgba(255,255,255,.5)';x.font='12px "Barlow Condensed",sans-serif';x.fillText(`${ftIn(c.height)} · ${c.stance}`,10,290)}
  for(const id of ['first','last','nick','home']){const i=$('#f_'+id);if(i)i.addEventListener('input',()=>{c[id]=i.value})}
  const h=$('#f_h');if(h)h.addEventListener('input',()=>{c.height=+h.value;UI.render()});
};

/* ---------- home ---------- */
function ensureState(){
  if(G.phase==='amateur'&&!G.am.done&&!G.next)acceptOffer(amateurOffer());
  if(G.phase==='pro'&&!G.next&&!G.offers.length)genOffers();
}
SCR.home=()=>{
  ensureState();
  const b=B();let hero='';
  if(G.phase==='retired')hero=`<div class="hero"><div class="in"><div class="kicker">Retired</div><h1 class="disp" style="font-size:30px">Career over</h1><button class="btn gold" data-go="legacy">See your legacy</button></div></div>`;
  else if(G.phase==='amateur'&&G.am.done){
    hero=`<div class="hero"><div class="in"><div class="kicker">Amateur career</div><h1 class="disp" style="font-size:28px">${G.flags['am_gold_'+G.am.stage]?'Gold medal!':'Tournament over'}</h1>
      <p class="muted">${G.am.stage===0?'Enter the National Championships for a better pro contract, or turn pro now.':'Time to get paid.'}</p>
      <div class="row">${G.am.stage===0?`<button class="btn blue grow" data-act="nationals">Enter Nationals</button>`:''}<button class="btn primary grow" data-act="turnpro">Turn pro</button></div></div></div>`;
  }else if(G.next){
    const o=G.next.offer,f=G.world.f[o.oppId];
    hero=`<div class="hero"><div class="in"><div class="kicker">${esc(o.label)}${o.chapter?' · Story chapter':''}</div>
      <div class="offer">${oppCard(f)}</div>
      <div class="tags"><span class="pill">${o.rounds} rounds</span>${o.purse?`<span class="pill gold">${money(o.purse)}</span>`:''}${o.venue?`<span class="pill">${esc(o.venue)}</span>`:''}${o.title&&!o.title.regional?`<span class="pill gold">Title fight</span>`:''}</div>
      <p><b class="ui" style="font-size:20px">${G.next.weeksLeft>0?`Fight in ${G.next.weeksLeft} week${G.next.weeksLeft>1?'s':''}`:'Fight night!'}</b></p>
      <button class="btn ${G.next.weeksLeft>0?'gold':'primary'}" data-go="${G.next.weeksLeft>0?'camp':'fightnight'}">${G.next.weeksLeft>0?'Go to training camp':'Walk to the ring'}</button></div></div>`;
  }else{
    const inj=b.injuries.length;
    hero=`<div class="hero"><div class="in"><div class="kicker">${G.promoter?esc(PROMOTERS[G.promoter.id].co)+' · '+G.promoter.left+' fights left':'Free agent'}</div>
      <h1 class="disp" style="font-size:28px">${G.offers.length} fight offer${G.offers.length!==1?'s':''}</h1>
      <p class="muted">Form: <b>${momentumLabel(momentum())}</b>${b.streak>1?` · ${b.streak}-fight win streak`:b.streak<-1?` · ${-b.streak} losses in a row`:''}</p>
      ${inj?`<p class="warnt">Injured: ${b.injuries.map(i=>INJ[i.id].name+' ('+i.wk+'w)').join(', ')}</p>`:''}
      <div class="row"><button class="btn primary grow" data-go="fight">See offers</button>${inj?`<button class="btn" data-act="restheal">Rest until healed</button>`:''}${!G.promoter?`<button class="btn blue" data-act="promoters">Promoters</button>`:''}</div></div></div>`;
  }
  const path=pathHTML();
  const rv=rivalF();
  const rivalC=rv?`<div class="card col"><div class="row sp"><h3>Rival</h3><span class="pill red">Head to head ${G.rival.w}-${G.rival.l}</span></div>${oppCard(rv)}</div>`:'';
  const nw=G.newsList.slice(0,5).map(n=>`<div style="padding:6px 0;border-bottom:1px solid #262c4a;font-size:14px" class="${n.tone==='gold'?'goldt':n.tone==='red'?'':''}"><span class="dim num" style="font-size:12px">${dateStr(n.w)}</span> ${esc(n.t)}</div>`).join('');
  const prof=isWide()?'':`<div class="card col">${profileHTML()}</div>`;
  const pts=[];if(b.statPts)pts.push(`<button class="btn gold sm" data-go="boxer">${b.statPts} stat point${b.statPts>1?'s':''} to spend</button>`);if(b.skillPts&&SKILLS.some(s=>canBuySkill(s)))pts.push(`<button class="btn gold sm" data-go="skills">${b.skillPts} skill point${b.skillPts>1?'s':''}</button>`);
  return shell('home','Home',`${prof}${pts.length?`<div class="row">${pts.join('')}</div>`:''}${hero}<div class="grid2">${path}${rivalC}</div><div class="card"><div class="row sp"><h3>Boxing wire</h3><button class="btn ghost sm" data-go="news">All news</button></div>${nw}</div>${isWide()?'':navHTML('home')}`);
};
function pathHTML(){
  const b=B();
  if(G.phase!=='pro')return `<div class="card col"><h3>Path to the pros</h3><p class="muted" style="font-size:14px">Win the ${AM_TOURNEYS[G.am.stage].name}. Gold medals bring bigger signing bonuses and a higher starting ranking.</p>
    <div class="tags">${AM_TOURNEYS[G.am.stage].rounds.map((r,i)=>`<span class="pill ${G.am.results[i]==='W'?'green':G.am.results[i]==='L'?'red':i===G.am.round&&!G.am.done?'gold':''}">${r}</span>`).join('')}</div></div>`;
  const r=playerRank(),bl=beltsOf('P',b.div),list=ranking(b.div);
  let goal,need;
  if(bl.length===4){goal='Undisputed. Defend it, or move divisions and chase more history.';}
  else if(bl.length){goal=`Champion. Unify the remaining ${4-bl.length} belt${4-bl.length>1?'s':''} or defend.`}
  else if(r<=3){goal='Mandatory challenger: a title shot is on the table.'}
  else if(r<=6){goal='Win while on a roll and promoters will offer a title shot.'}
  else if(r<=15){goal='Ranked. Reach the top 6 to get title-shot offers.'}
  else{const e15=list[14];need=e15?Math.max(0,e15.pts-b.pts+1):0;goal=`Unranked. About ${need} ranking points to crack the top 15. Step-up fights earn the most.`}
  const pct=clamp(1-(r-1)/Math.max(1,list.length-1),0,1);
  return `<div class="card col"><div class="row sp"><h3>Path to a title</h3><span class="pill ${bl.length?'gold':'blue'}">${bl.length?'Champion':'#'+r} · ${DIVS[b.div].short}</span></div>
    <div class="bar g"><i style="width:${pct*100}%"></i></div><p style="font-size:14px">${goal}</p><p class="muted num" style="font-size:12.5px">Ranking points ${b.pts} · Hype ${Math.round(b.hype)}/100</p></div>`;
}

/* ---------- fight hub: offers ---------- */
SCR.fight=()=>{
  ensureState();
  if(G.next)return shell('fight','Fight',`<div class="card col"><h3>Fight booked</h3>${oppCard(G.world.f[G.next.offer.oppId])}<button class="btn gold" data-go="${G.next.weeksLeft>0?'camp':'fightnight'}">${G.next.weeksLeft>0?'Training camp':'Fight night'}</button></div>`);
  if(G.phase!=='pro')return shell('fight','Fight',`<div class="card">Finish your amateur run from the Home screen.</div>`);
  const b=B(),inj=b.injuries;
  const offers=G.offers.map((o,i)=>{const f=G.world.f[o.oppId];return `<div class="card offer">
    <div class="row sp"><div class="kicker">${esc(o.label)}</div>${o.chapter?'<span class="pill gold">Story chapter</span>':''}</div>
    ${oppCard(f)}
    <p style="font-size:14px">${esc(o.desc)}</p>
    <div class="tags"><span class="pill">${o.rounds} rds</span><span class="pill gold">${money(o.purse)}</span><span class="pill">${o.weeks}-week camp</span><span class="pill">${esc(o.venue)}</span>${o.mods?.odds?`<span class="pill red">${esc(o.mods.odds)}</span>`:''}</div>
    <button class="btn primary" data-act="accept" data-i="${i}">Accept fight</button></div>`}).join('');
  return shell('fight','Fight offers',`<div class="row sp"><div><h2 class="sec">Fight offers</h2><p class="muted" style="font-size:13.5px">Form: ${momentumLabel(momentum())}. Better form brings bigger fights.</p></div><button class="btn sm" data-act="wait">Wait 2 weeks</button></div>
    ${inj.length?`<div class="card" style="border-color:var(--warn)"><b class="warnt">You're injured.</b> ${inj.map(i=>`${INJ[i.id].name} (${i.wk} weeks): ${INJ[i.id].desc}`).join(' ')} If your camp is shorter than your recovery, you'll fight hurt.</div>`:''}
    <div class="grid2">${offers||'<div class="card">No offers right now. Wait a couple of weeks.</div>'}</div>`);
};

/* ---------- camp ---------- */
SCR.camp=()=>{
  const n=G.next;if(!n){UI.cur='home';return SCR.home()}
  const o=n.offer,f=G.world.f[o.oppId],wi=weightInfo(),oc=oppCombat(f);
  const fav=Object.entries(oc.ai.w||{}).sort((a,b)=>b[1]-a[1])[0][0];
  const scout=n.scout>=1?`<p style="font-size:14px">${oc.scout?'<b>Scouting report:</b> '+esc(oc.scout)+' ':''}Favorite punch is the <b>${PUNCH[fav].name.toLowerCase()}</b>. ${(oc.ai.body||0)>.35?'Works the body a lot. ':''}${(oc.ai.counter||0)>.5?'A patient counter-puncher. ':''}${(oc.ai.agg||0)>.7?'Comes forward relentlessly. ':''}Their guard is usually ${(oc.ai.guard||['high'])[0]}.</p>`:`<p class="muted" style="font-size:13.5px">Do some film study to scout their habits.</p>`;
  const keys=keyDrills(f);const acts=Object.keys(CAMP).map(k=>{const C=CAMP[k];const off=(k==='cut'&&(!wi||wi.diff>=0))||(k==='film'&&n.scout>=2);const key=keys.find(x=>x[0]===k);const done=n.edge&&n.edge[k];return `<button class="navb${key?' on':''}" data-act="camp" data-k="${k}"${off?' disabled style="opacity:.4"':''}>${key?`<span class="pill gold" style="position:absolute;top:6px;right:6px;font-size:10px">${done?'✓ edge':'key drill'}</span>`:''}<b>${C.name}</b><small>${key?esc(key[1]):C.desc}</small></button>`}).join('');
  const fat=n.fatigue;
  return shell('fight','Training camp',`<div class="card col"><div class="row sp"><h3>Training camp</h3><span class="pill ${n.weeksLeft?'gold':'red'}">${n.weeksLeft} week${n.weeksLeft!==1?'s':''} left</span></div>${oppCard(f)}${scout}</div>
    ${n.weeksLeft>0?`<div class="card col"><div class="row sp"><span class="lbl">Fatigue</span><span class="num ${fat>60?'bad':fat>35?'warnt':''}">${Math.round(fat)}</span></div><div class="bar r"><i style="width:${Math.min(100,fat)}%"></i></div>
      <p class="muted" style="font-size:13px">Above 60, every hard session risks an injury. Training at ${esc(GYMS[G.gym].name)} with ${esc(TRAINERS[G.trainer].name)} (x${campBoosts().toFixed(2)} gains).</p>
      ${wi&&wi.diff<0?`<p class="warnt" style="font-size:13.5px">${wi.label}: stamina at ${Math.round(wi.sta*100)}% on fight night. Weight management helps.</p>`:''}</div>
      <div class="nav" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${acts}</div>
      <div class="row"><button class="btn gold grow" data-act="quickcamp">Quick camp (key drills first, fewer gains)</button></div>`:
      `<button class="btn primary" data-go="fightnight">Fight night: walk to the ring</button>`}
    ${n.sessions.length?`<div class="card"><span class="lbl">This camp</span><p style="font-size:13.5px;margin-top:4px">${n.sessions.map(s=>`${CAMP[s.kind].name}${s.q?' '+s.q+'%':''}`).join(' · ')}</p></div>`:''}`);
};
function doCamp(kind){
  const n=G.next;if(!n||n.weeksLeft<=0)return;
  if(G.flags.campPenalty){G.flags.campPenalty=0;n.weeksLeft--;advanceWeeks(1);toast('Sponsor appearances cost you a week.');if(n.weeksLeft<=0){Save.write();return UI.render()}}
  const fin=(q,auto)=>{const r=campResult(kind,q,auto);Save.write();showCampResult(r)};
  if(['bag','speed','rope','mitts'].includes(kind))runMinigame(kind,q=>fin(q));
  else if(kind==='spar'){
    const f=G.world.f[n.offer.oppId];
    const partner={...oppCombat(f,{spar:true}),name:'Sparring partner',first:'Sparring',last:'Partner',look:Object.assign(randomLook(),{gloves:'#2f6fe2'})};
    partner.stats=statsFromRating(Math.min(f.rating,playerOvr()+2)-4,f.arch);partner.abilities=[];
    const pc=playerCombat();pc.stats=Object.assign({},B().stats);
    new Fight({p:pc,o:partner,rounds:1,roundLen:Math.min(60,Settings.roundLen),diff:G.diff,sparring:true,corner:1,onEnd:res=>{
      const q=clamp(.5+(res.dmgDealt-res.dmgTaken)/90+(res.winner==='p'&&['KO','TKO'].includes(res.method)?.25:0),0,1);
      const r=campResult('spar',q);if(chance(.04+res.dmgTaken/1500)){addInjury(pick(['cut','hand','ribs']),true);r.lines.push('Sparring injury!')}Save.write();UI.render();showCampResult(r)}}).mount();
  }else fin(1);
}
function showCampResult(r){
  UI.render();
  const lv=r.ups?`<p class="goldt"><b>LEVEL UP!</b> You're now level ${B().level}. Spend your points in Boxer and Skills.</p>`:'';
  modal(`<div class="kicker">${CAMP[r.kind].name}${r.q!=null&&r.xp?` · ${Math.round(r.q*100)}%`:''}</div>${r.xp?`<p class="rec">+${r.xp} XP</p>`:''}${r.lines.length?`<p>${r.lines.map(esc).join('<br>')}</p>`:''}${lv}<p class="muted" style="font-size:13.5px">${G.next?`${G.next.weeksLeft} week${G.next.weeksLeft!==1?'s':''} until the fight.`:''}</p><button class="btn primary" data-close="ok">Continue</button>`,{onClose:()=>{if(r.ups)Sfx.great();UI.render();checkEvent()}});
  if(r.ups)Sfx.great();
}

/* ---------- fight night ---------- */
SCR.fightnight=()=>{
  const n=G.next;if(!n){UI.cur='home';return SCR.home()}
  const o=n.offer,f=G.world.f[o.oppId],b=B(),pc=playerCombat(),oc=oppCombat(f),wi=weightInfo();
  const ch=o.chapter?CHAPTERS.find(c=>c.id===o.chapter):null;
  const ps=ovr(pc.stats),os=ovr(oc.stats);const pw=1/(1+Math.pow(10,(os-ps)/11));
  const odds=o.mods?.odds||(pw>.78?'Heavy favorite':pw>.5?'Favorite':pw>.25?'Underdog':'Big underdog');
  const row=(l,a,c,adv)=>`<div class="c ${adv==='a'?'adv':''}">${a}</div><div class="m">${l}</div><div class="c ${adv==='c'?'adv':''}">${c}</div>`;
  const cmp=(a,c,hi=true)=>a===c?'':(a>c)===hi?'a':'c';
  const L=f.legend?LEGEND_BY[f.legend]:null;
  return `<div class="scr"><div class="wrap" style="max-width:760px">
    <div class="topbar"><button class="btn sm back" data-go="home">◀</button><div class="t">Fight night</div>${o.venue?`<span class="pill">${esc(o.venue)}</span>`:''}</div>
    ${ch?`<div class="hero"><div class="in"><div class="kicker">Story chapter</div><h1 class="disp" style="font-size:28px">${esc(ch.title)}</h1><p>${esc(ch.intro)}</p><p class="dim" style="font-size:12.5px">Inspired by ${esc(ch.homage)}</p></div></div>`:''}
    <div class="card col"><div class="kicker" style="text-align:center">${esc(o.label)} · ${o.rounds} rounds${o.title&&!o.title.regional?' · '+o.title.belts.join(' / ')+' '+DIVS[b.div].name+' title':''}</div>
      <div class="vsrow"><div><img src="${portrait(b.look)}" alt=""><div class="nm">${esc(b.first)} ${esc(b.last)}</div></div><div class="vs">VS</div><div><img src="${portrait(f.look)}" alt=""><div class="nm">${esc(f.first)} ${esc(f.last)}</div></div></div>
      <div class="tape">${row('Record',`${b.record.w}-${b.record.l}${b.record.d?'-'+b.record.d:''}`,recStr(f))}${row('Age',ageOf(b.born),ageOf(f.born),cmp(ageOf(f.born),ageOf(b.born)))}
      ${row('Height',ftIn(b.height),ftIn(f.height),cmp(b.height,f.height))}${row('Reach',b.reach+'″',f.reach+'″',cmp(b.reach,f.reach))}
      ${row('Stance',b.stance,f.stance)}${row('Style',ARCH[b.arch].name,ARCH[f.arch].name)}${row('Overall',ps,os,cmp(ps,os))}${row('Weight',DIVS[b.div].lb+' lb',DIVS[b.div].lb+' lb')}</div>
      <p style="text-align:center" class="muted">Odds: <b>${esc(odds)}</b>${L?` · <span class="goldt">Homage to ${esc(L.homage)}</span>`:''}</p>
      ${wi&&wi.diff!==0?`<p style="text-align:center" class="${wi.tone==='bad'?'bad':'warnt'}">${esc(wi.label)}: ${esc(wi.note)}</p>`:''}
      ${b.injuries.length?`<p style="text-align:center" class="bad">Fighting hurt: ${b.injuries.map(i=>INJ[i.id].name).join(', ')}</p>`:''}
    </div>
    <button class="btn primary wide" data-act="walk" style="min-height:60px;font-size:20px">Walk to the ring</button>
    ${o.amateur||o.title||o.chapter?'':`<button class="btn ghost" data-act="simfight">Simulate fight (60% XP)</button>`}
  </div></div>`;
};
function startFight(sim){
  const n=G.next,o=n.offer,f=G.world.f[o.oppId],wi=weightInfo();
  o.foughtHurt=B().injuries.length>0;
  if(wi&&wi.miss&&chance(wi.miss)&&!o.amateur){o.missedWeight=true;news('You missed weight at the weigh-in. 20% of your purse goes to your opponent.','red');toast('Missed weight! 20% purse fine')}
  if(sim){afterFight(o,simFight(o));return}
  const pc=playerCombat();if(o.missedWeight)pc.stats.sta=Math.round(pc.stats.sta*.9);
  if(o.foughtHurt&&B().injuries.some(i=>i.id==='cut'))pc.cutProne=1;
  const oc=oppCombat(f);
  const pr=G.promoter?PROMOTERS[G.promoter.id]:null;
  const rob=(o.title&&!o.title.defense&&!o.title.regional?.25:0)+(G.flags.persona==='villain'?.2:0)+(pr&&pr.shady>.3&&chance(.3)?.25:0);
  Sfx.init();
  const fight=new Fight({p:pc,o:oc,rounds:o.rounds,roundLen:Settings.roundLen,diff:G.diff,amateur:!!o.amateur,mods:o.mods||{},scout:n.scout,corner:TRAINERS[G.trainer].corner,trainerName:TRAINERS[G.trainer].name,
    edge:Object.keys(n.edge||{}).length,cutman:G.staff.cutman,longCount:!!(o.title&&!o.title.regional&&!G.chapters.includes('longcount')),robbery:rob,tutorial:G.history.length===0,
    onEnd:res=>afterFight(o,res)});
  if(o.foughtHurt&&B().injuries.some(i=>i.id==='cut'))fight.p.cutProne=2;
  fight.mount();
}
function afterFight(o,res){
  if(res.longCount&&!G.chapters.includes('longcount')){G.chapters.push('longcount');news('Chapter: The Long Count. The referee gave you extra seconds on the canvas.','gold')}
  const sum=applyResult(o,res);
  UI.lastResult={o,res,sum};
  Save.write();
  UI.go('result');
}
SCR.result=()=>{
  const {o,res,sum}=UI.lastResult,f=G.world.f[o.oppId],b=B();
  const win=res.winner==='p',draw=res.winner==='draw';
  const big=win?'Victory':draw?'Draw':'Defeat';
  const mlong={KO:'Knockout',TKO:'Technical knockout',RTD:'Corner retirement',UD:'Unanimous decision',SD:'Split decision',MD:'Majority decision',DRAW:'Draw','SPLIT DRAW':'Split draw',DEC:'Decision'}[res.method]||res.method;
  const P=res.stats.p,O=res.stats.o;const pc=(a,b)=>b?Math.round(a/b*100)+'%':'–';
  const cards=res.cards&&res.cards.length&&['UD','SD','MD','DRAW','SPLIT DRAW'].includes(res.method)?`<div class="card"><h3>Official scorecards</h3><div class="tblw"><table class="t"><tr><th>Judge</th><th class="r">${esc(b.last)}</th><th class="r">${esc(f.last)}</th></tr>${res.cards.map((c,i)=>`<tr><td>${['Judge A. Torres','Judge M. Klein','Judge S. Okafor'][i]}</td><td class="r">${c[0]}</td><td class="r">${c[1]}</td></tr>`).join('')}</table></div>${res.robbery?'<p class="bad" style="margin-top:6px">The crowd boos the decision. Ringside is calling it a robbery.</p>':''}</div>`:'';
  const cbx=`<div class="card"><h3>Punch stats</h3><div class="tblw"><table class="t cbx"><tr><th></th><th>${esc(b.last)}</th><th>${esc(f.last)}</th></tr>
    <tr><td>Total punches</td><td>${P.landed}/${P.thrown} (${pc(P.landed,P.thrown)})</td><td>${O.landed}/${O.thrown} (${pc(O.landed,O.thrown)})</td></tr>
    <tr><td>Jabs</td><td>${P.jabL??'–'}/${P.jabT??'–'}</td><td>${O.jabL??'–'}/${O.jabT??'–'}</td></tr>
    <tr><td>Power punches</td><td>${P.powL??'–'}/${P.powT??'–'}</td><td>${O.powL??'–'}/${O.powT??'–'}</td></tr>
    <tr><td>Body shots landed</td><td>${P.bodyL??'–'}</td><td>${O.bodyL??'–'}</td></tr>
    <tr><td>Knockdowns</td><td>${res.kdFor}</td><td>${res.kdAgainst}</td></tr>
    ${P.perfect!=null?`<tr><td>Perfect dodges</td><td>${P.perfect}</td><td>–</td></tr>`:''}</table></div></div>`;
  const mny=sum.moneyLines?`<div class="card"><h3>Payday</h3><div class="tblw"><table class="t">${sum.moneyLines.map(l=>`<tr><td>${esc(l[0])}</td><td class="r num ${l[1]<0?'bad':''}">${money(l[1])}</td></tr>`).join('')}<tr><td><b>Net</b></td><td class="r num"><b>${money(sum.money)}</b></td></tr></table></div></div>`:'';
  const lines=sum.lines.map(l=>`<div class="pill gold" style="white-space:normal">${esc(l)}</div>`).join('');
  return `<div class="scr"><div class="wrap" style="max-width:760px">
    <div class="hero"><div class="in" style="align-items:center;text-align:center">
      <div class="kicker">${esc(o.label)}</div><div class="bigtxt" style="font-size:clamp(44px,13vw,80px);color:${win?'var(--gold)':draw?'var(--canvas)':'var(--bad)'}">${big.toUpperCase()}</div>
      <p class="ui" style="font-size:20px;font-weight:700">${mlong}${['KO','TKO','RTD'].includes(res.method)?` · Round ${res.round}${res.method!=='RTD'?', '+res.time:''}`:''}</p>
      <p class="muted">vs ${esc(fullName(f))}</p>${res.note?`<p class="muted">${esc(res.note)}</p>`:''}<div class="col" style="gap:6px;align-items:center">${lines}</div></div></div>
    <div class="grid3">
      <div class="card"><span class="lbl">Experience</span><p class="rec">+${sum.xp} XP</p>${sum.levelUps?`<p class="goldt">Level up! Now level ${b.level}</p>`:''}</div>
      ${sum.pts!=null?`<div class="card"><span class="lbl">Ranking</span><p class="rec num ${sum.pts>=0?'good':'bad'}">${sum.pts>=0?'+':''}${sum.pts} pts</p>${sum.rank?`<p class="muted">#${sum.rank[0]} → #${sum.rank[1]} ${DIVS[b.div].short}</p>`:''}</div>`:''}
      <div class="card"><span class="lbl">Health</span><p class="num">Recovery: ${sum.recovery} week${sum.recovery!==1?'s':''}</p>${sum.injuries.length?`<p class="bad">${sum.injuries.map(i=>INJ[i].name).join(', ')}</p>`:''}<p class="muted num" style="font-size:13px">Long-term damage ${Math.round(b.damage)}/100</p></div>
    </div>
    ${cards}${cbx}${mny}
    <button class="btn primary wide" data-act="resultdone">Continue</button></div></div>`;
};

/* ---------- boxer ---------- */
SCR.boxer=()=>{
  const b=B(),eff=effectiveStats(),slots=slotsCount();
  const stats=STATS.map(([k,n,d])=>`<div class="stat"><span class="n" title="${esc(d)}">${n}</span><div class="bar"><i style="width:${b.stats[k]}%"></i></div><span class="num">${b.stats[k]}</span>${b.statPts&&b.stats[k]<99?`<button class="btn gold plus" data-act="stat" data-k="${k}" aria-label="Add ${n}">+</button>`:'<span></span>'}</div>
    ${eff[k]!==b.stats[k]?`<div class="dim num" style="font-size:12px;margin:-4px 0 0 100px">Fight night: ${eff[k]}</div>`:''}`).join('');
  const abil=b.abilities.map(id=>{const A=AB[id],eq=b.equipped.includes(id);return `<button class="sk ${eq?'own':''}" data-act="equip" data-id="${id}"><b>${esc(A.name)} <span class="dim">· ${A.cost} bar${A.cost>1?'s':''}</span></b><small>${esc(A.desc)}</small><span class="tier">${eq?'Equipped: tap to remove':'Tap to equip'}</span></button>`}).join('');
  const wi=weightInfo();
  return shell('boxer','Boxer',`<div class="card col"><div class="row sp"><h3>Attributes</h3><span class="pill ${b.statPts?'gold':''}">${b.statPts} points</span></div>${stats}
    <p class="muted" style="font-size:13px">Overall ${playerOvr()}. You get 3 points per level, plus gains from training.</p></div>
    <div class="card col"><div class="row sp"><h3>Abilities</h3><span class="pill">${b.equipped.length}/${slots} equipped</span></div><p class="muted" style="font-size:13px">Equipped abilities get a button in the fight. A third slot opens at level 15.</p><div class="grid2" style="gap:8px">${abil}</div></div>
    <div class="grid2"><div class="card col"><h3>Body</h3><dl class="kv"><dt>Height</dt><dd>${ftIn(b.height)}</dd><dt>Reach</dt><dd>${b.reach}″</dd><dt>Build</dt><dd>${BUILDS[b.build].name}</dd><dt>Stance</dt><dd>${b.stance}</dd><dt>Natural</dt><dd>${DIVS[b.natural].name}</dd><dt>Fighting at</dt><dd>${DIVS[b.div].name}</dd></dl>
      ${wi?`<p class="${wi.tone==='good'?'good':wi.tone==='bad'?'bad':'warnt'}" style="font-size:13.5px">${wi.label}. ${wi.note}</p>`:''}</div>
    <div class="card col"><h3>Health</h3><div class="row sp"><span class="lbl">Long-term damage</span><span class="num">${Math.round(b.damage)}/100</span></div><div class="bar r"><i style="width:${b.damage}%"></i></div>
      <p class="muted" style="font-size:13px">Lowers your chin permanently. At 100, the commission won't license you.</p>
      ${b.injuries.length?b.injuries.map(i=>`<p class="warnt">${INJ[i.id].name}: ${i.wk} weeks. ${INJ[i.id].desc}</p>`).join(''):'<p class="good">No injuries.</p>'}</div></div>`);
};

/* ---------- skills ---------- */
function canBuySkill(s){const b=B();return !b.skills.includes(s.id)&&(!s.req||b.skills.includes(s.req))&&b.skillPts>=s.t}
function legendMoves(){
  const b=B(),out=[];
  b.legendsBeaten.forEach(l=>{const ab=LEGEND_BY[l].ab;out.push({ab,cost:3,src:`Beat ${LEGEND_BY[l].first} ${LEGEND_BY[l].last}`})});
  const t=TRAINERS[G.trainer];if(t.teach)out.push({ab:t.teach,cost:2,src:`Taught by ${t.name}`});
  return out.filter((x,i,a)=>a.findIndex(y=>y.ab===x.ab)===i);
}
SCR.skills=()=>{
  const b=B();
  const br=Object.keys(BRANCH).map(k=>`<div class="branch"><h4>${BRANCH[k]}</h4>${SKILLS.filter(s=>s.br===k).map(s=>{const own=b.skills.includes(s.id),can=canBuySkill(s),lock=s.req&&!b.skills.includes(s.req);
    return `<button class="sk ${own?'own':can?'can':lock?'lock':''}" data-act="skill" data-id="${s.id}"><span class="tier">Tier ${s.t} · ${s.t} pt${s.t>1?'s':''}${s.req?' · needs '+SKILLS.find(x=>x.id===s.req).name:''}</span><b>${esc(s.name)}</b><small>${esc(s.ability?AB[s.ability].desc:s.desc)}</small></button>`}).join('')}</div>`).join('');
  const lm=legendMoves();
  return shell('skills','Skills',`<div class="row sp"><h2 class="sec">Skill tree</h2><span class="pill ${b.skillPts?'gold':''}">${b.skillPts} skill points</span></div>
    <p class="muted" style="font-size:13.5px">One point per level, plus a bonus point every 5 levels. Tier N costs N points.</p>
    <div class="tree">${br}</div>
    <div class="card col"><h3>Legendary moves</h3><p class="muted" style="font-size:13.5px">Beat a legend to learn their signature move. Some trainers teach one. Story chapters unlock others automatically.</p>
      ${lm.length?`<div class="grid2" style="gap:8px">${lm.map(x=>{const own=b.abilities.includes(x.ab);return `<button class="sk ${own?'own':b.skillPts>=x.cost?'can':''}" data-act="learn" data-ab="${x.ab}" data-c="${x.cost}"><span class="tier">${esc(x.src)} · ${x.cost} pts</span><b>${esc(AB[x.ab].name)}</b><small>${esc(AB[x.ab].desc)}</small></button>`}).join('')}</div>`:'<p class="dim">None available yet.</p>'}</div>`);
};

/* ---------- division ---------- */
SCR.division=()=>{
  const b=B();
  const rows=DIVS.map((d,i)=>{const diff=i-b.natural,ok=Math.abs(diff)<=2,wi=ok?weightInfo(i):null;const ch=G.world.champs[i];const cnames=[...new Set(BODIES.map(x=>ch[x.k]).filter(Boolean))].map(id=>id==='P'?'You':shortName(G.world.f[id])).slice(0,2).join(', ');
    return `<div class="card row sp" style="${i===b.div?'border-color:var(--gold)':''}${ok?'':'opacity:.45'}"><div class="grow"><b class="ui" style="font-size:18px;text-transform:uppercase;letter-spacing:.04em">${d.name}</b> <span class="dim num">${d.lb} lb</span>
      <div class="muted" style="font-size:13px">${ok?`${wi.label}${i===b.natural?' (natural)':''}. ${wi.note}`:'Out of your range.'}${cnames?' Champions: '+esc(cnames)+'.':''}</div></div>
      ${i===b.div?'<span class="pill gold">Current</span>':ok&&G.phase==='pro'?`<button class="btn sm" data-act="movediv" data-d="${i}">Move</button>`:''}</div>`}).join('');
  return shell('division','Division',`<h2 class="sec">Weight class</h2><p class="muted" style="font-size:13.5px">You can only change divisions between fights. Moving carries 62% of your ranking points and vacates any belts. Champions in more than one division earn big legacy.</p>${G.next?'<div class="card warnt">You have a fight booked. Finish it first.</div>':''}<div class="col">${rows}</div>`);
};

/* ---------- team ---------- */
SCR.team=()=>{
  const b=B(),pr=G.promoter&&PROMOTERS[G.promoter.id];
  const trs=Object.keys(TRAINERS).map(k=>{const T=TRAINERS[k],req=T.req||{},ok=(!req.pts||b.pts>=req.pts)&&(!req.maxAge||ageOf(b.born)<=req.maxAge),cur=G.trainer===k;
    return `<div class="card col" style="${cur?'border-color:var(--gold)':''}"><div class="row sp"><b class="ui" style="font-size:17px;text-transform:uppercase">${T.name}</b><span class="pill">${Math.round(T.fee*100)}% of purses</span></div>
      <p style="font-size:13.5px">${T.desc}</p><p class="dim" style="font-size:12.5px">Training x${T.train} · Corner ${'★'.repeat(T.corner)}${T.homage?' · Homage to '+esc(T.homage):''}</p>
      ${cur?'<span class="pill gold">Your trainer</span>':ok?`<button class="btn sm" data-act="hire" data-k="${k}">Hire</button>`:`<span class="dim" style="font-size:12.5px">Needs ${req.pts?req.pts+' ranking pts':''}${req.maxAge?' and age '+req.maxAge+' or under':''}</span>`}</div>`}).join('');
  const gyms=Object.keys(GYMS).map(k=>{const g=GYMS[k],cur=G.gym===k;return `<div class="card col" style="${cur?'border-color:var(--gold)':''}"><div class="row sp"><b class="ui" style="font-size:17px;text-transform:uppercase">${g.name}</b><span class="pill">${g.cost?money(g.cost)+'/camp':'Free'}</span></div><p style="font-size:13.5px">${g.desc} Training x${g.train}.</p>${cur?'<span class="pill gold">Current gym</span>':`<button class="btn sm" data-act="gym" data-k="${k}">Train here</button>`}</div>`}).join('');
  return shell('team','Team',`<div class="card col"><h3>Promoter</h3>${pr?`<p><b>${pr.name}</b>, ${pr.co}. ${G.promoter.left} fight${G.promoter.left!==1?'s':''} left on your deal. Takes ${Math.round(pr.cut*100)}% of purses.</p><p class="muted" style="font-size:13.5px">${pr.desc}</p>`:`<p>You're a free agent. Without a promoter you keep every dollar, but purses are smaller.</p><button class="btn blue" data-act="promoters">Talk to promoters</button>`}</div>
    <h2 class="sec">Trainer</h2><div class="grid2">${trs}</div>
    <h2 class="sec">Gym</h2><div class="grid2">${gyms}</div>
    <h2 class="sec">Staff</h2><div class="grid2">
      <div class="card col"><div class="row sp"><b class="ui" style="font-size:17px;text-transform:uppercase">Cutman</b><span class="pill">$1,500/fight</span></div><p style="font-size:13.5px">Closes cuts between rounds far better.</p><button class="btn sm ${G.staff.cutman?'gold':''}" data-act="staff" data-k="cutman">${G.staff.cutman?'Hired':'Hire'}</button></div>
      <div class="card col"><div class="row sp"><b class="ui" style="font-size:17px;text-transform:uppercase">Nutritionist</b><span class="pill">$2,500/fight</span></div><p style="font-size:13.5px">Cuts weight-cut penalties by 40%.</p><button class="btn sm ${G.staff.nutri?'gold':''}" data-act="staff" data-k="nutri">${G.staff.nutri?'Hired':'Hire'}</button></div></div>`);
};
function promotersModal(){
  const offs=promoterOffers();
  const m=modal(`<h2 class="sec">Promoters</h2><p class="muted" style="font-size:13.5px">Pick who builds your career. Better amateur results and more hype mean bigger signing bonuses.</p>
    ${offs.map(o=>{const P=PROMOTERS[o.id];return `<div class="card col"><div class="row sp"><b class="ui" style="font-size:17px;text-transform:uppercase">${P.name}</b><span class="pill gold">${money(o.bonus)} bonus</span></div><div class="dim">${P.co} · ${o.fights}-fight deal · ${Math.round(P.cut*100)}% cut</div><p style="font-size:13.5px">${P.desc}</p><button class="btn sm" data-act="sign" data-k="${o.id}" data-b="${o.bonus}">Sign</button></div>`}).join('')}
    <button class="btn ghost" data-close="x">Stay independent for now</button>`,{wide:true});
  m.addEventListener('click',e=>{const b=e.target.closest('[data-act="sign"]');if(b){signPromoter(b.dataset.k,+b.dataset.b);Sfx.cash();m.remove();G.offers=[];genOffers();Save.write();UI.render()}});
}

/* ---------- rankings ---------- */
SCR.rankings=d=>{
  d=d??(G?B().div:0);
  const list=ranking(d).slice(0,25),ch=G.world.champs[d];
  const champs=BODIES.map(x=>{const id=ch[x.k];return `<div class="card flat" style="padding:10px"><span class="belt">${x.k}</span><div style="margin-top:6px;font-weight:600">${id==='P'?'You':id?esc(shortName(G.world.f[id])):'Vacant'}</div><div class="dim" style="font-size:11.5px">${x.name}</div></div>`}).join('');
  return shell('rankings','Rankings',`<div class="chips">${DIVS.map((x,i)=>`<button class="chip${i===d?' on':''}" data-go="rankings" data-arg="${i}">${x.short}</button>`).join('')}</div>
    <h2 class="sec">${DIVS[d].name}</h2><div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${champs}</div>
    <div class="tblw"><table class="t"><tr><th>#</th><th>Fighter</th><th class="r">Record</th><th class="r">OVR</th><th class="r">Pts</th></tr>
    ${list.map((e,i)=>{if(e.id==='P'){const b=B();return `<tr class="me"><td>${i+1}</td><td>${esc(b.first)} ${esc(b.last)} (you)${beltsOf('P',d).map(k=>` <span class="belt">${k}</span>`).join('')}</td><td class="r">${b.record.w}-${b.record.l}</td><td class="r">${playerOvr()}</td><td class="r">${b.pts}</td></tr>`}
      const f=e.f;return `<tr><td>${i+1}</td><td>${esc(shortName(f))}${f.legend?' <span class="pill gold">Legend</span>':''}${f.rival?' <span class="pill red">Rival</span>':''}${beltsOf(f.id,d).map(k=>` <span class="belt">${k}</span>`).join('')}</td><td class="r">${recStr(f)}</td><td class="r">${Math.round(f.rating)}</td><td class="r">${f.pts}</td></tr>`}).join('')}</table></div>`);
};

/* ---------- record ---------- */
SCR.record=()=>{
  const b=B(),h=[...G.history].reverse();
  const ch=CHAPTER_INFO.map(c=>{const done=G.chapters.includes(c.id);return `<div class="card flat" style="padding:10px;${done?'border-color:var(--gold)':''}"><b class="ui" style="text-transform:uppercase;letter-spacing:.04em">${done?esc(c.title):'??? Locked chapter'}</b><div class="dim" style="font-size:12.5px">${done?esc(c.homage):'Keep fighting to discover it.'}</div></div>`}).join('');
  return shell('record','Record',`<div class="grid3"><div class="card"><span class="lbl">Pro record</span><p class="rec num">${b.record.w}-${b.record.l}-${b.record.d}</p><p class="muted">${b.record.ko} KOs · ${b.record.w?Math.round(b.record.ko/b.record.w*100):0}% KO rate</p></div>
    <div class="card"><span class="lbl">Amateur</span><p class="rec num">${b.am.w}-${b.am.l}</p><p class="muted">${G.flags.am_gold_0?'Golden Gloves gold ':''}${G.flags.am_gold_1?'· National gold':''}</p></div>
    <div class="card"><span class="lbl">Titles</span><p class="rec num">${b.titleWins} won · ${b.defenses} defenses</p><p class="muted">${b.titleDivs.map(d=>DIVS[d].short).join(', ')||'None yet'}</p></div></div>
    <div class="card"><h3>Fight history</h3><div class="tblw"><table class="t"><tr><th>Date</th><th>Res</th><th>Opponent</th><th>Method</th><th>Fight</th></tr>
    ${h.map(x=>`<tr><td class="num">${dateStr(x.w)}</td><td class="${x.res==='W'?'good':x.res==='L'?'bad':''}"><b>${x.res}</b></td><td>${esc(x.opp)} <span class="dim">(${esc(x.oppRec)})</span></td><td>${x.method}${['KO','TKO','RTD'].includes(x.method)?' R'+x.round:''}</td><td>${esc(x.label||'')}${x.title?' <span class="belt">'+esc(x.title)+'</span>':''}${x.pro?'':' <span class="pill">Am</span>'}</td></tr>`).join('')||'<tr><td colspan="5" class="dim">No fights yet.</td></tr>'}</table></div></div>
    <div class="card col"><h3>Story chapters</h3><p class="muted" style="font-size:13.5px">${G.chapters.length} of ${CHAPTER_INFO.length} discovered. Each is modeled on a famous moment in boxing history.</p><div class="grid3" style="gap:8px">${ch}</div></div>`);
};
SCR.news=()=>shell('news','News',`<h2 class="sec">The boxing wire</h2><div class="card">${G.newsList.map(n=>`<div style="padding:8px 0;border-bottom:1px solid #262c4a;font-size:14.5px" class="${n.tone==='gold'?'goldt':''}"><span class="dim num" style="font-size:12px">${dateStr(n.w)}</span> ${esc(n.t)}</div>`).join('')}</div>`);

/* ---------- legacy ---------- */
SCR.legacy=()=>{
  const L=legacy(),b=B();
  return shell('legacy','Legacy',`<div class="hero"><div class="in" style="text-align:center;align-items:center"><div class="kicker">Hall of Fame standing</div><div class="bigtxt" style="font-size:clamp(34px,9vw,56px)">${esc(L.tier)}</div><p class="rec num">${L.score} legacy points</p>${L.next?`<p class="muted">${L.next[0]-L.score} more to reach ${esc(L.next[1])}</p>`:''}</div></div>
    <div class="card"><div class="tblw"><table class="t">${L.parts.filter(p=>p[1]).map(p=>`<tr><td>${esc(p[0])}</td><td class="r num ${p[1]<0?'bad':''}">${p[1]>0?'+':''}${p[1]}</td></tr>`).join('')}</table></div></div>
    ${G.phase!=='retired'?`<div class="card col"><h3>Retirement</h3><p class="muted" style="font-size:13.5px">Hang up the gloves whenever you choose. Retiring undefeated with 25+ wins earns a special place in history.</p><button class="btn primary" data-act="retire">Retire</button></div>`:`<button class="btn gold" data-act="totitle">Back to title screen</button>`}`);
};
SCR.settings=()=>shell('settings','Settings',`<h2 class="sec">Settings</h2>${settingsHTML(true)}`);

/* ---------- retire ---------- */
function retireNow(reason){
  const b=B();b.retired=true;G.phase='retired';G.next=null;G.offers=[];
  const bl=playerBelts();bl.forEach(x=>G.world.champs[x.d][x.k]=null);for(let d=0;d<8;d++)assignChamps(d,false);
  if(b.record.l===0&&b.record.w>=25&&!G.chapters.includes('fortynine'))G.chapters.push('fortynine');
  const L=legacy();
  news(`${fullName(b)} retires at ${ageOf(b.born)} with a record of ${b.record.w}-${b.record.l}-${b.record.d} (${b.record.ko} KOs). ${L.tier}.`,'gold');
  Save.write();
  modal(`<div class="kicker">${esc(reason||'The final bell')}</div><div class="bigtxt" style="font-size:40px;text-align:center">${esc(L.tier.toUpperCase())}</div>
    <p style="text-align:center" class="rec num">${b.record.w}-${b.record.l}-${b.record.d} · ${b.record.ko} KO</p>
    <p style="text-align:center">${L.score>=300?'The voters in Canastota will remember your name. Inducted into the Hall of Fame.':L.score>=150?'A real champion. The old-timers will tell stories about you.':'You gave everything you had in the ring.'}</p>
    <button class="btn gold" data-close="ok">See your legacy</button>`,{onClose:()=>UI.go('legacy')});
}

/* ---------- events ---------- */
function checkEvent(force,id){
  if(!G||G.phase==='retired')return false;
  const b=B();
  if(G.flags.forceRetire){const r=G.flags.forceRetire;G.flags.forceRetire=null;retireNow(r);return true}
  if(b.damage>=100){retireNow('The commission refuses to renew your license.');return true}
  if(ageOf(b.born)>=45){retireNow('At 45, it\'s time.');return true}
  const e=maybeEvent(force,id);if(!e)return false;
  const m=modal(`<div class="kicker">${e.id==='hurricane'||e.id==='exile'?'Story chapter':'Life outside the ring'}</div><h2 class="sec">${esc(e.title)}</h2><p>${esc(e.text())}</p><div class="col" style="gap:8px">${e.choices.map((c,i)=>`<button class="btn ${i?'':'gold'}" data-ch="${i}">${esc(c.t)}</button>`).join('')}</div>`);
  m.addEventListener('click',ev=>{const b=ev.target.closest('[data-ch]');if(!b)return;const r=e.choices[+b.dataset.ch].fx();news(`${e.title}: ${r}`);Save.write();
    $('.box',m).innerHTML=`<h2 class="sec">${esc(e.title)}</h2><p>${esc(r)}</p><button class="btn primary" data-close="ok">Continue</button>`;
  });
  m.addEventListener('click',ev=>{if(ev.target.closest('[data-close]'))UI.render()});
  return true;
}

/* ---------- practice ---------- */
function practiceModal(){
  const m=modal(`<h2 class="sec">Practice spar</h2><p class="muted" style="font-size:13.5px">Three rounds against a sparring partner. Nothing counts.</p>
    <div class="field"><span class="lbl">Partner's style</span><div class="chips" id="pa">${Object.keys(ARCH).map((k,i)=>`<button class="chip${i===0?' on':''}" data-v="${k}">${ARCH[k].name}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Difficulty</span><div class="chips" id="pd">${Object.keys(DIFF).map((k,i)=>`<button class="chip${i===0?' on':''}" data-v="${k}">${DIFF[k].name}</button>`).join('')}</div></div>
    <button class="btn primary" id="pgo">Start</button><button class="btn ghost" data-close="x">Cancel</button>`);
  m.addEventListener('click',e=>{const c=e.target.closest('.chip');if(c){$$('.chip',c.parentNode).forEach(x=>x.classList.toggle('on',x===c))}});
  $('#pgo',m).onclick=()=>{
    const arch=$('#pa .on',m).dataset.v,diff=$('#pd .on',m).dataset.v;m.remove();
    const look={skin:2,hair:'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f'};
    const me={name:'You',first:'You',last:'You',stats:statsFromRating(55,'boxerpuncher'),look,stance:'orthodox',reach:71,abilities:['onetwo','secondwind'],mods:{}};
    me.stats=Object.fromEntries(STAT_KEYS.map(k=>[k,55]));
    const opp={name:'Sparring Partner',first:'Sparring',last:'Partner',stats:Object.fromEntries(STAT_KEYS.map(k=>[k,clamp(50+(ARCH[arch].base[k]-47),30,80)])),look:Object.assign(randomLook(),{gloves:'#2f6fe2'}),stance:'orthodox',reach:71,ai:deep(ARCH[arch].ai),abilities:[]};
    Sfx.init();
    new Fight({p:me,o:opp,rounds:3,roundLen:Settings.roundLen,diff,practice:true,corner:2,trainerName:'Pops Delgado',onEnd:res=>{
      modal(`<h2 class="sec">${res.winner==='p'?'Nice work':'Keep at it'}</h2><p>${res.method} · landed ${res.stats.p.landed}/${res.stats.p.thrown} · perfect dodges ${res.stats.p.perfect}</p><button class="btn primary" data-close="ok">Done</button>`,{onClose:()=>UI.render()});
    }}).mount();
  };
}

/* ---------- actions ---------- */
const ACT={
  logotap(){const n=(UI._lt=(UI._lt||0)+1);clearTimeout(UI._ltT);UI._ltT=setTimeout(()=>UI._lt=0,1500);if(n>=5){UI._lt=0;toggleDev()}},
  new(el){UI.cr=crDefault();UI.cr.slot=+el.dataset.n;UI.go('create')},
  load(el){const g=Save.read(+el.dataset.n);if(!g){toast('That save could not be loaded.');return}loadCareer(g);UI.go('home');setTimeout(()=>checkEvent(),300)},
  practice(){practiceModal()},
  cr(el){const c=UI.cr,k=el.dataset.k;let v=el.dataset.v;if(k==='age')v=+v;c[k]=v;UI.render()},
  crl(el){const k=el.dataset.k;let v=el.dataset.v;if(k==='skin'||k==='hc')v=+v;UI.cr.look[k]=v;UI.render()},
  crrandom(){const c=UI.cr;c.first=pick(FIRST);c.last=pick(LAST);c.nick=chance(.5)?pick(NICKS):'';c.home=pick(HOMES);UI.render()},
  crstep(el){
    const c=UI.cr,d=+el.dataset.d;
    if(c.step===0&&d>0){if(!c.first.trim()||!c.last.trim()){toast('Give your boxer a first and last name.');return}}
    if(c.step===4&&d>0){
      const o={slot:c.slot,first:c.first.trim(),last:c.last.trim(),nick:c.nick.trim(),home:c.home.trim()||'Philadelphia, PA',age:c.age,stance:c.stance,look:c.look,height:c.height,build:c.build,arms:c.arms,arch:c.arch,diff:c.diff};
      o.name=o.first+' '+o.last;newCareer(o);Save.write();Sfx.bell(2);UI.go('home');
      setTimeout(()=>modal(`<div class="kicker">${dateStr()}</div><h2 class="sec">Welcome to the gym</h2><p>Pops Delgado tapes your hands. "First the Golden Gloves. Three fights, three rounds each. Train hard in camp, and remember: watch the gloves, not the eyes."</p><p class="muted" style="font-size:13.5px">Tip: Practice spar from the title screen any time. Fight hints show in your first bout.</p><button class="btn primary" data-close="ok">Let's go</button>`),250);
      return;
    }
    c.step=clamp(c.step+d,0,4);UI.render();
  },
  nationals(){startAmateur(1);G.am.done=false;G.next=null;Save.write();UI.render()},
  turnpro(){turnPro();G.next=null;Save.write();UI.render();promotersModal()},
  promoters(){promotersModal()},
  accept(el){const o=G.offers[+el.dataset.i];if(!o)return;acceptOffer(o);Save.write();Sfx.good();UI.go('camp');setTimeout(()=>checkEvent(),200)},
  wait(){advanceWeeks(2);G.offers=[];genOffers();Save.write();UI.render();toast('Two weeks pass. New offers are in.');checkEvent()},
  restheal(){const w=Math.max(...B().injuries.map(i=>i.wk));advanceWeeks(w);G.offers=[];genOffers();Save.write();UI.render();toast(`${w} weeks of rest. You're healthy.`)},
  camp(el){doCamp(el.dataset.k)},
  quickcamp(el){ACT.autocamp(el)},
  autocamp(){
    const n=G.next;const lines=[];let xp=0,ups=0;
    while(n.weeksLeft>0){const todo=(n.keys||[]).filter(k=>!(n.edge&&n.edge[k])&&CAMP[k]&&k!=='spar');const k=n.fatigue>45?'rest':todo.length?todo[0]:pick(['bag','speed','rope','mitts','film']);const r=campResult(k,todo.length&&k===todo[0]?.65:.55,true);xp+=r.xp||0;ups+=r.ups||0;lines.push(...r.lines)}
    Save.write();UI.render();
    modal(`<h2 class="sec">Camp complete</h2><p class="rec">+${xp} XP</p><p style="font-size:13.5px">${lines.map(esc).join(' · ')||'Steady work.'}</p>${ups?`<p class="goldt">Level up! Now level ${B().level}.</p>`:''}<button class="btn primary" data-close="ok">Continue</button>`,{onClose:()=>UI.render()});
  },
  walk(){startFight(false)},
  simfight(){startFight(true)},
  resultdone(){
    const {o}=UI.lastResult;
    UI.lastResult=null;
    if(G.phase==='pro'){G.offers=[]}
    UI.go('home');
    if(!checkEvent()&&B().statPts>0)toast(`You have ${B().statPts} stat points to spend.`);
  },
  stat(el){const k=el.dataset.k,b=B();if(b.statPts<=0||b.stats[k]>=99)return;b.stats[k]++;b.statPts--;Sfx.click();Save.write(true);UI.render()},
  equip(el){const b=B(),id=el.dataset.id;if(b.equipped.includes(id)){if(b.equipped.length<=1){toast('Keep at least one ability equipped.');return}b.equipped=b.equipped.filter(x=>x!==id)}else{if(b.equipped.length>=slotsCount())b.equipped.shift();b.equipped.push(id)}Save.write(true);UI.render()},
  skill(el){const s=SKILLS.find(x=>x.id===el.dataset.id);if(!s||!canBuySkill(s)){if(s&&!B().skills.includes(s.id))toast(s.req&&!B().skills.includes(s.req)?'Unlock the skill above it first.':`Needs ${s.t} skill point${s.t>1?'s':''}.`);return}
    confirmBox(s.name,`Spend ${s.t} skill point${s.t>1?'s':''}?`,'Learn it',()=>{const b=B();b.skillPts-=s.t;b.skills.push(s.id);if(s.ability)unlockAbility(s.ability);Sfx.good();Save.write();UI.render()})},
  learn(el){const ab=el.dataset.ab,c=+el.dataset.c,b=B();if(b.abilities.includes(ab))return;if(b.skillPts<c){toast(`Needs ${c} skill points.`);return}
    confirmBox(AB[ab].name,`Spend ${c} skill points to learn this move?`,'Learn it',()=>{b.skillPts-=c;unlockAbility(ab);Sfx.great();Save.write();UI.render()})},
  movediv(el){const d=+el.dataset.d;if(G.next){toast('Finish your booked fight first.');return}
    const wi=weightInfo(d);confirmBox(`Move to ${DIVS[d].name}?`,`${wi.label}: ${wi.note} Your ranking points drop to ${Math.round(B().pts*.62)}${beltsOf('P',B().div).length?', and you vacate your belts':''}.`,'Move',()=>{moveDivision(d);genOffers();Save.write();UI.render()})},
  hire(el){const k=el.dataset.k;G.trainer=k;news(`You hire ${TRAINERS[k].name}.`);if(TRAINERS[k].teach)toast(`${TRAINERS[k].name} can teach ${AB[TRAINERS[k].teach].name}. See Skills.`);Save.write();UI.render()},
  gym(el){G.gym=el.dataset.k;Save.write();UI.render()},
  staff(el){const k=el.dataset.k;G.staff[k]=!G.staff[k];Save.write();UI.render()},
  toggle(el){const k=el.dataset.k;Settings[k]=!Settings[k];saveSettings();if(k==='sound'&&Settings.sound)Sfx.init();UI.render()},
  roundlen(el){Settings.roundLen=+el.dataset.s;saveSettings();UI.render()},
  btnsize(el){Settings.btnSize=+el.dataset.v;saveSettings();UI.render()},
  devgo(){UI.go('dev')},
  export(){
    const code=Save.exportCode();
    const m=modal(`<h2 class="sec">Export save</h2><p class="muted" style="font-size:13.5px">Copy this code and keep it somewhere safe. Paste it into Import on any device or copy of the game.</p><textarea id="exp" rows="6" readonly style="font-size:11px;font-family:monospace">${esc(code)}</textarea><div class="row"><button class="btn gold grow" id="cpy">Copy</button><button class="btn ghost" data-close="x">Close</button></div>`);
    $('#cpy',m).onclick=()=>{const t=$('#exp',m);navigator.clipboard?.writeText(code).then(()=>toast('Copied')).catch(()=>{t.select();toast('Selected. Copy it manually.')})||(t.select(),toast('Selected. Copy it manually.'))};
  },
  import(){
    const m=modal(`<h2 class="sec">Import save</h2><textarea id="imp" rows="6" placeholder="Paste your save code" style="font-size:11px;font-family:monospace"></textarea>
      <div class="field"><span class="lbl">Into slot</span><div class="chips" id="isl">${[1,2,3].map(n=>`<button class="chip${n===(G?.slot||1)?' on':''}" data-v="${n}">Slot ${n}${Save.peek(n)?' (overwrite)':''}</button>`).join('')}</div></div>
      <div class="row"><button class="btn gold grow" id="ido">Import</button><button class="btn ghost" data-close="x">Cancel</button></div>`);
    m.addEventListener('click',e=>{const c=e.target.closest('#isl .chip');if(c)$$('#isl .chip',m).forEach(x=>x.classList.toggle('on',x===c))});
    $('#ido',m).onclick=()=>{const slot=+$('#isl .on',m).dataset.v;const g=Save.importCode($('#imp',m).value.trim(),slot);if(!g){toast('That code isn\'t a valid save.');return}m.remove();loadCareer(g);Save.write();toast('Save imported');UI.go('home')};
  },
  quit(){Save.write();G=null;UI.go('title')},
  delslot(){confirmBox('Delete this career?','This permanently erases the save in this slot.','Delete',()=>{Save.remove(G.slot);G=null;UI.go('title')},true)},
  retire(){confirmBox('Retire?','Your career ends now and your legacy is final.','Retire',()=>retireNow())},
  totitle(){Save.write();G=null;UI.go('title')},
};
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g&&!g.closest('.fight')){const a=g.dataset.arg;UI.go(g.dataset.go,a!=null?+a:undefined);return}
  const a=e.target.closest('[data-act]');if(a&&!a.closest('.fight')&&!a.closest('.modal [data-act="sign"]')&&ACT[a.dataset.act]){if(a.hasAttribute('disabled'))return;ACT[a.dataset.act](a)}
});
