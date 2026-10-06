/* Снимки с интерфейсом: комната@x,y — курьер там, HUD виден, подсказка у ближайшего объекта.
   node tools/uishot.js папка "z1_hub@36,5.6;z1_start@8,10" [--classic] [--pause] [--dbg] */
'use strict';
const fs=require('fs'),path=require('path');
const {serve,launch,openGame}=require('./lib');
(async()=>{
  const a=process.argv.slice(2),classic=a.includes('--classic'),pause=a.includes('--pause');
  const dir=path.resolve(a[0]||'uishots'),list=(a[1]||'z1_hub@36,5.6').split(';');
  fs.mkdirSync(dir,{recursive:true});
  const {srv,url}=await serve();const L=await launch({w:1280,h:720,gpu:true});
  try{
    await openGame(L.page,url+(classic?'?gl=0':'?gl=1'));
    await L.page.evaluate(()=>{window.requestAnimationFrame=()=>0;const F=game.frame.bind(game);game.frame=()=>{};
      window.__step=(n)=>{const g=game;for(let i=0;i<n;i++){g.input.pollPad=()=>{};F(g.__ts=(g.__ts||1000)+16.667);}};});
    for(const spec of list){const [id,at]=spec.split('@'),xy=at.split(',').map(Number);
      await L.page.evaluate(([id,xy])=>{const g=game;g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;g.gs.lore=7;
        document.getElementById('menu').classList.add('hidden');g.hud.show(true);g.state='play';g.timeScale=1;g.input.clearAll();
        g.world.load(id,xy[0],xy[1]);g.world.player.invuln=1e9;g.world.entryT=9;g.world.playerActed=true;},[id,xy]);
      await L.page.evaluate(()=>{window.__step(150);game.world.player.invuln=0;window.__step(1);});
      if(a.includes('--dbg'))console.log(await L.page.evaluate(()=>JSON.stringify({p:[game.world.player.x,game.world.player.y],
        it:game.world.interactables.map(i=>i.def.kind+'@'+i.x+','+i.y)})));
      if(pause)await L.page.evaluate(()=>{game.togglePause();});
      const f=path.join(dir,id+'_'+at.replace(',','_')+(classic?'_c':'')+(pause?'_p':'')+'.png');
      await L.page.screenshot({path:f});console.log(f);
      if(pause)await L.page.evaluate(()=>{game.togglePause();});}
    if(L.errors.length)console.log('ОШИБКИ:\n  '+L.errors.slice(0,8).join('\n  '));
  }finally{await L.browser.close();srv.close();}
})();
