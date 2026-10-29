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
  const arms={};const sh=M.extras.shoulders||{L:[.44,1.2,0],R:[-.44,1.2,0]};
  for(const [h,s] of [['L',1],['R',-1]]){const g=M.parts['glove'+h],gb=r3partBox(g);const c=gb.getCenter(new THREE.Vector3()),top=gb.max.y;
    const gm=r3cel(0xffffff,M.tex,true,.9);gm.emissive=new THREE.Color(0);
    const glove=new THREE.Group();root.add(glove);const gmesh=r3mesh(g,gm,{olw:.004});gmesh.position.copy(c).multiplyScalar(-1);glove.add(gmesh);glove.position.copy(c);
    const elbow=r3mesh(new THREE.SphereGeometry(.068,14,10),null,{olw:.003});root.add(elbow);
    arms[s]={glove,gm,rest:c.clone(),wrist:top-c.y,sh:new THREE.Vector3(...sh[h]),tube:null,elbow,pole:null,top:null}}
  const tubeM=r3cel(0xffffff,r3conduitTex(),true,.8);for(const s of [1,-1])arms[s].elbow.material=r3cel(0x8a8a8a,null,true,.8);
  r3outline(root);
  root.userData={duncan:true,headM,core,waist:[W1,W2],headG,arms,legs:{},hy0:neckY+(hb.max.y-neckY)*.33,legY:0,tubeM,P:{}};
  r3duncanTubes(root);return root}
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
/* the conduit arms: shoulder -> elbow -> cuff. The elbow is placed by two-bone IK toward a pole (from the clip when there is one),
   the glove's cuff is turned to face the elbow so the cable always meets it, and the cable bends smoothly through an elbow joint */
const MC_DUN_SPRING=[.14,.78],MC_DUN_SEG=[.46,.44];
function r3duncanTubes(root){const u=root.userData;root.updateMatrixWorld(true);
  const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),toRoot=new THREE.Matrix4().copy(inv).multiply(u.core.matrixWorld);
  for(const s of [1,-1]){const A=u.arms[s];if(A.tube){root.remove(A.tube);A.tube.geometry.dispose()}
    const S=A.sh.clone().applyMatrix4(toRoot),G=A.glove.position.clone();
    const pole=(A.pole||new THREE.Vector3(s*.7,-.6,-.45)).clone().normalize();
    const elbowAt=W=>{const d=W.clone().sub(S),dist=d.length(),[l1,l2]=MC_DUN_SEG;d.normalize();const pp=pole.clone().addScaledVector(d,-pole.dot(d));if(pp.lengthSq()<1e-4)pp.set(s,0,0).addScaledVector(d,-d.x*s);pp.normalize();
      if(dist>=l1+l2*.999)return S.clone().addScaledVector(d,dist*l1/(l1+l2));const ca=clamp((l1*l1+dist*dist-l2*l2)/(2*l1*dist),-1,1);return S.clone().addScaledVector(d,ca*l1).addScaledVector(pp,Math.sqrt(1-ca*ca)*l1)};
    // first guess at the cuff (toward the shoulder), elbow from it, then the glove turned so its cuff points at the elbow
    let E=elbowAt(G.clone().addScaledVector(S.clone().sub(G).normalize(),A.wrist*.85));
    const cuff=E.clone().sub(G).normalize(),topRef=(A.top||new THREE.Vector3(s*.3,1,.25)).clone();
    r3mcAim(A.glove.quaternion,_mY,_mZ,cuff,topRef);A.glove.updateMatrixWorld(true);
    const W=new THREE.Vector3(0,A.wrist*.85,0).applyMatrix4(A.glove.matrixWorld).applyMatrix4(inv);E=elbowAt(W);
    A.elbow.position.copy(E);
    const pts=[S,S.clone().lerp(E,.5),E,E.clone().lerp(W,.5),W];
    const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'centripetal'),24,.05,10,false);
    if(!A.tube){A.tube=r3mesh(g,u.tubeM,{olw:.0032});A.tubeOL=new THREE.Mesh(g,r3outMat(.0032));A.tubeOL.userData.isOL=true;A.tube.add(A.tubeOL)}
    else{A.tube.geometry=g;A.tubeOL.geometry=g}
    root.add(A.tube)}}
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
  r3duncanBend(u,_dq.setFromEuler(_de.set(fwd*Math.PI/180*.8,tw*.9,-lean*.5+wob)),cr*.3+Math.sin(t*3.1)*.02);for(const s of [1,-1])u.arms[s].pole=u.arms[s].top=null;
  u.headG.rotation.set((o.hurt>0?.12:0)+Math.sin(t*2.3)*.03,0,-ht+wob*1.5);
  if(st==='down'){root.rotation.x=-rot*.75;root.position.y=.1+rot*.05}else root.rotation.set(0,0,0);
  root.updateMatrixWorld(true);
  for(const h of ['L','R']){const s=h==='L'?1:-1,A=u.arms[s],g2=h==='L'?raw.lg:raw.rg;if(!g2)continue;
    const T=new THREE.Vector3(g2[0]*.0056,-g2[1]*.0066+(u.hy0-2.22),.22+(g2[2]||0)*.78);
    if(st==='down')T.set(s*.6,.5,.4);
    A.glove.position.copy(T);const up=clamp((T.y-A.rest.y)/.6,0,1);A.glove.rotation.set(-1.25*up-(g2[2]||0)*.5,s*.15,s*-.1);
    const gw=glow&&glow[h]||0;A.gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');A.gm.emissiveIntensity=gw*.9}
  // wear: the valve head scuffs and darkens with damage
  const d=P.dmg||{},wear=clamp(((d.swellL||0)+(d.swellR||0)+(d.cheek||0))*.22+(P.cut||0)/220,0,.55);
  u.headM.color.setRGB(1-wear*.6,1-wear*.66,1-wear*.7);
  r3duncanTubes(root)}
/* portrait pose (guard kinds as for boxers: high, mid, low, down, punch, wave) */
function r3duncanGuard(bx,kind='high'){const u=bx.userData;const hy=u.hy0;
  const tgt=s=>kind==='down'?null:kind==='punch'&&s===1?new THREE.Vector3(.5,hy-.1,.9):kind==='wave'&&s===1?new THREE.Vector3(.6,hy+.35,.15):kind==='low'?new THREE.Vector3(s*.32,hy-.55,.35):kind==='mid'?new THREE.Vector3(s*.26,hy-.42,.4):new THREE.Vector3(s*.24,hy-.2,.35);
  for(const s of [1,-1]){const A=u.arms[s],T=tgt(s);if(T){A.glove.position.copy(T);A.glove.rotation.set(-1.15,s*.15,s*-.1)}else{A.glove.position.copy(A.rest);A.glove.rotation.set(0,0,0)}}
  r3duncanBend(u,_dq.setFromEuler(_de.set(.04,kind==='punch'?-.15:.08,0)),0);r3duncanTubes(bx)}
