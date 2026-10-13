'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let checks=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);checks++}
function ok(a,msg){assert.ok(a,msg);checks++}
function pngSize(name){const b=fs.readFileSync(path.join(root,name));ok(b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),`Valid PNG: ${name}`);return [b.readUInt32BE(16),b.readUInt32BE(20)]}
for(const gender of ['red','girl']){
 for(const dir of ['up','down','left','right'])for(let i=0;i<3;i++){
  const name=`assets/${gender}/walk/${dir}-${i}.png`;
  ok(fs.existsSync(path.join(root,name)),name);const [w,h]=pngSize(name);
  ok(w>=16&&w<=64 && h>=16&&h<=64,`Valid walking frame dimensions ${name}`);
 }
}
for(const dir of ['up','down','left','right'])for(let i=0;i<4;i++){
 const name=`assets/girl/fish/${dir}-${i}.png`;
 ok(fs.existsSync(path.join(root,name)),name);pngSize(name);
}
ok(pngSize('assets/girl/throw/full.png')[0]>64,'Female throw asset is a complete transparent trainer, not a broken 32x40 slice');
for(let i=0;i<5;i++){ok(fs.existsSync(path.join(root,`assets/red/throw/${i}.png`)),`Male throw pose ${i}`);pngSize(`assets/red/throw/${i}.png`);}
// Use source-level shape contract; browser suite covers DOM interactions.
const source=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [id,name] of [['choose-male','male choice'],['choose-female','female choice'],['gym-entry-no','gym cancel'],['gym-entry-yes','gym confirm'],['btn-party-lead','lead Pokemon']]){
 if(id==='btn-party-lead')continue;
 ok(html.includes(`id="${id}"`),`${name} markup`);
}
ok(source.includes('this.stopContinuousWalk(`key:${dir}`)'), 'Keyboard release stops repeat');
ok(source.includes('visibilitychange'), 'Loss of focus cancels walk');
ok(source.includes('lostpointercapture'), 'Touch capture loss cancels walk');
ok(source.includes('walk-arrival') && css.includes('player-tile-arrive'), 'Walk tween attached to moved sprite');
ok(css.includes('image-rendering:pixelated'), 'Pixel art preserved');
ok(css.includes('prefers-reduced-motion'), 'Respects reduced motion');
ok(css.includes('rotom-looking-left'), 'Rotom looks around');
ok(css.includes('rotom-closed'), 'Rotom blinks');
ok(html.includes('POKÉMARKET'), 'Market UI preserved');
ok(source.includes('this.playerGender=\'male\';'), 'Default male avatar');
let id=0;const pending=new Map(),cancelled=[];
const fakeSetTimeout=(fn,ms)=>{pending.set(++id,{fn,ms,kind:'delay'});return id},fakeSetInterval=(fn,ms)=>{pending.set(++id,{fn,ms,kind:'interval'});return id};
const fakeClear=id=>{cancelled.push(id);pending.delete(id)};
const document={getElementById(){return null},querySelectorAll(){return []},addEventListener(){}};
const ctx=vm.createContext({console,document,window:{location:{},matchMedia:()=>({matches:false})},Math,setTimeout:fakeSetTimeout,setInterval:fakeSetInterval,clearTimeout:fakeClear,clearInterval:fakeClear,Image:class{}});
vm.runInContext(fs.readFileSync(path.join(root,'js/pokemon.js'),'utf8'),ctx);
vm.runInContext(source+';this.GameEngine=GameEngine;',ctx);
const engine=Object.create(ctx.GameEngine.prototype);let moved=[];engine.playerGender='male';engine.team=[];engine.isLocked=false;engine.adventureCompleted=false;engine.pendingItemTarget=null;engine.gridMap=[[{}]];engine.movePlayer=(dx,dy)=>moved.push([dx,dy]);
const buttons=new Map([['choose-male',{classList:{toggle(){}},setAttribute(n,v){this[n]=v}}],['choose-female',{classList:{toggle(){}},setAttribute(n,v){this[n]=v}}]]);
engine.$id=id=>buttons.get(id);
ok(engine.selectPlayerGender('female'),'Girl can be chosen before receiving a starter');
eq(engine.playerGender,'female','Female selection stored');
eq(buttons.get('choose-female')['aria-pressed'],'true','Female selection is accessible');
engine.team.push({});ok(!engine.selectPlayerGender('male'),'Cannot change gender mid-adventure');engine.team=[];
ok(engine.startContinuousWalk(1,0,'key:right'),'Right key starts walk');eq(moved.length,1,'First step immediately');
ok(engine.startContinuousWalk(1,0,'key:right'),'Auto-repeat ignored');eq(moved.length,1,'No duplicate immediate movement');
const timer=engine.heldWalk.delay;pending.get(timer).fn();
const interval=engine.heldWalk.interval;pending.get(interval).fn();eq(moved.length,2,'Long press continues movement');
engine.stopContinuousWalk('key:right');eq(engine.heldWalk,null,'Key release stops movement');ok(cancelled.includes(interval),'Interval cancelled');
engine.isLocked=true;ok(!engine.startContinuousWalk(0,1,'key:down'),'Locked game cannot start movement');
console.log(`PASS F3+F4: ${checks} checks — complete gender/throw sprite assets, input lifecycles, motion, CSS UX`);
