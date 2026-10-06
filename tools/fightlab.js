/* Бой глазами трёх игроков: сколько длится схватка с механизмом и сколько ударов курьер пропускает.
     долбёжник — встаёт вплотную и жмёт удар без остановки;
     новичок   — так же, но отходит, когда механизм начал замах (реакция 0.25 с), и бьёт, когда он открыт;
     мастер    — срывает замах импульсом в окно, от красного уходит рывком, бьёт в открытое.
   Хороший бой: долбёжник пропускает удары и возится дольше новичка; мастер быстрее всех и почти не ранен.
     node tools/fightlab.js [тип ...] [--mini]   (по умолчанию — основные наземные механизмы) */
'use strict';
const lab=require('./lab');
const TYPES=['repairer','wrench','aristocrat','censor','gardener','clockmaker','mailbot','riveter','duelist','stamper','sprayer','pendulum','keeper'];
const PAGE=([type,bot,mini])=>{const g=game;
  LAB.setup('z2_market',8,10,['pulse','dash','hook','claws','filter','magnet','breaker','vjump']);const W=g.world;
  W.enemies.length=0;W.miniBoss=null;W.arenaLock=false;
  let e;
  if(mini){const R0=new Room(ROOMDEFS[mini],g.gs),def=R0.enemies.find(q=>q.mini);const C=ENEMY_TYPES[def.type];
    e=new C(W,Object.assign({},def,{patrol:[24,40]}),30,15);W.empower(e,def);W.enemies.push(e);
    applyVariantDef(e,{name:def.eliteName,tint:null,addons:def.mini.addons,prop:def.mini.prop},'mini');e.mini=def.mini;W.miniBoss=e;miniToughen(e,def.mini);}
  else{const i=LAB.spawn(type,30,15,{patrol:[26,34],face:-1});e=W.enemies[i];}
  const p=W.player;p.x=24;p.y=12;
  /* опустить обоих на пол */
  for(let i=0;i<60;i++){p.invuln=9;LAB.step(1);}
  W.entryT=9;W.playerActed=true;p.invuln=0;e.alert=6;e.investigate={x:p.cx,y:p.cy,t:4};
  let hurt=0;const od=g.combat.damagePlayer.bind(g.combat);g.combat.damagePlayer=(d,x)=>{const r=od(d,x);if(r)hurt++;return r;};
  let t=0,windAt=-1,ints=0,glance=0;const DT=1/120;
  const oh=e.hitNode?e.hitNode.bind(e):null;
  for(let f=0;f<120*60&&!e.dead;f++){t+=DT;g.gs.hp=9;p.energy=Math.max(p.energy,0);
    const tele=e.nodes.some(n=>n.tele>0&&!n.broken)||!!e._ast||e.state==='strike'||e.ripT>0;
    if(tele&&windAt<0)windAt=t;if(!tele)windAt=-1;
    const red=e.nodes.some(n=>n.red&&n.tele>0)||e.ripT>0;
    const open=e.openT>0||e.stunT>0||e.pinT>0||e.nodes.some(n=>n.exT>0&&!n.broken);
    const hot=e.nodes.find(n=>n.teleHot&&!n.broken&&!n.red);
    const side=p.cx>=e.cx?1:-1,adj=e.cx+side*(e.w/2+0.8),far=e.cx+side*(e.w/2+3.6);
    let want=adj;const press=[];const keys=[];
    if(bot==='novice'&&tele&&t-windAt>0.25&&!open)want=far;
    if(bot==='skilled'){if(red)want=far;else if(tele&&!hot&&!open)want=e.cx+side*(e.w/2+1.4);}
    if(Math.abs(p.cx-want)>0.35)keys.push(p.cx<want?'KeyD':'KeyA');
    p.face=e.cx>p.cx?1:-1;
    const near=Math.abs(p.cx-adj)<1.0;
    if(bot==='skilled'&&hot&&p.pulseCd<=0&&p.energy>=CFG.player.pulseCost){press.push('pulse');ints++;}
    else if(near&&!p.atkPhase&&p.atkCd<=0){
      if(bot==='masher')press.push('attack');
      else if(bot==='novice'&&(!tele||open))press.push('attack');
      else if(bot==='skilled'&&(open||!tele)){if((g.gs.heat||0)>=1){p.startSwing('side',true);p.atkRupture=true;}else press.push('attack');}}
    LAB.step(1,keys,press.length?{0:press}:null);
  }
  return {dead:e.dead,t:+t.toFixed(1),hurt,ints};};
(async()=>{const L=await lab.open();const a=process.argv.slice(2),mini=a.includes('--mini');
  const list=mini?['z1_foundry','z2_chapel','z3_herbarium','z4_counter','z5_council']:(a.filter(x=>!x.startsWith('--')).length?a.filter(x=>!x.startsWith('--')):TYPES);
  console.log('тип'.padEnd(14)+'долбёжник'.padEnd(18)+'новичок'.padEnd(18)+'мастер');
  try{for(const ty of list){const row=[];
    for(const bot of ['masher','novice','skilled']){const r=await L.ev(PAGE,[mini?null:ty,bot,mini?ty:null]);
      row.push(((r.dead?r.t+' с':'>60 с')+' / '+r.hurt+' уд.').padEnd(18));}
    console.log(ty.padEnd(14)+row.join(''));}
  }finally{await L.close();}})();
