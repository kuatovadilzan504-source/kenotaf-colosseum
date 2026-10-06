"use strict";
/* ============================== ПОРТРЕТЫ ==============================
   Портрет — крупный план той же фигуры, что ходит в мире: курьер рисуется скелетом HeroArt
   (тот же шлем с фонарём-визором, антенна, куртка, ранец, шарф), почтмейстер — drawPostmaster,
   садовник — Kit.gardener. Курьер 38 — тот же курьер, только фонарь погас, на шлеме мел «38»,
   снизу — голубой свет фонографа. Совет — пластинка и рупор (лица у Совета нет).
   Сверху — свет персонажа, дымка и латунная рама; фигура дышит. */
const PORTRAITS={
  courier:{name:'КУРЬЕР',light:'#ffbe63',bg:['#2a2118','#0c0a08']},
  postmaster:{name:'ПОЧТМЕЙСТЕР',light:'#ffd9a0',bg:['#24232a','#0b0a0c']},
  gardener:{name:'САДОВНИК',light:'#bfeee8',bg:['#1d281b','#090c08']},
  c38:{name:'КУРЬЕР 38',light:'#9fe6ff',bg:['#18222a','#07090b']},
  council:{name:'СОВЕТ',light:'#e8c96a',bg:['#2a2216','#0c0a06']}
};
const Portraits={
  /* курьер-модель для портрета: копия игрока в спокойной позе (живого не трогаем) */
  stub(dead){const W=typeof game!=='undefined'&&game.world;const base=W&&W.player;if(!base)return null;
    const s=Object.create(base);Object.assign(s,{vx:0,vy:0,onGround:true,onCeil:false,state:'idle',dashT:0,slashT:0,atkPhase:null,atkT:0,hurtT:0,
      dead:false,noLamp:!!dead,t:(typeof performance!=='undefined'?performance.now()/1000:0),crouch:false,h:CFG.player.h,chargeT:0,hook:null,healT:0,restT:0,lookV:0,idleT:2,slideT:0,wallT:0,gripDir:0,face:1,_pose:null,_smear:null,pulseT:0,flingT:0,cinePose:null,cineSlow:false,walkCap:0});
    return s;},
  draw(cv,key,t){const P=PORTRAITS[key];if(!cv||!P)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.setTransform(W/100,0,0,H/100,0,0);
    c.save();c.beginPath();c.arc(50,50,46,0,TAU);c.clip();
    const g=c.createRadialGradient(40,36,4,50,50,62);g.addColorStop(0,P.bg[0]);g.addColorStop(1,P.bg[1]);c.fillStyle=g;c.fillRect(0,0,100,100);
    /* контровой свет персонажа со стороны лица */
    const lg=c.createRadialGradient(78,38,0,78,38,58);lg.addColorStop(0,rgba(P.light,0.32));lg.addColorStop(1,rgba(P.light,0));c.fillStyle=lg;c.fillRect(0,0,100,100);
    const br=Math.sin(t*1.5)*0.35;
    try{this[key](c,t,br,P);}catch(e){}
    /* дымка снизу и виньетка — фигура выходит из темноты */
    const vg=c.createRadialGradient(50,46,26,50,50,52);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=vg;c.fillRect(0,0,100,100);
    c.restore();
    c.strokeStyle='#5a4512';c.lineWidth=5;c.beginPath();c.arc(50,50,47,0,TAU);c.stroke();
    const rg=c.createLinearGradient(10,10,90,90);rg.addColorStop(0,'#fff0c0');rg.addColorStop(0.35,'#e8c96a');rg.addColorStop(1,'#7a5f1c');
    c.strokeStyle=rg;c.lineWidth=1.6;c.beginPath();c.arc(50,50,45,0,TAU);c.stroke();
    for(let i=0;i<4;i++){const a=PI/4+i*PI/2;c.fillStyle='#c9a227';c.beginPath();c.arc(50+Math.cos(a)*47,50+Math.sin(a)*47,1.5,0,TAU);c.fill();}},
  /* мир → портрет: точка (wx,wy) в метрах встаёт в (px,py), масштаб k ед./м */
  frame(c,wx,wy,px,py,k){c.translate(px,py);c.scale(k,k);c.translate(-wx,-wy);},
  hero(c,t,br,dead){const s=this.stub(dead);if(!s)return false;
    HeroArt.pose(s,t);const J0=s._pose.j;s._fx=J0.head.x-0.02;s._fy=J0.head.y+0.32+br*0.004;
    c.save();this.frame(c,s._fx,s._fy,50,52,78);c.lineCap='round';c.lineJoin='round';
    /* шарф — как у фигуры в мире: два тона, хвост за спину */
    /* шарф — как у фигуры в мире: два тона, от шеи назад за плечо (до фигуры — за ней) */
    const n=J0.neck,gold=typeof CouncilExam!=='undefined'&&CouncilExam.master&&CouncilExam.master(),sw=Math.sin(t*2)*0.03;
    c.strokeStyle=gold?'#7a5f1c':'#7a2418';c.lineWidth=0.14;c.beginPath();c.moveTo(n.x-0.02,n.y+0.03);c.quadraticCurveTo(n.x-0.3,n.y+0.02,n.x-0.5,n.y+0.22+sw);c.stroke();
    c.strokeStyle=gold?'#e8c96a':'#a8382a';c.lineWidth=0.07;c.beginPath();c.moveTo(n.x-0.02,n.y+0.015);c.quadraticCurveTo(n.x-0.3,n.y+0.005,n.x-0.48,n.y+0.2+sw);c.stroke();
    HeroArt.draw(c,s,t);
    c.restore();return s;},
  courier(c,t,br){this.hero(c,t,br,false);},
  c38(c,t,br){const s=this.hero(c,t,br,true);
    if(s&&s._pose){const J=s._pose.j;c.save();this.frame(c,s._fx,s._fy,50,52,78);c.translate(J.head.x,J.head.y);c.rotate(J.headA||0);
      /* мел на шлеме; шрифт в 100 раз крупнее и сжат масштабом — крошечные кегли канва рисует неверно */
      c.scale(0.01,0.01);c.fillStyle='rgba(236,234,222,.88)';c.font='600 13px Oswald';c.textAlign='center';c.textBaseline='middle';c.fillText('38',-4,-7);c.restore();}
    /* снизу — голубой свет фонографа; сверху — холод */
    const bg=c.createLinearGradient(0,100,0,40);bg.addColorStop(0,'rgba(159,230,255,.42)');bg.addColorStop(1,'rgba(159,230,255,0)');c.fillStyle=bg;c.fillRect(0,40,100,60);
    c.fillStyle='rgba(20,30,40,.18)';c.fillRect(0,0,100,100);},
  postmaster(c,t,br){c.save();this.frame(c,0.02,-1.75+br*0.004,48,50,52);drawPostmaster(c,0,0,t,1);c.restore();},
  gardener(c,t,br){c.save();this.frame(c,0.1,-1.55+br*0.004,48,52,70);Kit.gardener(c,0,0,2,1,t,{});c.restore();},
  council(c,t){
    c.fillStyle='#14110c';c.beginPath();c.arc(44,60,28,0,TAU);c.fill();
    c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=0.6;for(let r=8;r<28;r+=2.2){c.beginPath();c.arc(44,60,r,0,TAU);c.stroke();}
    c.save();c.translate(44,60);c.rotate(t*1.2);c.fillStyle='#8a2b1e';c.beginPath();c.arc(0,0,8,0,TAU);c.fill();
    c.fillStyle='#e8c96a';c.font='500 4px Oswald';c.textAlign='center';c.fillText('СОВЕТ',0,1.4);c.restore();
    c.fillStyle='#000';c.beginPath();c.arc(44,60,1,0,TAU);c.fill();
    c.strokeStyle='rgba(255,240,200,.18)';c.lineWidth=2;c.beginPath();c.arc(44,60,20,-1.2,-0.6);c.stroke();
    const hg=c.createLinearGradient(56,14,90,40);hg.addColorStop(0,'#6d5416');hg.addColorStop(0.5,'#e8c96a');hg.addColorStop(1,'#7a5f1c');
    c.fillStyle=hg;c.beginPath();c.moveTo(60,46);c.lineTo(64,40);c.quadraticCurveTo(70,22,92,12);c.lineTo(96,34);c.quadraticCurveTo(76,34,66,48);c.closePath();c.fill();
    c.strokeStyle='#3a2c10';c.lineWidth=1.2;c.beginPath();c.moveTo(62,44);c.lineTo(52,52);c.stroke();}
};
