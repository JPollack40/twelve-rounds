/* Regression suite: bot win-rate bands and Monte Carlo careers.
   node tests/suite.js [--strict] [--fights N] [--careers N] [--quick]
   Writes tests/last-report.md and tests/last-report.json. Exit 1 on band failure only with --strict. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);const flag=k=>args.includes(k);const num=(k,d)=>{const i=args.indexOf(k);return i>=0?+args[i+1]:d};
const STRICT=flag('--strict'),QUICK=flag('--quick'),NOCAREERS=flag('--no-careers'),NOFIGHTS=flag('--no-fights');
const NF=num('--fights',QUICK?2:5),NC=num('--careers',QUICK?60:500);
const ROOT=path.resolve(__dirname,'..');
const MATCHUPS=[
  {id:'human_eq_champ',bot:'human',arch:'boxerpuncher',rating:55,diff:'champion',band:[.3,.9],why:'an equal opponent on Champion should be competitive (calibrate with real play)'},
  {id:'human_eq_legend',bot:'human',arch:'swarmer',rating:55,diff:'legend',band:[.1,.7],why:'Legend difficulty should bite'},
  {id:'human_eq_contender',bot:'human',arch:'slugger',rating:55,diff:'contender',band:[.7,1],why:'Contender is the learning setting'},
  {id:'human_plus15',bot:'human',arch:'counter',rating:70,diff:'champion',band:[.1,.65],why:'a +15 rated opponent should be a real underdog fight'},
  {id:'novice_eq_contender',bot:'novice',arch:'boxerpuncher',rating:55,diff:'contender',band:[.5,1],why:'a slow reader should still win on Contender'},
  {id:'expert_plus20',bot:'expert',arch:'slugger',rating:75,diff:'champion',band:[.1,.9],why:'skill should beat ratings'},
  {id:'masher_eq',bot:'masher',arch:'boxerpuncher',rating:55,diff:'champion',band:[0,.4],why:'button mashing must not work'},
  {id:'turtle_eq',bot:'turtle',arch:'boxerpuncher',rating:55,diff:'champion',band:[0,.75],why:'frame-perfect blocking should not dominate (and never KO)'},
  {id:'human_legend_tyrell',bot:'human',legend:'tyrell',pstat:85,diff:'champion',band:[.05,.6],why:'legends are the hardest fights, even for an 85-rated player'},
  {id:'human_legend_hollis',bot:'human',legend:'hollis',pstat:85,diff:'champion',band:[.3,1],why:'legends are the hardest fights, even for an 85-rated player'},
];
(async()=>{
 const b=await chromium.launch();const p=await b.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file://'+ROOT+'/Twelve-Rounds-offline.html');await p.waitForTimeout(300);
 await p.addScriptTag({path:__dirname+'/bots.js'});
 await p.evaluate(()=>{Settings.sound=false;Settings.slowmo=false;Settings.hitstop=false});
 const t0=Date.now();const out={when:new Date().toISOString(),fights:[],careers:null,errors:errs};
 for(const M of NOFIGHTS?[]:MATCHUPS){
   const r=await p.evaluate(([M,NF])=>{
     const look={skin:2,hair:'short',hc:0,beard:'none',trunks:'#d8392f',trim:'#f4efe3',gloves:'#d8392f'};
     const res=[];
     for(let i=0;i<NF;i++){
       const seed=1000+i*7919;const rng=new Rng(seed^0x55);
       const me={name:'Bot',first:'Bot',last:'Bot',stats:Object.fromEntries(STAT_KEYS.map(k=>[k,M.pstat||55])),look,stance:'orthodox',reach:71,abilities:['onetwo'],mods:{}};
       let opp;
       if(M.legend){G=G||{week:0,world:{f:{},divs:[[],[],[],[],[],[],[],[]],champs:[]},flags:{}};const f=RNG.with(new Rng(seed),()=>legendFighter(LEGEND_BY[M.legend]));opp=oppCombat(f);if(G.world&&!G.boxer)G=null}
       else opp={name:'Opp',first:'O',last:'Opp',stats:RNG.with(new Rng(seed),()=>statsFromRating(M.rating,M.arch)),look:RNG.with(new Rng(seed),()=>randomLook()),stance:'orthodox',reach:71,ai:deep(ARCH[M.arch].ai),abilities:M.rating>=80?[ARCH[M.arch].ability]:[]};
       const F=new Fight({p:me,o:opp,rounds:6,roundLen:45,diff:M.diff,corner:2,seed,headless:true,practice:true,onEnd(){}});
       const r=F.headless(BOTS[M.bot](rng));
       res.push({w:r.winner,m:r.method,rd:r.round,pl:r.stats.p.landed,pt:r.stats.p.thrown,ol:r.stats.o.landed,ot:r.stats.o.thrown,kdF:r.kdFor,kdA:r.kdAgainst,perf:r.stats.p.perfect,steps:r.steps});
     }
     return res;},[M,NF]);
   const wins=r.filter(x=>x.w==='p').length/r.length,kos=r.filter(x=>x.w==='p'&&['KO','TKO','RTD'].includes(x.m)).length,koed=r.filter(x=>x.w==='o'&&['KO','TKO','RTD'].includes(x.m)).length;
   const ok=wins>=M.band[0]&&wins<=M.band[1];
   out.fights.push({id:M.id,why:M.why,band:M.band,winRate:wins,n:r.length,kos,koed,ok,avgLanded:+(r.reduce((s,x)=>s+x.pl,0)/r.length).toFixed(1),avgAcc:+(r.reduce((s,x)=>s+(x.pt?x.pl/x.pt:0),0)/r.length).toFixed(2),avgOppAcc:+(r.reduce((s,x)=>s+(x.ot?x.ol/x.ot:0),0)/r.length).toFixed(2),results:r.map(x=>x.w+':'+x.m+'R'+x.rd).join(' ')});
   process.stdout.write(`${ok?'ok  ':'FAIL'} ${M.id.padEnd(22)} win ${(wins*100).toFixed(0).padStart(3)}% band ${M.band.map(x=>x*100).join('-')}  KO for/against ${kos}/${koed}\n`);
 }
 // careers
 let C=[];
 for(let batch=0;batch<NC&&!NOCAREERS;batch+=25){C=C.concat(await p.evaluate(([b0,NC])=>{
   const rows=[];UI.silent=true;
   for(let i=b0;i<Math.min(NC,b0+25);i++){
     const seed=50000+i;
     sandboxCareer(seed,{arch:['outboxer','slugger','swarmer','counter','boxerpuncher'][i%5]});
     let years=0;while(G.phase!=='retired'&&years<22){simYears(1);years++;if(ageOf(B().born)>=36&&legacy().score>0&&Math.random()<.35){retireNow('sim');break}}
     const b=B(),L=legacy();
     rows.push({age:ageOf(b.born),w:b.record.w,l:b.record.l,titles:b.titleWins,def:b.defenses,undisp:b.undisputed,divs:b.titleDivs.length,legends:b.legendsBeaten.length,chapters:G.chapters.length,money:Math.round(b.money),hof:L.score,tier:L.tier,dmg:Math.round(b.damage),forced:b.damage>=100,events:G.newsList.length});
   }
   UI.silent=false;return rows;},[batch,NC]));process.stdout.write('.')}
 process.stdout.write('\n');
 if(!C.length){console.log('careers skipped');await b.close();process.exit(0)}
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
 const tiers={};C.forEach(r=>tiers[r.tier]=(tiers[r.tier]||0)+1);
 out.careers={n:C.length,retireAgeMed:med(C.map(r=>r.age)),winsMed:med(C.map(r=>r.w)),lossesMed:med(C.map(r=>r.l)),titlesMed:med(C.map(r=>r.titles)),titlesAvg:+avg(C.map(r=>r.titles)).toFixed(2),champShare:+(C.filter(r=>r.titles>0).length/C.length).toFixed(2),
   undisputedShare:+(C.filter(r=>r.undisp>0).length/C.length).toFixed(2),multiDivShare:+(C.filter(r=>r.divs>1).length/C.length).toFixed(2),legendsAvg:+avg(C.map(r=>r.legends)).toFixed(2),chaptersAvg:+avg(C.map(r=>r.chapters)).toFixed(2),
   moneyMed:med(C.map(r=>r.money)),hofMed:med(C.map(r=>r.hof)),tiers,forcedRetireShare:+(C.filter(r=>r.forced).length/C.length).toFixed(2),dmgMed:med(C.map(r=>r.dmg))};
 const cb=[['retireAgeMed',[31,40]],['champShare',[.4,1]],['forcedRetireShare',[0,.4]],['chaptersAvg',[.3,5]],['legendsAvg',[.2,6]]];
 out.careerChecks=cb.map(([k,band])=>({k,v:out.careers[k],band,ok:out.careers[k]>=band[0]&&out.careers[k]<=band[1]}));
 out.seconds=Math.round((Date.now()-t0)/1000);
 fs.writeFileSync(__dirname+'/last-report.json',JSON.stringify(out,null,1));
 const md=[`# Regression report ${out.when}`,``,`${NF} fights per matchup, ${NC} simulated careers, ${out.seconds}s.`,``,`## Fight bands`,`| matchup | win rate | band | KO for/against | acc you/them | ok |`,`|---|---|---|---|---|---|`,
   ...out.fights.map(f=>`| ${f.id} | ${(f.winRate*100).toFixed(0)}% | ${f.band.map(x=>x*100).join('–')} | ${f.kos}/${f.koed} | ${f.avgAcc}/${f.avgOppAcc} | ${f.ok?'✅':'❌'} |`),``,`## Careers`,'```',JSON.stringify(out.careers,null,1),'```',``,`| check | value | band | ok |`,`|---|---|---|---|`,...out.careerChecks.map(c=>`| ${c.k} | ${c.v} | ${c.band.join('–')} | ${c.ok?'✅':'❌'} |`),``,errs.length?`## Page errors\n${errs.join('\n')}`:'No page errors.'].join('\n');
 fs.writeFileSync(__dirname+'/last-report.md',md);
 console.log('\nCareers:',JSON.stringify(out.careers));
 console.log(out.careerChecks.map(c=>`${c.ok?'ok  ':'FAIL'} ${c.k} ${c.v} band ${c.band.join('-')}`).join('\n'));
 if(errs.length)console.log('PAGE ERRORS',errs.slice(0,5));
 await b.close();
 const fails=out.fights.filter(f=>!f.ok).length+out.careerChecks.filter(c=>!c.ok).length;
 console.log(`\n${fails} band failure(s) · report: tests/last-report.md`);
 if(STRICT&&(fails||errs.length))process.exit(1);
})();
