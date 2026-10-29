// Export Duncan for Mixamo's auto-rigger: his in-game rig posed with the arms out in an A-pose (Mixamo needs space between arms and
// body), plus a pair of plain temporary legs under the canister so its knee markers have something to sit on. The legs are only
// for Mixamo; the game keeps his spring. Writes tools/mixamo/duncan_apose.zip (OBJ + MTL + PNG, ~1.8 m tall).
// Usage: NODE_PATH=<playwright> node tools/export_duncan_mixamo.js   (needs a fresh build: ./build.sh)
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'),OUT=path.join(__dirname,'mixamo');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
  p.on('pageerror',e=>console.error(e.message));
  await p.goto('file://'+ROOT+'/Twelve-Rounds-offline.html');await p.waitForFunction(()=>R3M.ok('duncan'),null,{timeout:30000});
  const r=await p.evaluate(()=>{const M=R3M.m.duncan;const bx=r3boxer(r3look(Object.assign({skin:2,hair:'bald'},LEGEND_VIS.duncan),{}),{});const u=bx.userData;
    r3duncanBend(u,new THREE.Quaternion(),0);u.headG.quaternion.identity();
    for(const s of [1,-1]){const A=u.arms[s];A.sh.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),s*.85);A.elbow.quaternion.identity();A.hand.quaternion.identity()}
    bx.updateMatrixWorld(true);
    // a grey texel of his texture for parts with no UVs of their own (cable, joint balls, temporary legs)
    const sp=M.parts.body,uvA=M.geo.attributes.uv;let gi=0;{const pos=M.geo.attributes.position;for(const i of sp.index.array){const y=pos.getY(i);if(y>.4&&y<.5){gi=i;break}}}
    const grey=[uvA.getX(gi),uvA.getY(gi)];
    const V=[],T=[],F=[];const v=new THREE.Vector3();
    const add=(mesh,uvFn)=>{const g=mesh.geometry,pos=g.attributes.position,uv=g.attributes.uv,base=V.length/3,idx=g.index?g.index.array:[...Array(pos.count).keys()];
      const used=new Map();const map=i=>{if(used.has(i))return used.get(i);if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,v);else v.fromBufferAttribute(pos,i);mesh.localToWorld(v);
        V.push(v.x,v.y,v.z);const t=uvFn?uvFn(i):[uv.getX(i),uv.getY(i)];T.push(t[0],1-t[1]);const n=V.length/3-1;used.set(i,n);return n};
      for(let k=0;k<idx.length;k+=3)F.push([map(idx[k]),map(idx[k+1]),map(idx[k+2])])};
    bx.traverse(o=>{if(!o.isMesh||o.userData.isOL||!o.visible)return;const tex=o.material&&o.material.map===M.tex;add(o,tex?null:()=>grey)});
    // temporary legs: a cylinder under each side of the canister, down to the floor
    for(const s of [1,-1]){const g=new THREE.CylinderGeometry(.1,.09,.82,12,6,false);g.translate(s*.4,.41,0);const m=new THREE.Mesh(g);add(m,()=>grey)}
    const img=M.img,c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);
    return {V,T,F,png:c.toDataURL('image/png').split(',')[1]}});
  // scale to ~1.8 m (Mixamo works in cm), feet on the floor
  let y0=Infinity,y1=-Infinity;for(let i=1;i<r.V.length;i+=3){y0=Math.min(y0,r.V[i]);y1=Math.max(y1,r.V[i])}const k=180/(y1-y0);
  const L=['mtllib duncan_apose.mtl','usemtl duncan'];
  for(let i=0;i<r.V.length;i+=3)L.push(`v ${(r.V[i]*k).toFixed(3)} ${((r.V[i+1]-y0)*k).toFixed(3)} ${(r.V[i+2]*k).toFixed(3)}`);
  for(let i=0;i<r.T.length;i+=2)L.push(`vt ${r.T[i].toFixed(5)} ${r.T[i+1].toFixed(5)}`);
  for(const [a,b2,c] of r.F)L.push(`f ${a+1}/${a+1} ${b2+1}/${b2+1} ${c+1}/${c+1}`);
  const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'dun-'));
  fs.writeFileSync(path.join(tmp,'duncan_apose.obj'),L.join('\n'));fs.writeFileSync(path.join(tmp,'duncan_apose.mtl'),'newmtl duncan\nKd 1 1 1\nmap_Kd duncan_apose.png\n');
  fs.writeFileSync(path.join(tmp,'duncan_apose.png'),Buffer.from(r.png,'base64'));
  const zip=path.join(OUT,'duncan_apose.zip');if(fs.existsSync(zip))fs.unlinkSync(zip);
  execFileSync('python3',['-c',`import zipfile,sys,os;z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED);[z.write(os.path.join(sys.argv[2],f),f) for f in os.listdir(sys.argv[2])];z.close()`,zip,tmp]);
  console.log('wrote',zip,(fs.statSync(zip).size/1e6).toFixed(1)+'MB',r.V.length/3,'verts',r.F.length,'tris');await b.close()})();
