/* Ability rules for Pokéxplorer: option eligibility comes from PokeAPI, not arbitrary Pokémon. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PokexAbilities=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const ability=p=>String(p?.ability||'none');
const normalOptions=data=>[...new Set((data?.abilities||[]).filter(e=>e?.is_hidden===false&&e.ability?.name&&Number.isInteger(e.slot)&&e.slot>=1).sort((a,b)=>a.slot-b.slot).map(e=>e.ability.name))];
const alternatives=(current,options)=>[...new Set((options||[]).filter(a=>typeof a==='string'&&a!==current))];
function stage(p,key,delta){if(!p)return false;p.statStages??={};let old=p.statStages[key]||0;p.statStages[key]=Math.max(-6,Math.min(6,old+delta));return old!==p.statStages[key];}
function restore(p,f){if(!p||p.currentHp<=0)return 0;let h=Math.max(0,Math.min(p.maxHp-p.currentHp,Math.max(1,Math.floor(p.maxHp*f))));p.currentHp+=h;return h;}
function hurt(p,f){if(!p||p.currentHp<=0)return 0;let h=Math.max(1,Math.min(p.currentHp,Math.floor(p.maxHp*f)));p.currentHp-=h;return h;}
const weather=ctx=>ctx?.weather?.type||null;
const suppress=(attacker)=>['mold-breaker','teravolt','turboblaze'].includes(ability(attacker));
function statusBlocked(p,s,ctx={}){
 const a=ability(p),w=weather(ctx);
 return ['comatose','purifying-salt'].includes(a)||(a==='leaf-guard'&&w==='sun')||
 (['poison','bad-poison'].includes(s)&&['immunity','pastel-veil'].includes(a))||
 (s==='burn'&&['water-veil','water-bubble'].includes(a))||(s==='paralysis'&&a==='limber')||
 (s==='freeze'&&a==='magma-armor')||(s==='sleep'&&['insomnia','vital-spirit','sweet-veil'].includes(a));
}
function dropBlocked(p,key,fromOpponent=true,ctx={}){
 if(!fromOpponent)return false;const a=ability(p);
 return ['clear-body','white-smoke','full-metal-body'].includes(a)||
 (a==='hyper-cutter'&&key==='attack')||(a==='keen-eye'&&key==='accuracy')||
 (a==='flower-veil'&&p.types?.includes('grass'))||(a==='leaf-guard'&&weather(ctx)==='sun');
}
function speedMultiplier(p,ctx={}){
 let m=1,a=ability(p),w=weather(ctx);
 if(a==='chlorophyll'&&w==='sun'||a==='swift-swim'&&w==='rain'||a==='sand-rush'&&w==='sandstorm'||a==='slush-rush'&&['hail','snow'].includes(w))m*=2;
 if(a==='quick-feet'&&p.status)m*=1.5;
 if(a==='slow-start'&&p.slowStartTurns>0)m*=.5;
 if(a==='unburden'&&p.unburdenActive)m*=2;
 return m;
}
function accuracyMultiplier(attacker,defender,move,ctx={}){
 if(move?.alwaysHits||ability(attacker)==='no-guard'||ability(defender)==='no-guard')return Infinity;
 let m=1,w=weather(ctx);
 if(ability(attacker)==='compound-eyes')m*=1.3;
 if(ability(attacker)==='hustle'&&move?.category==='physical')m*=.8;
 if(ability(defender)==='sand-veil'&&w==='sandstorm')m*=.8;
 if(ability(defender)==='snow-cloak'&&['hail','snow'].includes(w))m*=.8;
 if(ability(defender)==='tangled-feet'&&defender.confusionTurns>0)m*=.5;
 return m;
}
function immunity(attacker,defender,move,ctx={}){
 if(suppress(attacker))return null;
 const a=ability(defender),t=move?.type;
 if(a==='levitate'&&t==='ground')return {kind:'immune'};
 if(a==='volt-absorb'&&t==='electric'||a==='water-absorb'&&t==='water'||a==='dry-skin'&&t==='water'||a==='earth-eater'&&t==='ground')return {kind:'heal',amount:.25};
 if(a==='flash-fire'&&t==='fire')return {kind:'boost',key:'flashFireActivated'};
 if(a==='lightning-rod'&&t==='electric'||a==='motor-drive'&&t==='electric'||a==='storm-drain'&&t==='water'||a==='sap-sipper'&&t==='grass')return {kind:'stage',stat:a==='motor-drive'?'speed':a==='sap-sipper'?'attack':'special-attack'};
 if(a==='soundproof'&&move?.sound||a==='bulletproof'&&move?.ballistic)return {kind:'immune'};
 if(a==='wonder-guard'&&move?.power>0&&ctx.effectiveness<=1)return {kind:'immune'};
 return null;
}
function immuneToSand(mon){return mon.types?.some(t=>['rock','ground','steel'].includes(t))||['sand-veil','sand-rush','sand-force','magic-guard','overcoat'].includes(ability(mon));}
function damageModifiers(attacker,defender,move,ctx={}){
 const a=ability(attacker),d=suppress(attacker)?'none':ability(defender),w=weather(ctx);
 const sp=move.category==='special',ph=move.category==='physical',p=move.power||0,t=move.type,eff=ctx.effectiveness??1;
 const r={attack:1,defense:1,power:1,criticalDamage:1,criticalRate:0,ignoreScreens:false};
 if(ph&&['huge-power','pure-power'].includes(a))r.attack*=2;
 if(ph&&a==='guts'&&attacker.status)r.attack*=1.5;
 if(ph&&a==='hustle')r.attack*=1.5;
 if(ph&&a==='slow-start'&&attacker.slowStartTurns>0)r.attack*=.5;
 if(sp&&a==='solar-power'&&w==='sun')r.attack*=1.5;
 if(a==='technician'&&p<=60)r.power*=1.5;
 if(a==='iron-fist'&&move.punch)r.power*=1.2;
 if(a==='strong-jaw'&&move.bite)r.power*=1.5;
 if(a==='reckless'&&move.drain<0)r.power*=1.2;
 if(a==='rivalry'&&['male','female'].includes(attacker.gender)&&['male','female'].includes(defender.gender))r.power*=attacker.gender===defender.gender?1.25:.75;
 if(a==='tinted-lens'&&eff>0&&eff<1)r.power*=2;
 if(a==='sand-force'&&w==='sandstorm'&&['rock','ground','steel'].includes(t))r.power*=1.3;
 if(a==='water-bubble'&&t==='water')r.power*=2;
 if(a==='steelworker'&&t==='steel')r.power*=1.5;
 if(a==='analytic'&&ctx.attackingLast)r.power*=1.3;
 if(a==='flash-fire'&&attacker.flashFireActivated&&t==='fire')r.power*=1.5;
 if(attacker.currentHp<=attacker.maxHp/3&&({overgrow:'grass',blaze:'fire',torrent:'water',swarm:'bug'})[a]===t)r.power*=1.5;
 if(a==='sniper')r.criticalDamage*=1.5;
 if(a==='super-luck')r.criticalRate+=.0625;
 if(a==='infiltrator')r.ignoreScreens=true;
 if(d==='thick-fat'&&['fire','ice'].includes(t))r.defense*=2;
 if(d==='heatproof'&&t==='fire')r.defense*=2;
 if(d==='dry-skin'&&t==='fire')r.defense*=.8;
 if(d==='water-bubble'&&t==='fire')r.defense*=2;
 if(d==='marvel-scale'&&defender.status&&ph)r.defense*=1.5;
 if(d==='fur-coat'&&ph)r.defense*=2;
 if(d==='ice-scales'&&sp)r.defense*=2;
 if(d==='fluffy'&&move.contact)r.defense*=2;
 if(d==='fluffy'&&t==='fire')r.defense*=.5;
 if(['filter','solid-rock','prism-armor'].includes(d)&&eff>1)r.defense*=4/3;
 if(d==='multiscale'&&defender.currentHp===defender.maxHp)r.defense*=2;
 if(a==='unaware')ctx.ignoreDefenderStages=true;
 if(d==='unaware')ctx.ignoreAttackerStages=true;
 if(w==='sun'&&t==='fire'||w==='rain'&&t==='water')r.power*=1.5;
 if(w==='sun'&&t==='water'||w==='rain'&&t==='fire')r.power*=.5;
 return r;
}
function entry(mon,opp,ctx={}){
 if(!mon||!opp)return [];
 const a=ability(mon),out=[];
 if(a==='trace'&&opp.ability&&opp.ability!=='trace'&&opp.ability!=='none'){
   mon.tracedAbility=mon.ability;mon.ability=opp.ability;mon.abilityName=opp.abilityName||opp.ability;out.push(`${mon.name} copia l'abilità di ${opp.name} con Traccia!`);
 }
 if(a==='intimidate'&&!dropBlocked(opp,'attack',true,ctx)&&!['oblivious','inner-focus','own-tempo','scrappy'].includes(ability(opp))){
   if(stage(opp,'attack',-1))out.push(`Prepotenza di ${mon.name} riduce l'Attacco di ${opp.name}!`);
 }
 if(a==='download'){
   const key=opp.defense<=opp.spDef?'attack':'special-attack';
   if(stage(mon,key,1))out.push(`Download aumenta ${key==='attack'?'Attacco':'Attacco Speciale'} di ${mon.name}!`);
 }
 if(a==='screen-cleaner'){for(const p of [mon,opp]){p.reflectTurns=0;p.lightScreenTurns=0;}out.push('Pulivetro dissolve gli schermi!');}
 const w={drizzle:'rain',drought:'sun','sand-stream':'sandstorm','snow-warning':'hail'}[a];
 if(w){ctx.setWeather?.(w);out.push(`${mon.name} scatena un cambiamento del tempo!`);}
 if(a==='slow-start')mon.slowStartTurns=5;
 if(a==='forewarn'){
  const strongest=[...(opp.moves||[])].sort((x,y)=>(y.power||0)-(x.power||0))[0];
  if(strongest)out.push(`${mon.name} prevede ${strongest.name}!`);
 }
 if(a==='anticipation'&&(opp.moves||[]).some(m=>m.power>0&&ctx.typeEffectiveness?.(m.type,mon.types)>1))out.push(`${mon.name} percepisce un pericolo!`);
 if(a==='frisk')out.push(`${mon.name} osserva ${opp.name} con Indagine!`);
 return out;
}
function afterStatDrop(mon,fromOpponent){
 if(!fromOpponent)return [];let out=[];
 if(mon.ability==='defiant'&&stage(mon,'attack',2))out.push(`${mon.name} aumenta l'Attacco con Agonismo!`);
 if(mon.ability==='competitive'&&stage(mon,'special-attack',2))out.push(`${mon.name} aumenta l'Attacco Speciale con Tenacia!`);
 return out;
}
function contact(attacker,defender,move,damage,ctx={}){
 if(!damage||!move?.contact||attacker.currentHp<=0)return [];
 const a=ability(defender),out=[];
 if(!suppress(attacker)){
  const statuses={static:['paralysis',.3],'poison-point':['poison',.3],'flame-body':['burn',.3]};
  let reaction=statuses[a];
  if(a==='effect-spore')reaction=[['poison','paralysis','sleep'][Math.floor(Math.random()*3)],.3];
  if(reaction&&!attacker.status&&!statusBlocked(attacker,reaction[0],ctx)&&Math.random()<reaction[1]){
   attacker.status=reaction[0];attacker.statusTurns=3;out.push(`${attacker.name} subisce ${defender.abilityName||a}!`);
  }
  if(a==='cute-charm'&&['male','female'].includes(attacker.gender)&&['male','female'].includes(defender.gender)&&attacker.gender!==defender.gender&&!attacker.attractedTo&&defender.ability!=='oblivious'&&Math.random()<.3){
    attacker.attractedTo=defender;out.push(`${attacker.name} si innamora per Incantevole!`);
  }
  if(['rough-skin','iron-barbs'].includes(a)){
    const amount=hurt(attacker,1/8);if(amount)out.push(`${attacker.name} subisce ${amount} danni da ${defender.abilityName||a}!`);
  }
  if(['gooey','tangling-hair'].includes(a)&&stage(attacker,'speed',-1))out.push(`${attacker.name} perde Velocità!`);
  if(a==='weak-armor'&&move.category==='physical'){
    stage(defender,'defense',-1);stage(defender,'speed',2);out.push(`Sottilguscio di ${defender.name} si attiva!`);
  }
  if(a==='stamina'&&stage(defender,'defense',1))out.push(`Sopportazione aumenta la Difesa di ${defender.name}!`);
 }
 if(attacker.ability==='poison-touch'&&!defender.status&&!statusBlocked(defender,'poison',ctx)&&Math.random()<.3){
   defender.status='poison';defender.statusTurns=3;out.push(`Velentocco avvelena ${defender.name}!`);
 }
 return out;
}
function afterKnockout(mon){
 if(mon?.ability==='moxie'&&stage(mon,'attack',1))return `${mon.name} aumenta l'Attacco con Arroganza!`;
 return null;
}
function endTurn(mon,ctx={}){
 if(!mon||mon.currentHp<=0)return [];
 const out=[],a=ability(mon),w=weather(ctx);
 if(a==='speed-boost'&&stage(mon,'speed',1))out.push(`${mon.name} aumenta la Velocità con Acceleratore!`);
 if(a==='shed-skin'&&mon.status&&Math.random()<1/3){mon.status=null;mon.statusTurns=0;out.push(`${mon.name} guarisce grazie a Muta!`);}
 if(a==='hydration'&&w==='rain'&&mon.status){mon.status=null;mon.statusTurns=0;out.push(`${mon.name} guarisce grazie a Idratazione!`);}
 if(a==='rain-dish'&&w==='rain'||a==='ice-body'&&['hail','snow'].includes(w)){
   const hp=restore(mon,1/16);if(hp)out.push(`${mon.name} recupera ${hp} PS grazie a ${mon.abilityName||a}!`);
 }
 if(a==='dry-skin'){
  if(w==='rain'){const hp=restore(mon,1/8);if(hp)out.push(`${mon.name} recupera ${hp} PS con Pellearsa!`);}
  if(w==='sun'){const hp=hurt(mon,1/8);if(hp)out.push(`${mon.name} perde ${hp} PS con Pellearsa!`);}
 }
 if(a==='solar-power'&&w==='sun'){const hp=hurt(mon,1/8);if(hp)out.push(`${mon.name} perde ${hp} PS per Solarpotere!`);}
 if(a==='poison-heal'&&['poison','bad-poison'].includes(mon.status)){
  const hp=restore(mon,1/8);if(hp)out.push(`${mon.name} recupera ${hp} PS con Velencura!`);
 }
 if(mon.slowStartTurns>0)mon.slowStartTurns--;
 return out;
}
return Object.freeze({normalOptions,alternatives,stage,restore,hurt,statusBlocked,dropBlocked,speedMultiplier,accuracyMultiplier,immunity,immuneToSand,damageModifiers,entry,afterStatDrop,contact,afterKnockout,endTurn,suppress});
});
