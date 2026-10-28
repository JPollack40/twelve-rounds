/* ================= training camp mini-games ================= */
const MG={
  bag:{title:'Heavy Bag',how:'A target appears on the bag with a punch name. Tap that punch when the shrinking ring meets the target.',pad:['jab','cross','hook','upper'],labels:{jab:'Jab',cross:'Cross',hook:'Hook',upper:'Upper'}},
  speed:{title:'Speed Bag',how:'Tap the side that lights up, on the beat. The rhythm gets faster.',pad:['L','R'],labels:{L:'◀ Left',R:'Right ▶'}},
  rope:{title:'Jump Rope',how:'Tap JUMP as the rope sweeps under your feet. Three trips and you\'re done.',pad:['jump'],labels:{jump:'Jump'}},
  mitts:{title:'Mitt Work',how:'Your trainer shouts a command. Tap it before time runs out. Speed counts.',pad:['jab','cross','hook','upper','slipL','duck','slipR'],labels:{jab:'Jab',cross:'Cross',hook:'Hook',upper:'Upper',slipL:'◀ Slip',duck:'Duck',slipR:'Slip ▶'}},
};
function runMinigame(kind,onDone){
  const M=MG[kind];
  const el=document.createElement('div');el.className='mg';
  el.innerHTML=`<div class="hd"><span>${M.title}</span><span id="mgs" class="num">0%</span></div><div class="stg"><canvas></canvas><div class="fov act" id="mgo"></div></div>
    <div class="pad ${M.pad.length===2?'two':M.pad.length===1?'one':'mitt'}">${M.pad.map(k=>`<button class="fb ${['slipL','slipR','duck'].includes(k)?'dodge':k==='jump'?'guard':'punch'}" data-k="${k}">${M.labels[k]}</button>`).join('')}</div>`;
  document.body.appendChild(el);
  const cv=$('canvas',el),ctx=cv.getContext('2d'),stg=$('.stg',el),ov=$('#mgo',el),sc=$('#mgs',el);
  let W=0,H=0,dpr=1,raf=0,running=false,t=0,last=0;
  const resize=()=>{const r=stg.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=cv.width=Math.round(r.width*dpr);H=cv.height=Math.round(r.height*dpr)};
  const ro=new ResizeObserver(resize);ro.observe(stg);resize();
  const S={score:0,max:1,cues:[],fx:[],msg:'',msgT:0};
  const say=(m,c)=>{S.msg=m;S.msgCol=c||'#fff';S.msgT=.6};
  // --- setup per game
  if(kind==='bag'){let tt=1.4;for(let i=0;i<16;i++){S.cues.push({type:pick(M.pad),t:tt,res:null});tt+=lerp(1,.55,i/15)}S.max=16;S.swing=0;S.sv=0}
  if(kind==='speed'){let tt=1.2;for(let i=0;i<32;i++){S.cues.push({type:i%2?'R':'L',t:tt,res:null});tt+=lerp(.48,.22,i/31)}S.max=32;S.bounce=0}
  if(kind==='rope'){S.phase=-.6;S.speed=.85;S.jumps=0;S.trips=0;S.jumped=false;S.jumpT=0;S.max=25}
  if(kind==='mitts'){S.n=0;S.max=14;S.cur=null;S.gap=1}
  const end=()=>{
    running=false;
    let q;if(kind==='rope')q=clamp(S.jumps/25-S.trips*.06,0,1);else q=clamp(S.score/S.max,0,1);
    const grade=q>=.9?'S':q>=.75?'A':q>=.6?'B':q>=.4?'C':'D';
    ov.className='fov act';ov.innerHTML=`<div class="bigtxt">${grade}</div><div class="card" style="text-align:center">Score ${Math.round(q*100)}%</div><button class="btn primary" id="mgdone">Continue</button>`;
    if(q>=.75)Sfx.great();else Sfx.good();
    $('#mgdone',ov).onclick=()=>{cancelAnimationFrame(raf);ro.disconnect();el.remove();onDone(q)};
  };
  const tap=k=>{
    if(!running)return;
    if(kind==='bag'||kind==='speed'){
      const win=kind==='bag'?.24:.13;
      const c=S.cues.find(c=>!c.res&&Math.abs(t-c.t)<win);
      if(!c){say('EARLY','#9fb3ff');return}
      if(c.type!==k){c.res='x';say('WRONG','#ff6b5b');Sfx.bad();return}
      const e=Math.abs(t-c.t),v=e<win*.3?1:e<win*.65?.7:.4;
      c.res=v;S.score+=v;say(v===1?'PERFECT':v>.5?'GOOD':'OK',v===1?'#ffd34d':'#fff');
      Sfx.hit(kind==='bag'?1.1:.4,kind==='bag');buzz(10);
      if(kind==='bag'){S.sv+=(k==='hook'?.9:k==='upper'?.4:.6)*(R()<.5?1:-1);S.fx.push({t:0,x:0,y:0})}else S.bounce=1;
    }
    if(kind==='rope'&&k==='jump'){
      const f=((S.phase%1)+1)%1,d=Math.min(f,1-f);
      if(S.jumpT>0)return;
      S.jumpT=.32;
      if(d<.11&&!S.jumped){S.jumped=true;S.jumps++;S.score=S.jumps;Sfx.tick();say(d<.05?'PERFECT':'GOOD',d<.05?'#ffd34d':'#fff')}
    }
    if(kind==='mitts'&&S.cur&&!S.cur.res){
      if(k===S.cur.type){const rt=t-S.cur.t0,v=clamp(1-(rt/S.cur.win)*.55,.3,1);S.cur.res=v;S.score+=v;say(v>.85?'SHARP!':'GOOD','#ffd34d');Sfx.hit(.6)}
      else{S.cur.res=-1;say('WRONG','#ff6b5b');Sfx.bad()}
      S.gap=.45;
    }
  };
  $$('.pad .fb',el).forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('on');tap(b.dataset.k)});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>b.classList.remove('on')))});
  const keys={KeyJ:'jab',KeyK:'cross',KeyU:'hook',KeyI:'upper',KeyA:kind==='speed'?'L':'slipL',KeyD:kind==='speed'?'R':'slipR',KeyS:'duck',Space:'jump',ArrowLeft:'L',ArrowRight:'R'};
  const kd=e=>{const k=keys[e.code];if(k&&!e.repeat){e.preventDefault();tap(k)}};window.addEventListener('keydown',kd);
  const loop=ts=>{
    raf=requestAnimationFrame(loop);const dt=Math.min(.05,(ts-last)/1000);last=ts;
    if(running){t+=dt;step(dt)}
    draw();
  };
  const step=dt=>{
    S.msgT-=dt;
    if(kind==='bag'||kind==='speed'){
      const win=kind==='bag'?.24:.13;
      for(const c of S.cues)if(!c.res&&t>c.t+win){c.res='m';say('MISS','#ff6b5b')}
      if(S.cues.every(c=>c.res))end();
      if(kind==='bag'){S.sv-=S.swing*9*dt;S.sv*=Math.pow(.25,dt);S.swing+=S.sv*dt*3}
      if(kind==='speed')S.bounce=Math.max(0,S.bounce-dt*6);
    }
    if(kind==='rope'){
      const prev=S.phase;S.phase+=S.speed*dt;S.speed=Math.min(1.9,S.speed+dt*.03);S.jumpT=Math.max(0,S.jumpT-dt);
      if(Math.floor(prev-.11)!==Math.floor(S.phase-.11)&&prev>0){if(!S.jumped){S.trips++;say('TRIPPED','#ff6b5b');Sfx.bad();buzz(30)}S.jumped=false}
      if(S.trips>=3||S.jumps>=25)end();
    }
    if(kind==='mitts'){
      if(S.cur&&!S.cur.res&&t-S.cur.t0>S.cur.win){S.cur.res=-1;say('TOO SLOW','#ff6b5b');S.gap=.45}
      if(!S.cur||S.cur.res){S.gap-=dt;if(S.gap<=0){if(S.n>=S.max)return end();S.n++;S.cur={type:pick(M.pad),t0:t,win:lerp(1.35,.6,S.n/S.max),res:null};Sfx.tick()}}
    }
    sc.textContent=Math.round((kind==='rope'?S.jumps/25:S.score/S.max)*100)+'%';
  };
  const draw=()=>{
    ctx.setTransform(1,0,0,1,0,0);
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b1f36');g.addColorStop(1,'#0b0d18');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const s=Math.min(W/400,H/400);ctx.setTransform(s,0,0,s,(W-400*s)/2,(H-400*s)/2);
    ctx.fillStyle='rgba(255,255,255,.04)';for(let i=0;i<8;i++)ctx.fillRect(i*56-20,0,24,400);
    if(kind==='bag'){
      ctx.save();ctx.translate(200,20);ctx.rotate(S.swing*.12);
      ctx.strokeStyle='#888';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-30,60);ctx.moveTo(0,0);ctx.lineTo(30,60);ctx.stroke();
      const bg=ctx.createLinearGradient(-60,0,60,0);bg.addColorStop(0,'#5a1414');bg.addColorStop(.5,'#a8231c');bg.addColorStop(1,'#4a1010');ctx.fillStyle=bg;rrect(ctx,-60,60,120,290,26);ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(-60,110,120,8);ctx.fillRect(-60,290,120,8);
      const cue=S.cues.find(c=>!c.res&&c.t-t<1&&c.t-t>-.25);
      if(cue){const k=clamp((cue.t-t)/1,0,1),y={jab:150,cross:170,hook:200,upper:250}[cue.type],x={jab:-20,cross:20,hook:-28,upper:10}[cue.type];
        ctx.strokeStyle=TELL_COL[cue.type];ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,24+70*k,0,7);ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(x,y,24,0,7);ctx.fill();
        ctx.fillStyle='#1a1206';ctx.font='15px "Alfa Slab One",Georgia';ctx.textAlign='center';ctx.fillText(MG.bag.labels[cue.type].toUpperCase(),x,y+5)}
      ctx.restore();
      const nx=S.cues.filter(c=>!c.res).slice(1,4);ctx.font='13px "Barlow Condensed",sans-serif';ctx.fillStyle='#9ca3c0';ctx.textAlign='left';ctx.fillText(nx.length?'NEXT: '+nx.map(c=>MG.bag.labels[c.type].toUpperCase()).join(' · '):'',12,390);
    }
    if(kind==='speed'){
      ctx.fillStyle='#3a2a1a';ctx.fillRect(80,40,240,26);ctx.fillStyle='#2a2a2a';ctx.fillRect(196,66,8,20);
      const b=S.bounce;ctx.fillStyle='#b8321f';ctx.beginPath();ctx.ellipse(200,130+b*-14,34,46-b*8,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.ellipse(190,112,10,16,0,0,7);ctx.fill();
      const cue=S.cues.find(c=>!c.res);
      if(cue){const k=clamp((cue.t-t)/.6,0,1);for(const sd of ['L','R']){const x=sd==='L'?100:300,on=cue.type===sd;
        ctx.fillStyle=on?`rgba(240,190,72,${1-k*.7})`:'rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(x,260,46,0,7);ctx.fill();
        if(on){ctx.strokeStyle='#f0be48';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,260,46+60*k,0,7);ctx.stroke()}
        ctx.fillStyle=on?'#1a1206':'#9ca3c0';ctx.font='22px "Alfa Slab One",Georgia';ctx.textAlign='center';ctx.fillText(sd==='L'?'LEFT':'RIGHT',x,268)}}
    }
    if(kind==='rope'){
      const f=((S.phase%1)+1)%1,a=f*Math.PI*2;const jy=S.jumpT>0?-Math.sin(S.jumpT/.32*Math.PI)*42:0;
      const ry=Math.cos(a);const front=ry>0;
      const drawRope=()=>{ctx.strokeStyle='#e8d7a5';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(150,200+jy);ctx.quadraticCurveTo(200,200+ry*190+jy*.3,250,200+jy);ctx.stroke()};
      if(!front)drawRope();
      ctx.fillStyle='#c98e62';ctx.beginPath();ctx.arc(200,120+jy,22,0,7);ctx.fill();ctx.fillStyle='#d8392f';ctx.fillRect(176,145+jy,48,80);ctx.fillStyle='#2f6fe2';ctx.fillRect(178,225+jy,44,34);
      ctx.fillStyle='#a8704a';ctx.fillRect(182,259+jy,14,90);ctx.fillRect(204,259+jy,14,90);
      if(front)drawRope();
      ctx.fillStyle='#9ca3c0';ctx.font='15px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.fillText(`JUMPS ${S.jumps}/25 · TRIPS ${S.trips}/3`,200,390);
    }
    if(kind==='mitts'){
      ctx.fillStyle='#c98e62';ctx.beginPath();ctx.arc(200,90,30,0,7);ctx.fill();ctx.fillStyle='#232a4a';rrect(ctx,150,120,100,130,20);ctx.fill();
      ctx.fillStyle='#e9e1cf';ctx.beginPath();ctx.arc(130,170,28,0,7);ctx.arc(270,170,28,0,7);ctx.fill();ctx.fillStyle='#d8392f';ctx.beginPath();ctx.arc(130,170,12,0,7);ctx.arc(270,170,12,0,7);ctx.fill();
      if(S.cur&&!S.cur.res){const k=1-(t-S.cur.t0)/S.cur.win;ctx.fillStyle='#fff';ctx.font='30px "Alfa Slab One",Georgia';ctx.textAlign='center';
        ctx.fillText(MG.mitts.labels[S.cur.type].replace('◀ ','').replace(' ▶','').toUpperCase()+(S.cur.type==='slipL'?' LEFT':S.cur.type==='slipR'?' RIGHT':'')+'!',200,300);
        ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(80,320,240,10);ctx.fillStyle=k>.4?'#4fca8e':'#f05a55';ctx.fillRect(80,320,240*Math.max(0,k),10)}
      ctx.fillStyle='#9ca3c0';ctx.font='15px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.fillText(`CALL ${S.n}/${S.max}`,200,390);
    }
    if(S.msgT>0){ctx.globalAlpha=Math.min(1,S.msgT*3);ctx.font='26px "Alfa Slab One",Georgia';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.strokeText(S.msg,200,40+(.6-S.msgT)*-20+30);ctx.fillStyle=S.msgCol;ctx.fillText(S.msg,200,40+(.6-S.msgT)*-20+30);ctx.globalAlpha=1}
  };
  ov.innerHTML=`<div class="card" style="max-width:380px;text-align:center;display:flex;flex-direction:column;gap:10px"><b class="ui" style="font-size:22px;text-transform:uppercase;letter-spacing:.06em">${M.title}</b><p>${M.how}</p><button class="btn primary" id="mgst">Start</button></div>`;
  $('#mgst',ov).onclick=()=>{ov.className='fov';ov.innerHTML='';running=true;t=0;last=performance.now()};
  last=performance.now();raf=requestAnimationFrame(loop);
  const cleanup=()=>window.removeEventListener('keydown',kd);
  const obs=new MutationObserver(()=>{if(!el.isConnected){cleanup();obs.disconnect()}});obs.observe(document.body,{childList:true});
}
