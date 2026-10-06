"use strict";
/* ============================== КНИГА УЧЁТА · МОСТ К ХОСТУ ==============================
   Игра сама ничего не знает о кошельках и бэкенде. Когда она встроена в хост iDosGames (iframe того же
   происхождения), через postMessage она сообщает хосту о делах курьера — цилиндр прочитан, страж побеждён,
   стенд пройден, концовка выбрана, письмо оставлено — а хост вносит это в Книгу учёта, лидерборды и цепочку.
   Запущенная отдельно (itch, file://) игра работает как раньше: все вызовы Chain тогда — пустышки.
   Протокол: {kz:1, t:тип, …}; запрос — с полем id, ответ — {kz:1, reply:id, …}. Чужие origin игнорируются. */
const Chain=(()=>{
  const on=(()=>{try{return window.parent!==window;}catch(e){return false;}})();
  const C={on,me:null,seq:1,pending:{},game:null};
  const post=m=>{if(!on)return;try{parent.postMessage(Object.assign({kz:1},m),location.origin);}catch(e){}};
  C.emit=(t,p)=>post(Object.assign({t},p||{}));
  C.ask=(t,p,ms)=>new Promise(res=>{
    if(!on){res(null);return;}
    const id=C.seq++,to=setTimeout(()=>{delete C.pending[id];res(null);},ms||15000);
    C.pending[id]=r=>{clearTimeout(to);res(r);};post(Object.assign({t,id},p||{}));});
  /* письма пишут другие игроки: в сцену попадает только текст без разметки */
  C.clean=s=>String(s||'').replace(/[<>&]/g,'').replace(/\s+/g,' ').trim().slice(0,160).toUpperCase();
  /* страж, побеждённый на Экзамене Совета, — не страж в Книге: там всё считается отдельно */
  C.guard=id=>{if(typeof CouncilExam!=='undefined'&&CouncilExam.on)return;C.emit('guard',{id});};
  /* чип курьера в меню и в паузе */
  C.paint=()=>{const m=C.me,txt=m?'КУРЬЕР №'+m.no+(m.wallet?'   '+m.short:'   ГОСТЬ')+'   МАРОК '+m.stamps:'';
    for(const id of ['courier','courierP']){const el=document.getElementById(id);if(el){el.textContent=txt;el.classList.toggle('hidden',!m);}}
    for(const id of ['btnBookMenu','btnBook']){const el=document.getElementById(id);if(el)el.classList.toggle('hidden',!m);}};
  C.openBook=what=>C.emit('ui',{what:what||'book'});
  /* модули ранца как активы Solana: хост присылает, какие из них держит кошелёк курьера.
     Они появляются в ранце (даже если курьер их ещё не находил — их прислали по почте), а ушедшие по почте — исчезают. */
  C.bound={};C.mods=null;
  C.applyMods=()=>{const d=C.mods,g=C.game;if(!d)return;C.bound={};for(const k of d.own||[])C.bound[k]=1;
    if(!g||!g.gs||(typeof CouncilExam!=='undefined'&&CouncilExam.on)||g.state==='menu'||g.state==='intro')return;
    const gs=g.gs,said=[];
    for(const k of d.own||[]){if(MODULE_IDS.indexOf(k)<0||gs.flags[k])continue;gs.flag(k);
      if(gs.equip.length<gs.slots()&&gs.equip.indexOf(k)<0)gs.equip.push(k);said.push('В РАНЦЕ МОДУЛЬ «'+UPGRADES[k].name+'»: ЕГО ДЕРЖИТ ТВОЙ КОШЕЛЁК.');}
    for(const k of d.lost||[]){if(!gs.flags[k])continue;delete gs.flags[k];const i=gs.equip.indexOf(k);if(i>=0)gs.equip.splice(i,1);
      said.push('МОДУЛЬ «'+UPGRADES[k].name+'» УШЁЛ ПО ПОЧТЕ. ИЗ РАНЦА ОН ПРОПАЛ.');}
    if(said.length){gs.save();said.forEach(t=>g.hud.say(t,'КОШЕЛЁК'));}};
  /* письмо курьерам: хост рисует окно (там предупреждение о модерации) и сам списывает марку */
  C.writeLetter=async(g,station)=>{
    const r=await C.ask('write',{station},10*60*1000);
    if(!r)return;g.audio.tone(520,0.1,'sine',0.02);
    if(g.state==='travel')g.travel.render();
    g.hud.say(r.ok?'ПИСЬМО УШЛО В КАПСУЛЕ. ПРОЧТУТ ДРУГИЕ КУРЬЕРЫ.':(r.msg||'ПИСЬМО НЕ УШЛО.'),'ПНЕВМОПОЧТА');};
  /* письма других курьеров с этой станции: Почтмейстер зачитывает их вслух; за каждое — марка */
  C.readLetters=async(g,station,at)=>{
    const r=await C.ask('letters',{station});
    if(!r||!r.ok){g.hud.say((r&&r.msg)||'ПОЧТА МОЛЧИТ. СЕТЬ НЕ ОТВЕЧАЕТ.','ПНЕВМОПОЧТА');return;}
    if(!r.letters.length){g.hud.say(r.seen?'ВСЕ ПИСЬМА НА ЭТОЙ СТАНЦИИ УЖЕ ПРОЧИТАНЫ.':'НА ЭТОЙ СТАНЦИИ ПИСЕМ ОТ КУРЬЕРОВ ПОКА НЕТ. ОСТАВЬ ПЕРВОЕ.','ПНЕВМОПОЧТА');return;}
    g.travel.close();
    const lines=[{t:'ЧУЖИЕ ПИСЬМА. ЧИТАТЬ ИХ НЕЛЬЗЯ. НО ТЕБЕ ВЕЛЕНО НЕ СЛУШАТЬСЯ.',sp:'postmaster'}];
    for(const L of r.letters)lines.push({t:'КУРЬЕР №'+L.no+': '+C.clean(L.text),sp:'postmaster'});
    g.cinematic.play({x:at.x,y:at.y,title:'ПИСЬМА КУРЬЕРОВ',speaker:'postmaster',lines});
    for(const L of r.letters)C.emit('letterRead',{id:L.id,no:L.no});};
  addEventListener('message',e=>{
    const d=e.data;if(!d||d.kz!==1||e.origin!==location.origin||e.source!==parent)return;
    if(d.reply){const f=C.pending[d.reply];if(f){delete C.pending[d.reply];f(d);}return;}
    if(d.t==='session'){C.me=d.me;C.paint();}
    else if(d.t==='modules'){C.mods=d;C.applyMods();}
    else if(d.t==='toast'&&C.game&&C.game.hud&&d.text)C.game.hud.say(String(d.text).slice(0,160),'КНИГА УЧЁТА');});
  addEventListener('DOMContentLoaded',()=>C.emit('hello'));
  return C;
})();
