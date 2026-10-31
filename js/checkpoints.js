/* Versioned offline checkpoints. Game-only state, no credentials/DEV controls.
   Do not serialize active battles: snapshot boundaries are starter, finished floor,
   completed battle, and explicit safe manual save. */
(function(root,factory){
  const api=factory(); if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PokexCheckpoints=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const KEY='pokexplorer:checkpoint:v2', MAX=950000;
  const temporary=new Map();
  const fallbackStorage={getItem:k=>temporary.get(k)||null,setItem:(k,v)=>temporary.set(k,v),removeItem:k=>temporary.delete(k)};
  function resolveStorage(){
    try{if(typeof localStorage!=='undefined'){const key='pokex:storage-probe';localStorage.setItem(key,'1');localStorage.removeItem(key);return localStorage;}}
    catch(error){ /* file:// and privacy modes can deny Web Storage */ }
    return fallbackStorage;
  }
  let owner='local';
  let guestMode=false;
  // Guest mode is volatile by design: never read, overwrite or delete a real user's checkpoints.
  function setGuestMode(active){guestMode=active===true;if(guestMode)owner='guest';else if(owner==='guest')owner='local';}
  function isGuestMode(){return guestMode;}
  const primary=()=>KEY+':'+owner, backup=()=>primary()+':previous';
  function setUser(userId){owner=typeof userId==='string'&&/^[0-9a-f-]{36}$/i.test(userId)?userId:'local';}
  const gameFields=['floor','money','playerPos','playerGender','playerFacing','playerStep','items','radarCharges','badges','expShareEnabled','expShareClaimed','fishingRodGiftClaimed','adventureCompleted','oakEventDismissed','celestialPhase','caughtLegendarySpecies','completedGymFloors','gridMap','team','activeIndex'];
  const monFields=['id','name','level','growthRate','baseExperience','weight','types','type','gender','isShiny','spriteFront','spriteBack','baseStats','ivs','evs','nature','abilityOptions','ability','abilityName','evYield','exp','expToNext','maxHp','attack','defense','spAtk','spDef','speed','currentHp','learnset','moves','movesLoaded'];
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function take(game, now=new Date().toISOString()){
    if(guestMode)return null;
    if(!game || game.isLocked || game.battleBusy || game.isRaidActive || game.pendingItemTarget || game.isCelestialCave || !game.team?.length || !game.gridMap?.length)return null;
    const result={version:2,createdAt:now,runId:game.runId||('run-'+Date.now()),game:{}};
    for(const key of gameFields){
      if(key==='activeIndex')result.game[key]=game.team.indexOf(game.activeMon);
      else if(key==='team')result.game[key]=game.team.map(p=>Object.fromEntries(monFields.map(k=>[k,copy(k==='moves'?p.moves.map(m=>({...m})):p[k]??null)])));
      else if(['caughtLegendarySpecies','completedGymFloors'].includes(key))result.game[key]=[...game[key]];
      else result.game[key]=copy(game[key]??null);
    }
    return validate(result);
  }
  function validate(s){
    if(!s||s.version!==2||!s.game||!Number.isFinite(Date.parse(s.createdAt)))throw Error('Invalid checkpoint format');
    const g=s.game;
    if(!Number.isInteger(g.floor)||g.floor<1||g.floor>80||!Number.isSafeInteger(g.money)||g.money<0)throw Error('Invalid progression');
    if(!Array.isArray(g.team)||g.team.length<1||g.team.length>6||g.team.some(p=>!p||!Number.isInteger(p.id)||p.id<1||p.id>1025||!Number.isInteger(p.level)||p.level<1||p.level>100||!Number.isFinite(p.currentHp)||p.currentHp<0||p.currentHp>p.maxHp||!Array.isArray(p.moves)||p.moves.length>4))throw Error('Invalid party');
    if(g.team.some(p=>(p.gender!=null&&!['male','female','genderless','unknown'].includes(p.gender))||
      (p.isShiny!=null&&typeof p.isShiny!=='boolean')))throw Error('Invalid variant data');
    if(!Number.isInteger(g.activeIndex)||g.activeIndex<0||g.activeIndex>=g.team.length)throw Error('Invalid lead');
    if(!Array.isArray(g.gridMap)||g.gridMap.length!==10||g.gridMap.some(row=>!Array.isArray(row)||row.length!==10))throw Error('Invalid map');
    if(!g.playerPos||![g.playerPos.x,g.playerPos.y].every(v=>Number.isInteger(v)&&v>=0&&v<10))throw Error('Invalid position');
    if(!g.items||typeof g.items!=='object'||Object.values(g.items).some(v=>typeof v!=='boolean'&&(!Number.isSafeInteger(v)||v<0)))throw Error('Invalid inventory');
    if(!Array.isArray(g.badges)||g.badges.length>8||!Array.isArray(g.completedGymFloors)||!Array.isArray(g.caughtLegendarySpecies))throw Error('Invalid progress');
    const json=JSON.stringify(s);if(json.length>MAX)throw Error('Checkpoint too large');return copy(s);
  }
  function load(storage){
    if(guestMode)return null;
    storage=storage||resolveStorage();
    for(const key of [primary(),backup()]){
      const raw=storage.getItem(key);if(!raw)continue;
      try{return validate(JSON.parse(raw));}catch(e){ /* Try the previous committed checkpoint */ }
    }
    return null;
  }
  function save(snapshot,storage){
    if(guestMode)return false;
    storage=storage||resolveStorage();
    const checked=JSON.stringify(validate(snapshot)),original=storage.getItem(primary());
    if(original){try{validate(JSON.parse(original));storage.setItem(backup(),original);}catch(e){}}
    storage.setItem(primary(),checked);return true;
  }
  function discard(storage){if(guestMode)return false;storage=storage||resolveStorage();storage.removeItem(primary());storage.removeItem(backup());return true;}
  function restore(game,snapshot){
    if(guestMode)return false;
    const data=validate(snapshot).game;
    // Import only species from pre-variant checkpoints, no fabricated sexes/shinies.
    if(typeof window!=='undefined')window.PokexDex?.importLegacyTeam?.(snapshot);
    // Rebuild class prototypes: mere JSON objects would break healAll/learnset/etc.
    const team=data.team.map(p=>{
      const mon=Object.assign(Object.create(Pokemon.prototype),p);
      // Old v2 checkpoints had no sex/shiny: do not invent a discovered variant.
      if(!['male','female','genderless'].includes(mon.gender))mon.gender='unknown';
      if(typeof mon.isShiny!=='boolean')mon.isShiny=false;
      mon.moves=p.moves.map(m=>Object.assign(Object.create(Move.prototype),m));
      mon.clearVolatile();return mon;
    });
    for(const key of gameFields){if(key==='team'||key==='activeIndex')continue;
      if(['caughtLegendarySpecies','completedGymFloors'].includes(key))game[key]=new Set(data[key]);
      else game[key]=copy(data[key]);}
    game.items.abilityCapsule=Number.isSafeInteger(game.items.abilityCapsule)&&game.items.abilityCapsule>=0?game.items.abilityCapsule:0;
    game.team=team;game.activeMon=team[data.activeIndex];game.runId=snapshot.runId;
    game.cancelPokemonCenterHealing?.();
    game.isLocked=false;game.isRaidActive=false;game.raidQueueCount=0;
    game.clearRaidTransientState?.();game.battleBusy=false;game.battleMode=null;
    game.gymQueue=[];game.currentGym=null;game.pendingTrainerCell=null;
    game.$id('main-menu-overlay')?.classList.add('hidden');
    game.$id('starter-scene-overlay')?.classList.add('hidden');
    game.$id('overlay-battle')?.classList.add('hidden');
    game.$id('gameover-overlay')?.classList.add('hidden');
    game.$id('rotom-body')?.classList.remove('battle-active');
    game.renderDungeon();game.renderSidebar();game.openWings?.();
    return true;
  }
  function progress(snapshot){
    const g=validate(snapshot).game;return {floor:g.floor,badges:g.badges.length,money:g.money,pokemon:g.team.length,date:snapshot.createdAt};
  }
  return Object.freeze({KEY,setUser,setGuestMode,isGuestMode,validate,take,save,load,restore,progress,discard});
});
