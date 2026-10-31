/* ================= the referee: the men's sculpted model in shirt, bow tie and slacks =================
   The boxer texture is repainted by where each texel sits on the body (bind-pose position and main bone): the trunk and arms get
   the shirt, hips and legs the slacks, gloves become bare hands (and the glove bones shrink to hand size). He walks with the
   motion-captured walk and is posed procedurally for the rest: watching, breaking a clinch, counting over a knockdown, waving it off. */
const R3_REF_LOOK={skin:'#b98a66',hair:'short',hairColor:'#3a3430',beard:'none',trunks:'#17171b',trim:'#17171b',gloves:'#b98a66',shoes:'#121214',bt:'athletic',expr:'calm',
  shape:{jaw:1.05,chin:1,nose:1.05,cheek:1,brow:1.15}};
function r3refOn(){return !!(typeof THREE!=='undefined'&&Settings.sculpt&&R3M.ok('boxer'))}
/* bind-pose position and main bone of every texel, rasterised once from all the triangles */
function r3rigBodyMap(mk,R=256){const M=R3M.m[mk];if(M.bm)return M.bm;const g=M.geo,p=g.attributes.position.array,uv=g.attributes.uv.array,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,ix=g.index.array;
  const pos=new Float32Array(R*R*3),bone=new Uint8Array(R*R).fill(255);
  const top=v=>{let b=0,w=-1;for(let k=0;k<4;k++)if(sw[v*4+k]>w){w=sw[v*4+k];b=si[v*4+k]}return b};
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];
    const ax=uv[a*2]*R,ay=uv[a*2+1]*R,bx=uv[b*2]*R,by=uv[b*2+1]*R,cx=uv[c*2]*R,cy=uv[c*2+1]*R,den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-9)continue;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))-1),x1=Math.min(R-1,Math.ceil(Math.max(ax,bx,cx))+1),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))-1),y1=Math.min(R-1,Math.ceil(Math.max(ay,by,cy))+1);
    for(let y=y0;y<=y1;y++)for(let xx=x0;xx<=x1;xx++){const px=xx+.5,py=y+.5;const w0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den,w1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den,w2=1-w0-w1;
      if(w0<-.2||w1<-.2||w2<-.2)continue;const i=y*R+xx;if(bone[i]!==255&&Math.min(w0,w1,w2)<0)continue;
      for(let k=0;k<3;k++)pos[i*3+k]=w0*p[a*3+k]+w1*p[b*3+k]+w2*p[c*3+k];bone[i]=top(w0>=w1&&w0>=w2?a:w1>=w2?b:c)}}
  return M.bm={pos,bone,R}}
function r3refTex(){if(R3_RIG.refT)return R3_RIG.refT;const L=r3look(R3_REF_LOOK),N=512,{c,id}=r3rigPixels(L,N),d=id.data;
  const M=R3M.m.boxer,X=M.extras,J=X.joints,bm=r3rigBodyMap('boxer'),mk=M.mask,ms=mk.w/N,s=N/bm.R;
  const B=n=>X.bones.indexOf(n),arm=[B('shL'),B('shR'),B('elbowL'),B('elbowR')],trunk=[B('pelvis'),B('spine'),B('chest')],legs=[B('hipL'),B('hipR'),B('kneeL'),B('kneeR')];
  const neckY=J.shL[1]+.035,beltY=J.pelvis[1]+.08,shirt=[222,230,238],slack=[30,30,36],skinL=.299*0xb9+.587*0x8a+.114*0x66;
  const bowY=neckY-.035,collar=.022;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const m=mk.m[((y*ms)|0)*mk.w+((x*ms)|0)];if(m===2||m===5||m===7)continue;if(m===6){const i=(y*N+x)*4;d[i]=d[i+1]=18;d[i+2]=21;continue}
    const bi=((y/s)|0)*bm.R+((x/s)|0),b=bm.bone[bi];if(b===255)continue;const px=bm.pos[bi*3],py=bm.pos[bi*3+1],pz=bm.pos[bi*3+2],i=(y*N+x)*4;
    const l=.299*d[i]+.587*d[i+1]+.114*d[i+2];let o=null;
    const nk=neckY+(pz<-.04?.09:0);
    if(m===0){if(legs.includes(b)&&py<.6)o=slack}
    else if(m===3||m===9||m===4){o=py>beltY?shirt:slack}
    else if(arm.includes(b)||(trunk.includes(b)&&py<nk&&py>beltY))o=shirt;
    else if(legs.includes(b)||(trunk.includes(b)&&py<=beltY))o=slack;
    if(!o)continue;const k=m===1||m===8?clamp(.8+.22*l/skinL,.75,1.06):.95;
    let r=o[0]*k,g=o[1]*k,bl=o[2]*k;
    if(o===shirt){const dx=Math.abs(px),dy=py-bowY;
      if(pz>0&&dx<.075&&Math.abs(dy)<.012+dx*.32&&dx>.008)r=g=bl=22;                       // bow tie
      else if(pz>0&&dx<.012&&dy<0&&dy>-.5&&Math.abs((dy*40)%1)<.25)r=g=bl=60;               // buttons
      else if(py>nk-collar)r=g=bl=Math.min(255,250*k)}
    if(Math.abs(py-beltY)<.014){r=g=bl=14}                                    // collar band
    d[i]=r;d[i+1]=g;d[i+2]=bl}
  const x=c.getContext('2d');x.putImageData(id,0,0);const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.keep=1;
  return R3_RIG.refT={t,id}}
function r3referee(){const L=r3look(R3_REF_LOOK,{height:71}),bx=r3rigged(L,{texSize:512}),u=bx.userData,T=r3refTex();
  u.mat.map=T.t;u.mat.needsUpdate=true;u.tex=T;u.ref=true;
  for(const s of [1,-1])u.arms[s].glove.scale.setScalar(.4);
  const MI=r3rigMorph(u.mk),inf=u.mesh.morphTargetInfluences;inf[MI.bulk]=-.9;inf[MI.belly]=.7;
  r3rigExpr(bx,{lidOpen:.9,angry:.2});return bx}
/* procedural stances. mode: stand | count (n, phase) | wave (t) | break (two hand targets in world space) */
const _rv=[0,1,2,3].map(()=>new THREE.Vector3());
function r3refPose(bx,mode,o={}){const u=bx.userData,t=o.t||0;
  u.pelvis.position.set(0,u.legY-.11,0);u.pelvis.rotation.set(0,0,0);u.spine.rotation.set(o.lean||0,0,0);u.chest.rotation.set(0,0,0);u.headG.rotation.set(o.nod||0,o.look||0,0);
  for(const s of [-1,1]){const Lg=u.legs[s];Lg.hip.rotation.set(o.crouch?-.35:0,0,s*.06);Lg.knee.rotation.set(o.crouch?.55:0,0,0)}
  if(o.crouch)u.pelvis.position.y-=.12;
  bx.updateWorldMatrix(true,true);const W=(v,x,y,z)=>bx.localToWorld(v.set(x,y,z)),hy=u.hy0;
  for(const s of [-1,1]){let T,P;
    if(mode==='count'&&s===-1){const ph=o.phase||0,up=ph<.55?ph/.55:1-(ph-.55)/.45;T=W(_rv[0],-.42,hy-.8+up*.65,.6);P=W(_rv[1],-1.2,hy-1,-.2)}
    else if(mode==='wave'){const sw=Math.sin(t*9)*.32;T=W(_rv[0],s*(.18+sw*s),hy+.1,.35);P=W(_rv[1],s*1.2,hy-.4,-.4)}
    else if(mode==='break'&&o.hands){T=_rv[0].copy(o.hands[s>0?0:1]);P=W(_rv[1],s*1.2,hy-1.2,-.3)}
    else if(mode==='raise'&&s===-1){T=W(_rv[0],-.42,hy+.55,.08);P=W(_rv[1],-1.2,hy,-.5)}
    else{T=W(_rv[0],s*.3,hy-1.05,.05);P=W(_rv[1],s*.6,hy-.8,-.6)}
    r3ik(u.arms[s],T,P);u.arms[s].glove.rotation.set(0,0,0)}}
/* the referee in the fight: out of shot by the ropes until he's needed. He walks in to count over a knockdown, wave off a
   stoppage or break a clinch, then walks back. R is the fight renderer. */
const REF_HOME={x:-1.45,z:-1.05};
function r3refTick(R,dt){const f=R.f,bx=R.ref;if(!bx)return;const S=R.refS||(R.refS={x:REF_HOME.x,z:REF_HOME.z,yaw:.8,walk:0,P:new Float32Array(MC_F),t:0});S.t+=dt;
  let tx=REF_HOME.x,tz=REF_HOME.z,lx=0,lz=.6,mode='stand',o={t:S.t},fast=false;const c=f.count,res=f.res||{};
  if(f.phase==='down'&&c){if(c.d.side==='o'){tx=-.62;tz=-.75;lx=.1;lz=.1;o.lean=.2;o.nod=.3}else{tx=-.3;tz=-.1;lx=0;lz=2.6;o.lean=.22;o.nod=.15}
    mode='count';o.phase=c.t<0?.3:c.t}
  else if(f.ended&&['KO','TKO','RTD','DQ'].includes(res.method)){tx=-.8;tz=-.35;lx=0;lz=2.6;mode='wave'}
  else if(f.p.state==='clinch'||f.o.state==='clinch'||S.brk>0){if(f.p.state==='clinch'||f.o.state==='clinch')S.brk=.8;else S.brk-=dt;
    tx=-.5;tz=.05;lx=.6;lz=1.2;mode='break';fast=true;o.hands=[_rv[2].set(-.12,R.hyW-.45,.6),_rv[3].set(-.2,R.hyW-.4,1.3)]}
  const dx=tx-S.x,dz=tz-S.z,dist=Math.hypot(dx,dz),walking=dist>.06;
  if(walking){const st=Math.min(dist,(fast?3.4:2.3)*dt);S.x+=dx/dist*st;S.z+=dz/dist*st;S.yaw=r3turn(S.yaw,Math.atan2(dx,dz),dt*8)}
  else S.yaw=r3turn(S.yaw,Math.atan2(lx-S.x,lz-S.z),dt*6);
  bx.position.set(S.x,.1,S.z);bx.rotation.set(0,S.yaw,0);
  const C=R3MC.ready&&Settings.mocap&&R3MC.clips.walking;
  if(walking&&C){S.walk+=dt;r3mcSample(C,S.walk%C.dur,true,false,S.P);r3mcApply(bx,S.P,{clip:C,lift:0});bx.userData.chest.rotation.set(0,0,0);for(const s of [1,-1])bx.userData.arms[s].glove.rotation.set(0,0,0)}
  else{S.walk=0;r3refPose(bx,mode,o)}}
function r3turn(a,b,k){let d=((b-a)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;return a+d*Math.min(1,k)}
/* results: the referee beside the winner, holding their right hand up (fighter is the sculpted boxer on a live stage) */
function r3refRaise(ref,bx){const a=bx.userData.arms[-1],u=bx.userData;bx.updateWorldMatrix(true,true);
  const T=bx.localToWorld(_rv[2].set(-.36,u.hy0+.5,.12)),P=bx.localToWorld(_rv[3].set(-1.2,u.hy0-.6,-.4));r3ik(a,T,P);a.glove.rotation.set(0,0,0);
  r3refPose(ref,'stand',{look:-.15});const H=_rv[0].copy(T);H.y-=.12;const r=ref.userData;ref.updateWorldMatrix(true,true);
  r3ik(r.arms[1],H,ref.localToWorld(_rv[1].set(1.2,r.hy0-1.2,-.6)))}
