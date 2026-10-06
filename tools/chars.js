/* Лист персонажей: курьер в ключевых позах, все механизмы и стражи — крупно в цвете, на тёмном фоне,
   чёрным силуэтом и в игровом масштабе. Проверка формы: читается ли фигура залитой чёрным.
   node tools/chars.js папка  → hero.png, mechs1..3.png, bosses.png */
'use strict';
const fs=require('fs'),path=require('path');
const {serve,launch,openGame}=require('./lib');
(async()=>{
  const dir=path.resolve(process.argv[2]||'chars');fs.mkdirSync(dir,{recursive:true});
  const {srv,url}=await serve();const L=await launch({w:1280,h:720});
  try{
    await openGame(L.page,url+'?gl=0');
    const out=await L.page.evaluate(()=>{const g=game;window.requestAnimationFrame=()=>0;g.gs.reset();for(const k of ABILITY_ORDER)g.gs.abilities[k]=true;
      document.getElementById('menu').classList.add('hidden');g.hud.show(false);g.state='play';
      const step=n=>{for(let i=0;i<n;i++)g.frame(g.__ts=(g.__ts||1000)+16.667);};
      g.world.load('z1_arena',6,18);g.last=0;step(40);
      const W=g.world,p=W.player,C=CFG.player,gameS=g.ppm*g.camera.zoom;
      /* один ряд: цвет на сером, цвет на тёмном, силуэт, игровой масштаб */
      const sheet=(items,tw,th,scale,draw)=>{const rows=4,cv=document.createElement('canvas');cv.width=items.length*tw;cv.height=rows*th+16;const c=cv.getContext('2d');
        const bgs=['#6e6a64','#15130f','#d9d6d0','#2a2622'];
        for(let r=0;r<rows;r++){c.fillStyle=bgs[r];c.fillRect(0,r*th,cv.width,th);}
        items.forEach((it,i)=>{for(let r=0;r<rows;r++){const o=document.createElement('canvas');o.width=tw;o.height=th;const x=o.getContext('2d');
            const s=r===3?gameS:scale;x.setTransform(1,0,0,1,0,0);
            try{draw(x,it,s,tw,th);}catch(e){x.setTransform(1,0,0,1,0,0);x.fillStyle='#f00';x.font='10px monospace';x.fillText(String(e).slice(0,40),4,20);}
            if(r===2){x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#000';x.fillRect(0,0,tw,th);}
            c.drawImage(o,i*tw,r*th);}
          c.fillStyle='#ccc';c.font='11px monospace';c.fillText(it.name,i*tw+4,rows*th+12);});
        return cv.toDataURL('image/png');};
      /* курьер: позы задаются состоянием, поза строится заново (без сглаживания) */
      const poses=[['idle',{}],['shoulder',{state:'idle',idleT:5}],['run',{vx:10,onGround:true,runPh:0.6}],['run2',{vx:10,onGround:true,runPh:2.2}],
        ['jump',{onGround:false,vy:-10}],['fall',{onGround:false,vy:12}],['dash',{dashT:0.12}],['wind',{atkPhase:'wind',atkPT:0.01,atkDir:'side',atkHeavy:false}],
        ['slash',{slashT:C.slashT*0.55,slashDir:'side',slashHeavy:false,slashFace:1}],['charge',{chargeT:0.5,charged:true}],['pulse',{pulseT:0.2}],['hurt',{hurtT:0.3}],
        ['crouch',{crouch:true,h:C.crouchH}],['wall',{onGround:false,vy:2,gripDir:1}]];
      const hero=sheet(poses.map(([n,o])=>({name:n,o})),150,170,62,(x,it,s,tw,th)=>{const q=Object.create(p);Object.assign(q,{state:'idle',vx:0,vy:0,onGround:true,dashT:0,slashT:0,atkPhase:null,chargeT:0,pulseT:0,hurtT:0,crouch:false,gripDir:0,idleT:0,landT:0,jumpStretch:0,invuln:0,_pose:null,_smear:null},it.o);
        if(it.o.crouch){q.y=p.bottom-q.h;}
        x.setTransform(s,0,0,s,tw/2-p.cx*s,th*0.86-p.bottom*s);q.draw(x,1.3);if(it.name==='slash')q.drawSlash(x,1.3);});
      /* механизмы: все типы из реестра */
      const mechs=[];for(const k in ENEMY_TYPES){try{const e=new ENEMY_TYPES[k](W,{type:k,x:p.cx+3,y:p.bottom-2},p.cx+3,p.bottom-2);e.y=p.bottom-e.h;mechs.push({name:k,e});}catch(err){mechs.push({name:k+'!',e:null});}}
      const mech=[];for(let i=0;i<mechs.length;i+=9)mech.push(sheet(mechs.slice(i,i+9),220,220,62,(x,it,s,tw,th)=>{const e=it.e;if(!e)return;const b=e.spriteBounds();x.setTransform(s,0,0,s,tw/2-e.cx*s,th*0.88-(e.y+e.h)*s);e.drawBody(x,1.3);}));
      /* стражи: каждый в своей комнате */
      const bosses=[];for(const id of ['z1_boss','z2_boss','z3_boss','z4_boss','z5_boss']){try{const R0=new Room(ROOMDEFS[id],g.gs),tr=R0.bossTrigger;W.load(id,tr.x+2,tr.y+tr.h-1.73);
          const b=W.boss;if(b){for(let i=0;i<20;i++)W.update(1/60);bosses.push({name:b.name||id,e:b});}}catch(err){bosses.push({name:id+'!'+String(err).slice(0,30),e:null});}}
      const boss=sheet(bosses,360,330,30,(x,it,s,tw,th)=>{const e=it.e;if(!e)return;const b=e.spriteBounds();const k=Math.min(1,Math.min(tw/(b.w*s),th/(b.h*s))*0.95);const S=s*k;
        x.setTransform(S,0,0,S,tw/2-(b.x+b.w/2)*S,th/2-(b.y+b.h/2)*S);e.drawBody(x,1.3);});
      return {hero,mech,boss};});
    const W=(n,d)=>fs.writeFileSync(path.join(dir,n+'.png'),Buffer.from(d.split(',')[1],'base64'));W('hero',out.hero);W('bosses',out.boss);out.mech.forEach((d,i)=>W('mechs'+(i+1),d));
    if(L.errors.length)console.log('ОШИБКИ:\n  '+L.errors.slice(0,8).join('\n  '));
    console.log('листы: '+dir);
  }finally{await L.browser.close();srv.close();}
})();
