/* ================= real-time fight engine =================
   Simulation runs on a fixed 1/120 s step with its own seeded RNG; rendering interpolates poses. */
const PUNCH={
  jab:{name:'Jab',dmg:4.4,sta:2.2,wind:.12,act:.08,rec:.15,tell:.34,lead:true,kind:'straight',score:1},
  cross:{name:'Cross',dmg:9,sta:4.6,wind:.2,act:.09,rec:.27,tell:.46,lead:false,kind:'straight',score:2},
  hook:{name:'Hook',dmg:10.5,sta:5.4,wind:.23,act:.1,rec:.3,tell:.5,lead:true,kind:'hook',score:2},
  upper:{name:'Uppercut',dmg:11.5,sta:5.8,wind:.25,act:.1,rec:.34,tell:.54,lead:false,kind:'upper',score:2},
};
/* ringside commentary lines: {P} you, {O} the opponent, {T} the punch. p = priority (bigger moments override smaller ones) */
const CALLS={
  big:{p:1,l:['Big {T} from {P}!','{P} lands a thudding {T}.','That {T} snapped {O}\'s head back!','Oh, what a shot by {P}!','{P} connects with the {T}!']},
  body:{p:1,l:['{P} digs one downstairs.','To the body! {O} felt that one.','{P} going to the ribs.','A thudding shot to the midsection by {P}.']},
  counter:{p:2,l:['Beautiful counter by {P}!','{O} pays for the miss!','Slip and rip: {P} makes {O} pay.','Perfectly timed by {P}!']},
  perfect:{p:1,l:['{P} makes {O} miss by an inch.','Slick defense from {P}.','Nothing but air!','{O} can\'t find the target.']},
  ohit:{p:1,l:['{O} catches {P} clean!','Big {T} from {O}!','{P} has to be careful here.','{O} lands the {T}!']},
  hurt:{p:2,l:['{O} is hurt!','{O} is in trouble!','The legs are going on {O}!','{O} is wobbled!']},
  phurt:{p:2,l:['{P} is hurt!','{P} needs to hold on!','{P} is in trouble!']},
  kd:{p:3,l:['DOWN GOES {O}!','{O} is down!','What a punch! {O} hits the canvas!']},
  pkd:{p:3,l:['{P} is down!','{P} goes down hard!','{O} drops {P}!']},
  orise:{p:3,l:['{O} beats the count!','{O} is up, but are the legs there?']},
  prise:{p:3,l:['{P} is up! Can {P} survive the round?','{P} beats the count!']},
  foul:{p:3,l:['That was low! The referee steps in and warns {O}.','{O} goes low, and the referee has seen it.']},
  ded:{p:3,l:['The referee takes a point from {O}!','{O} has been warned. That\'s a point gone.']},
  dq:{p:3,l:['That\'s it! {O} is disqualified!']},
  clock:{p:1,l:['Ten seconds left in the round.','Ten seconds! Time for a big finish.']},
};
/* game plans: chosen on fight night, judged each round from your own numbers. On plan = +6% damage on the plan's punches next round */
const PLANS={
  body:{name:'Work the body',desc:'Break them down downstairs. On plan when a third of what you land goes to the body.',
    judge:(r)=>r.landed>=4&&r.body/r.landed>=.3,why:r=>`${r.body} of ${r.landed} landed to the body`,match:pu=>!!pu.body},
  outbox:{name:'Out-box them',desc:'Jab, move, win on the outside. On plan when jabs are almost half your punches and you land more than they do.',
    judge:(r,o)=>r.thrown>=6&&r.jabT/r.thrown>=.45&&r.landed>=o.landed,why:(r,o)=>`${Math.round(r.thrown?r.jabT/r.thrown*100:0)}% jabs, landed ${r.landed} to their ${o.landed}`,match:pu=>pu.type==='jab'},
  pressure:{name:'Pressure',desc:'Walk them down and outwork them. On plan when you throw a quarter more than they do.',
    judge:(r,o)=>r.thrown>=8&&r.thrown>=o.thrown*1.25,why:(r,o)=>`threw ${r.thrown} to their ${o.thrown}`,match:()=>true},
  counter:{name:'Counter-punch',desc:'Make them miss, make them pay. On plan with three counters landed in the round.',
    judge:r=>r.cnt>=3,why:r=>`${r.cnt} counters landed`,match:(pu,fl)=>!!(fl&&fl.counter)},
};
const TELL_COL={jab:'#ffe58f',cross:'#ffb347',hook:'#ff7a2a',upper:'#ff3434'};
const STEP=1/120;

function mkC(src,side){
  const sta0=side==='p'&&src.weight?Math.min(1,src.weight.sta):1;
  return {side,src,name:src.name,first:src.first,last:src.last,st:src.stats,look:src.look,south:src.stance==='southpaw',m:src.mods||{},ai:src.ai||{},
    abilities:(src.abilities||[]).filter(a=>AB[a]),reach:src.reach||70,
    hp:100,maxHp:100,sta:100*sta0,maxSta:100*sta0,meter:0,state:'idle',t:0,dur:0,pu:null,guard:'high',guardT:1,think:1.2,
    kd:0,kdTotal:0,cut:0,hurt:0,buffs:[],next:null,combo:0,comboT:0,seq:[],queue:null,qT:0,dodge:null,iframe:0,regenDelay:0,
    clinches:0,clinchCD:0,counterWin:0,sway:0,dmgTaken:0,unans:[],reactIn:0,reactTo:null,pendingCounter:false,recDur:.2,blockLevel:'high',
    dmg:{swellL:0,swellR:0,cheek:0},hits:0,cutProne:(src.cutProne||0)+(src.ai&&src.ai.weak==='cuts'?1.5:0),
    stats:{thrown:0,landed:0,jabT:0,jabL:0,powT:0,powL:0,bodyL:0,dmg:0,kd:0,perfect:0,abil:0},rs:{score:0,landed:0,thrown:0,pow:0,kd:0,kdd:0,ded:0}};
}
/* ---- pose helpers ---- */
function mixPose(a,b,t){
  if(t<=0)return a;if(t>=1)return b;
  const o={};
  for(const k in b){const va=a[k],vb=b[k];
    if(Array.isArray(vb))o[k]=vb.map((v,i)=>typeof v==='number'&&va&&typeof va[i]==='number'?lerp(va[i],v,t):v);
    else if(typeof vb==='number')o[k]=typeof va==='number'?lerp(va,vb,t):vb;
    else o[k]=t<.5?(va??vb):vb}
  return o;
}
const GUARDS={
  high:{lg:[52,-288,.15],rg:[-52,-288,.15]},peek:{lg:[34,-300,.28],rg:[-34,-300,.28]},
  low:{lg:[74,-198,.1],rg:[-74,-198,.1]},open:{lg:[98,-186,0],rg:[-98,-186,0]},
  blockHigh:{lg:[30,-306,.32],rg:[-30,-306,.32]},blockLow:{lg:[44,-232,.28],rg:[-44,-232,.28]},
};

class Fight{
  constructor(cfg){
    this.cfg=cfg;this.D=DIFF[cfg.diff||'champion'];this.mods=cfg.mods||{};
    this.seed=(cfg.seed??RNG.seed())>>>0;this.rng=new Rng(this.seed);this.jrng=new Rng(this.seed^0x9e3779b9);
    this.cheats=cfg.cheats||{};
    const prev=RNG.use(this.rng);
    this.p=mkC(cfg.p,'p');this.o=mkC(cfg.o,'o');this.p.foe=this.o;this.o.foe=this.p;this.o.sway=rand(0,6);
    this.round=1;this.clock=cfg.roundLen;this.phase='intro';this.phaseT=0;this.time=0;this.acc=0;this.stop=0;this.flashSil=0;
    this.fx=[];this.parts=[];this.texts=[];this.shake=0;this.flash=0;this.slow=0;this.paused=false;
    this.pr={jabT:0,body:0,cnt:0};this.planOn=false;this.planRounds=0;this.planNote='';
    this.cards=[[0,0],[0,0],[0,0]];this.roundCards=[];this.hitBy={};this.roundStats=[];this.rLand={};this.adjustNotes=[];
    const rob=Math.max(0,(cfg.robbery||0)-(cfg.press==='respect'?.15:0));
    this.judges=[0,1,2].map(()=>({agg:rand(-.35,.35),noise:.07+rob*.12,lean:rob?rand(0,rob*.18):0}));
    this.held={block:false,body:false};this.bodyT=0;this.count=null;this.res={seed:this.seed};this.cornerPick='breathe';
    this.scout=(cfg.scout||0)+(cfg.edge||0)*.4;this.gameplan=0;this.pressTell=cfg.press==='focus'?.06:0;this.edgeDmg=1+(cfg.edge||0)*.05;this.ended=false;this.pBlocks=0;
    this.cam={x:0,y:0,rot:0,zoom:1};
    this.oPose=null;this.oFrom=null;this.oBlend=1;this.oKey='';
    this.pG={L:{x:0,y:0,r:1},R:{x:0,y:0,r:1}};
    this.tell=null;this.tells=[];
    if(cfg.press==='trash'){this.o.ai.agg=Math.min(1,(this.o.ai.agg||.5)+.15);this.o.ai.counter=(this.o.ai.counter||.3)*.8;this.o.st.pow=Math.min(99,this.o.st.pow+3)}
    if(this.o.ai.intimidate&&!cfg.sparring&&cfg.press!=='respect'){this.p.sta-=15;this.introNote='The stare-down shook you. -15 stamina.'}
    RNG.use(prev);
    if(cfg.resume)this.restore(cfg.resume);
    Logs.start({seed:this.seed,p:this.p.name,o:this.o.name,oLegend:cfg.o.legend||null,rounds:cfg.rounds,roundLen:cfg.roundLen,diff:cfg.diff,label:cfg.label||'',sparring:!!cfg.sparring,practice:!!cfg.practice});
  }
  log(o){o.t=+this.time.toFixed(3);o.rd=this.round;Logs.ev(o)}
  /* ---------- mount / dom ---------- */
  mount(){
    const left=Settings.lefty;
    const sp=this.p.abilities.slice(0,3).map((id,i)=>`<button class="fb spc" data-a="sp${i}"><span>${esc(AB[id].name)}</span><span class="pips">${'<i></i>'.repeat(AB[id].cost)}</span></button>`).join('');
    const def=`<div class="cl def">
      <button class="fb dodge" data-a="slipL">◀ Slip</button><button class="fb dodge" data-a="duck">Duck</button><button class="fb dodge" data-a="slipR">Slip ▶</button>
      <button class="fb guard span2" data-a="block" data-hold="1">Block</button><button class="fb clinch" data-a="clinch">Clinch</button>
      <button class="fb body span3" data-a="body" data-hold="1">Body <small>hold or tap first</small></button></div>`;
    const off=`<div class="cl off">
      <button class="fb punch" data-a="jab">Jab</button><button class="fb punch" data-a="cross">Cross</button>
      <button class="fb punch" data-a="hook">Hook</button><button class="fb punch" data-a="upper">Upper</button>
      ${sp?`<div class="span2" style="display:grid;grid-template-columns:repeat(${Math.min(3,this.p.abilities.length)},1fr);gap:7px">${sp}</div>`:''}</div>`;
    const el=document.createElement('div');el.className='fight';el.style.setProperty('--bs',Settings.btnSize||1);
    el.innerHTML=`<div class="fhud">
      <div class="hb p"><div class="nm">${esc(this.p.last)}</div><div class="fbar"><i class="mx"></i><i class="v"></i></div><div class="fbar st"><i class="mx"></i><i class="v"></i></div><div class="lbl" style="font-size:10px;letter-spacing:.1em" id="fmeter"></div></div>
      <div class="clock"><div class="rd" id="frd"></div><div class="tm" id="ftm"></div><button class="pz" id="fpause" aria-label="Pause">II</button></div>
      <div class="hb o"><div class="nm">${esc(this.o.last)}</div><div class="fbar"><i class="mx"></i><i class="v"></i></div><div class="fbar st"><i class="mx"></i><i class="v"></i></div><div class="lbl" style="font-size:10px;letter-spacing:.1em" id="ometer"></div></div>
    </div>
    <div class="fstage"><canvas></canvas><div class="fov" id="fov"></div></div>
    <div class="fctl">${left?off+def:def+off}</div>`;
    document.body.appendChild(el);this.el=el;
    this.cv=$('canvas',el);
    this.stage=$('.fstage',el);this.ov=$('#fov',el);
    this.coachEl=document.createElement('div');this.coachEl.className='coachb';this.stage.appendChild(this.coachEl);this.coachRep={};
    this.r3d=null;if(R3D.ok()){try{this.r3d=new Render3D(this,this.stage)}catch(e){console.warn('3D renderer unavailable, using 2D',e);this.r3d=null}}
    // a desynchronized (low-latency) canvas is promoted to a hardware overlay on Android, which ignores alpha;
    // the 2D layer must stay a normal canvas when it sits on top of the 3D scene
    this.ctx=this.cv.getContext('2d',this.r3d?{alpha:true}:{alpha:false,desynchronized:!!Settings.lowlat});
    this.hud={pb:$$('.hb.p .fbar',el),ob:$$('.hb.o .fbar',el),rd:$('#frd',el),tm:$('#ftm',el),pm:$('#fmeter',el),om:$('#ometer',el)};
    this.spBtns=$$('.fb.spc',el);this.bodyBtn=$('.fb.body',el);
    this.resize();
    this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this.stage);
    this.bindInput();
    $('#fpause',el).addEventListener('click',()=>this.pause());
    this.onVis=()=>{if(document.hidden){this.releaseAll();if(!this.ended&&this.phase!=='between')this.pause()}else this.last=performance.now()};
    document.addEventListener('visibilitychange',this.onVis);
    this.onBlur=()=>this.releaseAll();window.addEventListener('blur',this.onBlur);
    Sfx.crowdStart();
    this.startRoundIntro();
    if(this.cfg.announce&&!this.resumed)this.announce();
    this.last=performance.now();this.lastDraw=0;
    this.raf=requestAnimationFrame(t=>this.loop(t));
    try{navigator.wakeLock?.request('screen').then(l=>this.wl=l).catch(()=>{})}catch(e){}
  }
  destroy(){
    // the finger that threw the last punch (or skipped the replay) lifts after the result screen appears; swallow that click
    UI.tapGuard=performance.now()+1000;
    cancelAnimationFrame(this.raf);this.ro?.disconnect();document.removeEventListener('visibilitychange',this.onVis);window.removeEventListener('blur',this.onBlur);
    window.removeEventListener('keydown',this.kd);window.removeEventListener('keyup',this.ku);
    Sfx.crowdStop();try{this.wl?.release()}catch(e){}
    this.r3d?.destroy();
    this.el.remove();
  }
  resize(){
    const r=this.stage.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(10,Math.round(r.width*dpr)),h=Math.max(10,Math.round(r.height*dpr));
    this.cv.width=w;this.cv.height=h;this.W=w;this.H=h;this.dpr=dpr;
    const sc=Math.min(w/335,h/430);this.sc=sc;this.ox=(w-400*sc)/2;this.oy=(h-430*sc)*.85;
    this.arena=buildArena(w,h,sc,this.ox,this.oy,{heat:this.mods.heat,seed:7,logo:this.cfg.logo,lite:!!this.r3d});
    this.r3d?.resize();
    if(this.allBtns&&!this.editing)this.applyLayout();
  }
  /* ---------- input ---------- */
  bindInput(){
    const btns=$$('.fb',this.el);
    const down=(b,e)=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}b.classList.add('on');b._held=true;this.input(b.dataset.a,true)};
    const up=(b)=>{if(!b._held)return;b._held=false;b.classList.remove('on');this.input(b.dataset.a,false)};
    for(const b of btns){
      b.addEventListener('pointerdown',e=>down(b,e));
      b.addEventListener('pointerup',()=>up(b));b.addEventListener('pointercancel',()=>up(b));b.addEventListener('lostpointercapture',()=>up(b));
      b.addEventListener('contextmenu',e=>e.preventDefault());
    }
    this.el.addEventListener('contextmenu',e=>e.preventDefault());
    const map={KeyJ:'jab',KeyK:'cross',KeyU:'hook',KeyI:'upper',KeyA:'slipL',KeyD:'slipR',KeyS:'duck',Space:'block',KeyE:'clinch',ShiftLeft:'body',ShiftRight:'body',Digit1:'sp0',Digit2:'sp1',Digit3:'sp2',ArrowLeft:'slipL',ArrowRight:'slipR',ArrowDown:'duck'};
    this.kd=e=>{if(e.code==='Escape'){this.paused?this.resume():this.pause();return}const a=map[e.code];if(!a)return;e.preventDefault();if(e.repeat)return;this.input(a,true)};
    this.ku=e=>{const a=map[e.code];if(a)this.input(a,false)};
    window.addEventListener('keydown',this.kd);window.addEventListener('keyup',this.ku);
    this.allBtns=btns;this.applyLayout();
  }
  releaseAll(){this.held.block=false;this.held.body=false;this.allBtns?.forEach(b=>{b._held=false;b.classList.remove('on')});if(this.p.state==='block')this.p.state='idle'}
  input(a,on){
    const p=this.p,o=this.o;
    if(on&&this.phase==='fight'&&!this.paused){
      const ev={ev:'in',a,ps:p.state,os:o.state};
      if(o.state==='wind'&&o.pu){ev.oT=+o.t.toFixed(3);ev.oDur=+o.dur.toFixed(3);ev.oType=o.pu.type;ev.oBody=o.pu.body;if(this.tell)this.tell.inputs.push({t:o.t,a})}
      this.log(ev);
    }
    if(a==='block'){this.held.block=on;if(on&&this.phase==='fight')this.tryBlock();else if(!on&&p.state==='block')p.state='idle';return}
    if(a==='body'){this.held.body=on;if(!on)this.bodyT=.45;return}
    if(!on)return;
    if(this.phase!=='fight'||this.paused)return;
    if(PUNCH[a]){const body=this.held.body||this.bodyT>0;this.bodyT=0;this.pressPunch(a,body)}
    else if(a==='slipL'||a==='slipR'||a==='duck')this.pressDodge(a);
    else if(a==='clinch')this.clinch(p);
    else if(a.startsWith('sp'))this.useAbility(p,+a[2]);
  }
  tryBlock(){const p=this.p;if(['idle','rec'].includes(p.state)||(p.state==='dodge'&&p.t>p.iframe)){p.state='block';p.t=0}}
  pressPunch(type,body){
    const p=this.p;
    if(p.seq.length)return;
    if(p.sta<PUNCH[type].sta*(1-(p.m.cost||0))){this.text('GASSED','#9fb3ff',200,330,.5,16);return}
    if(p.state==='idle'||(p.state==='block'&&p.t>=.12)||(p.state==='rec'&&p.t>p.dur*.5)||(p.state==='dodge'&&p.t>p.iframe*.8)){this.throwP(p,type,body,{});return}
    if(p.state==='block'){p.queue={type,body};p.qT=.2;return}
    if(['wind','act','rec','stagger','dodge'].includes(p.state)){p.queue={type,body};p.qT=.32}
  }
  pressDodge(kind){
    const p=this.p;
    if(p.state==='idle'||p.state==='block'||(p.state==='rec'&&p.t>p.dur*.35)||(p.state==='dodge'&&p.t>p.iframe)){
      if(p.sta<4){this.text('TIRED','#9fb3ff',200,330,.6,16);return}
      const foot=p.st.foot,dw=(p.m.dodgeWin||0);
      p.state='dodge';p.t=0;p.dodge=kind;p.iframe=((kind==='duck'?.34:.3)+foot*.0016)*(1+dw);p.dur=p.iframe+clamp(.24-foot*.0012,.1,.24);p.sta-=2.5;p.queue=null;
    }else{p.queue={dodge:kind};p.qT=.25}
  }
  /* ---------- helpers ---------- */
  bmul(c,k){let v=1;for(const b of c.buffs)if(b.mods[k]!=null)v*=b.mods[k];return v}
  bmax(c,k){let v=0;for(const b of c.buffs)if(b.mods[k]!=null)v=Math.max(v,b.mods[k]);return v}
  spdF(c){let f=1.22-c.st.spd*.0045;if(c.sta<20)f*=1.3;else if(c.sta<40)f*=1.12;if(c.hurt>0)f*=1.2;return f/this.bmul(c,'spd')}
  hand(c,type){const lead=PUNCH[type].lead;const L=c.south?!lead:lead;return L?'L':'R'}
  screenSide(c,type){const h=this.hand(c,type);return c.side==='p'?h:(h==='L'?'R':'L')}
  setState(c,s,d){c.state=s;c.t=0;c.dur=d}
  dodgeWorks(dodge,kind,side){
    if(kind==='straight')return true;
    if(kind==='upper')return dodge!=='duck';
    if(dodge==='duck')return true;
    const toward=dodge==='slipL'?'L':'R';
    return toward!==side;
  }
  covers(d,pu){
    if(d.side==='p')return d.state==='block';
    const lvl=pu.body?'low':'high';
    if(d.state==='block')return d.blockLevel===lvl;
    if(d.state==='idle'||d.state==='feint'){
      if(d.hurt>0&&chance(.55))return false;
      if(d.guard==='open')return false;
      if(lvl==='high')return d.guard==='high'||d.guard==='peek';
      return d.guard==='low';
    }
    return false;
  }
  /* ---------- actions ---------- */
  throwP(c,type,body,opts){
    const P=PUNCH[type];
    let w;
    if(c.side==='p'){w=P.wind*this.spdF(c);if(type==='hook')w/=this.bmul(c,'hookSpd');if(opts.fast)w*=.55}
    else{
      w=P.tell*this.D.tell*(1.3-c.st.spd*.006)*(1+(this.p.m.tell||0)+this.p.st.iq*.0025+this.scout*.12+this.gameplan+(this.pressTell||0));
      if(c.hurt>0)w*=1.2;if(opts.follow)w*=.72;if(opts.quick)w*=.62;if(opts.fast)w*=.6;if(type==='hook')w/=this.bmul(c,'hookSpd');
      if(this.cheats.tellMul)w*=this.cheats.tellMul;
      if(Settings.assist)w*=1+.25*Settings.assist;
    }
    if(opts.instant)w=.05;
    if(c.side==='p'){c.rep=(type===c.lastType&&!body===!c.lastBody)?Math.min(5,(c.rep||0)+1):0;c.lastType=type;c.lastBody=body}
    const cost=P.sta*(1-(c.m.cost||0))*(c.side==='o'?.9:1)*(1+(c.rep||0)*.3);
    c.sta=Math.max(0,c.sta-cost);
    c.pu={type,body,opts};c.state='wind';c.t=0;c.dur=w;c.flashed=false;
    c.stats.thrown++;c.rs.thrown++;if(type==='jab')c.stats.jabT++;else c.stats.powT++;if(c.side==='p'&&type==='jab')this.pr.jabT++;
    if(c.side==='p')this.aiReact(c.pu,w);
    else{
      this.tell={type,body,dur:w,start:this.time,inputs:[],quick:!!(opts.quick||opts.follow||opts.fast),res:null};
      this.log({ev:'tell',type,body,dur:+w.toFixed(3),quick:this.tell.quick});
      if(!opts.instant)Sfx.tell(type,w);
      if(this.coachEl&&!opts.instant){const sd=this.screenSide(c,type)==='L'?'left':'right',ot=sd==='left'?'RIGHT':'LEFT';
        const M={jab:'JAB coming: block it, or slip and fire back.',cross:'CROSS coming straight: DUCK or slip, then counter.',hook:`HOOK from the ${sd}: slip ${ot}, away from it.`,upper:'UPPERCUT: never duck it. Slip or block.'};
        if(body)this.coach('tell_body','BODY SHOT: block it or slip it. Ducking walks into it.',{slow:.7});else this.coach('tell_'+type,M[type],{slow:.7})}
    }
  }
  impact(a){
    const d=a.foe,pu=a.pu,P=PUNCH[pu.type];
    const r=this.resolve(a,d,pu);
    if(a.side==='o'&&this.tell){this.tell.res=r;this.tells.push(this.tell);if(this.tells.length>12)this.tells.shift();this.tell=null}
    if(a.side==='o'&&r==='hit'){const k=pu.body?'body':pu.type;this.hitBy[k]=(this.hitBy[k]||0)+1}
    if(this.coachEl&&a.side==='o'){
      if(r==='miss')this.coach('miss','They missed. PUNCH NOW while they recover!',{slow:.45});
      if(r==='hit'){const k=pu.body?'body':pu.type;
        if(this.hitBy[k]===3&&!this.coachRep[k]){this.coachRep[k]=1;const sd=this.screenSide(a,pu.type)==='L'?'RIGHT':'LEFT';
          const T={jab:'Their jab keeps finding you. Block it and answer with your own.',cross:'That cross keeps landing. Duck it, then come up with a hook.',hook:`Those hooks keep landing. Slip ${sd}, away from the hook.`,upper:'You keep eating uppercuts. Stop ducking against this guy: slip instead.',body:'They are working your body. Block low punches and step away.'};
          this.coach('again_'+k,'Corner: '+T[k],{repeat:true,ms:2800})}}}
    if(this.phase!=='fight'&&this.phase!=='down')return;
    if(a.state==='down')return;
    if(a.state!=='wind')return;
    a.state='act';a.t=0;a.dur=P.act;
    const base=a.side==='p'?P.rec*this.spdF(a):P.rec*(1.5-a.st.spd*.005);
    a.recDur=base*(r==='miss'?1.5:r==='block'?1.15:1)+(a.recBonus||0);a.recBonus=0;
    if(a.side==='o'&&a.ai.weak==='openAfterHook'&&pu.type==='hook'&&r!=='hit'){a.recDur*=1.7;a.guard='open';a.guardT=.8}
    if(a.side==='o'&&a.ai.weak==='flurry'&&!a.seq.length&&a.sigT!=null&&this.time-a.sigT<2.5)a.recDur*=1.5;
    if(r==='miss')a.sta=Math.max(0,a.sta-P.sta*.5);
    if(r==='block')a.sta=Math.max(0,a.sta-P.sta*.2);
    if(r==='miss'||r==='block')a.combo=0;
  }
  resolve(a,d,pu){
    const P=PUNCH[pu.type],o=pu.opts||{},side=this.screenSide(a,pu.type);
    const rec=(r,dm,fl)=>{this.log({ev:'res',who:a.side,type:pu.type,body:!!pu.body,r,dm:dm?+dm.toFixed(2):0,fl:fl||null,ds:d.state});return r};
    if(d.state==='down'||this.phase!=='fight')return rec('miss');
    if(d.state==='clinch')return rec('block');
    if(d.side==='p'&&this.cheats.god)return rec('block');
    let mult=1;const flags={};
    if(a.side==='p'&&a.sta<25&&!o.instant&&chance(.3+(25-a.sta)/70)){this.text('ARM-WEARY','#9fb3ff',200,300,.5,15);Sfx.whoosh();a.combo=0;return rec('miss',0,'tired')}
    if(d.state==='dodge'&&d.t<d.iframe&&!o.instant){
      if(this.dodgeWorks(d.dodge,P.kind,side)){this.onDodged(a,d,pu);return rec('miss',0,'dodge')}
      mult*=1.25;flags.into=true;
    }
    if(!o.instant&&this.bmax(d,'evade')&&chance(this.bmax(d,'evade'))){this.onDodged(a,d,pu,true);return rec('miss',0,'evade')}
    if(this.covers(d,pu)){
      const pierce=Math.max(o.pierce||0,this.bmax(a,'pierce'),pu.type==='jab'?this.bmax(a,'jabPierce'):0);
      if(!(pierce&&chance(pierce))){
        if(d.side==='p'&&this.bmax(d,'parry')&&P.kind==='straight'){
          this.setState(a,'stagger',.6);a.pu=null;a.seq=[];d.meter=Math.min(300,d.meter+18);d.counterWin=.9;
          this.text('PARRY','#8fd0ff',200,230,.8,22);Sfx.block();return rec('parry');
        }
        let ab=d.side==='p'?.62+d.st.def*.0025+(d.m.block||0):.7+d.st.def*.0022;
        ab=Math.max(ab,this.bmax(d,'blockAbsorb'));
        if(P.kind==='upper'&&!this.bmax(d,'blockAbsorb'))ab*=.55;
        if(pu.body&&d.side==='p'&&!this.bmax(d,'blockAbsorb'))ab*=.5;
        if(d.side==='p')this.pBlocks=(this.pBlocks||0)+1;
        ab=Math.min(.97,ab);
        const dm=this.dmg(a,d,pu,{blocked:true})*(1-ab);
        d.hp-=dm;d.dmgTaken+=dm;d.sta=Math.max(0,d.sta-P.sta*(d.side==='p'?1.1:.7)*(1-(d.m.blockSta||0)));
        const drain=this.bmax(d,'drainOnBlock');if(drain)a.sta=Math.max(0,a.sta-drain);
        d.meter=Math.min(300,d.meter+5);a.rs.score+=P.score*.3;
        Sfx.block();if(d.side==='p')buzz(8);
        const pos=this.hitPos(d,pu);this.spark(pos.x,pos.y,'#bcd2ff',5);
        if(d.side==='o'&&chance((d.ai.counter||.3)*.7*this.D.agg+.1+(a.rep||0)*.15)&&['idle','block'].includes(d.state))d.pendingCounter=true;
        if(d.hp<=0)d.hp=1;
        return rec('block',dm);
      }
      flags.pierce=true;
    }
    const armored=d.side==='o'&&(d.state==='wind'||d.state==='act')&&d.pu&&pu.type==='jab'&&d.pu.type!=='jab';
    if(armored)mult*=.5;
    else if(d.state==='wind'||d.state==='act')flags.counter=true;
    else if(d.state==='rec'||d.state==='stagger')flags.open=true;
    if(a.counterWin>0&&a.side==='p'){flags.counter=true}
    let dm=this.dmg(a,d,pu,flags)*mult;
    if(a.side==='p'&&this.cheats.onehit)dm*=60;
    this.applyHit(a,d,pu,dm,flags,side);
    return rec('hit',dm,flags.counter?'counter':flags.open?'open':flags.into?'into':flags.hay?'hay':null);
  }
  dmg(a,d,pu,flags){
    const P=PUNCH[pu.type],o=pu.opts||{};
    let dm=P.dmg*(.5+a.st.pow*.011)*(1+(a.m.dmg||0))*this.bmul(a,'dmg')*(a.side==='p'?this.edgeDmg:1);
    if(pu.type==='jab')dm*=this.bmul(a,'jabDmg');
    if(a.side==='p'&&a.rep)dm*=Math.max(.55,1-a.rep*.12);
    if(pu.type==='hook')dm*=this.bmul(a,'hookDmg');
    if(pu.body)dm*=(1+(a.m.bodyDmg||0))*this.bmul(a,'bodyDmg');
    if(a.side==='p'&&this.planOn&&PLANS[this.cfg.plan]?.match(pu,flags))dm*=1.06;
    dm*=a.sta<20?.6:a.sta<40?.82:1;
    if(o.mult)dm*=o.mult;
    if(flags.counter)dm*=1.45*(1+(a.m.counter||0));else if(flags.open)dm*=1.2;
    if(d.hurt>0)dm*=1+(a.m.killer||0);
    if(a.combo>=2)dm*=1+Math.min(a.combo,6)*.05*(1+(a.m.combo||0));
    if(a.next&&pu.type!=='jab'&&!flags.blocked){dm*=a.next.mult;flags.hay=true;a.next=null}
    if(a.side==='o')dm*=this.D.dmg;
    if(d.side==='o'&&d.ai.weak){const wk=d.ai.weak;
      if(wk==='body'&&pu.body)dm*=1.35;if(wk==='upper'&&pu.type==='upper')dm*=1.35;if(wk==='jab'&&pu.type==='jab')dm*=1.3;if(wk==='counter'&&flags.counter)dm*=1.3;
      if(wk==='flurry'&&(d.state==='rec'||d.state==='stagger')&&d.sigT!=null&&this.time-d.sigT<2.5)dm*=1.3}
    if(!pu.body){dm*=1.42-d.st.chin*.0085;dm*=1-(d.m.chinRes||0)}else dm*=1.15-d.st.sta*.003;
    if(pu.type==='jab')dm*=1+clamp((a.reach-d.reach)*.015,-.12,.12);
    dm*=this.bmul(d,'dmgTaken')*(this.mods.dmg||1)*(this.cfg.amateur?.85:1)*(this.cfg.sparring?.8:1);
    return Math.max(.15,dm*.21*rand(.9,1.1));
  }
  hitPos(d,pu){
    if(d.side==='o'){const P=this.oPose;const hx=P?P.head[0]+200:200,hy=P?P.head[1]+430:112,cx=P?P.chest[0]+200:200,cy=P?P.chest[1]+430+30:230;return pu.body?{x:cx,y:cy}:{x:hx,y:hy}}
    return pu.body?{x:200,y:330}:{x:200,y:280};
  }
  applyHit(a,d,pu,dm,flags,side){
    const P=PUNCH[pu.type],o=pu.opts||{};
    if(pu.body){d.hp-=dm*.5;const sd=dm*1.5*this.bmul(a,'staDmg')+(o.staDmg||0);d.sta=Math.max(0,d.sta-sd);d.maxSta=Math.max(45,d.maxSta-dm*.28)}
    else{d.hp-=dm;d.maxHp=Math.max(28,d.maxHp-dm*.15);
      if(d.side==='o'){const k=dm*.045;if(P.kind==='upper')d.dmg.cheek+=k*1.2;else if(side==='L')d.dmg.swellL+=k;else d.dmg.swellR+=k;d.dmg.cheek+=k*.4}}
    d.dmgTaken+=dm;d.hits++;
    if(a.side==='p'){if(pu.body)this.pr.body++;if(flags.counter)this.pr.cnt++;const k=pu.body?'body':pu.type;this.rLand[k]=(this.rLand[k]||0)+1;this.call(flags.counter&&dm>2?'counter':pu.body&&dm>2.5?'body':pu.type!=='jab'&&dm>=3?'big':'',{t:pu.type})}
    else if(pu.type!=='jab'&&dm>=3.6)this.call('ohit',{t:pu.type});
    a.stats.landed++;a.rs.landed++;if(pu.type==='jab')a.stats.jabL++;else{a.stats.powL++;a.rs.pow++}if(pu.body)a.stats.bodyL++;
    a.stats.dmg+=dm;a.rs.score+=P.score+dm*.38;
    a.combo++;a.comboT=1.1;d.combo=0;
    a.meter=Math.min(300,a.meter+dm*7+4);d.meter=Math.min(300,d.meter+dm*1.9);
    d.regenDelay=1.8;
    const pos=this.hitPos(d,pu);
    const big=dm>=3.8;
    this.spark(pos.x,pos.y,flags.counter?'#ffd34d':'#fff3d6',big?14:8,big?1.5:1);
    const dirX=d.side==='o'?(side==='L'?-1:1):(side==='L'?1:-1);
    this.sweat(pos.x,pos.y,dirX,big?10:5,d.side==='o');
    Sfx.hit(dm/3.2,pu.body);
    if(Settings.hitstop&&big)this.stop=Math.max(this.stop,flags.counter||flags.hay?.1:.065);
    if(d.side==='o'&&big)this.flashSil=.09;
    if(d.side==='p'){this.shake=Math.max(this.shake,dm*2.8);buzz(big?[30,20,40]:18);this.doFlash(big?.35:.12);this.pHit={t:.25,dir:dirX}}
    else{this.shake=Math.max(this.shake,dm*1);if(big)buzz(12);d.hitAnim={t:.22,dir:dirX,up:P.kind==='upper',body:!!pu.body}}
    if(flags.counter){this.text('COUNTER!','#ffd34d',pos.x,pos.y-30,.9,26);Sfx.roar(.12,1)}
    else if(flags.into)this.text(d.side==='p'?'SLIPPED INTO IT':'CAUGHT','#ff8a7a',pos.x,pos.y-30,.8,18);
    else if(flags.hay)this.text('HAYMAKER!','#ff7a2a',pos.x,pos.y-30,.9,26);
    if(a.combo>=3&&a.side==='p')this.text(`${a.combo} HIT COMBO`,'#f0be48',200,36,.7,18);
    const armor=d.side==='o'&&(d.state==='wind'||d.state==='act')&&d.pu&&(d.pu.opts.quick||(pu.type==='jab'&&d.pu.type!=='jab'))&&!o.stun&&!flags.hay;
    if(armor){if(d.pu.opts.quick)this.text('TRADE','#ffb347',pos.x,pos.y-55,.5,14)}
    else if(d.state==='wind'||d.state==='act'){d.pu=null;d.seq=[];this.setState(d,'stagger',.45)}
    else if(!['down','clinch'].includes(d.state)){
      if(d.side==='o'){if(pu.type!=='jab'||flags.counter||o.stun)this.setState(d,'stagger',(pu.type==='jab'?.12:.2)+(flags.counter?.15:0)+(o.stun||0))}
      else if(dm>4)this.setState(d,'stagger',.1+dm*.012);
    }
    if(o.stun&&d.side==='o')this.text('FROZEN','#8fd0ff',pos.x,pos.y-55,.8,18);
    if((this.bmax(a,'jabStagger')&&pu.type==='jab')||flags.hay)this.setState(d,'stagger',.6);
    if(d.side==='o'&&!o.stun&&!flags.hay){
      d.streak=(this.time-(d.lastHitT||-9)<1.1)?(d.streak||0)+1:1;d.lastHitT=this.time;
      const thr=2+(d.st.def<45?1:0)+(d.hurt>0?1:0)+(a.seq.length?6:0);
      if(d.streak>=thr){d.streak=0;this.setState(d,'block',rand(.6,.95));d.blockLevel=chance(.8)?(pu.body?'low':'high'):(pu.body?'high':'low');if(chance((d.ai.counter||.3)*this.D.agg+.15))d.pendingCounter=true;this.text('COVERS UP','#cfd8ff',200,60,.6,15)}
    }
    if(!pu.body&&(dm>=4.3||(d.hp<d.maxHp*.25&&dm>2))&&d.state!=='down'){
      if(d.hurt<=0){this.text(d.side==='o'?'ROCKED!':'YOU\'RE HURT','#ff5a4a',200,d.side==='o'?150:250,1,24);this.call(d.side==='o'?'hurt':'phurt')}
      d.hurt=Math.max(d.hurt,1.1+dm*.2);
    }
    if(!pu.body&&dm>2.6&&!this.cfg.amateur){
      if(d.cut>0)d.cut=Math.min(130,d.cut+dm*.9);
      else if(chance(.03*(1+(d.cutProne||0)))){d.cut=15;this.text('CUT!','#ff3b3b',pos.x,pos.y+20,1,22);this.log({ev:'cut',who:d.side})}
    }
    d.unans.push(this.time);d.unans=d.unans.filter(t=>this.time-t<3);
    if(d.hp<=0){if(this.bmax(d,'noKD')){d.hp=1}else{this.knockdown(d,a);return}}
    if(!pu.body&&(flags.counter||flags.hay)&&dm>4.9&&chance((.2-(d.st.chin-50)*.004)*(1+(a.m.flash||0)))){this.text('FLASH KNOCKDOWN','#ffd34d',200,90,1,20);this.knockdown(d,a);return}
    if(o.kdBelow&&d.hp<d.maxHp*o.kdBelow){this.knockdown(d,a);return}
    const stopN=this.cfg.amateur?4:6;
    if(d.kdTotal>=1&&d.hurt>0&&d.hp<d.maxHp*.15&&d.unans.length>=stopN&&chance(this.cfg.amateur?.5:.25)&&!this.cfg.sparring){
      this.text('REFEREE STOPS IT!','#fff',200,140,2,26);this.finish(a.side,'TKO');return;
    }
    if(this.mods.nomas&&d.side==='o'&&this.round>=5&&a.stats.landed>d.stats.landed*1.4)this.nomas=true;
  }
  onDodged(a,d,pu,evade){
    Sfx.whoosh();a.combo=0;
    if(d.side==='p'){
      const perfect=!evade&&d.state==='dodge'&&d.t<=.17*(1+(d.m.perfect||0));
      if(perfect)this.call('perfect');
      d.meter=Math.min(300,d.meter+(perfect?30:10));
      if(perfect){d.stats.perfect++;a.recBonus=.45*(1+(d.m.perfect||0));d.counterWin=1;this.text('PERFECT!','#7fe3ff',200,170,.8,24);this.slow=Math.max(this.slow,.18);buzz(10);this.log({ev:'perfect'})}
      else this.text('MISS','#cfd8ff',200,180,.6,16);
      const dc=this.bmax(d,'dodgeCounter');
      if(dc)d.autoCounter={mult:dc,type:PUNCH[pu.type].kind==='hook'?'upper':'hook'};
    }else{
      this.text('MISS','#cfd8ff',200,120,.6,16);
      if(chance((d.ai.counter||.3)*this.D.agg+(a.rep||0)*.15))d.pendingCounter=true;
    }
  }
  /* between rounds the opponent adapts to what happened: reads your favourite punch, protects the body, gambles when behind, covers up when hurt */
  oppAdjust(){
    const o=this.o,ai=o.ai,L=this.rLand,notes=[];if(this.cfg.sparring||this.cheats.freeze||this.cheats.dummy)return notes;
    const NM={jab:'jab',cross:'right hand',hook:'hook',upper:'uppercut'};ai.read=ai.read||{};
    const heads=Object.entries(L).filter(([k])=>k!=='body'),tot=heads.reduce((a,[,v])=>a+v,0)+(L.body||0);
    const top=heads.sort((a,b)=>b[1]-a[1])[0];
    if(top&&top[1]>=5&&top[1]/tot>=.5&&!ai.read[top[0]]&&o.st.iq>=45){ai.read[top[0]]=1;notes.push(`They've started reading your ${NM[top[0]]}. Mix it up.`);this.log({ev:'adjust',k:'read',t:top[0]})}
    if((L.body||0)>=4&&!ai.bodyAdj){ai.bodyAdj=1;ai.guard=['low','low','high'];notes.push('They are dropping their elbows to protect the body. The head is open now.');this.log({ev:'adjust',k:'body'})}
    const margin=this.cards.reduce((s,c)=>s+(c[1]-c[0]),0)/3;
    if(margin<=-2&&!ai.desperate){ai.desperate=1;ai.agg=Math.min(1,(ai.agg||.5)+.15);ai.combo=Math.min(1,(ai.combo||.4)+.1);notes.push('They know they are behind and will come out swinging. Expect openings to counter.');this.log({ev:'adjust',k:'desperate'})}
    if(o.hp<o.maxHp*.35&&!ai.survive){ai.survive=1;ai.block=Math.min(.95,(ai.block||.4)+.15);notes.push('They are hurt and will cover up. Go to the body to pry the guard open.');this.log({ev:'adjust',k:'survive'})}
    return notes;
  }
  aiReact(pu,wind){
    const o=this.o;
    if(this.cheats.freeze)return;
    if(!['idle','block','feint'].includes(o.state)||this.phase!=='fight')return;
    if(o.hurt>0&&chance(.6))return;
    if(pu.opts?.instant)return;
    const covered=this.covers(o,{body:pu.body,type:pu.type});
    if(covered&&!chance((o.ai.dodge||.3)*.45))return;
    let p=(.05+o.st.def*.005+o.st.iq*.003+(covered?0:.18)+(this.p.rep||0)*.12+(o.ai.read&&!pu.body&&o.ai.read[pu.type]?.16:0))*this.D.react*(1-(this.p.m.sneaky||0));
    if(o.sta<25)p*=.6;if(this.cfg.sparring)p*=.75;
    if(!chance(clamp(p,0,.85)))return;
    const rt=clamp(.2-o.st.spd*.0012,.07,.2)/this.D.react;
    if(rt>wind+.03)return;
    o.reactIn=rt;o.reactTo=pu;
  }
  doReact(){
    const o=this.o,pu=o.reactTo;o.reactTo=null;
    if(!['idle','block','feint'].includes(o.state)||!pu)return;
    const P=PUNCH[pu.type],side=this.screenSide(this.p,pu.type);
    const smart=.55+o.st.iq*.004;
    const dodgeP=(o.ai.dodge||.3)/((o.ai.dodge||.3)+(o.ai.block||.5));
    if(chance(dodgeP)){
      let kind;
      if(chance(smart)){kind=P.kind==='upper'?(side==='L'?'slipR':'slipL'):P.kind==='hook'?(chance(.5)?'duck':(side==='L'?'slipR':'slipL')):pick(['slipL','slipR','duck'])}
      else kind=pick(['slipL','slipR','duck']);
      o.state='dodge';o.t=0;o.dodge=kind;o.iframe=.32+o.st.foot*.001;o.dur=o.iframe+.2;o.sta-=2;
    }else{
      o.state='block';o.t=0;o.dur=.55;
      const right=pu.body?'low':'high';o.blockLevel=chance(smart+.1)?right:(right==='low'?'high':'low');
    }
  }
  aiAttack(opts={}){
    const o=this.o,ai=o.ai,cb=(ai.combo||.3)+this.D.combo;let n=1;
    // dirty fighters foul more when they are tired, hurt or losing
    if(ai.dirty&&this.p.state!=='down'&&chance(.025*ai.dirty*(1+(o.sta<40?1:0)+(o.hurt>0?1:0)+(this.cards[0][0]<this.cards[0][1]?.5:0))))return this.foul(o);
    if(chance(cb))n++;if(chance(cb*.6))n++;if(chance(cb*.3))n++;
    if(this.p.hurt>0)n++;
    if(ai.sig&&!opts.quick&&chance(ai.sigP||.4)){
      const seq=ai.sig.map((s,i)=>{const body=s[0]==='b'&&s!=='feint';return {type:s==='feint'?'feint':body?s.slice(1):s,body,opts:i?{follow:1}:opts}});
      const first=seq.shift();o.sigT=this.time;
      if(first.type==='feint'){this.feint(o);o.seq=seq;return}
      o.seq=seq;this.throwP(o,first.type,first.body,first.opts);return;
    }
    const w=Object.assign({},ai.w||{jab:3,cross:3,hook:3,upper:2}),turtle=(this.pBlocks||0)>2.5;
    if(turtle){w.upper=(w.upper||1)*3;w.jab=(w.jab||1)*.5}
    const seq=[];for(let i=0;i<n;i++)seq.push({type:wpick(w),body:chance((ai.body||.2)+(turtle?.35:0)),opts:i?{follow:1}:opts});
    const f=seq.shift();o.seq=seq;this.throwP(o,f.type,f.body,f.opts);
  }
  feint(o){const type=pick(['cross','hook','upper']);o.state='feint';o.t=0;o.dur=.28;o.pu={type,body:false,opts:{}}}
  /* a foul: the referee calls time and you get a breather. First a warning, then a point each time, a fifth is a disqualification */
  foul(o){
    const p=this.p,head=chance(.35);o.fouls=(o.fouls||0)+1;const n=o.fouls;
    p.hp=Math.max(1,p.hp-(head?4:2));p.sta=Math.min(p.maxSta,p.sta+14);p.hurt=0;p.pu=null;p.seq=[];p.state='idle';o.pu=null;o.seq=[];o.state='idle';
    this.stop=.8;this.shake=Math.max(this.shake,6);Sfx.hit(.5,true);buzz(40);
    if(head&&!p.cut&&chance(.4)){p.cut=15;this.text('CUT FROM A HEADBUTT','#ff3b3b',200,260,1.2,16)}
    this.log({ev:'foul',who:'o',kind:head?'head':'low',n});
    if(n>=5){this.text('DISQUALIFIED','#ff5a4a',200,140,3,26);this.call('dq');return this.finish('p','DQ','Disqualified for repeated fouls.')}
    if(n>1)o.rs.ded++;
    this.text(`${head?'HEADBUTT':'LOW BLOW'}! ${n===1?'REF WARNS '+(o.last||'THEM').toUpperCase():'POINT DEDUCTED'}`,'#ffd34d',200,90,1.8,16);this.call(n===1?'foul':'ded');
  }
  clinch(a){
    if(this.phase!=='fight')return;
    const d=a.foe;if(d.state==='down'||a.state==='clinch')return;
    if(a.side==='p'){
      if(!['idle','block','rec','stagger'].includes(a.state))return;
      if(a.clinchCD>0){this.text('NOT YET','#cfd8ff',200,330,.5,14);return}
      if(!chance(d.hurt>0||d.sta<35||a.hurt>0?.88:.6)){this.text('CLINCH FAILED','#cfd8ff',200,300,.6,16);this.setState(a,'stagger',.3);a.clinchCD=1.5;return}
    }
    const k=1+(a.m.clinch||0);
    this.setState(a,'clinch',1.4);this.setState(d,'clinch',1.4);a.pu=d.pu=null;a.seq=[];d.seq=[];
    a.sta=Math.min(a.maxSta,a.sta+12*k);a.hp=Math.min(a.maxHp,a.hp+3*k);d.sta=Math.min(d.maxSta,d.sta+5);
    a.clinches++;a.clinchCD=3;a.hurt=Math.max(0,a.hurt-.8);
    this.text('CLINCH','#cfd8ff',200,200,.9,20);this.log({ev:'clinch',who:a.side});
    if(a.clinches===5)this.text('REF WARNS '+a.last.toUpperCase()+' FOR HOLDING','#ffd34d',200,90,1.6,15);
    if(a.clinches>=7&&a.clinches%2===1){a.rs.ded++;this.text('POINT DEDUCTED','#ff5a4a',200,90,1.6,20)}
  }
  useAbility(c,i){
    const id=c.abilities[i],ab=AB[id];if(!ab)return;
    if(c.meter<ab.cost*100||this.phase!=='fight'||['down','clinch'].includes(c.state)){if(c.side==='p'){Sfx.bad();this.text('NEED '+ab.cost+' BAR'+(ab.cost>1?'S':''),'#cfd8ff',200,330,.6,14)}return}
    c.meter-=ab.cost*100;c.stats.abil++;this.log({ev:'ability',who:c.side,id});
    this.text(ab.name.toUpperCase(),'#f0be48',200,c.side==='p'?300:70,1.2,24);Sfx.great();if(c.side==='p')buzz(25);
    const force=()=>{c.state='idle';c.pu=null};
    if(ab.kind==='buff'){c.buffs=c.buffs.filter(b=>b.id!==id);c.buffs.push({id,mods:ab.mods,t:ab.dur,max:ab.dur})}
    else if(ab.kind==='next')c.next={mult:ab.mult,t:ab.window};
    else if(ab.kind==='heal'){c.sta=Math.min(c.maxSta,c.sta+ab.sta);c.hp=Math.min(c.maxHp,c.hp+ab.hp)}
    else if(ab.kind==='combo'){
      c.seq=ab.seq.map(s=>{const body=s[0]==='b';return {type:body?s.slice(1):s,body,opts:{mult:ab.mult,pierce:ab.pierce,fast:1}}});
      force();const f=c.seq.shift();this.throwP(c,f.type,f.body,f.opts);
    }else if(ab.kind==='strike'){force();this.throwP(c,ab.punch,!!ab.body,{mult:ab.mult,pierce:ab.pierce,stun:ab.stun,staDmg:ab.staDmg,kdBelow:ab.kdBelow,instant:ab.instant,fast:1})}
  }
  /* ---------- knockdowns ---------- */
  knockdown(d,a){
    this.call(d.side==='o'?'kd':'pkd');
    if(this.r3d&&!this.cfg.headless){const b=this.rbuf||[];let tt=0,i=b.length;while(i>0&&tt<1.5){i--;tt+=b[i].rdt}this.kdClip={frames:b.slice(i),impact:b.length-i,post:0,round:this.round,side:d.side}}
    d.state='down';d.t=0;d.pu=null;d.seq=[];d.hp=0;d.kd++;d.kdTotal++;d.hurt=0;d.buffs=[];d.landed=false;
    a.stats.kd++;a.rs.kd++;d.rs.kdd++;a.pu=null;a.seq=[];a.state='idle';a.queue=null;
    this.phase='down';this.count={d,n:0,t:-1.3,rise:99,need:0,prog:0,ready:false};
    this.log({ev:'kd',who:d.side,n:d.kdTotal});
    if(Settings.slowmo)this.slow=.8;this.doFlash(.6);this.shake=18;Sfx.roar(.35,2.5);Sfx.hit(2,false);buzz([60,40,120]);
    if(Settings.hitstop)this.stop=Math.max(this.stop,.14);
    this.text(d.side==='o'?'DOWN!':'YOU\'RE DOWN!','#fff',200,150,1.4,40);
    if(this.cfg.longCount&&d.side==='p'&&!this.longUsed){this.longUsed=true;this.count.t=-4.6;this.res.longCount=true;if(!this.cfg.headless)setTimeout(()=>this.text('THE LONG COUNT!','#ffd34d',200,80,3,22),900)}
    if((!this.cfg.amateur&&d.kd>=3)||(this.cfg.amateur&&d.kdTotal>=3))this.count.tko=true;
    if(d.side==='o'){
      let p=.28+d.st.chin*.0065+(d.maxHp/100)*.22-(d.kdTotal-1)*.2-(a.m.finisher||0);
      if(this.cfg.sparring)p+=.25;p=clamp(p,.04,.95);
      this.count.rise=chance(p)?randi(3,9):99;
    }else{
      this.count.need=Math.max(6,Math.round(10+(d.kdTotal-1)*7+(100-d.st.chin)*.13+(100-d.maxHp)*.12-(d.m.getup||0)*12));
      if(!this.cfg.headless)setTimeout(()=>{if(this.phase==='down'&&this.count?.d===d&&!this.count.tko)this.showGetUp()},700);
    }
  }
  showGetUp(){
    this.ov.className='fov act';
    this.ov.innerHTML=`<div class="bigtxt" id="cnt"></div><div class="gbar"><i id="gbar"></i></div><button class="getup" id="getup">GET UP!</button><div class="lbl" style="color:#fff">Tap as fast as you can</div>`;
    const b=$('#getup',this.ov);
    b.addEventListener('pointerdown',e=>{e.preventDefault();const c=this.count;if(!c)return;c.prog+=1;if(c.prog>=c.need)c.ready=true;buzz(6);b.style.transform=`scale(${.96+Math.random()*.06})`});
  }
  rise(d){
    d.state='idle';d.t=0;d.hp=Math.max(14,d.maxHp*.5-d.kdTotal*5);d.hurt=2.2;d.sta=Math.max(d.sta,30);d.unans=[];
    this.phase='fight';this.count=null;this.ov.className='fov';this.ov.innerHTML='';this.log({ev:'rise',who:d.side});
    this.text(d.side==='o'?`${(this.o.last||'').toUpperCase()} IS UP`:'YOU\'RE UP!','#fff',200,150,1.2,22);this.call(d.side==='o'?'orise':'prise');Sfx.roar(.2,1.5);
    const a=d.foe;a.state='idle';
  }
  /* ---------- rounds ---------- */
  startRoundIntro(){
    if(this.cfg.onCheckpoint)try{this.cfg.onCheckpoint(this.checkpoint())}catch(e){}
    this.phase='intro';this.phaseT=0;
    const r=this.round,last=r===this.cfg.rounds;
    this.ov.className='fov';
    const hint=(this.round===1&&Settings.hints&&(this.cfg.tutorial||this.cfg.practice))?`<div class="card" style="max-width:420px;text-align:left;font-size:14px;pointer-events:none"><b class="ui" style="text-transform:uppercase;letter-spacing:.06em">How to fight</b><br>Watch the <b style="color:var(--gold)">symbol over their glove</b> and listen for the wind-up. Dot or down-arrow: duck or slip. Curl: slip <b>away</b> from that side. Up-arrow uppercut: never duck it. Punch when they miss or wind up. Their guard blocks head shots when high, so go to the <b>body</b>.</div>`:'';
    this.ov.innerHTML=`<div class="bigtxt">${this.cfg.rounds===1?'SPARRING':last&&r>1?'FINAL ROUND':'ROUND '+r}</div>${this.introNote&&r===1?`<div class="pill red">${esc(this.introNote)}</div>`:''}${hint}`;
    Sfx.bell(1);
  }
  endRound(){
    Sfx.bell(1);this.scoreRound();
    if(this.nomas&&this.round>=5&&this.round<this.cfg.rounds){this.text('"NO MÁS!"','#ffd34d',200,140,3,36);return this.finish('p','RTD')}
    if(this.round>=this.cfg.rounds)return this.decision();
    if(this.p.cut>=100&&!this.cfg.amateur)return this.finish('o','TKO','The ringside doctor stops it because of your cut.');
    if(this.o.cut>=100&&!this.cfg.amateur)return this.finish('p','TKO','The doctor stops it because of their cut.');
    if(this.o.hp<this.o.maxHp*.3&&this.o.maxHp<45&&chance(.25)&&!this.cfg.sparring){this.text('THEIR CORNER STOPS IT','#ffd34d',200,140,3,24);return this.finish('p','RTD')}
    this.phase='between';this.showCorner();
  }
  scoreRound(){
    const P=this.p.rs,O=this.o.rs,rc=[];
    RNG.with(this.jrng,()=>{
      this.judges.forEach((j,i)=>{
        let sp=P.score*(1+j.agg*(P.pow/(P.landed+1)))+P.thrown*.04,so=O.score*(1+j.agg*(O.pow/(O.landed+1)))+O.thrown*.04;
        sp*=rand(1-j.noise,1+j.noise);so*=rand(1-j.noise,1+j.noise)*(1+j.lean);
        // judges punish a fighter who spends the round behind his gloves
        sp*=1-clamp(((P.blockT||0)/this.cfg.roundLen-.2)*1.5,0,.6);so*=1-clamp(((O.blockT||0)/this.cfg.roundLen-.2)*1.5,0,.6);
        let a=10,b=10;
        if(Math.abs(sp-so)>Math.max(sp,so)*.06+.5){if(sp>so)b=9;else a=9}
        if(P.kd>O.kd)b=Math.max(6,10-(P.kd-O.kd)-1),a=10;
        if(O.kd>P.kd)a=Math.max(6,10-(O.kd-P.kd)-1),b=10;
        a-=P.ded;b-=O.ded;
        this.cards[i][0]+=a;this.cards[i][1]+=b;rc.push([a,b]);
      });
    });
    this.roundCards.push(rc);this.roundStats.push({p:{l:P.landed,t:P.thrown,pw:P.pow,kd:P.kd,blk:(P.blockT||0)/this.cfg.roundLen},o:{l:O.landed,t:O.thrown,pw:O.pow,kd:O.kd,blk:(O.blockT||0)/this.cfg.roundLen},rc});
    this.log({ev:'round',cards:rc,p:{l:P.landed,t:P.thrown},o:{l:O.landed,t:O.thrown},php:+this.p.hp.toFixed(1),ohp:+this.o.hp.toFixed(1)});
    this.adjustNotes=this.round<this.cfg.rounds?this.oppAdjust():[];this.rLand={};
    {const PL=PLANS[this.cfg.plan];if(PL){const r={landed:P.landed,thrown:P.thrown,jabT:this.pr.jabT,body:this.pr.body,cnt:this.pr.cnt},oo={landed:O.landed,thrown:O.thrown};
      this.planOn=PL.judge(r,oo);if(this.planOn)this.planRounds++;this.planNote=`${PL.name}: ${this.planOn?'on plan':'off plan'} (${PL.why(r,oo)}).`}this.pr={jabT:0,body:0,cnt:0}}
    this.p.rs={score:0,landed:0,thrown:0,pow:0,kd:0,kdd:0,ded:0};this.o.rs={score:0,landed:0,thrown:0,pow:0,kd:0,kdd:0,ded:0};
    this.p.kd=0;this.o.kd=0;
  }
  decision(){
    let pw=0,ow=0;this.cards.forEach(c=>{if(c[0]>c[1])pw++;else if(c[1]>c[0])ow++});
    let winner='draw',m='DRAW';
    if(pw>ow){winner='p';m=pw===3?'UD':ow===1?'SD':'MD'}else if(ow>pw){winner='o';m=ow===3?'UD':pw===1?'SD':'MD'}
    else if(pw===ow&&pw>0)m='SPLIT DRAW';
    if(this.cfg.sparring||this.cfg.practice)m=winner==='draw'?'DRAW':'DEC';
    const ps=this.p.stats,os=this.o.stats;
    if(winner==='o'&&ps.landed>=os.landed*1.3&&ps.dmg>os.dmg)this.res.robbery=true;
    this.finish(winner,m);
  }
  finish(winner,method,note){
    if(this.ended)return;this.ended=true;this.phase='end';
    this.releaseAll();
    const elapsed=this.cfg.roundLen-this.clock;
    const tScaled=Math.round(elapsed/this.cfg.roundLen*180);
    if(PLANS[this.cfg.plan])this.res.plan={k:this.cfg.plan,on:this.planRounds,of:this.roundStats.length};
    const rsx=this.roundStats.map(r=>({p:{l:r.p.l,t:r.p.t},o:{l:r.o.l,t:r.o.t}}));if(rsx.length<this.round&&this.p.rs)rsx.push({p:{l:this.p.rs.landed||0,t:this.p.rs.thrown||0},o:{l:this.o.rs.landed||0,t:this.o.rs.thrown||0},partial:true});
    Object.assign(this.res,{winner,method,round:this.round,roundStats:rsx,time:['KO','TKO'].includes(method)?fmtTime(tScaled):'3:00',cards:this.cards,roundCards:this.roundCards,hitBy:Object.assign({},this.hitBy),
      stats:{p:this.p.stats,o:this.o.stats},dmgTaken:this.p.dmgTaken,dmgDealt:this.o.dmgTaken,kdFor:this.o.kdTotal,kdAgainst:this.p.kdTotal,cut:this.p.cut,note});
    this.log({ev:'end',winner,method,round:this.round});
    this.res.log=this.cfg.headless?(Logs.cur=null):Logs.end(this.res);
    Sfx.bell(3);Sfx.roar(.4,3);
    const big=method==='DQ'?(winner==='p'?'WIN BY DQ':'DISQUALIFIED'):winner==='p'?(method==='KO'?'KNOCKOUT!':method==='TKO'?'TKO!':method==='RTD'?'THEY QUIT!':'FINAL BELL'):winner==='o'?(method==='KO'?'KNOCKED OUT':method==='TKO'?'STOPPED':method==='RTD'?'CORNER STOPS IT':'FINAL BELL'):'FINAL BELL';
    this.ov.className='fov';this.ov.innerHTML=`<div class="bigtxt">${big}</div>${note?`<div class="pill">${esc(note)}</div>`:''}`;
    if(winner==='p'&&['KO','TKO'].includes(method)&&Settings.slowmo)this.slow=1.2;
    if(this.cfg.headless)return;
    const K=this.kdClip,clip=['KO','TKO'].includes(method)&&K&&K.round===this.round&&this.r3d&&Settings.replay!==false&&K.frames.length>20?K:null;
    const out=()=>{this.destroy();this.cfg.onEnd(this.res)};
    setTimeout(()=>{if(clip&&this.r3d)this.playReplay(clip,out);else out()},clip?1700:2600);
  }
  /* broadcast captions: rate-limited, a bigger moment overrides a smaller one; cosmetic only (Math.random, never the fight RNG) */
  call(kind,x={}){
    const L=CALLS[kind];if(!L||this.cfg.headless||Settings.commentary===false||!this.stage||this.replaying)return;
    const now=performance.now()/1000;if(now<(this.ccUntil||0)&&L.p<=(this.ccPri||0))return;if(now-(this.ccLast||-9)<1.8&&L.p<2)return;
    const P=this.p.last&&this.p.last!=='You'?this.p.last:null,O=this.o.last||'Your opponent';
    const t=L.l[Math.floor(Math.random()*L.l.length)].replace(/\{P\}/g,(m,i)=>P||(i?'the challenger':'The challenger')).replace(/\{O\}/g,O).replace(/\{T\}/g,x.t&&PUNCH[x.t]?PUNCH[x.t].name.toLowerCase():'shot');
    let el=this.ccEl;if(!el){el=this.ccEl=document.createElement('div');el.className='cc';el.setAttribute('aria-live','polite');this.stage.appendChild(el)}
    el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');this.ccLast=now;this.ccPri=L.p;this.ccUntil=now+2.2;
  }
  /* ---------- knockdown replay: the renderer's inputs are recorded each frame and played back in slow motion ---------- */
  recFrame(op,rdt){
    const o=this.o,p=this.p,nf=this.fxId!==this._fxSeen?this.fxLast:null;this._fxSeen=this.fxId;
    const F={rdt:rdt||1/60,P:JSON.parse(JSON.stringify(op)),glow:this.oGlow?Object.assign({},this.oGlow):null,
      o:{state:o.state,t:o.t,dur:o.dur,south:o.south,hurt:o.hurt,pu:o.pu?{type:o.pu.type}:null},p:{state:p.state,t:p.t,south:p.south,pu:p.pu?{type:p.pu.type}:null},
      pG:JSON.parse(JSON.stringify(this.pG)),cam:Object.assign({},this.cam),time:this.time,shake:this.shake,flashSil:this.flashSil,fx:nf};
    const b=this.rbuf=this.rbuf||[];b.push(F);if(b.length>200)b.shift();
    const K=this.kdClip;if(K&&K.post<1.1){K.frames.push(F);K.post+=F.rdt}
  }
  playReplay(clip,done){
    this.replaying={clip,i:0,acc:0,done,last:-1};this.paused=false;
    try{this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.W,this.H)}catch(e){}
    this.ov.className='fov rplov';this.ov.innerHTML=`<div class="rpltag">● REPLAY</div><div class="rplskip">Tap to skip</div>`;
    this.stage.classList.add('replay');
    this._rskip=e=>{e.stopPropagation();this.endReplay()};setTimeout(()=>this.stage?.addEventListener('pointerdown',this._rskip,{once:true}),250);
  }
  replayTick(rdt){
    const R=this.replaying,fr=R.clip.frames,r3=this.r3d;if(!r3){this.endReplay();return}
    const near=Math.abs(R.i-R.clip.impact)<14;R.acc+=rdt*(near?.22:.5);
    while(R.i<fr.length-1&&R.acc>=fr[R.i].rdt){R.acc-=fr[R.i].rdt;R.i++}
    if(R.i>=fr.length-1){R.hold=(R.hold||0)+rdt;if(R.hold>.5){this.endReplay();return}}
    const F=fr[Math.min(R.i,fr.length-1)];
    const proxy={o:F.o,p:F.p,time:F.time,hand:(c,t)=>this.hand(c,t),pG:F.pG,cam:Object.assign({},F.cam,{zoom:(F.cam.zoom||1)*1.12}),shake:F.shake*.6,flashSil:F.flashSil,fx:F.fx&&R.last!==R.i?[F.fx]:[],W:this.W,H:this.H};
    if(R.i>=R.clip.impact&&!R.boom){R.boom=1;Sfx.hit(1.6);Sfx.roar(.5,2.2);buzz([40,30,80])}
    R.last=R.i;r3.fxSeen=0;r3.f=proxy;try{r3.render(rdt,F.P,F.glow)}catch(e){r3.f=this;this.endReplay();return}r3.f=this;
  }
  endReplay(){const R=this.replaying;if(!R)return;this.replaying=null;this.stage?.removeEventListener('pointerdown',this._rskip);this.stage?.classList.remove('replay');R.done()}
  /* the round just scored: what each side landed, and (open scoring) each judge's card */
  roundBox(){const R=this.roundStats[this.roundStats.length-1];if(!R)return '';
    const why=[];if(R.p.blk>.2)why.push('Judges marked you down for covering up too long.');if(R.o.blk>.2)why.push('They spent the round behind their gloves, and the judges noticed.');
    if(R.p.kd||R.o.kd)why.push('A knockdown makes it a 10-8 round.');
    const op=Settings.openScoring!==false;const sc=R.rc.map(([a,b])=>`<span class="pill${a>b?' gold':a<b?' red':''}">${a}-${b}</span>`).join(' ');
    return `<div class="card flat" style="padding:8px 10px"><div class="tblw"><table class="t" style="font-size:13.5px"><tr><th>Round ${this.round}</th><th>You</th><th>${esc(this.o.last)}</th></tr>
      <tr><td>Landed</td><td class="num">${R.p.l}/${R.p.t}</td><td class="num">${R.o.l}/${R.o.t}</td></tr><tr><td>Power shots</td><td class="num">${R.p.pw}</td><td class="num">${R.o.pw}</td></tr>
      ${R.p.kd||R.o.kd?`<tr><td>Knockdowns</td><td class="num">${R.p.kd}</td><td class="num">${R.o.kd}</td></tr>`:''}</table></div>
      ${op?`<div class="row" style="gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap"><span class="lbl">Judges</span>${sc}</div>`:''}${why.length?`<div class="muted" style="font-size:13px;margin-top:4px">${esc(why.join(' '))}</div>`:''}</div>`}
  showCorner(){
    const p=this.p,o=this.o,cq=this.cfg.corner||1;
    const est=this.cards.reduce((s,c)=>s+(c[0]-c[1]),0)/3;
    const tips=[];
    if((o.guard==='high'||o.guard==='peek')&&!o.ai.bodyAdj)tips.push('Their guard is high. Dig to the body and the head will open up.');
    if(o.guard==='low')tips.push('They keep their hands low. Jab the head, then dodge the counter.');
    if((o.ai.counter||0)>.5)tips.push('They want you to lead so they can counter. Make them miss first, then punish.');
    if((o.ai.agg||0)>.7)tips.push('They come forward non-stop. Slip and counter. Let them walk into it.');
    if(o.sta<45)tips.push('They\'re breathing hard. Push the pace now.');
    if(p.sta<40)tips.push('You\'re gassed. Jab, clinch, survive, and pick your spots.');
    if(p.cut>40)tips.push('That cut is bad. Keep your guard tight or the doctor will stop it.');
    if(o.hurt>0||o.maxHp<60)tips.push('They\'re hurt! Go get them.');
    const cardLine=cq>=3?(Math.abs(est)<1?'"It\'s dead even on my card."':est>0?`"You're up about ${Math.round(est)} points on my card. Don't get careless."`:`"You're down about ${Math.round(-est)} on my card. You need this round."`):cq>=2?(est>=0?'"I think you\'re doing all right."':'"I think you\'re behind, kid."'):'"Keep your hands up!"';
    const opts=[['breathe','Breathe','Big stamina and health recovery.'],['ice','Ice the damage','Restore part of your max health.'],['plan','Game plan','Their tells last 15% longer next round.']];
    if(p.cut>0)opts.unshift(['cut','Work the cut',`Close it up (${Math.round(p.cut)}% severity).${this.cfg.cutman?' Your cutman is excellent.':''}`]);
    this.cornerPick=p.cut>45?'cut':'breathe';
    const el=document.createElement('div');el.className='corner';
    el.innerHTML=`<div class="box">
      <div class="row sp"><div class="kicker">Between rounds · ${this.round} of ${this.cfg.rounds} done</div><span class="pill">${esc(this.cfg.trainerName||'Your corner')}</span></div>
      ${this.roundBox()}
      ${this.adjustNotes&&this.adjustNotes.length?`<div class="card flat" style="padding:8px 10px;border-color:var(--gold)"><span class="lbl">They're adjusting</span><div style="font-size:14px;margin-top:3px">${this.adjustNotes.map(esc).join('<br>')}</div></div>`:''}
      ${this.planNote?`<div class="card flat" style="padding:8px 10px;border-color:${this.planOn?'var(--gold)':'var(--line)'}"><span class="lbl">Game plan</span><div style="font-size:14px;margin-top:3px">${this.planOn?'✔':'✘'} ${esc(this.planNote)} ${this.planOn?'Keep it up: +6% on those punches next round.':'"Get back to the plan!"'}</div></div>`:''}
      <div class="quote">${esc(cardLine)}<br>${esc(tips.slice(0,cq>=3?2:1).map(t=>'"'+t+'"').join(' '))}</div>
      <div class="grid2" style="gap:8px">${opts.map(o=>`<button class="copt${o[0]===this.cornerPick?' on':''}" data-c="${o[0]}"><b>${o[1]}</b><small>${o[2]}</small></button>`).join('')}</div>
      <div class="row"><button class="btn primary grow" id="nextRd">Round ${this.round+1}</button><button class="btn ghost sm" id="stool">${this.cfg.practice||this.cfg.sparring?'End session':'Retire on stool'}</button></div>
    </div>`;
    this.stage.appendChild(el);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){this.cornerPick=b.dataset.c;$$('.copt',el).forEach(x=>x.classList.toggle('on',x===b))}});
    $('#nextRd',el).addEventListener('click',()=>{el.remove();this.applyCorner();this.round++;this.clock=this.cfg.roundLen;this.startRoundIntro()});
    let armed=false;
    $('#stool',el).addEventListener('click',e=>{if(!armed){armed=true;e.target.textContent='Tap again to quit';return}el.remove();this.finish('o','RTD')});
  }
  applyCorner(){
    const p=this.p,o=this.o,cq=1+.08*((this.cfg.corner||1)-1),bt=1+(p.m.between||0),pick=this.cornerPick;
    let sta=45,hp=16,mx=0;
    if(pick==='breathe'){sta=65;hp=24}
    if(pick==='ice'){mx=8;hp=14}
    if(pick==='plan'){this.gameplan=.15}else this.gameplan=0;
    if(pick==='cut')p.cut*=this.cfg.cutman?.25:.45;else p.cut*=this.cfg.cutman?.8:.9;
    p.maxHp=Math.min(100,p.maxHp+mx*cq*bt);p.maxSta=Math.min(100*Math.min(1,this.cfg.p.weight?.sta||1),p.maxSta+5);
    p.hp=Math.min(p.maxHp,p.hp+hp*cq*bt);p.sta=Math.min(p.maxSta,p.sta+sta*cq*bt*(this.mods.heat||1));p.hurt=0;
    o.hp=Math.min(o.maxHp,o.hp+18+o.st.sta*.08);o.sta=Math.min(o.maxSta,o.sta+50*(this.mods.heat||1)*(o.ai.fadeLate&&this.round>=4?.7:1));o.cut*=.7;o.hurt=0;o.maxSta=Math.min(100,o.maxSta+4);
    for(const c of [p,o]){c.state='idle';c.pu=null;c.seq=[];c.buffs=[];c.next=null;c.combo=0;c.clinchCD=0;c.unans=[]}
    this.log({ev:'corner',pick});
  }
  pause(){
    if(this.paused||this.ended)return;this.paused=true;this.releaseAll();
    const el=document.createElement('div');el.className='corner';el.id='pzov';
    el.innerHTML=`<div class="box"><div class="bigtxt" style="font-size:44px;text-align:center">PAUSED</div>
      <button class="btn primary" id="pzr">Resume</button>
      <div class="row"><button class="btn grow" id="pzs">Sound: ${Settings.sound?'On':'Off'}</button><button class="btn grow" id="pzh">Vibration: ${Settings.haptics?'On':'Off'}</button></div>
      <button class="btn" id="pzl">Arrange buttons</button>
      ${Settings.dev?`<button class="btn gold" id="pzf">⚑ Flag this moment</button>`:''}
      <div class="card flat" style="font-size:14px"><b class="ui" style="text-transform:uppercase;letter-spacing:.06em">Controls</b><br>
      The symbol over their glove names the punch. Dot jab and down-arrow cross: slip or duck. Curl hook: slip <b>away</b> from that side, or duck. Up-arrow uppercut: slip, never duck.<br>
      Hold or tap <b>Body</b> right before a punch to go downstairs. Fill the meter by landing and dodging, then spend it on abilities.<br>
      Keyboard: J K U I punches, A S D dodge, Space block, Shift body, E clinch, 1-3 abilities.</div>
      <button class="btn ghost" id="pzq">${this.cfg.practice||this.cfg.sparring?'Leave session':'Quit fight (counts as a loss)'}</button></div>`;
    this.stage.appendChild(el);
    $('#pzr',el).onclick=()=>this.resume();
    $('#pzs',el).onclick=e=>{Settings.sound=!Settings.sound;saveSettings();e.target.textContent='Sound: '+(Settings.sound?'On':'Off');if(Settings.sound){Sfx.init();Sfx.crowdStart()}else Sfx.crowdStop()};
    $('#pzh',el).onclick=e=>{Settings.haptics=!Settings.haptics;saveSettings();e.target.textContent='Vibration: '+(Settings.haptics?'On':'Off')};
    const pf=$('#pzf',el);if(pf)pf.onclick=()=>flagMoment(this,()=>{});
    $('#pzl',el).onclick=()=>this.editLayout();
    let armed=false;$('#pzq',el).onclick=e=>{if(!armed){armed=true;e.target.textContent='Tap again to confirm';return}el.remove();this.paused=false;this.finish('o','RTD')};
  }
  /* custom button layouts: offsets and scale per button, saved per screen shape (cover / inner, portrait / landscape) */
  layoutKey(){const w=innerWidth,h=innerHeight;return (w<600?'cover':'inner')+(w>h?'-land':'')}
  applyLayout(){const L=((Settings.layouts||{})[this.layoutKey()])||{};for(const b of this.allBtns||[]){const v=L[b.dataset.a];b.style.transform=v?`translate(${v.x}px,${v.y}px) scale(${v.s||1})`:'';b.style.zIndex=v?7:''}}
  editLayout(o={}){
    this.editing=true;this.releaseAll();$('#pzov',this.el)?.remove();this.paused=true;if(this.ov){this.ov.className='fov';this.ov.innerHTML=''}
    const key=this.layoutKey();const L=JSON.parse(JSON.stringify(((Settings.layouts||{})[key])||{}));let sel=null;
    const set=b=>{const v=L[b.dataset.a];b.style.transform=v?`translate(${v.x}px,${v.y}px) scale(${v.s||1})`:'';b.style.zIndex=v?7:''};
    const bar=document.createElement('div');bar.className='lyb';
    bar.innerHTML=`<b class="ui" style="text-transform:uppercase;letter-spacing:.06em">Arrange buttons · ${key.startsWith('cover')?'cover screen':'inner screen'}${key.endsWith('land')?', landscape':''}</b><div class="muted" style="font-size:13px">Drag any button. Tap one, then make it bigger or smaller. Saved for this screen shape only.</div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-l="-">Smaller</button><button class="btn sm" data-l="+">Bigger</button><button class="btn sm ghost" data-l="reset">Reset all</button><button class="btn sm primary" data-l="done">Done</button></div>`;
    this.stage.appendChild(bar);this.el.classList.add('editing');
    const onDown=e=>{const b=e.target.closest('.fb');if(!b)return;e.preventDefault();e.stopPropagation();sel=b;this.allBtns.forEach(x=>x.classList.toggle('sel',x===b));
      const v=L[b.dataset.a]=L[b.dataset.a]||{x:0,y:0,s:1};const sx=e.clientX,sy=e.clientY,ox=v.x,oy=v.y;
      const mv=ev=>{v.x=Math.round(ox+ev.clientX-sx);v.y=Math.round(oy+ev.clientY-sy);set(b)};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};
      addEventListener('pointermove',mv);addEventListener('pointerup',up)};
    this.el.addEventListener('pointerdown',onDown,true);
    bar.onclick=e=>{const k=e.target.dataset&&e.target.dataset.l;if(!k)return;
      if(k==='+'||k==='-'){if(!sel){toast('Tap a button first');return}const v=L[sel.dataset.a]=L[sel.dataset.a]||{x:0,y:0,s:1};v.s=clamp(+((v.s||1)+(k==='+'?.1:-.1)).toFixed(2),.6,1.8);set(sel)}
      if(k==='reset'){for(const id in L)delete L[id];this.allBtns.forEach(set)}
      if(k==='done'){Settings.layouts=Settings.layouts||{};Settings.layouts[key]=L;saveSettings();this.el.removeEventListener('pointerdown',onDown,true);bar.remove();this.el.classList.remove('editing');
        this.allBtns.forEach(x=>x.classList.remove('sel'));this.editing=false;this.applyLayout();if(o.onDone)o.onDone();else{this.paused=false;this.pause()}}};
  }
  /* round-start checkpoint so an interrupted career fight can pick up where it left off */
  checkpoint(){const pk=c=>({hp:c.hp,maxHp:c.maxHp,sta:c.sta,maxSta:c.maxSta,cut:c.cut,meter:c.meter,kdTotal:c.kdTotal,kd:c.kd,dmg:deep(c.dmg),stats:deep(c.stats),hits:c.hits,clinches:c.clinches});
    return {planRounds:this.planRounds,planOn:this.planOn,planNote:this.planNote,seed:this.seed,round:this.round,rng:this.rng.s,jrng:this.jrng.s,cards:deep(this.cards),roundCards:deep(this.roundCards),roundStats:deep(this.roundStats),hitBy:deep(this.hitBy),p:pk(this.p),o:pk(this.o),oai:deep(this.o.ai),time:this.time}}
  restore(cp){this.planRounds=cp.planRounds||0;this.planOn=!!cp.planOn;this.planNote=cp.planNote||'';this.round=cp.round;this.rng.s=cp.rng;this.jrng.s=cp.jrng;this.cards=deep(cp.cards);this.roundCards=deep(cp.roundCards);this.roundStats=deep(cp.roundStats||[]);this.hitBy=deep(cp.hitBy||{});
    Object.assign(this.p,deep(cp.p));Object.assign(this.o,deep(cp.o));this.o.ai=deep(cp.oai);this.time=cp.time||0;this.introNote=cp.round>1?`Resumed at round ${cp.round}`:null;this.resumed=true}
  /* ring announcer: a short, skippable introduction before the opening bell */
  announce(){const A=this.cfg.announce;if(!A||!this.stage)return;this.paused=true;this.announcing=true;
    const el=document.createElement('div');el.className='annc';
    const imgs=A.imgs?`<div class="row" style="gap:10px;justify-content:center;align-items:flex-end"><div class="al" style="animation-delay:${1.15*2}s"><img id="wkO" alt="" style="width:min(38vw,170px);aspect-ratio:1;border-radius:10px;display:block;background:#0006"><div class="lbl" style="color:#9fb3ff">Blue corner</div></div><div class="al" style="animation-delay:${1.15*3}s"><img id="wkP" alt="" style="width:min(38vw,170px);aspect-ratio:1;border-radius:10px;display:block;background:#0006"><div class="lbl" style="color:#ff8a7a">Red corner</div></div></div>`:'';
    el.innerHTML=A.lines.map((l,i)=>`<div class="al${i===0?' k':''}" style="animation-delay:${i*1.15}s">${esc(l)}</div>`).join('')+imgs+'<div class="skip">Tap to skip</div>';
    this.stage.appendChild(el);Sfx.roar(.18,1.6);if(this.ov)this.ov.style.visibility='hidden';
    if(A.imgs)setTimeout(()=>{if(!this.announcing)return;const r=A.imgs();const o=el.querySelector('#wkO'),p=el.querySelector('#wkP');if(o&&r.oImg)o.src=r.oImg;if(p&&r.pImg)p.src=r.pImg},80);
    const done=()=>{if(!this.announcing)return;this.announcing=false;clearTimeout(this.annTO);el.remove();if(this.ov)this.ov.style.visibility='';this.paused=false;this.last=performance.now();Sfx.roar(.3,1.2)};
    el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();done()});this.annTO=setTimeout(done,A.lines.length*1150+1500)}
  resume(){$('#pzov',this.el)?.remove();this.paused=false;this.last=performance.now()}
  snapshot(){
    const c=x=>({hp:+x.hp.toFixed(1),maxHp:+x.maxHp.toFixed(1),sta:+x.sta.toFixed(1),state:x.state,hurt:+x.hurt.toFixed(2),kd:x.kdTotal,cut:+x.cut.toFixed(0),meter:+x.meter.toFixed(0),stats:x.stats});
    return {seed:this.seed,round:this.round,clock:+this.clock.toFixed(2),time:+this.time.toFixed(2),p:c(this.p),o:c(this.o),cards:this.cards,tells:this.tells.slice(-6),events:(Logs.cur?.ev||[]).slice(-40),cfg:{o:this.o.name,legend:this.cfg.o.legend,rounds:this.cfg.rounds,diff:this.cfg.diff,label:this.cfg.label}};
  }
  /* ---------- headless run (tests, sims): no canvas, no timers; bot(fight) is called 60x per sim second ---------- */
  headless(bot,opts={}){
    const el=document.createElement('div');el.className='fight';el.style.display='none';el.innerHTML='<div class="fov" id="fov"></div>';document.body.appendChild(el);
    this.el=el;this.ov=$('#fov',el);this.stage=el;this.spBtns=[];this.hud=null;this.updHud=()=>{};this.draw=()=>{};
    this.startRoundIntro();
    const prev=RNG.use(this.rng);let steps=0,acc=0,tap=0;const max=opts.maxSteps||400000;
    while(!this.ended&&steps<max){
      if(this.phase==='between'){const c=$('.corner',el);if(c)c.remove();this.cornerPick=this.p.cut>45?'cut':'breathe';this.applyCorner();this.round++;this.clock=this.cfg.roundLen;this.startRoundIntro()}
      if(this.phase==='down'&&this.count&&this.count.d===this.p){tap+=STEP;if(tap>=1/(opts.tapsPerSec||8)){tap=0;this.count.prog+=1;if(this.count.prog>=this.count.need)this.count.ready=true}}
      this.update(STEP,STEP);acc+=STEP;
      if(acc>=1/60){acc-=1/60;if(bot)bot(this);if(this.texts.length>200)this.texts.length=0;if(this.fx.length>100)this.fx.length=0;if(this.parts.length>200)this.parts.length=0}
      if(this.phase==='intro'&&this.phaseT<=1.7){this.phaseT=1.8}
      steps++;
    }
    RNG.use(prev);
    if(!this.ended){this.ended=true;this.phase='end';Object.assign(this.res,{winner:'draw',method:'TIMEOUT',round:this.round,cards:this.cards,stats:{p:this.p.stats,o:this.o.stats},dmgTaken:this.p.dmgTaken,dmgDealt:this.o.dmgTaken,kdFor:this.o.kdTotal,kdAgainst:this.p.kdTotal,cut:this.p.cut});Logs.cur=null}
    el.remove();this.res.steps=steps;return this.res;
  }
  /* ---------- loop ---------- */
  loop(ts){
    this.raf=requestAnimationFrame(t=>this.loop(t));
    let rdt=Math.min(.05,(ts-this.last)/1000);this.last=ts;
    if(this.replaying){this.replayTick(rdt);return}
    if(this.paused){this.draw(0);return}
    if(Settings.fps60&&ts-this.lastDraw<15.5){this.acc+=rdt;return}
    rdt+=this.acc;this.acc=0;this.lastDraw=ts;
    let scale=1;if(this.slow>0){this.slow-=rdt;scale=.3}
    if(this.cheats.timescale)scale*=this.cheats.timescale;
    const prev=RNG.use(this.rng);
    if(this.stop>0){this.stop-=rdt}
    else{
      this.simAcc=(this.simAcc||0)+rdt*scale;let n=0;
      while(this.simAcc>=STEP&&n<12){this.simAcc-=STEP;this.update(STEP,STEP/scale);n++;if(this.ended)break}
    }
    this.fxTick(rdt);
    RNG.use(prev);
    this.draw(rdt);this.updHud();
  }
  fxTick(rdt){
    if(!Settings.shake)this.shake=0;this.shake=Math.max(0,this.shake-rdt*40);this.flash=Math.max(0,this.flash-rdt*1.8);this.flashSil=Math.max(0,this.flashSil-rdt);
    this.fx=this.fx.filter(f=>(f.t+=rdt)<f.life);this.texts=this.texts.filter(f=>(f.t+=rdt)<f.life);
    for(const p of this.parts){p.t+=rdt;p.x+=p.vx*rdt;p.y+=p.vy*rdt;p.vy+=p.g*rdt;p.vx*=Math.pow(.6,rdt)}
    this.parts=this.parts.filter(p=>p.t<p.life);
    if(this.pHit)this.pHit.t-=rdt;if(this.o.hitAnim)this.o.hitAnim.t-=rdt;
    this.bodyT=Math.max(0,this.bodyT-rdt);this.pBlocks=(this.pBlocks||0)*Math.pow(.9,rdt);
    if(this.bodyBtn)this.bodyBtn.classList.toggle('on',this.held.body||this.bodyT>0);
  }
  update(dt,rdt){
    this.time+=dt;
    if(this.phase==='intro'){this.phaseT+=rdt;if(this.phaseT>1.7){this.phase='fight';this.ov.innerHTML='';this.text('FIGHT!','#fff',200,150,.9,40)}this.idleTick(this.p,dt);this.idleTick(this.o,dt);return}
    if(this.phase==='between'||this.phase==='end'){this.idleTick(this.p,dt);this.idleTick(this.o,dt);return}
    if(this.phase==='down'){
      const c=this.count;c.t+=dt;
      this.tickC(c.d.foe,dt);c.d.t+=dt;
      if(c.d.side==='p'){c.prog=Math.max(0,c.prog-dt*1.3);const gb=$('#gbar',this.ov);if(gb)gb.style.width=Math.min(100,c.prog/c.need*100)+'%'}
      if(c.tko&&c.t>1.4)return this.finish(c.d.side==='o'?'p':'o','TKO','Three knockdowns in the round.');
      if(c.t>=1){c.t-=1;c.n++;Sfx.count();
        const cn=$('#cnt',this.ov);if(cn)cn.textContent=c.n;else{this.ov.className='fov';this.ov.innerHTML=`<div class="bigtxt">${c.n}</div>`}
        if(c.d.side==='o'&&c.n>=c.rise&&c.n<10)return this.rise(c.d);
        if(c.d.side==='p'&&c.ready&&c.n>=2)return this.rise(c.d);
        if(c.n>=10)return this.finish(c.d.side==='o'?'p':'o','KO');
      }
      return;
    }
    this.clock-=dt;
    if(this.clock<=10&&this.clock+dt>10){Sfx.tick();this.call('clock')}
    if(this.clock<=0){this.clock=0;return this.endRound()}
    this.tickC(this.p,dt);this.tickC(this.o,dt);
    if(this.phase!=='fight')return;
    this.playerTick(dt);this.aiTick(dt);
  }
  idleTick(c,dt){c.t+=dt;if(c.state==='down'&&this.phase!=='end')return;if(this.phase!=='end'&&c.state!=='idle'&&c.state!=='block'){c.state='idle';c.pu=null}}
  tickC(c,dt){
    c.t+=dt;c.hurt=Math.max(0,c.hurt-dt);c.counterWin=Math.max(0,c.counterWin-dt);c.regenDelay-=dt;c.clinchCD=Math.max(0,c.clinchCD-dt);
    if(c.comboT>0){c.comboT-=dt;if(c.comboT<=0)c.combo=0}
    if(c.state==='block')c.rs.blockT=(c.rs.blockT||0)+dt;
    c.buffs=c.buffs.filter(b=>(b.t-=dt)>0);
    if(c.next){c.next.t-=dt;if(c.next.t<=0)c.next=null}
    if(c.state!=='down'){
      let rg=(c.state==='block'?3.5:c.state==='idle'?7:3)*(.55+c.st.sta*.009)*(1+(c.m.regen||0))*(this.mods.heat||1);
      if(c.state==='block'&&this.bmax(c,'blockRegen'))rg*=2.5;
      if(c.side==='o'&&c.ai.fadeLate&&this.round>=5)rg*=.7;
      if(c.side==='o'&&c.ai.weak==='fader'&&this.round>=4)rg*=.65;
      c.sta=Math.min(c.maxSta,c.sta+rg*dt);
      if(c.regenDelay<=0)c.hp=Math.min(c.maxHp,c.hp+(.8+c.st.chin*.006)*dt*(c.hurt>0?.4:1));
    }
    if(c.side==='o'&&c.state==='wind'&&c.pu&&!c.flashed&&c.pu.type!=='jab'&&c.t>c.dur*.5){c.flashed=true;Sfx.flash()}
    switch(c.state){
      case 'wind':if(c.t>=c.dur)this.impact(c);break;
      case 'act':if(c.t>=c.dur){c.state='rec';c.t=0;c.dur=c.recDur}break;
      case 'rec':if(c.t>=c.dur)this.afterRec(c);break;
      case 'dodge':if(c.t>=c.dur){c.state='idle';c.dodge=null;this.afterDodge(c)}break;
      case 'stagger':case 'feint':case 'clinch':if(c.t>=c.dur){const was=c.state;c.state='idle';c.pu=null;if(was==='feint'&&c.side==='o'){if(c.seq.length){const n=c.seq.shift();this.throwP(c,n.type,n.body,{quick:1})}else if(chance(.55))this.aiAttack({quick:1})}if(was==='clinch'&&c.side==='p')this.text('BREAK!','#fff',200,200,.6,18)}break;
      case 'block':if(c.side==='o'&&c.t>=c.dur){c.state='idle';if(c.pendingCounter){c.pendingCounter=false;this.aiAttack({quick:1})}}break;
    }
  }
  afterRec(c){
    c.state='idle';c.pu=null;
    if(c.seq.length){const n=c.seq.shift();this.throwP(c,n.type,n.body,n.opts);return}
    if(c.side==='p'&&this.held.block)c.state='block';
  }
  afterDodge(c){
    if(c.side==='p'&&c.autoCounter){const ac=c.autoCounter;c.autoCounter=null;this.throwP(c,ac.type,false,{mult:ac.mult,fast:1});this.text('AUTO-COUNTER','#7fe3ff',200,300,.6,14);return}
    if(c.side==='o'&&c.pendingCounter){c.pendingCounter=false;this.aiAttack({quick:1})}
    if(c.side==='p'&&this.held.block)c.state='block';
  }
  playerTick(dt){
    const p=this.p;
    if(p.queue){p.qT-=dt;if(p.qT<=0)p.queue=null;
      else if(p.state==='idle'||(p.state==='block'&&(p.t>=.12||p.queue.dodge))){const q=p.queue;p.queue=null;if(q.dodge)this.pressDodge(q.dodge);else this.throwP(p,q.type,q.body,{})}}
    if(p.state==='idle'&&this.held.block)p.state='block';
  }
  aiTick(dt){
    const o=this.o,p=this.p,ai=o.ai;
    if(this.cheats.freeze){if(o.state!=='down')o.state='idle';return}
    if(o.reactIn>0){o.reactIn-=dt;if(o.reactIn<=0)this.doReact()}
    if(o.state!=='idle')return;
    if(o.pendingCounter){o.pendingCounter=false;this.aiAttack({quick:1});return}
    o.guardT-=dt;
    if(o.guardT<=0){const gs=ai.guard||['high'];o.guard=(o.sta<30&&chance(.4))?'open':pick(gs);o.guardT=rand(1.3,3.2)}
    o.think-=dt;
    if(o.think>0)return;
    if(this.cheats.dummy){const d=this.cheats.dummy;if(d==='idle'){o.think=1;return}if(PUNCH[d]){this.throwP(o,d,false,{});o.think=rand(.9,1.5);return}}
    let agg=(ai.agg||.5)*this.D.agg;
    if(o.sta<30)agg*=.5;if(o.hurt>0)agg*=.45;if(p.hurt>0||p.state==='stagger')agg*=1.6;
    if(ai.fadeLate&&this.round>=5)agg*=.75;if(this.cfg.sparring)agg*=.8;
    if(ai.weak==='fader'&&this.round>=4)agg*=.7;
    if(ai.weak==='slowStart'&&this.round<=2)agg*=.55;
    if(ai.weak==='frustrates'&&this.round>=2&&p.stats.landed>o.stats.landed*1.3){agg*=1.45;if(chance(.3))o.guard='open'}
    if((p.state==='rec'||p.state==='wind')&&chance(.6))agg*=1.7;
    if(p.sta<25)agg*=1.3;
    let feintP=.2;
    if((this.pBlocks||0)>2.5||(p.state==='block'&&p.t<1.2)){agg*=.4;feintP=.5}
    const ab=o.abilities[0]&&AB[o.abilities[0]];
    if(o.hurt>0&&o.clinchCD<=0&&chance(.33))this.clinch(o);
    else if(ab&&o.meter>=ab.cost*100&&chance(.4))this.useAbility(o,0);
    else if(chance(agg))this.aiAttack();
    else if(chance(feintP))this.feint(o);
    o.think=rand(.22,.8)*(1.2-(ai.agg||.5)*.5)/this.D.agg;
  }
  /* ---------- fx ---------- */
  text(t,col,x,y,life,size){this.texts.push({t:0,txt:t,col,x,y,life,size})}
  spark(x,y,col,n,s=1){this.fx.push({t:0,life:.28,x,y,col,n,s,rot:Math.random()*6});this.fxId=(this.fxId||0)+1;this.fxLast={y,s,col}}
  sweat(x,y,dir,n,opp){for(let i=0;i<n;i++)this.parts.push({t:0,life:.3+Math.random()*.3,x,y:y+(Math.random()-.5)*16,vx:dir*(120+Math.random()*220)+(Math.random()-.5)*120,vy:-40-Math.random()*220,g:900,r:1.5+Math.random()*1.7,col:opp?'rgba(210,235,255,.85)':'rgba(255,255,255,.7)'})}
  dust(x,y){for(let i=0;i<14;i++)this.parts.push({t:0,life:.4+Math.random()*.4,x:x+(Math.random()-.5)*80,y,vx:(Math.random()-.5)*180,vy:-10-Math.random()*60,g:-20,r:5+Math.random()*7,col:'rgba(220,205,170,.35)',puff:true})}
  /* ---------- poses ---------- */
  basePose(g){
    const G=GUARDS[g]||GUARDS.high;
    return {hip:[0,-150],chest:[0,-232],head:[0,-322],headTilt:0,twist:0,lean:0,crouch:0,lg:G.lg.slice(),rg:G.rg.slice(),legSpread:52,scale:1,rot:0,sy:1};
  }
  windPose(base,type,hand){
    const p=Object.assign({},base),s=hand==='L'?1:-1,gk=hand==='L'?'lg':'rg';
    if(type==='jab'){p[gk]=[s*62,-292,-.18];p.twist=s*.18;p.lean=-.05}
    else if(type==='cross'){p[gk]=[s*80,-284,-.4];p.twist=s*.42;p.lean=-.12;p.crouch=.05}
    else if(type==='hook'){p[gk]=[s*118,-250,-.12];p.twist=s*.35;p.lean=-.05}
    else{p[gk]=[s*48,-168,-.1];p.twist=s*.28;p.crouch=.28;p.lean=-.02}
    return p;
  }
  strikePose(base,type,hand,body){
    const p=Object.assign({},base),s=hand==='L'?1:-1,gk=hand==='L'?'lg':'rg';
    const y=body?-232:-302;
    if(type==='jab'){p[gk]=[s*12,y,1];p.twist=-s*.3;p.lean=.22}
    else if(type==='cross'){p[gk]=[-s*10,y+2,1.05];p.twist=-s*.5;p.lean=.34;p.crouch=.03}
    else if(type==='hook'){p[gk]=[-s*22,y+14,.92];p.twist=-s*.55;p.lean=.2}
    else{p[gk]=[s*8,body?-250:-318,.95];p.twist=-s*.32;p.lean=.18;p.crouch=-.04}
    return p;
  }
  oppPose(rdt){
    const o=this.o,t=this.time;
    const guard=o.hurt>0?'open':o.guard;
    const base=this.basePose(o.state==='block'?(o.blockLevel==='low'?'blockLow':'blockHigh'):guard);
    const peek=guard==='peek';
    const sw=Math.sin(t*1.7+o.sway);
    base.hip[0]+=sw*(peek?10:5);base.chest[0]+=sw*(peek?14:7);base.head[0]+=sw*(peek?16:8);
    base.crouch+=Math.abs(Math.sin(t*3.2))*.05;
    base.lg[0]+=sw*8;base.rg[0]+=sw*8;base.lg[1]+=Math.sin(t*3.4)*3;base.rg[1]+=Math.sin(t*3.4+1)*3;
    const st=o.state,k=o.dur?clamp(o.t/o.dur,0,1):0;
    let P=base,glow={},face='normal',flash=false,wind=false,open=false;
    const hand=o.pu?this.hand(o,o.pu.type):'L';
    if(st==='wind'&&o.pu){
      const W=this.windPose(base,o.pu.type,hand),S=this.strikePose(base,o.pu.type,hand,o.pu.body);
      wind=true;const type=o.pu.type;
      if(k<.72)P=mixPose(base,W,ease.out(k/.72));else P=mixPose(W,S,ease.in((k-.72)/.28));
      glow[hand]=.35+.65*Math.min(1,k*1.3)*(.75+.25*Math.sin(t*30));glow.col=TELL_COL[type];
      if(type!=='jab'&&k>.5)flash=true;
    }else if(st==='feint'&&o.pu){
      const W=this.windPose(base,o.pu.type,hand);const e=Math.sin(Math.PI*k);P=mixPose(base,W,e*.8);wind=k<.5;glow[hand]=e*.5;glow.col=TELL_COL[o.pu.type];
    }else if((st==='act'||st==='rec')&&o.pu){
      const S=this.strikePose(base,o.pu.type,hand,o.pu.body);
      if(st==='act'){P=S;open=true}else{P=mixPose(S,base,ease.out(k));open=k<.4}
    }else if(st==='dodge'){
      const e=Math.sin(Math.PI*k);P=Object.assign({},base);
      if(o.dodge==='duck'){P.crouch=base.crouch+.6*e;P.headTilt=.1*e}
      else{const d=o.dodge==='slipL'?-1:1;P.lean=d*.75*e;P.headTilt=d*.28*e;P.twist=d*.25*e}
    }else if(st==='stagger'){
      P=Object.assign({},base);P.lean=-.4-Math.sin(t*40)*.06;P.headTilt=.18;P.crouch=.1;P.lg=[88,-215,.05];P.rg=[-88,-215,.05];face='hit';open=true;
      if(o.hitAnim&&o.hitAnim.t>0){const h=o.hitAnim,e=h.t/.22;P.headTilt=h.dir*.5*e+(h.up?-.3*e:0);P.head=[base.head[0]+h.dir*26*e,base.head[1]-(h.up?30*e:6*e)];P.chest=[base.chest[0]+h.dir*10*e,base.chest[1]]}
    }else if(st==='clinch'){
      P=Object.assign({},base);P.lean=.3;P.lg=[126,-252,.6];P.rg=[-126,-252,.6];P.scale=1.14;P.crouch=.04;
    }else if(st==='down'){
      P=Object.assign({},base);const f=Math.min(1,o.t/.75);
      const fall=ease.in(f);P.rot=fall*1.38;P.lean=-.3*(1-f);P.crouch=.25*(1-f);P.lg=[70,-190,-.1];P.rg=[-80,-200,-.1];P.headTilt=.4*f;face='ko';open=f>.4;
      if(f>=1){P.sy=.78;if(!o.landed){o.landed=true;this.dust(260,430);this.shake=Math.max(this.shake,10)}}
    }
    if(o.hurt>0&&st!=='down'&&st!=='stagger'){P=Object.assign({},P);P.lean=(P.lean||0)+Math.sin(t*5)*.22;P.headTilt=(P.headTilt||0)+Math.sin(t*5)*.08;face=face==='normal'?'hurt':face;
      if(!['wind','act','rec'].includes(st)){P.lg=[96,-200,0];P.rg=[-96,-200,0]}}
    if(this.phase==='end'&&this.res.winner==='p'&&['KO','TKO'].includes(this.res.method)&&st!=='down'){face='ko';P=Object.assign({},P);P.headTilt=Math.sin(t*3)*.12}
    if(this.phase==='end'&&this.res.winner==='o'&&st!=='down'){face='smile';P=Object.assign({},P);P.lg=[70,-360,.2];P.rg=[-70,-360,.2]}
    if(o.ai.ropeadope&&o.buffs.length){P=Object.assign({},P);P.lg=[30,-300,.25];P.rg=[-30,-300,.25]}
    const key=st+(o.pu?o.pu.type+hand:'')+(st==='dodge'?o.dodge:'');
    if(key!==this.oKey){this.oFrom=this.oPose?this.unfinal(this.oPose):P;this.oBlend=0;this.oKey=key}
    this.oBlend=Math.min(1,this.oBlend+rdt/.09);
    if(this.oFrom&&this.oBlend<1)P=mixPose(this.oFrom,P,ease.out(this.oBlend));
    const raw=P;
    P=Object.assign({},P);const lean=P.lean||0,cr=P.crouch||0;
    P.head=[P.head[0]+lean*44,P.head[1]+cr*58];P.chest=[P.chest[0]+lean*24,P.chest[1]+cr*42];P.hip=[P.hip[0]+lean*8,P.hip[1]+cr*24];
    P.lg=[P.lg[0]+lean*24,P.lg[1]+cr*42,P.lg[2]];P.rg=[P.rg[0]+lean*24,P.rg[1]+cr*42,P.rg[2]];
    if(o.south){P.head[0]*=-1;P.chest[0]*=-1;P.hip[0]*=-1;P.twist=-(P.twist||0);P.headTilt=-(P.headTilt||0);P.rot=-(P.rot||0);const l=P.lg,r=P.rg;P.lg=[-r[0],r[1],r[2]];P.rg=[-l[0],l[1],l[2]];const gl=glow.L,gr=glow.R;glow.L=gr;glow.R=gl}
    P.face=face;P.cut=o.cut;P.flash=flash;P.wind=wind;P.open=open;P.blink=(t%4)<.1;P.dmg=o.dmg;P.sweat=Math.floor((this.round-1)*1.2+o.hits/14);P.t=t;
    P._raw=raw;
    this.oPose=P;this.oGlow=glow;
    return P;
  }
  unfinal(P){return P._raw||P}
  /* ---------- camera & player gloves ---------- */
  camTick(rdt){
    const p=this.p,T={x:0,y:0,rot:0,zoom:1};
    const st=p.state,k=p.dur?clamp(p.t/p.dur,0,1):0;
    if(st==='dodge'){const e=Math.sin(Math.PI*k);if(p.dodge==='duck'){T.y=-56*e;T.zoom=1+.05*e}else{const d=p.dodge==='slipL'?1:-1;T.x=d*78*e;T.rot=d*.045*e}}
    if(st==='stagger'){T.y=10;T.rot=Math.sin(this.time*45)*.012}
    if(st==='clinch'){T.zoom=1.18;T.y=-30}
    if(st==='down'){const f=Math.min(1,p.t/.6);T.y=-200*ease.in(f);T.rot=.42*f;T.zoom=1.12}
    if(this.o.state==='down'){const f=Math.min(1,this.o.t/.8);T.y=-40*f;T.zoom=1+.08*f}
    if(p.hurt>0)T.rot+=Math.sin(this.time*2.6)*.03;
    if(this.pHit&&this.pHit.t>0){const e=this.pHit.t/.25;T.x+=this.pHit.dir*22*e;T.rot+=this.pHit.dir*.03*e;T.y+=8*e}
    const r=1-Math.pow(.0005,rdt);
    for(const key of ['x','y','rot','zoom'])this.cam[key]=lerp(this.cam[key],T[key],r);
  }
  playerGloves(rdt){
    const p=this.p,W=this.W,H=this.H,r=Math.min(W,H)*.105,t=this.time;
    const bob=Math.sin(t*3.4)*r*.06;
    const base={L:{x:W*.2,y:H*.9+bob,r:1,g:0},R:{x:W*.8,y:H*.9+bob,r:1,g:0}};
    const st=p.state,k=p.dur?clamp(p.t/p.dur,0,1):0;
    const tgt=(body)=>{const P=this.oPose;return this.toScreen(200+(P?P.head[0]:0),430+(P?(body?P.chest[1]+20:P.head[1]+6):-300))};
    let T={L:{...base.L},R:{...base.R}};
    if(st==='block'){T.L={x:W*.5-r*1.0,y:H*.56,r:1.25,g:0};T.R={x:W*.5+r*1.0,y:H*.56,r:1.25,g:0}}
    else if(st==='clinch'){T.L={x:W*.08,y:H*.5,r:1.1,g:0};T.R={x:W*.92,y:H*.5,r:1.1,g:0}}
    else if(st==='down'){T.L={x:W*.2,y:H*1.4,r:1,g:0};T.R={x:W*.8,y:H*1.4,r:1,g:0}}
    else if(st==='stagger'){const s=Math.sin(t*50)*r*.15;T.L={x:W*.17+s,y:H*.98,r:1,g:0};T.R={x:W*.83+s,y:H*.98,r:1,g:0}}
    else if(p.pu&&(st==='wind'||st==='act'||st==='rec')){
      const h=this.hand(p,p.pu.type),g=T[h],side=h==='L'?-1:1,type=p.pu.type,body=p.pu.body;
      const tg=tgt(body);
      let e;
      if(st==='wind'){e=-.18*ease.out(k)}else if(st==='act'){e=1}else{e=1-ease.out(k)}
      if(e<0){g.y-=e*r*1.4;g.x+=side*-e*r*.6;g.r=1-e*.1}
      else{
        let cx=base[h].x,cy=base[h].y;
        if(type==='hook'){cx=base[h].x+side*W*.25;cy=(base[h].y+tg.y)/2}
        if(type==='upper'){cx=base[h].x;cy=base[h].y+r*1.2}
        if(type==='jab'||type==='cross'){cx=(base[h].x+tg.x)/2;cy=(base[h].y+tg.y)/2}
        const ee=st==='act'?1:e;const u=1-ee;
        g.x=u*u*base[h].x+2*u*ee*cx+ee*ee*tg.x;g.y=u*u*base[h].y+2*u*ee*cy+ee*ee*tg.y;g.r=1-.48*ee;
        if(st==='act')g.g=.4;
      }
      T[h]=g;
    }
    if(this.held.body||this.bodyT>0){T.L.y+=r*.35;T.R.y+=r*.35}
    const rate=1-Math.pow(.00001,rdt);
    for(const h of ['L','R']){const c=this.pG[h],d=T[h];if(c.init==null){Object.assign(c,d);c.init=1}else{c.x=lerp(c.x,d.x,rate);c.y=lerp(c.y,d.y,rate);c.r=lerp(c.r,d.r,rate);c.g=d.g}}
    this.pR=r;
  }
  toScreen(x,y){const m=this.mtx;if(!m)return {x:this.W/2,y:this.H*.3};const p=m.transformPoint({x,y});return {x:p.x,y:p.y}}
  /* ---------- draw ---------- */
  draw(rdt){
    const c=this.ctx,W=this.W,H=this.H,sc=this.sc,A=this.arena;
    this.camTick(rdt);
    const op=this.oppPose(rdt);
    const shx=this.shake?(Math.random()*2-1)*this.shake*.5:0,shy=this.shake?(Math.random()*2-1)*this.shake*.4:0;
    const cam=this.cam;
    c.setTransform(1,0,0,1,0,0);
    const px=this.ox+200*sc,py=this.oy+300*sc;
    const world=()=>{c.setTransform(1,0,0,1,0,0);c.translate(px+shx*sc,py+shy*sc);c.rotate(cam.rot);c.scale(sc*cam.zoom,sc*cam.zoom);c.translate(-200+cam.x,-300+cam.y)};
    const r3=this.r3d;
    if(r3&&!r3.ok){this.drop3d()}
    if(this.r3d)this.recFrame(op,rdt);
    if(this.r3d){try{r3.render(rdt,op,this.oGlow)}catch(e){console.warn('3D render failed, using 2D',e);this.drop3d()}}
    if(this.r3d){c.clearRect(0,0,W,H);world();
      if(this.phase==='down'&&this.count){c.save();c.font='64px "Alfa Slab One",Georgia,serif';c.textAlign='center';c.lineWidth=8;c.strokeStyle='rgba(0,0,0,.8)';c.strokeText(this.count.n,200,60);c.fillStyle='#fff';c.fillText(this.count.n,200,60);c.restore()}
    }else{
    c.fillStyle='#04050b';c.fillRect(0,0,W,H);
    const layer=(img,par)=>{c.setTransform(1,0,0,1,0,0);c.translate(W/2,H*.55);c.rotate(cam.rot*.6);const z=cam.zoom*.5+.5;c.scale(z,z);c.translate(-W/2,-H*.55);c.drawImage(img,-A.pad+cam.x*sc*par+shx*sc*par,cam.y*sc*par*.6+shy*sc*par)};
    layer(A.bg,.08);
    for(const L of A.crowd)layer(L.c,L.par);
    layer(A.base,.5);
    world();
    for(let i=0;i<3;i++){if(Math.random()<.035){c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(-220+Math.random()*840,10+Math.random()*180,1.5+Math.random()*2,0,7);c.fill()}}
    const gx=200+(op.hip[0]||0)*.6,sw=(this.o.state==='down'?150:80)*(op.scale||1);
    c.fillStyle='rgba(20,10,30,.42)';c.beginPath();c.ellipse(gx,432,sw,sw*.25,0,0,7);c.fill();
    c.save();c.translate(200,430);if(op.rot){c.rotate(op.rot)}c.scale(op.scale||1,(op.scale||1)*(op.sy||1));
    if(this.p.hurt>0){c.save();c.globalAlpha=.28;c.translate(14,0);drawFighter(c,this.o.look,op,{glow:this.oGlow});c.restore()}
    drawFighter(c,this.o.look,op,{glow:this.oGlow});
    if(this.flashSil>0){c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=Math.min(1,this.flashSil*9);c.fillStyle='#fff';c.fillRect(-300,-500,600,600);c.restore()}
    c.restore();
    if(this.o.buffs.length){c.save();c.globalAlpha=.25+.1*Math.sin(this.time*8);c.strokeStyle='#f0be48';c.lineWidth=4;c.beginPath();c.ellipse(200+op.chest[0],240,100,140,0,0,7);c.stroke();c.restore()}
    if(this.phase==='down'&&this.count){drawRef(c,this.count.d.side==='o'?92:300,150,this.count.n)}
    }
    for(const p of this.parts){const k=p.t/p.life;c.globalAlpha=1-k;c.fillStyle=p.col;c.beginPath();if(p.puff)c.arc(p.x,p.y,p.r*(1+k*1.5),0,7);else c.ellipse(p.x,p.y,p.r,p.r*1.8,Math.atan2(p.vy,p.vx)+Math.PI/2,0,7);c.fill()}
    c.globalAlpha=1;
    for(const f of this.fx){const k=f.t/f.life;c.save();c.translate(f.x,f.y);c.rotate(f.rot);c.strokeStyle=f.col;c.globalAlpha=1-k;c.lineWidth=3*f.s;c.lineCap='round';
      for(let i=0;i<f.n;i++){const a=i/f.n*Math.PI*2,r1=8+k*22*f.s,r2=r1+14*f.s*(1-k*.5);c.beginPath();c.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);c.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);c.stroke()}c.restore()}
    this.mtx=c.getTransform();
    c.setTransform(1,0,0,1,0,0);
    this.playerGloves(rdt);
    const r=this.pR,look=this.p.look;
    if(!this.r3d)for(const h of ['L','R']){const g=this.pG[h];drawPlayerGlove(c,g.x+shx*2,g.y+shy*2,r*g.r,look.gloves,h==='L'?-1:1,{look,glow:g.g,gc:'#fff'})}
    world();
    for(const tx of this.texts){const k=tx.t/tx.life;const pop=Math.min(1,tx.t/.12);const s=ease.back(pop);c.save();c.translate(tx.x,tx.y-Math.max(0,k-.5)*40);c.scale(s,s);c.globalAlpha=k>.7?(1-k)/.3:1;c.font=`${tx.size}px "Alfa Slab One",Georgia,serif`;c.textAlign='center';
      c.lineWidth=6;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText(tx.txt,0,0);c.fillStyle=tx.col;c.fillText(tx.txt,0,0);c.restore()}
    c.setTransform(1,0,0,1,0,0);
    c.drawImage(A.vig,0,0);
    const p=this.p;const low=1-p.hp/100;
    if(low>.45||p.hurt>0){const a=Math.min(.6,(low-.3)*.9+(p.hurt>0?.2+Math.sin(this.time*6)*.08:0));const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(120,0,0,0)');g.addColorStop(1,`rgba(140,0,0,${Math.max(0,a)})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
    if(p.cut>50){c.fillStyle=`rgba(150,0,0,${Math.min(.45,(p.cut-40)/120)})`;c.beginPath();c.ellipse(W*.12,H*.18,W*.22,H*.2,.4,0,7);c.fill()}
    if(this.flash>0){c.fillStyle=`rgba(255,255,255,${this.flash})`;c.fillRect(0,0,W,H)}
    if(this.p.state==='down'){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H)}
    this.drawTellIcon(c);
    if(this.cfg.overlay)this.drawOverlay(c);
  }
  drop3d(){try{this.r3d?.destroy()}catch(e){}this.r3d=null;this.resize();if(typeof toast==='function')toast('3D unavailable on this device, using 2D')}
  /* coach banner: once per tip on this device (unless repeat), with a brief slow-down so the prompt can be acted on */
  coach(id,text,o={}){
    if(!this.coachEl||!Settings.coach||this.cfg.practice&&this.cfg.label&&this.cfg.label.startsWith('Lab'))return;
    const seen=Store.get('tr_coach')||{};if(!o.repeat&&seen[id])return;
    if(this.coachT&&this.time-this.coachT<1.1)return;
    if(!o.repeat){seen[id]=1;Store.set('tr_coach',seen)}
    this.coachT=this.time;this.coachEl.textContent=text;this.coachEl.classList.add('on');
    clearTimeout(this.coachTO);this.coachTO=setTimeout(()=>this.coachEl&&this.coachEl.classList.remove('on'),o.ms||2300);
    if(o.slow&&Settings.slowmo)this.slow=Math.max(this.slow,o.slow);
    this.log({ev:'coach',id});
  }
  /* full-screen flash: never more than three per second; dim when bright flashes are off */
  doFlash(v){const t=this.time||0;if(t-(this.lastFlashT??-9)<.34)return;this.lastFlashT=t;this.flash=Math.max(this.flash,Settings.flashes?v:Math.min(.1,v*.3))}
  /* tell symbol over the winding glove: shape, not colour, says which punch is coming */
  drawTellIcon(c){
    const o=this.o;if(!Settings.tellIcons||!o.pu||!(o.state==='wind'||o.state==='feint'))return;
    const hand=this.hand(o,o.pu.type),type=o.pu.type;let pt=null;
    if(this.r3d)pt=this.r3d.gloveScreen(hand);
    else if(this.oPose){const P=this.oPose,g=hand==='L'?P.lg:P.rg;pt=this.toScreen(200+g[0],430+g[1]-40)}
    if(!pt)return;
    const s=Math.min(this.W,this.H)*.055,k=o.dur?clamp(o.t/o.dur,0,1):0,x=pt.x,y=pt.y-s*1.6;
    c.save();c.globalAlpha=Math.min(1,.4+k*1.2);c.translate(x,y);c.scale(1+.15*Math.sin(this.time*20),1+.15*Math.sin(this.time*20));
    c.fillStyle='rgba(12,10,14,.82)';c.strokeStyle=TELL_COL[type];c.lineWidth=s*.14;c.beginPath();c.arc(0,0,s,0,7);c.fill();c.stroke();
    c.fillStyle='#fff';c.strokeStyle='#fff';c.lineWidth=s*.18;c.lineCap='round';c.lineJoin='round';
    const side=this.screenSide(o,type)==='L'?-1:1;
    if(type==='jab'){c.beginPath();c.arc(0,0,s*.28,0,7);c.fill()}
    else if(type==='cross'){c.beginPath();c.moveTo(-s*.42,-s*.25);c.lineTo(0,s*.4);c.lineTo(s*.42,-s*.25);c.closePath();c.fill()}
    else if(type==='upper'){c.beginPath();c.moveTo(-s*.42,s*.25);c.lineTo(0,-s*.45);c.lineTo(s*.42,s*.25);c.closePath();c.fill()}
    else{c.beginPath();c.arc(-side*s*.05,0,s*.45,side>0?Math.PI*1.05:-Math.PI*.05,side>0?Math.PI*1.95:Math.PI*.95+0,side<0);c.stroke();
      const ax=side*s*.42,ay=s*.05;c.beginPath();c.moveTo(ax,ay+s*.2);c.lineTo(ax+side*s*.02,ay-s*.12);c.lineTo(ax-side*s*.3,ay+s*.02);c.stroke()}
    if(o.pu.body){c.font=`700 ${s*.5}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.fillStyle='#fff';c.fillText('BODY',0,s*1.6)}
    c.restore();
  }
  drawOverlay(c){
    const W=this.W,dpr=this.dpr,o=this.o,p=this.p;
    c.save();c.setTransform(dpr,0,0,dpr,0,0);
    const w=W/dpr-20,x0=10,y0=8;
    c.font='11px "Barlow Condensed",sans-serif';c.textBaseline='top';
    const bar=(y,T,live)=>{
      const dur=T.dur,k=live?clamp(o.t/dur,0,1):1;
      c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x0,y,w,18);
      c.fillStyle=TELL_COL[T.type];c.globalAlpha=.55;c.fillRect(x0,y,w*k,18);c.globalAlpha=1;
      c.fillStyle='#fff';c.fillText(`${T.type}${T.body?' body':''}${T.quick?' (quick)':''} ${Math.round(dur*1000)}ms${T.res?' → '+T.res:''}`,x0+4,y+3);
      for(const i of T.inputs){const ix=x0+w*clamp(i.t/dur,0,1);c.fillStyle=i.a.startsWith('slip')||i.a==='duck'?'#7fe3ff':i.a==='block'?'#9fb3ff':'#ff8a7a';c.fillRect(ix-1,y-3,2,24);c.fillText(i.a,ix+2,y+18)}
    };
    let y=y0;if(this.tell){bar(y,this.tell,true);y+=34}
    for(const T of this.tells.slice(-3).reverse()){bar(y,T,false);y+=34}
    c.fillStyle='#fff';c.fillText(`o:${o.state} t=${o.t.toFixed(2)} guard=${o.guard} hurt=${o.hurt.toFixed(1)} sta=${o.sta.toFixed(0)} | p:${p.state} sta=${p.sta.toFixed(0)} meter=${p.meter.toFixed(0)} | seed ${this.seed}`,x0,y);
    c.restore();
  }
  updHud(){
    const p=this.p,o=this.o,h=this.hud;
    const set=(bars,c)=>{bars[0].children[0].style.width=c.maxHp+'%';bars[0].children[1].style.width=Math.max(0,c.hp)+'%';bars[1].children[0].style.width=c.maxSta+'%';bars[1].children[1].style.width=Math.max(0,c.sta)+'%'};
    set(h.pb,p);set(h.ob,o);
    h.tm.textContent=fmtTime(this.clock);h.rd.textContent=`RD ${this.round}/${this.cfg.rounds}`;
    const bars=Math.floor(p.meter/100),part=Math.round(p.meter%100);
    h.pm.textContent=`Meter ${bars}/3${bars<3?' · '+part+'%':''}`;
    h.om.textContent=o.abilities.length?`Meter ${Math.floor(o.meter/100)}/3`:'';
    this.spBtns.forEach((b,i)=>{const ab=AB[p.abilities[i]];const ok=p.meter>=ab.cost*100;b.classList.toggle('ready',ok);b.classList.toggle('empty',!ok);
      $$('.pips i',b).forEach((pi,j)=>pi.classList.toggle('f',p.meter>=(j+1)*100))});
  }
}
/* flag this moment: snapshot + note, usable from a fight or anywhere */
function flagMoment(fight,done){
  const m=modal(`<h2 class="sec">Flag this moment</h2>
    <div class="chips" id="ftag">${['feel','balance','bug','idea'].map((t,i)=>`<button class="chip${i===0?' on':''}" data-v="${t}">${t}</button>`).join('')}</div>
    <textarea id="fnote" rows="3" placeholder="What happened? What should change?"></textarea>
    <div class="row"><button class="btn gold grow" id="fsave">Save flag</button><button class="btn ghost" data-close="x">Cancel</button></div>`);
  m.addEventListener('click',e=>{const c=e.target.closest('#ftag .chip');if(c)$$('#ftag .chip',m).forEach(x=>x.classList.toggle('on',x===c))});
  $('#fsave',m).onclick=()=>{
    const tag=$('#ftag .on',m).dataset.v,note=$('#fnote',m).value.trim();
    const f={tag,note,screen:fight?'fight':UI.cur,career:G?{name:B().first+' '+B().last,week:G.week,phase:G.phase,level:B().level,ovr:playerOvr(),div:B().div,rec:B().record,sandbox:!!G.sandbox,seed:G.seed}:null,fight:fight?fight.snapshot():null};
    Flags.add(f);m.remove();toast('Flag saved');done&&done();
  };
}
