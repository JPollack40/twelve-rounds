/* ================= "Saturday Night Boxing": a monthly studio show that recaps the world =================
   Every four weeks of a pro career: headlines since the last show, the fighters rising in your division, the pound-for-pound top five
   with movement, and where you stand. Built from the world's own state; no RNG is used, so simulations are unaffected. */
const SHOW_HOSTS=['Teddy Marsh','Lorna Pike','Big Al Rooney','Dee Castell'];
function showTick(){
  if(G.phase!=='pro')return;const S=G.show;if(S&&G.week-S.week<4)return;
  const b=B(),d=b.div,since=S?S.week:G.week-4,snap=G.showSnap||{pts:{},p4p:[]};
  const heads=G.newsList.filter(n=>n.w>since&&/title|retires|upset|beats|pound|rival|Bad blood|Hall of Fame/i.test(n.t)&&!/^You call out/.test(n.t)).slice(0,4).map(n=>n.t);
  const risers=ranking(d).filter(e=>e.id!=='P'&&e.f&&snap.pts[e.id]!=null).map(e=>({id:e.id,name:shortName(e.f),gain:Math.round(e.f.pts-snap.pts[e.id]),rank:rankOf(e.id,d)})).filter(x=>x.gain>0).sort((a,c)=>c.gain-a.gain).slice(0,3);
  const p4p=p4pList(5).map((e,i)=>{const was=snap.p4p.indexOf(e.id);return {id:e.id,name:e.id==='P'?`${b.first} ${b.last}`:shortName(e.f),div:e.id==='P'?b.div:e.f.div,mv:was<0?'new':was-i}});
  const n=(S?S.n:0)+1,host=SHOW_HOSTS[n%SHOW_HOSTS.length];
  const you={rank:playerRank(),prev:snap.rank||null,p4p:p4pRank(),lock:titleLock(),belts:beltsOf('P',d)};
  G.show={week:G.week,n,host,heads,risers,p4p,you,seen:false};
  G.showSnap={pts:Object.fromEntries(ranking(d).filter(e=>e.id!=='P').map(e=>[e.id,e.f.pts])),p4p:p4pList(10).map(e=>e.id),rank:you.rank};
}
function showTake(S){const y=S.you,b=B();
  if(y.belts.length)return `"${b.last} is the champion, and everybody else in this division is fighting for second place until somebody proves otherwise."`;
  if(y.lock)return `"After that loss, ${b.last} has to go back and earn it. ${y.lock} more win${y.lock>1?'s':''} and we're talking titles again."`;
  if(y.rank&&y.rank<=3)return `"${b.last} is knocking on the door. Somebody with a belt has to answer it."`;
  if(y.prev&&y.rank&&y.rank<y.prev)return `"${b.last} is moving: #${y.prev} to #${y.rank} since we last talked. Keep an eye on that."`;
  if(y.rank&&y.rank<=15)return `"${b.last} is in the mix, but the top of this division is a different animal."`;
  return `"${b.last} is still a name for the hardcore fans. One big win changes that."`}
function showHTML(full){const S=G.show;if(!S)return '';const mv=m=>m==='new'?'<span class="goldt">new</span>':m>0?`<span class="good">▲${m}</span>`:m<0?`<span class="bad">▼${-m}</span>`:'<span class="dim">–</span>';
  return `<div class="card col" style="gap:8px;border-color:var(--gold)"><div class="row sp"><div><div class="kicker">Saturday Night Boxing · Episode ${S.n}</div><b class="ui" style="font-size:18px;text-transform:uppercase">The month in boxing</b></div><span class="pill">${dateStr(S.week)}</span></div>
    ${S.heads.length?`<div><span class="lbl">Headlines</span>${S.heads.map(h=>`<div style="font-size:14px;margin-top:4px">• ${esc(h)}</div>`).join('')}</div>`:''}
    ${S.risers.length?`<div><span class="lbl">On the rise in ${DIVS[B().div].name}</span>${S.risers.map(r=>`<div style="font-size:14px;margin-top:3px">${esc(r.name)} <span class="dim">#${r.rank}</span> <span class="good num">+${r.gain} pts</span></div>`).join('')}</div>`:''}
    ${full?`<div><span class="lbl">Pound for pound</span>${S.p4p.map((p,i)=>`<div style="font-size:14px;margin-top:3px" class="${p.id==='P'?'goldt':''}">${i+1}. ${esc(p.name)} <span class="dim">${DIVS[p.div].short}</span> ${mv(p.mv)}</div>`).join('')}</div>`:''}
    <div style="font-size:14px"><span class="lbl">${esc(S.host)} on you</span><div style="margin-top:3px;font-style:italic">${esc(showTake(S))}</div></div>
    ${full?'':'<button class="btn sm" data-act="showseen" style="align-self:flex-start">Watch the full show</button>'}</div>`}
