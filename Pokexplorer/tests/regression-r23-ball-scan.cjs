'use strict';
// Regression for R2.3: throws land on the actual platform while Pokémon sprites
// are hidden; Dev Mode reveals current and every subsequent dungeon floor.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const noop=()=>{};
function element(id,rect={left:0,top:0,width:0,height:0}){
  return {id,style:{},textContent:'',value:'',className:'',children:[],attrs:{},
    classList:{add:noop,remove:noop,contains:()=>false},
    getBoundingClientRect:()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height}),
    removeAttribute(name){if(name==='style')this.style={}},setAttribute(k,v){this.attrs[k]=v},
    focus:noop,querySelector:()=>({classList:{toggle:noop}})};
}
const ids={};
const document={getElementById:id=>ids[id]||(ids[id]=element(id)),querySelectorAll:()=>[],addEventListener:noop};
const context=vm.createContext({document,window:{matchMedia:()=>({matches:false})},console,Math,setTimeout:()=>0,clearTimeout:noop,Image:class{}});
vm.runInContext(engine+';this.GameEngine=GameEngine',context);
const Engine=context.GameEngine;
const oldBind=Engine.prototype.bindEvents,oldRotom=Engine.prototype.scheduleRotomExpression;
Engine.prototype.bindEvents=noop;Engine.prototype.scheduleRotomExpression=noop;
const game=new Engine();
Engine.prototype.bindEvents=oldBind;Engine.prototype.scheduleRotomExpression=oldRotom;
game.$id=id=>document.getElementById(id);game.logMsg=noop;game.renderSidebar=noop;
function coordinate(frame){const m=/translate3d\(([-\d.]+)px,([-\d.]+)px,0\)/.exec(frame.transform);assert.ok(m,frame.transform);return {x:Number(m[1]),y:Number(m[2])}}
async function testThrow(width,height){
  const stage=element('battle-stage',{left:150,top:90,width,height});
  const playerPlatform=element('player-platform',{left:150+width*.04,top:90+height*.80,width:width*.43,height:54});
  const enemyPlatform=element('enemy-platform',{left:150+width*.55,top:90+height*.39,width:width*.41,height:52});
  stage.querySelector=selector=>selector.includes('enemy')?enemyPlatform:playerPlatform;
  ids['battle-stage']=stage;
  // These sprites are intentionally display:none at the moment of launch!
  ids['enemy-sprite']=element('enemy-sprite');ids['player-sprite']=element('player-sprite');
  ids['player-trainer-sprite']=element('player-trainer-sprite',{left:150+width*.11,top:90+height*.55,width:125,height:150});
  ids['enemy-trainer-sprite']=element('enemy-trainer-sprite',{left:150+width*.72,top:90+height*.11,width:95,height:113});
  ids['battle-throw-ball']=element('battle-throw-ball');
  for(const side of ['player','enemy']){
    let frames;
    game.playerGender='female';
    game.playMotion=async(el,f)=>{if(el.id==='battle-throw-ball')frames=f};
    game.wait=async()=>{};
    await game.animateBall(side);
    assert.equal(frames.length,6);
    const dest=side==='enemy'?enemyPlatform:playerPlatform;
    const expected={x:dest.getBoundingClientRect().left-stage.getBoundingClientRect().left+dest.getBoundingClientRect().width*.5-17,
      y:dest.getBoundingClientRect().top-stage.getBoundingClientRect().top+dest.getBoundingClientRect().height*.28-17};
    const first=coordinate(frames[0]),mid=coordinate(frames[2]),last=coordinate(frames.at(-1));
    assert.ok(Math.abs(last.x-expected.x)<.01,`${side}, ${width}: ball not over platform, x`);
    assert.ok(Math.abs(last.y-expected.y)<.01,`${side}, ${width}: ball not over platform, y`);
    assert.ok(Math.abs(last.x-first.x)>1,`${side}, ${width}: ball never moved horizontally`);
    const t=.38;const linearY=first.y+(last.y-first.y)*t;
    assert.ok(mid.y<linearY,`${side}, ${width}: no throwing arc`);
    assert.equal(frames[0].opacity,1);
    assert.equal(frames.at(-1).opacity,0);
  }
}
async function testScanning(){
  game.renderDungeon=()=>{game.renders=(game.renders||0)+1};
  game.floor=1;game.devMode=false;
  game.generateFloorDungeon();
  assert.ok(game.gridMap.flat().some(c=>!c.revealed),'regular dungeon should start fogged');
  const radarBefore=game.radarCharges;
  assert.equal(game.activateDevMode('0000'),false,'invalid code should not scan');
  assert.ok(game.gridMap.flat().some(c=>!c.revealed),'invalid code must leave fog intact');
  assert.equal(game.activateDevMode('2103'),true);
  assert.ok(game.gridMap.flat().every(c=>c.revealed),'current dungeon not completely scanned');
  assert.equal(game.radarCharges,radarBefore,'scanning in DEV mode should not use radar charges');
  game.floor=2;game.generateFloorDungeon();
  assert.ok(game.gridMap.flat().every(c=>c.revealed),'next dungeon not completely scanned');
  assert.equal(game.gridMap.flat().filter(c=>c.hiddenRaid).length,1,'hidden raid tile must still exist');
  assert.equal(game.radarCharges,radarBefore,'new dungeon scanning must not use radar charges');
  game.floor=5;game.generateFloorDungeon();
  assert.ok(game.gridMap.flat().every(c=>c.revealed),'town map should remain visible');
  assert.ok(css.includes('#battle-throw-ball.ball-compositor'),'transform compositor animation still available');
}
(async()=>{
  for(const [w,h] of [[340,300],[600,430],[980,650]])await testThrow(w,h);
  await testScanning();
  console.log('PASS R2.3: throws on platform (player/enemy, 3 stage sizes); DEV map scan current/next/town, invalid PIN, no radar charges, hidden raid preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
