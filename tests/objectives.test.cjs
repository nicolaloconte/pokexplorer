'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const storage=new Map();global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const obj=require('../js/objectives-core.js');
const A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';const B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
function reset(){storage.clear();obj.setOwner(A);}
test('Shiny rate is 1 in 2,000',()=>assert.equal(require('../js/pokedex-core.js').SHINY_RATE,2000));
test('17 missions with correct titles, goals, and blue/unlocked states',()=>{
 reset();const q=obj.values({entries:()=>({species:[],variants:[]})}).quests;
 assert.equal(q.length,17);assert.equal(q[12].goal,151);assert.equal(q[16].name,'Il Trio Leggendario');assert.ok(q.every(x=>!x.complete));
});
test('Run counters count confirmed starts and wins only once',()=>{
 reset();obj.record('run_start','r-1');obj.record('run_start','r-1');obj.record('run_win','r-1',{solo:true});
 assert.equal(obj.values().runs,1);assert.equal(obj.values().wins,1);assert.equal(obj.values().championUnlocked,true);
});
test('Five shiny catches count duplicates, one legendary shiny completes the quest',()=>{
 reset();obj.record('run_start','r-2');
 for(let i=0;i<5;i++)obj.record('catch','r-2',{species:25,shiny:true});
 obj.record('catch','r-2',{species:144,shiny:true});
 const v=obj.values();assert.equal(v.catches,6);assert.equal(v.quests[14].complete,true);
 assert.equal(v.quests[15].complete,true);assert.equal(v.quests[13].complete,true);
});
test('Cumulative trio across runs, species deduped',()=>{
 reset();for(const id of [144,144,145,146])obj.record('catch','r-birds',{species:id,shiny:false});
 assert.equal(obj.values().quests[16].complete,true);
});
test('Solo Champion unavailable to guest/local; account isolated',()=>{
 reset();obj.record('run_win','r-3',{solo:true});assert.equal(obj.unlockChampion(),true);
 obj.setOwner(B);assert.equal(obj.unlockChampion(),false);assert.equal(obj.values().wins,0);
 obj.setOwner('guest',{guestMode:true});obj.record('run_win','r-3',{solo:true});assert.equal(obj.unlockChampion(),false);
 obj.setOwner('guest',{guestMode:true});assert.equal(obj.values().wins,0);
 obj.setOwner(A);assert.equal(obj.unlockChampion(),true);
});
test('Older checkpoints do not fabricate historical catches or a solo unlock',()=>{
 reset();obj.importCheckpoint({runId:'legacy-1',game:{floor:75,badges:[1,2],adventureCompleted:true}});
 const v=obj.values();assert.equal(v.runs,1);assert.equal(v.wins,1);assert.equal(v.catches,0);
 assert.equal(v.championUnlocked,false);assert.equal(v.quests[5].complete,true);
});
test('Cloud merges remote events and uploads unsent events without erasing them',async()=>{
 reset();obj.record('run_start','r-cloud');let sent=[];
 const cloud={from:()=>({select:async()=>({data:[{event_id:'run_win:r-remote',run_id:'r-remote',kind:'run_win',metadata:{solo:false}}],error:null}),upsert:async rows=>{sent.push(...rows);return {error:null};}})};
 await obj.initCloud(cloud);assert.equal(sent.length,1);assert.equal(obj.values().runs,1);assert.equal(obj.values().wins,1);
 assert.equal(obj.values().pending,0);
});
test('Cloud failure preserves pending events for retry',async()=>{
 reset();obj.record('run_start','r-error');let fail=true;
 const cloud={from:()=>({select:async()=>({data:[],error:null}),upsert:async()=>({error:fail?{message:'network down'}:null})})};
 await assert.rejects(obj.initCloud(cloud));assert.equal(obj.values().pending,1);
 fail=false;await obj.flush();assert.equal(obj.values().pending,0);
});
