'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
class ClassList{constructor(){this.values=new Set()}add(...xs){xs.forEach(x=>this.values.add(x))}remove(...xs){xs.forEach(x=>this.values.delete(x))}contains(s){return this.values.has(s)}toggle(x,v){v??=!this.contains(x);v?this.add(x):this.remove(x)}}
class El{
 constructor(id=''){this.id=id;this.className='';this.classList=new ClassList();this.style={};this.dataset={};this.children=[];this.textContent='';this.disabled=false;this.src='';this.width=16;this.height=32;}
 replaceChildren(...xs){this.children=xs}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}addEventListener(){}focus(){}
 getBoundingClientRect(){return {left:this.x||0,top:this.y||0,width:this.width,height:this.height,bottom:(this.y||0)+this.height,right:(this.x||0)+this.width}}
}
const elements=new Map();const document={getElementById(id){if(!elements.has(id))elements.set(id,new El(id));return elements.get(id)},createElement(t){return new El(t)},querySelectorAll(){return[]},addEventListener(){},body:new El('body')};
const context=vm.createContext({document,console,window:{matchMedia:()=>({matches:false})},Math,setTimeout:()=>0,clearTimeout(){},Image:function(){},fetch:async()=>({ok:false,status:404})});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;this.Move=Move;this.createMove=createMove;this.calculateBattleDamage=calculateBattleDamage;',context);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;this.scaledBattleExperience=scaledBattleExperience;this.BAG_LIMITS=BAG_LIMITS;',context);
const P=context.GameEngine.prototype;
function game(floor=1){const g=Object.create(P);Object.assign(g,{floor,money:10000,gridSize:10,playerPos:{x:0,y:0},gridMap:Array.from({length:10},()=>Array.from({length:10},()=>({revealed:false,type:'path'}))),team:[],items:{potion:3,elixir:1,pokeball:5,fishingRod:false},radarCharges:3,badges:[],completedGymFloors:new Set(),currentGym:null,gymQueue:[],battleParticipants:new Set(),isLocked:false,adventureCompleted:false,battleToken:0,battleBusy:false,bagCategory:'rimedi'});g.$id=id=>document.getElementById(id);g.logMsg=msg=>g.lastLog=msg;g.renderDungeon=()=>{};g.renderSidebar=()=>{};g.battleText=async()=>{};g.wait=async()=>{};g.playAttackAnimation=async()=>{};g.updateBattleHUD=()=>{};g.showDiscoveryNotice=()=>{};g.hideAllActions=()=>{};g.openWings=()=>{};return g;}
const pokemonData=(id=1)=>({id,name:'demo',base_experience:68,types:[{type:{name:'normal'}}],sprites:{front_default:'front',back_default:'back'},stats:[['hp',50],['attack',55],['defense',50],['special-attack',55],['special-defense',50],['speed',50]].map(([name,value])=>({stat:{name},base_stat:value})),moves:[]});
function mon(level=5){return new context.Pokemon(pokemonData(),level)}
async function main(){
 let checks=0;const ok=(condition,msg)=>{assert(condition,msg);checks++};
 // Early encounter boundaries: first five floors and new level curve.
 for(let f=1;f<=5;f++){
  const g=game(f);ok(g.encounterLevel('wild',false,()=>0)===(f===1?1:2),`wild min floor ${f}`);
  ok(g.encounterLevel('wild',false,()=>.99)===3,`wild max floor ${f}`);
  ok(g.encounterLevel('trainer',false,()=>0)===4,`trainer min floor ${f}`);
  ok(g.encounterLevel('trainer',false,()=>.99)===5,`trainer max floor ${f}`);
 }
 ok(game(6).encounterLevel('wild')>=5,'post-village curve');ok(game(16).encounterLevel('wild')<20,'floor 16 not inflated');
 // Level-scaled XP rewards; growth is monotonic and trainer bonus counts.
 const exp=context.scaledBattleExperience;
 ok(exp(68,12,5)>exp(68,12,12),'lower recipient gains more');
 ok(exp(68,12,12)>exp(68,12,40),'overleveled recipient gains less');
 ok(exp(68,20,10)>exp(68,5,10),'strong opponents worth more');
 ok(exp(68,8,5,1.25)>exp(68,8,5,1),'trainer multiplier');
 // Learnset FALLBACK stat stages and status moves when external API is inaccessible.
 const growl=await context.createMove('growl');ok(growl.statChange?.stat==='attack' && growl.statChange?.stage===-1,'offline growl lowers attack');
 const tail=await context.createMove('tail-whip');ok(tail.statChange?.stat==='defense','offline tail-whip lowers defense');
 const thunder=await context.createMove('thunder-wave');ok(thunder.ailment==='paralysis','offline thunder wave paralysis');
 // Mechanical damage mitigation and temporary buff stage values.
 const attacker=mon(12),defender=mon(12),scratch=new context.Move('Graffio','normal',40,35,'physical');
 const before=context.calculateBattleDamage(attacker,defender,scratch,()=>.5).damage;
 attacker.statStages.attack=-2;
 const nerfed=context.calculateBattleDamage(attacker,defender,scratch,()=>.5).damage;
 ok(nerfed<before,`attack stage reduces damage: ${before}/${nerfed}`);
 attacker.statStages.attack=0;defender.statStages.defense=-2;
 const boosted=context.calculateBattleDamage(attacker,defender,scratch,()=>.5).damage;
 ok(boosted>before,`defense stage increases incoming damage: ${before}/${boosted}`);
 const statusGame=game();statusGame.activeMon=attacker;statusGame.enemyMon=defender;
 attacker.statStages={};defender.statStages={};
 await statusGame.applyMove(attacker,defender,growl,'enemy');
 ok(defender.statStages.attack===-1,'Growl actually changes defender stats');
 statusGame.renderBattleConditions('enemy',defender);
 ok(elements.get('enemy-conditions').children.some(x=>x.textContent==='ATT -1'),'Stat debuff HUD');
 defender.status='paralysis';statusGame.renderBattleConditions('enemy',defender);
 ok(elements.get('enemy-conditions').children.some(x=>x.textContent==='PAR'),'Status ailment HUD');
 ok(statusGame.battleSpeed(defender)<defender.speed,'Paralysis reduces effective speed');
 statusGame.team=[attacker];attacker.status='burn';attacker.statStages={attack:2};
 statusGame.endBattle('Fine');
 ok(attacker.status===null && !Object.keys(attacker.statStages).length,'Player temporary effects reset at battle end');
 ok(defender.status===null && !Object.keys(defender.statStages).length,'Opponent temporary effects reset at battle end');
 // Limited inventory and market costs, without deducting coins on full inventory.
 const shop=game();shop.items.pokeball=19;
 ok(shop.purchaseItem('pokeball',200) && shop.items.pokeball===20,'purchase last ball');
 const money=shop.money;ok(!shop.purchaseItem('pokeball',200)&&shop.money===money,'cannot buy past 20 balls / charged zero');
 shop.items.potion=10;ok(!shop.grantItem('potion'),'10 potion cap');
 shop.items.elixir=10;ok(!shop.grantItem('elixir'),'10 elixir cap');
 ok(shop.grantItem('fishingRod'),'fishing rod can be gifted');
 ok(!shop.grantItem('fishingRod'),'fishing rod gift cannot be duplicated');
 // Radar starts at three, never goes negative; market purchases one extra use.
 const radar=game();for(let i=0;i<3;i++){radar.gridMap[0][0].revealed=false;radar.scanRadar();}
 ok(radar.radarCharges===0,'radar starts at 3 and exhausts');radar.gridMap[0][0].revealed=false;radar.scanRadar();ok(radar.radarCharges===0,'radar no underflow');
 const previous=radar.money;ok(radar.purchaseRadar() && radar.money===previous-2000 && radar.radarCharges===1,'shop scan purchase');
 // Capture trajectory must target the actual enemy sprite box, not an arbitrary stage coordinate.
 const arena=game();document.getElementById('battle-stage').x=150;document.getElementById('battle-stage').y=100;document.getElementById('battle-stage').width=460;document.getElementById('battle-stage').height=340;
 document.getElementById('enemy-sprite').x=400;document.getElementById('enemy-sprite').y=215;document.getElementById('enemy-sprite').width=84;document.getElementById('enemy-sprite').height=84;
 const hit=arena.battleSpritePosition('enemy');ok(hit.x===292 && Math.abs(hit.y-160.36)<.1,'capture target is enemy sprite center');

 const movements=[];
 document.getElementById('battle-stage').querySelector=()=>document.getElementById('enemy-platform-gba-test');
 document.getElementById('enemy-platform-gba-test').x=330;
 document.getElementById('enemy-platform-gba-test').y=278;
 document.getElementById('enemy-platform-gba-test').width=200;
 document.getElementById('enemy-platform-gba-test').height=50;
 arena.playMotion=async (node,frames)=>{movements.push({id:node.id,frames});};
 await arena.animateCapture(3,true);
 const captureArc=movements.find(x=>x.id==='capture-ball').frames;
 ok(captureArc.length===6 && captureArc[captureArc.length-1].transform.includes('273px'),
  'Capture ball ends throw on enemy sprite center');
 ok(movements.filter(x=>x.id==='capture-ball').length>=6,'Capture glows and shakes three times');

 // Static gate checks: no Gastly before village, temporary effects in battle only, new shop controls.
 const engineSource=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
 ok(!game(5).getEncounterPool('wild').includes(92) && game(6).getEncounterPool('wild').includes(92),'Gastly excluded from early routes');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const id of ['buy-elixir-btn','buy-radar-btn','enemy-conditions','player-conditions','radar-charge-count'])ok(html.includes(`id="${id}"`),`UI element ${id}`);
 console.log(`PASS V7.3: ${checks} assertions (encounters, XP, stats, status HUD, inventory, radar, capture and UI).`);
}
main().catch(err=>{console.error(err);process.exitCode=1});
