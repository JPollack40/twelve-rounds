/* ================= sculpted boxer: the base model, auto-rigged offline (tools/rig_boxer.py) =================
   Its bones carry the procedural boxer's joint names (pelvis, spine, chest, headG, sh/elbow/glove, hip/knee) and the same
   rest conventions (upper arm and forearm hang along -y in their own frames), so the existing fight, guard and IK code drives it
   unchanged. The texture is recoloured per fighter through a material mask; fights add eye swelling (morph targets) and
   bruises and cuts painted onto the face. */
const R3_RIG={};
const r3rigKey=L=>L.fem?'boxer_f':'boxer';
function r3rigOn(L){return !!(Settings.sculpt&&!L.model&&R3M.ok(r3rigKey(L)))}
/* recolour the base texture for a look: skin, hair (or bald scalp), trunks, waistband, gloves and boots follow the fighter */
function r3rigPixels(L,size){
  const M=R3M.m[r3rigKey(L)],X=M.extras,ref=X.ref,c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.drawImage(M.img,0,0,size,size);
  const id=x.getImageData(0,0,size,size),d=id.data,mk=M.mask,ms=mk.w/size;
  const rgb=h=>{const n=new THREE.Color(h).getHex();return [n>>16&255,n>>8&255,n&255]},lum=a=>.299*a[0]+.587*a[1]+.114*a[2];
  const skin=rgb(L.skin),hair=rgb(L.hairColor),tr=rgb(L.trunks),trim=rgb(L.trim),gl=rgb(L.gloves),boot=rgb(L.shoes||'#'+new THREE.Color(L.trim).lerp(new THREE.Color(0x2a2426),.35).getHexString());
  const ls=lum(ref.skin);
  const lh=lum(ref.hair),lb=lum(ref.band),lg=lum(ref.glove),lt=lum(ref.trunks),lto=ref.top?lum(ref.top):0,lbt=lum(ref.boot),bald=L.hair==='bald'||L.hair==='none';
  // shaved sides (mohawk) and buzz cuts tint the painted hair toward the scalp; cornrows show scalp between rows
  // any fitted style brings its own hair: the painted hair under it turns to scalp, so no painted hairline peeks out below the new one
  const nat=r3rigNative(L),sh=nat||bald?0:L.hair==='buzz'?.38:L.hair==='braids'?.3:.82;const hair0=hair.slice();
  for(let y=0;y<size;y++){const row=((y*ms)|0)*mk.w;
    for(let xx=0;xx<size;xx++){const i=(y*size+xx)*4,m=mk.m[row+((xx*ms)|0)];if(m===0||m===7)continue;
      const r=d[i],g=d[i+1],b=d[i+2],l=.299*r+.587*g+.114*b;let o;
      if(m===1||m===8){const k=m===8?clamp(1+.9*(l/ls-1),.3,1.35):clamp(1+.5*(l/ls-1),.55,1.35);o=[skin[0]*k,skin[1]*k,skin[2]*k]}
      else if(m===2){if(bald||sh){const k=clamp(.8+.08*l/lh,.78,.96),q=bald?1:sh;o=[skin[0]*k*q+hair0[0]*.55*(1-q),skin[1]*k*q+hair0[1]*.55*(1-q),skin[2]*k*q+hair0[2]*.55*(1-q)]}else o=[hair[0]*.35+hair[0]*.75*l/lh,hair[1]*.35+hair[1]*.75*l/lh,hair[2]*.35+hair[2]*.75*l/lh]}
      else if(m===3||m===9){const k=clamp(.82+(l-(m===9?lto:lt))/70,.7,1.25);o=[tr[0]*k,tr[1]*k,tr[2]*k]}
      else if(m===4){const k=clamp(l/lb,.55,1.2);o=[trim[0]*k,trim[1]*k,trim[2]*k]}
      else if(m===5){const rd=r-(g+b)/2,k=rd<30?(l<40?.82:.92):clamp(.6+.4*l/lg,.6,1.3);o=[gl[0]*k,gl[1]*k,gl[2]*k]}
      else if(m===6){const k=clamp(.8+(l-lbt)/90,.5,1.4);o=[boot[0]*k,boot[1]*k,boot[2]*k]}
      else continue;
      d[i]=o[0]>255?255:o[0];d[i+1]=o[1]>255?255:o[1];d[i+2]=o[2]>255?255:o[2]}}
  x.putImageData(id,0,0);
  const fp=r3rigFacePaint(L,size);if(fp){x.drawImage(fp,0,0,size,size);return {c,id:x.getImageData(0,0,size,size)}}
  return {c,id}}
function r3rigTex(L,size=1024){
  const key=[size,r3rigKey(L),L.skin,L.hairColor,L.hair,L.beard,L.scar,L.trunks,L.trim,L.gloves,L.shoes].join('|');R3_RIG.tex=R3_RIG.tex||new Map();
  const hit=R3_RIG.tex.get(key);if(hit){R3_RIG.tex.delete(key);R3_RIG.tex.set(key,hit);return hit}
  const {c,id}=r3rigPixels(L,size);const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.keep=1;
  const e={t,id};R3_RIG.tex.set(key,e);
  if(R3_RIG.tex.size>6){const [k0,e0]=R3_RIG.tex.entries().next().value;R3_RIG.tex.delete(k0);e0.t.dispose()}
  return e}
/* glove glow for tells: the skinned gloves share one material, so each glove carries an additive halo that reads like the emissive glow */
function r3rigGlow(bone){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:r3spriteTex(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));
  sp.scale.setScalar(.75);sp.position.set(0,0,.06);bone.add(sp);
  const gm={emissive:new THREE.Color(0),_i:0,get emissiveIntensity(){return this._i},set emissiveIntensity(v){this._i=v;sp.material.opacity=Math.min(1,v*1.1);sp.material.color.copy(this.emissive);sp.visible=v>0}};
  sp.visible=false;return gm}
function r3rigged(L,opt={}){
  const mk=r3rigKey(L),M=R3M.m[mk],X=M.extras,J=X.joints,V=a=>new THREE.Vector3(a[0],a[1],a[2]),DOWN=new THREE.Vector3(0,-1,0);
  const root=new THREE.Group();root.scale.setScalar(1+((L.height||70)-70)*.011);
  const B={};for(const b of X.bones){B[b]=new THREE.Bone();B[b].name=b}
  for(const b of X.bones){const p=X.parent[b];B[b].position.copy(V(J[b])).sub(p?V(J[p]):new THREE.Vector3());if(p)B[p].add(B[b])}
  root.add(B.pelvis);
  // arms: aim each segment's -y along the bone so the IK's rest convention holds
  const arms={};
  for(const [h,s] of [['L',1],['R',-1]]){const sh=B['sh'+h],el=B['elbow'+h],gl=B['glove'+h];
    const S=V(J['sh'+h]),E=V(J['elbow'+h]),G=V(J['glove'+h]),L1=E.distanceTo(S),L2=G.distanceTo(E);
    sh.quaternion.setFromUnitVectors(DOWN,E.clone().sub(S).normalize());
    const inv1=sh.quaternion.clone().invert();el.position.set(0,-L1,0);
    el.quaternion.setFromUnitVectors(DOWN,G.clone().sub(E).normalize().applyQuaternion(inv1));gl.position.set(0,-L2,0);
    arms[s]={sh,elbow:el,glove:gl,gm:r3rigGlow(gl),L1,L2}}
  const legs={};for(const [h,s] of [['L',1],['R',-1]])legs[s]={hip:B['hip'+h],knee:B['knee'+h]};
  // body type: shoulder width moves the shoulder joints; muscle and belly are morph targets (applied before skinning, so no shear)
  const BT=R3_RIG_BT[L.bt]||R3_RIG_BT.athletic,mass=L.mass||1;
  for(const h of ['L','R'])B['sh'+h].position.x*=BT.sh;
  const wd=BT.w*(1+(mass-1)*.5);root.scale.x*=wd;root.scale.z*=wd;
  const big=opt.texSize||1024,T=r3rigTex(L,big);
  const mat=r3cel(0xffffff,T.t,false,1);
  const mesh=new THREE.SkinnedMesh(M.geo,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.olw=.0042;root.add(mesh);
  const MI=r3rigMorph(mk),inf=mesh.morphTargetInfluences;inf[MI.bulk]=(BT.bulk+(mass-1)*3)*(L.fem?.7:1);inf[MI.belly]=BT.belly;
  root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(X.bones.map(b=>B[b])));
  // head centre marker (portrait framing and hit flashes aim here)
  const eyeY=(X.eyes.L[1]+X.eyes.R[1])/2,hc=new THREE.Object3D();hc.position.set(0,eyeY-J.headG[1],0);B.headG.add(hc);
  // walkout robes are cut for the procedural athletic body: proxies map its spine and head space onto this one
  if(opt.robe&&L.robe){const P0=R3_BT.athletic,TS=R3_TS,sy=(J.shL[1]-J.spine[1])/(.64*TS),sx=J.shL[0]/P0.sh;
    const fit=R3_ROBE[L.robe]&&R3_ROBE[L.robe].fit,rs=new THREE.Group();rs.scale.set(sx*(fit?1.24:1.04),sy,sx*(fit?1.32:1.12));rs.position.z=.01;B.spine.add(rs);
    const rh=new THREE.Group();rh.position.set(0,eyeY-J.headG[1]-.02,0);rh.scale.setScalar(1.04);B.headG.add(rh);
    r3robe(L,P0,1,{spine:rs,headG:rh,arms,al:arms[1].L1/.44})}
  // hair geometry (the procedural styles, fitted to this scalp), eyelids and a mouth cavity for expressions
  const HF=r3rigHead(mk),hg=new THREE.Group();hg.position.set(HF.C.x-J.headG[0],HF.C.y-J.headG[1],HF.C.z-J.headG[2]);hg.scale.setScalar(HF.k);B.headG.add(hg);
  const nat=r3rigNative(L);if(!nat&&L.hair&&!['bald','none'].includes(L.hair))r3hair(hg,L,HF.cap,.22,HF.S);
  if(MI.tail!=null)inf[MI.tail]=nat?0:1;
  const face=r3rigFaceRig(L,hg,HF,T);
  r3outline(root);
  root.userData={rig:true,mk,pelvis:B.pelvis,spine:B.spine,chest:B.chest,headG:B.headG,hc,head:null,face,arms,legs,mesh,mat,tex:T,P:R3_BT.athletic,legY:J.pelvis[1]+.11,hy0:eyeY};
  return root}
/* fight face: eye swelling grows the morph targets; bruising, cuts and sweat are painted onto this fight's own copy of the texture */
function r3rigFace(R,P){const u=R.opp.userData,d=P.dmg||{};
  const inf=u.mesh.morphTargetInfluences,MI=r3rigMorph(u.mk);inf[MI.swellL]=Math.min(1,(d.swellL||0)*1.1);inf[MI.swellR]=Math.min(1,(d.swellR||0)*1.1);
  const key=[Math.round((d.swellL||0)*5),Math.round((d.swellR||0)*5),Math.round((d.cheek||0)*4),Math.round((P.cut||0)/12),Math.min(5,P.sweat||0)].join(',');
  if(key===R.texKey)return;R.texKey=key;
  if(!R.rigC){const src=u.tex,c=document.createElement('canvas');c.width=c.height=Math.sqrt(src.id.data.length/4);R.rigC=c;
    const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;u.mat.map=t;u.mat.needsUpdate=true;R.rigT=t}
  const c=R.rigC,x=c.getContext('2d'),N=c.width;x.putImageData(u.tex.id,0,0);
  const ov=r3rigDamage(u.mk,d,P.cut||0);if(ov){x.imageSmoothingEnabled=true;x.drawImage(ov,0,0,N,N)}
  R.rigT.needsUpdate=true}
/* where each head texel sits on the model (bind pose, game units), rasterised once from the head and neck triangles */
const R3_HM=512;
function r3rigHeadMap(mk){const M=R3M.m[mk];if(M.hm)return M.hm;const g=M.geo,p=g.attributes.position.array,uv=g.attributes.uv.array,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,ix=g.index.array;
  const hb=M.extras.bones.indexOf('headG'),R=R3_HM,pos=new Float32Array(R*R*3),has=new Uint8Array(R*R),hw=new Float32Array(R*R);
  const head=i=>{for(let k=0;k<4;k++)if(si[i*4+k]===hb&&sw[i*4+k]>.25)return true;return false},wt=i=>{for(let k=0;k<4;k++)if(si[i*4+k]===hb)return sw[i*4+k];return 0};
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(!head(a)&&!head(b)&&!head(c))continue;
    const ax=uv[a*2]*R,ay=uv[a*2+1]*R,bx=uv[b*2]*R,by=uv[b*2+1]*R,cx=uv[c*2]*R,cy=uv[c*2+1]*R,den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-9)continue;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))-1),x1=Math.min(R-1,Math.ceil(Math.max(ax,bx,cx))+1),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))-1),y1=Math.min(R-1,Math.ceil(Math.max(ay,by,cy))+1);
    for(let y=y0;y<=y1;y++)for(let xx=x0;xx<=x1;xx++){const px=xx+.5,py=y+.5;const w0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den,w1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den,w2=1-w0-w1;
      if(w0<-.15||w1<-.15||w2<-.15)continue;const i=y*R+xx;if(has[i]&&Math.min(w0,w1,w2)<0)continue;has[i]=1;
      for(let k=0;k<3;k++)pos[i*3+k]=w0*p[a*3+k]+w1*p[b*3+k]+w2*p[c*3+k];hw[i]=w0*wt(a)+w1*wt(b)+w2*wt(c)}}
  const list=[];for(let i=0;i<R*R;i++)if(has[i])list.push(i);return M.hm={pos,hw,list:Uint32Array.from(list)}}
/* bruising around each eye and cheek, a red nose, and a cut over the left brow with a trickle of blood, painted by distance on the surface */
function r3rigDamage(mk,d,cut){const eL=d.swellL||0,eR=d.swellR||0,ch=d.cheek||0;if(eL+eR+ch<.04&&cut<=0)return null;
  const hm=r3rigHeadMap(mk),S=R3M.m[mk].extras.spots,R=R3_HM;R3_RIG.ov=R3_RIG.ov||document.createElement('canvas');const c=R3_RIG.ov;c.width=c.height=R;const x=c.getContext('2d'),id=x.createImageData(R,R),o=id.data;
  const g=(i,s,sg)=>{const dx=hm.pos[i*3]-s[0],dy=hm.pos[i*3+1]-s[1],dz=hm.pos[i*3+2]-s[2];return Math.exp(-(dx*dx+dy*dy+dz*dz)/(2*sg*sg))};
  const b0=S.browL0,b1=S.browL1,bd=[b1[0]-b0[0],b1[1]-b0[1],b1[2]-b0[2]],bl=bd[0]*bd[0]+bd[1]*bd[1]+bd[2]*bd[2],ca=Math.min(1,cut/40),mid=[(b0[0]+b1[0])/2,(b0[1]+b1[1])/2,(b0[2]+b1[2])/2];
  for(const i of hm.list){const pi=i*3;
    const bru=Math.min(.82,eL*.85*g(i,S.eyeL,.026)+eR*.85*g(i,S.eyeR,.026)),red=Math.min(.6,ch*.5*(g(i,S.cheekL,.03)+g(i,S.cheekR,.03))+ch*.35*g(i,S.nose,.016));
    let r=0,gg=0,b=0,a=0;
    if(bru>.01){r=104;gg=38;b=66;a=bru}
    if(red>.01){const t=red/(a+red);r=r*(1-t)+165*t;gg=gg*(1-t)+52*t;b=b*(1-t)+52*t;a=Math.min(.85,a+red*(1-a))}
    if(cut>0){const px=hm.pos[pi]-b0[0],py=hm.pos[pi+1]-b0[1],pz=hm.pos[pi+2]-b0[2];const t=clamp((px*bd[0]+py*bd[1]+pz*bd[2])/bl,0,1);
      const dx=px-bd[0]*t,dy=py-bd[1]*t,dz=pz-bd[2]*t,dd=Math.sqrt(dx*dx+dy*dy+dz*dz);
      const w=.0035+.003*ca,k=dd<w?1:Math.exp(-(((dd-w)/.004)**2));
      // blood runs down from the middle of the cut once it is bad
      const ty=mid[1]-hm.pos[pi+1],tx=Math.abs(hm.pos[pi]-mid[0]-.004*Math.sin(ty*90)),run=cut>20&&ty>0&&ty<.09*ca&&tx<.005&&hm.pos[pi+2]>mid[2]-.03?.75*(1-ty/(.09*ca+1e-6)):0;
      const ca2=Math.max(k*(.6+.4*ca),run);if(ca2>.02){const t=ca2/(a+ca2);r=r*(1-t)+120*t;gg=gg*(1-t)+8*t;b=b*(1-t)+14*t;a=Math.min(.95,a+ca2*(1-a))}}
    if(a>0){const j=i*4;o[j]=r;o[j+1]=gg;o[j+2]=b;o[j+3]=a*255}}
  x.putImageData(id,0,0);return c}

const R3_RIG_BT={lanky:{w:.93,sh:.96,bulk:-.45,belly:0},athletic:{w:1,sh:1,bulk:0,belly:0},brawler:{w:1.05,sh:1.04,bulk:1,belly:0},anvil:{w:1.1,sh:1.06,bulk:1.5,belly:1}};
function r3rigMorph(mk){const M=R3M.m[mk];if(!M.mi){M.mi={};(M.extras.morphs||['swellL','swellR']).forEach((k,i)=>M.mi[k]=i)}return M.mi}
/* ---------- fitting the procedural head layout to the sculpted head ----------
   A radial map of the scalp around a head centre (rays cast inward from outside) gives the surface in any direction; the
   procedural head's (angle, latitude) layout is warped so its eyes, mouth and chin land on this face. Hair styles, beards,
   scars and eyelids are then built with the procedural code against this surface, at the procedural head's scale. */
function r3rigHead(mk){const M=R3M.m[mk];if(M.hf)return M.hf;const X=M.extras,g=M.geo,p=g.attributes.position.array,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,ix=g.index.array;
  const hb=X.bones.indexOf('headG'),lm=X.lm,head=i=>{for(let k=0;k<4;k++)if(si[i*4+k]===hb&&sw[i*4+k]>.5)return true;return false};
  const box=new THREE.Box3(),v=new THREE.Vector3();const tris=[];
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(head(a)||head(b)||head(c)){tris.push(a,b,c);for(const q of [a,b,c]){v.fromArray(p,q*3);if(v.y>lm.chinB[1])box.expandByPoint(v)}}}
  const C=box.getCenter(new THREE.Vector3());C.z-=.01;
  const hgeo=new THREE.BufferGeometry();hgeo.setAttribute('position',g.attributes.position);hgeo.setIndex(tris);
  const hm=new THREE.Mesh(hgeo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));hm.updateMatrixWorld(true);
  const NT=96,NL=48,rad=new Float32Array(NT*NL).fill(NaN),rc=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3();
  const dirOf=(th,lat)=>{const c=Math.sqrt(Math.max(0,1-lat*lat));return d.set(Math.sin(th)*c,lat,Math.cos(th)*c)};
  for(let j=0;j<NL;j++)for(let i=0;i<NT;i++){const th=-Math.PI+(i+.5)/NT*Math.PI*2,lat=-1+(j+.5)/NL*2;dirOf(th,lat);o.copy(C).addScaledVector(d,.8);rc.set(o,d.clone().negate());rc.far=.8;
    const h=rc.intersectObject(hm,false)[0];if(h)rad[j*NT+i]=.8-h.distance}
  for(let it=0;it<60;it++){let left=0;for(let j=0;j<NL;j++)for(let i=0;i<NT;i++){const k=j*NT+i;if(!isNaN(rad[k]))continue;left++;let s=0,n=0;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const jj=j+dj;if(jj<0||jj>=NL)continue;const kk=jj*NT+(i+di+NT)%NT;if(!isNaN(rad[kk])){s+=rad[kk];n++}}if(n)rad[k]=s/n}if(!left)break}
  // the scalp envelope: each cell takes the highest of its neighbours, so fitted hair clears modelled braids and bumps
  {const r2=rad.slice();for(let j=0;j<NL;j++)for(let i=0;i<NT;i++){let m=r2[j*NT+i];for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const jj=j+dj;if(jj<0||jj>=NL)continue;m=Math.max(m,r2[jj*NT+((i+di)%NT+NT)%NT])}rad[j*NT+i]=m}}
  const radAt=(th,lat)=>{let fi=((th+Math.PI)/(Math.PI*2))*NT-.5,fj=(lat+1)/2*NL-.5;fj=clamp(fj,0,NL-1.001);const i0=Math.floor(fi),j0=Math.floor(fj),ti=fi-i0,tj=fj-j0;
    const at=(i,j)=>rad[j*NT+((i%NT)+NT)%NT];return (at(i0,j0)*(1-ti)+at(i0+1,j0)*ti)*(1-tj)+(at(i0,j0+1)*(1-ti)+at(i0+1,j0+1)*ti)*tj};
  // warps: model latitude <-> procedural latitude through the eye, mouth and chin; angle scaled so the eyes line up
  const latM=q=>{const w=new THREE.Vector3(q[0],q[1],q[2]).sub(C).normalize();return w.y},thM=q=>{const w=new THREE.Vector3(q[0],q[1],q[2]).sub(C);return Math.atan2(w.x,w.z)};
  const A=[[-1,-1],[latM(lm.chinB),-.95],[latM(lm.chin),-.82],[latM(lm.mouth),-.553],[latM(X.eyes.L)-.045,.035],[1,1]].sort((a,b)=>a[0]-b[0]);
  const pl=(x,i,j)=>{for(let k=0;k<A.length-1;k++)if(x<=A[k+1][i]){const t=(x-A[k][i])/((A[k+1][i]-A[k][i])||1);return A[k][j]+t*(A[k+1][j]-A[k][j])}return A[A.length-1][j]};
  const f=.41/Math.abs(thM(X.eyes.L)),thP=t=>t*(f+(1-f)*Math.min(1,Math.abs(t)/(Math.PI/2))),TT=[];for(let i=0;i<=512;i++){const t=-Math.PI+i/512*Math.PI*2;TT.push([t,thP(t)])}
  const thInv=tp=>{let lo=0,hi=512;while(hi-lo>1){const m=(lo+hi)>>1;if(TT[m][1]<tp)lo=m;else hi=m}const a=TT[lo],b=TT[hi],t=(tp-a[1])/((b[1]-a[1])||1);return a[0]+t*(b[0]-a[0])};
  const Rm=(radAt(Math.PI/2,0)+radAt(-Math.PI/2,0)+radAt(0,.9)+radAt(Math.PI,0))/4,k=Rm/.22;
  // S: a point on the scalp in procedural (th, lat) at the procedural scale (the hair group is scaled by k)
  const S=(th,lat,e=0)=>{const tm=thInv(clamp(th,-Math.PI,Math.PI)),lt=pl(clamp(lat,-1,1),1,0);const c=Math.sqrt(Math.max(0,1-lt*lt));const w=new THREE.Vector3(Math.sin(tm)*c,lt,Math.cos(tm)*c);return w.multiplyScalar(radAt(tm,lt)/k+e)};
  // a cap with the procedural head's UV layout, so the hairline masks fit
  const cap=new THREE.SphereGeometry(1,72,48),cp=cap.attributes.position;
  for(let i=0;i<cp.count;i++){v.fromBufferAttribute(cp,i).normalize();const th=Math.atan2(-v.x,-v.z),q=S(th,v.y,0);cp.setXYZ(i,-q.x,q.y,-q.z)}
  cap.computeVertexNormals();cap.userData.keep=1;
  const toP=(x,y,z)=>{const w=new THREE.Vector3(x-C.x,y-C.y,z-C.z).normalize();return [thP(Math.atan2(w.x,w.z)),pl(w.y,0,1)]};
  return M.hf={C,k,S,cap,toP,radAt}}
/* facial hair and scars, painted in the procedural head's layout and carried onto the texture through the head texel map */
function r3rigFacePaint(L,size){const beard=L.beard&&L.beard!=='none',scar=L.scar&&L.scar!=='none';if(!beard&&!scar&&!L.fem)return null;
  const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),fx=768,fy=256,hc=L.hairColor||'#1a120c';
  const ink=a=>`rgba(29,21,23,${a})`,line=(pts,w=4,a=.6)=>{x.strokeStyle=ink(a);x.lineWidth=w;x.lineCap='round';x.lineJoin='round';x.beginPath();pts.forEach(([th,lat],i)=>{const [px,py]=r3tx(th,lat);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()};
  const beardPath=()=>{x.beginPath();x.moveTo(fx-190,fy+40);x.quadraticCurveTo(fx-170,fy+220,fx,fy+250);x.quadraticCurveTo(fx+170,fy+220,fx+190,fy+40);x.quadraticCurveTo(fx+140,fy+150,fx,fy+158);x.quadraticCurveTo(fx-140,fy+150,fx-190,fy+40)};
  if(L.beard==='stubble'){x.fillStyle='rgba(25,15,10,.3)';beardPath();x.fill();x.fillStyle='rgba(25,15,10,.25)';for(let i=0;i<500;i++){const a=i*2.399,r=Math.sqrt(i/500);x.fillRect(fx+Math.cos(a)*r*170,fy+150+Math.sin(a)*r*85,2,2)}}
  if(L.beard==='beard'){x.fillStyle=hc;x.globalAlpha=.94;beardPath();x.fill();x.globalAlpha=1}
  if(L.beard==='goatee'){x.fillStyle=hc;x.beginPath();x.moveTo(fx-36,fy+128);x.quadraticCurveTo(fx-30,fy+178,fx,fy+186);x.quadraticCurveTo(fx+30,fy+178,fx+36,fy+128);x.quadraticCurveTo(fx,fy+138,fx-36,fy+128);x.fill()}
  if(L.beard==='mustache'||L.beard==='beard'||L.beard==='goatee'){x.fillStyle=hc;x.beginPath();x.moveTo(fx-50,fy+92);x.quadraticCurveTo(fx,fy+66,fx+50,fy+92);x.quadraticCurveTo(fx,fy+84,fx-50,fy+92);x.fill()}
  // women: a fine upper liner with a winged flick at each outer corner, and tinted lips (as on the classic head)
  if(L.fem){for(const s of [-1,1]){line([[s*.24,.085],[s*.34,.105],[s*.45,.1],[s*.54,.075]],3.2,.7);line([[s*.53,.075],[s*.6,.09],[s*.66,.115]],3,.75)}
    x.fillStyle='rgba(168,58,82,.38)';x.beginPath();x.ellipse(fx,fy+95,42,8,0,0,7);x.fill();x.beginPath();x.ellipse(fx,fy+117,36,10,0,0,7);x.fill()}
  const sc=(pts)=>{line(pts,7,.25);x.strokeStyle='rgba(255,225,215,.55)';x.lineWidth=3.5;x.beginPath();pts.forEach(([th,lat],i)=>{const [px,py]=r3tx(th,lat);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()};
  if(L.scar==='brow'||L.scar==='both')sc([[.3,.32],[.4,.24],[.5,.18],[.56,.1]]);if(L.scar==='cheek'||L.scar==='both')sc([[-.42,-.12],[-.52,-.24],[-.6,-.36]]);if(L.scar==='nose')sc([[-.12,.02],[0,-.02],[.12,-.06]]);
  const mk=r3rigKey(L),src=x.getImageData(0,0,1024,512).data,hm=r3rigHeadMap(mk),HF=r3rigHead(mk),R=R3_HM;
  const oc=document.createElement('canvas');oc.width=oc.height=R;const ox=oc.getContext('2d'),od=ox.createImageData(R,R),o=od.data;
  for(const i of hm.list){if(hm.hw[i]<.6)continue;const [th,lat]=HF.toP(hm.pos[i*3],hm.pos[i*3+1],hm.pos[i*3+2]);const [px,py]=r3tx(th,lat);const si=((clamp(py|0,0,511))*1024+clamp(px|0,0,1023))*4;
    if(src[si+3]){o[i*4]=src[si];o[i*4+1]=src[si+1];o[i*4+2]=src[si+2];o[i*4+3]=src[si+3]}}
  ox.putImageData(od,0,0);return oc}
/* eyelids (skin patches that close over each eye from the brow) and a dark mouth cavity revealed when the jaw drops */
function r3rigFaceRig(L,hg,HF,T){const lids=[],inkM=r3flat(INK);
  // lid colour: the fighter's own recoloured skin just above the eyes, a shade darker
  const mk=r3rigKey(L),hm=r3rigHeadMap(mk),E=R3M.m[mk].extras.eyes,N=Math.sqrt(T.id.data.length/4),sc=N/R3_HM;let cr=0,cg=0,cb=0,n=0;
  for(const i of hm.list){const x=hm.pos[i*3],y=hm.pos[i*3+1],z=hm.pos[i*3+2];for(const e of [E.L,E.R]){const dy=y-e[1]-.035,dx=x-e[0],dz=z-e[2];if(dx*dx+dy*dy+dz*dz<.012*.012){const px=((i%R3_HM)*sc)|0,py=(((i/R3_HM)|0)*sc)|0,j=(py*N+px)*4;cr+=T.id.data[j];cg+=T.id.data[j+1];cb+=T.id.data[j+2];n++}}}
  const lidC=n?new THREE.Color(`rgb(${(cr/n*.9)|0},${(cg/n*.9)|0},${(cb/n*.9)|0})`):new THREE.Color(L.skin);
  const skinM=r3cel(lidC.getHex(),null,false,.5);
  for(const s of [-1,1]){const th0=s*.41,lat0=.035,g=new THREE.Group();hg.add(g);
    // the upper lid: from the crease down past the lower lash line; the group pivots at its top edge and scales down to close
    const NX=10,NY=5,top=lat0+.075,bot=lat0-.075,w=.2,pos=[],idx=[],Tp=HF.S(th0,top,.01);
    for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const u=i/NX-.5,th=th0+u*2*w,lat=top+(bot-top)*j/NY*(1-.35*u*u*4);const q=HF.S(th,lat,.01).sub(Tp);pos.push(q.x,q.y,q.z)}
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+1,d=c+1;idx.push(a,c,b,b,c,d)}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));pg.setIndex(idx);pg.computeVertexNormals();
    const lid=r3mesh(pg,skinM,{ol:false});lid.castShadow=lid.receiveShadow=false;g.add(lid);
    const lash=[];for(let i=0;i<=12;i++){const u=i/12-.5,th=th0+u*2*w*.85;lash.push(HF.S(th,bot*(1)+.006-.045*(.25-u*u),.013).sub(Tp))}
    g.add(r3mesh(r3strand(lash,.0042,.0042,24,5,true),inkM,{ol:false}));g.position.copy(Tp);g.visible=false;lids.push(g)}
  const m=HF.S(0,-.58,-.075),cav=r3mesh(new THREE.SphereGeometry(.05,14,10),r3flat(0x2a0d0d),{ol:false});cav.position.copy(m);cav.scale.set(1.1,.45,.6);cav.castShadow=false;hg.add(cav);
  return {lids}}
/* expression for the sculpted face (same inputs as r3expr): lids close for blinks and squints, brows and jaw are morph targets */
function r3rigExpr(bx,E){const u=bx.userData,inf=u.mesh.morphTargetInfluences,MI=r3rigMorph(u.mk);
  const close=clamp(1-(E.lidOpen??1)+(E.squint||0)*.35-.12,0,1);for(const g of u.face.lids){g.visible=close>.05;g.scale.y=Math.max(.05,close)}
  inf[MI.browDown]=clamp(E.angry||0,0,1);inf[MI.browUp]=clamp(E.hurt||0,0,1);
  inf[MI.jaw]=clamp((E.open||0)*1.1+(E.grit||0)*.15,0,1)}
/* the hair the base model was sculpted with needs no extra geometry: short for the men's model, braids into a ponytail for the women's */
function r3rigNative(L){const h=L.hair||'short';return L.fem?h==='braids'||h==='ponytail':h==='short'}
