/* ================= stylized 3D fight renderer (Three.js) =================
   Opponent rig: smooth lathes, sculpted skull, 3D eyes/lids/brows/lips, hair cap. The engine's 2D pose
   (glove targets in a 400x430 space, lean/crouch/twist/headTilt, state flags) drives a 2-bone IK rig,
   so every mechanic the fight engine already animates lands in 3D without a second animation set.
   Falls back to the 2D canvas renderer when WebGL or THREE is unavailable. */
const R3D={
  ok(){try{if(typeof THREE==='undefined'||!Settings.gfx3d)return false;const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}},
  _ramp:null,_rampC:null,_nm:null,_spr:null,
};
function r3Ramp(stops){const c=document.createElement('canvas');c.width=stops.length;c.height=1;const x=c.getContext('2d');stops.forEach((v,i)=>{x.fillStyle=v;x.fillRect(i,0,1,1)});const t=new THREE.CanvasTexture(c);t.minFilter=t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.NoColorSpace;return t}
function r3Mats(){
  if(!R3D._ramp){R3D._ramp=r3Ramp(['#3a3238','#55484c','#705f60','#8e7a76','#aa958c','#c4b0a4','#dccabd','#efe2d6']);R3D._rampC=r3Ramp(['#2a2a36','#50505e','#7a7a8a','#a4a4b4','#cacad6','#ececf4'])}
}
const r3bump=(d,w)=>Math.exp(-(d*d)/(2*w*w));
function r3cel(hex,map,cloth){r3Mats();return new THREE.MeshToonMaterial({color:map?0xffffff:hex,map:map||null,gradientMap:cloth?R3D._rampC:R3D._ramp})}
function r3leather(hex){return new THREE.MeshPhysicalMaterial({color:hex,roughness:.32,metalness:0,clearcoat:.8,clearcoatRoughness:.25,envMapIntensity:1.1,emissive:0x000000})}
function r3matte(hex){return new THREE.MeshStandardMaterial({color:hex,roughness:.85,metalness:0,envMapIntensity:.4})}
function r3mesh(geo,mat){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m}
function r3lathe(profile,sx=1,sz=1,segs=40){const pts=profile.map(([r,y])=>new THREE.Vector2(r,y));if(pts[0].y>pts[pts.length-1].y)pts.reverse();const g=new THREE.LatheGeometry(pts,segs);g.scale(sx,1,sz);g.computeVertexNormals();return g}
function r3limb(len,rf,sx=1,sz=1){const prof=[];const n=18;for(let i=0;i<=n;i++){const t=i/n;prof.push([Math.max(.001,rf(t)),-t*len])}prof.unshift([0,0]);prof.push([0,-len]);return r3lathe(prof,sx,sz,32)}
/* sculpted skull: dense sphere displaced in face space (th around, lat up); the painted front is at -z, the mesh is rotated 180° */
function r3headGeo(R,F={},segs=112){
  const g=new THREE.SphereGeometry(R,segs,Math.round(segs*.75));const p=g.attributes.position;const v=new THREE.Vector3();
  const jaw=F.jaw??1,chin=F.chin??1,nose=F.nose??1,cheek=F.cheek??1,brow=F.brow??1,bump=r3bump;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=v.clone().normalize();
    const lat=n.y,th=Math.atan2(-n.x,-n.z),front=Math.max(0,Math.cos(th)),ath=Math.abs(th);const fx=th,fy=lat;
    let sc=1;
    sc*=1-.08*Math.pow(Math.abs(Math.sin(th)),2)*Math.max(0,1-Math.abs(lat-.15)*1.3);
    sc*=1+.1*Math.max(0,-Math.cos(th))*Math.max(0,1-Math.abs(lat-.15)*1.4);
    sc*=1-.03*bump(lat-.95,.12);
    sc+=.06*brow*bump(fy-.22,.1)*front*bump(ath-.32,.4);
    sc-=.05*bump(fy-.5,.18)*front;
    for(const s of [-1,1]){const dx=(fx-s*.44)/.26,dy=(fy-.04)/.14;const e=Math.exp(-(dx*dx+dy*dy)/2);sc-=.085*e*front}
    for(const s of [-1,1]){sc+=.05*cheek*bump(fy+.16,.11)*bump(fx-s*.66,.2);sc+=.025*cheek*bump(fy+.36,.14)*bump(fx-s*.5,.22)}
    sc+=.22*nose*bump(fx,.1)*Math.max(0,bump(fy+.06,.24))*(fy<.26?1:0);
    sc+=.2*nose*bump(fx,.14)*bump(fy+.27,.1);
    for(const s of [-1,1])sc+=.1*nose*bump(fx-s*.19,.085)*bump(fy+.31,.07);
    sc-=.03*bump(fx,.06)*bump(fy+.36,.04);
    sc-=.012*bump(fx,.07)*bump(fy+.44,.05);
    sc+=.035*bump(fx,.3)*bump(fy+.5,.045);
    sc-=.025*bump(fx,.32)*bump(fy+.56,.025);
    sc+=.045*bump(fx,.26)*bump(fy+.62,.05);
    sc-=.03*bump(fx,.3)*bump(fy+.7,.04);
    sc+=.3*chin*bump(fy+.78,.18)*bump(fx,.65);
    sc+=.06*bump(fy+.6,.2)*bump(ath-.75,.3);
    if(lat<-.2){const k=(-.2-lat)/.8;sc*=1-.14*jaw*k*k*(1-front*.55);sc*=1-.22*jaw*k*Math.max(0,-Math.cos(th))}
    for(const s of [-1,1]){sc-=.015*bump(fx-s*.32,.05)*bump(fy+.4,.12);sc-=.03*bump(lat-.3,.16)*bump(th-s*1.05,.28)}
    v.multiplyScalar(sc);v.y*=1.1;v.x*=.96;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();return g;
}
/* painted skin: tone, soft shading, lips, facial hair, swelling, cut. Features are geometry. */
function r3skinTex(skin,o={},cv){
  const c=cv||document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
  x.fillStyle=skin;x.fillRect(0,0,1024,512);
  const fx=768,fy=256;
  const occ=(px,py,rx,ry,a,col='60,25,25')=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);x.save();x.translate(px,py);x.scale(rx,ry);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  for(const s of [-1,1]){occ(fx+s*110,fy+45,80,60,.22,'210,80,70');occ(fx+s*74,fy-8,46,30,.28);occ(fx+s*250,fy,40,50,.2,'210,80,70')}
  occ(fx,fy+60,24,16,.2,'210,80,70');occ(fx,fy+70,30,10,.3);occ(fx,fy+150,34,12,.25);occ(fx,fy+200,120,30,.25);
  x.fillStyle='rgba(175,80,80,.45)';x.beginPath();x.ellipse(fx,fy+95,44,8,0,0,7);x.fill();x.fillStyle='rgba(165,70,70,.5)';x.beginPath();x.ellipse(fx,fy+118,38,10,0,0,7);x.fill();
  x.fillStyle='rgba(40,15,15,.75)';x.beginPath();x.ellipse(fx-20,fy+64,8,5,.3,0,7);x.ellipse(fx+20,fy+64,8,5,-.3,0,7);x.fill();
  const hc=o.hairColor||'#1a120c';
  const beardPath=()=>{x.beginPath();x.moveTo(fx-190,fy+40);x.quadraticCurveTo(fx-170,fy+220,fx,fy+250);x.quadraticCurveTo(fx+170,fy+220,fx+190,fy+40);x.quadraticCurveTo(fx+140,fy+150,fx,fy+158);x.quadraticCurveTo(fx-140,fy+150,fx-190,fy+40)};
  if(o.beard==='stubble'){x.fillStyle='rgba(25,15,10,.35)';beardPath();x.fill()}
  if(o.beard==='beard'){x.fillStyle=hc;x.globalAlpha=.9;beardPath();x.fill();x.globalAlpha=1;x.fillStyle=hc;x.beginPath();x.ellipse(fx,fy+76,52,12,0,Math.PI,0);x.fill()}
  if(o.beard==='mustache'||o.beard==='beard'){x.fillStyle=hc;x.beginPath();x.moveTo(fx-50,fy+88);x.quadraticCurveTo(fx,fy+66,fx+50,fy+88);x.quadraticCurveTo(fx,fy+84,fx-50,fy+88);x.fill()}
  // sweat sheen
  if(o.sweat){x.fillStyle=`rgba(255,255,255,${Math.min(.22,o.sweat*.05)})`;for(let i=0;i<o.sweat*6;i++){x.beginPath();x.ellipse(fx+(((i*97)%300)-150),fy-120+((i*53)%260),3,6,0,0,7);x.fill()}}
  const d=o.dmg||{};for(const s of [-1,1]){const a=s<0?d.swellL:d.swellR;if(a)occ(fx+s*80,fy-8,90+a*40,70,Math.min(.7,a*.8),'150,40,60')}
  if(d.cheek){occ(fx-80,fy+60,70,50,Math.min(.5,d.cheek*.6),'150,40,60')}
  if(o.cut>12){const k=Math.min(1,o.cut/100);x.strokeStyle='#8e0e0e';x.lineWidth=6+k*4;x.lineCap='round';x.beginPath();x.moveTo(fx+56,fy-64);x.lineTo(fx+94+k*26,fy-76);x.stroke();if(k>.3){x.fillStyle='rgba(150,10,10,.85)';x.beginPath();x.moveTo(fx+90,fy-58);x.quadraticCurveTo(fx+104,fy,fx+96,fy+30+k*70);x.quadraticCurveTo(fx+86,fy,fx+90,fy-58);x.fill()}}
  return c;
}
/* torso normal map baked from a painted height field */
function r3torsoNM(){
  if(R3D._nm)return R3D._nm;
  const N=256;const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,N,N);const k=N/512;
  const soft=(px,py,rx,ry,a,rot=0)=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.6,`rgba(255,255,255,${a*.55})`);g.addColorStop(1,'rgba(255,255,255,0)');x.save();x.translate(px*k,py*k);x.rotate(rot);x.scale(rx*k,ry*k);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  const dark=(px,py,rx,ry,a,rot=0)=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');x.save();x.translate(px*k,py*k);x.rotate(rot);x.scale(rx*k,ry*k);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  for(const ox of [0,512]){soft(ox-44,205,54,36,.55,.12);soft(ox+44,205,54,36,.55,-.12);dark(ox,238,70,10,.5);dark(ox,205,6,42,.45);
    soft(ox-40,160,46,5,.35,.18);soft(ox+40,160,46,5,.35,-.18);dark(ox,172,20,8,.3);
    for(let r=0;r<3;r++){const y=282+r*32;soft(ox-22,y,22,14,.5);soft(ox+22,y,22,14,.5);dark(ox,y+17,48,4,.4)}dark(ox,318,4,64,.45);
    for(let i=0;i<4;i++){dark(ox-62,276+i*16,16,5,.3,.5);dark(ox+62,276+i*16,16,5,.3,-.5)}
    dark(ox-30,382,30,5,.3,.6);dark(ox+30,382,30,5,.3,-.6)}
  dark(256,260,5,120,.5);soft(196,210,40,45,.3);soft(316,210,40,45,.3);
  const id=x.getImageData(0,0,N,N),d=id.data,out=x.createImageData(N,N),o=out.data;
  const h=(i,j)=>d[(((j+N)%N)*N+((i+N)%N))*4]/255;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const dx=(h(i+1,j)-h(i-1,j))*3,dy=(h(i,j+1)-h(i,j-1))*3;const l=Math.hypot(dx,dy,1);const q=(j*N+i)*4;o[q]=(-dx/l*.5+.5)*255;o[q+1]=(dy/l*.5+.5)*255;o[q+2]=(1/l*.5+.5)*255;o[q+3]=255}
  x.putImageData(out,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;R3D._nm=t;return t;
}
function r3spriteTex(){if(R3D._spr)return R3D._spr;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,245,225,1)');g.addColorStop(.3,'rgba(255,240,210,.35)');g.addColorStop(1,'rgba(255,240,210,0)');x.fillStyle=g;x.fillRect(0,0,128,128);R3D._spr=new THREE.CanvasTexture(c);return R3D._spr}
/* look (game) -> 3D look */
function r3look(look,name){
  const h=hashStr(name||'x');const u=i=>((h>>>(i*4))&15)/15;
  const skin=typeof look.skin==='number'?SKIN[look.skin]||SKIN[2]:look.skin;
  const hairColor=typeof look.hc==='number'?HAIRC[look.hc]||HAIRC[0]:(look.hairColor||'#1a120c');
  return {skin,hair:look.hair||'short',hairColor,beard:look.beard||'none',trunks:look.trunks||'#d8392f',trim:look.trim||'#f4efe3',gloves:look.gloves||'#d8392f',
    eyes:['#4a2a16','#2a160c','#3a6a8a','#4a6a3a','#6a4a2a'][Math.floor(u(0)*5)],
    shape:{jaw:.85+u(1)*.45,chin:.85+u(2)*.45,nose:.85+u(3)*.4,cheek:.85+u(4)*.4,brow:.85+u(5)*.4},
    build:look.build||1};
}
/* ---------- head assembly: skull + eyes/lids + brows + lips/teeth + ears + hair; returns group with userData controls ---------- */
function r3head(L){
  const R=.22,g=new THREE.Group();
  const texC=document.createElement('canvas');r3skinTex(L.skin,{beard:L.beard,hairColor:L.hairColor},texC);
  const tex=new THREE.CanvasTexture(texC);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const skin=r3cel(L.skin,tex),skinP=r3cel(L.skin);
  const hg=r3headGeo(R,L.shape);
  const skull=r3mesh(hg,skin);skull.rotation.y=Math.PI;g.add(skull);skull.updateMatrixWorld();
  const surf=(th,lat,extra=0)=>{lat=Math.max(-.98,Math.min(.98,lat));const n=new THREE.Vector3(Math.sin(th)*Math.sqrt(1-lat*lat),lat,Math.cos(th)*Math.sqrt(1-lat*lat));const ray=new THREE.Raycaster(n.clone().multiplyScalar(2),n.clone().negate());const h=ray.intersectObject(skull)[0];return h?h.point.clone().add(n.multiplyScalar(extra)):n.multiplyScalar(R)};
  const ctl={eyes:[],brows:[],lids:[],lows:[],lipLo:null,cav:null,teeth:null,tex,texC,skull};
  const eyeMat=new THREE.MeshPhysicalMaterial({color:0xf4f1ec,roughness:.2,clearcoat:1,clearcoatRoughness:.05});
  for(const s of [-1,1]){
    const c=surf(s*.44,.04,-.028);const eye=new THREE.Group();eye.position.copy(c);g.add(eye);
    eye.add(r3mesh(new THREE.SphereGeometry(.052,28,20),eyeMat));
    const irisGrp=new THREE.Group();eye.add(irisGrp);ctl.eyes.push(irisGrp);
    const iris=r3mesh(new THREE.SphereGeometry(.053,28,20,0,Math.PI*2,0,.46),new THREE.MeshPhysicalMaterial({color:L.eyes||0x4a2a16,roughness:.25,clearcoat:1}));iris.rotation.x=Math.PI/2;irisGrp.add(iris);
    const ring=r3mesh(new THREE.SphereGeometry(.0535,28,20,0,Math.PI*2,.4,.07),new THREE.MeshStandardMaterial({color:0x1a0d06,roughness:.5}));ring.rotation.x=Math.PI/2;irisGrp.add(ring);
    const pupil=r3mesh(new THREE.SphereGeometry(.054,24,16,0,Math.PI*2,0,.22),new THREE.MeshStandardMaterial({color:0x050302,roughness:.3}));pupil.rotation.x=Math.PI/2;irisGrp.add(pupil);
    // lids: shells that rotate over the ball
    const upG=new THREE.Group();eye.add(upG);const up=r3mesh(new THREE.SphereGeometry(.058,28,20,0,Math.PI*2,0,Math.PI*.33),skinP);upG.add(up);
    const lash=r3mesh(new THREE.TorusGeometry(.0555,.004,6,36,Math.PI),new THREE.MeshStandardMaterial({color:0x1a0d08,roughness:.8}));lash.rotation.set(Math.PI/2-Math.PI*.33,0,Math.PI);lash.position.set(0,Math.cos(Math.PI*.33)*.058,Math.sin(Math.PI*.33)*.058);upG.add(lash);
    const loG=new THREE.Group();eye.add(loG);const lo=r3mesh(new THREE.SphereGeometry(.0555,28,20,0,Math.PI*2,Math.PI*.72,Math.PI*.28),skinP);loG.add(lo);
    ctl.lids.push(upG);ctl.lows.push(loG);
    // eyebrow: tapered tube, in its own group at the eye so it can be posed
    const bg=new THREE.Group();bg.position.copy(c);g.add(bg);ctl.brows.push({g:bg,s});
    const pts=[];for(let i=0;i<=8;i++){const t=i/8;const th=s*(.2+.5*t);const lat=.26+.07*Math.sin(t*Math.PI);pts.push(surf(th,lat,.012).sub(c))}
    const curve=new THREE.CatmullRomCurve3(pts);const tg=new THREE.TubeGeometry(curve,20,.018,8,false);const bp=tg.attributes.position;const tmp=new THREE.Vector3();
    for(let i=0;i<bp.count;i++){tmp.fromBufferAttribute(bp,i);const u=Math.floor(i/9)/20;const cp=curve.getPoint(u);tmp.sub(cp).multiplyScalar(1.1-.8*u).add(cp);bp.setXYZ(i,tmp.x,tmp.y,tmp.z)}
    tg.computeVertexNormals();bg.add(r3mesh(tg,new THREE.MeshStandardMaterial({color:L.hairColor||'#1a120c',roughness:.9})));
  }
  // lips
  {const lipM=r3cel(new THREE.Color(L.skin).offsetHSL(-.01,.12,-.07).getHex());
    const arc=(lat,w,r,yoff)=>{const pts=[];for(let i=0;i<=10;i++){const t=i/10;const th=-w+2*w*t;pts.push(surf(th,lat+Math.sin(t*Math.PI)*yoff,.01))}const cv=new THREE.CatmullRomCurve3(pts);const tg=new THREE.TubeGeometry(cv,20,r,8,false);const tp=tg.attributes.position,q=new THREE.Vector3();for(let k=0;k<tp.count;k++){q.fromBufferAttribute(tp,k);const u=Math.floor(k/9)/20;const cp=cv.getPoint(u);q.sub(cp).multiplyScalar(.35+.65*Math.sin(u*Math.PI)).add(cp);tp.setXYZ(k,q.x,q.y,q.z)}tg.computeVertexNormals();return r3mesh(tg,lipM)};
    g.add(arc(-.52,.3,.011,.012));const lo=arc(-.59,.27,.014,-.012);g.add(lo);ctl.lipLo=lo}
  // mouth cavity + teeth (scaled by openness)
  {const cav=r3mesh(new THREE.SphereGeometry(.07,16,12),new THREE.MeshStandardMaterial({color:0x2a0d0d,roughness:1}));cav.position.copy(surf(0,-.56,-.03));cav.scale.set(1.1,.01,.5);cav.castShadow=false;g.add(cav);ctl.cav=cav;
    const teeth=r3mesh(new THREE.BoxGeometry(.085,.016,.02),new THREE.MeshStandardMaterial({color:0xe9e3f5,roughness:.3}));teeth.position.copy(surf(0,-.5,-.012));teeth.visible=false;g.add(teeth);ctl.teeth=teeth}
  // ears
  for(const s of [-1,1]){const e=new THREE.Group();e.position.set(s*R*.98,-.01,-.02);e.rotation.y=s*.35;g.add(e);
    const rimG=r3mesh(new THREE.TorusGeometry(.036,.013,8,24),skinP);rimG.scale.set(.85,1.15,1);e.add(rimG);
    const bowl=r3mesh(new THREE.SphereGeometry(.03,14,10),r3cel(new THREE.Color(L.skin).offsetHSL(0,0,-.08).getHex()));bowl.scale.set(.6,.9,.4);bowl.position.x=s*-.006;e.add(bowl)}
  // hair
  const style=L.hair||'short';
  if(style!=='bald'){const hc=new THREE.Color(L.hairColor||'#1a120c');const hm=r3cel(hc.getHex());
    const am=document.createElement('canvas');am.width=512;am.height=256;const ax=am.getContext('2d');ax.scale(.5,.5);ax.fillStyle='#000';ax.fillRect(0,0,1024,512);
    const fx=768,fy=256;ax.fillStyle='#fff';ax.beginPath();ax.rect(0,0,1024,512);
    const top=style==='slick'?-112:-104;
    ax.moveTo(fx-175,fy-30);ax.bezierCurveTo(fx-185,fy+top+10,fx-40,fy+top-8,fx,fy+top+6);ax.bezierCurveTo(fx+40,fy+top-8,fx+185,fy+top+10,fx+175,fy-30);ax.bezierCurveTo(fx+225,fy+40,fx+225,fy+250,fx+200,fy+400);ax.lineTo(fx-200,fy+400);ax.bezierCurveTo(fx-225,fy+250,fx-225,fy+40,fx-175,fy-30);ax.closePath();ax.fill('evenodd');
    const nape=ax.createLinearGradient(0,fy+80,0,fy+140);nape.addColorStop(0,'rgba(0,0,0,0)');nape.addColorStop(1,'#000');ax.fillStyle=nape;ax.fillRect(0,fy+80,1024,432);
    if(style==='mohawk'){ax.fillStyle='#000';ax.fillRect(0,0,1024,512);ax.fillStyle='#fff';for(const cx of [fx,fx-512,fx+512])ax.fillRect(cx-30,0,60,fy+30)}
    const at=new THREE.CanvasTexture(am);
    const capM=new THREE.MeshToonMaterial({color:hc,gradientMap:R3D._ramp,alphaMap:at,transparent:true,alphaTest:.5,side:THREE.DoubleSide});
    const thick=style==='afro'?1.2:style==='buzz'?1.012:style==='mohawk'?1.1:style==='braids'?1.05:1.032;
    const cap=r3mesh(hg,capM);cap.rotation.y=Math.PI;cap.scale.setScalar(thick);g.add(cap);
    if(style==='afro'){for(const t2 of [1.06,1.13]){const c3=r3mesh(hg,capM);c3.rotation.y=Math.PI;c3.scale.setScalar(t2);g.add(c3)}}
    if(style==='topknot'){const bun=r3mesh(new THREE.SphereGeometry(.06,16,12),hm);bun.position.set(0,R*1.1,-.06);bun.scale.set(1,.8,1);g.add(bun)}
    if(style==='short'||style==='slick'||style==='braids'){const n=style==='braids'?20:30;for(let i=0;i<n;i++){const t=i/(n-1);const th=-1.15+2.3*t;const lat=.58+.04*Math.sin(i*2.1)+.05*Math.abs(th);const a=surf(th,lat-.02,.003),b=surf(th*1.03,lat+.16,.02+.006*Math.sin(i)),c2=surf(th*1.06,lat+.34,.03);
      const cv=new THREE.CatmullRomCurve3([a,b,c2]);const tube=new THREE.TubeGeometry(cv,8,(style==='braids'?.014:.017)+.005*Math.sin(i*3.3),6,false);const tp=tube.attributes.position;const q=new THREE.Vector3();
      for(let k=0;k<tp.count;k++){q.fromBufferAttribute(tp,k);const u=Math.floor(k/7)/8;const cp=cv.getPoint(u);q.sub(cp).multiplyScalar(1.2-.9*u).add(cp);tp.setXYZ(k,q.x,q.y,q.z)}
      tube.computeVertexNormals();g.add(r3mesh(tube,hm))}}
  }
  g.userData.ctl=ctl;
  return g;
}
/* expression: lids 0..1 open, squint, angry, hurt, open mouth 0..1, look -1..1 */
function r3expr(head,E){
  const c=head.userData.ctl;const open=clamp(E.lidOpen??1,0,1),sq=clamp(E.squint||0,0,1);
  for(let i=0;i<2;i++){const s=i?1:-1;
    c.lids[i].rotation.x=-.25+(1-open)*1.05+sq*.25;c.lows[i].rotation.x=-.2-sq*.45-(1-open)*.25;
    const b=c.brows[i];b.g.rotation.z=b.s*((E.angry||0)*.3-(E.hurt||0)*.25);b.g.position.y=b.g.userData.y0??(b.g.userData.y0=b.g.position.y);b.g.position.y=b.g.userData.y0-(E.angry||0)*.012+(E.hurt||0)*.01;
    c.eyes[i].rotation.y=(E.look||0)*.35;c.eyes[i].rotation.x=-(E.lookY||0)*.3}
  const m=clamp(E.open||0,0,1);c.cav.scale.y=Math.max(.01,.7*m);c.cav.visible=m>.05;c.teeth.visible=m>.15;
  c.lipLo.position.y=-m*.035;
}
/* ---------- boxer rig ---------- */
function r3boxer(L){
  const skinM=r3cel(L.skin),skinD=r3cel(new THREE.Color(L.skin).offsetHSL(0,0,-.04).getHex());
  const root=new THREE.Group();const b=L.build||1;
  const pelvis=new THREE.Group();pelvis.position.y=1.0;root.add(pelvis);
  const spine=new THREE.Group();spine.position.y=.08;pelvis.add(spine);
  const skinT=r3cel(L.skin);skinT.normalMap=r3torsoNM();skinT.normalScale=new THREE.Vector2(1.0,1.0);
  const torso=r3mesh(r3lathe([[0,-.42],[.2*b,-.42],[.24*b,-.3],[.245*b,-.18],[.225*b,-.06],[.2*b,.04],[.2*b,.12],[.225*b,.22],[.275*b,.32],[.33*b,.42],[.37*b,.5],[.39*b,.56],[.36*b,.62],[.26,.67],[.14,.7],[0,.72]],1.18,.72,48),skinT);spine.add(torso);
  const trunks=r3mesh(r3lathe([[0,.04],[.235*b,.04],[.27*b,-.06],[.285*b,-.2],[.3*b,-.34],[.305*b,-.44],[0,-.44]],1.14,.84,40),r3cel(L.trunks,null,true));trunks.position.y=-.02;pelvis.add(trunks);
  const band=r3mesh(new THREE.TorusGeometry(.235*b,.03,10,48),r3cel(L.trim,null,true));band.rotation.x=Math.PI/2;band.position.y=.03;band.scale.set(1.14,.84,1);pelvis.add(band);
  const chest=new THREE.Group();chest.position.y=.52;spine.add(chest);
  const trap=r3mesh(r3lathe([[0,0],[.3*b,0],[.24*b,.06],[.14,.14],[0,.16]],1.3,.7),skinM);trap.position.y=.64;spine.add(trap);
  const neck=r3mesh(r3limb(.26,t=>.105-.01*Math.sin(t*3),1.05,.95),skinM);neck.position.y=.9;spine.add(neck);
  const headG=new THREE.Group();headG.position.y=1.02;spine.add(headG);
  const head=r3head(L);head.scale.setScalar(1.14);head.position.y=.03;headG.add(head);
  const arms={};
  for(const s of [-1,1]){
    const sh=new THREE.Group();sh.position.set(s*.43*b,.12,0);chest.add(sh);
    const delt=r3mesh(new THREE.SphereGeometry(.165*b,24,16),skinM);delt.scale.set(1.1,1,1);sh.add(delt);
    sh.add(r3mesh(r3limb(.42,t=>(.11+.055*Math.sin(t*Math.PI)*(t<.6?1:.4))*b,1.05,1),skinM));
    const elbow=new THREE.Group();elbow.position.y=-.44;sh.add(elbow);
    elbow.add(r3mesh(new THREE.SphereGeometry(.09*b,16,12),skinM));
    elbow.add(r3mesh(r3limb(.4,t=>(.1-.02*t+.05*Math.sin(t*Math.PI)*(t<.45?1:.35))*b,1,1),skinM));
    const glove=new THREE.Group();glove.position.y=-.47;glove.scale.setScalar(1.2);elbow.add(glove);
    const gm=r3leather(L.gloves);
    glove.add(r3mesh(r3lathe([[0,.1],[.12,.1],[.16,.03],[.17,-.06],[.15,-.14],[.09,-.19],[0,-.2]],1,1.15),gm));
    const thumb=r3mesh(new THREE.SphereGeometry(.065,16,12),gm);thumb.scale.set(.8,1.2,.9);thumb.position.set(s*-.11,0,.09);glove.add(thumb);
    const cuff=r3mesh(new THREE.CylinderGeometry(.1,.108,.11,24),r3matte(0xf3efe6));cuff.position.y=.14;glove.add(cuff);
    arms[s]={sh,elbow,glove,gm};
  }
  const legs={};
  for(const s of [-1,1]){
    const hip=new THREE.Group();hip.position.set(s*.13*b,-.12,0);pelvis.add(hip);
    hip.add(r3mesh(r3limb(.44,t=>(.15-.035*t+.03*Math.sin(t*Math.PI))*b,1,1.05),skinM));
    const knee=new THREE.Group();knee.position.y=-.44;hip.add(knee);
    knee.add(r3mesh(new THREE.SphereGeometry(.095*b,16,12),skinD));
    knee.add(r3mesh(r3limb(.36,t=>(.1-.025*t+.045*Math.sin(t*Math.PI)*(t<.5?1:.5))*b,1,1.1),skinM));
    const boot=r3mesh(r3lathe([[0,0],[.1,0],[.105,-.1],[.1,-.22],[.11,-.3],[0,-.3]],1,1.05),r3cel(L.trim,null,true));boot.position.y=-.27;knee.add(boot);
    const sole=r3mesh(new THREE.BoxGeometry(.17,.05,.3),r3matte(new THREE.Color(L.trim).offsetHSL(0,-.2,-.25).getHex()));sole.position.set(0,-.55,.06);knee.add(sole);
    legs[s]={hip,knee};
  }
  root.userData={pelvis,spine,chest,headG,head,arms,legs,b};
  return root;
}
/* two-bone IK: aim shoulder and elbow groups so the glove reaches target (world), elbow pulled toward pole */
const _v=[0,1,2,3,4,5,6,7,8].map(()=>new THREE.Vector3()),_q=[0,1,2].map(()=>new THREE.Quaternion()),_DOWN=new THREE.Vector3(0,-1,0);
function r3ik(arm,target,pole,L1=.44,L2=.5){
  const S=_v[0],T=_v[1],E=_v[2],d=_v[3],n=_v[4],pl=_v[5];
  arm.sh.getWorldPosition(S);T.copy(target);d.subVectors(T,S);let dist=d.length();const max=L1+L2-.02;if(dist>max){d.multiplyScalar(max/dist);dist=max;T.copy(S).add(d)}if(dist<.05){dist=.05}
  d.normalize();
  // elbow position via cosine law
  const a=clamp((L1*L1+dist*dist-L2*L2)/(2*L1*dist),-1,1);const ang=Math.acos(a);
  pl.subVectors(pole,S);n.copy(pl).sub(d.clone().multiplyScalar(pl.dot(d)));if(n.lengthSq()<1e-6)n.set(0,-1,0);n.normalize();
  E.copy(S).add(d.clone().multiplyScalar(Math.cos(ang)*L1)).add(n.multiplyScalar(Math.sin(ang)*L1));
  // shoulder: parent-space direction to the elbow
  const par=arm.sh.parent;par.updateWorldMatrix(true,false);
  const pq=_q[0];par.getWorldQuaternion(pq);const inv=_q[1].copy(pq).invert();
  const dirSE=_v[6].subVectors(E,S).normalize().applyQuaternion(inv);
  arm.sh.quaternion.setFromUnitVectors(_DOWN,dirSE);
  arm.sh.updateWorldMatrix(false,false);
  const sq=_q[2];arm.sh.getWorldQuaternion(sq);const sinv=sq.invert();
  const dirET=_v[6].subVectors(T,E).normalize().applyQuaternion(sinv);
  arm.elbow.quaternion.setFromUnitVectors(_DOWN,dirET);
}
/* ---------- arena ---------- */
function r3arena(scene,opt){
  const g=new THREE.Group();
  const fc=document.createElement('canvas');fc.width=fc.height=512;const x=fc.getContext('2d');x.fillStyle='#6f8fb8';x.fillRect(0,0,512,512);
  const pool=x.createRadialGradient(256,256,60,256,256,340);pool.addColorStop(0,'rgba(235,245,255,.55)');pool.addColorStop(1,'rgba(20,40,80,.5)');x.fillStyle=pool;x.fillRect(0,0,512,512);
  x.fillStyle='rgba(255,255,255,.16)';x.font='bold 74px Georgia';x.textAlign='center';x.fillText('TWELVE',256,236);x.fillText('ROUNDS',256,310);
  const rr=new Rng(opt.seed||7);for(let i=0;i<220;i++){x.fillStyle=`rgba(80,60,40,${rr.next()*.08})`;x.beginPath();x.ellipse(rr.next()*512,rr.next()*512,rr.next()*15+3,rr.next()*3+1,rr.next()*3,0,7);x.fill()}
  const ft=new THREE.CanvasTexture(fc);ft.colorSpace=THREE.SRGBColorSpace;ft.anisotropy=4;
  const floor=r3mesh(new THREE.BoxGeometry(7.4,.5,7.4),new THREE.MeshStandardMaterial({map:ft,roughness:.75,envMapIntensity:.3}));floor.position.y=-.25;g.add(floor);
  const apron=r3mesh(new THREE.BoxGeometry(7.4,.9,7.4),r3cel(0x16305a,null,true));apron.position.y=-.95;g.add(apron);
  for(const [px,pz] of [[-3.4,-3.4],[3.4,-3.4],[-3.4,3.4],[3.4,3.4]]){const p=r3mesh(new THREE.CylinderGeometry(.07,.07,1.6,16),new THREE.MeshStandardMaterial({color:0x8a8f9c,metalness:.9,roughness:.3}));p.position.set(px,.8,pz);g.add(p);
    [[0xd8392f,1.4],[0xf2f2f2,1.05],[0x2f6fe2,.7]].forEach(([c,y])=>{const t=r3mesh(new THREE.CylinderGeometry(.12,.12,.28,16),r3cel(c,null,true));t.position.set(px,y,pz);g.add(t)})}
  const ropeCol=[0xf2f2f2,0xd8392f,0xf2f2f2];
  const sides=[[[-3.4,-3.4],[3.4,-3.4]],[[3.4,-3.4],[3.4,3.4]],[[3.4,3.4],[-3.4,3.4]],[[-3.4,3.4],[-3.4,-3.4]]];
  sides.forEach(([a,b])=>{ropeCol.forEach((c,i)=>{const y=1.4-i*.35;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(a[0],y,a[1]),new THREE.Vector3(mid[0],y-.05,mid[1]),new THREE.Vector3(b[0],y,b[1])]);g.add(r3mesh(new THREE.TubeGeometry(curve,16,.035,8),r3cel(c,null,true)))})});
  // crowd: instanced heads and bodies
  const heads=new THREE.SphereGeometry(.18,8,6),body=new THREE.CapsuleGeometry(.22,.4,3,8);
  let n=0;for(let row=0;row<5;row++)n+=60+row*18;
  const hm=new THREE.InstancedMesh(heads,new THREE.MeshStandardMaterial({roughness:.9}),n),bm=new THREE.InstancedMesh(body,new THREE.MeshStandardMaterial({roughness:.9}),n);
  const m=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  for(let row=0;row<5;row++){const cnt=60+row*18,rad=6.5+row*1.1;for(let i=0;i<cnt;i++){const a=i/cnt*Math.PI*2+row*.07;const lit=rr.next()<.2;col.setHSL(.58+rr.next()*.12,.45,lit?.42:.1+row*.025);const y=-.3+row*.75;
    m.makeTranslation(Math.cos(a)*rad,y+.55+rr.next()*.1,Math.sin(a)*rad);hm.setMatrixAt(k,m);hm.setColorAt(k,col);m.makeTranslation(Math.cos(a)*rad,y,Math.sin(a)*rad);bm.setMatrixAt(k,m);bm.setColorAt(k,col);k++}}
  hm.instanceMatrix.needsUpdate=true;bm.instanceMatrix.needsUpdate=true;g.add(hm,bm);g.userData.crowd={hm,bm,n};
  const st=r3spriteTex();for(const [px,py,pz,s] of [[-4,8.5,4,7],[4.5,8,-3,6],[0,9,-6,6.5],[-6,7,-5,5],[6,7.5,4,5]]){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:st,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.9}));sp.position.set(px,py,pz);sp.scale.set(s,s,1);g.add(sp);const core=new THREE.Sprite(new THREE.SpriteMaterial({map:st,blending:THREE.AdditiveBlending,depthWrite:false}));core.position.set(px,py,pz);core.scale.set(s*.25,s*.25,1);g.add(core)}
  scene.add(g);
  scene.add(new THREE.HemisphereLight(0x5a74c0,0x4a6a9a,.3));
  const bounce=new THREE.PointLight(0xf2e2c8,5,12,1.6);bounce.position.set(0,.2,2.2);scene.add(bounce);
  const bounce2=new THREE.PointLight(0xf2e2c8,3,12,1.6);bounce2.position.set(0,.2,-2.2);scene.add(bounce2);
  const key=new THREE.SpotLight(0xfff0d8,110,34,.6,.55,1.7);key.position.set(-4,9,5);key.castShadow=!!opt.shadows;key.shadow.mapSize.set(1024,1024);key.shadow.radius=5;key.shadow.blurSamples=8;key.shadow.bias=-.0004;key.target.position.set(0,1,0);scene.add(key,key.target);
  const fill=new THREE.SpotLight(0x6f8fff,45,34,.8,.7,1.7);fill.position.set(5,7,-2);fill.target.position.set(0,1,0);scene.add(fill,fill.target);
  const rim=new THREE.SpotLight(0xbfdcff,160,34,.5,.5,1.7);rim.position.set(1.5,5.5,-6.5);rim.target.position.set(0,1.2,0);scene.add(rim,rim.target);
  if(opt.heat){scene.add(new THREE.PointLight(0xff8040,3,10,1.5).translateY(3))}
  return g;
}
function r3env(){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'#c8c2b4');g.addColorStop(.25,'#2a2d44');g.addColorStop(.55,'#101223');g.addColorStop(1,'#060710');x.fillStyle=g;x.fillRect(0,0,256,128);
  for(const [u,v,r] of [[60,20,20],[150,15,28],[215,25,16]]){const rg=x.createRadialGradient(u,v,1,u,v,r);rg.addColorStop(0,'#fff6e6');rg.addColorStop(.4,'rgba(255,230,190,.5)');rg.addColorStop(1,'rgba(255,230,190,0)');x.fillStyle=rg;x.fillRect(u-r,v-r,r*2,r*2)}
  const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;return t}
/* ---------- the live renderer ---------- */
class Render3D{
  constructor(fight,stage){
    this.f=fight;this.stage=stage;
    const low=!Settings.gfxHi;
    this.r=new THREE.WebGLRenderer({antialias:!low,powerPreference:'high-performance',alpha:false});this.ok=true;
    this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1:1.5));
    this.r.shadowMap.enabled=!low;this.r.shadowMap.type=THREE.VSMShadowMap;this.r.toneMapping=THREE.ACESFilmicToneMapping;this.r.toneMappingExposure=.85;this.r.outputColorSpace=THREE.SRGBColorSpace;
    const cv=this.r.domElement;cv.className='gl';stage.insertBefore(cv,stage.firstChild);cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ok=false});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x070a16);this.scene.fog=new THREE.Fog(0x0a1030,10,34);this.scene.environment=r3env();
    this.cam=new THREE.PerspectiveCamera(50,1,.08,80);this.scene.add(this.cam);
    r3arena(this.scene,{shadows:!low,heat:fight.mods&&fight.mods.heat,seed:7});
    this.oL=r3look(fight.o.look,fight.o.name);this.pL=r3look(fight.p.look,fight.p.name);
    const dv=(typeof G!=='undefined'&&G&&G.boxer)?DIVS.findIndex(d=>d.id===G.boxer.div):3;this.oL.build=this.pL.build=.88+Math.max(0,dv)/7*.32;
    this.opp=r3boxer(this.oL);this.opp.position.set(0,.1,.2);this.scene.add(this.opp);
    this.oppFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:r3spriteTex(),blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));this.oppFlash.scale.set(1.2,1.2,1);this.scene.add(this.oppFlash);
    // player's gloves, parented to the camera
    this.pg={};const gm=r3leather(this.pL.gloves);
    for(const h of ['L','R']){const s=h==='L'?-1:1;const gl=new THREE.Group();const m=r3mesh(r3lathe([[0,.1],[.12,.1],[.16,.03],[.17,-.06],[.15,-.14],[.09,-.19],[0,-.2]],1,1.15),gm);gl.add(m);
      const thumb=r3mesh(new THREE.SphereGeometry(.065,16,12),gm);thumb.scale.set(.8,1.2,.9);thumb.position.set(s*.11,0,.09);gl.add(thumb);
      const cuff=r3mesh(new THREE.CylinderGeometry(.1,.108,.11,24),r3matte(0xf3efe6));cuff.position.y=-.14;gl.add(cuff);
      const fore=r3mesh(r3limb(.7,t=>.09+.02*Math.sin(t*Math.PI)),r3cel(this.pL.skin));fore.position.set(0,-.14,.02);gl.add(fore);
      gl.scale.setScalar(.9);this.cam.add(gl);this.pg[h]={g:gl,s,gm}}
    this.pgm=gm;
    this.exprT=0;this.texKey='';this.fxSeen=0;this.flashT=0;this.blinkT=0;
    this.resize();
  }
  resize(){const r=this.stage.getBoundingClientRect();const w=Math.max(10,r.width),h=Math.max(10,r.height);this.r.setSize(w,h,false);this.aspect=w/h;this.cam.aspect=this.aspect;this.W=w;this.H=h;this.cam.updateProjectionMatrix()}
  destroy(){try{this.r.dispose();this.r.domElement.remove()}catch(e){}}
  /* opponent pose from the engine's 2D pose */
  poseOpp(P,glow){
    const f=this.f,o=f.o,u=this.opp.userData,t=f.time;
    const raw=P._raw||P;const lean=raw.lean||0,cr=raw.crouch||0,tw=raw.twist||0,ht=raw.headTilt||0,rot=raw.rot||0;
    const st=o.state,k=o.dur?clamp(o.t/o.dur,0,1):0;
    const sx=o.south?-1:1;
    // body
    const closeness=(raw.scale||1)-1;
    this.opp.position.set((raw.hip?raw.hip[0]:0)*.004,.1,.2+closeness*1.7);
    u.pelvis.position.y=1.0-cr*.32;
    let fwd=0;// forward lean (deg)
    if(st==='wind')fwd=-5*k;else if(st==='act')fwd=14;else if(st==='rec')fwd=14*(1-k);
    if(st==='stagger')fwd=-14;if(st==='clinch')fwd=12;if(o.hurt>0&&st!=='down')fwd+=Math.sin(t*5)*4;
    u.spine.rotation.set(fwd*Math.PI/180,tw*1.05,-lean*.55);
    u.pelvis.rotation.y=tw*.35;
    // head: tilt + hit reaction
    const hdx=(raw.head?raw.head[0]:0)-(raw.chest?raw.chest[0]:0);
    u.headG.rotation.set((st==='down'?.35:0)+(o.hurt>0?.12:0)-(raw.hitUp||0),hdx*.004,-ht*1.0);
    // fall
    if(st==='down'){const fall=rot;this.opp.rotation.x=-fall*.62;this.opp.rotation.y=sx*fall*.25;this.opp.position.y=.1+fall*.05;u.pelvis.position.y=1.0-cr*.32-fall*.1}
    else if(f.phase==='end'&&o.state!=='down'){this.opp.rotation.set(0,0,0)}else this.opp.rotation.set(0,0,0);
    // legs: stance + crouch
    const front=o.south?-1:1;
    for(const s of [-1,1]){const lead=s===front;const hipX=(lead?-14:8)+cr*55,kneeX=(lead?-10:-8)-cr*95,hipZ=6;
      const L=u.legs[s];L.hip.rotation.set(hipX*Math.PI/180,0,hipZ*s*Math.PI/180);L.knee.rotation.set(kneeX*Math.PI/180,0,0);
      if(st==='down'){L.hip.rotation.x=(s>0?-.1:.25)*rot;L.knee.rotation.x=-.45*rot}}
    // arms: IK to the 2D glove targets (x px -> m, y px -> m, ext -> toward the camera)
    this.opp.updateWorldMatrix(true,true);
    for(const h of ['L','R']){const s=h==='L'?1:-1;const g2=h==='L'?raw.lg:raw.rg;if(!g2)continue;
      const x=g2[0]*.0052,y=-g2[1]*.0063+(st==='down'?-.3*rot:0),ext=g2[2]||0;
      const T=_v[7].set(x,y,.22+ext*.78);
      if(st==='down'){T.set(s*.5,1.3-rot*.6,.2+rot*.4)}
      T.applyMatrix4(this.opp.matrixWorld);
      const pole=_v[8].set(s*1.2,.2,-.3).applyMatrix4(this.opp.matrixWorld);
      r3ik(u.arms[s],T,pole);
      // glove: fist forward on straights, thumb up on hooks
      const gl=u.arms[s].glove;const type=o.pu&&o.pu.type;const active=o.pu&&(st==='wind'||st==='act'||st==='rec')&&f.hand(o,type)===h;
      gl.rotation.set(active&&type!=='upper'?-.5:-.15,0,active&&type==='hook'?s*.9:0);
      const gw=glow&&glow[h]||0;u.arms[s].gm.emissive.set(gw>0?(glow.col||'#ffd34d'):'#000000');u.arms[s].gm.emissiveIntensity=gw*.9;
    }
    // expression
    const face=P.face||'normal';
    const E={lidOpen:1,squint:0,angry:0,hurt:0,open:0,look:0,lookY:0};
    if(P.blink)E.lidOpen=.05;
    if(P.wind){E.angry=1;E.squint=.3}
    if(face==='hit'){E.lidOpen=.15;E.squint=1;E.open=.6;E.hurt=.6}
    else if(face==='hurt'){E.lidOpen=.55;E.hurt=1;E.open=.45;E.look=Math.sin(t*2.6)*.6}
    else if(face==='ko'){E.lidOpen=.05;E.open=.7;E.hurt=1;E.lookY=-.5}
    else if(face==='smile'){E.lidOpen=.8;E.open=.25}
    if(st==='act'&&o.pu&&o.pu.type!=='jab'){E.open=Math.max(E.open,.5);E.angry=1}
    if(P.flash){E.squint=Math.max(E.squint,.4)}
    if(st==='stagger'&&!P.flash){E.open=Math.max(E.open,.5)}
    if(o.hurt<=0&&face==='normal'&&!P.wind){E.angry=o.ai.intimidate?.6:.25}
    r3expr(u.head,E);
    // skin texture (swelling, cut, sweat): redraw when the quantized damage changes
    const d=P.dmg||{};const key=[Math.round((d.swellL||0)*5),Math.round((d.swellR||0)*5),Math.round((d.cheek||0)*4),Math.round((P.cut||0)/12),Math.min(5,P.sweat||0)].join(',');
    if(key!==this.texKey){this.texKey=key;const c=u.head.userData.ctl;r3skinTex(this.oL.skin,{beard:this.oL.beard,hairColor:this.oL.hairColor,dmg:d,cut:P.cut,sweat:P.sweat},c.texC);c.tex.needsUpdate=true}
  }
  /* player's gloves: reuse the engine's screen-space glove targets, unproject them into camera space */
  posePlayer(){
    const f=this.f,p=f.p,W=f.W,H=f.H;
    for(const h of ['L','R']){const g=f.pG[h],G3=this.pg[h];if(g.init==null)continue;
      const nx=(g.x/W)*2-1,ny=-((g.y/H)*2-1);const depth=1.35/Math.max(.45,g.r);
      const fovY=this.cam.fov*Math.PI/180;const hh=Math.tan(fovY/2)*depth,hw=hh*this.cam.aspect;
      G3.g.position.set(nx*hw,ny*hh,-depth);
      const st=p.state;const type=p.pu&&p.pu.type;const active=p.pu&&(st==='wind'||st==='act'||st==='rec')&&f.hand(p,type)===h;
      const s=G3.s;
      let rx=-1.15,ry=s*-.15,rz=s*.22;
      if(active){if(type==='hook'){rz=s*1.1;rx=-1.0}else if(type==='upper'){rx=-.4}else{rx=-1.5;rz=s*.05}}
      if(st==='block'){rx=-.7;rz=s*.35}
      G3.g.rotation.set(rx,ry,rz);
      G3.g.visible=st!=='down'||p.t<.4;
      G3.gm.emissive.set(g.g>0?'#ffe0a0':'#000000');G3.gm.emissiveIntensity=(g.g||0)*.8;
    }
  }
  render(rdt,P,glow){
    const f=this.f,c=f.cam;
    // camera: base framing + the engine's camera offsets (2D px units) + shake
    const ar=this.aspect;this.cam.fov=(ar<1?58:2*Math.atan(Math.tan(34*Math.PI/180)/ar)*180/Math.PI)/c.zoom;
    const shx=f.shake?(Math.random()*2-1)*f.shake*.0015:0,shy=f.shake?(Math.random()*2-1)*f.shake*.0012:0;
    const cx=c.x*.005+shx,cy=c.y*.0042+shy;
    this.cam.position.set(cx,1.78+cy,2.7);
    const look=_v[2].set(cx*.4,1.6+cy*.5,.2);this.cam.lookAt(look);this.cam.rotation.z+=c.rot;
    this.cam.updateProjectionMatrix();this.cam.updateMatrixWorld();
    this.poseOpp(P,glow);this.posePlayer();
    // impact flash: new sparks from the engine (2D) become a 3D flash at the opponent's head/chest
    if(f.fx.length>this.fxSeen){const last=f.fx[f.fx.length-1];const body=last.y>200;const hp=_v[3].set(0,body?1.55:2.1,.25).applyMatrix4(this.opp.matrixWorld);this.oppFlash.position.copy(hp);this.flashT=.18*(last.s||1);this.oppFlash.material.color.set(last.col||'#fff3d6');this.oppFlash.scale.setScalar(.8*(last.s||1))}
    this.fxSeen=f.fx.length;
    this.flashT=Math.max(0,this.flashT-rdt);this.oppFlash.material.opacity=Math.min(1,this.flashT*7);
    if(f.flashSil>0){this.oppFlash.material.opacity=Math.max(this.oppFlash.material.opacity,Math.min(1,f.flashSil*6));this.oppFlash.scale.setScalar(2.4)}
    const t0=performance.now();this.r.render(this.scene,this.cam);const ms=performance.now()-t0;
    // adaptive detail: if the GPU can't keep up, drop the pixel ratio once (and the shadows after that)
    this.ema=this.ema==null?ms:this.ema*.95+ms*.05;this.frames=(this.frames||0)+1;
    if(this.frames>90&&this.ema>22){const pr=this.r.getPixelRatio();if(pr>1){this.r.setPixelRatio(1);this.resize();this.frames=0;this.ema=null;if(typeof toast==='function')toast('3D detail lowered to keep the fight smooth')}
      else if(this.r.shadowMap.enabled){this.r.shadowMap.enabled=false;this.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});this.frames=0;this.ema=null}}
  }
}
