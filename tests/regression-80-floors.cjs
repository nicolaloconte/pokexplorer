'use strict';
/* Monte Carlo coverage for all 80 floors, including cities and villages.
   Deliberately doesn't change the approved V7.7 10x10 dungeon generator. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
class Cl{add(){}remove(){}toggle(){}}
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{classList:new Cl(),textContent:'',style:{}});return elements.get(id)};
const doc={getElementById:el,querySelectorAll:()=>[]};
const ctx=vm.createContext({document:doc,console,Math,Image:class{},window:{location:{hostname:'example.com',protocol:'https:',search:''},matchMedia:()=>({matches:true})},setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.P=GameEngine.prototype;',ctx);
const P=ctx.P;
const blocked=c=>['tree','water'].includes(c.type) || Boolean(c.decoration) || ['npc','pokemart','pokecenter','gym','house'].includes(c.entity);
function reachable(m){const q=[[0,0]],seen=new Set(['0,0']);for(let i=0;i<q.length;i++){
 const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
  if(nx<0||nx>9||ny<0||ny>9||seen.has(k)||blocked(m[ny][nx]))continue;
  seen.add(k);q.push([nx,ny]);
 }}return seen;}
function fixture(floor){const g=Object.create(P);Object.assign(g,{floor,gridSize:10,
  playerPos:{x:0,y:0},badges:[],completedGymFloors:new Set(),npcSprites:Array.from({length:16},(_,i)=>`npc-${i}`),
  npcDialogues:Array(12).fill('dialogo'),npcFallbacks:['npc.svg'],trainerSprites:['trainer'],
  team:[],isLocked:false,items:{fishingRod:false,pokeball:5,potion:3,elixir:1},radarCharges:3});
 g.$id=el;g.logMsg=()=>{};g.renderDungeon=()=>{};g.renderSidebar=()=>{};return g;}
let checks=0,buildings=0,raids=0;
for(let floor=1;floor<=80;floor++){
 for(let trial=0;trial<50;trial++){
  const g=fixture(floor);g.generateFloorDungeon();
  assert.equal(g.gridMap.length,10);const m=g.gridMap;const seen=reachable(m);
  assert.ok(seen.has('9,9'),`floor ${floor}, trial ${trial}: exit unreachable`);checks++;
  const town=floor%5===0;
  if(town){
   assert.equal(m.flat().filter(c=>c.hiddenRaid).length,0);
   for(const c of m.flat()){
    if(!['pokecenter','pokemart','gym','npc'].includes(c.entity))continue;
    const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(`${c.x+dx},${c.y+dy}`));
    assert.ok(adjacent,`floor ${floor}, trial ${trial}: ${c.entity} at ${c.x},${c.y} unreachable`);buildings++;
   }
   if(floor===5)assert.equal(m.flat().filter(c=>c.specialRole==='fisherman').length,1);
   else assert.equal(m.flat().filter(c=>c.specialRole==='fisherman').length,0);
  }else{
   const raid=m.flat().filter(c=>c.hiddenRaid),items=m.flat().filter(c=>c.entity==='item'),trainers=m.flat().filter(c=>c.entity==='trainer');
   assert.equal(raid.length,1,`floor ${floor}, trial ${trial}: raid count`);
   assert.ok(seen.has(`${raid[0].x},${raid[0].y}`));
   assert.ok(items.length>=1&&items.length<=3&&trainers.length>=1&&trainers.length<=4);
   for(const item of items){assert.ok(seen.has(`${item.x},${item.y}`));assert.ok(['pokeball','potion','elixir'].includes(item.itemKind));}
   for(const tr of trainers)assert.ok(seen.has(`${tr.x},${tr.y}`));
   raids++;
  }
 }
}
console.log(`PASS 80 FLOORS: ${checks} maps, ${raids} hidden raids, ${buildings} reachable town interactions; 10x10 unchanged.`);
