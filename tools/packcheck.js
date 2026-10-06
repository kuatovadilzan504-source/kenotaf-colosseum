/* Проверка сборки для itch.io: собирает dist/ (tools/pack.js), открывает dist/index.html с file://
   (как при двойном клике) и проверяет: игра стартует, по комнате каждой зоны грузится и рисуется,
   ошибок нет, в архиве не больше 1000 файлов.
     node tools/packcheck.js */
'use strict';
const path=require('path'),fs=require('fs'),cp=require('child_process');
const {ROOT,launch}=require('./lib');
(async()=>{
  const out=cp.execFileSync(process.execPath,[path.join(__dirname,'pack.js')],{encoding:'utf8'});process.stdout.write(out);
  const n=+(/файлов: (\d+)/.exec(out)||[0,9999])[1];let bad=n>1000?1:0;
  const L=await launch({w:1280,h:720});
  try{
    await L.page.goto('file:///'+path.join(ROOT,'dist','index.html').split(path.sep).join('/'),{waitUntil:'domcontentloaded',timeout:60000});
    await L.page.waitForFunction(()=>typeof game!=='undefined'&&game&&game.world,null,{timeout:30000});
    const r=await L.page.evaluate(()=>{const g=game,o=[];
      document.getElementById('menu').classList.add('hidden');g.hud.show(true);g.state='play';
      for(const id of ['z1_start','z2_atrium','z3_greenhouse','z4_antechamber','z5_hall','z1_trial']){
        g.world.load(id,4,4);for(let i=0;i<30;i++)g.frame((g.__t=(g.__t||1000)+16.7));o.push(g.world.room.id);}
      return {rooms:o,scripts:document.querySelectorAll('script[src]').length};});
    const ok=r.rooms.length===6&&r.scripts===0&&!L.errors.length;if(!ok)bad++;
    console.log((ok?'ok   ':'FAIL ')+'dist/index.html: комнаты '+r.rooms.join(' ')+', внешних скриптов '+r.scripts+(L.errors.length?'\n'+L.errors.join('\n'):''));
  }finally{await L.browser.close();}
  console.log('файлов в архиве: '+n+(n>1000?' > 1000':' ≤ 1000'));
  console.log(bad?'PACK: FAIL':'PACK: OK');process.exit(bad?1:0);
})();
