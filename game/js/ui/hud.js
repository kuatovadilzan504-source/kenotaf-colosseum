"use strict";
/* ============================== HUD ============================== */
class HUD{
  constructor(game){
    this.game=game;
    this.el={hud:document.getElementById('hud'),hp:document.getElementById('hpCells'),
      en:document.getElementById('enFill'),ab:document.getElementById('abRow'),
      prompt:document.getElementById('prompt'),promptT:document.querySelector('#prompt span'),
      cap:document.getElementById('caption'),capT:document.querySelector('#caption .t'),
      capS:document.querySelector('#caption .s'),card:document.getElementById('roomcard'),
      cardZ:document.querySelector('#roomcard .z'),cardN:document.querySelector('#roomcard .n'),
      boss:document.getElementById('bossbar'),bossN:document.querySelector('#bossbar .nm'),
      bossF:document.querySelector('#bossbar .fill'),lore:document.getElementById('loreN'),
      hint:document.getElementById('hint'),hintK:document.querySelector('#hint .keys'),
      hintT:document.querySelector('#hint .tt'),abc:document.getElementById('abcard')};
    this.abT=0;
    this.cur=null;this.cq=[];this.bub=null;this.cardT=0;this._p=null;this._hp=-1;this.buildHp();this.buildAb();
  }
  buildHp(){this.el.hp.innerHTML='';this.cells=[];
    for(let i=0;i<this.game.gs.maxHp();i++){const d=document.createElement('div');d.className='cell';d.innerHTML='<i></i>';
      this.el.hp.appendChild(d);this.cells.push(d);}
    /* нечётная пластина — пустая рамка будущей ячейки */
    if(this.game.gs.plates()%2){const d=document.createElement('div');d.className='cell half';this.el.hp.appendChild(d);}}
  buildAb(){
    const icons={
      pulse:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><path d="M3 12h5l2-4 3 8 2-4h6"/></svg>',
      dash:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><path d="M4 8h10M4 12h14M4 16h8"/><path d="M18 6l4 6-4 6"/></svg>',
      claws:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><path d="M6 3v8a6 6 0 0012 0V3M10 3v7M14 3v7"/></svg>',
      magnet:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><path d="M5 4v9a7 7 0 0014 0V4h-5v9a2 2 0 01-4 0V4z"/></svg>',
      filter:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><circle cx="12" cy="13" r="6"/><path d="M9 7V4h6v3M12 10v6M9 13h6"/></svg>',
      hook:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><circle cx="17" cy="6" r="3"/><path d="M15 8L5 18M5 18v-4M5 18h4"/></svg>',
      breaker:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><rect x="4" y="4" width="16" height="16"/><path d="M12 4l-2 6 4 3-3 7M4 12l6-2M20 9l-6 4"/></svg>',
      vjump:'<svg viewBox="0 0 24 24" fill="none" stroke="#e8c96a" stroke-width="1.6"><path d="M12 3l-5 6h3v5h4V9h3z"/><path d="M8 18c1 2 3 2 4 0s3-2 4 0M7 21h10"/></svg>'};
    this.el.ab.innerHTML='';this.abEls={};
    for(const k of ABILITY_ORDER){
      const d=document.createElement('div');d.className='ab';
      d.innerHTML=icons[k]+'<span>'+ABILITIES[k].short+'</span>';d.title=ABILITIES[k].name;
      this.el.ab.appendChild(d);this.abEls[k]=d;}
  }
  syncHp(){const gs=this.game.gs,hp=gs.hp;if(this.cells.length!==gs.maxHp())this.buildHp();
    for(let i=0;i<this.cells.length;i++)this.cells[i].classList.toggle('off',i>=hp);}
  syncAbilities(){const gs=this.game.gs;
    for(const k in this.abEls){const on=!!gs.has(k);this.abEls[k].classList.toggle('on',on);this.abEls[k].style.display=on?'':'none';}
    /* счётчик цилиндров не висит всегда: показывается на несколько секунд, когда найден новый */
    if(this._lore!==undefined&&gs.lore>this._lore){const ch=this.el.lore.closest('.lorechip');if(ch){ch.classList.add('show');clearTimeout(this._loreT);this._loreT=setTimeout(()=>ch.classList.remove('show'),4500);}}
    this._lore=gs.lore;this.el.lore.textContent=gs.lore;}
  energy(v){this.el.en.style.width=clamp(v,0,100)+'%';}
  /* шкала давления делится на заряды импульса */
  charges(n){if(this._ch===n)return;this._ch=n;const b=this.el.en.parentNode.querySelector('b');if(!b)return;const st=[];
    for(let i=1;i<n;i++){const q=(100*i/n).toFixed(2);st.push('transparent calc('+q+'% - 1px)','rgba(0,0,0,.9) calc('+q+'% - 1px)','rgba(0,0,0,.9) calc('+q+'% + 1px)','transparent calc('+q+'% + 1px)');}
    b.style.background=st.length?'linear-gradient(90deg,'+st.join(',')+')':'none';}
  /* перегрев резака: три раскалённых шестигранника справа от давления */
  heatSync(){const n=this.game.gs.heat||0;if(this._heat===n)return;this._heat=n;const el=this._hp_||(this._hp_=document.getElementById('heatPips'));if(!el)return;
    const pips=el.querySelectorAll('i');pips.forEach((p,i)=>p.classList.toggle('on',i<n));el.classList.toggle('any',n>0);}
  heatPulse(){this._heat=-1;this.heatSync();const el=document.getElementById('heatPips');if(!el)return;el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');}
  /* подкачка у фонаря: ячейка вспыхивает по очереди, вся полоса тёплая, пока шланг подцеплен */
  cellRefill(i){const c=this.cells[i];if(!c)return;c.classList.remove('refill');void c.offsetWidth;c.classList.add('refill');}
  lampRest(on){this.el.hp.classList.toggle('resting',!!on);}
  /* сохранение: латунная шестерня в углу на пару секунд — без текста поверх игры */
  saved(){const el=this._sv||(this._sv=document.getElementById('saved'));if(!el)return;
    el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(this._svT);this._svT=setTimeout(()=>el.classList.remove('on'),2200);}
  prompt(text){
    if(!text){if(this._p!==null){this.el.prompt.classList.remove('on');this._p=null;}return;}
    if(this._p!==text){this.el.promptT.textContent=text;this._p=text;}
    this.el.prompt.classList.add('on');
  }
  /* ---------- реплики (js/ui/voice.js) ----------
     say — подпись внизу: печатается по буквам (у говорящего — голосом), держится по длине строки и уступает
     место следующей только дочитанной: новые ждут в очереди. caption — реплика сцены (листается E).
     speak — голос стража: строка над ним самим, там, куда игрок и так смотрит в бою. */
  say(t,s,sp,o){t=String(t||'');if(!t)return;const m={t,s:s||'',sp:sp||null,voice:(o&&o.voice)||voiceOf(sp,s),hold:(o&&o.hold)||readTime(t)};
    const C=this.cur;if(C&&!C.scene&&!C.gone&&C.t===t)return;if(this.cq.some(q=>q.t===t))return;
    if(C&&C.scene)return;
    if(C&&!C.gone&&C.age<C.min){this.cq.push(m);if(this.cq.length>4)this.cq.splice(0,this.cq.length-4);return;}
    this.showCap(m);}
  showCap(m){this.cur=m;m.typer=new Typer(m.t,m.voice);m.age=0;m.gone=false;m.min=Math.min(m.hold,2.4)+m.t.length/TYPE_CPS;
    this.el.capS.textContent=m.s;this.speaker(m.sp);this.el.capT.innerHTML=m.typer.html();this.el.cap.classList.add('on');}
  caption(t,s,sp){if(!t){this.cur=null;this.cq=[];this.el.cap.classList.remove('on');this.speaker(null);return;}
    this.showCap({t:String(t),s:s||'',sp,voice:voiceOf(sp,s),hold:999,scene:true});}
  /* сцена листает: недопечатанную строку — сначала допечатать */
  captionTyping(){return !!(this.cur&&this.cur.typer&&!this.cur.typer.done);}
  captionFinish(){if(this.cur&&this.cur.typer){this.cur.typer.finish();this.el.capT.innerHTML=this.cur.typer.html();}}
  capStep(dt){const m=this.cur;
    if(m){if(m.typer.step(dt,this.game.audio))this.el.capT.innerHTML=m.typer.html();
      if(m.typer.done){m.age+=dt;
        const next=this.cq.length&&m.age>=Math.min(m.hold,2.4);
        if(!m.scene&&(m.age>=m.hold||next)&&!m.gone){m.gone=true;m.goneT=0;this.el.cap.classList.remove('on');}}
      if(m.gone){m.goneT+=dt;if(m.goneT>0.4){this.cur=null;this.speaker(null);}}}
    if(!this.cur&&this.cq.length)this.showCap(this.cq.shift());}
  /* голос стража над ним самим: печатается его голосом, держится по длине, следует за ним */
  speak(text,who,anchor,o){const voice=voiceOf(who,who);this.bub={text:String(text),name:(o&&o.name)||(anchor&&anchor.name)||'',voice,anchor,age:0,
    hold:readTime(text)+0.6,typer:new Typer(text,voice)};}
  bubStep(dt){const b=this.bub;if(!b)return;b.typer.step(dt,this.game.audio);if(b.typer.done)b.age+=dt;if(b.age>b.hold+0.6)this.bub=null;}
  drawBubble(c,m){const b=this.bub;if(!b)return;const g=this.game,W=g.vw,H=g.vh,A=b.anchor;
    const wx=A?(A.cx!==undefined?A.cx:A.x):0,wy=A?(A.y!==undefined?A.y:0)-0.6:0;
    let x=A?m.a*wx+m.c*wy+m.e:W/2,y=A?m.b*wx+m.d*wy+m.f:H*0.2;
    const fs=Math.round(H*0.03),ks=Math.round(H*0.016),a=clamp(b.typer.n/2,0,1)*clamp((b.hold+0.6-b.age)/0.6,0,1);if(a<=0)return;
    c.save();c.font='300 '+fs+'px Oswald';try{c.letterSpacing=Math.round(fs*0.12)+'px';}catch(e){}
    const tw=c.measureText(b.text).width,pw=tw+fs*1.6,ph=fs*(b.name?2.7:1.9);
    x=clamp(x,pw/2+16,W-pw/2-16);y=clamp(y-ph-fs*0.6,H*0.12,H*0.7);
    c.globalAlpha=a;c.fillStyle='rgba(10,8,6,.78)';rr(c,x-pw/2,y,pw,ph,fs*0.3);c.fill();
    c.strokeStyle='rgba(201,162,39,.55)';c.lineWidth=1.2;c.stroke();
    if(b.name){c.font='500 '+ks+'px Oswald';try{c.letterSpacing=Math.round(ks*0.4)+'px';}catch(e){}c.fillStyle='#c9a227';c.textAlign='center';c.fillText(b.name,x,y+ks*1.5);}
    c.font='300 '+fs+'px Oswald';try{c.letterSpacing=Math.round(fs*0.12)+'px';}catch(e){}c.textAlign='left';c.fillStyle='#f2e8d2';
    c.fillText(b.text.slice(0,Math.floor(b.typer.n)),x-tw/2,y+ph-fs*0.62);
    c.restore();}
  /* портрет говорящего (js/ui/portraits.js): курьер, почтмейстер, садовник, Курьер 38, Совет */
  speaker(sp){this.capSp=PORTRAITS[sp]?sp:null;this.el.cap.classList.toggle('sp',!!this.capSp);
    if(this.capSp)Portraits.draw(this.el.cap.querySelector('.pt'),this.capSp,performance.now()/1000);}
  showLore(text,title){this.say(text,title||'',null,{hold:Math.max(9,readTime(text)),voice:'record'});this.syncAbilities();}
  showAbilityCard(key,o){const ab=Object.assign({},ABILITIES[key]||{},o||{});if(!ab.name)return;const el=this.el.abc;
    el.querySelector('.k').textContent=ab.kicker||'МОДУЛЬ УСТАНОВЛЕН';
    el.querySelector('.n').textContent=ab.name;el.querySelector('.keys').innerHTML=keysHTML(ab.keys);
    el.querySelector('.d').textContent=ab.desc;el.classList.add('on');this.abT=5.5;}
  showUpgradeCard(u){if(!u)return;const el=this.el.abc;
    el.querySelector('.k').textContent=u.kicker||'УЛУЧШЕНИЕ';el.querySelector('.n').textContent=u.name;
    el.querySelector('.keys').innerHTML='';el.querySelector('.d').textContent=u.desc;el.classList.add('on');this.abT=5;}
  hint(h){const el=this.el.hint;
    if(!h){el.classList.remove('on','done');return;}
    this.el.hintK.innerHTML=keysHTML(h.keys);this.el.hintT.textContent=h.text;
    el.classList.remove('done');el.classList.add('on');}
  hintDone(){this.el.hint.classList.add('done');}
  roomCard(z,n){this.el.cardZ.textContent=z;this.el.cardN.textContent=n;
    this.el.card.classList.add('on');this.cardT=3.4;}
  bossOn(name){this.el.bossN.textContent=name;this.el.boss.classList.add('on');if(this.cardT>0){this.cardT=0;this.el.card.classList.remove('on');}}
  /* полоса стража вытесняет табличку зала: имя зала поверх полосы и титула — лишнее */
  boss(name,v){this.el.bossN.textContent=name;this.el.bossF.style.width=clamp(v*100,0,100)+'%';
    this.el.boss.classList.add('on');if(this.cardT>0){this.cardT=0;this.el.card.classList.remove('on');}}
  bossOff(){this.el.boss.classList.remove('on');}
  show(v){this.el.hud.classList.toggle('hidden',!v);}
  update(dt){
    this.capStep(dt);this.bubStep(dt);
    if(this.capSp&&this.el.cap.classList.contains('on'))Portraits.draw(this.el.cap.querySelector('.pt'),this.capSp,performance.now()/1000);
    if(this.cardT>0){this.cardT-=dt;if(this.cardT<=0)this.el.card.classList.remove('on');}
    if(this.abT>0){this.abT-=dt;if(this.abT<=0)this.el.abc.classList.remove('on');}
    /* цель не висит на экране. Только если игрок долго топчется без продвижения —
       один раз тихо напоминаем, что записи курьера есть в паузе */
    const ob=currentObjective(this.game.gs),el=this._obEl||(this._obEl=document.getElementById('obj'));
    if(ob!==this._ob){this._ob=ob;this._obIdle=0;this._obShown=false;}
    if(this.game.state==='play')this._obIdle=(this._obIdle||0)+dt;
    if(this._obIdle>150&&!this._obShown){this._obShown=true;el.classList.add('on');this._obT=7;}
    if(this._obT>0){this._obT-=dt;if(this._obT<=0)el.classList.remove('on');}
    const g=this.game;
    /* ранен — пустые ячейки тлеют: их можно наполнить */
    {const hurt=g.gs.hp<g.gs.maxHp()&&g.state==='play';if(this._hurt!==hurt){this._hurt=hurt;this.el.hp.classList.toggle('hurt',hurt);}}
    this.heatSync();
    if(g.world&&g.world.player&&!g.world.player.dead){
      const pl=g.world.player;this.energy(pl.energy/pl.maxEnergy()*100);this.charges(Math.max(1,Math.round(pl.maxEnergy()/CFG.player.pulseCost)));
      if(this._hp!==g.gs.hp){this._hp=g.gs.hp;this.syncHp();}
    }
    if(g.world&&!g.world.boss&&!(g.world.miniBoss&&g.world.miniBoss.engaged))this.bossOff();
    {const gs=g.gs,wl=this._wl||(this._wl=document.getElementById('weldLine')),wf=this._wf||(this._wf=document.getElementById('weldFill'));
      const k=clamp((gs.weld||0)/gs.weldMax(),0,1);if(this._wk!==k){this._wk=k;wf.style.width=(k*100)+'%';}
      wl.classList.toggle('ready',(gs.weld||0)>=CFG.player.healCost&&gs.hp<gs.maxHp());}
    if(g.world&&g.world.room){
      const hasF=g.gs.has('filter'),fl=this._flt||(this._flt=document.getElementById('fltLine'));
      fl.classList.toggle('hidden',!hasF);
      if(hasF){const k=clamp((g.world.filter===undefined?100:g.world.filter)/g.world.filterCap(),0,1);
        (this._fltF||(this._fltF=document.getElementById('fltFill'))).style.width=(k*100)+'%';
        fl.classList.toggle('low',k<0.28&&!!g.world.inPollen);}
    }
    let pr=null;
    if(g.world&&!g.cinematic.active){
      /* у фонаря подсказка — на нём самом (выбитая клавиша, мигающие ячейки), не текстом */
      if(g.world.nearRest)pr=null;
      else if(g.world.nearInter)pr=g.world.nearInter.prompt();
      else if(g.world.nearDoor){
        const nd=g.world.nearDoor,d=nd.d;
        if(nd.locked)pr=(d.reqMsg||d.msg||'ЗАБЛОКИРОВАНО');
        else if(d.latch&&d.latchHere&&!g.gs.flags[d.latch])pr='ОТОДВИНУТЬ ЗАСОВ';
        else if(d.down)pr='СПУСТИТЬСЯ';
        else if(d.elevator)pr='ЛИФТ';
        else pr='ВОЙТИ';  /* куда — написано на табличке над дверью */
      }
    }
    this.prompt(pr);
    /* подсказка клавиши — под то устройство, которым играют сейчас */
    {const pad=g.input.usingPad();if(this._pad!==pad){this._pad=pad;
      const k=document.querySelector('#prompt kbd'),c=document.querySelector('#caption .k b');
      if(k)k.textContent=pad?'Y':'E';if(c)c.textContent=pad?'A':'E';}}
  }
}
