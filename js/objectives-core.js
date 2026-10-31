/* Pokéxplorer · Account objectives. Append-only events, offline-first and isolated by owner.
   Cloud persistence requires sql/003_objectives_events.sql. No sensitive keys in client. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PokexObjectives=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const PREFIX='pokexplorer:objectives:v1:';
  const allowed=new Set(['run_start','run_win','catch','floor','badge','cave']);
  const names=['Prima cattura','Collezionista','Maestro delle catture','Primi passi','Esploratore','Veterano','Prima medaglia','Maestro di Kanto','Prima vittoria','Inarrestabile','Spedizione Celeste','Leggenda solitaria','Maestro del Pokédex','Primo splendore','Cacciatore shiny','Leggenda splendente','Il Trio Leggendario'];
  const goals=[1,25,100,10,50,75,1,8,1,5,1,1,151,1,5,1,3];
  const descriptions=[
    'Cattura il tuo primo Pokémon','Cattura 25 Pokémon','Cattura 100 Pokémon',
    'Raggiungi il dungeon 10','Raggiungi il dungeon 50','Raggiungi il dungeon 75',
    'Ottieni una medaglia','Conquista tutte le 8 medaglie di Kanto','Completa una run',
    'Completa 5 run','Concludi la spedizione nella Grotta Celeste',
    'Completa una run senza aggiungere un secondo Pokémon','Cattura tutte le 151 specie di Kanto',
    'Cattura un Pokémon shiny','Cattura 5 Pokémon shiny',
    'Cattura un leggendario shiny','Cattura Articuno, Zapdos e Moltres'
  ];
  const art=['items/pokeball-game.png','items/pokeball-game.png','items/pokeball-game.png',
    'items/old-rod-retro.png','items/radar-game.png','decor/celestial-crystal.svg',
    'badges/kanto-clean-1.png','badges/kanto-clean-8.png','items/gold-candy.png',
    'items/gold-candy.png','decor/celestial-crystal.svg','player/champion/throw/0.png',
    'items/pokeball-game.png','effects/star.svg','effects/star.svg','items/master-ball.svg','effects/star.svg'];
  const accountId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id);
  let owner='local',guest=false,events={},pending=new Set(),client=null,flushPromise=null,status='locale',lastError=null,timer=null;
  function storage(){try{return root.localStorage||null;}catch(_){return null;}}
  function notify(){try{root.dispatchEvent?.(new Event('pokex:objectives-changed'));}catch(_){}}
  function save(){if(guest)return;try{storage()?.setItem(PREFIX+owner,JSON.stringify({events:Object.values(events),pending:[...pending]}));}catch(e){status='errore locale';}}
  function setOwner(id,{guestMode=false}={}){
    guest=!!guestMode;owner=guest?'guest':accountId(id)?id:'local';client=null;
    let found=null;try{if(!guest)found=JSON.parse(storage()?.getItem(PREFIX+owner)||'null');}catch(_){ }
    events={};pending=new Set();
    for(const e of found?.events||[])if(e&&typeof e.event_id==='string'&&allowed.has(e.kind))events[e.event_id]=e;
    for(const id of found?.pending||[])if(events[id])pending.add(id);
    status=guest?'ospite':'locale';lastError=null;notify();
  }
  function eventId(kind,runId,meta){
    if(kind==='run_start'||kind==='run_win'||kind==='cave')return `${kind}:${runId}`;
    if(kind==='floor')return `floor:${runId}:${meta.floor}`;
    if(kind==='badge')return `badge:${runId}:${meta.badges}`;
    // each catch is separate, even of the same species
    const unique=root.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `catch:${runId}:${unique}`;
  }
  function record(kind,runId='',meta={}){
    if(!allowed.has(kind)||typeof runId!=='string'||runId.length<1||runId.length>110)return false;
    const safe={};
    if(kind==='catch'){
      const id=Number(meta.species);if(!Number.isInteger(id)||id<1||id>1025)return false;
      safe.species=id;safe.shiny=meta.shiny===true;
    }else if(kind==='floor')safe.floor=Math.max(1,Math.min(80,Math.floor(Number(meta.floor)||1)));
    else if(kind==='badge')safe.badges=Math.max(0,Math.min(8,Math.floor(Number(meta.badges)||0)));
    else if(kind==='run_win')safe.solo=meta.solo===true && accountId(owner) && !guest;
    else if(kind==='cave')safe.outcome=meta.outcome==='caught'?'caught':'knockout';
    const id=eventId(kind,runId,safe);
    if(events[id])return false;
    events[id]={event_id:id,kind,run_id:runId,species_id:safe.species||null,shiny:safe.shiny||false,
      value:safe.floor??safe.badges??null,metadata:safe,occurred_at:new Date().toISOString()};
    if(!guest&&accountId(owner))pending.add(id);
    save();notify();schedule();return true;
  }
  function values(dex=root.PokexDex){
    const items=Object.values(events);const count=kind=>items.filter(e=>e.kind===kind);
    const starts=count('run_start'),wins=count('run_win'),catches=count('catch'),badges=count('badge'),floors=count('floor');
    const dexData=dex?.entries?.()||{species:[],variants:[]};
    const caughtSpecies=(dexData.species||[]).filter(x=>x.first_caught_at);
    const variantShiny=(dexData.variants||[]).filter(x=>x.shiny===true&&x.first_caught_at);
    const maxFloor=Math.max(0,...floors.map(e=>Number(e.value)||0));
    const maxBadge=Math.max(0,...badges.map(e=>Number(e.value)||0));
    const birdIds=new Set([...catches.map(x=>x.species_id),...caughtSpecies.map(x=>Number(x.species_id))].filter(id=>[144,145,146].includes(id)));
    const shinyCount=catches.filter(x=>x.shiny).length;
    const shinyUnique=variantShiny.length;
    const legendaryShiny=catches.some(x=>x.shiny&&[144,145,146,150].includes(x.species_id))||variantShiny.some(x=>[144,145,146,150].includes(Number(x.species_id)));
    const progress=[catches.length,catches.length,catches.length,maxFloor,maxFloor,maxFloor,maxBadge,maxBadge,
      wins.length,wins.length,count('cave').length,wins.filter(x=>x.metadata?.solo===true).length,
      caughtSpecies.length,Math.max(shinyCount,shinyUnique),shinyCount,legendaryShiny?1:0,birdIds.size];
    return {runs:starts.length,catches:catches.length,wins:wins.length,championUnlocked:progress[11]>0,
      quests:names.map((name,i)=>({id:i+1,name,description:descriptions[i],progress:Math.min(goals[i],progress[i]),goal:goals[i],
        complete:progress[i]>=goals[i],image:'assets/sprites/'+art[i]})),status,lastError,pending:pending.size};
  }
  function unlockChampion(){return accountId(owner)&&!guest&&values().championUnlocked;}
  async function initCloud(supabaseClient){
    if(!accountId(owner)||guest||!supabaseClient)return false;
    client=supabaseClient;status='sincronizzazione';notify();
    try{
      const {data,error}=await client.from('pokexplorer_objective_events').select('event_id,kind,run_id,species_id,shiny,value,metadata,occurred_at');
      if(error)throw error;
      // UNION: local events not yet uploaded must never be lost on login.
      for(const item of data||[])if(item?.event_id&&allowed.has(item.kind))events[item.event_id]??=item;
      save();status='sincronizzato';lastError=null;notify();await flush();return true;
    }catch(e){lastError=String(e.message||e);status='non sincronizzato';notify();throw e;}
  }
  function schedule(){if(!client||!pending.size)return;clearTimeout(timer);timer=setTimeout(()=>{flush().catch(()=>{});},900);}
  async function flush(){
    if(flushPromise)return flushPromise;
    if(!client||!pending.size||!accountId(owner))return;
    const active=owner;
    flushPromise=(async()=>{
      const batch=[...pending].slice(0,100).map(id=>events[id]).filter(Boolean);
      try{
        const {error}=await client.from('pokexplorer_objective_events').upsert(batch.map(e=>({...e,user_id:active})),{onConflict:'user_id,event_id',ignoreDuplicates:true});
        if(error)throw error;
        if(owner===active)for(const e of batch)pending.delete(e.event_id);
        status='sincronizzato';lastError=null;save();notify();
        if(pending.size&&owner===active)await new Promise(resolve=>setTimeout(resolve,30));
        if(pending.size&&owner===active)schedule();
      }catch(e){status='non sincronizzato';lastError=String(e.message||e);notify();throw e;}
    })().finally(()=>{flushPromise=null;});return flushPromise;
  }
  function importCheckpoint(snapshot){
    if(!snapshot?.runId||!snapshot.game)return;
    const g=snapshot.game,run=snapshot.runId;
    record('run_start',run);
    if(Number(g.floor)>=10)for(const n of [10,50,75])if(g.floor>=n)record('floor',run,{floor:n});
    const n=Array.isArray(g.badges)?g.badges.length:0;
    if(n>=1)record('badge',run,{badges:1});if(n>=8)record('badge',run,{badges:8});
    if(g.adventureCompleted)record('run_win',run,{solo:false}); // historical solo mode cannot be verified
  }
  if(root.addEventListener){root.addEventListener('online',schedule);root.addEventListener('pokex:dex-changed',notify);}
  return Object.freeze({setOwner,record,values,unlockChampion,initCloud,flush,importCheckpoint,
    get owner(){return owner;},get guest(){return guest;}});
});
