"use strict";
/* ============================== WEBGL-КОМПОЗИТОР ==============================
   Процедурный арт по-прежнему рисуется кодом (Canvas 2D: механизмы, курьер, комнаты) — но кадр собирает
   WebGL2. Статичные слои комнаты (небо, дальний план, архитектура, игровой план, передний план, свечение)
   уходят на видеокарту один раз при входе, с мип-уровнями и анизотропной фильтрацией. Каждый кадр в
   прозрачные буферы рисуется только живое: машины, сущности, частицы, свечение, интерфейс поверх кадра.
   Дальше — шейдеры, все расчёты в линейном цвете:
     свет      — источники комнаты, функциональный свет, фонарь курьера, свечение механизмов, вспышки ударов;
                 рельеф стен и пола восстанавливается из яркости (карта нормалей «на лету»), диффуз + блик
                 по материалу (сталь — холодный блик, латунь — тёплый, ржавчина и пыль — матовые);
     тени      — твёрдая геометрия отбрасывает мягкие тени на заднюю стену от главных ламп; у стыков — затенение;
                 сущности кладут контактную тень на стену и пол;
     глубина   — дальние слои теряют контраст, насыщенность и резкость (дымка зоны), передний план размыт;
     сущности  — освещены мягко (читаемость прежде всего) и получают контровую кромку со стороны света;
     пост      — HDR-блум с мягким порогом, лучи от ярких источников, плавное тональное сжатие, грейдинг
                 зоны (тени/света/насыщенность/контраст), чуть-чуть хроматической аберрации к краям,
                 виньетка и зерно; интерфейс кадра (титры, реплики, тревога) ложится поверх, без обработки;
     частицы   — атмосфера зоны на видеокарте: тысячи пылинок, пыльцы, спор, угольков на разной глубине,
                 они освещаются теми же лампами — видны в лучах, гаснут в тени.
   Игровая логика не трогается: тот же кадр, та же камера, те же хитбоксы. Нет WebGL2 или он программный
   (SwiftShader) — игра рисуется старым путём Canvas 2D (?gl=1 — включить принудительно). */
const GFX_MAXL=48;
/* язык света зон: grade — тени (lift), света (gain), насыщенность, контраст, экспозиция;
   back — сколько ламп достаётся дальнему/фоновому/среднему слою; fog — дымка по глубине;
   normal/spec/shadow/ao — сила рельефа, блика, теней на стене и затенения у стыков;
   rim — контровая кромка сущностей; bloom/thr — свечение и порог; rays — лучи; part — атмосфера */
/* ключевой свет зоны (направление и цвет «откуда светит» во всём кадре) и заполняющий — с противоположной стороны,
   в дополнительном цвете: x,y — положение относительно кадра, r — радиус в диагоналях кадра */
const GFX_KEY={
  sump:{key:[-0.15,-0.25,'#ffb06a',0.34],fill:[1.15,1.0,'#3f7a7a',0.2]},
  hives:{key:[1.1,-0.2,'#ffc68a',0.32],fill:[-0.1,0.9,'#7a4a6a',0.18]},
  eden:{key:[0.7,-0.4,'#ffcf78',0.34],fill:[0.1,1.2,'#2f6f74',0.24]},
  seal:{key:[1.1,-0.3,'#cfe0ff',0.36],fill:[-0.1,1.1,'#c08040',0.16]},
  archive:{key:[-0.1,-0.3,'#ffbf70',0.34],fill:[1.15,0.7,'#4a5a8a',0.2]},
  surface:{key:[0.9,-0.4,'#fff0d0',0.3],fill:[0.0,1.1,'#8ab0d8',0.18]}
};
/* цветовой сценарий ключевых кадров: свой ключ/заполнение там, где у зала свой главный источник
   (расплав снизу, хладагент, витраж, окна домов, циферблат, лампа-солнце). Остальные залы — язык зоны */
const GFX_ROOM={
  /* I · Отстойник: янтарь натрия — основа; у каждого зала свой второй цвет */
  z1_hub:{fill:[0.5,1.25,'#3fbf8f',0.26],grade:{sat:1.08}},                                       /* насосная: зелёный хладагент из ямы */
  z1_foundry:{key:[0.5,1.2,'#ff8a3a',0.42],fill:[0.85,-0.3,'#7f9fbf',0.2],grade:{gain:[1.1,0.97,0.84],con:1.15}}, /* литейка: жар снизу, холод кровли */
  z1_boiler:{key:[0.3,0.4,'#ff7a4a',0.34],fill:[1.1,-0.2,'#5a7a8a',0.18],grade:{gain:[1.08,0.95,0.86]}}, /* котельная: медь и красный жар */
  z1_canal:{key:[0.4,1.2,'#5fd0a8',0.3],fill:[0.0,-0.3,'#ffb06a',0.22],grade:{gain:[0.96,1.02,1.03]}}, /* канал: бирюза воды */
  z1_gallery:{key:[0.25,0.15,'#ffa858',0.36],fill:[1.1,0.4,'#6f8f9a',0.2],grade:{lift:[0.008,0.018,0.03]}}, /* галерея: печь переплавки и холод цеха */
  z1_charge:{key:[0.6,0.2,'#9fd6ff',0.3],fill:[0.0,1.1,'#ffa860',0.2]},                          /* зарядная: электрический голубой */
  z1_sluice:{key:[0.5,-0.3,'#b8d0c8',0.3],fill:[0.2,1.2,'#3f8f7a',0.2],grade:{sat:0.92}},          /* шлюз: холодная сырость */
  z1_drain:{key:[0.5,1.2,'#7fe0b0',0.26],grade:{sat:0.95}},
  z1_boss:{fill:[1.1,0.9,'#ff5a3a',0.16],grade:{con:1.16}},                                       /* арена: аварийный красный в тенях */
  /* II · Соты: янтарь окон и сиреневые тени; рынок тёплый и насыщенный, прачечная — паровая и холодная */
  z2_market:{fill:[0.5,1.2,'#ff9a4a',0.22],grade:{sat:1.1}},
  z2_laundry:{key:[0.5,-0.3,'#dfe8f0',0.34],fill:[0.1,1.1,'#8a6aa0',0.2],grade:{sat:0.9,gain:[0.98,1.0,1.06]}},
  z2_school:{key:[0.9,-0.3,'#e8ecd8',0.32],grade:{sat:0.9}},
  z2_turbine:{fill:[0.5,1.2,'#7fd6e0',0.24]},
  z2_post:{key:[0.8,0.2,'#ffe2a0',0.34]},
  z2_chapel:{key:[0.5,-0.15,'#ffd27a',0.36],fill:[0.5,1.2,'#3f8f9a',0.22]},
  z2_roofs:{key:[0.95,-0.35,'#a49ae0',0.3],fill:[0.3,1.25,'#ffa860',0.24],grade:{sat:1.06}},
  z2_boss:{fill:[0.6,1.2,'#c8452f',0.2],grade:{con:1.12}},                                        /* зал цензора: красное «ИЗЪЯТО» */
  /* III · Эдем: золотой ключ сверху, бирюзовое заполнение; в каждом зале — свой акцент */
  z3_greenhouse:{key:[0.6,-0.4,'#ffe2a0',0.34],fill:[0.0,1.2,'#2f7f7a',0.26]},
  z3_dome:{fill:[0.5,0.5,'#9fe8d8',0.22]},                                                        /* купол: холодный свет лилии */
  z3_sunhall:{key:[0.5,-0.35,'#fff0c0',0.42],fill:[0.2,1.25,'#2f7a6a',0.26]},
  z3_roots:{key:[0.5,1.2,'#7fe0d0',0.22],fill:[0.2,-0.2,'#b08ae0',0.14]},
  z3_boss:{key:[0.7,-0.5,'#fff2c8',0.4],grade:{sat:1.02,con:1.22}},                               /* корчевальня: резкий полдень */
  /* IV · Печать: холодная сталь; часы и латунь — тёплые очаги */
  z4_antechamber:{grade:{sat:0.82}},
  z4_gearworks:{key:[0.3,-0.2,'#ffcf7a',0.32],grade:{sat:0.95}},
  z4_clocktower:{key:[0.5,-0.3,'#f2e6c0',0.38],fill:[0.0,1.1,'#5a7ab0',0.2]},
  z4_pendulum:{key:[0.5,0.8,'#7fd6e0',0.3],grade:{gain:[0.94,1.0,1.1]}},
  z4_pressure:{key:[0.5,1.1,'#ff6a4a',0.32],grade:{gain:[1.08,0.96,0.94]}},
  z4_boss:{key:[0.5,-0.25,'#f2e6c0',0.36]},
  /* V · Архив: свечи и лунная синева; у каждого зала свой центр */
  z5_hall:{key:[0.45,-0.1,'#ffbe63',0.38],fill:[1.1,-0.2,'#6a82c0',0.22]},                        /* прихожая: люстра */
  z5_reading:{fill:[0.55,-0.2,'#7a92d0',0.26],grade:{lift:[0.012,0.014,0.03]}},                   /* читальня: лунное окно */
  z5_stacks:{key:[0.1,0.5,'#ffcf7a',0.3],grade:{sat:0.9}},                                        /* хранилище: латунь пневмопочты */
  z5_council:{key:[0.5,-0.1,'#ffd27a',0.4],grade:{con:1.18}},                                     /* совет: раструб */
  z5_crypt:{key:[0.5,-0.3,'#a8c0b0',0.3],grade:{sat:0.8}},                                        /* склеп: холодный камень */
  z5_broadcast:{key:[0.5,0.3,'#9fd6ff',0.32]},
  z5_boss:{fill:[0.5,1.2,'#9fd6ff',0.2]},
  z5_surface:{key:[0.85,-0.4,'#fff0cc',0.36]}
};
const GFX_ZONES={
  sump:{hazeK:2.2,mist:0.3,mistLow:0.28,lift:[0.012,0.022,0.028],gain:[1.06,0.97,0.86],sat:1.04,con:1.1,exp:1.2,back:[0.3,0.55,0.82],fog:[0.62,0.44,0.24],
    normal:0.75,spec:0.55,shadow:0.62,ao:0.38,rim:0.65,bloom:0.6,thr:0.82,rays:0.32,ca:0.0011,vig:0.34,grain:0.04,
    part:[{n:260,k:'dust',col:[0.9,0.8,0.68],size:[0.014,0.03],vel:[0.05,-0.04],drift:0.25,depth:[0.55,1.1],lit:0.55,amb:0.0},
          {n:60,k:'ember',col:[1.0,0.55,0.2],size:[0.02,0.035],vel:[0.1,-0.6],drift:0.6,depth:[0.6,1.1],emis:1.6,twinkle:1}]},
  hives:{hazeK:2.0,mist:0.18,mistLow:0.12,lift:[0.018,0.012,0.022],gain:[1.07,0.98,0.9],sat:0.98,con:1.06,exp:1.2,back:[0.32,0.56,0.84],fog:[0.62,0.44,0.24],
    normal:0.6,spec:0.4,shadow:0.55,ao:0.34,rim:0.6,bloom:0.55,thr:0.84,rays:0.3,ca:0.001,vig:0.32,grain:0.045,
    part:[{n:220,k:'dust',col:[0.95,0.85,0.78],size:[0.014,0.03],vel:[0.04,0.02],drift:0.2,depth:[0.55,1.1],lit:0.55,amb:0.0},
          {n:40,k:'ash',col:[0.7,0.62,0.6],size:[0.04,0.07],vel:[0.06,0.18],drift:0.5,depth:[0.7,1.2],lit:0.8,amb:0.3}]},
  eden:{mist:0.16,mistLow:0.18,lift:[0.0,0.018,0.03],gain:[1.05,1.0,0.88],sat:1.1,con:1.18,exp:0.9,lmax:1.0,back:[0.35,0.58,0.85],fog:[0.5,0.34,0.17],
    hazeK:1.0,normal:0.7,spec:0.35,shadow:0.55,ao:0.36,rim:0.55,bloom:0.45,thr:1.0,rays:0.38,ca:0.0012,vig:0.28,grain:0.03,
    part:[{n:420,k:'pollen',col:[0.95,0.92,0.55],size:[0.016,0.034],vel:[0.12,0.05],drift:0.5,depth:[0.55,1.15],lit:0.6,amb:0.08},
          {n:140,k:'spore',col:[0.45,1.0,0.85],size:[0.018,0.034],vel:[0.03,-0.08],drift:0.4,depth:[0.55,1.15],emis:1.1,twinkle:1}]},
  seal:{hazeK:2.0,mist:0.14,mistLow:0.1,lift:[0.008,0.016,0.03],gain:[0.96,1.0,1.07],sat:0.86,con:1.16,exp:1.2,back:[0.3,0.52,0.8],fog:[0.6,0.42,0.22],
    normal:0.85,spec:0.75,shadow:0.68,ao:0.42,rim:0.75,bloom:0.5,thr:0.84,rays:0.42,ca:0.0012,vig:0.36,grain:0.03,
    part:[{n:220,k:'dust',col:[0.8,0.86,0.96],size:[0.012,0.028],vel:[0.02,0.03],drift:0.18,depth:[0.55,1.1],lit:0.55,amb:0.0},
          {n:50,k:'glint',col:[0.9,0.95,1.0],size:[0.012,0.022],vel:[0.0,0.05],drift:0.2,depth:[0.6,1.1],emis:1.2,twinkle:2}]},
  archive:{hazeK:2.3,mist:0.22,mistLow:0.18,lift:[0.02,0.013,0.008],gain:[1.09,0.98,0.84],sat:0.95,con:1.14,exp:1.2,back:[0.3,0.52,0.8],fog:[0.6,0.42,0.22],
    normal:0.7,spec:0.4,shadow:0.66,ao:0.4,rim:0.6,bloom:0.62,thr:0.82,rays:0.55,ca:0.001,vig:0.38,grain:0.04,
    part:[{n:360,k:'mote',col:[1.0,0.9,0.72],size:[0.014,0.03],vel:[0.03,0.03],drift:0.22,depth:[0.55,1.1],lit:0.9,amb:0.0},
          {n:30,k:'ember',col:[1.0,0.7,0.35],size:[0.015,0.028],vel:[0.02,-0.3],drift:0.3,depth:[0.6,1.05],emis:1.1,twinkle:1}]},
  surface:{mist:0.06,mistLow:0.1,lift:[0.008,0.012,0.022],gain:[1.04,1.02,0.96],sat:1.1,con:1.12,exp:1.0,lmax:1.12,hazeK:1.0,back:[0.6,0.7,0.85],fog:[0.42,0.28,0.12],
    normal:0.45,spec:0.25,shadow:0.4,ao:0.25,rim:0.5,bloom:0.48,thr:0.86,rays:0.7,ca:0.0008,vig:0.22,grain:0.025,
    part:[{n:300,k:'seed',col:[1.0,0.98,0.9],size:[0.02,0.04],vel:[0.6,-0.1],drift:0.5,depth:[0.5,1.15],lit:0.6,amb:0.5}]},
  finale:{lift:[0.01,0.01,0.012],gain:[1.03,1.0,0.96],sat:1.0,con:1.04,exp:1.0,bloom:0.55,thr:0.86,rays:0,ca:0.0008,vig:0.26,grain:0.03}
};
/* проверка «без эффектов» (tools/gfx.js --nofx): без блума, тумана, грейдинга, частиц, аберрации, глубины резкости —
   только арт и свет; хороший кадр должен держаться и так */
const GFX_NOFX=Z=>Object.assign({},Z,{bloom:0,ca:0,vig:0,grain:0,lift:[0,0,0],gain:[1,1,1],sat:1,con:1,mist:0,mistLow:0,fog:[0,0,0],nofx:1});
const GLSL_VS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
out vec2 v_uv;void main(){vec2 p=P[gl_VertexID];v_uv=p*0.5+0.5;gl_Position=vec4(p,0,1);}`;
const GLSL_HEAD=`#version 300 es
precision highp float;precision highp int;
in vec2 v_uv;out vec4 o;
vec3 lin(vec3 c){return pow(max(c,0.0),vec3(2.2));}
vec3 srgb(vec3 c){return pow(max(c,0.0),vec3(1.0/2.2));}
float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
`;
/* главный проход: слои + свет + тени + сущности + свечение + передний план → HDR */
const GLSL_COMPOSITE=GLSL_HEAD+`
uniform vec2 uRes;uniform int uMode;
uniform sampler2D uL0,uL1,uL2,uLG,uLF,uLE,uLand,uDyn,uLive,uEmit,uMask;
uniform vec4 uR0,uR1,uR2,uRG,uRF,uRE;uniform vec4 uHas;uniform vec3 uHas2;
uniform vec2 uMaskK;uniform vec3 uCam;
uniform int uLN;uniform vec4 uLP[${GFX_MAXL}];uniform vec4 uLC[${GFX_MAXL}];
uniform vec3 uAmb,uHaze,uVoid,uFog,uBackL;
uniform float uNormK,uSpecK,uShadowK,uAOK,uRimK,uDof,uBackBias;
uniform int uWN;uniform vec4 uW[8];
uniform int uCN;uniform vec3 uCut[10];
/* световой множитель: как старая карта света (sRGB), с небольшим запасом над 1.0 под свечение */
uniform float uLMax,uHazeK,uTime,uMist,uMistLow;
/* мягкое плечо светового множителя: до 75 % потолка — как есть, выше — плавно к потолку (жёсткий min давал кольца вокруг ламп и курьера) */
vec3 shoulder(vec3 s){vec3 k=vec3(uLMax*0.75),r=vec3(uLMax*0.25);return mix(s,k+r*(1.0-exp(-(s-k)/r)),step(k,s));}
/* дрейфующий туман: шум в мировых координатах, медленно плывёт */
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.3);a*=0.5;}return s;}vec3 LM(vec3 s){return lin(shoulder(max(s,vec3(0.0))));}
vec4 unp(vec4 c){return c.a>0.003?vec4(lin(c.rgb/c.a),c.a):vec4(0.0);}
vec4 lay(sampler2D s,vec4 r,vec2 p,float b){vec2 uv=(p-r.xy)/r.zw;if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)return vec4(0.0);return texture(s,uv,b);}
vec2 toWorld(vec2 p){return (p-uRes*0.5)/uCam.z+uCam.xy;}
float maskAt(vec2 w,float l){return textureLod(uMask,w*uMaskK,l).r;}
/* тень на стене: идём от точки стены к лампе по маске твёрдой геометрии */
float occl(vec2 wp,vec2 lw){float oc=0.0;vec2 d=lw-wp;float dl=length(d);if(dl<0.001)return 0.0;float L=min(dl,4.0);d=d/dl*L;
  for(int k=1;k<12;k++){float t=float(k)/12.0;float m=maskAt(wp+d*t,1.0);oc=max(oc,m*smoothstep(0.0,0.25,t*L));}
  return oc;}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y),q=p;
  /* волна давления импульса: линза по кольцу */
  for(int i=0;i<8;i++){if(i>=uWN)break;vec4 w=uW[i];vec2 d=q-w.xy;float dl=length(d),th=max(6.0,w.z*0.28);
    float ring=smoothstep(w.z-th,w.z-th*0.5,dl)*(1.0-smoothstep(w.z-th*0.15,w.z,dl));q-=d/max(dl,1.0)*w.w*th*ring;}
  if(uMode==1){vec4 f=texture(uDyn,q/uRes);o=vec4(lin(f.rgb),1.0);return;}
  vec2 wp=toWorld(q);
  /* рельеф игрового плана из яркости: нормаль «на лету» */
  vec3 N=vec3(0,0,1);
  if(uHas.w>0.5){vec2 tx=3.0/uRG.zw;vec2 guv=(q-uRG.xy)/uRG.zw;
    float hl=luma(texture(uLG,guv-vec2(tx.x,0)).rgb),hr=luma(texture(uLG,guv+vec2(tx.x,0)).rgb);
    float hu=luma(texture(uLG,guv-vec2(0,tx.y)).rgb),hd=luma(texture(uLG,guv+vec2(0,tx.y)).rgb);
    N=normalize(vec3(-(hr-hl)*3.2*uNormK,-(hd-hu)*3.2*uNormK,1.0));}
  vec4 g=unp(lay(uLG,uRG,q,0.0));
  float msk=maskAt(wp,0.0);bool wall=msk<0.5&&g.a>0.5&&uHas.w>0.5;
  /* свет: плоская сумма (для фона и сущностей), рельефная — для игрового плана, блик, направление на свет */
  vec3 sF=vec3(0.0),sN=vec3(0.0),sp=vec3(0.0);vec2 dir=vec2(0.0);
  for(int i=0;i<${GFX_MAXL};i++){if(i>=uLN)break;vec4 L=uLP[i];vec2 d=L.xy-q;float dist=length(d);if(dist>L.z)continue;
    float x=dist/L.z,at=pow(max(1.0-x,0.0),1.75)*L.w;vec3 Ld=normalize(vec3(d/L.z,0.42));
    float df=max(dot(N,Ld),0.0),sh=mix(1.0,0.38+0.92*df,uNormK);
    float oc=0.0;if(wall&&uLC[i].a>0.5&&uShadowK>0.0)oc=occl(wp,toWorld(L.xy));
    vec3 c=uLC[i].rgb*at;sF+=c;sN+=c*sh*(1.0-uShadowK*oc);
    /* блик — широкий и мягкий: узкий на шумной нормали давал вспышки-пиксели, мигавшие при ходьбе */
    vec3 H=normalize(Ld+vec3(0,0,1));sp+=c*pow(max(dot(N,H),0.0),10.0)*0.45*(1.0-oc);
    dir+=d/max(dist,1.0)*at*luma(uLC[i].rgb);}
  /* фон: дальние слои — в дымке, мягче, и ламп им достаётся меньше */
  vec3 col=lin(uVoid);
  vec3 hz=lin(uHaze)*uHazeK*(1.0+luma(sF)*0.6);
  if(uHas.x>0.5){vec4 c=unp(lay(uL0,uR0,q,uBackBias));col=mix(col,mix(c.rgb*LM(uAmb+sF*uBackL.x),hz,uFog.x),c.a);}
  if(uHas.y>0.5){vec4 c=unp(lay(uL1,uR1,q,uBackBias));col=mix(col,mix(c.rgb*LM(uAmb+sF*uBackL.y),hz,uFog.y),c.a);}
  if(uHas.z>0.5){vec4 c=unp(lay(uL2,uR2,q,uBackBias));col=mix(col,mix(c.rgb*LM(uAmb+sF*uBackL.z),hz,uFog.z),c.a);}
  /* туман в глубине: живёт и плывёт сквозь проёмы */
  float mist=fbm(wp*vec2(0.09,0.16)+vec2(uTime*0.035,uTime*0.008));col=mix(col,hz,clamp((mist-0.35)*1.6,0.0,1.0)*uMist);
  /* ориентиры зоны — в проёмах задней стены */
  vec4 ld=unp(texture(uLand,q/uRes));col=mix(col,ld.rgb*LM(uAmb+sF*0.6),ld.a);
  /* игровой план: статичный слой + машины; свет с рельефом, тени на стене, затенение у стыков */
  vec4 dy=unp(texture(uDyn,q/uRes));
  vec3 alb=g.rgb*g.a;float aw=g.a;alb=dy.rgb*dy.a+alb*(1.0-dy.a);aw=dy.a+aw*(1.0-dy.a);
  if(aw>0.002){vec3 A=alb/aw;
    float ao=wall?1.0-uAOK*smoothstep(0.05,0.6,maskAt(wp,2.6)):1.0;
    vec3 Lw=LM(uAmb*ao+sN);
    vec3 As=srgb(A);float mx=max(As.r,max(As.g,As.b)),mn=min(As.r,min(As.g,As.b)),sat=(mx-mn)/max(mx,0.001),lS=luma(As);
    float steel=(1.0-smoothstep(0.12,0.4,sat))*smoothstep(0.18,0.6,lS);
    float brass=smoothstep(0.25,0.55,sat)*smoothstep(0.28,0.6,lS)*step(As.b,As.r*0.7)*step(As.r*0.5,As.g);
    vec3 spc=min(sp*(vec3(steel*0.9)+A*2.2*brass)*uSpecK,vec3(0.18));
    vec3 lit=A*Lw+spc;
    /* лампы и раскалённое в арте светят сами: яркое и насыщенное либо почти белое (светлый мрамор — нет) */
    float em=max(smoothstep(0.45,0.8,luma(A))*smoothstep(0.3,0.6,sat),smoothstep(0.86,0.97,luma(A)));lit=max(lit,A*em*1.15);
    /* контактная тень сущностей на стене и полу */
    vec2 sd=vec2(0.0,7.0);
    float cs=textureLod(uLive,(q-sd)/uRes,3.0).a;float lv0=texture(uLive,q/uRes).a;
    lit*=1.0-0.42*cs*(1.0-lv0);
    col=mix(col,lit,aw);}
  /* дальние огни (окна, гирлянды, топки) — за стеной: видны только в проёмах, не поверх кладки и не поверх ближнего пейзажа */
  if(uHas2.y>0.5){vec4 e=lay(uLE,uRE,q,0.0);col+=lin(e.rgb)*0.85*(1.0-aw)*(1.0-ld.a*0.9);}
  /* низовой туман у пола кадра: пар, сырость, пыль */
  {float m2=fbm(wp*vec2(0.14,0.3)+vec2(-uTime*0.05,0.0));float lowk=smoothstep(0.5,1.0,p.y/uRes.y);col=mix(col,hz*1.1,clamp(m2*1.5-0.45,0.0,1.0)*lowk*uMistLow);}
  /* сущности, цели, кромки: мягкий свет (читаемость), тёплая/холодная окраска от ламп, контровая кромка */
  vec4 lv=unp(texture(uLive,q/uRes));
  if(lv.a>0.003){vec3 Ll=LM(uAmb+sF);float k=luma(Ll);vec3 tint=Ll/max(k,0.02);
    vec3 shade=mix(vec3(1.0),tint*clamp(0.72+k*1.1,0.78,1.22),0.32);
    float rim=0.0;float dl=length(dir);if(dl>0.0005){vec2 rd=dir/dl*2.5;rim=clamp(lv.a-texture(uLive,(q+rd)/uRes).a,0.0,1.0)*min(dl*6.0,1.0);}
    col=mix(col,lv.rgb*shade+Ll*rim*uRimK*1.6,lv.a);}
  /* свечение: частицы, лучи, топки и глаза механизмов — в HDR */
  vec4 e=texture(uEmit,q/uRes);col+=lin(e.rgb)*1.35;
  /* передний план: тёмные размытые силуэты у камеры; вокруг курьера и механизмов — прозрачнее */
  if(uHas2.x>0.5){vec4 f=unp(lay(uLF,uRF,p,uDof));if(f.a>0.003){float cut=1.0;
    for(int i=0;i<10;i++){if(i>=uCN)break;vec3 c=uCut[i];cut=min(cut,smoothstep(c.z*0.28,c.z,length(p-c.xy)));}
    col=mix(col,f.rgb*0.42*LM(uAmb*1.4+sF*0.3)+lin(uHaze)*0.03,f.a*cut*0.78);}}
  o=vec4(col,1.0);
}`;
/* частицы атмосферы: позиция считается в вершинном шейдере (дрейф, перенос, глубина), свет — от тех же ламп */
const GLSL_PART_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;layout(location=1) in vec4 aS;layout(location=2) in vec4 aT;
uniform vec2 uRes;uniform vec3 uCam;uniform float uT;uniform vec2 uVel;uniform float uDrift;uniform vec2 uSize;uniform vec2 uDepth;
uniform vec3 uCol;uniform float uLit,uAmbK,uEmis,uTw;uniform vec3 uAmb;
uniform int uLN;uniform vec4 uLP[${GFX_MAXL}];uniform vec4 uLC[${GFX_MAXL}];uniform vec4 uImp[4];
out vec2 vQ;out vec4 vC;out float vSoft;
void main(){
  float f=mix(uDepth.x,uDepth.y,aS.z);vec2 view=uRes/uCam.z;vec2 span=view/max(f,0.2)*1.15+2.0;
  vec2 b=aS.xy*span+uVel*uT*(0.6+0.8*aT.y)+vec2(sin(uT*0.31*(0.5+aT.x)+aT.z*6.28),cos(uT*0.27*(0.5+aT.y)+aT.w*6.28))*uDrift;
  vec2 rel=mod(b-uCam.xy*f+span*0.5,span)-span*0.5;
  vec2 sp=rel*uCam.z*f+uRes*0.5;
  /* толчок от удара: пылинки расходятся от точки и медленно возвращаются (позиция частицы — функция времени) */
  for(int i=0;i<4;i++){vec4 I=uImp[i];if(I.w<=0.001)continue;vec2 d=sp-I.xy;float L=length(d);if(L<I.z&&L>0.5)sp+=d/L*(I.z-L)*0.35*I.w;}
  float sz=mix(uSize.x,uSize.y,aS.w)*uCam.z*f*(f>1.0?1.0+(f-1.0)*3.0:1.0);sz=max(sz,1.2);
  vec3 s=vec3(0.0);
  for(int i=0;i<${GFX_MAXL};i++){if(i>=uLN)break;vec4 L=uLP[i];float d=length(L.xy-sp);if(d>L.z)continue;s+=uLC[i].rgb*pow(max(1.0-d/L.z,0.0),1.75)*L.w;}
  /* мерцание угольков и блёсток — медленное и мягкое: резкое мигание читалось как мигающий круг */
  float tw=uTw>0.0?0.75+0.25*sin(uT*(0.5+aT.x*0.8)+aT.z*20.0):1.0;
  float near=f>1.0?1.0/(1.0+(f-1.0)*5.0):1.0;float far=smoothstep(0.2,0.9,f);
  vec3 sl=mix(vec3(dot(s,vec3(0.333))),s,0.55);vec3 c=uCol*(pow(uAmb*uAmbK+sl*uLit,vec3(2.2))*0.6+uEmis*max(tw,0.0));
  /* яркость пылинки — ниже порога свечения: проходя через лампу, она не вспыхивает белым кругом */
  c=min(c,vec3(0.32));
  /* обычная пылинка — полупрозрачное пятнышко поверх фона (не прибавка света: над светлым металлом у лампы
     она вспыхивала белым и блум делал из неё мигающий круг); светятся сами только угольки и споры */
  float cov=uEmis>0.0?0.0:0.5*near*mix(0.4,1.0,far);
  vC=vec4(c*near*mix(0.5,1.0,far)*(uEmis>0.0?1.0:0.5),cov);vSoft=f>1.0?0.15:0.6;
  vQ=aQ;gl_Position=vec4(((sp+aQ*sz)/uRes*2.0-1.0)*vec2(1,-1),0,1);}`;
const GLSL_PART_FS=`#version 300 es
precision highp float;in vec2 vQ;in vec4 vC;in float vSoft;out vec4 o;
void main(){float r=length(vQ);if(r>1.0)discard;float a=pow(1.0-r,1.0+vSoft*2.0);o=vec4(vC.rgb*a,vC.a*a);}`;
/* блум: мягкий порог, лестница уменьшений, сложение при увеличении; лучи — радиальный сбор к ярким источникам */
const GLSL_PRE=GLSL_HEAD+`uniform sampler2D uSrc;uniform vec2 uTx;uniform float uThr;
void main(){vec3 c=vec3(0);for(int i=0;i<4;i++){vec2 o2=vec2(i&1,i>>1)-0.5;vec3 s=texture(uSrc,v_uv+o2*uTx).rgb;if(any(isnan(s))||any(isinf(s)))s=vec3(0);c+=min(s,vec3(64.0));}c*=0.25;
  float br=max(c.r,max(c.g,c.b)),k=max(br-uThr,0.0);k=k*k/(k+0.25);o=vec4(c*k/max(br,0.0001),1.0);}`;
const GLSL_DOWN=GLSL_HEAD+`uniform sampler2D uSrc;uniform vec2 uTx;
void main(){vec3 c=texture(uSrc,v_uv).rgb*4.0;c+=texture(uSrc,v_uv+vec2(-uTx.x,-uTx.y)).rgb+texture(uSrc,v_uv+vec2(uTx.x,-uTx.y)).rgb+texture(uSrc,v_uv+vec2(-uTx.x,uTx.y)).rgb+texture(uSrc,v_uv+uTx).rgb;o=vec4(c/8.0,1.0);}`;
const GLSL_UP=GLSL_HEAD+`uniform sampler2D uSrc;uniform vec2 uTx;
void main(){vec3 c=vec3(0);c+=texture(uSrc,v_uv+vec2(-uTx.x,0)).rgb*2.0+texture(uSrc,v_uv+vec2(uTx.x,0)).rgb*2.0+texture(uSrc,v_uv+vec2(0,-uTx.y)).rgb*2.0+texture(uSrc,v_uv+vec2(0,uTx.y)).rgb*2.0;
  c+=texture(uSrc,v_uv+vec2(-uTx.x,-uTx.y)).rgb+texture(uSrc,v_uv+vec2(uTx.x,-uTx.y)).rgb+texture(uSrc,v_uv+vec2(-uTx.x,uTx.y)).rgb+texture(uSrc,v_uv+uTx).rgb;o=vec4(c/12.0,1.0);}`;
const GLSL_RAYS=GLSL_HEAD+`uniform sampler2D uSrc;uniform int uRN;uniform vec4 uRP[3];
void main(){vec3 acc=vec3(0);for(int r=0;r<3;r++){if(r>=uRN)break;vec2 c=uRP[r].xy;vec2 d=(v_uv-c)/40.0;vec2 uv=v_uv;float w=1.0,s=0.0;vec3 a=vec3(0);
  for(int i=0;i<40;i++){uv-=d;a+=texture(uSrc,uv).rgb*w;s+=w;w*=0.955;}acc+=a/s*uRP[r].z*smoothstep(1.2,0.0,length(v_uv-c));}
  o=vec4(acc,1.0);}`;
const GLSL_FINAL=GLSL_HEAD+`uniform sampler2D uHdr,uBloom,uRays,uSnap,uOver;uniform vec2 uRes;
uniform float uBloomK,uRaysK,uExp,uSat,uCon,uCA,uVig,uGrain,uTime,uXf;uniform vec3 uLift,uGain;uniform float uHasOver;
vec3 tm(vec3 x){vec3 a=vec3(0.72);return mix(x,a+(1.0-a)*(1.0-exp(-(x-a)/(1.0-a))),step(a,x));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 uv=v_uv;vec2 dc=uv-0.5;float r2=dot(dc,dc);
  vec2 ca=dc*uCA*r2*4.0;
  vec3 h=vec3(texture(uHdr,uv-ca).r,texture(uHdr,uv).g,texture(uHdr,uv+ca).b);
  h+=texture(uBloom,uv).rgb*uBloomK+texture(uRays,uv).rgb*uRaysK;
  if(any(isnan(h))||any(isinf(h))||!(h.r>=0.0&&h.g>=0.0&&h.b>=0.0&&h.r<1e4&&h.g<1e4&&h.b<1e4))h=vec3(0);h=min(h,vec3(64.0));
  h*=uExp;vec3 c=tm(h);
  /* грейдинг зоны: тени, света, насыщенность, контраст (в перцептивном пространстве) */
  c=srgb(c);c=c*uGain+uLift*(1.0-c);float l=luma(c);c=mix(vec3(l),c,uSat);c=(c-0.5)*uCon+0.5;
  c*=1.0-uVig*smoothstep(0.18,0.62,r2*1.6);
  c+=(hash(uv*uRes+fract(uTime*7.13)*91.7)-0.5)*uGrain;
  c=clamp(c,0.0,1.0);
  if(uXf>0.0){vec3 s=texture(uSnap,uv).rgb;c=mix(c,s,uXf);}
  if(uHasOver>0.5){vec4 ov=texture(uOver,vec2(uv.x,1.0-uv.y));c=ov.rgb+c*(1.0-ov.a);}
  o=vec4(c,1.0);}`;
class GLRenderer{
  /* пробуем WebGL2 на отдельном холсте: программный рендер (SwiftShader) не тянет — тогда старый путь */
  static create(game,canvas){
    try{const q=location.search||'',force=/gl=1/.test(q),off=/gl=0/.test(q);if(off)return null;
      try{if(!force&&typeof Settings!=='undefined'&&Settings.get('gfx')==='canvas')return null;}catch(e){}
      const probe=document.createElement('canvas').getContext('webgl2');if(!probe)return null;
      const dbg=probe.getExtension('WEBGL_debug_renderer_info');const rn=dbg?probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL):probe.getParameter(probe.RENDERER);
      const lose=probe.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();
      if(!force&&/SwiftShader|llvmpipe|Software|Basic Render/i.test(String(rn)))return null;
      const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      if(!gl)return null;const r=new GLRenderer(game,gl,canvas);r.rendererName=String(rn);return r;}catch(e){console.warn('webgl',e);return null;}}
  constructor(game,gl,canvas){this.g=game;this.gl=gl;this.cv=canvas;this.ok=true;
    this.hf=!!gl.getExtension('EXT_color_buffer_float')||!!gl.getExtension('EXT_color_buffer_half_float');
    this.aniso=gl.getExtension('EXT_texture_filter_anisotropic');this.maxAniso=this.aniso?Math.min(8,gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)):0;
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ok=false;},false);
    const mk=()=>{const c=document.createElement('canvas');return {cv:c,ctx:c.getContext('2d')};};
    this.full=mk();this.land=mk();this.dyn=mk();this.live=mk();this.emit=mk();this.over=mk();
    this.vao=gl.createVertexArray();
    this.P={comp:this.prog(GLSL_VS,GLSL_COMPOSITE),pre:this.prog(GLSL_VS,GLSL_PRE),down:this.prog(GLSL_VS,GLSL_DOWN),up:this.prog(GLSL_VS,GLSL_UP),
      rays:this.prog(GLSL_VS,GLSL_RAYS),fin:this.prog(GLSL_VS,GLSL_FINAL),part:this.prog(GLSL_PART_VS,GLSL_PART_FS)};
    this.tex={};for(const k of ['land','dyn','live','emit','over'])this.tex[k]=this.newTex();
    this.blank=this.newTex();gl.bindTexture(gl.TEXTURE_2D,this.blank);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    this.layerTex=new Map();this.maskCache=new WeakMap();this.flashes=[];this.ghosts=[];this.partZone=null;this.xf=0;
    this.loc={};this.w=0;this.h=0;}
  /* ---------- служебное ---------- */
  prog(vs,fs){const gl=this.gl,sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
      if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o)+'\n'+s.split('\n').slice(0,3).join('\n'));return o;};
    const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));p.u={};return p;}
  U(p,n){if(!(n in p.u))p.u[n]=this.gl.getUniformLocation(p,n);return p.u[n];}
  newTex(){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  upload(t,cv,mips){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);
    if(mips){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      if(this.aniso)gl.texParameterf(gl.TEXTURE_2D,this.aniso.TEXTURE_MAX_ANISOTROPY_EXT,this.maxAniso);}
    else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);}
  fbo(w,h,hdr){const gl=this.gl,t=this.newTex();gl.bindTexture(gl.TEXTURE_2D,t);
    const f=hdr&&this.hf;gl.texImage2D(gl.TEXTURE_2D,0,f?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,f?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {t,fb,w,h};}
  free(F){if(!F)return;const gl=this.gl;gl.deleteTexture(F.t);gl.deleteFramebuffer(F.fb);}
  resize(w,h){if(w===this.w&&h===this.h)return;this.w=w;this.h=h;
    for(const k of ['full','land','dyn','live','emit','over']){this[k].cv.width=w;this[k].cv.height=h;}
    for(const k of ['hdr','ldr','snap','rays'])this.free(this[k]);(this.bl||[]).forEach(F=>this.free(F));(this.bu||[]).forEach(F=>this.free(F));
    this.hdr=this.fbo(w,h,true);this.ldr=this.fbo(w,h,false);this.snap=this.fbo(w,h,false);
    this.bl=[];this.bu=[];let bw=w>>1,bh=h>>1;for(let i=0;i<6&&bw>8&&bh>8;i++){this.bl.push(this.fbo(bw,bh,true));this.bu.push(this.fbo(bw,bh,true));bw>>=1;bh>>=1;}
    this.rays=this.fbo(Math.max(2,w>>2),Math.max(2,h>>2),true);}
  /* статичный слой комнаты → текстура один раз (с мип-уровнями и анизотропией) */
  layer(L){if(!L||!L.cv||!L.cv.width)return null;let t=this.layerTex.get(L.cv);
    if(!t){t=this.newTex();this.upload(t,L.cv,true);this.layerTex.set(L.cv,t);}return t;}
  purge(){for(const [cv,t] of this.layerTex)if(!cv.width){this.gl.deleteTexture(t);this.layerTex.delete(cv);}}
  /* маска твёрдой геометрии комнаты (8 px/м): тени на стене и затенение у стыков */
  mask(room){let m=this.maskCache.get(room);if(m)return m;const k=8,c=document.createElement('canvas');
    c.width=Math.max(4,Math.ceil(room.w*k));c.height=Math.max(4,Math.ceil(room.h*k));const x=c.getContext('2d');x.fillStyle='#fff';
    for(const s of room.solids||[])if(!s.hidden&&!s.ow)x.fillRect(s.x*k,s.y*k,s.w*k,s.h*k);
    for(const s of room.solids||[])if(!s.hidden&&s.ow)x.fillRect(s.x*k,s.y*k,s.w*k,Math.min(s.h,0.4)*k);
    const t=this.newTex();this.upload(t,c,true);m={t,w:room.w,h:room.h};this.maskCache.set(room,m);return m;}
  /* прямоугольник слоя на экране — как drawLayerTo, но для шейдера */
  rect(L,cam,zoom,f){const g=this.g,s=g.ppm*zoom,sc=s/g.bakePpm,cx=cam.x+cam.sx*f,cy=cam.y+cam.sy*f;
    let x0=(-cx*f)*s+g.vw/2,y0=(-cy*f)*s+g.vh/2;
    if(f!==1&&L.rw){const lw=L.cv.width/g.bakePpm,lh=L.cv.height/g.bakePpm;x0=g.vw/2+(-lw/2-(cx-L.rw/2)*f)*s;y0=g.vh/2+(-lh/2-(cy-L.rh/2)*f)*s;}
    return [x0,y0,L.cv.width*sc,L.cv.height*sc];}
  /* вспышка света от удара/импульса (только картинка) */
  flash(x,y,r,col,inten,life){this.flashes.push({x,y,r,col,i:inten,life,max:life});if(this.flashes.length>24)this.flashes.shift();}
  /* ---------- свет кадра ---------- */
  lights(room,cam,zoom,t,inMenu){const g=this.g,W=g.world,s=g.ppm*zoom,vw=g.vw,vh=g.vh,out=[];
    const put=(x,y,r,col,i,cast)=>{if(i<=0.01)return;const sx=(x-cam.cx)*s+vw/2,sy=(y-cam.cy)*s+vh/2,R=r*s;
      if(sx<-R||sy<-R||sx>vw+R||sy>vh+R)return;const c=hxc(col);out.push({sx,sy,R,i,c:[c[0]/255,c[1]/255,c[2]/255],cast:!!cast,w:i*R});};
    /* лампы рядом с сильным ударом коротко вспыхивают (только картинка) */
    const IMP=(g.renderer.impulses||[]).filter(q=>!q.np&&W&&W.time>=q.t0&&W.time-q.t0<0.5);
    const pulse=(x,y)=>{let p=0;for(const q of IMP){const d=Math.hypot(x-q.x,y-q.y);if(d<q.r*1.5)p+=q.k*Math.exp(-(W.time-q.t0)*7)*(1-d/(q.r*1.5));}return Math.min(p,1.5);};
    for(const lt of room.lights||[]){const fl=(lt.flicker?(0.74+0.26*Math.sin(t*lt.flicker*13+(lt.seed||0))):1)*(1+(IMP.length?pulse(lt.x,lt.y)*0.8:0));put(lt.x,lt.y,lt.r,lt.col||'#ffbe63',(lt.i===undefined?1:lt.i)*fl*0.98,lt.r>3.5);}
    if(room===W.room&&!inMenu&&g.state!=='menu'){
      for(const d of room.doors||[])put(d.x+d.w/2,d.y+d.h*0.45,3.2,g.gates.doorLocked(d)?'#ff8a6a':'#a8d8ff',0.55);
      if(room.checkpoint){const cp=room.checkpoint;put(cp.x,cp.y-2.5,6.5+2*g.lamps.nearK,'#ffc070',0.85+0.3*g.lamps.nearK,true);}
      for(const it of W.interactables)if(it.canUse(g.gs))put(it.x,it.y-0.9,3.0,'#ffd9a0',0.55);
      for(const pb of W.pushables)if(!pb.pushed)put(pb.x+pb.w/2,pb.y+Math.min(pb.h*0.5,1.6),2.8,'#ffd9a0',0.4);}
    const p=room.playerRef;if(p&&p.bottom!==undefined&&!p.dead)put(p.cx,p.cy,5.6,'#d7cdb9',0.42);
    const K0=GFX_KEY[room.zone],RS=GFX_ROOM[room.id],K=RS&&K0?{key:RS.key||K0.key,fill:RS.fill||K0.fill}:K0,diag=Math.hypot(vw,vh);
    if(K)for(const [kx,ky,kc,ki] of [K.key,K.fill]){const c=hxc(kc);out.push({sx:kx*vw,sy:ky*vh,R:diag*1.45,i:ki,c:[c[0]/255,c[1]/255,c[2]/255],cast:kc===K.key[2],w:1e9,key:1});}
    /* свечение механизмов и сцены светит и на окружение */
    for(const gl of g.renderer.glowSources)put(gl.x,gl.y,gl.r*1.5,gl.col,Math.min(1,gl.a*0.75));
    for(const f of this.flashes){const k=f.life/f.max;put(f.x,f.y,f.r*(0.7+0.3*k),f.col,f.i*k*k);}
    out.sort((a,b)=>b.w-a.w);if(out.length>GFX_MAXL)out.length=GFX_MAXL;
    /* тени от трёх главных ламп в кадре */
    let nc=0;for(const L of out){if(L.key)continue;if(L.cast&&nc<3)nc++;else L.cast=false;}
    return out;}
  setLights(p,L){const gl=this.gl,n=L.length,P=new Float32Array(GFX_MAXL*4),C=new Float32Array(GFX_MAXL*4);
    /* яркость лампы ограничена: никакая ошибка в эффектах не выбелит кадр */
    for(let i=0;i<n;i++){const l=L[i];P.set([l.sx,l.sy,l.R,Math.min(isFinite(l.i)?l.i:0,4)],i*4);C.set([l.c[0],l.c[1],l.c[2],l.cast?1:0],i*4);}
    gl.uniform1i(this.U(p,'uLN'),n);gl.uniform4fv(this.U(p,'uLP'),P);gl.uniform4fv(this.U(p,'uLC'),C);}
  /* ---------- частицы атмосферы ---------- */
  buildParticles(zk){const gl=this.gl,Z=GFX_ZONES[zk];this.partZone=zk;
    if(this.pbuf)for(const b of this.pbuf)gl.deleteVertexArray(b.vao);this.pbuf=[];
    if(!Z||!Z.part)return;
    if(!this.quad){this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);}
    for(const P of Z.part){const n=P.n,d=new Float32Array(n*8),r=rng(zk+P.k);for(let i=0;i<n*8;i++)d[i]=r();
      const vao=gl.createVertexArray();gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      const ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(1,1);
      gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(2,1);
      gl.bindVertexArray(null);this.pbuf.push({vao,P,n});}}
  drawParticles(zk,cam,zoom,t,L,amb){const gl=this.gl,g=this.g;if(this.partZone!==zk)this.buildParticles(zk);if(!this.pbuf||!this.pbuf.length)return;
    const p=this.P.part;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.hdr.fb);gl.viewport(0,0,this.w,this.h);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(this.U(p,'uRes'),g.vw,g.vh);gl.uniform3f(this.U(p,'uCam'),cam.cx,cam.cy,g.ppm*zoom);gl.uniform1f(this.U(p,'uT'),t);
    gl.uniform3f(this.U(p,'uAmb'),amb[0],amb[1],amb[2]);this.setLights(p,L);
    {const IM=new Float32Array(16),I=g.renderer.impulses||[],now=g.world?g.world.time:0,s=g.ppm*zoom;let n=0;
      for(let i=I.length-1;i>=0&&n<4;i--){const q=I[i],age=now-q.t0;if(q.np||age<0||age>2)continue;const env=Math.min(1.5,q.k)*Math.exp(-age*2.2)*(1-Math.exp(-age*30));
        IM.set([(q.x-cam.cx)*s+g.vw/2,(q.y-cam.cy)*s+g.vh/2,q.r*s,env],n*4);n++;}
      gl.uniform4fv(this.U(p,'uImp'),IM);}
    for(const b of this.pbuf){const P=b.P;gl.uniform2f(this.U(p,'uVel'),P.vel[0],P.vel[1]);gl.uniform1f(this.U(p,'uDrift'),P.drift);
      gl.uniform2f(this.U(p,'uSize'),P.size[0],P.size[1]);gl.uniform2f(this.U(p,'uDepth'),P.depth[0],P.depth[1]);
      gl.uniform3f(this.U(p,'uCol'),P.col[0],P.col[1],P.col[2]);gl.uniform1f(this.U(p,'uLit'),P.lit||0);gl.uniform1f(this.U(p,'uAmbK'),P.amb||0);
      gl.uniform1f(this.U(p,'uEmis'),P.emis||0);gl.uniform1f(this.U(p,'uTw'),P.twinkle||0);
      gl.bindVertexArray(b.vao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,b.n);}
    gl.bindVertexArray(null);gl.disable(gl.BLEND);}
  /* ---------- проходы ---------- */
  pass(p,F,binds,set){const gl=this.gl;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,F?F.fb:null);gl.viewport(0,0,F?F.w:this.w,F?F.h:this.h);
    let u=0;for(const k in binds){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,binds[k]||this.blank);gl.uniform1i(this.U(p,k),u);u++;}
    if(set)set(p);gl.bindVertexArray(this.vao);gl.drawArrays(gl.TRIANGLES,0,3);}
  bloom(Z){const gl=this.gl,P=this.P,B=this.bl,Uu=this.bu;
    this.pass(P.pre,B[0],{uSrc:this.hdr.t},p=>{gl.uniform2f(this.U(p,'uTx'),0.5/this.w,0.5/this.h);gl.uniform1f(this.U(p,'uThr'),Z.thr||0.85);});
    for(let i=1;i<B.length;i++)this.pass(P.down,B[i],{uSrc:B[i-1].t},p=>gl.uniform2f(this.U(p,'uTx'),1/B[i-1].w,1/B[i-1].h));
    /* вверх: каждый уровень = свой + размытый нижний */
    let src=B[B.length-1];
    for(let i=B.length-2;i>=0;i--){const dst=Uu[i];
      this.pass(P.up,dst,{uSrc:src.t},p=>gl.uniform2f(this.U(p,'uTx'),1/src.w,1/src.h));
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);this.pass(P.down,dst,{uSrc:B[i].t},p=>gl.uniform2f(this.U(p,'uTx'),0.5/B[i].w,0.5/B[i].h));gl.disable(gl.BLEND);
      src=dst;}
    return src;}
  /* ---------- кадр ---------- */
  render(dt){const g=this.g,gl=this.gl;if(!this.ok)return false;
    if(this.w!==g.vw||this.h!==g.vh)this.resize(g.vw,g.vh);
    this.purge();
    for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);
    const clr=k=>{const c=this[k].ctx;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,g.vw,g.vh);return c;};
    const O=clr('over');let overUsed=false;
    /* подъём по шахте финала — свой кадр целиком */
    if(g.state==='finale'){const F=this.full.ctx;F.setTransform(1,0,0,1,0,0);g.finale.drawScreen(F,dt);
      this.upload(this.tex.dyn,this.full.cv,false);
      this.pass(this.P.comp,this.hdr,{uDyn:this.tex.dyn},p=>{gl.uniform2f(this.U(p,'uRes'),g.vw,g.vh);gl.uniform1i(this.U(p,'uMode'),1);gl.uniform1i(this.U(p,'uWN'),0);});
      this.post(GFX_ZONES.finale,[],dt,false);return true;}
    const inMenu=g.state==='menu'||g.state==='intro',room=inMenu?g.menuRoom:g.world.room,par=inMenu?g.menuPar:g.world.parallax;
    if(!room||!par||!par.layers){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.w,this.h);gl.clearColor(0.02,0.02,0.03,1);gl.clear(gl.COLOR_BUFFER_BIT);return true;}
    const zone=zoneLook(room),zk=GFX_ZONES[room.zone]?room.zone:'sump',Z=GFX_ZONES[zk];
    const t=room.t=(room.t||0)+dt*(inMenu?1:g.timeScale),cam=g.camera,zoom=cam.zoom,R=g.renderer,W=g.world;
    R.beginFrame();
    /* живые буферы: ориентиры, машины, сущности, свечение */
    const Ld=clr('land'),D=clr('dyn'),Lc=clr('live'),E=clr('emit');
    if(!inMenu){drawLandmarks(Ld,room,g,t);HeroRooms.land(Ld,room,g,t);}
    R.worldTransform(E,cam,zoom);E.globalAlpha=0.85;drawLightShafts(E,room,t);HeroRooms.shaft(E,room,t);E.globalAlpha=1;
    R.worldTransform(D,cam,zoom);if(!inMenu){drawWorldDyn(D,room,t,g.gs);Ambient.draw(D,room,t,dt*g.timeScale,g);HeroRooms.dyn(D,room,t,g);}
    const vs=g.ppm*zoom,pv={x0:cam.cx-g.vw/vs/2,x1:cam.cx+g.vw/vs/2,y0:cam.cy-g.vh/vs/2,y1:cam.cy+g.vh/vs/2};
    g.particles.render(D,'norm',pv);
    if(!inMenu){R.worldTransform(Lc,cam,zoom);drawWorldLive(Lc,room,t,g.gs);R.readability(Lc,room,cam,zoom,t);this.drawGhosts(Lc,cam,zoom,dt);R.entities(Lc,room,t);this.captureGhost(dt);}
    R.worldTransform(E,cam,zoom);g.particles.render(E,'add',pv);
    if(g.finale.active&&!inMenu){R.worldTransform(Lc,cam,zoom);g.finale.drawWorld(Lc,t);}
    /* свечение механизмов (glowAdd) — в буфер свечения */
    {const s=g.ppm*zoom;E.setTransform(1,0,0,1,0,0);E.globalCompositeOperation='lighter';
      for(const q of R.glowSources){const sx=(q.x-cam.cx)*s+g.vw/2,sy=(q.y-cam.cy)*s+g.vh/2,r=Math.max(2,q.r*s);if(!(isFinite(sx)&&isFinite(sy)&&isFinite(r))){if(!this._nanG){this._nanG=1;console.error("glow NaN "+JSON.stringify(q)+" cam "+cam.cx+","+cam.cy+" s "+s);}continue;}if(sx<-r||sy<-r||sx>g.vw+r||sy>g.vh+r)continue;
        const gr=E.createRadialGradient(sx,sy,0,sx,sy,r);gr.addColorStop(0,rgba(q.col,q.a*0.8));gr.addColorStop(0.4,rgba(q.col,q.a*0.26));gr.addColorStop(1,rgba(q.col,0));
        E.fillStyle=gr;E.beginPath();E.arc(sx,sy,r,0,TAU);E.fill();}
      E.globalCompositeOperation='source-over';}
    /* поверх кадра: титры, тревога, голос стража, виньетки состояния */
    if(g.finale.active){g.finale.drawOverlay(O);overUsed=true;}
    if(!inMenu&&W.stage){BossStage.draw(O,W);overUsed=true;}
    if(!inMenu&&g.hud.bub){R.worldTransform(O,cam,zoom);const m=O.getTransform();O.setTransform(1,0,0,1,0,0);g.hud.drawBubble(O,m);overUsed=true;}
    if(!inMenu&&W.inPollen&&g.state==='play'){const k=1-clamp((W.filter||0)/W.filterCap(),0,1),gr=O.createRadialGradient(g.vw/2,g.vh/2,g.vh*0.25,g.vw/2,g.vh/2,g.vh*0.85);
      gr.addColorStop(0,'rgba(170,190,60,0)');gr.addColorStop(1,'rgba(150,175,40,'+(0.16+0.3*k)+')');O.fillStyle=gr;O.fillRect(0,0,g.vw,g.vh);overUsed=true;}
    if(!inMenu&&g.gs.hp<=1&&g.state==='play'){const p=0.5+0.5*Math.sin(t*4),gr=O.createRadialGradient(g.vw/2,g.vh/2,g.vh*0.3,g.vw/2,g.vh/2,g.vh*0.8);
      gr.addColorStop(0,'rgba(150,20,10,0)');gr.addColorStop(1,'rgba(150,20,10,'+(0.16+0.12*p)+')');O.fillStyle=gr;O.fillRect(0,0,g.vw,g.vh);overUsed=true;}
    /* в видеокарту */
    this.upload(this.tex.land,this.land.cv,false);this.upload(this.tex.dyn,this.dyn.cv,false);this.upload(this.tex.live,this.live.cv,true);this.upload(this.tex.emit,this.emit.cv,false);
    if(overUsed)this.upload(this.tex.over,this.over.cv,false);
    const Lt=this.lights(room,cam,zoom,t,inMenu),M=this.mask(room),A=room.amb||zone.ambRGB,amb=[A[0]/255,A[1]/255,A[2]/255];
    const lay={uL0:par.layers.far,uL1:par.layers.bg,uL2:par.layers.mid,uLG:par.layers.game,uLF:par.layers.fgd,uLE:par.layers.emit};
    const rk={uL0:'uR0',uL1:'uR1',uL2:'uR2',uLG:'uRG',uLF:'uRF',uLE:'uRE'},binds={},rects={};
    for(const k in lay){const L=lay[k];binds[k]=L?this.layer(L):null;if(L)rects[rk[k]]=this.rect(L,cam,zoom,L.f);}
    Object.assign(binds,{uLand:this.tex.land,uDyn:this.tex.dyn,uLive:this.tex.live,uEmit:this.tex.emit,uMask:M.t});
    /* волны давления: в экранные пиксели */
    const waves=(R.waves||[]).filter(w=>(w.life-=dt)>0);R.waves=waves;const s=g.ppm*zoom;
    const cuts=[];const pl=room.playerRef;
    if(pl&&pl.bottom!==undefined)cuts.push([(pl.cx-cam.cx)*s+g.vw/2,(pl.cy-cam.cy)*s+g.vh/2,6.2*s]);
    if(!inMenu)for(const e of W.enemies.concat(W.boss&&!W.boss.dead?[W.boss]:[])){if(e.dead||cuts.length>=10)continue;cuts.push([(e.cx-cam.cx)*s+g.vw/2,(e.cy-cam.cy)*s+g.vh/2,(e.isBoss?5.5:2.6)*s]);}
    const cinema=g.cinematic.active||g.finale.active;
    this.pass(this.P.comp,this.hdr,binds,p=>{
      gl.uniform2f(this.U(p,'uRes'),g.vw,g.vh);gl.uniform1i(this.U(p,'uMode'),0);
      for(const r in rects)gl.uniform4f(this.U(p,r),rects[r][0],rects[r][1],rects[r][2],rects[r][3]);
      gl.uniform4f(this.U(p,'uHas'),lay.uL0?1:0,lay.uL1?1:0,lay.uL2?1:0,lay.uLG?1:0);gl.uniform3f(this.U(p,'uHas2'),lay.uLF?1:0,lay.uLE?1:0,0);
      gl.uniform2f(this.U(p,'uMaskK'),1/M.w,1/M.h);gl.uniform3f(this.U(p,'uCam'),cam.cx,cam.cy,s);
      this.setLights(p,Lt);
      const hz=hxc(zone.haze),vd=hxc(zone.void);
      gl.uniform3f(this.U(p,'uAmb'),amb[0],amb[1],amb[2]);gl.uniform3f(this.U(p,'uHaze'),hz[0]/255,hz[1]/255,hz[2]/255);gl.uniform3f(this.U(p,'uVoid'),vd[0]/255,vd[1]/255,vd[2]/255);
      const fk=this.nofx?0:(zone.fogA||0.1)/0.1;gl.uniform3f(this.U(p,'uFog'),Z.fog[0]*fk,Z.fog[1]*fk,Z.fog[2]*fk);gl.uniform3f(this.U(p,'uBackL'),Z.back[0],Z.back[1],Z.back[2]);
      gl.uniform1f(this.U(p,'uNormK'),Z.normal);gl.uniform1f(this.U(p,'uSpecK'),Z.spec);gl.uniform1f(this.U(p,'uShadowK'),Z.shadow);gl.uniform1f(this.U(p,'uAOK'),Z.ao);
      gl.uniform1f(this.U(p,'uRimK'),Z.rim);gl.uniform1f(this.U(p,'uLMax'),Z.lmax||1.3);gl.uniform1f(this.U(p,'uTime'),t);gl.uniform1f(this.U(p,'uMist'),this.nofx?0:Z.mist||0.2);gl.uniform1f(this.U(p,'uMistLow'),this.nofx?0:Z.mistLow||0.15);gl.uniform1f(this.U(p,'uHazeK'),Z.hazeK||1.7);gl.uniform1f(this.U(p,'uDof'),0.0);gl.uniform1f(this.U(p,'uBackBias'),0.0);
      const WV=new Float32Array(32);let wn=0;
      for(const w of waves){if(wn>=8)break;const k=1-w.life/w.max,Rr=Math.max(8,w.r*s*(0.25+0.85*EZ.out(k)));WV.set([(w.x-cam.cx)*s+g.vw/2,(w.y-cam.cy)*s+g.vh/2,Rr,0.45*(1-k)],wn*4);wn++;}
      gl.uniform1i(this.U(p,'uWN'),wn);gl.uniform4fv(this.U(p,'uW'),WV);
      const CV=new Float32Array(30);cuts.forEach((c2,i)=>CV.set(c2,i*3));gl.uniform1i(this.U(p,'uCN'),cuts.length);gl.uniform3fv(this.U(p,'uCut'),CV);});
    if(!this.nofx)this.drawParticles(zk,cam,zoom,t,Lt,amb);
    /* грейдинг зала поверх грейдинга зоны (цветовой сценарий сцены) */
    const RG=GFX_ROOM[room.id],Zr=RG&&RG.grade?Object.assign({},Z,RG.grade):Z;
    this.post(this.nofx?GFX_NOFX(Zr):Zr,Lt,dt,overUsed);return true;}
  post(Z,Lt,dt,overUsed){const gl=this.gl,g=this.g,P=this.P;
    const bloom=this.bloom(Z);
    /* лучи от двух-трёх самых ярких ламп в кадре (и чуть за кадром) */
    const RP=new Float32Array(12);let rn=0;
    if(false)for(const L of Lt){if(rn>=3)break;if(L.R<g.vh*0.18||L.i<0.5)continue;
      const u=L.sx/g.vw,v=1-L.sy/g.vh;if(u<-0.3||u>1.3||v<-0.3||v>1.3)continue;RP.set([u,v,Math.min(1,L.i)*0.8,0],rn*4);rn++;}
    if(rn)this.pass(P.rays,this.rays,{uSrc:this.bl[0].t},p=>{gl.uniform1i(this.U(p,'uRN'),rn);gl.uniform4fv(this.U(p,'uRP'),RP);});
    if(g.xfT>0&&this.xf>0){this.xf=EZ.io(clamp(g.xfT/g.xfD,0,1));g.xfT-=dt;}else this.xf=0;
    const fin=(F)=>this.pass(P.fin,F,{uHdr:this.hdr.t,uBloom:bloom.t,uRays:rn?this.rays.t:null,uSnap:this.snap.t,uOver:overUsed?this.tex.over:null},p=>{
      gl.uniform2f(this.U(p,'uRes'),g.vw,g.vh);gl.uniform1f(this.U(p,'uBloomK'),Z.bloom||0.5);gl.uniform1f(this.U(p,'uRaysK'),rn?Z.rays:0);
      gl.uniform1f(this.U(p,'uExp'),Z.exp||1);gl.uniform1f(this.U(p,'uSat'),Z.sat||1);gl.uniform1f(this.U(p,'uCon'),Z.con||1);gl.uniform1f(this.U(p,'uCA'),Z.ca||0);
      gl.uniform1f(this.U(p,'uVig'),Z.vig||0.3);gl.uniform1f(this.U(p,'uGrain'),Z.grain||0.03);gl.uniform1f(this.U(p,'uTime'),performance.now()/1000);
      gl.uniform3f(this.U(p,'uLift'),Z.lift[0],Z.lift[1],Z.lift[2]);gl.uniform3f(this.U(p,'uGain'),Z.gain[0],Z.gain[1],Z.gain[2]);
      gl.uniform1f(this.U(p,'uXf'),this.xf);gl.uniform1f(this.U(p,'uHasOver'),overUsed?1:0);});
    fin(this.ldr);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.ldr.fb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
    gl.blitFramebuffer(0,0,this.w,this.h,0,0,this.w,this.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);}
  /* снимок кадра для растворения (пересборка комнаты) */
  snapshot(){const gl=this.gl;if(!this.ldr)return;gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.ldr.fb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.snap.fb);
    gl.blitFramebuffer(0,0,this.w,this.h,0,0,this.w,this.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);this.xf=1;}
  /* след рывка: силуэт курьера тает позади (только картинка) */
  captureGhost(dt){const p=this.g.world.player;this.gT=(this.gT||0)-dt;if(!p||!(p.dashT>0)||this.gT>0)return;this.gT=0.035;
    const R=this.g.renderer,A=R.oa;if(!A||!A.width)return;const b=p.spriteBounds();if(!b)return;
    const c=document.createElement('canvas'),s=this.g.ppm*this.g.camera.zoom,W=Math.ceil(b.w*s)+8,H=Math.ceil(b.h*s)+8;if(W>1024||H>1024)return;
    c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(A,0,0,W,H,0,0,W,H);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,196,120,.85)';x.fillRect(0,0,W,H);
    this.ghosts.push({c,x:b.x,y:b.y,life:0.26,max:0.26});if(this.ghosts.length>8)this.ghosts.shift();}
  drawGhosts(c,cam,zoom,dt){const s=this.g.ppm*zoom;for(const q of this.ghosts)q.life-=dt;this.ghosts=this.ghosts.filter(q=>q.life>0);if(!this.ghosts.length)return;
    c.save();c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='lighter';
    for(const q of this.ghosts){c.globalAlpha=0.32*(q.life/q.max);c.drawImage(q.c,Math.round((q.x-cam.cx)*s+this.g.vw/2-4),Math.round((q.y-cam.cy)*s+this.g.vh/2-4));}
    c.restore();}
}
