"use strict";
/* ============================== ФИНАЛ ==============================
   Кульминация: курьер выходит из мира, которому сказали, что снаружи ничего нет. Длинная сцена без
   управления; темп дышит, камера не дёргается (все переходы фокуса — плавные веса, а не переключения),
   свет идёт от тёмного к белому. Ни одной склейки: акты перетекают через свет.
     I    ПЕЧАТЬ   — колесо идёт; створки расходятся; в зал медленно опускается дневной свет — и не жжёт.
                    Площадка колеса — лифт: на ней с самого начала видны швы и замки, сверху спускаются
                    тросы и защёлкиваются на углах настила. Курьер поднимает голову, прикрывается от света.
     II   ВЗЛЁТ    — настил с курьером уходит вверх, в столп; зал тонет внизу; всё белеет.
     III  ПОДЪЁМ   — шахта сквозь толщу: свинец → сталь → бетон → земля → корни. Слои не сменяются
                    кадром, а проходят мимо: глубина привязана к экранной строке, на границах — раскрытые
                    шлюзы. Без надписей на стенах. Свет сверху растёт до белого.
     IV   УТРО     — люк кенотафа, рассвет. Курьер щурится, смотрит вверх, идёт по траве, встаёт на колено,
                    трогает тёплую землю, открывает капсулу — лист медленно поднимается с ладоней, зависает
                    и уходит с ветром. Камера плавно провожает его и возвращается. Живой мир: трава под
                    ветром, цветы, бабочки, облака, птицы, руины старого мира под зеленью.
     V    НЕБО     — камера поднимается в небо; строки финала одна за другой.
     VI   ТИТРЫ    — затемнение; последняя мелодия (Music, стиль credits): каждая строка титров проявляется
                    на своём аккорде и гаснет вместе с ним (время берётся с часов звука). Потом — меню.
   Текст — в самом кадре (холст), с тенью и подложкой: читается на белом. Пропустить: держать E. */
const FIN_ASC=46;              /* длительность подъёма по шахте, с */
const SHAFT_D=200;             /* глубина шахты, м */
/* слои шахты сверху вниз: с какой глубины, цвета стенки (тень, свет) */
const SHAFT=[{d:0,a:'#241c12',b:'#4a3a22',k:'roots'},{d:24,a:'#2a1e14',b:'#4d3a28',k:'earth'},{d:64,a:'#3e3b35',b:'#77736a',k:'concrete'},
  {d:114,a:'#292d31',b:'#646a70',k:'steel'},{d:158,a:'#33363e',b:'#575c66',k:'lead'}];
/* титры: такт музыки = строка (CREDIT_BARS в js/core/music.js) */
function creditCards(gs){const b=!!gs.flags.broadcast_done;
  return [{n:'КЕНОТАФ',big:true},{k:'ИГРА',n:'АЛИХАНА КУАТОВА'},{k:'СЦЕНАРИЙ И МИР',n:'АЛИХАН КУАТОВ'},{k:'ГЕЙМДИЗАЙН И УРОВНИ',n:'АЛИХАН КУАТОВ'},
    {k:'ПРОГРАММИРОВАНИЕ',n:'АЛИХАН КУАТОВ'},{k:'ГРАФИКА И АНИМАЦИЯ',n:'АЛИХАН КУАТОВ'},{k:'МУЗЫКА И ЗВУК',n:'АЛИХАН КУАТОВ'},
    {k:'МЕХАНИЗМЫ, БОИ, СТРАЖИ',n:'АЛИХАН КУАТОВ'},{k:'ЦИЛИНДРОВ: '+(gs.lore||0)+' / '+LORE_TOTAL,n:b?'КОНЦОВКА «ПРАВДА»':'КОНЦОВКА «ДВЕРЬ»'},
    {n:'ЕМУ ВЕЛЕЛИ НЕ ЧИТАТЬ ПИСЕМ.'},{n:'СПАСИБО, ЧТО ПРОЧИТАЛИ.'},{k:'ИГРА АЛИХАНА КУАТОВА',n:'КЕНОТАФ',big:true,bars:2}];}
/* настил лифта Печати: плита с латунной кромкой, ферма снизу, две стойки с замками тросов; u — ед. на метр */
function finDeck(c,x,y,w,u,clamped){c.save();c.lineCap='round';
  c.strokeStyle='#2c2820';c.lineWidth=0.08*u;const n=Math.max(3,Math.round(w/(1.0*u))),b=y+0.95*u,x1=x+0.5*u,x2=x+w-0.5*u;
  c.beginPath();c.moveTo(x,y+0.3*u);c.lineTo(x1,b);c.lineTo(x2,b);c.lineTo(x+w,y+0.3*u);
  for(let i=0;i<n;i++){const a=x1+(x2-x1)*i/n,e=x1+(x2-x1)*(i+1)/n;c.moveTo(a,b);c.lineTo((a+e)/2,y+0.3*u);c.lineTo(e,b);}c.stroke();
  c.fillStyle='#2e2a22';c.fillRect(x,y,w,0.32*u);c.fillStyle='#c9a227';c.fillRect(x,y,w,0.07*u);
  c.fillStyle='rgba(0,0,0,.35)';for(let i=1;i<6;i++)c.fillRect(x+w*i/6,y+0.08*u,0.03*u,0.24*u);
  for(const px of [x+0.25*u,x+w-0.25*u]){c.fillStyle='#3a362c';c.fillRect(px-0.08*u,y-0.62*u,0.16*u,0.64*u);
    c.fillStyle=clamped?'#e8c96a':'#6d5416';c.fillRect(px-0.15*u,y-0.72*u,0.3*u,0.16*u);}
  c.restore();}
const mixHex=(a,b,k)=>{const A=hxc(a),B=hxc(b);return 'rgb('+Math.round(A[0]+(B[0]-A[0])*k)+','+Math.round(A[1]+(B[1]-A[1])*k)+','+Math.round(A[2]+(B[2]-A[2])*k)+')';};
class Finale{
  constructor(g){this.g=g;this.act=null;this.t=0;this.stage=0;this.lit=0;this.people=[];this.said={};this.skipT=0;this.nars=[];this.bars=0;
    this.si={mv:0,dnk:false,upk:false,get move(){return this.mv;},get dn(){return this.dnk;},get up(){return this.upk;},
      healHeld:false,jumpHeld:false,attackHeld:false,consume(){return false;},usingPad(){return false;}};}
  get active(){return !!this.act;}
  /* ---------- голос за кадром: строка в кадре, мягко проявляется и гаснет ---------- */
  /* строки идут очередью: каждая держится, пока её можно спокойно прочитать (по длине), и только
     потом уступает следующей; прежняя догорает, новая проявляется — без наслоения */
  say(text,key){if(key){if(this.said[key])return;this.said[key]=1;}if(text)(this.queue=this.queue||[]).push(text);}
  narStep(dt){for(const n of this.nars){n.t+=dt;if(n.out)n.out+=dt;}this.nars=this.nars.filter(n=>!(n.out>1.2));
    const q=this.queue||[];if(!q.length)return;const cur=this.nars.find(n=>!n.out);
    if(cur&&cur.t<cur.hold)return;
    if(cur)cur.out=0.001;const text=q.shift();
    this.nars.push({text,t:cur?-1.0:0,out:0,hold:Math.max(3.8,1.4+text.length*0.075)});
    this.g.audio.tone(392,1.2,'sine',0.006,0,this.g.audio.verb);}
  /* тишина: текущая строка гаснет; очередь — сбрасывается (новый акт) */
  hush(){for(const n of this.nars)if(!n.out)n.out=0.001;this.queue=[];}
  at(t0,key,text){if(this.t>=t0)this.say(text,key);}
  cine(on){document.getElementById('bars').classList.remove('on');this.g.hud.show(!on);const el=document.getElementById('nar');if(el)el.classList.remove('on');}
  pose(k){const p=this.g.world.player;if(p)p.cinePose=k||null;}
  /* камера: цель задаётся весами и догоняется мягко — без рывков между листом и курьером */
  camTo(x,y,z,dt,rate){const c=this.cam||(this.cam={x,y,z});const r=rate||1.2;c.x=damp(c.x,x,r,dt);c.y=damp(c.y,y,r,dt);c.z=damp(c.z,z,r*0.6,dt);
    const g=this.g;g.camera.focus={x:c.x,y:c.y};g.camera.tzoom=c.z;}
  /* ---------- I · ПЕЧАТЬ ---------- */
  startSeal(){const g=this.g;this.act='seal';this.t=0;this.stage=0;this.lit=0;this.said={};this.white=0;this.skipT=0;this.nars=[];this.queue=[];this.cam=null;this.cables=0;
    g.input.enabled=false;g.input.clearAll();g.hud.bossOff();g.scriptInput=this.si;this.si.mv=0;this.cine(true);
    g.audio.tone(55,6,'sawtooth',0.03,41,g.audio.verb);}
  boom(){const g=this.g;g.audio.explosion();g.audio.tone(60,1.6,'sine',0.06,38,g.audio.verb);g.camera.addShake(0.55);
    for(let i=0;i<46;i++)g.particles.spawn({kind:'debris',x:25+(Math.random()-0.5)*(6+this.stage*3),y:0.8,vx:(Math.random()-0.5)*3,vy:Math.random()*3,
      g:20,life:2.2,size:0.08+Math.random()*0.18,col:['#5a5e66','#7a7e86','#8a857a'][this.stage%3],rot:Math.random()*6,vr:(Math.random()-0.5)*8});
    for(let i=0;i<10;i++)g.particles.spawn({kind:'smoke',x:25+(Math.random()-0.5)*8,y:1.5,vx:(Math.random()-0.5)*1.4,vy:1,life:3,size:1.4,grow:1,col:'#3a3a3e',drag:0.8,a:0.45});}
  /* ---------- пропуск: держать E ---------- */
  skipCheck(dt){const g=this.g,held=g.input.k.KeyE||g.input.k.PadY;
    this.skipT=held?this.skipT+dt:Math.max(0,this.skipT-dt*2);
    if(this.skipT>=1.6){this.skipT=0;this.skip();}}
  skip(){const g=this.g;this.hush();this.white=0;
    if(this.act==='sky'||this.act==='credits'){this.finish();return;}
    if(g.world.room.id!=='z5_surface'){g.state='play';g.world.load('z5_surface',44,29-CFG.player.h);}
    const p=g.world.player;if(p){p.x=46.5;p.y=29-p.h;p.vx=0;p.cinePose=null;}
    g.camera.reset(48,22,0.6);this.cam=null;g.gs.flag('ending');g.ending();}
  /* ---------- общий шаг ---------- */
  update(dt){if(!this.act)return;this.t+=dt;const g=this.g,W=g.world,p=W.player,t=this.t,si=this.si;
    this.skipCheck(dt);if(!this.act)return;
    this.narStep(dt);if(p)p.cineSlow=this.act!=='credits';
    this.bars=damp(this.bars,this.act==='credits'?0:1,1.4,dt);
    const breathe=Math.sin(g.world.time*0.5)*0.016;
    if(this.act==='seal'){
      /* колесо медленно набирает ход; камера опускается к курьеру, вместе с ним поднимает взгляд */
      const m=(W.room.machines||[]).find(q=>q.kind==='sealwheel');if(m){m.turned=true;m.a=(m.a||0)+dt*(0.06+t*0.03);}
      this.camTo(25,lerp(16.5,12,EZ.io(clamp((t-11)/8,0,1))),lerp(0.74,0.6,EZ.io(clamp(t/7,0,1)))+breathe,dt,1.0);
      /* курьер сам проходит на середину настила (лифт будет поднимать его оттуда) — шагом, не прыжком */
      if(p){p.cineSlow=true;const dx=25-p.cx,go=t>3&&Math.abs(dx)>0.12;
        si.mv=go?Math.sign(dx):0;p.walkCap=1.1;if(!go&&p.onGround)p.vx*=0.8;
        this.pose(go||t<12?null:t<15.5?'lookUp':t<18.6?'shield':'lookUp');}
      if(Math.random()<dt*14)g.particles.spawn({kind:'dust',x:25+(Math.random()-0.5)*10,y:17+(Math.random()-0.5)*8,vx:0,vy:-0.3,life:2.4,size:0.06,col:'#cfc6b0',g:0});
      this.at(1.5,'s1','ЭТО КОЛЕСО НЕ ПОВОРАЧИВАЛИ ДВЕСТИ ЧЕТЫРНАДЦАТЬ ЛЕТ.');
      const marks=[4.5,7.0,9.5];if(this.stage<3&&t>=marks[this.stage]){this.stage++;this.boom();}
      this.at(10.6,'s2','ПЕЧАТЬ ЗАКРЫВАЛАСЬ НЕ СНАРУЖИ. ИЗНУТРИ.');
      if(this.stage===3&&t>=12.5){this.stage=4;g.audio.sky();}
      this.lit=clamp((t-12.5)/5.5,0,1);
      /* тросы лифта спускаются в столпе и защёлкиваются на углах настила */
      this.cables=EZ.io(clamp((t-13)/5.5,0,1));
      if(t>=18.6&&!this.clamped){this.clamped=true;g.audio.hitMetal();g.audio.tone(90,0.8,'square',0.02,60);g.camera.addShake(0.3);}
      this.at(15.6,'s3','СВЕТ.');
      this.at(18.2,'s4','ОН НЕ ЖЁГ.');
      if(this.lit>0&&Math.random()<dt*50)g.particles.spawn({kind:'dust',x:25+(Math.random()-0.5)*7*this.lit,y:2+Math.random()*26,vx:(Math.random()-0.5)*0.3,vy:0.3,life:2.6,size:0.05,col:'#fff6d8',add:true,a:0.8});
      if(t>=22){this.act='rise';this.t=0;this.riseY=p?p.y:20;this.hush();g.audio.tone(70,2.4,'sawtooth',0.02,90);}}
    else if(this.act==='rise'){
      /* настил с курьером уходит вверх; зал тонет внизу */
      const k=EZ.io(clamp(t/11,0,1));
      if(p){si.mv=0;p.y=lerp(this.riseY,-6,k);p.vx=0;p.vy=0;this.pose('lookUp');}
      this.camTo(25,(p?p.cy:10)-1.4,lerp(0.62,0.9,k)+breathe,dt,2.2);
      this.lit=1;this.white=clamp((t-8)/3,0,1);
      this.at(2.2,'r1','ВСЕ ЛИФТЫ АРКОЛОГИИ ХОДИЛИ ВНИЗ.');
      this.at(5.6,'r2','ЭТОТ — ВВЕРХ.');
      if(t>=11){this.act='ascent';this.t=0;g.state='finale';g.camera.focus=null;this.hush();this.motes=[];
        g.audio.tone(98,14,'sine',0.02,196,g.audio.verb);}}
    else if(this.act==='ascent'){
      if(Math.random()<dt*1.5)g.audio.tone(392+Math.random()*392,1.6,'sine',0.006,0,g.audio.verb);
      /* слой, мимо которого едет курьер, — своя строка: по глубине, а не по часам */
      const D=this.depthAt(t),LN=[[196,'a0','СВИНЕЦ ЛИЛИ ОТ ИЗЛУЧЕНИЯ. ИЗЛУЧЕНИЯ НЕ БЫЛО.'],[154,'a1','СТАЛЬ — ЧТОБЫ НИКТО НЕ ВОШЁЛ. И ЧТОБЫ НИКТО НЕ ВЫШЕЛ.'],
        [110,'a2','БЕТОН — ДЛЯ ВОПРОСОВ. ВОПРОСЫ ЗАЛИВАЛИ ГЛУБЖЕ ВСЕГО.'],[60,'a3','ЗЕМЛЯ НИЧЕГО НЕ ПРЯТАЛА. ОНА ПРОСТО ЖДАЛА.'],[21,'a4','КОРНИ ПРОРОСЛИ СКВОЗЬ ПЕЧАТЬ РАНЬШЕ НАС.']];
      if(t>2.2)for(const [d,k,s] of LN)if(D<d)this.say(s,k);
      if(t>=FIN_ASC-2.5)this.hush();
      if(t>=FIN_ASC){this.act='surface';this.t=0;g.state='play';this.hush();this.white=1;this.cam=null;this.kt=0;this.knelt=false;this.leaf=null;
        W.load('z5_surface',3.4,29-CFG.player.h);g.camera.reset(5,25,1.0);g.audio.sky();g.scriptInput=this.si;si.mv=0;this.cine(true);this.pose('shield');}}
    else if(this.act==='surface')this.surface(dt,p,breathe);
    else if(this.act==='sky')this.sky(dt,p,breathe);
    else if(this.act==='credits')this.credits(dt);
    if(this.leaf)this.leafStep(dt);
    if(W.room&&W.room.id==='z5_surface')this.lifeStep(dt);
  }
  /* ---------- IV · УТРО: сцена ведёт курьера сама ---------- */
  surface(dt,p,breathe){const g=this.g,t=this.t,si=this.si;if(!p)return;
    this.white=Math.max(0,1-t/4.5);
    const x=p.cx;si.dnk=false;si.upk=false;p.walkCap=1.8;
    /* камера: фокус — смесь «курьер» и «лист» с весом, который меняется медленно */
    const k=clamp((x-4)/40,0,1),L=this.leaf;
    const wantW=L&&L.t<12?1:0;this.wLeaf=damp(this.wLeaf||0,wantW,wantW?0.55:0.35,dt);
    const fx=x+lerp(1,6,EZ.io(k)),fy=p.cy-lerp(0.8,5.5,EZ.io(k));
    const lx=L?L.x:fx,ly=L?L.y:fy,w=EZ.io(this.wLeaf)*0.65;
    this.wNear=damp(this.wNear||0,this.kt>0&&!this.knelt?1:0,0.5,dt);
    this.camTo(lerp(fx,lx,w),lerp(fy,ly,w)+0.6*this.wNear,lerp(1.0,0.62,EZ.io(k))+breathe-0.1*w+0.32*this.wNear,dt,0.9);
    if(t<9){si.mv=0;this.pose(t<3.6?'shield':'lookUp');
      this.at(4.6,'u1','«СНАРУЖИ НИЧЕГО НЕТ» — ТАК ГОВОРИЛИ ДВЕСТИ ЛЕТ.');return;}
    this.at(10.5,'u2','ТРАВА.');
    this.at(13.2,'u3','ВЕТЕР.');
    this.at(15.8,'u4','ОБЛАКА ИДУТ, КУДА ХОТЯТ.');
    /* у первого куста: колено, ладонь на землю, капсула, лист */
    if(!this.knelt){if(x<15.5&&!this.kt){si.mv=1;this.pose(null);return;}
      si.mv=0;this.kt=(this.kt||0)+dt;const q=this.kt;
      this.pose(q<1.3?'kneel':q<4.2?'touch':q<9.4?'offer':'watch');
      if(q>1.7)this.say('ЗЕМЛЯ ТЁПЛАЯ.','u5');
      if(q>4.4&&!this.capOpen){this.capOpen=true;g.audio.tone(880,0.4,'sine',0.012,1320);g.audio.mat('brass',0.4);}
      if(q>4.9&&!this.leaf){const hx=p.cx+p.face*0.5,hy=p.bottom-0.98;
        this.leaf={x:hx,y:hy,x0:hx,y0:hy,vx:0,vy:0,t:0,a:0,s:0};g.audio.tone(660,3.2,'sine',0.01,990,g.audio.verb);}
      if(this.leaf&&this.leaf.t>4.4)this.say('ЛИСТ ИЗ КАПСУЛЫ ВОЗВРАЩАЕТСЯ ТУДА, ГДЕ ВЫРОС.','u6');
      if(q>14.5){this.knelt=true;this.pose(null);}
      return;}
    si.mv=1;
    if(x>24)this.say(g.gs.flags.broadcast_done?'ВНИЗУ УЖЕ ЧИТАЮТ ВСЛУХ.':'ВНИЗУ ВСЁ ЕЩЁ ЖДУТ ПИСЕМ.','u7');
    if(x>32)this.say('ЕМУ ВЕЛЕЛИ ВОЗИТЬ ПИСЬМА И НЕ ЧИТАТЬ ИХ.','u8');
    if(x>39.5)this.say('ОН ПРОЧИТАЛ.','u9');
  }
  /* лист: медленно растёт с ладоней, зависает, ветер набирает силу постепенно и уносит его */
  leafStep(dt){const L=this.leaf;L.t+=dt;L.a+=dt*(1.2+Math.sin(L.t*1.1)*0.8);
    if(L.t<2.8){const u=EZ.io(L.t/2.8);L.s=u;L.x=L.x0+Math.sin(L.t*1.4)*0.05;L.y=L.y0-0.6*u;}
    else if(L.t<4.4){L.s=1;L.x=L.x0+Math.sin(L.t*1.4)*0.08;L.y=L.y0-0.6-Math.sin((L.t-2.8)*2)*0.08;}
    else{const k=clamp((L.t-4.4)/3,0,1);L.vx=damp(L.vx,(2.0+Math.sin(L.t*0.9)*1.0)*k,0.7,dt);L.vy=damp(L.vy,(-1.4+Math.sin(L.t*1.7)*0.8)*k,0.7,dt);L.x+=L.vx*dt;L.y+=L.vy*dt;}
    if(L.t>18)this.leaf=null;}
  /* живой мир поверхности: бабочки, семена, облака */
  lifeStep(dt){const l=this.life||(this.life={bf:[],seeds:[],clouds:[]});const W=this.g.world;
    if(!l.init){l.init=true;for(let i=0;i<5;i++)l.bf.push({x:6+i*9+Math.random()*4,y:26+Math.random()*2,ph:Math.random()*6,col:['#f2d27a','#e8e8f0','#d88a6a','#9fd0f0','#f0b0c8'][i]});
      for(let i=0;i<7;i++)l.clouds.push({x:Math.random()*90-10,y:2+Math.random()*9,s:3+Math.random()*5,v:0.25+Math.random()*0.35});}
    for(const b of l.bf){b.ph+=dt;b.x+=Math.sin(b.ph*0.7)*dt*1.2+dt*0.4;b.y+=Math.cos(b.ph*1.3)*dt*0.9;b.y=clamp(b.y,22,28.4);if(b.x>66)b.x=-2;}
    for(const c of l.clouds){c.x+=c.v*dt;if(c.x>80)c.x=-20;}
    if(Math.random()<dt*6)l.seeds.push({x:Math.random()*64,y:29,vx:0.6+Math.random()*0.8,vy:-0.4-Math.random()*0.6,t:0});
    for(const s of l.seeds){s.t+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=Math.sin(s.t*2)*dt*0.2;}l.seeds=l.seeds.filter(s=>s.t<9);}
  /* ---------- V · НЕБО: строки финала ---------- */
  startSky(lines){const g=this.g,p=g.world.player;this.act='sky';this.t=0;this.lines=lines||[];this.people=[];this.white=0;this.black=0;this.nars=[];
    g.input.enabled=false;g.input.clearAll();g.scriptInput=null;if(p){p.walkCap=0;p.cinePose='lookUp';}this.cine(true);
    this.sx=p?p.cx+4:46;this.sy=p?p.cy-4:22;this.endT=undefined;}
  sky(dt,p,breathe){const g=this.g,t=this.t,k=EZ.io(clamp(t/14,0,1));if(p){p.vx=0;}
    this.camTo(this.sx+4*k,this.sy-10*k,0.6-0.1*k+breathe,dt,0.8);
    /* концовка B: из люка выходят обитатели ярусов — по одному */
    if(g.gs.flags.broadcast_done&&t>2.5&&this.people.length<9&&t>2.5+this.people.length*1.1)
      this.people.push({x:3.4,t:0,h:1.45+Math.random()*0.35,sp:1.1+Math.random()*0.5,kid:Math.random()<0.25});
    for(const q of this.people){q.t+=dt;q.x+=q.sp*dt*Math.max(0,1-q.x/40);}
    const L=this.lines;if(t>2)for(let i=0;i<L.length;i++)this.say(L[i],'e'+i);
    /* конец — когда последняя строка дочитана, а не по часам */
    const cur=this.nars.find(n=>!n.out);
    if(this.endT===undefined&&t>3&&!(this.queue||[]).length&&(!cur||cur.t>=cur.hold+0.8)){this.endT=t;this.hush();}
    const end=this.endT===undefined?1e9:this.endT+0.8;
    this.black=clamp((t-end)/4,0,1);
    if(t>=end+4){this.act='credits';this.t=0;this.cards=creditCards(g.gs);this.crT0=null;}}
  /* ---------- VI · ТИТРЫ: строки на аккордах последней мелодии ---------- */
  creditTiming(){const M=this.g.audio.music,S=STYLES.credits,BAR=60/S.bpm*4;
    const live=M&&M.ctx&&M.ctx.state==='running',own=this.crT0!==null&&this.crT0!==undefined;
    if(!own&&live&&M.style==='credits'&&M.crT&&M.crT[0]!==undefined)return {now:M.ctx.currentTime,t0:M.crT[0],BAR,sync:true};
    /* мелодия вступает на границе такта предыдущей темы — ждём её; звука нет — свои часы */
    if(!own&&live&&this.t<10)return {now:0,t0:1e9,BAR};
    if(!own)this.crT0=this.t+0.6;
    return {now:this.t,t0:this.crT0,BAR};}
  credits(dt){const T=this.creditTiming(),total=13;this.black=1;
    if(T.now>T.t0+total*T.BAR+1.2)this.finish();}
  /* весь текст финала — строки неба и титры (для проверок) */
  endText(){return (this.lines||[]).join('\n')+'\n'+this.creditText();}
  creditText(){return (this.cards||creditCards(this.g.gs)).map(c=>(c.k?c.k+' ':'')+c.n).join('\n');}
  finish(){const g=this.g;this.end();g.toMenuState();}
  /* ---------- рисунок в мировых координатах ---------- */
  drawWorld(c,t){const g=this.g,R=g.world.room;if(!R)return;
    if(this.act==='seal'||this.act==='rise'){
      /* створки под сводом расходятся: свинец, сталь, бетон */
      const cols=['#4a4e56','#6a6e74','#7a766c'],T=this.act==='rise'?99:this.t;
      for(let i=0;i<3;i++){const open=i<this.stage||this.act==='rise'?EZ.out(clamp((T-[4.5,7,9.5][i])/1.8,0,1)):0,gap=open*(3.2+i*1.6);
        for(const s of [-1,1]){const x0=25+s*gap,w=12;c.fillStyle=cols[i];c.fillRect(s<0?x0-w:x0,0.2+i*0.35,w,0.5);
          c.fillStyle='rgba(0,0,0,.4)';c.fillRect(s<0?x0-0.2:x0,0.2+i*0.35,0.2,0.5);}}
      if(this.lit>0){c.save();c.globalCompositeOperation='lighter';
        const w0=3.2*this.lit+0.4,w1=9*this.lit+1,g2=c.createLinearGradient(0,-8,0,R.h);
        g2.addColorStop(0,'rgba(255,248,224,'+(0.7*this.lit)+')');g2.addColorStop(1,'rgba(255,240,200,'+(0.16*this.lit)+')');
        c.fillStyle=g2;c.beginPath();c.moveTo(25-w0,-8);c.lineTo(25+w0,-8);c.lineTo(25+w1,R.h);c.lineTo(25-w1,R.h);c.closePath();c.fill();c.restore();
        g.renderer.glowAdd(25,6,10*this.lit+2,'#fff6d8',0.7*this.lit);}
      /* лифт Печати: настил — часть площадки колеса с самого начала (швы, замки); тросы спускаются сверху */
      const p=g.world.player,dy=this.act==='rise'&&p?p.bottom:21.6,x0=22,w=6;
      /* настил ушёл — в площадке остаётся проём */
      if(this.act==='rise'){c.fillStyle='rgba(12,10,8,.92)';c.fillRect(x0,21.6,w,0.4);}
      finDeck(c,x0,dy,w,1,this.clamped);
      const cab=this.act==='rise'?1:(this.cables||0);
      if(cab>0){const top=-10,bot=lerp(top,dy-0.72,cab);c.strokeStyle='#1a1a1c';c.lineWidth=0.08;
        for(const xx of [x0+0.25,x0+w-0.25]){c.beginPath();c.moveTo(xx,top);c.lineTo(xx,bot);c.stroke();c.fillStyle='#8a8f94';c.fillRect(xx-0.12,bot-0.2,0.24,0.2);}}
      /* курьер — поверх столпа: свет обнимает фигуру, а не стирает её */
      if(p&&this.lit>0.15){try{p.draw(c,t);}catch(e){}}}
    if(R.id==='z5_surface')this.drawSurface(c,t);
    /* лист из капсулы — живой, зелёный; растёт с ладоней */
    if(this.leaf){const L=this.leaf,a=clamp(L.t/1.2,0,1)*clamp((18-L.t)/3,0,1),sc=(0.25+0.75*L.s)*1.7;c.save();c.translate(L.x,L.y);c.rotate(Math.sin(L.a)*0.7);c.scale(sc,sc*(0.6+0.4*Math.cos(L.a*0.7)));
      c.globalAlpha=a;c.fillStyle='#5f9a3a';c.beginPath();c.moveTo(-0.28,0);c.quadraticCurveTo(0,-0.2,0.28,0);c.quadraticCurveTo(0,0.2,-0.28,0);c.fill();
      c.strokeStyle='#3a6a22';c.lineWidth=0.025;c.beginPath();c.moveTo(-0.3,0);c.lineTo(0.26,0);c.stroke();c.restore();
      g.renderer.glowAdd(L.x,L.y,1.4,'#e8ffc0',0.5*a);}
    /* капсула в ладонях: латунный цилиндр, крышка отошла */
    if(this.act==='surface'&&this.kt>3.6&&!this.knelt){const p=g.world.player;if(p){const hx=p.cx+p.face*0.5,hy=p.bottom-0.92,o=clamp((this.kt-4.4)/0.6,0,1);
      c.save();c.translate(hx,hy);c.rotate(-0.4*p.face);c.fillStyle='#b08d3e';rr(c,-0.14,-0.06,0.28,0.12,0.05);c.fill();
      c.fillStyle='#e8c96a';rr(c,0.1+o*0.12,-0.07-o*0.05,0.08,0.14,0.03);c.fill();c.restore();
      if(o>0)g.renderer.glowAdd(hx,hy,0.6,'#ffe6a3',0.3*o*clamp((9-this.kt)/2,0,1));}}
  }
  /* поверхность: облака, свет солнца, трава под ветром, цветы, бабочки, семена; руины старого мира — в mid-слое */
  drawSurface(c,t){const g=this.g,l=this.life;const k=this.act==='sky'||this.act==='credits'?1:clamp(this.t/40,0,1),sx=54,sy=lerp(24,10,EZ.out(k));
    /* облака плывут: те же пухлые, с освещённым боком (js/render/surface.js) */
    if(l)for(let i=0;i<l.clouds.length;i++){const cl=l.clouds[i];c.globalAlpha=0.85;SurfaceArt.cloud(c,cl.x,cl.y,cl.s*0.8,rng('cl'+i));c.globalAlpha=1;}
    c.save();c.globalCompositeOperation='lighter';
    const sg=c.createRadialGradient(sx,sy,0,sx,sy,18);sg.addColorStop(0,'rgba(255,236,190,.55)');sg.addColorStop(0.12,'rgba(255,214,150,.22)');sg.addColorStop(1,'rgba(255,190,120,0)');
    c.fillStyle=sg;c.fillRect(sx-18,sy-18,36,36);
    c.fillStyle='rgba(255,248,226,.9)';c.beginPath();c.arc(sx,sy,1.2,0,TAU);c.fill();
    for(let i=0;i<7;i++){const a=PI+0.25+i*0.18+Math.sin(t*0.2+i)*0.03,L=26;c.fillStyle='rgba(255,230,180,.045)';c.beginPath();c.moveTo(sx,sy);
      c.lineTo(sx+Math.cos(a-0.035)*L,sy+Math.sin(a-0.035)*L*-0.6+L*0.5);c.lineTo(sx+Math.cos(a+0.035)*L,sy+Math.sin(a+0.035)*L*-0.6+L*0.5);c.closePath();c.fill();}
    if(l)for(const s of l.seeds){c.fillStyle='rgba(255,250,230,'+(0.6*clamp((9-s.t)/2,0,1))+')';c.beginPath();c.arc(s.x,s.y,0.05,0,TAU);c.fill();}
    c.restore();g.renderer.glowAdd(sx,sy,9,'#ffe2a8',0.5);
    /* передний план: трава под ветром — волна идёт по полю */
    /* передний план: травинки — сужающиеся, в два тона, освещённая сторона светлее; по полю идёт волна ветра */
    for(let i=0;i<300;i++){const x=-0.5+i*0.22+((i*7.31)%1)*0.12,hh=0.3+((i*3.7)%1)*0.55,w=(Math.sin(t*1.6+x*0.35)*0.18+Math.sin(t*0.7+x*0.11)*0.1)*hh*1.6;
      const G=SURF.grass[i%4],bw=0.035+((i*1.3)%1)*0.025;c.fillStyle=G;c.beginPath();c.moveTo(x-bw,29.06);c.quadraticCurveTo(x+w*0.4-bw*0.5,29-hh*0.5,x+w,29-hh);c.quadraticCurveTo(x+w*0.4+bw*0.5,29-hh*0.5,x+bw,29.06);c.fill();
      if(i%3===0){c.strokeStyle='rgba(200,230,140,.45)';c.lineWidth=0.012;c.beginPath();c.moveTo(x+bw*0.5,29);c.quadraticCurveTo(x+w*0.4+bw*0.3,29-hh*0.5,x+w,29-hh);c.stroke();}}
    /* цветы качаются вместе с травой */
    const FC=['#f2d27a','#ece8f2','#d8806a','#c8a0e0','#9fd0f0'];
    for(let i=0;i<26;i++){const x=1+i*2.43+((i*5.1)%1)*1.2,sw=Math.sin(t*1.6+x*0.35)*0.16+Math.sin(t*0.7+x*0.11)*0.08;
      c.save();c.translate(x,29.05);c.rotate(sw);SurfaceArt.flower(c,0,0,0.12,FC[i%FC.length],rng('fl'+i));c.restore();}
    /* бабочки: две пары крыльев с каймой и пятном, тельце; крылья складываются в такт */
    if(l)for(const b of l.bf){const f=0.25+Math.abs(Math.sin(b.ph*12))*0.75,s=0.13;c.save();c.translate(b.x,b.y);
      for(const sd of [-1,1]){c.save();c.scale(sd*f,1);
        c.fillStyle=b.col;c.beginPath();c.ellipse(s*0.75,-s*0.35,s*0.8,s*0.55,-0.5,0,TAU);c.fill();c.beginPath();c.ellipse(s*0.55,s*0.35,s*0.5,s*0.42,0.5,0,TAU);c.fill();
        c.strokeStyle='rgba(40,30,20,.55)';c.lineWidth=0.014;c.beginPath();c.ellipse(s*0.75,-s*0.35,s*0.8,s*0.55,-0.5,0,TAU);c.stroke();
        c.fillStyle='rgba(40,30,20,.5)';c.beginPath();c.arc(s*1.0,-s*0.45,s*0.16,0,TAU);c.fill();c.restore();}
      c.strokeStyle='#2a2018';c.lineWidth=0.03;c.beginPath();c.moveTo(0,-s*0.5);c.lineTo(0,s*0.5);c.stroke();
      c.lineWidth=0.01;c.beginPath();c.moveTo(0,-s*0.5);c.lineTo(-s*0.3,-s*0.9);c.moveTo(0,-s*0.5);c.lineTo(s*0.3,-s*0.9);c.stroke();c.restore();}
    /* обитатели ярусов выходят из люка (концовка B) — силуэты механизмов */
    for(const q of this.people){const x=q.x,y=29,h=q.kid?q.h*0.65:q.h,ph=q.t*6,bob=Math.abs(Math.sin(ph))*h*0.02;
      /* ноги-шатуны, корпус-котёл с заклёпками, голова-колпак с фонарём: жилец яруса */
      c.strokeStyle='#2c2a24';c.lineWidth=h*0.07;c.lineCap='round';c.beginPath();c.moveTo(x,y-h*0.42);c.lineTo(x+Math.sin(ph)*h*0.16,y);c.moveTo(x,y-h*0.42);c.lineTo(x-Math.sin(ph)*h*0.16,y);c.stroke();
      c.fillStyle=MK.plateGrad(c,'iron',x-h*0.15,y-h*0.88,h*0.3,h*0.5);rr(c,x-h*0.15,y-h*0.88-bob,h*0.3,h*0.5,h*0.07);c.fill();
      c.fillStyle='rgba(255,236,200,.18)';c.fillRect(x-h*0.13,y-h*0.86-bob,h*0.26,h*0.03);
      for(let k=0;k<3;k++)MK.bolt(c,x-h*0.09+k*h*0.09,y-h*0.8-bob,h*0.018,'brass');
      c.fillStyle=MK.plateGrad(c,'brass',x-h*0.1,y-h*1.06,h*0.2,h*0.18);rr(c,x-h*0.1,y-h*1.06-bob,h*0.2,h*0.18,h*0.06);c.fill();
      c.fillStyle='rgba(255,207,122,.95)';c.beginPath();c.arc(x+h*0.04,y-h*0.98-bob,h*0.035,0,TAU);c.fill();
      g.renderer.glowAdd(x+h*0.04,y-h*0.98,0.5,'#ffcf7a',0.25);}}
  /* ---------- поверх кадра: голос, шторки, белое, тёмное, титры ---------- */
  drawOverlay(c){const g=this.g,W=g.vw,H=g.vh;c.setTransform(1,0,0,1,0,0);
    if(this.act==='surface'||this.act==='sky'){const k=this.act==='sky'?1:clamp(this.t/30,0,1),gr=c.createLinearGradient(W,H*0.3,0,H);
      gr.addColorStop(0,'rgba(255,196,130,'+(0.16*k)+')');gr.addColorStop(1,'rgba(255,196,130,0)');c.fillStyle=gr;c.fillRect(0,0,W,H);}
    if(this.white){c.fillStyle='rgba(255,252,240,'+clamp(this.white,0,1)+')';c.fillRect(0,0,W,H);}
    if(this.black){c.fillStyle='rgba(0,0,0,'+clamp(this.black,0,1)+')';c.fillRect(0,0,W,H);}
    this.drawBars(c,W,H);this.drawNar(c,W,H);
    if(this.act==='credits')this.drawCredits(c,W,H);
    this.drawSkip(c,W,H);}
  drawBars(c,W,H){const h=H*0.095*clamp(this.bars,0,1);if(h<0.5)return;c.fillStyle='#000';c.fillRect(0,0,W,h);c.fillRect(0,H-h,W,h);}
  /* строка голоса: тень и мягкая подложка — читается и на белом, и на рассвете */
  drawNar(c,W,H){if(!this.nars.length)return;const fs=Math.round(H*0.028),y=(this.act==='surface'||this.act==='sky')?H*0.2:H*0.8;
    c.save();c.textAlign='center';c.textBaseline='middle';c.font='300 '+fs+'px Oswald';try{c.letterSpacing=Math.round(fs*0.18)+'px';}catch(e){}
    for(const n of this.nars){const a=clamp(n.t/1.0,0,1)*(n.out?clamp(1-n.out/1.0,0,1):1);if(a<=0)continue;
      const tw=c.measureText(n.text).width;
      const rx=tw/2+fs*3,ry=fs*1.7;c.save();c.translate(W/2,y);c.scale(rx/ry,1);
      const bg=c.createRadialGradient(0,0,0,0,0,ry);bg.addColorStop(0,'rgba(8,6,4,'+(0.55*a)+')');bg.addColorStop(0.6,'rgba(8,6,4,'+(0.4*a)+')');bg.addColorStop(1,'rgba(8,6,4,0)');
      c.fillStyle=bg;c.fillRect(-ry,-ry,ry*2,ry*2);c.restore();
      c.shadowColor='rgba(0,0,0,'+(0.9*a)+')';c.shadowBlur=fs*0.6;c.fillStyle='rgba(246,238,220,'+a+')';c.fillText(n.text,W/2,y+(1-clamp(n.t/1.0,0,1))*4);c.shadowBlur=0;}
    c.restore();}
  drawSkip(c,W,H){if(this.skipT<0.15)return;c.save();c.textAlign='center';c.font='400 '+Math.round(H*0.016)+'px Oswald';c.fillStyle='rgba(232,224,208,.7)';
    c.fillText('ДЕРЖИ E — ПРОПУСТИТЬ',W/2,H*0.955);
    /* сколько осталось держать — тонкая полоска под надписью, не проценты */
    const bw=H*0.16,k=clamp(this.skipT/1.6,0,1);c.fillStyle='rgba(232,224,208,.18)';c.fillRect(W/2-bw/2,H*0.968,bw,Math.max(1,H*0.002));
    c.fillStyle='rgba(232,201,106,.8)';c.fillRect(W/2-bw/2,H*0.968,bw*k,Math.max(1,H*0.002));c.restore();}
  /* титры: в стиле «игры автора» — слово проявляется на аккорде и гаснет вместе с ним */
  drawCredits(c,W,H){const T=this.creditTiming(),cards=this.cards||[];let bar=0;
    c.save();c.textAlign='center';c.textBaseline='middle';
    for(let i=0;i<cards.length;i++){const C=cards[i],nb=C.bars||1,s=T.t0+bar*T.BAR,e=s+nb*T.BAR;bar+=nb;
      const a=clamp((T.now-s-0.12)/0.7,0,1)*clamp((e-0.35-T.now)/1.25,0,1);if(a<=0)continue;
      const big=C.big,fs=Math.round(H*(big?0.07:0.042)),ks=Math.round(H*0.017),dy=(1-a)*6;
      if(C.k){c.font='400 '+ks+'px Oswald';try{c.letterSpacing=Math.round(ks*0.5)+'px';}catch(e2){}c.fillStyle='rgba(201,162,39,'+(0.85*a)+')';
        c.fillText(C.k,W/2,H*0.5-fs*(big?0.95:1.1)-dy);}
      c.font=(big?'300 ':'300 ')+fs+'px Oswald';try{c.letterSpacing=Math.round(fs*(big?0.45:0.2))+'px';}catch(e2){}
      c.shadowColor='rgba(255,236,190,'+(0.35*a)+')';c.shadowBlur=fs*0.4;c.fillStyle='rgba(242,236,222,'+a+')';c.fillText(C.n,W/2,H*0.5-dy);c.shadowBlur=0;}
    c.restore();}
  /* ---------- III · ПОДЪЁМ: целиком свой кадр ---------- */
  depthAt(t){return SHAFT_D*(1-EZ.io(clamp(t/FIN_ASC,0,1)));}
  /* слой на глубине d: цвета двух соседних слоёв смешиваются на границе (±6 м) */
  layerMix(d){let i=0;while(i<SHAFT.length-1&&d>=SHAFT[i+1].d)i++;
    const A=SHAFT[i],B=SHAFT[Math.min(i+1,SHAFT.length-1)],up=SHAFT[Math.max(i-1,0)];
    let k=0,other=A;if(B!==A&&d>B.d-6){k=clamp((d-(B.d-6))/12,0,0.5);other=B;}else if(up!==A&&d<A.d+6){k=clamp(((A.d+6)-d)/12,0,0.5);other=up;}
    return {A,O:other,k};}
  drawScreen(c,dt){const g=this.g,W=g.vw,H=g.vh,t=this.t,s=H/18,p=g.world.player;
    c.setTransform(1,0,0,1,0,0);
    const D=this.depthAt(t),py=H*0.66,light=1-D/SHAFT_D,wall=W*0.3;
    c.fillStyle='#07070a';c.fillRect(0,0,W,H);
    /* столп света сверху: с каждым метром сильнее */
    {const cg=c.createLinearGradient(0,0,0,H);cg.addColorStop(0,'rgba(140,122,94,'+(0.28+0.5*light)+')');cg.addColorStop(1,'rgba(22,18,14,.6)');c.fillStyle=cg;c.fillRect(wall,0,W-wall*2,H);}
    /* стенки: глубина — у каждой экранной строки своя, слои проходят мимо, а не сменяются кадром */
    const step=4,rows=[];for(let y=0;y<H;y+=step){const d=D+(y-py)/s,m=this.layerMix(d);rows.push({y,d,m});
      const cA=mixHex(m.A.a,m.O.a,m.k),cB=mixHex(m.A.b,m.O.b,m.k);
      /* стенка темнее столпа света; светлеет только грань, обращённая к столпу (тон: свет — в центре кадра) */
      {const q=(h1,h2)=>{const X=hxc(h1),Y2=hxc(h2);return [0,1,2].map(i=>X[i]+(Y2[i]-X[i])*0.42);},P=q(m.A.a,m.A.b),Q=q(m.O.a,m.O.b);c.fillStyle='rgb('+[0,1,2].map(i=>Math.round(P[i]+(Q[i]-P[i])*m.k)).join(',')+')';}c.fillRect(0,y,wall,step+1);c.fillRect(W-wall,y,wall,step+1);
      c.fillStyle=cB;c.globalAlpha=0.55;c.fillRect(wall*0.86,y,wall*0.14,step+1);c.fillRect(W-wall,y,wall*0.14,step+1);c.globalAlpha=1;}
    /* тень к краям шахты */
    for(const side of [0,1]){const gg=c.createLinearGradient(side?W-wall:0,0,side?W:wall,0);gg.addColorStop(side?1:0,'rgba(0,0,0,.55)');gg.addColorStop(side?0:1,'rgba(0,0,0,0)');c.fillStyle=gg;c.fillRect(side?W-wall:0,0,wall,H);}
    const dTop=D-py/s-2,dBot=D+(H-py)/s+2,Y=d=>py+(d-D)*s;
    const wOf=(d,k)=>{const m=this.layerMix(d);return (m.A.k===k?1-m.k:0)+(m.O.k===k&&m.O!==m.A?m.k:0);};
    c.save();
    /* детали слоёв: привязаны к глубине (едут вместе со стеной) и проявляются по весу слоя */
    for(let d=Math.floor(dTop/1.2)*1.2;d<dBot;d+=1.2){const y=Y(d),r=((d*7.13)%1+1)%1;
      let w=wOf(d,'lead');if(w>0&&Math.round(d/1.2)%2===0){c.globalAlpha=w*0.7;c.fillStyle='#c8ced6';for(let k=0;k<5;k++){c.beginPath();c.arc((k+0.5)*wall/5,y,0.06*s,0,TAU);c.arc(W-wall+(k+0.5)*wall/5,y,0.06*s,0,TAU);c.fill();}}
      w=wOf(d,'steel');if(w>0&&Math.round(d/1.2)%4===0){c.globalAlpha=w;c.fillStyle='#202428';c.fillRect(0,y,wall,0.42*s);c.fillRect(W-wall,y,wall,0.42*s);c.fillStyle='#50565c';c.fillRect(0,y,wall,0.07*s);c.fillRect(W-wall,y,wall,0.07*s);}
      w=wOf(d,'concrete');if(w>0){c.globalAlpha=w*0.5;c.strokeStyle='rgba(20,20,18,.8)';c.lineWidth=0.03*s;if(Math.round(d/1.2)%3===0){c.beginPath();c.moveTo(0,y);c.lineTo(wall,y);c.moveTo(W-wall,y);c.lineTo(W,y);c.stroke();}
        if(r<0.3){const xx=r*wall*3;c.beginPath();c.moveTo(xx,y);c.lineTo(xx+0.5*s,y+0.4*s);c.lineTo(xx+0.3*s,y+0.9*s);c.stroke();}
        if(r>0.82){c.strokeStyle='rgba(130,70,40,.6)';c.lineWidth=0.05*s;c.beginPath();c.moveTo(W-wall*r,y);c.lineTo(W-wall*r+0.8*s,y+0.2*s);c.stroke();}}
      w=wOf(d,'earth')+wOf(d,'roots');if(w>0){c.globalAlpha=w*0.85;c.fillStyle=['#6a5a44','#4a3e30','#7a6a52'][(r*3)|0];
        c.beginPath();c.ellipse(r*wall,y,0.24*s,0.15*s,r*3,0,TAU);c.fill();c.beginPath();c.ellipse(W-wall*((r*1.7)%1),y+0.5*s,0.2*s,0.13*s,r,0,TAU);c.fill();}
      w=wOf(d,'roots');if(w>0&&r<0.5){c.globalAlpha=w*0.8;c.strokeStyle='rgba(150,118,74,.85)';c.lineWidth=(0.05+r*0.12)*s;
        const side=r<0.25;c.beginPath();c.moveTo(side?0:W,y);c.quadraticCurveTo(side?wall*0.7:W-wall*0.7,y+1.2*s,side?wall:W-wall,y+2.6*s);c.stroke();
        c.strokeStyle='rgba(120,170,80,.6)';c.lineWidth=0.04*s;if(r<0.12){c.beginPath();c.moveTo(side?wall:W-wall,y+2.6*s);c.lineTo((side?wall:W-wall)+(side?0.4:-0.4)*s,y+2.2*s);c.stroke();}}}
    c.globalAlpha=1;
    /* кабельные трассы вдоль стен (в бетоне, стали, свинце): вертикали на скорости подъёма — движение вверх читается,
       хомуты едут со стеной; отметки глубины по трафарету — курьер видит, сколько осталось */
    for(let d=Math.floor(dTop/3)*3;d<dBot;d+=3){const y=Y(d),wM=1-wOf(d,'earth')-wOf(d,'roots');if(wM<=0.02)continue;c.globalAlpha=wM;
      for(const x of [wall*0.3,wall*0.36,W-wall*0.33]){c.fillStyle='#16181b';c.fillRect(x-0.05*s,y,0.1*s,3*s+1);c.fillStyle='#3a3e44';c.fillRect(x-0.1*s,y,0.2*s,0.12*s);}}
    c.globalAlpha=1;c.font='600 '+(0.55*s).toFixed(1)+'px Oswald';c.textAlign='left';c.textBaseline='middle';
    for(let d=Math.ceil(dTop/10)*10;d<dBot;d+=10){if(d<=0)continue;const y=Y(d);c.fillStyle='rgba(225,214,190,.28)';c.fillText('−'+d+' М',wall*0.48,y);
      c.fillStyle='rgba(225,214,190,.18)';c.fillRect(wall*0.42,y-0.02*s,wall*0.05,0.04*s);}
    /* раскрытые шлюзы на границах слоёв: фланец через всю шахту, створки отведены к стенам */
    for(const L of SHAFT){if(L.d<=0)continue;const y=Y(L.d);if(y<-2*s||y>H+2*s)continue;
      c.fillStyle='#1c1e22';c.fillRect(0,y-0.3*s,W,0.6*s);c.fillStyle='rgba(0,0,0,.8)';c.fillRect(wall,y-0.3*s,W-wall*2,0.6*s);
      c.fillStyle='#5a6068';c.fillRect(0,y-0.3*s,wall,0.08*s);c.fillRect(W-wall,y-0.3*s,wall,0.08*s);
      c.fillStyle='#8a6d2a';for(let k=0;k<6;k++){c.beginPath();c.arc((k+0.5)*wall/6,y,0.07*s,0,TAU);c.arc(W-wall+(k+0.5)*wall/6,y,0.07*s,0,TAU);c.fill();}
      c.fillStyle='#2e3236';for(const side of [0,1]){c.save();c.translate(side?W-wall:wall,y);c.rotate(side?0.9:-0.9);c.fillRect(side?-1.6*s:0,-0.12*s,1.6*s,0.24*s);c.restore();}}
    /* лампы в клетках: тёплые пятна, тоже едут со стеной */
    for(let d=Math.floor(dTop/15)*15;d<dBot;d+=15){const y=Y(d),side=((d/15)|0)%2,lx=side?W-wall+0.5*s:wall-0.5*s;
      c.fillStyle='#2a2418';c.fillRect(lx-0.15*s,y-0.1*s,0.3*s,0.2*s);
      const lg2=c.createRadialGradient(lx,y,0,lx,y,1.8*s);lg2.addColorStop(0,'rgba(255,200,120,.5)');lg2.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=lg2;c.beginPath();c.arc(lx,y,1.8*s,0,TAU);c.fill();}
    c.restore();
    /* пылинки в столпе: поднимаются вместе с курьером, только медленнее */
    const mo=this.motes||(this.motes=[]);if(mo.length<60)mo.push({x:wall+Math.random()*(W-wall*2),y:H+10,v:20+Math.random()*50,a:Math.random()});
    for(const m of mo){m.y-=m.v*(dt||1/60);m.x+=Math.sin(m.y*0.02+m.a*6)*0.3;if(m.y<-10){m.y=H+10;m.x=wall+Math.random()*(W-wall*2);}
      c.fillStyle='rgba(255,246,220,'+(0.15+0.35*light)*m.a+')';c.fillRect(m.x,m.y,2,2);}
    /* свет сверху: темнота медленно сдаётся */
    const lg=c.createLinearGradient(0,0,0,H);lg.addColorStop(0,'rgba(255,248,224,'+(0.1+0.85*light*light)+')');lg.addColorStop(0.6,'rgba(255,240,200,'+(0.1*light)+')');lg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=lg;c.fillRect(wall,0,W-wall*2,H);
    /* настил лифта и тросы: тот же, что поднимался из зала */
    const sway=Math.sin(t*0.7)*0.06*s,dw=6*s,dx=W/2-dw/2+sway;finDeck(c,dx,py,dw,s,true);
    c.strokeStyle='#1a1a1c';c.lineWidth=0.08*s;for(const x of [dx+0.25*s,dx+dw-0.25*s]){c.beginPath();c.moveTo(x,py-0.72*s);c.lineTo(x-sway,0);c.stroke();}
    if(p){p.lookV=-1;p.vx=0;p.vy=0;p.onGround=true;p.face=1;p.state='idle';p.atkPhase=null;p.slashT=0;p.cinePose='lookUp';
      c.setTransform(s,0,0,s,W/2+sway-p.cx*s,py-p.bottom*s);try{p.updateScarf&&p.updateScarf(dt||1/60);p.draw(c,t);}catch(e){}c.setTransform(1,0,0,1,0,0);}
    /* из белого — в шахту; у самого верха — снова в белое (там утро) */
    const wa=Math.max(clamp(1-t/2.8,0,1),clamp((t-(FIN_ASC-3.5))/3.5,0,1));
    if(wa>0){c.fillStyle='rgba(255,252,240,'+wa+')';c.fillRect(0,0,W,H);}
    this.drawBars(c,W,H);this.drawNar(c,W,H);this.drawSkip(c,W,H);}
  end(){this.act=null;this.t=0;this.people=[];this.leaf=null;this.knelt=false;this.kt=0;this.white=0;this.black=0;this.nars=[];this.cam=null;this.capOpen=false;this.clamped=false;this.life=null;this.wLeaf=0;this.wNear=0;
    const g=this.g;g.camera.focus=null;g.scriptInput=null;
    if(g.world&&g.world.player){g.world.player.walkCap=0;g.world.player.cinePose=null;g.world.player.cineSlow=false;}
    const el=document.getElementById('nar');if(el)el.classList.remove('on');document.getElementById('bars').classList.remove('on');}
}
