'use strict';
/** Pokéxplorer V7.7 F1: behavioral tests for the newly introduced game rules. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
let checks=0;
const equal=(a,b,desc)=>{assert.equal(a,b,desc);checks++;};
const ok=(condition,desc)=>{assert.ok(condition,desc);checks++;};
let roll=0.2;
const math=Object.create(Math);math.random=()=>roll;
const docNodes=new Map();
function el(id){
  if(!docNodes.has(id)){
    const node={id,style:{},innerHTML:'',textContent:'',children:[],disabled:false,className:'',classList:{add(){},remove(){},contains(){return false}},appendChild(c){this.children.push(c);return c},replaceChildren(...v){this.children=v},setAttribute(k,v){this[k]=v},getBoundingClientRect(){return {top:0,left:0,height:50,width:50}},parentNode:{insertBefore(){}}};
    docNodes.set(id,node);
  }
  return docNodes.get(id);
}
const document={getElementById:el,createElement:()=>el('dynamic'+Math.random()+Math.random()),querySelectorAll:()=>[],body:el('body')};
const ctx=vm.createContext({console,Math:math,document,window:{matchMedia:()=>({matches:true})},Image:class {},fetch:async()=>({ok:false,status:404}),setTimeout:()=>1,clearTimeout(){}});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8')+';this.Pokemon=Pokemon;this.Move=Move;this.createMove=createMove;',ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8')+';this.GameEngine=GameEngine;this.KANTO_GYMS=KANTO_GYMS;this.rollMagnitude=rollMagnitude;',ctx);
const fixture=(name,id=1)=>({id,name,base_experience:60,types:[{type:{name:'normal'}}],sprites:{front_default:'image.png',back_default:'back.png'},abilities:[],stats:['hp','attack','defense','special-attack','special-defense','speed'].map(n=>({stat:{name:n},base_stat:50,effort:0})),moves:[]});
const mon=(name,level=5,id=1)=>new ctx.Pokemon(fixture(name,id),level);
const badges=(n)=>Array.from({length:n},(_,i)=>({id:i,name:`badge ${i}`}));
function engine(mons=[mon('RED')],n=0){const game=Object.create(ctx.GameEngine.prototype);Object.assign(game,{team:mons,activeMon:mons[0],badges:badges(n),expShareEnabled:true,items:{pokeball:5},battleParticipants:new Set(),battleType:'wild',enemyMon:mon('ENEMY',8),gymQueue:[],battleBusy:false,isLocked:false,bagCategory:'chiave',money:600,floor:1,radarCharges:3,adventureCompleted:false,battleText:async()=>{},logMsg(){},renderSidebar(){},updateBattleHUD(){},playAttackAnimation:async()=>{},wait:async()=>{},setBattleMsg(){}});game.$id=el;return game;}
async function main(){
  const g=engine();
  const caps=[14,21,24,29,35,43,47,50,100],slots=[2,3,3,4,4,5,5,6,6];
  for(let n=0;n<=8;n++){g.badges=badges(n);equal(g.getLevelCap(),caps[n],`${n} badges: cap`);equal(g.getTeamSlotLimit(),slots[n],`${n} badges: slots`);}
  g.badges=[{id:0},{id:0},{id:1}];equal(g.badgeCount(),2,'duplicate badge ignored');
  equal(g.getTeamSlotLimit(),3,'duplicate badge does not unlock extra slot');
  g.badges=[];ok(!g.hasExpShare(),'XP Share locked before badge two');ok(!g.toggleExpShare(),'XP Share toggle forbidden before badge two');
  g.badges=badges(2);ok(g.hasExpShare(),'XP Share unlocked at badge two');ok(g.toggleExpShare(),'XP Share toggle responds when unlocked');ok(!g.expShareEnabled,'XP Share now disabled');
  g.toggleExpShare();ok(g.expShareEnabled,'XP Share toggles back on');
  const maxCap=mon('CAPPED',13);const result=await maxCap.gainExperience(99999,14);equal(maxCap.level,14,'temporary badge cap respected');equal(maxCap.exp,0,'surplus XP discarded at badge cap');equal(result.length,1,'only one level-up event emitted');
  await maxCap.gainExperience(10000,14);equal(maxCap.level,14,'cannot gain extra levels during cap');equal(maxCap.exp,0,'no stockpiling XP at badge cap');
  await maxCap.gainExperience(maxCap.expToNext,21);equal(maxCap.level,15,'can gain XP after receiving next badge');
  const first=mon('FIRST'),second=mon('SECOND');const p=engine([first,second]);p.activeMon=second;equal(p.ensureActivePokemon(),second,'non-first active is preserved');p.team.reverse();equal(p.ensureActivePokemon(),second,'team reorder retains battler');p.team.splice(p.team.indexOf(second),1);equal(p.ensureActivePokemon(),first,'if active removed pick healthy fallback');first.currentHp=0;equal(p.ensureActivePokemon(),null,'no live team member returns null');
  const choose=engine([mon('LEAD'),mon('CHOSEN')]);
  choose.isBattleVisible=()=>false;choose.closePartyActions=()=>{};
  ok(choose.setActivePartyPokemon(choose.team[1]),'lead can be chosen explicitly outside battle');
  equal(choose.activeMon,choose.team[1],'chosen lead stays active');
  choose.isBattleVisible=()=>true;
  ok(!choose.setActivePartyPokemon(choose.team[0]),'lead cannot change without a battle switch mid-battle');
  choose.isBattleVisible=()=>false;choose.team[0].currentHp=0;
  ok(!choose.setActivePartyPokemon(choose.team[0]),'fainted Pokémon cannot become active');
  // Catching with zero badges and two occupied slots must offer replacement/release.
  const a=mon('ALPHA'),b=mon('BRAVO'),wild=mon('WILD');const capGame=engine([a,b]);capGame.enemyMon=wild;capGame.activeMon=a;capGame.badges=[];capGame.items={pokeball:1};capGame.animateCapture=async()=>{};capGame.endBattle=msg=>{capGame.finished=msg};capGame.promptTeamFullChoice=mon=>{capGame.pending=mon};capGame.enemyTurn=async()=>{};
  roll=0;await capGame.useBattleItem('pokeball');equal(capGame.team.length,2,'zero badges restrict team to two');equal(capGame.pending,wild,'over-limit capture offers replacement');
  capGame.pending=null;capGame.battleBusy=false;capGame.badges=badges(1);capGame.items.pokeball=1;capGame.enemyMon=mon('NEW WILD');await capGame.useBattleItem('pokeball');equal(capGame.team.length,3,'badge one unlocks third capture slot');ok(capGame.finished?.includes('catturato'),'unlocked slot completes catch');
  // XP Share grant only if it is unlocked, only for healthy reserve and not twice to participants.
  const fightMons=[mon('ACTIVE'),mon('BENCH'),mon('PARTICIPANT'),mon('FAINT')];fightMons[3].currentHp=0;
  const xp=engine(fightMons,2);xp.activeMon=fightMons[0];xp.enemyMon=mon('VICTIM',6);xp.enemyMon.evYield={};xp.battleParticipants=new Set([fightMons[0],fightMons[2]]);xp.earned=[];xp.awardBattleExperience=async(m,n)=>xp.earned.push({m,n});xp.endBattle=()=>{};
  await xp.handleBattleVictory();equal(xp.earned.length,3,'participant, second participant and healthy reserve receive XP');
  const award=m=>xp.earned.find(r=>r.m===m)?.n;
  ok(award(fightMons[0])>award(fightMons[1]),'active earns more than nonparticipant');
  ok(award(fightMons[2])>award(fightMons[1]),'participant earns more than healthy reserve');
  equal(award(fightMons[3]),undefined,'fainted Pokémon gets no share');
  xp.expShareEnabled=false;xp.earned=[];await xp.handleBattleVictory();equal(xp.earned.length,2,'disabled XP Share excludes reserve');
  xp.badges=[];xp.expShareEnabled=true;xp.earned=[];await xp.handleBattleVictory();equal(xp.earned.length,2,'zero badges cannot distribute shared XP');
  const x=engine([mon('TO_CAP',13)]);x.earned=[];x.battleText=async message=>x.earned.push(message);await x.awardBattleExperience(x.team[0],999999);equal(x.team[0].level,14,'battle XP does not cross cap');x.earned=[];await x.awardBattleExperience(x.team[0],500);ok(x.earned.some(v=>v.includes('limite di livello 14')),'battle displays badge cap');
  // Each gym has one predetermined level for every member.
  const gymLevels=[[12,14],[18,21],[21,18,24],[24,29,29],[32,34,35],[38,37,43],[42,40,42,47],[45,42,44,50]];
  for(let i=0;i<8;i++){ok(ctx.KANTO_GYMS[i].pokemon.length===ctx.KANTO_GYMS[i].levels.length,`gym ${i+1} roster/levels aligned`);equal(JSON.stringify(ctx.KANTO_GYMS[i].levels),JSON.stringify(gymLevels[i]),`gym ${i+1} fixed levels`);}
  // Magnitude official weight distribution boundary checks.
  for(const [n,lv] of [[0,4],[.0499,4],[.05,5],[.1499,5],[.15,6],[.3499,6],[.35,7],[.6499,7],[.65,8],[.8499,8],[.85,9],[.9499,9],[.95,10],[.9999,10]]){equal(ctx.rollMagnitude(()=>n).level,lv,`magnitude p=${n}`);}
  const protect=await ctx.createMove('protect'),magnitude=await ctx.createMove('magnitude');equal(protect.priority,3,'Gen III Protezione priority 3 even offline');equal(magnitude.type,'ground','Magnitude is Ground type');
  const battle=engine([mon('ATTACKER',20)]);battle.enemyMon=mon('DEFENDER',20);battle.enemyMon.currentHp=battle.enemyMon.maxHp;battle.activeMon.currentHp=battle.activeMon.maxHp;
  const defender=battle.enemyMon,attacker=battle.activeMon;attacker.status=null;defender.status=null;
  const strike=new ctx.Move('Azione','normal',40,35,'physical',null,{id:'tackle'});
  roll=0.1;await battle.applyMove(defender,attacker,protect,'player');ok(defender.protectedThisTurn,'Protezione activates');equal(protect.currentPp,9,'Protezione consumes one PP');
  const hp=defender.currentHp;await battle.applyMove(attacker,defender,strike,'enemy');equal(defender.currentHp,hp,'Protezione blocks incoming damage');
  battle.beginBattleTurn();ok(!defender.protectedThisTurn,'Protection expires next turn');await battle.applyMove(attacker,defender,strike,'enemy');ok(defender.currentHp<hp,'damage lands next turn');
  const hp2=defender.currentHp;roll=.99;await battle.applyMove(defender,attacker,protect,'player');ok(!defender.protectedThisTurn,'consecutive Protection can fail');
  roll=.4;await battle.applyMove(attacker,defender,magnitude,'enemy');ok(defender.currentHp<hp2,'Magnitude applies dynamically calculated damage');equal(magnitude.power,70,'Magnitude metadata remains immutable between uses');
  console.log(`PASS F1: ${checks} checks — progression, party, XP Share, gym balance, Protect and Magnitude`);
}
main().catch(err=>{console.error(err);process.exitCode=1});
