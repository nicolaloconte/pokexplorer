'use strict';
/* Regression V7.5 — run from Game/: node tests/regression-v75.cjs */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let n=0;
function eq(a,b,label){assert.equal(a,b,label);n++}
function ok(a,label){assert.ok(a,label);n++}
const elements=new Map();
class FakeElement {
 constructor(id){this.id=id;this.style={};this.classList={add(){},remove(){},contains(){return false},toggle(){}};this.children=[];this.src='';this.textContent=''}
 getBoundingClientRect(){return {width:480,height:330,left:0,top:0}}
 append(...a){this.children.push(...a)}
 replaceChildren(...a){this.children=a}
}
const document={getElementById(id){if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id)},createElement(){return new FakeElement('')},querySelectorAll(){return[]}};
let roll=.9;
const math=Object.create(Math);math.random=()=>roll;
const sandbox=vm.createContext({document,Math:math,console,setTimeout(){},clearTimeout(){},Image:class {},window:{matchMedia:()=>({matches:false})},fetch:async()=>({ok:false,status:404})});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Move=Move;this.Pokemon=Pokemon;this.calculateBattleDamage=calculateBattleDamage;this.accuracyStageMultiplier=accuracyStageMultiplier;this.createMove=createMove;',sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;this.scaledBattleExperience=scaledBattleExperience;',sandbox);
const data=(name)=>({id:1,name,base_experience:64,types:[{type:{name:'normal'}}],sprites:{front_default:'',back_default:''},abilities:[{is_hidden:false,ability:{name:'none'}}],stats:['hp','attack','defense','special-attack','special-defense','speed'].map(name=>({stat:{name},base_stat:55,effort:0})),moves:[]});
async function test(){
  const lowVsHigh=sandbox.scaledBattleExperience(70,18,4),highVsLow=sandbox.scaledBattleExperience(70,4,18),equal=sandbox.scaledBattleExperience(70,10,10);
  ok(lowVsHigh>equal,'low-level Pokémon earns more XP from high-level opponent');ok(highVsLow<equal,'high-level Pokémon earns less XP from low-level opponent');
  const original=Math.floor((70*10/7)*1.18),upgraded=sandbox.scaledBattleExperience(70,10,10);
  ok(upgraded>original,'XP boost increased');ok(upgraded<original*2.0,'XP remains bounded even with the stronger beginner boost');
  eq(sandbox.accuracyStageMultiplier(0),1,'neutral accuracy');eq(sandbox.accuracyStageMultiplier(1),4/3,'+1 accuracy from the 3/3 series');eq(sandbox.accuracyStageMultiplier(-1),3/4,'-1 accuracy');
  let sing=await sandbox.createMove('sing'),sting=await sandbox.createMove('poison-sting'),swift=await sandbox.createMove('swift');
  eq(sing.accuracy,55,'Canto accuracy 55%');eq(sting.ailmentChance,30,'Velenospina 30% poison chance');ok(swift.alwaysHits,'Swift is guaranteed hit (fallback)');
  const a=new sandbox.Pokemon(data('Red'),5),b=new sandbox.Pokemon(data('Blue'),5);
  a.types=['normal'];b.types=['normal'];a.status=null;b.status=null;
  const engine=Object.create(sandbox.GameEngine.prototype);
  Object.assign(engine,{activeMon:a,enemyMon:b,battleBusy:false,abilityAttackImmunity:()=>null,updateBattleHUD(){},setBattleMsg(){},battleText:async()=>{},playAttackAnimation:async()=>{},wait:async()=>{}});
  const miss=new sandbox.Move('Canto','normal',0,15,'status',null,{id:'sing',accuracy:55,ailment:'sleep',ailmentChance:100});
  roll=.90; await engine.applyMove(a,b,miss,'enemy');eq(b.status,null,'Canto can miss');eq(miss.currentPp,14,'PP consumed for performed missed attack');
  roll=.10; await engine.applyMove(a,b,miss,'enemy');eq(b.status,'sleep','Canto can induce sleep');
  const sleeping=new sandbox.Move('Azione','normal',40,35,'physical',null,{id:'tackle'});
  a.status='sleep';a.statusTurns=3;const previousPp=sleeping.currentPp;await engine.applyMove(a,b,sleeping,'enemy');eq(sleeping.currentPp,previousPp,'PP preserved when sleep prevents move');
  const damaging=new sandbox.Move('Graffio','normal',40,35,'physical',null,{id:'scratch'});
  a.status=null;b.status=null;b.statStages={defense:0};const originalD=sandbox.calculateBattleDamage(a,b,damaging,()=>.9).damage;
  b.statStages.defense=3;const defended=sandbox.calculateBattleDamage(a,b,damaging,()=>.9).damage;
  ok(defended<originalD,'defense stages reduce actual damage');
  // Verify stat/power metadata is present in battle and Pokémon detail panels.
  const src=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
  for(const text of ['POT ${m.power', 'PREC ${m.alwaysHits','red/throw/${i}.png','${avatarFolder}/fish/${this.playerFacing}','${avatarFolder}/walk/${this.playerFacing}'])ok(src.includes(text),'engine source includes '+text);
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  eq((html.match(/rel="stylesheet" href="style[^\"]+"/g)||[]).length,1,'one local CSS link');
  ok(css.includes('.red-fishing-sprite')&&css.includes('.girl-local-sprite'),'CSS covers both characters');ok(css.includes('#item-target-message'),'readable popup CSS');
  ok(fs.readdirSync(root).filter(x=>x.startsWith('CHANGELOG')).length>=5,'historical changelogs preserved in the original ZIP');
  ok(fs.readdirSync(root).filter(x=>/^style.*\.css$/.test(x)).length>=5,'historical CSS versions retained; one active stylesheet');
  const spriteRoot=path.join(root,'assets/red');
  eq(fs.readdirSync(path.join(spriteRoot,'walk')).length,12,'12 directional walk/idle sprites');
  eq(fs.readdirSync(path.join(spriteRoot,'fish')).length,16,'16 directional fishing sprites');
  eq(fs.readdirSync(path.join(spriteRoot,'throw')).length,5,'5 ordered throw sprites');
  for(const dir of ['walk','fish','throw'])for(const name of fs.readdirSync(path.join(spriteRoot,dir))){
    const b=fs.readFileSync(path.join(spriteRoot,dir,name));
    eq(b.toString('ascii',1,4),'PNG','sprite PNG signature '+name);
    ok(b.length>120,'nonempty sprite '+name);
  }
  console.log(`PASS V7.5: ${n} checks — sprite frames, XP, accuracy, PP, stat-driven damage, CSS cleanup`);
}
test().catch(e=>{console.error(e);process.exitCode=1});
