"use strict";
/* ============================== ПНЕВМОПОЧТА ============================== */
/* Совет перекрыл магистраль пневмопочты, чтобы ярусы не переписывались. Курьер её возвращает:
   главный клапан — за сортировочным провалом Главпочтамта (только по магнитным рельсам под сводом).
   Включённая сеть — быстрые переезды между станциями в хабах зон. Станция подключается, когда курьер
   впервые её открывает. Почтмейстер принимает цилиндры с записями и платит за них. */
const STATIONS={
  post:{room:'z2_post',x:36.9,y:20,name:'ГЛАВПОЧТАМТ',zone:'СОТЫ'},
  hub:{room:'z1_hub',x:9.4,y:34,name:'НАСОСНАЯ СТАНЦИЯ',zone:'ОТСТОЙНИК'},
  atrium:{room:'z2_atrium',x:30.5,y:35,name:'СОТЫ-АТРИУМ',zone:'СОТЫ'},
  eden:{room:'z3_greenhouse',x:15.6,y:30,name:'ОРАНЖЕРЕИ',zone:'ЭДЕМ'},
  seal:{room:'z4_antechamber',x:15.8,y:24,name:'ПРЕДПЕЧАТЬЕ',zone:'ПЕЧАТЬ'},
  archive:{room:'z5_hall',x:13,y:21,name:'ПРИХОЖАЯ АРХИВА',zone:'АРХИВ'}
};
const STATION_ORDER=['hub','atrium','post','eden','seal','archive'];

/* Почтмейстер: что сказать и что выдать сейчас. Цилиндры сдаются все сразу, награды — на порогах. */
const POST_REWARDS=[
  {n:3,upgrade:'plate_post1',line:'ТРИ ЗАПИСИ. ДЕРЖИ ПЛАСТИНУ ДЛЯ КУРТКИ. ЕЁ ОСТАВИЛ ТРИДЦАТЬ ВОСЬМОЙ — ТАК ЗА НЕЙ И НЕ ВЕРНУЛСЯ.'},
  {n:7,upgrade:'weld_kit',line:'СЕМЬ. СОВЕТ ВРАЛ АККУРАТНО, НО ВРАЛ. ВОТ СВАРОЧНЫЙ КОМПЛЕКТ: ЗАЛАТАЕШЬСЯ ЛИШНИЙ РАЗ.'},
  {n:12,upgrade:'plate_post2',line:'ДВЕНАДЦАТЬ. Я ПЕРЕПИСЫВАЮ ИХ ОТ РУКИ И РАССЫЛАЮ ПО ЯРУСАМ. ВОТ ЕЩЁ ПЛАСТИНА — ТЕБЕ НУЖНЕЕ.'},
  {n:18,upgrade:null,flag:'post_truth',line:'ВОСЕМНАДЦАТЬ. ЭТОГО ХВАТИТ, ЧТОБЫ ПОВЕРИЛИ. ТЕПЕРЬ СКАЖУ, ОТКУДА ТВОЙ ЛИСТ.'},
  {n:30,upgrade:null,flag:'post_all',line:'ВСЕ ТРИДЦАТЬ. ВСЯ ЛОЖЬ — И ВСЕ, КТО В НЕЁ НЕ ПОВЕРИЛ. ТАКИХ БЫЛО БОЛЬШЕ, ЧЕМ НАМ ГОВОРИЛИ.'}
];
function postmasterScene(gs,byPost){
  const L=[];const ups=[];const flags=[];
  if(!gs.flags.pm_met&&!byPost){
    flags.push('pm_met');
    L.push('КУРЬЕР? ЖИВОЙ? ПОСЛЕДНИЙ ДОХОДИЛ СЮДА ГОД НАЗАД.',
      'ЭТО ГЛАВПОЧТАМТ. СОВЕТ ВЕЛЕЛ ПЕРЕКРЫТЬ ПОЧТУ, ЧТОБЫ ЯРУСЫ НЕ ПЕРЕПИСЫВАЛИСЬ. И Я ПЕРЕКРЫЛА.');
    if(!gs.flags.post_on){flags.push('post_on');
      L.push('А ТЕПЕРЬ ОТКРЫВАЮ. ГЛАВНЫЙ КЛАПАН — ВОТ, У КОНТОРКИ. СЛЫШИШЬ? КАПСУЛЫ ПОШЛИ.',
        'В КАЖДОЙ ЗОНЕ ЕСТЬ СТАНЦИЯ. ОТКРОЕШЬ ЛЮК — СМОЖЕШЬ ЕЗДИТЬ МЕЖДУ НИМИ В КАПСУЛЕ.','А ЦИЛИНДРЫ ОТПРАВЛЯЙ МНЕ С ЛЮБОЙ СТАНЦИИ.');}
    L.push('ЗАПИСИ Я УМЕЮ ЧИТАТЬ. ЗА КАЖДУЮ ЗАПЛАЧУ, ЧЕМ СМОГУ. И БУДУ ТЕБЕ ПИСАТЬ — ЗАГЛЯДЫВАЙ НА СТАНЦИИ.');
  }
  const had=gs.flags.lore_given||0,have=gs.lore||0;
  if(have>had){
    L.push(have-had===1?'ЕЩЁ ОДИН ЦИЛИНДР. ПОСМОТРИМ…':'ЦИЛИНДРОВ: '+(have-had)+'. ПОСМОТРИМ…');
    for(const r of POST_REWARDS)if(had<r.n&&have>=r.n){L.push(r.line);if(r.upgrade)ups.push(r.upgrade);if(r.flag)flags.push(r.flag);
      if(r.flag==='post_truth')L.push('ГОД НАЗАД ПО МЁРТВОЙ ЛИНИИ ПРИШЛА КАПСУЛА. БЕЗ АДРЕСА. МЕТКА «ОТ ПЕЧАТИ», ВНУТРИ — ЛИСТ.',
        'ТАКИЕ ЦЕНЗУРА ЗАБИРАЕТ НЕВСКРЫТЫМИ. ЭТУ Я НЕ ОТДАЛА. ДЕРЖАЛА ГОД.','ПОТОМ ВСТАЛИ НАСОСЫ, И Я ПОНЯЛА: ЖДАТЬ БОЛЬШЕ НЕЧЕГО. И ОТПРАВИЛА ЕЁ ТЕБЕ.');}
    gs.flags.lore_given=have;
  }else if(gs.flags.pm_met&&!L.length){
    L.push(have>=30?'ВСЁ ПРОЧИТАНО. ИДИ НАВЕРХ, КУРЬЕР. ПОЧТА НЕ ЖДЁТ.'
      :'НОВЫХ ЦИЛИНДРОВ НЕТ? ПОКА ПРОЧИТАНО '+have+' ИЗ 30. ПОЧТА НЕ ЖДЁТ.');
  }
  return {lines:L,upgrades:ups,flags};
}

/* ---------- ПОЧТА КАК МЕХАНИКА ----------
   Станция в хабе делает три вещи — и говорит об этом:
     1) ЦИЛИНДРЫ → почтмейстеру: найденные записи уходят капсулой с любой станции, плата приходит обратно;
     2) ПИСЬМА ← от почтмейстера: по одному за визит — она следит за курьером, отвечает на его находки
        и подсказывает, куда дальше (сеть слышит, что творится на ярусах);
     3) ПЕРЕЕЗД между подключёнными станциями.
   Сеть открывает сама почтмейстер при первой встрече (главный клапан — у её конторки). */
const LETTERS=[
  {id:'net',when:gs=>gs.flags.post_on,lines:[
    'КУРЬЕР. ЭТО ПОЧТМЕЙСТЕР. ПИШУ НА ВСЕ СТАНЦИИ СРАЗУ — КАКУЮ-НИБУДЬ ТЫ ОТКРОЕШЬ.',
    'ЧЕРЕЗ ЛЮК В ХАБЕ МОЖНО ЕЗДИТЬ. ЦИЛИНДРЫ ШЛИ ОТТУДА ЖЕ — ОТВЕЧУ ОБРАТНОЙ КАПСУЛОЙ.',
    'И НЕ ХОДИ ПЕШКОМ ТАМ, ГДЕ ЛЕТАЮТ ПИСЬМА.']},
  {id:'primarch',when:gs=>gs.bosses.primarch,lines:[
    'ТУРБИНЫ ГУДЯТ ДО САМОГО ГЛАВПОЧТАМТА. ЗНАЧИТ, ПРИМАРХА БОЛЬШЕ НЕТ.',
    'ЦЕНЗУРА ВСКРЫВАЛА МОИ КАПСУЛЫ СОРОК ЛЕТ. ТЕПЕРЬ НЕКОМУ.',
    'ЛИСТЬЯ ВРОДЕ ТВОЕГО РАСТУТ ВЫШЕ, В САДАХ ЭДЕМА. ШЛЮЗ ТУДА — ЗА ЕГО КАБИНЕТОМ.']},
  {id:'eden',when:gs=>gs.visited.z3_greenhouse,lines:[
    'ТЫ В САДАХ? ВОЗДУХ ТАМ ПАХНЕТ ТАК, БУДТО НАВЕРХУ ЛЕТО.',
    'САДОВНИКИ ПИСАЛИ МНЕ ДО ПРОШЛОГО ГОДА. ПОСЛЕДНЕЕ ПИСЬМО ПРИШЛО СНИЗУ, ИЗ ТЕХНИЧЕСКИХ КАНАЛОВ.',
    'ЕСЛИ КТО-ТО ЖИВ — ОН ТАМ, ПОД ОРАНЖЕРЕЯМИ.']},
  {id:'gardener',when:gs=>gs.has('magnet'),lines:[
    'САДОВНИК ЖИВ? Я ТАК И ЗНАЛА. ЗНАЧИТ, МОИ СЕМЕНА ДО НЕГО ДОШЛИ.',
    'ОН ГОВОРИТ, ТВОЙ ЛИСТ НЕ ИЗ ЭДЕМА? ТОГДА ОН ОТТУДА, КУДА ВСЕ БОЯТСЯ СМОТРЕТЬ.']},
  {id:'uprooter',when:gs=>gs.bosses.uprooter,lines:[
    'КОРЧЕВАТЕЛЬ ВЫПАЛЫВАЛ ВСЁ, ЧЕГО НЕТ В КАТАЛОГЕ. ТВОЙ ЛИСТ ОН БЫ ВЫРВАЛ ПЕРВЫМ.',
    'ПОДЪЁМНИК КУПОЛА ЗАПАЯН СВИНЦОМ. ТЕПЕРЬ У ТЕБЯ ЕСТЬ ЧЕМ ЕГО ВЫБИТЬ.']},
  {id:'seal',when:gs=>gs.visited.z4_antechamber,lines:[
    'ТЫ В ПРЕДПЕЧАТЬЕ. ДАЛЬШЕ МОИ КАПСУЛЫ НЕ ХОДЯТ: В МАГИСТРАЛЯХ НЕТ ДАВЛЕНИЯ.',
    'ПОДНИМИ ДАВЛЕНИЕ НА ТРЁХ МАНОМЕТРАХ — ЗА КАЖДЫМ СВОЙ ЭКЗАМЕН. СОВЕТ ЛЮБИЛ ЭКЗАМЕНЫ: САМ ОН ИХ НЕ СДАВАЛ.']},
  {id:'regulator',when:gs=>gs.bosses.regulator,lines:[
    'ЧАСЫ ВСТАЛИ? ВНИЗУ СТАЛО ТАК ТИХО, ЧТО Я ВПЕРВЫЕ УСЛЫШАЛА, КАК ПОЁТ ВОДА В ТРУБАХ.',
    'АРХИВ СОВЕТА — ЗА ЧАСАМИ. ЕСЛИ ТАМ КТО-ТО ЕСТЬ — СПРОСИ ЕГО, ЗАЧЕМ ВСЁ ЭТО.']},
  {id:'archive',when:gs=>gs.visited.z5_hall,lines:[
    'В АРХИВЕ ЛЕЖАТ МОИ СТАРЫЕ КАПСУЛЫ — ВСЕ, ЧТО ЦЕНЗУРА НЕ ДОСТАВИЛА.',
    'УВИДИШЬ СВОЁ ИМЯ НА КОНВЕРТЕ — ЧИТАЙ. ТЕБЕ МОЖНО.']},
  {id:'c38',when:gs=>(gs.flags.c38_marks||0)>=3,lines:[
    'ТЫ ИДЁШЬ ПО МЕЛОВЫМ МЕТКАМ «38»? ТРИДЦАТЬ ВОСЬМОЙ БЫЛ МОИМ ЛУЧШИМ КУРЬЕРОМ.',
    'ГОД НАЗАД ОН УШЁЛ НАВЕРХ, К СОВЕТУ. НЕ ВЕРНУЛСЯ НИ ОН, НИ ОТВЕТ.',
    'ЕСЛИ НАЙДЁШЬ — НЕ ОСТАВЛЯЙ ЕГО ТАМ ОДНОГО.']},
  {id:'council',when:gs=>gs.flags.council_heard,lines:[
    'СОВЕТ — ЭТО ПЛАСТИНКИ? ДВЕСТИ ЛЕТ МЫ СЛУШАЛИСЬ ЗАПИСИ.',
    'КУРЬЕР. ЧТО БЫ НИ БЫЛО НАВЕРХУ — ОТКРОЙ. МЫ ДОСТАТОЧНО ЖДАЛИ.']}
];
const PostNet={
  undelivered(gs){return Math.max(0,(gs.lore||0)-(gs.flags.lore_given||0));},
  letter(gs){if(!gs.flags.post_on)return null;for(const L of LETTERS)if(!gs.flags['letter_'+L.id]&&L.when(gs))return L;return null;},
  /* что ждёт на станции (для подсказки у люка и лампы-капсулы) */
  pending(gs){if(!gs.flags.post_on)return '';const n=this.undelivered(gs),L=this.letter(gs);
    return n&&L?'ПИСЬМО И ЦИЛИНДРЫ: '+n:n?'ОТПРАВИТЬ ЦИЛИНДРЫ: '+n:L?'ПИСЬМО ОТ ПОЧТМЕЙСТЕРА':'';},
  /* пункт меню станции: what='send' — отправить цилиндры, 'letter' — прочитать письмо. Возвращает сцену или null.
     Почта не стоит между курьером и переездом: это отдельные пункты меню, не обязательный разговор */
  visit(game,x,y,what){const gs=game.gs,lines=[],ups=[],flags=[];
    const n=what==='letter'?0:this.undelivered(gs);
    if(n){lines.push({t:'ОТПРАВЛЯЮ ПОЧТМЕЙСТЕРУ ЦИЛИНДРЫ: '+n+'. ОТВЕТ ПРИДЁТ ОБРАТНОЙ КАПСУЛОЙ.',sp:'courier'});
      const sc=postmasterScene(gs,true);lines.push(...sc.lines);ups.push(...sc.upgrades);flags.push(...sc.flags);}
    const L=what==='send'?null:this.letter(gs);
    if(L){flags.push('letter_'+L.id);lines.push(...L.lines);}
    if(!lines.length)return null;
    game.audio.elevator();game.audio.hitMetal();
    return {x,y,title:'ПОЧТМЕЙСТЕР',speaker:'postmaster',lines,upgrades:ups,setFlags:flags};}
};

/* меню переезда: список подключённых станций, ↑/↓ — выбор, E/ПРОБЕЛ — ехать, ESC — назад */
class TravelMenu{
  constructor(game){this.game=game;this.el=null;this.list=[];this.sel=0;this.from=null;}
  /* меню станции: сначала почта (если ждёт), потом станции для переезда */
  open(from,x,y){
    const g=this.game,gs=g.gs;this.at={x,y};
    this.from=from;const items=[];
    if(gs.flags.post_on){const n=PostNet.undelivered(gs);if(PostNet.letter(gs))items.push({k:'letter'});if(n)items.push({k:'send',n});}
    /* письма других курьеров: их оставляют на станциях, читают тут же; марка уходит на письмо, приходит за чтение */
    if(Chain.on&&Chain.me&&STATIONS[from]){items.push({k:'cwrite'});items.push({k:'cread'});items.push({k:'depot'});}
    for(const k of STATION_ORDER)if(k!==from&&gs.flags['st_'+k])items.push({k:'go',st:k});
    this.list=items;
    if(!this.list.length){g.hud.say('ЕХАТЬ ПОКА НЕКУДА. ДРУГИЕ СТАНЦИИ — В ХАБАХ ЗОН: ОТКРОЮ ИХ ЛЮКИ, И МЕЖДУ НИМИ МОЖНО ЕЗДИТЬ.','ПНЕВМОПОЧТА');return;}
    this.sel=0;this.el=this.el||document.getElementById('travel');
    g.state='travel';g.input.clearAll();g.audio.lever();
    this.render();this.el.classList.remove('hidden');
  }
  render(){
    const st=STATIONS[this.from];
    let h='<div class="tv-k">'+(st?st.name:'ПНЕВМОПОЧТА')+'</div><div class="tv-l">';
    this.list.forEach((it,i)=>{const on=i===this.sel?' on':'';
      if(it.k==='letter')h+='<div class="tv-i tv-m'+on+'"><b>ПИСЬМО ОТ ПОЧТМЕЙСТЕРА</b><span>ПРОЧИТАТЬ</span></div>';
      else if(it.k==='cwrite')h+='<div class="tv-i tv-m'+on+'"><b>ОСТАВИТЬ ПИСЬМО КУРЬЕРАМ</b><span>МАРОК '+(Chain.me?Chain.me.stamps:0)+'</span></div>';
      else if(it.k==='depot')h+='<div class="tv-i tv-m'+on+'"><b>ПОСЫЛКИ И СКЛАД</b><span>МОДУЛИ</span></div>';
      else if(it.k==='cread')h+='<div class="tv-i tv-m'+on+'"><b>ПИСЬМА КУРЬЕРОВ</b><span>ПРОЧИТАТЬ</span></div>';
      else if(it.k==='send')h+='<div class="tv-i tv-m'+on+'"><b>ОТПРАВИТЬ ЦИЛИНДРЫ</b><span>'+it.n+'</span></div>';
      else{const s=STATIONS[it.st];h+='<div class="tv-i'+on+'"><b>'+s.name+'</b><span>'+s.zone+'</span></div>';}});
    h+='</div>'+(this.game.gs.flags.post_on?'':'<div class="tv-n">ПИСЬМА И ЦИЛИНДРЫ — КОГДА ОТКРОЮ ГЛАВНЫЙ КЛАПАН НА ГЛАВПОЧТАМТЕ</div>')+'<div class="tv-h"><span><b>↑ ↓</b> ВЫБОР</span><span><b>E</b> ДАЛЬШЕ</span><span><b>ESC</b> НАЗАД</span></div>';
    this.el.querySelector('.tv').innerHTML=h;
  }
  update(){
    const g=this.game,I=g.input;
    I.enabled=true;
    if(I.consume('up')){this.sel=(this.sel+this.list.length-1)%this.list.length;g.audio.tone(520,0.06,'sine',0.02);this.render();}
    if(I.consume('down')){this.sel=(this.sel+1)%this.list.length;g.audio.tone(520,0.06,'sine',0.02);this.render();}
    if(I.consume('use')||I.consume('jump')||I.consume('attack'))this.go(this.list[this.sel]);
  }
  close(){if(this.el)this.el.classList.add('hidden');const g=this.game;if(g.state==='travel'){g.state='play';g.input.clearAll();}}
  go(it){
    const g=this.game;if(!it)return;
    if(it.k==='cwrite'){Chain.writeLetter(g,this.from);return;}
    if(it.k==='depot'){this.close();Chain.openBook('depot');return;}
    if(it.k==='cread'){Chain.readLetters(g,this.from,this.at);return;}
    if(it.k==='letter'||it.k==='send'){this.close();const sc=PostNet.visit(g,this.at.x,this.at.y,it.k);if(sc)g.cinematic.play(sc);return;}
    const k=it.st,s=STATIONS[k];if(!s)return;
    this.close();g.audio.elevator();g.audio.dash();
    g.transition(()=>{g.world.load(s.room,s.x-CFG.player.w/2,s.y-CFG.player.h);
      const p=g.world.player;g.particles.burst(p.cx,p.cy,26,{kind:'steam',col:'#dff0f6',spd:5,life:0.7,size:0.4,grow:1,drag:2});
      g.audio.hitMetal();});
  }
}
