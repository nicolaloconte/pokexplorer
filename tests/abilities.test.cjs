'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const A=require('../js/abilities.js');
function mon(ability='none',extra={}){return {name:'TEST',ability,abilityName:ability,gender:'male',types:['normal'],
 level:30,attack:90,defense:70,spAtk:80,spDef:80,speed:70,statStages:{},maxHp:100,currentHp:100,
 status:null,statusTurns:0,confusionTurns:0,...extra};}
function move(type='normal',category='physical',power=70){return {name:'TEST MOVE',id:'test-move',type,category,power,contact:true,critRate:0};}
function battleDamage(){
 const sandbox=vm.createContext({PokexDex:{},PokexAbilities:A,Math,console,Set,Map});
 for(const name of ['game-data.js','pokemon.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name),'utf8'),sandbox,{filename:name});
 return vm.runInContext('calculateBattleDamage',sandbox);
}
test('Ability Capsule only accepts official non-hidden species abilities',()=>{
 const species={abilities:[{slot:3,is_hidden:true,ability:{name:'lightning-rod'}},
  {slot:2,is_hidden:false,ability:{name:'technician'}},{slot:1,is_hidden:false,ability:{name:'pickup'}},
  {slot:2,is_hidden:false,ability:{name:'technician'}}]};
 assert.deepEqual(A.normalOptions(species),['pickup','technician']);
 assert.deepEqual(A.alternatives('pickup',A.normalOptions(species)),['technician']);
 assert.deepEqual(A.alternatives('technician',['technician']),[]);
 assert.deepEqual(A.normalOptions({abilities:[{slot:3,is_hidden:true,ability:{name:'huge-power'}}]}),[]);
});
test('Critical, powerful, defensive and weather abilities affect actual damage',()=>{
 const damage=battleDamage(),att=mon('none'),def=mon('none'),hit=move();
 const n=damage(att,def,hit,()=>.8).damage;
 assert.ok(damage(mon('huge-power'),def,hit,()=>.8).damage>n);
 assert.ok(damage(mon('guts',{status:'poison'}),def,hit,()=>.8).damage>n);
 assert.ok(damage(mon('technician'),def,{...hit,power:50},()=>.8).damage>
  damage(mon('none'),def,{...hit,power:50},()=>.8).damage);
 assert.ok(damage(att,mon('marvel-scale',{status:'poison'}),hit,()=>.8).damage<n);
 assert.ok(damage(att,mon('thick-fat'),move('fire','special',70),()=>.8).damage<
  damage(att,def,move('fire','special',70),()=>.8).damage);
 assert.ok(damage(att,def,move('fire','special',70),()=>.8,{weather:{type:'sun'}}).damage>
  damage(att,def,move('fire','special',70),()=>.8).damage);
});
test('Immunity and type absorption perform the correct action',()=>{
 assert.equal(A.immunity(mon(),mon('levitate'),move('ground'),{effectiveness:2}).kind,'immune');
 assert.equal(A.immunity(mon(),mon('water-absorb'),move('water'),{effectiveness:2}).kind,'heal');
 assert.equal(A.immunity(mon(),mon('lightning-rod'),move('electric'),{effectiveness:1}).stat,'special-attack');
 assert.equal(A.immunity(mon(),mon('sap-sipper'),move('grass'),{effectiveness:1}).stat,'attack');
 assert.equal(A.immunity(mon('mold-breaker'),mon('levitate'),move('ground'),{effectiveness:2}),null);
 assert.equal(A.immunity(mon(),mon('soundproof'),{...move(),sound:true}).kind,'immune');
});
test('Status protection covers sleep, poison, freeze, burn, weather and confusion modifiers',()=>{
 assert.equal(A.statusBlocked(mon('limber'),'paralysis'),true);
 assert.equal(A.statusBlocked(mon('water-veil'),'burn'),true);
 assert.equal(A.statusBlocked(mon('immunity'),'bad-poison'),true);
 assert.equal(A.statusBlocked(mon('insomnia'),'sleep'),true);
 assert.equal(A.statusBlocked(mon('magma-armor'),'freeze'),true);
 assert.equal(A.statusBlocked(mon('leaf-guard'),'poison',{weather:{type:'sun'}}),true);
 assert.equal(A.statusBlocked(mon('leaf-guard'),'poison',{weather:{type:'rain'}}),false);
 assert.equal(A.dropBlocked(mon('clear-body'),'speed'),true);
 assert.equal(A.dropBlocked(mon('hyper-cutter'),'attack'),true);
 assert.equal(A.dropBlocked(mon('hyper-cutter'),'defense'),false);
});
test('Entry abilities, knockout, stat stages and weather speed modifiers',()=>{
 const a=mon('intimidate'),b=mon('none');
 assert.equal(A.entry(a,b).length,1);assert.equal(b.statStages.attack,-1);
 assert.equal(A.entry(a,mon('clear-body')).length,0);
 assert.equal(A.entry(mon('download'),mon('none',{defense:40,spDef:80})).length,1);
 const rain={weather:{type:'rain'}},sun={weather:{type:'sun'}};
 assert.equal(A.speedMultiplier(mon('swift-swim'),rain),2);
 assert.equal(A.speedMultiplier(mon('chlorophyll'),sun),2);
 assert.equal(A.accuracyMultiplier(mon('no-guard'),mon(),move()),Infinity);
 assert.equal(A.accuracyMultiplier(mon(),mon('sand-veil'),move(),{weather:{type:'sandstorm'}}),.8);
 const winner=mon('moxie');assert.ok(A.afterKnockout(winner));assert.equal(winner.statStages.attack,1);
});
test('Contact and end of turn work with real HP and avoid triggering without contact',()=>{
 const attacker=mon('none'),defender=mon('rough-skin');
 assert.equal(A.contact(attacker,defender,move(),30).length,1);
 assert.equal(attacker.currentHp,88);
 assert.equal(A.contact(attacker,defender,{...move(),contact:false},30).length,0);
 assert.equal(attacker.currentHp,88);
 const healer=mon('rain-dish',{currentHp:50});assert.equal(A.endTurn(healer,{weather:{type:'rain'}}).length,1);
 assert.equal(healer.currentHp,56);
 const poisoned=mon('poison-heal',{status:'poison',currentHp:50});
 assert.equal(A.endTurn(poisoned).length,1);assert.equal(poisoned.currentHp,62);
});
test('No hidden ability is accidentally serialized as a legal capsule option',()=>{
 const api={abilities:[{slot:1,is_hidden:false,ability:{name:'static'}},{slot:3,is_hidden:true,ability:{name:'lightning-rod'}}]};
 assert.deepEqual(A.alternatives('static',A.normalOptions(api)),[]);
});
test('Capsule purchase, cancellation and successful use are transactional and species-locked',async()=>{
 const dom=new Map();
 class StubElement{
  constructor(id){this.id=id;this.textContent='';this.children=[];this.listeners={};this.classList={hidden:false,add:key=>{if(key==='hidden')this.classList.hidden=true;},remove:key=>{if(key==='hidden')this.classList.hidden=false;}};}
  replaceChildren(...children){this.children=children;}
  appendChild(child){this.children.push(child);}
  querySelector(selector){return this.children[0]||null;}
  focus(){};
 }
 function get(id){if(!dom.has(id))dom.set(id,new StubElement(id));return dom.get(id);}
 const context=vm.createContext({console,Math,Set,Map,PokexAbilities:A,
  window:{PokexCheckpoints:null},document:{getElementById:get,createElement:tag=>new StubElement(tag)}});
 for(const name of ['game-data.js','pokemon.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name),'utf8'),context,{filename:name});
 const proto=vm.runInContext('GameEngine.prototype',context);const game=Object.create(proto);
 const pokemon=mon('static',{id:25,name:'PIKACHU',abilityName:'Statico',moves:[]});
 game.team=[pokemon];game.items={abilityCapsule:0};game.money=6000;game.locale='it';game.pendingItemTarget='abilityCapsule';
 game.isBattleVisible=()=>false;game.renderSidebar=()=>{};game.logMsg=()=>{};game.showItemFeedback=()=>{};game.saveCheckpoint=()=>{game.saved=(game.saved||0)+1;};
 game.$id=get;
 const api={id:25,abilities:[{slot:1,is_hidden:false,ability:{name:'static'}},
  {slot:2,is_hidden:false,ability:{name:'lightning-rod'}},{slot:3,is_hidden:true,ability:{name:'hidden-bogus'}}]};
 game.getPokemonData=async()=>api;
 assert.equal(game.purchaseItem('abilityCapsule',3000),true);
 assert.equal(game.money,3000);assert.equal(game.items.abilityCapsule,1);
 assert.equal(await game.openAbilityCapsule(pokemon),true);
 assert.equal(get('ability-capsule-options').children.length,1);
 game.closeAbilityCapsule();
 assert.equal(game.items.abilityCapsule,1);
 game.pendingItemTarget='abilityCapsule';
 assert.equal(await game.openAbilityCapsule(pokemon),true);
 assert.equal(game.confirmAbilityCapsule(pokemon,'hidden-bogus',['static','lightning-rod']),false);
 assert.equal(game.items.abilityCapsule,1);
 assert.equal(game.confirmAbilityCapsule(pokemon,'lightning-rod',['static','lightning-rod']),true);
 assert.equal(pokemon.ability,'lightning-rod');assert.equal(game.items.abilityCapsule,0);
 assert.equal(game.saved,1);
 assert.equal(game.confirmAbilityCapsule(pokemon,'static',['static','lightning-rod']),false);
});
