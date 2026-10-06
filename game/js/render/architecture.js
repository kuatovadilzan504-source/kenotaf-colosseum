"use strict";
/* ============================== АРХИТЕКТУРА ЗАДНЕЙ СТЕНЫ ==============================
   Раньше задняя стена игрового слоя закрывала комнату целиком (на 86–95 %), и дальние планы — цеха, баки,
   фермы, сады — почти не были видны: кадр читался одной плоскостью. Теперь стена — это конструкция:
   несущие массы (простенки, пилоны) и глубокие проёмы между ними, сквозь которые видны дальние планы в дымке.
   КРУПНОЕ — простенки и ярусы; СРЕДНЕЕ — рамы, фермы, кольца; МЕЛКОЕ — болты, потёки, кабели.
   У каждой зоны свой язык проёма:
     Отстойник — клёпаные пролёты с ригелем и диагональными связями (цех);
     Соты      — высокие окна с полуциркульным верхом и переплётом (жилой дом);
     Печать    — круглые свинцовые порты на болтах (механизм);
     Архив     — стрельчатые арки с переплётом (хранилище);
     Эдем      — оранжерейные рамы с гнутым верхом (теплица).
   Рама проёма: тёмная фаска внутрь, светлая кромка со стороны ключевого света зоны.
   Только картинка: твёрдая геометрия рисуется поверх и не меняется. */
const ARCH={
  sump:{step:[11,15],pier:[1.8,2.6],shape:'truss',frame:'#2a2622',edge:'rgba(255,200,140,.32)',keyX:-1,vars:['truss','pipes','tank','shutter']},
  hives:{step:[9,12],pier:[2.2,3.0],shape:'window',frame:'#2a1a16',edge:'rgba(255,205,150,.3)',keyX:1,vars:['window','seg','pair','bricked']},
  seal:{step:[10,13],pier:[2.4,3.2],shape:'port',frame:'#1c1f24',edge:'rgba(210,225,255,.32)',keyX:1,vars:['port','wheel','hatch','iris']},
  archive:{step:[10,13],pier:[2.0,2.8],shape:'lancet',frame:'#21170f',edge:'rgba(255,205,140,.3)',keyX:-1,vars:['lancet','rose','shelf','ogee']},
  eden:{step:[9,12],pier:[1.8,2.6],shape:'pane',frame:'#22322a',edge:'rgba(255,232,180,.42)',keyX:1,vars:['pane','gable','fan','wild']}
};
/* варианты внутри языка зоны: форма проёма (контур) и то, что его держит/заполняет.
   Один язык — четыре руки: проём не повторяется подряд, у соседних — разные высоты, повреждения, свет */
const ARCH_SHAPE={truss:'oct',pipes:'oct',tank:'oct',shutter:'oct',window:'window',seg:'seg',pair:'window',bricked:'window',
  port:'port',wheel:'port',hatch:'hatch',iris:'port',lancet:'lancet',rose:'lancet',shelf:'lancet',ogee:'ogee',pane:'pane',gable:'gable',fan:'window',wild:'pane'};
function archShape(c,kind,x0,y0,w,h){c.beginPath();const m=x0+w/2;
  if(kind==='window'){const a=w/2;c.moveTo(x0,y0+h);c.lineTo(x0,y0+a);c.arc(x0+a,y0+a,a,PI,TAU);c.lineTo(x0+w,y0+h);c.closePath();}
  else if(kind==='seg'){const rs=Math.min(w*0.22,1.6);c.moveTo(x0,y0+h);c.lineTo(x0,y0+rs);c.quadraticCurveTo(m,y0-rs*0.7,x0+w,y0+rs);c.lineTo(x0+w,y0+h);c.closePath();}
  else if(kind==='lancet'){c.moveTo(x0,y0+h);c.lineTo(x0,y0+w*0.7);c.quadraticCurveTo(x0,y0+w*0.15,m,y0);c.quadraticCurveTo(x0+w,y0+w*0.15,x0+w,y0+w*0.7);c.lineTo(x0+w,y0+h);c.closePath();}
  else if(kind==='ogee'){c.moveTo(x0,y0+h);c.lineTo(x0,y0+w*0.62);c.bezierCurveTo(x0,y0+w*0.3,m-w*0.02,y0+w*0.42,m,y0);c.bezierCurveTo(m+w*0.02,y0+w*0.42,x0+w,y0+w*0.3,x0+w,y0+w*0.62);c.lineTo(x0+w,y0+h);c.closePath();}
  else if(kind==='gable'){c.moveTo(x0,y0+h);c.lineTo(x0,y0+w*0.42);c.lineTo(m,y0);c.lineTo(x0+w,y0+w*0.42);c.lineTo(x0+w,y0+h);c.closePath();}
  else if(kind==='port'){const R=Math.min(w,h)/2;c.arc(x0+w/2,y0+h/2,R,0,TAU);}
  else if(kind==='hatch'){rr(c,x0,y0,w,h,Math.min(w,h)*0.22);}
  else if(kind==='pane'){const a=Math.min(w*0.5,2.2);c.moveTo(x0,y0+h);c.lineTo(x0,y0+a);c.quadraticCurveTo(x0,y0,x0+a,y0);c.lineTo(x0+w-a,y0);c.quadraticCurveTo(x0+w,y0,x0+w,y0+a);c.lineTo(x0+w,y0+h);c.closePath();}
  else{const k=0.6;c.moveTo(x0+k,y0);c.lineTo(x0+w-k,y0);c.lineTo(x0+w,y0+k);c.lineTo(x0+w,y0+h-k);c.lineTo(x0+w-k,y0+h);c.lineTo(x0+k,y0+h);c.lineTo(x0,y0+h-k);c.lineTo(x0,y0+k);c.closePath();}}
/* проёмы и простенки; вызывается после стены зоны, до проёмов-ориентиров, реквизита и твёрдой геометрии */
function carveBays(c,L,R,r,zk){const A=ARCH[zk];if(!A||R.trial||R.noBays||(typeof HeroRooms!=='undefined'&&(HeroRooms.get(R)||{}).noBays)||R.w<14||R.h<10)return;
  /* свой генератор: случайные детали стены не сдвигают декор комнаты, рисуемый после */
  r=rng(R.id+'bayd');const rr0=rng(R.id+'bays'),ri=(a)=>a[0]+rr0()*(a[1]-a[0]);
  /* ярусы: высокие залы делятся ригелями — у каждого яруса свой ряд проёмов */
  const tiers=Math.max(1,Math.round((R.h-2)/11)),th=(R.h-1)/tiers,bays=[];let lastV=-1;
  for(let t=0;t<tiers;t++){const y0=0.6+t*th+1.0,y1=0.6+(t+1)*th-0.8;if(y1-y0<4)continue;
    let x=ri([1.5,4]);
    while(x<R.w-4){const step=ri(A.step),pier=ri(A.pier),w=Math.min(step-pier,R.w-1.5-x);if(w<3.5)break;
      /* вариант: не тот же, что у соседа; первый в комнате — основной язык зоны */
      let v=bays.length?Math.floor(rr0()*A.vars.length):0;if(v===lastV)v=(v+1)%A.vars.length;lastV=v;
      const vk=A.vars[v],shape=ARCH_SHAPE[vk];
      let bx=x,bw=w,by=y0,bh=y1-y0;
      /* высоты гуляют: часть проёмов ниже, над ними — глухая перемычка */
      if(rr0()<0.4){const cut=Math.min(bh*0.35,1+rr0()*2.2);by+=cut;bh-=cut;}
      if(shape==='port'){const d=Math.min(bw,bh,7.5)*(0.82+rr0()*0.18);bx=x+(bw-d)/2;by=by+(bh-d)/2;bw=bh=d;}
      else if(shape==='hatch'){const d=Math.min(bw,bh,7);bw=d*0.86;bh=Math.min(bh,d*1.1);bx=x+(w-bw)/2;by=y0+(y1-y0-bh)/2;}
      bays.push({x:bx,y:by,w:bw,h:bh,t,vk,shape,dmg:rr0()<0.3});x+=step;}}
  R._bays=bays;if(!bays.length)return;
  /* Архив: лунный свет — только в одном окне зала (ближе к центру и самом высоком): фокус, а не серая заливка всех проёмов */
  if(zk==='archive'){let best=null,sc=-1e9;for(const b of bays){if(b.vk==='shelf')continue;const v=b.h-Math.abs(b.x+b.w/2-R.w/2)*0.3;if(v>sc){sc=v;best=b;}}if(best)best.moon=true;}
  /* 1. проёмы — сквозь стену (оставляем 8 % тона: стекло, копоть, воздух цеха) */
  c.save();c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.92)';
  for(const b of bays){archShape(c,b.shape,b.x,b.y,b.w,b.h);c.fill();}c.restore();
  /* 2. рамы: тёмная фаска внутрь, светлая кромка со стороны света, крепёж */
  for(const b of bays){
    c.save();archShape(c,b.shape,b.x,b.y,b.w,b.h);c.clip();
    /* глубина откоса: тень от рамы внутрь проёма */
    const sh=c.createLinearGradient(b.x,0,b.x+b.w,0),k=A.keyX>0?1:0;
    sh.addColorStop(k?1:0,'rgba(0,0,0,0)');sh.addColorStop(k?0.75:0.25,'rgba(0,0,0,0)');sh.addColorStop(k?0:1,'rgba(0,0,0,.42)');
    c.fillStyle=sh;c.fillRect(b.x,b.y,b.w,b.h);
    const tg=c.createLinearGradient(0,b.y,0,b.y+1.6);tg.addColorStop(0,'rgba(0,0,0,.45)');tg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=tg;c.fillRect(b.x,b.y,b.w,1.6);
    c.restore();
    archDetail(c,A,b,r,zk);
    c.lineJoin='round';
    archShape(c,b.shape,b.x,b.y,b.w,b.h);c.strokeStyle=A.frame;c.lineWidth=0.42;c.stroke();
    archShape(c,b.shape,b.x,b.y,b.w,b.h);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=0.12;c.stroke();
    /* светлая кромка — только на стороне света */
    c.save();c.beginPath();if(A.keyX>0)c.rect(b.x+b.w*0.45,b.y-1,b.w,b.h+2);else c.rect(b.x-1,b.y-1,b.w*0.55+1,b.h+2);c.clip();
    archShape(c,b.shape,b.x-0.12*A.keyX,b.y+0.06,b.w,b.h);c.strokeStyle=A.edge;c.lineWidth=0.07;c.stroke();c.restore();
    /* повреждение рамы: выбитый кусок кромки и потёк под ним */
    if(b.dmg){const dx=b.x+b.w*(0.2+r()*0.6),dy=b.y+b.h-0.1;c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.moveTo(dx-0.4,dy);c.lineTo(dx-0.1,dy-0.35);c.lineTo(dx+0.35,dy-0.1);c.lineTo(dx+0.45,dy+0.12);c.closePath();c.fill();
      const lg=c.createLinearGradient(0,dy,0,dy+2.2);lg.addColorStop(0,zk==='eden'?'rgba(70,96,60,.35)':'rgba(60,34,18,.38)');lg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=lg;c.fillRect(dx-0.06,dy,0.14,2.2);}}
  /* 3. простенки между проёмами: вертикаль света, болты, потёки — масса, а не пустая стена */
  for(let i=0;i<bays.length-1;i++){const a=bays[i],b=bays[i+1];if(a.t!==b.t)continue;const x0=a.x+a.w+0.21,x1=b.x-0.21;if(x1-x0<0.8)continue;
    const yT=Math.min(a.y,b.y),yB=Math.max(a.y+a.h,b.y+b.h);
    const g=c.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'rgba(0,0,0,.28)');g.addColorStop(A.keyX>0?0.75:0.25,'rgba(255,230,190,.05)');g.addColorStop(1,'rgba(0,0,0,.3)');
    c.fillStyle=g;c.fillRect(x0,yT-0.3,x1-x0,yB-yT+0.6);
    if(zk!=='eden'){for(let y=yT+0.5;y<yB;y+=1.1){Kit.bolt(c,x0+0.3,y,0.05);Kit.bolt(c,x1-0.3,y,0.05);}}
    for(let k=0;k<2;k++){const sx=x0+r()*(x1-x0),sy=yT+r()*(yB-yT)*0.4,lg=c.createLinearGradient(0,sy,0,sy+3+r()*4);
      lg.addColorStop(0,zk==='eden'?'rgba(90,110,60,.25)':'rgba(70,40,20,.3)');lg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=lg;c.fillRect(sx,sy,0.1+r()*0.15,7);}}
  /* 4. ригели между ярусами */
  if(tiers>1)for(let t=1;t<tiers;t++){const y=0.6+t*th;c.fillStyle=A.frame;c.fillRect(0,y-0.35,R.w,0.7);
    c.fillStyle='rgba(255,230,190,.08)';c.fillRect(0,y-0.35,R.w,0.06);c.fillStyle='rgba(0,0,0,.4)';c.fillRect(0,y+0.29,R.w,0.06);
    if(zk!=='eden')for(let x=0.6;x<R.w;x+=1.4)Kit.bolt(c,x,y,0.05);}
}
/* средний масштаб: что держит или заполняет проём — свой у каждого варианта */
function archDetail(c,A,b,r,zk){c.save();c.lineCap='round';const v=b.vk,cx=b.x+b.w/2,cy=b.y+b.h/2;
  if(v==='truss'){/* ригель сверху и Х-связи из уголка */
    c.fillStyle='#1d1a17';c.fillRect(b.x,b.y,b.w,0.55);c.fillStyle='rgba(255,210,160,.12)';c.fillRect(b.x,b.y,b.w,0.06);
    for(let x=b.x+0.4;x<b.x+b.w;x+=1.2)Kit.bolt(c,x,b.y+0.28,0.05);
    const yA=b.y+0.55,yB=b.y+b.h,n=Math.max(1,Math.round(b.w/5));
    for(let i=0;i<n;i++){const xa=b.x+b.w*i/n,xb=b.x+b.w*(i+1)/n;
      c.strokeStyle='#1a1715';c.lineWidth=0.16;c.beginPath();c.moveTo(xa,yA);c.lineTo(xb,yB);c.moveTo(xb,yA);c.lineTo(xa,yB);c.stroke();
      c.strokeStyle='rgba(255,210,160,.12)';c.lineWidth=0.04;c.beginPath();c.moveTo(xa+0.06,yA);c.lineTo(xb+0.06,yB);c.stroke();
      c.fillStyle='#24201c';c.beginPath();c.arc((xa+xb)/2,(yA+yB)/2,0.22,0,TAU);c.fill();}
    if(r()<0.7)Kit.cable(c,b.x,b.y+0.8+r()*1.5,b.x+b.w,b.y+0.8+r()*1.5,0.6+r()*1.4,0.05,'#141618');}
  else if(v==='pipes'){/* трубная галерея: пучок труб через пролёт, коллектор с вентилями */
    const n=3+((r()*3)|0),y0=b.y+b.h*(0.25+r()*0.25);
    for(let i=0;i<n;i++){const y=y0+i*0.55,rad=0.14+r()*0.12;Kit.pipe(c,[[b.x-0.3,y],[b.x+b.w+0.3,y+(r()-0.5)*0.2]],rad,r()<0.5?'rust':'steel',{seed:((b.x+i)*7)|0,band:1,bandCol:'#c9a227'});}
    const mx=b.x+b.w*(0.3+r()*0.4);c.fillStyle='#24201c';c.fillRect(mx-0.35,y0-0.5,0.7,n*0.55+0.6);for(let i=0;i<n;i++)Kit.valve(c,mx,y0+i*0.55,0.22,r()*3,'#8a6d2a');
    for(let x=b.x+1;x<b.x+b.w-0.5;x+=2.2){c.fillStyle='#1a1715';c.fillRect(x,y0-0.4,0.12,n*0.55+0.4);}}
  else if(v==='tank'){/* в нише — вертикальный бак: обечайки, манометр, лестница */
    const tw=Math.min(b.w*0.55,3.4),tx=cx-tw/2,ty=b.y+0.8,thh=b.h-0.8;
    const g=c.createLinearGradient(tx,0,tx+tw,0);g.addColorStop(0,'#16191b');g.addColorStop(0.35,'#3a4146');g.addColorStop(0.55,'#2c3237');g.addColorStop(1,'#111315');
    c.fillStyle=g;rr(c,tx,ty,tw,thh+0.2,tw*0.35);c.fill();
    for(let y=ty+1;y<ty+thh;y+=1.3){c.fillStyle='rgba(0,0,0,.4)';c.fillRect(tx,y,tw,0.07);c.fillStyle='rgba(255,220,180,.08)';c.fillRect(tx,y+0.07,tw,0.03);}
    Kit.gauge(c,tx+tw*0.5,ty+thh*0.35,0.28,r());c.strokeStyle='#1a1715';c.lineWidth=0.05;for(let y=ty+0.6;y<ty+thh;y+=0.35){c.beginPath();c.moveTo(tx+tw+0.1,y);c.lineTo(tx+tw+0.5,y);c.stroke();}
    c.beginPath();c.moveTo(tx+tw+0.1,ty+0.4);c.lineTo(tx+tw+0.1,ty+thh);c.moveTo(tx+tw+0.5,ty+0.4);c.lineTo(tx+tw+0.5,ty+thh);c.stroke();}
  else if(v==='shutter'){/* рольставня опущена наполовину: ламели, след ржавчины, сорванный край */
    const sh=b.h*(0.35+r()*0.35);c.save();archShape(c,b.shape,b.x,b.y,b.w,b.h);c.clip();
    for(let y=b.y;y<b.y+sh;y+=0.32){c.fillStyle=((y*10)|0)%2?'#2b2622':'#25201c';c.fillRect(b.x,y,b.w,0.3);c.fillStyle='rgba(255,214,170,.07)';c.fillRect(b.x,y,b.w,0.04);}
    const lg=c.createLinearGradient(0,b.y,0,b.y+sh);lg.addColorStop(0,'rgba(90,50,24,0)');lg.addColorStop(1,'rgba(90,50,24,.3)');c.fillStyle=lg;c.fillRect(b.x,b.y,b.w,sh);
    c.fillStyle='#1d1915';c.fillRect(b.x,b.y+sh-0.12,b.w,0.2);c.fillStyle='#0b0908';c.beginPath();c.moveTo(b.x+b.w*0.7,b.y+sh);c.lineTo(b.x+b.w*0.82,b.y+sh+0.5);c.lineTo(b.x+b.w*0.95,b.y+sh);c.closePath();c.fill();c.restore();}
  else if(v==='window'||v==='lancet'||v==='seg'||v==='pair'||v==='rose'||v==='ogee'){/* переплёт: стойки и горбылёк */
    const shp=b.shape,n=Math.max(1,Math.round(b.w/2.4)),top=shp==='lancet'||shp==='ogee'?b.w*0.3:shp==='seg'?0.6:b.w*0.5;c.strokeStyle=A.frame;c.lineWidth=0.12;
    for(let i=1;i<n;i++){const x=b.x+b.w*i/n;c.beginPath();c.moveTo(x,b.y+top);c.lineTo(x,b.y+b.h);c.stroke();}
    for(let y=b.y+Math.max(top,b.w*0.6);y<b.y+b.h;y+=2.6){c.beginPath();c.moveTo(b.x,y);c.lineTo(b.x+b.w,y);c.stroke();}
    if(v==='pair'){/* две узкие створки: средний простенок с капителью */
      c.fillStyle=A.frame;c.fillRect(cx-0.35,b.y+b.w*0.3,0.7,b.h);c.beginPath();c.arc(cx-b.w*0.25,b.y+b.w*0.5,b.w*0.25,PI,TAU);c.arc(cx+b.w*0.25,b.y+b.w*0.5,b.w*0.25,PI,TAU);c.lineWidth=0.18;c.stroke();
      c.fillStyle='rgba(255,210,160,.12)';c.fillRect(cx-0.45,b.y+b.w*0.5,0.9,0.12);}
    if(v==='rose'){/* розетка в вершине: круг с лучами и две подарки */
      const rr2=b.w*0.24,ry=b.y+b.w*0.42;c.lineWidth=0.14;c.beginPath();c.arc(cx,ry,rr2,0,TAU);c.stroke();
      for(let i=0;i<8;i++){const a=i/8*TAU;c.beginPath();c.moveTo(cx,ry);c.lineTo(cx+Math.cos(a)*rr2,ry+Math.sin(a)*rr2);c.stroke();}
      c.beginPath();c.arc(cx,ry,rr2*0.3,0,TAU);c.stroke();}
    if(v==='seg'){/* балкон: перила по низу проёма */
      const y=b.y+b.h-1.0;c.fillStyle=A.frame;c.fillRect(b.x-0.2,y+0.85,b.w+0.4,0.18);c.lineWidth=0.06;for(let x=b.x;x<=b.x+b.w;x+=0.3){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+0.9);c.stroke();}
      c.lineWidth=0.1;c.beginPath();c.moveTo(b.x-0.2,y);c.lineTo(b.x+b.w+0.2,y);c.stroke();}
    if(shp==='window'&&v!=='pair'){c.fillStyle='rgba(0,0,0,.5)';c.fillRect(b.x-0.3,b.y+b.h-0.1,b.w+0.6,0.3);c.fillStyle='rgba(255,210,160,.14)';c.fillRect(b.x-0.3,b.y+b.h-0.1,b.w+0.6,0.05);}
    /* Архив: в высоких окнах — лунная синева сверху (холод против тёплых свечей: взгляд идёт к окну, а не тонет в буром) */
    if(zk==='archive'&&b.moon){c.save();archShape(c,b.shape,b.x,b.y,b.w,b.h);c.clip();const mg=c.createLinearGradient(0,b.y,0,b.y+b.h*0.45);
      mg.addColorStop(0,'rgba(150,176,230,.2)');mg.addColorStop(0.6,'rgba(110,140,200,.05)');mg.addColorStop(1,'rgba(110,140,200,0)');c.fillStyle=mg;c.fillRect(b.x,b.y,b.w,b.h);c.restore();}
    /* кое-где стёкла уцелели — бликуют */
    for(let i=0;i<n*2;i++)if(r()<0.25){const x=b.x+r()*b.w,y=b.y+b.w*0.6+r()*Math.max(0.5,b.h-b.w*0.6);c.fillStyle='rgba(200,220,230,.07)';c.fillRect(x,y,b.w/n*0.9,1.2);}}
  else if(v==='bricked'){/* заложенное окно: кирпич по низу, в кладке — оставленная форточка; заложили давно (копоть) */
    c.save();archShape(c,b.shape,b.x,b.y,b.w,b.h);c.clip();const top=b.y+b.h*(0.25+r()*0.25);
    SA.bricks(c,b.x,top,b.w,b.y+b.h-top,0.9,0.4,'#3a2420','rgba(14,8,6,.9)',r,true);
    const fw=Math.min(1.2,b.w*0.25),fx=cx-fw/2+(r()-0.5)*b.w*0.3,fy=top+0.8;c.fillStyle='#0d0807';c.fillRect(fx,fy,fw,fw*1.2);
    c.fillStyle='rgba(255,190,110,.55)';c.fillRect(fx+0.06,fy+0.06,fw-0.12,fw*1.2-0.12);c.fillStyle='#2a1a16';c.fillRect(fx+fw/2-0.03,fy,0.06,fw*1.2);c.restore();}
  else if(v==='shelf'){/* стрельчатая ниша, заставленная книгами: хранилище, а не окно */
    c.save();archShape(c,b.shape,b.x,b.y,b.w,b.h);c.clip();c.fillStyle='#160f0a';c.fillRect(b.x,b.y,b.w,b.h);
    for(let y=b.y+b.w*0.35;y<b.y+b.h-0.3;y+=0.95){c.fillStyle='#2a1c12';c.fillRect(b.x,y+0.78,b.w,0.12);c.fillStyle='rgba(255,214,160,.12)';c.fillRect(b.x,y+0.78,b.w,0.03);
      for(let x=b.x+0.1;x<b.x+b.w-0.1;x+=0.09+r()*0.07){if(r()<0.06){x+=0.3;continue;}const bh=0.45+r()*0.3;c.fillStyle=['#4a2a1c','#2a3a2a','#3a2a3a','#5a4a2a','#2a2a3a','#6a3a22'][(r()*6)|0];c.fillRect(x,y+0.78-bh,0.085,bh);}}
    const cg=c.createRadialGradient(cx,b.y+b.h*0.6,0,cx,b.y+b.h*0.6,b.w*0.7);cg.addColorStop(0,'rgba(255,190,110,.18)');cg.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=cg;c.fillRect(b.x,b.y,b.w,b.h);c.restore();}
  else if(v==='port'||v==='wheel'||v==='iris'){/* толстое кольцо на болтах; крестовина / спицы-колесо / ирисовая заслонка */
    const R=b.w/2;
    c.strokeStyle='#262a30';c.lineWidth=0.7;c.beginPath();c.arc(cx,cy,R+0.2,0,TAU);c.stroke();
    c.strokeStyle='rgba(210,225,255,.16)';c.lineWidth=0.06;c.beginPath();c.arc(cx,cy,R+0.48,PI*1.1,PI*1.75);c.stroke();
    for(let i=0;i<16;i++){const a=i/16*TAU;Kit.bolt(c,cx+Math.cos(a)*(R+0.2),cy+Math.sin(a)*(R+0.2),0.07);}
    if(v==='port'){c.strokeStyle='#1d2025';c.lineWidth=0.14;c.beginPath();c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.moveTo(cx,cy-R);c.lineTo(cx,cy+R);c.stroke();c.fillStyle='#22262b';c.beginPath();c.arc(cx,cy,0.45,0,TAU);c.fill();}
    else if(v==='wheel'){c.strokeStyle='#1d2025';c.lineWidth=0.18;for(let i=0;i<8;i++){const a=i/8*TAU+0.2;c.beginPath();c.moveTo(cx+Math.cos(a)*0.6,cy+Math.sin(a)*0.6);c.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);c.stroke();}
      c.lineWidth=0.3;c.beginPath();c.arc(cx,cy,R*0.55,0,TAU);c.stroke();c.fillStyle='#2a2e34';c.beginPath();c.arc(cx,cy,0.75,0,TAU);c.fill();c.fillStyle='#8a6d2a';c.beginPath();c.arc(cx,cy,0.3,0,TAU);c.fill();}
    else{c.save();c.beginPath();c.arc(cx,cy,R,0,TAU);c.clip();const open=0.45+r()*0.3;
      for(let i=0;i<6;i++){const a=i/6*TAU;c.save();c.translate(cx,cy);c.rotate(a);c.fillStyle=i%2?'#23272d':'#1f2328';c.beginPath();c.moveTo(R*open,0);c.lineTo(R*1.2,-R*0.2);c.lineTo(R*1.2,R*0.9);c.lineTo(R*open*0.5,R*open*0.87);c.closePath();c.fill();
        c.strokeStyle='rgba(210,225,255,.1)';c.lineWidth=0.04;c.beginPath();c.moveTo(R*open,0);c.lineTo(R*open*0.5,R*open*0.87);c.stroke();c.restore();}c.restore();}}
  else if(v==='hatch'){/* прямоугольный люк: запорные ригели поперёк, маховик */
    for(let i=1;i<=3;i++){const y=b.y+b.h*i/4;c.fillStyle='#1d2025';c.fillRect(b.x-0.2,y-0.12,b.w+0.4,0.24);c.fillStyle='rgba(210,225,255,.12)';c.fillRect(b.x-0.2,y-0.12,b.w+0.4,0.04);Kit.bolt(c,b.x+0.2,y,0.06);Kit.bolt(c,b.x+b.w-0.2,y,0.06);}
    Kit.valve(c,cx,cy,Math.min(0.7,b.w*0.15),r()*3,'#5a6068');}
  else if(v==='pane'||v==='gable'||v==='fan'||v==='wild'){/* оранжерейная рама: тёмный кованый переплёт, редкий; испарина; у «дикого» — разбитые стёкла и плети */
    const n=Math.max(2,Math.round(b.w/2.6)),top=b.shape==='gable'?b.w*0.42:b.shape==='window'?b.w*0.5:0.4;c.strokeStyle='rgba(26,40,32,.9)';c.lineWidth=0.08;
    for(let i=1;i<n;i++){const x=b.x+b.w*i/n;c.beginPath();c.moveTo(x,b.y+(b.shape==='gable'?Math.abs(x-cx)/(b.w/2)*b.w*0.42:top));c.lineTo(x,b.y+b.h);c.stroke();}
    for(let y=b.y+Math.max(top,1)+2.4;y<b.y+b.h;y+=3.2){c.beginPath();c.moveTo(b.x,y);c.lineTo(b.x+b.w,y);c.stroke();}
    if(v==='fan'){const ry=b.y+b.w*0.5;for(let i=1;i<6;i++){const a=PI+i/6*PI;c.beginPath();c.moveTo(cx,ry);c.lineTo(cx+Math.cos(a)*b.w*0.5,ry+Math.sin(a)*b.w*0.5);c.stroke();}
      c.beginPath();c.arc(cx,ry,b.w*0.18,PI,TAU);c.stroke();c.beginPath();c.moveTo(b.x,ry);c.lineTo(b.x+b.w,ry);c.stroke();}
    if(v==='gable'){c.beginPath();c.moveTo(cx,b.y);c.lineTo(cx,b.y+b.h);c.stroke();}
    for(let i=0;i<n*2;i++)if(r()<0.45){const x=b.x+r()*b.w,y=b.y+b.h*(0.45+r()*0.5),gg=c.createLinearGradient(0,y,0,y+1.8);gg.addColorStop(0,'rgba(215,236,228,.12)');gg.addColorStop(1,'rgba(215,236,228,0)');c.fillStyle=gg;c.fillRect(x,y,b.w/n*0.8,1.8);}
    const nv=v==='wild'?9:3;for(let i=0;i<nv;i++){const x=b.x+r()*b.w;Kit.vine(c,[[x,b.y],[x+(r()-0.5)*1.5,b.y+2+r()*3],[x+(r()-0.5)*2,b.y+4+r()*(v==='wild'?b.h-4:4)]],(i*7)|0);}
    if(v==='wild')for(let i=0;i<3;i++){const x=b.x+r()*(b.w-1),y=b.y+1+r()*(b.h-2);c.strokeStyle='rgba(230,240,235,.25)';c.lineWidth=0.03;c.beginPath();c.moveTo(x,y);c.lineTo(x+0.5,y+0.7);c.lineTo(x+0.2,y+1.1);c.moveTo(x+0.5,y+0.7);c.lineTo(x+0.9,y+0.6);c.stroke();}}
  c.restore();}
/* ============================== РАМКА ПЕРЕДНЕГО ПЛАНА ==============================
   Камера — внутри пространства: у верхнего и нижнего края кадра — крупные тёмные силуэты из словаря зоны.
   Компоновщик (js/render/gl.js) делает их тёмными, размытыми и прозрачными вокруг курьера и механизмов.
   Только для комнат без своего переднего плана. Ритм редкий: рамка, а не стена. */
const FRAME_FGD={
  sump(c,L,R,r){c.clearRect(0,0,L.w,L.h);
    for(let x=r()*8;x<L.w;x+=14+r()*10){const y1=L.h*(0.18+r()*0.2);
      Kit.pipe(c,[[x,-1],[x,y1],[x+2.2+r()*2,y1+1.4]],0.55+r()*0.3,'rust',{seed:(x*3)|0,band:1,bandCol:'#c9a227'});
      if(r()<0.6)Kit.chain(c,x+3+r()*3,-0.5,2.5+r()*3.5,0.16);}
    for(let x=r()*10;x<L.w;x+=18+r()*12){const y=L.h-0.6;c.fillStyle='#14110e';
      for(let k=0;k<6;k++){c.beginPath();c.ellipse(x+(r()-0.5)*4,y-r()*0.8,0.8+r()*1.4,0.5+r()*0.8,r()*3,0,TAU);c.fill();}
      Kit.valve(c,x+1.2,y-1.4,0.7,r()*3,'#2a2420');}},
  hives(c,L,R,r){c.clearRect(0,0,L.w,L.h);
    for(let x=r()*6;x<L.w;x+=12+r()*8){Kit.cable(c,x,-0.2,x+6+r()*8,0.3+r()*0.8,1.2+r()*1.6,0.12,'#120c0a');
      if(r()<0.5)Kit.clothesline(c,x+1,0.6+r()*0.6,x+5+r()*3,0.8+r()*0.5,(x*7)|0);}
    for(let x=r()*12;x<L.w;x+=20+r()*12){c.fillStyle='#120c0a';c.fillRect(x,L.h-1.2,3.2,1.4);c.fillRect(x+0.3,L.h-2.4,0.18,1.2);c.fillRect(x+2.6,L.h-2.0,0.18,0.9);
      c.fillRect(x+3.6,L.h-0.9,1.6,1);c.fillRect(x+3.7,L.h-1.9,0.12,1.0);}},
  seal(c,L,R,r){c.clearRect(0,0,L.w,L.h);
    for(let x=r()*10;x<L.w;x+=20+r()*12){Kit.gear(c,x,-0.6,2.4+r()*1.4,16,r()*3,'#1a1d22');
      c.fillStyle='#16181c';c.save();c.translate(x+4,0);c.rotate(0.5+r()*0.4);c.fillRect(0,-0.3,7,0.6);c.restore();}
    for(let x=r()*14;x<L.w;x+=22+r()*14)Kit.gear(c,x,L.h+0.8,2.0+r()*1.2,14,r()*3,'#16181c');},
  archive(c,L,R,r){c.clearRect(0,0,L.w,L.h);
    for(let x=r()*6;x<L.w;x+=8+r()*7){const len=1.5+r()*3.5;c.strokeStyle='#120d08';c.lineWidth=0.04;c.beginPath();c.moveTo(x,-0.2);c.lineTo(x,len);c.stroke();
      c.fillStyle='#1a120a';c.save();c.translate(x,len);c.rotate((r()-0.5)*0.4);c.fillRect(-0.35,0,0.7,0.95);c.restore();}
    for(let x=r()*10;x<L.w;x+=16+r()*10){c.fillStyle='#110c07';let y=L.h;
      for(let k=0;k<5+r()*5;k++){const w=1.4+r()*0.8,h=0.22+r()*0.18;c.fillRect(x+(r()-0.5)*0.4,y-h,w,h);y-=h;}}},
  eden(c,L,R,r){c.clearRect(0,0,L.w,L.h);
    /* огромные листья у камеры: тёмная изумрудная рамка — масштаб и влажная глубина сада */
    for(let x=r()*6;x<L.w;x+=14+r()*10){c.save();c.translate(x,L.h+0.6);c.scale(3.2,3.2);EdenFlora.broadleaf(c,0,0,1.4,r);c.restore();}
    for(let x=r()*10;x<L.w;x+=18+r()*10){c.save();c.translate(x,-0.4);c.scale(2.6,-2.6);EdenFlora.fern(c,0,0,1.5,r);c.restore();}
    const leafy=(x,y,s,down)=>{for(let k=0;k<14;k++){const a=(down?PI/2:-PI/2)+(r()-0.5)*2.2,d=r()*s;
      SurfaceArt.leaf(c,x+Math.cos(a)*d,y+Math.sin(a)*d*0.8,s*(0.28+r()*0.25),a+(r()-0.5),'#203a1c');}};
    for(let x=r()*8;x<L.w;x+=11+r()*9){leafy(x,0,2.4+r()*1.4,true);
      if(r()<0.6){const v=[[x+1,0]];for(let k=1;k<5;k++)v.push([x+1+(r()-0.5)*1.4,k*(0.9+r()*0.6)]);SurfaceArt.ivy(c,v,r,0.22);}}
    for(let x=r()*10;x<L.w;x+=13+r()*10){leafy(x,L.h+0.4,2.8+r()*1.2,false);
      for(let k=0;k<7;k++){const bx=x+(r()-0.5)*3,h=1.5+r()*2.2,lean=(r()-0.5)*1.4;c.strokeStyle='#1c3418';c.lineWidth=0.12;
        c.beginPath();c.moveTo(bx,L.h);c.quadraticCurveTo(bx+lean*0.3,L.h-h*0.6,bx+lean,L.h-h);c.stroke();}}}
};
/* ============================== КРОМКИ МАСС ==============================
   Твёрдая геометрия — прямоугольники; глаз это видит. Открытые кромки получают ломаный контур из словаря
   зоны. Сверху (по этому ходят) — только низкое, до 0.25 м: линия коллизии не врёт. Снизу и сбоку — свободнее. */
function edgeDress(c,R,zk,r){r=rng(R.id+'edges');const E=buildEdges({solids:R.solids.filter(s=>!s.dyn&&!s.hidden)});
  const tops=E.top.filter(e=>e[1]-e[0]>1.2),bots=E.line.filter(l=>l[1]===l[3]&&Math.abs(l[2]-l[0])>1.2),sides=E.line.filter(l=>l[0]===l[2]&&Math.abs(l[3]-l[1])>1.5);
  c.save();c.lineCap='round';
  for(const [x0,x1,y] of tops){const w=x1-x0;
    if(zk==='eden'){/* мох ковром и трава кочками */
      for(let x=x0;x<x1;x+=0.12+r()*0.1){c.fillStyle=SURF.leaf[1+((r()*3)|0)];c.beginPath();c.ellipse(x,y+0.02,0.09+r()*0.08,0.05+r()*0.04,0,PI,TAU);c.fill();}
      for(let x=x0+r()*2;x<x1;x+=1.2+r()*2.5)SurfaceArt.tuft(c,x,y+0.02,0.18+r()*0.1,r,6);
      for(let x=x0+r()*4;x<x1;x+=4+r()*5)SurfaceArt.flower(c,x,y+0.02,0.07,['#f2d27a','#ece8f2','#d8806a'][(r()*3)|0],r);}
    else{/* щебень, окалина, пыль у кромки */
      const col={sump:'#2a221c',hives:'#2a1c18',seal:'#22262c',archive:'#2a1e14'}[zk]||'#222';
      for(let x=x0+r()*1.5;x<x1;x+=0.8+r()*2.2){const n=1+((r()*3)|0);for(let k=0;k<n;k++){c.fillStyle=col;c.beginPath();
        const px=x+k*0.12,s=0.05+r()*0.08;c.moveTo(px-s,y+0.01);c.lineTo(px-s*0.3,y-s*1.2);c.lineTo(px+s,y-s*0.5);c.lineTo(px+s*1.1,y+0.01);c.closePath();c.fill();}}
      if(zk==='archive')for(let x=x0+r()*3;x<x1;x+=3.5+r()*5){for(let k=0;k<2+((r()*3)|0);k++){c.fillStyle=['#4a2a1c','#2a3a2a','#5a4a2a'][(r()*3)|0];c.fillRect(x+k*0.05,y-0.08*(k+1),0.42,0.075);}}}}
  for(const l of bots){const y=l[1],x0=Math.min(l[0],l[2]),x1=Math.max(l[0],l[2]);
    for(let x=x0+0.5+r()*2;x<x1-0.4;x+=2.2+r()*4){
      if(zk==='eden'){const v=[[x,y]];for(let k=1;k<4;k++)v.push([x+(r()-0.5)*0.5,y+k*(0.35+r()*0.4)]);SurfaceArt.ivy(c,v,r,0.12);}
      else if(zk==='archive'){c.strokeStyle='rgba(200,190,170,.18)';c.lineWidth=0.02;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+0.4,y+0.5,x+0.9,y);c.stroke();
        if(r()<0.5){c.fillStyle='#d8cdb6';c.save();c.translate(x+0.4,y+0.35);c.rotate((r()-0.5)*0.6);c.globalAlpha=0.6;c.fillRect(-0.12,0,0.24,0.32);c.restore();}}
      else{/* кабель петлёй под сводом, на кронштейнах */
        const x2=Math.min(x1-0.2,x+1.4+r()*2.5);Kit.cable(c,x,y+0.05,x2,y+0.05,0.25+r()*0.5,0.045,zk==='seal'?'#1a1d22':'#16120e');
        c.fillStyle='#2a2622';c.fillRect(x-0.05,y,0.1,0.12);c.fillRect(x2-0.05,y,0.1,0.12);}}}
  for(const l of sides){const x=l[0],y0=Math.min(l[1],l[3]),y1=Math.max(l[1],l[3]);
    for(let y=y0+1+r()*2;y<y1-0.8;y+=3+r()*4){if(r()<0.5)continue;
      if(zk==='eden'){const v=[[x,y]];for(let k=1;k<4;k++)v.push([x+(r()-0.5)*0.4,y+k*0.45]);SurfaceArt.ivy(c,v,r,0.12);}
      else{c.fillStyle='#24201c';c.fillRect(x-0.14,y,0.28,0.16);Kit.bolt(c,x,y+0.08,0.04);}}}
  c.restore();}
/* ============================== КРУПНЫЕ МАССЫ ==============================
   Большой твёрдый блок без внутренней структуры читается дырой. Масса получает конструкцию: утопленную
   филёнку с рамой (свет сверху, тень снизу), рёбра жёсткости, редкие повреждения, где видно нутро. */
function massDress(c,R,zk,r){r=rng(R.id+'mass');R._bmLab=0;if(zk==='surface')return;
  const ST={sump:['#2e2620','rgba(255,214,170,.10)'],hives:['#2c1e1a','rgba(255,206,170,.09)'],seal:['#262a30','rgba(220,232,255,.10)'],
    archive:['#2a1e14','rgba(255,214,160,.09)'],eden:['#9a957f','rgba(255,255,240,.25)']}[zk]||['#2a2622','rgba(255,230,200,.1)'];
  for(const s of R.solids){if(s.hidden||s.dyn||s.ow||s.w<4.5||s.h<3.2)continue;
    if(s.w>=8&&s.h>=5&&(zk==='sump'||zk==='hives')){bigMass(c,s,R,zk,r);continue;}
    c.save();c.beginPath();c.rect(s.x,s.y,s.w,s.h);c.clip();
    const pad=0.55,ix=s.x+pad,iy=s.y+pad+0.35,iw=s.w-pad*2,ih=s.h-pad*2-0.35;
    if(iw>2&&ih>1.6){
      /* филёнка: тень по верху (рама нависает), свет по низу внутренней кромки */
      c.fillStyle='rgba(0,0,0,.22)';c.fillRect(ix,iy,iw,ih);
      c.fillStyle='rgba(0,0,0,.38)';c.fillRect(ix,iy,iw,0.12);c.fillRect(ix,iy,0.1,ih);
      c.fillStyle=ST[1];c.fillRect(ix,iy+ih-0.06,iw,0.06);c.fillRect(ix+iw-0.06,iy,0.06,ih);
      /* рёбра жёсткости */
      for(let x=ix+2.6+r()*0.8;x<ix+iw-1;x+=2.8+r()*1.4){c.fillStyle=ST[0];c.fillRect(x-0.14,iy,0.28,ih);c.fillStyle=ST[1];c.fillRect(x-0.14,iy,0.05,ih);
        c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+0.1,iy,0.05,ih);if(zk!=='eden')for(let y=iy+0.4;y<iy+ih;y+=1.3)Kit.bolt(c,x,y,0.045);}
      /* повреждение: сорванный лист, внутри — трубы и кабели */
      if(r()<0.55&&iw>4&&ih>2.4){const dw=1.4+r()*1.6,dh=1.0+r()*1.0,dx=ix+0.5+r()*(iw-dw-1),dy=iy+0.4+r()*(ih-dh-0.8);
        c.fillStyle='#0b0908';c.beginPath();c.moveTo(dx,dy+0.2);c.lineTo(dx+dw*0.4,dy);c.lineTo(dx+dw,dy+0.15);c.lineTo(dx+dw*0.9,dy+dh);c.lineTo(dx+0.1,dy+dh*0.85);c.closePath();c.fill();
        c.save();c.clip();for(let k=0;k<3;k++){const y=dy+0.25+k*dh*0.28;c.fillStyle=k%2?'#3a3028':'#4a3a2c';c.fillRect(dx-0.2,y,dw+0.4,0.13);c.fillStyle='rgba(255,220,180,.12)';c.fillRect(dx-0.2,y,dw+0.4,0.03);}c.restore();
        c.strokeStyle=ST[1];c.lineWidth=0.04;c.beginPath();c.moveTo(dx,dy+0.2);c.lineTo(dx+dw*0.4,dy);c.lineTo(dx+dw,dy+0.15);c.stroke();}}
    c.restore();}}
/* ============================== ОГРОМНЫЕ МАССЫ ==============================
   Блок 8×5 м и больше — не «чёрная дыра», а физическое тело: агрегат, фундамент, дом.
   Отстойник — клёпаный кожух машины: пояса-ригели, двутавры, смотровые окна с тёплым светом изнутри (валы, щётки,
   шестерни в контровом свете), трубы по фасаду, люк, табличка; у висящего над проходом — «зебра» по нижней кромке:
   низкий проём читается заранее. Соты — торец жилого дома: окна квартир (часть горит, в части — занавески), кондиционеры,
   водосток. Всё — внутри контура блока: коллизия не врёт, ложных уступов нет. */
const BIGMASS_LABEL={z1_gallery:'БУНКЕР ЩЁТОК · Ч-3',z1_charge:'АККУМУЛЯТОРНАЯ · 6 кВ',z1_hub:'ФУНДАМЕНТ НАСОСОВ',z1_sluice:'ШЛЮЗОВАЯ КАМЕРА',z1_drain:'ОТСТОЙНИК',z1_canal:'КАНАЛ · ОПОРА'};
function bigMass(c,s,R,zk,r){const hang=s.y+s.h<R.h-1.5,x0=s.x,y0=s.y,w=s.w,h=s.h;
  c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();
  /* свет ключа сверху: масса не проваливается в черноту */
  const lg=c.createLinearGradient(0,y0,0,y0+h);lg.addColorStop(0,zk==='hives'?'rgba(255,200,160,.07)':'rgba(255,214,170,.08)');lg.addColorStop(0.5,'rgba(255,214,170,.02)');lg.addColorStop(1,'rgba(0,0,0,.12)');
  c.fillStyle=lg;c.fillRect(x0,y0,w,h);
  if(zk==='hives'){bigHouse(c,s,R,r);c.restore();return;}
  /* пояса-ригели и двутавры */
  const bands=h>=8?[0.3,0.66]:[0.5];
  for(const k of bands){const y=y0+h*k-0.22;c.fillStyle='#2c2621';c.fillRect(x0,y,w,0.44);c.fillStyle='rgba(255,214,170,.13)';c.fillRect(x0,y,w,0.05);
    c.fillStyle='rgba(0,0,0,.45)';c.fillRect(x0,y+0.44,w,0.09);for(let x=x0+0.3;x<x0+w;x+=0.6)Kit.bolt(c,x,y+0.22,0.04);}
  const cols=[x0+0.9,x0+w-0.9];if(w>=12)cols.push(x0+w/2);
  for(const x of cols){c.fillStyle='#29231e';c.fillRect(x-0.26,y0,0.52,h);c.fillStyle='rgba(255,214,170,.1)';c.fillRect(x-0.26,y0,0.06,h);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+0.16,y0,0.1,h);
    for(let y=y0+0.5;y<y0+h;y+=0.9)Kit.bolt(c,x,y,0.045);}
  /* смотровые окна: внутри — тёплый свет и силуэты механизма (вал, ролики со щётками, шестерня) */
  const segs=[];let prev=y0;for(const k of bands){segs.push([prev,y0+h*k-0.22]);prev=y0+h*k+0.31;}segs.push([prev,y0+h]);
  const sy=segs.reduce((a,b)=>(b[1]-b[0]>a[1]-a[0]?b:a)),wy0=sy[0]+0.5,wh=Math.min(2.4,sy[1]-sy[0]-1.0);
  if(wh>0.9){const nW=w>=12?2:1;for(let i=0;i<nW;i++){const ww=Math.min(3.4,w*0.24),wx=nW===1?x0+w*0.5-ww/2:x0+w*(i?0.68:0.32)-ww/2;
      c.save();c.beginPath();c.rect(wx,wy0,ww,wh);c.clip();c.fillStyle='#0b0806';c.fillRect(wx,wy0,ww,wh);
      const gl=c.createRadialGradient(wx+ww*0.6,wy0+wh*0.7,0,wx+ww*0.6,wy0+wh*0.7,ww*0.9);gl.addColorStop(0,'rgba(255,170,80,.95)');gl.addColorStop(0.35,'rgba(200,100,40,.5)');gl.addColorStop(1,'rgba(40,16,6,0)');
      c.fillStyle=gl;c.fillRect(wx,wy0,ww,wh);
      c.fillStyle='#120c08';c.fillRect(wx,wy0+wh*0.42,ww,0.14);
      for(let k=0;k<3;k++){const rx=wx+ww*(0.2+k*0.3),ry=wy0+wh*0.62;c.fillStyle='#120c08';c.beginPath();c.arc(rx,ry,wh*0.2,0,TAU);c.fill();
        c.strokeStyle='#120c08';c.lineWidth=0.05;for(let q=0;q<10;q++){const a=q/10*TAU;c.beginPath();c.moveTo(rx+Math.cos(a)*wh*0.2,ry+Math.sin(a)*wh*0.2);c.lineTo(rx+Math.cos(a)*wh*0.3,ry+Math.sin(a)*wh*0.3);c.stroke();}}
      Kit.gear(c,wx+ww*0.85,wy0+wh*0.2,wh*0.32,12,r()*3,'#140d08');
      c.fillStyle='rgba(255,236,200,.08)';c.beginPath();c.moveTo(wx+ww*0.1,wy0);c.lineTo(wx+ww*0.3,wy0);c.lineTo(wx+ww*0.05,wy0+wh);c.lineTo(wx-ww*0.15,wy0+wh);c.closePath();c.fill();
      c.fillStyle='rgba(60,40,24,.5)';c.fillRect(wx,wy0+wh-0.25,ww,0.25);c.restore();
      c.strokeStyle='#1a1512';c.lineWidth=0.22;c.strokeRect(wx,wy0,ww,wh);c.strokeStyle='rgba(255,214,170,.14)';c.lineWidth=0.04;c.strokeRect(wx-0.1,wy0-0.1,ww+0.2,wh+0.2);
      for(let x=wx;x<=wx+ww+0.01;x+=ww/4){Kit.bolt(c,x,wy0-0.06,0.04);Kit.bolt(c,x,wy0+wh+0.06,0.04);}}}
  /* трубы по фасаду и люк с маховиком */
  for(const fx of [0.16,0.86]){const x=x0+w*fx;Kit.pipe(c,[[x,y0],[x,y0+h]],0.15,fx<0.5?'rust':'steel',{seed:((x*7)|0)+3,band:2,bandCol:'#c9a227'});}
  if(h>=4){const hx=x0+w*0.08+1.2,hy=y0+h-1.6;c.fillStyle='#1d1915';c.beginPath();c.arc(hx,hy,0.75,0,TAU);c.fill();c.strokeStyle='#3a3029';c.lineWidth=0.14;c.stroke();
    for(let i=0;i<10;i++){const a=i/10*TAU;Kit.bolt(c,hx+Math.cos(a)*0.62,hy+Math.sin(a)*0.62,0.04);}Kit.valve(c,hx,hy,0.38,r()*3,'#8a6d2a');}
  /* табличка — одна на комнату (на первой массе), на остальных — номер секции */
  const lab=BIGMASS_LABEL[R.id],first=!R._bmLab;if(first)R._bmLab=1;else R._bmLab++;
  if(lab&&w>6){if(first)Kit.sign(c,x0+w*0.5-1.6,y0+Math.min(h*0.12,1.2),3.2,0.6,lab,'#8a6d2a','#16120e',(x0*13)|0);
    else Kit.stencil(c,x0+w*0.5-0.6,y0+Math.min(h*0.12,1.2)+0.45,'СЕКЦ. '+R._bmLab,0.36,'rgba(216,204,178,.5)',0.5);}
  /* висит над проходом: «зебра» по нижней кромке — низкий проём читается издалека */
  if(hang){const y=y0+h-0.3;c.save();c.beginPath();c.rect(x0,y,w,0.3);c.clip();c.fillStyle='#16130f';c.fillRect(x0,y,w,0.3);
    c.fillStyle='#8f7224';for(let x=x0-0.3;x<x0+w;x+=0.6){c.beginPath();c.moveTo(x,y+0.3);c.lineTo(x+0.3,y);c.lineTo(x+0.6,y);c.lineTo(x+0.3,y+0.3);c.closePath();c.fill();}c.restore();}
  c.restore();}
/* торец дома в Сотах: окна квартир, часть горит, кондиционеры, водосток */
function bigHouse(c,s,R,r){const x0=s.x,y0=s.y,w=s.w,h=s.h,cw=1.6,rh=2.2;
  for(let y=y0+0.9;y<y0+h-1.4;y+=rh)for(let x=x0+0.55;x<x0+w-1.0;x+=cw){if(r()<0.12)continue;const lit=r()<0.32,ww=0.9,wh=1.2;
    c.fillStyle='#1a1110';c.fillRect(x-0.08,y-0.08,ww+0.16,wh+0.22);
    if(lit){const g=c.createLinearGradient(0,y,0,y+wh);g.addColorStop(0,'#f2b866');g.addColorStop(1,'#b8682e');c.fillStyle=g;c.fillRect(x,y,ww,wh);
      if(r()<0.6){c.fillStyle='rgba(120,40,30,.65)';c.fillRect(x,y,ww*0.3,wh);c.fillRect(x+ww*0.72,y,ww*0.28,wh);}
      if(r()<0.3){c.fillStyle='rgba(30,16,12,.8)';c.beginPath();c.arc(x+ww*0.5,y+wh*0.45,0.12,0,TAU);c.fill();c.fillRect(x+ww*0.38,y+wh*0.55,0.24,0.45);}}
    else{c.fillStyle='#2a1c1a';c.fillRect(x,y,ww,wh);c.fillStyle='rgba(200,180,170,.06)';c.fillRect(x+0.05,y+0.05,ww*0.4,wh*0.5);}
    c.fillStyle='#3a2a24';c.fillRect(x,y+wh*0.5,ww,0.05);c.fillRect(x+ww*0.5-0.025,y,0.05,wh);
    c.fillStyle='#4a3830';c.fillRect(x-0.12,y+wh+0.08,ww+0.24,0.1);
    if(r()<0.18){c.fillStyle='#3e3a36';c.fillRect(x+ww+0.05,y+wh*0.6,0.5,0.38);c.strokeStyle='#22201e';c.lineWidth=0.03;for(let k=1;k<4;k++){c.beginPath();c.moveTo(x+ww+0.05+k*0.12,y+wh*0.62);c.lineTo(x+ww+0.05+k*0.12,y+wh*0.96);c.stroke();}}}
  Kit.pipe(c,[[x0+w-0.35,y0],[x0+w-0.35,y0+h]],0.1,'steel',{seed:((x0*11)|0)+5});
  for(let y=y0+rh;y<y0+h;y+=rh){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x0,y-0.06,w,0.06);}}
