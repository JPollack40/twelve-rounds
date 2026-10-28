/* ================= story chapters (homages to boxing history) ================= */
function champsIn(d){return BODIES.map(x=>G.world.champs[d][x.k]).filter(id=>id&&id!=='P').map(id=>G.world.f[id]).filter(Boolean)}
const CHAPTERS=[
  {id:'century',title:'The Fight of the Century',homage:'Ali vs. Frazier I, Madison Square Garden, 1971',
    intro:'Two unbeaten fighters. One ring. Celebrities at ringside, and the whole country is picking a side.',
    offer(){const b=B();if(G.phase!=='pro'||b.record.l>0||b.record.w<10||(playerRank()||99)>6)return null;
      const c=divFighters(b.div).filter(f=>f.l<=1&&f.pts>=b.pts-100&&!f.rival).sort((a,c)=>c.pts-a.pts)[0];if(!c)return null;
      const bl=beltsOf(c.id,b.div);const o=mkOffer(c,'chapter','The Fight of the Century',`Undefeated vs. undefeated at the Garden. ${bl.length?'For the '+bl.join(' & ')+' title. ':''}Double purse.`,bl.length?{title:{belts:bl}}:{});o.purse*=1.6;o.venue='Madison Square Garden';o.mods={crowd:1.3};return o},
    done(win){if(win){G.chapters.push('century');B().hype=clamp(B().hype+25,0,100);return 'Chapter complete: The Fight of the Century'}}},
  {id:'jungle',title:'Rumble in the Jungle',homage:'Ali vs. Foreman, Kinshasa, 1974',
    intro:'A 4 a.m. fight in brutal heat, half a world from home. The champion is younger, bigger, and has flattened everyone. Nobody gives you a chance. Maybe you should let him punch himself out.',
    offer(){const b=B();if(G.phase!=='pro'||(playerRank()||99)>10||ageOf(b.born)<25||beltsOf('P',b.div).length)return null;
      const c=champsIn(b.div).filter(f=>f.rating>=playerOvr()+5)[0];if(!c)return null;
      const bl=beltsOf(c.id,b.div);const o=mkOffer(c,'chapter','Rumble in the Jungle',`For the ${bl.join(' & ')} title, in sweltering heat abroad. Stamina recovers 25% slower for both of you. Lean on the ropes and let them punch themselves out.`,{title:{belts:bl}});o.venue='Stade du 20 Mai, Kinsala';o.mods={heat:.75,odds:'4-1 underdog'};return o},
    done(win){if(win){G.chapters.push('jungle');unlockAbility('ropeadope','Rumble in the Jungle');return 'Chapter complete: Rope-a-Dope unlocked'}}},
  {id:'buster',title:'42-to-1',homage:'Buster Douglas vs. Mike Tyson, Tokyo, 1990',
    intro:'The bookmakers in Las Vegas won\'t even take bets. The champion is undefeated and terrifying. You were supposed to be a tune-up. Your corner says: survive the early storm, then jab.',
    offer(){const b=B();const r=playerRank()||99;if(G.phase!=='pro'||r<6||r>16||beltsOf('P',b.div).length)return null;
      const c=champsIn(b.div).filter(f=>f.rating>=playerOvr()+9)[0];if(!c)return null;
      const bl=beltsOf(c.id,b.div);const o=mkOffer(c,'chapter','42-to-1',`The champion wants an easy defense. You're the 42-1 underdog for the ${bl.join(' & ')} title.`,{title:{belts:bl}});o.venue='Tokyo Dome';o.mods={odds:'42-1 underdog'};return o},
    done(win){if(win){G.chapters.push('buster');B().hype=clamp(B().hype+35,0,100);return 'Chapter complete: the biggest upset in boxing history'}}},
  {id:'thrilla',title:'The Thrilla',homage:'Ali vs. Frazier III, Manila, 1975',
    intro:'Your third fight with your rival. The heat is unbearable and neither of you will ever be the same after tonight. Someone will have to quit.',
    offer(){const rv=rivalF(),b=B();if(!rv||!rv.active||rv.div!==b.div||G.rival.met<2||G.week-G.rival.lastMet<20)return null;
      const bl=beltsOf(rv.id,b.div).concat(beltsOf('P',b.div));
      const o=mkOffer(rv,'chapter','The Thrilla',`The rubber match with ${shortName(rv)}. Brutal heat: stamina recovers 25% slower and everything hurts more.${bl.length?' Belts on the line.':''}`,bl.length?{title:{belts:bl,defense:beltsOf('P',b.div).length>0}}:{});o.venue='Araneta Coliseum, Manila';o.mods={heat:.75,dmg:1.1};return o},
    done(win){if(win){G.chapters.push('thrilla');gainStat('sta',3);gainStat('chin',3);return 'Chapter complete: +3 Stamina, +3 Chin'}}},
  {id:'phantom',title:'The Phantom Punch',homage:'Ali vs. Liston II, Lewiston, Maine, 1965',
    intro:'The rematch with the champion you dethroned. A small-town hockey rink. They swear they\'ll be ready this time. If you end it in the first round, nobody will even see the punch.',
    offer(){const b=B();const id=G.flags.tookFrom;if(!id||!beltsOf('P',b.div).length||G.week-(G.flags.tookWeek||0)<18)return null;const f=G.world.f[id];if(!f||!f.active||f.div!==b.div)return null;
      const bl=beltsOf('P',b.div);const o=mkOffer(f,'chapter','The Phantom Punch',`Rematch with the former champion. End it in round 1 to learn the Phantom Punch.`,{title:{belts:bl,defense:true}});o.venue='Central Maine Youth Center';o.mods={};return o},
    done(win,res){if(win){G.chapters.push('phantom');if(res.round===1&&['KO','TKO'].includes(res.method)){unlockAbility('phantom','The Phantom Punch');return 'Chapter complete: Phantom Punch unlocked'}return 'Chapter complete (no first-round finish, so no Phantom Punch)'}}},
  {id:'nomas',title:'No Más',homage:'Durán vs. Leonard II, New Orleans, 1980',
    intro:'They beat you last time by out-toughing you. This time, don\'t brawl. Box, showboat, make them miss and look foolish. Frustrate them enough and they might just quit.',
    offer(){const b=B();if(G.phase!=='pro')return null;const h=[...G.history].reverse().find(h=>h.pro&&h.res==='L'&&!h.rematched&&G.world.f[h.oppId]?.active&&G.world.f[h.oppId].div===b.div);
      if(!h||b.streak<2)return null;const f=G.world.f[h.oppId];
      const o=mkOffer(f,'chapter','No Más',`Revenge against ${shortName(f)}. Out-land them by 40% after round 4 and they may quit on the stool.`,{rematchOf:h.id});o.venue='Louisiana Superdome';o.mods={nomas:1};return o},
    done(win,res){if(win){G.chapters.push('nomas');unlockAbility('bolo','No Más');return res.method==='RTD'?'They quit! "No más." Bolo Punch unlocked':'Chapter complete: Bolo Punch unlocked'}}},
  {id:'comeback',title:'Big George Comes Back',homage:'George Foreman regains the heavyweight title at 45, 1994',
    intro:'They laughed when you kept fighting past your prime. Now you\'ve fought your way back to a title shot. One punch can still turn back the clock.',
    offer(){const b=B();if(G.phase!=='pro'||ageOf(b.born)<35||!b.formerChamp||beltsOf('P',b.div).length||(playerRank()||99)>15)return null;
      const c=champsIn(b.div)[0];if(!c)return null;const bl=beltsOf(c.id,b.div);
      const o=mkOffer(c,'chapter','Big George Comes Back',`At ${ageOf(b.born)}, a shot at the ${bl.join(' & ')} title. Wearing your old trunks.`,{title:{belts:bl}});o.mods={};return o},
    done(win){if(win){G.chapters.push('comeback');B().hype=clamp(B().hype+30,0,100);return 'Chapter complete: the oldest champion'}}},
  // women's circuit chapters
  {id:'undercard',circ:'w',title:'The Undercard',homage:'Christy Martin vs. Deirdre Gogarty, Las Vegas, 1996',
    intro:'You\'re on the undercard of a heavyweight title fight, in front of a pay-per-view audience that has never watched a women\'s fight. Nobody expects much. Give them six rounds they will never forget.',
    offer(){const b=B();const r=playerRank()||99;if(G.phase!=='pro'||b.record.w<4||b.record.w>16||r<6)return null;
      const c=divFighters(b.div).filter(f=>!f.rival&&!beltsOf(f.id,b.div).length&&Math.abs(f.rating-playerOvr())<=7).sort((a,c)=>c.pts-a.pts)[0];if(!c)return null;
      const o=mkOffer(c,'chapter','The Undercard',`Six rounds on a heavyweight pay-per-view card. Win it and the whole country is talking about you. One and a half times the purse.`,{rounds:6});o.purse=Math.round(o.purse*1.5);o.venue='MGM Grand Garden Arena';o.mods={};return o},
    done(win){if(win){G.chapters.push('undercard');B().hype=clamp(B().hype+20,0,100);return 'Chapter complete: the fight that made the magazine cover'}}},
  {id:'garden',circ:'w',title:'Headliners',homage:'Katie Taylor vs. Amanda Serrano, Madison Square Garden, 2022',
    intro:'For the first time, two women headline Madison Square Garden. Sold out, the best two fighters in the world, and every belt that matters. Whatever happens tonight, it is history.',
    offer(){const b=B();if(G.phase!=='pro'||(playerRank()||99)>3)return null;
      const c=divFighters(b.div).filter(f=>!f.rival&&f.rating>=playerOvr()-2).sort((a,c)=>c.pts-a.pts)[0];if(!c)return null;
      const bl=beltsOf(c.id,b.div).concat(beltsOf('P',b.div));
      const o=mkOffer(c,'chapter','Headliners',`Main event at the Garden against ${shortName(c)}.${bl.length?' '+bl.join(' & ')+' on the line.':''} Double purse.`,bl.length?{title:{belts:bl,defense:beltsOf('P',b.div).length>0}}:{});o.purse*=2;o.venue='Madison Square Garden';o.mods={};return o},
    done(win){if(win){G.chapters.push('garden');B().hype=clamp(B().hype+30,0,100);return 'Chapter complete: Headliners at the Garden'}B().hype=clamp(B().hype+8,0,100)}},
];
const CHAPTER_INFO=[
  ...CHAPTERS.map(c=>({id:c.id,title:c.title,homage:c.homage,circ:c.circ})),
  {id:'longcount',title:'The Long Count',homage:'Dempsey vs. Tunney II, Chicago, 1927'},
  {id:'hurricane',title:'The Hurricane',homage:'Rubin "Hurricane" Carter'},
  {id:'exile',title:'The Exile',homage:'Muhammad Ali\'s stand, 1967–70'},
  {id:'fortynine',title:'49-0',homage:'Rocky Marciano retires unbeaten, 1956'},
];

/* ================= life events ================= */
function recordQuickLoss(label){
  const b=B(),f=pickOpp(b.pts,new Set(),b.div);if(!f)return;
  b.record.l++;f.w++;b.form.push('L');b.streak=Math.min(-1,b.streak-1);b.pts=Math.max(0,b.pts-30);
  G.history.push({id:'h'+uid(),w:G.week,oppId:f.id,opp:fullName(f),oppRec:recStr(f),oppRating:f.rating,res:'L',method:'SD',round:10,time:'3:00',title:'',type:'dive',label,purse:0,pro:true,div:b.div});
}
function sponsorOffer(){const b=B();return SPONSORS.filter(S=>b.hype>=S.hype&&(!S.title||b.titleWins)&&!(G.flags.spDropped||[]).includes(S.id)).sort((a,b)=>b.cut-a.cut)[0]||null}
const EVENTS=[
  {id:'sponsor',w:3,cond:()=>G.phase==='pro'&&!!sponsorOffer()&&(!G.sponsor||(SPONSORS.find(x=>x.id===G.sponsor.id)||{cut:0}).cut<sponsorOffer().cut)&&G.week-(G.flags.spAsk||-99)>=16,title:'A Sponsor Calls',prep:()=>{const S=sponsorOffer();if(!S)return false;G.flags.spAsk=G.week;G.flags.spOffer=S.id;return true},
    text:()=>{const S=SPONSORS.find(x=>x.id===G.flags.spOffer)||sponsorOffer();if(!S)return 'A sponsor calls, then thinks better of it.';return `${S.name} wants you. ${S.desc} They pay ${Math.round(S.cut*100)}% of every purse (at least ${money(S.min)}) for ${S.fights} fights, half after a loss, and their name goes on your waistband.${G.sponsor?' Signing ends your current deal.':''}`},
    choices:[{t:'Sign the deal',fx:()=>{const S=SPONSORS.find(x=>x.id===G.flags.spOffer)||sponsorOffer();if(!S)return 'The deal fell through.';G.sponsor={id:S.id,left:S.fights,losses:0};return `You signed with ${S.name}.`}},{t:'Not interested',fx:()=>'You keep your trunks clean.'}]},
  {id:'sponsor',w:3,cond:()=>G.phase==='pro'&&B().hype>=15,title:'Sponsorship Offer',
    text:()=>`An energy drink company wants your face on their cans. ${money(3000+B().hype*400)} up front, plus appearances.`,
    choices:[{t:'Sign it',fx:()=>{const m=3000+B().hype*400;B().money+=m;G.flags.campPenalty=1;return `+${money(m)}. The appearances will cost you a week of your next camp.`}},{t:'Stay focused',fx:()=>'You pass. Pops nods approvingly.'}]},
  {id:'badpress',w:3,cond:()=>G.phase==='pro',title:'Viral Trash Talk',
    text:()=>'A clip of you calling the whole division "cowards" has gone viral. The commissioner is not amused.',
    choices:[{t:'Apologize',fx:()=>{B().hype=Math.max(0,B().hype-2);return 'The story fades quickly. Hype -2.'}},{t:'Double down',fx:()=>{B().hype=Math.min(100,B().hype+8);if(chance(.3)){B().money-=5000;return 'Hype +8, but the commission fines you $5,000.'}return 'Hype +8. Tickets for your next fight are selling fast.'}}]},
  {id:'raise',w:2,cond:()=>G.trainer!=='pops'&&G.phase==='pro',title:'Your Trainer Wants a Raise',
    text:()=>`${TRAINERS[G.trainer].name} says other fighters are offering more. They want a ${money(Math.max(5000,B().money*.08))} bonus to stay.`,
    choices:[{t:'Pay it',fx:()=>{const m=Math.max(5000,B().money*.08);B().money-=m;return `Paid ${money(m)}. The team stays together.`}},{t:'Refuse',fx:()=>{if(chance(.5)){const n=TRAINERS[G.trainer].name;G.trainer='pops';return `${n} walks out. Pops Delgado steps back in.`}return 'They grumble but stay.'}}]},
  {id:'shortnotice',w:3,cond:()=>G.phase==='pro'&&!G.next&&B().record.w>=3&&!B().injuries.length,title:'Short-Notice Call',
    text:()=>{const f=G.flags._snOpp&&G.world.f[G.flags._snOpp];return `${f?fullName(f):'A ranked fighter'}'s opponent pulled out with an injury. Promoters want you in two weeks. Big purse, no real camp.`},
    prep:()=>{const f=pickOpp(B().pts+200,new Set([G.rival?.id]),B().div);G.flags._snOpp=f?.id;return !!f},
    choices:[{t:'Take the fight',fx:()=>{const f=G.world.f[G.flags._snOpp];const o=mkOffer(f,'stepup','Short-Notice Step-In','Two weeks to prepare. Win and you leap the rankings.',{weeks:2});o.purse=Math.round(o.purse*1.5);acceptOffer(o);return 'Signed. Two weeks of camp. Make them count.'}},{t:'Pass',fx:()=>'You stick to your plan.'}]},
  {id:'peds',w:2,cond:()=>G.next&&!G.next.offer.amateur&&!G.next.offer.chapter&&G.next.weeksLeft>2,title:'Opponent Fails Drug Test',
    text:()=>`${shortName(G.world.f[G.next.offer.oppId])} tested positive for a banned substance. The fight is off.`,
    choices:[{t:'Take a replacement',fx:()=>{const o=G.next.offer;const f=pickOpp(B().pts-40,new Set([o.oppId]),B().div);if(!f)return 'No replacement found.';o.oppId=f.id;o.purse=Math.round(o.purse*.75);G.world.f[o.oppId].pts=G.world.f[o.oppId].pts;return `New opponent: ${fullName(f)}. Purse cut to ${money(o.purse)}.`}},{t:'Cancel and collect',fx:()=>{const m=Math.round(G.next.offer.purse*.35);B().money+=m;G.next=null;return `You collect a ${money(m)} cancellation fee.`}}]},
  {id:'family',w:2,cond:()=>!!G.next&&G.next.weeksLeft>2,title:'Family Emergency',
    text:()=>'Your mother is in the hospital back home. Camp is in full swing.',
    choices:[{t:'Go home',fx:()=>{G.next.weeksLeft=Math.max(1,G.next.weeksLeft-1);advanceWeeks(1);B().money-=1500;return 'You lose a week of camp, but she\'s okay. You come back with a clear head.'}},{t:'Stay in camp',fx:()=>{G.next.fatigue+=20;return 'You stay, but your mind is elsewhere. Fatigue +20.'}}]},
  {id:'dive',w:2,cond:()=>G.promoter&&PROMOTERS[G.promoter.id].shady>.3&&G.phase==='pro'&&!beltsOf('P',B().div).length&&!G.flags.dive,title:'An Offer You Can\'t Refuse',
    text:()=>`${PROMOTERS[G.promoter.id].name} leans in close: "There's ${money(40000+B().pts*120)} in it if you lose a close one next month. Nobody gets hurt. Think about your future."`,
    choices:[{t:'Take the dive',fx:()=>{const m=40000+B().pts*120;B().money+=m;G.flags.dive=1;recordQuickLoss('The Dive');B().hype=Math.max(0,B().hype-15);return `You lose a split decision you were winning. +${money(m)}. You can't look at yourself in the mirror. Hype -15.`}},
      {t:'"I\'m not a bum"',fx:()=>{G.flags.dive=-1;const P=PROMOTERS[G.promoter.id];G.promoter=null;B().hype+=5;return `You walk out. ${P.co} tears up your contract. You're a free agent, and you can look people in the eye.`}}]},
  {id:'fees',w:2,cond:()=>G.promoter&&PROMOTERS[G.promoter.id].shady>0&&B().money>20000,title:'Hidden Fees',
    text:()=>`Your accountant finds ${money(B().money*.1)} in "promotional expenses" deducted from your purses.`,
    choices:[{t:'Lawyer up ($4,000)',fx:()=>{B().money-=4000;if(chance(.6)){const m=B().money*.1;B().money+=m;const P=PROMOTERS[G.promoter.id];G.promoter=null;return `You win. +${money(m)} returned and you're released from ${P.co}.`}return 'The contract was airtight. You lose the case.'}},{t:'Let it go',fx:()=>{B().money*=.9;return 'You eat the loss.'}}]},
  {id:'taxes',w:2,cond:()=>B().money>200000,title:'The Taxman',
    text:()=>`The IRS says you owe ${money(B().money*.25)} in back taxes. The same thing broke Joe Louis.`,
    choices:[{t:'Pay now',fx:()=>{B().money*=.75;return 'Paid in full. Painful, but done.'}},{t:'Fight it in court',fx:()=>{B().money-=20000;if(chance(.5))return 'You win in court. Only legal fees lost.';B().money*=.65;return 'You lose, with penalties. Ouch.'}}]},
  {id:'crash',w:1,cond:()=>G.phase==='pro',title:'Car Accident',
    text:()=>'Someone runs a red light and T-bones your car. You walk away, but you\'re hurt.',
    choices:[{t:'Rest up',fx:()=>{addInjury(pick(['knee','ribs','shoulder']),true);return 'You\'ll need time to heal.'}}]},
  {id:'callout',w:4,cond:()=>rivalF()?.active&&G.phase==='pro',title:'Rival Callout',
    text:()=>`${fullName(rivalF())} (${recStr(rivalF())}) grabs a microphone at a press conference: "${pick(['Everybody knows I\'m the real one from our city.','I beat you in the gym when we were kids and I\'ll do it again.','You\'re a paper champion waiting to be torn.','Stop ducking me.'])}"`,
    choices:[{t:'Fire back',fx:()=>{B().hype=Math.min(100,B().hype+6);rivalF().edge+=1;addHeat(rivalF().id,8);G.rival.lastMet-=10;return 'The crowd eats it up. Hype +6. The rivalry heats up.'}},{t:'Stay quiet',fx:()=>{gainStat('iq',1);return 'You let your fists talk. +1 Ring IQ.'}}]},
  {id:'parade',w:2,cond:()=>G.phase==='pro'&&B().streak>=3,title:'Hometown Hero',
    text:()=>`${B().home} throws you a parade. Kids are shadowboxing on every corner.`,
    choices:[{t:'Soak it in',fx:()=>{B().hype=Math.min(100,B().hype+8);return 'Hype +8.'}}]},
  {id:'mentor',w:2,cond:()=>G.phase==='pro'&&Object.values(G.world.f).some(f=>f.legend&&!f.active),title:'A Legend Drops By',
    text:()=>{const f=Object.values(G.world.f).find(f=>f.legend&&!f.active);return `${fullName(f)}, long retired, stops by the gym and watches you spar. "Let me show you something, kid."`},
    choices:[{t:'Listen',fx:()=>{gainStat('iq',2);gainStat('def',1);return '+2 Ring IQ, +1 Defense.'}}]},
  {id:'deerlake',w:1,cond:()=>G.phase==='pro'&&G.gym!=='mountain'&&B().pts>350,title:'Invitation to the Mountain',
    text:()=>'The owner of the Deer Lake Mountain Camp offers you a free camp in the log cabins.',
    choices:[{t:'Accept',fx:()=>{G.flags.freeMountain=1;return 'Your next camp is at Deer Lake, free.'}},{t:'Decline',fx:()=>'You stay home.'}]},
  {id:'persona',w:2,cond:()=>G.phase==='pro'&&!G.flags.persona&&B().record.w>=5,title:'Media Day',
    text:()=>'A TV network wants to build a storyline around you. Who do you want to be?',
    choices:[{t:'The villain',fx:()=>{G.flags.persona='villain';B().hype=Math.min(100,B().hype+12);return 'Everybody pays to see you lose. Hype +12.'}},{t:'The humble pro',fx:()=>{G.flags.persona='humble';gainStat('iq',2);return 'Respect from the purists. +2 Ring IQ.'}}]},
  {id:'hurricane',w:1.2,cond:()=>G.phase==='pro'&&B().record.w>=12&&!G.chapters.includes('hurricane')&&!G.flags.hurricane&&!beltsOf('P',B().div).length,title:'Chapter: The Hurricane',
    text:()=>'Police knock on your door at dawn. You\'re charged with a crime you didn\'t commit. Witnesses were coached and the evidence is thin. Your career is on hold.',
    choices:[{t:'Hire the best lawyer',fx:()=>{const m=Math.max(25000,Math.min(200000,B().money*.4));B().money-=m;G.flags.hurricane=1;advanceWeeks(10);G.chapters.push('hurricane');unlockAbility('hurricane','The Hurricane');B().hype=Math.min(100,B().hype+10);return `${money(m)} and ten weeks later, the charges are dropped. You come back angry. Hurricane Hooks unlocked.`}},
      {t:'Fight it with a public defender',fx:()=>{G.flags.hurricane=1;advanceWeeks(36);gainStat('pow',4);gainStat('chin',3);G.chapters.push('hurricane');unlockAbility('hurricane','The Hurricane');B().hype=Math.min(100,B().hype+20);B().pts=Math.round(B().pts*.8);return 'Nine months of hell before you\'re exonerated. You trained in your cell every day. +4 Power, +3 Chin. Hurricane Hooks unlocked. The public is behind you.'}}]},
  {id:'exile',w:1.5,cond:()=>beltsOf('P',B().div).length>0&&ageOf(B().born)>=24&&!G.flags.exile&&!G.chapters.includes('exile'),title:'Chapter: The Exile',
    text:()=>'You\'re ordered to headline an event that goes against everything you believe in. Refuse and the commissions will strip your belts and suspend your license. Your conscience says no.',
    choices:[{t:'Take a stand',fx:()=>{const d=B().div,bl=beltsOf('P',d);bl.forEach(k=>G.world.champs[d][k]=null);assignChamps(d,false);G.flags.exile=1;G.chapters.push('exile');advanceWeeks(70);B().hype=Math.min(100,B().hype+25);B().pts=Math.round(B().pts*.85);return 'Stripped and suspended. Seventeen months pass. When you return, you\'re older, but bigger than the sport. Legacy +40.'}},
      {t:'Comply',fx:()=>{G.flags.exile=-1;B().hype=Math.max(0,B().hype-8);return 'You fight the card. The belts stay. Something in you doesn\'t.'}}]},
  {id:'ownGym',w:1,cond:()=>B().money>400000&&ageOf(B().born)>=29&&!G.flags.ownGym,title:'Open Your Own Gym',
    text:()=>'A building near where you grew up is for sale. You could open a gym for neighborhood kids.',
    choices:[{t:'Buy it ($120K)',fx:()=>{B().money-=120000;G.flags.ownGym=1;B().hype=Math.min(100,B().hype+10);return 'Kids line up around the block. Hype +10.'}},{t:'Not yet',fx:()=>'Maybe someday.'}]},
  {id:'retireTalk',w:5,cond:()=>B().damage>=65&&!G.flags.retireTalk,title:'A Hard Conversation',
    text:()=>`Your doctor shows you the scans. "You've taken a lot of punishment. Long-term damage ${Math.round(B().damage)}/100. At 100, the commission won't license you."`,
    choices:[{t:'Keep fighting',fx:()=>{G.flags.retireTalk=1;return 'You\'re not done yet.'}},{t:'Think about retiring',fx:()=>{G.flags.retireTalk=1;return 'Retirement is always available from the Legacy screen.'}}]},
];
function maybeEvent(force,id){
  if(id){const e=EVENTS.find(x=>x.id===id);if(!e)return null;if(e.prep&&!e.prep())return null;return e}
  if(G.phase!=='pro')return null;
  if(!force&&(G.week-(G.flags.lastEvent||-99)<5||!chance(.5)))return null;
  const pool=EVENTS.filter(e=>{try{return e.cond()}catch(x){return false}});
  if(!pool.length)return null;
  const w={};pool.forEach(e=>w[e.id]=e.w);
  const pickId=wpick(w);const e=EVENTS.find(x=>x.id===pickId);
  if(e.prep&&!e.prep())return null;
  G.flags.lastEvent=G.week;
  return e;
}
