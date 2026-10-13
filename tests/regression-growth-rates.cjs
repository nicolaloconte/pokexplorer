'use strict';
/* Pokémon Gen III+ growth curves; run: node tests/regression-growth-rates.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8');
const engineSrc=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
let count=0;
function eq(a,b,n){assert.equal(a,b,n);count++;}
function yes(a,n){assert.ok(a,n);count++;}
const sandbox=vm.createContext({Math,console,fetch:async()=>({ok:false,status:404})});
vm.runInContext(script+';this.Pokemon=Pokemon;this.totalExperienceForLevel=totalExperienceForLevel;this.experienceForNextLevel=experienceForNextLevel;this.normalizedGrowthRate=normalizedGrowthRate;',sandbox);
const total=sandbox.totalExperienceForLevel;
const next=sandbox.experienceForNextLevel;
const groups={'erratic':600000,'fast':800000,'medium-fast':1000000,'medium-slow':1059860,'slow':1250000,'fluctuating':1640000};
for(const [group,total100] of Object.entries(groups)){
 eq(total(group,1),0,group+' starts at 0 XP');
 eq(total(group,100),total100,group+' official level 100 threshold');
 eq(next(group,100),0,group+' cannot level beyond 100');
 let sum=0;
 for(let level=1;level<100;level++){
   const needed=next(group,level);
   yes(needed>0,group+' positive level cost '+level);
   sum+=needed;
 }
 eq(sum,total100,group+' next-level costs sum to official cumulative XP');
}
// Published level-to-level values from the canonical mainline Pokémon tables.
for(const [group,lv5To6,lv6To7,lv9To10] of [
 ['medium-slow',44,57,141], ['fast',72,102,217],
 ['medium-fast',91,127,271],['slow',114,158,339],
 ['fluctuating',47,66,147],['erratic',169,231,474]
]){
 eq(next(group,5),lv5To6,group+' 5 → 6');
 eq(next(group,6),lv6To7,group+' 6 → 7');
 eq(next(group,9),lv9To10,group+' 9 → 10');
}
const pokemonData=(id,rate)=>({id,name:'testmon',base_experience:64,types:[{type:{name:'grass'}}],
 sprites:{front_default:'test.png',back_default:'back.png'},
 growth_rate:rate===null?undefined:{name:rate},
 abilities:[{is_hidden:false,ability:{name:'overgrow'}}],
 stats:['hp','attack','defense','special-attack','special-defense','speed'].map(name=>({stat:{name},base_stat:50,effort:0})),moves:[]});
async function main(){
 const starter=new sandbox.Pokemon(pokemonData(1,null),5);
 eq(starter.growthRate,'medium-slow','Bulbasaur family fallback used if API species unavailable');
 eq(starter.expToNext,44,'starter Lv5 official 44 XP until Lv6');
 eq(starter.exp,0,'new Pokémon starts with zero progress into level');
 let events=await starter.gainExperience(43);
 eq(events.length,0,'43 XP not enough to level up');
 eq(starter.level,5,'still at level 5 after 43 XP');
 eq(starter.exp,43,'partial progress carried');
 events=await starter.gainExperience(1);
 eq(starter.level,6,'44th XP reaches level 6');
 eq(events.length,1,'one level event emitted');
 eq(starter.exp,0,'progress reset at exact level threshold');
 eq(starter.expToNext,57,'next level needs 57 XP');
 events=await starter.gainExperience(57+78+105);
 eq(starter.level,9,'multiple level-ups work in one reward');
 eq(starter.expToNext,141,'level 9 to 10 uses real curve');
 eq(starter.exp,0,'surplus XP properly distributed');
 const slow=new sandbox.Pokemon(pokemonData(58,'slow'),5);
 eq(slow.expToNext,114,'species growth rate carried from PokéAPI');
 const maxed=new sandbox.Pokemon(pokemonData(1,'medium-slow'),99);
 await maxed.gainExperience(maxed.expToNext+999999);
 eq(maxed.level,100,'hard cap at level 100');
 eq(maxed.expToNext,0,'no next-level requirement at cap');
 eq(maxed.exp,0,'XP discarded at cap');
 await maxed.gainExperience(2000000);
 eq(maxed.level,100,'additional battles never exceed level 100');
 eq(maxed.exp,0,'no XP accumulates at level cap');
 const src=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
 yes(src.includes('/pokemon-species/${species}'),'species growth fetched from PokéAPI');
 yes(src.includes('a.level>=this.getLevelCap()?100:'),'EXP bar safely handles level 100');
 yes(src.includes('ha già raggiunto il limite di livello ${levelCap}'),'battle shows no XP gain when max level');
 // Network integration: fake a Pokémon resource and its corresponding Species rate.
 const speciesCtx=vm.createContext({console,Math,document:{},fetch:async url=>({ok:true,json:async()=>url.includes('pokemon-species')?{growth_rate:{name:'slow'}}:pokemonData(58,null)})});
 vm.runInContext(engineSrc+';this.GameEngine=GameEngine;',speciesCtx);
 const engine=Object.create(speciesCtx.GameEngine.prototype);engine.pokemonCache=new Map();
 const data=await engine.getPokemonData(58);
 eq(data.growth_rate.name,'slow','species endpoint data merged into Pokémon before construction');
 eq((await engine.getPokemonData(58)).growth_rate.name,'slow','cached species rate reused');
 const downed=new sandbox.Pokemon(data,3);
 eq(downed.growthRate,'slow','Pokémon receives the correct species rate');
 console.log(`PASS GROWTH: ${count} checks — all 6 mainline curves, species API, level-100 cap, leveling events, UI`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
