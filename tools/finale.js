/* Прогон финала в реальном времени: вся сцена без ввода — печать, взлёт, шахта, утро, небо.
   node tools/finale.js [папка] [--b]   (--b — концовка B: правда сказана ярусам)
   Снимки по ходу; в конце — состояние и текст финала. */
'use strict';
const fs=require('fs'),path=require('path');
const {serve,launch,openGame}=require('./lib');
(async()=>{
  const a=process.argv.slice(2),dir=path.resolve(a[0]&&!a[0].startsWith('--')?a[0]:'finale'),B=a.includes('--b');fs.mkdirSync(dir,{recursive:true});
  const {srv,url}=await serve();const L=await launch({w:1280,h:720});
  const shot=n=>L.page.screenshot({path:path.join(dir,n+'.png')});const wait=ms=>L.page.waitForTimeout(ms);
  try{
    await openGame(L.page,url);
    await L.page.evaluate(B=>{const g=game;g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;
      g.gs.flags.archivist_dead=true;g.gs.bosses.archivist=true;if(B){g.gs.flags.broadcast_done=true;g.gs.lore=18;for(let i=1;i<=18;i++)g.gs.loreIds[i]=true;}
      document.getElementById('menu').classList.add('hidden');g.hud.show(true);g.state='play';g.input.enabled=true;
      g.world.load('z5_boss',24,21.6-1.72);},B);
    await wait(800);
    await L.page.evaluate(()=>{const W=game.world,wh=W.interactables.find(i=>i.def.kind==='wheel');wh.use(game);});
    /* сцена идёт сама: снимки по таймлайну (от поворота колеса) */
    const T0=Date.now(),until=async(sec,name)=>{const d=sec*1000-(Date.now()-T0);if(d>0)await wait(d);await shot(name);};
    await until(2.5,'01_wheel');await until(8,'02_layers');await until(15.5,'03_light');await until(19.5,'04_cables');
    await until(26,'05_rise');await until(32,'06_rise_white');await until(37,'07_shaft_lead');await until(50,'08_shaft_concrete');await until(62,'09_shaft_roots');await until(70,'10_shaft_top');
    await until(76,'11_dawn');await until(81,'12_look_up');await until(88,'13_grass');await until(92,'14_kneel');await until(96.5,'15_offer');await until(99,'16_leaf_up');await until(103,'17_leaf_wind');
    const st0=await L.page.evaluate(()=>({state:game.state,room:game.world.room&&game.world.room.id,act:game.finale.act,x:game.world.player&&game.world.player.cx}));
    for(let i=0;i<120;i++){await wait(500);const s=await L.page.evaluate(()=>game.state);if(s==='ending')break;if(i===12)await shot('18_walk');}
    await wait(3500);await shot('19_sky');
    await wait(9000);await shot('20_sky_lines');
    const text=await L.page.evaluate(()=>game.finale.endText());
    for(let i=0;i<400;i++){await wait(500);const s=await L.page.evaluate(()=>[game.state,game.finale.act]);
      if(s[0]==='menu'){await shot('99_menu');break;}if(s[1]==='credits'&&i%6===0)await shot('c'+String(i).padStart(3,'0'));}
    const st=await L.page.evaluate(()=>({state:game.state,act:game.finale.act}));
    console.log(JSON.stringify(st0));console.log(JSON.stringify(st));console.log(text);
    if(L.errors.length)console.log('ОШИБКИ:\n  '+L.errors.slice(0,6).join('\n  '));
  }finally{await L.browser.close();srv.close();}
})();
