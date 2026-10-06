/* Запись финала и титров на видео — со звуком, в реальном времени, как у игрока.
   node tools/finalevideo.js [файл.webm] [--a] [--headless]
     по умолчанию — концовка B (правда сказана ярусам, Курьер 38 встречен): в ней больше всего строк;
     --a — концовка A; окно браузера открывается (настоящая видеокарта и часы), --headless — без окна.
   Холст игры пишется через canvas.captureStream(30), звук — с общего выхода WebAudio (MediaStreamDestination).
   Запись идёт от поворота колеса Печати до возврата в меню. Результат по умолчанию: dist/kenotaf-finale.webm */
'use strict';
const fs=require('fs'),path=require('path');
/* MediaRecorder не пишет длительность в WebM — плееры не могут перематывать. Вставляем Duration (мс) в Segment/Info. */
function webmDuration(buf,ms){
  const id=Buffer.from([0x15,0x49,0xA9,0x66]),p=buf.indexOf(id);if(p<0||p>65536)return buf;
  const s=p+4,b0=buf[s];let len=1;while(len<=8&&!(b0&(0x80>>(len-1))))len++;
  let size=b0&(0xFF>>len);for(let i=1;i<len;i++)size=size*256+buf[s+i];
  const d0=s+len,info=buf.slice(d0,d0+size);if(info.indexOf(Buffer.from([0x44,0x89]))>=0)return buf;
  const dur=Buffer.alloc(11);dur[0]=0x44;dur[1]=0x89;dur[2]=0x88;dur.writeDoubleBE(ms,3);
  const ns=size+11,sz=Buffer.alloc(8);sz[0]=0x01;let v=ns;for(let i=7;i>=1;i--){sz[i]=v&0xFF;v=Math.floor(v/256);}
  return Buffer.concat([buf.slice(0,s),sz,info,dur,buf.slice(d0+size)]);}
const {ROOT,serve,launch,openGame}=require('./lib');
(async()=>{
  const a=process.argv.slice(2),A=a.includes('--a'),headless=a.includes('--headless');
  const out=path.resolve(a.find(x=>!x.startsWith('--'))||path.join(ROOT,'dist','kenotaf-finale.webm'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const {srv,url}=await serve();
  const L=await launch({w:1280,h:720,gpu:true,headed:!headless,args:['--autoplay-policy=no-user-gesture-required']});
  try{
    await openGame(L.page,url);
    const info=await L.page.evaluate(async A=>{const g=game;g.audio.init();if(g.audio.ctx.state!=='running')await g.audio.ctx.resume();
      g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;
      g.gs.flags.archivist_dead=true;g.gs.bosses.archivist=true;
      if(!A){g.gs.flags.broadcast_done=true;g.gs.flags.c38_met=true;g.gs.flags.post_all=true;g.gs.lore=30;for(let i=1;i<=30;i++)g.gs.loreIds[i]=true;}
      document.getElementById('menu').classList.add('hidden');g.hud.show(true);g.state='play';g.input.enabled=true;
      g.world.load('z5_boss',24,21.6-1.72);
      /* поток: холст 30 к/с + общий выход звука */
      const dst=g.audio.ctx.createMediaStreamDestination();g.audio.master.connect(dst);
      const st=new MediaStream([...g.canvas.captureStream(30).getVideoTracks(),...dst.stream.getAudioTracks()]);
      const mt=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      const rec=new MediaRecorder(st,{mimeType:mt,videoBitsPerSecond:5e6,audioBitsPerSecond:160000});
      window.__chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)window.__chunks.push(e.data);};
      window.__rec=rec;rec.start(1000);window.__recT0=performance.now();return {mt,canvas:g.canvas.width+'x'+g.canvas.height,audio:g.audio.ctx.state};},A);
    console.log('запись: '+JSON.stringify(info));
    await L.page.waitForTimeout(1500);
    await L.page.evaluate(()=>{const W=game.world,wh=W.interactables.find(i=>i.def.kind==='wheel');wh.use(game);
      /* часы сцены против настоящих: видно, не тормозила ли запись */
      window.__t0=performance.now();window.__frames=0;const f=()=>{window.__frames++;if(game.state!=='menu')requestAnimationFrame(f);};requestAnimationFrame(f);});
    let last='';
    for(let i=0;i<1200;i++){await L.page.waitForTimeout(1000);
      const s=await L.page.evaluate(()=>[game.state,game.finale.act||'-',Math.round((performance.now()-window.__t0)/1000),window.__frames]);
      const k=s[0]+'/'+s[1];if(k!==last){console.log('  '+String(s[2]).padStart(4)+' с  '+k+'  ('+Math.round(s[3]/Math.max(1,s[2]))+' к/с)');last=k;}
      if(s[0]==='menu')break;}
    await L.page.waitForTimeout(2500);
    const [n,ms]=await L.page.evaluate(()=>new Promise(r=>{window.__rec.onstop=()=>{window.__blob=new Blob(window.__chunks,{type:window.__rec.mimeType});r([window.__blob.size,performance.now()-window.__recT0]);};window.__rec.stop();}));
    /* блоб забирается кусками по 4 МБ в base64 */
    const fd=fs.openSync(out,'w');const CH=4<<20;
    for(let o=0;o<n;o+=CH){const b64=await L.page.evaluate(async([o,CH])=>{const b=window.__blob.slice(o,o+CH),buf=new Uint8Array(await b.arrayBuffer());
        let s='';for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));return btoa(s);},[o,CH]);
      fs.writeSync(fd,Buffer.from(b64,'base64'));}
    fs.closeSync(fd);
    fs.writeFileSync(out,webmDuration(fs.readFileSync(out),ms));
    console.log('видео: '+out+' · '+(n/1048576).toFixed(1)+' МБ · '+(ms/1000).toFixed(1)+' с');
    if(L.errors.length)console.log('ОШИБКИ:\n  '+L.errors.slice(0,6).join('\n  '));
  }finally{await L.browser.close();srv.close();}
})();
