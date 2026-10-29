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
const MC_F=45,MC_YAW=.6; // floats per frame: hips pos 3, quats 3x4, limb directions 10x3
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
const _mq=[0,1,2,3,4,5].map(()=>new THREE.Quaternion()),_mv=[0,1,2,3,4,5,6,7].map(()=>new THREE.Vector3()),_mDOWN=new THREE.Vector3(0,-1,0),_mZ=new THREE.Vector3(0,0,1);
const _mB=[new THREE.Matrix4(),new THREE.Matrix4()],_mbv=[0,1,2].map(()=>new THREE.Vector3());
/* the rotation that carries a rest frame (bone axis a0, bend side b0) onto a target frame (a1, b1): unlike a shortest-arc turn it
   also fixes the twist about the bone, so knees and elbows bend in the plane the clip bends them in */
function r3mcAim(out,a0,b0,a1,b1){const f=(a,b,M)=>{const x=_mbv[0].copy(a).normalize(),z=_mbv[1].copy(b).addScaledVector(x,-b.dot(x));
    if(z.lengthSq()<1e-8)z.copy(_mZ).addScaledVector(x,-x.z);z.normalize();const y=_mbv[2].crossVectors(z,x);return M.makeBasis(x,y,z)};
  f(a0,b0,_mB[0]);f(a1,b1,_mB[1]);_mB[0].transpose();_mB[1].multiply(_mB[0]);return out.setFromRotationMatrix(_mB[1])}
/* the part of v perpendicular to axis, or fallback when v lies along it */
function r3mcPerp(out,v,axis,fallback){out.copy(v).addScaledVector(axis,-v.dot(axis));if(out.lengthSq()<.004)out.copy(fallback).addScaledVector(axis,-fallback.dot(axis));return out.normalize()}
/* pose a rigged boxer. Root motion (cm) is scaled to this body and kept in place unless asked for. o.yaw turns the body (the
   punching arm o.keepArm keeps its aim); o.lift (0..1) raises the hips toward standing height, with the feet kept where the clip
   put them by two-bone leg IK; the hips take part of the chest's turn so the waist never wrings */
function r3mcApply(bx,P,o={}){const u=bx.userData;if(!u.rig)return;const J=R3M.m[u.mk].extras.joints;
  if(!u.mcRest){u.mcRest={};for(const [h,s] of [['L',1],['R',-1]]){const kp=u.legs[s].knee.position.clone(),an=new THREE.Vector3(...J['ankle'+h]).sub(new THREE.Vector3(...J['knee'+h]));
    u.mcRest[s]={th:kp.clone().normalize(),sh:an.clone().normalize(),L1:kp.length(),L2:an.length()}}}
  const sc=J.pelvis[1]/R3MC.restY,C=o.clip,Y=_mv[7].set(0,1,0);
  const qa=(i,q)=>q.set(P[3+i*4],P[4+i*4],P[5+i*4],P[6+i*4]);const Dh=qa(0,_mq[0]),Ds=qa(1,_mq[1]),Dd=qa(2,_mq[2]);
  if(o.yaw){const y=_mq[5].setFromAxisAngle(Y,o.yaw);Dh.premultiply(y);Ds.premultiply(y);Dd.premultiply(y)}
  const keep=o.keepArm==='L'?0:o.keepArm==='R'?3:-9;
  const dir=(i,v)=>{v.set(P[15+i*3],P[16+i*3],P[17+i*3]);if(o.yaw&&(i<keep||i>keep+2))v.applyAxisAngle(Y,o.yaw);return v};
  const rk=o.root||0,x0=C?C.x0:0,z0=C?C.z0:0,clipY=J.pelvis[1]+(P[1]-R3MC.restY)*sc,liftY=clipY+(J.pelvis[1]*.985-clipY)*(o.lift||0);
  const px=(P[0]-x0)*sc*rk,pz=(P[2]-z0)*sc*rk;
  // hips share a third of the chest's rotation (legs are aimed in world terms, so the feet do not move with it)
  const Dp=_mq[4].copy(Dh).slerp(Ds,.35);u.pelvis.quaternion.copy(Dp);u.pelvis.position.set(px,liftY,pz);
  const iDp=_mq[3].copy(Dp).invert();u.spine.quaternion.copy(iDp).multiply(Ds);
  const iDs=_mq[5].copy(Ds).invert();u.headG.quaternion.copy(iDs).multiply(Dd);
  const fwdS=_mv[6].copy(_mZ).applyQuaternion(Ds);
  for(const [s,b] of [[1,0],[-1,3]]){const A=u.arms[s];
    const U=dir(b,_mv[0]),F=dir(b+1,_mv[1]),H=dir(b+2,_mv[2]);
    const bend=r3mcPerp(_mv[3],F,U,fwdS);                         // the elbow bends toward the forearm
    r3mcAim(A.sh.quaternion,_mDOWN,_mZ,U.clone().applyQuaternion(iDs),bend.applyQuaternion(iDs));
    const shW=_mq[1].copy(Ds).multiply(A.sh.quaternion),ishW=shW.clone().invert();
    const zE=r3mcPerp(_mv[4],_mv[5].copy(U).negate(),F,_mv[3].copy(_mZ).applyQuaternion(shW));
    r3mcAim(A.elbow.quaternion,_mDOWN,_mZ,F.applyQuaternion(ishW),zE.applyQuaternion(ishW));
    const elW=shW.multiply(A.elbow.quaternion),ielW=elW.clone().invert();
    r3mcAim(A.glove.quaternion,_mDOWN,_mZ,H.applyQuaternion(ielW),_mZ).slerp(_mq[2].identity(),.35);Ds.copy(qa(1,_mq[1]));if(o.yaw)Ds.premultiply(_mq[2].setFromAxisAngle(Y,o.yaw))}
  for(const [s,b] of [[1,6],[-1,8]]){const Lg=u.legs[s],R=u.mcRest[s],fwdP=_mv[6].copy(_mZ).applyQuaternion(Dp);
    let T=dir(b,_mv[0]),S=dir(b+1,_mv[1]);const kf=r3mcPerp(_mv[2],_mv[3].copy(T).sub(S),T,fwdP);   // the knee points forward of the thigh
    // the foot stays where the clip put it; if the hips were lifted, re-solve the knee in the clip's bend plane
    if(liftY!==clipY){const hp=_mv[4].copy(Lg.hip.position).applyQuaternion(Dp);const A=_mv[5].copy(hp).add(_mv[3].set(px,clipY,pz)).addScaledVector(T,R.L1).addScaledVector(S,R.L2);
      hp.x+=px;hp.y+=liftY;hp.z+=pz;const d=A.sub(hp),dist=Math.min(d.length(),(R.L1+R.L2)*.999),dn=d.normalize();
      const ca=clamp((R.L1*R.L1+dist*dist-R.L2*R.L2)/(2*R.L1*dist),-1,1),sa=Math.sqrt(1-ca*ca),pp=r3mcPerp(_mv[3],kf,dn,fwdP);
      const K=_mv[6].copy(dn).multiplyScalar(ca*R.L1).addScaledVector(pp,sa*R.L1);T=_mv[0].copy(K).normalize();S=_mv[1].copy(dn).multiplyScalar(dist).sub(K).normalize();
      r3mcPerp(kf,_mv[3].copy(T).sub(S),T,_mv[3].copy(_mZ).applyQuaternion(Dp))}
    r3mcAim(Lg.hip.quaternion,R.th,_mZ,T.clone().applyQuaternion(iDp),kf.clone().applyQuaternion(iDp));
    const hW=_mq[1].copy(Dp).multiply(Lg.hip.quaternion),ihW=hW.clone().invert();
    const zK=r3mcPerp(_mv[4],T,S,_mv[3].copy(_mZ).applyQuaternion(hW));
    r3mcAim(Lg.knee.quaternion,R.sh,_mZ,S.applyQuaternion(ihW),zK.applyQuaternion(ihW))}}
const mcOk=k=>!(Settings.mcOff||{})[k]&&!!R3MC.clips[k];
/* a clip sample prepared for the fight view: punches and blocks take most of their legs and hip height from the stance (clips
   step in with lunges, which in place read as kneeling) */
function r3mcPrep(k,t,loop,mir,fight,tIdle,out,tmp){const C=R3MC.clips[k];r3mcSample(C,t,loop,mir,out);
  if(fight&&(MC_PUNCH[k]||/Block$/.test(k))&&mcOk('fightingIdle')){const I=r3mcSample(R3MC.clips.fightingIdle,tIdle,true,mir,tmp);
    out[1]=out[1]+(I[1]-out[1])*.6;for(let i=33;i<MC_F;i++)out[i]=out[i]+(I[i]-out[i])*.6;r3mcNorm(out)}
  return out}
function r3mcOn(u){return !!(Settings.mocap&&u&&(u.rig||u.duncan)&&R3MC.ready)}
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
  else if(f.phase==='down'&&f.count&&f.count.d===f.p){const pool=(R.oL&&R.oL.expr==='cocky'?['standingTauntChestThump','taunt1','taunt']:['taunt1','taunt','standingTauntChestThump']).filter(mcOk),c=pool[0]||'fightingIdle';want={k:c,t:t-(M.tauntT??(M.tauntT=t)),loop:1,key:'tnt',free:1}}
  if(M.react&&!mcOk(M.react.k))M.react=null;
  if(!want&&M.react){const C=R3MC.clips[M.react.k],el=(t-M.react.t0)*1.6;if(el<C.dur*.85)want={k:M.react.k,t:el,mir:M.react.mir,key:'r'+M.react.t0};else M.react=null}
  if(!want)want={k:'fightingIdle',t:t*(o.hurt>0?.8:1),loop:1,key:'idle'};
  // southpaws mirror everything (their lead hand is the right)
  if(south)want.mir=!want.mir;
  if(!mcOk(want.k)||u.duncan&&(want.key==='kd'||want.key==='up')){M.cur=null;return false}       // switched off in the animation studio: the classic posing takes this moment
  const dt=clamp(t-(M.lastT??t),0,.1)||1/60;M.lastT=t;
  if(!M.cur||M.cur.key!==want.key){M.prevPose=M.prevPose||new Float32Array(MC_F);M.prevPose.set(M.pose);M.fade=M.cur?0:1;
    M.fadeLen=want.key==='kd'||M.cur&&M.cur.key==='kd'?.28:want.key[0]==='p'?.09:want.key[0]==='r'?.12:.22}
  M.cur=want;M.fade=Math.min(1,M.fade+dt/M.fadeLen);
  r3mcPrep(want.k,want.t,!!want.loop,!!want.mir,!want.free,t,M.tmp,M.tmp3||(M.tmp3=new Float32Array(MC_F)));
  const tgt=M.fade<1?r3mcBlend(M.prevPose,M.tmp,M.fade*M.fade*(3-2*M.fade),M.tmp2):M.tmp;
  // a light filter on top of the crossfades takes the last edge off sudden changes (tighter while punching, so timing holds)
  if(M.had){const a=1-Math.exp(-dt*(want.key[0]==='p'?32:want.key[0]==='r'?22:14));r3mcBlend(M.pose,tgt,a,M.pose)}else{M.pose.set(tgt);M.had=1}
  if(want.key!=='tnt')M.tauntT=null;
  // Mixamo's stance is almost side-on: turn the body toward the camera, but keep the punching arm aimed straight at you. The close,
  // high first-person camera makes a real crouch read as kneeling, so the hips rise part way (feet stay planted by leg IK)
  const yaw=(south?-1:1)*MC_YAW*(want.key==='kd'||want.key==='up'?.3:want.free?.4:1);
  if(u.duncan){r3mcApplyDuncan(R.opp,M.pose,{yaw:(south?-1:1)*MC_DUN_YAW,keepArm:want.hand,free:want.free});return true}
  r3mcApply(R.opp,M.pose,{clip:R3MC.clips[want.k],root:want.root||0,yaw,keepArm:want.hand,lift:want.key==='kd'||want.key==='up'?0:.45});
  // dodges keep the game's own slip and duck (lean and crouch) on top
  if(st==='dodge'){const lean=raw.lean||0,cr=raw.crouch||0;u.pelvis.position.y-=cr*.32;u.spine.rotateZ(-lean*.55);u.spine.rotateX(cr*.5)}
  R.opp.rotation.set(0,0,0);return true}
/* how a winner celebrates: dancers dance (and everyone does Thriller on Halloween week), cocky fighters taunt, the rest raise a fist */
function r3mcCeleb(R){if(R.mcCel&&mcOk(R.mcCel))return R.mcCel;const L=R.oL||{},d=new Date(),hw=d.getMonth()===9&&d.getDate()>=25;const r=(L.hseed||0)%7;
  const pref=[hw?'thrillerPart2':null,r===0?'snakeHipHopDance':r===1?'lockingHipHopDance':null,L.expr==='cocky'?'standingTauntChestThump':null,['victory','victoryIdle1','victoryIdle'][r%3],'victory','victoryIdle1','victoryIdle','thrillerPart2','snakeHipHopDance','lockingHipHopDance'];
  return R.mcCel=pref.find(k=>k&&mcOk(k))||'fightingIdle'}
/* ---------- Duncan V.: the same clips mapped onto his rig. His core (body on the spring) takes the chest's lean and twist and
   squashes as the hips dip; his head takes the head's turn; each glove goes where the fighter's hand is, reached from his shoulder
   anchor along the clip's arm directions, and the conduit arms re-route to follow. His knockdown keeps its spring topple. */
const MC_DUN_YAW=1.15,MC_DUN_K=.0125,_mde=new THREE.Euler(),MC_DUN_G0=new THREE.Vector3(0,1,.35).normalize();
function r3mcApplyDuncan(root,P,o={}){const u=root.userData,Y=_mv[7].set(0,1,0);
  const qa=(i,q)=>q.set(P[3+i*4],P[4+i*4],P[5+i*4],P[6+i*4]);const Ds=qa(1,_mq[1]),Dd=qa(2,_mq[2]);
  const yq=_mq[5].setFromAxisAngle(Y,o.yaw||0);Ds.premultiply(yq);Dd.premultiply(yq);
  // the core leans and twists with the chest (a little less: he is bolted down), and the spring takes the hips' dip
  // he is bolted down: the core follows the chest's lean and twist within limits, so he never turns his back on you
  const e=_mde.setFromQuaternion(Ds,'YXZ');u.core.quaternion.setFromEuler(_mde.set(clamp(e.x*.7,-.35,.35),clamp(e.y*.6,-.45,.45),clamp(e.z*.7,-.3,.3),'YXZ'));const dip=clamp((R3MC.restY*.93-P[1])/R3MC.restY,-.15,.3);
  u.core.scale.set(1+dip*.25,1-dip*.5,1+dip*.25);
  const eh=_mde.setFromQuaternion(_mq[3].copy(Ds).invert().multiply(Dd),'YXZ');u.headG.quaternion.setFromEuler(_mde.set(clamp(eh.x*.7,-.3,.3),clamp(eh.y*.7,-.5,.5),clamp(eh.z*.7,-.3,.3),'YXZ'));
  root.updateMatrixWorld(true);const toRoot=_mB[0].copy(root.matrixWorld).invert().multiply(u.core.matrixWorld);
  // where a boxer's hand sits relative to their head (cm, from the clip with typical proportions), carried onto Duncan's head
  const head=_mv[5].set(0,u.hy0,0).applyMatrix4(toRoot),hc=_mv[4].set(0,26,2).applyQuaternion(Ds);
  const keep=o.keepArm==='L'?0:o.keepArm==='R'?3:-9;
  for(const [s,b] of [[1,0],[-1,3]]){const A=u.arms[s];
    const U=_mv[0].set(P[15+b*3],P[16+b*3],P[17+b*3]),F=_mv[1].set(P[18+b*3],P[19+b*3],P[20+b*3]);
    if(b!==keep){U.applyAxisAngle(Y,o.yaw||0);F.applyAxisAngle(Y,o.yaw||0)}
    const hand=_mv[2].set(s*17,0,0).applyQuaternion(Ds).addScaledVector(U,28).addScaledVector(F,27).sub(hc);
    const T=_mv[3].copy(head).addScaledVector(hand,MC_DUN_K);T.y=Math.max(T.y,.4);T.z=Math.min(T.z,1.15);A.glove.position.copy(T);
    // the fist faces where the forearm points
    // the fist faces where the forearm points, but always mostly toward you (never the cuff)
    // his known-good guard angle, turned by however far the clip's forearm has moved from a guard (forearm up and a little forward)
    A.glove.quaternion.setFromUnitVectors(MC_DUN_G0,_mv[6].copy(F).add(_mv[4].set(0,0,.6)).normalize()).multiply(_mq[0].setFromEuler(_mde.set(-1.15,s*.15,s*-.1)))}}
