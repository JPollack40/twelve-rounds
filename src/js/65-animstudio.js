/* ================= Animation Studio: review every motion-captured clip on the sculpted boxers, and switch any of them off =================
   A switched-off clip is never used in fights: its moment falls back to the classic posing (or, for celebrations and taunts,
   to another clip that is on). */
const MC_INFO=[
  ['Stance',[['fightingIdle','Fighting Idle','Stance between punches']]],
  ['Punches',[['leadJab','Lead Jab','Jabs'],['crossPunch','Cross Punch','Crosses'],['hook','Hook','Lead-hand hooks'],['rightHook','Right Hook','Rear-hand hooks'],
    ['uppercut','Uppercut','Uppercuts (mirrored for the other hand)'],['bodyJabCross','Body Jab Cross','Body jabs and body crosses']]],
  ['Defense',[['centerBlock','Center Block','Blocking straight shots, and clinches'],['leftBlock','Left Block','Covering a hook to their left side'],['rightBlock','Right Block','Covering a hook to their right side'],
    ['dodging','Dodging','Not used in fights yet']]],
  ['Getting hit',[['lightHitToHead','Light Hit To Head','Taking a jab'],['mediumHitToHead','Medium Hit To Head','Taking a solid head shot'],['bigHitToHead','Big Hit To Head','Taking a big head shot'],
    ['hitToBody','Hit To Body','Taking a body shot'],['receivePunchToTheFace','Receive Punch To The Face','Taking an uppercut'],['receivingABigUppercut','Receiving A Big Uppercut','Taking a big uppercut counter']]],
  ['Knockdowns',[['knockedDown','Knocked Down','Going down'],['gettingUp','Getting Up','Beating the count']]],
  ['Taunts',[['taunt','Taunt','Taunting while you are down'],['taunt1','Taunt (1)','Taunting while you are down'],['standingTauntChestThump','Standing Taunt Chest Thump','Cocky fighters taunting while you are down; some celebrate with it']]],
  ['Celebrations',[['victory','Victory','Celebrating a win over you'],['victoryIdle','Victory Idle','Celebrating a win over you'],['victoryIdle1','Victory Idle (1)','Celebrating a win over you'],
    ['snakeHipHopDance','Snake Hip Hop Dance','Some fighters dance when they beat you'],['lockingHipHopDance','Locking Hip Hop Dance','Some fighters dance when they beat you'],
    ['thrillerPart2','Thriller Part 2','Every winner on Halloween week (Oct 25-31)']]],
  ['Other',[['walking','Walking','Not used in fights yet']]]];
const mcFree=k=>/^(victory|victoryIdle|victoryIdle1|snakeHipHopDance|lockingHipHopDance|thrillerPart2|taunt|taunt1|standingTauntChestThump|walking|dodging)$/.test(k);
SCR.anims=()=>{
  const A=UI.an=UI.an||{k:'fightingIdle',play:true,speed:1,mir:false,fight:true,fem:false,t:0};const off=Settings.mcOff||{};
  const back=typeof G!=='undefined'&&G&&G.boxer?'settings':'tsettings';
  const ready=R3MC.ready&&R3M.ok('boxer')&&R3M.ok('boxer_f');
  const chip=(act,v,on,l)=>`<button class="chip${on?' on':''}" data-act="${act}" data-v="${v}">${l}</button>`;
  const rows=MC_INFO.map(([g,list])=>`<h3 class="sec" style="margin:14px 0 6px">${g}</h3>`+list.map(([k,n,use])=>`<div class="row sp card flat" style="gap:8px;padding:8px 10px;${A.k===k?'border-color:var(--gold)':''}">
      <button class="grow" data-act="anpick" data-v="${k}" style="all:unset;cursor:pointer;flex:1"><b class="ui" style="text-transform:uppercase;letter-spacing:.04em;font-size:14px">${esc(n)}</b><div class="muted" style="font-size:12.5px">${esc(use)}</div></button>
      <button class="btn sm ${off[k]?'':'gold'}" data-act="mctog" data-k="${k}">${off[k]?'Off':'On'}</button></div>`).join('')).join('');
  return `<div class="scr"><div class="wrap" style="max-width:760px"><div class="topbar"><button class="btn sm back" data-go="${back}">◀</button><div class="t">Animation Studio</div></div>
    ${!Settings.sculpt||!Settings.mocap?`<div class="card" style="font-size:13.5px">Turn on <b>Sculpted fighters</b> and <b>Motion-captured moves</b> in Settings for these to be used in fights. You can still review them here.</div>`:''}
    ${ready?`<div class="card col" style="gap:8px;padding:10px">
      <div style="position:relative"><canvas id="ancv" style="width:100%;aspect-ratio:4/5;max-height:58vh;display:block;border-radius:10px;touch-action:none;background:#e9e4d8"></canvas>
        <div id="anlbl" class="ui" style="position:absolute;left:10px;top:8px;font-size:13px;color:#2a2224;text-transform:uppercase;letter-spacing:.05em"></div>
        <div class="muted" style="position:absolute;right:10px;bottom:6px;font-size:11.5px;color:#5a4950">Drag to turn</div></div>
      <div class="row" style="gap:8px;align-items:center"><button class="btn sm gold" data-act="anplay" id="anpb">${A.play?'❚❚ Pause':'▶ Play'}</button>
        <input type="range" id="anscr" min="0" max="1000" value="0" style="flex:1"><span id="ant" class="muted" style="font-size:12px;min-width:64px;text-align:right"></span></div>
      <div class="chips" style="flex-wrap:wrap">${[[.25,'¼×'],[.5,'½×'],[1,'1×']].map(([v,l])=>chip('anspeed',v,A.speed===v,l)).join('')}
        ${chip('anmir',1,A.mir,'Mirrored')}${chip('anfight',1,A.fight,'As in a fight')}${chip('anfem',0,!A.fem&&!A.dun,"Men's")}${chip('anfem',1,A.fem&&!A.dun,"Women's")}${R3M.ok('duncan')?chip('anfem',2,A.dun,'Duncan V.'):''}</div>
      ${A.dun?'<div class="muted" style="font-size:12.5px">Duncan takes each clip on his own rig: his body leans and twists on the spring, his head turns, and his gloves go where a boxer\'s hands would be. Knockdowns keep his spring topple.</div>':''}
      <div class="muted" style="font-size:12.5px">"As in a fight" shows the clip the way fights use it: turned toward you, hips raised a little with the feet planted, and punches keeping the stance's legs. Off shows the raw capture.</div></div>`
      :`<div class="card">The animations are still loading. Open this again in a moment.</div>`}
    <div class="row sp" style="margin-top:6px"><span class="muted" style="font-size:13px">${Object.values(off).filter(Boolean).length} of ${Object.keys(R3MC.clips).length} switched off</span><button class="btn sm" data-act="mcall">Turn all on</button></div>
    ${rows}</div></div>`};
AFTER.anims=()=>{const cv=$('#ancv');if(!cv)return;const A=UI.an;
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
  const sc=new THREE.Scene();sc.background=new THREE.Color(0xe9e4d8);sc.environment=r3env();r3lights(sc,{});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),new THREE.MeshBasicMaterial({color:0xd6cfbf}));floor.rotation.x=-Math.PI/2;sc.add(floor);
  const cam=new THREE.PerspectiveCamera(32,.8,.05,40);
  const look=A.dun?Object.assign({skin:2,hair:'bald'},LEGEND_VIS.duncan):{skin:3,hair:A.fem?'braids':'short',hc:0,fem:A.fem?1:undefined,trunks:'#2f6fe2',trim:'#f0be48',gloves:'#d8392f'};
  const bx=r3boxer(r3look(look,{}),{texSize:1024});sc.add(bx);let rot=-.35,drag=null;
  cv.addEventListener('pointerdown',e=>{drag=e.clientX;cv.setPointerCapture(e.pointerId)});cv.addEventListener('pointermove',e=>{if(drag==null)return;rot+=(e.clientX-drag)*.012;drag=e.clientX});
  cv.addEventListener('pointerup',()=>drag=null);cv.addEventListener('pointercancel',()=>drag=null);
  const scr=$('#anscr'),tl=$('#ant'),lbl=$('#anlbl');let scrubbing=false;
  scr.addEventListener('input',()=>{scrubbing=true;A.play=false;$('#anpb').textContent='▶ Play';const C=R3MC.clips[A.k];A.t=scr.value/1000*C.dur});scr.addEventListener('change',()=>scrubbing=false);
  const P=new Float32Array(MC_F),T=new Float32Array(MC_F);let last=performance.now();
  const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==Math.round(w*r.getPixelRatio())){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}};
  const tick=now=>{if(!cv.isConnected){r3dispose(sc);r.dispose();return}requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;size();
    const C=R3MC.clips[A.k];if(!C)return;if(A.play)A.t+=dt*A.speed;const loopT=C.dur+(MC_PUNCH[A.k]||/Hit|hit|Uppercut|Block|knocked|getting/i.test(A.k)?.6:0);if(A.t>loopT)A.t%=loopT;
    const ct=Math.min(A.t,C.dur),free=mcFree(A.k),kd=A.k==='knockedDown'||A.k==='gettingUp';
    r3mcPrep(A.k,ct,false,A.mir,A.fight&&!free,A.t,P,T);
    const pk=MC_PUNCH[A.k],hand=pk&&A.fight?(A.mir?(pk.h==='L'?'R':'L'):pk.h):null;
    if(A.dun){if(kd){r3duncanBend(bx.userData,_dq.identity(),0)}else r3mcApplyDuncan(bx,P,{yaw:(A.mir?-1:1)*MC_DUN_YAW,keepArm:hand});r3duncanTubes(bx)}
    else r3mcApply(bx,P,{clip:C,root:kd?.45:0,yaw:A.fight?(A.mir?-1:1)*MC_YAW*(kd?.3:free?.4:1):0,keepArm:hand,lift:A.fight&&!kd?.45:0});
    bx.rotation.y=rot;bx.updateWorldMatrix(true,true);
    cam.position.set(Math.sin(.15)*5.4,1.45,Math.cos(.15)*5.4);cam.lookAt(0,1.05,0);r.render(sc,cam);
    if(!scrubbing)scr.value=Math.round(ct/C.dur*1000);tl.textContent=`${ct.toFixed(2)} / ${C.dur.toFixed(2)}s`;
    lbl.textContent=(MC_INFO.flatMap(g=>g[1]).find(x=>x[0]===A.k)||[0,A.k])[1]+((Settings.mcOff||{})[A.k]?' (off)':'')};
  requestAnimationFrame(tick)};
Object.assign(ACT,{
  anpick(el){UI.an.k=el.dataset.v;UI.an.t=0;UI.an.play=true;UI.render();const c=$('#ancv');if(c)c.scrollIntoView({block:'nearest',behavior:'smooth'})},
  anplay(el){UI.an.play=!UI.an.play;el.textContent=UI.an.play?'❚❚ Pause':'▶ Play'},
  anspeed(el){UI.an.speed=+el.dataset.v;$$('[data-act="anspeed"]').forEach(b=>b.classList.toggle('on',b===el))},
  anmir(el){UI.an.mir=!UI.an.mir;el.classList.toggle('on',UI.an.mir)},
  anfight(el){UI.an.fight=!UI.an.fight;el.classList.toggle('on',UI.an.fight)},
  anfem(el){const v=el.dataset.v;UI.an.fem=v==='1';UI.an.dun=v==='2';UI.render()},
  mctog(el){const k=el.dataset.k;Settings.mcOff=Object.assign({},Settings.mcOff);if(Settings.mcOff[k])delete Settings.mcOff[k];else Settings.mcOff[k]=1;saveSettings();
    el.textContent=Settings.mcOff[k]?'Off':'On';el.classList.toggle('gold',!Settings.mcOff[k])},
  mcall(){Settings.mcOff={};saveSettings();UI.render()}});
