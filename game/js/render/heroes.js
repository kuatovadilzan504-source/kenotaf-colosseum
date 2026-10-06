"use strict";
/* ============================== КЛЮЧЕВЫЕ ЗАЛЫ (HERO ROOMS) ==============================
   Процедурная основа строит любую комнату из словаря зоны. Ключевые залы получают поверх неё
   авторскую постановку: свой проём в задней стене, свой ориентир-символ за ним (часто — движущийся,
   на своей глубине параллакса), свой передний план и свой свет (GFX_ROOM в gl.js).
     cut   — проёмы в стене игрового слоя (до вуали и реквизита): сквозь них виден ориентир;
     back  — уникальная архитектура на стене (за твёрдой геометрией);
     land  — глубина за стеной, рисуется каждый кадр (машины движутся): f — параллакс, 1 — плоскость игры;
     dyn   — живое в плоскости игры (за курьером): кадила, люстры, капсулы пневмопочты;
     fgd   — передний план (добавляется к слою комнаты);
     shaft — луч света в плоскости игры (каждый кадр, в слой свечения).
   Только картинка: твёрдая геометрия, двери и всё игровое — прежние. */
const HeroRooms={
  get(R){return R&&!R.trial&&HERO_ROOMS[R.id];},
  /* в игровом слое: проёмы и уникальная архитектура */
  wall(c,L,R,r){const H=this.get(R);if(!H)return;r=rng(R.id+'hero');
    if(H.cut){c.save();c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.94)';for(const q of H.cut){q(c);c.fill();}c.restore();
      for(const q of H.cut){q(c);c.strokeStyle='#15120f';c.lineWidth=0.5;c.stroke();q(c);c.strokeStyle='rgba(255,222,180,.16)';c.lineWidth=0.06;c.stroke();}}
    if(H.back)H.back(c,L,R,r);},
  /* слой: дополнения к дальнему плану, переднему плану, свечению */
  layer(key,c,L,R){const H=this.get(R);if(!H||!H[key])return;try{H[key](c,L,R,rng(R.id+'hero'+key));}catch(e){console.error('hero '+key,e);}},
  /* глубина за стеной: в мировых метрах комнаты, параллакс f вокруг центра комнаты */
  land(c,R,g,t){const H=this.get(R);if(!H||!H.land)return;const cam=g.camera,s=g.ppm*cam.zoom,f=H.f||0.85;
    const ox=g.vw/2-(R.w/2+(cam.cx-R.w/2)*f)*s,oy=g.vh/2-(R.h/2+(cam.cy-R.h/2)*f)*s;
    c.save();c.setTransform(s,0,0,s,ox,oy);try{H.land(c,R,t,g);}catch(e){console.error('hero land',e);}c.restore();},
  dyn(c,R,t,g){const H=this.get(R);if(!H||!H.dyn)return;try{H.dyn(c,R,t,g);}catch(e){console.error('hero dyn',e);}},
  shaft(c,R,t){const H=this.get(R);if(!H||!H.shaft)return;try{H.shaft(c,R,t);}catch(e){console.error('hero shaft',e);}}
};
/* общие формы */
const HR={
  ring(c,x,y,r){c.beginPath();c.arc(x,y,r,0,TAU);},
  lancet(c,x0,y0,w,h){const m=x0+w/2;c.beginPath();c.moveTo(x0,y0+h);c.lineTo(x0,y0+w*0.7);c.quadraticCurveTo(x0,y0+w*0.12,m,y0);c.quadraticCurveTo(x0+w,y0+w*0.12,x0+w,y0+w*0.7);c.lineTo(x0+w,y0+h);c.closePath();},
  arch(c,x0,y0,w,h){const a=w/2;c.beginPath();c.moveTo(x0,y0+h);c.lineTo(x0,y0+a);c.arc(x0+a,y0+a,a,PI,TAU);c.lineTo(x0+w,y0+h);c.closePath();},
  rect(c,x,y,w,h){c.beginPath();c.rect(x,y,w,h);},
  /* кольцо на болтах вокруг проёма */
  boltRing(c,x,y,r,n,col){c.strokeStyle=col||'#2a2622';c.lineWidth=0.7;c.beginPath();c.arc(x,y,r+0.3,0,TAU);c.stroke();for(let i=0;i<n;i++){const a=i/n*TAU;Kit.bolt(c,x+Math.cos(a)*(r+0.3),y+Math.sin(a)*(r+0.3),0.08);}},
  glow(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();},
  leafy(c,x,y,R,cols,r,n){for(let i=0;i<(n||26);i++){const a=r()*TAU,d=Math.sqrt(r())*R;c.fillStyle=cols[(r()*cols.length)|0];c.beginPath();c.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d*0.7,R*(0.18+r()*0.14),R*(0.1+r()*0.08),r()*3,0,TAU);c.fill();}}
};
const HERO_ROOMS={
  /* ---------- I · ОТСТОЙНИК ---------- */
  /* Насосная: за круглым окном в стене — главное колесо станции, медленно гонит хладагент; латунная ступица светится */
  z1_hub:{f:0.86,
    cut:[c=>HR.ring(c,25,11,6.4)],
    back(c,L,R,r){HR.boltRing(c,25,11,6.4,24,'#262320');c.strokeStyle='#b08d3e';c.lineWidth=0.16;c.beginPath();c.arc(25,11,6.45,0,TAU);c.stroke();c.strokeStyle='rgba(255,236,190,.45)';c.lineWidth=0.06;c.beginPath();c.arc(25,11,6.5,PI*1.05,PI*1.6);c.stroke();Kit.stencil(c,21.2,4.0,'ГЛАВНОЕ КОЛЕСО · Н-00',0.42,'rgba(232,201,106,.55)',0.6);
      for(const x of [17.6,32.4]){Kit.pipe(c,[[x,0],[x,6],[x+(x<25?2.2:-2.2),8]],0.42,'rust',{seed:(x*3)|0,band:2,bandCol:'#c9a227'});}},
    land(c,R,t){const cx=25,cy=11,Rr=7.4,a=t*0.22;
      c.fillStyle='#0d0f0e';c.beginPath();c.arc(cx,cy,Rr+1,0,TAU);c.fill();HR.glow(c,cx,cy+3,Rr*1.1,'#3fbf8f',0.5);
      c.save();c.translate(cx,cy);c.rotate(a);for(let i=0;i<7;i++){c.rotate(TAU/7);c.fillStyle=i%2?'#262b28':'#2e3430';c.beginPath();c.moveTo(0.9,-0.4);c.quadraticCurveTo(Rr*0.55,-Rr*0.55,Rr*0.98,-0.6);c.lineTo(Rr*0.98,0.6);c.quadraticCurveTo(Rr*0.5,0.1,0.9,0.5);c.closePath();c.fill();
        c.fillStyle='rgba(180,230,200,.08)';c.beginPath();c.moveTo(0.9,-0.4);c.quadraticCurveTo(Rr*0.55,-Rr*0.55,Rr*0.98,-0.6);c.lineTo(Rr*0.9,-0.35);c.quadraticCurveTo(Rr*0.5,-Rr*0.4,0.9,-0.2);c.closePath();c.fill();}
      c.restore();c.fillStyle='#8a6d2a';c.beginPath();c.arc(cx,cy,1.3,0,TAU);c.fill();c.fillStyle='#e8c96a';c.beginPath();c.arc(cx,cy,0.55,0,TAU);c.fill();HR.glow(c,cx,cy,2.6,'#ffcf7a',0.35);
      for(let i=0;i<6;i++){const q=a*2+i*TAU/6;Kit.bolt(c,cx+Math.cos(q)*0.95,cy+Math.sin(q)*0.95,0.1);}}},
  /* Галерея чистильщиков: за длинным окном сортировки по монорельсу медленно ползут списанные щётки-мокрицы на крюках */
  z1_gallery:{f:0.9,
    cut:[c=>HR.rect(c,30.6,1.8,20.6,5.6)],
    back(c,L,R,r){for(let x=30.6;x<=51.2;x+=5.15){c.fillStyle='#1d1a17';c.fillRect(x-0.22,1.8,0.44,5.6);for(let y=2.2;y<7.4;y+=0.9)Kit.bolt(c,x,y,0.05);}
      c.fillStyle='#24201c';c.fillRect(30.4,7.3,21,0.4);Kit.stencil(c,31,8.3,'СПИСАНИЕ · НА ПЕРЕПЛАВКУ',0.36,'rgba(216,204,178,.5)',0.55);},
    land(c,R,t){c.fillStyle='#0e0b09';c.fillRect(28,0,26,9);const fg=c.createLinearGradient(30,0,54,0);fg.addColorStop(0,'rgba(255,120,50,0)');fg.addColorStop(1,'rgba(255,130,50,.55)');c.fillStyle=fg;c.fillRect(28,3.5,26,5);HR.glow(c,52,7,6,'#ff8a3a',0.6);
      c.fillStyle='#1a1714';c.fillRect(28,2.4,26,0.22);
      for(let i=0;i<7;i++){const x=28+((t*0.35+i*3.6)%26.5),sw=Math.sin(t*0.9+i)*0.06;c.save();c.translate(x,2.6);c.rotate(sw);
        c.strokeStyle='#15120f';c.lineWidth=0.06;c.beginPath();c.moveTo(0,0);c.lineTo(0,1.2);c.stroke();c.beginPath();c.arc(0.12,1.3,0.12,PI,TAU*0.95);c.stroke();
        c.fillStyle='#140e0a';for(let k=0;k<4;k++){c.beginPath();c.ellipse(0.1,1.65+k*0.32,0.42-k*0.04,0.2,0,0,TAU);c.fill();}
        c.strokeStyle='#1a120c';c.lineWidth=0.04;for(let k=0;k<5;k++){c.beginPath();c.moveTo(-0.3,1.7+k*0.25);c.lineTo(-0.55,1.85+k*0.25);c.stroke();}c.restore();}},
    fgd(c,L,R,r){for(const [x,l] of [[6,4.2],[9.5,2.6],[44,3.4]]){Kit.chain(c,x,-0.3,l,0.18);c.fillStyle='#120f0c';c.beginPath();c.arc(x+0.15,l+0.2,0.35,0,PI);c.lineWidth=0.18;c.strokeStyle='#120f0c';c.stroke();}}},
  /* ---------- II · СОТЫ ---------- */
  /* Крыши: верх стены снят — над крышами открывается внутреннее «небо» аркологии: дома-соты уходят в дымку,
     водонапорные баки, антенны; под сводом — искусственная луна */
  z2_roofs:{f:0.55,noBays:true,
    land(c,R,t){
      HR.glow(c,46,-1,9,'#d8ccff',0.35);c.fillStyle='#ece6ff';c.beginPath();c.arc(46,-1,1.6,0,TAU);c.fill();
      /* зарево города у горизонта: тёмные башни читаются силуэтом на светлеющем небе */
      const hg=c.createLinearGradient(0,4,0,18);hg.addColorStop(0,'rgba(120,90,150,0)');hg.addColorStop(1,'rgba(160,110,150,.5)');c.fillStyle=hg;c.fillRect(-20,4,104,16);
      const rows=[[13,'#2a2034',0.3],[17,'#1c1626',0.45],[22,'#130e18',0.65]];
      for(const [base,col,lit] of rows){const r=rng('roofsky'+base);for(let x=-16;x<80;x+=3+r()*4){const w=2.4+r()*3,h=6+r()*10,top=base-h;c.fillStyle=col;c.fillRect(x,top,w,h+20);
          if(r()<0.4){c.fillRect(x+w*0.3,top-1.4,w*0.5,1.4);c.fillRect(x+w*0.35,top-1.9,w*0.4,0.5);}
          if(r()<0.35){c.strokeStyle=col;c.lineWidth=0.08;c.beginPath();c.moveTo(x+w*0.7,top);c.lineTo(x+w*0.7,top-2.2);c.moveTo(x+w*0.5,top-1.6);c.lineTo(x+w*0.9,top-1.6);c.stroke();}
          for(let y=top+0.6;y<base+6;y+=0.75)for(let xx=x+0.3;xx<x+w-0.2;xx+=0.5)if(r()<lit*0.45){c.fillStyle=r()<0.85?'rgba(255,190,110,.8)':'rgba(170,210,255,.65)';c.fillRect(xx,y,0.2,0.26);}
          if(r()<0.25){c.fillStyle='rgba(255,90,60,.9)';c.beginPath();c.arc(x+w/2,top-(r()<0.4?2.2:0.1),0.12,0,TAU);c.fill();}}}},
    fgd(c,L,R,r){/* бельё на верёвках и телевизионные антенны у краёв кадра */
      for(const [x0,y0,x1,y1] of [[2,1.2,13,2.6],[48,0.8,60,2.2]]){Kit.clothesline(c,x0,y0,x1,y1,(x0*3)|0);}
      for(const x of [22,58]){c.strokeStyle='#0c0810';c.lineWidth=0.12;c.beginPath();c.moveTo(x,L.h);c.lineTo(x,L.h-5);c.stroke();c.lineWidth=0.08;for(let k=0;k<4;k++){c.beginPath();c.moveTo(x-1.2+k*0.2,L.h-4.6+k*0.5);c.lineTo(x+1.2-k*0.2,L.h-4.6+k*0.5);c.stroke();}}}},
  /* Часовня: под розой — статуя Основателя без лица, в руках запечатанное письмо; в стене — высокая арка к ней.
     Внизу кадра — спинки скамей, сверху качаются кадила */
  z2_chapel:{f:0.8,
    cut:[c=>HR.arch(c,16.5,11,11,16)],
    /* витраж — в одном плане со статуей и позади неё: стекло, лик и лучи не ездят друг относительно друга */
    land(c,R,t){const x=22,y=27;c.fillStyle='#120c10';c.fillRect(14,8,16,20);HR.glow(c,x,13.2,8,'#e8c96a',0.22);
      c.fillStyle='#0a070a';c.beginPath();c.arc(x,13.2,4.25,0,TAU);c.fill();SA.rose(c,x,13.2,3.9,false);
      for(const k of [-1,1]){const g=c.createLinearGradient(x,13.2,x+k*3,y);g.addColorStop(0,'rgba(232,201,106,.2)');g.addColorStop(1,'rgba(232,201,106,0)');
        c.fillStyle=g;c.beginPath();c.moveTo(x+k*0.6,14.5);c.lineTo(x+k*2.2,14.5);c.lineTo(x+k*6.5,y);c.lineTo(x+k*2.5,y);c.closePath();c.fill();}
      c.fillStyle='#4a3e46';c.fillRect(x-2.2,y-1.6,4.4,1.6);c.fillRect(x-1.8,y-2.2,3.6,0.6);
      c.fillStyle='#6a5a62';c.beginPath();c.moveTo(x-1.5,y-2.2);c.lineTo(x-1.1,y-9);c.quadraticCurveTo(x-1.6,y-10.8,x-0.9,y-11.6);c.lineTo(x+0.9,y-11.6);c.quadraticCurveTo(x+1.6,y-10.8,x+1.1,y-9);c.lineTo(x+1.5,y-2.2);c.closePath();c.fill();
      c.beginPath();c.ellipse(x,y-12.5,0.85,1.05,0,0,TAU);c.fill();c.fillStyle='rgba(255,226,160,.22)';c.beginPath();c.ellipse(x-0.3,y-12.8,0.3,0.7,0.2,0,TAU);c.fill();
      c.fillStyle='#e8dcc0';c.fillRect(x-0.7,y-8.4,1.4,0.95);c.fillStyle='#8a2418';c.beginPath();c.arc(x,y-7.9,0.22,0,TAU);c.fill();
      c.strokeStyle='rgba(255,226,160,.55)';c.lineWidth=0.1;c.beginPath();c.moveTo(x-0.85,y-13.4);c.quadraticCurveTo(x-1.0,y-12.2,x-0.9,y-11.6);c.lineTo(x-1.5,y-10.6);c.moveTo(x-1.1,y-9);c.lineTo(x-1.5,y-2.2);c.stroke();
      c.strokeStyle='rgba(110,200,210,.35)';c.beginPath();c.moveTo(x+1.1,y-9);c.lineTo(x+1.5,y-2.2);c.stroke();},
    dyn(c,R,t,g){for(const [x,l,ph] of [[9,5,0],[34,4,1.7],[40,6,3.1]]){const a=Math.sin(t*0.7+ph)*0.12,ex=x+Math.sin(a)*l,ey=0.4+Math.cos(a)*l;
      c.strokeStyle='#1a1214';c.lineWidth=0.04;c.beginPath();c.moveTo(x,0.4);c.lineTo(ex,ey);c.stroke();c.fillStyle='#8a6d2a';c.beginPath();c.arc(ex,ey+0.25,0.28,0,PI);c.closePath();c.fill();
      c.fillStyle='#5a4512';c.fillRect(ex-0.3,ey,0.6,0.08);g.renderer.glowAdd(ex,ey+0.35,0.9,'#ffb060',0.3);
      for(let k=0;k<3;k++){const u=((t*0.25+k/3+ph)%1);c.fillStyle=rgba('#c8b8a8',0.25*(1-u));c.beginPath();c.arc(ex+Math.sin(u*6+ph)*0.3,ey-u*2.4,0.15+u*0.4,0,TAU);c.fill();}}},
    fgd(c,L,R,r){for(let x=-1;x<L.w;x+=3.4){c.fillStyle='#07050a';c.fillRect(x,L.h-1.5,3.0,1.6);c.fillRect(x+0.1,L.h-2.3,0.16,0.9);c.fillRect(x+2.7,L.h-2.3,0.16,0.9);c.fillRect(x,L.h-2.35,3.0,0.12);}}},
  /* ---------- III · ЭДЕМ ---------- */
  /* Фруктовый сад: за стеклом — Древо-эталон, старейшее дерево Эдема на латунных подпорках с бирками каталога */
  z3_orchard:{f:0.72,
    land(c,R,t){const x=31,y=27,r=rng('etalon'),sw=Math.sin(t*0.25)*0.12;
      c.fillStyle='#2a2014';c.beginPath();c.moveTo(x-2.2,y);c.quadraticCurveTo(x-1.2,y-7,x-0.8,y-12);c.lineTo(x+0.8,y-12);c.quadraticCurveTo(x+1.4,y-7,x+2.4,y);c.closePath();c.fill();
      for(const s of [-1,1]){c.strokeStyle='#2a2014';c.lineWidth=0.8;c.beginPath();c.moveTo(x,y-10);c.quadraticCurveTo(x+s*4,y-13,x+s*8+sw,y-16);c.stroke();c.lineWidth=0.5;c.beginPath();c.moveTo(x+s*3,y-12);c.quadraticCurveTo(x+s*5,y-16,x+s*4+sw,y-19);c.stroke();}
      for(const [dx,dy,R2] of [[-8,-17,4.2],[8,-17,4.4],[-3.5,-20,4.6],[4,-21,4.4],[0,-15,4]]){HR.leafy(c,x+dx+sw,y+dy,R2,['#1f4a32','#2a5e38','#3a7040','#2f6a4a'],r,40);
        HR.leafy(c,x+dx+sw+R2*0.25,y+dy-R2*0.3,R2*0.5,['#5f8a40','#7a9a48'],r,10);}
      for(let i=0;i<14;i++){c.fillStyle='#d86a3a';c.beginPath();c.arc(x+(r()-0.5)*18+sw,y-14-r()*8,0.18,0,TAU);c.fill();}
      for(const s of [-1,1]){c.strokeStyle='#8a6d2a';c.lineWidth=0.18;c.beginPath();c.moveTo(x+s*6,y);c.lineTo(x+s*4.4,y-11.5);c.stroke();c.fillStyle='#b08d3e';c.fillRect(x+s*4.4-0.25,y-11.8,0.5,0.4);}
      for(const [dx,dy] of [[-6,-12],[5,-13],[-1,-9]]){c.strokeStyle='#d8cdb2';c.lineWidth=0.03;c.beginPath();c.moveTo(x+dx,y+dy);c.lineTo(x+dx+0.1,y+dy+0.6);c.stroke();c.fillStyle='#e6dcc2';c.fillRect(x+dx-0.15,y+dy+0.6,0.3,0.42);}
      HR.glow(c,x,y-24,10,'#fff0b8',0.3);},
    fgd(c,L,R,r){for(const [x,s] of [[2,1],[L.w-2,-1]]){c.strokeStyle='#14240f';c.lineWidth=0.5;c.beginPath();c.moveTo(x-s*3,-0.5);c.quadraticCurveTo(x+s*3,2,x+s*7,4.5);c.stroke();
      HR.leafy(c,x+s*5,3.4,2.6,['#0f2014','#14281a','#1a3220'],r,40);for(let i=0;i<5;i++){c.fillStyle='#4a1e10';c.beginPath();c.arc(x+s*(3+r()*5),3+r()*2.4,0.22,0,TAU);c.fill();}}}},
  /* Купольный подъём: под центром купола — медная лилия, символ Эдема: латунный стебель, стеклянный колокол,
     в нём светятся пестики. Цветок медленно «дышит» */
  z3_dome:{f:0.8,
    land(c,R,t){const x=31,y=30,br=Math.sin(t*0.4)*0.15;c.strokeStyle='#4a3810';c.lineWidth=0.7;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-2,y-10,x+0.5,y-17);c.stroke();
      c.strokeStyle='rgba(255,226,160,.3)';c.lineWidth=0.12;c.beginPath();c.moveTo(x-0.2,y);c.quadraticCurveTo(x-2.2,y-10,x+0.3,y-17);c.stroke();
      for(const [s,h,l] of [[-1,8,6],[1,12,5],[-1,14,4]]){c.save();c.translate(x-1+s*0.3,y-h);c.rotate(s*0.5);c.fillStyle=s<0?'#1f4a32':'#2a5e38';c.beginPath();c.ellipse(s*l*0.5,0,l*0.5,l*0.18,0,0,TAU);c.fill();
        c.strokeStyle='rgba(120,180,120,.4)';c.lineWidth=0.05;c.beginPath();c.moveTo(0,0);c.lineTo(s*l,0);c.stroke();c.restore();}
      c.save();c.translate(x+0.5,y-17);c.rotate(0.15+br*0.3);
      const bell=c.createLinearGradient(-3,0,3,0);bell.addColorStop(0,'rgba(150,215,200,.8)');bell.addColorStop(0.5,'rgba(225,255,240,.92)');bell.addColorStop(1,'rgba(110,190,180,.78)');
      c.fillStyle=bell;c.beginPath();c.moveTo(-0.6,0);c.quadraticCurveTo(-3.2-br,-1.6,-3.6-br,-5);c.quadraticCurveTo(-1.5,-4.2,0,-5.6);c.quadraticCurveTo(1.5,-4.2,3.6+br,-5);c.quadraticCurveTo(3.2+br,-1.6,0.6,0);c.closePath();c.fill();
      c.strokeStyle='#8a6d2a';c.lineWidth=0.12;c.stroke();c.lineWidth=0.06;for(const q of [-2,0,2]){c.beginPath();c.moveTo(q*0.2,0);c.quadraticCurveTo(q*1.1,-2.6,q*1.4,-4.8);c.stroke();}
      for(let i=0;i<5;i++){const a=-PI/2+(i-2)*0.25;c.strokeStyle='#c9a227';c.lineWidth=0.06;c.beginPath();c.moveTo(0,-0.4);c.lineTo(Math.cos(a)*3.2,-0.4+Math.sin(a)*3.2);c.stroke();HR.glow(c,Math.cos(a)*3.2,-0.4+Math.sin(a)*3.2,1.2,'#d8fff4',0.85);}
      HR.glow(c,0,-2.5,5,'#c8fff0',0.35);
      c.restore();},
    fgd(c,L,R,r){for(const x of [3,L.w-6]){HR.leafy(c,x,L.h-1,3.4,['#0d1c12','#122418','#16301e'],r,50);for(let i=0;i<6;i++){c.strokeStyle='#0d1c12';c.lineWidth=0.14;c.beginPath();c.moveTo(x+(r()-0.5)*4,L.h);c.quadraticCurveTo(x+(r()-0.5)*5,L.h-3,x+(r()-0.5)*6,L.h-5-r()*2);c.stroke();}}}},
  /* ---------- IV · ПЕЧАТЬ ---------- */
  /* Часовая башня: за круглым окном — спусковое колесо часов Печати; якорь качается, колесо идёт рывками в такт */
  z4_clocktower:{f:0.86,
    cut:[c=>HR.ring(c,13,22,5.6)],
    back(c,L,R,r){HR.boltRing(c,13,22,5.6,20,'#22201c');Kit.stencil(c,10.2,15.4,'СПУСК · ХОД ПЕЧАТИ',0.36,'rgba(242,230,192,.5)',0.6);},
    land(c,R,t){const cx=13,cy=23,step=Math.floor(t)+EZ.out(clamp((t%1)*6,0,1)),a=step*(TAU/30);c.fillStyle='#0e0d0c';c.beginPath();c.arc(cx,cy-1,8,0,TAU);c.fill();HR.glow(c,cx,cy-6,7,'#f2e6c0',0.25);
      c.save();c.translate(cx,cy);c.rotate(a);c.fillStyle='#6d5416';c.beginPath();for(let i=0;i<30;i++){const q=i/30*TAU,q2=(i+0.6)/30*TAU;c.lineTo(Math.cos(q)*4.2,Math.sin(q)*4.2);c.lineTo(Math.cos(q2)*5.1,Math.sin(q2)*5.1);c.lineTo(Math.cos(q2+0.04)*4.2,Math.sin(q2+0.04)*4.2);}c.closePath();c.fill();
      c.fillStyle='#0e0d0c';c.beginPath();c.arc(0,0,3.6,0,TAU);c.fill();c.fillStyle='#8a6d2a';for(let i=0;i<5;i++){c.save();c.rotate(i*TAU/5);c.fillRect(-0.18,0,0.36,3.8);c.restore();}c.beginPath();c.arc(0,0,0.7,0,TAU);c.fill();c.restore();
      const ra=Math.sin(t*PI)*0.22;c.save();c.translate(cx,cy-6.6);c.rotate(ra);c.strokeStyle='#4a4f55';c.lineWidth=0.4;c.beginPath();c.moveTo(-3.4,1.6);c.quadraticCurveTo(0,-0.6,3.4,1.6);c.stroke();
      c.fillStyle='#5a6068';for(const s of [-1,1]){c.beginPath();c.moveTo(s*3.4,1.4);c.lineTo(s*3.0,2.4);c.lineTo(s*3.8,1.8);c.closePath();c.fill();}c.fillStyle='#8a6d2a';c.beginPath();c.arc(0,0,0.45,0,TAU);c.fill();c.restore();}},
  /* Маятниковая шахта: в высокой прорези качается маятник Печати — латунная линза размером с комнату */
  z4_pendulum:{f:0.86,
    cut:[c=>HR.rect(c,9.6,1.2,4.8,40.6)],
    back(c,L,R,r){for(const x of [9.6,14.4]){c.fillStyle='#1c2128';c.fillRect(x-0.25,1.2,0.5,40.6);for(let y=1.6;y<41.6;y+=1.2)Kit.bolt(c,x,y,0.06);}},
    land(c,R,t){const px=12,py=-2,Lp=30,a=Math.sin(t*TAU/7)*0.075;c.fillStyle='#0b0f14';c.fillRect(5,-4,14,50);HR.glow(c,12,26,10,'#7fd6e0',0.18);
      const bx=px+Math.sin(a)*Lp,by=py+Math.cos(a)*Lp;c.strokeStyle='#3e4e60';c.lineWidth=0.35;c.beginPath();c.moveTo(px,py);c.lineTo(bx,by);c.stroke();c.strokeStyle='rgba(170,210,235,.25)';c.lineWidth=0.08;c.beginPath();c.moveTo(px-0.1,py);c.lineTo(bx-0.1,by);c.stroke();
      const g=c.createRadialGradient(bx-0.8,by-0.8,0,bx,by,2.6);g.addColorStop(0,'#fff0c0');g.addColorStop(0.35,'#c9a227');g.addColorStop(1,'#4a3810');c.fillStyle=g;c.beginPath();c.ellipse(bx,by,2.4,1.5,0,0,TAU);c.fill();
      c.strokeStyle='#2a2010';c.lineWidth=0.1;c.beginPath();c.ellipse(bx,by,2.4,1.5,0,0,TAU);c.stroke();c.beginPath();c.ellipse(bx,by,1.4,0.85,0,0,TAU);c.stroke();}},
  /* ---------- V · АРХИВ ---------- */
  /* Читальный зал: высокое стрельчатое окно — единственный холодный свет зала; за ним ночь и лунный диск,
     сквозь окно на пол падает голубой луч, в нём медленно кружат листки */
  z5_reading:{f:0.6,
    cut:[c=>HR.lancet(c,22.6,1,8.8,15.6)],
    back(c,L,R,r){HR.lancet(c,22.6,1,8.8,15.6);c.strokeStyle='#21170f';c.lineWidth=0.18;for(const x of [25.5,28.5]){c.beginPath();c.moveTo(x,3);c.lineTo(x,16.6);c.stroke();}for(let y=7;y<16.6;y+=3){c.beginPath();c.moveTo(22.6,y);c.lineTo(31.4,y);c.stroke();}
      c.beginPath();c.arc(27,5.2,1.5,0,TAU);c.stroke();
      /* библиотечная лестница на колёсах у полок */
      c.strokeStyle='#3a2616';c.lineWidth=0.14;c.beginPath();c.moveTo(36.2,19);c.lineTo(38.6,5);c.moveTo(37.2,19);c.lineTo(39.6,5);c.stroke();c.lineWidth=0.08;for(let k=1;k<14;k++){const u=k/14;c.beginPath();c.moveTo(36.2+2.4*u,19-14*u);c.lineTo(37.2+2.4*u,19-14*u);c.stroke();}
      c.fillStyle='#8a6d2a';c.fillRect(38.4,4.7,1.4,0.18);},
    land(c,R,t){const g=c.createLinearGradient(0,-4,0,20);g.addColorStop(0,'#0c1426');g.addColorStop(1,'#26314a');c.fillStyle=g;c.fillRect(10,-6,34,30);
      c.fillStyle='#e8ecf6';c.beginPath();c.arc(29,3,1.4,0,TAU);c.fill();HR.glow(c,29,3,6,'#b8c8f0',0.4);
      for(let i=0;i<40;i++){const r=rng('rd'+i);c.fillStyle='rgba(220,230,255,'+(0.3+r()*0.5)+')';c.fillRect(14+r()*28,-4+r()*14,0.06,0.06);}
      c.fillStyle='#141a2a';c.beginPath();c.moveTo(10,20);for(let x=10;x<=44;x+=2){c.lineTo(x,14-((x*13)%7)*0.6);}c.lineTo(44,20);c.closePath();c.fill();},
    shaft(c,R,t){const g=c.createLinearGradient(27,2,20,19);g.addColorStop(0,'rgba(150,176,230,.28)');g.addColorStop(1,'rgba(150,176,230,0)');c.fillStyle=g;
      c.beginPath();c.moveTo(23.2,4);c.lineTo(30.8,4);c.lineTo(26,19);c.lineTo(15,19);c.closePath();c.fill();},
    dyn(c,R,t,g){for(let i=0;i<5;i++){const u=((t*0.06+i/5)%1),x=27-u*9+Math.sin(t*0.8+i*2)*0.8,y=4+u*14,a=Math.sin(t*1.3+i)*0.8;
      c.save();c.translate(x,y);c.rotate(a);c.fillStyle=rgba('#e6dcc2',0.8*Math.sin(u*PI));c.fillRect(-0.14,-0.1,0.28,0.2);c.restore();}}},
  /* Прихожая Архива: над залом — архивная люстра на цепях, свечи на её кольцах качаются и светят */
  z5_hall:{f:0.8,
    back(c,L,R,r){/* картотечная стена за люстрой: ящики до потолка, лестница-стремянка */
      for(let x=14;x<28;x+=1.15)for(let y=3;y<12;y+=0.7){c.fillStyle=((x*7+y*3)|0)%5?'#2a1c12':'#33241a';c.fillRect(x,y,1.05,0.62);c.fillStyle='#8a6d2a';c.fillRect(x+0.42,y+0.26,0.2,0.08);}
      c.strokeStyle='#120c08';c.lineWidth=0.08;c.strokeRect(14,3,14,9.1);},
    dyn(c,R,t,g){const x=21,top=0.4,L=6.4,a=Math.sin(t*0.45)*0.04,ex=x+Math.sin(a)*L,ey=top+Math.cos(a)*L;
      c.strokeStyle='#120c08';c.lineWidth=0.06;c.beginPath();c.moveTo(x,top);c.lineTo(ex,ey);c.stroke();
      c.save();c.translate(ex,ey);c.rotate(-a);c.strokeStyle='#6d5416';c.lineWidth=0.12;for(const [rw,dy] of [[2.6,0.6],[1.6,0]]){c.beginPath();c.ellipse(0,dy,rw,rw*0.18,0,0,TAU);c.stroke();}
      for(const s of [-1,1]){c.beginPath();c.moveTo(0,-0.6);c.lineTo(s*2.6,0.6);c.stroke();}
      for(let i=0;i<9;i++){const q=i/9*TAU,cx2=Math.cos(q)*2.6,cy2=0.6+Math.sin(q)*0.45,fl=0.8+0.2*Math.sin(t*9+i*1.7);c.fillStyle='#e8dcc0';c.fillRect(cx2-0.04,cy2-0.3,0.08,0.3);
        c.fillStyle=rgba('#ffcf7a',0.9);c.beginPath();c.ellipse(cx2,cy2-0.38,0.04,0.09*fl,0,0,TAU);c.fill();}
      c.restore();g.renderer.glowAdd(ex,ey+0.4,4.5,'#ffbe63',0.45);}},
  /* Хранилище фонограмм: пневмопочта — латунные трубы вдоль высокой стены, по ним вверх-вниз идут капсулы с цилиндрами */
  z5_stacks:{f:0.86,
    back(c,L,R,r){for(const x of [3.4,4.6,25.4]){c.fillStyle='#4a3a1a';c.fillRect(x-0.22,1,0.44,42);c.fillStyle='rgba(255,230,170,.25)';c.fillRect(x-0.18,1,0.08,42);
      for(let y=2;y<43;y+=2.6){c.fillStyle='#2a2010';c.fillRect(x-0.3,y,0.6,0.16);}}
      Kit.stencil(c,1.2,3.2,'ПНЕВМОПОЧТА · ФОНОГРАММЫ',0.32,'rgba(232,201,106,.45)',0.5);},
    dyn(c,R,t,g){for(const [x,sp,ph] of [[3.4,3.2,0],[4.6,-2.6,0.4],[25.4,4.1,0.7]]){for(let k=0;k<2;k++){const u=(((t*sp/42)+ph+k*0.5)%1+1)%1,y=1+u*42;
      c.fillStyle='#c9a227';rr(c,x-0.2,y-0.35,0.4,0.7,0.15);c.fill();c.fillStyle='#fff0c0';c.fillRect(x-0.08,y-0.25,0.06,0.5);g.renderer.glowAdd(x,y,0.6,'#ffcf7a',0.25);}}}},
  /* Зал Совета: над возвышением — раструб, которым говорит Совет: огромная латунная воронка, внутри — темнота */
  z5_council:{f:0.8,
    back(c,L,R,r){const x=23,y=11.5,RX=6.2,RY=5.4;
      /* шея раструба уходит вверх-назад к шкафу-усилителю под сводом */
      c.strokeStyle='#3a2a10';c.lineWidth=1.1;c.beginPath();c.moveTo(x+1.2,y-1.4);c.quadraticCurveTo(x+4.5,y-6.5,x+9.5,y-8.6);c.stroke();
      c.strokeStyle='rgba(255,226,160,.25)';c.lineWidth=0.18;c.beginPath();c.moveTo(x+1.0,y-1.8);c.quadraticCurveTo(x+4.2,y-6.9,x+9.4,y-9.0);c.stroke();
      c.fillStyle='#1a120a';rr(c,x+8.6,y-10.6,4.2,3.2,0.3);c.fill();c.fillStyle='#8a6d2a';c.fillRect(x+8.6,y-10.6,4.2,0.2);
      /* лепестковый раструб в три четверти: лепестки чередуют тон, швы изогнуты, горло смещено вверх-вправо (глубина) */
      const tx=x+1.1,ty=y-1.1,n=12;
      for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;c.fillStyle=i%2?'#8a6a24':'#a8852e';c.beginPath();c.moveTo(tx+Math.cos(a0)*0.9,ty+Math.sin(a0)*0.8);
        c.quadraticCurveTo(x+Math.cos(a0+0.15)*RX*0.6,y+Math.sin(a0+0.15)*RY*0.6,x+Math.cos(a0)*RX,y+Math.sin(a0)*RY);c.lineTo(x+Math.cos(a1)*RX,y+Math.sin(a1)*RY);
        c.quadraticCurveTo(x+Math.cos(a1+0.15)*RX*0.6,y+Math.sin(a1+0.15)*RY*0.6,tx+Math.cos(a1)*0.9,ty+Math.sin(a1)*0.8);c.closePath();c.fill();}
      /* свет сверху-слева: верхние лепестки светлее, нижние в тени */
      const sh=c.createLinearGradient(x-RX,y-RY,x+RX*0.6,y+RY);sh.addColorStop(0,'rgba(255,236,190,.22)');sh.addColorStop(0.5,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.45)');
      c.fillStyle=sh;c.beginPath();c.ellipse(x,y,RX,RY,0,0,TAU);c.fill();
      const tg=c.createRadialGradient(tx,ty,0,tx,ty,2.2);tg.addColorStop(0,'#000');tg.addColorStop(0.5,'#140c04');tg.addColorStop(1,'rgba(20,12,4,0)');c.fillStyle=tg;c.beginPath();c.ellipse(tx,ty,2.2,1.9,0,0,TAU);c.fill();
      c.strokeStyle='#d2ae52';c.lineWidth=0.22;c.beginPath();c.ellipse(x,y,RX,RY,0,0,TAU);c.stroke();c.strokeStyle='#4a3810';c.lineWidth=0.08;c.beginPath();c.ellipse(x,y,RX-0.25,RY-0.22,0,0,TAU);c.stroke();
      for(let i=0;i<n;i++){const a=i/n*TAU;Kit.bolt(c,x+Math.cos(a)*(RX-0.12),y+Math.sin(a)*(RY-0.12),0.07);}
      Kit.stencil(c,x-2.4,y+RY+1.2,'ГОЛОС СОВЕТА',0.42,'rgba(232,201,106,.5)',0.6);}}
};
