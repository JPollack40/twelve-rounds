/* Bot players for headless fights. Each returns a function(fight) called 60x per simulated second.
   Reaction times are in simulated seconds after the opponent's tell starts, plus touch latency. */
const BOTS={
  // reacts like a decent human on a phone: ~230ms perception + ~60ms touch, with jitter, 82% correct read
  human(rng,o={}){
    const base=o.react??.34,jit=o.jitter??.09,acc=o.accuracy??.68;let reacted=null,rt=0;
    return F=>{const op=F.o,p=F.p;
      if(op.state==='wind'&&op.pu&&reacted!==op.pu){if(!rt)rt=Math.max(.12,base+(rng.next()-.5)*2*jit);
        if(op.t>=rt){reacted=op.pu;rt=0;const kind=PUNCH[op.pu.type].kind,side=F.screenSide(op,op.pu.type);
          let d;if(rng.next()<acc){d=kind==='upper'?(side==='L'?'slipR':'slipL'):kind==='hook'?(rng.next()<.5?'duck':(side==='L'?'slipR':'slipL')):(rng.next()<.5?'duck':'slipL')}
          else d=['slipL','slipR','duck','block'][Math.floor(rng.next()*4)];
          F.input(d,true);if(d==='block')setTimeout(()=>F.input('block',false),0)}
        return}
      if(op.state!=='wind')reacted=null;
      if((p.counterWin>0||op.state==='rec'||op.state==='stagger')&&rng.next()<(o.exploit??.3)){F.held.body=false;F.input(['cross','hook','jab','upper'][Math.floor(rng.next()*4)],true);return}
      if(op.state==='idle'&&rng.next()<.07){F.held.body=(op.guard==='high'||op.guard==='peek')&&rng.next()<.6;F.input(['jab','jab','cross','hook'][Math.floor(rng.next()*4)],true);F.held.body=false}
      if(p.meter>=100&&rng.next()<.04)F.input('sp0',true);
      if(p.sta<25&&p.clinchCD<=0&&rng.next()<.1)F.input('clinch',true);
    };
  },
  masher(rng){return F=>{F.input(['jab','cross','hook','upper'][Math.floor(rng.next()*4)],true);if(rng.next()<.15)F.input(['slipL','slipR','duck'][Math.floor(rng.next()*3)],true)}},
  turtle(rng){let blocking=false;return F=>{const op=F.o;if(op.state==='wind'||op.state==='act'){if(!blocking){blocking=true;F.input('block',true)}}else{if(blocking){blocking=false;F.input('block',false)}if(rng.next()<.25)F.input('jab',true)}}},
  novice(rng){return BOTS.human(rng,{react:.42,jitter:.12,accuracy:.6})},
  expert(rng){return BOTS.human(rng,{react:.2,jitter:.04,accuracy:.93})},
};
