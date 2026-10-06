/* Проверка WebGL-кадра.
   1) В ключевых комнатах курьер идёт 2 с; каждый третий кадр весь HDR-буфер проверяется на NaN и бесконечности
      (один такой пиксель после тонального сжатия становится белым, блум раздувает его в круг).
   2) Вход в комнату после боя: в одной комнате — тяжёлые удары, отрыв узла, гибель механизма, тряска; сразу переход
      в другую. Первые кадры новой комнаты не должны быть пересвечены (белое пятно) или провалены в чёрное:
      эффекты прошлой комнаты (толчки, вспышки, волны) живут по её времени и не должны перейти в новую.
   node tools/glcheck.js   (нужна видеокарта: запускается через WebGL) */
const {serve,launch,openGame}=require('./lib');
const ROOMS=[['z1_hub',4,32.28],['z1_foundry',3,21.28],['z1_boss',3,22.28],['z2_atrium',3,33.28],['z2_boss',3,16.28],['z3_greenhouse',3,28.28],['z3_boss',3,22.28],['z3_roots',3,8],['z4_antechamber',3,22.28],['z4_boss',3,23.28],['z5_boss',3,28.28],['z5_surface',4,27.28]];
const PAIRS=[['z1_arena','z1_start'],['z1_foundry','z1_east'],['z2_boss','z2_turbine'],['z3_boss','z3_orchard'],['z4_gearworks','z4_antechamber'],['z5_council','z5_hall']];
let bad=0;(async()=>{const {srv,url}=await serve();const L=await launch({w:1280,h:720,gpu:true});await openGame(L.page,url+'?gl=1');
  /* кадры шагаем сами; настоящий цикл отключён (запоздавший кадр со старой меткой времени дал бы отрицательный шаг) */
  await L.page.evaluate(()=>{window.requestAnimationFrame=()=>0;window.__F=game.frame.bind(game);game.frame=()=>{};});
  for(const [room,x,y] of ROOMS){const r=await L.page.evaluate(([room,x,y])=>{const g=game,G=g.gl,F=window.__F;
    g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;document.getElementById('menu').classList.add('hidden');g.hud.show(false);g.state='play';
    g.world.load(room,x,y);g.world.player.invuln=1e9;g.last=0;g.__ts=1000;for(let i=0;i<30;i++)F(g.__ts+=16.667);const gl=G.gl,W=g.vw,H=g.vh,px=new Float32Array(W*H*4);
    let frames=0,total=0;for(let f=0;f<120;f++){g.input.k.KeyD=true;F(g.__ts+=16.667);if(f%3)continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER,G.hdr.fb);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,px);let n=0;for(let i=0;i<px.length;i+=4)if(px[i]!==px[i]||px[i+1]!==px[i+1]||px[i+2]!==px[i+2]||px[i]>6e4)n++;
      if(n){frames++;total+=n;}}
    g.input.k.KeyD=false;return [frames,total];},[room,x,y]);console.log((r[0]?'FAIL ':'ok   ')+room.padEnd(16)+' кадров с NaN: '+r[0]+', пикселей: '+r[1]);if(r[0])bad++;}
  for(const [a,b] of PAIRS){const r=await L.page.evaluate(([a,b])=>{const g=game,G=g.gl,F=window.__F;
    g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;g.state='play';
    const R0=new Room(ROOMDEFS[a],g.gs),d0=(R0.doors||[])[0];g.world.load(a,d0?d0.x+(d0.x<2?2.4:-2.2):R0.w/2,d0?d0.y+d0.h-1.72:2);g.world.player.invuln=1e9;g.last=0;g.__ts=1000;
    for(let i=0;i<40;i++)F(g.__ts+=16.667);
    /* бой: всё, что даёт толчки, вспышки и волны */
    const p=g.world.player;for(let i=0;i<4;i++){g.fx.nodeHit(p.cx+1,p.cy,'brass',{heavy:true,dir:1},true);g.fx.breakNode(p.cx+1.5,p.cy,'iron',true,i%2===0);g.fx.kill(p.cx+2,p.cy,'rust',i===3);g.fx.rupture(p.cx+1,p.cy,'steel');g.camera.addShake(1.2);F(g.__ts+=16.667);}
    for(let i=0;i<6;i++)F(g.__ts+=16.667);
    const R1=new Room(ROOMDEFS[b],g.gs),d1=(R1.doors||[])[0];g.world.load(b,d1?d1.x+(d1.x<2?2.4:-2.2):R1.w/2,d1?d1.y+d1.h-1.72:2);
    const gl=G.gl,W=g.vw,H=g.vh,px=new Uint8Array(W*H*4);let worst=0,frame=-1,maxI=0;
    for(let f=0;f<30;f++){F(g.__ts+=16.667);gl.bindFramebuffer(gl.FRAMEBUFFER,G.ldr.fb);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let wh=0;for(let i=0;i<px.length;i+=16)if(px[i]>247&&px[i+1]>240&&px[i+2]>225)wh++;const k=wh/(px.length/16);if(k>worst){worst=k;frame=f;}
      const Lt=G.lights(g.world.room,g.camera,g.camera.zoom,g.world.room.t||0,false);for(const l of Lt)if(!l.key&&l.i>maxI)maxI=l.i;}
    return [worst,frame,maxI];},[a,b]);
    const fail=r[0]>0.08||r[2]>4;console.log((fail?'FAIL ':'ok   ')+(a+' → '+b).padEnd(30)+' пересвет: '+(r[0]*100).toFixed(1)+'% (кадр '+r[1]+'), сильнейшая лампа: '+r[2].toFixed(2));if(fail)bad++;}
  console.log(bad?'GLCHECK: '+bad+' FAIL':'GLCHECK: OK');await L.browser.close();srv.close();process.exit(bad?1:0);})();
