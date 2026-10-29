// Bake the Mixamo animations in tools/mixamo/*.fbx into compact clips for the game (assets/mocap.json).
// Each frame stores, in Mixamo world space (cm): the hips position, the world rotation of the hips, middle spine and head
// relative to the T-pose, and the world direction of each limb segment (upper arm, forearm, hand, thigh, shin) on both sides.
// Then the head, neck and hand positions relative to the hips (tenths of a cm). The game aims its own bones along the directions, so
// the clips fit any body; the positions place bodies that are not built like a boxer. Values are quantised to int16.
// Needs Playwright and three@0.160 (FBXLoader): THREE_DIR=/path/to/node_modules/three node tools/bake_mocap.js
const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),MIX=path.join(__dirname,'mixamo'),THREE_DIR=process.env.THREE_DIR||path.dirname(require.resolve('three/package.json'));
const OUT=path.join(ROOT,'assets','mocap.json');
const slug=f=>f.replace(/\.fbx$/i,'').replace(/\((\d)\)/,'$1').replace(/[^A-Za-z0-9]+/g,' ').trim().split(' ').map((w,i)=>i?w[0].toUpperCase()+w.slice(1).toLowerCase():w.toLowerCase()).join('');
const LONG=/dance|thriller/i;
const page=`<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as THREE from 'three';import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';window.THREE=THREE;window.FBX=FBXLoader;window.READY=1</script>`;
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);let f=null;
  if(u==='/')return r.end(page);if(u.startsWith('/three/'))f=path.join(THREE_DIR,u.slice(7));else if(u.startsWith('/mix/'))f=path.join(MIX,u.slice(5));
  if(!f||!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'application/octet-stream'});fs.createReadStream(f).pipe(r)});
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.error(e.message));
  await p.goto(`http://localhost:${port}/`);await p.waitForFunction(()=>window.READY);
  const files=fs.readdirSync(MIX).filter(f=>/\.fbx$/i.test(f)&&!/^T-Pose/i.test(f)).sort();
  const out={fps:{},clips:{},rest:null};
  // rest: world rotations of the hips, spine and head in the T-pose (deltas are taken from these)
  out.rest=await p.evaluate(async()=>{const o=await new FBX().loadAsync('/mix/T-Pose%20Male.fbx');o.updateMatrixWorld(true);const g=n=>o.getObjectByName('mixamorig'+n);
    const q=n=>g(n).getWorldQuaternion(new THREE.Quaternion()).toArray().map(v=>+v.toFixed(5));return {Hips:q('Hips'),Spine1:q('Spine1'),Head:q('Head'),hipsY:+g('Hips').getWorldPosition(new THREE.Vector3()).y.toFixed(2)}});
  for(const f of files){const fps=LONG.test(f)?15:30;
    const r=await p.evaluate(async([f,fps,rest])=>{const T=THREE,o=await new FBX().loadAsync('/mix/'+encodeURIComponent(f));const a=o.animations[0];const mx=new T.AnimationMixer(o);mx.clipAction(a).play();
      const g=n=>o.getObjectByName('mixamorig'+n);const R={};for(const k in rest)if(k!=='hipsY')R[k]=new T.Quaternion().fromArray(rest[k]).invert();
      const SEG=[['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand'],['LeftHand','LeftHandIndex1'],['RightArm','RightForeArm'],['RightForeArm','RightHand'],['RightHand','RightHandIndex1'],
                 ['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot']];
      const n=Math.max(1,Math.round(a.duration*fps)),data=[],v=new T.Vector3(),w=new T.Vector3(),q=new T.Quaternion();
      for(let i=0;i<=n;i++){mx.setTime(Math.min(a.duration,i/fps));o.updateMatrixWorld(true);const fr=[];
        g('Hips').getWorldPosition(v);fr.push(Math.round(v.x*10),Math.round(v.y*10),Math.round(v.z*10));
        for(const k of ['Hips','Spine1','Head']){g(k).getWorldQuaternion(q);q.multiply(R[k]);if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);fr.push(...q.toArray().map(c=>Math.round(c*32767)))}
        for(const [s,e] of SEG){g(s).getWorldPosition(v);g(e).getWorldPosition(w);w.sub(v).normalize();fr.push(Math.round(w.x*32767),Math.round(w.y*32767),Math.round(w.z*32767))}
        // world positions (cm, relative to the hips) of the head, neck and both hands, for bodies that are placed by position (Duncan)
        const hp=g('Hips').getWorldPosition(new T.Vector3());for(const k of ['Head','Neck','LeftHand','RightHand']){g(k).getWorldPosition(v);v.sub(hp);fr.push(Math.round(v.x*10),Math.round(v.y*10),Math.round(v.z*10))}
        data.push(...fr)}
      return {n:n+1,dur:a.duration,data}},[f,fps,out.rest]);
    const buf=Buffer.from(Int16Array.from(r.data).buffer);out.clips[slug(f)]={fps,n:r.n,dur:+r.dur.toFixed(3),b64:buf.toString('base64')};
    console.log(slug(f).padEnd(28),r.n,'frames',(buf.length/1024).toFixed(1)+'KB')}
  fs.writeFileSync(OUT,JSON.stringify(out));console.log('wrote',OUT,(fs.statSync(OUT).size/1024).toFixed(0)+'KB');await b.close();srv.close()});
