/* ================= career timeline and the comeback ================= */
/* milestones from the fight history and career state, oldest first */
function careerMilestones(){
  const b=B(),out=[],add=(w,icon,t,tone)=>out.push({w,icon,t,tone});
  add(0,'🥊',`Walks into ${GYMS[G.gym]?.name||"Delgado's Basement Gym"} and starts boxing.`);
  const H=G.history.filter(h=>h.pro);
  if(H[0])add(H[0].w,'🔔',`Pro debut: ${H[0].res==='W'?'beats':H[0].res==='L'?'loses to':'draws with'} ${H[0].opp} (${H[0].method}).`);
  const k=H.find(h=>h.res==='W'&&['KO','TKO','RTD'].includes(h.method));if(k)add(k.w,'💥',`First knockout: ${k.opp} in round ${k.round}.`);
  const l=H.find(h=>h.res==='L');if(l)add(l.w,'🩹',`First pro loss, to ${l.opp} (${l.method}).`);
  let titles=0;const seenL=new Set();
  for(const h of H){const f=G.world.f[h.oppId];
    if(h.title&&h.title!=='Continental'&&h.res==='W'){titles++;add(h.w,'🏆',`${h.type==='unify'?'Unifies':titles===1?'Wins':'Wins'} the ${h.title} title against ${h.opp}${titles===1?': world champion for the first time':''}.`,'gold')}
    else if(h.title&&h.title!=='Continental'&&h.res==='L')add(h.w,'⬇',`Loses a ${h.title} title fight to ${h.opp}.`,'red');
    else if(h.title==='Continental'&&h.res==='W')add(h.w,'🎖',`Wins the Continental title against ${h.opp}.`);
    if(f&&f.legend&&h.res==='W'){const again=seenL.has(f.id);seenL.add(f.id);add(h.w,'⭐',`Beats the legend ${h.opp}${again?' again':''}.`,'gold')}
    if(h.chapter&&h.res==='W'){const c=CHAPTER_INFO.find(x=>x.id===h.chapter);if(c)add(h.w,'📖',`Story chapter: ${c.title}.`,'gold')}
    if(h.robbery)add(h.w,'⚖',`Robbed on the cards against ${h.opp}.`,'red')}
  for(const r of G.rivalHist||[])add(r.from,'🔥',`Rivalry begins with ${r.name} (ended ${r.w}-${r.l}).`,'red');
  if(G.rival){const rv=rivalF();if(rv)add(G.rival.since||0,'🔥',`Rivalry begins with ${fullName(rv)}.`,'red')}
  if(G.tour&&G.tour.done)add(G.tour.week+20,G.tour.winner==='P'?'🏆':'🎟',G.tour.winner==='P'?`Wins the ${tourName()}.`:`Plays the ${tourName()}; won by ${G.world.f[G.tour.winner]?shortName(G.world.f[G.tour.winner]):'another fighter'}.`,G.tour.winner==='P'?'gold':'');
  for(const e of G.flags.storyLog||[])add(e.w,e.icon,e.t,e.tone);
  return out.sort((a,c)=>a.w-c.w)}
SCR.timeline=()=>{const M=careerMilestones();
  return shell('record','Career timeline',`${isWide()?'<h2 class="sec">Career timeline</h2>':''}<div class="card col" style="gap:0">${M.map((m,i)=>`<div class="row" style="gap:12px;align-items:flex-start;padding:8px 0;${i?'border-top:1px solid #262c4a':''}">
    <div style="font-size:20px;width:26px;text-align:center">${m.icon}</div><div class="grow"><div class="dim num" style="font-size:12px">${dateStr(m.w)} · age ${Math.floor((m.w-B().born)/52)}</div><div style="font-size:14.5px" class="${m.tone==='gold'?'goldt':m.tone==='red'?'':''}">${esc(m.t)}</div></div></div>`).join('')}</div>`)};
function storyLog(icon,t,tone){(G.flags.storyLog=G.flags.storyLog||[]).push({w:G.week,icon,t,tone})}
/* ---------- the comeback: one return from retirement, a year older and rusty ---------- */
function comebackOK(){const b=B();return G.phase==='retired'&&!G.flags.forcedOut&&b.damage<85&&ageOf(b.born)<=42&&(G.comebacks||0)<1}
function comeback(){const b=B();if(!comebackOK())return;
  G.comebacks=(G.comebacks||0)+1;advanceWeeks(52);
  for(const k of ['spd','foot','sta'])b.stats[k]=Math.max(20,b.stats[k]-3);
  b.pts=Math.round(b.pts*.35);b.hype=Math.min(100,b.hype+15);b.retired=false;G.phase='pro';G.offers=[];G.next=null;
  G.hof=(G.hof||[]).filter(x=>!x.player);
  storyLog('↩','Comes out of retirement after a year away.','gold');
  news(`${fullName(b)} is coming out of retirement at ${ageOf(b.born)}. "I've got unfinished business."`,'gold');
  Save.write();UI.go('home')}
Object.assign(ACT,{comeback(){confirmBox('Come out of retirement?',`A year passes. You come back rusty (Speed, Footwork and Stamina -3) with ranking points cut to 35%, but the comeback story brings +15 hype. You only get one comeback.`,'Lace them up',()=>comeback())}});
