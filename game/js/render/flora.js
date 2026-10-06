"use strict";
/* ============================== ФЛОРА ЭДЕМА ==============================
   Раньше сад был «зелёными эллипсами одного тона». Теперь — виды со своими силуэтами:
     лилия      — медная лилия, символ Эдема: латунный стебель, стеклянный колокол, светящиеся пестики;
     папоротник — веер вай из множества листочков (холодная сине-зелёная);
     широколист — крупные рассечённые листья на черешках (тёмная изумрудная, светлые жилки);
     куст       — плотная масса трёх зелёных с цветами (розовые, белые, оранжевые);
     тростник   — высокие тонкие листья с тёплыми метёлками (тёплый акцент на холодном).
   Тон: глубокие холодные зелёные внизу и в тени, средние — масса, светлые и тёплые — только кромка к свету.
   Ставятся на верх широких полов (за плоскостью игры, не выше свободного места над ними) и рядами — на среднем плане. */
const FLORA={deep:['#173a2c','#1f4a36','#21503e'],mid:['#2f6a3e','#3f7a3a','#36704a'],light:['#7fae4e','#9cc45a','#8fbf5a'],warm:'#e8d890',blue:['#2a5f60','#2f6a64']};
const EdenFlora={
  pick(a,r){return a[(r()*a.length)|0];},
  lily(c,x,y,h,r,k){k=k||1;const bend=(r()-0.5)*0.6*h;c.strokeStyle='#5e4812';c.lineWidth=0.07*k;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+bend*0.3,y-h*0.6,x+bend,y-h);c.stroke();
    c.strokeStyle='rgba(255,226,160,.35)';c.lineWidth=0.025*k;c.beginPath();c.moveTo(x-0.02,y);c.quadraticCurveTo(x+bend*0.3-0.02,y-h*0.6,x+bend-0.02,y-h);c.stroke();
    for(const s of [-1,1]){c.fillStyle=this.pick(FLORA.deep,r);c.beginPath();c.ellipse(x+s*h*0.18,y-h*0.12,h*0.22,h*0.06,s*0.4,0,TAU);c.fill();}
    c.save();c.translate(x+bend,y-h);c.rotate(bend*0.3);const w=h*0.2;
    c.fillStyle='rgba(190,235,220,.88)';c.beginPath();c.moveTo(-w*0.2,0);c.quadraticCurveTo(-w,-w*0.5,-w*1.1,-w*1.4);c.quadraticCurveTo(-w*0.4,-w*1.1,0,-w*1.6);c.quadraticCurveTo(w*0.4,-w*1.1,w*1.1,-w*1.4);c.quadraticCurveTo(w,-w*0.5,w*0.2,0);c.closePath();c.fill();
    c.strokeStyle='#8a6d2a';c.lineWidth=0.03*k;c.stroke();c.fillStyle='rgba(255,255,250,.5)';c.beginPath();c.ellipse(-w*0.45,-w*0.8,w*0.12,w*0.4,0.3,0,TAU);c.fill();
    c.fillStyle='#e8fff8';for(let i=0;i<3;i++){c.beginPath();c.arc((i-1)*w*0.35,-w*1.05-(i===1?w*0.2:0),w*0.09,0,TAU);c.fill();}c.restore();},
  fern(c,x,y,h,r){const n=7+((r()*4)|0),col=this.pick(FLORA.blue.concat(FLORA.deep),r);
    for(let i=0;i<n;i++){const a=-PI/2+(i/(n-1)-0.5)*2.2+(r()-0.5)*0.2,L=h*(0.7+r()*0.35),ex=x+Math.cos(a)*L,ey=y+Math.sin(a)*L*0.9,mx=x+Math.cos(a)*L*0.5,my=y+Math.sin(a)*L*0.55-L*0.12;
      c.strokeStyle=col;c.lineWidth=0.03;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(mx,my,ex,ey);c.stroke();
      for(let k=2;k<10;k++){const u=k/10,px=(1-u)*(1-u)*x+2*(1-u)*u*mx+u*u*ex,py=(1-u)*(1-u)*y+2*(1-u)*u*my+u*u*ey,ls=0.13*(1-u*0.6)*h/1.4;
        c.fillStyle=k%3?col:this.pick(FLORA.mid,r);for(const s of [-1,1]){c.beginPath();c.ellipse(px+s*ls*0.5*Math.sin(a),py-s*ls*0.5*Math.cos(a),ls*0.6,ls*0.2,a+s*0.9,0,TAU);c.fill();}}}},
  broadleaf(c,x,y,h,r){const n=3+((r()*3)|0);for(let i=0;i<n;i++){const a=-PI/2+(i/(n-1||1)-0.5)*1.6+(r()-0.5)*0.3,L=h*(0.55+r()*0.4),ex=x+Math.cos(a)*L,ey=y+Math.sin(a)*L;
      c.strokeStyle='#2a4a24';c.lineWidth=0.035;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*L*0.4,y-L*0.6,ex,ey);c.stroke();
      const s=h*(0.28+r()*0.12),la=a+PI/2*0.2;c.save();c.translate(ex,ey);c.rotate(la);c.fillStyle=this.pick(FLORA.deep,r);
      c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-s*0.9,-s*0.3,-s*0.8,-s*1.4,0,-s*1.6);c.bezierCurveTo(s*0.8,-s*1.4,s*0.9,-s*0.3,0,0);c.fill();
      c.strokeStyle='rgba(150,200,120,.4)';c.lineWidth=0.02;c.beginPath();c.moveTo(0,0);c.lineTo(0,-s*1.5);c.stroke();
      c.strokeStyle=FLORA.deep[0];c.lineWidth=0.05;for(let k=1;k<4;k++){const yy=-s*0.35*k;for(const sd of [-1,1]){c.beginPath();c.moveTo(sd*s*0.75,yy-s*0.1);c.lineTo(sd*s*0.3,yy);c.stroke();}}
      c.fillStyle='rgba(180,220,120,.18)';c.beginPath();c.ellipse(-s*0.25,-s*1.0,s*0.2,s*0.45,0.2,0,TAU);c.fill();c.restore();}},
  bush(c,x,y,w,r){const h=w*0.55;for(const [cols,k,dy] of [[FLORA.deep,1,0],[FLORA.mid,0.75,-0.12],[FLORA.light,0.4,-0.3]]){for(let i=0;i<Math.round(w*14*k);i++){const a=PI+r()*PI,d=Math.sqrt(r());
      c.fillStyle=this.pick(cols,r);c.beginPath();c.ellipse(x+Math.cos(a)*d*w*0.5*k+(dy?w*0.06:0),y+Math.sin(a)*d*h*k+dy*h,0.11+r()*0.08,0.06+r()*0.04,r()*3,0,TAU);c.fill();}}
    const fc=['#e8a0b0','#f2ecd8','#e8a050','#d870a0'][(r()*4)|0];for(let i=0;i<w*4;i++){const a=PI+r()*PI,d=0.4+r()*0.6;const fx=x+Math.cos(a)*d*w*0.48,fy=y+Math.sin(a)*d*h*0.95;c.fillStyle=fc;
      for(let k=0;k<5;k++){const q=k/5*TAU;c.beginPath();c.arc(fx+Math.cos(q)*0.035,fy+Math.sin(q)*0.035,0.028,0,TAU);c.fill();}c.fillStyle=FLORA.warm;c.beginPath();c.arc(fx,fy,0.02,0,TAU);c.fill();}},
  reeds(c,x,y,h,r){for(let i=0;i<9;i++){const bx=x+(r()-0.5)*0.8,lean=(r()-0.5)*0.6,L=h*(0.6+r()*0.4);c.strokeStyle=this.pick(FLORA.mid.concat(FLORA.light),r);c.lineWidth=0.03;
      c.beginPath();c.moveTo(bx,y);c.quadraticCurveTo(bx+lean*0.3,y-L*0.6,bx+lean,y-L);c.stroke();
      if(r()<0.5){c.fillStyle=FLORA.warm;c.beginPath();c.ellipse(bx+lean,y-L-0.12,0.04,0.14,lean*0.5,0,TAU);c.fill();}}},
  /* ряд флоры на ширину слоя (средний план): холоднее и темнее, без мелочи */
  row(c,L,y,r,k){for(let x=-1;x<L.w+1;x+=1.6+r()*2.4){const t=r(),h=(1.2+r()*1.8)*k;
    if(t<0.25)this.fern(c,x,y,h,r);else if(t<0.45)this.broadleaf(c,x,y,h*0.9,r);else if(t<0.7)this.bush(c,x,y,h*1.2,r);else if(t<0.85)this.reeds(c,x,y,h,r);else this.lily(c,x,y,h*1.3,r,k);}},
  /* заросли на стене: по простенкам между проёмами снизу ползут плющ и вьюны (тёмная масса, светлая кромка, цветы),
     с ригелей и свода свисают занавеси плетей — однородная сетка стекла разбивается органическими силуэтами */
  overgrow(c,R,r){r=rng(R.id+'overgrow');const B=(R._bays||[]).slice().sort((a,b)=>a.x-b.x),floorY=R.h-1.2;
    const mass=(x,y0,y1,w)=>{for(let y=y0;y>y1;y-=0.35){const k=(y0-y)/(y0-y1),ww=w*(1-k*0.55)*(0.8+r()*0.4);
        for(let i=0;i<4;i++){c.fillStyle=this.pick(k<0.5?FLORA.deep:FLORA.mid,r);c.beginPath();c.ellipse(x+(r()-0.5)*ww,y+(r()-0.5)*0.3,0.16+r()*0.12,0.09+r()*0.05,r()*3,0,TAU);c.fill();}
        if(r()<0.35){c.fillStyle=this.pick(FLORA.light,r);c.beginPath();c.ellipse(x+ww*0.45,y,0.1,0.05,r(),0,TAU);c.fill();}
        if(r()<0.08){c.fillStyle=['#e8a0b0','#f2ecd8','#e8a050'][(r()*3)|0];c.beginPath();c.arc(x+(r()-0.5)*ww,y,0.05,0,TAU);c.fill();}}
      c.strokeStyle='#22401f';c.lineWidth=0.05;c.beginPath();c.moveTo(x,y0);for(let y=y0;y>y1;y-=0.6)c.lineTo(x+Math.sin(y*1.3)*w*0.3,y);c.stroke();};
    for(let i=0;i<B.length-1;i++){if(r()<0.3)continue;const a=B[i],b=B[i+1];const x=(a.x+a.w+b.x)/2;mass(x,Math.min(floorY,a.y+a.h+0.5),a.y-0.5+r()*a.h*0.5,1.2+r()*0.8);}
    for(let x=2+r()*5;x<R.w-2;x+=5+r()*7){const top=0.6+r()*0.6,len=2+r()*4;for(let k=0;k<6;k++){const vx=x+(r()-0.5)*1.6,L2=len*(0.5+r()*0.6);
      c.strokeStyle='#244a22';c.lineWidth=0.035;c.beginPath();c.moveTo(vx,top);c.quadraticCurveTo(vx+(r()-0.5)*0.6,top+L2*0.5,vx+(r()-0.5)*0.4,top+L2);c.stroke();
      for(let y=top+0.3;y<top+L2;y+=0.28){c.fillStyle=this.pick(FLORA.mid.concat(FLORA.deep),r);c.beginPath();c.ellipse(vx+(r()-0.5)*0.2,y,0.09,0.045,r()*3,0,TAU);c.fill();}}}},
  /* посадки на широких полах игрового слоя: только там, где над полом свободно, и не у дверей */
  dress(c,R,r){r=rng(R.id+'flora');const sol=R.solids.filter(s=>!s.hidden&&!s.dyn);const E=buildEdges({solids:sol});
    const free=(x0,x1,y0,y1)=>!sol.some(s=>s.x<x1&&s.x+s.w>x0&&s.y<y1&&s.y+s.h>y0);
    const door=(x,y)=>(R.doors||[]).some(d=>x>d.x-1.6&&x<d.x+d.w+1.6&&y>d.y-1&&y<d.y+d.h+1.5);
    for(const [x0,x1,y] of E.top){if(x1-x0<3)continue;for(let x=x0+0.8+r()*2;x<x1-0.8;x+=2.4+r()*4.2){if(door(x,y))continue;const t=r();let h=0.9+r()*1.4;
      while(h>0.5&&!free(x-h*0.5,x+h*0.5,y-h-0.2,y-0.05))h-=0.3;if(h<=0.5)continue;
      c.save();if(t<0.22)this.lily(c,x,y,h*1.1,r);else if(t<0.42)this.fern(c,x,y,h,r);else if(t<0.62)this.broadleaf(c,x,y,h,r);else if(t<0.85)this.bush(c,x,y,Math.min(1.8,h*1.3),r);else this.reeds(c,x,y,h,r);c.restore();}}}
};
