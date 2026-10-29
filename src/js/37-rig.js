/* ================= sculpted boxer: the base model, auto-rigged offline (tools/rig_boxer.py) =================
   Its bones carry the procedural boxer's joint names (pelvis, spine, chest, headG, sh/elbow/glove, hip/knee) and the same
   rest conventions (upper arm and forearm hang along -y in their own frames), so the existing fight, guard and IK code drives it
   unchanged. The texture is recoloured per fighter through a material mask; fights add eye swelling (morph targets) and
   bruises and cuts painted onto the face. */
const R3_RIG={};
function r3rigOn(L){return !!(Settings.sculpt&&!L.fem&&!L.model&&R3M.ok('boxer'))}
/* recolour the base texture for a look: skin, hair (or bald scalp), trunks, waistband, gloves and boots follow the fighter */
function r3rigPixels(L,size){
  const M=R3M.m.boxer,X=M.extras,ref=X.ref,c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.drawImage(M.img,0,0,size,size);
  const id=x.getImageData(0,0,size,size),d=id.data,mk=M.mask,ms=mk.w/size;
  const rgb=h=>{const n=new THREE.Color(h).getHex();return [n>>16&255,n>>8&255,n&255]},lum=a=>.299*a[0]+.587*a[1]+.114*a[2];
  const skin=rgb(L.skin),hair=rgb(L.hairColor),tr=rgb(L.trunks),trim=rgb(L.trim),gl=rgb(L.gloves),boot=rgb(L.shoes||'#'+new THREE.Color(L.trim).lerp(new THREE.Color(0x2a2426),.35).getHexString());
  const ls=lum(ref.skin);
  const lh=lum(ref.hair),lb=lum(ref.band),lg=lum(ref.glove),bald=L.hair==='bald'||L.hair==='none';
  for(let y=0;y<size;y++){const row=((y*ms)|0)*mk.w;
    for(let xx=0;xx<size;xx++){const i=(y*size+xx)*4,m=mk.m[row+((xx*ms)|0)];if(m===0||m===7)continue;
      const r=d[i],g=d[i+1],b=d[i+2],l=.299*r+.587*g+.114*b;let o;
      if(m===1||m===8){const k=m===8?clamp(1+.9*(l/ls-1),.3,1.35):clamp(1+.5*(l/ls-1),.55,1.35);o=[skin[0]*k,skin[1]*k,skin[2]*k]}
      else if(m===2)o=bald?[skin[0]*(.84+.12*l/lh),skin[1]*(.84+.12*l/lh),skin[2]*(.84+.12*l/lh)]:[hair[0]*.35+hair[0]*.75*l/lh,hair[1]*.35+hair[1]*.75*l/lh,hair[2]*.35+hair[2]*.75*l/lh];
      else if(m===3){const k=clamp(.82+(l-8)/70,.5,1.3);o=[tr[0]*k,tr[1]*k,tr[2]*k]}
      else if(m===4){const k=clamp(l/lb,.55,1.2);o=[trim[0]*k,trim[1]*k,trim[2]*k]}
      else if(m===5){const rd=r-(g+b)/2,k=rd<30?(l<40?.82:.92):clamp(.6+.4*l/lg,.6,1.3);o=[gl[0]*k,gl[1]*k,gl[2]*k]}
      else if(m===6){const k=clamp(.8+(l-34)/90,.5,1.4);o=[boot[0]*k,boot[1]*k,boot[2]*k]}
      else continue;
      d[i]=o[0]>255?255:o[0];d[i+1]=o[1]>255?255:o[1];d[i+2]=o[2]>255?255:o[2]}}
  x.putImageData(id,0,0);return {c,id}}
function r3rigTex(L,size=1024){
  const key=[size,L.skin,L.hairColor,L.hair,L.trunks,L.trim,L.gloves,L.shoes].join('|');R3_RIG.tex=R3_RIG.tex||new Map();
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
  const M=R3M.m.boxer,X=M.extras,J=X.joints,V=a=>new THREE.Vector3(a[0],a[1],a[2]),DOWN=new THREE.Vector3(0,-1,0);
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
  const big=opt.texSize||1024,T=r3rigTex(L,big);
  const mat=r3cel(0xffffff,T.t,false,1);
  const mesh=new THREE.SkinnedMesh(M.geo,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.olw=.0042;root.add(mesh);
  root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(X.bones.map(b=>B[b])));
  // head centre marker (portrait framing and hit flashes aim here)
  const eyeY=(X.eyes.L[1]+X.eyes.R[1])/2,hc=new THREE.Object3D();hc.position.set(0,eyeY-J.headG[1],0);B.headG.add(hc);
  // walkout robes are cut for the procedural athletic body: proxies map its spine and head space onto this one
  if(opt.robe&&L.robe){const P0=R3_BT.athletic,TS=R3_TS,sy=(J.shL[1]-J.spine[1])/(.64*TS),sx=J.shL[0]/P0.sh;
    const fit=R3_ROBE[L.robe]&&R3_ROBE[L.robe].fit,rs=new THREE.Group();rs.scale.set(sx*(fit?1.24:1.04),sy,sx*(fit?1.32:1.12));rs.position.z=.01;B.spine.add(rs);
    const rh=new THREE.Group();rh.position.set(0,eyeY-J.headG[1]-.02,0);rh.scale.setScalar(1.04);B.headG.add(rh);
    r3robe(L,P0,1,{spine:rs,headG:rh,arms,al:arms[1].L1/.44})}
  r3outline(root);
  root.userData={rig:true,pelvis:B.pelvis,spine:B.spine,chest:B.chest,headG:B.headG,hc,head:null,arms,legs,mesh,mat,tex:T,P:R3_BT.athletic,legY:J.pelvis[1]+.11,hy0:eyeY};
  return root}
/* fight face: eye swelling grows the morph targets; bruising, cuts and sweat are painted onto this fight's own copy of the texture */
function r3rigFace(R,P){const u=R.opp.userData,d=P.dmg||{};
  const inf=u.mesh.morphTargetInfluences;if(inf){inf[0]=Math.min(1,(d.swellL||0)*1.1);inf[1]=Math.min(1,(d.swellR||0)*1.1)}
  const key=[Math.round((d.swellL||0)*5),Math.round((d.swellR||0)*5),Math.round((d.cheek||0)*4),Math.round((P.cut||0)/12),Math.min(5,P.sweat||0)].join(',');
  if(key===R.texKey)return;R.texKey=key;
  if(!R.rigC){const src=u.tex,c=document.createElement('canvas');c.width=c.height=Math.sqrt(src.id.data.length/4);R.rigC=c;
    const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;u.mat.map=t;u.mat.needsUpdate=true;R.rigT=t}
  const c=R.rigC,x=c.getContext('2d'),N=c.width;x.putImageData(u.tex.id,0,0);
  const ov=r3rigDamage(d,P.cut||0);if(ov){x.imageSmoothingEnabled=true;x.drawImage(ov,0,0,N,N)}
  R.rigT.needsUpdate=true}
/* where each head texel sits on the model (bind pose, game units), rasterised once from the head and neck triangles */
const R3_HM=256;
function r3rigHeadMap(){const M=R3M.m.boxer;if(M.hm)return M.hm;const g=M.geo,p=g.attributes.position.array,uv=g.attributes.uv.array,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,ix=g.index.array;
  const hb=M.extras.bones.indexOf('headG'),R=R3_HM,pos=new Float32Array(R*R*3),has=new Uint8Array(R*R);
  const head=i=>{for(let k=0;k<4;k++)if(si[i*4+k]===hb&&sw[i*4+k]>.25)return true;return false};
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(!head(a)&&!head(b)&&!head(c))continue;
    const ax=uv[a*2]*R,ay=uv[a*2+1]*R,bx=uv[b*2]*R,by=uv[b*2+1]*R,cx=uv[c*2]*R,cy=uv[c*2+1]*R,den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-9)continue;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))-1),x1=Math.min(R-1,Math.ceil(Math.max(ax,bx,cx))+1),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))-1),y1=Math.min(R-1,Math.ceil(Math.max(ay,by,cy))+1);
    for(let y=y0;y<=y1;y++)for(let xx=x0;xx<=x1;xx++){const px=xx+.5,py=y+.5;const w0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den,w1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den,w2=1-w0-w1;
      if(w0<-.15||w1<-.15||w2<-.15)continue;const i=y*R+xx;if(has[i]&&Math.min(w0,w1,w2)<0)continue;has[i]=1;
      for(let k=0;k<3;k++)pos[i*3+k]=w0*p[a*3+k]+w1*p[b*3+k]+w2*p[c*3+k]}}
  const list=[];for(let i=0;i<R*R;i++)if(has[i])list.push(i);return M.hm={pos,list:Uint32Array.from(list)}}
/* bruising around each eye and cheek, a red nose, and a cut over the left brow with a trickle of blood, painted by distance on the surface */
function r3rigDamage(d,cut){const eL=d.swellL||0,eR=d.swellR||0,ch=d.cheek||0;if(eL+eR+ch<.04&&cut<=0)return null;
  const hm=r3rigHeadMap(),S=R3M.m.boxer.extras.spots,R=R3_HM;R3_RIG.ov=R3_RIG.ov||document.createElement('canvas');const c=R3_RIG.ov;c.width=c.height=R;const x=c.getContext('2d'),id=x.createImageData(R,R),o=id.data;
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
