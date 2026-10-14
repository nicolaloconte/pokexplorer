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
 let checks=0;
 const good=g(1); good.generateFloorDungeon();
 for(let k=0;k<150;k++){
  const o=g(1);o.generateFloorDungeon();
  assert.equal(o.gridMap.flat().filter(c=>c.hiddenRaid).length,0);checks++;
  assert.ok(o.gridMap.flat().some(c=>c.entity==='item'));checks++;
 }
 const item={entity:'item',itemKind:'potion'};
 let raids=0;good.beginHiddenRaid=()=>{raids++};
 const old=Math.random;Math.random=()=>0.04;
 const q=good.items.potion;assert.equal(good.collectFloorItem(item),true);checks++;
 assert.equal(item.entity,null);assert.equal(good.items.potion,q);assert.equal(raids,1);checks+=3;
 Math.random=()=>0.7;const obj={entity:'item',itemKind:'elixir'};const count=good.items.elixir;
 assert.equal(good.collectFloorItem(obj),true);assert.equal(obj.entity,null);assert.equal(good.items.elixir,count+1);checks+=3;
 const full={entity:'item',itemKind:'potion'};good.items.potion=20;
 assert.equal(good.collectFloorItem(full),false);assert.equal(full.entity,'item');checks+=2;
 Math.random=old;
 const engine=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
 assert.ok(engine.includes('e.code===\'Space\''));checks++;
 assert.ok(engine.includes("this.showTeamMenu()"));checks++;
 assert.ok(!engine.includes('raidSpots=queue.map'));checks++;
 const gyms=[['rock',[74,75,95,111]],['water',[60,61,72,90,118,120]],['electric',[25,81,82,100,101]],['grass',[43,44,69,70,114]],['poison',[23,24,41,42,109,110]],['psychic',[63,64,96,97,122]],['fire',[37,58,77,126,218]],['ground',[27,28,50,51,104,105,111]]];
 for(let i=0;i<8;i++){
   const gg=g((i+1)*10);gg.currentGym={};gg.gymQueue=['trainer1'];
   const pool=gg.getEncounterPool('gym');
   assert.deepEqual(Array.from(pool),gyms[i][1],`gym ${gyms[i][0]} pool`);checks++;
 }
 const gg=g(20);gg.generateFloorDungeon();
 const gift=gg.gridMap.flat().find(c=>c.specialRole==='exp-share-gift');assert.ok(gift,'gift NPC floor20');checks++;
 gg.waitForNpcClick=()=>{};
 gg.triggerNpcEvent(gift);assert.equal(gg.hasExpShare(),false);checks++;
 gg.badges=[{id:0},{id:1}];gg.triggerNpcEvent(gift);assert.equal(gg.hasExpShare(),true);checks++;
 gg.triggerNpcEvent(gift);assert.equal(gg.hasExpShare(),true);checks++;

 console.log('R2.4 new gameplay tests:',checks,'passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
