/* ================= Rivalries screen: bad blood with every fighter, the head-to-head, and past rivals ================= */
function heatLabel(h){return h>=RIVAL_MIN?['Boiling','#ff5a4e']:h>=18?['Heated','#ff9a3c']:h>=10?['Simmering','#f0be48']:h>=1?['Cooling','#8fa3c7']:['Cold','#5d6785']}
function h2h(id){const H=G.history.filter(h=>h.pro&&h.oppId===id);return {w:H.filter(h=>h.res==='W').length,l:H.filter(h=>h.res==='L').length,d:H.filter(h=>h.res==='D').length,n:H.length,last:H[H.length-1]||null}}
SCR.rivalries=()=>{
  const b=B(),d=b.div,rv=rivalF(),H=G.heat||{},P=G.heatPrev||{};
  // everyone with heat, plus anyone you have fought who is still active
  const ids=new Set(Object.keys(H));G.history.filter(h=>h.pro).forEach(h=>{const f=G.world.f[h.oppId];if(f&&f.active)ids.add(h.oppId)});if(rv)ids.add(rv.id);
  const rows=[...ids].map(id=>({id,f:G.world.f[id],h:H[id]||0})).filter(r=>r.f&&r.f.active).sort((a,c)=>(c.f.rival?1:0)-(a.f.rival?1:0)||c.h-a.h);
  const curH=rv?heatOf(rv.id):0,settled=rv&&rv.div===d&&curH>=10&&G.week-(G.rival.since||0)<78;
  const row=r=>{const f=r.f,[lab,col]=heatLabel(r.h),x=h2h(f.id),tr=Math.round(r.h-(P[f.id]||0)),bl=beltsOf(f.id,f.div),rk=f.div===d&&G.phase==='pro'?rankOf(f.id,d):0;
    const next=!f.rival&&f.div===d&&r.h>=RIVAL_MIN&&r.h>=curH+18;
    return `<div class="card col" style="gap:6px;${f.rival?'border-color:#ff5a4e':''}"><div class="row sp" style="gap:8px;align-items:flex-start"><div class="grow">
      <b class="ui" style="font-size:16px;text-transform:uppercase;letter-spacing:.03em">${esc(shortName(f))}</b>${f.rival?' <span class="pill red">Rival</span>':''}${next?` <span class="pill gold">${settled?'Next in line':'Taking over'}</span>`:''}${f.legend?' <span class="pill gold">Legend</span>':''}
      <div class="muted" style="font-size:12.5px">${recStr(f)} · ${DIVS[f.div].short}${bl.length?' · '+bl.join(' & ')+' champion':rk?' · #'+rk:''}${f.div!==d?' · other division':''}</div></div>
      <div style="text-align:right"><b style="color:${col};font-size:14px">${lab}</b>${tr?`<div class="num" style="font-size:12px;color:${tr>0?'#ff9a3c':'#8fa3c7'}">${tr>0?'▲':'▼'}${Math.abs(tr)}</div>`:''}</div></div>
      <div class="bar" title="Bad blood ${Math.round(r.h)}"><i style="width:${Math.min(100,r.h/60*100)}%;background:${col}"></i></div>
      <div class="muted" style="font-size:12.5px">${x.n?`Head to head ${x.w}-${x.l}${x.d?'-'+x.d:''} · last met ${dateStr(x.last.w)} (${x.last.res} by ${x.last.method}${x.last.robbery?', robbery':''})`:'Never fought'}</div></div>`};
  const past=(G.rivalHist||[]).slice().reverse();
  const body=`${isWide()?'<h2 class="sec">Rivalries</h2>':''}<p class="muted" style="font-size:13.5px;margin-top:0">Bad blood builds when you fight someone (most after losses, close or stolen decisions and title fights), call them out, demand rematches, or sit next to them in the rankings. It cools after every fight, faster when they fall behind you or leave your division. Whoever burns hottest in your division becomes your rival${rv?`; a rivalry lasts at least 18 months unless it goes cold`:''}.</p>
    <div class="row" style="gap:10px;flex-wrap:wrap;font-size:12.5px">${[['Boiling',RIVAL_MIN],['Heated',18],['Simmering',10],['Cooling',1]].map(([l,v])=>{const c=heatLabel(v)[1];return `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:4px"></span>${l}</span>`}).join('')}</div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));margin-top:10px">${rows.length?rows.map(row).join(''):'<div class="card muted">No bad blood yet. Fight, call people out, and it will come.</div>'}</div>
    ${past.length?`<h2 class="sec" style="margin-top:16px">Past rivals</h2><div class="card"><div class="tblw"><table class="t"><tr><th>Rival</th><th class="r">Head to head</th><th class="r">Years</th></tr>${past.map(p=>`<tr><td>${esc(p.name)}</td><td class="r num">${p.w}-${p.l}</td><td class="r">${dateStr(p.from).slice(-4)}–${dateStr(p.to).slice(-4)}</td></tr>`).join('')}</table></div></div>`:''}`;
  return shell('rivalries','Rivalries',body);
};
