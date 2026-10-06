/* Снимки для визуального прохода: ключевые комнаты каждой зоны на настоящей видеокарте.
   node tools/gfx.js папка [комнаты через запятую или «;» — если с точками: z1_hub@21,19;z2_roofs] [--audit] [--nofx] [--classic] [--w 1920 --h 1080]
     без списка — набор по умолчанию (хабы, крупные залы, арены стражей, поверхность);
     --audit   — постоянные точки камеры художественного аудита (AUDIT ниже): снимки «до» и «после» из одних мест;
     --nofx    — без блума, тумана, грейдинга, частиц, аберрации и глубины резкости: только арт и свет;
     --classic — тот же набор старым путём Canvas 2D (?gl=0) для сравнения.
   комната@x,y — курьер в этой точке; без точки — у первой двери. Сущности живут 2 с, интерфейс скрыт.
   Листы-обзоры: _sheet.jpg (цвет), _sheet_gray.jpg (тон), _sheet_thumb.jpg (миниатюры 192×108 — держится ли композиция). */
'use strict';
const fs=require('fs'),path=require('path');
const {serve,launch,openGame}=require('./lib');
const DEF=['z1_hub','z1_foundry','z1_boss','z2_atrium','z2_post','z2_boss','z3_greenhouse','z3_orchard','z3_boss',
  'z4_antechamber','z4_clocktower','z4_boss','z5_hall','z5_council','z5_boss','z5_surface'];
/* точки аудита: одна-две на ключевую сцену; меняются только вместе с пересъёмкой «до» */
const AUDIT=['z1_start@8,10','z1_hub@13,32','z1_foundry@30,26','z1_boiler','z1_canal','z1_gallery@27,12','z1_charge','z1_boss@18,21',
  'z2_escalator','z2_atrium@18,40','z2_post@24,22','z2_market','z2_roofs','z2_chapel','z2_boss@30,18',
  'z3_airlock','z3_greenhouse@26,30','z3_orchard@30,24','z3_dome','z3_sunhall','z3_boss@28,22',
  'z4_antechamber@22,24','z4_gearworks','z4_clocktower@13,48','z4_pendulum','z4_boss@24,24',
  'z5_hall@23,20','z5_reading@27,18','z5_busts@30,18','z5_stacks','z5_council@23,24','z5_boss@25,30','z5_surface@32,28'];
(async()=>{
  const a=process.argv.slice(2),opt=k=>{const i=a.indexOf('--'+k);return i>=0?a[i+1]:null;};
  const audit=a.includes('--audit'),nofx=a.includes('--nofx'),classic=a.includes('--classic');
  const dir=path.resolve(a[0]||'gfx'),list=(a[1]&&!a[1].startsWith('--')?a[1].split(a[1].includes(';')?';':','):audit?AUDIT:DEF);
  fs.mkdirSync(dir,{recursive:true});
  const {srv,url}=await serve();const L=await launch({w:+(opt('w')||1280),h:+(opt('h')||720),gpu:true});
  try{
    await openGame(L.page,url+(classic?'?gl=0':'?gl=1'));
    const info=await L.page.evaluate(nofx=>{if(game.gl)game.gl.nofx=nofx;return {gl:!!(game.gl&&game.gl.ok),rn:game.gl&&game.gl.rendererName};},nofx);
    console.log('webgl:',info.gl,info.rn||'',nofx?'(без эффектов)':'');
    /* кадры шагаем сами; настоящий цикл отключён (запоздавший кадр браузера со старой меткой времени дал бы отрицательный шаг) */
    await L.page.evaluate(()=>{window.requestAnimationFrame=()=>0;const F=game.frame.bind(game);game.frame=()=>{};
      window.__step=(n)=>{const g=game;for(let i=0;i<n;i++){g.input.pollPad=()=>{};F(g.__ts=(g.__ts||1000)+16.667);}};});
    const shots=[];
    for(const spec of list){const [id,at]=spec.split('@'),xy=at?at.split(',').map(Number):null;
      const ok=await L.page.evaluate(([id,xy])=>{const g=game;if(!ROOMDEFS[id])return false;g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;
        document.getElementById('menu').classList.add('hidden');g.hud.show(false);g.state='play';g.timeScale=1;g.input.clearAll();
        const R=new Room(ROOMDEFS[id],g.gs),d=(R.doors||[])[0];let x=R.w/2,y=2;
        if(d){x=d.x<2?d.x+2.4:d.x+d.w>R.w-2?d.x-2.2:d.x+d.w/2;y=d.y+d.h-1.72;}else if(R.checkpoint){x=R.checkpoint.x+1.5;y=R.checkpoint.y-1.72;}
        if(xy){x=xy[0];y=xy[1];}
        g.world.load(id,x,y);g.world.player.invuln=1e9;g.last=0;return true;},[id,xy]);
      if(!ok){console.log('нет комнаты',id);continue;}
      /* неуязвимость на время съёмки, но последний кадр — без мигания неуязвимости */
      await L.page.evaluate(()=>{window.__step(120);game.world.player.invuln=0;window.__step(1);});
      const f=path.join(dir,id+(at?'_'+at.replace(',','_'):'')+'.png');await L.page.screenshot({path:f});shots.push({f,id});
    }
    /* листы-обзоры: цвет, тон (оттенки серого), миниатюры — композиция должна держаться и в 192×108 */
    if(shots.length>1){const imgs=shots.map(s=>['data:image/png;base64,'+fs.readFileSync(s.f).toString('base64'),s.id]);
      for(const [name,cols,tw,th,gray,label] of [['_sheet',4,480,270,false,true],['_sheet_gray',4,480,270,true,true],['_sheet_thumb',6,192,108,false,false]]){
        const d=await L.page.evaluate(async([imgs,cols,tw,th,gray,label])=>{const rows=Math.ceil(imgs.length/cols),lh=label?0:14;
          const cv=document.createElement('canvas');cv.width=cols*tw;cv.height=rows*(th+lh);const c=cv.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,cv.width,cv.height);
          for(let i=0;i<imgs.length;i++){const im=new Image();im.src=imgs[i][0];await im.decode();const x=(i%cols)*tw,y=Math.floor(i/cols)*(th+lh);
            c.filter=gray?'grayscale(1)':'none';c.drawImage(im,x,y,tw,th);c.filter='none';
            c.font='12px monospace';c.fillStyle='rgba(0,0,0,.6)';const ty=label?y+4:y+th;c.fillRect(x+(label?4:0),ty,c.measureText(imgs[i][1]).width+8,14);
            c.fillStyle='#ddd';c.fillText(imgs[i][1],x+(label?8:4),ty+11);}
          return cv.toDataURL('image/jpeg',0.86);},[imgs,cols,tw,th,gray,label]);
        fs.writeFileSync(path.join(dir,name+'.jpg'),Buffer.from(d.split(',')[1],'base64'));}}
    if(L.errors.length)console.log('ОШИБКИ:\n  '+L.errors.slice(0,8).join('\n  '));
    console.log('снимки: '+dir);
  }finally{await L.browser.close();srv.close();}
})();
