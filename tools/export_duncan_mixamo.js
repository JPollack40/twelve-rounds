// Export Duncan for Mixamo's auto-rigger from his in-game model (canister, spring, head, cable arms with shoulder and elbow joints,
// proper boxing gloves), posed with the arms out so Mixamo sees space between arms and body, with his spring and base swapped for two plain temporary legs
// (Mixamo needs a gap between the legs; the game keeps his spring and bends it itself). New parts are coloured from swatches added under his texture.
// Writes tools/mixamo/duncan_apose.zip (OBJ + MTL + PNG, ~180 cm tall). Usage: ./build.sh && NODE_PATH=<playwright> node tools/export_duncan_mixamo.js
const {chromium}=require('playwright'),fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
// HEAD shrinks his head about the neck and LIFT lengthens the legs (game units), so the auto-rigger sees human proportions; the arms and
// canister keep their real size, so the rig's arm bones fit the game model
const ROOT=path.join(__dirname,'..'),ANG=+(process.argv[2]||60)*Math.PI/180,HEAD=+(process.argv[3]||.5),LIFT=+(process.argv[4]||.55);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();p.on('pageerror',e=>console.error(e.message));
  await p.goto('file://'+ROOT+'/Twelve-Rounds-offline.html');await p.waitForFunction(()=>R3M.ok('duncan'),null,{timeout:30000});
  const r=await p.evaluate(([ANG,HEAD,LIFT])=>{const M=R3M.m.duncan,bx=r3boxer(r3look(Object.assign({skin:2,hair:'bald'},LEGEND_VIS.duncan),{}),{}),u=bx.userData;
    r3duncanBend(u,new THREE.Quaternion(),0);u.headG.quaternion.identity();u.headG.scale.setScalar(HEAD);   // human-sized head for the auto-rigger
    for(const s of [1,-1]){const A=u.arms[s];A.sh.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),s*ANG);A.elbow.quaternion.identity();A.hand.quaternion.identity()}
    bx.updateMatrixWorld(true);
    // atlas: his texture on top (80%), a row of flat swatches below
    const img=M.img,W=img.width,H=img.height,c=document.createElement('canvas');c.width=W;c.height=Math.round(H*1.25);const x=c.getContext('2d');x.drawImage(img,0,0);
    const SW={leather:'#c8262a',cuff:'#efe9dc',tape:'#e8e2d4',cable:'#8f8f8f',joint:'#7a7a7a',leg:'#3a3a3a'},keys=Object.keys(SW),sw={};
    keys.forEach((k,i)=>{x.fillStyle=SW[k];x.fillRect(i*W/keys.length,H,W/keys.length,c.height-H);sw[k]=[(i+.5)/keys.length,(H+(c.height-H)/2)/c.height]});
    const V=[],T=[],F=[],v=new THREE.Vector3();
    const add=(mesh,uvf,minY)=>{const g=mesh.geometry,pos=g.attributes.position,uv=g.attributes.uv,idx=g.index?g.index.array:[...Array(pos.count).keys()],map=new Map();
      const id=i=>{if(map.has(i))return map.get(i);if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,v);else v.fromBufferAttribute(pos,i);mesh.localToWorld(v);V.push(v.x,v.y+(mesh.userData.leg?0:LIFT),v.z);
        const t=uvf?uvf:[uv.getX(i),uv.getY(i)*H/c.height];T.push(t[0],1-t[1]);const n=V.length/3-1;map.set(i,n);return n};
      for(let k=0;k<idx.length;k+=3){if(minY!=null&&Math.min(pos.getY(idx[k]),pos.getY(idx[k+1]),pos.getY(idx[k+2]))<minY)continue;F.push([id(idx[k]),id(idx[k+1]),id(idx[k+2])])}};
    bx.traverse(o=>{if(!o.isMesh||o.userData.isOL||!o.visible)return;const m=o.material;
      if(m&&m.map===M.tex)return add(o,null,o.isSkinnedMesh?MC_DUN_SPRING[1]+.02:null);   // body without the spring and base (the game bends the spring itself)
      const col=m&&m.color?'#'+m.color.getHexString():'';const isGlove=m&&m.clearcoat!==undefined;
      add(o,sw[isGlove?'leather':o.geometry.type==='SphereGeometry'?'joint':o.isSkinnedMesh?'cable':/^#(e|f)/.test(col)?'cuff':'tape'])});
    // temporary legs in place of the spring: a hip block under the canister and two legs with a clear gap between them
    const LT=MC_DUN_SPRING[1]+LIFT,leg=g=>{const m=new THREE.Mesh(g);m.userData.leg=1;return m};
    {const g=new THREE.BoxGeometry(.5,.14,.3,4,2,2);g.translate(0,LT-.05,0);add(leg(g),sw.leg)}
    for(const s of [1,-1]){const g=new THREE.CylinderGeometry(.1,.085,LT-.06,12,16,false);g.translate(s*.16,(LT-.06)/2,0);add(leg(g),sw.leg)}
    return {V,T,F,png:c.toDataURL('image/png').split(',')[1]}},[ANG,HEAD,LIFT]);
  let y0=1/0,y1=-1/0;for(let i=1;i<r.V.length;i+=3){y0=Math.min(y0,r.V[i]);y1=Math.max(y1,r.V[i])}const k=180/(y1-y0),N='duncan_apose';
  const L=[`mtllib ${N}.mtl`,'usemtl duncan'];for(let i=0;i<r.V.length;i+=3)L.push(`v ${(r.V[i]*k).toFixed(3)} ${((r.V[i+1]-y0)*k).toFixed(3)} ${(r.V[i+2]*k).toFixed(3)}`);
  for(let i=0;i<r.T.length;i+=2)L.push(`vt ${r.T[i].toFixed(5)} ${r.T[i+1].toFixed(5)}`);for(const [a,b2,c] of r.F)L.push(`f ${a+1}/${a+1} ${b2+1}/${b2+1} ${c+1}/${c+1}`);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dun-'));fs.writeFileSync(path.join(tmp,N+'.obj'),L.join('\n'));fs.writeFileSync(path.join(tmp,N+'.mtl'),`newmtl duncan\nKd 1 1 1\nmap_Kd ${N}.png\n`);
  fs.writeFileSync(path.join(tmp,N+'.png'),Buffer.from(r.png,'base64'));const zip=path.join(__dirname,'mixamo','DUNCAN_HUMANOID_v5.zip');if(fs.existsSync(zip))fs.unlinkSync(zip);
  execFileSync('python3',['-c',"import zipfile,sys,os;z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED);[z.write(os.path.join(sys.argv[2],f),f) for f in os.listdir(sys.argv[2])];z.close()",zip,tmp]);
  console.log('wrote',zip,(fs.statSync(zip).size/1e6).toFixed(1)+'MB',r.V.length/3,'verts');await b.close()})();
