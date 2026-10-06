"use strict";
/* ============================== CINEMATIC ============================== */
/* Сцена идёт в реальном времени. Строка печатается (у говорящего — его голосом, js/ui/voice.js)
   и держится, пока её можно спокойно прочитать: время — по длине. E / ПРОБЕЛ / ЛКМ:
   недопечатанную — допечатать, допечатанную — дальше. */
class Cinematic{
  constructor(game){this.game=game;this.active=false;this.def=null;this.li=-1;this.lt=0;this.age=0;this.phase='';}
  lineDur(s){return readTime(s)+s.length/TYPE_CPS;}
  play(def){
    const g=this.game;
    this.active=true;this.def=def;this.li=-1;this.phase='lines';
    g.timeScale=0.35;g.camera.focus={x:def.x,y:def.y-0.9};g.camera.tzoom=1.45;
    document.getElementById('bars').classList.add('on');
    document.getElementById('caption').classList.add('skip');
    g.input.enabled=false;g.input.clearAll();
    this.next();
  }
  next(){
    const g=this.game,d=this.def,lines=d.lines||[];
    this.li++;this.age=0;
    if(this.li<lines.length){
      /* строка — текст или {t, sp}: у строки может быть свой говорящий (курьер ставит иглу — дальше говорит пластинка) */
      const L=lines[this.li],tx=typeof L==='string'?L:L.t,sp=typeof L==='string'?d.speaker:(L.sp||d.speaker);
      g.hud.caption(tx,d.title||'',sp);this.lt=this.lineDur(tx);return;}
    this.phase='out';this.lt=0.8;
    g.hud.caption('','');document.getElementById('caption').classList.remove('skip');
    if(d.abilities){for(const a of d.abilities)g.abilities.grant(a);
      g.particles.burst(d.x,d.y-0.8,44,{kind:'spark',col:'#ffe6a3',spd:9,life:1.1,size:0.07,add:true,g:12});
      g.particles.spawn({kind:'ring',x:d.x,y:d.y-0.8,ringR:5,life:0.8,size:0.1,col:'#ffcf7a',add:true,a:0.9});
      g.hud.showAbilityCard(d.abilities[0],d.card);}
    if(d.ability){
      g.abilities.grant(d.ability);
      g.camera.addShake(0.6);
      g.particles.burst(d.x,d.y-0.8,44,{kind:'spark',col:'#ffe6a3',spd:9,life:1.1,size:0.07,add:true,g:12});
      g.particles.spawn({kind:'ring',x:d.x,y:d.y-0.8,ringR:5,life:0.8,size:0.1,col:'#ffcf7a',add:true,a:0.9});
      g.hud.showAbilityCard(d.ability);
    }
    const ups=(d.upgrades||[]).concat(d.upgrade?[d.upgrade]:[]);
    for(const u of ups)grantUpgrade(g,u);
    if(ups.length)g.hud.showUpgradeCard(ups.length>1?{name:ups.map(u=>(UPGRADES[u]||{name:u}).name).join(' + '),
      desc:ups.map(u=>(UPGRADES[u]||{desc:''}).desc).join(' ')}:Object.assign({kicker:MODULE_IDS.indexOf(ups[0])>=0?'МОДУЛЬ РАНЦА':''},UPGRADES[ups[0]]));
    const wasOn=!!g.gs.flags.post_on;
    for(const f of (d.setFlags||[]))g.gs.flag(f);
    /* сеть ожила — карточка объясняет, что теперь умеют станции */
    if(!wasOn&&g.gs.flags.post_on){g.audio.elevator();g.camera.addShake(0.5);
      g.hud.showAbilityCard('post',{kicker:'СЕТЬ ОЖИЛА',name:'ПНЕВМОПОЧТА',keys:[['E']],
        desc:'СТАНЦИЯ ЕСТЬ В ХАБЕ КАЖДОЙ ЗОНЫ. ОТСЮДА — ПЕРЕЕЗД, ЦИЛИНДРЫ ПОЧТМЕЙСТЕРУ И ЕЁ ПИСЬМА.'});}
  }
  end(){
    const g=this.game,wasActive=this.active;
    this.active=false;g.timeScale=1;g.camera.focus=null;g.camera.tzoom=1;
    document.getElementById('bars').classList.remove('on');
    document.getElementById('caption').classList.remove('skip');
    g.input.enabled=true;g.input.clearAll();
    return wasActive;
  }
  abort(){if(this.active){this.end();this.game.hud.caption('','');}}
  update(dt){
    if(!this.active)return;
    this.lt-=dt;this.age+=dt;
    const skip=this.game.input.skip&&this.age>0.3&&this.phase==='lines';
    if(skip&&this.game.hud.captionTyping()){const L=this.def.lines[this.li],tx=typeof L==='string'?L:L.t;this.game.hud.captionFinish();this.age=0.05;this.lt=Math.max(this.lt-tx.length/TYPE_CPS,2.4);return;}
    if(this.lt<=0||skip){
      if(this.phase==='lines')this.next();
      else if(this.end())this.game.world.reload();
    }
  }
}
