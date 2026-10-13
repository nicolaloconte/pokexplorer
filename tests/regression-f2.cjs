'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
class ClassList{constructor(){this.s=new Set(['hidden'])}add(...x){x.forEach(y=>this.s.add(y))}remove(...x){x.forEach(y=>this.s.delete(y))}contains(y){return this.s.has(y)}toggle(x,f){f??=!this.contains(x); f?this.add(x):this.remove(x)}}
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,style:{},textContent:'',classList:new ClassList(),children:[],setAttribute(){},appendChild(x){this.children.push(x)},querySelector(){return null}});return elements.get(id)}
const document={getElementById:el,querySelectorAll:()=>[],createElement:tag=>({className:'',textContent:'',remove(){}}),addEventListener(){},body:el('body')};
const ctx=vm.createContext({document,console,Math,Image:class{},window:{location:{hostname:'example.com',protocol:'https:',search:'?dev=1'},matchMedia:()=>({matches:false})},setTimeout:()=>1,clearTimeout(){},fetch:async()=>({ok:false})});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;',ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;',ctx);
const P=ctx.GameEngine.prototype;
let checks=0;function ok(x,msg){assert.ok(x,msg);checks++}function eq(x,y,msg){assert.equal(x,y,msg);checks++}
const fixture={id:19,name:'rattata',base_experience:60,types:[{type:{name:'normal'}}],sprites:{front_default:'a',back_default:'b'},stats:['hp','attack','defense','special-attack','special-defense','speed'].map(n=>({stat:{name:n},base_stat:50,effort:0})),abilities:[],moves:[]};
function g(floor=1){const o=Object.create(P);Object.assign(o,{floor,gridSize:10,playerPos:{x:0,y:0},badges:[],completedGymFloors:new Set(),items:{pokeball:5,potion:3,elixir:1,fishingRod:false},team:[new ctx.Pokemon(fixture,5)],playerFacing:'down',playerStep:0,playerFishingFrame:null,playerIdleTimer:null,isLocked:false,money:600,battleBusy:false,bagCategory:'rimedi',npcSprites:['npc.png'],npcDialogues:['Hello!'],trainerSprites:['trainer.png'],npcFallbacks:['fallback.svg'],radarCharges:3,gymQueue:[],devMode:false});o.$id=el;o.logMsg=t=>o.lastMessage=t;o.renderDungeon=()=>{};o.renderSidebar=()=>{};o.setTrainerPortrait=(e,url)=>{e.src=url};o.showDiscoveryNotice=()=>{};o.waitForNotice=async()=>{};o.startBattle=()=>{};o.activeMon=o.team[0];return o;}
function bfsReachable(o){const q=[[0,0]],seen=new Set(['0,0']);for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx<0||ny<0||nx>=10||ny>=10||seen.has(k)||['tree','water'].includes(o.gridMap[ny][nx].type))continue;seen.add(k);q.push([nx,ny])}}return seen;}
async function main(){
 // Generate diverse random 10x10 maps and verify one hidden raid, item/trainer counts and reachable.
 for(let i=0;i<500;i++){
  const o=g(1+i%4);o.generateFloorDungeon();
  const raid=o.gridMap.flat().filter(c=>c.hiddenRaid),items=o.gridMap.flat().filter(c=>c.entity==='item'),trainers=o.gridMap.flat().filter(c=>c.entity==='trainer');
  eq(raid.length,1,`floor sample ${i}: one raid`);
  ok(raid[0].type==='grass'&&!raid[0].entity,`floor ${i}: invisible grass`);
  const seen=bfsReachable(o);
  ok(seen.has(`${raid[0].x},${raid[0].y}`),`floor ${i}: raid reachable`);
  ok(seen.has('9,9'),`floor ${i}: exit reachable`);
  ok(items.length>=1&&items.length<=3,`floor ${i}: 1-3 items`);
  ok(trainers.length>=1&&trainers.length<=4,`floor ${i}: 1-4 trainers`);
  ok([...items,...trainers].every(c=>seen.has(`${c.x},${c.y}`)),`floor ${i}: placed entities reachable`);
 }
 const route=g(1);route.generateFloorDungeon();const raid=route.gridMap.flat().find(c=>c.hiddenRaid);let triggered=0;route.beginHiddenRaid=()=>{triggered++;route.isRaidActive=true};
 const old=route.playerPos;route.playerPos={x:raid.x-1,y:raid.y};if(raid.x===0)route.playerPos={x:raid.x,y:raid.y-1};
 const dx=raid.x-route.playerPos.x,dy=raid.y-route.playerPos.y;
 route.movePlayer(dx,dy);eq(triggered,1,'hidden raid triggers on entry');eq(raid.hiddenRaid,false,'hidden raid consumed');
 route.isRaidActive=false;route.movePlayer(-dx,-dy);route.movePlayer(dx,dy);eq(triggered,1,'raid never repeats');
 // End-to-end raid state-machine: exactly five encounters, no Poké Balls consumed.
 const raidGame=g(1);raidGame.gridMap=[];raidGame.enemyMon=new ctx.Pokemon(fixture,5);
 raidGame.battleParticipants=new Set([raidGame.team[0]]);raidGame.battleType='wild';
 raidGame.isRaidActive=true;raidGame.raidQueueCount=5;raidGame.battleBusy=false;
 raidGame.battleText=async()=>{};raidGame.awardBattleExperience=async()=>{};
 let nextRaidBattles=0;raidGame.startBattle=async()=>{nextRaidBattles++};
 raidGame.endBattle=(message)=>{raidGame.raidResult=message};
 const ballCount=raidGame.items.pokeball;
 await raidGame.useBattleItem('pokeball');eq(raidGame.items.pokeball,ballCount,'raid does not spend a Poké Ball');
 for(let encounter=1;encounter<=5;encounter++){
   await raidGame.handleBattleVictory();
   eq(raidGame.raidQueueCount,5-encounter,`raid win ${encounter}: remaining count`);
   if(encounter<5)eq(nextRaidBattles,encounter,`raid win ${encounter}: next enemy starts`);
 }
 eq(nextRaidBattles,4,'five raid battles total, no sixth enemy');
 ok(!raidGame.isRaidActive,'fifth win terminates raid');
 ok(raidGame.raidResult?.includes('cinque'), 'raid completion reports five wins');
 const village=g(5);village.generateFloorDungeon();
 const fishermen=village.gridMap.flat().filter(c=>c.specialRole==='fisherman');eq(fishermen.length,1,'first village contains one fisherman');
 village.isLocked=true;village.triggerNpcEvent(fishermen[0]);ok(village.items.fishingRod,'fisherman gives rod');village.triggerNpcEvent(fishermen[0]);ok(village.items.fishingRod,'rod not removed or duplicated');
 const city=g(10);city.generateFloorDungeon();ok(!city.gridMap.flat().some(c=>c.hiddenRaid),'no hidden raid in cities');
 ok(!city.gridMap.flat().some(c=>c.specialRole==='fisherman'),'fisherman only first village');
 city.requestGymChallenge();eq(city.gymQueue.length,0,'gym is not queued before confirmation');ok(city.isLocked,'prompt locks movement');city.cancelGymChallenge();ok(!city.isLocked,'cancel unlocks movement');eq(city.gymQueue.length,0,'cancel does not start gym');city.requestGymChallenge();ok(city.confirmGymChallenge(),'accept challenge');eq(city.gymQueue.length,4,'accept schedules gym trainers and leader');ok(!city.confirmGymChallenge(),'double-accept harmless');
 const trader=g(5);trader.gridMap=[];let roll=.01;const prevRandom=Math.random;Math.random=()=>roll;
 trader.getPokemonData=async()=>{throw new Error('offline')};trader.isLocked=true;
 const original=trader.team[0];trader.triggerNpcEvent({npcSprite:'npc.png'});await el('npc-btn-yes').onclick();eq(trader.team[0],original,'network error cannot delete original Pokemon');ok(trader.isLocked,'failed trade remains in dialogue until acknowledged');
 Math.random=prevRandom;
 const gift=g(5);gift.items.pokeball=20;const prev=Math.random;Math.random=()=>.15;const target={npcSprite:'npc.png'};gift.triggerNpcEvent(target);eq(gift.items.pokeball,20,'full inventory not overfilled');ok(!target.giftConsumed,'full inventory gift not consumed');Math.random=prev;
 for(let floor=1;floor<=80;floor++){const e=g(floor);const wild=e.getEncounterPool('wild');ok(!wild.includes(1)&&!wild.includes(4)&&!wild.includes(7),'starters never appear in wild pool');}
 ok(!ctx.GameEngine.toString().includes('raidChancePerItem'),'no random item raid chance');
 // Production hostname cannot activate developer mode even if query string is supplied.
 const savedBind=P.bindEvents;P.bindEvents=()=>{};const live=new ctx.GameEngine();P.bindEvents=savedBind;ok(!live.devMode,'Dev Mode cannot be enabled on hosted production');
 console.log(`PASS F2: ${checks} checks, incl. 500 generated routes and five-battle raid chain, guaranteed reachability, NPC, gym and trade rollback.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
