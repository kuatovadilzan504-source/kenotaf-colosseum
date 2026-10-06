"use strict";
/* ============================== КУРЬЕР: СКЕЛЕТ, ПОЗЫ, РИСУНОК ==============================
   Скелет: таз → корпус (крен вокруг таза) → плечи и голова; ноги и руки — двухзвенный IK к целям.
   Поза задаётся целями (ступни, кисти), креном и углом ключа. Переходы между позами сглаживаются;
   замах и удар ставятся напрямую — отклик в том же кадре, без задержки.
   Принципы: предвосхищение (ключ уходит назад-вверх до удара), смазанный кадр (дуга удара —
   в drawSlash), доводка (ключ проходит дальше точки удара), отдача (корпус откатывается),
   вес (тяжёлый ключ волочится на бегу и тянет руку вниз), вторичное движение (полы куртки, шарф).
   Ранец — манометр: шкала давления = энергия, пар на рывке/импульсе/заряде. */
const HERO={thigh:0.42,shin:0.41,uarm:0.3,farm:0.29,torso:0.56};
/* конечность — сужающаяся форма от сустава к суставу (бедро толще голени, плечо толще предплечья) */
/* цельная конечность: бедро-колено-лодыжка (плечо-локоть-кисть) — одна форма с изгибом, а не два сегмента на шарнире.
   Контур идёт плавной кривой через сустав; с внешней стороны сгиба — чуть шире (ткань собирается) */
function heroLimb2(c,a,k,b,w0,wk,w1,col){const n=(x0,y0,x1,y1)=>{const L=Math.hypot(x1-x0,y1-y0)||1;return [-(y1-y0)/L,(x1-x0)/L];};
  const n1=n(a.x,a.y,k.x,k.y),n2=n(k.x,k.y,b.x,b.y),nb0=n1[0]+n2[0],nb1=n1[1]+n2[1],nl=Math.hypot(nb0,nb1)||1,nb=[nb0/nl,nb1/nl];c.fillStyle=col;
  c.beginPath();c.moveTo(a.x+n1[0]*w0/2,a.y+n1[1]*w0/2);c.quadraticCurveTo(k.x+nb[0]*wk*0.95,k.y+nb[1]*wk*0.95,b.x+n2[0]*w1/2,b.y+n2[1]*w1/2);
  c.lineTo(b.x-n2[0]*w1/2,b.y-n2[1]*w1/2);c.quadraticCurveTo(k.x-nb[0]*wk*0.95,k.y-nb[1]*wk*0.95,a.x-n1[0]*w0/2,a.y-n1[1]*w0/2);c.closePath();c.fill();
  c.beginPath();c.arc(a.x,a.y,w0*0.5,0,TAU);c.arc(b.x,b.y,w1*0.5,0,TAU);c.fill();}
function heroLimb(c,x0,y0,x1,y1,w0,w1,col){const a=Math.atan2(y1-y0,x1-x0),nx=-Math.sin(a)*0.5,ny=Math.cos(a)*0.5;c.fillStyle=col;
  c.beginPath();c.moveTo(x0+nx*w0,y0+ny*w0);c.lineTo(x1+nx*w1,y1+ny*w1);c.lineTo(x1-nx*w1,y1-ny*w1);c.lineTo(x0-nx*w0,y0-ny*w0);c.closePath();c.fill();
  c.beginPath();c.arc(x0,y0,w0*0.5,0,TAU);c.arc(x1,y1,w1*0.5,0,TAU);c.fill();}
/* кинопозы курьера: голова вверх (отрицательный наклон), колено, ладони перед собой */
const HERO_CINE={
  /* смотрит вверх, капсула у груди */
  lookUp(T,t){T.head=-0.62;T.lean=-0.1;T.hf=[0.2,-1.08];T.hb=[0.12,-1.1];T.wa=1.5;},
  /* слепит: дальняя рука козырьком к фонарю */
  shield(T,t){T.head=-0.32;T.lean=-0.06;T.hb=[0.24,-1.55];T.hf=[0.2,-1.0];T.wa=1.45;T.backFront=true;},
  /* на колено */
  kneel(T,t){T.hy=-0.52;T.lean=0.22;T.ft=[[-0.42,-0.02],[0.26,0]];T.hf=[0.3,-0.9];T.hb=[0.18,-0.86];T.wa=1.2;T.head=0.15;},
  /* на колене: ладонь на землю */
  touch(T,t){T.hy=-0.52;T.lean=0.42;T.ft=[[-0.42,-0.02],[0.26,0]];T.hb=[0.62,-0.06];T.hf=[0.24,-0.86];T.wa=1.2;T.head=0.3;T.backFront=true;},
  /* на колене: ладони перед собой, капсула открыта */
  offer(T,t){T.hy=-0.52;T.lean=0.08;T.ft=[[-0.42,-0.02],[0.26,0]];T.hb=[0.46,-0.98];T.hf=[0.42,-0.92];T.wa=1.4;T.head=-0.18;T.backFront=true;},
  /* на колене: провожает взглядом */
  watch(T,t){T.hy=-0.52;T.lean=-0.04;T.ft=[[-0.42,-0.02],[0.26,0]];T.hb=[0.2,-0.92];T.hf=[0.3,-0.9];T.wa=1.3;T.head=-0.55;},
  /* мёртвый (Курьер 38): сидит, привалившись спиной к станине; ноги вытянуты, голова упала на грудь, руки на коленях */
  slump(T,t){T.hx=-0.1;T.hy=-0.26;T.lean=-0.26;T.ft=[[0.46,-0.03],[0.62,0]];T.hf=[0.36,-0.34];T.hb=[0.02,-0.12];T.wa=0.6;T.head=0.62;T.coat=0.2;}
};
const HeroArt={
  /* ---------- цель позы по состоянию ---------- */
  target(p,t){
    const C=CFG.player,st=p.state,sp=Math.abs(p.vx),ph=p.runPh||0,air=!p.onGround&&!p.onCeil;
    const br=Math.sin(t*2.4)*0.012;
    const T={hx:0,hy:-0.8+br,lean:0.04,head:0,coat:0,ft:[[-0.11,0],[0.13,0]],hf:[0.3,-0.9],hb:[-0.06,-0.93],wa:1.15,
      direct:false,feetDirect:false,backFront:false};
    /* стоя долго — ключ на плечо */
    if(st==='idle'&&(p.idleT||0)>3.5){T.hf=[0.13,-1.3];T.wa=-2.45;T.hb=[-0.04,-0.95];}
    if(p.onGround&&sp>0.6&&!p.crouch&&p.dashT<=0){
      const k=clamp(sp/C.maxRun,0,1),s=0.2+0.22*k;
      for(let i=0;i<2;i++){const a=ph+(i?0:PI),stance=Math.sin(a)>0;
        T.ft[i]=[Math.cos(a)*s+0.03,stance?0:Math.sin(a)*(0.08+0.17*k)];}
      T.feetDirect=true;
      T.hy=-0.79-0.05*Math.cos(2*ph)*k;T.lean=0.08+0.2*k;
      /* на бегу ключ — на плече: силуэт чистый, замах из этой позы мгновенный */
      T.hf=[lerp(0.24,0.14,k),lerp(-0.98,-1.3,k)+Math.abs(Math.sin(ph))*0.025*k];T.wa=lerp(1.15,-2.45,clamp(k*1.6,0,1));
      T.hb=[-0.04-Math.cos(ph)*0.24*k,-0.96+Math.abs(Math.cos(ph))*0.04];T.coat=-0.3*k;
    }
    if(air&&p.dashT<=0){
      const k=clamp(Math.abs(p.vy)/18,0,1);
      /* прыжок — поджатые ноги и вытянутый вверх корпус; падение — руки вверх, полы шинели раскрываются парашютом */
      if(p.vy<0){T.ft=[[-0.2,-0.12],[0.2,-0.4]];T.lean=0.12;T.hf=[0.32,-1.18];T.wa=0.1;T.hb=[-0.24,-1.06];T.coat=-0.25;}
      else{T.ft=[[-0.14,-0.02],[0.2,-0.18]];T.lean=-0.06;T.hf=[0.34,-1.36];T.wa=-0.7;T.hb=[-0.36,-1.34];T.coat=0.6*k;}
      T.hy=-0.8;
    }
    if(p.crouch){
      if(p.slideT>0){T.hy=-0.36;T.lean=-0.5;T.ft=[[0.02,-0.02],[0.62,-0.07]];T.hf=[-0.16,-0.66];T.wa=-2.75;T.hb=[0.06,-0.32];T.coat=-0.45;T.head=0.25;}
      else{T.hy=-0.42;T.lean=0.5;T.ft=[[-0.22,0],[0.24,0]];T.hf=[0.42,-0.42];T.wa=1.4;T.hb=[0.18,-0.5];T.head=-0.3;}
    }
    /* рывок — снаряд: корпус почти лёг, ноги вытянуты назад, ключ прижат, шинель хлещет назад */
    if(p.dashT>0){T.hy=-0.72;T.lean=0.62;T.ft=[[-0.7,-0.3],[0.05,-0.42]];T.hf=[-0.16,-0.9];T.wa=2.9;T.hb=[-0.42,-0.92];T.coat=-0.95;T.head=-0.42;}
    if(p.gripDir!==0&&air&&p.dashT<=0){
      if(p.gripDir===p.face){T.lean=0.1;T.hb=[0.3,-1.52];T.hf=[0.2,-1.08];T.wa=-1.25;T.ft=[[0.2,-0.2],[0.3,-0.52]];}
      else{T.lean=-0.12;T.hb=[-0.34,-1.46];T.ft=[[-0.3,-0.22],[-0.2,-0.5]];T.hf=[0.28,-1.0];T.wa=0.6;}
    }
    if(p.healT>0||p.restT>0){T.hy=-0.5;T.lean=0.16;T.ft=[[-0.46,-0.02],[0.22,0]];T.hf=[0.22,-0.95];T.wa=0.3;T.hb=[0.16,-0.9];T.head=0.1;}
    /* тяжёлый удар: набор давления — ключ уходит за спину, корпус сжимается; полный заряд — дрожь */
    const sd=p.slashT>0,A=p.atkPhase;
    if(p.chargeT>0.12&&!sd&&A!=='wind'){
      const k=clamp((p.chargeT-0.12)/(C.heavyHold-0.12),0,1),sh=p.charged?Math.sin(t*70)*0.018:0;
      T.hf=[lerp(0.2,-0.2,k),lerp(-1.0,-1.36,k)+sh];T.wa=lerp(0.9,-2.9,EZ.out(k));T.lean=lerp(0.04,-0.17,k);
      T.hy=lerp(-0.8,-0.7,k);T.ft=[[-0.26,0],[0.26,0]];T.feetDirect=false;
    }
    /* удар ключом: замах → удар (смаз) → доводка */
    if(A==='wind'){
      const heavy=p.atkHeavy,dir=p.atkDir,k=clamp(1-p.atkPT/(heavy?C.heavyWind:C.atkWind),0,1),e=EZ.out(k);T.direct=true;
      /* замах — пружина: корпус откинут, присед, ключ за спиной (у тяжёлого — ещё глубже) */
      if(dir==='side'){T.hf=[lerp(0.18,-0.18,e),lerp(-1.05,-1.5,e)];T.wa=lerp(0.4,heavy?-2.95:-2.4,e);T.lean=lerp(0.04,heavy?-0.3:-0.2,e);T.hy-=(heavy?0.12:0.07)*e;T.ft=[[-0.3,0],[0.22,0]];T.coat=0.2*e;}
      else if(dir==='up'){T.hf=[0.16,-0.8];T.wa=2.45;T.lean=0.14;T.hy-=0.06*e;}
      else{T.hf=[0.1,-1.46];T.wa=-1.95;T.lean=-0.06;T.ft=[[-0.1,-0.26],[0.16,-0.36]];}
    }else if(sd){
      const heavy=p.slashHeavy,dir=p.slashDir,T0=C.slashT*(heavy?1.5:1),u=clamp(1-p.slashT/T0,0,1),e=EZ.out(clamp(u*2.4,0,1));T.direct=true;
      const ft=clamp((u-0.42)/0.58,0,1);   /* доводка после удара */
      /* удар — выпад: вес на передней ноге, корпус вперёд, рука вытянута до конца; доводка уводит ключ ниже */
      if(dir==='side'){T.hf=[lerp(0.05,0.62,e),lerp(-1.44,-0.98,e)+ft*0.08];T.wa=lerp(heavy?-2.7:-2.2,heavy?0.9:0.6,e)+ft*0.4;
        T.lean=lerp(-0.14,heavy?0.46:0.3,e);T.hy+=(heavy?0.08:0.04)*e;T.ft[1]=[T.ft[1][0]+(heavy?0.46:0.24),T.ft[1][1]];T.ft[0]=[T.ft[0][0]-(heavy?0.2:0.12),T.ft[0][1]];T.coat=-0.45*e;}
      else if(dir==='up'){T.hf=[lerp(0.2,0.1,e),lerp(-0.84,-1.64,e)];T.wa=lerp(2.45,-1.85,e)-ft*0.25;T.lean=lerp(0.12,-0.1,e);}
      else{T.hf=[lerp(0.12,0.24,e),lerp(-1.44,-0.6,e)];T.wa=lerp(-1.95,1.75,e)+ft*0.15;T.lean=lerp(-0.06,0.26,e);T.ft=[[-0.1,-0.3],[0.16,-0.42]];}
    }
    /* импульс: дальняя рука с резаком выбрасывается вперёд, корпус отдаёт назад */
    if(p.pulseT>0){const k=clamp(p.pulseT/0.28,0,1);T.hb=[0.56,-1.18];T.lean-=0.12*k;T.hf=[T.hf[0]-0.12,T.hf[1]];T.backFront=true;}
    /* урон: отлёт — корпус откинут, руки врозь, голова назад */
    if(p.hurtT>0||p.dead){const k=p.dead?1:clamp(p.hurtT/0.34,0,1);
      T.lean=lerp(T.lean,-0.62,k);T.head=-0.45*k;T.hf=[0.46,-1.46];T.hb=[-0.5,-1.36];T.wa=-0.9;T.ft=[[-0.34,-0.16],[0.3,-0.06]];T.hy=-0.74;T.coat=0.5*k;T.direct=k>0.8;
      if(p.dead&&p.deadT>0.25){T.lean=-1.35;T.hy=-0.24;T.ft=[[-0.5,-0.02],[0.52,-0.02]];T.hf=[-0.6,-0.4];T.hb=[-0.9,-0.12];T.head=0.2;}}
    /* позы финальной сцены (js/world/finale.js): сцена ставит p.cinePose — поза плавно перетекает */
    if(p.cinePose&&HERO_CINE[p.cinePose])HERO_CINE[p.cinePose](T,t);
    return T;
  },
  /* ---------- сглаживание к цели ---------- */
  pose(p,t){
    /* время курьера, не рендера: в стоп-кадре (hitstop) поза замирает вместе с миром */
    const tt=p.t,T=this.target(p,tt),dt=clamp(tt-(p._pt===undefined?tt:p._pt),0,0.05);p._pt=tt;
    let P=p._pose;
    if(!P){P=p._pose={hx:T.hx,hy:T.hy,lean:T.lean,head:T.head,coat:T.coat,wa:T.wa,ft:T.ft.map(f=>f.slice()),hf:T.hf.slice(),hb:T.hb.slice(),backFront:false};}
    /* в финальной сцене позы перетекают медленно — курьер двигается, а не перескакивает */
    if(p._lastCine!==p.cinePose){p._lastCine=p.cinePose;p._cineBlend=1.4;}if(p._cineBlend>0)p._cineBlend-=dt;
    const cs=p.cineSlow&&!T.direct&&(!!p.cinePose||p._cineBlend>0),r=T.direct?1:1-Math.exp(-(cs?3.2:16)*dt),rf=T.feetDirect&&!(cs&&p.cinePose)?1:T.direct?1:1-Math.exp(-(cs?3.6:26)*dt),rb=1-Math.exp(-(cs?3.2:20)*dt);
    const L=(a,b,k)=>a+(b-a)*k;
    P.hx=L(P.hx,T.hx,r);P.hy=L(P.hy,T.hy,r);P.lean=L(P.lean,T.lean,r);P.head=L(P.head,T.head,rb);P.coat=L(P.coat,T.coat,1-Math.exp(-7*dt));
    for(let i=0;i<2;i++){P.ft[i][0]=L(P.ft[i][0],T.ft[i][0],rf);P.ft[i][1]=L(P.ft[i][1],T.ft[i][1],rf);}
    P.hf[0]=L(P.hf[0],T.hf[0],r);P.hf[1]=L(P.hf[1],T.hf[1],r);
    const bf=T.backFront&&!cs;P.hb[0]=L(P.hb[0],T.hb[0],bf?1:rb);P.hb[1]=L(P.hb[1],T.hb[1],bf?1:rb);
    P.wa=T.direct?T.wa:P.wa+angDiff(P.wa,T.wa)*r;P.backFront=T.backFront;
    /* сумка у бедра — пружина: на бегу относит назад, в прыжке подбрасывает, на остановке — качается и успокаивается */
    {const fwd=(p.vx||0)*(p.face||1),bT=clamp(fwd*0.045,-0.5,0.6)+(p.onGround?0:clamp(-(p.vy||0)*0.025,-0.4,0.4));
      P.bagV=(P.bagV||0)+((bT-(P.bag||0))*70-(P.bagV||0)*6)*dt;P.bag=clamp((P.bag||0)+P.bagV*dt,-1.1,1.1);}
    /* суставы */
    const ck=clamp((CFG.player.h-p.h)/(CFG.player.h-CFG.player.crouchH),0,1),tl=HERO.torso*(1-0.25*ck);
    const R=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
    const hip={x:P.hx,y:P.hy},lean=P.lean,ad=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
    const chest=ad(hip,R(0,-tl,lean));
    const J=P.j={tl,hip,chest,
      shF:ad(chest,R(0.05,0.06,lean)),shB:ad(chest,R(-0.08,0.05,lean)),
      neck:ad(chest,R(0.02,-0.03,lean))};
    J.headA=lean*0.45+P.head;J.head=ad(J.neck,R(0.03,-0.17,J.headA));
    J.hipF={x:hip.x+0.05,y:hip.y};J.hipB={x:hip.x-0.05,y:hip.y};
    J.legF=ik2(J.hipF.x,J.hipF.y,P.ft[1][0],P.ft[1][1],HERO.thigh,HERO.shin,-1);
    J.legB=ik2(J.hipB.x,J.hipB.y,P.ft[0][0],P.ft[0][1],HERO.thigh,HERO.shin,-1);
    J.armF=ik2(J.shF.x,J.shF.y,P.hf[0],P.hf[1],HERO.uarm,HERO.farm,1);
    J.armB=ik2(J.shB.x,J.shB.y,P.hb[0],P.hb[1],HERO.uarm,HERO.farm,1);
    /* голова ключа и сопло ранца — для эффектов в мировых координатах */
    J.wHead={x:J.armF.fx+Math.cos(P.wa)*0.62,y:J.armF.fy+Math.sin(P.wa)*0.62};
    J.nozzle=ad(hip,R(-0.44,-tl*0.12,lean));
    J.gaunt={x:J.armB.fx,y:J.armB.fy,a:Math.atan2(J.armB.fy-J.armB.ky,J.armB.fx-J.armB.kx)};
    return P;
  },
  /* локальная точка → мир (с учётом взгляда и потолка) */
  toWorld(p,q){return p.onCeil?{x:p.cx+p.face*q.x,y:p.y-q.y}:{x:p.cx+p.face*q.x,y:p.bottom+q.y};},
  /* ---------- рисунок ---------- */
  draw(c,p,t){
    const P=this.pose(p,t),J=P.j,gs=p.world.game.gs;
    c.lineCap='round';c.lineJoin='round';
    if(!P.backFront)this.armB(c,J,p,gs,t,false);
    this.leg(c,J.hipB,J.legB,true,gs);
    c.save();c.translate(J.hip.x,J.hip.y);c.rotate(P.lean);
    this.pack(c,J.tl,p,gs,t);
    this.torso(c,J.tl,P,p,gs,t);
    c.restore();
    this.leg(c,J.hipF,J.legF,false,gs);
    c.save();c.translate(J.hip.x,J.hip.y);c.rotate(P.lean);this.coatFront(c,J.tl,P);c.restore();
    this.satchel(c,J,P);
    this.head(c,J,p,gs,t);
    if(P.backFront)this.armB(c,J,p,gs,t,true);
    this.armF(c,J,P,p,gs,t);
    /* пелерина поверх плеча с ключом: рука выходит из-под накидки */
    c.save();c.translate(J.hip.x,J.hip.y);c.rotate(P.lean);this.capeFront(c,J.tl,P);c.restore();
    /* мировые точки для эффектов (следующий кадр) */
    p._neck=this.toWorld(p,J.neck);p._wHead=this.toWorld(p,J.wHead);p._nozzle=this.toWorld(p,J.nozzle);
    /* смаз ключа: путь головы и рукояти за последние кадры взмаха — лента рисуется в drawSlash */
    {const sw=p.atkPhase==='wind'||p.slashT>0;
      if(sw){const hand=this.toWorld(p,{x:J.armF.fx,y:J.armF.fy}),tr=p._smear||(p._smear=[]),last=tr[tr.length-1];
        if(!last||Math.hypot(last.hx-p._wHead.x,last.hy-p._wHead.y)>0.02)tr.push({hx:p._wHead.x,hy:p._wHead.y,gx:hand.x,gy:hand.y,t:p.t});
        while(tr.length>7)tr.shift();}
      else p._smear=null;}
    const g=this.toWorld(p,{x:J.gaunt.x,y:J.gaunt.y});p._gaunt={x:g.x,y:g.y,a:J.gaunt.a};
  },
  /* Рисунок (арт-проход 3). Силуэт должен читаться залитым чёрным: горб скатки над плечами, широкая пелерина
     почтальона, шлем с козырьком и фонарём, полы шинели до колен, сумка у бедра, ключ. Тон по иерархии:
     линза фонаря — самое светлое; брезентовая сумка — светлая середина; латунь — акценты; шинель — тёмная
     середина; брюки, сапоги, лицо в тени козырька — самое тёмное. */
  leg(c,h,L,far,gs){
    const tr=far?'#1a1815':'#2c2823',sh=far?'#141210':'#221f1b';
    /* бедро и голень — сужающиеся формы, не палки */
    heroLimb2(c,{x:h.x,y:h.y},{x:L.kx,y:L.ky},{x:L.fx,y:L.fy-0.1},0.22,0.16,0.12,tr);
    /* складки штанины под коленом: ткань, а не труба */
    {const ux=L.fx-L.kx,uy=L.fy-L.ky,ul=Math.hypot(ux,uy)||1;c.strokeStyle=far?'rgba(0,0,0,.35)':'rgba(0,0,0,.3)';c.lineWidth=0.018;
      for(const q of [0.12,0.2]){const px=L.kx+ux*q,py=L.ky+uy*q;c.beginPath();c.moveTo(px-uy/ul*0.06,py+ux/ul*0.06);c.quadraticCurveTo(px+ux/ul*0.03,py+uy/ul*0.03,px+uy/ul*0.05,py-ux/ul*0.05);c.stroke();}}
    if(!far){c.strokeStyle='rgba(255,226,180,.10)';c.lineWidth=0.035;c.beginPath();c.moveTo(h.x+0.07,h.y+0.02);c.lineTo(L.kx+0.05,L.ky);c.stroke();}
    /* обмотки голени */
    const sa=Math.atan2(L.fy-L.ky,L.fx-L.kx),ux=Math.cos(sa),uy=Math.sin(sa),nx=-uy,ny=ux;
    c.strokeStyle=far?'rgba(70,60,48,.6)':'rgba(128,110,84,.5)';c.lineWidth=0.022;
    for(const k of [0.4,0.54,0.68]){const px=lerp(L.kx,L.fx,k),py=lerp(L.ky,L.fy-0.1,k);
      c.beginPath();c.moveTo(px-nx*0.065-ux*0.022,py-ny*0.065-uy*0.022);c.lineTo(px+nx*0.065+ux*0.022,py+ny*0.065+uy*0.022);c.stroke();}
    /* кожаный наколенник */
    c.save();c.translate(L.kx,L.ky);c.rotate(sa-PI/2);c.fillStyle=far?'#2e261c':'#55442f';rr(c,-0.085,-0.07,0.17,0.15,0.05);c.fill();
    if(!far){c.fillStyle='rgba(255,226,180,.16)';c.fillRect(-0.06,-0.06,0.1,0.025);}c.restore();
    /* сапог: высокое голенище с отворотом, тяжёлая подошва, латунный носок */
    const ang=clamp(sa-PI/2,-0.5,0.6)*0.6;
    c.save();c.translate(L.fx,L.fy);c.rotate(ang);
    c.fillStyle=far?'#0e0d0c':'#1b1917';rr(c,-0.085,-0.3,0.18,0.25,0.04);c.fill();
    c.fillStyle=far?'#1c1915':'#302a23';rr(c,-0.095,-0.33,0.2,0.065,0.02);c.fill();
    c.fillStyle=far?'#0b0a09':'#151311';rr(c,-0.11,-0.15,0.31,0.15,0.05);c.fill();
    c.fillStyle='#060505';c.fillRect(-0.11,-0.035,0.31,0.035);
    c.fillStyle=far?'#4a3b20':'#9a7a40';rr(c,0.11,-0.125,0.09,0.11,0.035);c.fill();
    if(!far){c.fillStyle='rgba(255,236,190,.35)';c.fillRect(0.12,-0.118,0.05,0.02);c.fillStyle='rgba(255,226,180,.08)';c.fillRect(-0.07,-0.29,0.03,0.22);}
    if(gs.has('claws')){c.strokeStyle=far?'#8a6d2a':'#e8c96a';c.lineWidth=0.03;
      for(const o of [0,0.06]){c.beginPath();c.moveTo(0.14+o*0.3,-0.01);c.lineTo(0.22+o,0.03);c.stroke();}}
    c.restore();
  },
  /* ранец: брезентовый мешок на раме, сверху — скатка (горб над плечами); с клапаном — латунный баллон с манометром */
  pack(c,tl,p,gs,t){
    const y0=-tl+0.02,bob=Math.abs(Math.sin(p.runPh||0))*0.014*clamp(Math.abs(p.vx||0)/9,0,1);
    c.fillStyle='#1c1915';c.fillRect(-0.47,y0+0.02,0.035,tl*0.86);
    const bg=c.createLinearGradient(-0.5,0,-0.16,0);bg.addColorStop(0,'#28231d');bg.addColorStop(1,'#3d362d');
    c.fillStyle=bg;rr(c,-0.5,y0+0.06,0.34,tl*0.76,0.1);c.fill();
    c.fillStyle='#4a4237';rr(c,-0.47,y0+0.1,0.28,tl*0.3,0.07);c.fill();
    c.fillStyle='rgba(255,230,190,.10)';c.fillRect(-0.45,y0+0.11,0.22,0.03);
    /* заплата со строчкой: ранец чинили в пути */
    c.fillStyle='#51463a';c.fillRect(-0.45,y0+0.47,0.12,0.1);
    c.strokeStyle='rgba(20,16,12,.75)';c.lineWidth=0.012;c.setLineDash([0.02,0.018]);c.strokeRect(-0.45,y0+0.47,0.12,0.1);c.setLineDash([]);
    /* ремни клапана с пряжками */
    c.fillStyle='#211b15';c.fillRect(-0.42,y0+0.08,0.04,tl*0.44);c.fillRect(-0.27,y0+0.08,0.04,tl*0.44);
    c.fillStyle='#a8873a';c.fillRect(-0.425,y0+0.3,0.05,0.035);c.fillRect(-0.275,y0+0.3,0.05,0.035);
    /* скатка: войлок, два ремня, торец спиралью */
    const ry=y0-0.03-bob;
    c.fillStyle='#5e4f3a';c.beginPath();c.ellipse(-0.33,ry,0.215,0.088,0,0,TAU);c.fill();
    c.fillStyle='rgba(255,230,190,.15)';c.beginPath();c.ellipse(-0.35,ry-0.04,0.16,0.022,0,0,TAU);c.fill();
    c.fillStyle='#4a3e2d';c.beginPath();c.ellipse(-0.53,ry,0.035,0.08,0,0,TAU);c.fill();
    c.strokeStyle='#2e261b';c.lineWidth=0.012;c.beginPath();c.arc(-0.53,ry,0.035,0,TAU*0.8);c.stroke();
    c.fillStyle='#211b14';c.fillRect(-0.45,ry-0.09,0.035,0.18);c.fillRect(-0.23,ry-0.09,0.035,0.18);
    if(gs.has('dash')){
      const x=-0.64,w=0.2,y=y0+0.1,h=tl*0.6;
      /* баллон тише головы: блик приглушён, чтобы взгляд шёл к фонарю, а не к спине */
      const cg=c.createLinearGradient(x,0,x+w,0);cg.addColorStop(0,'#5a4512');cg.addColorStop(0.32,'#d2b26a');cg.addColorStop(0.5,'#b08d3e');cg.addColorStop(1,'#4e3c10');
      c.fillStyle=cg;rr(c,x,y,w,h,0.09);c.fill();c.strokeStyle='#2e2208';c.lineWidth=0.02;c.stroke();
      c.fillStyle='#7a6026';c.fillRect(x,y+h*0.2,w,0.03);c.fillRect(x,y+h*0.8,w,0.03);
      const e=clamp(p.energy/p.maxEnergy(),0,1),low=p.energy<CFG.player.pulseCost,gx=x+0.06,gy=y+h*0.3,gh=h*0.42;
      c.fillStyle='#0d0f10';rr(c,gx,gy,0.08,gh,0.03);c.fill();
      c.fillStyle=low?(Math.sin(t*14)>0?'#ff5a3a':'#7a2a1c'):(e>=0.999?'#dff4ff':'#7fd0ff');
      c.fillRect(gx+0.015,gy+gh*(1-e)+0.01,0.05,Math.max(0,gh*e-0.02));
      c.fillStyle='#c8452f';c.beginPath();c.arc(x+w*0.5,y-0.03,0.045,0,TAU);c.fill();
      c.fillStyle='#3a3630';rr(c,x-0.04,y+h-0.12,0.1,0.1,0.03);c.fill();
    }
    if(gs.has('filter')){c.fillStyle='#5c646b';rr(c,-0.2,y0+0.02,0.13,0.2,0.05);c.fill();
      c.fillStyle='#8a9299';c.fillRect(-0.185,y0+0.06,0.1,0.03);}
  },
  /* шинель: полы до колен (развеваются), корпус шире в плечах, пуговицы, ремни; пелерина почтальона — в capeFront */
  torso(c,tl,P,p,gs,t){
    const sw=P.coat,sa=Math.abs(sw);
    for(const [o,col] of [[0.07,'#1d1711'],[0,'#2a2117']]){
      c.fillStyle=col;c.beginPath();c.moveTo(-0.23,-0.08);c.lineTo(0.06-o,-0.06);
      c.quadraticCurveTo(0.02+sw*0.1-o,0.24,-0.04+sw*0.3-o*2,0.46-sa*0.16);
      c.lineTo(-0.2+sw*0.5-o*2,0.43-sa*0.2+o);
      c.quadraticCurveTo(-0.3+sw*0.22,0.2,-0.27,-0.04);c.closePath();c.fill();}
    /* грязь по подолу */
    c.strokeStyle='rgba(12,9,6,.6)';c.lineWidth=0.05;c.beginPath();c.moveTo(-0.04+sw*0.3,0.45-sa*0.16);c.lineTo(-0.2+sw*0.5,0.42-sa*0.2);c.stroke();
    const jg=c.createLinearGradient(-0.2,-tl,0.2,0);jg.addColorStop(0,'#5a4a37');jg.addColorStop(0.55,'#45382a');jg.addColorStop(1,'#2a2219');
    const body=()=>{c.beginPath();c.moveTo(-0.24,-tl+0.04);c.quadraticCurveTo(0,-tl-0.04,0.19,-tl+0.05);c.quadraticCurveTo(0.26,-tl*0.5,0.17,-0.04);
      c.lineTo(-0.23,-0.04);c.quadraticCurveTo(-0.29,-tl*0.55,-0.24,-tl+0.04);c.closePath();};
    c.fillStyle=jg;body();c.fill();
    c.save();body();c.clip();c.fillStyle=PAT(c,'ply');c.globalAlpha=0.12;c.fillRect(-0.3,-tl-0.1,0.6,tl+0.3);c.globalAlpha=1;
    /* застёжка: шов и латунные пуговицы */
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=0.022;c.beginPath();c.moveTo(0.12,-tl+0.12);c.quadraticCurveTo(0.17,-tl*0.5,0.12,-0.05);c.stroke();
    c.fillStyle='#b8953e';for(let k=0;k<3;k++){c.beginPath();c.arc(0.14,-tl+0.24+k*0.1,0.017,0,TAU);c.fill();}
    c.restore();
    /* лямка ранца и ремень сумки через грудь (светлый брезент) */
    c.strokeStyle='#241e18';c.lineWidth=0.055;c.beginPath();c.moveTo(-0.2,-tl+0.04);c.quadraticCurveTo(-0.02,-tl*0.6,-0.12,-0.1);c.stroke();
    c.strokeStyle='#75644a';c.lineWidth=0.045;c.beginPath();c.moveTo(-0.17,-tl+0.03);c.quadraticCurveTo(0.13,-tl*0.45,0.08,-0.06);c.stroke();
    c.fillStyle='#8a6d3b';c.fillRect(0.06,-tl*0.42,0.05,0.055);
    /* ремень, пряжка, подсумок */
    c.fillStyle='#2b2318';c.fillRect(-0.26,-0.12,0.47,0.1);
    c.fillStyle='#c9a227';rr(c,0.03,-0.125,0.09,0.11,0.02);c.fill();c.fillStyle='#2b2318';c.fillRect(0.055,-0.1,0.04,0.06);
    c.fillStyle='#4f4130';rr(c,-0.31,-0.17,0.14,0.2,0.04);c.fill();c.fillStyle='rgba(255,230,190,.1)';c.fillRect(-0.3,-0.16,0.12,0.025);
  },
  /* пелерина почтальона поверх плеча и воротник-стойка: широкий, узнаваемый плечевой силуэт */
  capeFront(c,tl,P){
    const cp=-P.coat*0.05;
    const pg=c.createLinearGradient(0,-tl-0.06,0,-tl+0.3);pg.addColorStop(0,'#715d43');pg.addColorStop(1,'#4a3c2b');
    const cape=()=>{c.beginPath();c.moveTo(-0.22,-tl+0.0);c.quadraticCurveTo(0.0,-tl-0.07,0.2,-tl+0.02);c.quadraticCurveTo(0.3,-tl+0.12,0.28,-tl+0.28);
      c.lineTo(0.09,-tl+0.31);c.lineTo(-0.12,-tl+0.29+cp);c.lineTo(-0.31,-tl+0.25+cp*2);c.quadraticCurveTo(-0.33,-tl+0.08,-0.22,-tl+0.0);c.closePath();};
    c.fillStyle=pg;cape();c.fill();
    /* строчка по подолу и тень под ним */
    c.strokeStyle='rgba(16,12,8,.55)';c.lineWidth=0.016;c.setLineDash([0.025,0.02]);
    c.beginPath();c.moveTo(0.26,-tl+0.25);c.lineTo(0.09,-tl+0.28);c.lineTo(-0.12,-tl+0.26+cp);c.lineTo(-0.29,-tl+0.22+cp*2);c.stroke();c.setLineDash([]);
    c.fillStyle='rgba(255,234,198,.14)';c.beginPath();c.ellipse(0.0,-tl-0.02,0.17,0.035,0,0,TAU);c.fill();
    c.fillStyle='#2f261c';rr(c,-0.12,-tl-0.06,0.22,0.09,0.04);c.fill();
    c.fillStyle='#b8953e';c.beginPath();c.arc(0.07,-tl-0.015,0.02,0,TAU);c.fill();
  },
  /* передняя пола поверх передней ноги */
  coatFront(c,tl,P){
    const sw=P.coat;
    c.fillStyle='#3a2f23';c.beginPath();c.moveTo(0.0,-0.05);c.lineTo(0.21,-0.05);c.quadraticCurveTo(0.24+sw*0.04,0.15,0.2+sw*0.08,0.34);c.lineTo(-0.02+sw*0.16,0.37);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=0.02;c.stroke();
    c.strokeStyle='rgba(255,226,180,.08)';c.lineWidth=0.025;c.beginPath();c.moveTo(0.2,-0.04);c.quadraticCurveTo(0.23+sw*0.04,0.15,0.195+sw*0.08,0.33);c.stroke();
  },
  /* почтовая сумка у бедра: висит на ремне через грудь и качается (вторичное движение); письмо выглядывает из-под клапана */
  satchel(c,J,P){
    const L=P.lean,ax=J.hip.x-0.02*Math.cos(L)+0.07*Math.sin(L),ay=J.hip.y-0.02*Math.sin(L)-0.07*Math.cos(L);
    c.save();c.translate(ax,ay);c.rotate(P.bag||0);
    c.fillStyle='#7d6c50';rr(c,-0.14,0.02,0.27,0.24,0.05);c.fill();
    c.fillStyle='rgba(40,28,18,.28)';c.beginPath();c.ellipse(0.05,0.2,0.07,0.035,0.3,0,TAU);c.fill();
    c.save();c.rotate(-0.28);c.fillStyle='#e6dbc2';c.fillRect(-0.02,-0.03,0.15,0.08);c.fillStyle='#9a2f22';c.fillRect(0.08,0.0,0.03,0.03);c.restore();
    c.fillStyle='#a08d68';rr(c,-0.155,0.0,0.3,0.12,0.04);c.fill();
    c.fillStyle='rgba(255,244,214,.22)';c.fillRect(-0.13,0.005,0.24,0.022);
    c.strokeStyle='rgba(40,30,20,.55)';c.lineWidth=0.011;c.setLineDash([0.02,0.016]);c.beginPath();c.moveTo(-0.13,0.1);c.lineTo(0.12,0.1);c.stroke();c.setLineDash([]);
    c.fillStyle='#b8953e';rr(c,-0.03,0.075,0.055,0.055,0.012);c.fill();c.fillStyle='rgba(255,240,200,.45)';c.fillRect(-0.022,0.08,0.03,0.01);
    c.restore();
  },
  head(c,J,p,gs,t){
    c.save();c.translate(J.head.x,J.head.y);c.rotate(J.headA);c.scale(1.08,1.08);
    const lit=(p.dead||p.noLamp)?0.2:1;   /* noLamp — фонарь погас (Курьер 38) */
    /* лицо в тени козырька; одна линза очков ловит свет */
    c.fillStyle='#1c1712';c.beginPath();c.ellipse(0.03,0.05,0.16,0.14,0,0,TAU);c.fill();
    c.fillStyle='#3a3128';c.beginPath();c.arc(0.13,0.07,0.048,0,TAU);c.fill();
    c.fillStyle=lit>0.5?'#8aa3a2':'#3d4a4a';c.beginPath();c.arc(0.135,0.07,0.032,0,TAU);c.fill();
    c.fillStyle='rgba(255,250,235,'+(0.75*lit)+')';c.beginPath();c.arc(0.145,0.06,0.011,0,TAU);c.fill();
    /* назатыльник */
    c.fillStyle='#352d24';c.beginPath();c.moveTo(-0.13,-0.02);c.lineTo(-0.26,0.15);c.quadraticCurveTo(-0.18,0.2,-0.08,0.15);c.lineTo(-0.04,0.03);c.closePath();c.fill();
    /* купол: кожа на латунном каркасе — свет сверху-сзади, тень к козырьку */
    const hg=c.createLinearGradient(-0.12,-0.22,0.12,0.04);hg.addColorStop(0,'#6b6050');hg.addColorStop(0.5,'#4d443a');hg.addColorStop(1,'#2f2922');
    c.fillStyle=hg;c.beginPath();c.moveTo(-0.215,0.03);c.bezierCurveTo(-0.225,-0.2,0.05,-0.28,0.2,-0.06);c.lineTo(0.205,0.03);c.closePath();c.fill();
    /* гребень шлема (почтовая служба): латунный «гребешок» от лба к затылку — свой силуэт головы */
    c.fillStyle='#6d5416';c.beginPath();c.moveTo(-0.17,-0.13);c.quadraticCurveTo(-0.06,-0.29,0.1,-0.2);c.lineTo(0.12,-0.16);c.quadraticCurveTo(-0.04,-0.23,-0.14,-0.11);c.closePath();c.fill();
    c.fillStyle='rgba(255,236,190,.4)';c.beginPath();c.moveTo(-0.12,-0.19);c.quadraticCurveTo(-0.04,-0.27,0.06,-0.22);c.lineTo(0.05,-0.205);c.quadraticCurveTo(-0.04,-0.25,-0.11,-0.175);c.closePath();c.fill();
    c.strokeStyle='rgba(255,236,200,.22)';c.lineWidth=0.008;c.beginPath();c.moveTo(-0.11,-0.11);c.lineTo(-0.05,-0.15);c.moveTo(0.0,-0.07);c.lineTo(0.06,-0.1);c.moveTo(-0.16,-0.03);c.lineTo(-0.12,-0.06);c.stroke();
    c.fillStyle='rgba(255,236,200,.15)';c.beginPath();c.ellipse(-0.08,-0.15,0.07,0.028,-0.35,0,TAU);c.fill();
    /* латунный обод и козырёк */
    c.fillStyle='#8a6d3b';c.fillRect(-0.215,0.0,0.43,0.04);c.fillStyle='rgba(255,236,190,.3)';c.fillRect(-0.2,0.0,0.4,0.01);
    c.fillStyle='#231e19';c.beginPath();c.moveTo(0.1,0.0);c.lineTo(0.33,0.035);c.quadraticCurveTo(0.345,0.06,0.31,0.068);c.lineTo(0.1,0.048);c.closePath();c.fill();
    c.fillStyle='rgba(255,226,180,.18)';c.fillRect(0.12,0.002,0.19,0.012);
    if(gs.has('filter')){c.fillStyle='#5c646b';rr(c,0.06,0.06,0.2,0.14,0.06);c.fill();
      c.fillStyle='#22262a';c.beginPath();c.arc(0.24,0.13,0.05,0,TAU);c.fill();}
    /* фонарь на лбу: латунный корпус, линза — самая яркая точка фигуры */
    const eg=c.createRadialGradient(0.22,-0.075,0,0.22,-0.075,0.17);
    eg.addColorStop(0,rgba('#ffecb4',lit));eg.addColorStop(0.4,rgba('#ffbe63',0.7*lit));eg.addColorStop(1,'rgba(255,150,60,0)');
    c.fillStyle='#5e4812';rr(c,0.07,-0.135,0.14,0.115,0.03);c.fill();
    c.fillStyle='#b08d3e';rr(c,0.08,-0.13,0.12,0.028,0.012);c.fill();
    c.fillStyle=eg;c.beginPath();c.arc(0.22,-0.075,0.17,0,TAU);c.fill();
    c.fillStyle='#3a2c10';c.beginPath();c.ellipse(0.215,-0.075,0.04,0.052,0,0,TAU);c.fill();
    c.fillStyle=rgba('#fff3cf',lit);c.beginPath();c.ellipse(0.218,-0.075,0.03,0.042,0,0,TAU);c.fill();
    /* антенна с огоньком */
    c.strokeStyle='#7a8087';c.lineWidth=0.03;c.beginPath();c.moveTo(-0.14,-0.14);c.lineTo(-0.27,-0.42);c.stroke();
    c.fillStyle='#4a4f55';c.fillRect(-0.165,-0.17,0.05,0.05);
    c.fillStyle=rgba('#c8452f',0.6+0.4*Math.sin(t*4));c.beginPath();c.arc(-0.27,-0.44,0.035,0,TAU);c.fill();
    c.restore();
  },
  /* дальняя рука: рукав и перчатка; с импульсом — резак-наруч с латунным соплом */
  armB(c,J,p,gs,t,front){
    const L=J.armB,sh=J.shB,col=front?'#45382a':'#2a221a';
    heroLimb2(c,{x:sh.x,y:sh.y},{x:L.kx,y:L.ky},{x:L.fx,y:L.fy},0.15,0.125,0.1,col);
    if(gs.has('pulse')){const a=Math.atan2(L.fy-L.ky,L.fx-L.kx);
      c.save();c.translate(L.kx,L.ky);c.rotate(a);
      c.fillStyle=front?'#3a4046':'#262a2e';rr(c,0.04,-0.08,0.26,0.16,0.05);c.fill();
      c.fillStyle=front?'#c9a227':'#6d5416';rr(c,0.26,-0.095,0.1,0.19,0.03);c.fill();
      c.fillStyle='#16191c';c.beginPath();c.arc(0.36,0,0.045,0,TAU);c.fill();
      c.restore();}
    c.fillStyle=front?'#3a3026':'#211b15';c.beginPath();c.arc(L.fx,L.fy,0.075,0,TAU);c.fill();
  },
  /* ближняя рука с ключом. Ключ рисуется до перчатки — кисть сжимает рукоять */
  armF(c,J,P,p,gs,t){
    const L=J.armF,sh=J.shF;
    this.wrench(c,L.fx,L.fy,P.wa,p,t);
    heroLimb2(c,{x:sh.x,y:sh.y},{x:L.kx,y:L.ky},{x:L.fx,y:L.fy},0.17,0.135,0.11,'#48392b');
    /* складка рукава на сгибе локтя */
    c.strokeStyle='rgba(0,0,0,.32)';c.lineWidth=0.016;c.beginPath();c.moveTo(L.kx-0.04,L.ky-0.03);c.quadraticCurveTo(L.kx,L.ky+0.02,L.kx+0.05,L.ky-0.02);c.stroke();
    c.strokeStyle='rgba(255,230,190,.1)';c.lineWidth=0.04;c.beginPath();c.moveTo(sh.x,sh.y-0.04);c.lineTo(L.kx,L.ky-0.04);c.stroke();
    /* манжета и тяжёлая перчатка с латунной накладкой */
    const a=Math.atan2(L.fy-L.ky,L.fx-L.kx);c.save();c.translate(lerp(L.kx,L.fx,0.7),lerp(L.ky,L.fy,0.7));c.rotate(a);
    c.fillStyle='#29211a';rr(c,-0.04,-0.075,0.08,0.15,0.02);c.fill();c.restore();
    c.fillStyle='#3b3127';c.beginPath();c.arc(L.fx,L.fy,0.08,0,TAU);c.fill();
    c.fillStyle='#8a6d3b';c.beginPath();c.arc(L.fx+0.02,L.fy-0.025,0.032,0,TAU);c.fill();
    c.fillStyle='rgba(255,236,190,.3)';c.beginPath();c.arc(L.fx+0.01,L.fy-0.035,0.012,0,TAU);c.fill();
  },
  /* разводной ключ: рукоять (сталь, латунная обмотка, сбитая красная метка), червяк, тяжёлые губки */
  wrench(c,x,y,a,p,t){
    c.save();c.translate(x,y);c.rotate(a);
    c.fillStyle='#22272b';rr(c,-0.16,-0.045,0.66,0.09,0.035);c.fill();
    c.fillStyle='#7d868d';c.fillRect(-0.14,-0.045,0.6,0.022);
    c.fillStyle='#7a2a1c';c.fillRect(0.2,-0.045,0.06,0.09);c.fillStyle='#22272b';c.fillRect(0.23,-0.045,0.012,0.05);
    c.fillStyle='#6d5416';rr(c,-0.13,-0.055,0.19,0.11,0.035);c.fill();
    c.strokeStyle='#3a2c0b';c.lineWidth=0.012;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-0.11+i*0.035,-0.055);c.lineTo(-0.1+i*0.035,0.055);c.stroke();}
    c.fillStyle='#b08d3e';rr(c,0.36,-0.06,0.1,0.12,0.025);c.fill();
    c.strokeStyle='#5c4510';c.lineWidth=0.012;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0.375+i*0.022,-0.06);c.lineTo(0.375+i*0.022,0.06);c.stroke();}
    c.fillStyle='#3d444a';c.beginPath();c.moveTo(0.44,-0.09);c.lineTo(0.66,-0.14);c.quadraticCurveTo(0.77,-0.12,0.77,-0.04);
    c.lineTo(0.62,-0.03);c.lineTo(0.62,0.03);c.lineTo(0.76,0.05);c.quadraticCurveTo(0.77,0.15,0.66,0.16);c.lineTo(0.44,0.1);c.closePath();c.fill();
    c.strokeStyle='#14171a';c.lineWidth=0.02;c.stroke();
    c.fillStyle='#9aa3aa';c.beginPath();c.moveTo(0.46,-0.085);c.lineTo(0.66,-0.13);c.lineTo(0.68,-0.105);c.lineTo(0.47,-0.06);c.closePath();c.fill();
    /* зазубрины на губке — ключом не только крутили */
    c.fillStyle='#1d2124';for(const q of [0.68,0.72])c.fillRect(q,-0.035,0.018,0.012);
    c.restore();
  },
  /* ---------- силуэт для следа рывка и идеального уклонения ---------- */
  silhouette(c,G,col,a){
    const J=G.j;if(!J)return;
    c.save();c.translate(G.x,G.y);if(G.ceil)c.scale(1,-1);if(G.face<0)c.scale(-1,1);
    c.globalAlpha=a;c.strokeStyle=col;c.fillStyle=col;c.lineCap='round';c.lineJoin='round';
    for(const [h,L] of [[J.hipB,J.legB],[J.hipF,J.legF]]){heroLimb(c,h.x,h.y,L.kx,L.ky,0.2,0.15,col);heroLimb(c,L.kx,L.ky,L.fx,L.fy-0.08,0.15,0.13,col);}
    c.save();c.translate(J.hip.x,J.hip.y);c.rotate(G.lean);const tl=J.tl;
    rr(c,-0.25,-tl,0.48,tl+0.06,0.13);c.fill();rr(c,-0.52,-tl+0.06,0.36,tl*0.78,0.09);c.fill();
    c.beginPath();c.ellipse(-0.33,-tl-0.01,0.215,0.088,0,0,TAU);c.fill();
    c.beginPath();c.moveTo(-0.31,-tl+0.25);c.quadraticCurveTo(-0.33,-tl,0,-tl-0.07);c.quadraticCurveTo(0.3,-tl+0.12,0.28,-tl+0.28);c.closePath();c.fill();
    c.beginPath();c.moveTo(-0.23,-0.08);c.lineTo(0.06,-0.06);c.lineTo(-0.04,0.42);c.lineTo(-0.22,0.4);c.closePath();c.fill();
    c.restore();
    c.beginPath();c.arc(J.head.x,J.head.y,0.21,0,TAU);c.fill();
    heroLimb(c,J.shF.x,J.shF.y,J.armF.kx,J.armF.ky,0.15,0.12,col);heroLimb(c,J.armF.kx,J.armF.ky,J.armF.fx,J.armF.fy,0.12,0.1,col);
    c.lineWidth=0.1;c.beginPath();c.moveTo(J.armF.fx,J.armF.fy);c.lineTo(J.wHead.x,J.wHead.y);c.stroke();
    c.restore();
  },
  /* снимок позы для призрака */
  snap(p){const P=p._pose;if(!P||!P.j)return null;return {x:p.cx,y:p.onCeil?p.y:p.bottom,ceil:p.onCeil,face:p.face,lean:P.lean,j:P.j};}
};
