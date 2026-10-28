/* ================= saves (local + cloud) & boot ================= */
const Save={
  mem:{},cloud:null,cloudSlots:{},lsOK:true,timer:null,
  key:n=>'tr_slot_'+n,
  local(n){const v=Store.get(this.key(n));return v||this.mem[n]||null},
  get(n){const l=this.local(n),c=this.cloudSlots[n];if(c&&(!l||c.t>l.t))return c;return l},
  peek(n){const d=this.get(n);return d?d.sum:null},
  read(n){
    const d=this.get(n);if(!d)return null;
    let g=null;try{g=typeof d.data==='string'?JSON.parse(d.data):deep(d.data)}catch(e){}
    g=this.migrate(g);
    if(!g){const bak=Store.get(this.key(n)+'_bak');if(bak)g=this.migrate(deep(bak.data))}
    if(g)g.slot=n;
    return g;
  },
  migrate(g){
    if(!g||!g.boxer||!g.world)return null;
    g.v=g.v||1;g.flags=g.flags||{};g.chapters=g.chapters||[];
    if(g.seed==null){g.seed=RNG.seed();g.rng={career:g.seed,world:(g.seed^0x5bd1e995)>>>0}}
    delete g._rng;
    // inked renderer: give older fighters and the boxer their face/body traits (hash-based, no RNG draws)
    for(const f of Object.values(g.world.f||{}))fillLook(f);
    const bl=g.boxer.look=g.boxer.look||{};if(!bl.bt)bl.bt={lean:'lanky',medium:'athletic',stocky:'brawler'}[g.boxer.build]||'athletic';
    for(const [k,v] of [['nose','straight'],['scar','none'],['ear','normal'],['expr','stern']])if(!bl[k])bl[k]=v;if(bl.fs==null)bl.fs=hashStr(g.boxer.first+g.boxer.last)%10000;if(!bl.band)bl.band=(g.boxer.last||'').toUpperCase().slice(0,10);
    return g;
  },
  summary(){const b=G.boxer;return {name:b.first+' '+b.last,look:b.look,line:`${b.record.w}-${b.record.l}${b.record.d?'-'+b.record.d:''} · ${G.phase==='pro'?DIVS[b.div].name:G.phase==='retired'?'Retired':'Amateur'} · Level ${b.level} · ${dateStr()}`}},
  serialize(){syncRng();const r=G._rng;delete G._rng;const s=JSON.stringify(G);if(r)G._rng=r;return s},
  write(){
    if(!G)return;
    const json=this.serialize();
    const rec={v:SAVE_V,t:Date.now(),sum:this.summary(),data:json};
    const k=this.key(G.slot);
    try{const old=localStorage.getItem(k);if(old)localStorage.setItem(k+'_bak',old)}catch(e){}
    if(Store.set(k,rec))this.lsOK=true;else{this.lsOK=false;this.mem[G.slot]=rec}
    if(this.cloud&&G.slot>0&&!G.sandbox){clearTimeout(this.timer);const slot=G.slot,sum=rec.sum,t=rec.t;
      this.cloudSlots[slot]={v:SAVE_V,t,sum,data:json};
      this.timer=setTimeout(()=>{this.cloud.db.doc(`data/users/${this.cloud.id}/slot${slot}`).set({v:SAVE_V,t,sum,json}).catch(()=>{})},1200)}
  },
  remove(n){Store.del(this.key(n));Store.del(this.key(n)+'_bak');delete this.mem[n];delete this.cloudSlots[n];if(this.cloud&&n>0)this.cloud.db.doc(`data/users/${this.cloud.id}/slot${n}`).delete().catch(()=>{})},
  status(){
    const parts=[];
    if(this.cloud)parts.push('Cloud save is on: your careers sync to your Claude account.');
    if(this.lsOK)parts.push('Careers save on this device.');
    else parts.push('This browser blocked device storage. Use Export save to keep a backup.');
    return parts.join(' ');
  },
  exportCode(){const s=JSON.stringify({v:SAVE_V,data:JSON.parse(this.serialize())});return 'TR1:'+btoa(unescape(encodeURIComponent(s)))},
  importCode(code,slot){
    try{if(!code.startsWith('TR1:'))return null;const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(4).replace(/\s+/g,'')))));const g=this.migrate(o.data);if(!g)return null;g.slot=slot;return g}catch(e){return null}
  },
};
async function initCloud(){
  try{
    const C=window.claude;if(!C||!C.use)return;
    const [db,user]=await Promise.all([C.use('db'),C.use('user')]);
    if(!db||!user)return;
    const id=await user.id();if(!id)return;
    Save.cloud={db,id};
    for(const n of [1,2,3]){
      try{const s=await db.doc(`data/users/${id}/slot${n}`).get();if(s.exists){const d=s.data();if(d&&d.json)Save.cloudSlots[n]={v:d.v,t:d.t,sum:d.sum,data:d.json}}}catch(e){}
    }
    if(UI.cur==='title'&&!$('.modal'))UI.render();
  }catch(e){}
}
/* load a career object into play */
function loadCareer(g){G=g;useCareerRng()}

/* ---- dev badge & gate ---- */
function devBadge(){
  let b=$('#devbadge');
  if(!Settings.dev){b&&b.remove();return}
  if(!b){b=document.createElement('button');b.id='devbadge';b.className='pill red';b.textContent='DEV';b.style.cssText='position:fixed;top:calc(6px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));z-index:70;';b.onclick=()=>{if($('.fight')||$('.mg'))return;UI.go('dev')};document.body.appendChild(b)}
}
function toggleDev(on){Settings.dev=on??!Settings.dev;saveSettings();devBadge();toast(Settings.dev?'Dev mode on':'Dev mode off');if(!Settings.dev&&UI.cur==='dev')UI.go(G?'home':'title')}

/* ---- service worker (PWA builds only) ---- */
if('serviceWorker' in navigator&&location.protocol.startsWith('http')&&!location.hostname.endsWith('claude.ai')&&typeof PWA_BUILD!=='undefined'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
function start(data){
  if(!$('#app')){const a=document.createElement('div');a.id='app';document.body.appendChild(a)}
  if(location.hash==='#dev'){Settings.dev=true;saveSettings()}
  devBadge();applyTextSize();
  if(data&&data.G&&data.G.boxer){loadCareer(Save.migrate(data.G));UI.go(['fight','result','fightnight'].includes(data.screen)?'home':data.screen||'home')}
  else UI.go('title');
  initCloud();
  try{window.claude?.hot?.snapshot?.(()=>({G:G?JSON.parse(Save.serialize()):null,screen:UI.cur}))}catch(e){}
}
if(window.claude?.hot?.ready)window.claude.hot.ready(start);else start(window.claude?.hot?.data??{});
