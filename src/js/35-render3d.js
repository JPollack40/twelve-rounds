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
}`;
function r3ink(mat,hatch=1){const U=r3U();
  mat.onBeforeCompile=sh=>{sh.uniforms.uHatchPx=U.px;sh.uniforms.uHatchT=U.t;sh.uniforms.uHatch={value:hatch};
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform float uHatchPx;uniform float uHatch;uniform vec2 uHatchT;\nvoid main() {').replace('#include <opaque_fragment>',R3_HATCH+'\n#include <opaque_fragment>')};
  mat.customProgramCacheKey=()=>'ink';return mat}
/* outline: back faces pushed out along the view-space normal by a constant screen fraction */
function r3outMat(w){const k='o'+w;if(R3D._c[k])return R3D._c[k];const m=new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uOut={value:w};sh.vertexShader='uniform float uOut;\n'+sh.vertexShader.replace('#include <project_vertex>','vec4 mvPosition=modelViewMatrix*vec4(transformed,1.0);\nvec3 onrm=normalize(normalMatrix*normal);\nmvPosition.xyz+=onrm*uOut*max(.35,-mvPosition.z);\ngl_Position=projectionMatrix*mvPosition;')};
  m.customProgramCacheKey=()=>'out'+w;m.userData.keep=1;return R3D._c[k]=m}
function r3outline(root,w=.0042){const list=[];root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.userData.isOL&&o.userData.ol!==false)list.push(o)});
  for(const o of list){const m=new THREE.Mesh(o.geometry,r3outMat(o.userData.olw||w));m.userData.isOL=true;m.castShadow=m.receiveShadow=false;m.raycast=()=>{};o.add(m)}return root}
function r3cel(hex,map,cloth,hatch=1){r3Mats();return r3ink(new THREE.MeshToonMaterial({color:map?0xffffff:hex,map:map||null,gradientMap:cloth?R3D._rampC:R3D._ramp}),hatch)}
function r3leather(hex){return r3ink(new THREE.MeshPhysicalMaterial({color:hex,roughness:.36,metalness:0,clearcoat:.7,clearcoatRoughness:.3,envMapIntensity:.9,emissive:0x000000}),.8)}
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
const R3_BT_ARCH={outboxer:'lanky',counter:'athletic',boxerpuncher:'athletic',swarmer:'brawler',slugger:'anvil'};
const R3_EXPR={grit:{angry:1,squint:.25,lidOpen:.86,grit:1},stern:{angry:.75,squint:.1,lidOpen:.9},calm:{angry:.3,lidOpen:.84},cocky:{angry:.15,lidOpen:.78,smile:.7}};
/* ---------- the skull: radial displacement in face space; front = -z in geometry (mesh is turned 180°) ---------- */
function r3sculpt(n,F){
  const bump=r3bump,jaw=F.jaw??1,chin=F.chin??1,nose=F.nose??1,cheek=F.cheek??1,brow=F.brow??1.2,nt=F.noseType||'straight';
  const lat=n.y,th=Math.atan2(-n.x,-n.z),front=Math.max(0,Math.cos(th)),ath=Math.abs(th);const fx=th,fy=lat;
  let sc=1;
  sc*=1-.08*Math.pow(Math.abs(Math.sin(th)),2)*Math.max(0,1-Math.abs(lat-.15)*1.3);
  sc*=1+.1*Math.max(0,-Math.cos(th))*Math.max(0,1-Math.abs(lat-.15)*1.4);
  sc*=1-.03*bump(lat-.95,.12);
  sc+=.07*brow*bump(fy-.21,.085)*front*bump(ath-.3,.38);
  sc-=.05*bump(fy-.5,.18)*front;
  for(const s of [-1,1]){const dx=(fx-s*.42)/.25,dy=(fy-.03)/.13;sc-=.09*Math.exp(-(dx*dx+dy*dy)/2)*front}
  for(const s of [-1,1]){sc+=.055*cheek*bump(fy+.15,.1)*bump(fx-s*.64,.19);sc+=.025*cheek*bump(fy+.36,.14)*bump(fx-s*.5,.22)}
  if(nt==='flat'){sc+=.12*nose*bump(fx,.13)*Math.max(0,bump(fy+.06,.22))*(fy<.24?1:0);sc+=.16*nose*bump(fx,.19)*bump(fy+.27,.1);for(const s of [-1,1])sc+=.13*nose*bump(fx-s*.22,.1)*bump(fy+.3,.075)}
  else if(nt==='broken'){const kx=fx-.05*bump(fy+.02,.12)+.03*bump(fy+.26,.08);sc+=.21*nose*bump(kx,.11)*Math.max(0,bump(fy+.06,.24))*(fy<.26?1:0);sc+=.045*bump(kx,.08)*bump(fy+.06,.05);sc+=.2*nose*bump(kx,.16)*bump(fy+.27,.1);for(const s of [-1,1])sc+=.11*nose*bump(kx-s*.2,.09)*bump(fy+.31,.07)}
  else{sc+=.22*nose*bump(fx,.1)*Math.max(0,bump(fy+.06,.24))*(fy<.26?1:0);sc+=.2*nose*bump(fx,.14)*bump(fy+.27,.1);for(const s of [-1,1])sc+=.1*nose*bump(fx-s*.19,.085)*bump(fy+.31,.07)}
  sc-=.03*bump(fx,.06)*bump(fy+.36,.04);
  sc-=.012*bump(fx,.07)*bump(fy+.44,.05);
  sc+=.03*bump(fx,.3)*bump(fy+.5,.045);
  sc-=.025*bump(fx,.32)*bump(fy+.56,.025);
  sc+=.04*bump(fx,.26)*bump(fy+.62,.05);
  sc-=.03*bump(fx,.3)*bump(fy+.7,.04);
  sc+=.3*chin*bump(fy+.78,.18)*bump(fx,.65);
  sc+=.07*jaw*bump(fy+.6,.2)*bump(ath-.75,.3);
  if(lat<-.2){const k=(-.2-lat)/.8;sc*=1-.14*k*k*(1-front*.55)/Math.max(.7,jaw);sc*=1-.22*k*Math.max(0,-Math.cos(th))}
  for(const s of [-1,1]){sc-=.015*bump(fx-s*.32,.05)*bump(fy+.4,.12);sc-=.03*bump(lat-.3,.16)*bump(th-s*1.05,.28)}
  return sc;
}
const _r3hg=new Map();
function r3headGeo(R,F={},segs=112){
  const key=R+'|'+segs+'|'+JSON.stringify(F);if(_r3hg.has(key))return _r3hg.get(key);
  const g=new THREE.SphereGeometry(R,segs,Math.round(segs*.75));const p=g.attributes.position;const v=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);n.copy(v).normalize();v.multiplyScalar(r3sculpt(n,F));v.y*=1.1;v.x*=.96;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();g.userData.keep=1;_r3hg.set(key,g);return g;
}
/* a point on the sculpted surface, in head space (front +z) */
function r3surf(R,F,th,lat,extra=0){lat=Math.max(-.98,Math.min(.98,lat));const c=Math.sqrt(1-lat*lat);
  const d=new THREE.Vector3(Math.sin(th)*c,lat,Math.cos(th)*c);const g=new THREE.Vector3(-d.x,d.y,-d.z);const sc=r3sculpt(g,F);
  return new THREE.Vector3(d.x*R*sc*.96,d.y*R*sc*1.1,d.z*R*sc).add(d.multiplyScalar(extra))}
/* face-space (th, lat) -> skin texture pixel */
const r3tx=(th,lat)=>[768+163*th,Math.acos(Math.max(-1,Math.min(1,lat)))/Math.PI*512];
/* ---------- painted skin: tone, warmth, ink detail lines, facial hair, scars, damage ---------- */
function r3skinTex(L,o={},cv){
  const c=cv||document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');const skin=L.skin;
  x.fillStyle=skin;x.fillRect(0,0,1024,512);
  const fx=768,fy=256;
  const occ=(px,py,rx,ry,a,col='60,25,25')=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.save();x.translate(px,py);x.scale(rx,ry);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  const ink=(a=.6)=>`rgba(29,21,23,${a})`;
  const line=(pts,w=4,a=.6)=>{x.strokeStyle=ink(a);x.lineWidth=w;x.lineCap='round';x.lineJoin='round';x.beginPath();pts.forEach(([th,lat],i)=>{const [px,py]=r3tx(th,lat);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()};
  for(const s of [-1,1]){occ(fx+s*110,fy+45,80,60,.2,'210,80,70');occ(fx+s*70,fy-8,46,30,.3);occ(fx+s*250,fy,40,50,.2,'210,80,70')}
  occ(fx,fy+60,24,16,.2,'210,80,70');occ(fx,fy+70,30,10,.3);occ(fx,fy+150,34,12,.25);occ(fx,fy+200,120,30,.25);
  x.fillStyle='rgba(165,75,75,.4)';x.beginPath();x.ellipse(fx,fy+95,40,7,0,0,7);x.fill();x.fillStyle='rgba(160,70,70,.42)';x.beginPath();x.ellipse(fx,fy+116,34,9,0,0,7);x.fill();
  x.fillStyle='rgba(40,15,15,.8)';x.beginPath();x.ellipse(fx-20,fy+64,8,5,.3,0,7);x.ellipse(fx+20,fy+64,8,5,-.3,0,7);x.fill();
  // ink detail lines (the sketch's linework): nasolabial folds, under-eye bags, cheekbone hatching, chin crease, brow furrow
  const hard=L.expr==='grit'||L.expr==='stern'?1:.6;
  for(const s of [-1,1]){
    line([[s*.2,-.27],[s*.27,-.36],[s*.33,-.47],[s*.36,-.55]],4,.5*hard);
    line([[s*.3,-.075],[s*.42,-.1],[s*.54,-.08]],3,.35);
    for(let i=0;i<4;i++)line([[s*(.56+i*.045),-.2+i*.012],[s*(.62+i*.045),-.27+i*.012]],2.4,.28);
    if(hard>.9){line([[s*.07,.15],[s*.05,.24]],3.5,.45)}
  }
  line([[-.16,-.71],[0,-.69],[.16,-.71]],3,.35);
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
/* torso: baked normal map (muscle forms) and an ink-line color map (pec line, sternum, abs, serratus, ribs) */
function r3torsoPaint(x,N,mode,ribs){const k=N/512;
  const soft=(px,py,rx,ry,a,rot=0)=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.6,`rgba(255,255,255,${a*.55})`);g.addColorStop(1,'rgba(255,255,255,0)');x.save();x.translate(px*k,py*k);x.rotate(rot);x.scale(rx*k,ry*k);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  const dark=(px,py,rx,ry,a,rot=0)=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');x.save();x.translate(px*k,py*k);x.rotate(rot);x.scale(rx*k,ry*k);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  const stroke=(pts,w,a)=>{x.strokeStyle=`rgba(29,21,23,${a})`;x.lineWidth=w*k;x.lineCap='round';x.beginPath();pts.forEach(([px,py],i)=>i?x.lineTo(px*k,py*k):x.moveTo(px*k,py*k));x.stroke()};
  for(const ox of [0,512]){
    if(mode==='nm'){soft(ox-44,205,54,36,.55,.12);soft(ox+44,205,54,36,.55,-.12);dark(ox,238,70,10,.5);dark(ox,205,6,42,.45);
      soft(ox-40,160,46,5,.35,.18);soft(ox+40,160,46,5,.35,-.18);dark(ox,172,20,8,.3);
      for(let r=0;r<3;r++){const y=282+r*32;soft(ox-22,y,22,14,.5);soft(ox+22,y,22,14,.5);dark(ox,y+17,48,4,.4)}dark(ox,318,4,64,.45);
      for(let i=0;i<4;i++){dark(ox-62,276+i*16,16,5,.3,.5);dark(ox+62,276+i*16,16,5,.3,-.5)}
      dark(ox-30,382,30,5,.3,.6);dark(ox+30,382,30,5,.3,-.6)}
    else{for(const s of [-1,1]){stroke([[ox+s*8,236],[ox+s*50,244],[ox+s*92,226]],7,.55);stroke([[ox+s*16,158],[ox+s*70,150]],4,.3);
        for(let r=0;r<3;r++){const y=298+r*32;stroke([[ox+s*6,y],[ox+s*36,y-3]],4.5,.45)}
        stroke([[ox+s*44,268],[ox+s*42,320],[ox+s*34,372]],4,.35);
        for(let i=0;i<4;i++)stroke([[ox+s*70,270+i*16],[ox+s*56,282+i*16]],3.5,.35);
        stroke([[ox+s*16,384],[ox+s*44,400]],4,.35);
        if(ribs)for(let i=0;i<5;i++)stroke([[ox+s*78,206+i*14],[ox+s*100,214+i*14]],3,.3)}
      stroke([[ox,186],[ox,232]],4,.4);stroke([[ox,270],[ox,374]],4.5,.42)}
  }
  if(mode==='nm'){dark(256,260,5,120,.5);soft(196,210,40,45,.3);soft(316,210,40,45,.3)}
  else{stroke([[256,150],[256,380]],4,.35)}
}
function r3torsoNM(){
  if(R3D._nm)return R3D._nm;
  const N=256;const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,N,N);r3torsoPaint(x,N,'nm');
  const id=x.getImageData(0,0,N,N),d=id.data,out=x.createImageData(N,N),o=out.data;
  const h=(i,j)=>d[(((j+N)%N)*N+((i+N)%N))*4]/255;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const dx=(h(i+1,j)-h(i-1,j))*3,dy=(h(i,j+1)-h(i,j-1))*3;const l=Math.hypot(dx,dy,1);const q=(j*N+i)*4;o[q]=(-dx/l*.5+.5)*255;o[q+1]=(dy/l*.5+.5)*255;o[q+2]=(1/l*.5+.5)*255;o[q+3]=255}
  x.putImageData(out,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.userData.keep=1;R3D._nm=t;return t;
}
function r3torsoMap(skin,ribs){const k='tm'+skin+ribs;if(R3D._c[k])return R3D._c[k];const N=512;const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=skin;x.fillRect(0,0,N,N);r3torsoPaint(x,N,'ink',ribs);
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.keep=1;return R3D._c[k]=t}
function r3spriteTex(){if(R3D._spr)return R3D._spr;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,245,225,1)');g.addColorStop(.3,'rgba(255,240,210,.35)');g.addColorStop(1,'rgba(255,240,210,0)');x.fillStyle=g;x.fillRect(0,0,128,128);R3D._spr=new THREE.CanvasTexture(c);R3D._spr.userData.keep=1;return R3D._spr}
function r3teethTex(){if(R3D._teeth)return R3D._teeth;const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='#f3efe6';x.fillRect(0,0,256,64);
  x.strokeStyle='#2a1c1c';x.lineWidth=3;x.beginPath();x.moveTo(0,32);x.lineTo(256,32);x.stroke();x.lineWidth=2.5;for(let i=1;i<10;i++){const px=i*25.6;x.beginPath();x.moveTo(px,4);x.lineTo(px+1,30);x.moveTo(px+3,34);x.lineTo(px+2,60);x.stroke()}
  x.fillStyle='rgba(60,30,30,.35)';x.fillRect(0,0,22,64);x.fillRect(234,0,22,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData.keep=1;return R3D._teeth=t}
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
  return {skin,hair:lk.hair||'short',hairColor,beard:lk.beard||'none',trunks:lk.trunks||'#d8392f',trim:lk.trim||'#f4efe3',gloves:lk.gloves||'#d8392f',
    eyes:['#4a2a16','#2a160c','#3a5a7a','#4a5a3a','#5a3a20'][h%5],shape:Object.assign({},shape,{noseType:lk.nose||'straight'}),
    scar:lk.scar||'none',ear:lk.ear||'normal',expr:lk.expr||'stern',bt,band:lk.band||'',
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
    const c=S(s*.42,.035,-.03);const eye=new THREE.Group();eye.position.copy(c);g.add(eye);
    eye.add(r3mesh(new THREE.SphereGeometry(.042,28,20),eyeMat,{ol:false}));
    const ig=new THREE.Group();eye.add(ig);ctl.eyes.push(ig);
    const iris=r3mesh(new THREE.SphereGeometry(.0425,28,20,0,Math.PI*2,0,.74),new THREE.MeshPhysicalMaterial({color:L.eyes,roughness:.3,clearcoat:1}),{ol:false});iris.rotation.x=Math.PI/2;ig.add(iris);
    const pupil=r3mesh(new THREE.SphereGeometry(.043,20,14,0,Math.PI*2,0,.36),r3flat(0x070404),{ol:false});pupil.rotation.x=Math.PI/2;ig.add(pupil);
    const glint=r3mesh(new THREE.SphereGeometry(.0065,10,8),r3flat(0xffffff),{ol:false});glint.position.set(-.011,.014,.039);ig.add(glint);
    // lids: skin caps that rotate down over the ball; a heavy ink lash line rides the upper lid's edge
    const tc=Math.PI*.42,ru=.0465;
    const upG=new THREE.Group();eye.add(upG);upG.add(r3mesh(new THREE.SphereGeometry(ru,28,18,0,Math.PI*2,0,tc),skinP,{ol:false}));
    const lash=r3mesh(new THREE.TorusGeometry(ru*Math.sin(tc),.0068,6,30,Math.PI),inkM,{ol:false});lash.rotation.x=Math.PI/2;lash.position.y=ru*Math.cos(tc);upG.add(lash);
    const loG=new THREE.Group();eye.add(loG);const tl=Math.PI*.3;loG.add(r3mesh(new THREE.SphereGeometry(.045,28,14,0,Math.PI*2,Math.PI-tl,tl),skinP,{ol:false}));
    const ll=r3mesh(new THREE.TorusGeometry(.045*Math.sin(tl),.0028,5,24,Math.PI),inkM,{ol:false});ll.rotation.x=Math.PI/2;ll.position.y=-.045*Math.cos(tl);loG.add(ll);
    ctl.lids.push(upG);ctl.lows.push(loG);
    // brow: heavy tapered tube, thick at the inner end, low over the eye
    const bg=new THREE.Group();bg.position.copy(c);g.add(bg);ctl.brows.push({g:bg,s,base:c.clone()});
    const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(S(s*(.1+.62*t),.165+.055*Math.sin(t*Math.PI*.9)-.02*t,.018).sub(c))}
    bg.add(r3mesh(r3strand(pts,.03,.012,24,8,true),r3cel(browCol,null,false,.4),{olw:.0024}));
  }
  // mouth: ink line + lips; teeth band and dark cavity revealed by grit/open
  {const lipM=r3cel(new THREE.Color(L.skin).offsetHSL(-.01,.1,-.08).getHex());
    const arc=(lat,w,yoff,e=.006)=>{const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(S(-w+2*w*t,lat+Math.sin(t*Math.PI)*yoff,e))}return pts};
    const up=r3mesh(r3strand(arc(-.515,.27,.01),.009,.009,20,7,true),lipM,{ol:false});g.add(up);ctl.lipUp=up;
    const lo=r3mesh(r3strand(arc(-.6,.24,-.012),.013,.013,20,7,true),lipM,{olw:.0018});g.add(lo);ctl.lipLo=lo;
    const ml=r3mesh(r3strand(arc(-.553,.3,-.004,.012),.0045,.0045,20,6,true),inkM,{ol:false});g.add(ml);ctl.mline=ml;
    const mp=S(0,-.555,0);
    const cav=r3mesh(new THREE.SphereGeometry(.07,16,12),r3flat(0x2a0d0d),{ol:false});cav.position.copy(S(0,-.555,-.026));cav.scale.set(1.15,.01,.5);g.add(cav);ctl.cav=cav;
    const tr=.13;const teeth=r3mesh(new THREE.CylinderGeometry(tr,tr,.036,24,1,true,-.42,.84),new THREE.MeshBasicMaterial({map:r3teethTex()}),{ol:false});
    teeth.position.set(mp.x,mp.y,mp.z-tr+.009);teeth.visible=false;g.add(teeth);ctl.teeth=teeth}
  // ears (cauliflower = swollen, lumpy)
  const cauli=L.ear==='cauliflower';
  for(const s of [-1,1]){const e=new THREE.Group();e.position.set(s*R*.98,-.01,-.02);e.rotation.y=s*.35;g.add(e);
    const rimG=r3mesh(new THREE.TorusGeometry(.036,cauli?.019:.013,8,24),skinP,{olw:.0028});rimG.scale.set(.85,1.15,1);e.add(rimG);
    const bowl=r3mesh(new THREE.SphereGeometry(.03,14,10),r3cel(new THREE.Color(L.skin).offsetHSL(0,0,-.1).getHex()),{ol:false});bowl.scale.set(.6,.9,.4);bowl.position.x=s*-.006;e.add(bowl);
    if(cauli)for(const [px,py] of [[.01,.025],[-.012,-.02],[.0,.0]]){const l=r3mesh(new THREE.SphereGeometry(.017,10,8),skinP,{olw:.002});l.position.set(px,py,.006);e.add(l)}}
  r3hair(g,L,hg,R,S);
  g.userData.ctl=ctl;
  return g;
}
/* hair: an alpha-masked cap for coverage plus geometric clumps that carry the ink outlines */
function r3hair(g,L,hg,R,S){
  const style=L.hair||'short';if(style==='bald')return;
  const hc=new THREE.Color(L.hairColor||'#1a120c');const hm=r3cel(hc.getHex(),null,false,.7);
  const rr=new Rng(L.hseed||1);const rnd=(a,b)=>a+(b-a)*rr.next();
  const mask=(fn)=>{const am=document.createElement('canvas');am.width=512;am.height=256;const ax=am.getContext('2d');ax.scale(.5,.5);ax.fillStyle='#000';ax.fillRect(0,0,1024,512);ax.fillStyle='#fff';fn(ax);const t=new THREE.CanvasTexture(am);return t};
  const fx=768,fy=256;
  const hairline=(ax,top=-104)=>{ax.beginPath();ax.rect(0,0,1024,512);ax.moveTo(fx-175,fy-30);ax.bezierCurveTo(fx-185,fy+top+10,fx-40,fy+top-8,fx,fy+top+6);ax.bezierCurveTo(fx+40,fy+top-8,fx+185,fy+top+10,fx+175,fy-30);ax.bezierCurveTo(fx+225,fy+40,fx+225,fy+250,fx+200,fy+400);ax.lineTo(fx-200,fy+400);ax.bezierCurveTo(fx-225,fy+250,fx-225,fy+40,fx-175,fy-30);ax.closePath();ax.fill('evenodd');
    const nape=ax.createLinearGradient(0,fy+80,0,fy+140);nape.addColorStop(0,'rgba(0,0,0,0)');nape.addColorStop(1,'#000');ax.fillStyle=nape;ax.fillRect(0,fy+80,1024,432)};
  const cap=(thick,am,ol=false)=>{const m=r3ink(new THREE.MeshToonMaterial({color:hc,gradientMap:R3D._ramp,alphaMap:am,transparent:true,alphaTest:.5,side:THREE.DoubleSide}),.7);const c=r3mesh(hg,m,{ol});c.rotation.y=Math.PI;c.scale.setScalar(thick);g.add(c);return c};
  const add=(geo,o)=>{const m=r3mesh(geo,hm,o);g.add(m);return m};
  const nrm=(th,lat)=>{const c=Math.sqrt(1-lat*lat);return new THREE.Vector3(Math.sin(th)*c,lat,Math.cos(th)*c)};
  const back=new THREE.Vector3(0,0,-1),up=new THREE.Vector3(0,1,0);
  if(style==='mohawk'){
    cap(1.012,mask(ax=>{ax.fillStyle='#000';ax.fillRect(0,0,1024,512);ax.fillStyle='#fff';for(const cx of [fx,fx-512,fx+512]){ax.beginPath();ax.ellipse(cx,fy-160,46,120,0,0,7);ax.fill()}ax.fillRect(fx-520-46,0,92,fy-150)}));
    for(let i=0;i<18;i++){const t=i/17;const a=.98+t*2.45;
      const n=new THREE.Vector3(0,Math.sin(a),Math.cos(a));const base=S(Math.atan2(0,n.z),Math.min(.97,n.y),-.004);
      const len=(.26-.14*t)*rnd(.85,1.15),sweep=back.clone().multiplyScalar(len*(.55+.3*t)).add(up.clone().multiplyScalar(len*.12));
      for(const ox of [-.018,.018,0]){const b=base.clone();b.x+=ox;const tip=b.clone().add(n.clone().multiplyScalar(len*.85)).add(sweep);const mid=b.clone().add(n.clone().multiplyScalar(len*.6)).add(sweep.clone().multiplyScalar(.35));
        add(r3strand([b,mid,tip],ox?.034:.042,.002,8,6),{olw:.0034})}}
    return}
  if(style==='buzz'){const c=cap(1.008,mask(ax=>hairline(ax,-100)));c.material.color.copy(hc).lerp(new THREE.Color(L.skin),.38);return}
  if(style==='afro'){const m=mask(ax=>hairline(ax,-96));for(const t2 of [1.12,1.19])cap(t2,m);
    for(let i=0;i<90;i++){const th=rnd(-2.6,2.6),lat=rnd(.25,.98);if(Math.abs(th)<.9&&lat<.55)continue;const p=nrm(th,lat).multiplyScalar(R*1.24+rnd(0,.015));p.y*=1.08;const b=add(new THREE.SphereGeometry(rnd(.035,.05),10,8),{olw:.0026});b.position.copy(p)}return}
  cap(style==='curly'?1.04:1.03,mask(ax=>hairline(ax,style==='slick'?-112:style==='shaggy'?-90:-104)));
  if(style==='curly'){for(let i=0;i<110;i++){const th=rnd(-2.8,2.8),lat=rnd(.3,.97);if(Math.abs(th)<1&&lat<.58)continue;if(Math.abs(th)>2.2&&lat<.45)continue;const p=S(th,lat,.012);const b=add(new THREE.SphereGeometry(rnd(.018,.026),8,6),{olw:.0018});b.position.copy(p)}return}
  if(style==='topknot'){const bun=add(new THREE.SphereGeometry(.065,16,12),{olw:.003});bun.position.set(0,R*1.16,-.07);bun.scale.set(1,.85,1)}
  if(style==='braids'){for(let k=-3;k<=3;k++){const pts=[];for(let i=0;i<=10;i++){const a=.95+i/10*2.4;const n=new THREE.Vector3(k*.15*(1-.4*i/10),Math.sin(a),Math.cos(a)).normalize();pts.push(S(Math.atan2(n.x,n.z),n.y,.014))}
    add(r3strand(pts,.017,.012,30,6),{olw:.002})}return}
  const n0=style==='shaggy'?46:style==='spiky'?40:style==='slick'?26:32;
  for(let i=0;i<n0;i++){
    let th,lat;
    if(i<14){th=-1.05+2.1*(i/13)+rnd(-.05,.05);lat=.57+.05*Math.abs(th)+rnd(-.02,.03)}else{th=rnd(-2.6,2.6);lat=rnd(.6,.97)}
    const n=nrm(th,lat);const base=S(th,lat,-.003);
    if(style==='slick'){const tip=base.clone().add(back.clone().multiplyScalar(.12)).add(n.clone().multiplyScalar(.02));const mid=base.clone().lerp(tip,.5).add(n.clone().multiplyScalar(.022));add(r3strand([base,mid,tip],.022,.006,8,6),{olw:.0022});continue}
    if(style==='short'){const tip=base.clone().add(n.clone().multiplyScalar(.035)).add(back.clone().multiplyScalar(.09));const mid=base.clone().lerp(tip,.5).add(n.clone().multiplyScalar(.02));add(r3strand([base,mid,tip],.022,.004,8,6),{olw:.0024});continue}
    if(style==='spiky'){const len=rnd(.07,.12)*(i<14?.8:1);const dir=n.clone().multiplyScalar(.8).add(back.clone().multiplyScalar(.25)).add(new THREE.Vector3(rnd(-.15,.15),.2,0)).normalize();
      const tip=base.clone().add(dir.clone().multiplyScalar(len));const mid=base.clone().add(dir.clone().multiplyScalar(len*.5)).add(n.clone().multiplyScalar(.01));add(r3strand([base,mid,tip],.026,.001,8,6),{olw:.003});continue}
    if(style==='shaggy'){const len=i<14?rnd(.1,.14):rnd(.16,.26);const front=i<14;
      if(front&&i%2)continue;const dir=front?new THREE.Vector3(Math.sign(th||1)*rnd(.25,.6),-.45,.7).normalize():n.clone().multiplyScalar(.5).add(new THREE.Vector3(Math.sign(n.x)*.35,-.55,-.4)).add(new THREE.Vector3(rnd(-.2,.2),rnd(-.1,.3),rnd(-.2,.2))).normalize();
      const mid=base.clone().add(n.clone().multiplyScalar(.045)).add(dir.clone().multiplyScalar(len*.35));const tip=mid.clone().add(dir.clone().multiplyScalar(len*.7));
      add(r3strand([base,mid,tip],.028,.0015,10,6),{olw:.003});continue}
  }
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
/* ---------- boxer rig ---------- */
function r3boxer(L,opt={}){
  const P=R3_BT[L.bt]||R3_BT.athletic,m=L.mass||1;
  const skinM=r3cel(L.skin),skinD=r3cel(new THREE.Color(L.skin).offsetHSL(0,0,-.05).getHex());
  const root=new THREE.Group();root.scale.setScalar(1+((L.height||70)-70)*.011);
  const legY=.12+.99*P.legLen*1.1;
  const pelvis=new THREE.Group();pelvis.position.y=legY-.11;root.add(pelvis);
  const spine=new THREE.Group();spine.position.y=.08;pelvis.add(spine);
  const skinT=r3cel(0xffffff,r3torsoMap(L.skin,!!P.ribs));skinT.normalMap=r3torsoNM();skinT.normalScale=new THREE.Vector2(.9,.9);
  const H=P.hip*m,Wa=P.waist*m,C=P.chest*m,bel=P.belly?.035:0;
  const torso=r3mesh(r3lathe([[0,-.42],[.2*H,-.42],[.24*H,-.3],[.245*H,-.18],[.225*Wa+bel*.5,-.06],[.2*Wa+bel,.04],[.2*Wa+bel*.7,.12],[.225*C,.22],[.275*C,.32],[.33*C,.42],[.37*C,.5],[.39*C,.56],[.36*C,.62],[.26*C*.9,.67],[.14,.7],[0,.72]],1.18,P.depth,48),skinT,{olw:.005});spine.add(torso);
  const trunkM=r3cel(L.trunks,null,true);const trunks=r3mesh(r3lathe([[0,.04],[.235*H,.04],[.27*H,-.06],[.285*H,-.2],[.29*H,-.3],[0,-.3]],1.14,.84*P.depth/.72,40),trunkM,{olw:.005});trunks.position.y=-.02;pelvis.add(trunks);
  const bandR=.25*Math.max(H,Wa+bel*2);const band=r3mesh(new THREE.CylinderGeometry(bandR,bandR*.98,.1,48,1,true),r3cel(0xffffff,r3bandTex(new THREE.Color(L.trim).getStyle(),new THREE.Color(L.trunks).getStyle(),L.band),true),{olw:.0045});
  band.scale.set(1.15,1,.86*P.depth/.72);band.position.y=.03;pelvis.add(band);
  const chest=new THREE.Group();chest.position.y=.52;spine.add(chest);
  const trap=r3mesh(r3lathe([[0,0],[.3*m*P.trap**.5,0],[.24*m*P.trap**.5,.06],[.14*P.neck/.105,.14],[0,.16]],1.3,.7),skinM,{ol:false});trap.position.y=.64;spine.add(trap);
  const nl=.26*P.neckLen;const neck=r3mesh(r3limb(nl,t=>P.neck-.01*Math.sin(t*3),1.05,.95),skinM,{olw:.004});neck.position.y=.64+nl;spine.add(neck);
  const headG=new THREE.Group();headG.position.y=.64+nl+.12;spine.add(headG);
  const head=r3head(L);head.scale.setScalar(1.12);head.position.y=.025;headG.add(head);
  const arms={},al=P.len;
  for(const s of [-1,1]){
    const sh=new THREE.Group();sh.position.set(s*P.sh*m,.12,0);chest.add(sh);
    const delt=r3mesh(new THREE.SphereGeometry(.145*m*P.delt,24,16),skinM,{olw:.0045});delt.scale.set(1.08,.95,.92);delt.position.y=.01;sh.add(delt);
    sh.add(r3mesh(r3limb(.42*al,t=>(.1+.045*Math.sin(t*Math.PI)*(t<.6?1:.4))*m*P.arm,1.05,1),skinM,{olw:.0045}));
    const elbow=new THREE.Group();elbow.position.y=-.44*al;sh.add(elbow);
    elbow.add(r3mesh(new THREE.SphereGeometry(.09*m*P.fore,16,12),skinM,{ol:false}));
    elbow.add(r3mesh(r3limb(.4*al,t=>(.1-.02*t+.05*Math.sin(t*Math.PI)*(t<.45?1:.35))*m*P.fore,1,1),skinM,{olw:.0045}));
    const glove=new THREE.Group();glove.position.y=-.47*al;glove.scale.setScalar(1.24);elbow.add(glove);
    const gm=r3leather(L.gloves);r3glove(glove,gm,s,-1);
    arms[s]={sh,elbow,glove,gm,L1:.44*al,L2:.47*al+.02};
  }
  const legs={};
  for(const s of [-1,1]){const ll=P.legLen*1.1;
    const hip=new THREE.Group();hip.position.set(s*.13*H,-.12,0);pelvis.add(hip);
    hip.add(r3mesh(r3limb(.44*ll,t=>(.15-.035*t+.03*Math.sin(t*Math.PI))*P.leg*m,1,1.05),skinM,{olw:.0045}));
    const sleeve=r3mesh(r3lathe([[0,.06],[.17*P.leg*m*1.12,.06],[.185*P.leg*m*1.1,-.06],[.19*P.leg*m*1.08,-.2*ll],[0,-.2*ll]],1,1.08,32),trunkM,{olw:.0045});hip.add(sleeve);
    const knee=new THREE.Group();knee.position.y=-.44*ll;hip.add(knee);
    knee.add(r3mesh(new THREE.SphereGeometry(.095*P.leg*m,16,12),skinD,{ol:false}));
    knee.add(r3mesh(r3limb(.36*ll,t=>(.1-.025*t+.045*Math.sin(t*Math.PI)*(t<.5?1:.5))*P.leg*m,1,1.1),skinM,{olw:.0045}));
    const bootC=new THREE.Color(L.trim).lerp(new THREE.Color(0x2a2426),.35).getHex();
    const boot=r3mesh(r3lathe([[0,0],[.1,0],[.105,-.1],[.1,-.22],[.11,-.3],[0,-.3]],1,1.05),r3cel(bootC,null,true),{olw:.0042});boot.position.y=-.36*ll+.09;knee.add(boot);
    const sole=r3mesh(new THREE.BoxGeometry(.17,.05,.3),r3matte(0x1d1517),{olw:.003});sole.position.set(0,-.36*ll-.19,.06);knee.add(sole);
    legs[s]={hip,knee};
  }
  r3outline(root);
  root.userData={pelvis,spine,chest,headG,head,arms,legs,P,legY};
  return root;
}
/* glove: padded mitt, thumb, wrist tape cuff with a stripe. side s; dir -1 = fist points down (-y, on the rig), +1 = up */
function r3glove(gl,gm,s,dir){
  const mitt=r3mesh(r3lathe([[0,.1],[.12,.1],[.16,.03],[.17,-.06],[.15,-.14],[.09,-.19],[0,-.2]],1,1.15),gm,{olw:.0045});if(dir>0)mitt.rotation.z=Math.PI;gl.add(mitt);
  const thumb=r3mesh(new THREE.SphereGeometry(.065,16,12),gm,{olw:.0035});thumb.scale.set(.8,1.2,.9);thumb.position.set(s*-.11*-dir,0,.09);gl.add(thumb);
  const cuff=r3mesh(new THREE.CylinderGeometry(.1,.108,.11,24),r3cel(0xf3efe6,null,true),{olw:.004});cuff.position.y=.14*-dir;gl.add(cuff);
  const st=r3mesh(new THREE.CylinderGeometry(.104,.11,.03,24,1,true),r3cel(0x1d1517,null,true),{ol:false});st.position.y=.12*-dir;gl.add(st);
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
  const u=bx.userData;bx.updateWorldMatrix(true,true);
  u.spine.rotation.set(.06,.12,0);u.headG.rotation.set(.06,-.08,0);
  for(const s of [-1,1]){const lead=s===1;const L=u.legs[s];L.hip.rotation.set((lead?-14:8)*Math.PI/180,0,6*s*Math.PI/180);L.knee.rotation.set((lead?-10:-8)*Math.PI/180,0,0)}
  bx.updateWorldMatrix(true,true);
  const hy=u.headG.getWorldPosition(new THREE.Vector3()).y/bx.scale.y;
  for(const s of [-1,1]){const t=kind==='low'?new THREE.Vector3(s*.3,hy-.66,.36):kind==='mid'?new THREE.Vector3(s*.27,hy-.5,.34):new THREE.Vector3(s*.25,hy-.36,.3);
    r3ik(u.arms[s],t.applyMatrix4(bx.matrixWorld),new THREE.Vector3(s*1.2,.2,-.3).applyMatrix4(bx.matrixWorld));u.arms[s].glove.rotation.set(-.2,0,s*-.15)}
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
  scene.add(new THREE.HemisphereLight(0x8a9ad0,0x5a6a8a,.55));
  const bounce=new THREE.PointLight(0xf2e2c8,4,12,1.6);bounce.position.set(0,.2,2.2);scene.add(bounce);
  const key=new THREE.SpotLight(0xfff2de,120,34,.6,.55,1.7);key.position.set(-4,9,5);key.castShadow=!!opt.shadows;key.shadow.mapSize.set(1024,1024);key.shadow.radius=4;key.shadow.blurSamples=8;key.shadow.bias=-.0004;key.target.position.set(0,1,0);scene.add(key,key.target);
  const fill=new THREE.SpotLight(0x8fa4ff,30,34,.8,.7,1.7);fill.position.set(5,7,-2);fill.target.position.set(0,1,0);scene.add(fill,fill.target);
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
    const key=JSON.stringify([look,mode,size,o.height||0,o.expr||'',o.arch||'',o.legend||'']);
    if(this.cache.has(key))return this.cache.get(key);
    if(this.dead)return '';
    this.init();this.r.setSize(size,size,false);
    const L=r3look(look,{arch:o.arch,legend:o.legend,height:mode==='full'?o.height:70,mass:o.mass});if(o.expr)L.expr=o.expr;
    const bx=r3boxer(L);bx.rotation.y=mode==='full'?-.42:-.22;this.scene.add(bx);r3guard(bx,o.guard);
    r3expr(bx.userData.head,Object.assign({lidOpen:1},R3_EXPR[L.expr]||{}));
    bx.updateWorldMatrix(true,true);const hp=bx.userData.headG.getWorldPosition(new THREE.Vector3());
    if(mode==='full'){this.cam.fov=30;this.cam.position.set(.5,1.38*bx.scale.y,5.6);this.cam.lookAt(0,1.24*bx.scale.y,0)}
    else if(mode==='face'){this.cam.fov=22;this.cam.position.set(hp.x+.35,hp.y+.08,hp.z+1.75);this.cam.lookAt(hp.x,hp.y+.03,hp.z)}
    else{this.cam.fov=24;this.cam.position.set(hp.x+.25,hp.y+.02,hp.z+1.55);this.cam.lookAt(hp.x,hp.y-.1,hp.z)}
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
    this.opp=r3boxer(this.oL);this.opp.position.set(0,.1,.2);this.scene.add(this.opp);
    this.base=Object.assign({lidOpen:1},R3_EXPR[this.oL.expr]||{});
    this.oppFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:r3spriteTex(),blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));this.oppFlash.scale.set(1.2,1.2,1);this.scene.add(this.oppFlash);
    this.pg={};const gm=r3leather(this.pL.gloves);
    const foreM=r3cel(this.pL.skin);
    for(const h of ['L','R']){const s=h==='L'?-1:1;const gl=new THREE.Group();r3glove(gl,gm,-s,1);
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
    const hs=u.headG.position.y/(.64+.26+.12);// taller necks lift the guard a little
    for(const h of ['L','R']){const s=h==='L'?1:-1;const g2=h==='L'?raw.lg:raw.rg;if(!g2)continue;
      const x=g2[0]*.0052,y=-g2[1]*.0063*(.9+.1*hs)+(u.legY-1.1)+(st==='down'?-.3*rot:0),ext=g2[2]||0;
      const T=_v[7].set(x,y,.22+ext*.78);
      if(st==='down'){T.set(s*.5,1.3-rot*.6,.2+rot*.4)}
      T.applyMatrix4(this.opp.matrixWorld);
      const pole=_v[8].set(s*1.2,.2,-.3).applyMatrix4(this.opp.matrixWorld);
      r3ik(u.arms[s],T,pole);
      const gl=u.arms[s].glove;const type=o.pu&&o.pu.type;const active=o.pu&&(st==='wind'||st==='act'||st==='rec')&&f.hand(o,type)===h;
      gl.rotation.set(active&&type!=='upper'?-.5:-.15,0,active&&type==='hook'?s*.9:0);
      const gw=glow&&glow[h]||0;u.arms[s].gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');u.arms[s].gm.emissiveIntensity=gw*.9;
    }
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
    this.cam.position.set(cx,1.78+cy,2.7);
    const look=_v[2].set(cx*.4,1.6+cy*.5,.2);this.cam.lookAt(look);this.cam.rotation.z+=c.rot;
    this.cam.updateProjectionMatrix();this.cam.updateMatrixWorld();
    this.poseOpp(P,glow);this.posePlayer();
    if(f.fx.length>this.fxSeen){const last=f.fx[f.fx.length-1];const body=last.y>200;const hp=_v[3].set(0,body?1.55:2.1,.25).applyMatrix4(this.opp.matrixWorld);this.oppFlash.position.copy(hp);this.flashT=.18*(last.s||1);this.oppFlash.material.color.set(last.col||'#fff3d6');this.oppFlash.scale.setScalar(.8*(last.s||1))}
    this.fxSeen=f.fx.length;
    this.flashT=Math.max(0,this.flashT-rdt);this.oppFlash.material.opacity=Math.min(1,this.flashT*7);
    if(f.flashSil>0){this.oppFlash.material.opacity=Math.max(this.oppFlash.material.opacity,Math.min(1,f.flashSil*6));this.oppFlash.scale.setScalar(2.4)}
    const t0=performance.now();this.r.render(this.scene,this.cam);const ms=performance.now()-t0;
    this.ema=this.ema==null?ms:this.ema*.95+ms*.05;this.frames=(this.frames||0)+1;
    if(this.frames>90&&this.ema>22){const pr=this.r.getPixelRatio();if(pr>1){this.r.setPixelRatio(1);this.resize();this.frames=0;this.ema=null;if(typeof toast==='function')toast('3D detail lowered to keep the fight smooth')}
      else if(this.r.shadowMap.enabled){this.r.shadowMap.enabled=false;this.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});this.frames=0;this.ema=null}}
  }
}
