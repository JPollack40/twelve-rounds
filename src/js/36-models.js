/* ================= external models: compact GLBs embedded in the build (R3M_DATA, base64) =================
   Read with a small GLB reader (one mesh: position, uv, indices, one image); the texture decodes asynchronously at boot and
   the model is used once it is ready. Until then the procedural boxer stands in. */
const R3M={m:{},v:0,
  init(){if(typeof THREE==='undefined'||typeof R3M_DATA==='undefined')return;for(const k in R3M_DATA){try{this.load(k,R3M_DATA[k])}catch(e){console.warn('model',k,e)}}},
  load(name,b64){const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;const dv=new DataView(bin);const jl=dv.getUint32(12,true);
    const J=JSON.parse(new TextDecoder().decode(new Uint8Array(bin,20,jl)));const bo=20+jl+8;
    const view=i=>{const v=J.bufferViews[i];return bin.slice(bo+(v.byteOffset||0),bo+(v.byteOffset||0)+v.byteLength)};
    const acc=(i,T,n)=>{const a=J.accessors[i];return new T(view(a.bufferView),0,a.count*n)};
    const pr=J.meshes[0].primitives[0],geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(acc(pr.attributes.POSITION,Float32Array,3),3));geo.setAttribute('uv',new THREE.BufferAttribute(acc(pr.attributes.TEXCOORD_0,Float32Array,2),2));
    geo.setIndex(new THREE.BufferAttribute(acc(pr.indices,Uint32Array,1),1));
    if(pr.attributes.JOINTS_0!=null){geo.setAttribute('skinIndex',new THREE.BufferAttribute(acc(pr.attributes.JOINTS_0,Uint8Array,4),4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(acc(pr.attributes.WEIGHTS_0,Float32Array,4),4))}
    if(pr.targets){geo.morphAttributes.position=pr.targets.map(t=>new THREE.BufferAttribute(acc(t.POSITION,Float32Array,3),3));geo.morphTargetsRelative=true}
    const M={geo,extras:J.meshes[0].extras||{},tex:null,img:null,mask:null,parts:{},wait:J.images.length};this.m[name]=M;
    // one geometry per part (shared attributes, its own index range), normals smoothed across UV seams
    for(const [p,[st,ct]] of Object.entries(M.extras.parts||{})){const g=new THREE.BufferGeometry();g.setAttribute('position',geo.attributes.position);g.setAttribute('uv',geo.attributes.uv);
      g.setIndex(new THREE.BufferAttribute(geo.index.array.slice(st,st+ct),1));g.userData.keep=1;M.parts[p]=g}
    r3smoothNormals(geo);for(const g of Object.values(M.parts))g.setAttribute('normal',geo.attributes.normal);
    geo.computeBoundingSphere();geo.userData.keep=1;
    // image 0 is the colour texture; an image named "mask" holds per-texel material ids (read back once for recolouring)
    J.images.forEach((im,i)=>{const url=URL.createObjectURL(new Blob([view(im.bufferView)],{type:im.mimeType})),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);
        if(im.name==='mask'){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
          const m=new Uint8Array(c.width*c.height);for(let k=0;k<m.length;k++)m[k]=d[k*4];M.mask={w:c.width,h:c.height,m}}
        else{const t=new THREE.Texture(img);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;t.userData.keep=1;M.tex=t;M.img=img}
        if(--M.wait===0)this.v++};
      img.src=url})},
  ok(name){return !!(this.m[name]&&this.m[name].wait===0)}};
/* normals averaged over vertices that share a position (UV seams split them), so cel bands stay smooth */
/* bounding box over the vertices a part's index actually uses (parts share one position buffer) */
function r3partBox(g){const p=g.attributes.position,ix=g.index.array,b=new THREE.Box3(),v=new THREE.Vector3();for(let i=0;i<ix.length;i++){v.fromBufferAttribute(p,ix[i]);b.expandByPoint(v)}return b}
function r3smoothNormals(geo){geo.computeVertexNormals();const p=geo.attributes.position,n=geo.attributes.normal,map=new Map(),k=i=>`${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for(let i=0;i<p.count;i++){const key=k(i);let a=map.get(key);if(!a){a=[0,0,0,[]];map.set(key,a)}a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);a[3].push(i)}
  for(const [x,y,z,ids] of map.values()){const l=Math.hypot(x,y,z)||1;for(const i of ids)n.setXYZ(i,x/l,y/l,z/l)}n.needsUpdate=true}
/* ---------- Duncan V.: a valve-headed robot on a spring. Head and body ride a core that leans and squashes; the gloves are
   free parts that follow the game's hand targets; the flexible conduit arms are rebuilt each frame between shoulder and glove ---------- */
function r3conduitTex(){if(R3D._cond)return R3D._cond;const c=document.createElement('canvas');c.width=256;c.height=32;const x=c.getContext('2d');x.fillStyle='#9c9c9c';x.fillRect(0,0,256,32);
  for(let i=0;i<256;i+=8){x.fillStyle='rgba(30,30,30,.55)';x.fillRect(i,0,2,32);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(i+3,0,2,32)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,1);t.colorSpace=THREE.SRGBColorSpace;t.userData.keep=1;return R3D._cond=t}
function r3duncan(L){
  const M=R3M.m.duncan,root=new THREE.Group();
  const mat=r3cel(0xffffff,M.tex,true,.9);
  // the spring is a three-bone chain (base, middle, top = his waist), so bends spread along the coil while the base stays planted;
  // the canister, head and shoulders ride the top bone through 'core', whose local space is the model's rest space
  const W0=new THREE.Bone(),W1=new THREE.Bone(),W2=new THREE.Bone();W0.position.y=MC_DUN_SPRING[0];W1.position.y=W2.position.y=(MC_DUN_SPRING[1]-MC_DUN_SPRING[0])/2;
  W0.add(W1);W1.add(W2);root.add(W0);const core=new THREE.Group();core.position.y=-MC_DUN_SPRING[1];W2.add(core);
  const body=new THREE.SkinnedMesh(r3duncanBodyGeo(M),mat);body.castShadow=body.receiveShadow=true;body.frustumCulled=false;body.userData.olw=.0042;root.add(body);
  root.updateMatrixWorld(true);body.bind(new THREE.Skeleton([W0,W1,W2]));
  const hb=r3partBox(M.parts.head);const neckY=hb.min.y;const headG=new THREE.Group();headG.position.y=neckY;core.add(headG);
  const headM=r3cel(0xffffff,M.tex,true,.9);headM.emissive=new THREE.Color(0);const head=r3mesh(M.parts.head,headM,{olw:.0042});head.position.y=-neckY;headG.add(head);
  // arms: a skinned conduit cable on shoulder, elbow and hand bones (bending at a ball joint midway), and the glove fixed to the hand
  // bone with its cuff on the cable's end, so the two can never come apart. At rest the arm hangs straight down (the same convention the
  // boxers' arms use), so the motion-capture and IK code drive these bones exactly as they drive a boxer's.
  const arms={};const sh=M.extras.shoulders||{L:[.44,1.2,0],R:[-.44,1.2,0]},[l1,l2]=MC_DUN_SEG;
  const tubeM=r3cel(0xffffff,r3conduitTex(),true,.8),ballM=r3cel(0x8a8a8a,null,true,.8);
  root.updateMatrixWorld(true);
  for(const [h,s] of [['L',1],['R',-1]]){const g=M.parts['glove'+h],S=new THREE.Vector3(...sh[h]);
    const gm=r3cel(0xffffff,M.tex,true,.9);gm.emissive=new THREE.Color(0);
    const shB=new THREE.Bone(),elB=new THREE.Bone(),hB=new THREE.Bone();shB.position.copy(S);core.add(shB);elB.position.y=-l1;shB.add(elB);hB.position.y=-l2;elB.add(hB);
    const gf=r3duncanGloveFrame(g),cuffM=gf.cuff.clone().add(gf.fist),q0=r3mcAim(new THREE.Quaternion(),gf.axis,_mZ,_mDOWN,_mZ);
    const gmesh=r3mesh(g,gm,{olw:.004});gmesh.quaternion.copy(q0);gmesh.position.copy(cuffM).applyQuaternion(q0).negate();hB.add(gmesh);
    const fist=new THREE.Object3D();fist.position.copy(gf.fist).sub(cuffM).applyQuaternion(q0);hB.add(fist);
    const shoulder=r3mesh(new THREE.SphereGeometry(.085,14,10),ballM,{olw:.003});shB.add(shoulder);
    const elbow=r3mesh(new THREE.SphereGeometry(.07,14,10),ballM,{olw:.003});elB.add(elbow);
    // the cable: a cylinder from the shoulder down past the cuff, weighted shoulder -> elbow -> hand with short blends at the joints
    const Lt=l1+l2+.16,cg=new THREE.CylinderGeometry(.058,.058,Lt,10,30,true);cg.translate(S.x,S.y-Lt/2,S.z);
    const n=cg.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){const d=S.y-cg.attributes.position.getY(i),a=clamp((d-(l1-.06))/.12,0,1),b=clamp((d-(l1+l2-.03))/.06,0,1);
      si.set([0,1,2,0],i*4);sw.set([1-a,a*(1-b),a*b,0],i*4)}
    cg.setAttribute('skinIndex',new THREE.BufferAttribute(si,4));cg.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));
    const cable=new THREE.SkinnedMesh(cg,tubeM);cable.castShadow=true;cable.frustumCulled=false;cable.userData.olw=.0032;root.add(cable);
    root.updateMatrixWorld(true);cable.bind(new THREE.Skeleton([shB,elB,hB]));
    arms[s]={sh:shB,elbow:elB,hand:hB,glove:fist,gm,S,L1:l1,L2:fist.position.clone().add(new THREE.Vector3(0,-l2,0)).length(),Lf:fist.position.length()}}
  r3outline(root);
  root.userData={duncan:true,headM,core,waist:[W1,W2],headG,arms,legs:{},hy0:neckY+(hb.max.y-neckY)*.33,legY:0,P:{}};
  r3duncanGuard(root,'down');return root}
/* his skinned spring: weights fade from the base bone to the middle and top bones up the coil; everything above is the top bone */
function r3duncanBodyGeo(M){if(M.dbody)return M.dbody;const g=new THREE.BufferGeometry(),pos=M.geo.attributes.position,n=pos.count;
  for(const k of ['position','uv','normal'])g.setAttribute(k,M.geo.attributes[k]);g.setIndex(M.parts.body.index);
  const si=new Uint16Array(n*4),sw=new Float32Array(n*4),[y0,y1]=MC_DUN_SPRING;
  for(let i=0;i<n;i++){const t=clamp((pos.getY(i)-y0)/(y1-y0),0,1);const w0=Math.max(0,1-2*t),w2=Math.max(0,2*t-1),w1=1-w0-w2;si.set([0,1,2,0],i*4);sw.set([w0,w1,w2,0],i*4)}
  g.setAttribute('skinIndex',new THREE.BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));g.userData.keep=1;return M.dbody=g}
/* lean, twist and squash at the waist: half the turn in each spring bone; the coil shortens as he dips */
const _dq=new THREE.Quaternion(),_de=new THREE.Euler();
function r3duncanBend(u,q,squash=0){const half=(MC_DUN_SPRING[1]-MC_DUN_SPRING[0])/2*(1-clamp(squash,-.2,.45)*.45);
  for(const b of u.waist){b.quaternion.identity().slerp(q,.5);b.position.y=half}}
/* the glove's own frame, from its geometry: the cable stub (centre of the top cap), the fist (centre of the lower part), the axis between */
function r3duncanGloveFrame(g){const p=g.attributes.position,ix=[...new Set(g.index.array)],v=new THREE.Vector3();let y0=9,y1=-9;
  for(const i of ix){const y=p.getY(i);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  const avg=f=>{const a=new THREE.Vector3();let n=0;for(const i of ix){v.fromBufferAttribute(p,i);if(f(v)){a.add(v);n++}}return a.multiplyScalar(1/Math.max(1,n))};
  // the sleeve's own axis (top opening toward a slice lower down), which the cable continues; the fist hangs off it at an angle
  // centres of the opening and of a slice lower down are taken from their bounding boxes (the rim is ragged and unevenly meshed)
  const ctr=f=>{const bb=new THREE.Box3();for(const i of ix){v.fromBufferAttribute(p,i);if(f(v))bb.expandByPoint(v)}return bb.getCenter(new THREE.Vector3())};
  const cuff=ctr(q=>q.y>y1-.1),slice=ctr(q=>q.y<y1-.16&&q.y>y1-.28),fist=avg(q=>q.y<y0+(y1-y0)*.42);
  return {cuff:cuff.clone().sub(fist),fist,axis:slice.clone().sub(cuff).normalize(),Lg:cuff.distanceTo(fist)}}
/* his body as a stack of discs in core space (spring, canister, valve head): elbows, gloves and cable are kept outside it */
const MC_DUN_SPRING=[.14,.78],MC_DUN_SEG=[.34,.3],MC_DUN_BODY=[[0,.2,.33],[.2,.78,.23],[.78,1.34,.43],[1.34,2.5,.33]];
function r3duncanPush(p,m){for(const [y0,y1,r] of MC_DUN_BODY){if(p.y<y0-m*.5||p.y>y1+m*.5)continue;const dz=p.z+.03,d=Math.hypot(p.x,dz),need=r+m;
    if(d<need){if(d<1e-4){p.z=need-.03;return p}p.x*=need/d;p.z=dz*need/d-.03}}return p}
/* the same, but out the front: a fist or elbow inside him comes forward to his surface instead of being shoved sideways */
function r3duncanPushFwd(p,m){for(const [y0,y1,r] of MC_DUN_BODY){if(p.y<y0-m*.6||p.y>y1+m*.6)continue;const need=r+m;if(Math.abs(p.x)>=need)continue;
    const zf=Math.sqrt(need*need-p.x*p.x)-.03;if(p.z>-.03&&p.z<zf)p.z=zf;else if(p.z<=-.03&&Math.hypot(p.x,p.z+.03)<need)p.z=zf}return p}
/* the arms are skinned now: nothing to rebuild per frame (kept for callers) */
function r3duncanTubes(root){root.updateMatrixWorld(true)}
/* classic posing and portraits: reach a fist target (root space) by two-bone IK, elbow down and out, the glove continuing the forearm */
const _dv=[0,1,2].map(()=>new THREE.Vector3());
function r3duncanReach(root,s,T){const u=root.userData,A=u.arms[s];root.updateMatrixWorld(true);
  const tw=_dv[0].copy(T).applyMatrix4(root.matrixWorld),sw=A.sh.getWorldPosition(_dv[1]);
  const pole=_dv[2].set(s*.6,-1.2,-.3).applyQuaternion(root.getWorldQuaternion(_mq[5])).add(sw);
  const arm={sh:A.sh,elbow:A.elbow,L1:A.L1,L2:A.L2};r3ik(arm,tw,pole);A.hand.quaternion.identity();root.updateMatrixWorld(true)}
/* fight pose: same inputs as the boxer (raw 2D pose P, opponent state) */
function r3duncanPose(R,P,glow){const f=R.f,o=f.o,root=R.opp,u=root.userData,t=f.time;
  const raw=P._raw||P,lean=raw.lean||0,cr=raw.crouch||0,tw=raw.twist||0,ht=raw.headTilt||0,rot=raw.rot||0,st=o.state,k=o.dur?clamp(o.t/o.dur,0,1):0;
  const closeness=(raw.scale||1)-1;root.position.set((raw.hip?raw.hip[0]:0)*.004,.1,.2+closeness*1.7);
  // motion capture drives him too (except the knockdown, which keeps its spring topple)
  if(r3mcOn(u)&&r3mcDrive(R,P)){root.rotation.set(0,0,0);
    for(const h of ['L','R']){const A=u.arms[h==='L'?1:-1],gw=glow&&glow[h]||0;A.gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');A.gm.emissiveIntensity=gw*.9}
    const d=P.dmg||{},wear=clamp(((d.swellL||0)+(d.swellR||0)+(d.cheek||0))*.22+(P.cut||0)/220,0,.55);u.headM.color.setRGB(1-wear*.6,1-wear*.66,1-wear*.7);
    return r3duncanTubes(root)}
  u.headG.quaternion.identity();
  let fwd=0;if(st==='wind')fwd=-5*k;else if(st==='act')fwd=14;else if(st==='rec')fwd=14*(1-k);if(st==='stagger')fwd=-14;if(st==='clinch')fwd=12;
  const wob=o.hurt>0&&st!=='down'?Math.sin(t*9)*.08:0;
  r3duncanBend(u,_dq.setFromEuler(_de.set(fwd*Math.PI/180*.8,tw*.9,-lean*.5+wob)),cr*.3+Math.sin(t*3.1)*.02);
  u.headG.rotation.set((o.hurt>0?.12:0)+Math.sin(t*2.3)*.03,0,-ht+wob*1.5);
  if(st==='down'){root.rotation.x=-rot*.75;root.position.y=.1+rot*.05}else root.rotation.set(0,0,0);
  root.updateMatrixWorld(true);
  for(const h of ['L','R']){const s=h==='L'?1:-1,A=u.arms[s],g2=h==='L'?raw.lg:raw.rg;if(!g2)continue;
    const T=new THREE.Vector3(g2[0]*.0056,-g2[1]*.0066+(u.hy0-2.22),.22+(g2[2]||0)*.78);
    if(st==='down')T.set(s*.6,.5,.4);
    r3duncanReach(root,s,T);
    const gw=glow&&glow[h]||0;A.gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');A.gm.emissiveIntensity=gw*.9}
  // wear: the valve head scuffs and darkens with damage
  const d=P.dmg||{},wear=clamp(((d.swellL||0)+(d.swellR||0)+(d.cheek||0))*.22+(P.cut||0)/220,0,.55);
  u.headM.color.setRGB(1-wear*.6,1-wear*.66,1-wear*.7);
  r3duncanTubes(root)}
/* portrait pose (guard kinds as for boxers: high, mid, low, down, punch, wave) */
function r3duncanGuard(bx,kind='high'){const u=bx.userData;const hy=u.hy0;
  r3duncanBend(u,_dq.setFromEuler(_de.set(.04,kind==='punch'?-.15:.08,0)),0);
  const tgt=s=>kind==='down'?null:kind==='punch'&&s===1?new THREE.Vector3(.55,hy-.15,1.1):kind==='wave'&&s===1?new THREE.Vector3(.7,hy+.4,.25):kind==='low'?new THREE.Vector3(s*.42,hy-.65,.6):kind==='mid'?new THREE.Vector3(s*.34,hy-.45,.65):new THREE.Vector3(s*.32,hy-.2,.6);
  for(const s of [1,-1]){const A=u.arms[s],T=tgt(s);if(T)r3duncanReach(bx,s,T);else{A.sh.quaternion.setFromEuler(_de.set(0,0,s*.12));A.elbow.quaternion.setFromEuler(_de.set(-.25,0,0));A.hand.quaternion.identity()}}
  bx.updateMatrixWorld(true)}
