"use strict";
/* ============================== INTERACTABLE / PUSHABLE ============================== */
/* мягкое пятно света под находкой: читается в обоих рендерах (glowAdd виден только в WebGL) */
/* пузырь речи: латунная рамка, хвостик к голове, три точки «печатают» по очереди */
function drawTalkCue(c,x,y,t){const R=game.renderer;(R.talkCues||(R.talkCues=[])).push({x,y,t});}
function drawTalkCueNow(c,x,y,t){const hy=y+Math.sin(t*2)*0.05,p=0.5+0.5*Math.sin(t*3);
  c.fillStyle='rgba(12,10,8,.82)';rr(c,x-0.44,hy-0.22,0.88,0.44,0.17);c.fill();
  c.beginPath();c.moveTo(x-0.1,hy+0.2);c.lineTo(x+0.02,hy+0.38);c.lineTo(x+0.12,hy+0.2);c.closePath();c.fill();
  c.strokeStyle=rgba('#e8c96a',0.65+0.3*p);c.lineWidth=0.04;rr(c,x-0.44,hy-0.22,0.88,0.44,0.17);c.stroke();
  for(let i=0;i<3;i++){c.fillStyle=rgba('#ffe6a3',0.45+0.55*Math.max(0,Math.sin(t*4-i*0.8)));c.beginPath();c.arc(x-0.2+i*0.2,hy,0.055,0,TAU);c.fill();}
  game.renderer.glowAdd(x,hy,0.8,'#e8c96a',0.25+0.1*p);}
function softHalo(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(0.45,rgba(col,a*0.45));g.addColorStop(1,rgba(col,0));
  c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
class Interactable{
  constructor(def,world){this.def=def;this.x=def.x;this.y=def.y;this.w=def.w||1.6;this.h=def.h||1.8;this.world=world;}
  rect(){return {x:this.x-this.w/2,y:this.y-this.h,w:this.w,h:this.h};}
  canUse(gs){const d=this.def;
    if(d.kind==='salvage'||d.kind==='lever'||d.kind==='valve'||d.kind==='gauge'||d.kind==='wheel'||d.kind==='mapplate')return !gs.flags[d.flag];
    if(d.kind==='lore')return !gs.loreIds[d.loreId];
    if(d.kind==='stash')return !gs.flags['stash_'+d.id];
    if(d.kind==='c38')return !!gs.flags.archivist_dead&&!gs.flags.c38_met;   /* лежит в зале с самого начала; слушать — после боя */
    if(d.kind==='phono')return !gs.flags['ph_'+d.key];
    if(d.kind==='station'||d.kind==='postmaster'||d.kind==='trialbell'||d.kind==='hubtalk')return true;
    if(d.kind==='trialpost')return !this.world.game.trials.run;
    if(d.kind==='broadcast')return !gs.flags.broadcast_done;
    if(d.kind==='talk'){if(gs.flags[d.flag]&&!d.again)return false;return d.ready?d.ready(this.world):true;}
    if(d.kind==='salvageBlocked'){
      if(gs.flags[d.flag])return false;
      const pb=this.world.pushables.find(p=>p.id===d.need);
      return !pb||pb.pushed;}
    return true;}
  /* есть ли у собеседника новое: пузырь над головой виден только тогда */
  /* строки хаба собираются из обхода всех залов зоны — дорого; рисунку хватает проверки раз в секунду */
  hasNews(gs){const now=this.world.time;if(this._newsAt!==undefined&&now-this._newsAt<1&&now>=this._newsAt)return this._news;this._newsAt=now;return this._news=this.newsNow(gs);}
  newsNow(gs){const d=this.def;
    if(d.kind==='talk')return this.canUse(gs)&&!gs.flags[d.flag];
    if(d.kind==='hubtalk'){const L=HubNPC.lines(this.world.game,d.who).join('|');return gs.flags['heard_'+d.who]!==hashStr(L);}
    if(d.kind==='postmaster'){const sc=postmasterScene(gs);return !gs.flags.pm_met||(gs.lore||0)>(gs.flags.lore_given||0)||sc.upgrades.length>0;}
    return false;}
  prompt(){const d=this.def;
    if(d.kind==='salvage'||d.kind==='salvageBlocked')return 'ВЗЯТЬ';
    if(d.kind==='lore')return 'ПРОСЛУШАТЬ';
    if(d.kind==='stash')return 'ОБЫСКАТЬ';
    if(d.kind==='c38')return 'ПРОСЛУШАТЬ';
    if(d.kind==='talk')return 'ГОВОРИТЬ';
    if(d.kind==='wheel')return 'ВРАЩАТЬ КОЛЕСО';
    if(d.kind==='mapplate')return 'СВЕРИТЬ ПЛАНШЕТ';
    /* что ждёт в люке, видно по капсуле в окне приёмника — подсказка только называет действие */
    if(d.kind==='station')return this.world.game.gs.flags['st_'+d.station]?'ПОЧТА':'ОТКРЫТЬ ЛЮК';
    if(d.kind==='postmaster')return 'ГОВОРИТЬ';
    if(d.kind==='trialpost')return 'СТАРТ';
    if(d.kind==='phono')return 'ПРОСЛУШАТЬ';
    if(d.kind==='hubtalk')return 'ГОВОРИТЬ';
    if(d.kind==='trialbell')return 'РЕКОРД';
    if(d.kind==='broadcast')return 'ВЕЩАТЬ';
    return d.label||'ОСМОТРЕТЬ';}
  use(game){
    const gs=game.gs,d=this.def,w=this.world;
    if(!this.canUse(gs))return;
    if(d.kind==='lever'||d.kind==='valve'){
      gs.flag(d.flag);game.audio.lever();game.camera.addShake(0.4);this.usedAt=w.time;
      if(d.kind==='valve'&&d.post){
        /* главный клапан пневмосети: магистраль под давлением — станции оживают по всей аркологии */
        w.later(700,()=>{game.audio.elevator();game.camera.addShake(0.5);});
        game.hud.say('МАГИСТРАЛЬ ПОД ДАВЛЕНИЕМ. ПНЕВМОПОЧТА ЖИВА.','СТАНЦИИ — В ХАБАХ ЗОН');
      }else if(d.kind==='valve'){
        /* два клапана = давление: гермодверь к Примарху открывается сразу, без обходных флагов */
        const n=(gs.flags.valve_l?1:0)+(gs.flags.valve_r?1:0);
        if(n>=2){gs.flag('turbines_on');w.later(900,()=>{game.audio.gate();game.camera.addShake(0.6);});
          game.hud.say('ТУРБИНЫ ПОШЛИ.','ДАВЛЕНИЕ 2/2');}
        else game.hud.say('НА ВЕНТИЛЕ — ПЛОМБА СОВЕТА. ДАВЛЕНИЕ ПЕРЕКРЫЛИ НАРОЧНО.','ДАВЛЕНИЕ 1/2');
      }
      if(d.sys)w.startAnim(d.sys);
      game.particles.burst(this.x,this.y-1,22,{kind:'spark',col:'#ffcf7a',spd:4,life:0.7,size:0.05,add:true,g:9});
    }else if(d.kind==='station'){
      /* первая встреча со станцией: курьер открывает её местный клапан — станция в сети, по ней можно ездить сразу,
         без визита на Главпочтамт (его клапан нужен только для писем и цилиндров) */
      if(!gs.flags['st_'+d.station]){gs.flag('st_'+d.station);game.audio.checkpoint();this.capsuleAt=w.time;
        game.particles.burst(this.x,this.y-1.4,18,{kind:'spark',col:'#9fe0ff',spd:4,life:0.6,size:0.05,add:true,g:6});
        const n=STATION_ORDER.filter(k=>gs.flags['st_'+k]).length;
        game.hud.say(n>1?'ОТКРЫЛ ЛЮК. СТАНЦИЯ В СЕТИ — ТЕПЕРЬ ОТСЮДА МОЖНО УЕХАТЬ НА ЛЮБУЮ ОТКРЫТУЮ.':'ОТКРЫЛ ЛЮК. ЭТО ПНЕВМОПОЧТА: В КАЖДОМ ХАБЕ ЕСТЬ ТАКАЯ СТАНЦИЯ. ОТКРОЮ ЕЩЁ ОДНУ — СМОГУ ЕЗДИТЬ МЕЖДУ НИМИ.','ПНЕВМОПОЧТА');
        if(n<=1&&!(gs.flags.post_on&&PostNet.pending(gs)))return;}
      game.travel.open(d.station,this.x,this.y);
    }else if(d.kind==='broadcast'){
      /* сказать ярусам правду можно, только когда её достаточно: цилиндров — не меньше BROADCAST_N */
      if((gs.lore||0)<BROADCAST_N){game.audio.denied();
        game.hud.say('МИКРОФОН РАБОТАЕТ. НО МНЕ НЕ ПОВЕРЯТ НА СЛОВО. ЗАПИСЕЙ '+(gs.lore||0)+' ИЗ '+BROADCAST_N+' — МАЛО.','ВЕЩАТЕЛЬНЫЙ МАССИВ');return;}
      game.cinematic.play({x:this.x,y:this.y,title:'ВЕЩАТЕЛЬНЫЙ МАССИВ',speaker:'courier',setFlags:['broadcast_done'],
        lines:['СТАВЛЮ ЦИЛИНДРЫ В ПРИЁМНИК, ОДИН ЗА ДРУГИМ. ИГЛА ПОШЛА.',
          'НА ВСЕХ ЯРУСАХ, В КАЖДОЙ КВАРТИРЕ, ИЗ КАЖДОГО ГРОМКОГОВОРИТЕЛЯ — ГОЛОСА ТЕХ, КТО ЗНАЛ ПРАВДУ.',
          'ЗАВЕТ. ПРИКАЗ НАДСМОТРЩИКУ. УСТАВ ЦЕНЗУРЫ. ПОГОДА НАВЕРХУ. ПОСЛЕДНЯЯ ЗАПИСЬ ОСНОВАТЕЛЯ.',
          'ГДЕ-ТО ВНИЗУ, НА ЯРУСЕ −41, КТО-ТО ВЫКЛЮЧАЕТ НАСОС И ПРИСЛУШИВАЕТСЯ.']});
    }else if(d.kind==='postmaster'){
      const sc=postmasterScene(gs);
      game.cinematic.play({x:this.x,y:this.y,title:'ПОЧТМЕЙСТЕР',speaker:'postmaster',lines:sc.lines,upgrades:sc.upgrades,setFlags:sc.flags});
    }else if(d.kind==='stash'){
      /* заначка: шов ремонта (полный) и след чужой жизни; заначки 38 — ещё и его метка */
      gs.flags['stash_'+d.id]=true;game.combat.gainWeld(CFG.player.healCost);game.audio.pickup();game.hud.syncHp&&game.hud.syncHp();
      game.particles.burst(this.x,this.y-0.5,14,{kind:'spark',col:'#ffe6a3',spd:3,life:0.5,size:0.04,add:true,g:6});
      if(d.c38){gs.flags.c38_marks=(gs.flags.c38_marks||0)+1;
        game.cinematic.play({x:this.x,y:this.y,title:'ЗАНАЧКА КУРЬЕРА 38',speaker:'courier',lines:d.lines});}
      else game.hud.say(d.text||'',d.title||'ЗАНАЧКА');
      gs.save();w.interactables=w.interactables.filter(i=>i!==this);
    }else if(d.kind==='c38'){
      /* у колеса: курьерская сумка №38 и цилиндр в фонографе — его последняя запись */
      game.cinematic.play({x:this.x,y:this.y,title:'КУРЬЕР 38',speaker:'c38',setFlags:['c38_met'],lines:C38_LAST});
    }else if(d.kind==='phono'){
      /* игла по дорожке: шорох и строка о том, что механизм охранял */
      gs.flag('ph_'+d.key);const P=PHONO[d.key];game.audio.phono(clamp(P.t.length*0.05,2.5,6));
      game.hud.say(P.t,d.name,null,{hold:Math.max(7,readTime(P.t)),voice:'record'});
      w.interactables=w.interactables.filter(i=>i!==this);
    }else if(d.kind==='hubtalk'){
      gs.flags['heard_'+d.who]=hashStr(HubNPC.lines(game,d.who).join('|'));this._newsAt=undefined;
      game.cinematic.play({x:this.x,y:this.y,title:d.who==='pm'?'ПОЧТМЕЙСТЕР':'САДОВНИК',speaker:d.who==='pm'?'postmaster':'gardener',lines:HubNPC.lines(game,d.who)});
    }else if(d.kind==='trialpost'){game.trials.arm(w,this);
    }else if(d.kind==='trialbell'){const r=game.trials.rec(w.room.id),T=TRIALS[w.room.id];
      game.hud.say('ЛУЧШЕЕ '+fmtT(r.best)+'. НОРМА '+fmtT(T&&T.par)+(gs.flags['trial_'+w.room.id]?'. СДАНО.':'.'),T?T.n:'');
    }else if(d.kind==='mapplate'){
      gs.flag(d.flag);game.audio.lore();game.flash(0.15,'#9fd6ff');
      game.hud.say('СВЕРИЛ ПЛАНШЕТ СО СХЕМОЙ. ЧТО Я ПРОПУСТИЛ В ПРОЙДЕННЫХ ЗАЛАХ — ТЕПЕРЬ НА КАРТЕ.',d.title);
    }else if(d.kind==='gauge'){
      gs.flag(d.flag);game.audio.checkpoint();game.flash(0.25);
      const all=gs.flags.gaugeA&&gs.flags.gaugeB&&gs.flags.gaugeC;
      if(all&&!gs.flags.seal_gauges){gs.flag('seal_gauges');game.hud.say('ВСЕ ТРИ МАГИСТРАЛИ ПОД ДАВЛЕНИЕМ. ПОДЪЁМНИК ПРЕДПЕЧАТЬЯ ЗАРАБОТАЛ.','');}
      else game.hud.say(d.label+' ПОД ДАВЛЕНИЕМ.','');
      w.later(900,()=>w.reload());
    }else if(d.kind==='wheel'){
      gs.flag(d.flag);gs.flag('wheel_open');game.audio.wheel();game.finale.startSeal();
    }else if(d.kind==='lore'){
      game.salvage.lore({loreId:d.loreId});
      w.interactables=w.interactables.filter(i=>i!==this);
    }else if(d.kind==='talk'){
      if(!gs.flags[d.flag])game.salvage.collect(d);
      else game.cinematic.play({x:d.x,y:d.y,title:d.title,speaker:d.speaker,lines:d.again});
    }else if(d.kind==='salvage'||d.kind==='salvageBlocked'){
      if(d.kind==='salvageBlocked'&&!gs.has('pulse')){
        game.hud.say('РУКАМИ БАЛКУ НЕ СДВИНУТЬ. НУЖЕН РЕЗАК.','');game.audio.hitMetal();return;}
      game.salvage.collect(d);}
  }
  draw(c,t,gs){
    const d=this.def,live=this.canUse(gs);
    if(!live&&d.kind!=='lever'&&d.kind!=='valve'&&d.kind!=='mapplate'&&d.kind!=='c38')return;
    if(d.kind==='station'){drawStation(c,this,t,gs);return;}
    if(d.kind==='postmaster'){if(this.hasNews(gs))drawTalkCue(c,this.x,this.y-3.3,t);return;}
    if(d.kind==='trialpost'){drawTrialPost(c,this,t,gs);return;}
    if(d.kind==='stash'){drawStash(c,this,t);return;}
    if(d.kind==='phono'){drawPhono(c,this,t);return;}
    if(d.kind==='c38'){drawC38(c,this,t,live);return;}
    if(d.kind==='trialbell'){drawTrialBell(c,this,t,gs);return;}
    const p=live?0.5+0.5*Math.sin(t*3):0;
    /* 0 → 1: рукоять/штурвал доворачивается за доли секунды после E */
    const k=this.usedAt!==undefined?clamp((this.world.time-this.usedAt)/0.32,0,1):(live?0:1);
    if(d.kind==='lever'){
      Kit.plate(c,this.x-0.5,this.y-1.5,1.0,1.5,'steel',31,{rust:0.6});
      c.save();c.translate(this.x,this.y-0.7);c.rotate(lerp(-0.7,0.9,EZ.back(k)));
      c.strokeStyle='#5c646b';c.lineWidth=0.11;c.beginPath();c.moveTo(0,0);c.lineTo(0,-0.7);c.stroke();
      const g=c.createLinearGradient(-0.16,-0.9,0.16,-0.7);
      g.addColorStop(0,'#e8c96a');g.addColorStop(.5,'#c9a227');g.addColorStop(1,'#6d5416');
      c.fillStyle=g;c.beginPath();c.arc(0,-0.78,0.17,0,TAU);c.fill();c.restore();
      Kit.plate(c,this.x-0.66,this.y-1.82,1.32,0.32,'steel',32,{});
      c.fillStyle='#191612';c.font='500 0.17px Oswald';c.textAlign='center';
      c.fillText(d.plaque||'РЫЧАГ',this.x,this.y-1.6);c.textAlign='left';
      /* сигнальная лампа на щитке: жёлтая — ждёт, зелёная — сработал */
      c.fillStyle=live?rgba('#ffcf7a',0.55+0.4*p):'#69d68f';c.beginPath();c.arc(this.x+0.3,this.y-0.25,0.09,0,TAU);c.fill();
      if(live){c.fillStyle=rgba('#ffe6a3',0.2*p);c.beginPath();c.arc(this.x,this.y-1.0,0.8,0,TAU);c.fill();
        game.renderer.glowAdd(this.x,this.y-1.0,0.9,'#ffcf7a',0.2+0.15*p);}
      else game.renderer.glowAdd(this.x+0.3,this.y-0.25,0.4,'#69d68f',0.3);
    }else if(d.kind==='valve'){
      /* штурвал проворачивается на полтора оборота, из-под фланца бьёт пар */
      Kit.valve(c,this.x,this.y-0.6,0.42,0.2+EZ.io(k)*PI*3,'#b08d3e');
      if(this.usedAt!==undefined&&k<1&&Math.random()<0.5)game.particles.spawn({kind:'steam',x:this.x+(Math.random()-0.5)*0.6,y:this.y-0.3,
        vx:(Math.random()-0.5)*2,vy:-2-Math.random()*2,life:0.7,size:0.25,grow:1.2,col:'#e8e0d0',drag:1.4});
      if(live){c.fillStyle=rgba('#ffe6a3',0.2*p);c.beginPath();c.arc(this.x,this.y-0.6,0.9,0,TAU);c.fill();
        game.renderer.glowAdd(this.x,this.y-0.6,0.9,'#ffcf7a',0.18+0.14*p);}
      else game.renderer.glowAdd(this.x,this.y-0.6,0.6,'#69d68f',0.22);
    }else if(d.kind==='lore'){
      softHalo(c,this.x,this.y-0.75,1.1+p*0.15,'#9fe6ff',0.22+0.1*p);
      Kit.plate(c,this.x-0.5,this.y-1.1,1.0,1.1,'lead',34,{bolts:true});
      Kit.loreCylinder(c,this.x,this.y-0.75);
      game.renderer.glowAdd(this.x,this.y-0.75,0.9,'#9fe6ff',0.5);
    }else if(d.kind==='mapplate'){
      /* схема яруса: латунная рамка, синька с белыми линиями комнат */
      const x=this.x-0.75,y=this.y-2.0;
      Kit.plate(c,x-0.08,y-0.08,1.66,1.16,'steel',777,{rust:0.4,bolts:true});
      c.fillStyle=live?'#16324a':'#1a2630';c.fillRect(x,y,1.5,1.0);
      c.strokeStyle=live?'rgba(220,240,255,.85)':'rgba(220,240,255,.35)';c.lineWidth=0.03;
      c.strokeRect(x+0.12,y+0.5,0.36,0.34);c.strokeRect(x+0.5,y+0.14,0.3,0.7);c.strokeRect(x+0.82,y+0.42,0.52,0.24);
      c.fillStyle=live?rgba('#ffcf7a',0.6+0.4*p):'rgba(255,207,122,.3)';c.beginPath();c.arc(x+0.64,y+0.3,0.05,0,TAU);c.fill();
      if(live)game.renderer.glowAdd(this.x,this.y-1.5,1.0,'#9fd6ff',0.18+0.12*p);
    }else if(d.kind==='gauge'){
      softHalo(c,this.x,this.y-0.6,1.1,'#69d68f',0.14+0.1*p);
      game.renderer.glowAdd(this.x,this.y-0.6,1.0,'#69d68f',0.25+0.15*p);
    }else if(d.kind==='broadcast'){
      softHalo(c,this.x,this.y-1.0,1.8,'#69d68f',0.12+0.1*p);
      game.renderer.glowAdd(this.x,this.y-1.0,1.6,'#69d68f',0.3+0.2*p);
    }else if(d.kind==='talk'||d.kind==='hubtalk'){
      /* пузырь над головой — только когда есть что сказать нового; поговорил — пропал */
      if(this.hasNews(gs))drawTalkCue(c,this.x,this.y-(d.cueH||(d.who==='pm'?4.25:d.who==='gd'?2.7:2.35)),t);
    }else if(d.kind==='wheel'){
      c.fillStyle=rgba('#fff6dd',0.14*p);c.beginPath();c.arc(this.x,this.y-1.2,2.4,0,TAU);c.fill();
    }else if(d.kind==='salvage'||d.kind==='salvageBlocked'){drawSalvage(c,this,t,p);}
  }
}
/* находка на полу (модуль, пластина, ресивер): латунный кейс парит над полом в столбе света;
   от него раз в 1.6 с расходится волна — видно с другого конца зала, но круг не висит постоянно */
function drawSalvage(c,it,t,p){const x=it.x,y=it.y,bob=Math.sin(t*2.2)*0.07,K=1.45,cy=y-0.95+bob;
  /* столб света до потолка зала: видно с другого конца */
  const top=Math.max(0,y-9),sh=c.createLinearGradient(0,top,0,y);sh.addColorStop(0,'rgba(255,214,140,0)');sh.addColorStop(0.7,rgba('#ffd68c',0.12+0.06*p));sh.addColorStop(1,rgba('#ffe2a8',0.3+0.1*p));
  c.fillStyle=sh;c.fillRect(x-0.45,top,0.9,y-top);c.fillStyle=rgba('#fff2d0',0.18+0.08*p);c.fillRect(x-0.1,top,0.2,y-top);
  /* волна-«пинг» раз в 1.6 с: расходится и гаснет — не висящий круг, а сигнал */
  const ph=(t*0.62+x*0.07)%1,R=0.6+ph*2.6;c.strokeStyle=rgba('#ffe2a0',0.55*(1-ph));c.lineWidth=0.06*(1-ph)+0.02;
  c.beginPath();c.ellipse(x,cy,R,R*0.9,0,0,TAU);c.stroke();
  softHalo(c,x,cy,1.8+p*0.2,'#ffcf7a',0.42+0.14*p);
  c.fillStyle=rgba('#ffcf7a',0.35);c.beginPath();c.ellipse(x,y-0.03,0.9,0.12,0,0,TAU);c.fill();
  c.save();c.translate(x,cy);c.scale(K,K);c.rotate(Math.sin(t*1.3)*0.12);
  const g=c.createLinearGradient(0,-0.36,0,0.12);g.addColorStop(0,'#fff0b0');g.addColorStop(.45,'#d8ad52');g.addColorStop(1,'#6d5416');
  c.fillStyle=g;rr(c,-0.34,-0.3,0.68,0.46,0.07);c.fill();
  c.strokeStyle='#2b241a';c.lineWidth=0.03;rr(c,-0.34,-0.3,0.68,0.46,0.07);c.stroke();
  c.fillStyle='#2b241a';c.fillRect(-0.34,-0.08,0.68,0.04);
  for(const bx of [-0.26,0.26]){c.fillStyle='#fff4d0';c.beginPath();c.arc(bx,-0.22,0.035,0,TAU);c.fill();}
  c.fillStyle=rgba('#fff6d8',0.7+0.3*p);c.beginPath();c.arc(0,-0.19,0.08,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.45)';c.fillRect(-0.3,-0.28,0.6,0.03);
  c.restore();
  /* блик-звёздочка */
  const s2=(t*0.8+x*0.13)%1;if(s2<0.22){const a=Math.sin(s2/0.22*PI),L=0.6*a;
    c.strokeStyle=rgba('#fffaf0',0.95*a);c.lineWidth=0.04;c.beginPath();c.moveTo(x+0.3-L,cy-0.35);c.lineTo(x+0.3+L,cy-0.35);c.moveTo(x+0.3,cy-0.35-L);c.lineTo(x+0.3,cy-0.35+L);c.stroke();}
  if(Math.random()<0.12)game.particles.spawn({kind:'spark',x:x+(Math.random()-0.5)*1.0,y:y-0.2,vx:0,vy:-1-Math.random()*1.2,life:1.3,size:0.045,col:'#ffe6a3',add:true,g:-0.4});
  game.renderer.glowAdd(x,cy,2.4,'#ffcf7a',0.55+0.2*p);}
class Pushable{
  constructor(def,world){Object.assign(this,def);this.world=world;this.vx=0;this.vy=0;
    this.pushed=!!def.pushed;this.defY=def.y;this.t=0;this.maxHp=def.hp||1;this.hp=this.maxHp;this.hitT=0;}
  rect(){return {x:this.x,y:this.y,w:this.w,h:this.h};}
  /* решётка: удар гнёт прутья, на последнем ударе она вылетает; ложная стена — глухо, крошится */
  strike(dir,heavy){
    if(this.kind==='crack'&&!this.pushed){const g=this.world.game;this.hp-=heavy?3:1;this.hitT=0.22;
      g.audio.tone(96,0.32,'triangle',0.06,70);g.audio.mat('ply',0.5);g.camera.addShake(0.25);g.hitstop(CFG.hsMelee);
      g.particles.burst(this.x+this.w/2,this.world.player.cy,10,{kind:'debris',col:'#6a5a4a',spd:4,life:0.6,size:0.07,g:20});
      g.particles.burst(this.x+this.w/2,this.world.player.cy,6,{kind:'dust',col:'#a89a86',spd:1.6,life:1.0,size:0.2,grow:0.8,drag:1.5});
      if(this.hp<=0){this.world.breakPushable(this,dir);g.audio.tone(70,0.6,'triangle',0.05,40);}
      return true;}
    if(this.kind!=='grate'||this.pushed)return false;
    const g=this.world.game;this.hp--;this.hitT=0.18;this.bend=(this.bend||0)+dir;
    g.audio.hitMetal();g.camera.addShake(0.3);g.hitstop(CFG.hsMelee);
    g.particles.burst(this.x+this.w/2,this.world.player.cy,12,{kind:'spark',col:'#ffd27a',spd:6,life:0.4,size:0.05,add:true,g:14});
    if(this.hp<=0)this.world.breakPushable(this,dir);
    return true;
  }
  update(dt){
    this.t+=dt;if(this.hitT>0)this.hitT-=dt;
    /* сквозняк из трещины: пыль тянет наружу, вблизи — тонкий свист */
    if(this.kind==='crack'&&!this.pushed){const W=this.world,p=W.player,g=W.game;if(!p)return;
      const d=Math.abs(p.cx-(this.x+this.w/2))+Math.abs(p.cy-(this.y+this.h/2))*0.5;
      if(d<16&&Math.random()<dt*2.2){const out=this.x<W.room.w/2?1:-1;
        g.particles.spawn({kind:'dust',x:this.x+this.w/2+out*0.2,y:this.y+0.3+Math.random()*(this.h-0.6),vx:out*(0.8+Math.random()*0.8),vy:(Math.random()-0.5)*0.3,
          life:1.6,size:0.04,col:'#d8d0c0',drag:0.6,a:0.5});}
      this.whT=(this.whT||0)-dt;if(d<4.5&&this.whT<=0){this.whT=3.2+Math.random()*1.5;g.audio.tone(1280+Math.random()*200,0.9,'sine',0.006,1180);}
      return;}
    if(this.kind==='counterweight'){const a=this.world.anims.blast;
      this.y=this.defY+2.6*(a?EZ.in(seg01(a.t,0.25,2.05)):(this.pushed?1:0));return;}
    if(this.kind!=='core'||this.pushed)return;
    this.vx*=Math.exp(-3.2*dt);this.x+=this.vx*dt;
    this.vy+=52*dt;this.y+=this.vy*dt;
    const sols=this.world.room.solids;
    for(let i=0;i<sols.length;i++){
      const s=sols[i];if(s.hidden||!aabb(this,s))continue;
      if(this.vy>0&&this.y+this.h-this.vy*dt<=s.y+0.25){this.y=s.y-this.h;this.vy=0;}
      else if(this.vy<0){this.y=s.y+s.h;this.vy=0;}
      else if(this.vx>0){this.x=s.x-this.w;this.vx*=-0.2;}
      else if(this.vx<0){this.x=s.x+s.w;this.vx*=-0.2;}}
    if(Math.abs(this.x+this.w/2-this.slotX)<1.0&&Math.abs(this.y+this.h/2-16.0)<1.6){
      this.pushed=true;this.x=this.slotX-this.w/2+0.05;this.y=16.0-this.h/2;this.vx=0;this.vy=0;
      const g=this.world.game;
      g.audio.hitMetal();g.camera.addShake(0.45);g.gs.flag(this.flag);
      const n=this.world.pushables.filter(p=>p.pushed).length;
      g.gs.flags.cores_placed=n;g.gs.save();
      g.hud.say('ЯДРО В ГНЕЗДЕ. '+n+' ИЗ 3.','МАГИСТРАЛЬ C');
      /* три ядра — задача решена: комната завершена, стражи отходят (после перезагрузки их нет) */
      if(n>=3){const cf=this.world.room.clearFlag;if(cf)g.gs.flag(cf);this.world.later(800,()=>this.world.reload());}
    }
  }
  draw(c,t){
    if(this.pushed&&this.kind!=='counterweight')return;
    if(this.kind==='counterweight'){
      const yy=this.y;
      const g=c.createLinearGradient(this.x,0,this.x+this.w,0);
      g.addColorStop(0,'#2b2e32');g.addColorStop(.35,'#5c626a');g.addColorStop(.6,'#454b52');g.addColorStop(1,'#20242a');
      c.fillStyle=g;rr(c,this.x,yy,this.w,this.h,0.08);c.fill();
      c.save();c.globalAlpha=0.2;c.fillStyle=PAT(c,'rust');c.fillRect(this.x,yy,this.w,this.h);c.restore();
      for(let i=0;i<4;i++)Kit.bolt(c,this.x+0.25+(i%2)*(this.w-0.5),yy+0.3+Math.floor(i/2)*(this.h-0.6),0.08);
      if(!this.pushed){
        const p=0.5+0.5*Math.sin(t*3.4),cx=this.x+this.w/2,cy=yy+this.h*0.62;
        c.strokeStyle=rgba('#e8c96a',0.75);c.lineWidth=0.07;
        c.beginPath();c.arc(cx,cy,0.44,0,TAU);c.stroke();
        c.beginPath();c.arc(cx,cy,0.22,0,TAU);c.stroke();
        c.fillStyle=rgba('#ffe6a3',0.45+0.4*p);c.beginPath();c.arc(cx,cy,0.09,0,TAU);c.fill();
        game.renderer.glowAdd(cx,cy,1.0,'#e8c96a',0.25+0.2*p);
      }
    }else if(this.kind==='lead'){
      /* свинцовая заглушка: тусклые листы на заклёпках, сквозная трещина — за ней свет */
      const x=this.x,y=this.y,w=this.w,h=this.h,sh=this.hitT>0?(Math.random()-0.5)*0.06:0;
      c.save();c.translate(sh,0);
      const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#6e737a');g.addColorStop(0.5,'#4e5359');g.addColorStop(1,'#2e3136');
      c.fillStyle=g;c.fillRect(x,y,w,h);
      c.save();c.globalAlpha=0.35;c.fillStyle=PAT(c,'lead');c.fillRect(x,y,w,h);c.restore();
      for(let yy=y+0.3;yy<y+h-0.1;yy+=1.2){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x,yy,w,0.05);
        for(let xx=x+0.2;xx<x+w;xx+=0.6)Kit.bolt(c,xx,yy+0.18,0.045);}
      const r=rng(this.id||'lead');c.strokeStyle='rgba(255,236,190,.85)';c.lineWidth=0.05;c.beginPath();
      let cx=x+w*0.5,cy=y+0.1;c.moveTo(cx,cy);while(cy<y+h-0.1){cx=clamp(cx+(r()-0.5)*0.6,x+0.15,x+w-0.15);cy+=0.3+r()*0.4;c.lineTo(cx,cy);}c.stroke();
      game.renderer.glowAdd(x+w/2,y+h/2,Math.max(w,h)*0.5,'#ffe6b0',0.18);
      if(this.world.game.gs.has('breaker')){const p=0.5+0.5*Math.sin(t*3.4),tx=x+w/2,ty=y+h*0.5;
        c.fillStyle='rgba(20,16,10,.8)';c.beginPath();c.arc(tx,ty,0.52,0,TAU);c.fill();
        c.strokeStyle=rgba('#e8c96a',0.8);c.lineWidth=0.07;c.beginPath();c.arc(tx,ty,0.44,0,TAU);c.stroke();c.beginPath();c.arc(tx,ty,0.22,0,TAU);c.stroke();
        c.fillStyle=rgba('#ffe6a3',0.45+0.4*p);c.beginPath();c.arc(tx,ty,0.09,0,TAU);c.fill();
        game.renderer.glowAdd(tx,ty,1.0,'#e8c96a',0.25+0.2*p);}
      c.restore();
    }else if(this.kind==='beam'){
      /* балку рисует сцена садовника (z3_collector) */
    }else if(this.kind==='crate'){
      /* штабель ящиков ровно по габариту коллизии + латунная мишень «бей импульсом» */
      const cols=Math.max(1,Math.round(this.w/1.15)),rows=Math.max(1,Math.round(this.h/1.1));
      const cw=this.w/cols,ch=this.h/rows;
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const sd=(i*7+j*13+(this.id.length*3))|0,ix=(j%2)?0.06:-0.04;
        Kit.crate(c,this.x+i*cw+ix+0.03,this.y+j*ch+0.03,cw-0.06,ch-0.06,{seed:sd,mat:(i+j)%3===2?'steel':'ply'});}
      Kit.hazardTape(c,this.x,this.y+this.h*0.5-0.12,this.w,0.24);
      if(this.world.game.gs.has('pulse')){
        const p=0.5+0.5*Math.sin(t*3.4),cx=this.x+this.w/2,cy=this.y+this.h*0.5;
        c.fillStyle='rgba(20,16,10,.8)';c.beginPath();c.arc(cx,cy,0.52,0,TAU);c.fill();
        c.strokeStyle=rgba('#e8c96a',0.8);c.lineWidth=0.07;
        c.beginPath();c.arc(cx,cy,0.44,0,TAU);c.stroke();c.beginPath();c.arc(cx,cy,0.22,0,TAU);c.stroke();
        c.fillStyle=rgba('#ffe6a3',0.45+0.4*p);c.beginPath();c.arc(cx,cy,0.09,0,TAU);c.fill();
        game.renderer.glowAdd(cx,cy,1.0,'#e8c96a',0.25+0.2*p);}
    }else if(this.kind==='grate'&&this.floor){
      /* решётка в полу: прутья поперёк провала, удары сверху прогибают их вниз */
      const dmg=1-this.hp/this.maxHp,sag=dmg*0.22+(this.hitT>0?0.06:0),sh=this.hitT>0?(Math.random()-0.5)*0.05:0;
      c.save();c.translate(sh,0);
      Kit.plate(c,this.x-0.15,this.y-0.05,0.3,this.h+0.1,'steel',641,{bolts:false,rust:0.8});
      Kit.plate(c,this.x+this.w-0.15,this.y-0.05,0.3,this.h+0.1,'steel',642,{bolts:false,rust:0.8});
      c.lineCap='round';
      for(let i=0;i<5;i++){const by=this.y+0.08+i*0.075,mid=this.x+this.w/2;
        c.strokeStyle='#6b4a3a';c.lineWidth=0.07;c.beginPath();c.moveTo(this.x+0.1,by);c.quadraticCurveTo(mid,by+sag*(1+i*0.15),this.x+this.w-0.1,by);c.stroke();}
      for(let i=1;i<5;i++){const bx=this.x+i*this.w/5;c.strokeStyle='#4a3a2e';c.lineWidth=0.06;
        c.beginPath();c.moveTo(bx,this.y+0.05);c.lineTo(bx,this.y+this.h-0.02+sag*0.5);c.stroke();}
      c.restore();
      if(this.hitT>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=rgba('#ffcf7a',this.hitT*2);
        c.fillRect(this.x,this.y,this.w,this.h);c.restore();}
    }else if(this.kind==='grate'){
      const bend=clamp(this.bend||0,-3,3),sh=this.hitT>0?(Math.random()-0.5)*0.08:0,dmg=1-this.hp/this.maxHp;
      c.save();c.translate(sh,0);
      Kit.plate(c,this.x-0.1,this.y,this.w+0.2,0.3,'steel',631,{bolts:false,rust:0.8});
      Kit.plate(c,this.x-0.1,this.y+this.h-0.3,this.w+0.2,0.3,'steel',632,{bolts:false,rust:0.8});
      for(let k=0;k<5;k++){const by=this.y+0.3+k*(this.h-0.6)/4;
        c.fillStyle='#4a3a2e';c.fillRect(this.x-0.05,by-0.05,this.w+0.1,0.1);}
      c.lineCap='round';
      for(let i=0;i<3;i++){const bx=this.x+0.1+i*(this.w-0.2)/2,mid=this.y+this.h*0.55;
        const off=bend*0.16*dmg*(1+i*0.3);
        c.strokeStyle='#6b4a3a';c.lineWidth=0.11;
        c.beginPath();c.moveTo(bx,this.y+0.3);c.quadraticCurveTo(bx+off*2.2,mid,bx,this.y+this.h-0.3);c.stroke();
        c.strokeStyle='rgba(255,200,150,.18)';c.lineWidth=0.03;
        c.beginPath();c.moveTo(bx-0.03,this.y+0.3);c.quadraticCurveTo(bx+off*2.2-0.03,mid,bx-0.03,this.y+this.h-0.3);c.stroke();}
      c.restore();
      if(this.hitT>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=rgba('#ffcf7a',this.hitT*2);
        c.fillRect(this.x-0.1,this.y,this.w+0.2,this.h);c.restore();}
    }else if(this.kind==='crack'){
      /* ложная стена: та же кладка, что и вокруг, но с трещиной и тёмной щелью; удары её крошат */
      const dmg=1-this.hp/this.maxHp,sh=this.hitT>0?(Math.random()-0.5)*0.06:0;
      c.save();c.translate(sh,0);
      Kit.plate(c,this.x,this.y,this.w,this.h,this.mat||'concrete',(this.id.length*31)|0,{rust:0.4});
      c.strokeStyle='rgba(12,10,8,.85)';c.lineWidth=0.035+dmg*0.03;c.lineCap='round';
      const cx=this.x+this.w/2;c.beginPath();c.moveTo(cx-0.05,this.y+0.1);
      for(let i=1;i<=6;i++){c.lineTo(cx+((i%2)?0.11:-0.09)*(1+dmg),this.y+this.h*i/6.2);}c.stroke();
      c.beginPath();c.moveTo(cx+0.06,this.y+this.h*0.35);c.lineTo(cx+0.17,this.y+this.h*0.42);c.moveTo(cx-0.05,this.y+this.h*0.7);c.lineTo(cx-0.16,this.y+this.h*0.78);c.stroke();
      if(dmg>0){c.fillStyle='rgba(8,6,4,'+(0.3+dmg*0.4)+')';c.fillRect(cx-0.05*dmg,this.y+this.h*0.25,0.1*dmg,this.h*0.5);}
      c.restore();
      if(this.hitT>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=rgba('#ffcf7a',this.hitT*1.5);c.fillRect(this.x,this.y,this.w,this.h);c.restore();}
    }else if(this.kind==='core'){
      Kit.leadCore(c,this.x+this.w/2,this.y+this.h/2,this.w*0.52);
      const p=0.5+0.5*Math.sin(t*3);
      c.strokeStyle=rgba('#e8c96a',0.28+0.3*p);c.lineWidth=0.05;
      c.beginPath();c.arc(this.x+this.w/2,this.y+this.h/2,this.w*0.78,0,TAU);c.stroke();
    }
  }
}
