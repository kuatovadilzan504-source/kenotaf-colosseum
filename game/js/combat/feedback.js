"use strict";
/* ============================== COMBAT FEEDBACK ==============================
   Одна шкала веса для всего боя. Хитстоп, тряска, звук и частицы растут ступенями:
     корпус < узел < трещина < отрыв узла < прерывание / прижатие < гибель < босс.
   Частицы всегда из точки удара; звук — по материалу (латунь звенит, сталь лязгает,
   ржавчина и чугун глухо хрустят, стекло дребезжит). Никакого текста. */
const MAT_FX={
  brass:{spark:'#ffe6a3',chip:'#c9a227'},steel:{spark:'#fff2d0',chip:'#8a9299'},rust:{spark:'#ffb070',chip:'#7a4f33'},
  iron:{spark:'#ffc890',chip:'#4d4943'},copper:{spark:'#ffd0a0',chip:'#a0603a'},glass:{spark:'#dff4ff',chip:'#bfe3ff'},
  rubber:{spark:'#ffb070',chip:'#2f2b28'},enamel:{spark:'#fff2d0',chip:'#ddd2bd'},oxblood:{spark:'#ffb070',chip:'#7a2a1c'},
  soot:{spark:'#ffb070',chip:'#3e3a35'}
};
class CombatFX{
  constructor(game){this.g=game;}
  m(mat){return MAT_FX[mat]||MAT_FX.steel;}
  /* звезда удара по направлению: короткая, белая в ядре — удар читается как столкновение, а не смена состояния */
  star(x,y,dir,len,col,size){const a=(dir<0?PI:0)+(Math.random()-0.5)*0.35;
    this.g.particles.spawn({kind:'star',x,y,rot:a,ringR:len,size:size||0.16,life:0.1,col:col||'#ffe6b0',add:true,a:1});}
  /* сильный удар отзывается в зале: мир получает толчок (цепи, плети, атмосфера — js/render/ambient.js, gl.js),
     со свода над местом удара сыплется пыль. Только картинка */
  quake(x,y,k){const g=this.g,R=g.world&&g.world.room;g.renderer.impulse(x,y,k,4+k*4);if(!R||k<0.5)return;
    let cy=-1;for(const s of R.solids){if(s.hidden||s.ow||s.dyn)continue;const b=s.y+s.h;if(x+2>=s.x&&x-2<=s.x+s.w&&b<=y&&b>cy)cy=b;}
    if(cy<0||y-cy>14)return;const n=Math.round(4+k*6);
    for(let i=0;i<n;i++)g.particles.spawn({kind:'dust',x:x+(Math.random()-0.5)*4,y:cy+0.05,vx:(Math.random()-0.5)*0.3,vy:Math.random()*0.5,g:5,drag:1.6,life:1.4+Math.random(),size:0.022+Math.random()*0.03,col:'#9a8e7c',a:0.75});
    if(k>=1)for(let i=0;i<3;i++)g.particles.spawn({kind:'steam',x:x+(Math.random()-0.5)*3,y:cy+0.25,vx:(Math.random()-0.5)*0.4,vy:0.35,life:1.8,size:0.3,grow:0.5,drag:1.2,col:'#8a8072',a:0.3});}
  /* копоть на полу под погибшим механизмом */
  scorch(x,y,w){const g=this.g,R=g.world&&g.world.room;if(!R)return;let fy=1e9;
    for(const s of R.solids){if(s.hidden||s.dyn)continue;if(x>=s.x&&x<=s.x+s.w&&s.y>=y-0.3&&s.y<fy)fy=s.y;}
    if(fy-y>6)return;g.particles.spawn({kind:'scorch',x,y:fy+0.02,size:w||1.2,life:5,col:'#0e0b08',a:0.55,drag:0});}
  /* вспышка света от удара (WebGL-кадр, js/render/gl.js): металл освещает всё вокруг — только картинка */
  lit(x,y,r,col,i,life){const G=this.g.gl;if(G&&G.ok)G.flash(x,y,r,col,i,life);}
  chips(x,y,mat,n,spd,dir){const g=this.g,m=this.m(mat);
    for(let i=0;i<n;i++)g.particles.spawn({kind:'debris',x,y,vx:(dir||0)*spd*0.6+(Math.random()-0.5)*spd,vy:-Math.random()*spd-1,
      g:28,life:0.6+Math.random()*0.5,size:0.05+Math.random()*0.07,col:m.chip,rot:Math.random()*6,vr:(Math.random()-0.5)*20,drag:0.3});
    if(mat==='glass')for(let i=0;i<n;i++)g.particles.spawn({kind:'spark',x,y,vx:(Math.random()-0.5)*8,vy:-Math.random()*6,
      life:0.4,size:0.04,col:'#e8f6ff',add:true,g:20});}
  sparks(x,y,mat,n,spd,dir){const m=this.m(mat);
    this.g.particles.burst(x,y,n,{kind:'spark',col:m.spark,spd:spd,life:0.4,size:0.05,add:true,g:14,
      ang:dir?(dir>0?0:PI):undefined,spread:dir?2.2:undefined});}
  /* удар по корпусу: лёгкий, глухой */
  bodyHit(x,y,mat,h,boss){const g=this.g;this.lit(x,y,h.heavy?3.4:2.4,this.m(mat).spark,h.heavy?0.8:0.5,0.12);
    g.hitstop(h.heavy?0.09:0.05);g.camera.addShake(h.heavy?0.45:0.22);
    g.audio.mat(mat,h.heavy?1:0.75);this.sparks(x,y,mat,h.heavy?14:7,h.heavy?7:5,h.dir);this.chips(x,y,mat,h.heavy?5:2,4,h.dir);
    if(h.heavy){this.star(x,y,h.dir,1.3,this.m(mat).spark);this.quake(x,y,0.55);}}
  /* удар по узлу: звонче; если узел только что треснул — хруст */
  /* скользящий удар по закрытой детали: глухо, коротко, искры в сторону — «не сюда» без единого слова */
  glance(x,y,mat,h){const g=this.g;this.lit(x,y,1.6,'#d8d0c0',0.35,0.08);g.hitstop(0.028);g.camera.addShake(0.08);
    g.audio.mat(mat,0.4);g.audio.tone(180,0.06,'triangle',0.02,120);this.sparks(x,y,'steel',4,4,-(h.dir||0));}
  nodeHit(x,y,mat,h,cracked,boss,open){const g=this.g;this.lit(x,y,cracked?4.2:(open?3.8:3),this.m(mat).spark,cracked?1:(open?0.9:0.7),0.16);
    g.hitstop(h.heavy?0.1:(open?0.085:0.065));g.camera.addShake(h.heavy?0.55:(open?0.42:0.3));
    g.audio.mat(mat,1);if(cracked)g.audio.crack(mat);
    this.sparks(x,y,mat,cracked?16:10,cracked?8:6,h.dir);this.chips(x,y,mat,cracked?6:3,5,h.dir);
    if(cracked)g.particles.burst(x,y,6,{kind:'smoke',col:'#3a342c',spd:1.2,life:1.0,size:0.22,grow:0.6,drag:1.2,a:0.5});
    this.star(x,y,h.dir,cracked?1.7:(h.heavy?1.4:1.0),this.m(mat).spark,cracked?0.2:0.15);this.quake(x,y,cracked?0.6:(h.heavy?0.5:0.25));
    this.g.renderer.glowAdd(x,y,1.2,'#ffe6a3',0.6);}
  /* броня (узел закрыт с этой стороны): «тинь», отскок искр, без урона */
  deflect(x,y,mat){const g=this.g;this.lit(x,y,2.4,'#fff2d0',0.6,0.1);g.hitstop(0.035);g.camera.addShake(0.15);g.audio.deflect();
    this.sparks(x,y,'steel',8,6);}
  /* отрыв узла: самая важная обратная связь боя */
  breakNode(x,y,mat,guar,boss){const g=this.g;
    g.hitstop(boss?0.16:(guar?0.14:0.12));g.camera.addShake(boss?1.1:0.75);g.audio.breakPart(mat,boss);this.lit(x,y,boss?7:5.5,guar?'#dff4ff':'#ffcf7a',1,0.3);
    this.sparks(x,y,mat,26,10);this.chips(x,y,mat,12,7);
    g.particles.burst(x,y,14,{kind:'steam',col:'#e8e0d0',spd:4,life:0.9,size:0.4,grow:1.2,drag:1.8,a:0.7});
    g.particles.burst(x,y,8,{kind:'smoke',col:'#2a2622',spd:2,life:1.6,size:0.4,grow:1,drag:1.2,a:0.6});
    g.particles.spawn({kind:'ring',x,y,ringR:guar?3:2.2,life:0.4,size:0.1,col:guar?'#dff4ff':'#ffcf7a',add:true,a:0.9});
    if(guar){g.particles.spawn({kind:'shock',x,y,ringR:3.4,life:0.35,size:0.1,col:'#ffffff',add:true,a:0.8});g.flash(0.12,'#dff4ff');}
    this.star(x,y,1,2.6,guar?'#dff4ff':'#ffd9a0',0.24);this.star(x,y,-1,1.8,guar?'#dff4ff':'#ffd9a0',0.18);this.quake(x,y,boss?1.3:1.0);
    g.renderer.glowAdd(x,y,2.4,'#ffcf7a',0.9);}
  /* прерывание импульсом: удар по самой системе врага */
  interrupt(x,y,mat,boss){const g=this.g;
    g.hitstop(boss?0.14:0.1);g.camera.addShake(boss?0.9:0.6);g.audio.interrupt();g.slowmo(0.08,0.35);this.lit(x,y,5.5,'#ffe2a0',1,0.3);
    this.sparks(x,y,mat,22,9);
    g.particles.spawn({kind:'ring',x,y,ringR:2.6,life:0.45,size:0.12,col:'#ffe2a0',add:true,a:1});
    g.particles.spawn({kind:'shock',x,y,ringR:1.6,life:0.3,size:0.1,col:'#ffffff',add:true,a:0.9});
    this.star(x,y,1,2.2,'#ffe2a0',0.2);this.star(x,y,-1,2.2,'#ffe2a0',0.2);this.quake(x,y,0.9);
    g.renderer.glowAdd(x,y,2.8,'#ffcf7a',1);}
  /* РАЗРЫВ: перегретый удар выдирает узел — белый удар, красный жар, долгая остановка */
  rupture(x,y,mat){const g=this.g;
    g.hitstop(0.2);g.camera.addShake(1.2);g.slowmo(0.12,0.3);g.flash(0.22,'#ffd8b0');g.audio.rupture();this.lit(x,y,8,'#ff9a5a',1,0.42);
    this.sparks(x,y,mat,40,13);this.chips(x,y,mat,18,9);
    g.particles.burst(x,y,26,{kind:'spark',col:'#ff7a40',spd:12,life:0.6,size:0.07,add:true,g:12});
    g.particles.spawn({kind:'ring',x,y,ringR:3.4,life:0.5,size:0.14,col:'#ff9a5a',add:true,a:1});
    g.particles.spawn({kind:'shock',x,y,ringR:2.4,life:0.35,size:0.12,col:'#ffffff',add:true,a:1});
    this.star(x,y,1,3.2,'#ffb080',0.26);this.star(x,y,-1,2.4,'#ffb080',0.2);this.quake(x,y,1.4);
    g.renderer.glowAdd(x,y,3.6,'#ff8a4a',1);g.renderer.wave(x,y,4,0.5);}
  /* импульс в несрываемый замах: искры отскакивают красным — «тут нужен рывок» */
  redDeny(x,y){const g=this.g;if(this._rd&&g.world.time-this._rd<0.4)return;this._rd=g.world.time;
    g.audio.deflect();g.particles.burst(x,y,10,{kind:'spark',col:'#ff5a40',spd:6,life:0.35,size:0.05,add:true,g:10});}
  pin(x,y,mat){const g=this.g;
    g.hitstop(0.11);g.camera.addShake(0.7);g.audio.pin();
    g.particles.burst(x,y,24,{kind:'debris',col:'#7a6c5c',spd:7,life:0.9,size:0.1,g:26});
    g.particles.burst(x,y,12,{kind:'dust',col:'#8a7a6a',spd:3,life:1.2,size:0.3,grow:0.6,drag:1.4,a:0.5});
    g.particles.spawn({kind:'shock',x,y,ringR:2.6,life:0.35,size:0.1,col:'#ffd27a',add:true,a:0.8});this.quake(x,y,0.8);}
  slam(x,y,mat,speed){const g=this.g,k=clamp(speed/14,0.4,1);
    g.hitstop(0.06*k+0.02);g.camera.addShake(0.45*k);g.audio.mat(mat,k);g.audio.clatter('iron',k);
    g.particles.burst(x,y,Math.round(14*k),{kind:'debris',col:'#7a6c5c',spd:5,life:0.7,size:0.09,g:24});this.quake(x,y,0.7*k);}
  mark(x,y){this.g.audio.mark();}
  kill(x,y,mat,boss){const g=this.g;
    g.hitstop(boss?0.32:0.1);g.camera.addShake(boss?2.2:0.65);g.audio.kill(mat,boss);
    if(boss)g.flash(0.5);
    this.sparks(x,y,mat,boss?60:22,boss?14:9);this.chips(x,y,mat,boss?30:10,boss?10:7);
    g.particles.burst(x,y,boss?30:12,{kind:'smoke',col:'#2a2622',spd:boss?4:2.4,life:boss?3:1.8,size:boss?1.2:0.5,grow:1.2,drag:1.1,a:0.6});
    g.particles.burst(x,y,boss?30:10,{kind:'steam',col:'#e8e0d0',spd:boss?8:5,life:1.0,size:0.5,grow:1.4,drag:1.6,a:0.6});
    this.quake(x,y,boss?1.5:0.9);this.scorch(x,y,boss?3:1.2);}
}
