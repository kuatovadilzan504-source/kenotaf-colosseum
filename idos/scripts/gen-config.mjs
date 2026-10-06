// Generates the Title's DataCollections + Leaderboard config for both namespaces:
//   kz_  — what players use;  dev_ — a twin for tests (owner may delete → scripts clean up after themselves).
import fs from "node:fs";
const BLOCKED = ["http://","https://","www.","t.me/",".com",".ru","хуй","пизд","бляд","ебан","fuck","shit","nigg"];
const STATIONS = ["hub","atrium","post","eden","seal","archive"];
const col = (p, dev) => ({
  [p+"ledger"]: { Kind:"UserOwned", Mode:"Strict", DisplayName:"Книга учёта Совета",
    Description:"Записи о прочитанном, победах и концовках курьера; sig — подпись Solana-транзакции, в которую запись запечатана",
    Fields:{ key:{Type:"String",Required:true,Immutable:true,Indexed:true,MaxLength:64},
      kind:{Type:"String",Required:true,Immutable:true,Indexed:true,Enum:["oath","read","guard","stand","exam","end"]},
      ref:{Type:"String",Immutable:true,MaxLength:64}, n:{Type:"Int",Immutable:true},
      wallet:{Type:"String",Immutable:true,MaxLength:64}, sig:{Type:"String",MaxLength:120} },
    SortKeys:[{ID:"byCreated",Components:[{Field:"createdAt",Descending:true}]},{ID:"byKindCreated",Components:[{Field:"kind"},{Field:"createdAt",Descending:true}]}],
    Counters:[{ID:"byKey",Kind:"Count",GroupBy:"key"},{ID:"byKind",Kind:"Count",GroupBy:"kind"}],
    Access:{Read:[{Mode:"Authenticated"}],Create:[{Mode:"Authenticated"}],Update:[{Mode:"Owner"}],...(dev?{Delete:[{Mode:"Owner"}]}:{})},
    Limits:{MaxItemsPerOwner:300,MaxItemBytes:1024} },
  [p+"letters"]: { Kind:"Shared", Mode:"Strict", DisplayName:"Письма курьеров",
    Description:"Короткие письма, оставленные курьерами на станциях пневмопочты",
    Fields:{ text:{Type:"Text",Required:true,Immutable:true,Indexed:true,MaxLength:140},
      station:{Type:"String",Required:true,Immutable:true,Indexed:true,Enum:STATIONS},
      authorNo:{Type:"Int",Immutable:true,Indexed:true}, authorName:{Type:"String",Immutable:true,MaxLength:32},
      hidden:{Type:"Bool",Indexed:true,ClientWritable:false,Default:"false"} },
    SortKeys:[{ID:"byCreated",Components:[{Field:"createdAt",Descending:true}]},{ID:"byStation",Components:[{Field:"station"},{Field:"createdAt",Descending:true}]}],
    Access:{Read:[{Mode:"Authenticated"}],Create:[{Mode:"Authenticated"}],Delete:[{Mode:"Owner"},{Mode:"Role",Role:"moderator"}]},
    Economy:{OnCreate:{Cost:{Entries:[{Type:"VirtualCurrency",CurrencyID:"Stamps",Amount:1}]}}},
    Limits:{MaxItemsPerOwner:20,MaxItemBytes:2048}, Moderation:{BlockedTerms:BLOCKED} },
  [p+"reads"]: { Kind:"UserOwned", Mode:"Strict", DisplayName:"Прочитанные письма",
    Description:"Курьер прочёл письмо другого курьера и получил за это марку",
    Fields:{ letterId:{Type:"String",Required:true,Immutable:true,Indexed:true,MaxLength:64}, authorNo:{Type:"Int",Immutable:true} },
    SortKeys:[{ID:"byCreated",Components:[{Field:"createdAt",Descending:true}]}],
    Counters:[{ID:"byLetter",Kind:"Count",GroupBy:"letterId"}],
    Access:{Read:[{Mode:"Authenticated"}],Create:[{Mode:"Authenticated"}],...(dev?{Delete:[{Mode:"Owner"}]}:{})},
    Economy:{OnCreate:{Grant:{Entries:[{Type:"VirtualCurrency",CurrencyID:"Stamps",Amount:1}]}}},
    Limits:{MaxItemsPerOwner:400,MaxItemBytes:512} },
});
const boards = (p) => {
  const names = {stand_z1:["Стенд обходчиков","мс","BestTime"],stand_z2:["Крышный пробег","мс","BestTime"],stand_z3:["Траверса теплиц","мс","BestTime"],
    stand_z4:["Проба хода","мс","BestTime"],stand_z5:["Экзамен почтальона","мс","BestTime"],exam:["Экзамен Совета","мс","BestTime"],lore:["Прочитано цилиндров","цилиндров","BestScore"]};
  const o = {};
  for (const [id,[n,u,a]] of Object.entries(names)) o[p+id] = { LeaderboardID:p+id, DisplayName:n, ScoreDisplayName:u, IsEnabled:true, ScoreAggregation:a,
    Schedule:{Mode:"Cyclic",IsActive:true,Cyclic:{Reset:"Never"}}, TopUsersLimit:50, MinScoreToEnterTop:1, BracketSize:0 };
  return o;
};
const dc = { Enabled:true, Roles:{moderator:{DisplayName:"Модератор Совета",Description:"Может удалять письма курьеров"}},
  Collections:{ ...col("kz_",false), ...col("dev_",true) } };
const lb = { Definitions:{ ...boards("kz_"), ...boards("dev_") } };
fs.writeFileSync("scripts/_dc.json", JSON.stringify(dc)); fs.writeFileSync("scripts/_lb.json", JSON.stringify(lb));
console.log(fs.statSync("scripts/_dc.json").size, fs.statSync("scripts/_lb.json").size);
