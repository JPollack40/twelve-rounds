/* ================= live 3D stage: a fighter performing a motion-captured clip in place of a still portrait =================
   r3stage(host,look,opt) fills host with a canvas and loops opt.clip (or a list played one after another) on the sculpted fighter.
   It runs at up to 30 fps, pauses while the app is hidden, stops when host leaves the page, and turns with a drag. Without the
   sculpted fighters or motion capture it returns false and the caller keeps its still image. */
function r3stageOn(look){return !!(typeof THREE!=='undefined'&&R3D.ok()&&Settings.gfx3d!==false&&Settings.sculpt&&Settings.mocap&&R3MC.ready&&r3rigOn(r3look(look||{})))}
function r3stage(host,look,opt={}){
  if(!host||!r3stageOn(look))return false;
  const cv=document.createElement('canvas');cv.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;border-radius:inherit';host.innerHTML='';host.appendChild(cv);
  let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){host.innerHTML='';return false}
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
  const sc=new THREE.Scene();sc.environment=r3env();r3lights(sc,{});
  const L=r3look(look,{arch:opt.arch,height:opt.height,legend:opt.legend}),bx=r3boxer(L,{texSize:1024,robe:!!opt.robe});sc.add(bx);if(bx.userData.rig)r3rigExpr(bx,Object.assign({lidOpen:1},R3_EXPR[L.expr]||{}));
  const cam=new THREE.PerspectiveCamera(30,1,.05,40);
  const list=(Array.isArray(opt.clip)?opt.clip:[opt.clip||'fightingIdle']).filter(k=>R3MC.clips[k]&&mcOk(k));if(!list.length)list.push('fightingIdle');
  if(opt.bg)sc.background=new THREE.Color(opt.bg);
  let ref=null;if(opt.ref&&r3refOn()&&bx.userData.rig){try{ref=r3referee();ref.position.set(-.62,0,-.05);ref.rotation.y=.3;sc.add(ref);bx.position.x=.3}catch(e){ref=null}}
  if(opt.belt||opt.sash)r3belt(bx,L,!!opt.sash,!!opt.robe);const fx=opt.title?r3spectacle(sc,opt.title):null;
  let rot=opt.rot??-.3,drag=null,i=0,ct=0,last=performance.now(),lastDraw=0;
  cv.addEventListener('pointerdown',e=>{drag=e.clientX});cv.addEventListener('pointermove',e=>{if(drag==null)return;rot+=(e.clientX-drag)*.012;drag=e.clientX});
  for(const ev of ['pointerup','pointercancel','pointerleave'])cv.addEventListener(ev,()=>drag=null);
  const P=new Float32Array(MC_F),T=new Float32Array(MC_F),blend=new Float32Array(MC_F),prev=new Float32Array(MC_F);let fade=1;
  const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;if(cv.width!==Math.round(w*r.getPixelRatio())||cv.height!==Math.round(h*r.getPixelRatio())){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}};
  const tick=now=>{if(!cv.isConnected){r3dispose(sc);r.dispose();return}requestAnimationFrame(tick);
    if(document.hidden||now-lastDraw<32)return;const dt=Math.min(.05,(now-last)/1000);last=now;lastDraw=now;size();
    let C=R3MC.clips[list[i]];ct+=dt;
    const hold=opt.hold&&i===list.length-1;   // the last clip of a sequence can hold its final pose instead of looping
    if(ct>C.dur&&!hold){prev.set(P);fade=0;ct=0;i=(i+1)%list.length;C=R3MC.clips[list[i]]}
    r3mcSample(C,Math.min(ct,C.dur),!hold&&list.length===1,!!opt.mirror,P);
    if(fade<1){fade=Math.min(1,fade+dt/.35);r3mcBlend(prev,P,fade*fade*(3-2*fade),blend);P.set(blend)}
    if(fx)fx(dt);r3mcApply(bx,P,{clip:C,lift:0});bx.rotation.y=rot;bx.updateWorldMatrix(true,true);if(ref)r3refRaise(ref,bx);
    const h=2.45*bx.scale.y,z=(opt.zoom||1)*(ref?.82:1);cam.position.set(Math.sin(.15)*h*2.55/z,h*.6,Math.cos(.15)*h*2.55/z);cam.lookAt(0,h*.52,0);r.render(sc,cam)};
  requestAnimationFrame(tick);return true}
/* ring entrance clips by style; opponents without one get a fitting choice from their personality */
const R3_ENTRANCE={walk:['walking'],shadow:['walking','leadJab','crossPunch','walking','hook'],taunt:['walking','taunt','walking','taunt1'],thump:['walking','standingTauntChestThump'],
  snake:['snakeHipHopDance'],lock:['lockingHipHopDance'],thriller:['thrillerPart2']};
function r3entrance(look,seed){const e=look&&look.entrance||(look&&look.expr==='cocky'?['thump','taunt'][seed%2]:['walk','walk','shadow'][seed%3]);return R3_ENTRANCE[e]||R3_ENTRANCE.walk}
/* the waist of a sculpted model, measured once from the trunk vertices just above the pelvis joint */
function r3waist(mk){const M=R3M.m[mk];if(M.waist)return M.waist;const X=M.extras,J=X.joints,p=M.geo.attributes.position.array,si=M.geo.attributes.skinIndex.array,sw=M.geo.attributes.skinWeight.array;
  const tr=['pelvis','spine','hipL','hipR'].map(b=>X.bones.indexOf(b)),y0=J.pelvis[1]+.05;let xm=0,zf=-9,zb=9;
  for(let v=0;v<p.length/3;v++){if(Math.abs(p[v*3+1]-y0)>.025)continue;let w=0;for(let k=0;k<4;k++)if(tr.includes(si[v*4+k]))w+=sw[v*4+k];if(w<.6)continue;
    xm=Math.max(xm,Math.abs(p[v*3]));zf=Math.max(zf,p[v*3+2]);zb=Math.min(zb,p[v*3+2])}
  return M.waist={y:y0-J.pelvis[1],z:(zf+zb)/2-J.pelvis[2],rx:xm,rz:(zf-zb)/2}}
/* a championship belt buckled round the waist: black strap, gold trim, a big gold centre plate and two side plates */
/* sash: a reigning champion walks out with it slung from the left shoulder across to the right hip (over the robe when worn) */
function r3belt(bx,L,sash,robe){const u=bx.userData;if(!u.rig)return null;const W=r3waist(u.mk),BT=R3_RIG_BT[L.bt]||R3_RIG_BT.athletic,J=R3M.m[u.mk].extras.joints;
  let rx=W.rx+.022,rz=W.rz+.03+BT.belly*.05;const g=new THREE.Group();g.position.set(0,W.y,W.z+BT.belly*.025);
  if(sash){const sh=J.shL,hy=J.pelvis[1]+.06,dx=sh[0]*.85+.12,dy=sh[1]+.04-hy,k=robe&&L.robe?(R3_ROBE[L.robe]&&R3_ROBE[L.robe].fit?1.34:1.3):1;rx=Math.hypot(dx,dy)/2*k*1.04;rz=(W.rz+.05+BT.belly*.03)*k;
    g.position.set(dx/2-.12,hy+dy/2-J.spine[1],W.z+J.pelvis[2]-J.spine[2]+.01);g.rotation.z=Math.atan2(dy,dx)}
  const gold=new THREE.MeshStandardMaterial({color:0xe0b04a,metalness:1,roughness:.28}),strap=new THREE.MeshStandardMaterial({color:0x17120e,roughness:.6}),gem=new THREE.MeshStandardMaterial({color:0xb01828,metalness:.4,roughness:.15});
  const band=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.085,48,1,true),strap);band.material.side=THREE.DoubleSide;band.scale.set(rx,1,rz);g.add(band);
  for(const y of [-.043,.043]){const t=new THREE.Mesh(new THREE.TorusGeometry(1,.009,6,64),gold);t.rotation.x=Math.PI/2;t.scale.set(rx,rz,1);t.position.y=y;g.add(t)}
  const plate=(r,a,dz)=>{const m=new THREE.Group(),d=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.04,.018,40),gold);d.rotation.x=Math.PI/2;m.add(d);
    const j=new THREE.Mesh(new THREE.CylinderGeometry(r*.42,r*.42,.012,28),gem);j.rotation.x=Math.PI/2;j.position.z=.012;m.add(j);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.72,.006,6,40),gold);ring.position.z=.012;m.add(ring);
    m.position.set(Math.sin(a)*rx,0,Math.cos(a)*rz+dz);m.rotation.y=Math.atan2(Math.sin(a)*rz,Math.cos(a)*rx);g.add(m)};
  plate(.12,0,.012);for(const a of [-.95,.95])plate(.055,a,.006);
  (sash?u.spine:u.pelvis).add(g);u.belt=g;return g}
/* big-fight spectacle around a live stage: sweeping coloured beams and pyro bursts either side. Returns a per-frame update. */
function r3spectacle(sc,kind){const g=new THREE.Group();sc.add(g);let t=0;
  const beams=[[0xffd27a,-1.4,.0],[0x7aa6ff,1.4,1.7],[0xffffff,0,3.1]].map(([c,x,ph])=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.75,7,24,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    m.geometry.translate(0,-3.5,0);const piv=new THREE.Group();piv.position.set(x,6.2,-2.4);piv.add(m);g.add(piv);return {piv,ph}});
  const spot=new THREE.SpotLight(0xffe2a8,60,20,.35,.6,1.5);spot.position.set(0,7,1.5);spot.target.position.set(0,1,0);g.add(spot,spot.target);
  const flash=new THREE.PointLight(0xff9a40,0,8,1.6);flash.position.set(0,1,-.6);g.add(flash);
  const N=180,pos=new Float32Array(N*3),col=new Float32Array(N*3),vel=new Float32Array(N*3),life=new Float32Array(N);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:.26,toneMapped:false,map:r3spriteTex(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;g.add(pts);
  let next=.25,side=1,k=0;const gold=kind==='belt';
  const burst=()=>{for(const x of gold?[-.85,.85]:[side*.85]){for(let n=0;n<45;n++){const i=k++%N;pos[i*3]=x;pos[i*3+1]=.05;pos[i*3+2]=-.7;
      const a=Math.random()*Math.PI*2,s=Math.random()*.7;vel[i*3]=Math.cos(a)*s;vel[i*3+1]=3.4+Math.random()*1.8;vel[i*3+2]=Math.sin(a)*s;life[i]=1}}side=-side;flash.intensity=Settings.flashes===false?0:14};
  return dt=>{t+=dt;for(const b of beams){b.piv.rotation.z=Math.sin(t*.7+b.ph)*.42;b.piv.rotation.x=Math.cos(t*.5+b.ph)*.18-.12}
    spot.intensity=50+Math.sin(t*3)*10;flash.intensity*=Math.pow(.02,dt);
    if((next-=dt)<=0){burst();next=gold?1.6:2.2}
    for(let i=0;i<N;i++){if(life[i]<=0){col[i*3]=col[i*3+1]=col[i*3+2]=0;continue}life[i]-=dt*.8;vel[i*3+1]-=6.5*dt;
      for(let a=0;a<3;a++)pos[i*3+a]+=vel[i*3+a]*dt;const l=Math.max(0,life[i]),h=Math.min(1,l*1.4);col[i*3]=h*2;col[i*3+1]=h*(gold?1.5:1);col[i*3+2]=h*(gold?.6:.35)}
    geo.attributes.position.needsUpdate=geo.attributes.color.needsUpdate=true}}
