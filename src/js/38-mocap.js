/* ================= motion capture: Mixamo animations on the sculpted boxers =================
   Clips are baked by tools/bake_mocap.js (assets/mocap.json, embedded as R3MOCAP): per frame the hips position and the world
   rotation of hips, spine and head relative to the T-pose, plus the world direction of every limb segment. Our bones are aimed
   along those directions (the same rest convention the IK uses), so one clip set fits both bodies at any build. A clip is
   mirrored (left/right swapped) for the other hand or a southpaw. In fights, punch clips are stretched onto the game's own
   wind-up / throw / recovery timings, so tells and reaction windows are unchanged. */
const R3MC={ready:false,clips:{},
  init(){if(this.ready||typeof R3MOCAP==='undefined'||typeof THREE==='undefined')return;
    for(const [k,c] of Object.entries(R3MOCAP.clips)){const b=Uint8Array.from(atob(c.b64),ch=>ch.charCodeAt(0));const a=new Int16Array(b.buffer);
      const C={k,fps:c.fps,n:c.n,dur:(c.n-1)/c.fps,a};C.x0=a[0]/10;C.z0=a[2]/10;this.clips[k]=C;r3mcMarks(C)}
    this.restY=R3MOCAP.rest.hipsY;this.ready=true}};
const MC_F=45,MC_YAW=.6;let _me=null; // floats per frame: hips pos 3, quats 3x4, limb directions 10x3
/* punch markers: when the hand leaves the guard, reaches full extension, and is home again (by forward reach of that arm) */
const MC_PUNCH={leadJab:{h:'L'},crossPunch:{h:'R'},hook:{h:'L'},rightHook:{h:'R'},uppercut:{h:'L',up:1},bodyJabCross:{h:'L',two:1}};
function r3mcMarks(C){const m=MC_PUNCH[C.k];if(!m)return;const a=C.a,reach=(i,h)=>{const o=i*MC_F+15+(h==='L'?0:9);return (a[o+2]+a[o+5])/32767+(m.up?(a[o+4])/32767*.6:0)};
  const seg=(h,i0,i1)=>{let pk=i0,mx=-9;for(let i=i0;i<=i1;i++){const r=reach(i,h);if(r>mx){mx=r;pk=i}}const base=Math.min(reach(i0,h),reach(i1,h)),th=base+(mx-base)*.22;
    let s=pk;while(s>i0&&reach(s,h)>th)s--;let e=pk;while(e<i1&&reach(e,h)>th)e++;return {s:s/C.fps,p:pk/C.fps,e:Math.min(i1,e+5)/C.fps}};
  // (the body cross in the jab-cross combo stays low, so its markers are set by hand)
  if(m.two){C.mk={L:seg('L',0,Math.round(C.n*.45)),R:{s:.52,p:.72,e:1.05}}}else C.mk={[m.h]:seg(m.h,0,C.n-1)}}
/* sample a clip at time t (seconds) into a pose; mirror swaps sides */
function r3mcSample(C,t,loop,mir,out){const n=C.n,ft=loop?((t*C.fps)%(n-1)+(n-1))%(n-1):clamp(t*C.fps,0,n-1);const i0=Math.floor(ft),i1=Math.min(n-1,i0+1),w=ft-i0,a=C.a;
  const P=out||new Float32Array(MC_F);const o0=i0*MC_F,o1=i1*MC_F;
  for(let k=0;k<3;k++)P[k]=(a[o0+k]*(1-w)+a[o1+k]*w)/10;
  for(let k=3;k<MC_F;k++)P[k]=(a[o0+k]*(1-w)+a[o1+k]*w)/32767;
  r3mcNorm(P);if(mir)r3mcMirror(P);return P}
function r3mcNorm(P){for(let q=0;q<3;q++){const o=3+q*4,l=Math.hypot(P[o],P[o+1],P[o+2],P[o+3])||1;for(let k=0;k<4;k++)P[o+k]/=l}
  for(let d=0;d<10;d++){const o=15+d*3,l=Math.hypot(P[o],P[o+1],P[o+2])||1;for(let k=0;k<3;k++)P[o+k]/=l}}
function r3mcMirror(P){P[0]=-P[0];for(let q=0;q<3;q++){const o=3+q*4;P[o+1]=-P[o+1];P[o+2]=-P[o+2]}
  for(let d=0;d<10;d++)P[15+d*3]=-P[15+d*3];
  const sw=(a,b,n)=>{for(let k=0;k<n;k++){const t=P[a+k];P[a+k]=P[b+k];P[b+k]=t}};sw(15,24,9);sw(33,39,6)}
/* blend b into a by w (quaternions on the same hemisphere, directions renormalised) */
function r3mcBlend(A,B,w,out){const P=out||new Float32Array(MC_F);for(let k=0;k<3;k++)P[k]=A[k]+(B[k]-A[k])*w;
  for(let q=0;q<3;q++){const o=3+q*4;const s=(A[o]*B[o]+A[o+1]*B[o+1]+A[o+2]*B[o+2]+A[o+3]*B[o+3])<0?-1:1;for(let k=0;k<4;k++)P[o+k]=A[o+k]+(B[o+k]*s-A[o+k])*w}
  for(let k=15;k<MC_F;k++)P[k]=A[k]+(B[k]-A[k])*w;r3mcNorm(P);return P}
const _mq=[0,1,2,3,4,5].map(()=>new THREE.Quaternion()),_mv=[0,1,2].map(()=>new THREE.Vector3()),_mDOWN=new THREE.Vector3(0,-1,0);
/* pose a rigged boxer: root motion (cm) is scaled to this body and, unless asked for, kept in place */
function r3mcApply(bx,P,o={}){const u=bx.userData;if(!u.rig)return;const J=R3M.m[u.mk].extras.joints;
  if(!u.mcRest){u.mcRest={};for(const [h,s] of [['L',1],['R',-1]]){const kp=u.legs[s].knee.position.clone().normalize(),an=new THREE.Vector3(...J['ankle'+h]).sub(new THREE.Vector3(...J['knee'+h])).normalize();u.mcRest[s]={th:kp,sh:an}}}
  const sc=J.pelvis[1]/R3MC.restY,C=o.clip;
  const qa=(i,q)=>q.set(P[3+i*4],P[4+i*4],P[5+i*4],P[6+i*4]);const Dh=qa(0,_mq[0]),Ds=qa(1,_mq[1]),Dd=qa(2,_mq[2]);
  if(o.yaw){const y=_mq[5].setFromAxisAngle(new THREE.Vector3(0,1,0),o.yaw);Dh.premultiply(y);Ds.premultiply(y);Dd.premultiply(y)}
  const keep=o.keepArm==='L'?0:o.keepArm==='R'?3:-9;
  const dir=(i,v)=>{v.set(P[15+i*3],P[16+i*3],P[17+i*3]);if(o.yaw&&(i<keep||i>keep+2))v.applyAxisAngle(_mv[2].set(0,1,0),o.yaw);return v};
  const rk=o.root||0,x0=C?C.x0:0,z0=C?C.z0:0;
  u.pelvis.position.set((P[0]-x0)*sc*rk,J.pelvis[1]+(P[1]-R3MC.restY)*sc,(P[2]-z0)*sc*rk);
  u.pelvis.quaternion.copy(Dh);
  const iDh=_mq[3].copy(Dh).invert();u.spine.quaternion.copy(iDh).multiply(Ds);
  const iDs=_mq[3].copy(Ds).invert();u.headG.quaternion.copy(iDs).multiply(Dd);
  for(const [s,b] of [[1,0],[-1,3]]){const A=u.arms[s];
    A.sh.quaternion.setFromUnitVectors(_mDOWN,dir(b,_mv[0]).applyQuaternion(iDs));
    const shW=_mq[4].copy(Ds).multiply(A.sh.quaternion),ishW=_mq[3].copy(shW).invert();
    A.elbow.quaternion.setFromUnitVectors(_mDOWN,dir(b+1,_mv[0]).applyQuaternion(ishW));
    const elW=shW.multiply(A.elbow.quaternion),ielW=_mq[3].copy(elW).invert();
    A.glove.quaternion.setFromUnitVectors(_mDOWN,dir(b+2,_mv[0]).applyQuaternion(ielW)).slerp(_mq[5].identity(),.35)}
  for(const [s,b] of [[1,6],[-1,8]]){const Lg=u.legs[s],R=u.mcRest[s];
    Lg.hip.quaternion.setFromUnitVectors(R.th,dir(b,_mv[0]).applyQuaternion(iDh));
    const hW=_mq[4].copy(Dh).multiply(Lg.hip.quaternion),ihW=_mq[3].copy(hW).invert();
    Lg.knee.quaternion.setFromUnitVectors(R.sh,dir(b+1,_mv[0]).applyQuaternion(ihW))}}
function r3mcOn(u){return !!(Settings.mocap&&u&&u.rig&&R3MC.ready)}
/* ---------- the fight driver: picks a clip for the opponent's state each frame and crossfades between them ---------- */
const MC_HIT={light:'lightHitToHead',medium:'mediumHitToHead',big:'bigHitToHead',body:'hitToBody',upper:'receivingABigUppercut',face:'receivePunchToTheFace'};
function r3mcDrive(R,P){const f=R.f,o=f.o,u=R.opp.userData,t=f.time,raw=P._raw||P;const M=R.mc||(R.mc={cur:null,prev:null,fade:1,react:null,hits:o.hits||0,pose:new Float32Array(MC_F),tmp:new Float32Array(MC_F),tmp2:new Float32Array(MC_F)});
  const south=!!o.south,st=o.state,k=o.dur?clamp(o.t/o.dur,0,1):0;
  // a new landed shot starts a reaction clip (it plays over idle, stagger and blocks; punches and knockdowns win)
  if((o.hits||0)>M.hits){const ha=o.hitAnim||{};const big=st==='stagger'&&o.dur>=.3;
    M.react={k:ha.body?MC_HIT.body:ha.up?(big?MC_HIT.upper:MC_HIT.face):big?MC_HIT.big:o.dur>=.18?MC_HIT.medium:MC_HIT.light,t0:t,mir:(ha.dir||1)>0}}
  M.hits=o.hits||0;
  let want=null;
  if(st==='down'){const c=f.count;let up=0;if(c&&c.d===o&&c.rise<99)up=clamp((c.t-(c.rise-2.4))/2.4,0,1);
    want=up>0?{k:'gettingUp',t:up*R3MC.clips.gettingUp.dur,root:.35,key:'up'}:{k:'knockedDown',t:Math.min(o.t*1.1,R3MC.clips.knockedDown.dur),root:.45,key:'kd'}}
  else if(o.pu&&(st==='wind'||st==='act'||st==='rec'||st==='feint')){const ty=o.pu.type,hand=f.hand(o,ty),body=!!o.pu.body;
    let ck=ty==='jab'?'leadJab':ty==='cross'?'crossPunch':ty==='hook'?(hand==='R'?'rightHook':'hook'):'uppercut';if(body&&(ty==='jab'||ty==='cross'))ck='bodyJabCross';
    const C=R3MC.clips[ck];const mk=C.mk[hand]||C.mk.L||C.mk.R;const mir=!C.mk[hand];
    const ph=st==='wind'?mk.s+(mk.p-mk.s)*.78*k:st==='act'?mk.s+(mk.p-mk.s)*(.78+.22*k):st==='feint'?mk.s+(mk.p-mk.s)*.5*Math.sin(k*Math.PI):mk.p+(mk.e-mk.p)*k;
    want={k:ck,t:ph,mir,hand,key:'p'+ty+hand+(body?'b':'')+(o.pu.id||'')}}
  else if(st==='block'||st==='clinch'){const pp=f.p.pu,side=pp&&PUNCH[pp.type]&&PUNCH[pp.type].kind==='hook'?f.hand(f.p,pp.type):null;
    // a hook from your left lands on their right side: they cover with the right arm (and vice versa)
    const bk=side==='L'?'rightBlock':side==='R'?'leftBlock':'centerBlock';want={k:bk,t:R3MC.clips[bk].dur*(bk==='centerBlock'?.45:.5),key:'blk'+bk}}
  else if(f.phase==='end'&&f.res&&f.res.winner==='o'){const c=r3mcCeleb(R);want={k:c,t:t-(M.celebT??(M.celebT=t)),loop:1,key:'cel',free:1,root:.25}}
  else if(f.phase==='down'&&f.count&&f.count.d===f.p){const c=R.oL&&R.oL.expr==='cocky'?'standingTauntChestThump':'taunt1';want={k:c,t:t-(M.tauntT??(M.tauntT=t)),loop:1,key:'tnt',free:1}}
  if(!want&&M.react){const C=R3MC.clips[M.react.k],el=(t-M.react.t0)*1.6;if(el<C.dur*.85)want={k:M.react.k,t:el,mir:M.react.mir,key:'r'+M.react.t0};else M.react=null}
  if(!want)want={k:'fightingIdle',t:t*(o.hurt>0?.8:1),loop:1,key:'idle'};
  // southpaws mirror everything (their lead hand is the right)
  if(south)want.mir=!want.mir;
  const dt=clamp(t-(M.lastT??t),0,.1)||1/60;M.lastT=t;
  if(!M.cur||M.cur.key!==want.key){if(M.cur){M.prevPose=M.prevPose||new Float32Array(MC_F);M.prevPose.set(M.pose)}M.fade=0;M.fadeLen=want.key==='kd'||M.cur&&M.cur.key==='kd'?.2:want.key[0]==='p'?.06:.12}
  M.cur=want;M.fade=Math.min(1,M.fade+dt/M.fadeLen);
  const C=R3MC.clips[want.k];r3mcSample(C,want.t,!!want.loop,!!want.mir,M.tmp);
  // punch clips step in with a lunge; in place that reads as kneeling, so the legs and hip height stay mostly in the stance
  if(want.key[0]==='p'||want.key==='blk'){const I=r3mcSample(R3MC.clips.fightingIdle,t,true,!!south,M.tmp3||(M.tmp3=new Float32Array(MC_F)));
    M.tmp[1]=M.tmp[1]+(I[1]-M.tmp[1])*.7;for(let k=33;k<MC_F;k++)M.tmp[k]=M.tmp[k]+(I[k]-M.tmp[k])*.7;r3mcNorm(M.tmp)}
  const pose=M.prevPose&&M.fade<1?r3mcBlend(M.prevPose,M.tmp,M.fade*M.fade*(3-2*M.fade),M.tmp2):M.tmp;M.pose.set(pose);
  // dodges keep the game's own slip and duck (lean and crouch) on top of the idle clip
  // Mixamo's stance is almost side-on; turn the body toward the camera, but keep the punching arm aimed straight at you
  const yaw=(south?-1:1)*MC_YAW*(want.key==='kd'||want.key==='up'?.3:want.free?0:1);
  r3mcApply(R.opp,M.pose,{clip:C,root:want.root||0,yaw,keepArm:want.hand});
  // the first-person camera sits close and high, where a real boxing crouch reads as kneeling: standing legs lean most of the way
  // to the classic upright stance (keeping some of the bounce), and the hips follow
  if(want.key!=='tnt')M.tauntT=null;
  if(!want.free&&want.key!=='kd'&&want.key!=='up'){const cr=raw.crouch||0,front=south?-1:1,e=_me||(_me=new THREE.Euler()),q=_mq[5];
    for(const s of [-1,1]){const lead=s===front,Lg=u.legs[s];
      q.setFromEuler(e.set(((lead?-14:8)+cr*55)*Math.PI/180,0,6*s*Math.PI/180));Lg.hip.quaternion.slerp(q,.75);
      q.setFromEuler(e.set(((lead?-10:-8)-cr*95)*Math.PI/180,0,0));Lg.knee.quaternion.slerp(q,.75)}
    u.pelvis.position.y=u.pelvis.position.y*.3+(u.legY-.11-cr*.32)*.7}
  if(st==='dodge'){const lean=raw.lean||0,cr=raw.crouch||0;u.pelvis.position.y-=cr*.32;u.spine.rotateZ(-lean*.55);u.spine.rotateX(cr*.5)}
  R.opp.rotation.set(0,0,0)}
/* how a winner celebrates: dancers dance (and everyone does Thriller on Halloween week), cocky fighters taunt, the rest raise a fist */
function r3mcCeleb(R){if(R.mcCel)return R.mcCel;const L=R.oL||{},d=new Date(),hw=d.getMonth()===9&&d.getDate()>=25;const r=(L.hseed||0)%7;
  return R.mcCel=hw?'thrillerPart2':r===0?'snakeHipHopDance':r===1?'lockingHipHopDance':L.expr==='cocky'?'standingTauntChestThump':r%2?'victory':'victoryIdle1'}
