"use strict";
/* ============================== ПОВЕРХНОСТЬ ==============================
   Мир снаружи нарисован так же тщательно, как механизмы внутри: у листа — три тона и блик, у коры —
   светлая сторона к солнцу и трещины, у камня — мох сверху и тень снизу, у облака — освещённый бок.
   Свет — от солнца справа сверху (там же, где оно на небе). Руины прежнего мира — механизмы:
   упавший колосс и решётчатая мачта, в ржавчине и плюще. Всё печётся в слои один раз при входе. */
const SURF={sunX:0.74,sunY:0.16,
  leaf:['#2f4a24','#46682f','#5f8a3c','#80ad4c','#a9cf68'],
  grass:['#4c6d2e','#5f8538','#77a046','#93bd58'],
  bark:['#3a2c20','#5a4532','#7c6248'],
  stone:['#5e5a52','#7e796e','#a29c8f']};
const SurfaceArt={
  /* лист: вытянутый эллипс с жилкой; тон — по глубине в кроне и по стороне к солнцу */
  leaf(c,x,y,s,a,col,vein){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=col;c.beginPath();c.moveTo(-s,0);c.quadraticCurveTo(0,-s*0.55,s,0);c.quadraticCurveTo(0,s*0.55,-s,0);c.fill();
    if(vein){c.strokeStyle='rgba(30,50,20,.35)';c.lineWidth=s*0.08;c.beginPath();c.moveTo(-s*0.85,0);c.lineTo(s*0.85,0);c.stroke();}c.restore();},
  /* масса листвы: тёмная глубина, средние листья, светлые — к солнцу, блики по краю */
  foliage(c,x,y,R,r,o){o=o||{};const L=SURF.leaf,n=Math.round(R*R*(o.dense||70)),ls=o.leaf||0.16;
    const g=c.createRadialGradient(x+R*0.2,y-R*0.2,R*0.1,x,y,R*1.05);g.addColorStop(0,'rgba(70,104,47,.95)');g.addColorStop(1,'rgba(36,58,28,.9)');
    c.fillStyle=g;c.beginPath();for(let i=0;i<9;i++){const a=i/9*TAU,rr0=R*(0.72+r()*0.3);c.moveTo(x+Math.cos(a)*rr0+R*0.3,y+Math.sin(a)*rr0*0.82);c.arc(x+Math.cos(a)*rr0*0.7,y+Math.sin(a)*rr0*0.6,R*0.42,0,TAU);}c.fill();
    for(let i=0;i<n;i++){const a=r()*TAU,d=Math.sqrt(r())*R,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*0.85;
      /* освещённость: к солнцу (вправо-вверх) и к краю кроны */
      const lit=clamp(0.5+(px-x)/R*0.35-(py-y)/R*0.35+(d/R-0.5)*0.3+(r()-0.5)*0.35,0,0.999);
      this.leaf(c,px,py,ls*(0.7+r()*0.6),r()*TAU,L[Math.floor(lit*L.length)],ls>0.12&&r()<0.3);}
    /* блики солнца на верхнем правом краю */
    for(let i=0;i<n*0.12;i++){const a=-PI/2+r()*PI*0.7,d=R*(0.75+r()*0.25);this.leaf(c,x+Math.cos(a)*d,y+Math.sin(a)*d*0.85,ls*0.8,r()*TAU,'rgba(205,232,140,.85)');}},
  /* дерево: ствол сужается, кора светлее к солнцу, ветви — к массам листвы */
  tree(c,x,y,h,r,o){o=o||{};const B=SURF.bark,w=h*0.06;
    const tg=c.createLinearGradient(x-w,0,x+w,0);tg.addColorStop(0,B[0]);tg.addColorStop(0.55,B[1]);tg.addColorStop(1,B[2]);
    const lean=(r()-0.5)*0.12*h,top={x:x+lean,y:y-h*0.7};
    c.fillStyle=tg;c.beginPath();c.moveTo(x-w*1.4,y);c.quadraticCurveTo(x-w*0.8,y-h*0.3,top.x-w*0.35,top.y);c.lineTo(top.x+w*0.35,top.y);c.quadraticCurveTo(x+w*0.8,y-h*0.3,x+w*1.4,y);c.closePath();c.fill();
    /* корни и кора */
    c.fillStyle=B[0];for(const s of [-1,1]){c.beginPath();c.moveTo(x+s*w*0.6,y-h*0.06);c.quadraticCurveTo(x+s*w*1.8,y-h*0.02,x+s*w*2.6,y+0.02);c.lineTo(x+s*w*1.2,y+0.02);c.closePath();c.fill();}
    c.strokeStyle='rgba(30,22,14,.55)';c.lineWidth=w*0.12;for(let i=0;i<7;i++){const bx=x+(r()-0.5)*w*1.2,by=y-r()*h*0.5;c.beginPath();c.moveTo(bx,by);c.lineTo(bx+(r()-0.5)*w*0.3,by-h*0.08-r()*h*0.06);c.stroke();}
    c.strokeStyle='rgba(200,170,120,.25)';c.lineWidth=w*0.1;for(let i=0;i<4;i++){const bx=x+w*0.5+(r()-0.5)*w*0.3,by=y-r()*h*0.5;c.beginPath();c.moveTo(bx,by);c.lineTo(bx,by-h*0.06);c.stroke();}
    /* ветви и массы листвы */
    const masses=[];const nb=3+Math.floor(r()*2);
    for(let i=0;i<nb;i++){const a=-PI/2+(i-(nb-1)/2)*0.55+(r()-0.5)*0.25,L=h*(0.24+r()*0.12),sx=top.x+(r()-0.5)*w,sy=top.y+h*0.08*r();
      const ex=sx+Math.cos(a)*L,ey=sy+Math.sin(a)*L;c.strokeStyle=B[1];c.lineWidth=w*0.55;c.lineCap='round';c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+ex)/2+(r()-0.5)*w,(sy+ey)/2,ex,ey);c.stroke();
      masses.push({x:ex,y:ey-h*0.02,R:h*(0.13+r()*0.06)});}
    masses.push({x:top.x,y:top.y-h*0.14,R:h*0.17});
    masses.sort((a,b)=>a.x-b.x);
    for(const m of masses)this.foliage(c,m.x,m.y,m.R,r,{leaf:o.leaf||Math.max(0.12,h*0.022),dense:o.dense});},
  /* куст: низкая масса листвы на коротких ветках */
  bush(c,x,y,s,r){for(let i=0;i<3;i++)this.foliage(c,x+(i-1)*s*0.55,y-s*(0.35+r()*0.15),s*(0.42+r()*0.12),r,{leaf:0.11,dense:90});},
  /* камень: многоугольник, свет справа сверху, мох на макушке, трещина */
  rock(c,x,y,w,h,r){const S=SURF.stone,pts=[];for(let i=0;i<=8;i++){const a=PI+i/8*PI;pts.push([x+Math.cos(a)*w*(0.85+r()*0.2),y+Math.sin(a)*h*(0.8+r()*0.25)]);}
    const g=c.createLinearGradient(x-w,y-h,x+w*0.6,y);g.addColorStop(0,S[0]);g.addColorStop(0.6,S[1]);g.addColorStop(1,S[2]);
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+w*0.1,y+0.02,w*1.05,h*0.18,0,0,TAU);c.fill();
    c.fillStyle=g;c.beginPath();c.moveTo(pts[0][0],y);for(const p of pts)c.lineTo(p[0],p[1]);c.lineTo(pts[8][0],y);c.closePath();c.fill();
    c.save();c.clip();c.globalAlpha=0.35;c.fillStyle=PAT(c,'concrete');c.fillRect(x-w*1.2,y-h*1.2,w*2.4,h*1.3);c.globalAlpha=1;
    c.fillStyle='rgba(255,250,235,.22)';c.beginPath();c.ellipse(x+w*0.3,y-h*0.75,w*0.45,h*0.22,0.2,0,TAU);c.fill();c.restore();
    c.fillStyle='rgba(98,138,58,.85)';for(let i=0;i<10;i++){const px=x+(r()-0.6)*w*1.2,py=y-h*(0.75+r()*0.2);c.beginPath();c.arc(px,py,w*0.07+r()*w*0.06,0,TAU);c.fill();}
    c.strokeStyle='rgba(30,28,24,.5)';c.lineWidth=0.03;c.beginPath();c.moveTo(x-w*0.1,y-h*0.9);c.lineTo(x+w*0.05,y-h*0.5);c.lineTo(x-w*0.08,y-h*0.2);c.stroke();},
  /* пучок травы: травинки разного тона, освещённые — светлее */
  tuft(c,x,y,h,r,n){const G=SURF.grass;n=n||9;for(let i=0;i<n;i++){const bx=x+(r()-0.5)*h*0.5,bh=h*(0.55+r()*0.5),lean=(r()-0.5)*h*0.5;
      c.strokeStyle=G[Math.floor(r()*G.length)];c.lineWidth=0.035+r()*0.03;c.beginPath();c.moveTo(bx,y);c.quadraticCurveTo(bx+lean*0.3,y-bh*0.6,bx+lean,y-bh);c.stroke();}},
  /* цветок: стебель, два листа, пять лепестков с тенью и сердцевина */
  flower(c,x,y,s,col,r){const st=s*(2.2+r()*1.4);c.strokeStyle='#4f7a2e';c.lineWidth=s*0.12;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(r()-0.5)*s,y-st*0.5,x,y-st);c.stroke();
    this.leaf(c,x-s*0.3,y-st*0.3,s*0.45,-0.6,'#5f8a3c');this.leaf(c,x+s*0.3,y-st*0.45,s*0.4,0.6,'#6f9a44');
    const cy=y-st;for(let i=0;i<5;i++){const a=i/5*TAU+r()*0.2;c.fillStyle=col;c.beginPath();c.ellipse(x+Math.cos(a)*s*0.42,cy+Math.sin(a)*s*0.42,s*0.42,s*0.24,a,0,TAU);c.fill();}
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(x+s*0.25,cy-s*0.3,s*0.22,s*0.12,-0.6,0,TAU);c.fill();
    c.fillStyle='#e8b53a';c.beginPath();c.arc(x,cy,s*0.2,0,TAU);c.fill();c.fillStyle='#8a5a1c';c.beginPath();c.arc(x-s*0.05,cy+s*0.05,s*0.08,0,TAU);c.fill();},
  /* облако: пухлые доли, освещённая верхняя правая сторона, синеватая тень снизу */
  cloud(c,x,y,s,r){const n=6+Math.floor(r()*4),P=[];for(let i=0;i<n;i++)P.push({x:x+(i-(n-1)/2)*s*0.42+(r()-0.5)*s*0.2,y:y-Math.sin(i/(n-1)*PI)*s*0.32*(0.6+r()*0.6),R:s*(0.28+r()*0.2)});
    c.fillStyle='rgba(176,192,208,.55)';for(const p of P){c.beginPath();c.arc(p.x,p.y+p.R*0.25,p.R,0,TAU);c.fill();}
    for(const p of P){const g=c.createRadialGradient(p.x+p.R*0.35,p.y-p.R*0.4,p.R*0.1,p.x,p.y,p.R);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(0.7,'rgba(236,241,246,.92)');g.addColorStop(1,'rgba(210,222,234,.6)');
      c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,p.R,0,TAU);c.fill();}
    c.fillStyle='rgba(160,178,198,.16)';c.beginPath();c.ellipse(x,y+s*0.2,s*n*0.17,s*0.07,0,0,TAU);c.fill();},
  /* плющ: стебель по точкам, листья парами */
  ivy(c,pts,r,s){s=s||0.13;c.strokeStyle='rgba(70,90,40,.9)';c.lineWidth=s*0.25;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(const p of pts)c.lineTo(p[0],p[1]);c.stroke();
    for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],L=Math.hypot(x1-x0,y1-y0);for(let k=0;k<L/(s*1.3);k++){const u=k*s*1.3/L,px=lerp(x0,x1,u),py=lerp(y0,y1,u);
      for(const sd of [-1,1])this.leaf(c,px+sd*s*0.6,py,s*(0.6+r()*0.4),sd*0.9+(r()-0.5),SURF.leaf[1+Math.floor(r()*3)]);}}},
  /* упавший колосс прежнего мира: голова-котёл в заклёпках, треснувшая линза глаза, мох и плющ */
  colossus(c,x,y,s,r){c.save();c.translate(x,y);c.scale(s,s);
    /* плечо и рука, ушедшие в землю */
    c.fillStyle=PAT(c,'rust');c.beginPath();c.moveTo(-4.2,0);c.lineTo(-3.6,-1.3);c.lineTo(-1.8,-1.7);c.lineTo(-1.2,0);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.3)';c.fillRect(-4.2,-0.25,3,0.25);
    for(let i=0;i<5;i++)MK.bolt(c,-3.4+i*0.42,-1.35+i*0.04,0.07,'brass');
    /* голова: скруглённый котёл, наклонён */
    c.save();c.translate(0.6,-1.15);c.rotate(-0.22);
    c.beginPath();c.moveTo(-1.9,1.2);c.lineTo(-1.9,-0.6);c.quadraticCurveTo(-1.9,-1.9,0,-1.9);c.quadraticCurveTo(1.9,-1.9,1.9,-0.6);c.lineTo(1.9,1.2);c.closePath();
    c.fillStyle=MK.plateGrad(c,'iron',-1.9,-1.9,3.8,3.1);c.fill();
    c.save();c.clip();c.globalAlpha=0.55;c.fillStyle=PAT(c,'rust');c.fillRect(-2,-2,4,3.3);c.globalAlpha=1;
    c.fillStyle='rgba(255,236,200,.18)';c.beginPath();c.ellipse(0.9,-1.5,1.1,0.25,0.2,0,TAU);c.fill();
    c.fillStyle='rgba(0,0,0,.32)';c.fillRect(-2,0.7,4,0.6);
    c.fillStyle='rgba(0,0,0,.4)';c.fillRect(-0.02,-1.9,0.05,3.1);c.fillRect(-1.9,-0.25,3.8,0.05);c.restore();
    c.strokeStyle=MAT.iron.ed;c.lineWidth=0.05;c.stroke();
    for(let i=0;i<9;i++){const a=PI+0.15+i/8*(PI-0.3);MK.bolt(c,Math.cos(a)*1.72,-0.6+Math.sin(a)*1.2,0.06,'steel');}
    /* глаз: латунное кольцо, треснувшая линза, внутри — гнездо */
    c.fillStyle='#14110c';c.beginPath();c.arc(0.55,-0.45,0.62,0,TAU);c.fill();
    c.strokeStyle=MAT.brass.mid;c.lineWidth=0.14;c.beginPath();c.arc(0.55,-0.45,0.62,0,TAU);c.stroke();
    for(let i=0;i<8;i++){const a=i/8*TAU;MK.bolt(c,0.55+Math.cos(a)*0.62,-0.45+Math.sin(a)*0.62,0.045,'brass');}
    c.fillStyle='rgba(160,200,210,.25)';c.beginPath();c.arc(0.55,-0.45,0.5,PI*1.1,PI*1.9);c.fill();
    MK.cracks(c,0.55,-0.45,0.5,77,0.9);
    c.strokeStyle='#7a6038';c.lineWidth=0.05;for(let i=0;i<10;i++){c.beginPath();c.moveTo(0.2+r()*0.7,-0.2-r()*0.2);c.lineTo(0.2+r()*0.7,-0.1-r()*0.2);c.stroke();}
    /* решётка рта */
    c.fillStyle='#1a1712';rr(c,-1.3,0.3,1.4,0.5,0.1);c.fill();c.fillStyle=MAT.brass.dark;for(let i=0;i<6;i++)c.fillRect(-1.2+i*0.22,0.33,0.07,0.44);
    /* мох по куполу головы: подушки вдоль верхней кромки, тени под ними, редкие свисающие пряди */
    for(let i=0;i<70;i++){const x=-1.75+r()*2.6,y=-0.6-1.3*(1-Math.pow(x/1.9,2))+r()*0.12,R=0.05+r()*0.09;
      c.fillStyle='rgba(40,60,26,.5)';c.beginPath();c.arc(x+0.02,y+0.04,R,0,TAU);c.fill();c.fillStyle=SURF.leaf[2+Math.floor(r()*3)];c.beginPath();c.arc(x,y,R,0,TAU);c.fill();}
    c.strokeStyle='rgba(80,110,50,.8)';c.lineWidth=0.025;for(let i=0;i<7;i++){const x=-1.5+r()*2.2,y=-0.6-1.3*(1-Math.pow(x/1.9,2));c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+0.05,y+0.3,x-0.03,y+0.45+r()*0.4);c.stroke();}
    c.restore();
    /* мох на макушке и плющ по боку */
    this.ivy(c,[[-1.4,0],[-1.5,-0.9],[-1.0,-1.8],[-0.2,-2.7],[0.8,-3.0]],r,0.16);
    this.ivy(c,[[2.6,0],[2.7,-0.8],[2.3,-1.6]],r,0.14);
    c.restore();},
  /* решётчатая мачта прежнего мира: стальные уголки со светлой кромкой, ржавчина, плющ до середины */
  mast(c,x,y,h,lean,r){c.save();c.translate(x,y);c.rotate(lean);const w0=h*0.13,w1=h*0.05;
    const leg=(sx)=>{c.strokeStyle='#3c4246';c.lineWidth=0.16;c.beginPath();c.moveTo(sx*w0,0);c.lineTo(sx*w1,-h);c.stroke();c.strokeStyle='rgba(220,226,230,.35)';c.lineWidth=0.04;c.beginPath();c.moveTo(sx*w0+0.05,0);c.lineTo(sx*w1+0.05,-h);c.stroke();};
    leg(-1);leg(1);
    const n=Math.floor(h/0.9);c.lineWidth=0.07;
    for(let i=0;i<n;i++){const y0=-i*h/n,y1=-(i+1)*h/n,a=lerp(w0,w1,i/n),b=lerp(w0,w1,(i+1)/n);
      c.strokeStyle=i%3===1?'#6b4a3a':'#474d52';c.beginPath();c.moveTo(-a,y0);c.lineTo(b,y1);c.moveTo(a,y0);c.lineTo(-b,y1);c.moveTo(-a,y0);c.lineTo(a,y0);c.stroke();}
    /* сломанная консоль с обрывком троса и висящим фонарём */
    c.strokeStyle='#474d52';c.lineWidth=0.12;c.beginPath();c.moveTo(-w1,-h);c.lineTo(h*0.32,-h*0.96);c.lineTo(h*0.29,-h*0.9);c.stroke();
    c.strokeStyle='rgba(30,30,30,.7)';c.lineWidth=0.03;c.beginPath();c.moveTo(h*0.29,-h*0.9);c.quadraticCurveTo(h*0.31,-h*0.82,h*0.28,-h*0.76);c.stroke();
    c.fillStyle='#3a3020';rr(c,h*0.26,-h*0.76,0.18,0.24,0.04);c.fill();
    c.restore();
    this.ivy(c,[[x-0.4,y],[x-0.2,y-h*0.2],[x-0.5,y-h*0.38],[x-0.1,y-h*0.52]],r,0.15);
    this.ivy(c,[[x+0.5,y],[x+0.4,y-h*0.25]],r,0.13);},
  /* холмы с полосой леса по гребню */
  hill(c,L,base,amp,ph,col,trees,r){c.fillStyle=col;c.beginPath();c.moveTo(0,L.h);
    const yAt=x=>base-Math.sin(x*0.05+ph)*amp-Math.sin(x*0.017+ph*1.7)*amp*1.6;
    for(let x=0;x<=L.w;x+=0.8)c.lineTo(x,yAt(x));c.lineTo(L.w,L.h);c.closePath();c.fill();
    if(trees){const hex=col.indexOf('#')===0,base=hex?hxc(col):null,sh=(k)=>hex?'rgb('+base.map(v=>Math.round(clamp(v*k,0,255))).join(',')+')':col;
      for(let x=-0.5;x<L.w+0.5;x+=0.45+r()*0.55){const y=yAt(x)+0.15,h=trees*(0.6+r()*0.7);
        c.fillStyle=sh(0.82);for(const [dx,dy,rr0] of [[-0.18,-0.35,0.3],[0.16,-0.42,0.3],[0,-0.7,0.32]]){c.beginPath();c.arc(x+dx*h,y+dy*h,rr0*h,0,TAU);c.fill();}
        c.fillStyle=sh(1.12);c.beginPath();c.arc(x+0.12*h,y-0.78*h,0.2*h,0,TAU);c.fill();c.beginPath();c.arc(x+0.28*h,y-0.5*h,0.16*h,0,TAU);c.fill();}}
    return yAt;}
};
/* ---------- слои комнаты ---------- */
Art.farSurface=(c,L,R,r)=>{
  /* дальние горы в дымке и трубы других кенотафов на горизонте — выходы соседних аркологий */
  const g=c.createLinearGradient(0,0,0,L.h);g.addColorStop(0,'#86b4d6');g.addColorStop(0.45,'#c3dbe6');g.addColorStop(0.62,'#ece2c8');g.addColorStop(1,'#d8dcc4');
  c.fillStyle=g;c.fillRect(0,0,L.w,L.h);
  SurfaceArt.hill(c,L,L.h*0.56,1.8,0.4,'rgba(150,170,180,.55)',0,r);
  for(const fx of [0.12,0.47,0.83]){const x=L.w*fx,y=L.h*0.53;c.fillStyle='rgba(140,156,166,.6)';c.fillRect(x-0.25,y-3.2,0.5,3.2);c.fillRect(x-0.45,y-3.3,0.9,0.18);}
  SurfaceArt.hill(c,L,L.h*0.6,1.4,2.1,'rgba(128,150,150,.6)',0.9,r);};
Art.bgSurface=(c,L,R,r)=>{
  /* небо уже нарисовано дальним слоем — здесь солнце, облака и ближние холмы с лесом по гребню */
  const sx=L.w*SURF.sunX,sy=L.h*SURF.sunY;
  const sg=c.createRadialGradient(sx,sy,0,sx,sy,L.h*0.6);sg.addColorStop(0,'rgba(255,252,235,.95)');sg.addColorStop(0.08,'rgba(255,246,214,.8)');sg.addColorStop(0.25,'rgba(255,236,190,.35)');sg.addColorStop(1,'rgba(255,236,190,0)');
  c.fillStyle=sg;c.beginPath();c.arc(sx,sy,L.h*0.6,0,TAU);c.fill();
  for(let i=0;i<9;i++)SurfaceArt.cloud(c,r()*L.w*1.1-L.w*0.05,L.h*(0.06+r()*0.24),2+r()*3.2,r);
  SurfaceArt.hill(c,L,L.h*0.63,1.6,0.9,'#7d9878',1.1,r);
  SurfaceArt.hill(c,L,L.h*0.69,1.2,3.4,'#6a8a5e',1.3,r);
  /* дымка у горизонта */
  const h=c.createLinearGradient(0,L.h*0.5,0,L.h*0.8);h.addColorStop(0,'rgba(236,230,206,0)');h.addColorStop(0.5,'rgba(236,230,206,.35)');h.addColorStop(1,'rgba(236,230,206,0)');c.fillStyle=h;c.fillRect(0,L.h*0.5,L.w,L.h*0.3);};
Art.midSurface=(c,L,R,r)=>{
  const gy=L.h*0.8;
  SurfaceArt.mast(c,L.w*0.34,gy+0.3,13,0.12,r);
  SurfaceArt.colossus(c,L.w*0.6,gy+0.5,2.4,r);
  /* деревья и кусты по полю, крупные — реже */
  const T=[];for(let x=-2;x<L.w+2;x+=5+r()*6)T.push({x,h:5+r()*4.5});
  for(const t of T)SurfaceArt.tree(c,t.x,gy+0.3+r()*0.6,t.h,r);
  for(let i=0;i<L.w/6;i++)SurfaceArt.bush(c,r()*L.w,gy+0.6+r()*0.4,0.9+r()*0.7,r);
  for(let i=0;i<L.w/2.2;i++)SurfaceArt.tuft(c,r()*L.w,gy+0.7+r()*0.5,0.5+r()*0.3,r,10);};
Art.gameSurface=(c,L,R,r)=>{
  c.clearRect(0,0,L.w,L.h);
  if(R.extraGame)R.extraGame(c,L,r);
  drawSolids(c,R,'surface');
  if(R.extraTop)R.extraTop(c,L,r);};
/* земля, кенотаф и всё у ног курьера (js/world/rooms/z5.js) */
const SurfaceGround={
  /* дёрн, глина, камни и корни под кромкой травы */
  soil(c,x0,x1,y,depth,r){const g=c.createLinearGradient(0,y,0,y+depth);g.addColorStop(0,'#46562a');g.addColorStop(0.08,'#5a4630');g.addColorStop(0.5,'#3e2e1e');g.addColorStop(1,'#241a10');
    c.fillStyle=g;c.fillRect(x0,y+0.12,x1-x0,depth);
    c.fillStyle='#5d7d36';c.fillRect(x0,y,x1-x0,0.2);c.fillStyle='rgba(160,200,100,.35)';c.fillRect(x0,y,x1-x0,0.05);
    for(let i=0;i<(x1-x0)*2;i++){const sx=x0+r()*(x1-x0),sy=y+0.5+r()*(depth-0.6),w=0.08+r()*0.22;
      c.fillStyle=['#6a5a44','#4a3e30','#7a6a52','#5a5048'][(r()*4)|0];c.beginPath();c.ellipse(sx,sy,w,w*0.65,r()*3,0,TAU);c.fill();
      c.fillStyle='rgba(255,240,210,.18)';c.beginPath();c.ellipse(sx+w*0.2,sy-w*0.25,w*0.4,w*0.2,0,0,TAU);c.fill();}
    c.strokeStyle='rgba(120,96,60,.55)';for(let i=0;i<(x1-x0)*0.8;i++){const sx=x0+r()*(x1-x0);c.lineWidth=0.03+r()*0.04;c.beginPath();c.moveTo(sx,y+0.2);
      c.quadraticCurveTo(sx+(r()-0.5),y+1.2,sx+(r()-0.5)*1.6,y+1.4+r()*2);c.stroke();}},
  /* кенотаф: бетонный обелиск, швы опалубки, потёки, мох, трещины, клёпаный люк с открытой створкой */
  cenotaph(c,r){const x0=0.2,x1=6.8,top=17.4;
    const sh=c.createLinearGradient(0,0,8,0);sh.addColorStop(0,'rgba(0,0,0,.35)');sh.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sh;c.fillRect(6.6,26,3,3.05);
    c.beginPath();c.moveTo(x0,29);c.lineTo(0.8,19.5);c.lineTo(3.5,top);c.lineTo(6.2,19.5);c.lineTo(x1,29);c.closePath();
    const g=c.createLinearGradient(0,0,7,0);g.addColorStop(0,'#77746a');g.addColorStop(0.45,'#a39f92');g.addColorStop(0.75,'#b4b0a2');g.addColorStop(1,'#6e6b62');c.fillStyle=g;c.fill();
    c.save();c.clip();c.globalAlpha=0.5;c.fillStyle=PAT(c,'concrete');c.fillRect(0,top,7,12);c.globalAlpha=1;
    /* швы опалубки и следы от стяжек */
    c.strokeStyle='rgba(40,40,36,.4)';c.lineWidth=0.04;for(let i=0;i<7;i++){const y=28.4-i*1.35;c.beginPath();c.moveTo(0,y);c.lineTo(7,y);c.stroke();
      c.fillStyle='rgba(40,40,36,.45)';for(let k=0;k<4;k++){c.beginPath();c.arc(1.2+k*1.5,y-0.65,0.05,0,TAU);c.fill();}}
    /* потёки ржавчины и сырости */
    for(let i=0;i<9;i++){const sx=0.8+r()*5.4,sy=18.5+r()*6,l=1.5+r()*3.5;const lg=c.createLinearGradient(0,sy,0,sy+l);lg.addColorStop(0,'rgba(90,60,40,.45)');lg.addColorStop(1,'rgba(90,60,40,0)');
      c.fillStyle=lg;c.fillRect(sx,sy,0.08+r()*0.1,l);}
    /* свет на правой грани и на вершине */
    c.fillStyle='rgba(255,246,220,.2)';c.beginPath();c.moveTo(3.5,top);c.lineTo(6.2,19.5);c.lineTo(6.0,19.9);c.lineTo(3.5,top+0.4);c.closePath();c.fill();
    /* мох снизу и на уступах, трещины */
    for(let i=0;i<120;i++){const px=r()*7,py=29-Math.pow(r(),2)*4;c.fillStyle=r()<0.5?'rgba(88,128,52,.8)':'rgba(120,150,70,.7)';c.beginPath();c.arc(px,py,0.05+r()*0.1,0,TAU);c.fill();}
    c.strokeStyle='rgba(30,28,24,.6)';c.lineWidth=0.035;for(const [sx,sy] of [[1.4,20.4],[5.2,22.1],[2.0,25.0]]){c.beginPath();c.moveTo(sx,sy);let px=sx,py=sy;for(let k=0;k<5;k++){px+=(r()-0.4)*0.5;py+=0.3+r()*0.4;c.lineTo(px,py);}c.stroke();}
    c.restore();
    Kit.stencil(c,1.3,22.6,'КЕНОТАФ',0.55,'rgba(40,40,36,.78)',0.8);
    Kit.stencil(c,1.4,23.4,'ВЫХОД 41 · НЕ ОТКРЫВАТЬ',0.22,'rgba(40,40,36,.65)',0.65);
    /* проём люка со светом изнутри, рама в заклёпках, сорванная створка */
    c.fillStyle='#16140f';rr(c,2.3,26.2,2.4,2.8,0.2);c.fill();
    const lg=c.createLinearGradient(0,26.2,0,29);lg.addColorStop(0,'rgba(255,230,170,.28)');lg.addColorStop(1,'rgba(255,230,170,0)');c.fillStyle=lg;rr(c,2.3,26.2,2.4,2.8,0.2);c.fill();
    c.strokeStyle='#4d4a42';c.lineWidth=0.16;rr(c,2.22,26.12,2.56,2.96,0.24);c.stroke();
    for(let k=0;k<6;k++){MK.bolt(c,2.32+k*0.47,26.16,0.05,'steel');}
    c.save();c.translate(4.78,26.3);c.rotate(-1.1);
    c.fillStyle=MK.plateGrad(c,'iron',0,-0.2,2.6,0.4);c.fillRect(0,-0.18,2.6,0.36);c.globalAlpha=0.5;c.fillStyle=PAT(c,'rust');c.fillRect(0,-0.18,2.6,0.36);c.globalAlpha=1;
    c.fillStyle='rgba(255,230,190,.2)';c.fillRect(0,-0.18,2.6,0.04);for(let k=0;k<5;k++)MK.bolt(c,0.25+k*0.52,0,0.045,'steel');c.restore();
    /* высокая трава и плющ у основания */
    SurfaceArt.ivy(c,[[0.5,29],[0.7,27.5],[0.6,25.8],[1.0,24.2]],r,0.15);
    SurfaceArt.ivy(c,[[6.4,29],[6.1,27.8],[6.3,26.4]],r,0.13);
    for(let i=0;i<10;i++)SurfaceArt.tuft(c,0.3+r()*6.4,29.05,0.7+r()*0.9,r,8);},
  /* всё, что растёт и лежит по полю */
  field(c,L,r){const y=29.02;
    for(let i=0;i<9;i++)SurfaceArt.rock(c,8+r()*54,y+0.08,0.35+r()*0.5,0.3+r()*0.35,r);
    for(let x=7;x<64;x+=0.55+r()*0.5)SurfaceArt.tuft(c,x,y,0.35+r()*0.45,r,7);
    const cols=['#f2d27a','#ece8f2','#d8806a','#c8a0e0','#9fd0f0','#f0b0c8'];
    for(let i=0;i<34;i++){const cx=7+r()*56,col=cols[(r()*cols.length)|0],n=2+Math.floor(r()*4);for(let k=0;k<n;k++)SurfaceArt.flower(c,cx+(r()-0.5)*0.9,y,0.11+r()*0.05,col,r);}}
};
