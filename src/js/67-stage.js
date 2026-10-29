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
  const L=r3look(look,{arch:opt.arch,height:opt.height}),bx=r3boxer(L,{texSize:1024});sc.add(bx);if(bx.userData.rig)r3rigExpr(bx,Object.assign({lidOpen:1},R3_EXPR[L.expr]||{}));
  const cam=new THREE.PerspectiveCamera(30,1,.05,40);
  const list=(Array.isArray(opt.clip)?opt.clip:[opt.clip||'fightingIdle']).filter(k=>R3MC.clips[k]&&mcOk(k));if(!list.length)list.push('fightingIdle');
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
    r3mcApply(bx,P,{clip:C,lift:0});bx.rotation.y=rot;bx.updateWorldMatrix(true,true);
    const h=2.45*bx.scale.y;cam.position.set(Math.sin(.15)*h*2.55,h*.6,Math.cos(.15)*h*2.55);cam.lookAt(0,h*.52,0);r.render(sc,cam)};
  requestAnimationFrame(tick);return true}
