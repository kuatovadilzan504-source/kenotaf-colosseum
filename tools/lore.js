/* Проверка лора: мир КЕНОТАФа — мир механизмов, людей в нём нет и не было (как насекомые у Hollow Knight).
   Сканирует все строки игры (game/js/, game/index.html) на слова о людях, людском теле, семье, еде.
     node tools/lore.js */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
/* корни слов; \b в кириллице не работает — границы проверяются вручную */
const BANNED=['ЛЮД','ЧЕЛОВЕ','ЖЕНЩИН','МУЖЧИН','МАЛЬЧИ','ДЕВОЧК','ДЕВУШК','РЕБЁН','РЕБЕН','ДЕТЕЙ','ДЕТИ','ДЕТСК','ДЕТСТВ',
  'МАМА','МАМЫ','МАМЕ','МАМУ','ПАПА','СЫН','ДОЧЬ','ДОЧЕР','УЖИН','ОБЕД','ЗАВТРАК','ХЛЕБ','СУХАР','ЕДА','ЕДЫ','КРОВЬ','КРОВИ','ПЛОТЬ'];
/* слова, которые содержат корень случайно */
const ALLOW=['ПРИЛЮД','СЫНЬ','ЕДАЛ'];
const files=[];const walk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(/\.(js|html)$/.test(p))files.push(p);}};
walk(path.join(ROOT,'game','js'));files.push(path.join(ROOT,'game','index.html'));
const hits=[];
for(const f of files){const s=fs.readFileSync(f,'utf8');const lines=s.split('\n');
  lines.forEach((ln,i)=>{
    /* только текст в кавычках (строки игры), не имена переменных и комментарии */
    const strs=ln.match(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g)||[];
    for(const q of strs){const U=q.toUpperCase().replace(/Ё/g,'Ё');
      const words=U.split(/[^А-ЯЁ]+/).filter(Boolean);
      for(const w of words){if(ALLOW.some(a=>w.indexOf(a)>=0))continue;
        const b=BANNED.find(r=>w.indexOf(r)===0||(r.length>=5&&w.indexOf(r)>=0));
        if(b)hits.push(path.relative(ROOT,f)+':'+(i+1)+'  «'+w+'»  '+q.slice(0,90));}}});}
for(const h of hits)console.log('  '+h);
console.log(hits.length?'LORE: '+hits.length+' упоминаний людей':'LORE: OK · строк проверено во всех '+files.length+' файлах');
process.exit(hits.length?1:0);
