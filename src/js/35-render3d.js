/* ================= inked 3D renderer (Three.js) =================
   Art direction: the "Style A" sketchbook sheet. Comic ink outlines (inverted hull), hard three-band cel
   shading, crosshatching that grows in the shadows, ink detail lines painted into skin, heavy brows,
   small intense eyes, gritted teeth, scars. Four body types (lanky, athletic, brawler, anvil).
   The engine's 2D pose drives a two-bone IK rig, so every mechanic animates without a second animation set.
   R3P renders portraits and the creator preview with the same rig. Falls back to 2D without WebGL. */
const INK=0x1d1517;
const R3D={
  ok(){try{if(typeof THREE==='undefined'||!Settings.gfx3d)return false;if(R3D._gl!=null)return R3D._gl;const c=document.createElement('canvas');return R3D._gl=!!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}},
  _c:{},U:null,
};
function r3U(){if(!R3D.U)R3D.U={px:{value:5},t:{value:new THREE.Vector2(.92,.6)}};return R3D.U}
function r3Ramp(stops){const c=document.createElement('canvas');c.width=stops.length;c.height=1;const x=c.getContext('2d');stops.forEach((v,i)=>{x.fillStyle=v;x.fillRect(i,0,1,1)});const t=new THREE.CanvasTexture(c);t.minFilter=t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.NoColorSpace;t.userData.keep=1;return t}
function r3Mats(){if(!R3D._ramp){R3D._ramp=r3Ramp(['#5a4950','#5a4950','#b4a29e','#f4ebe3']);R3D._rampC=r3Ramp(['#47435a','#47435a','#a6a3b6','#f2f0f8'])}}
const r3bump=(d,w)=>Math.exp(-(d*d)/(2*w*w));
/* ---- ink: crosshatching injected into any lit material; darker light -> thicker, then crossed lines ---- */
const R3_HATCH=`
{ float hb=max(dot(diffuseColor.rgb,vec3(.3333)),.035);
  float Lr=dot(outgoingLight,vec3(.3333))/hb;
  vec2 hp=gl_FragCoord.xy/uHatchPx;
  float d1=abs(fract((hp.x+hp.y)*.7071)-.5),d2=abs(fract((hp.x-hp.y)*.7071+.25)-.5);
  float k1=clamp((uHatchT.x-Lr)/uHatchT.x,0.,1.),k2=clamp((uHatchT.y-Lr)/uHatchT.y,0.,1.);
  float w1=.05+.22*k1,w2=.05+.22*k2;
  float m1=(1.-smoothstep(w1-.06,w1+.06,d1))*smoothstep(0.,.18,k1);
  float m2=(1.-smoothstep(w2-.06,w2+.06,d2))*smoothstep(0.,.18,k2);
  outgoingLight=mix(outgoingLight,outgoingLight*vec3(.36,.29,.3),max(m1,m2)*uHatch);
  float k3=clamp((.3-Lr)/.3,0.,1.);outgoingLight=mix(outgoingLight,vec3(.045,.032,.036),smoothstep(.15,.7,k3)*.7*uHatch);
}`;
function r3ink(mat,hatch=1){const U=r3U();
  mat.onBeforeCompile=sh=>{sh.uniforms.uHatchPx=U.px;sh.uniforms.uHatchT=U.t;sh.uniforms.uHatch={value:hatch};
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uHatchPx;uniform float uHatch;uniform vec2 uHatchT;\nvoid main() {').replace('#include <opaque_fragment>',R3_HATCH+'\n#include <opaque_fragment>')};
  mat.customProgramCacheKey=()=>'ink';return mat}
/* outline: back faces pushed out along the view-space normal by a constant screen fraction */
function r3outMat(w,sk){const k='o'+w+(sk?'s':'');if(R3D._c[k])return R3D._c[k];const m=new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});
  // skinned meshes push out along the skinned normal (objectNormal is computed when skinning is on)
  m.onBeforeCompile=sh=>{sh.uniforms.uOut={value:w};sh.vertexShader='uniform float uOut;\n'+sh.vertexShader.replace('#include <project_vertex>','vec4 mvPosition=modelViewMatrix*vec4(transformed,1.0);\nvec3 onrm=normalize(normalMatrix*'+(sk?'objectNormal':'normal')+');\nmvPosition.xyz+=onrm*uOut*max(.35,-mvPosition.z);\ngl_Position=projectionMatrix*mvPosition;')};
  m.customProgramCacheKey=()=>'out'+w+(sk?'s':'');m.userData.keep=1;return R3D._c[k]=m}
function r3outline(root,w=.0042){const list=[];root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.userData.isOL&&o.userData.ol!==false)list.push(o)});
  for(const o of list){const m=o.isSkinnedMesh?new THREE.SkinnedMesh(o.geometry,r3outMat(o.userData.olw||w,1)):new THREE.Mesh(o.geometry,r3outMat(o.userData.olw||w));
    if(o.isSkinnedMesh){m.bind(o.skeleton,o.bindMatrix);m.frustumCulled=false;m.morphTargetInfluences=o.morphTargetInfluences}m.userData.isOL=true;m.castShadow=m.receiveShadow=false;m.raycast=()=>{};o.add(m)}return root}
function r3cel(hex,map,cloth,hatch=1){r3Mats();return r3ink(new THREE.MeshToonMaterial({color:map?0xffffff:hex,map:map||null,gradientMap:cloth?R3D._rampC:R3D._ramp}),hatch)}
function r3leather(hex){return r3ink(new THREE.MeshPhysicalMaterial({color:0xffffff,map:r3gloveTex(new THREE.Color(hex).getStyle()),roughness:.48,metalness:0,clearcoat:.35,clearcoatRoughness:.45,envMapIntensity:.6,emissive:0x000000}),1)}
function r3matte(hex){return r3ink(new THREE.MeshStandardMaterial({color:hex,roughness:.85,metalness:0,envMapIntensity:.4}),.8)}
function r3flat(hex){return new THREE.MeshBasicMaterial({color:hex})}
function r3mesh(geo,mat,o){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;if(o)Object.assign(m.userData,o);return m}
function r3lathe(profile,sx=1,sz=1,segs=40){const pts=profile.map(([r,y])=>new THREE.Vector2(r,y));if(pts[0].y>pts[pts.length-1].y)pts.reverse();const g=new THREE.LatheGeometry(pts,segs);g.scale(sx,1,sz);g.computeVertexNormals();return g}
function r3limb(len,rf,sx=1,sz=1){const prof=[];const n=18;for(let i=0;i<=n;i++){const t=i/n;prof.push([Math.max(.001,rf(t)),-t*len])}prof.unshift([0,0]);prof.push([0,-len]);return r3lathe(prof,sx,sz,32)}
/* tapered tube along points: r0 at the root, r1 at the tip */
function r3strand(pts,r0,r1=0,seg=10,rad=7,ends=false){const cv=new THREE.CatmullRomCurve3(pts);const g=new THREE.TubeGeometry(cv,seg,r0,rad,false);const p=g.attributes.position,q=new THREE.Vector3();
  for(let k=0;k<p.count;k++){q.fromBufferAttribute(p,k);const u=Math.floor(k/(rad+1))/seg;const cp=cv.getPoint(u);let f=Math.max(.02,(r0+(r1-r0)*u)/r0);if(ends){const e=Math.min(u,1-u)/.14;f*=e>=1?1:Math.max(.04,Math.sqrt(Math.max(0,1-(1-e)*(1-e))))}q.sub(cp).multiplyScalar(f).add(cp);p.setXYZ(k,q.x,q.y,q.z)}
  g.computeVertexNormals();return g}
/* ---------- body types: section multipliers on the athletic baseline ---------- */
const R3_BT={
  lanky:{hip:.92,waist:.88,chest:.86,depth:.66,sh:.39,arm:.86,fore:.86,delt:.82,len:1.07,leg:.88,legLen:1.06,neck:.095,neckLen:.98,trap:.8,ribs:1},
  athletic:{hip:1,waist:1,chest:1,depth:.72,sh:.43,arm:1,fore:1,delt:1,len:1,leg:1,legLen:1,neck:.105,neckLen:1,trap:1},
  brawler:{hip:1.04,waist:1.06,chest:1.1,depth:.77,sh:.47,arm:1.16,fore:1.14,delt:1.14,len:.98,leg:1.06,legLen:.97,neck:.12,neckLen:.88,trap:1.3},
  anvil:{hip:1.12,waist:1.22,chest:1.17,depth:.85,sh:.5,arm:1.26,fore:1.2,delt:1.24,len:.95,leg:1.15,legLen:.92,neck:.142,neckLen:.72,trap:1.55,belly:1},
};
/* women's frame: narrower shoulders and waist, lighter arms and neck, relatively wider hips; the bust is sculpted under a sports top */
function r3femP(P){return Object.assign({},P,{sh:P.sh*.88,chest:P.chest*.9,waist:P.waist*.84,hip:P.hip*1.02,depth:P.depth*.97,arm:P.arm*.8,fore:P.fore*.84,delt:P.delt*.8,neck:P.neck*.78,neckLen:P.neckLen*1.12,trap:P.trap*.5,leg:P.leg*.96,lat:.5,ribs:0,belly:0,fem:1})}
const R3_BT_ARCH={outboxer:'lanky',counter:'athletic',boxerpuncher:'athletic',swarmer:'brawler',slugger:'anvil'};
const R3_EXPR={grit:{angry:1,squint:.25,lidOpen:.86,grit:1},stern:{angry:.75,squint:.1,lidOpen:.9},calm:{angry:.38,squint:.12,lidOpen:.8},cocky:{angry:.15,lidOpen:.78,smile:.7}};
/* ---------- the skull: radial displacement in face space; front = -z in geometry (mesh is turned 180°) ---------- */
function r3sculpt(n,F){
  const bump=r3bump,jaw=F.jaw??1,chin=F.chin??1,nose=F.nose??1,cheek=F.cheek??1,brow=F.brow??1.2,nt=F.noseType||'straight';
  const lat=n.y,th=Math.atan2(-n.x,-n.z),front=Math.max(0,Math.cos(th)),ath=Math.abs(th);const fx=th,fy=lat;
  let sc=1;
  sc*=1-.08*Math.pow(Math.abs(Math.sin(th)),2)*Math.max(0,1-Math.abs(lat-.15)*1.3);
  sc*=1+.1*Math.max(0,-Math.cos(th))*Math.max(0,1-Math.abs(lat-.15)*1.4);
  sc*=1-.03*bump(lat-.95,.12);
  sc+=.085*brow*bump(fy-.2,.08)*front*bump(ath-.3,.38);
  sc*=1-.07*Math.max(0,Math.min(1,(lat-.35)/.5));
  sc-=.05*bump(fy-.5,.18)*front;
  for(const s of [-1,1]){const dx=(fx-s*.42)/.25,dy=(fy-.03)/.13;sc-=.09*Math.exp(-(dx*dx+dy*dy)/2)*front}
  for(const s of [-1,1]){sc+=.066*cheek*bump(fy+.14,.085)*bump(fx-s*.64,.15);sc+=.025*cheek*bump(fy+.36,.14)*bump(fx-s*.5,.22)}
  if(nt==='flat'){sc+=.12*nose*bump(fx,.13)*Math.max(0,bump(fy+.06,.22))*(fy<.24?1:0);sc+=.16*nose*bump(fx,.19)*bump(fy+.27,.1);for(const s of [-1,1])sc+=.13*nose*bump(fx-s*.22,.1)*bump(fy+.3,.075)}
  else if(nt==='broken'){const kx=fx-.05*bump(fy+.02,.12)+.03*bump(fy+.26,.08);sc+=.21*nose*bump(kx,.11)*Math.max(0,bump(fy+.06,.24))*(fy<.26?1:0);sc+=.045*bump(kx,.08)*bump(fy+.06,.05);sc+=.2*nose*bump(kx,.16)*bump(fy+.27,.1);for(const s of [-1,1])sc+=.11*nose*bump(kx-s*.2,.09)*bump(fy+.31,.07)}
  else{sc+=.26*nose*bump(fx,.095)*Math.max(0,bump(fy+.06,.24))*(fy<.26?1:0);sc+=.22*nose*bump(fx,.14)*bump(fy+.28,.1);for(const s of [-1,1])sc+=.1*nose*bump(fx-s*.19,.085)*bump(fy+.31,.07)}
  sc-=.03*bump(fx,.06)*bump(fy+.36,.04);
  sc-=.012*bump(fx,.07)*bump(fy+.44,.05);
  sc+=.03*bump(fx,.3)*bump(fy+.5,.045);
  sc-=.025*bump(fx,.32)*bump(fy+.56,.025);
  sc+=.04*bump(fx,.26)*bump(fy+.62,.05);
  sc-=.03*bump(fx,.3)*bump(fy+.7,.04);
  sc+=.3*chin*bump(fy+.78,.18)*bump(fx,.65);
  sc+=.09*jaw*bump(fy+.62,.14)*bump(ath-.78,.22);
  sc+=.045*chin*bump(fy+.76,.08)*(bump(fx-.2,.1)+bump(fx+.2,.1));
  if(lat<-.2){const k=(-.2-lat)/.8;sc*=1-.14*k*k*(1-front*.55)/Math.max(.7,jaw);sc*=1-.22*k*Math.max(0,-Math.cos(th))}
  for(const s of [-1,1]){sc-=.015*bump(fx-s*.32,.05)*bump(fy+.4,.12);sc-=.03*bump(lat-.3,.16)*bump(th-s*1.05,.28)}
  // planes: squarer horizontal sections (mild on the cranium, strong through cheeks and jaw)
  const hl=Math.hypot(n.x,n.z);if(hl>1e-4){const low=lat<-.1;const pw=low?3.2:2.5;const ux=Math.abs(n.x/hl),uz=Math.abs(n.z/hl);const f=1/Math.pow(Math.pow(ux,pw)+Math.pow(uz,pw),1/pw);sc*=1+(f-1)*(low?.6:.38)*(1-Math.abs(lat)*.55)}
  return sc;
}
const _r3hg=new Map();
function r3headGeo(R,F={},segs=112){
  const key=R+'|'+segs+'|'+JSON.stringify(F);if(_r3hg.has(key))return _r3hg.get(key);
  const g=new THREE.SphereGeometry(R,segs,Math.round(segs*.75));const p=g.attributes.position;const v=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);n.copy(v).normalize();v.multiplyScalar(r3sculpt(n,F));v.y*=1.1+.1*Math.max(0,-n.y);v.x*=.96;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();g.userData.keep=1;_r3hg.set(key,g);return g;
}
/* a point on the sculpted surface, in head space (front +z) */
function r3surf(R,F,th,lat,extra=0){lat=Math.max(-.98,Math.min(.98,lat));const c=Math.sqrt(1-lat*lat);
  const d=new THREE.Vector3(Math.sin(th)*c,lat,Math.cos(th)*c);const g=new THREE.Vector3(-d.x,d.y,-d.z);const sc=r3sculpt(g,F);
  return new THREE.Vector3(d.x*R*sc*.96,d.y*R*sc*(1.1+.1*Math.max(0,-d.y)),d.z*R*sc).add(d.multiplyScalar(extra))}
/* face-space (th, lat) -> skin texture pixel */
const r3tx=(th,lat)=>[768+163*th,Math.acos(Math.max(-1,Math.min(1,lat)))/Math.PI*512];
/* ---------- painted skin: tone, warmth, ink detail lines, facial hair, scars, damage ---------- */
function r3skinTex(L,o={},cv){
  const c=cv||document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');const skin=L.skin;
  x.fillStyle=skin;x.fillRect(0,0,1024,512);
  const fx=768,fy=256;
  const occ=(px,py,rx,ry,a,col='60,25,25')=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.save();x.translate(px,py);x.scale(rx,ry);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  const ink=(a=.6)=>`rgba(29,21,23,${a})`;
  const fk=L.fem?.5:1;
  const line=(pts,w=4,a=.6)=>{x.strokeStyle=ink(a*fk);x.lineWidth=w;x.lineCap='round';x.lineJoin='round';x.beginPath();pts.forEach(([th,lat],i)=>{const [px,py]=r3tx(th,lat);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()};
  for(const s of [-1,1]){occ(fx+s*110,fy+45,80,60,.07,'200,90,80');occ(fx+s*70,fy-8,46,30,.34);occ(fx+s*250,fy,40,50,.1,'200,90,80')}
  occ(fx,fy+60,24,16,.08,'200,90,80');occ(fx,fy+70,30,10,.3);occ(fx,fy+150,34,12,.25);occ(fx,fy+200,120,30,.25);
  x.fillStyle='rgba(165,75,75,.4)';x.beginPath();x.ellipse(fx,fy+95,40,7,0,0,7);x.fill();x.fillStyle='rgba(160,70,70,.42)';x.beginPath();x.ellipse(fx,fy+116,34,9,0,0,7);x.fill();
  x.fillStyle='rgba(40,15,15,.8)';x.beginPath();x.ellipse(fx-20,fy+64,8,5,.3,0,7);x.ellipse(fx+20,fy+64,8,5,-.3,0,7);x.fill();
  // ink detail lines (the sketch's linework): nasolabial folds, under-eye bags, cheekbone hatching, chin crease, brow furrow
  const hard=L.expr==='grit'||L.expr==='stern'?1:.6;
  for(const s of [-1,1]){
    line([[s*.2,-.27],[s*.27,-.36],[s*.33,-.47],[s*.36,-.55]],4,.5*hard);
    line([[s*.3,-.075],[s*.42,-.1],[s*.54,-.08]],3,.35);
    line([[s*.29,.095],[s*.41,.125],[s*.55,.1]],3.2,.45);
    for(let i=0;i<4;i++)line([[s*(.56+i*.045),-.2+i*.012],[s*(.62+i*.045),-.27+i*.012]],2.4,.28);
    if(hard>.9){line([[s*.07,.15],[s*.05,.24]],3.5,.45)}
    line([[s*.76,-.04],[s*.7,-.18],[s*.58,-.32]],3.4,.36);
    line([[s*.09,.1],[s*.12,-.06],[s*.17,-.22]],2.6,.26);
    line([[s*.86,-.42],[s*.66,-.62],[s*.42,-.77]],3,.3);
    line([[s*.62,.06],[s*.72,.0]],2.6,.3);
  }
  line([[-.16,-.71],[0,-.69],[.16,-.71]],3,.35);line([[-.12,-.655],[0,-.665],[.12,-.655]],3.2,.4);
  if(hard>.9){line([[-.32,.4],[-.1,.42],[.1,.4],[.3,.42]],2.6,.22);line([[-.24,.48],[0,.5],[.22,.48]],2.4,.18)}
  // hair-color side shading for shaved styles; facial hair
  const hc=L.hairColor||'#1a120c';
  if(L.hair==='mohawk'||L.hair==='buzz'){x.fillStyle=hc;x.globalAlpha=L.hair==='buzz'?.0:.28;x.fillRect(0,0,1024,fy-118);x.globalAlpha=1}
  const beardPath=()=>{x.beginPath();x.moveTo(fx-190,fy+40);x.quadraticCurveTo(fx-170,fy+220,fx,fy+250);x.quadraticCurveTo(fx+170,fy+220,fx+190,fy+40);x.quadraticCurveTo(fx+140,fy+150,fx,fy+158);x.quadraticCurveTo(fx-140,fy+150,fx-190,fy+40)};
  if(L.beard==='stubble'){x.fillStyle='rgba(25,15,10,.32)';beardPath();x.fill();x.fillStyle='rgba(25,15,10,.25)';for(let i=0;i<500;i++){const a=i*2.399,r=Math.sqrt(i/500);const px=fx+Math.cos(a)*r*170,py=fy+150+Math.sin(a)*r*85;x.fillRect(px,py,2,2)}}
  if(L.beard==='beard'){x.fillStyle=hc;x.globalAlpha=.92;beardPath();x.fill();x.globalAlpha=1}
  if(L.beard==='goatee'){x.fillStyle=hc;x.beginPath();x.moveTo(fx-36,fy+128);x.quadraticCurveTo(fx-30,fy+178,fx,fy+186);x.quadraticCurveTo(fx+30,fy+178,fx+36,fy+128);x.quadraticCurveTo(fx,fy+138,fx-36,fy+128);x.fill()}
  if(L.beard==='mustache'||L.beard==='beard'||L.beard==='goatee'){x.fillStyle=hc;x.beginPath();x.moveTo(fx-48,fy+90);x.quadraticCurveTo(fx,fy+68,fx+48,fy+90);x.quadraticCurveTo(fx,fy+82,fx-48,fy+90);x.fill()}
  // scars: pale raised line with stitch ticks
  const scar=(pts)=>{line(pts,7,.25);x.strokeStyle='rgba(255,225,215,.55)';x.lineWidth=3.5;x.beginPath();pts.forEach(([th,lat],i)=>{const [px,py]=r3tx(th,lat);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
    for(let i=0;i<pts.length-1;i++){const [a,b]=[r3tx(...pts[i]),r3tx(...pts[i+1])];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;x.strokeStyle=ink(.45);x.lineWidth=2;x.beginPath();x.moveTo(mx-dy/l*7,my+dx/l*7);x.lineTo(mx+dy/l*7,my-dx/l*7);x.stroke()}};
  const sc=L.scar||'none';
  if(sc==='brow'||sc==='both')scar([[.3,.32],[.4,.24],[.5,.18],[.56,.1]]);
  if(sc==='cheek'||sc==='both')scar([[-.42,-.12],[-.52,-.24],[-.6,-.36]]);
  if(sc==='nose')scar([[-.12,.02],[0,-.02],[.12,-.06]]);
  if(o.sweat){x.fillStyle=`rgba(255,255,255,${Math.min(.24,o.sweat*.05)})`;for(let i=0;i<o.sweat*6;i++){x.beginPath();x.ellipse(fx+(((i*97)%300)-150),fy-120+((i*53)%260),3,6,0,0,7);x.fill()}}
  const d=o.dmg||{};for(const s of [-1,1]){const a=s<0?d.swellL:d.swellR;if(a)occ(fx+s*80,fy-8,90+a*40,70,Math.min(.7,a*.8),'150,40,60')}
  if(d.cheek){occ(fx-80,fy+60,70,50,Math.min(.5,d.cheek*.6),'150,40,60')}
  if(o.cut>12){const k=Math.min(1,o.cut/100);x.strokeStyle='#8e0e0e';x.lineWidth=6+k*4;x.lineCap='round';x.beginPath();x.moveTo(fx+56,fy-64);x.lineTo(fx+94+k*26,fy-76);x.stroke();if(k>.3){x.fillStyle='rgba(150,10,10,.85)';x.beginPath();x.moveTo(fx+90,fy-58);x.quadraticCurveTo(fx+104,fy,fx+96,fy+30+k*70);x.quadraticCurveTo(fx+86,fy,fx+90,fy-58);x.fill()}}
  return c;
}
function r3spriteTex(){if(R3D._spr)return R3D._spr;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,245,225,1)');g.addColorStop(.3,'rgba(255,240,210,.35)');g.addColorStop(1,'rgba(255,240,210,0)');x.fillStyle=g;x.fillRect(0,0,128,128);R3D._spr=new THREE.CanvasTexture(c);R3D._spr.userData.keep=1;return R3D._spr}
function r3teethTex(mg){const key='teeth'+(mg||'');if(R3D._c[key])return R3D._c[key];const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle=mg||'#f3efe6';x.fillRect(0,0,256,64);
  x.strokeStyle='#2a1c1c';x.lineWidth=3;x.beginPath();x.moveTo(0,32);x.lineTo(256,32);x.stroke();x.lineWidth=2.5;for(let i=1;i<10;i++){const px=i*25.6;x.beginPath();x.moveTo(px,4);x.lineTo(px+1,30);x.moveTo(px+3,34);x.lineTo(px+2,60);x.stroke()}
  x.fillStyle='rgba(60,30,30,.35)';x.fillRect(0,0,22,64);x.fillRect(234,0,22,64);
  if(mg&&mg!=='#f3efe6'){x.fillStyle='rgba(255,255,255,.35)';x.fillRect(0,6,256,6);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,256,64*0+3)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData.keep=1;return R3D._c[key]=t}
/* trunks: base colour plus a pattern in the trim colour. Lathe UVs: u wraps from the front (0) round the body, v runs up */
function r3trunkTex(col,trim,pat){const k='tr'+col+trim+pat;if(R3D._c[k])return R3D._c[k];const W=512,H=256;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const cs=new THREE.Color(col).getStyle(),ts=new THREE.Color(trim).getStyle();x.fillStyle=cs;x.fillRect(0,0,W,H);x.fillStyle=ts;
  if(pat==='stripe'){for(const u of [.25,.75])for(const o of [-.022,.022])x.fillRect((u+o)*W-5,0,10,H)}
  else if(pat==='panel'){for(const u of [.25,.75])x.fillRect((u-.045)*W,0,.09*W,H)}
  else if(pat==='flame'){const r=new Rng(7);for(let i=0;i<22;i++){const cx=i/22*W,h=H*(.35+r.next()*.3),w=W/22*1.3;x.beginPath();x.moveTo(cx-w/2,H);x.quadraticCurveTo(cx-w*.6,H-h*.5,cx+w*.1,H-h);x.quadraticCurveTo(cx+w*.05,H-h*.45,cx+w/2,H);x.fill()}
    x.fillStyle='rgba(255,220,120,.55)';for(let i=0;i<22;i++){const cx=i/22*W+6,h=H*.18;x.beginPath();x.moveTo(cx-6,H);x.quadraticCurveTo(cx-4,H-h*.6,cx+2,H-h);x.quadraticCurveTo(cx+2,H-h*.4,cx+7,H);x.fill()}}
  else if(pat==='star'){const r=new Rng(3);const star=(cx,cy,R)=>{x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?R*.45:R;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.closePath();x.fill()};for(let i=0;i<26;i++)star(r.next()*W,20+r.next()*(H-40),9+r.next()*7)}
  if(pat!=='solid'){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,W,6)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;t.userData.keep=1;return R3D._c[k]=t}
function r3bandTex(col,trim,text){const c=document.createElement('canvas');c.width=1024;c.height=64;const x=c.getContext('2d');x.fillStyle=col;x.fillRect(0,0,1024,64);
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,1024,5);x.fillRect(0,59,1024,5);
  if(text){x.font='bold 30px "Alfa Slab One",Georgia,serif';x.textAlign='center';x.textBaseline='middle';const w=Math.min(300,x.measureText(text).width+30);
    for(const cx of [0,1024]){x.fillStyle=trim;x.fillRect(cx-w/2,10,w,44);x.strokeStyle='#1d1517';x.lineWidth=3;x.strokeRect(cx-w/2,10,w,44);x.fillStyle='#1d1517';x.fillText(text,cx,34)}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
/* ---------- game look -> render look ---------- */
function r3look(look,o={}){
  const lk=look||{};
  const h=hashStr(JSON.stringify([lk.skin,lk.hair,lk.hc,lk.trunks,lk.fs||0,o.name||'']));const r=new Rng(h);
  const skin=typeof lk.skin==='number'?SKIN[lk.skin]||SKIN[2]:(lk.skin||SKIN[2]);
  const hairColor=typeof lk.hc==='number'?HAIRC[lk.hc]||HAIRC[0]:(lk.hairColor||'#1a120c');
  const shape=lk.shape||{jaw:.85+r.next()*.45,chin:.85+r.next()*.4,nose:.85+r.next()*.35,cheek:.85+r.next()*.4,brow:1.05+r.next()*.35};
  const bt=lk.bt||R3_BT_ARCH[o.arch]||['lanky','athletic','brawler','anvil'][h%4];
  return {skin,hair:lk.hair||'short',hairColor,beard:lk.fem?'none':(lk.beard||'none'),trunks:lk.trunks||'#d8392f',trim:lk.trim||'#f4efe3',gloves:lk.gloves||'#d8392f',
    eyes:['#4a2a16','#2a160c','#3a5a7a','#4a5a3a','#5a3a20'][h%5],shape:Object.assign({},shape,lk.fem?{jaw:shape.jaw*.8,chin:shape.chin*.88,nose:shape.nose*.84,brow:Math.min(1.15,shape.brow)*.8,cheek:shape.cheek*1.04}:{},{noseType:lk.nose||'straight'}),fem:!!lk.fem,
    scar:lk.scar||'none',ear:lk.ear||'normal',expr:lk.expr||'stern',bt,band:lk.band||'',
    model:lk.model||null,robe:lk.robe||null,robeCol:lk.robeCol||null,robeTrim:lk.robeTrim||null,hoodLow:!!lk.hoodLow,trunkPat:lk.trunkPat||['solid','solid','stripe','panel','stripe','flame','star'][(h>>>3)%7],gloveTape:lk.gloveTape||'#1d1517',shoes:lk.shoes||null,mg:lk.mg||['#f3efe6','#2f6fe2','#d8392f','#161616','#2e9e5b'][(h>>>6)%5],
    height:o.height||lk.height||70,mass:o.mass||1,hseed:h};
}
/* ---------- head: skull + eyes/lids + brows + mouth/teeth + ears + hair ---------- */
function r3head(L){
  const R=.22,g=new THREE.Group(),F=L.shape;
  const texC=document.createElement('canvas');r3skinTex(L,{},texC);
  const tex=new THREE.CanvasTexture(texC);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const skin=r3cel(L.skin,tex),skinP=r3cel(L.skin);
  const hg=r3headGeo(R,F);
  const skull=r3mesh(hg,skin,{olw:.005});skull.rotation.y=Math.PI;g.add(skull);
  const S=(th,lat,e=0)=>r3surf(R,F,th,lat,e);
  const ctl={eyes:[],brows:[],lids:[],lows:[],lipUp:null,lipLo:null,mline:null,cav:null,teeth:null,tex,texC,L};
  const inkM=r3flat(INK);
  const browCol=new THREE.Color(L.hair==='bald'?'#2a1d18':L.hairColor).lerp(new THREE.Color(INK),.45).getHex();
  const eyeMat=r3ink(new THREE.MeshPhysicalMaterial({color:0xf1ede4,roughness:.25,clearcoat:.8}),.6);
  for(const s of [-1,1]){
    const c=S(s*.41,.035,-.026);const eye=new THREE.Group();eye.position.copy(c);eye.scale.setScalar(L.fem?.97:.9);g.add(eye);
    eye.add(r3mesh(new THREE.SphereGeometry(.042,28,20),eyeMat,{ol:false}));
    const ig=new THREE.Group();eye.add(ig);ctl.eyes.push(ig);
    const iris=r3mesh(new THREE.SphereGeometry(.0425,28,20,0,Math.PI*2,0,.74),new THREE.MeshPhysicalMaterial({color:L.eyes,roughness:.3,clearcoat:1}),{ol:false});iris.rotation.x=Math.PI/2;ig.add(iris);
    const pupil=r3mesh(new THREE.SphereGeometry(.043,20,14,0,Math.PI*2,0,.36),r3flat(0x070404),{ol:false});pupil.rotation.x=Math.PI/2;ig.add(pupil);
    const glint=r3mesh(new THREE.SphereGeometry(.0065,10,8),r3flat(0xffffff),{ol:false});glint.position.set(-.011,.014,.039);ig.add(glint);
    // lids: skin caps that rotate down over the ball; a heavy ink lash line rides the upper lid's edge
    const tc=Math.PI*.42,ru=.0465;
    const upG=new THREE.Group();eye.add(upG);upG.add(r3mesh(new THREE.SphereGeometry(ru,28,18,0,Math.PI*2,0,tc),skinP,{ol:false}));
    const lash=r3mesh(new THREE.TorusGeometry(ru*Math.sin(tc),L.fem?.0092:.0068,6,30,Math.PI),inkM,{ol:false});lash.rotation.x=Math.PI/2;lash.position.y=ru*Math.cos(tc);upG.add(lash);
    const loG=new THREE.Group();eye.add(loG);const tl=Math.PI*.3;loG.add(r3mesh(new THREE.SphereGeometry(.045,28,14,0,Math.PI*2,Math.PI-tl,tl),skinP,{ol:false}));
    const ll=r3mesh(new THREE.TorusGeometry(.045*Math.sin(tl),.0028,5,24,Math.PI),inkM,{ol:false});ll.rotation.x=Math.PI/2;ll.position.y=-.045*Math.cos(tl);loG.add(ll);
    ctl.lids.push(upG);ctl.lows.push(loG);
    // brow: heavy tapered tube, thick at the inner end, low over the eye
    const bg=new THREE.Group();bg.position.copy(c);g.add(bg);ctl.brows.push({g:bg,s,base:c.clone()});
    const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(S(s*(.1+.62*t),(L.fem?.18:.165)+(L.fem?.075:.055)*Math.sin(t*Math.PI*.9)-.02*t,.018).sub(c))}
    bg.add(r3mesh(r3strand(pts,L.fem?.0145:.03,L.fem?.0055:.012,24,8,true),r3cel(browCol,null,false,.4),{olw:L.fem?.0016:.0024}));
    // winged lash flick at the outer corner
    if(L.fem)g.add(r3mesh(r3strand([S(s*.555,.06,.004),S(s*.6,.075,.01),S(s*.64,.1,.014)],.0075,.0015,10,5,true),inkM,{ol:false}));
  }
  // mouth: ink line + lips; teeth band and dark cavity revealed by grit/open
  {const lipM=r3cel(L.fem?new THREE.Color(L.skin).lerp(new THREE.Color(0xa83a52),.45).getHex():new THREE.Color(L.skin).offsetHSL(-.015,.08,-.12).getHex());const lk=L.fem?1.4:1;
    const arc=(lat,w,yoff,e=.006)=>{const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(S(-w+2*w*t,lat+Math.sin(t*Math.PI)*yoff,e))}return pts};
    const up=r3mesh(r3strand(arc(-.518,.25,.008,.002),.0062*lk,.0062*lk,20,7,true),lipM,{ol:false});g.add(up);ctl.lipUp=up;
    const lo=r3mesh(r3strand(arc(-.592,.2,-.008,.0),.0085*lk,.0085*lk,20,7,true),lipM,{ol:false});g.add(lo);ctl.lipLo=lo;
    const ml=r3mesh(r3strand(arc(-.553,.3,-.004,.012),.0045,.0045,20,6,true),inkM,{ol:false});g.add(ml);ctl.mline=ml;
    const mp=S(0,-.555,0);
    const cav=r3mesh(new THREE.SphereGeometry(.07,16,12),r3flat(0x2a0d0d),{ol:false});cav.position.copy(S(0,-.555,-.026));cav.scale.set(1.15,.01,.5);g.add(cav);ctl.cav=cav;
    const tr=.13;const teeth=r3mesh(new THREE.CylinderGeometry(tr,tr,.036,24,1,true,-.42,.84),new THREE.MeshBasicMaterial({map:r3teethTex(L.mg)}),{ol:false});
    teeth.position.set(mp.x,mp.y,mp.z-tr+.009);teeth.visible=false;g.add(teeth);ctl.teeth=teeth}
  // ears (cauliflower = swollen, lumpy)
  const cauli=L.ear==='cauliflower';
  for(const s of [-1,1]){const e=new THREE.Group();e.position.set(s*R*.98,-.01,-.02);e.rotation.y=s*.35;g.add(e);
    const rimG=r3mesh(new THREE.TorusGeometry(.03,cauli?.017:.011,8,24),skinP,{olw:.0026});rimG.scale.set(.8,1.2,.8);e.add(rimG);
    const bowl=r3mesh(new THREE.SphereGeometry(.03,14,10),r3cel(new THREE.Color(L.skin).offsetHSL(0,0,-.1).getHex()),{ol:false});bowl.scale.set(.6,.9,.4);bowl.position.x=s*-.006;e.add(bowl);
    if(cauli)for(const [px,py] of [[.01,.025],[-.012,-.02],[.0,.0]]){const l=r3mesh(new THREE.SphereGeometry(.017,10,8),skinP,{olw:.002});l.position.set(px,py,.006);e.add(l)}}
  r3hair(g,L,hg,R,S);
  g.userData.ctl=ctl;
  return g;
}
/* hair: an alpha-masked cap for coverage plus geometric clumps (merged into one mesh) that carry the ink outlines */
function r3hair(g,L,hg,R,S){
  const style=L.hair||'short';if(style==='bald')return;const sleek=['slick','topknot','ponytail','bun','twinbraids'].includes(style);
  const hc=new THREE.Color(L.hairColor||'#1a120c');const hm=r3cel(hc.getHex(),null,false,.8);
  const rr=new Rng(L.hseed||1);const rnd=(a,b)=>a+(b-a)*rr.next();
  const geos=[];const add=(geo)=>{geos.push(geo);return geo};
  const flush=(olw=.003)=>{if(!geos.length)return;const m=r3mesh(r3merge(geos.splice(0)),hm,{olw});g.add(m)};
  const mask=(fn)=>{const am=document.createElement('canvas');am.width=512;am.height=256;const ax=am.getContext('2d');ax.scale(.5,.5);ax.fillStyle='#000';ax.fillRect(0,0,1024,512);ax.fillStyle='#fff';fn(ax);return new THREE.CanvasTexture(am)};
  const fx=768,fy=256;
  const hairline=(ax,top=-104)=>{ax.beginPath();ax.rect(0,0,1024,512);ax.moveTo(fx-175,fy-30);ax.bezierCurveTo(fx-185,fy+top+10,fx-40,fy+top-8,fx,fy+top+6);ax.bezierCurveTo(fx+40,fy+top-8,fx+185,fy+top+10,fx+175,fy-30);ax.bezierCurveTo(fx+225,fy+40,fx+225,fy+250,fx+200,fy+400);ax.lineTo(fx-200,fy+400);ax.bezierCurveTo(fx-225,fy+250,fx-225,fy+40,fx-175,fy-30);ax.closePath();ax.fill('evenodd');
    const nape=ax.createLinearGradient(0,fy+80,0,fy+140);nape.addColorStop(0,'rgba(0,0,0,0)');nape.addColorStop(1,'#000');ax.fillStyle=nape;ax.fillRect(0,fy+80,1024,432)};
  const cap=(thick,am,col)=>{const m=r3ink(new THREE.MeshToonMaterial({color:col||hc,gradientMap:R3D._ramp,alphaMap:am,transparent:true,alphaTest:.5,side:THREE.DoubleSide}),.7);const c=r3mesh(hg,m,{ol:false});c.rotation.y=Math.PI;c.scale.setScalar(thick);g.add(c);return c};
  const nrm=(th,lat)=>{const c=Math.sqrt(1-lat*lat);return new THREE.Vector3(Math.sin(th)*c,lat,Math.cos(th)*c)};
  const back=new THREE.Vector3(0,0,-1),up=new THREE.Vector3(0,1,0);
  const ball=(p,r,sx=1,sy=1,sz=1)=>{const q=new THREE.SphereGeometry(r,8,6);q.scale(sx,sy,sz);q.translate(p.x,p.y,p.z);add(q)};
  const path=(k,a)=>{const n=new THREE.Vector3(k,Math.sin(a),Math.cos(a)).normalize();return S(Math.atan2(n.x,n.z),Math.max(-.9,Math.min(.97,n.y)),0)};
  if(style==='mohawk'){
    cap(1.012,mask(ax=>{ax.fillStyle='#000';ax.fillRect(0,0,1024,512);ax.fillStyle='#fff';for(const cx of [fx,fx-512,fx+512]){ax.beginPath();ax.ellipse(cx,fy-160,46,120,0,0,7);ax.fill()}ax.fillRect(fx-520-46,0,92,fy-150)}));
    for(let i=0;i<18;i++){const t=i/17;const a=.98+t*2.45;
      const n=new THREE.Vector3(0,Math.sin(a),Math.cos(a));const base=S(Math.atan2(0,n.z),Math.min(.97,n.y),-.004);
      const len=(.26-.14*t)*rnd(.85,1.15),sweep=back.clone().multiplyScalar(len*(.55+.3*t)).add(up.clone().multiplyScalar(len*.12));
      for(const ox of [-.018,.018,0]){const b=base.clone();b.x+=ox;const tip=b.clone().add(n.clone().multiplyScalar(len*.85)).add(sweep);const mid=b.clone().add(n.clone().multiplyScalar(len*.6)).add(sweep.clone().multiplyScalar(.35));
        add(r3strand([b,mid,tip],ox?.034:.042,.002,8,6))}}
    flush(.0034);return}
  if(style==='buzz'){const c=cap(1.008,mask(ax=>hairline(ax,-100)));c.material.color.copy(hc).lerp(new THREE.Color(L.skin),.38);return}
  if(style==='afro'){const m=mask(ax=>hairline(ax,-96));for(const t2 of [1.12,1.19])cap(t2,m);
    for(let i=0;i<90;i++){const th=rnd(-2.6,2.6),lat=rnd(.25,.98);if(Math.abs(th)<.9&&lat<.55)continue;const p=nrm(th,lat).multiplyScalar(R*1.24+rnd(0,.015));p.y*=1.08;ball(p,rnd(.035,.05))}flush(.0026);return}
  if(style==='braids'){
    // cornrows: tight braided rows from the hairline back to the nape, scalp showing between them
    cap(1.006,mask(ax=>hairline(ax,-100)),hc.clone().lerp(new THREE.Color(L.skin),.3));
    const B=new THREE.Vector3(),T=new THREE.Vector3(),Nn=new THREE.Vector3(),M=new THREE.Matrix4();
    for(let k=-4;k<=4;k++){const ph=k*.24;let prev=null;
      for(let i=0;i<=26;i++){const u=i/26;const a=.98+u*1.95;const sa=Math.sin(a),ca=Math.cos(a);const dv=new THREE.Vector3(-Math.sin(ph)*sa,Math.cos(ph)*sa,ca);const p=S(Math.atan2(dv.x,dv.z),Math.max(-.9,Math.min(.97,dv.y)),0);
        if(prev){T.subVectors(p,prev).normalize();Nn.copy(p).normalize();B.crossVectors(T,Nn).normalize();Nn.crossVectors(B,T).normalize();
          const mid=p.clone().lerp(prev,.5).add(Nn.clone().multiplyScalar(.006)).add(B.clone().multiplyScalar(i%2?.0055:-.0055));
          const q=new THREE.SphereGeometry(.0135,8,6);q.scale(1,.7,1.75);M.makeBasis(B,Nn,T).setPosition(mid);q.rotateY(i%2?.35:-.35);q.applyMatrix4(M);add(q)}
        prev=p}}
    flush(.0018);return}
  cap(style==='curly'?1.04:1.03,mask(ax=>hairline(ax,sleek?-108:style==='shaggy'?-90:-104)));
  if(style==='curly'){for(let i=0;i<110;i++){const th=rnd(-2.8,2.8),lat=rnd(.3,.97);if(Math.abs(th)<1&&lat<.58)continue;if(Math.abs(th)>2.2&&lat<.45)continue;ball(S(th,lat,.012),rnd(.018,.026))}flush(.0018);return}
  if(style==='topknot'){const q=new THREE.SphereGeometry(.065,16,12);q.scale(1,.85,1);q.translate(0,R*1.16,-.07);add(q)}
  const n0=style==='shaggy'?46:style==='spiky'?40:sleek?26:32;
  for(let i=0;i<n0;i++){
    let th,lat;
    if(i<14){th=-1.05+2.1*(i/13)+rnd(-.05,.05);lat=.57+.05*Math.abs(th)+rnd(-.02,.03)}else{th=rnd(-2.6,2.6);lat=rnd(.6,.97)}
    const n=nrm(th,lat);const base=S(th,lat,-.003);
    if(sleek){const tip=base.clone().add(back.clone().multiplyScalar(.12)).add(n.clone().multiplyScalar(.02));const mid=base.clone().lerp(tip,.5).add(n.clone().multiplyScalar(.022));add(r3strand([base,mid,tip],.022,.006,8,6));continue}
    if(style==='short'){const tip=base.clone().add(n.clone().multiplyScalar(.035)).add(back.clone().multiplyScalar(.09));const mid=base.clone().lerp(tip,.5).add(n.clone().multiplyScalar(.02));add(r3strand([base,mid,tip],.022,.004,8,6));continue}
    if(style==='spiky'){const len=rnd(.07,.12)*(i<14?.8:1);const dir=n.clone().multiplyScalar(.8).add(back.clone().multiplyScalar(.25)).add(new THREE.Vector3(rnd(-.15,.15),.2,0)).normalize();
      const tip=base.clone().add(dir.clone().multiplyScalar(len));const mid=base.clone().add(dir.clone().multiplyScalar(len*.5)).add(n.clone().multiplyScalar(.01));add(r3strand([base,mid,tip],.026,.001,8,6));continue}
    if(style==='shaggy'){const len=i<14?rnd(.1,.14):rnd(.16,.26);const front=i<14;
      if(front&&i%2)continue;const dir=front?new THREE.Vector3(Math.sign(th||1)*rnd(.25,.6),-.45,.7).normalize():n.clone().multiplyScalar(.5).add(new THREE.Vector3(Math.sign(n.x)*.35,-.55,-.4)).add(new THREE.Vector3(rnd(-.2,.2),rnd(-.1,.3),rnd(-.2,.2))).normalize();
      const mid=base.clone().add(n.clone().multiplyScalar(.045)).add(dir.clone().multiplyScalar(len*.35));const tip=mid.clone().add(dir.clone().multiplyScalar(len*.7));
      add(r3strand([base,mid,tip],.028,.0015,10,6));continue}
  }
  // gathered styles: a tied ponytail, a bun, or two plaits hanging behind the shoulders
  const plait=(pts,r0,r1)=>{const cv=new THREE.CatmullRomCurve3(pts);const n=Math.round(cv.getLength()/.022);const T=new THREE.Vector3(),Nn=new THREE.Vector3(),Bn=new THREE.Vector3(),M=new THREE.Matrix4();
    for(let i=0;i<n;i++){const u=(i+.5)/n,p=cv.getPointAt(u);cv.getTangentAt(u,T);Bn.set(1,0,0);Nn.crossVectors(T,Bn).normalize();Bn.crossVectors(Nn,T).normalize();
      const r=r0+(r1-r0)*u;const q=new THREE.SphereGeometry(r,8,6);q.scale(1,.75,1.5);q.rotateY(i%2?.45:-.45);M.makeBasis(Bn,Nn,T).setPosition(p.clone().add(Bn.clone().multiplyScalar(i%2?r*.35:-r*.35)));q.applyMatrix4(M);add(q)}
    const e=cv.getPointAt(1);const tie=new THREE.SphereGeometry(r1*.9,8,6);tie.translate(e.x,e.y,e.z);add(tie)};
  if(style==='ponytail'){const T=S(Math.PI,.22,.012),o=T.clone().setY(0).normalize(),dn=new THREE.Vector3(0,-1,0);
    const tie=new THREE.TorusGeometry(.028,.012,6,16);tie.lookAt(o);tie.translate(T.x+o.x*.012,T.y,T.z+o.z*.012);add(tie);
    for(let i=0;i<13;i++){const ox=rnd(-.026,.026),oo=rnd(-.012,.012);const sx=new THREE.Vector3(ox,0,0);
      const p0=T.clone().add(o.clone().multiplyScalar(.02)).add(sx.clone().multiplyScalar(.4));const p1=p0.clone().add(o.clone().multiplyScalar(.07+oo)).add(dn.clone().multiplyScalar(.05)).add(sx);
      const p2=p1.clone().add(o.clone().multiplyScalar(.015+oo)).add(dn.clone().multiplyScalar(.15)).add(sx.clone().multiplyScalar(.4));const p3=p2.clone().add(o.clone().multiplyScalar(-.03)).add(dn.clone().multiplyScalar(.13)).add(sx.clone().multiplyScalar(.3+rnd(-.5,.5)));
      add(r3strand([p0,p1,p2,p3],.04,.004,14,6))}}
  if(style==='bun'){const T=S(Math.PI,.5,.03);const q=new THREE.SphereGeometry(.072,18,14);q.scale(1.08,.95,.82);q.translate(T.x,T.y,T.z-.035);add(q);
    for(let i=0;i<3;i++){const w=new THREE.TorusGeometry(.06-i*.008,.011,6,20,Math.PI*1.3);w.rotateX(-.6+i*.5);w.rotateZ(i*1.7);w.translate(T.x,T.y,T.z-.04);add(w)}}
  if(style==='twinbraids')for(const sd of [-1,1]){const a=S(sd*2.45,.2,.004),b=S(sd*2.75,-.25,.02);
    plait([a,b,b.clone().add(new THREE.Vector3(sd*.01,-.12,-.035)),b.clone().add(new THREE.Vector3(sd*.02,-.3,-.03))],.027,.017)}
  flush(style==='short'||style==='slick'?.0024:.003);
}
/* expression state: lidOpen 0..1, squint, angry, hurt, open (mouth), grit (teeth), smile, look, lookY */
function r3expr(head,E){
  const c=head.userData.ctl;const open=clamp(E.lidOpen??1,0,1),sq=clamp(E.squint||0,0,1);
  for(let i=0;i<2;i++){
    c.lids[i].rotation.x=-.42+(1-open)*1.25+sq*.18;c.lows[i].rotation.x=.08-sq*.3-(1-open)*.18;
    const b=c.brows[i];b.g.rotation.z=b.s*((E.angry||0)*.32-(E.hurt||0)*.3);b.g.position.set(b.base.x,b.base.y-(E.angry||0)*.012+(E.hurt||0)*.014,b.base.z);
    c.eyes[i].rotation.y=(E.look||0)*.35;c.eyes[i].rotation.x=-(E.lookY||0)*.3}
  const m=clamp(E.open||0,0,1),gr=clamp(E.grit||0,0,1)*(1-m);
  c.cav.scale.y=Math.max(.01,.7*m+.3*gr);c.cav.scale.x=1.15+gr*.15;c.cav.visible=m>.05||gr>.1;
  c.teeth.visible=m>.15||gr>.15;c.teeth.scale.set(1+gr*.08,Math.max(.35,gr*1.05+m*.9),1);
  c.mline.visible=gr<.15&&m<.15;
  c.lipUp.position.y=gr*.011+m*.008;c.lipLo.position.y=-gr*.014-m*.04;
  const sm=E.smile||0;c.lipUp.scale.x=c.lipLo.scale.x=1+gr*.1+sm*.05;
}
/* ---------- sculpted parts: a swept tube whose radius depends on height and angle (muscle forms), with rounded caps.
   t runs 0..1 down -y; a = 0 faces +z (front), a = +PI/2 faces +x. ---------- */
const r3g=(t,c,w)=>Math.exp(-((t-c)*(t-c))/(2*w*w));
const r3ang=(a,c,w)=>{let d=Math.abs(((a-c)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);return Math.exp(-(d*d)/(2*w*w))};
function r3muscle(len,rf,o={}){
  const seg=o.seg||20,rad=o.rad||24,capN=o.cap??4,ck=o.ck??.85;
  const rings=[];
  if(capN)for(let i=capN;i>=1;i--){const an=i/capN*Math.PI/2;rings.push({t:0,k:Math.cos(an),y:Math.sin(an)})}
  for(let i=0;i<=seg;i++)rings.push({t:i/seg,k:1,y:0});
  if(capN)for(let i=1;i<=capN;i++){const an=i/capN*Math.PI/2;rings.push({t:1,k:Math.cos(an),y:-Math.sin(an)})}
  const pos=[],uv=[],idx=[];
  rings.forEach(R=>{const rs=[];let rm=0;for(let k=0;k<=rad;k++){const r=rf(R.t,k/rad*Math.PI*2);rs.push(r);rm+=r}rm/=rad+1;
    const y=-R.t*len+R.y*rm*ck;
    for(let k=0;k<=rad;k++){const a=k/rad*Math.PI*2,r=rs[k]*R.k;pos.push(Math.sin(a)*r,y,Math.cos(a)*r);uv.push(k/rad,1-R.t)}});
  const W=rad+1;for(let j=0;j<rings.length-1;j++)for(let k=0;k<rad;k++){const a=j*W+k,b=a+W;idx.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const n=g.attributes.normal;for(let j=0;j<rings.length;j++){const a=j*W,b=a+rad;const x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l)}
  return g}
/* merge many small geometries (hair clumps, braid beads) into one draw call */
function r3merge(list){let n=0;const parts=list.map(g=>{const q=g.index?g.toNonIndexed():g;n+=q.attributes.position.count;return q});
  const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;for(const q of parts){P.set(q.attributes.position.array,o*3);N.set(q.attributes.normal.array,o*3);o+=q.attributes.position.count;q.dispose()}
  list.forEach(g=>g.dispose());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));return g}
/* torso: elliptical sections from the body-type profile, displaced by pecs, abs, obliques, serratus, lats, traps, scapulae and spine */
const R3_TS=1.06;
/* the torso's half-width at height y (body coordinates), for fitting garments to it */
function r3torsoHW(P,m){
  const H=P.hip*m,Wa=P.waist*m,C=P.chest*m,bel=P.belly?.035:0;
  const prof=[[-.42,.2*H],[-.3,.24*H],[-.18,.245*H],[-.06,.225*Wa+bel*.5],[.04,.2*Wa+bel],[.12,.2*Wa+bel*.7],[.22,.225*C],[.32,.275*C],[.42,.33*C],[.5,.37*C],[.56,.405*C],[.62,.4*C],[.67,.3*C],[.7,.15*Math.max(1,P.neck/.105)],[.72,.1*Math.max(1,P.neck/.105)]];
  const hw=y=>{if(y<=prof[0][0])return prof[0][1];for(let i=1;i<prof.length;i++)if(y<=prof[i][0]){const [y0,r0]=prof[i-1],[y1,r1]=prof[i];const u=(y-y0)/(y1-y0);return r0+(r1-r0)*(u*u*(3-2*u))}return prof[prof.length-1][1]};
  return hw}
function r3torsoGeo(P,m){
  const H=P.hip*m,Wa=P.waist*m,C=P.chest*m,bel=P.belly?.035:0;
  const prof=[[-.42,.2*H],[-.3,.24*H],[-.18,.245*H],[-.06,.225*Wa+bel*.5],[.04,.2*Wa+bel],[.12,.2*Wa+bel*.7],[.22,.225*C],[.32,.275*C],[.42,.33*C],[.5,.37*C],[.56,.405*C],[.62,.4*C],[.67,.3*C],[.7,.15*Math.max(1,P.neck/.105)],[.72,.1*Math.max(1,P.neck/.105)]];
  const hw=y=>{if(y<=prof[0][0])return prof[0][1];for(let i=1;i<prof.length;i++)if(y<=prof[i][0]){const [y0,r0]=prof[i-1],[y1,r1]=prof[i];const u=(y-y0)/(y1-y0);return r0+(r1-r0)*(u*u*(3-2*u))}return prof[prof.length-1][1]};
  const absK=P.belly?.45:P.fem?.55:1,lat=P.lat??1;
  const rf=(t,a)=>{const y=.72-t*.94;const w=hw(y)*1.18,d=hw(y)*P.depth;const sa=Math.sin(a),ca=Math.cos(a);let r=1/Math.sqrt((sa/w)*(sa/w)+(ca/d)*(ca/d));
    const fr=Math.max(0,ca),bk=Math.max(0,-ca);let dd=0;
    const pecY=(y>.4?Math.min(1,(y-.4)/.035):0)*(1-Math.min(1,Math.max(0,(y-.55)/.1)));
    for(const s of [-1,1]){if(P.fem)dd+=.062*C*r3ang(a,s*.36,.4)*r3g(y,.44,.075);else dd+=.042*C*r3ang(a,s*.42,.34)*pecY;
      for(const yc of [.29,.19,.09])dd+=.014*absK*r3ang(a,s*.16,.1)*r3g(y,yc,.035);
      dd+=.014*r3ang(a,s*1.15,.25)*r3g(y,.02,.08);
      for(const yc of [.36,.31,.26])dd+=.006*r3ang(a,s*.98,.08)*r3g(y,yc,.018);
      dd+=.034*lat*m*r3ang(a,s*1.95,.42)*r3g(y,.44,.12);
      dd+=.02*m*r3ang(a,Math.PI-s*.55,.3)*r3g(y,.5,.07);
      dd+=.05*m*r3ang(a,Math.PI-s*.5,.45)*r3g(y,.665,.05);dd+=.03*m*r3ang(a,s*1.2,.4)*r3g(y,.68,.035);
      dd+=.007*r3ang(a,s*.5,.25)*r3g(y,.635,.015)}
    dd-=.012*r3ang(a,0,.05)*(y>.4&&y<.6?1:0);dd-=.009*absK*r3ang(a,0,.05)*(y>-.02&&y<.36?1:0);
    dd-=.014*r3ang(a,Math.PI,.07)*(y>-.2&&y<.66?1:0);
    return Math.max(.02,r+dd*(1+.0*fr*bk))};
  const g=r3muscle(.94,rf,{seg:48,rad:56,cap:5,ck:.5});g.scale(1,R3_TS,1);return g;
}
/* ink lines on the torso, in (angle, height) body coordinates so they sit on the sculpted forms */
function r3torsoInk(skin,ribs,belly,top){const k='ti'+skin+ribs+belly+(top||'');if(R3D._c[k])return R3D._c[k];const N=512;const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=skin;x.fillRect(0,0,N,N);
  const P=(a,y)=>[(((a/(Math.PI*2))%1)+1)%1*N,(.72-y)/.94*N];
  const line=(pts,w,al)=>{for(const off of [0,N,-N]){x.strokeStyle=`rgba(29,21,23,${al})`;x.lineWidth=w;x.lineCap='round';x.lineJoin='round';x.beginPath();pts.forEach(([a,y],i)=>{let [px,py]=P(a,y);if(a<0&&px>N/2)px-=N;px+=off;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}};
  const ab=belly?.5:top?.6:1;
  for(const s of [-1,1]){
    if(!top)line([[s*.05,.44],[s*.28,.412],[s*.52,.425],[s*.78,.5]],5.5,.6);
    line([[s*.12,.63],[s*.36,.645],[s*.62,.665]],3,.32);
    for(const yy of [.245,.145,.05])line([[s*.03,yy],[s*.26,yy-.006]],3.6,.42*ab);
    line([[s*.32,.37],[s*.31,.2],[s*.26,.03],[s*.17,-.1]],3.2,.36*ab);
    for(let i=0;i<3;i++)line([[s*(.86+i*.05),.37-i*.05],[s*(.98+i*.05),.35-i*.05]],3,.38);
    line([[s*.62,.14],[s*.48,-.04]],3,.3);
    line([[s*.44,-.04],[s*.2,-.22]],3,.3);
    line([[Math.PI-s*.75,.58],[Math.PI-s*.5,.46],[Math.PI-s*.32,.42]],3.5,.35);
    line([[s*1.42,.56],[s*1.62,.4],[s*1.82,.28]],3,.3);
    if(ribs)for(let i=0;i<4;i++)line([[s*(1.0+i*.02),.33-i*.05],[s*(1.22+i*.02),.31-i*.05]],2.6,.32);
  }
  if(top){// sports top: scoop front, racerback straps, elastic under-band in the trim colour
    const yb=.33,yt=a=>{const f=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));let y=f<1.2?.55+.03*(f/1.2):f<2.4?.6:.58;
      if(f>.42&&f<.72)y=.74;if(f>Math.PI-.32)y=.74;return y};
    const cs=new THREE.Color(top[0]).getStyle(),ts=new THREE.Color(top[1]).getStyle();
    for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const y0=yt(a);x.fillStyle=cs;x.fillRect(i,(.72-y0)/.94*N,1.6,(y0-yb)/.94*N);x.fillStyle=ts;x.fillRect(i,(.72-yb)/.94*N-9,1.6,9)}
    const edge=[];for(let i=0;i<=96;i++){const a=-Math.PI+i/96*Math.PI*2;edge.push([a,yt(a)])}
    for(let i=1;i<edge.length;i++)line([edge[i-1],edge[i]],3.4,.55);
    for(let i=1;i<edge.length;i++)line([[edge[i-1][0],yb-.004],[edge[i][0],yb-.004]],3.6,.6);
    for(const s of [-1,1]){line([[s*.06,.5],[s*.3,.415],[s*.55,.45]],3,.32);line([[s*.02,.56],[s*.04,.47]],2.6,.35)}}
  line([[0,.43],[0,.58]],3,top?0:.35);line([[0,.37],[0,-.06]],3.6,.42*ab);line([[Math.PI,.64],[Math.PI,-.15]],3.5,.38);
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.keep=1;return R3D._c[k]=t}
function r3bootTex(col){const k='bt'+col;if(R3D._c[k])return R3D._c[k];const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle=col;x.fillRect(0,0,256,128);
  x.strokeStyle='rgba(29,21,23,.7)';x.lineWidth=3;for(const ox of [0,256]){x.beginPath();x.moveTo(ox-22,14);x.lineTo(ox-22,112);x.moveTo(ox+22,14);x.lineTo(ox+22,112);x.stroke();
    x.strokeStyle='rgba(245,240,230,.9)';x.lineWidth=4;for(let i=0;i<6;i++){const y=20+i*15;x.beginPath();x.moveTo(ox-18,y);x.lineTo(ox+18,y+10);x.moveTo(ox+18,y);x.lineTo(ox-18,y+10);x.stroke()}x.strokeStyle='rgba(29,21,23,.7)';x.lineWidth=3}
  x.fillStyle='rgba(29,21,23,.55)';x.fillRect(0,116,256,12);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.userData.keep=1;return R3D._c[k]=t}
function r3gloveTex(col){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle=col;x.fillRect(0,0,256,128);
  x.strokeStyle='rgba(29,21,23,.55)';x.lineWidth=3;x.beginPath();x.moveTo(0,50);x.lineTo(256,50);x.stroke();
  x.fillStyle='rgba(255,255,255,.12)';x.fillRect(0,54,256,6);x.strokeStyle='rgba(29,21,23,.35)';x.lineWidth=2;x.beginPath();x.moveTo(64,0);x.lineTo(64,50);x.moveTo(192,0);x.lineTo(192,50);x.stroke();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t}
/* ---------- walkout robes (Style A robe sheet) ----------
   satin: classic silk robe, hood down, shawl collar, metallic trim, belt (The Greatest)
   gold:  champion's silk, gold with black trim
   hood:  heavy terry robe, hood up and low over the eyes, belted, bulky (Rocco / Iron Kid)
   vest:  sleeveless hooded showman's vest, frayed edges, name patches, open front (Basilio)
   Sleeves are two pieces, one on the upper arm and one on the forearm, so they bend with the arm and the glove comes out of the cuff. */
const R3_ROBE={
  satin:{fab:'silk',hood:'down',sleeves:true,len:-.95,gap:.5,bulk:1,pose:'wave'},
  gold:{fab:'silk',hood:'down',sleeves:true,len:-.95,gap:.5,bulk:1,pose:'wave'},
  hood:{fab:'terry',hood:'up',sleeves:true,len:-1.0,gap:.3,bulk:1.04,pose:'hunch'},
  vest:{fab:'silk',hood:'drape',sleeves:false,fit:true,len:-.32,gap:.42,bulk:.96,pose:'punch',fray:true},
};
function r3robeTex(base,trim,fab,name,fray){
  const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');const bs=new THREE.Color(base).getStyle(),ts=new THREE.Color(trim).getStyle();
  x.fillStyle=bs;x.fillRect(0,0,512,512);const r=new Rng(11);
  if(fab==='silk'){for(let i=0;i<40;i++){const px=r.next()*512,w=6+r.next()*22;const g=x.createLinearGradient(px-w,0,px+w,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(255,255,255,${.06+r.next()*.1})`);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-w,0,w*2,512)}}
  else{for(let i=0;i<9000;i++){x.fillStyle=r.next()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.09)';x.fillRect(r.next()*512,r.next()*512,2,2)}
    for(let y=0;y<512;y+=10){x.fillStyle='rgba(0,0,0,.05)';x.fillRect(0,y,512,3)}}
  x.fillStyle=ts;x.fillRect(0,494,512,18);
  if(name){x.save();x.fillStyle=ts;x.strokeStyle='#1d1517';x.lineWidth=5;x.font='bold 64px "Alfa Slab One",Georgia,serif';x.textAlign='center';x.textBaseline='middle';
    const ny=fray?270:150;if(fray)x.font='bold 46px "Alfa Slab One",Georgia,serif';x.strokeText(name.slice(0,10),256,ny);x.fillText(name.slice(0,10),256,ny);
    if(fray){x.font='bold 18px "Alfa Slab One",Georgia,serif';for(const u of [.075,.925]){x.save();x.translate(u*512,262);x.rotate(u<.5?-.06:.06);x.fillStyle=ts;x.fillRect(-34,-15,68,30);x.fillStyle=bs;x.fillText(name.slice(0,6),0,1);x.restore()}}
    x.restore()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
/* frayed bottom edge: alpha mask with a ragged hem */
function r3frayMask(){if(R3D._fray)return R3D._fray;const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);x.fillStyle='#000';const r=new Rng(4);
  x.beginPath();x.moveTo(0,256);for(let i=0;i<=64;i++){x.lineTo(i*4,256-4-r.next()*18)}x.lineTo(256,256);x.fill();const t=new THREE.CanvasTexture(c);t.userData.keep=1;return R3D._fray=t}
/* open-front shell swept down the body; the front gap half-angle varies with height (V neck that closes at the belt) */
function r3robeShell(prof,sx,sz,gapAt,segs=40,rad=56,hole=null){
  const y0=prof[0][1],y1=prof[prof.length-1][1];
  const rAt=y=>{for(let i=1;i<prof.length;i++)if(y>=prof[i][1]){const [r0,a]=prof[i-1],[r1,b]=prof[i];const u=(a-y)/(a-b);return r0+(r1-r0)*u}return prof[prof.length-1][0]};
  const pos=[],uv=[],idx=[];
  for(let j=0;j<=segs;j++){const t=j/segs,y=y0+(y1-y0)*t,r=rAt(y),g=gapAt(y);
    for(let k=0;k<=rad;k++){const ph=g+(Math.PI*2-2*g)*k/rad;pos.push(Math.sin(ph)*r*sx,y,Math.cos(ph)*r*sz);uv.push(k/rad,1-t)}}
  const W=rad+1;for(let j=0;j<segs;j++)for(let k=0;k<rad;k++){const a=j*W+k,b=a+W;
    if(hole){const y=y0+(y1-y0)*(j+.5)/segs,g=gapAt(y),ph=g+(Math.PI*2-2*g)*(k+.5)/rad;if(hole(ph,y))continue}
    idx.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  return {geo:g,at:(ph,y,e=.006)=>{const r=rAt(y)+e;return new THREE.Vector3(Math.sin(ph)*r*sx,y,Math.cos(ph)*r*sz)},edge:(side)=>{const pts=[];for(let j=0;j<=segs;j+=2){const y=y0+(y1-y0)*j/segs,r=rAt(y)+.006,g=gapAt(y),ph=side>0?g:Math.PI*2-g;pts.push(new THREE.Vector3(Math.sin(ph)*r*sx,y,Math.cos(ph)*r*sz))}return pts},
    hem:()=>{const pts=[];const r=rAt(y1)+.006,g=gapAt(y1);for(let k=0;k<=24;k++){const ph=g+(Math.PI*2-2*g)*k/24;pts.push(new THREE.Vector3(Math.sin(ph)*r*sx,y1+.01,Math.cos(ph)*r*sz))}return pts}}}
function r3robe(L,P,m,parts){
  const R=R3_ROBE[L.robe];if(!R)return;const {spine,headG,arms,al}=parts;
  const base=L.robeCol||(L.robe==='gold'?'#f0be48':L.trunks),trim=L.robeTrim||(L.robe==='gold'?'#161616':L.trim);
  const C=P.chest*m*R.bulk,TS=R3_TS;
  const top=R.hood==='up'?.8:.79;
  // the body shell hugs the torso (narrower than the shoulder joints) so the arms sit in the sleeves, not under the robe
  // the sleeveless vest is cut like a tank top: fitted to the torso down to the ribs (so the shoulders and arms stay outside it), loose below
  const hw=r3torsoHW(P,m),fitProf=[];for(let y=.75;y>R.len-.001;y-=.03)fitProf.push([hw(y)+.042+Math.max(0,.3-y)*.14,y]);
  const prof=R.fit?fitProf:R.sleeves?[[.17,top],[.3*C,.75],[.4*C,.7],[.43*C,.6],[.43*C,.36],[.4*C,.12],[.43*C,-.12],[.46*C,-.5],[.49*C,R.len]]
                     :[[.17,top],[.3*C,.77],[.42*C,.71],[.45*C,.6],[.44*C,.36],[.42*C,.12],[.44*C,R.len]];
  const gapAt=R.fray?(y=>R.gap*(y>.6?.85+(y-.6):1)):(y=>y>.14?.05+R.gap*Math.pow(Math.min(1,(y-.14)/.62),1.15):y<-.55?.05+.16*Math.min(1,(-.55-y)/.4):.05);
  // sleeveless vest: real armholes cut through the shell (slightly forward of the side seam) so the arm comes out of the hole, not from under the cloth
  // deep tank-top armholes: the whole side from the ribs to the shoulder strap is open (rounded-rectangle cut, superellipse)
  const AH={y:.55,ry:.19,rx:.74,c:[Math.PI/2+.02,Math.PI*1.5-.02]};
  const inHole=R.sleeves?null:(ph,y)=>AH.c.some(pc=>((ph-pc)/AH.rx)**4+((y-AH.y)/AH.ry)**4<1);
  const sh=R.fit?r3robeShell(prof,1.18,P.depth*1.22,gapAt,44,96,inHole):r3robeShell(prof,R.sleeves?1.2:1.13,P.depth/.72*1.08,gapAt,40,72,inHole);sh.geo.scale(1,TS,1);
  const tex=r3robeTex(base,trim,R.fab,L.band||'',R.fray);
  const mat=r3cel(0xffffff,tex,true,R.fab==='terry'?1.15:.85);mat.side=THREE.DoubleSide;
  if(R.fray){mat.alphaMap=r3frayMask();mat.alphaTest=.5;mat.transparent=false}
  spine.add(r3mesh(sh.geo,mat,{olw:.0042}));
  const trimM=r3cel(new THREE.Color(trim).getHex(),null,true,.5);
  const tube=(pts,r)=>{const g=r3strand(pts.map(p=>new THREE.Vector3(p.x,p.y*TS,p.z)),r,r,40,8,true);return r3mesh(g,trimM,{olw:.0026})};
  if(!R.fray){spine.add(tube(sh.edge(1),R.fab==='terry'?.016:.022));spine.add(tube(sh.edge(-1),R.fab==='terry'?.016:.022));spine.add(tube(sh.hem(),.014))}
  if(inHole)for(const pc of AH.c){const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,c=Math.cos(a),sn=Math.sin(a);pts.push(sh.at(pc+Math.sign(c)*Math.sqrt(Math.abs(c))*AH.rx*.985,AH.y+Math.sign(sn)*Math.sqrt(Math.abs(sn))*AH.ry*.985,.004))}spine.add(tube(pts,.012))}
  // heavy robes: a lighter stitched seam over each shoulder and round the armhole so dark sleeves read against the body
  const seamM=r3cel(new THREE.Color(base).lerp(new THREE.Color(0xffffff),.26).getHex(),null,true,1.1);
  if(R.fab==='terry')for(const sd of [1,-1]){const pts=[];for(let i=0;i<=10;i++){const y=.77-.13*i/10;pts.push(sh.at(sd>0?Math.PI/2+.05:Math.PI*1.5-.05,y,.008).lerp(sh.at(sd>0?.6:Math.PI*2-.6,.79,.008),1-i/10))}
    spine.add(r3mesh(r3strand(pts.map(p=>new THREE.Vector3(p.x,p.y*TS,p.z)),.011,.011,20,6,true),seamM,{olw:.0018}))}
  // belt with a knot and two hanging ends
  if(R.sleeves){const bw=.45*C*1.2,bd=.45*C*P.depth/.72*1.08;const bm=r3cel(new THREE.Color(R.fab==='terry'?base:trim).getHex(),null,true,.7);
    const belt=r3mesh(new THREE.TorusGeometry(1,.035,8,48),bm,{olw:.003});belt.scale.set(bw+.01,bd+.01,1);belt.rotation.x=Math.PI/2;belt.position.y=.12*TS;spine.add(belt);
    const kx=-.12,kz=bd+.02;const knot=r3mesh(new THREE.SphereGeometry(.045,12,10),bm,{olw:.003});knot.position.set(kx,.12*TS,kz);spine.add(knot);
    for(const o of [-.03,.04]){spine.add(r3mesh(r3strand([new THREE.Vector3(kx,.12*TS,kz),new THREE.Vector3(kx+o,-.05,kz+.03),new THREE.Vector3(kx+o*1.6,-.24,kz+.02)],.024,.02,10,6,true),bm,{olw:.0026}))}}
  // sleeves: upper on the shoulder group, lower on the elbow group, flared cuff with trim
  if(R.sleeves){const smat=r3cel(0xffffff,tex,true,R.fab==='terry'?1.15:.85);const cuffM=r3cel(new THREE.Color(base).lerp(new THREE.Color(0xffffff),.22).getHex(),null,true,1.1);
    for(const s of [-1,1]){const A=arms[s];const ak=m*P.arm*R.bulk;
      const up=r3mesh(r3muscle(.5*al,(t,a)=>ak*(.16-.02*t),{seg:8,rad:22,cap:3,ck:.55}),smat,{olw:.004});up.position.y=.07;A.sh.add(up);
      if(R.fab==='terry'){const sr=r3mesh(new THREE.TorusGeometry(ak*.163,.011,6,28),seamM,{olw:.0018});sr.rotation.x=Math.PI/2;sr.position.y=-.02;A.sh.add(sr)}
      const lo=r3mesh(r3muscle(.36*al,(t,a)=>ak*(.13+.045*t*t),{seg:8,rad:22,cap:2,ck:.3}),smat,{olw:.004});lo.position.y=.04;A.elbow.add(lo);
      const cuff=r3mesh(new THREE.TorusGeometry(ak*.17,R.fab==='terry'?.024:.016,6,24),R.fab==='terry'?cuffM:trimM,{olw:.002});cuff.rotation.x=Math.PI/2;cuff.position.y=-.32*al;A.elbow.add(cuff)}}
  // hood: up (shell over the head, face open; low hoods shade the eyes) or down (rolled collar behind the neck)
  if(R.hood==='up'){const hm=r3cel(0xffffff,tex,true,R.fab==='terry'?1.15:.85);hm.side=THREE.DoubleSide;if(R.fray){hm.alphaMap=r3frayMask();hm.alphaTest=.5}
    const hg=new THREE.SphereGeometry(.3,40,24,Math.PI/2+.95,Math.PI*2-1.9,0,Math.PI*.7);const hood=r3mesh(hg,hm,{olw:.004});
    hood.scale.set(.96,1.1,1.05);hood.position.set(0,.05,-.035);hood.rotation.x=L.hoodLow?.38:.18;headG.add(hood);
    const cowl=r3mesh(new THREE.TorusGeometry(.2,.065,10,32,Math.PI*1.5),hm,{olw:.003});cowl.rotation.set(Math.PI/2,0,Math.PI*.25);cowl.position.set(0,.77*TS,-.02);cowl.scale.set(1.15,.9,1);spine.add(cowl)}
  else if(R.hood==='drape'){// hood down: a soft frayed cowl lying on the upper back, clear of the hair
    const hm=r3cel(0xffffff,tex,true,.85);hm.side=THREE.DoubleSide;if(R.fray){hm.alphaMap=r3frayMask();hm.alphaTest=.5}
    const hg=new THREE.SphereGeometry(.26,32,16,Math.PI/2+.7,Math.PI*2-1.4,0,Math.PI*.55);const hood=r3mesh(hg,hm,{olw:.0035});
    const bz=R.fit?(hw(.66)+.042)*P.depth*1.22:.44*C*1.08*P.depth/.72;hood.scale.set(.78,.42,.62);hood.rotation.x=-1.5;hood.position.set(0,.66*TS,-bz+.03);spine.add(hood);
    const roll=r3mesh(new THREE.TorusGeometry(.2,.04,10,32,Math.PI*1.25),hm,{olw:.003});roll.rotation.set(Math.PI/2-.15,0,Math.PI*.375);roll.position.set(0,.75*TS,-.03);roll.scale.set(R.fit?.95:1.2,R.fit?.8:1,1);spine.add(roll)}
  else{const col=r3mesh(new THREE.TorusGeometry(.19,.055,10,32,Math.PI*1.3),r3cel(new THREE.Color(trim).getHex(),null,true,.6),{olw:.003});col.rotation.set(Math.PI/2-.25,0,Math.PI*.35);col.position.set(0,.78*TS,-.03);col.scale.set(1.2,1,1);spine.add(col)}
}
/* ---------- boxer rig ---------- */
function r3boxer(L,opt={}){
  if(L.model==='duncan'&&R3M.ok('duncan'))return r3duncan(L,opt);
  if(r3rigOn(L))return r3rigged(L,opt);
  const P0=R3_BT[L.bt]||R3_BT.athletic,P=L.fem?r3femP(P0):P0,m=L.mass||1,TS=R3_TS;
  const skinM=r3cel(L.skin);
  const root=new THREE.Group();root.scale.setScalar(1+((L.height||70)-70)*.011);
  const ll=P.legLen*1.2,legY=.12+.99*ll;
  const pelvis=new THREE.Group();pelvis.position.y=legY-.11;root.add(pelvis);
  const spine=new THREE.Group();spine.position.y=.08;pelvis.add(spine);
  const H=P.hip*m,Wa=P.waist*m,bel=P.belly?.035:0;
  const torso=r3mesh(r3torsoGeo(P,m),r3cel(0xffffff,r3torsoInk(L.skin,!!P.ribs,!!P.belly,P.fem?[L.trunks,L.trim]:null)),{olw:.0046});torso.position.y=.72*TS;spine.add(torso);
  const trunkM=r3cel(0xffffff,r3trunkTex(L.trunks,L.trim,L.trunkPat),true);
  const trunks=r3mesh(r3lathe([[0,.04],[.235*H,.04],[.27*H,-.06],[.285*H,-.2],[.29*H,-.3],[0,-.3]],1.14,.84*P.depth/.72,40),trunkM,{olw:.0048});trunks.position.y=-.02;pelvis.add(trunks);
  const bandR=.25*Math.max(H,Wa+bel*2);const band=r3mesh(new THREE.CylinderGeometry(bandR,bandR*.98,.1,48,1,true),r3cel(0xffffff,r3bandTex(new THREE.Color(L.trim).getStyle(),new THREE.Color(L.trunks).getStyle(),L.band),true),{olw:.0042});
  band.scale.set(1.15,1,.86*P.depth/.72);band.position.y=.03;pelvis.add(band);
  const chest=new THREE.Group();chest.position.y=.52*TS;spine.add(chest);
  const nl=.27*P.neckLen,nb=.64*TS;
  const neck=r3mesh(r3muscle(nl+.06,(t,a)=>P.neck*(1+.07*t)*(1+.1*r3ang(a,.35,.25)*r3g(t,.5,.3)+.1*r3ang(a,-.35,.25)*r3g(t,.5,.3)+.18*r3ang(a,Math.PI,.8)*t)*(1-.06*r3ang(a,0,.2)),{seg:10,rad:24,cap:0}),skinM,{olw:.004});neck.position.y=nb+nl;spine.add(neck);
  const headG=new THREE.Group();headG.position.y=nb+nl+.11;spine.add(headG);
  const head=r3head(L);head.scale.setScalar(.95);head.position.y=.02;headG.add(head);
  const arms={},al=P.len*1.06;
  for(const s of [-1,1]){
    const sh=new THREE.Group();sh.position.set(s*P.sh*m,.12*TS,0);chest.add(sh);
    const dk=m*P.delt;
    const delt=r3mesh(r3muscle(.32*al,(t,a)=>dk*(.118*(1-.78*Math.pow(t,1.3))+.012)*(1+.16*r3ang(a,s*Math.PI/2,.9)+.1*r3ang(a,.3*s,.5)*r3g(t,.35,.2)+.08*r3ang(a,Math.PI-.3*s,.5)*r3g(t,.35,.2)),{seg:12,rad:24,cap:5,ck:.32}),skinM,{olw:.0036});
    delt.position.set(s*.02,.0,0);sh.add(delt);
    const ak=m*P.arm;
    sh.add(r3mesh(r3muscle(.44*al,(t,a)=>ak*(.096-.02*t+.038*r3g(t,.47,.17)*r3ang(a,0,.85)+.03*r3g(t,.33,.2)*r3ang(a,Math.PI,.9)+.014*r3g(t,.22,.15)*r3ang(a,s*Math.PI/2,.6)),{seg:16,rad:22,cap:4,ck:.7}),skinM,{olw:.0042}));
    const elbow=new THREE.Group();elbow.position.y=-.44*al;sh.add(elbow);
    const fk=m*P.fore;
    elbow.add(r3mesh(r3muscle(.43*al,(t,a)=>fk*(.082-.034*Math.pow(t,1.15)+.026*r3g(t,.22,.15)*r3ang(a,s*1.1,.6)+.012*r3g(t,.28,.2)*r3ang(a,-s*1.6,.7))*(1+.14*t*(Math.abs(Math.sin(a))-.5)),{seg:14,rad:22,cap:4,ck:.7}),skinM,{olw:.0042}));
    const glove=new THREE.Group();glove.position.y=-.47*al;glove.scale.setScalar(1.18);elbow.add(glove);
    const gm=r3leather(L.gloves);r3glove(glove,gm,s,-1,L.gloveTape);
    arms[s]={sh,elbow,glove,gm,L1:.44*al,L2:.47*al+.02};
  }
  const legs={};
  for(const s of [-1,1]){const lk=P.leg*m;
    const hip=new THREE.Group();hip.position.set(s*.13*H,-.12,0);pelvis.add(hip);
    hip.add(r3mesh(r3muscle(.45*ll,(t,a)=>lk*(.158-.052*t+.026*r3g(t,.42,.2)*r3ang(a,0,.85)+.026*r3g(t,.74,.09)*r3ang(a,-s*.8,.45)+.02*r3g(t,.38,.2)*r3ang(a,s*1.6,.7)+.022*r3g(t,.4,.24)*r3ang(a,Math.PI,.9)),{seg:16,rad:24,cap:4,ck:.25}),skinM,{olw:.0045}));
    const sleeve=r3mesh(r3lathe([[0,.14],[.15*lk*1.15,.14],[.185*lk*1.12,.02],[.19*lk*1.1,-.1],[.19*lk*1.08,-.2*ll],[0,-.2*ll]],1,1.1,32),trunkM,{olw:.0045});hip.add(sleeve);
    const knee=new THREE.Group();knee.position.y=-.44*ll;hip.add(knee);
    knee.add(r3mesh(r3muscle(.37*ll,(t,a)=>lk*(.09-.038*t+.042*r3g(t,.27,.13)*r3ang(a,Math.PI,1)+.014*r3g(t,.36,.13)*r3ang(a,Math.PI+s*.9,.5)-.008*r3ang(a,0,.4)),{seg:14,rad:22,cap:4,ck:.6}),skinM,{olw:.0045}));
    const bootC=L.shoes?new THREE.Color(L.shoes):new THREE.Color(L.trim).lerp(new THREE.Color(0x2a2426),.35);
    const boot=r3mesh(r3lathe([[0,0],[.088,0],[.094,-.1],[.09,-.2],[.1,-.28],[0,-.28]],1,1.05,32),r3cel(0xffffff,r3bootTex(bootC.getStyle()),true),{olw:.0042});boot.position.y=-.37*ll+.1;knee.add(boot);
    const foot=r3mesh(r3muscle(.26,(t,a)=>(.055+.012*Math.sin(t*Math.PI))*(1+.35*Math.abs(Math.sin(a)))*(1-.2*r3ang(a,Math.PI,.5)),{seg:8,rad:16,cap:4,ck:.5}),r3cel(bootC.getHex(),null,true),{olw:.0038});
    foot.rotation.x=-Math.PI/2;foot.position.set(0,-.37*ll-.15,-.07);knee.add(foot);
    const sole=r3mesh(new THREE.BoxGeometry(.15,.035,.3),r3matte(0x1d1517),{ol:false});sole.position.set(0,-.37*ll-.2,.06);knee.add(sole);
    legs[s]={hip,knee};
  }
  if(opt.robe&&L.robe)r3robe(L,P,m,{spine,headG,arms,al});
  r3outline(root);
  const hy0=pelvis.position.y+spine.position.y+headG.position.y+head.position.y;
  root.userData={pelvis,spine,chest,headG,head,arms,legs,P,legY,hy0};
  return root;
}
/* glove: padded mitt (wider across the knuckles than deep), sculpted thumb, taped cuff. side s; dir -1 = fist toward -y (rig), +1 = toward +y */
function r3glove(gl,gm,s,dir,tape){
  const g=new THREE.Group();if(dir>0)g.rotation.z=Math.PI;gl.add(g);
  const mitt=r3mesh(r3muscle(.24,(t,a)=>(.098+.062*Math.sin(Math.min(1,t*1.5)*Math.PI/2)-.008*t)*(1+.1*Math.pow(Math.sin(a),2))*(1-.1*Math.pow(Math.cos(a),2))*(1+.06*r3ang(a,0,.5)*r3g(t,.8,.15)),{seg:12,rad:28,cap:6,ck:.75}),gm,{olw:.0042});mitt.position.y=.08;g.add(mitt);
  const thumb=r3mesh(r3muscle(.15,(t,a)=>.044-.01*t,{seg:6,rad:14,cap:4,ck:.8}),gm,{olw:.0032});thumb.position.set(s*.105,.06,.06);thumb.rotation.set(-.35,0,s*-.18);g.add(thumb);
  const cuff=r3mesh(new THREE.CylinderGeometry(.092,.1,.12,28),r3cel(0xf3efe6,null,true),{olw:.004});cuff.position.y=.15;g.add(cuff);
  const st=r3mesh(new THREE.CylinderGeometry(.095,.102,.026,28,1,true),r3cel(new THREE.Color(tape||'#1d1517').getHex(),null,true),{ol:false});st.position.y=.13;g.add(st);
}
/* two-bone IK: aim shoulder and elbow so the glove reaches target (world); elbow bends toward pole */
const _v=[0,1,2,3,4,5,6,7,8].map(()=>new THREE.Vector3()),_q=[0,1,2].map(()=>new THREE.Quaternion()),_DOWN=new THREE.Vector3(0,-1,0);
function r3ik(arm,target,pole){
  const L1=arm.L1||.44,L2=arm.L2||.5,S=_v[0],T=_v[1],E=_v[2],d=_v[3],n=_v[4],pl=_v[5];
  const sc=arm.sh.parent.getWorldScale(_v[6]).x;const l1=L1*sc,l2=L2*sc;
  arm.sh.getWorldPosition(S);T.copy(target);d.subVectors(T,S);let dist=d.length();const max=l1+l2-.02*sc;if(dist>max){d.multiplyScalar(max/dist);dist=max;T.copy(S).add(d)}if(dist<.05)dist=.05;
  d.normalize();
  const a=clamp((l1*l1+dist*dist-l2*l2)/(2*l1*dist),-1,1);const ang=Math.acos(a);
  pl.subVectors(pole,S);n.copy(pl).sub(d.clone().multiplyScalar(pl.dot(d)));if(n.lengthSq()<1e-6)n.set(0,-1,0);n.normalize();
  E.copy(S).add(d.clone().multiplyScalar(Math.cos(ang)*l1)).add(n.multiplyScalar(Math.sin(ang)*l1));
  const par=arm.sh.parent;par.updateWorldMatrix(true,false);
  const pq=_q[0];par.getWorldQuaternion(pq);const inv=_q[1].copy(pq).invert();
  const dirSE=_v[6].subVectors(E,S).normalize().applyQuaternion(inv);
  arm.sh.quaternion.setFromUnitVectors(_DOWN,dirSE);
  arm.sh.updateWorldMatrix(false,false);
  const sq=_q[2];arm.sh.getWorldQuaternion(sq);const sinv=sq.invert();
  const dirET=_v[6].subVectors(T,E).normalize().applyQuaternion(sinv);
  arm.elbow.quaternion.setFromUnitVectors(_DOWN,dirET);
}
/* a static guard pose for portraits and the creator */
function r3guard(bx,kind='high'){
  const u=bx.userData;if(u.duncan)return r3duncanGuard(bx,kind);bx.updateWorldMatrix(true,true);
  u.spine.rotation.set(kind==='hunch'?.2:.06,kind==='punch'?-.12:.12,0);u.headG.rotation.set(kind==='hunch'?.22:.06,kind==='punch'?.22:-.08,0);
  for(const s of [-1,1]){const lead=s===1;const L=u.legs[s];L.hip.rotation.set((lead?-14:8)*Math.PI/180,0,6*s*Math.PI/180);L.knee.rotation.set((lead?-10:-8)*Math.PI/180,0,0)}
  bx.updateWorldMatrix(true,true);
  const hy=(u.hc||u.headG).getWorldPosition(new THREE.Vector3()).y/bx.scale.y;
  const pose=(s)=>kind==='hunch'?new THREE.Vector3(s*.13,hy-.5,.66):kind==='punch'?(s===1?new THREE.Vector3(.8,hy-.08,1.0):new THREE.Vector3(-.2,hy-.3,.4)):kind==='wave'?(s===1?new THREE.Vector3(.5,hy+.12,.22):new THREE.Vector3(-.38,hy-1.05,.12)):null;
  for(const s of [-1,1]){const pz=pose(s);const t=pz?pz:kind==='down'?new THREE.Vector3(s*.36,hy-1.12,.12):kind==='low'?new THREE.Vector3(s*.3,hy-.66,.36):kind==='mid'?new THREE.Vector3(s*.24,hy-.48,.42):new THREE.Vector3(s*.25,hy-.36,.3);
    const pole=kind==='wave'&&s===1?new THREE.Vector3(1.6,.2,-.2):new THREE.Vector3(s*.35,-1.5,.7);r3ik(u.arms[s],t.applyMatrix4(bx.matrixWorld),pole.applyMatrix4(bx.matrixWorld));u.arms[s].glove.rotation.set(-.2,0,s*-.15)}
}
function r3dispose(o){o.traverse(m=>{if(m.geometry&&!m.geometry.userData.keep)m.geometry.dispose();const mats=m.material?(Array.isArray(m.material)?m.material:[m.material]):[];for(const mt of mats){if(mt.userData&&mt.userData.keep)continue;for(const k of ['map','alphaMap'])if(mt[k]&&!mt[k].userData.keep)mt[k].dispose();mt.dispose()}})}
/* ---------- arena ---------- */
function r3arena(scene,opt){
  const g=new THREE.Group();
  const fc=document.createElement('canvas');fc.width=fc.height=512;const x=fc.getContext('2d');x.fillStyle='#7d96b8';x.fillRect(0,0,512,512);
  const pool=x.createRadialGradient(256,256,60,256,256,340);pool.addColorStop(0,'rgba(245,240,230,.6)');pool.addColorStop(1,'rgba(20,40,80,.5)');x.fillStyle=pool;x.fillRect(0,0,512,512);
  x.fillStyle='rgba(29,21,23,.14)';x.font='bold 74px Georgia';x.textAlign='center';x.fillText('TWELVE',256,236);x.fillText('ROUNDS',256,310);
  const rr=new Rng(opt.seed||7);for(let i=0;i<260;i++){x.strokeStyle=`rgba(29,21,23,${rr.next()*.1})`;x.lineWidth=1+rr.next()*1.5;const px=rr.next()*512,py=rr.next()*512,l=4+rr.next()*14,a=rr.next()*3;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
  const ft=new THREE.CanvasTexture(fc);ft.colorSpace=THREE.SRGBColorSpace;ft.anisotropy=4;
  const floor=r3mesh(new THREE.BoxGeometry(7.4,.5,7.4),r3ink(new THREE.MeshStandardMaterial({map:ft,roughness:.8,envMapIntensity:.3}),.6),{ol:false});floor.position.y=-.25;g.add(floor);
  const apron=r3mesh(new THREE.BoxGeometry(7.4,.9,7.4),r3cel(0x16305a,null,true),{ol:false});apron.position.y=-.95;g.add(apron);
  for(const [px,pz] of [[-3.4,-3.4],[3.4,-3.4],[-3.4,3.4],[3.4,3.4]]){const p=r3mesh(new THREE.CylinderGeometry(.07,.07,1.6,16),r3cel(0x8a8f9c,null,true));p.position.set(px,.8,pz);g.add(p);
    [[0xd8392f,1.4],[0xf2f2f2,1.05],[0x2f6fe2,.7]].forEach(([c,y])=>{const t=r3mesh(new THREE.CylinderGeometry(.12,.12,.28,16),r3cel(c,null,true));t.position.set(px,y,pz);g.add(t)})}
  const ropeCol=[0xf2f2f2,0xd8392f,0xf2f2f2];
  const sides=[[[-3.4,-3.4],[3.4,-3.4]],[[3.4,-3.4],[3.4,3.4]],[[3.4,3.4],[-3.4,3.4]],[[-3.4,3.4],[-3.4,-3.4]]];
  sides.forEach(([a,b])=>{ropeCol.forEach((c,i)=>{const y=1.4-i*.35;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(a[0],y,a[1]),new THREE.Vector3(mid[0],y-.05,mid[1]),new THREE.Vector3(b[0],y,b[1])]);g.add(r3mesh(new THREE.TubeGeometry(curve,16,.035,8),r3cel(c,null,true)))})});
  r3outline(g,.0026);
  const heads=new THREE.SphereGeometry(.18,8,6),body=new THREE.CapsuleGeometry(.22,.4,3,8);
  let n=0;for(let row=0;row<5;row++)n+=60+row*18;
  const cm=r3ink(new THREE.MeshStandardMaterial({roughness:.9}),1);
  const hm=new THREE.InstancedMesh(heads,cm,n),bm=new THREE.InstancedMesh(body,cm,n);
  const m=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  for(let row=0;row<5;row++){const cnt=60+row*18,rad=6.5+row*1.1;for(let i=0;i<cnt;i++){const a=i/cnt*Math.PI*2+row*.07;const lit=rr.next()<.2;col.setHSL(.6+rr.next()*.08,.3,lit?.4:.12+row*.025);const y=-.3+row*.75;
    m.makeTranslation(Math.cos(a)*rad,y+.55+rr.next()*.1,Math.sin(a)*rad);hm.setMatrixAt(k,m);hm.setColorAt(k,col);m.makeTranslation(Math.cos(a)*rad,y,Math.sin(a)*rad);bm.setMatrixAt(k,m);bm.setColorAt(k,col);k++}}
  hm.instanceMatrix.needsUpdate=true;bm.instanceMatrix.needsUpdate=true;g.add(hm,bm);
  const st=r3spriteTex();for(const [px,py,pz,s] of [[-4,8.5,4,7],[4.5,8,-3,6],[0,9,-6,6.5],[-6,7,-5,5],[6,7.5,4,5]]){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:st,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}));sp.position.set(px,py,pz);sp.scale.set(s,s,1);g.add(sp);const core=new THREE.Sprite(new THREE.SpriteMaterial({map:st,blending:THREE.AdditiveBlending,depthWrite:false}));core.position.set(px,py,pz);core.scale.set(s*.25,s*.25,1);g.add(core)}
  scene.add(g);
  r3lights(scene,opt);
  return g;
}
function r3lights(scene,opt={}){
  scene.add(new THREE.HemisphereLight(0x8a9ad0,0x5a6a8a,.32));
  const bounce=new THREE.PointLight(0xf2e2c8,4,12,1.6);bounce.position.set(0,.2,2.2);scene.add(bounce);
  const key=new THREE.SpotLight(0xfff2de,150,34,.6,.55,1.7);key.position.set(-6.5,7.5,3.2);key.castShadow=!!opt.shadows;key.shadow.mapSize.set(1024,1024);key.shadow.radius=4;key.shadow.blurSamples=8;key.shadow.bias=-.0004;key.target.position.set(0,1,0);scene.add(key,key.target);
  const fill=new THREE.SpotLight(0x8fa4ff,16,34,.8,.7,1.7);fill.position.set(5,7,-2);fill.target.position.set(0,1,0);scene.add(fill,fill.target);
  const rim=new THREE.SpotLight(0xdfe8ff,90,34,.5,.5,1.7);rim.position.set(1.5,5.5,-6.5);rim.target.position.set(0,1.2,0);scene.add(rim,rim.target);
  if(opt.heat){const h=new THREE.PointLight(0xff8040,3,10,1.5);h.position.y=3;scene.add(h)}
}
function r3env(){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'#c8c2b4');g.addColorStop(.25,'#2a2d44');g.addColorStop(.55,'#101223');g.addColorStop(1,'#060710');x.fillStyle=g;x.fillRect(0,0,256,128);
  for(const [u,v,r] of [[60,20,20],[150,15,28],[215,25,16]]){const rg=x.createRadialGradient(u,v,1,u,v,r);rg.addColorStop(0,'#fff6e6');rg.addColorStop(.4,'rgba(255,230,190,.5)');rg.addColorStop(1,'rgba(255,230,190,0)');x.fillStyle=rg;x.fillRect(u-r,v-r,r*2,r*2)}
  const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;return t}
function r3grain(){if(R3D._grain)return R3D._grain;const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');const id=x.createImageData(160,160);const r=new Rng(99);
  for(let i=0;i<id.data.length;i+=4){const v=200+r.next()*55;id.data[i]=v;id.data[i+1]=v*.97;id.data[i+2]=v*.92;id.data[i+3]=255}x.putImageData(id,0,0);return R3D._grain=c.toDataURL()}
/* ---------- portraits and creator preview: one shared offscreen renderer ---------- */
const R3P={cache:new Map(),
  ok(){return R3D.ok()&&!(typeof UI!=='undefined'&&UI.silent)},
  init(){if(this.r)return;
    this.r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});this.r.setPixelRatio(1);
    this.r.toneMapping=THREE.ACESFilmicToneMapping;this.r.toneMappingExposure=1;this.r.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();this.scene.environment=r3env();r3lights(this.scene,{});
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const g=x.createRadialGradient(128,90,10,128,128,200);g.addColorStop(0,'#f1ebdf');g.addColorStop(1,'#bdb3a2');x.fillStyle=g;x.fillRect(0,0,256,256);
    const r=new Rng(5);for(let i=0;i<5000;i++){x.fillStyle=`rgba(80,60,40,${r.next()*.06})`;x.fillRect(r.next()*256,r.next()*256,1,1)}
    x.strokeStyle='rgba(29,21,23,.07)';x.lineWidth=1;for(let i=0;i<70;i++){const px=r.next()*256,py=r.next()*256;x.beginPath();x.moveTo(px,py);x.lineTo(px+12,py-12);x.stroke()}
    const bg=new THREE.CanvasTexture(c);bg.colorSpace=THREE.SRGBColorSpace;this.scene.background=bg;
    this.cam=new THREE.PerspectiveCamera(24,1,.05,30);
    this.r.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.dead=true});
  },
  shot(look,o={}){
    const mode=o.mode||'bust',size=o.size||(mode==='full'?360:224);
    const key=JSON.stringify([look,mode,size,o.height||0,o.expr||'',o.arch||'',o.legend||'',o.robe||0,o.guard||'',o.rot??'',look&&look.model||Settings.sculpt?R3M.v+(Settings.sculpt?'s':''):0]);
    if(this.cache.has(key))return this.cache.get(key);
    if(this.dead)return '';
    this.init();this.r.setSize(size,size,false);
    const L=r3look(look,{arch:o.arch,legend:o.legend,height:mode==='full'?o.height:70,mass:o.mass});if(o.expr)L.expr=o.expr;
    const bx=r3boxer(L,{robe:!!o.robe,texSize:512});bx.rotation.y=o.rot??(mode==='full'?(o.robe?(L.robe==='vest'?.3:-.18):-.42):-.22);this.scene.add(bx);r3guard(bx,o.robe&&L.robe&&R3_ROBE[L.robe]?R3_ROBE[L.robe].pose:o.guard);
    if(bx.userData.head)r3expr(bx.userData.head,Object.assign({lidOpen:1},R3_EXPR[L.expr]||{}));
    bx.updateWorldMatrix(true,true);const dn=bx.userData.duncan,hp=dn?new THREE.Vector3(0,bx.userData.hy0-.12,0).applyMatrix4(bx.matrixWorld):(bx.userData.hc||bx.userData.headG).getWorldPosition(new THREE.Vector3());
    if(mode==='full'){const h=dn?2.7:hp.y+.3;this.cam.fov=30;this.cam.position.set(.55,h*.58,h*2.25);this.cam.lookAt(0,h*.5,0)}
    else if(mode==='face'){const k=dn?1.7:1;this.cam.fov=22;this.cam.position.set(hp.x+.35*k,hp.y+.08,hp.z+1.75*k);this.cam.lookAt(hp.x,hp.y+.03,hp.z)}
    else{const k=dn?1.9:1;this.cam.fov=24;this.cam.position.set(hp.x+.25*k,hp.y+.02,hp.z+1.55*k);this.cam.lookAt(hp.x,hp.y-.1*k,hp.z)}
    this.cam.updateProjectionMatrix();r3U().px.value=4;
    let url='';try{this.r.render(this.scene,this.cam);url=this.r.domElement.toDataURL('image/png')}catch(e){url=''}
    this.scene.remove(bx);r3dispose(bx);
    if(this.cache.size>160)this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key,url);return url;
  },
};
/* ---------- the live fight renderer ---------- */
class Render3D{
  constructor(fight,stage){
    this.f=fight;this.stage=stage;
    const low=!Settings.gfxHi;
    this.r=new THREE.WebGLRenderer({antialias:!low,powerPreference:'high-performance',alpha:false});this.ok=true;
    this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1:1.5));
    this.r.shadowMap.enabled=!low;this.r.shadowMap.type=THREE.VSMShadowMap;this.r.toneMapping=THREE.ACESFilmicToneMapping;this.r.toneMappingExposure=.95;this.r.outputColorSpace=THREE.SRGBColorSpace;
    const cv=this.r.domElement;cv.className='gl';stage.insertBefore(cv,stage.firstChild);cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ok=false});
    stage.classList.add('ink');stage.style.setProperty('--grain',`url(${r3grain()})`);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0b0e1c);this.scene.fog=new THREE.Fog(0x10142a,10,34);this.scene.environment=r3env();
    this.cam=new THREE.PerspectiveCamera(50,1,.08,80);this.scene.add(this.cam);
    r3arena(this.scene,{shadows:!low,heat:fight.mods&&fight.mods.heat,seed:7});
    const dv=(typeof G!=='undefined'&&G&&G.boxer)?Math.max(0,DIVS.findIndex(d=>d.id===G.boxer.div)):3;const mass=.9+dv/7*.22;
    const os=fight.o.src||{},ps=fight.p.src||{};
    this.oL=r3look(fight.o.look,{name:fight.o.name,arch:os.arch,legend:os.legend,height:os.height,mass});this.pL=r3look(fight.p.look,{name:fight.p.name,mass});
    this.opp=r3boxer(this.oL);this.opp.position.set(0,.1,.2);this.scene.add(this.opp);this.hyW=.1+this.opp.userData.hy0*this.opp.scale.y;
    this.base=Object.assign({lidOpen:1},R3_EXPR[this.oL.expr]||{});
    this.oppFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:r3spriteTex(),blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));this.oppFlash.scale.set(1.2,1.2,1);this.scene.add(this.oppFlash);
    this.pg={};const gm=r3leather(this.pL.gloves);
    const foreM=r3cel(this.pL.skin);
    for(const h of ['L','R']){const s=h==='L'?-1:1;const gl=new THREE.Group();r3glove(gl,gm,-s,1,this.pL.gloveTape);
      r3outline(gl);gl.scale.setScalar(.9);this.cam.add(gl);
      // forearm: a unit-length limb stretched each frame from the glove's cuff back to a shoulder point below the screen
      const fore=r3mesh(r3limb(1,t=>(.085+.025*Math.sin(t*Math.PI*.8))/(1),1,1),foreM,{olw:.004});r3outline(fore);this.cam.add(fore);
      this.pg[h]={g:gl,s,gm,fore}}
    this.texKey='';this.fxSeen=0;this.flashT=0;
    this.resize();
  }
  resize(){const r=this.stage.getBoundingClientRect();const w=Math.max(10,r.width),h=Math.max(10,r.height);this.r.setSize(w,h,false);this.aspect=w/h;this.cam.aspect=this.aspect;this.W=w;this.H=h;this.cam.updateProjectionMatrix()}
  destroy(){try{this.stage.classList.remove('ink');r3dispose(this.scene);this.r.dispose();this.r.domElement.remove()}catch(e){}}
  poseOpp(P,glow){
    if(this.opp.userData.duncan)return r3duncanPose(this,P,glow);
    const f=this.f,o=f.o,u=this.opp.userData,t=f.time;
    const raw=P._raw||P;const lean=raw.lean||0,cr=raw.crouch||0,tw=raw.twist||0,ht=raw.headTilt||0,rot=raw.rot||0;
    const st=o.state,k=o.dur?clamp(o.t/o.dur,0,1):0;
    const sx=o.south?-1:1;
    const closeness=(raw.scale||1)-1;
    this.opp.position.set((raw.hip?raw.hip[0]:0)*.004,.1,.2+closeness*1.7);
    u.pelvis.position.y=u.legY-.11-cr*.32;
    let fwd=0;
    if(st==='wind')fwd=-5*k;else if(st==='act')fwd=14;else if(st==='rec')fwd=14*(1-k);
    if(st==='stagger')fwd=-14;if(st==='clinch')fwd=12;if(o.hurt>0&&st!=='down')fwd+=Math.sin(t*5)*4;
    u.spine.rotation.set(fwd*Math.PI/180,tw*1.05,-lean*.55);
    u.pelvis.rotation.y=tw*.35;
    const hdx=(raw.head?raw.head[0]:0)-(raw.chest?raw.chest[0]:0);
    u.headG.rotation.set((st==='down'?.35:0)+(o.hurt>0?.12:0),hdx*.004,-ht*1.0);
    if(st==='down'){const fall=rot;this.opp.rotation.x=-fall*.62;this.opp.rotation.y=sx*fall*.25;this.opp.position.y=.1+fall*.05;u.pelvis.position.y=u.legY-.11-cr*.32-fall*.1}
    else this.opp.rotation.set(0,0,0);
    const front=o.south?-1:1;
    for(const s of [-1,1]){const lead=s===front;const hipX=(lead?-14:8)+cr*55,kneeX=(lead?-10:-8)-cr*95,hipZ=6;
      const L=u.legs[s];L.hip.rotation.set(hipX*Math.PI/180,0,hipZ*s*Math.PI/180);L.knee.rotation.set(kneeX*Math.PI/180,0,0);
      if(st==='down'){L.hip.rotation.x=(s>0?-.1:.25)*rot;L.knee.rotation.x=-.45*rot}}
    this.opp.updateWorldMatrix(true,true);
    for(const h of ['L','R']){const s=h==='L'?1:-1;const g2=h==='L'?raw.lg:raw.rg;if(!g2)continue;
      const x=g2[0]*.0056,y=-g2[1]*.0066+(u.hy0-2.22)+(st==='down'?-.3*rot:0),ext=g2[2]||0;
      const T=_v[7].set(x,y,.22+ext*.78);
      if(st==='down'){T.set(s*.5,1.3-rot*.6,.2+rot*.4)}
      T.applyMatrix4(this.opp.matrixWorld);
      const type=o.pu&&o.pu.type;const active=o.pu&&(st==='wind'||st==='act'||st==='rec')&&f.hand(o,type)===h;
      const pole=(active&&type==='hook')||st==='clinch'?_v[8].set(s*1.3,u.hy0*.45,-.3):_v[8].set(s*.35,-1.5,.7);pole.applyMatrix4(this.opp.matrixWorld);
      r3ik(u.arms[s],T,pole);
      const gl=u.arms[s].glove;
      gl.rotation.set(active&&type!=='upper'?-.5:-.15,0,active&&type==='hook'?s*.9:0);
      const gw=glow&&glow[h]||0;u.arms[s].gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');u.arms[s].gm.emissiveIntensity=gw*.9;
    }
    if(u.rig)return r3rigFace(this,P);
    const face=P.face||'normal';
    const E=Object.assign({lidOpen:.9,squint:0,angry:0,hurt:0,open:0,grit:0,smile:0,look:0,lookY:0},this.base);
    if(P.blink)E.lidOpen=.05;
    if(P.wind){E.angry=1;E.squint=Math.max(E.squint,.3);E.grit=Math.max(E.grit,.8)}
    if(face==='hit'){Object.assign(E,{lidOpen:.15,squint:1,open:.6,hurt:.6,grit:0,smile:0})}
    else if(face==='hurt'){Object.assign(E,{lidOpen:.5,hurt:1,open:.45,angry:0,grit:0,smile:0,look:Math.sin(t*2.6)*.6})}
    else if(face==='ko'){Object.assign(E,{lidOpen:.05,open:.7,hurt:1,angry:0,grit:0,smile:0,lookY:-.5})}
    else if(face==='smile'){Object.assign(E,{lidOpen:.8,open:0,grit:0,smile:1,angry:0})}
    if(st==='act'&&o.pu&&o.pu.type!=='jab'){E.grit=1;E.angry=1}
    if(P.flash){E.squint=Math.max(E.squint,.4)}
    if(st==='stagger'&&!P.flash){E.open=Math.max(E.open,.5);E.grit=0}
    r3expr(u.head,E);
    const d=P.dmg||{};const key=[Math.round((d.swellL||0)*5),Math.round((d.swellR||0)*5),Math.round((d.cheek||0)*4),Math.round((P.cut||0)/12),Math.min(5,P.sweat||0)].join(',');
    if(key!==this.texKey){this.texKey=key;const c=u.head.userData.ctl;r3skinTex(this.oL,{dmg:d,cut:P.cut,sweat:P.sweat},c.texC);c.tex.needsUpdate=true}
  }
  /* opponent glove position in 2D-canvas pixels, for tell symbols */
  gloveScreen(hand){const u=this.opp.userData;const g=u.arms[hand==='L'?1:-1].glove;const v=g.getWorldPosition(new THREE.Vector3()).project(this.cam);
    const f=this.f;return {x:(v.x*.5+.5)*f.W,y:(-v.y*.5+.5)*f.H}}
  posePlayer(){
    const f=this.f,p=f.p,W=f.W,H=f.H;
    for(const h of ['L','R']){const g=f.pG[h],G3=this.pg[h];if(g.init==null)continue;
      const nx=(g.x/W)*2-1,ny=-((g.y/H)*2-1);const depth=Math.min(1.95,1.35/Math.max(.45,g.r));
      const fovY=this.cam.fov*Math.PI/180;const hh=Math.tan(fovY/2)*depth,hw=hh*this.cam.aspect;
      G3.g.position.set(nx*hw,ny*hh,-depth);
      const st=p.state;const type=p.pu&&p.pu.type;const active=p.pu&&(st==='wind'||st==='act'||st==='rec')&&f.hand(p,type)===h;
      const s=G3.s;
      let rx=-1.15,ry=s*-.15,rz=s*.22;
      if(active){if(type==='hook'){rz=s*1.1;rx=-1.0}else if(type==='upper'){rx=-.4}else{rx=-1.5;rz=s*.05}}
      if(st==='block'){rx=-.7;rz=s*.35}
      G3.g.rotation.set(rx,ry,rz);
      G3.g.visible=st!=='down'||p.t<.4;
      G3.g.updateMatrix();const cuff=_v[4].set(0,-.16,0).applyMatrix4(G3.g.matrix);const sh=_v[5].set(s*.5,-.95,-.25);
      const dir=_v[6].subVectors(sh,cuff);const len=dir.length();dir.normalize();
      G3.fore.position.copy(cuff);G3.fore.quaternion.setFromUnitVectors(_DOWN,dir);G3.fore.scale.set(1,len,1);G3.fore.visible=G3.g.visible;
      G3.gm.emissive.set(g.g>0?'#ffe0a0':'#000000');G3.gm.emissiveIntensity=(g.g||0)*.8;
    }
  }
  render(rdt,P,glow){
    const f=this.f,c=f.cam;
    r3U().px.value=Math.max(3.5,4.2*this.r.getPixelRatio());
    const ar=this.aspect;this.cam.fov=(ar<1?58:2*Math.atan(Math.tan(34*Math.PI/180)/ar)*180/Math.PI)/c.zoom;
    const shx=f.shake?(Math.random()*2-1)*f.shake*.0015:0,shy=f.shake?(Math.random()*2-1)*f.shake*.0012:0;
    const cx=c.x*.005+shx,cy=c.y*.0042+shy;
    const hy=this.hyW;this.cam.position.set(cx,hy-.36+cy,2.62);
    const look=_v[2].set(cx*.4,hy-.56+cy*.5,.2);this.cam.lookAt(look);this.cam.rotation.z+=c.rot;
    this.cam.updateProjectionMatrix();this.cam.updateMatrixWorld();
    this.poseOpp(P,glow);this.posePlayer();
    if(f.fx.length>this.fxSeen){const last=f.fx[f.fx.length-1];const body=last.y>200;const u0=this.opp.userData;const hp=_v[3].set(0,body?u0.hy0-.6:u0.hy0,.25).applyMatrix4(this.opp.matrixWorld);this.oppFlash.position.copy(hp);this.flashT=.18*(last.s||1);this.oppFlash.material.color.set(last.col||'#fff3d6');this.oppFlash.scale.setScalar(.8*(last.s||1))}
    this.fxSeen=f.fx.length;
    this.flashT=Math.max(0,this.flashT-rdt);this.oppFlash.material.opacity=Math.min(1,this.flashT*7);
    if(f.flashSil>0){this.oppFlash.material.opacity=Math.max(this.oppFlash.material.opacity,Math.min(1,f.flashSil*6));this.oppFlash.scale.setScalar(2.4)}
    const t0=performance.now();this.r.render(this.scene,this.cam);const ms=performance.now()-t0;
    this.ema=this.ema==null?ms:this.ema*.95+ms*.05;this.frames=(this.frames||0)+1;
    if(this.frames>90&&this.ema>22){const pr=this.r.getPixelRatio();if(pr>1){this.r.setPixelRatio(1);this.resize();this.frames=0;this.ema=null;if(typeof toast==='function')toast('3D detail lowered to keep the fight smooth')}
      else if(this.r.shadowMap.enabled){this.r.shadowMap.enabled=false;this.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});this.frames=0;this.ema=null}}
  }
}
