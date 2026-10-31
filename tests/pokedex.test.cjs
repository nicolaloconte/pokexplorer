/* Run: node --test tests/pokedex.test.cjs. Offline invariants; no production DB. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const memory=new Map();
global.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const dex=require('../js/pokedex-core.js');
const accountA='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const accountB='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
function reset(){memory.clear();dex.setOwner(accountA);}
function mon(id=25,gender='male',isShiny=false){return {id,name:'PIKACHU',gender,isShiny};}
test('Kanto gender rules and sex-specific sprite selection',()=>{
 assert.equal(dex.rollGender(132,-1),'genderless');
 assert.equal(dex.rollGender(29,8),'female');
 assert.equal(dex.rollGender(32,0),'male');
 assert.equal(dex.rollGender(25,4,()=>0.1),'female');
 assert.equal(dex.rollGender(25,4,()=>0.9),'male');
 const sprites={front_default:'n',front_female:'f',front_shiny:'s',front_shiny_female:'sf',back_default:'b'};
 assert.equal(dex.spriteFor({sprites},'female',true),'sf');
 assert.equal(dex.spriteFor({sprites},'male',true),'s');
 assert.equal(dex.spriteFor({sprites},'female',false),'f');
 assert.equal(dex.spriteFor({sprites},'genderless',false,true),'b');
});
test('Variants are secret until observed; species completion independent',()=>{
 reset();dex.record(mon(),'caught','Piano 1');
 assert.equal(dex.counts().caught,1);
 assert.equal(dex.getVariants(25).length,1);
 assert.equal(dex.getVariants(25)[0].sex,'male');
 dex.record(mon(25,'female',true),'seen','Piano 3');
 assert.equal(dex.counts().seen,1);
 assert.equal(dex.getVariants(25).length,2);
 assert.equal(dex.getVariants(25).find(v=>v.shiny).first_caught_at,null);
 assert.equal(dex.getVariants(25).some(v=>v.sex==='female'&&!v.shiny),false);
 assert.equal(dex.getVariants(24).length,0);
});
test('First sighting and first catch never regress; repeats do not expand queue',()=>{
 reset();dex.record(mon(),'seen','Piano 1');
 const seen=dex.getSpecies(25).first_seen_at;
 dex.record(mon(),'seen','Piano 2');
 assert.equal(dex.state().pending,1);
 dex.record(mon(),'caught','Piano 3');
 const caught=dex.getSpecies(25).first_caught_at;
 dex.record(mon(),'seen','Piano 7');
 dex.record(mon(),'caught','Piano 9');
 assert.equal(dex.getSpecies(25).first_seen_at,seen);
 assert.equal(dex.getSpecies(25).first_caught_at,caught);
 assert.equal(dex.state().pending,2);
});
test('Owner data isolation and no guest persistence',()=>{
 reset();dex.record(mon(),'caught');dex.setOwner(accountB);
 assert.equal(dex.getSpecies(25),null);dex.record(mon(7,'female'),'seen');
 dex.setOwner(accountA);assert.equal(dex.counts().caught,1);
 dex.setOwner('guest',{guestMode:true});dex.record(mon(6,'male',true),'caught');
 assert.equal(dex.counts().caught,1);dex.setOwner('guest',{guestMode:true});
 assert.equal(dex.counts().caught,0);
 dex.setOwner(accountB);assert.equal(dex.getSpecies(7).first_caught_at,null);
});
test('Legacy checkpoints only import species; no invented gender/shiny',()=>{
 reset();dex.importLegacyTeam({game:{team:[{id:25,name:'PIKACHU'},{id:1,name:'BULBASAUR',gender:'female',isShiny:false}]}});
 assert.equal(dex.getSpecies(25).imported_from_legacy,true);
 assert.ok(dex.getSpecies(25).first_caught_at);
 assert.equal(dex.getVariants(25).length,0);
 assert.equal(dex.getSpecies(1),null);
});
test('Remote sync replays offline queue and merges remote progress',async()=>{
 reset();dex.record(mon(),'seen','floor 1');dex.record(mon(25,'female',true),'caught','floor 2');
 let calls=[];
 const client={
  from:(table)=>({select:async()=>({data:table.endsWith('species')?[]:[],error:null})}),
  rpc:async(name,args)=>{calls.push([name,args]);return {error:null};}
 };
 await dex.initCloud(client);
 assert.equal(calls.length,2);assert.equal(dex.state().pending,0);
 assert.equal(dex.state().syncStatus,'synchronized');
 dex.ingest([{species_id:25,first_seen_at:'2022-01-01T00:00:00Z',first_caught_at:null}],[]);
 assert.equal(dex.getSpecies(25).first_seen_at,'2022-01-01T00:00:00Z');
 assert.ok(dex.getSpecies(25).first_caught_at);
});
test('Failed cloud RPC keeps the queue intact for retry',async()=>{
 reset();dex.record(mon(),'caught');
 let fail=true,calls=0;
 const client={from:()=>({select:async()=>({data:[],error:null})}),rpc:async()=>{calls++;return {error:fail?{message:'offline'}:null};}};
 await assert.rejects(dex.initCloud(client));
 assert.equal(dex.state().pending,1);
 fail=false;await dex.flush();
 assert.equal(dex.state().pending,0);assert.equal(calls,2);
});
test('Pokemon evolution keeps its individual gender and shiny',async()=>{
 const ctx=vm.createContext({console,Math,Set,Map,PokexDex:dex,PokexAbilities:require('../js/abilities.js'),setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(root,'js/game-data.js'),'utf8'),ctx,{filename:'game-data.js'});
 vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8'),ctx,{filename:'pokemon.js'});
 const stats=['hp','attack','defense','special-attack','special-defense','speed'].map(n=>({stat:{name:n},base_stat:49,effort:0}));
 const data=id=>({id,name:id===1?'bulbasaur':'ivysaur',growth_rate:{name:'medium-slow'},base_experience:65,types:[{type:{name:'grass'}}],sprites:{front_default:'normal',back_default:'back',front_shiny:'SHINY_FRONT',back_shiny:'SHINY_BACK'},stats,moves:[],abilities:[],gender:'male',isShiny:true});
 ctx.pokeApiRequest=async()=>data(2);
 const Pokemon=vm.runInContext('Pokemon',ctx);
 const p=new Pokemon(data(1),16);
 assert.equal(p.gender,'male');assert.equal(p.isShiny,true);
 assert.equal(p.spriteFront,'SHINY_FRONT');
 await p.tryEvolution();
 assert.equal(p.id,2);assert.equal(p.gender,'male');assert.equal(p.isShiny,true);
 assert.equal(p.spriteBack,'SHINY_BACK');
});
test('Existing checkpoint v2 without variant fields remains valid',()=>{
 const c=require('../js/checkpoints.js');
 const mon={id:25,level:5,currentHp:15,maxHp:20,moves:[]};
 const g={floor:1,money:600,team:[mon],activeIndex:0,gridMap:Array.from({length:10},()=>Array(10).fill(null)),playerPos:{x:0,y:0},items:{pokeball:5},badges:[],completedGymFloors:[],caughtLegendarySpecies:[]};
 assert.equal(c.validate({version:2,createdAt:new Date().toISOString(),game:g}).version,2);
 assert.throws(()=>c.validate({version:2,createdAt:new Date().toISOString(),game:{...g,team:[{...mon,gender:'hacked'}]}}));
});
