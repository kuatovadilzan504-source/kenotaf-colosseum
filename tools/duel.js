/* Дуэль с «идеальным вводом»: бот срывает каждый горячий замах импульсом, бьёт механизм вплотную
   и тратит перегрев на разрыв. Меряет, сколько циклов атак (замахов) механизм успевает начать до
   поломки и за сколько секунд. Сравнивает мини-босса с обычной элитой того же вида и той же зоны.
     node tools/duel.js            — все пять арен
   Мини-босс — сложнее элиты, но не босс: при идеальном вводе (срыв в каждое окно, разрыв на перегреве) он держится
   дольше элиты и не меньше 5 с, но и не больше 3.5 циклов атак. После того как бой показался тяжёлым (2026-10-05),
   «2–3 захода у идеального игрока» ослаблено: точная игра может кончить его за один-два захода. */
'use strict';
const lab=require('./lab');
const MINI={z1_foundry:'БРИГАДИР ЛИТЕЙКИ',z2_chapel:'СТАРШИЙ ЦЕНЗОР',z3_herbarium:'СТАРШИЙ САДОВНИК',z4_counter:'МАСТЕР ХОДА',z5_council:'СТРАЖ СОВЕТА'};
const PAGE=(arg)=>{const [room,mini,dbg]=arg;const g=game;window.__dbg=dbg;
  LAB.setup(room,4,4,['pulse','dash','hook','claws','filter','magnet','breaker','vjump']);const W=g.world;
  const d0=ROOMDEFS[room](g.gs);const R0=new Room(ROOMDEFS[room],g.gs);
  const def=R0.enemies.find(e=>e.elite);if(!def)return {err:'нет элиты'};
  W.enemies.length=0;W.miniBoss=null;W.arenaLock=false;
  const d=Object.assign({},def);if(!mini)delete d.mini;
  const C=ENEMY_TYPES[d.type],e=new C(W,d,d.x,d.y);W.empower(e,d);W.enemies.push(e);
  if(mini&&d.mini){applyVariantDef(e,{name:d.eliteName,tint:null,addons:d.mini.addons,prop:d.mini.prop},'mini');e.mini=d.mini;W.miniBoss=e;miniToughen(e,d.mini);}
  let why='';{const od=e.die.bind(e);e.die=h=>{why=(h&&h.kind||'?')+' · '+e.nodes.filter(n=>n.broken).map(n=>n.id).join('+');od(h);};
    const ob=e.breakNode.bind(e);e.breakNode=(n,h,gu)=>{why+=' ['+n.id+(h&&h.rupture?' R':'')+(gu?' G':'')+' mark'+(n.markT>0?1:0)+']';return ob(n,h,gu);};
    const oh=e.hitNode.bind(e);e.hitNode=(n,h,b)=>{const h0=n.hp;const r=oh(n,h,b);if(window.__dbg)why+=' '+n.id+':'+h0.toFixed(0)+'→'+n.hp.toFixed(0)+(h.heavy?'H':'')+(h.rupture?'R':'')+'/'+r;return r;};}
  W.entryT=9;W.playerActed=true;const p=W.player;p.x=e.cx+2.2;p.y=e.bottom-p.h;p.vx=0;
  let t=0,cycles=0,wasTele=false,ints=0,rup=0;const DT=1/120;
  for(let f=0;f<120*120&&!e.dead;f++){t+=DT;p.invuln=1e9;g.gs.hp=9;p.energy=p.maxEnergy();
    const tele=e.nodes.some(n=>n.tele>0&&!n.broken)||!!e._ast;if(tele&&!wasTele)cycles++;wasTele=tele;
    const hot=e.nodes.find(n=>n.teleHot&&!n.broken&&!n.red);const press=[];const keys=[];
    const side=p.cx>=e.cx?1:-1;const want=e.cx+side*(e.w/2+0.9);
    if(Math.abs(p.cx-want)>0.4)keys.push(p.cx<want?'KeyD':'KeyA');
    p.face=e.cx>p.cx?1:-1;
    if(hot&&p.pulseCd<=0){press.push('pulse');ints++;}
    else if(!p.atkPhase&&p.atkCd<=0&&Math.abs(p.cx-want)<1.2){
      if((g.gs.heat||0)>=1){p.startSwing('side',true);p.atkRupture=true;rup++;}else press.push('attack');}
    LAB.step(1,keys,press.length?{0:press}:null);
    if(e.flying&&e.cy<p.cy-3){/* летающему — подпрыгнуть */}
  }
  return {dead:e.dead,t:+t.toFixed(1),cycles,ints,rup,why};};
(async()=>{const L=await lab.open();let bad=0;const only=process.argv.slice(2);
  try{for(const room of Object.keys(MINI)){if(only.length&&only.indexOf(room)<0)continue;
    const el=await L.ev(PAGE,[room,false]),mi=await L.ev(PAGE,[room,true,process.argv.includes('--why')]);
    const ok=mi.dead&&mi.cycles<=3.5&&mi.t>=5&&(mi.t>el.t);if(!ok)bad++;
    console.log((ok?'ok   ':'FAIL ')+room.padEnd(13)+' элита: '+el.t+' с, циклов '+el.cycles+'   мини-босс: '+mi.t+' с, циклов '+mi.cycles+' (срывов '+mi.ints+', разрывов '+mi.rup+')'+(mi.dead?'':' НЕ РАЗОБРАН')+(process.argv.includes('--why')?'  ← '+mi.why:''));}
  }finally{await L.close();}
  console.log(bad?'DUEL: '+bad+' FAIL':'DUEL: ALL OK');process.exit(bad?1:0);})();
