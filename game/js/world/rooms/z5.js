"use strict";
/* ============================== ROOMS · Z5 ============================== */
Object.assign(ROOMDEFS,{
z5_surface:gs=>({id:'z5_surface',zone:'surface',name:'ПОВЕРХНОСТЬ',w:64,h:34,
  art:{far:Art.farSurface,bg:Art.bgSurface,mid:Art.midSurface,game:Art.gameSurface},
  build(R){
    /* снаружи свода нет: только земля и края мира */
    R.solids=[S(-2,-30,2,64,'concrete',{noGrass:true}),
      S(64,-30,2,64,'concrete',{noGrass:true}),S(0,29,64,5,'concrete')];
    R.emitters=[{type:'windseed',rate:16},{type:'leaf',rate:3}];
    R.trigger={x:46,once:'ending'};
    R.lights=[lit(50,6,30,'#fff6dd',0.9),lit(4,26,6,'#ffe6b0',0.5)];
    /* кенотаф и поле — js/render/surface.js: бетон с потёками и мхом, люк в заклёпках, камни, трава, цветы */
    R.extraGame=(c,L,r)=>{SurfaceGround.cenotaph(c,r);SurfaceGround.field(c,L,r);};
    R.extraTop=(c,L,r)=>SurfaceGround.soil(c,0,64,29,5,r);
    /* птицы и ветер: живое небо */
    R.dyn=(c,t,W)=>{for(let i=0;i<9;i++){const ph=i*1.7,x=((t*(2.2+i%3*0.6)+i*9)%84)-10,y=5+Math.sin(t*0.4+ph)*1.5+i%4*1.6,w=Math.sin(t*7+ph)*0.22;
        c.strokeStyle='rgba(40,46,52,.75)';c.lineWidth=0.07;c.beginPath();c.moveTo(x-0.35,y-w);c.quadraticCurveTo(x-0.12,y-0.1,x,y);c.quadraticCurveTo(x+0.12,y-0.1,x+0.35,y-w);c.stroke();}};
  }})
});
