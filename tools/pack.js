/* Упаковка для itch.io: dist/kenotaf-itch.zip — ОДИН файл index.html: стили и все скрипты встроены
   (порядок — как в исходном index.html). Лимит itch — 1000 файлов в архиве; инструменты, тесты,
   снимки, документы и .git в сборку не попадают никогда. Рядом — dist/index.html для проверки.
   Без зависимостей (zlib из Node). Загрузить на itch: Kind of project — HTML,
   файл отметить «This file will be played in the browser».
     node tools/pack.js */
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..');
const MAX_FILES=1000;
const OUT=path.join(ROOT,'dist','kenotaf-itch.zip'),GAME=path.join(ROOT,'game');

/* index.html со встроенными css/style.css и js/*.js. «</script» внутри кода экранируется */
function bundle(){let html=fs.readFileSync(path.join(GAME,'index.html'),'utf8'),n=0;
  /* замена функцией: «$» в коде не трактуется как ссылка на группу */
  html=html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g,(m,f)=>'<style>\n'+fs.readFileSync(path.join(GAME,f),'utf8')+'\n</style>');
  html=html.replace(/<script src="(js\/[^"]+)"><\/script>/g,(m,f)=>{n++;
    return '<script>/* '+f+' */\n'+fs.readFileSync(path.join(GAME,f),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>';});
  if(/<script src="js\//.test(html)||/href="css\//.test(html))throw new Error('остались внешние ссылки на js/ или css/');
  return {html,n};}
const CRC=(()=>{const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function dos(d){return {time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),
  date:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};}

const B=bundle();fs.mkdirSync(path.join(ROOT,'dist'),{recursive:true});fs.writeFileSync(path.join(ROOT,'dist','index.html'),B.html);
const files=[{name:'index.html',raw:Buffer.from(B.html,'utf8')}];
if(files.length>MAX_FILES)throw new Error('файлов '+files.length+' > '+MAX_FILES);
const locals=[],central=[];let off=0;
for(const f of files){
  const name=Buffer.from(f.name,'utf8'),raw=f.raw,def=zlib.deflateRawSync(raw,{level:9});
  const crc=crc32(raw),{time,date}=dos(new Date());
  const lh=Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x0800,6);lh.writeUInt16LE(8,8);
  lh.writeUInt16LE(time,10);lh.writeUInt16LE(date,12);lh.writeUInt32LE(crc,14);
  lh.writeUInt32LE(def.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(name.length,26);lh.writeUInt16LE(0,28);
  locals.push(lh,name,def);
  const ch=Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x0800,8);ch.writeUInt16LE(8,10);
  ch.writeUInt16LE(time,12);ch.writeUInt16LE(date,14);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(def.length,20);
  ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(name.length,28);ch.writeUInt32LE(off,42);
  central.push(ch,name);
  off+=30+name.length+def.length;
}
const cd=Buffer.concat(central),end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
end.writeUInt32LE(cd.length,12);end.writeUInt32LE(off,16);
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,Buffer.concat([...locals,cd,end]));
console.log('dist/kenotaf-itch.zip · файлов: '+files.length+' (встроено скриптов: '+B.n+')'+' · '+(fs.statSync(OUT).size/1024).toFixed(1)+' КБ');
