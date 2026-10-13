'use strict';
/* V7.6 preserved mechanics. Music regression is in regression-v77.cjs after replacing YouTube in V7.7. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');let checks=0;
function eq(a,b,msg){assert.equal(a,b,msg);checks++;}
function ok(v,msg){assert.ok(v,msg);checks++;}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
const ctx=vm.createContext({console,Math,document:{},window:{}});
vm.runInContext(engine+';this.scaledBattleExperience=scaledBattleExperience;',ctx);
const xp=(a,b)=>ctx.scaledBattleExperience(64,a,b);
const expected=(a,b)=>Math.max(1,Math.floor((64*a/7)*Math.pow((2*a+10)/(a+b+10),2.5)*1.36));
for(const [foe,recipient] of [[3,5],[10,10],[20,20],[2,20],[20,5]])eq(xp(foe,recipient),expected(foe,recipient),'XP reward formula kept from V7.5');
ok(xp(20,5)>xp(5,20)*30,'low level gains more from high level enemy');
for(const p of [1,2,3,5,10,15,16,20,50,100])ok(Number.isSafeInteger(xp(3,p))&&xp(3,p)>=1,'safe XP at level '+p);
eq((html.match(/rel="stylesheet" href="style\.css"/g)||[]).length,1,'one stylesheet');
const spriteRoot=path.join(root,'assets/red');
eq(['walk','fish','throw'].map(dir=>fs.readdirSync(path.join(spriteRoot,dir)).filter(x=>x.endsWith('.png')).length).join(','),'12,16,5','all 33 Red sprite frames');
console.log('PASS V7.6:',checks,'checks — XP balance and sprite assets');
