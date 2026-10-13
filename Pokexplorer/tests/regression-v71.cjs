/* Non-browser regression checks for Pokéxplorer V7.1 (Node 22+). */
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const path=require('path');
const root=path.resolve(__dirname,'..');
const logs=[];
function fakeEl(id){return {id,textContent:'',classList:{add(){},remove(){},toggle(){}},style:{},innerHTML:'',setAttribute(){},addEventListener(){},focus(){}};}
const elements=new Map();
const document={getElementById(id){if(!elements.has(id))elements.set(id,fakeEl(id));return elements.get(id);}};
let controlledRand=null;
const customMath=Object.create(Math);customMath.random=()=>controlledRand===null?Math.random():controlledRand;
const ctx=vm.createContext({console,document,window:{},Math:customMath,setTimeout:()=>0,clearTimeout(){},Image:function(){}});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;',ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;this.GAME_BALANCE=GAME_BALANCE;',ctx);
function gameOn(floor){
 const game=Object.create(ctx.GameEngine.prototype);
 Object.assign(game,{gridSize:10,floor,gridMap:[],playerPos:{x:0,y:0},items:{pokeball:5,potion:3,elixir:1,fishingRod:true},money:600,team:[],badges:[],completedGymFloors:new Set(),npcSprites:Array.from({length:16},(_,i)=>`npc${i}`),npcDialogues:Array.from({length:16},(_,i)=>`dialogue ${i}`),battleConfirmAction:null,battleType:null});
 game.renderDungeon=()=>{};game.renderSidebar=()=>{};game.logMsg=m=>logs.push(m);game.revealArea=ctx.GameEngine.prototype.revealArea;
 game.$id=id=>document.getElementById(id);
 game.showDiscoveryNotice=()=>{};
 game.waitForNotice=()=>Promise.resolve();
 game.startBattle=()=>{game.testBattleStarted=true;};
 return game;
}
function reachable(game){
 const q=[[0,0]],seen=new Set(['0,0']);let index=0;
 while(index<q.length){const [x,y]=q[index++];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(nx<0||ny<0||nx>=game.gridSize||ny>=game.gridSize||seen.has(key))continue;
  const c=game.gridMap[ny][nx]; if(['tree','water'].includes(c.type)||game.isSolidTownCell(c))continue;
  seen.add(key);q.push([nx,ny]);
 }}return seen;
}
function adjacentToReachable(seen,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(`${x+dx},${y+dy}`));}

// Regular routes: 1-3 visible Poké Balls, 1-4 trainers, no guaranteed raid tile,
// and all interaction cells reachable. 200 randomized regenerations.
for(let i=0;i<200;i++){
 const g=gameOn(i%30+1);if(g.floor%5===0)g.floor++;
 g.generateFloorDungeon();
 const flat=g.gridMap.flat(), items=flat.filter(c=>c.entity==='item'),trainers=flat.filter(c=>c.entity==='trainer'),raids=flat.filter(c=>c.entity==='raid');
 assert(items.length>=1&&items.length<=3,'Item bounds');
 assert(trainers.length>=1&&trainers.length<=4,'Trainer bounds');
 assert.equal(raids.length,0,'Raid must only be a pickup chance');
 const seen=reachable(g);
 for(const c of flat.filter(c=>['item','trainer','door'].includes(c.entity)))assert(seen.has(`${c.x},${c.y}`),'route must be reachable');
}

// Villages/cities: all visible, roads reach exit, buildings and decorations solid,
// and access to shops, gym, NPCs is available from an adjacent accessible tile.
for(let floor=5;floor<=120;floor+=5){
 const g=gameOn(floor);g.generateFloorDungeon();
 const seen=reachable(g);
 for(const c of g.gridMap.flat()){
  assert(c.revealed,'Town tile must be revealed');
  if(['pokecenter','pokemart','gym','house','npc'].includes(c.entity)||c.decoration){
   assert(g.isSolidTownCell(c),'Town props must be solid');
   if(c.entity)assert(adjacentToReachable(seen,c.x,c.y),`cannot interact with ${c.entity} on floor ${floor}`);
  }
 }
 assert(seen.has('9,9'),`Town exit unreachable floor ${floor}`);
}

// Solid props are not overwritten by Red when interacting from next door.
const city=gameOn(10);city.generateFloorDungeon();
city.playerPos={x:2,y:1};const center=city.gridMap[2][2];
assert.equal(center.entity,'pokecenter');city.movePlayer(0,1);
assert.equal(city.playerPos.y,1,'Must not step onto Pokémon Center');
assert.equal(center.entity,'pokecenter','Building remains on map');
assert(city.isLocked,'Center opens interaction');

// Fishing confirmation: movement locked before confirmation, can cancel, and
// remains locked on acceptance until encounter starts.
const fish=gameOn(1);fish.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'path',entity:null,revealed:true})));
fish.gridMap[0][1].type='water';fish.movePlayer(1,0);
assert(fish.isLocked&&fish.fishingConfirmPending,'Fishing pending should lock movement');
fish.movePlayer(0,1);assert.equal(fish.playerPos.y,0,'Cannot walk during fishing prompt');
fish.closeBattleConfirmation();assert(!fish.isLocked,'Cancel unlocks movement');
fish.movePlayer(1,0);fish.acceptBattleConfirmation();assert(fish.isLocked&&!fish.fishingConfirmPending,'Confirm leaves fishing encounter locked');

// Items never trigger raids: raids are hidden in grass and generated exactly once per route.
for(const roll of [.09,.10,.95]){
 const g=gameOn(1);g.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'path',entity:null,revealed:true})));
 g.gridMap[0][1].entity='item';controlledRand=roll;
 g.movePlayer(1,0);
 assert.equal(Boolean(g.isRaidActive),false,'items no longer cause random raid');
 assert.equal(g.gridMap[0][1].entity,null,'Item collected exactly once');
 assert.equal(g.playerPos.x,1,'Player stands on collected Poké Ball');
}
controlledRand=null;
assert.equal(ctx.GAME_BALANCE.raidChancePerItem,undefined,"Old item-based raids removed");

// Level balance: 60 early battles do not force a Pokémon above level 42.
const cost=lv=>Math.round(110+22*lv+1.1*lv*lv);
let lvl=5, exp=0;
for(let i=0;i<60;i++){
 const enemyLevel=3+Math.floor((i%16)+1)*.9;
 exp += Math.round(ctx.GAME_BALANCE.expBase + enemyLevel*ctx.GAME_BALANCE.expPerEnemyLevel);
 while(exp>=cost(lvl)){exp-=cost(lvl);lvl++;}
}
assert(lvl<30,`Level inflation: ${lvl}`);
console.log(`PASS 200 routes, 24 towns, solid interactions, fishing, raid probability boundaries, XP projection (level ${lvl} after 60 fights).`);
