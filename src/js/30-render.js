/* ================= drawing: modern stylized fighters, arena, portraits =================
   Style: exaggerated proportions, soft two-tone shading, rim light from the top-left key light,
   dark outline only on the silhouette of each part. Everything is drawn in code. */
function shade(hex,amt){
  let c=parseInt(hex.slice(1),16),r=c>>16,g=(c>>8)&255,b=c&255;
  if(amt<0){r*=1+amt;g*=1+amt;b*=1+amt}else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt}
  return `rgb(${r|0},${g|0},${b|0})`;
}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
const OUTLINE='#1a1220';
/* draw a closed path with outline, base fill, shadow side, highlight and rim light.
   pathFn(ctx) must leave a closed path. cx,cy,r give the shading center and radius. */
function part(ctx,pathFn,base,cx,cy,r,o={}){
  const lw=o.lw??5;
  pathFn(ctx);ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=o.outline||OUTLINE;ctx.stroke();
  pathFn(ctx);ctx.fillStyle=base;ctx.fill();
  ctx.save();pathFn(ctx);ctx.clip();
  // shadow side (bottom-right), light side (top-left)
  const g=ctx.createRadialGradient(cx-r*.45,cy-r*.5,r*.1,cx,cy,r*1.25);
  g.addColorStop(0,'rgba(255,255,255,'+(o.hi??.22)+')');g.addColorStop(.55,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(10,6,20,'+(o.sh??.38)+')');
  ctx.fillStyle=g;ctx.fillRect(cx-r*2,cy-r*2,r*4,r*4);
  if(o.rim!==false){ctx.translate(2.5,2.5);pathFn(ctx);ctx.lineWidth=4;ctx.strokeStyle='rgba(255,236,200,'+(o.rimA??.33)+')';ctx.stroke()}
  ctx.restore();
}
function capsule(ctx,x1,y1,x2,y2,w1,w2){
  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  ctx.beginPath();ctx.arc(x1,y1,w1/2,Math.atan2(ny,nx),Math.atan2(ny,nx)+Math.PI);ctx.lineTo(x2-nx*w2/2,y2-ny*w2/2);ctx.arc(x2,y2,w2/2,Math.atan2(-ny,-nx),Math.atan2(-ny,-nx)+Math.PI);ctx.closePath();
}
function drawGlove(ctx,x,y,r,col,glow,glowCol,opt={}){
  if(glow>0){ctx.save();ctx.globalAlpha=Math.min(1,glow);const gr=ctx.createRadialGradient(x,y,r*.5,x,y,r*2.4);gr.addColorStop(0,glowCol||'#ffd34d');gr.addColorStop(.5,'rgba(255,220,110,.5)');gr.addColorStop(1,'rgba(255,200,60,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r*2.4,0,7);ctx.fill();ctx.restore()}
  // cuff / wrist
  if(!opt.noCuff){part(ctx,c=>{c.beginPath();c.ellipse(x+(opt.cuffDx||0),y+r*.95,r*.62,r*.36,0,0,7);c.closePath()},'#f3efe6',x,y+r*.9,r*.6,{hi:.3,sh:.3,rimA:.2})}
  // mitt
  part(ctx,c=>{c.beginPath();c.ellipse(x,y,r,r*1.04,0,0,7);c.closePath()},col,x,y,r,{hi:.32,sh:.4,lw:opt.lw||5});
  // thumb / seam
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,r,r*1.04,0,0,7);ctx.clip();
  ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(x+r*.08,y+r*.42,r*.6,r*.3,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.38)';ctx.beginPath();ctx.ellipse(x-r*.34,y-r*.44,r*.3,r*.17,-.55,0,7);ctx.fill();
  ctx.restore();
}
/* ---------- head ---------- */
function drawHead(ctx,L,x,y,face,cut,o={}){
  const skin=SKIN[L.skin],hc=HAIRC[L.hc||0],dk=shade(skin,-.3);
  const R=34,tilt=o.tilt||0;
  ctx.save();ctx.translate(x,y);ctx.rotate(tilt);
  const d=o.dmg||{};
  if(L.hair==='afro'){part(ctx,c=>{c.beginPath();c.arc(0,-14,46,0,7);c.closePath()},hc,0,-14,46,{hi:.15,sh:.4})}
  // ears
  part(ctx,c=>{c.beginPath();c.ellipse(-33,4,8,11,0,0,7);c.closePath()},dk,-33,4,9,{rim:false,hi:.1});
  part(ctx,c=>{c.beginPath();c.ellipse(33,4,8,11,0,0,7);c.closePath()},dk,33,4,9,{rim:false,hi:.1});
  // face
  const jaw=o.jaw||1;
  part(ctx,c=>{c.beginPath();c.moveTo(-R,-8);c.quadraticCurveTo(-R-2,-36,0,-R-4);c.quadraticCurveTo(R+2,-36,R,-8);c.quadraticCurveTo(R-1,22*jaw,0,34*jaw);c.quadraticCurveTo(-R+1,22*jaw,-R,-8);c.closePath()},skin,-6,-10,R*1.1,{hi:.2,sh:.36});
  // swelling & redness
  const sw=(sx,amt)=>{if(amt<=0)return;ctx.save();ctx.globalAlpha=Math.min(.75,amt*.9);const g=ctx.createRadialGradient(sx,-2,2,sx,-2,14+amt*8);g.addColorStop(0,'#b2403f');g.addColorStop(.6,'#9a3f55');g.addColorStop(1,'rgba(150,60,80,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(sx,-1,15+amt*7,12+amt*5,0,0,7);ctx.fill();ctx.restore()};
  sw(-12,d.swellL||0);sw(12,d.swellR||0);
  if(d.cheek>0){ctx.save();ctx.globalAlpha=Math.min(.5,d.cheek*.6);ctx.fillStyle='#b2403f';ctx.beginPath();ctx.ellipse(0,18,20,9,0,0,7);ctx.fill();ctx.restore()}
  // hair
  const cap=(h,fr,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;part(ctx,c=>{c.beginPath();c.moveTo(-R-1,-8);c.quadraticCurveTo(-R-4,-h*.6,-R*.55,-h);c.quadraticCurveTo(0,-h-8+fr,R*.55,-h);c.quadraticCurveTo(R+4,-h*.6,R+1,-8);c.quadraticCurveTo(0,-30,-R-1,-8);c.closePath()},hc,0,-30,R,{hi:.12,sh:.45});ctx.restore()};
  if(L.hair==='buzz')cap(40,0,.8);
  else if(L.hair==='short'||L.hair==='braids'||L.hair==='topknot'){cap(46,5);
    if(L.hair==='braids'){ctx.strokeStyle=shade(hc,.3);ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*9,-40);ctx.lineTo(i*10,-18);ctx.stroke()}}
    if(L.hair==='topknot')part(ctx,c=>{c.beginPath();c.arc(0,-48,10,0,7);c.closePath()},hc,0,-48,10,{})}
  else if(L.hair==='slick'){cap(44,8);ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-9,-33,11,3.5,-.3,0,7);ctx.fill()}
  else if(L.hair==='mohawk'){cap(42,0,.4);part(ctx,c=>{rrect(c,-7,-62,14,32,6)},hc,0,-46,14,{})}
  else if(L.hair==='afro'){part(ctx,c=>{c.beginPath();c.ellipse(0,-18,32,22,0,Math.PI,0);c.closePath()},hc,0,-20,30,{hi:.1,sh:.3})}
  else if(L.hair==='bald'){ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.ellipse(-8,-26,10,5.5,-.3,0,7);ctx.fill()}
  // brows
  const bc=L.hair==='bald'?shade(skin,-.55):hc;
  const angry=face==='angry'||o.wind,up=face==='hurt'||face==='ko';
  ctx.strokeStyle=bc;ctx.lineWidth=4;ctx.lineCap='round';
  const bo=angry?3:up?-4:0;
  ctx.beginPath();ctx.moveTo(-19,-11-bo*.5);ctx.lineTo(-6,-9+bo);ctx.moveTo(19,-11-bo*.5);ctx.lineTo(6,-9+bo);ctx.stroke();
  // eyes
  ctx.lineWidth=2.6;
  const eyeY=0;
  if(face==='ko'||face==='hurt'){
    ctx.strokeStyle='#1a1010';
    for(const s of [-1,1]){const ex=s*12,ey=eyeY;
      if(face==='ko'){ctx.beginPath();ctx.moveTo(ex-5,ey-5);ctx.lineTo(ex+5,ey+5);ctx.moveTo(ex+5,ey-5);ctx.lineTo(ex-5,ey+5);ctx.stroke()}
      else{ctx.beginPath();ctx.arc(ex,ey,5,0.2,Math.PI*1.7);ctx.stroke()}}
  }else if(face==='hit'||o.blink){ctx.strokeStyle='#1a1010';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,eyeY);ctx.quadraticCurveTo(-12,eyeY+4,-6,eyeY+1);ctx.moveTo(18,eyeY);ctx.quadraticCurveTo(12,eyeY+4,6,eyeY+1);ctx.stroke()}
  else{
    for(const s of [-1,1]){const sq=(s<0?d.swellL:d.swellR)||0;const h=4.2*(1-Math.min(.85,sq*.7));
      ctx.fillStyle='#f6f3ec';ctx.beginPath();ctx.ellipse(s*12,eyeY,6,h,0,0,7);ctx.fill();
      ctx.fillStyle=o.flash?'#ffcf3a':'#1a1210';ctx.beginPath();ctx.arc(s*12+(o.look||0),eyeY+.4,Math.min(h,2.8),0,7);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(s*12-1,eyeY-1,.9,0,7);ctx.fill()}
    if(o.flash){ctx.fillStyle='rgba(255,220,80,.55)';ctx.beginPath();ctx.arc(-12,eyeY,10,0,7);ctx.arc(12,eyeY,10,0,7);ctx.fill()}
  }
  // nose
  ctx.strokeStyle=shade(skin,-.45);ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(1,3);ctx.quadraticCurveTo(6,13,-1,14);ctx.stroke();
  // beard
  if(L.beard==='stubble'){ctx.fillStyle='rgba(20,15,10,.22)';ctx.beginPath();ctx.ellipse(0,19,22,14,0,0,Math.PI);ctx.fill()}
  if(L.beard==='beard'){part(ctx,c=>{c.beginPath();c.moveTo(-29,2);c.quadraticCurveTo(-26,36,0,38);c.quadraticCurveTo(26,36,29,2);c.quadraticCurveTo(20,22,0,24);c.quadraticCurveTo(-20,22,-29,2);c.closePath()},bc,0,22,20,{rim:false,hi:.08,sh:.35,lw:3})}
  if(L.beard==='mustache'||L.beard==='beard'){ctx.fillStyle=bc;rrect(ctx,-11,16,22,5,2.5);ctx.fill()}
  // mouth
  if(face==='hit'||face==='ko'||o.open){ctx.fillStyle='#3a1010';ctx.beginPath();ctx.ellipse(0,25,8,5.5,0,0,7);ctx.fill();ctx.fillStyle=o.guard||'#e8e3ff';ctx.fillRect(-7,21,14,3.5)}
  else{ctx.strokeStyle=shade(skin,-.5);ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-8,24);ctx.quadraticCurveTo(0,face==='smile'?29:face==='angry'?22:25,8,24);ctx.stroke()}
  // sweat
  if(o.sweat>0){ctx.fillStyle='rgba(200,230,255,.75)';for(let i=0;i<Math.min(6,o.sweat);i++){const a=i*1.3+(o.t||0)*.5,sx=Math.sin(a)*28,sy=-22+((o.t||0)*18+i*13)%40;ctx.beginPath();ctx.ellipse(sx,sy,1.8,3,0,0,7);ctx.fill()}}
  // cut
  if(cut>12){const c=Math.min(1,cut/100);ctx.strokeStyle='#8e0e0e';ctx.lineWidth=2+c*2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(7,-17);ctx.lineTo(13+10*c,-21);ctx.stroke();
    if(c>.3){ctx.fillStyle='rgba(165,10,10,.85)';ctx.beginPath();ctx.moveTo(14,-16);ctx.quadraticCurveTo(17,-4,15,4+c*18);ctx.quadraticCurveTo(12,-4,14,-16);ctx.fill()}}
  ctx.restore();
}
/* ---------- opponent from a pose ----------
   pose (opponent-local, feet origin, y up negative): hip,chest,head [x,y]; twist -1..1; lean; crouch;
   lg,rg [x,y,z]; face; cut; flash; wind; open; blink; dmg; sweat; lying; shoulders optional */
function drawFighter(ctx,L,P,o={}){
  const skin=SKIN[L.skin],sk2=shade(skin,-.18),sk3=shade(skin,-.4);
  const glow=o.glow||{};
  const tw=P.twist||0,lean=P.lean||0;
  const hipX=P.hip[0],hipY=P.hip[1],chX=P.chest[0],chY=P.chest[1];
  const shW=46-Math.abs(tw)*10;
  const shL=[chX+shW+tw*8,chY-12+tw*4],shR=[chX-shW+tw*8,chY-12-tw*4];
  const arm=(sh,g,isLeft)=>{
    const z=g[2]||0,side=isLeft?1:-1;
    const mx=(sh[0]+g[0])/2,my=(sh[1]+g[1])/2;
    const bend=Math.max(0,1-Math.max(0,z))*(28+Math.abs(sh[1]-g[1])*.15);
    const ex=mx+side*bend*(g[1]>sh[1]+20?.6:1),ey=my+bend*.55*(z<0?.4:1);
    const up=30*(1+Math.max(0,z)*.15),fo=25*(1+Math.max(0,z)*.55);
    return {ex,ey,up,fo,z};
  };
  const drawArm=(sh,g,isLeft)=>{
    const a=arm(sh,g,isLeft);
    part(ctx,c=>capsule(c,sh[0],sh[1],a.ex,a.ey,a.up,a.up*.85),sk2,(sh[0]+a.ex)/2,(sh[1]+a.ey)/2,a.up,{hi:.18,sh:.4});
    part(ctx,c=>capsule(c,a.ex,a.ey,g[0],g[1]+8,a.fo*.95,a.fo),skin,(a.ex+g[0])/2,(a.ey+g[1])/2,a.fo,{hi:.2,sh:.36});
    // deltoid cap
    part(ctx,c=>{c.beginPath();c.arc(sh[0],sh[1],19,0,7);c.closePath()},shade(skin,-.05),sh[0],sh[1],19,{hi:.25,sh:.3,lw:4});
  };
  const gloveR=g=>22*(1+Math.max(0,g[2]||0)*1.35)*(1+Math.min(0,g[2]||0)*.3);
  ctx.save();
  // legs
  const legW=34,footY=0,spread=P.legSpread||52;
  const kneeDrop=(P.crouch||0)*40;
  for(const s of [-1,1]){
    const kx=hipX*.4+s*spread*.9,ky=hipY*.45+kneeDrop;
    part(ctx,c=>capsule(c,hipX+s*26,hipY+10,kx,ky,legW+6,legW),sk2,(hipX+kx)/2,(hipY+ky)/2,legW,{hi:.14,sh:.42});
    part(ctx,c=>capsule(c,kx,ky,s*spread,footY-10,legW,legW*.9),shade(skin,-.22),(kx+s*spread)/2,(ky+footY)/2,legW,{hi:.12,sh:.45});
    // boot
    part(ctx,c=>{rrect(c,s*spread-20,footY-22,40,30,10)},L.trim||'#f4efe3',s*spread,footY-8,22,{hi:.2,sh:.35,lw:4});
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(s*spread-16,footY-2,32,6);
  }
  // trunks
  const trX=hipX,trY=hipY;
  part(ctx,c=>{c.beginPath();c.moveTo(trX-64,trY-44);c.lineTo(trX+64,trY-44);c.quadraticCurveTo(trX+72,trY+30,trX+58,trY+42);c.lineTo(trX+8,trY+36);c.lineTo(trX,trY+52);c.lineTo(trX-8,trY+36);c.lineTo(trX-58,trY+42);c.quadraticCurveTo(trX-72,trY+30,trX-64,trY-44);c.closePath()},L.trunks,trX,trY,70,{hi:.2,sh:.4});
  ctx.save();ctx.fillStyle=L.trim;ctx.fillRect(trX-66,trY-48,132,14);ctx.fillRect(trX-60,trY-34,7,74);ctx.fillRect(trX+53,trY-34,7,74);ctx.restore();
  // torso (with twist: narrower when turned)
  const tw2=1-Math.abs(tw)*.18;
  part(ctx,c=>{c.beginPath();c.moveTo(chX-72*tw2+tw*6,chY-24);c.quadraticCurveTo(chX-82*tw2,chY+30,trX-50,trY-40);c.lineTo(trX+50,trY-40);c.quadraticCurveTo(chX+82*tw2,chY+30,chX+72*tw2+tw*6,chY-24);c.quadraticCurveTo(chX+tw*6,chY-42,chX-72*tw2+tw*6,chY-24);c.closePath()},skin,chX-10,chY+20,86,{hi:.22,sh:.4});
  // muscle lines
  ctx.save();ctx.strokeStyle=sk3;ctx.globalAlpha=.38;ctx.lineWidth=2.4;ctx.lineCap='round';
  const px=chX+tw*10;
  ctx.beginPath();ctx.moveTo(px-50,chY+6);ctx.quadraticCurveTo(px-25,chY+22,px-3,chY+8);ctx.moveTo(px+50,chY+6);ctx.quadraticCurveTo(px+25,chY+22,px+3,chY+8);ctx.moveTo(px,chY+14);ctx.lineTo(px,trY-46);ctx.moveTo(px-18,chY+34);ctx.lineTo(px+18,chY+34);ctx.moveTo(px-16,chY+52);ctx.lineTo(px+16,chY+52);ctx.stroke();ctx.restore();
  // back arm (pulled back)
  const arms=[[shL,P.lg,true],[shR,P.rg,false]];
  for(const [sh,g,il] of arms)if((g[2]||0)<-.25)drawArm(sh,g,il);
  for(const [sh,g,il] of arms)if((g[2]||0)<-.25)drawGlove(ctx,g[0],g[1],gloveR(g),L.gloves,glow[il?'L':'R']||0,glow.col);
  // neck + head
  part(ctx,c=>capsule(c,chX+tw*6,chY-30,P.head[0],P.head[1]+14,34,30),sk2,chX,chY-30,20,{hi:.1,sh:.45,rim:false});
  drawHead(ctx,L,P.head[0],P.head[1],P.face||'normal',P.cut||0,{tilt:P.headTilt||0,flash:P.flash,blink:P.blink,wind:P.wind,open:P.open,look:P.look,dmg:P.dmg,sweat:P.sweat,t:P.t});
  // front arms
  const front=arms.filter(a=>(a[1][2]||0)>=-.25).sort((a,b)=>(a[1][2]||0)-(b[1][2]||0));
  for(const [sh,g,il] of front)drawArm(sh,g,il);
  for(const [sh,g,il] of front)drawGlove(ctx,g[0],g[1],gloveR(g),L.gloves,glow[il?'L':'R']||0,glow.col);
  ctx.restore();
}
/* ---------- the player's gloves (screen space, first person) ---------- */
function drawPlayerGlove(ctx,x,y,r,col,side,o={}){
  // forearm runs off the bottom edge
  const skin=SKIN[o.look?.skin??2];
  const bx=x+side*r*.9,by=y+r*4;
  part(ctx,c=>capsule(c,x+side*r*.15,y+r*.6,bx,by,r*1.15,r*1.5),skin,x,y+r*1.6,r*1.2,{hi:.18,sh:.42,lw:6});
  drawGlove(ctx,x,y,r,col,o.glow||0,o.gc,{lw:6,cuffDx:side*r*.1});
}
function drawRef(ctx,x,y,n,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  part(ctx,c=>{rrect(c,-18,36,15,76,6)},'#1b1b1f',-10,70,30,{hi:.1,sh:.3,lw:4});part(ctx,c=>{rrect(c,3,36,15,76,6)},'#1b1b1f',10,70,30,{hi:.1,sh:.3,lw:4});
  part(ctx,c=>{rrect(c,-24,-12,48,60,12)},'#f2f2f2',0,10,30,{hi:.2,sh:.32,lw:4});
  ctx.fillStyle='#111';ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(8,2);ctx.lineTo(8,-7);ctx.lineTo(-8,2);ctx.fill();
  part(ctx,c=>{c.beginPath();c.arc(0,-26,16,0,7);c.closePath()},'#c99a74',0,-26,16,{lw:4});ctx.fillStyle='#ddd';ctx.beginPath();ctx.ellipse(0,-37,15,7,0,Math.PI,0);ctx.fill();
  part(ctx,c=>capsule(c,18,0,n%2?46:40,n%2?-38:-32,12,10),'#f2f2f2',30,-16,16,{lw:4});
  part(ctx,c=>{c.beginPath();c.arc(n%2?48:42,n%2?-42:-36,7,0,7);c.closePath()},'#c99a74',44,-40,7,{lw:3});
  ctx.restore();
}
/* ---------- arena layers ---------- */
function srng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function buildArena(w,h,sc,ox,oy,opt={}){
  const mk=(ww,hh)=>{const c=document.createElement('canvas');c.width=ww;c.height=hh;return c};
  const pad=Math.round(w*.25);
  const L=-(ox+pad)/sc-20,Rr=(w+pad-ox)/sc+20;
  // bg: darkness and the spotlight haze (crowd draws over this, ring over the crowd)
  const bg=mk(w+pad*2,h);{const x=bg.getContext('2d');
    const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#030409');g.addColorStop(.45,'#0a0d1d');g.addColorStop(1,'#04050b');x.fillStyle=g;x.fillRect(0,0,w+pad*2,h);
    x.translate(ox+pad,oy);x.scale(sc,sc);
    const cone=x.createLinearGradient(200,-120,200,330);cone.addColorStop(0,opt.heat?'rgba(255,170,90,.26)':'rgba(190,205,255,.22)');cone.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=cone;x.beginPath();x.moveTo(120,-140);x.lineTo(280,-140);x.lineTo(560,330);x.lineTo(-160,330);x.closePath();x.fill();
  }
  const base=mk(w+pad*2,h);{const x=base.getContext('2d');
    x.translate(ox+pad,oy);x.scale(sc,sc);
    // haze over the crowd so the ring reads as the lit area
    const hz=x.createLinearGradient(0,0,0,262);hz.addColorStop(0,'rgba(5,6,14,.15)');hz.addColorStop(1,'rgba(5,6,14,.55)');x.fillStyle=hz;x.fillRect(L,-200,Rr-L,462);
    // far apron
    x.fillStyle='#10132a';x.fillRect(L,214,Rr-L,60);
    // floor with spotlight pool
    const fl=x.createLinearGradient(0,262,0,430);fl.addColorStop(0,'#a89d86');fl.addColorStop(.45,'#d9cfb6');fl.addColorStop(1,'#efe6d1');
    x.fillStyle=fl;x.beginPath();x.moveTo(-14,262);x.lineTo(414,262);x.lineTo(640,432);x.lineTo(-240,432);x.closePath();x.fill();
    const pool=x.createRadialGradient(200,380,20,200,380,300);pool.addColorStop(0,'rgba(255,250,230,.55)');pool.addColorStop(1,'rgba(255,250,230,0)');x.fillStyle=pool;x.fillRect(-240,262,880,170);
    x.save();x.translate(200,372);x.scale(1,.32);x.font='bold 46px "Alfa Slab One",Georgia,serif';x.textAlign='center';x.fillStyle='rgba(160,40,32,.18)';x.fillText(opt.logo||'TWELVE ROUNDS',0,0);x.restore();
    x.strokeStyle='rgba(0,0,0,.07)';x.lineWidth=1;for(let i=-6;i<=6;i++){x.beginPath();x.moveTo(200+i*35,262);x.lineTo(200+i*85,432);x.stroke()}
    const post=(px)=>{x.fillStyle='#262a36';x.fillRect(px-7,166,14,100);x.fillStyle='#3a3f50';x.fillRect(px-7,166,4,100);x.fillStyle='#d8392f';x.fillRect(px-9,170,18,12);x.fillStyle='#f2f2f2';x.fillRect(px-9,192,18,12);x.fillStyle='#2f6fe2';x.fillRect(px-9,214,18,12)};
    for(const [col,y] of [['#d8392f',178],['#f2f2f2',200],['#2f6fe2',222]]){
      x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=6;x.beginPath();x.moveTo(-8,y+2);x.quadraticCurveTo(200,y+8,408,y+2);x.stroke();
      x.strokeStyle=col;x.lineWidth=4;x.beginPath();x.moveTo(-8,y);x.quadraticCurveTo(200,y+6,408,y);x.stroke();
      x.globalAlpha=.55;x.beginPath();x.moveTo(-8,y);x.lineTo(L-200,y+70);x.moveTo(408,y);x.lineTo(Rr+200,y+70);x.stroke();x.globalAlpha=1}
    post(-8);post(408);
  }
  // crowd layers: far (small, dark) to near (bigger, lit from the ring)
  const crowd=[];const r=srng(opt.seed||7);
  const specs=[{rows:4,y0:14,size:5,dk:.07,par:.12},{rows:3,y0:92,size:7.5,dk:.12,par:.24},{rows:2,y0:152,size:10,dk:.17,par:.4}];
  for(const sp of specs){
    const c=mk(w+pad*2,h);const x=c.getContext('2d');x.translate(ox+pad,oy);x.scale(sc,sc);
    for(let row=0;row<sp.rows;row++){
      const y=sp.y0+row*sp.size*2.4,size=sp.size+row*.6,dk=sp.dk+row*.03;
      for(let px=L-(row%2)*size;px<Rr;px+=size*1.95){
        const tone=r(),hue=200+r()*140;const jx=px+r()*4;
        x.fillStyle=`hsl(${hue},${14+r()*30}%,${(dk+tone*.14)*100}%)`;x.beginPath();x.ellipse(jx,y+size*1.35,size*1.1,size*.95,0,0,7);x.fill();
        x.fillStyle=`hsl(${18+r()*22},${22+r()*20}%,${(dk*1.2+tone*.12)*100}%)`;x.beginPath();x.arc(jx,y,size*.64,0,7);x.fill();
        if(r()<.08){x.fillStyle='rgba(255,255,255,.08)';x.beginPath();x.arc(jx,y-size*.2,size*.5,0,7);x.fill()}
      }
    }
    crowd.push({c,par:sp.par});
  }
  // vignette
  const vig=mk(w,h);{const x=vig.getContext('2d');const g=x.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.62)');x.fillStyle=g;x.fillRect(0,0,w,h)}
  return {bg,base,crowd,vig,pad};
}
/* portrait cache */
const _pc={};
function portrait(L,opt={}){
  const key=JSON.stringify(L)+(opt.bg||'')+(opt.face||'');
  if(_pc[key])return _pc[key];
  const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,160);g.addColorStop(0,opt.bg||'#2a3260');g.addColorStop(1,'#12162b');x.fillStyle=g;x.fillRect(0,0,160,160);
  const sp=x.createRadialGradient(80,30,5,80,60,110);sp.addColorStop(0,'rgba(255,240,200,.25)');sp.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=sp;x.fillRect(0,0,160,160);
  x.save();x.translate(80,96);x.scale(1.35,1.35);
  const skin=SKIN[L.skin];
  part(x,c2=>{c2.beginPath();c2.moveTo(-64,70);c2.quadraticCurveTo(-58,30,-20,26);c2.lineTo(20,26);c2.quadraticCurveTo(58,30,64,70);c2.closePath()},shade(skin,-.1),0,50,50,{hi:.2,sh:.4});
  part(x,c2=>{rrect(c2,-13,8,26,24,8)},shade(skin,-.2),0,20,14,{rim:false});
  drawHead(x,L,0,0,opt.face||'normal',0,{});
  x.restore();
  try{_pc[key]=c.toDataURL('image/png')}catch(e){_pc[key]=''}
  return _pc[key];
}
