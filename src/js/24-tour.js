/* ================= World Super Series: an eight-fighter knockout tournament in your division =================
   Invites top-8 contenders (every two years at most). Seeds 1v8, 4v5, 2v7, 3v6 by ranking. Your three fights are booked offers;
   the rest of the bracket is simulated as you go. Only the final can take an opponent's belts; your own belts are on the line in every round. */
const TOUR_ROUNDS=['Quarter-final','Semi-final','Final'];
function tourName(){return isW()?"Women's World Super Series":'World Super Series'}
function tourEligible(){const b=B();if(G.phase!=='pro'||G.tour?.alive||b.record.w<8)return false;
  return (playerRank()||99)<=8&&G.week-(G.flags.tourWeek??-999)>=104&&G.week-(G.flags.tourInv??-999)>=26}
function tourBoutOffer(oppId,round,extra={}){
  const f=G.world.f[oppId],d=B().div,mine=beltsOf('P',d),cb=beltsOf(oppId,d);
  // only the final can take an opponent's belts; earlier rounds put your own belts on the line, as a mandatory defense would
  const fin=round===2,title=fin&&cb.length&&mine.length?{belts:[...mine,...cb],unify:true}:fin&&cb.length?{belts:cb}:mine.length?{belts:mine,defense:true}:null;
  const rounds=round===2?(isW()?10:12):(isW()?8:10);
  const o=mkOffer(f,'tour',`${tourName()} ${TOUR_ROUNDS[round]}`,round===2?`The final. Win and you lift the ${tourName()} trophy.`:`Win and you advance to the ${TOUR_ROUNDS[round+1].toLowerCase()}.`,Object.assign({rounds,weeks:round?7:8},title?{title}:{},extra));
  o.purse=Math.round(purseFor(f,'world',rounds)*[.7,.9,1.3][round]);o.tour=round;o.venue=['Riyadh Season Arena','Manchester Arena','Madison Square Garden'][round];return o}
/* an invitation shows up among your offers; accepting it books your quarter-final */
function tourInvite(){
  if(!tourEligible()||!chance(.35))return null;G.flags.tourInv=G.week;
  const d=B().div,field=ranking(d).slice(0,8).map(e=>e.id);if(field.length<8||!field.includes('P'))return null;
  const seeds=field;const pairs=[[0,7],[3,4],[1,6],[2,5]].map(([a,b])=>[seeds[a],seeds[b]]);const mine=pairs.find(p=>p.includes('P'));const opp=mine[0]==='P'?mine[1]:mine[0];
  const o=tourBoutOffer(opp,0,{tourField:pairs});o.label=`${tourName()} invitation`;o.desc=`Eight of the best in the division, three rounds of knockout. Your quarter-final opponent is ${shortName(G.world.f[opp])}. Win it all for the trophy, a big bonus and a place in history.`;
  return o}
function tourStart(o){G.tour={div:B().div,week:G.week,round:0,alive:true,done:false,winner:null,rounds:[o.tourField.map(p=>({a:p[0],b:p[1],w:null}))]};G.flags.tourWeek=G.week;
  news(`You accept a place in the ${tourName()}. Eight fighters, one trophy.`,'gold')}
function tourBout(a,c){ // simulated bracket bout: no draws
  const d=G.tour.div,fa=G.world.f[a],fc=G.world.f[c];if(!fa||!fa.active)return c;if(!fc||!fc.active)return a;
  const pa=1/(1+Math.pow(10,(fc.rating-fa.rating)/12));const w=chance(pa)?fa:fc,l=w===fa?fc:fa;w.w++;l.l++;const ko=chance(w.arch==='slugger'?.55:.35);if(ko)w.ko++;
  w.pts=Math.min(1000,w.pts+30);l.pts=Math.max(0,l.pts-20);recYear(w,l,ko,false);
  const lb=beltsOf(l.id,d);if(lb.length&&G.tour.round===2){lb.forEach(k=>G.world.champs[d][k]=w.id);w.titles=(w.titles||0)+1}
  return w.id}
function tourResolveRound(T){const R=T.rounds[T.round];for(const m of R)if(!m.w)m.w=tourBout(m.a,m.b);
  if(T.round<2){const W=R.map(m=>m.w),next=[];for(let i=0;i<W.length;i+=2)next.push({a:W[i],b:W[i+1],w:null});T.rounds.push(next);T.round++}
  else{T.done=true;T.winner=R[0].w;T.alive=false}}
/* after your tournament fight: record it, simulate the rest of the round, and advance or finish */
function tourAfter(o,win,out){
  const T=G.tour;if(!T||o.tour==null)return;const R=T.rounds[T.round];const m=R.find(x=>x.a==='P'||x.b==='P');if(!m)return;
  m.w=win?'P':(m.a==='P'?m.b:m.a);
  if(!win){T.alive=false;out.lines.push(`Eliminated from the ${tourName()} in the ${TOUR_ROUNDS[T.round].toLowerCase()}.`);
    while(!T.done)tourResolveRound(T);const cw=G.world.f[T.winner];if(cw)news(`${shortName(cw)} wins the ${tourName()}.`,'gold');return}
  if(T.round===2){T.done=true;T.alive=false;T.winner='P';const b=B();b.tourWins=(b.tourWins||0)+1;const bonus=Math.round(o.purse*.8);b.money+=bonus;b.hype=Math.min(100,b.hype+20);
    out.lines.push(`${tourName()} champion! Trophy, a ${money(bonus)} bonus and +20 hype.`);news(`You win the ${tourName()}. The trophy is yours.`,'gold');return}
  tourResolveRound(T);const nm=T.rounds[T.round].find(x=>x.a==='P'||x.b==='P');const next=nm.a==='P'?nm.b:nm.a,nf=G.world.f[next];
  out.lines.push(`Through to the ${TOUR_ROUNDS[T.round].toLowerCase()} of the ${tourName()}.${nf?` Next: ${shortName(nf)}.`:''}`)}
function tourNextOffer(){const T=G.tour;if(!T||!T.alive||T.div!==B().div)return null;const m=T.rounds[T.round]?.find(x=>(x.a==='P'||x.b==='P')&&!x.w);if(!m)return null;
  // an opponent who retired or vanished gives you a walkover
  const opp=m.a==='P'?m.b:m.a;if(!G.world.f[opp]?.active){m.w='P';if(T.round===2){T.done=true;T.alive=false;T.winner='P';B().tourWins=(B().tourWins||0)+1;news(`Your opponent withdrew. You win the ${tourName()} by walkover.`,'gold');return null}tourResolveRound(T);return tourNextOffer()}return tourBoutOffer(opp,T.round)}
function tourHTML(){const T=G.tour;if(!T||(!T.alive&&G.week-T.week>60))return '';
  const nm=id=>id==='P'?'<b class="goldt">You</b>':esc(G.world.f[id]?shortName(G.world.f[id]):'—');
  const col=(R,i)=>`<div class="col" style="gap:6px;flex:1;min-width:0"><span class="lbl">${TOUR_ROUNDS[i]}</span>${R.map(m=>`<div class="card flat" style="padding:6px 8px;font-size:12.5px;line-height:1.35">${[m.a,m.b].map(id=>`<div style="${m.w&&m.w!==id?'opacity:.45;text-decoration:line-through':''}">${nm(id)}</div>`).join('')}</div>`).join('')}</div>`;
  return `<div class="card col"><div class="row sp"><h3>${tourName()}</h3><span class="pill ${T.winner==='P'?'gold':T.alive?'blue':''}">${T.winner==='P'?'Champion':T.alive?TOUR_ROUNDS[T.round]:T.done?'Finished':'Eliminated'}</span></div>
    <div class="row" style="gap:8px;align-items:flex-start">${T.rounds.map(col).join('')}</div>${T.done&&T.winner!=='P'?`<p class="muted" style="font-size:13px;margin:0">Won by ${nm(T.winner)}.</p>`:''}</div>`}
