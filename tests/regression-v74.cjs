'use strict';
/* Pokéxplorer V7.4 — stats, IV/EV, nature, abilities, squad and UI smoke tests. Run: node tests/regression-v74.cjs */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
class Classes{constructor(){this.v=new Set(['hidden'])}add(...names){names.forEach(n=>this.v.add(n))}remove(...names){names.forEach(n=>this.v.delete(n))}contains(s){return this.v.has(s)}toggle(s,force){const value=force===undefined?!this.contains(s):force;value?this.add(s):this.remove(s)}}
class El{constructor(id=''){this.id=id;this.textContent='';this.innerHTML='';this.disabled=false;this.dataset={};this.style={};this.classList=new Classes();this.children=[];this.src='';this.className=''}replaceChildren(...children){this.children=children}append(...children){this.children.push(...children)}appendChild(child){this.children.push(child)}addEventListener(){}focus(){}setAttribute(k,v){this[k]=v}getBoundingClientRect(){return{width:80,height:80,left:0,top:0}}}
const elements=new Map(),document={getElementById(id){if(!elements.has(id))elements.set(id,new El(id));return elements.get(id)},createElement(name){return new El(name)},createTextNode(text){return {textContent:text}},querySelectorAll(){return[]},addEventListener(){},body:new El('body')};
const c=vm.createContext({document,console,Math,setTimeout:()=>0,clearTimeout(){},window:{matchMedia:()=>({matches:false})},Image:function(){},fetch:async()=>({ok:false,status:404})});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;this.Move=Move;this.POKEMON_NATURES=POKEMON_NATURES;this.pokemonStatValue=pokemonStatValue;this.calculateBattleDamage=calculateBattleDamage;',c);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;',c);
let checks=0;function ok(condition,message){assert(condition,message);checks++}
function equal(a,b,message){assert.equal(a,b,message);checks++}
const stats={hp:45,attack:49,defense:49,'special-attack':65,'special-defense':65,speed:45};
const fixture=(name,ability='overgrow')=>({id:1,name,base_experience:64,types:[{type:{name:'grass'}}],sprites:{front_default:'sprite',back_default:'spriteback'},abilities:[{is_hidden:false,ability:{name:ability}}],stats:Object.entries(stats).map(([name,value])=>({stat:{name},base_stat:value,effort:name==='special-attack'?1:0})),moves:[]});
function mon(name='Bulbasaur',ability='overgrow'){return new c.Pokemon(fixture(name,ability),5)}
async function test(){
 const nm=c.POKEMON_NATURES;equal(nm.length,25,'25 nature');equal(nm.filter(x=>x[1]===null).length,5,'five neutral natures');
 // Official Gen III onward HP example: Garchomp HP base 108, IV 24, EV 74 at 78 = 289.
 equal(c.pokemonStatValue(108,24,74,78,nm[3],'hp'),289,'official HP formula');
 equal(c.pokemonStatValue(130,12,190,78,nm[3],'attack'),278,'positive nature/IV/EV formula');
 equal(c.pokemonStatValue(80,0,0,50,nm[10],'attack'),76,'negative nature');
 const a=mon(),b=mon('Ivysaur','blaze');
 equal(a.ability,'overgrow','species ability from PokéAPI');ok(a.ivs.attack>=0&&a.ivs.attack<=31,'legal IV');
 equal(Object.keys(a.getStatsSummary()).length,6,'six statistics');
 a.nature=nm[15];a.ivs=Object.fromEntries(Object.keys(stats).map(k=>[k,20]));a.calcStats();
 const first=a.getStatsSummary();a.level=15;a.calcStats();const second=a.getStatsSummary();
 for(const k of Object.keys(first))ok(second[k]>first[k],`stat ${k} increases with level`);
 a.evs=Object.fromEntries(Object.keys(stats).map(k=>[k,0]));a.calcStats();
 const oldSpa=a.spAtk;a.currentHp=a.maxHp;a.gainEffortValues({'special-attack':252,'speed':200});
 ok(a.spAtk>oldSpa,'EV special attack contributes');equal(a.evs['special-attack'],252,'EV per-stat maximum');
 a.gainEffortValues({'special-attack':252,'attack':252,'speed':252});
 ok(Object.values(a.evs).reduce((x,y)=>x+y,0)<=510,'EV global cap');
 const scratch=new c.Move('Graffio','normal',40,35,'physical'),ember=new c.Move('Braciere','fire',40,25,'special');
 a.level=15;b.level=15;a.calcStats();b.calcStats();a.currentHp=a.maxHp;b.currentHp=b.maxHp;
 const d=(move)=>c.calculateBattleDamage(a,b,move,()=>.8).damage;
 a.ability='none';const standard=d(scratch);a.ability='huge-power';ok(d(scratch)>standard,'Huge Power boosts physical attack');
 a.ability='none';const fireNormal=d(ember);a.ability='blaze';a.currentHp=Math.floor(a.maxHp/3);ok(d(ember)>fireNormal,'Blaze boosts low HP fire moves');
 a.ability='none';a.currentHp=a.maxHp;b.ability='thick-fat';ok(d(ember)<fireNormal,'Thick Fat resists fire');
 const g=Object.create(c.GameEngine.prototype);
 Object.assign(g,{team:[a,b],activeMon:a,battleBusy:false,adventureCompleted:false,isLocked:false,bagCategory:'rimedi',items:{potion:2,elixir:1,pokeball:2,fishingRod:false},money:600,floor:1,radarCharges:3,badges:[],pendingItemTarget:null,partyMoveSource:null,partyMenuPokemon:null,playerPos:{x:0,y:0}});
 g.$id=id=>document.getElementById(id);g.logMsg=msg=>{g.lastLog=msg};g.renderBadges=()=>{};
 // Make the battle scene hidden; outside battle, opening the team menu must never change the fighter.
 document.getElementById('overlay-battle').classList.add('hidden');
 g.renderSidebar();g.openPartyActions(b);
 equal(g.activeMon,a,'clicking a team member does not change the active Pokémon');
 ok(!document.getElementById('party-action-menu').classList.contains('hidden'),'menu opens');
 g.beginPartyReorder();equal(g.partyMoveSource,b,'choose move');
 g.completePartyReorder(a);equal(g.team[0],b,'swap occupied slots');equal(g.activeMon,a,'active Pokémon persists after party reorder');
 g.openPartyActions(a);g.beginPartyReorder();g.completePartyReorder(null);equal(g.team[0],b,'cannot swap into empty slot');g.closePartyActions();
 g.openPokemonInfo(b);equal(document.getElementById('pokemon-info-stats').children.length,6,'info lists six stats');
 equal(document.getElementById('pokemon-info-moves').children.length,b.moves.length,'info lists current moves');
 ok(!document.getElementById('pokemon-info-overlay').classList.contains('hidden'),'info opens');g.closePokemonInfo();
 ok(document.getElementById('pokemon-info-overlay').classList.contains('hidden'),'info closes');
 g.activeMon=b;g.enemyMon=a;a.ability='levitate';const ground=new c.Move('Terremoto','ground',100,10,'physical');
 ok(g.abilityAttackImmunity(a,ground,b).includes('Levitazione'),'Levitate blocks ground');
 a.ability='intimidate';b.ability='none';b.statStages={};g.triggerEntryAbilities(a,b);equal(b.statStages.attack,-1,'Intimidate lowers attack stage');
 a.ability='immunity';ok(g.statusAbilityBlocks(a,'poison'),'Immunity blocks poison');
 a.ability='limber';ok(g.statusAbilityBlocks(a,'paralysis'),'Limber blocks paralysis');
 // HTML and CSS coverage checks
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 for(const id of ['pokemon-info-overlay','party-action-menu','party-info-action','party-move-action','party-close-action','mobile-dpad','item-target-prompt'])ok(html.includes(`id="${id}"`),`markup ${id}`);
 ok(css.includes('.pokemon-info-card'),'info card styles');ok(css.includes('#mobile-dpad'),'mobile D-pad styles');
 console.log(`PASS V7.4: ${checks} checks (natures/IV/EV, species abilities, party swap, UI, mobile markup).`);
}
test().catch(err=>{console.error(err);process.exitCode=1;});
