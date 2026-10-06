"use strict";
/* ============================== ГОЛОСА ==============================
   Кто-то говорит — это слышно. Реплика печатается по буквам, и на каждом слоге звучит голос
   говорящего: короткий щелчок с формантой (у механизмов нет связок — есть мембраны, раструбы,
   язычки). У каждого — свой тембр и высота; голоса с фонограмм (Курьер 38, Совет, Архивариус)
   потрескивают иглой. Системные надписи печатаются молча. */
const VOICES={
  courier:{f:150,v:0.16,type:'triangle',form:1150,q:2.4,gap:0.085,peak:0.05},
  postmaster:{f:228,v:0.2,type:'triangle',form:1650,q:3.2,gap:0.075,peak:0.045},
  gardener:{f:112,v:0.12,type:'sawtooth',form:720,q:2.2,gap:0.1,peak:0.05},
  c38:{f:168,v:0.15,type:'triangle',form:1250,q:3,gap:0.085,peak:0.045,crackle:true},
  council:{f:98,v:0.08,type:'sawtooth',form:640,q:2.6,gap:0.11,peak:0.05,crackle:true},
  archivist:{f:88,v:0.1,type:'sawtooth',form:560,q:2.8,gap:0.1,peak:0.065,crackle:true},
  overseer:{f:64,v:0.1,type:'square',form:420,q:2,gap:0.11,peak:0.07},
  primarch:{f:78,v:0.08,type:'sawtooth',form:520,q:2.4,gap:0.1,peak:0.065},
  uprooter:{f:104,v:0.14,type:'sawtooth',form:680,q:2,gap:0.1,peak:0.06},
  regulator:{f:146,v:0.05,type:'square',form:1900,q:5,gap:0.07,peak:0.05},
  /* цилиндры и последние фонограммы: чужие голоса с иглы — тише, с треском */
  record:{f:126,v:0.26,type:'triangle',form:1000,q:2.4,gap:0.095,peak:0.032,crackle:true}
};
/* подпись говорящего → голос (имена стражей приходят строкой) */
const VOICE_BY_NAME={'АРХИВАРИУС':'archivist','НАДСМОТРЩИК':'overseer','ЦЕНЗОР-ПРИМАРХ':'primarch','КОРЧЕВАТЕЛЬ':'uprooter','РЕГУЛЯТОР':'regulator',
  'ПОЧТМЕЙСТЕР':'postmaster','САДОВНИК':'gardener','СОВЕТ':'council','КУРЬЕР 38':'c38'};
function voiceOf(sp,label){if(sp&&VOICES[sp])return sp;if(label){const k=String(label).split(' · ')[0];if(VOICE_BY_NAME[k])return VOICE_BY_NAME[k];}return null;}
const TYPE_CPS=44;                         /* букв в секунду при печати */
const SPEECH_VOWELS='АЕЁИОУЫЭЮЯ';
/* сколько держать строку после того, как она допечатана: по длине — чтобы успеть прочитать */
function readTime(text){return clamp(1.8+String(text||'').length*0.058,3.0,9);}
/* печать строки: возвращает число видимых букв; на гласных — слог голоса */
class Typer{
  constructor(text,voice){this.text=String(text||'');this.voice=voice;this.n=0;this.last=-1;this.gapT=0;}
  get done(){return this.n>=this.text.length;}
  finish(){this.n=this.text.length;}
  step(dt,audio){if(this.done)return false;const n0=Math.floor(this.n);this.n=Math.min(this.text.length,this.n+dt*TYPE_CPS);this.gapT-=dt;
    const n1=Math.floor(this.n);
    if(this.voice&&audio)for(let i=n0;i<n1;i++)if(SPEECH_VOWELS.indexOf(this.text[i])>=0&&this.gapT<=0){audio.syllable(VOICES[this.voice]);this.gapT=VOICES[this.voice].gap;break;}
    return n1!==n0;}
  html(){const n=Math.floor(this.n),a=this.text.slice(0,n),b=this.text.slice(n);
    return escHTML(a)+(b?'<span class="rest">'+escHTML(b)+'</span>':'');}
}
function escHTML(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
