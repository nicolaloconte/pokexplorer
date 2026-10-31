// FireRed / LeafGreen overworld sprites from pret/pokefirered.
// Each source image is a horizontal spritesheet (16x32 per frame).
// Attribution / asset origin: https://github.com/pret/pokefirered
const FIRERED_OVERWORLD_BASE = 'https://raw.githubusercontent.com/pret/pokefirered/master/graphics/object_events/pics/people/';
const FIRERED_NPC_NAMES = ['youngster', 'lass', 'balding_man', 'old_woman', 'cooltrainer_m', 'cooltrainer_f', 'picnicker', 'camper', 'nurse', 'policeman', 'hiker', 'scientist', 'rich_boy', 'sailor', 'gentleman', 'clerk'];
const FIRERED_NPC_LABELS_IT = Object.freeze(["Giovane","Ragazza","Anziano","Donna anziana","Fantallenatore","Fantallenatrice","Picnic Girl","Campeggiatore","Infermiera Joy","Poliziotto","Montanaro","Scienziato","Ragazzo ricco","Marinaio","Gentiluomo","Commesso PokéMarket"]);
const OVERWORLD_PORTRAIT_IDS = Object.freeze({youngster:1,lass:2,balding_man:3,old_woman:4,cooltrainer_m:5,cooltrainer_f:6,picnicker:7,camper:8,nurse:9,policeman:10,hiker:11,scientist:12,rich_boy:13,sailor:14,gentleman:15,clerk:16,bug_catcher:17,fisher:18});
function overworldPortraitUrl(name) { const index=OVERWORLD_PORTRAIT_IDS[String(name||'')];return index?`assets/sprites/npc/ritratti/OW-${String(index).padStart(2,'0')}.png`:null; }
// Registry per distinguere figure di mappa e ritratti del dialogo.
// Six route trainers use these classes. The bug catcher is not in the town NPC roster.
const FIRERED_TRAINER_OVERWORLD_NAMES = Object.freeze(['youngster','bug_catcher','cooltrainer_m','cooltrainer_f','hiker','camper']);
const FIRERED_SPECIAL_OVERWORLD_NAMES = Object.freeze(['fisher','scientist','policeman','nurse']);
const FIRERED_OVERWORLD_NAMES = Object.freeze([...new Set([
  ...FIRERED_NPC_NAMES,...FIRERED_TRAINER_OVERWORLD_NAMES,...FIRERED_SPECIAL_OVERWORLD_NAMES
])]);
function overworldSpriteUrl(name) {
  // Map graphics and dialogue portraits are different assets.  The approved
  // OW-01..OW-18 illustrations are DIALOGUE portraits, never map sprite frames.
  // Retain the original FireRed overworld sprite sheets used before Beta 1.4.
  const requested=String(name||'').trim();
  const key=FIRERED_OVERWORLD_NAMES.includes(requested)?requested:'youngster';
  return `${FIRERED_OVERWORLD_BASE}${key}.png`;
}

const TRAINER_PORTRAIT_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';
// Red's five battle throwing frames and overworld poses are bundled locally.
// Balancing knobs in one place: progression is intentionally slower than V7.
const GAME_BALANCE = Object.freeze({wildEncounterChance: .20,
  earlyWildMaxLevel:3, earlyTrainerMaxLevel:5, earlyFloors:5,
  levelPerFloor:.52, expTrainerMultiplier:1.25, expGymMultiplier:1.45});
// City milestones occur every ten dungeons: city #1 = floor 10, #2 = 20, #5 = 50.
// Village shops (floor 5, 15, 25...) use the same progression, not a separate tier.
const POKEMART_UNLOCK_FLOORS=Object.freeze({superPotion:20,hyperPotion:50});
function isPokemartItemUnlocked(itemId, floor){
  return !(itemId in POKEMART_UNLOCK_FLOORS) || Number(floor)>=POKEMART_UNLOCK_FLOORS[itemId];
}
const HEALING_TIERS=Object.freeze([
  {floor:1,id:'potion',label:'POZIONE',heal:20,price:150},
  {floor:21,id:'superPotion',label:'SUPERPOZIONE',heal:50,price:600},
  {floor:51,id:'hyperPotion',label:'IPERPOZIONE',heal:200,price:1000}
]);
function healingTier(floor){return [...HEALING_TIERS].reverse().find(t=>floor>=t.floor)||HEALING_TIERS[0];}
const BAG_LIMITS=Object.freeze({potion:10,superPotion:10,hyperPotion:10,elixir:10,abilityCapsule:10,pokeball:20,masterball:1,fishingRod:1});
// Item icons are independent of NPC/trainer sprites.
const ITEM_IMAGES=Object.freeze({
  pokeball:'pokeball-game.png',potion:'potion-user.png',superPotion:'super-potion-user.png',hyperPotion:'hyper-potion-user.png',elixir:'elixir-user.png',
  radar:'radar-user.png',abilityCapsule:'ability-capsule-user.png',rareCandy:'rare-candy-user.png',goldCandy:'gold-candy-user.png',
  fishingRod:'old-rod-user.png',expShare:'exp-share-user.png',masterball:'master-ball.svg'
});
function itemImage(id){return `assets/sprites/items/${ITEM_IMAGES[id] || ITEM_IMAGES.pokeball}`;}
// Checkpoints may contain map cells from earlier releases. Remap paths to
// deleted assets at render time, without rewriting checkpoint payloads.
function resolvedSpritePath(path){
  const name=String(path||'');
  // Existing checkpoints may still store full original remote sprite URLs.
  // Resolve them through the audited catalog when a local copy is installed.
  if(name.startsWith(FIRERED_OVERWORLD_BASE)&&name.endsWith('.png')){
    const key=name.slice(FIRERED_OVERWORLD_BASE.length,-4);
    if(FIRERED_OVERWORLD_NAMES.includes(key))return overworldSpriteUrl(key);
  }
  // Beta 1.4 checkpoints can contain the incorrect 16x32 crops generated from
  // dialogue portraits.  Redirect those back to the real FireRed map sheets.
  const badMapPath=name.match(/^assets\/sprites\/npc\/overworld\/([a-z_]+)\.png$/);
  if(badMapPath && FIRERED_OVERWORLD_NAMES.includes(badMapPath[1]))return overworldSpriteUrl(badMapPath[1]);
  if(name==='assets/characters/oak-frlg-down.png'||name==='assets/sprites/npc/oak-overworld-local.svg')return 'assets/sprites/npc/oak-frlg-down.png';
  if(name==='assets/characters/oak-frlg-mugshot-clean.png')return 'assets/sprites/npc/oak-frlg-mugshot.png';
  if(/^assets\/characters\/npc-\d{2}\.png$/.test(name) || [
    'assets/characters/fisher-overworld-reference.png',
    'assets/characters/fisher-down.png',
    'assets/characters/policeman-down.png',
    'assets/characters/scientist-down.png',
    'assets/characters/nurse-center.png'
  ].includes(name))return 'assets/sprites/ui/trainer-avatar-fallback.svg';
  // Preserve old v2 checkpoints containing local sprite paths.
  const mappings=[['assets/characters/','assets/sprites/npc/'],['assets/trainers/','assets/sprites/trainers/'],
    ['assets/red/','assets/sprites/player/red/'],['assets/girl/','assets/sprites/player/girl/'],
    ['assets/items/','assets/sprites/items/'],['assets/badges/','assets/sprites/badges/'],
    ['assets/buildings-gba/','assets/sprites/buildings/'],['assets/ui/','assets/sprites/ui/'],
    ['assets/effects/','assets/sprites/effects/'],['assets/flags/','assets/sprites/flags/'],
    ['assets/decor/','assets/sprites/decor/'],['assets/world/','assets/sprites/world/']];
  for(const [oldPath,newPath] of mappings)if(name.startsWith(oldPath))return newPath+name.slice(oldPath.length);
  return name;
}

// Progression tables: 0–8 unique Kanto badges. Keep team and XP rules in sync.
const BADGE_LEVEL_CAPS=Object.freeze([14,21,24,29,35,43,47,50,100]);
const BADGE_TEAM_SLOTS=Object.freeze([2,3,3,4,4,5,5,6,6]);
// All multi-turn damaging moves available from the main-series move catalog.
// Multi-turn traps such as Wrap/Bind are NOT charge moves; they already have
// separate residual-damage logic. Outrage/Thrash/Petal Dance are handled via
// their own forced-repeat state below.
const CHARGE_MOVES=new Set([
  'solar-beam','solar-blade','fly','dig','dive','bounce','sky-attack',
  'skull-bash','razor-wind','shadow-force','phantom-force','geomancy',
  'freeze-shock','ice-burn','meteor-beam','electro-shot','sky-drop'
]);
const RECHARGE_MOVES=new Set([
  'hyper-beam','giga-impact','blast-burn','hydro-cannon','frenzy-plant',
  'rock-wrecker','roar-of-time','prismatic-laser','eternabeam'
]);
const RAMPAGE_MOVES=new Set(['outrage','thrash','petal-dance']);
const ROLLOUT_MOVES=new Set(['rollout','ice-ball']);
// Gen III: 2/3 hits 3/8 each, 4/5 hits 1/8 each.
function rollMultiHitCount(move,random=Math.random){
  const min=Math.max(1,move.minHits||1),max=Math.max(min,move.maxHits||min);
  if(min===max)return min;
  const n=Math.min(.99999999,Math.max(0,random()));
  if(min===2 && max===5)return n<.375?2:n<.75?3:n<.875?4:5;
  return min+Math.floor(n*(max-min+1));
}
function getConfusionDamage(mon,random=Math.random){
  // Typeless 40-power physical self-hit; unaffected by STAB or typing.
  const attack=mon.attack*statMultiplier(mon.statStages?.attack);
  const defense=Math.max(1,mon.defense*statMultiplier(mon.statStages?.defense));
  return Math.max(1,Math.floor(((2*mon.level/5+2)*40*attack/defense/50+2)*(.85+random()*.15)));
}
const FORCED_RECHARGE_ACTION=Object.freeze({id:'recharge',name:'Ricarica',priority:0,currentPp:1});
const CHARGE_MESSAGES=Object.freeze({
  'solar-beam':'assorbe luce solare', 'solar-blade':'assorbe luce solare',
  fly:'si alza in volo',dig:'si nasconde sottoterra',dive:'si immerge',
  bounce:'balza in aria','sky-attack':'prepara Aeroattacco',
  'skull-bash':'ritrae la testa', 'razor-wind':'prepara un turbine',
  'shadow-force':'svanisce nell’ombra','phantom-force':'svanisce nell’ombra',
  geomancy:'accumula energia','freeze-shock':'accumula energia gelida',
  'ice-burn':'accumula energia ardente','meteor-beam':'assorbe energia cosmica',
  'electro-shot':'assorbe energia elettrica','sky-drop':'si alza in volo'
});
const CHARGE_UNTOUCHABLE=Object.freeze({
  fly:['gust','twister','thunder','hurricane','sky-uppercut','smack-down'],
  bounce:['gust','twister','thunder','hurricane','sky-uppercut','smack-down'],
  dig:['earthquake','magnitude','fissure'],
  dive:['surf','whirlpool'],
  'phantom-force':[], 'shadow-force':[], 'sky-drop':[]
});
const MAGNITUDE_ROLLS=Object.freeze([
  {level:4,power:10,chance:5},{level:5,power:30,chance:10},
  {level:6,power:50,chance:20},{level:7,power:70,chance:30},
  {level:8,power:90,chance:20},{level:9,power:110,chance:10},
  {level:10,power:150,chance:5}
]);
function rollMagnitude(random=Math.random){
  const n=Math.max(0,Math.min(99.999,Number(random())*100));
  let cumulative=0;
  for(const outcome of MAGNITUDE_ROLLS){cumulative+=outcome.chance;if(n<cumulative)return outcome;}
  return MAGNITUDE_ROLLS[MAGNITUDE_ROLLS.length-1];
}
/** Level-scaled experience inspired by the main-series scaled EXP system. */
function scaledBattleExperience(baseYield, defeatedLevel, recipientLevel, trainerMultiplier=1){
  const base=Math.max(20,Number(baseYield)||60), enemy=Math.max(1,defeatedLevel), player=Math.max(1,recipientLevel);
  const levelRatio=Math.pow((2*enemy+10)/(enemy+player+10),2.5);
  // No artificial beginner XP multiplier: the species-specific growth curve
  // now determines how quickly low-level Pokémon gain levels.
  return Math.max(1,Math.floor((base*enemy/7)*levelRatio*trainerMultiplier*1.36));
}


// Complete non-legendary Kanto evolution families. The first entries are base
// species; later entries are unlocked only at suitable encounter levels.
// Stone/trade evolutions receive progression gates for procedurally spawned foes.
const KANTO_FAMILIES=Object.freeze([
 [[1,1],[2,16],[3,32]],[[4,1],[5,16],[6,36]],[[7,1],[8,16],[9,36]],
 [[10,1],[11,7],[12,10]],[[13,1],[14,7],[15,10]],[[16,1],[17,18],[18,36]],
 [[19,1],[20,20]],[[21,1],[22,20]],[[23,1],[24,22]],[[25,1],[26,30]],
 [[27,1],[28,22]],[[29,1],[30,16],[31,34]],[[32,1],[33,16],[34,34]],
 [[35,1],[36,30]],[[37,1],[38,30]],[[39,1],[40,30]],[[41,1],[42,22]],
 [[43,1],[44,21],[45,34]],[[46,1],[47,24]],[[48,1],[49,31]],[[50,1],[51,26]],
 [[52,1],[53,28]],[[54,1],[55,33]],[[56,1],[57,28]],[[58,1],[59,35]],
 [[60,1],[61,25],[62,38]],[[63,1],[64,16],[65,36]],[[66,1],[67,28],[68,36]],
 [[69,1],[70,21],[71,36]],[[72,1],[73,30]],[[74,1],[75,25],[76,40]],
 [[77,1],[78,40]],[[79,1],[80,37]],[[81,1],[82,30]],[[83,1]],
 [[84,1],[85,31]],[[86,1],[87,34]],[[88,1],[89,38]],[[90,1],[91,32]],
 [[92,1],[93,25],[94,38]],[[95,1]],[[96,1],[97,26]],[[98,1],[99,28]],
 [[100,1],[101,30]],[[102,1],[103,32]],[[104,1],[105,28]],
 [[106,1]],[[107,1]],[[108,1]],[[109,1],[110,35]],[[111,1],[112,42]],
 [[113,1]],[[114,1]],[[115,1]],[[116,1],[117,32]],[[118,1],[119,33]],
 [[120,1],[121,34]],[[122,1]],[[123,1]],[[124,1]],[[125,1]],[[126,1]],
 [[127,1]],[[128,1]],[[129,1],[130,20]],[[131,1]],[[132,1]],
 [[133,1],[134,30]],[[133,1],[135,30]],[[133,1],[136,30]],
 [[137,1]],[[138,1],[139,40]],[[140,1],[141,40]],[[142,1]],[[143,1]],
 [[147,1],[148,30],[149,55]]
]);
const KANTO_FAMILY_BY_ID=new Map(KANTO_FAMILIES.flatMap(family=>family.map(([id])=>[id,family])));
const KANTO_BASE_FAMILIES=KANTO_FAMILIES.filter((family,index)=>
  KANTO_FAMILIES.findIndex(candidate=>candidate[0][0]===family[0][0])===index);
const KANTO_RARE_BASE=new Set([1,4,7,95,106,107,113,115,122,123,124,125,126,127,128,131,132,133,137,138,140,142,143,147]);
function evolvedEncounterId(id,level,random=Math.random){
  const family=KANTO_FAMILY_BY_ID.get(Number(id));if(!family)return id;
  const index=family.findIndex(([species])=>species===Number(id));
  let result=id;
  // Generated wild and trainer Pokémon use the stage appropriate to their level.
  result=family[0][0];
  for(let i=0;i<family.length;i++)if(level>=family[i][1])result=family[i][0];
  return result;
}
function randomKantoSpecies(level,floor,random=Math.random){
  // Early routes remain accessible to new players. Later floors cover every
  // ordinary Kanto line, with rarer families starting on later routes.
  const early=[19,16,10,13,52,39,21,43];
  if(floor<=5)return evolvedEncounterId(early[Math.floor(random()*early.length)],level);
  const pool=KANTO_BASE_FAMILIES.filter(family=>
    ![1,4,7].includes(family[0][0]) && // Starter families are never random wild encounters.
    (!KANTO_RARE_BASE.has(family[0][0])||floor>=25) &&
    (level>=8||!new Set([95,102,113,115,123,124,125,126,127,128,131,132,137,138,140,142,143,147]).has(family[0][0])));
  const picked=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  if(picked[0][0]===133 && level>=30)return [134,135,136][Math.min(2,Math.floor(random()*3))];
  return evolvedEncounterId(picked[0][0],level,random);
}

// TASK-007: probability of EACH available legendary bird per valid grass step.
// The three birds occupy fixed, disjoint draw intervals; an already-owned
// species leaves its interval empty instead of redistributing its odds.
const LEGENDARY_BIRD_CHANCE_PER_STEP = 0.0008;

// TASK-008: one centralized leader -> type -> chromatic variant mapping.
// All eight PNGs are derived only from the same neutral arena texture:
// platforms, sprites, HUD and positioning remain entirely unchanged.
const GYM_BATTLE_THEMES = Object.freeze({
  'Brock':     Object.freeze({type:'ROCCIA',   palette:'brock'}),
  'Misty':     Object.freeze({type:'ACQUA',    palette:'misty'}),
  'Lt. Surge': Object.freeze({type:'ELETTRO',  palette:'surge'}),
  'Erika':     Object.freeze({type:'ERBA',     palette:'erika'}),
  'Koga':      Object.freeze({type:'VELENO',   palette:'koga'}),
  'Sabrina':   Object.freeze({type:'PSICO',    palette:'sabrina'}),
  'Blaine':    Object.freeze({type:'FUOCO',    palette:'blaine'}),
  'Giovanni':  Object.freeze({type:'TERRA',    palette:'giovanni'})
});

// Otto capipalestra di Kanto: composizioni dedicate (Misty secondo la richiesta: Squirtle + Starmie).
const KANTO_GYMS = [
  {name:'Brock', badge:'Sasso', badgeId:0, specialty:'ROCCIA', sprite:'brock-gen3', pokemon:[74,95], levels:[12,14]},
  {name:'Misty', badge:'Cascata', badgeId:1, specialty:'ACQUA', sprite:'misty-gen3', pokemon:[7,121], levels:[18,21]},
  {name:'Lt. Surge', badge:'Tuono', badgeId:2, specialty:'ELETTRO', sprite:'ltsurge-gen3', pokemon:[100,25,26], levels:[21,18,24]},
  {name:'Erika', badge:'Arcobaleno', badgeId:3, specialty:'ERBA', sprite:'erika-gen3', pokemon:[114,70,45], levels:[24,29,29]},
  {name:'Koga', badge:'Anima', badgeId:4, specialty:'VELENO', sprite:'koga-gen3', pokemon:[109,89,110], levels:[32,34,35]},
  {name:'Sabrina', badge:'Palude', badgeId:5, specialty:'PSICO', sprite:'sabrina-gen3', pokemon:[64,122,65], levels:[38,37,43]},
  {name:'Blaine', badge:'Vulcano', badgeId:6, specialty:'FUOCO', sprite:'blaine-gen3', pokemon:[58,77,78,59], levels:[42,40,42,47]},
  {name:'Giovanni', badge:'Terra', badgeId:7, specialty:'TERRA', sprite:'giovanni-gen3', pokemon:[111,51,31,34], levels:[45,42,44,50]}
];

// Kanto gym preparatory trainers draw species matching the leader's specialty.
const GYM_TRAINER_POOLS=Object.freeze([
  [74,75,95,111],           // Brock: Rock
  [60,61,72,90,118,120],   // Misty: Water
  [25,81,82,100,101],      // Surge: Electric
  [43,44,69,70,114],       // Erika: Grass
  [23,24,41,42,109,110],  // Koga: Poison
  [63,64,96,97,122],      // Sabrina: Psychic
  [37,58,77,126],     // Blaine: Fire
  [27,28,50,51,104,105,111] // Giovanni: Ground
]);
