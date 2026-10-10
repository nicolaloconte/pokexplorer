'use strict';
/* V7.2 regression test: finale guard, photo composition, return and intro cleanup. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
class FakeClassList {
 constructor(){this.s=new Set();}
 add(...xs){xs.forEach(x=>this.s.add(x));}
 remove(...xs){xs.forEach(x=>this.s.delete(x));}
 contains(x){return this.s.has(x);}
 toggle(x,val){if(val===undefined)val=!this.contains(x);val?this.add(x):this.remove(x);return val;}
}
class FakeEl {
 constructor(id='') {this.id=id;this.className='';this.classList=new FakeClassList();this.style={};this.children=[];this.dataset={};this.textContent='';this.innerHTML='';this.src='';this.disabled=false;}
 replaceChildren(...xs){this.children=xs;}
 append(...xs){this.children.push(...xs);}
 appendChild(x){this.children.push(x);}
 setAttribute(k,v){this[k]=v;}
 removeAttribute(k){delete this[k];}
 addEventListener(){}
 removeEventListener(){}
 focus(){}
}
const elMap=new Map();
const document={getElementById(id){if(!elMap.has(id))elMap.set(id,new FakeEl(id));return elMap.get(id);},createElement(t){return new FakeEl(t);},querySelectorAll(){return[];},addEventListener(){}};
const context=vm.createContext({document,console,window:{matchMedia:()=>({matches:false})},Math,setTimeout:()=>0,clearTimeout(){},Image:function(){},fetch:async()=>({ok:false})});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;',context);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;this.KANTO_GYMS=KANTO_GYMS;',context);
const p=context.GameEngine.prototype;
function makeGame(floor=80){
 const g=Object.create(p);
 Object.assign(g,{floor,gridSize:10,gridMap:[],playerPos:{x:0,y:0},money:600,team:[],badges:[],items:{pokeball:5,potion:3,elixir:1,fishingRod:true},battleToken:0,battleParticipants:new Set(),completedGymFloors:new Set(),currentGym:null,gymQueue:[],npcSprites:Array.from({length:16},(_,i)=>`npc${i}`),npcDialogues:Array(16).fill('test'),badgeSprites:Array.from({length:8},(_,i)=>`assets/badges/badge-${i+1}.svg`),isLocked:false,adventureCompleted:false,activeMon:null,enemyMon:null,dialogueResolve:null,isRaidActive:false,raidQueueCount:0});
 g.$id=id=>document.getElementById(id);
 g.logMsg=s=>{g.lastText=s;};g.renderDungeon=()=>{};g.renderSidebar=()=>{};
 g.renderBadges=()=>{};g.showDiscoveryNotice=(s)=>{g.lastNotice=s;};
 g.generateFloorDungeon=()=>{g.generatedNext=true;};
 return g;
}
function badges(g,n=8){g.badges=Array.from({length:n},(_,i)=>({id:i,name:`Medaglia ${i}`}));for(let i=1;i<=8;i++)g.completedGymFloors.add(i*10);}
function doorMap(g){g.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'path',entity:null,revealed:true})));g.gridMap[9][9].entity='door';g.playerPos={x:8,y:9};}

// One incomplete run and the wrong floor must not display the finale.
const tooEarly=makeGame(79);badges(tooEarly);doorMap(tooEarly);
assert.equal(tooEarly.hasCompletedKantoChallenge(),false);tooEarly.movePlayer(1,0);
assert(!tooEarly.adventureCompleted);assert.equal(tooEarly.floor,80);
const incomplete=makeGame(80);badges(incomplete,7);doorMap(incomplete);
incomplete.movePlayer(1,0);
assert.equal(incomplete.floor,80);assert(!incomplete.adventureCompleted);assert.match(incomplete.lastText,/otto medaglie/);
assert(!incomplete.adventureCompleted);

// Floor 80 + Giovanni + distinct eight badges triggers the finale on the exit.
const finalGame=makeGame(80);badges(finalGame);doorMap(finalGame);
assert(finalGame.hasCompletedKantoChallenge());finalGame.movePlayer(1,0);
assert(finalGame.adventureCompleted);assert(finalGame.isLocked);
assert.equal(finalGame.floor,80);
assert.equal(elMap.get('victory-badge-preview').children.length,8);
assert(!elMap.get('victory-overlay').classList.contains('hidden'));
finalGame.movePlayer(-1,0);assert.equal(finalGame.playerPos.x,9,'Cannot walk in finale');

// Photo includes six party positions, eight medals, names and source sprite URLs.
finalGame.team=[{name:'CHARMANDER',level:26,spriteFront:'charmander.png'},
 {name:'PIKACHU',level:21,spriteFront:'pikachu.png'},
 {name:'SQUIRTLE',level:22,spriteFront:'squirtle.png'}];
finalGame.showMemoryPhoto();
assert(elMap.get('victory-overlay').classList.contains('hidden'));
assert(!elMap.get('memory-photo-overlay').classList.contains('hidden'));
assert.equal(elMap.get('memory-photo-team').children.length,6);
assert.equal(elMap.get('memory-photo-badges').children.length,8);
assert.equal(elMap.get('memory-photo-team').children[0].children[1].textContent,'CHARMANDER');
assert.equal(elMap.get('memory-photo-team').children[0].children[0].src,'charmander.png');
finalGame.returnToVictoryScreen();assert(!elMap.get('victory-overlay').classList.contains('hidden'));
assert(elMap.get('memory-photo-overlay').classList.contains('hidden'));

// Back to main menu clears the old victory state and badge / team info.
finalGame.returnToMainMenu();
assert.equal(finalGame.floor,1);assert.equal(finalGame.team.length,0);
assert.equal(finalGame.badges.length,0);assert.equal(finalGame.completedGymFloors.size,0);
assert.equal(finalGame.adventureCompleted,false);assert.equal(finalGame.isLocked,false);
assert(elMap.get('victory-overlay').classList.contains('hidden'));
assert(elMap.get('memory-photo-overlay').classList.contains('hidden'));
assert(!elMap.get('main-menu-overlay').classList.contains('hidden'));

// Trainer opening: reset old classes, hide Red until entrance, then hide both trainers.
const intro=makeGame(1);
intro.team=[{name:'BULBASAUR',level:5,currentHp:21,maxHp:21,types:['grass'],loadLearnset:async()=>{},clearVolatile(){}}];
intro.activeMon=intro.team[0];intro.currentTrainerSprite='trainer.png';
intro.getPokemonData=async id=>({id,name:'geodude',types:[{type:{name:'rock'}}],sprites:{front_default:'enemy.png',back_default:'enemy-back.png'},stats:[],moves:[]});
intro.resetBattleVisuals=()=>{};intro.battleText=async()=>{};intro.wait=async()=>{};
intro.animateBall=async()=>{};intro.summonPokemon=async(side)=>{intro.$id(side==='enemy'?'enemy-sprite':'player-sprite').classList.remove('hidden');};
intro.updateBattleHUD=()=>{};intro.showMainActions=()=>{};intro.hideAllActions=()=>{};intro.openWings=()=>{};
intro.setTrainerPortrait=(el,src)=>{el.src=src;};
(async()=>{
 await intro.startBattle('trainer');
 assert(elMap.get('enemy-trainer-sprite').classList.contains('hidden'));
 assert(elMap.get('player-trainer-sprite').classList.contains('hidden'));
 assert(elMap.get('enemy-trainer-sprite').className.includes('enemy-trainer-frame'));
 console.log('PASS V7.2: floor guard, 8-medal victory, six-slot photo, back/menu reset, trainer intro cleanup.');
})().catch(err=>{console.error(err);process.exitCode=1;});
