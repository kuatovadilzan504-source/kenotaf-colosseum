"use strict";
/* ============================== ЖИВОЙ МИР: МЕДЛЕННОЕ ВТОРИЧНОЕ ДВИЖЕНИЕ ==============================
   Мир живёт, даже когда курьер стоит: цепи с крюками покачиваются под сводом, лопасти вентиляторов
   в проёмах цеха вращаются, шестерни Печати идут в такт, плети в Эдеме колышутся, индикаторы на щитах
   медленно мигают, свечи в Архиве дрожат, абажуры на шнурах в Сотах ходят от сквозняка.
   Немного, медленно, почти незаметно: несколько живых вещей лучше сотни шумящих.
   Сильные события (тяжёлый удар, отрыв узла, импульс, прерывание, гибель механизма) толкают всё это
   (renderer.impulse из js/combat/feedback.js): цепи раскачиваются, плети отклоняются, свечи пригибаются.
   Только картинка: предметы не твёрдые, ни за что не цепляются, на игру не влияют. Рисуются в слой машин —
   за курьером и механизмами, перед стеной. */
const Ambient={
  /* набор живых вещей комнаты — один раз на комнату, из её геометрии (детерминированно) */
  props(R){if(R._amb&&R._amb.src===R.solids)return R._amb.list;
    const list=[],r=rng(R.id+'amb'),zk=R.zone,sol=R.solids.filter(s=>!s.hidden&&!s.dyn);
    const solidAt=(x,y)=>sol.some(s=>!s.ow&&x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h);
    const doorNear=(x,y)=>(R.doors||[]).some(d=>x>d.x-1.5&&x<d.x+d.w+1.5&&y>d.y-3&&y<d.y+d.h+1);
    const clearBelow=(x,y,len)=>{for(let k=0.3;k<=len+0.8;k+=0.3)if(solidAt(x,y+k))return false;return !doorNear(x,y+len);};
    /* потолочные точки: низ твёрдых масс и настилов, под которыми пусто */
    const hangs=[];for(const s of sol){if(s.w<1.6)continue;const y=s.y+s.h;if(y>R.h-2.5)continue;
      for(let x=s.x+0.6+r()*2;x<s.x+s.w-0.5;x+=3+r()*5)hangs.push({x,y,ow:!!s.ow});}
    const pick=(n,len,f)=>{let k=0;for(let i=0;i<hangs.length*2&&k<n;i++){const h=hangs[(r()*hangs.length)|0];if(!h||h.used||(f&&!f(h)))continue;
      const L=len[0]+r()*(len[1]-len[0]);if(!clearBelow(h.x,h.y,L))continue;h.used=true;k++;list.push({x:h.x,y:h.y,len:L,a:(r()-0.5)*0.06,v:0,ph:r()*TAU,seed:(r()*1e4)|0});}
      return list.slice(list.length-k);};
    const n=Math.max(2,Math.round(R.w/14));
    if(zk==='sump'||zk==='seal')for(const p of pick(n,[1.4,3.6],h=>!h.ow))Object.assign(p,{k:'chain',weight:zk==='seal'&&p.seed%2===0});
    if(zk==='hives')for(const p of pick(Math.max(2,n-1),[0.9,2.2],h=>!h.ow))p.k='cord';
    if(zk==='eden'||zk==='surface')for(const p of pick(n*2,[0.8,2.6]))p.k='vine';
    if(zk==='archive')for(const p of pick(Math.max(1,n-1),[0.6,1.6]))p.k='slip';
    /* фонари на цепях: качаются и качают свой свет (крупное — медленно: длинная цепь — долгий период) */
    if(zk!=='eden'&&zk!=='surface')for(const p of pick(zk==='archive'?2:1,[1.6,3.2],h=>!h.ow))Object.assign(p,{k:'lamp',col:zk==='seal'?'#cfe6ff':'#ffcf8a'});
    /* вентиляторы и шестерни — в проёмах задней стены (js/render/architecture.js кладёт их в R._bays) */
    for(const b of (R._bays||[])){if(list.filter(q=>q.k==='fan'||q.k==='gears').length>=2)break;
      if(zk==='sump'&&(b.vk==='truss'||b.vk==='shutter')&&r()<0.55){const rad=Math.min(b.w,b.h)*0.28;list.push({k:'fan',x:b.x+b.w/2,y:b.y+b.h*(b.vk==='shutter'?0.72:0.5),r:Math.min(rad,2.2),spd:0.35+r()*0.4,ph:r()*TAU});}
      if(zk==='seal'&&(b.vk==='port'||b.vk==='hatch')&&r()<0.6){const rad=Math.min(b.w,b.h)*0.2;list.push({k:'gears',x:b.x+b.w/2,y:b.y+b.h/2,r:Math.min(rad,1.4),spd:0.18+r()*0.15,ph:r()*TAU});}}
    /* занавески в окнах Сот: полотнища у краёв проёма колышутся от сквозняка */
    if(zk==='hives'&&!/chapel|offices/.test(R.sub||'')&&!/boss/.test(R.id))for(const b of (R._bays||[])){if(!(b.vk==='window'||b.vk==='seg'||b.vk==='pair')||r()<0.55)continue;list.push({k:'curtain',x:b.x,y:b.y+Math.min(b.w*0.5,2),w:b.w,h:Math.min(b.h*0.7,5),ph:r()*TAU,col:['#4a1e1e','#3e3420','#2a3440','#3e2834'][(r()*4)|0]});}
    /* паровые вентили на трубах Отстойника: раз в несколько секунд — короткий выдох пара */
    if(zk==='sump')for(let i=0;i<Math.max(1,R.w/16);i++){const x=2+r()*(R.w-4),y=2+r()*(R.h-4);if(solidAt(x,y)||doorNear(x,y))continue;list.push({k:'valve',x,y,per:5+r()*5,ph:r()*10,dir:r()<0.5?-1:1});}
    /* индикаторы на щитах: медленный «пульс» дежурной лампы */
    if(zk==='sump'||zk==='seal')for(let i=0;i<Math.max(2,R.w/10);i++){const x=1+r()*(R.w-2),y=1.5+r()*(R.h-3);if(solidAt(x,y)||doorNear(x,y))continue;
      list.push({k:'led',x,y,col:zk==='seal'?['#7fd6e0','#9fe08a','#7fd6e0'][i%3]:['#ff8a4a','#9fe08a','#ffcf6a'][i%3],per:2.4+r()*3,ph:r()*TAU});}
    /* свечи на кромках в Архиве: огонёк дрожит (ниже 0.25 м — кромка не врёт) */
    if(zk==='archive'){const E=buildEdges({solids:sol});for(const e of E.top){if(e[1]-e[0]<2||r()<0.45)continue;const x=e[0]+0.6+r()*(e[1]-e[0]-1.2);if(doorNear(x,e[2]-1))continue;
      list.push({k:'candle',x,y:e[2],h:0.1+r()*0.08,ph:r()*TAU,a:0,v:0});}}
    R._amb={src:R.solids,list,imp:0};return list;},
  /* толчок от сильного события: маятники получают удар по угловой скорости, свечи пригибаются */
  kick(R,list,g){const I=g.renderer.impulses;if(!I||!I.length)return;
    for(const q of I){if(q.done&&q.done.has(R))continue;(q.done||(q.done=new Set())).add(R);
      for(const p of list){if(p.len===undefined&&p.k!=='candle')continue;const my=p.len?p.y+p.len*0.7:p.y-0.1,d=Math.hypot(p.x-q.x,my-q.y);if(d>q.r)continue;
        const f=(1-d/q.r)*q.k*Math.sign((p.x-q.x)||1);p.v+=f*(p.len?2.4/Math.sqrt(p.len):3);}}},
  draw(c,R,t,dt,g){const list=this.props(R);if(!list.length)return;this.kick(R,list,g);dt=Math.min(dt||0,0.05);
    c.save();c.lineCap='round';c.lineJoin='round';
    for(const p of list){
      if(p.len!==undefined||p.k==='candle'){/* маятник: сквозняк + затухание; после толчка успокаивается за пару секунд */
        const wind=Math.sin(t*0.5+p.ph)*0.018+Math.sin(t*1.3+p.ph*2)*0.008,L=p.len||0.4;
        p.v+=(-9.8/Math.max(L,0.3)*Math.sin(p.a-wind)-p.v*(p.k==='candle'?6:0.9))*dt;p.a=clamp(p.a+p.v*dt,-1.1,1.1);}
      this[p.k](c,p,t,g);}
    c.restore();},
  chain(c,p,t,g){const ex=p.x+Math.sin(p.a)*p.len,ey=p.y+Math.cos(p.a)*p.len,n=Math.max(3,Math.round(p.len/0.16));
    c.strokeStyle='#17140f';c.lineWidth=0.05;
    for(let i=0;i<n;i++){const u0=i/n,u1=(i+1)/n,x0=lerp(p.x,ex,u0),y0=lerp(p.y,ey,u0),x1=lerp(p.x,ex,u1),y1=lerp(p.y,ey,u1);
      c.save();c.translate((x0+x1)/2,(y0+y1)/2);c.rotate(-p.a);c.beginPath();c.ellipse(0,0,i%2?0.035:0.055,0.09,0,0,TAU);c.stroke();c.restore();}
    c.save();c.translate(ex,ey);c.rotate(-p.a);
    if(p.weight){c.fillStyle='#2a2e34';rr(c,-0.16,0,0.32,0.5,0.06);c.fill();c.fillStyle='rgba(210,225,255,.14)';c.fillRect(-0.12,0.04,0.05,0.42);c.fillStyle='#5a4a2a';c.fillRect(-0.16,0.12,0.32,0.05);}
    else{c.strokeStyle='#211c16';c.lineWidth=0.07;c.beginPath();c.moveTo(0,0);c.lineTo(0,0.16);c.arc(-0.1,0.16,0.1,0,PI*0.95);c.stroke();
      c.strokeStyle='rgba(255,214,170,.18)';c.lineWidth=0.02;c.beginPath();c.arc(-0.1,0.16,0.1,0.2,PI*0.6);c.stroke();}
    c.restore();},
  cord(c,p,t,g){const ex=p.x+Math.sin(p.a)*p.len,ey=p.y+Math.cos(p.a)*p.len;
    c.strokeStyle='#120c0a';c.lineWidth=0.025;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(ex,ey);c.stroke();
    c.save();c.translate(ex,ey);c.rotate(-p.a);c.fillStyle='#3a2420';c.beginPath();c.moveTo(-0.08,0);c.lineTo(0.08,0);c.lineTo(0.24,0.2);c.lineTo(-0.24,0.2);c.closePath();c.fill();
    c.fillStyle='rgba(255,200,140,.18)';c.fillRect(-0.22,0.17,0.44,0.03);c.restore();},
  vine(c,p,t,g){const n=6,pts=[];for(let i=0;i<=n;i++){const u=i/n,a=p.a*u*u+Math.sin(t*0.9+p.ph+u*3)*0.04*u;pts.push([p.x+Math.sin(a)*p.len*u,p.y+Math.cos(a)*p.len*u]);}
    c.strokeStyle=p.seed%3?'#2f5a2c':'#3e6a34';c.lineWidth=0.045;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(const q of pts)c.lineTo(q[0],q[1]);c.stroke();
    for(let i=1;i<=n;i++){const q=pts[i],s=(i%2?1:-1),a=p.a+s*0.9+Math.sin(t*1.4+p.ph+i)*0.15;c.fillStyle=['#3e7a3a','#5a8a3a','#2f6a40','#7a9a4a'][(p.seed+i)%4];
      c.beginPath();c.ellipse(q[0]+Math.sin(a)*0.07,q[1]+Math.cos(a)*0.03,0.1,0.045,a+PI/2,0,TAU);c.fill();}},
  lamp(c,p,t,g){const ex=p.x+Math.sin(p.a)*p.len,ey=p.y+Math.cos(p.a)*p.len;c.strokeStyle='#15120f';c.lineWidth=0.04;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(ex,ey);c.stroke();
    c.save();c.translate(ex,ey);c.rotate(-p.a);c.fillStyle='#2a2620';c.fillRect(-0.16,0,0.32,0.08);c.strokeStyle='#2a2620';c.lineWidth=0.03;for(const s of [-0.13,0,0.13]){c.beginPath();c.moveTo(s,0.08);c.lineTo(s*0.9,0.42);c.stroke();}
    c.fillStyle=rgba(p.col,0.95);c.beginPath();c.ellipse(0,0.26,0.1,0.13,0,0,TAU);c.fill();c.fillStyle='#2a2620';c.fillRect(-0.15,0.4,0.3,0.05);c.restore();
    g.renderer.glowAdd(ex,ey+0.26,3.2,p.col,0.55);},
  curtain(c,p,t,g){for(const s of [0,1]){const x0=s?p.x+p.w:p.x,dir=s?-1:1,w=p.w*0.15;c.fillStyle=p.col;c.beginPath();c.moveTo(x0,p.y);c.lineTo(x0+dir*w,p.y);
      for(let k=1;k<=6;k++){const u=k/6,wave=Math.sin(t*0.9+p.ph+u*3+s)*0.12*u;c.lineTo(x0+dir*(w*(1-u*0.25))+wave,p.y+p.h*u);}c.lineTo(x0,p.y+p.h);c.closePath();c.fill();
      c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=0.03;for(let k=1;k<3;k++){c.beginPath();c.moveTo(x0+dir*w*k/3,p.y);c.lineTo(x0+dir*w*k/3+Math.sin(t*0.9+p.ph+k)*0.08,p.y+p.h);c.stroke();}}
    c.fillStyle='#2a2018';c.fillRect(p.x-0.2,p.y-0.08,p.w+0.4,0.1);},
  valve(c,p,t,g){c.fillStyle='#2a2420';c.fillRect(p.x-0.3,p.y-0.08,0.6,0.16);Kit.valve(c,p.x,p.y-0.25,0.16,t*0.1,'#8a6d2a');
    const ph=(t+p.ph)%p.per;if(ph<1.1&&Math.random()<0.5)g.particles.spawn({kind:'steam',x:p.x+p.dir*0.32,y:p.y,vx:p.dir*(2+Math.random()),vy:-0.6-Math.random()*0.5,life:1.2,size:0.18,grow:0.6,drag:1.6,col:'#d8d0c0',a:0.45});},
  slip(c,p,t,g){const ex=p.x+Math.sin(p.a)*p.len,ey=p.y+Math.cos(p.a)*p.len;c.strokeStyle='rgba(120,100,70,.8)';c.lineWidth=0.015;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(ex,ey);c.stroke();
    c.save();c.translate(ex,ey);c.rotate(-p.a*1.4+Math.sin(t*1.7+p.ph)*0.08);c.fillStyle='#d8cdb2';c.fillRect(-0.09,0,0.18,0.26);c.fillStyle='rgba(40,30,20,.5)';for(let k=0;k<3;k++)c.fillRect(-0.06,0.05+k*0.06,0.12,0.015);c.restore();},
  fan(c,p,t,g){const a=p.ph+t*p.spd*TAU/Math.max(1,p.r*0.7);c.save();c.translate(p.x,p.y);
    c.strokeStyle='#15130f';c.lineWidth=0.18;c.beginPath();c.arc(0,0,p.r,0,TAU);c.stroke();
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.arc(0,0,p.r*0.96,0,TAU);c.fill();
    c.rotate(a);c.fillStyle='#1d1a16';for(let i=0;i<4;i++){c.rotate(PI/2);c.beginPath();c.moveTo(0,-0.08);c.quadraticCurveTo(p.r*0.5,-p.r*0.3,p.r*0.9,-p.r*0.12);c.lineTo(p.r*0.9,p.r*0.12);c.quadraticCurveTo(p.r*0.4,p.r*0.05,0,0.08);c.closePath();c.fill();}
    c.fillStyle='rgba(255,214,170,.1)';c.beginPath();c.moveTo(0,-0.08);c.quadraticCurveTo(p.r*0.5,-p.r*0.3,p.r*0.9,-p.r*0.12);c.lineTo(p.r*0.85,-p.r*0.06);c.quadraticCurveTo(p.r*0.45,-p.r*0.18,0,-0.02);c.closePath();c.fill();
    c.rotate(-a);c.fillStyle='#2a2520';c.beginPath();c.arc(0,0,p.r*0.16,0,TAU);c.fill();c.strokeStyle='#15130f';c.lineWidth=0.06;c.beginPath();c.moveTo(-p.r,0);c.lineTo(p.r,0);c.stroke();c.restore();},
  gears(c,p,t,g){const a=p.ph+t*p.spd;
    Kit.gear(c,p.x-p.r*0.55,p.y,p.r,16,a,'#2a2f36');Kit.gear(c,p.x+p.r*0.62,p.y-p.r*0.62,p.r*0.6,10,-a*1.6+0.2,'#5a4a2a');
    c.fillStyle='#8a6d2a';c.beginPath();c.arc(p.x-p.r*0.55,p.y,p.r*0.14,0,TAU);c.fill();},
  led(c,p,t,g){const k=0.5+0.5*Math.sin(t*TAU/p.per+p.ph),on=k*k;c.fillStyle='#14120f';c.fillRect(p.x-0.09,p.y-0.07,0.18,0.14);
    c.fillStyle=rgba(p.col,0.25+0.75*on);c.beginPath();c.arc(p.x,p.y,0.045,0,TAU);c.fill();if(on>0.1)g.renderer.glowAdd(p.x,p.y,0.45,p.col,0.35*on);},
  candle(c,p,t,g){const x=p.x,y=p.y;c.fillStyle='#e8dcc0';c.fillRect(x-0.03,y-p.h,0.06,p.h);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(x+0.01,y-p.h,0.02,p.h);
    const fl=0.8+0.2*Math.sin(t*11+p.ph)*Math.sin(t*7.3+p.ph*2),lean=clamp(p.a*2,-0.6,0.6)+Math.sin(t*2.3+p.ph)*0.08,fy=y-p.h-0.02;
    c.save();c.translate(x,fy);c.rotate(lean);c.fillStyle=rgba('#ffcf7a',0.9);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(0.03,-0.04,0,-0.09*fl);c.quadraticCurveTo(-0.03,-0.04,0,0);c.fill();c.restore();
    g.renderer.glowAdd(x,fy-0.04,0.55,'#ffbe63',0.32*fl);}
};
