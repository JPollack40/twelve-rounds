'use strict';
/* ================= utilities ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---- seeded RNG: every random call goes through RNG.cur so fights and careers replay exactly ---- */
class Rng{
  constructor(seed){this.s=(seed>>>0)||1}
  next(){let a=this.s=(this.s+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  int(){return (this.s=(this.s+0x6D2B79F5)|0)>>>0}
}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const RNG={
  cur:null,
  use(r){const p=this.cur;this.cur=r;return p},
  with(r,fn){const p=this.cur;this.cur=r;try{return fn()}finally{this.cur=p}},
  seed(){return (Math.random()*4294967296)>>>0},
};
const R=()=>RNG.cur?RNG.cur.next():Math.random();
const rand=(a,b)=>a+R()*(b-a);
const randi=(a,b)=>Math.floor(a+R()*(b-a+1));
const pick=a=>a[Math.floor(R()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const chance=p=>R()<p;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const uid=()=>R().toString(36).slice(2,9)+((R()*1e6)|0).toString(36);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>{n=Math.round(n||0);const s=n<0?'-':'';n=Math.abs(n);return s+'$'+(n>=1e6?(n/1e6).toFixed(n>=1e7?1:2)+'M':n>=1e4?Math.round(n/1e3)+'K':n.toLocaleString('en-US'))};
const wpick=obj=>{let t=0;for(const k in obj)t+=Math.max(0,obj[k]);let r=R()*t;for(const k in obj){r-=Math.max(0,obj[k]);if(r<=0)return k}return Object.keys(obj)[0]};
const fmtTime=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const ftIn=i=>Math.floor(i/12)+"′"+(i%12)+"″";
const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};
const sum=a=>a.reduce((x,y)=>x+y,0);
const deep=o=>JSON.parse(JSON.stringify(o));
const ease={out:t=>1-Math.pow(1-t,3),in:t=>t*t*t,inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)},elastic:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1};

const Store={
  get(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const Settings=Object.assign({sound:true,haptics:true,shake:true,slowmo:true,replay:true,commentary:true,hitstop:true,fps60:true,lowlat:true,roundLen:45,hints:true,lefty:false,btnSize:1,dev:false,audioTells:true,gfx3d:true,gfxHi:true,sculpt:true,vol:1,volFx:1,volCrowd:1,volTell:1,flashes:true,tellIcons:true,assist:0,textSize:1,coach:true,openScoring:true,hapticStr:1,layouts:{}},Store.get('tr_settings')||{});
function saveSettings(){Store.set('tr_settings',Settings);applyTextSize()}
function applyTextSize(){try{const a=document.getElementById('app');if(a)a.style.zoom=Settings.textSize||1}catch(e){}}

function buzz(p){if(!Settings.haptics)return;const k=Settings.hapticStr??1;if(Array.isArray(p))p=p.map((v,i)=>i%2?v:Math.round(v*k));else p=Math.round(p*k);try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}

/* ================= synth audio (no files) ================= */
const Sfx={
  ctx:null,out:null,nb:null,crowd:null,crowdGain:null,
  init(){
    if(this.ctx){if(this.ctx.state!=='running')this.ctx.resume().catch(()=>{});return}
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      this.ctx=new C();
      this.out=this.ctx.createGain();this.out.gain.value=.8;
      const comp=this.ctx.createDynamicsCompressor();this.out.connect(comp);comp.connect(this.ctx.destination);
      this.bus={};for(const k of ['fx','tell','crowd']){this.bus[k]=this.ctx.createGain();this.bus[k].connect(this.out)}this.applyVol();
      const len=this.ctx.sampleRate*2,b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
      this.nb=b;
    }catch(e){this.ctx=null}
  },
  ok(){return Settings.sound&&this.ctx&&this.ctx.state==='running'},
  dst(){return (this.bus&&this.bus[this.cur||'fx'])||this.out},
  applyVol(){if(!this.ctx||!this.bus)return;this.out.gain.value=.8*(Settings.vol??1);this.bus.fx.gain.value=Settings.volFx??1;this.bus.tell.gain.value=Settings.volTell??1;this.bus.crowd.gain.value=Settings.volCrowd??1},
  noise(dur,{type='lowpass',f=1000,f2=null,q=1,g=.5,att=.004,delay=0}={}){
    if(!this.ok())return;const c=this.ctx,t=c.currentTime+delay;
    const s=c.createBufferSource();s.buffer=this.nb;s.loop=true;
    const fl=c.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);fl.Q.value=q;
    const gn=c.createGain();gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g,t+att);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(fl);fl.connect(gn);gn.connect(this.dst());s.start(t,Math.random()*1.5);s.stop(t+dur+.05);
  },
  tone(f,dur,{type='sine',g=.3,f2=null,att=.005,delay=0}={}){
    if(!this.ok())return;const c=this.ctx,t=c.currentTime+delay;
    const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const gn=c.createGain();gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g,t+att);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(gn);gn.connect(this.dst());o.start(t);o.stop(t+dur+.05);
  },
  hit(power=1,body=false){const p=Math.min(power,1.6);this.noise(.08+.05*p,{f:body?520:1500,f2:body?140:280,g:.45+.3*p});this.tone(body?68:96,.15+.08*p,{f2:38,g:.42*p+.1})},
  block(){this.noise(.07,{type:'bandpass',f:900,q:1.4,g:.32});this.tone(170,.07,{g:.12,f2:90})},
  whoosh(){this.noise(.18,{type:'bandpass',f:500,f2:2400,q:2,g:.12,att:.05})},
  /* audio tells: one voice per punch type so you can play by ear */
  tell(type,dur){const pc=this.cur;this.cur='tell';try{this._tell(type,dur)}finally{this.cur=pc}},
  _tell(type,dur){
    if(!Settings.audioTells)return;
    const d=Math.min(.5,Math.max(.12,dur*.8));
    if(type==='jab'){this.noise(d*.6,{type:'bandpass',f:1800,f2:2600,q:3,g:.08,att:.02})}
    else if(type==='cross'){this.tone(180,d,{type:'sawtooth',g:.06,f2:120,att:.03});this.noise(d,{type:'bandpass',f:700,f2:1600,q:2,g:.09,att:.04})}
    else if(type==='hook'){this.tone(140,d,{type:'square',g:.05,f2:260,att:.05});this.noise(d,{type:'lowpass',f:400,f2:1400,g:.12,att:.06})}
    else{this.tone(90,d,{type:'sawtooth',g:.08,f2:330,att:.04});this.noise(d,{type:'bandpass',f:300,f2:900,q:4,g:.1,att:.08})}
  },
  flash(){if(!Settings.audioTells)return;const pc=this.cur;this.cur='tell';this.tone(2200,.07,{type:'sine',g:.07});this.tone(3300,.09,{type:'sine',g:.05,delay:.03});this.cur=pc},
  bell(n=1){for(let i=0;i<n;i++){const d=i*.32;[1,2.76,5.4].forEach((m,j)=>this.tone(880*m,1.3-j*.3,{g:.16/(j+1),delay:d}))}},
  tick(){this.tone(1200,.04,{g:.05,type:'square'})},
  count(){this.tone(210,.2,{g:.22,type:'triangle'});this.noise(.08,{type:'highpass',f:2000,g:.05})},
  crowdStart(){
    if(!this.ok()||this.crowd)return;const c=this.ctx;
    const s=c.createBufferSource();s.buffer=this.nb;s.loop=true;
    const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=650;f.Q.value=.5;
    const g=c.createGain();g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.045,c.currentTime+1.2);
    s.connect(f);f.connect(g);g.connect(this.bus?this.bus.crowd:this.out);s.start();this.crowd=s;this.crowdGain=g;
  },
  roar(a=.22,dur=1.8){if(!this.crowdGain||!this.ok())return;const t=this.ctx.currentTime,g=this.crowdGain.gain;g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.0001,g.value),t);g.linearRampToValueAtTime(a,t+.12);g.linearRampToValueAtTime(.045,t+dur)},
  crowdStop(){if(this.crowd){try{this.crowd.stop()}catch(e){}this.crowd=null;this.crowdGain=null}},
  cash(){this.tone(1300,.08,{type:'square',g:.06});this.tone(1950,.22,{type:'square',g:.06,delay:.08})},
  good(){this.tone(660,.1,{type:'triangle',g:.14});this.tone(990,.2,{type:'triangle',g:.14,delay:.09})},
  great(){[523,659,784,1046].forEach((f,i)=>this.tone(f,.22,{type:'triangle',g:.13,delay:i*.08}))},
  bad(){this.tone(300,.3,{type:'sawtooth',g:.07,f2:140})},
  click(){this.tone(520,.03,{g:.04,type:'square'})}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Sfx.ctx&&Sfx.ctx.state!=='running')Sfx.ctx.resume().catch(()=>{})});
['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>Sfx.init(),{capture:true}));

/* ================= event log (per fight, ring buffer of recent fights) ================= */
const Logs={
  cur:null,
  start(meta){this.cur={meta,t0:Date.now(),ev:[]};return this.cur},
  ev(o){if(this.cur)this.cur.ev.push(o)},
  end(res){
    if(!this.cur)return null;const L=this.cur;L.res=res;this.cur=null;
    const all=Store.get('tr_logs')||[];all.unshift({id:'L'+Date.now().toString(36),meta:L.meta,res:{winner:res.winner,method:res.method,round:res.round,stats:res.stats,cards:res.cards},ev:L.ev,when:L.t0});
    while(all.length>8||JSON.stringify(all).length>900000)all.pop();
    Store.set('tr_logs',all);return all[0];
  },
  list(){return Store.get('tr_logs')||[]},
};
/* flags: "flag this moment" notes with a state snapshot */
const Flags={
  list(){return Store.get('tr_flags')||[]},
  add(f){const a=this.list();a.unshift(Object.assign({id:'F'+Date.now().toString(36),when:Date.now()},f));while(a.length>40)a.pop();Store.set('tr_flags',a)},
  remove(id){Store.set('tr_flags',this.list().filter(f=>f.id!==id))},
  clear(){Store.del('tr_flags')},
};
