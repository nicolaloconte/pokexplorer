// FireRed / LeafGreen overworld sprites from pret/pokefirered.
// Each source image is a horizontal spritesheet (16x32 per frame).
// Attribution / asset origin: https://github.com/pret/pokefirered
const FIRERED_OVERWORLD_BASE = 'https://raw.githubusercontent.com/pret/pokefirered/master/graphics/object_events/pics/people/';
const FIRERED_NPC_NAMES = ['youngster', 'lass', 'balding_man', 'old_woman', 'cooltrainer_m', 'cooltrainer_f', 'picnicker', 'camper', 'nurse', 'policeman', 'hiker', 'scientist', 'rich_boy', 'sailor', 'gentleman', 'clerk'];
const TRAINER_PORTRAIT_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';
// Red's five battle throwing frames and overworld poses are bundled locally.
// Balancing knobs in one place: progression is intentionally slower than V7.
const GAME_BALANCE = Object.freeze({wildEncounterChance: .20,
  earlyWildMaxLevel:3, earlyTrainerMaxLevel:5, earlyFloors:5,
  levelPerFloor:.52, expTrainerMultiplier:1.25, expGymMultiplier:1.45});
const HEALING_TIERS=Object.freeze([
  {floor:1,id:'potion',label:'POZIONE',heal:20,price:150},
  {floor:21,id:'superPotion',label:'SUPERPOZIONE',heal:50,price:600},
  {floor:51,id:'hyperPotion',label:'IPERPOZIONE',heal:200,price:1000}
]);
function healingTier(floor){return [...HEALING_TIERS].reverse().find(t=>floor>=t.floor)||HEALING_TIERS[0];}
const BAG_LIMITS=Object.freeze({potion:10,superPotion:10,hyperPotion:10,elixir:10,pokeball:20,masterball:1,fishingRod:1});
// Item icons are independent of NPC/trainer sprites.
const ITEM_IMAGES=Object.freeze({
  pokeball:'pokeball-game.png',potion:'potion-user.png',superPotion:'super-potion-user.png',hyperPotion:'hyper-potion-user.png',elixir:'elixir-user.png',
  radar:'radar-user.png',rareCandy:'rare-candy-user.png',goldCandy:'gold-candy-user.png',
  fishingRod:'old-rod-user.png',expShare:'exp-share-user.png',masterball:'master-ball.svg'
});
function itemImage(id){return `assets/items/${ITEM_IMAGES[id] || ITEM_IMAGES.pokeball}`;}
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
    (!KANTO_RARE_BASE.has(family[0][0])||floor>=25) &&
    (level>=8||!new Set([95,102,113,115,123,124,125,126,127,128,131,132,137,138,140,142,143,147]).has(family[0][0])));
  const picked=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  if(picked[0][0]===133 && level>=30)return [134,135,136][Math.min(2,Math.floor(random()*3))];
  return evolvedEncounterId(picked[0][0],level,random);
}

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

class GameEngine {
  constructor() {
    this.gridSize = 10;
    this.playerPos = { x: 0, y: 0 };
    this.playerGender='male';
    this.walkSequence=0;
    this.walkReadyAt=0;
    this.walkDurationMs=210;
    // Keep references until the frame preloads complete; otherwise browsers
    // can discard orphaned Image elements and cancel their network requests.
    this.walkSpritePreloads=[];
    if(typeof Image!=='undefined')for(const gender of ['red','girl'])
      for(const direction of ['up','down','left','right'])
        for(let frame=0;frame<3;frame++){
          const image=new Image();image.src=`assets/${gender}/walk/${direction}-${frame}.png`;
          this.walkSpritePreloads.push(image);
        }
    this.floor = 1;
    this.money = 600;
    this.team = [];
    this.activeMon = null;
    this.enemyMon = null;
    this.items = { pokeball: 5, masterball:0, potion: 3, superPotion:0, hyperPotion:0, elixir: 1, fishingRod: false, rareCandy:0, goldCandy:0 };
    this.radarCharges=3; this.playerFacing='down'; this.playerStep=0; this.playerFishingFrame=null; this.playerIdleTimer=null; this.pendingItemTarget=null; this.pendingWildEncounterType=null; this.pendingLegendaryId=null;
    this.badges = [];
    // Available after Misty's badge; opt-out is available under Key Items.
    this.expShareEnabled = true;this.expShareClaimed=false;
    this.adventureCompleted = false;
    this.gridMap = [];
    this.selectedStarterData = null;
    this.isLocked = false;

    this.gymQueue = [];
    this.gymBadgeName = "";
    this.currentGym = null;
    this.gymLeaderIndex = 0;
    this.completedGymFloors = new Set();
    this.battleBusy = false;
    this.battleToken = 0;
    this.battleMode = null;
    this.pendingForcedSwitch = false;
    this.battleTimers = [];
    this.lastBattleNotice = '';
    this.battleParticipants = new Set();
    this.bagCategory = 'rimedi';
    this.dialogueResolve = null;
    this.evolutionResolve = null;
    this.pokemonCache = new Map();
    this.abilityInfoCache=new Map();

    // Variabili per la gestione della catena Raid Pokémon (5 sfide consecutive)
    this.isRaidActive = false;
    this.raidQueueCount = 0;
    this.fishingRodGiftClaimed = false;
    this.gymChallengePending = false;
    this.devMode = false; // Only the in-game DEV MODE button can unlock it.
    this.devUpgradeInProgress = false;
    this.speedMultiplier=1;
    this.locale='it';
    this.pokemonInfoRequest=0;
    this.moveDescriptionCache=new Map();
    this.abilityDescriptionCache=new Map();
    this.teleportSwitchPending=false;
    this.caughtLegendarySpecies=new Set();
    this.activeDialogNpcCell=null;
    this.oakEventDismissed=false;this.isCelestialCave=false;this.celestialPhase='unvisited';
    this.celestialReturnState=null;this.celestialCutsceneActive=false;

    this.trainerSprites = [
      "https://play.pokemonshowdown.com/sprites/trainers/bugcatcher-gen3.png",
      "https://play.pokemonshowdown.com/sprites/trainers/youngster-gen3.png",
      "https://play.pokemonshowdown.com/sprites/trainers/lass-gen3.png"
    ];
    // Named FireRed/LeafGreen NPC sheets: appearance is fixed, not generated.
    this.npcSprites = FIRERED_NPC_NAMES.map(name => `${FIRERED_OVERWORLD_BASE}${name}.png`);
    this.npcFallbacks = Array.from({length: 16}, (_, i) =>
      `assets/characters/npc-${String(i + 1).padStart(2, '0')}.png`);
    this.battleTrainerPreloaded = false;
    this.npcDialogues = [
      'Hai visto i fiori nuovi vicino alla fontana?',
      'Il Capopalestra non si fa certo battere facilmente.',
      'In questa città i sentieri sono collegati: esplora con calma.',
      'I Pokémon esausti non tornano: prenditi cura della tua squadra.',
      'Qualche volta la Poké Ball nell’erba nasconde una sorpresa.',
      'Ho sentito che un raro Pokémon abita sulla costa.',
      'Al Centro Pokémon puoi ripristinare PS e PP.',
      'Prima di lasciare la città passa dal Pokémarket.',
      'La Medaglia ti permetterà di superare il prossimo passaggio.',
      'La mia passeggiata preferita è lungo il viale alberato.',
      'Una mossa superefficace può cambiare l’esito di una lotta.',
      'Con la canna da pesca potresti incontrare Pokémon d’acqua.'
    ];
    this.gymLeaderSprite = "https://play.pokemonshowdown.com/sprites/trainers/brock-gen3.png";
    this.currentTrainerSprite = this.trainerSprites[0];

    // Sprite SVG locali: nessun link esterno fragile per le medaglie.
    this.badgeSprites = KANTO_GYMS.map((_, i) => `assets/badges/kanto-clean-${i + 1}.png`);

    this.bindEvents();
    this.scheduleRotomExpression();
  }

  scheduleRotomExpression(){
    if(typeof window==='undefined'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const eyes=[...document.querySelectorAll('.rotom-face .rotom-eye-ball')];
    if(eyes.length!==2)return;
    // One natural blink/look/wink at a time; randomized rhythm prevents a
    // constantly looping robotic facial animation.
    eyes.forEach(eye=>eye.classList.add('rotom-expression'));
    const next=()=>{
      const roll=Math.random();
      const klass=roll<.63?'rotom-closed':roll<.84?'rotom-looking-left':
        roll<.95?'rotom-looking-right':'rotom-closed';
      const chosen=roll>=.95?[eyes[1]]:eyes;
      chosen.forEach(eye=>eye.classList.add(klass));
      setTimeout(()=>{
        chosen.forEach(eye=>eye.classList.remove(klass));
        this.rotomExpressionTimer=setTimeout(next,4800+Math.floor(Math.random()*7200));
      },klass==='rotom-closed'?125:1100);
    };
    this.rotomExpressionTimer=setTimeout(next,3000+Math.floor(Math.random()*4500));
  }

  badgeCount(){
    return Math.min(8,new Set((this.badges||[]).map((badge,index)=>
      typeof badge==='object'?badge.id:index)).size);
  }
  getLevelCap(){return this.devMode?100:BADGE_LEVEL_CAPS[this.badgeCount()];}
  getTeamSlotLimit(){return BADGE_TEAM_SLOTS[this.badgeCount()];}
  hasExpShare(){return Boolean(this.expShareClaimed);}
  // The first able Pokémon in the party is the lead. Reordering the party
  // selects the starting battler, without a redundant 'Set active' button.
  ensureActivePokemon(){
    this.activeMon=this.team.find(mon=>mon.currentHp>0)||null;
    return this.activeMon;
  }
  toggleExpShare(){
    if(!this.hasExpShare())return false;
    this.expShareEnabled=!this.expShareEnabled;
    this.logMsg(`Condividi Esperienza ${this.expShareEnabled?'attivato':'disattivato'}.`);
    this.renderSidebar();
    return true;
  }

  // L'ultimo portale sblocca il finale, non la vittoria su Giovanni da sola.
  hasCompletedKantoChallenge(){
    if(this.floor!==80 || !this.completedGymFloors.has(80))return false;
    const badgeIds=new Set(this.badges.map(b=>typeof b==='object'?b.id:b));
    return KANTO_GYMS.every((gym,index)=>badgeIds.has(index) && this.completedGymFloors.has((index+1)*10));
  }

  finishKantoAdventure(){
    if(this.adventureCompleted || !this.hasCompletedKantoChallenge())return false;
    this.adventureCompleted=true;
    this.isLocked=true;
    this.hideFinaleScreens();
    this.$id('victory-overlay').classList.remove('hidden');
    const preview=this.$id('victory-badge-preview');
    preview.replaceChildren();
    for(const gym of KANTO_GYMS){
      const badge=document.createElement('img');
      badge.src=this.badgeSprites[gym.badgeId];badge.alt='';
      badge.width=32;badge.height=32;preview.appendChild(badge);
    }
    this.logMsg('Hai completato la sfida di Kanto!');
    return true;
  }

  hideFinaleScreens(){
    this.$id('victory-overlay')?.classList.add('hidden');
    this.$id('memory-photo-overlay')?.classList.add('hidden');
  }

  showMemoryPhoto(){
    if(!this.adventureCompleted)return;
    const teamArea=this.$id('memory-photo-team');teamArea.replaceChildren();
    // Copia solo dati del party: nessuna immagine viene caricata dall'utente.
    for(let i=0;i<6;i++){
      const pokemon=this.team[i];
      const tile=document.createElement('div');tile.className='memory-mon'+(pokemon?'':' empty');
      if(pokemon){
        const sprite=document.createElement('img');sprite.src=pokemon.spriteFront || '';
        sprite.alt=pokemon.name;sprite.loading='eager';
        const name=document.createElement('strong');name.textContent=pokemon.name;
        const level=document.createElement('span');level.textContent=`Lv. ${pokemon.level}`;
        tile.append(sprite,name,level);
      }
      teamArea.appendChild(tile);
    }
    const badgeArea=this.$id('memory-photo-badges');badgeArea.replaceChildren();
    for(const gym of KANTO_GYMS){
      const badge=document.createElement('div');badge.className='memory-badge';
      const img=document.createElement('img');img.src=this.badgeSprites[gym.badgeId];
      img.alt=`Medaglia ${gym.badge}`;img.loading='eager';
      const title=document.createElement('span');title.textContent=gym.badge;
      badge.append(img,title);badgeArea.appendChild(badge);
    }
    this.$id('victory-overlay').classList.add('hidden');
    this.$id('memory-photo-overlay').classList.remove('hidden');
    this.isLocked=true;
  }

  returnToVictoryScreen(){
    if(!this.adventureCompleted)return;
    this.$id('memory-photo-overlay').classList.add('hidden');
    this.$id('victory-overlay').classList.remove('hidden');
    this.isLocked=true;
  }

  returnToMainMenu(){
    this.acknowledgeDialogue();
    this.battleToken++;
    this.hideFinaleScreens();
    for(const id of ['gameover-overlay','starter-scene-overlay','overlay-battle',
      'battle-controls','gym-leader-intro','trainer-encounter-overlay',
      'wild-encounter-overlay','pokemart-overlay','gym-entry-confirm','box-pc-overlay',
      'npc-dialog-overlay','celestial-dialog','celestial-cinematic','badge-case-overlay','learn-move-overlay','evolution-overlay','battle-confirm']){
      this.$id(id)?.classList.add('hidden');
    }
    this.$id('rotom-body')?.classList.remove('battle-active');
    this.$id('main-menu-overlay').classList.remove('hidden');
    this.floor=1;this.money=600;this.playerPos={x:0,y:0};
    this.team=[];this.activeMon=null;this.enemyMon=null;
    this.gridMap=[];this.badges=[];this.expShareEnabled=true;this.expShareClaimed=false;this.completedGymFloors.clear();
    this.selectedStarterData=null;this.adventureCompleted=false;
    this.gymQueue=[];this.gymLeaderIndex=0;this.currentGym=null;
    this.battleParticipants.clear();this.battleBusy=false;
    this.pendingForcedSwitch=false;this.isRaidActive=false;this.raidQueueCount=0;
    this.battleMode=null;this.isLocked=false;this.battleConfirmAction=null;
    this.items={pokeball:5,masterball:0,potion:3,superPotion:0,hyperPotion:0,elixir:1,fishingRod:false,
      rareCandy:this.devMode?999:0,goldCandy:this.devMode?999:0};
    this.fishingRodGiftClaimed=false;this.playerGender='male';
    this.gymChallengePending=false;this.devGuaranteedCapture=this.devMode;this.pendingTrainerCell=null;
    this.caughtLegendarySpecies=new Set();
    this.activeDialogNpcCell=null;this.oakEventDismissed=false;this.isCelestialCave=false;
    this.celestialPhase='unvisited';this.celestialReturnState=null;this.celestialCutsceneActive=false;
    this.$id('celestial-dialog')?.classList.add('hidden');
    this.$id('celestial-cinematic')?.classList.add('hidden');
    this.$id('celestial-blackout')?.classList.remove('active');
    this.closeFloorJumpCode();
    this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
    window.pokexplorerMusic?.setScene('exploration');
    this.stopContinuousWalk?.();
    // A new game starts with the male avatar selected unless chosen again.
    for(const [id,active] of [['choose-male',true],['choose-female',false]]){
      const button=this.$id(id);if(button){button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
    }
    this.radarCharges=3;this.playerFacing='down';this.playerStep=0;this.playerFishingFrame=null;clearTimeout(this.playerIdleTimer);
    this.pendingItemTarget=null;this.pendingWildEncounterType=null;this.partyMenuPokemon=null;this.partyMoveSource=null;this.partyInfoPokemon=null;
    this.$id('item-target-prompt').classList.add('hidden');
    this.closePartyActions();this.closePokemonInfo();
    const notice=this.$id('discovery-notice');notice?.classList.remove('visible');
    this.renderBadges();this.renderSidebar();
    this.logMsg('Inizia una nuova avventura!');
  }

  preloadBattleTrainers(){
    if(this.battleTrainerPreloaded) return;
    this.battleTrainerPreloaded=true;
    const urls=[`${TRAINER_PORTRAIT_BASE}red-gen3.png`,
      ...this.trainerSprites, ...KANTO_GYMS.map(g=>`${TRAINER_PORTRAIT_BASE}${g.sprite}.png`)];
    this.preloadedTrainerImages=urls.map(src=>{
      const img=new Image();img.decoding='async';img.src=src;
      return img;
    });
    this.redThrowFrames=Array.from({length:5},(_,i)=>`assets/red/throw/${i}.png`);
    this.preloadedTrainerImages.push(...this.redThrowFrames.map(src=>{const img=new Image();img.src=src;return img;}));
  }

  // A single compositor-friendly animation. No frame-by-frame left/top updates.
  async playMotion(element,frames,duration,easing='ease-in-out'){
    if(!element) return;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      const f=frames[frames.length-1];
      if(f.opacity!==undefined)element.style.opacity=f.opacity;
      await this.wait(16);return;
    }
    if(!element.animate){await this.wait(duration);return;}
    const animation=element.animate(frames,{duration:duration,easing,fill:'none'});
    try{await animation.finished;}catch(e){ /* Battles may cancel animations on exit. */ }
  }

  battleSpritePosition(side){
    const stage=this.$id('battle-stage').getBoundingClientRect();
    const sprite=this.$id(side==='enemy'?'enemy-sprite':'player-sprite').getBoundingClientRect();
    // Used by capture effects only: the target must be a *visible* sprite.
    return {x:sprite.left-stage.left+sprite.width*.50,
      y:sprite.top-stage.top+sprite.height*.54};
  }

  battleThrowDestination(side){
    // Pokémon sprites are display:none during the throw, so their bounds are
    // ZERO. Read the always-visible platform instead; also works on mobile.
    const stage=this.$id('battle-stage').getBoundingClientRect();
    const platform=this.$id('battle-stage').querySelector(
      side==='enemy'?'.enemy-platform-gba':'.player-platform-gba');
    const bounds=platform.getBoundingClientRect();
    // The ball opens just over the top of the platform where the Pokémon lands.
    return {x:bounds.left-stage.left+bounds.width*.5,
      y:bounds.top-stage.top+bounds.height*.28};
  }

  hpColorState(mon) {
    const ratio=mon?.maxHp ? mon.currentHp/mon.maxHp : 0;
    return ratio < .20 ? 'red' : ratio < .50 ? 'yellow' : 'green';
  }

  isTownFloor(){return this.floor % 5 === 0;}
  isSolidTownCell(cell){
    if(!this.isTownFloor() || !cell)return false;
    return Boolean(cell.decoration) || ['pokecenter','pokemart','gym','house','npc'].includes(cell.entity);
  }
  setTrainerPortrait(element,src){
    if(!element)return;
    // An invalid external image can no longer leave an empty/broken icon on screen.
    element.onerror=()=>{element.onerror=null;element.src='assets/trainers/opponent-fallback.svg';};
    element.src=src;
  }

  bindEvents() {
    const safeOnClick = (id, callback) => {
      const el = document.getElementById(id);
      if (el) el.onclick = callback;
    };

    safeOnClick('celestial-dialog-next',()=>this.advanceCelestialDialog());
    safeOnClick('celestial-dialog-yes',()=>this.answerOakInvitation(true));
    safeOnClick('celestial-dialog-no',()=>this.answerOakInvitation(false));
    safeOnClick('choose-male',()=>this.selectPlayerGender('male'));
    safeOnClick('choose-female',()=>this.selectPlayerGender('female'));
    safeOnClick('btn-start-game', () => {
      document.getElementById('main-menu-overlay').classList.add('hidden');
      this.startStarterScene();
    });

    safeOnClick('btn-return-main-menu', () => this.returnToMainMenu());
    safeOnClick('btn-victory-photo', () => this.showMemoryPhoto());
    safeOnClick('btn-victory-menu', () => this.returnToMainMenu());
    safeOnClick('btn-photo-back', () => this.returnToVictoryScreen());

    safeOnClick('btn-confirm-yes', () => this.confirmStarter());
    safeOnClick('btn-confirm-no', () => this.resetStarter());
    safeOnClick('btn-scan-radar', () => this.scanRadar());
    safeOnClick('item-target-cancel', () => this.cancelItemTargetSelection());
    safeOnClick('party-info-action',()=>this.openPokemonInfo(this.partyMenuPokemon));
    safeOnClick('party-move-action',()=>this.beginPartyReorder());
    // Lead is always the first available Pokémon in party order.
    safeOnClick('party-send-action',()=>{
      const pokemon=this.partyMenuPokemon;this.closePartyActions();if(pokemon)this.selectBattlePokemon(pokemon);
    });
    safeOnClick('party-close-action',()=>this.closePartyActions());
    safeOnClick('pokemon-info-close',()=>this.closePokemonInfo());
    safeOnClick('btn-badge-case',()=>this.openBadgeCase());
    safeOnClick('badge-case-close',()=>this.closeBadgeCase());
    this.$id('badge-case-overlay')?.addEventListener('click',event=>{if(event.target===event.currentTarget)this.closeBadgeCase();});

    safeOnClick('btn-act-fight', () => this.showMoves());
    safeOnClick('btn-move-back', () => this.showMainActions());
    safeOnClick('btn-act-switch',()=>this.showTeamMenu());

    safeOnClick('btn-act-run', () => {
      if(this.battleConfirmAction)return;
      if (this.isRaidActive || this.battleType === 'gym' || this.battleType === 'trainer' || this.battleType === 'mewtwo') {
        this.setBattleMsg("Non puoi fuggire da questa sfida!");
        return;
      }
      if (this.battleBusy || this.pendingForcedSwitch || this.hasForcedBattleAction()) return;
      if(this.activeMon?.trappedTurns>0 && this.activeMon.ability!=='run-away'){
        this.setBattleMsg(`${this.activeMon.name} non può fuggire: è intrappolato!`);return;
      }
      this.endBattle("Sei fuggito dalla battaglia!");
    });

    safeOnClick('btn-start-trainer-battle', () => {
      document.getElementById('trainer-encounter-overlay').classList.add('hidden');
      const screenRoot = document.getElementById('pokenav-screen-root');
      screenRoot.classList.add('battle-transition-flash');
      setTimeout(() => {
        screenRoot.classList.remove('battle-transition-flash');
        this.startBattle(this.gymQueue.length > 0 ? 'gym' : 'trainer');
      }, this.gameDelay(600));
    });

    safeOnClick('btn-start-gym-leader', () => {
      document.getElementById('gym-leader-intro').classList.add('hidden');
      this.gymLeaderIndex = 0;
      this.startBattle('gym');
    });

    safeOnClick('btn-start-wild-battle', () => {
      document.getElementById('wild-encounter-overlay').classList.add('hidden');
      const screenRoot = document.getElementById('pokenav-screen-root');
      screenRoot.classList.add('battle-transition-flash');
      setTimeout(() => {
        screenRoot.classList.remove('battle-transition-flash');
        const encounter=this.pendingWildEncounterType||'wild';
        this.pendingWildEncounterType=null;
        if(encounter==='legendary'){
          screenRoot.classList.remove('battle-transition-flash');
          screenRoot.classList.add('legendary-encounter-transition');
          setTimeout(()=>{screenRoot.classList.remove('legendary-encounter-transition');this.startBattle(encounter);},this.gameDelay(1200));
        } else this.startBattle(encounter);
      }, this.gameDelay(600));
    });

    safeOnClick('buy-pokeball-btn', () => this.purchaseItem('pokeball',200));
    safeOnClick('buy-potion-btn', () => this.purchaseItem('potion',150));
    safeOnClick('buy-super-potion-btn',()=>this.purchaseItem('superPotion',600));
    safeOnClick('buy-hyper-potion-btn',()=>this.purchaseItem('hyperPotion',1000));
    safeOnClick('buy-elixir-btn', () => this.purchaseItem('elixir',400));
    safeOnClick('buy-radar-btn', () => this.purchaseRadar());
    safeOnClick('gym-entry-yes',()=>this.confirmGymChallenge());
    safeOnClick('gym-entry-no',()=>this.cancelGymChallenge());
    safeOnClick('quick-settings-toggle',()=>this.toggleQuickSettings());
    document.addEventListener('pointerdown',event=>{
      const menu=this.$id('game-quick-settings');
      if(menu && !menu.contains(event.target))this.closeQuickSettings();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')this.closeQuickSettings();
    });
    safeOnClick('dev-mode-trigger',()=>{this.closeQuickSettings();this.openDevCode();});
    safeOnClick('floor-jump-trigger',()=>{this.closeQuickSettings();this.openFloorJumpCode();});
    safeOnClick('floor-jump-cancel',()=>this.closeFloorJumpCode());
    this.$id('floor-jump-form')?.addEventListener('submit',event=>{
      event.preventDefault();this.teleportToFloor(this.$id('floor-jump-code').value,this.$id('floor-jump-level').value);
    });
    this.$id('floor-jump-overlay')?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();this.closeFloorJumpCode();}
      if(event.key==='Tab'){
        const focusable=[...this.$id('floor-jump-overlay').querySelectorAll('input:not(:disabled),button:not(:disabled)')];
        if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1)?.focus();}
        else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0]?.focus();}
      }
    });
    safeOnClick('speed-toggle',()=>this.setGameSpeed(this.speedMultiplier===1?2:1));
    safeOnClick('language-it',()=>this.setGameLanguage('it'));
    safeOnClick('language-en',()=>this.setGameLanguage('en'));
    safeOnClick('dev-code-cancel',()=>this.closeDevCode());
    this.$id('dev-code-form')?.addEventListener('submit',event=>{
      event.preventDefault();
      this.activateDevMode(this.$id('dev-access-code').value);
    });
    this.$id('dev-code-overlay')?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();this.closeDevCode();}
      if(event.key==='Tab'){
        const focusable=[...this.$id('dev-code-overlay').querySelectorAll('input:not(:disabled),button:not(:disabled)')];
        if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1)?.focus();}
        else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0]?.focus();}
      }
    });
    safeOnClick('dev-radar',()=>this.devUnlimitedRadar());
    safeOnClick('dev-capture',()=>this.devToggleCapture());
    safeOnClick('dev-skip-encounter',()=>this.devSkipEncounter());
    const devPanel=this.$id('developer-panel');
    if(devPanel)devPanel.classList.toggle('hidden',!this.devMode);

    safeOnClick('close-market-btn', () => {
      document.getElementById('pokemart-overlay').classList.add('hidden');
      this.isLocked = false;
      this.logMsg("Hai lasciato il Pokémarket.");
    });

    safeOnClick('close-box-btn', () => {
      document.getElementById('box-pc-overlay').classList.add('hidden');
      this.isLocked = false;
      this.logMsg("Squadra e PP curati al Centro Pokémon!");
    });

    safeOnClick('skip-new-move-btn', () => this.resolveMoveChoice(null));

    safeOnClick('btn-battle-confirm-yes', () => this.acceptBattleConfirmation());
    safeOnClick('btn-battle-confirm-no', () => this.closeBattleConfirmation());
    safeOnClick('evolution-start', () => this.startEvolutionAnimation());
    safeOnClick('evolution-finish', () => this.finishEvolution());
    this.$id('battle-msg')?.addEventListener('click', () => this.acknowledgeDialogue());
    // A dialogue can be advanced by clicking the battlefield or the log.
    // Never swallow the pointer event for a visible menu button or a confirmation.
    document.addEventListener('pointerdown', event => {
      if (!this.dialogueResolve) return;
      if (event.target.closest('button, [role="button"], #battle-confirm, #evolution-overlay')) return;
      this.acknowledgeDialogue();
    }, true);
    // Preload the repeatedly used trainer pixels once instead of waiting for the intro.
    this.preloadBattleTrainers();
    for(const tab of document.querySelectorAll('[data-bag-tab]')) {
      tab.addEventListener('click', () => {this.bagCategory=tab.dataset.bagTab;this.renderSidebar();});
    }

    // All direction sources share one repeat controller. No timer survives
    // pointer cancellation, key release, document focus loss or a modal lock.
    const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    document.querySelectorAll('#mobile-dpad [data-move]').forEach(button=>{
      const step=directions[button.dataset.move];
      const source=`touch:${button.dataset.move}`;
      button.addEventListener('pointerdown',event=>{
        if(event.button!==0 || !event.isPrimary)return;
        event.preventDefault();
        button.classList.add('is-pressed');
        this.startContinuousWalk(step[0],step[1],source);
        try{button.setPointerCapture(event.pointerId)}catch(_error){}
      });
      const stop=()=>{button.classList.remove('is-pressed');this.stopContinuousWalk(source);};
      for(const eventType of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventType,stop);
      button.addEventListener('click',event=>{
        // detail=0 is keyboard/assistive technology; pointer was handled on down.
        if(event.detail!==0){event.preventDefault();return;}
        this.movePlayer(...step);
      });
      button.addEventListener('contextmenu',event=>event.preventDefault());
    });
    // The side-panel D-pad uses the same press-and-hold lifecycle as the
    // mobile overlay. A missed pointerup must never leave LEFT held down.
    for(const [id,step] of [['btn-dpad-up',directions.up],['btn-dpad-down',directions.down],
      ['btn-dpad-left',directions.left],['btn-dpad-right',directions.right]]){
      const button=this.$id(id);if(!button)continue;
      const source=`side-pad:${id}`;
      button.addEventListener('pointerdown',event=>{
        if(event.button!==0||!event.isPrimary)return;
        event.preventDefault();button.classList.add('is-pressed');
        this.startContinuousWalk(...step,source);
        try{button.setPointerCapture(event.pointerId);}catch(_error){}
      });
      const release=()=>{button.classList.remove('is-pressed');this.stopContinuousWalk(source);};
      for(const action of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(action,release);
      document.addEventListener('pointerup',release);
      button.addEventListener('click',event=>{
        if(event.detail!==0){event.preventDefault();return;}
        this.movePlayer(...step);
      });
      button.addEventListener('contextmenu',event=>event.preventDefault());
    }
    const keys={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
    window.addEventListener('keydown',e=>{
      if((this.$id('dev-code-overlay') && !this.$id('dev-code-overlay').classList.contains('hidden')) ||
         (this.$id('floor-jump-overlay') && !this.$id('floor-jump-overlay').classList.contains('hidden')) ||
         e.target?.closest?.('input,textarea,[contenteditable]') || e.ctrlKey || e.altKey || e.metaKey)return;
      if(e.key==='Escape' && !this.$id('badge-case-overlay')?.classList.contains('hidden')){this.closeBadgeCase();return;}
      if(e.key==='Escape' && !this.$id('party-action-menu')?.classList.contains('hidden')){this.closePartyActions();return;}
      if(e.code==='Space' && !e.repeat){
        if(!this.$id('celestial-dialog')?.classList.contains('hidden')){
          e.preventDefault();this.advanceCelestialDialog();return;
        }
        if(this.dialogueResolve){e.preventDefault();this.acknowledgeDialogue();return;}
        const npc=this.$id('npc-dialog-overlay');
        if(npc&&!npc.classList.contains('hidden')){
          if(this.pendingNpcAdvance){e.preventDefault();this.pendingNpcAdvance();return;}
          const next=npc.querySelector('button:not(.hidden):not(:disabled)');
          if(next){e.preventDefault();next.click();}return;
        }
      }
      const dir=keys[e.key]||keys[e.key?.toLowerCase()];
      if(!dir)return;
      if(this.$id('pokemon-info-overlay')&&!this.$id('pokemon-info-overlay').classList.contains('hidden'))return;
      if(this.$id('badge-case-overlay')&&!this.$id('badge-case-overlay').classList.contains('hidden'))return;
      e.preventDefault();
      this.startContinuousWalk(...directions[dir],`key:${dir}`);
    });
    window.addEventListener('keyup',e=>{
      const dir=keys[e.key]||keys[e.key?.toLowerCase()];
      if(dir)this.stopContinuousWalk(`key:${dir}`);
    });
    window.addEventListener('blur',()=>this.stopContinuousWalk());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopContinuousWalk()});
  }

  selectPlayerGender(gender){
    if(!['male','female'].includes(gender)||this.team.length||this.isLocked)return false;
    this.playerGender=gender;
    for(const [id,active] of [['choose-male',gender==='male'],['choose-female',gender==='female']]){
      const b=this.$id(id);if(b){b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
    }
    return true;
  }

  startContinuousWalk(dx,dy,source){
    if(this.$id('pokemon-info-overlay') && !this.$id('pokemon-info-overlay').classList.contains('hidden'))return false;
    if(this.$id('badge-case-overlay') && !this.$id('badge-case-overlay').classList.contains('hidden'))return false;
    if(this.$id('party-action-menu') && !this.$id('party-action-menu').classList.contains('hidden'))return false;
    if((this.$id('dev-code-overlay') && !this.$id('dev-code-overlay').classList.contains('hidden')) ||
       (this.$id('floor-jump-overlay') && !this.$id('floor-jump-overlay').classList.contains('hidden')) ||
       this.isLocked||this.adventureCompleted||this.pendingItemTarget||!this.gridMap?.length)return false;
    if(this.heldWalk?.source===source)return true; // suppress OS key auto-repeat
    this.stopContinuousWalk();
    this.heldWalk={dx,dy,source,delay:null,interval:null};
    this.movePlayer(dx,dy);
    const holding=this.heldWalk;
    holding.delay=setTimeout(()=>{
      if(this.heldWalk!==holding)return;
      holding.interval=setInterval(()=>{
        if(this.heldWalk!==holding)return;
        if(this.isLocked||this.pendingItemTarget||this.adventureCompleted){this.stopContinuousWalk();return;}
        this.movePlayer(holding.dx,holding.dy);
      },this.gameDelay(220));
    },this.gameDelay(240));
    return true;
  }
  stopContinuousWalk(source){
    const holding=this.heldWalk;
    if(!holding || (source&&source!==holding.source))return;
    clearTimeout(holding.delay);clearInterval(holding.interval);
    this.heldWalk=null;
  }

  async startStarterScene() {
    this.selectedStarterData = null;
    const scene=this.$id('starter-scene-overlay');
    scene.classList.remove('hidden');
    const container=this.$id('briefcase-balls');
    const details=this.$id('starter-selection-info');
    this.$id('dialog-actions').classList.add('hidden');
    this.$id('starter-showcase').classList.remove('active','bg-fire','bg-water','bg-grass');
    details.textContent='Tre compagni. Un solo inizio.';
    container.textContent='Preparazione della valigetta...';
    const starters=[{id:1,type:'grass',label:'ERBA'},{id:4,type:'fire',label:'FUOCO'},{id:7,type:'water',label:'ACQUA'}];
    try {
      const loaded=await Promise.all(starters.map(async starter=>{
        const data=await this.getPokemonData(starter.id);
        data.elemType=starter.type;data.elemLabel=starter.label;
        return data;
      }));
      container.replaceChildren();
      loaded.forEach((data,index)=>{
        const wrapper=document.createElement('button');
        wrapper.type='button';wrapper.className='pokeball-wrapper';
        wrapper.setAttribute('aria-label',`Seleziona ${data.name}`);
        wrapper.dataset.type=data.elemType;
        wrapper.innerHTML=`<span class="ball-pad"></span><span class="ball-model" aria-hidden="true"><span class="pokeball-top"></span><span class="pokeball-button"></span><span class="pokeball-bottom"></span></span><span class="starter-name">${data.name.toUpperCase()}</span><span class="starter-kind">${data.elemLabel}</span>`;
        wrapper.onclick=()=>{
          container.querySelectorAll('.pokeball-wrapper').forEach(b=>b.classList.remove('open'));
          wrapper.classList.add('open');this.selectedStarterData=data;
          this.$id('starter-showcase-img').src=data.sprites.front_default;
          const showcase=this.$id('starter-showcase');
          showcase.className=`pokemon-showcase-box active bg-${data.elemType}`;
          details.textContent=`${data.name.toUpperCase()} · TIPO ${data.elemLabel}`;
          this.$id('dialog-text').textContent=`Vuoi iniziare l'avventura con ${data.name.toUpperCase()}?`;
          this.$id('dialog-actions').classList.remove('hidden');
        };
        container.appendChild(wrapper);
      });
    }catch(error){
      console.error('Impossibile caricare gli starter',error);
      container.textContent='Non riesco a caricare i Pokémon. Controlla la connessione e riapri la valigetta.';
    }
  }

  resetStarter() {
    this.selectedStarterData = null;
    document.getElementById('dialog-actions').classList.add('hidden');
    document.getElementById('dialog-text').textContent = "Seleziona un Pokémon dalla valigetta per iniziare l'avventura.";
    const info=this.$id('starter-selection-info');if(info)info.textContent='Tre compagni. Un solo inizio.';
    document.getElementById('starter-showcase').classList.remove('active', 'bg-fire', 'bg-water', 'bg-grass');
    document.querySelectorAll('.pokeball-wrapper').forEach(b => b.classList.remove('open'));
  }

  confirmStarter() {
    if (!this.selectedStarterData) return;
    this.team = [new Pokemon(this.selectedStarterData, 5)];
    this.activeMon = this.team[0];
    document.getElementById('starter-scene-overlay').classList.add('hidden');
    this.generateFloorDungeon();
  }

generateFloorDungeon() {
    this.isCelestialCave=false;this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
    window.pokexplorerMusic?.setScene('exploration');
    this.gridMap = [];
    this.playerPos = { x: 0, y: 0 };
    this.isLocked = false;
    this.isRaidActive = false;
    this.raidQueueCount = 0;
    this.gymQueue = [];
    this.currentGym = null;
    this.hiddenRaidPosition = null;
    this.pendingTrainerCell=null;
    this.gymChallengePending = false;
    this.battleMode = null;
    this.pendingForcedSwitch = false;

    const isCity = this.floor % 10 === 0;
    const isVillage = this.floor % 5 === 0 && !isCity;

    const typeLabelEl = document.getElementById('area-type-label');
    if (typeLabelEl) {
      typeLabelEl.textContent = isCity ? "CITTÀ" : isVillage ? "VILLAGGIO" : "PERCORSO";
    }

    for (let y = 0; y < this.gridSize; y++) {
      let row = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({ x, y, type: isCity || isVillage ? 'town-ground' : 'grass', entity: null, revealed: false });
      }
      this.gridMap.push(row);
    }

    if (isVillage || isCity) {
      const size=this.gridSize;
      const variant=(Math.floor(this.floor/5)-1)%4;
      const paths=new Set();
      const key=(x,y)=>`${x},${y}`;
      const road=(x,y)=>paths.add(key(x,y));
      // Broad connected avenues guarantee start, buildings and exit are reachable.
      for(let x=0;x<size;x++) road(x,4);
      for(let y=0;y<size;y++) road(4,y);
      for(let y=4;y<size;y++) road(8,y);
      for(let x=4;x<size;x++) road(x,8);
      for(let x=0;x<=4;x++) road(x,0);
      for(let y=0;y<=4;y++) road(0,y);
      road(9,9);road(8,9);
      // Small secondary plazas vary with the city instead of one copied cross.
      if(variant%2===0){for(let x=2;x<=7;x++)road(x,3);for(let y=2;y<=7;y++)road(6,y);}
      else {for(let x=1;x<=8;x++)road(x,6);for(let y=1;y<=6;y++)road(3,y);}
      for(let y=0;y<size;y++) for(let x=0;x<size;x++){
        const c=this.gridMap[y][x];
        const edge=(x===0||y===0||x===size-1||y===size-1);
        c.type=paths.has(key(x,y))?'path':edge?((x*7+y*3+variant)%8===0?'water':'tree'):'town-ground';
        if(c.type==='town-ground'){
          const decorationNoise=(x*13+y*17+variant*11)%29;
          c.decoration=decorationNoise<3?['flowers','hedge','flower-red'][decorationNoise]:
            decorationNoise===5?'lantern':decorationNoise===8?'flower-blue':
            decorationNoise===12?'bench':decorationNoise===16?'flower-yellow':
            decorationNoise===20?'rock':null;
        }
      }
      const place=(x,y,entity)=>{const c=this.gridMap[y][x];c.type='town-ground';c.entity=entity;c.decoration=null;};
      place(2,2,'pokecenter');place(7,2,'pokemart');
      place(2,7,'house');place(7,7,'house');
      if(variant===1||variant===3) place(5,6,'house');
      if(isCity)place(5,2,'gym');
      // Connect every building entrance to the central east-west avenue.
      // Buildings are solid; the approach needs to be walkable from an adjacent tile.
      for(const [bx,by,dy] of [[2,2,1],[7,2,1],[2,7,-1],[7,7,-1],
        ...(isCity?[[5,2,1]]:[]),...((variant===1||variant===3)?[[5,6,-1]]:[])]){
        for(let y=by+dy;dy>0?y<=4:y>=4;y+=dy){
          const c=this.gridMap[y]?.[bx];
          if(!c || c.entity)break;
          c.type='path';c.decoration=null;
        }
      }
      // Plazas, signs and landscaping (decorative sprites are not obstacles).
      for(const [x,y,what] of [[5,5,'fountain'],[1,3,'sign'],[7,5,'flowers'],[1,6,'lantern'],[6,1,'hedge']]){
        const c=this.gridMap[y]?.[x];
        if(c&&!c.entity&&c.type==='town-ground')c.decoration=what;
      }
      // No NPC can replace a building, a water tile, the player spawn or exit.
      const candidates=[];
      for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
        const c=this.gridMap[y][x];
        if(c.entity||['tree','water'].includes(c.type)||paths.has(key(x,y)))continue;
        // Large building sprites extend beyond one cell: leave a buffer to avoid visual overlap.
        const buildings=[[2,2],[7,2],[2,7],[7,7],...(isCity?[[5,2]]:[]),...((variant===1||variant===3)?[[5,6]]:[])];
        if(buildings.some(([bx,by])=>Math.abs(x-bx)+Math.abs(y-by)<=1))continue;
        if(![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>paths.has(key(x+dx,y+dy))))continue;
        if(Math.abs(x-0)+Math.abs(y-0)<3)continue;
        candidates.push(c);
      }
      // Rotate per map, but use distinct poses/sprites in every village/city.
      candidates.sort(()=>Math.random()-.5);
      const spriteStart=(this.floor*3)%this.npcSprites.length;
      for(let i=0,n=Math.min(candidates.length,3+Math.floor(Math.random()*3));i<n;i++){
        const c=candidates[i];c.entity='npc';c.decoration=null;
        const officialIndex=(spriteStart+i*5)%this.npcSprites.length;
        c.npcSprite=this.npcSprites[officialIndex];
        c.npcName=FIRERED_NPC_NAMES[officialIndex].replaceAll('_',' ');
        c.npcLine=this.npcDialogues[(this.floor+i*5)%this.npcDialogues.length];
        c.localSpriteFallback=this.npcFallbacks[officialIndex];
        // The encounter is generated ONCE per NPC, not rerolled each conversation.
        const eventRoll=Math.random();
        c.npcEvent=eventRoll<.10?'trade':eventRoll<.25?'gift':'dialogue';
        if(c.npcEvent==='trade')c.npcTradeSpeciesId=1+Math.floor(Math.random()*143);
        if(c.npcEvent==='gift')c.npcGiftId=Math.random()<.5?'pokeball':'elixir';
        if(this.floor===5 && i===0){
          c.specialRole='fisherman';c.npcName='Pescatore';
          c.npcLine='Un buon viaggio comincia con una buona canna!';
          c.npcSprite=`${FIRERED_OVERWORLD_BASE}fisher.png`;
          c.localSpriteFallback='assets/characters/fisher-overworld-reference.png';
        }
        if(this.floor===20 && i===0){
          c.specialRole='exp-share-gift';c.npcName='Assistente Pokémon';
          c.npcLine='Hai sconfitto Misty? Ho qualcosa per la tua squadra.';
          c.npcSprite=`${FIRERED_OVERWORLD_BASE}scientist.png`;
          c.localSpriteFallback='assets/characters/scientist-down.png';
        }
      }
      if(this.floor===75&&!this.oakEventDismissed){
        const oak=this.gridMap[3][5];oak.type='town-ground';oak.entity='npc';oak.decoration=null;
        oak.specialRole='celestial-oak';oak.npcName='Professor Oak';
        oak.npcSprite='assets/characters/oak-frlg-down.png';
        oak.localSpriteFallback='assets/characters/oak-frlg-down.png';
      }
      place(9,9,'door');
    } else {
      // Generatore con percorso garantito, ostacoli organici e obiettivi raggiungibili.
      const size = this.gridSize;
      const walkable = (x,y) => x >= 0 && y >= 0 && x < size && y < size;
      const key = (x,y) => `${x},${y}`;
      const protectedPath = new Set([key(0,0)]);
      let cx = 0, cy = 0;
      // Un sentiero tortuoso che conduce all'uscita opposta alla partenza.
      while (cx !== size - 1 || cy !== size - 1) {
        const canX = cx < size - 1, canY = cy < size - 1;
        if (canX && (!canY || Math.random() < .5)) cx++; else cy++;
        protectedPath.add(key(cx,cy));
      }
      for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
        const cell=this.gridMap[y][x];
        const noise = Math.sin(x*1.7+y*.65+this.floor)*.14 + Math.cos(y*1.8-x*.48)*.13 + Math.random()*.72;
        cell.type = protectedPath.has(key(x,y)) ? 'path' : noise < .22 ? 'water' : noise < .49 ? 'tree' : noise < .72 ? 'grass' : 'path';
      }
      // Apri diramazioni per rendere esplorabili anche le zone lontane dal percorso principale.
      for(let i=0;i<15;i++) {
        let x=Math.floor(Math.random()*size), y=Math.floor(Math.random()*size);
        if(this.gridMap[y][x].type==='tree' && Math.random()<.55) this.gridMap[y][x].type='grass';
      }
      const reachable = new Map();
      const queue=[[0,0]]; reachable.set(key(0,0),0);
      for(let i=0;i<queue.length;i++) {
        const [x,y]=queue[i];
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx=x+dx,ny=y+dy,k=key(nx,ny);
          if(walkable(nx,ny) && !reachable.has(k) && !['tree','water'].includes(this.gridMap[ny][nx].type)) {
            reachable.set(k,reachable.get(key(x,y))+1); queue.push([nx,ny]);
          }
        }
      }
      this.gridMap[size-1][size-1].type='grass';
      this.gridMap[size-1][size-1].entity='door';
      const candidates=queue.filter(([x,y])=> !(x===0&&y===0) && !(x===size-1&&y===size-1) && reachable.get(key(x,y))>=3);
      const pick=(predicate=()=>true)=>{
        const options=candidates.filter(([x,y])=>predicate(this.gridMap[y][x]));
        if(!options.length)return null;
        const [x,y]=options[Math.floor(Math.random()*options.length)];
        candidates.splice(candidates.findIndex(v=>v[0]===x&&v[1]===y),1);
        return this.gridMap[y][x];
      };
      // Raid placement is resolved after ordinary items/trainer placements.
      // Exactly one hidden raid; it is independent of collectible item count.
      const classes=[['Bullo','youngster-gen3','youngster'],['Pigliamosche','bugcatcher-gen3','bug_catcher'],
        ['Fantallenatore','acetrainer-gen3','cooltrainer_m'],['Pokémon Ranger','pokemonranger-gen3','cooltrainer_f'],
        ['Montanaro','hiker-gen3','hiker'],['Campeggiatore','camper-gen3','camper']];
      for(let i=0,n=1+Math.floor(Math.random()*4);i<n;i++) {
        const c=pick(); if(!c)break;
        const [name,sprite,overworld]=classes[Math.floor(Math.random()*classes.length)];
        c.entity='trainer'; c.trainerName=name;
        c.trainerSprite=`${TRAINER_PORTRAIT_BASE}${sprite}.png`;
        c.trainerOverworldSprite=`${FIRERED_OVERWORLD_BASE}${overworld}.png`;
      }
      for(let i=0,n=1+Math.floor(Math.random()*3);i<n;i++) {
        const c=pick();
        if(c){
          c.entity='item';
          // Determine loot at generation time. A full bag must never reroll it.
          const roll=Math.random();
          c.itemKind=roll<.4?'pokeball':roll<.8?healingTier(this.floor).id:'elixir';
        }
      }
      // R2.4: raids are a 10% surprise on collected item tiles, not in grass.
      this.hiddenRaidPosition=null;
    }

    if(isCity || isVillage || this.devMode){
      // Dev Mode reveals every tile of this dungeon as soon as it is generated.
      // Hidden raid triggers remain hidden: only the fog-of-war is removed.
      for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
    } else this.revealArea(0,0);
    this.renderDungeon();
    this.renderSidebar();
    this.logMsg(`Sei arrivato al Livello ${this.floor}. Esplora liberamente!`);
  }

  // Optional floor-75 story: no floor advance and no modifications to the village layout.
  showOakIntroduction(){
    this.$id('npc-dialog-overlay')?.classList.add('hidden');
    this.pendingNpcAdvance=null;this.hideDialogNpcBackground(false);
    this.showCelestialDialogue('Oh! Sei tu, quanta strada hai fatto per arrivare fin qui!', 'intro-one');
  }
  showCelestialDialogue(line,step){
    this.celestialDialogStep=step;this.isLocked=true;this.stopContinuousWalk();
    const panel=this.$id('celestial-dialog');
    this.$id('celestial-dialog-text').textContent=line;
    this.$id('celestial-dialog-actions').classList.toggle('hidden',step!=='question');
    this.$id('celestial-dialog-next').classList.toggle('hidden',step==='question');
    panel.classList.remove('hidden');
  }
  advanceCelestialDialog(){
    if(this.$id('celestial-dialog')?.classList.contains('hidden'))return;
    if(this.celestialDialogStep==='intro-one'){
      this.showCelestialDialogue('C’è una cosa interessante che devo mostrarti assolutamente, seguimi.','intro-two');
    }else if(this.celestialDialogStep==='intro-two'){
      this.showCelestialDialogue('Vuoi seguire il Prof. Oak?','question');
    }else if(this.celestialDialogStep==='arrival'||this.celestialDialogStep==='reward'){
      this.$id('celestial-dialog').classList.add('hidden');
      this.isLocked=false;
      if(this.celestialDialogStep==='reward'){
        this.logMsg('La Master Ball è tua. Mewtwo ti attende ancora!');
        this.showDiscoveryNotice('MASTER BALL OTTENUTA · MEWTWO TI ATTENDE',3100);
      }
    }
  }
  answerOakInvitation(yes){
    if(this.celestialDialogStep!=='question')return;
    this.$id('celestial-dialog').classList.add('hidden');
    this.oakEventDismissed=true;
    const oak=this.gridMap?.[3]?.[5];
    if(oak?.specialRole==='celestial-oak'){oak.entity=null;oak.specialRole=null;}
    this.renderDungeon();
    if(yes){this.enterCelestialCave();}
    else{this.isLocked=false;this.logMsg('Hai deciso di non seguire il Prof. Oak.');}
  }
  async celestialFadeTo(action){
    const black=this.$id('celestial-blackout');
    black.classList.add('active');
    await this.wait(950);
    await action();
    await this.wait(340);
    black.classList.remove('active');
    await this.wait(900);
  }
  async enterCelestialCave(){
    this.isLocked=true;this.stopContinuousWalk();
    this.celestialReturnState={gridMap:this.gridMap,playerPos:{...this.playerPos},floor:this.floor};
    await this.celestialFadeTo(async()=>{
      this.isCelestialCave=true;this.celestialPhase='trial';
      this.playerPos={x:5,y:7};this.pendingWalk=null;
      const walkable=(x,y)=>(x>=3&&x<=6&&y>=2&&y<=7)||
        (x>=4&&x<=6&&y===8)||(x>=4&&x<=6&&y===1)||
        ((x===2||x===7)&&(y>=3&&y<=6));
      this.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({
        x,y,type:walkable(x,y)?'cave-stone':'water',entity:null,revealed:true,
        decoration:([[2,3],[7,3],[2,6],[7,6],[3,1],[6,1]].some(([cx,cy])=>cx===x&&cy===y))?'celestial-crystal':null
      })));
      // A single southern opening; the cave is surrounded by deep water.
      const exit=this.gridMap[9][5];exit.type='cave-stone';exit.entity='cave-exit';
      this.gridMap[4][5].entity='mewtwo';
      const oak=this.gridMap[7][4];oak.entity='npc';oak.specialRole='cave-oak';
      oak.npcName='Professor Oak';oak.npcSprite='assets/characters/oak-frlg-down.png';
      oak.localSpriteFallback='assets/characters/oak-frlg-down.png';
      this.$id('area-type-label').textContent='GROTTA CELESTE';
      this.renderDungeon();this.renderSidebar();
    });
    if(!this.isCelestialCave)return;
    await this.wait(600);
    window.pokexplorerMusic?.setScene('cave');
    this.showCelestialDialogue('Batti quel Pokémon, dimostra il tuo valore e riceverai un dono speciale.','arrival');
  }
  async startMewtwoCinematic(){
    if(!this.isCelestialCave||!['trial','rematch'].includes(this.celestialPhase)||this.celestialCutsceneActive)return;
    this.celestialCutsceneActive=true;this.isLocked=true;this.stopContinuousWalk();
    const overlay=this.$id('celestial-cinematic');
    overlay.classList.remove('hidden');
    this.$id('celestial-cinematic-subtitle').textContent=this.celestialPhase==='trial'
      ?'Un potere psichico travolge la Grotta Celeste…':'Mewtwo accetta la tua seconda sfida!';
    window.pokexplorerMusic?.setScene('mewtwo');
    await this.wait(1900);
    if(!this.isCelestialCave){overlay.classList.add('hidden');this.celestialCutsceneActive=false;return;}
    overlay.classList.add('hidden');this.celestialCutsceneActive=false;
    this.startBattle('mewtwo');
  }
  showOakMasterBallReward(){
    if(this.items.masterball===0)this.grantItem('masterball');
    this.renderSidebar();
    this.showCelestialDialogue('Con questa potrai catturarlo. Hai ricevuto una Master Ball!','reward');
  }
  completeMewtwoEncounter(){
    this.celestialPhase='complete';
    const mon=this.gridMap?.[4]?.[5];if(mon?.entity==='mewtwo')mon.entity=null;
    this.logMsg('La sfida di Mewtwo è conclusa. Raggiungi l’uscita a sud.');
  }
  async leaveCelestialCave(){
    if(!this.isCelestialCave||this.celestialPhase!=='complete'||!this.celestialReturnState)return;
    this.isLocked=true;this.stopContinuousWalk();
    window.pokexplorerMusic?.setScene('exploration');
    await this.celestialFadeTo(async()=>{
      const previous=this.celestialReturnState;
      this.gridMap=previous.gridMap;this.playerPos={...previous.playerPos};
      this.floor=previous.floor;this.celestialReturnState=null;this.isCelestialCave=false;
      this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
      this.$id('area-type-label').textContent='VILLAGGIO';
      this.renderDungeon();this.renderSidebar();
    });
    this.isLocked=false;this.logMsg('Sei tornato al villaggio prima della palestra di Giovanni.');
  }
  revealArea(px, py) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          this.gridMap[ny][nx].revealed = true;
        }
      }
    }
  }

  scanRadar() {
    if(this.isLocked || !this.gridMap?.length)return;
    if(!this.gridMap.some(row=>row.some(cell=>!cell.revealed))){
      this.logMsg('Mappa già esplorata: nessuna scansione consumata.');return;
    }
    if(this.radarCharges<=0){this.logMsg('Radar esaurito: acquista un utilizzo al Pokémarket (1.500 Pokécoins).');return;}
    this.radarCharges--;
    for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
    this.renderDungeon();this.renderSidebar();
    this.logMsg(`Rotom Radar attivato! Utilizzi rimanenti: ${this.radarCharges}.`);
  }

  collectFloorItem(cell){
    if(!cell || cell.entity!=='item')return false;
    if(!cell.itemKind){
      // Legacy maps without an assigned drop are upgraded once, never rerolled.
      const roll=Math.random();
      cell.itemKind=roll<.4?'pokeball':roll<.8?healingTier(this.floor).id:'elixir';
    }
    // 10% chance of a raid in place of the collectible, not in addition to it.
    // The item does not enter the inventory in this outcome.
    if(!this.isTownFloor() && Math.random()<.10){
      cell.entity=null;
      this.renderDungeon();
      this.logMsg('La Poké Ball nasconde una sfida RAID!');
      this.beginHiddenRaid();
      return true;
    }
    const label={pokeball:'POKÉ BALL',potion:'POZIONE',superPotion:'SUPERPOZIONE',hyperPotion:'IPERPOZIONE',elixir:'ELISIR'}[cell.itemKind];
    const collected=this.grantItem(cell.itemKind);
    if(collected){
      cell.entity=null;
      this.renderSidebar();
    }
    this.logMsg(collected?`Hai trovato: ${label}!`:`Zaino pieno: ${label} rimane a terra. Torna dopo aver liberato spazio.`);
    this.showDiscoveryNotice(collected?`${label} RACCOLTO!`:`ZAINO PIENO · ${label}`);
    return collected;
  }

  grantItem(id,count=1){
    const limit=BAG_LIMITS[id]; if(limit===undefined)return false;
    if(id==='fishingRod'){if(this.items.fishingRod)return false;this.items.fishingRod=true;return true;}
    const available=Math.max(0,limit-(this.items[id]||0));
    if(!available)return false;
    this.items[id]+=Math.min(available,count);return true;
  }
  purchaseItem(id,price){
    if(id==='superPotion' && this.floor<21 || id==='hyperPotion' && this.floor<51){this.logMsg('Questo rimedio non è ancora disponibile.');return false;}
    if(this.money<price){this.logMsg(`Pokécoins insufficienti: servono ${price}.`);return false;}
    if(!this.grantItem(id)){this.logMsg('Capacità massima raggiunta!');return false;}
    this.money-=price;this.renderSidebar();this.logMsg('Acquisto completato!');return true;
  }
  purchaseRadar(){
    if(this.radarCharges===Infinity){this.logMsg('Radar già illimitato in DEV MODE.');return false;}
    if(this.money<1500){this.logMsg('Servono 1.500 Pokécoins per una scansione.');return false;}
    this.money-=1500;this.radarCharges++;this.renderSidebar();
    this.logMsg(`Radar +1 · Ora hai ${this.radarCharges} scansioni.`);return true;
  }

  async animateFishing(){
    // Four user-supplied fishing frames. Walking is locked throughout this animation.
    for(let frame=0;frame<4;frame++){
      this.playerFishingFrame=frame;this.renderDungeon();
      await this.wait(frame===3?290:135);
    }
    this.playerFishingFrame=null;this.playerStep=0;this.renderDungeon();
  }

  movePlayer(dx, dy) {
    if(this.$id('pokemon-info-overlay')?.classList?.contains && !this.$id('pokemon-info-overlay').classList.contains('hidden'))return;
    if(this.$id('badge-case-overlay')&&!this.$id('badge-case-overlay').classList.contains('hidden'))return;
    if(this.$id('party-action-menu')&&!this.$id('party-action-menu').classList.contains('hidden'))return;
    if (this.isLocked || this.pendingItemTarget || this.adventureCompleted || !this.gridMap?.length) return;
    // A tile must complete its walking cycle before another one begins.
    // Logical collisions remain tile-based; only the sprite interpolates.
    if(Date.now()<this.walkReadyAt)return;
    this.playerFacing=dx<0?'left':dx>0?'right':dy<0?'up':'down';
    const nx = this.playerPos.x + dx;
    const ny = this.playerPos.y + dy;

    if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
      const targetCell = this.gridMap[ny][nx];

      if (targetCell.type === 'tree') {
        this.renderDungeon();this.logMsg("Un albero ti sbarra la strada!");
        return;
      }

      if(this.isCelestialCave && targetCell.type==='water'){
        this.logMsg('L’acqua profonda circonda la Grotta Celeste.');return;
      }
      if (targetCell.type === 'water') {
        if (!this.items.fishingRod) {
          this.logMsg("Ti serve una Canna da Pesca per pescare!");
          return;
        }
        this.isLocked=true;
        this.fishingConfirmPending=true;
        this.askBattleConfirmation('Vuoi usare la Canna da Pesca qui?', async () => {
          this.logMsg('Lanci la lenza in acqua...');
          await this.animateFishing();
          if(!this.isLocked)return;
          this.logMsg("Abbocca un Pokémon d'acqua!");
          this.pendingWildEncounterType='fishing';
          document.getElementById('wild-encounter-overlay').classList.remove('hidden');
        });
        return;
      }

      if(this.isCelestialCave && targetCell.entity==='mewtwo'){
        this.startMewtwoCinematic();return;
      }
      if(this.isCelestialCave && targetCell.entity==='cave-exit'){
        if(this.celestialPhase==='complete')this.leaveCelestialCave();
        else this.showDiscoveryNotice('DEVI AFFRONTARE MEWTWO',2600);
        return;
      }
      if(this.isTownFloor() && targetCell.decoration){
        this.logMsg('Questo elemento del villaggio blocca il passaggio.');
        return;
      }
      const interactFromAdjacent=this.isSolidTownCell(targetCell);
      if(!interactFromAdjacent){
        this.walkDurationMs=this.gameDelay(210);
        this.walkReadyAt=Date.now()+this.walkDurationMs;
        this.playerStep=1;
        this.pendingWalk={dx,dy};
        this.playerPos={x:nx,y:ny};
        this.revealArea(nx,ny);
      }
      // Buildings and NPCs keep their tile/sprite while being interacted with from next door.
      this.renderDungeon();
      if(this.isCelestialCave && this.celestialPhase!=='complete' &&
          Math.abs(this.playerPos.x-5)+Math.abs(this.playerPos.y-4)<=1){
        this.startMewtwoCinematic();return;
      }

      if (targetCell.entity === 'pokecenter') {
        this.team.forEach(p => p.healAll());
        this.isLocked = true;
        document.getElementById('box-pc-overlay').classList.remove('hidden');
        this.logMsg("Centro Pokémon: Squadra e PP curati!");
        this.renderSidebar();
        this.renderDungeon();
        return;
      } else if (targetCell.entity === 'pokemart') {
        this.isLocked = true;
        document.getElementById('pokemart-overlay').classList.remove('hidden');
        this.logMsg("Hai aperto il Pokémarket.");
        return;
      } else if (targetCell.entity === 'npc') {
        this.isLocked = true;
        this.triggerNpcEvent(targetCell);
        return;
      } else if (targetCell.entity === 'gym') {
        if (this.completedGymFloors.has(this.floor)) {
          this.logMsg('Hai già conquistato la medaglia di questa palestra!');
          return;
        }
        this.requestGymChallenge();
        return;
      } else if (targetCell.entity === 'house') {
        this.logMsg('Una casetta tranquilla, illuminata e piena di fiori.');
        return;
      }

      if (targetCell.entity === 'trainer') {
        this.isLocked = true;
        this.pendingTrainerCell=targetCell;
        this.currentTrainerSprite = targetCell.trainerSprite || this.trainerSprites[0];
        targetCell.entity = null;
        this.renderDungeon(); // Remove the small encounter NPC from the map.
        this.logMsg(`${targetCell.trainerName || "Un Allenatore"} ti sfida!`);
        this.setTrainerPortrait(document.getElementById('trainer-portrait-img'), this.currentTrainerSprite);
        document.getElementById('trainer-dialog-speech').textContent = `${targetCell.trainerName || "Allenatore"}: preparati alla sfida!`;
        document.getElementById('trainer-encounter-overlay').classList.remove('hidden');
      } else if (targetCell.entity === 'item') {
        // Transactional pickup: only remove a collectible after it reaches the bag.
        // Otherwise it must remain on the same tile with the same item type.
        this.collectFloorItem(targetCell);
      } else if (targetCell.entity === 'door') {
        // Ogni decimo piano è una città: l'uscita richiede obbligatoriamente la medaglia.
        if (this.floor % 10 === 0 && !this.completedGymFloors.has(this.floor)) {
          this.logMsg('Agente: per proseguire hai bisogno della medaglia di questa città.');
          this.showDiscoveryNotice('AGENTE: SERVE LA MEDAGLIA PER PROSEGUIRE', 2900);
          return;
        }
        if(this.floor===80) {
          if(this.hasCompletedKantoChallenge())this.finishKantoAdventure();
          else {
            this.logMsg('Prima del traguardo devi ottenere tutte le otto medaglie di Kanto.');
            this.showDiscoveryNotice('COLLEZIONA TUTTE LE OTTO MEDAGLIE',3200);
          }
          return;
        }
        this.floor++;
        this.logMsg(`Sei salito al Livello ${this.floor}!`);
        this.generateFloorDungeon();
        return;
      } else if(!this.isCelestialCave && targetCell.type==='grass' && this.rollLegendaryEncounter()){
        this.pendingWildEncounterType='legendary';this.isLocked=true;
        this.$id('wild-encounter-overlay').classList.remove('hidden');
        this.logMsg('Una presenza leggendaria ti osserva!');
      } else if (!this.isCelestialCave && targetCell.type === 'grass' && Math.random() < GAME_BALANCE.wildEncounterChance) {
        this.isLocked = true;
        this.logMsg('Un Pokémon selvatico è comparso!');
        document.getElementById('wild-encounter-overlay').classList.remove('hidden');
      }

      this.renderDungeon();
    }
  }

  rollLegendaryEncounter(random=Math.random){
    if(this.badgeCount()<3)return false;
    // Independent probabilities: 3% per available species, 9% total initially.
    const owned=new Set([...(this.caughtLegendarySpecies||[]),...this.team.map(mon=>Number(mon.id))]);
    const roll=Math.min(.999999,Math.max(0,Number(random())));
    const index=Math.floor(roll/.03);
    const birds=[144,145,146];
    if(index>=birds.length||owned.has(birds[index]))return false;
    this.pendingLegendaryId=birds[index];return true;
  }
  requestGymChallenge(){
    if(this.gymChallengePending)return false;
    this.isLocked=true;
    this.gymChallengePending=true;
    const gym=KANTO_GYMS[(Math.floor(this.floor/10)-1)%KANTO_GYMS.length];
    const overlay=this.$id('gym-entry-confirm');
    this.$id('gym-entry-text').textContent=`Vuoi iniziare la sfida di ${gym.name}? `+
      'Dovrai superare tre Allenatori prima del Capopalestra.';
    overlay.classList.remove('hidden');
    return true;
  }
  cancelGymChallenge(){
    if(!this.gymChallengePending)return false;
    this.gymChallengePending=false;
    this.$id('gym-entry-confirm').classList.add('hidden');
    this.isLocked=false;
    this.logMsg('Sfida annullata: puoi tornare quando vuoi.');
    return true;
  }
  confirmGymChallenge(){
    if(!this.gymChallengePending)return false;
    this.gymChallengePending=false;
    this.$id('gym-entry-confirm').classList.add('hidden');
    this.isLocked=true;
    this.currentGym=KANTO_GYMS[(Math.floor(this.floor/10)-1)%KANTO_GYMS.length];
    this.gymQueue=['trainer1','trainer2','trainer3','leader'];
    this.gymLeaderIndex=0;
    this.gymBadgeName=`Medaglia ${this.currentGym.badge}`;
    this.currentTrainerSprite=this.trainerSprites[Math.floor(Math.random()*this.trainerSprites.length)];
    this.setTrainerPortrait(this.$id('trainer-portrait-img'),this.currentTrainerSprite);
    this.$id('trainer-dialog-speech').textContent=`Palestra ${this.currentGym.specialty}: sconfiggi 3 allenatori per affrontare ${this.currentGym.name}!`;
    this.$id('trainer-encounter-overlay').classList.remove('hidden');
    return true;
  }
  beginHiddenRaid(){
    if(this.isRaidActive)return false;
    this.isRaidActive=true;this.raidQueueCount=5;this.isLocked=true;
    this.logMsg('Hai scoperto un RAID nascosto! Cinque battaglie senza cattura.');
    const root=this.$id('pokenav-screen-root');
    root.classList.add('raid-discovery');
    this.showDiscoveryNotice('RAID SEGRETO! 5 LOTTE · NESSUNA CATTURA',0);
    this.waitForNotice().then(()=>{
      root.classList.remove('raid-discovery');
      if(this.isRaidActive)this.startBattle('wild');
    });
    return true;
  }
  getEncounterPool(type){
    if(type==='fishing')return this.floor<=15?[129,118,60]:[129,118,60,116,72,120,90];
    if(type==='gym')return GYM_TRAINER_POOLS[Math.max(0,Math.min(7,Math.floor(this.floor/10)-1))];
    // Ordinary encounters use the whole non-legendary Kanto Pokédex.
    // Gym pools/fishing retain their biome-specific typing.
    return null;
  }
  // TEST ONLY: PIN gate is independent of DEV MODE; does not grant cheats.
  openFloorJumpCode(){
    this.stopContinuousWalk?.();
    const overlay=this.$id('floor-jump-overlay');
    if(!overlay)return false;
    this.$id('floor-jump-code').value='';
    this.$id('floor-jump-level').value=String(Math.max(1,Math.min(80,Number(this.floor)||1)));
    this.$id('floor-jump-error').textContent='';
    overlay.classList.remove('hidden');
    this.$id('floor-jump-code').focus();
    return true;
  }
  closeFloorJumpCode(){
    this.$id('floor-jump-overlay')?.classList.add('hidden');
    this.$id('floor-jump-code').value='';
    this.$id('floor-jump-error').textContent='';
    this.$id('quick-settings-toggle')?.focus();
  }
  teleportToFloor(code,targetFloor){
    const error=this.$id('floor-jump-error');
    if(String(code).trim()!=='2103'){
      error.textContent='Codice errato. Riprova.';
      this.$id('floor-jump-code').value='';
      this.$id('floor-jump-code').focus();
      return false;
    }
    if(!this.team?.length||!this.gridMap?.length){
      error.textContent='Prima avvia una run e scegli il tuo Pokémon iniziale.';
      return false;
    }
    const floorNumber=Number(targetFloor);
    if(!Number.isInteger(floorNumber)||floorNumber<1||floorNumber>80 || String(targetFloor).trim()===''){
      error.textContent='Scegli un piano intero da 1 a 80.';
      this.$id('floor-jump-level').focus();
      return false;
    }
    if(this.isLocked||this.isBattleVisible()||this.battleBusy||this.isCelestialCave||
       this.adventureCompleted||this.pendingItemTarget||this.dialogueResolve||
       this.pendingForcedSwitch||this.gymQueue?.length){
      error.textContent='Completa prima la battaglia o l’evento in corso.';
      return false;
    }
    this.stopContinuousWalk?.();
    this.closeFloorJumpCode();
    this.closePartyActions();
    this.closePokemonInfo();
    this.floor=floorNumber;
    if(floorNumber===75)this.oakEventDismissed=false;
    this.celestialPhase=floorNumber===75?'unvisited':this.celestialPhase;
    this.celestialReturnState=null;
    this.celestialCutsceneActive=false;
    this.generateFloorDungeon(); // Reuse the native level generator, including Oak.
    this.logMsg(`TELETRASPORTO TEST: piano ${floorNumber}.${floorNumber===75?' Parla con il Prof. Oak per entrare nella Grotta Celeste.':''}`);
    return true;
  }

  openDevCode(){
    this.stopContinuousWalk?.();
    const overlay=this.$id('dev-code-overlay');
    if(!overlay)return false;
    this.$id('dev-access-code').value='';
    this.$id('dev-code-error').textContent='';
    this.$id('dev-code-description').textContent=this.devMode
      ? 'Modalità sviluppatore già attiva. Caramelle nello Zaino → Rimedi.'
      : 'Inserisci il codice di accesso a 4 cifre.';
    this.$id('dev-access-code').classList.toggle('hidden',this.devMode);
    this.$id('dev-code-form').querySelector('label').classList.toggle('hidden',this.devMode);
    this.$id('dev-code-confirm').classList.toggle('hidden',this.devMode);
    overlay.classList.remove('hidden');
    if(this.devMode)this.$id('dev-code-cancel').focus();
    else this.$id('dev-access-code').focus();
    return true;
  }
  closeDevCode(){
    this.$id('dev-code-overlay')?.classList.add('hidden');
    this.$id('dev-access-code').value='';
    this.$id('dev-mode-trigger')?.focus();
  }
  activateDevMode(code){
    if(this.devMode)return true;
    if(String(code).trim()!=='2103'){
      this.$id('dev-code-error').textContent='Codice errato. Riprova.';
      this.$id('dev-access-code').value='';
      this.$id('dev-access-code').focus();
      return false;
    }
    this.devMode=true;
    this.devGuaranteedCapture=true; // Dev Mode guarantees every valid wild capture immediately.
    this.$id('dev-capture')?.setAttribute('aria-pressed','true');
    this.items.rareCandy=999;
    this.items.goldCandy=999;
    // Unlocking Dev Mode mid-dungeon must scan the CURRENT map, too.
    // Future dungeon floors are fully revealed by generateFloorDungeon().
    if(this.gridMap?.length){
      for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
      this.renderDungeon();
    }
    this.$id('dev-mode-trigger')?.setAttribute('aria-pressed','true');
    if(this.$id('dev-mode-trigger'))this.$id('dev-mode-trigger').textContent='DEV MODE ✓';
    this.$id('developer-panel')?.classList.remove('hidden');
    this.bagCategory='rimedi';
    this.closeDevCode();
    this.renderSidebar();
    this.logMsg('DEV MODE attiva! Mappe dei dungeon già scannerizzate, 999 Caramelle Rare e 999 Caramelle d’Oro. Nessun limite medaglie, massimo Lv.100.');
    return true;
  }
  async useDevCandy(pokemon,id){
    if(!this.devMode||!['rareCandy','goldCandy'].includes(id)||this.devUpgradeInProgress||
       this.isBattleVisible()||this.isLocked||this.battleBusy||this.dialogueResolve||
       !this.team.includes(pokemon)||!this.items[id])return false;
    if(pokemon.level>=100){this.showItemFeedback(`${pokemon.name} è già al livello 100!`);return false;}
    const previousLevel=pokemon.level;
    const target=Math.min(100,previousLevel+(id==='goldCandy'?20:1));
    // Total XP required for exactly the requested number of levels. Preserve
    // ordinary experience, species growth rate, moves and evolution events.
    let needed=-Math.max(0,pokemon.exp);
    for(let level=previousLevel;level<target;level++)needed+=experienceForNextLevel(pokemon.growthRate,level);
    this.devUpgradeInProgress=true;this.isLocked=true;
    try{
      const events=await pokemon.gainExperience(Math.max(0,needed),100);
      if(pokemon.level<=previousLevel)throw new Error('Nessun aumento di livello');
      this.items[id]--;
      this.renderSidebar();
      this.logMsg(`${id==='goldCandy'?'Caramella d’Oro':'Caramella Rara'}: ${pokemon.name} passa dal Lv.${previousLevel} al Lv.${pokemon.level}!`);
      for(const event of events){
        if(event.evolution)await this.showEvolution(pokemon,event.evolution);
        for(const move of event.moves)await this.learnMove(move,pokemon);
      }
      return true;
    }catch(error){
      console.error('Errore nell’uso delle Caramelle DEV',error);
      this.logMsg('Impossibile completare l’aumento di livello.');
      return false;
    }finally{
      this.devUpgradeInProgress=false;this.isLocked=false;
      this.renderSidebar();
    }
  }
  devUnlimitedRadar(){
    if(!this.devMode)return false;
    this.radarCharges=Infinity;this.renderSidebar();this.logMsg('Radar illimitato (DEV).');return true;
  }
  devToggleCapture(){
    if(!this.devMode)return false;
    this.devGuaranteedCapture=true;
    this.$id('dev-capture')?.setAttribute('aria-pressed','true');
    this.logMsg('Cattura DEV: probabilità del 100% sempre attiva.');
    return true;
  }
  devSkipEncounter(){
    if(!this.devMode||(this.isBattleVisible()&&this.battleType==='gym')||this.gymQueue.length)return false;
    if(this.isRaidActive){
      this.isRaidActive=false;this.raidQueueCount=0;
      this.$id('pokenav-screen-root')?.classList.remove('raid-discovery');
      this.endBattle('RAID saltato in Dev Mode. Nessuna ricompensa.');
      this.$id('wild-encounter-overlay')?.classList.add('hidden');
      return true;
    }
    if(this.battleType==='trainer'&&this.isBattleVisible()){
      this.endBattle('Allenatore del dungeon saltato in Dev Mode. Nessuna ricompensa.');
      return true;
    }
    if(this.pendingTrainerCell && !this.$id('trainer-encounter-overlay')?.classList.contains('hidden')){
      this.pendingTrainerCell=null;
      this.$id('trainer-encounter-overlay').classList.add('hidden');
      this.isLocked=false;
      this.logMsg('Allenatore del dungeon saltato in Dev Mode.');
      return true;
    }
    this.logMsg('Dev Skip disponibile soltanto durante RAID o allenatori dei dungeon.');
    return false;
  }

  getNpcLocalFallback(npcCell,x=0,y=0){
    if(npcCell?.localSpriteFallback)return npcCell.localSpriteFallback;
    if(npcCell?.specialRole==='fisherman')return 'assets/characters/fisher-overworld-reference.png';
    if(['celestial-oak','cave-oak'].includes(npcCell?.specialRole))return 'assets/characters/oak-frlg-down.png';
    if(npcCell?.specialRole==='exp-share-gift')return 'assets/characters/scientist-down.png';
    if(npcCell?.specialRole==='gate-police')return 'assets/characters/policeman-down.png';
    const map={
      youngster:'assets/characters/npc-01.png',
      lass:'assets/characters/npc-02.png',
      balding_man:'assets/characters/npc-11.png',
      old_woman:'assets/characters/npc-04.png',
      cooltrainer_m:'assets/characters/npc-05.png',
      cooltrainer_f:'assets/characters/npc-06.png',
      picnicker:'assets/characters/npc-07.png',
      camper:'assets/characters/npc-08.png',
      nurse:'assets/characters/npc-09.png',
      policeman:'assets/characters/policeman-down.png',
      hiker:'assets/characters/npc-10.png',
      scientist:'assets/characters/scientist-down.png',
      rich_boy:'assets/characters/npc-11.png',
      sailor:'assets/characters/npc-12.png',
      gentleman:'assets/characters/npc-13.png',
      clerk:'assets/characters/npc-14.png',
      fisherman:'assets/characters/fisher-down.png'
    };
    const key=String(npcCell?.npcName||'').toLowerCase().replaceAll(' ','_');
    return map[key] || this.npcFallbacks[(x+y+this.floor)%this.npcFallbacks.length];
  }
  // R2.12: a dialogue portrait must represent the same sprite displayed on
  // the map. The old role-to-SVG table was unrelated to the actual map sprite:
  // e.g. the dialogue could show a different character entirely.
  getNpcPortraitAsset(npcCell){
    if(npcCell?.specialRole==='fisherman')return 'assets/characters/fisher-overworld-dialog-exact.png';
    if(['celestial-oak','cave-oak'].includes(npcCell?.specialRole))return 'assets/characters/oak-frlg-mugshot-clean.png';
    return npcCell?.npcSprite || this.npcSprites[0];
  }
  renderNpcPortrait(npcCell){
    const slot=this.$id('npc-portrait-img');
    if(!slot)return;
    slot.replaceChildren();
    slot.style.removeProperty('background');
    slot.style.removeProperty('background-image');
    slot.classList.add('npc-portrait-local');
    slot.classList.toggle('npc-portrait-fisher',npcCell?.specialRole==='fisherman');
    slot.classList.toggle('npc-portrait-match-map',npcCell?.specialRole!=='fisherman');
    slot.setAttribute('aria-label',npcCell?.npcName||'Abitante');
    if(['celestial-oak','cave-oak'].includes(npcCell?.specialRole)){
      const portrait=document.createElement('img');
      portrait.className='npc-portrait-illustration npc-portrait-oak';
      portrait.alt='';portrait.src=this.getNpcPortraitAsset(npcCell);
      slot.append(portrait);return;
    }
    if(npcCell?.specialRole==='fisherman'){
      // User-selected red-cap overworld sprite isolated from screenshot 1: exactly one image, no underlying seated character.
      const img=document.createElement('img');
      img.className='npc-portrait-illustration npc-portrait-fisher-only';
      img.alt='';img.src=this.getNpcPortraitAsset(npcCell);
      slot.append(img);
      return;
    }
    const crop=document.createElement('span');
    crop.className='npc-portrait-frame';
    const img=document.createElement('img');
    img.className='npc-portrait-frame-img';img.alt='';
    // The overworld also shows frame zero of this 16 x 32 FireRed spritesheet.
    // The same fallback is used if the remote sprite fails to load.
    img.onerror=()=>{
      img.onerror=null;
      img.src=this.getNpcLocalFallback(npcCell);
      crop.classList.add('local-fallback');
    };
    img.src=this.getNpcPortraitAsset(npcCell);
    crop.append(img);slot.append(crop);
  }
  hideDialogNpcBackground(hide,npcCell=null){
    this.activeDialogNpcCell=hide?npcCell:null;
    this.$id('dungeon-grid-board')?.classList.toggle('npc-conversation-active',Boolean(hide));
    if(this.gridMap?.length)this.renderDungeon();
  }
  closeNpcDialog(){
    const overlay=this.$id('npc-dialog-overlay');
    overlay?.classList.add('hidden');
    this.isLocked=false;
    this.pendingNpcAdvance=null;
    this.hideDialogNpcBackground(false);
  }

  triggerNpcEvent(npcCell) {
    this.renderNpcPortrait(npcCell);
    const overlay=this.$id('npc-dialog-overlay');
    this.hideDialogNpcBackground(true,npcCell);
    const speech=this.$id('npc-speech-text');
    const actions=this.$id('npc-actions');
    overlay.classList.remove('hidden');
    actions.style.display='none';
    // NPC branch handlers populate their text synchronously before this microtask.
    Promise.resolve().then(()=>this.translateVisibleUI());
    // The EXP Share is awarded by an NPC after the second badge, not automatically.
    if(npcCell.specialRole==='celestial-oak'){this.showOakIntroduction();return;}
    if(npcCell.specialRole==='cave-oak'){
      speech.textContent=this.celestialPhase==='complete'?'Professor Oak: “L’impresa è compiuta. L’uscita è in basso.”':
        this.celestialPhase==='rematch'?'Professor Oak: “Con questa potrai catturarlo.”':
        'Professor Oak: “Batti quel Pokémon, dimostra il tuo valore e riceverai un dono speciale.”';
      this.waitForNpcClick(overlay);return;
    }
    if(npcCell.specialRole==='exp-share-gift'){
      if(this.expShareClaimed){
        speech.textContent='Assistente: "Il Condividi Esperienza è tuo. Puoi gestirlo nello Zaino, sotto Oggetti chiave."';
      }else if(this.badgeCount()<2){
        speech.textContent='Assistente: "Torna dopo aver conquistato la seconda medaglia!"';
      }else{
        this.expShareClaimed=true;this.expShareEnabled=true;
        speech.textContent='Assistente: "Hai ottenuto il Condividi Esperienza! I compagni riceveranno parte dei punti esperienza."';
        this.logMsg('Hai ottenuto il Condividi Esperienza!');this.renderSidebar();
      }
      this.waitForNpcClick(overlay);return;
    }
    // Guaranteed once-only gift; subsequent conversations are purely narrative.
    if(npcCell.specialRole==='fisherman'){
      const obtained=this.items.fishingRod||this.fishingRodGiftClaimed;
      if(!obtained){
        this.grantItem('fishingRod');
        this.fishingRodGiftClaimed=true;this.renderSidebar();
      }
      speech.textContent=obtained?'Pescatore: "Usa la canna vicino all’acqua!"':
        'Pescatore: "Questa Canna da Pesca è per te. Provala vicino all’acqua!"';
      this.logMsg(obtained?'Il Pescatore ti saluta.':'Hai ricevuto la Canna da Pesca!');
      this.waitForNpcClick(overlay);return;
    }
    // Legacy/hand-authored NPCs receive an immutable interaction on first contact.
    if(!npcCell.npcEvent){
      const eventRoll=Math.random();
      npcCell.npcEvent=eventRoll<.10?'trade':eventRoll<.25?'gift':'dialogue';
      if(npcCell.npcEvent==='trade')npcCell.npcTradeSpeciesId=1+Math.floor(Math.random()*143);
      if(npcCell.npcEvent==='gift')npcCell.npcGiftId=Math.random()<.5?'pokeball':'elixir';
    }
    if(npcCell.npcEvent==='trade' && !npcCell.tradeCompleted){
      const source=this.activeMon;
      if(!source || !this.team.includes(source)){
        speech.textContent='Abitante: "Hai bisogno di un Pokémon per fare uno scambio."';
        this.waitForNpcClick(overlay);return;
      }
      speech.textContent=`Abitante: "Ti va di scambiare il tuo ${source.name} con un mio Pokémon?"`;
      actions.style.display='flex';
      let trading=false;
      this.$id('npc-btn-yes').onclick=async()=>{
        if(trading)return;
        trading=true;
        speech.textContent='L’Allenatore sta preparando lo scambio...';
        try{
          const data=await this.getPokemonData(evolvedEncounterId(npcCell.npcTradeSpeciesId,source.level));
          const index=this.team.indexOf(source);
          if(index<0||!data?.id)throw new Error('Scambio non più valido');
          const received=new Pokemon(data,source.level);
          await received.loadLearnset();
          this.team[index]=received;
          this.activeMon=received;
          npcCell.tradeCompleted=true;
          this.logMsg(`Scambio effettuato! Ora hai ${received.name}!`);
          this.closeNpcDialog();this.renderSidebar();
        }catch(error){
          console.warn('Scambio NPC annullato',error);
          speech.textContent='Lo scambio non è riuscito. Non hai perso alcun Pokémon.';
          actions.style.display='none';
          this.waitForNpcClick(overlay);
        }
      };
      this.$id('npc-btn-no').onclick=()=>{
        if(trading)return;
        this.closeNpcDialog();
        this.logMsg('Hai rifiutato lo scambio. Puoi parlarci ancora per ripensarci.');
      };
    }else if(npcCell.npcEvent==='gift'){
      const id=npcCell.npcGiftId;
      const label=id==='pokeball'?'Poké Ball':'Elisir';
      if(npcCell.giftConsumed){
        speech.textContent='Abitante: "Spero che il regalo ti sia stato utile!"';
      }else{
        const success=this.grantItem(id);
        if(success)npcCell.giftConsumed=true;
        speech.textContent=success?`Abitante: "Tieni, questa ${label} è per te!"`:
          `Abitante: "Volevo regalarti ${label}, ma lo zaino è pieno."`;
        this.logMsg(success?`Regalo ricevuto: ${label}!`:`Zaino pieno: ${label} non ricevuto.`);
        this.renderSidebar();
      }
      this.waitForNpcClick(overlay);
    }else{
      speech.textContent=`Abitante: "${npcCell.npcLine||this.npcDialogues[0]}"`;
      this.waitForNpcClick(overlay);
    }
  }

  waitForNpcClick(overlay){
    overlay.querySelector?.('.npc-click-hint')?.remove();
    const hint=document.createElement('div');
    hint.className='npc-click-hint';hint.textContent='CLICCA PER CONTINUARE ▾';
    overlay.appendChild(hint);
    const listener=()=>{
      this.closeNpcDialog();hint.remove();
      this.pendingNpcAdvance=null;
      document.removeEventListener('pointerdown',listener,true);
    };
    this.pendingNpcAdvance=listener;
    // Il prossimo clic, e non un timer, fa avanzare il dialogo.
    setTimeout(()=>document.addEventListener('pointerdown',listener,true),20);
  }

  createSingleFrameAvatar(url,fallback,description,extraClass=''){
    // Source images are multi-pose horizontal sprite sheets: crop one 16×32 frame
    // in a dedicated viewport rather than scaling the entire sheet into the tile.
    const frame=document.createElement('span');
    frame.className=`grid-icon official-overworld single-frame sprite-frame ${extraClass}`;
    frame.setAttribute('role','img');frame.setAttribute('aria-label',description);
    const image=document.createElement('img');image.className='overworld-frame-img';
    image.src=url;image.alt='';image.loading='eager';image.decoding='async';
    image.onerror=()=>{image.onerror=null;image.src=fallback;
      frame.classList.add('local-fallback');
      image.style.width='16px';image.style.height='32px';};
    frame.appendChild(image);return frame;
  }

  renderDungeon() {
    const board=this.$id('dungeon-grid-board');
    if(!board || !Array.isArray(this.gridMap) || !this.gridMap.length)return;
    board.classList.toggle('npc-conversation-active',Boolean(this.activeDialogNpcCell));
    board.classList.toggle('celestial-cave',this.isCelestialCave);
    const avatarFolder=this.playerGender==='female'?'girl':'red';
    const spriteUrl=this.playerFishingFrame!==null ?
      `assets/${avatarFolder}/fish/${this.playerFacing}-${this.playerFishingFrame}.png` :
      `assets/${avatarFolder}/walk/${this.playerFacing}-${this.playerStep}.png`;
    const actorName=this.playerGender==='female'?'Allenatrice':'Allenatore';
    const size=this.gridSize;
    const fresh=this._renderedGrid!==this.gridMap || board.querySelectorAll(':scope > .grid-cell').length!==size*size;
    // Reuse the SAME avatar element across cells; destroying it each step caused
    // jitter/flicker and invalidated its animation before reaching the next tile.
    // Never detach the avatar on routine renders: that interrupted animations
    // and could leave an unchanged player tile with no child at all.
    let avatar=board.querySelector('.player-avatar');
    if(!avatar)avatar=document.createElement('span');
    // Preserve the walk animation class during unchanged map renders.
    avatar.classList.add('grid-icon','player-avatar');
    avatar.classList.toggle('red-local-sprite',avatarFolder==='red');
    avatar.classList.toggle('girl-local-sprite',avatarFolder==='girl');
    avatar.classList.toggle('local-fishing-sprite',this.playerFishingFrame!==null);
    avatar.setAttribute('role','img');
    avatar.setAttribute('aria-label',`${actorName} rivolto verso ${this.playerFacing}`);
    if(this.pendingWalk || !avatar.classList.contains('walk-arrival'))
      avatar.style.backgroundImage=`url('${spriteUrl}')`;
    if(fresh)board.replaceChildren();
    else board.querySelectorAll(':scope > .map-building-overlay, :scope > .map-scenery-overlay').forEach(element=>element.remove());
    const architecture=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const cell=this.gridMap[y][x];
      const idx=y*size+x,player=x===this.playerPos.x&&y===this.playerPos.y;
      const node=fresh?document.createElement('div'):board.children[idx];
      // Each tile renders in row-depth order. A player standing below a building
      // must be in front; a player above it must remain behind its facade.
      node.style.setProperty('--map-depth',String(10+y*2+(player?1:0)));
      const locked=cell.entity==='door'&&this.floor%10===0&&!this.completedGymFloors.has(this.floor);
      // Tile signatures prevent recreating 100 nodes for every 170ms step.
      const key=[cell.revealed,cell.type,cell.entity,cell.specialRole,cell.decoration,cell.npcSprite,
        cell.trainerOverworldSprite,player,locked,this.activeDialogNpcCell===cell].join('|');
      if(node.dataset.tileSignature!==key){
        node.className=cell.revealed?`grid-cell ${cell.type}${locked?' locked-exit':''}${player?' player-cell':''}`:'grid-cell fog';
        node.replaceChildren();
        if(!cell.revealed){
          node.setAttribute('aria-label','Area inesplorata');
          node.style.backgroundPosition=`${x*100/(size-1)}% ${y*100/(size-1)}%`;
        }else{
          node.removeAttribute('aria-label');node.style.backgroundPosition='';
          if(player)node.appendChild(avatar);
          else if(cell.type==='tree')node.classList.add('environment-footprint');
          else if(cell.type==='water')node.innerHTML='<span class="water-ripple" aria-hidden="true"></span>';
          else if(cell.entity==='pokecenter')node.classList.add('building-footprint');
          else if(cell.entity==='pokemart')node.classList.add('building-footprint');
          else if(cell.entity==='gym')node.classList.add('building-footprint');
          else if(cell.entity==='house')node.classList.add('building-footprint');
          else if(cell.entity==='mewtwo'){
            const aura=document.createElement('span');aura.className='celestial-mewtwo-aura celestial-portal-v2';
            aura.setAttribute('role','img');aura.setAttribute('aria-label','Sfera aurica di Mewtwo');
            const halo=document.createElement('span');halo.className='aura-outer-shimmer';
            const ring=document.createElement('span');ring.className='aura-ellipse aura-ellipse-back';
            const orb=document.createElement('span');orb.className='celestial-aura-orb';
            const core=document.createElement('span');core.className='aura-inner-core';orb.appendChild(core);
            const front=document.createElement('span');front.className='aura-ellipse aura-ellipse-front';
            const sparks=document.createElement('span');sparks.className='aura-particles';
            for(let i=0;i<9;i++){const spark=document.createElement('i');spark.style.setProperty('--spark-index',String(i));sparks.append(spark);}
            aura.append(halo,ring,orb,front,sparks);node.appendChild(aura);
          }else if(cell.entity==='cave-exit'){
            node.innerHTML='<span class="celestial-cave-exit" role="img" aria-label="Uscita dalla Grotta Celeste">▼</span>';
          }else if(cell.entity==='npc'){
            if(this.activeDialogNpcCell!==cell && ['celestial-oak','cave-oak'].includes(cell.specialRole)){
              const oak=document.createElement('img');oak.className='celestial-oak-sprite';
              node.appendChild(this.createSingleFrameAvatar(
                cell.npcSprite||'assets/characters/oak-frlg-down.png',
                'assets/characters/oak-frlg-down.png','Professor Oak','celestial-oak-sprite'));
            }else if(this.activeDialogNpcCell!==cell){
              const fallback=this.getNpcLocalFallback(cell,x,y);
              node.appendChild(this.createSingleFrameAvatar(cell.npcSprite||this.npcSprites[0],
                fallback,`Abitante: ${cell.npcName||'Pokémon Rosso Fuoco'}`,'town-npc'));
            }
          }else if(cell.entity==='door'){
            if(locked)node.appendChild(this.createSingleFrameAvatar(`${FIRERED_OVERWORLD_BASE}policeman.png`,
              'assets/characters/policeman-down.png','Poliziotto: serve la medaglia per proseguire','gate-police'));
            else node.innerHTML='<span class="exit-arrow" role="img" aria-label="Uscita verso destra">➜</span>';
          }else if(cell.entity==='item')node.innerHTML='<img class="grid-icon" src="assets/items/pokeball-game.png" alt="Oggetto">';
          else if(cell.entity==='trainer'){
            node.appendChild(this.createSingleFrameAvatar(
              cell.trainerOverworldSprite||`${FIRERED_OVERWORLD_BASE}youngster.png`,
              this.npcFallbacks[(x+y+this.floor)%this.npcFallbacks.length],
              cell.trainerName||'Allenatore','route-trainer'));
          }else if(cell.decoration){
            node.classList.add('environment-footprint');
          }
        }
        node.dataset.tileSignature=key;
      }else if(player){
        // No regeneration required for an idle/pose update.
        node.appendChild(avatar);
      }
      if(fresh)board.appendChild(node);
      if(cell.revealed && ['house','pokemart','pokecenter','gym'].includes(cell.entity)){
        const building=document.createElement('img');
        building.className='map-building-overlay';
        building.src=`assets/${cell.entity}.svg`;
        building.alt=({house:'Casa',pokemart:'Pokémarket',pokecenter:'Centro Pokémon',gym:'Palestra'})[cell.entity];
        building.setAttribute('aria-hidden','true');
        // Overlay is anchored to the bottom of its tile, and sorted against
        // player cells by row depth. A neighboring tile cannot clip its roof.
        building.style.left=`${(x+.5)*100/size}%`;
        building.style.bottom=`${(size-y-1)*100/size}%`;
        building.style.zIndex=String(220+y);
        architecture.push(building);
      }
      // Environment is drawn in board coordinates, never cropped by a 1-tile cell.
      // This foreground is intentionally *only* trees, buildings and scenery,
      // not NPCs or trainer sprites. Collision and map data are untouched.
      if(cell.revealed && (cell.type==='tree'||cell.decoration)){
        const scenery=document.createElement('img');
        scenery.className='map-scenery-overlay'+(cell.type==='tree'?' scenery-tree':' scenery-decoration');
        scenery.src=cell.type==='tree'?'assets/tree.svg':`assets/decor/${cell.decoration}.svg`;
        scenery.alt='';scenery.setAttribute('aria-hidden','true');
        scenery.style.left=`${(x+.5)*100/size}%`;
        scenery.style.bottom=`${(size-y-1)*100/size}%`;
        scenery.style.zIndex=String(220+y);
        architecture.push(scenery);
      }
    }
    board.append(...architecture);
    this._renderedGrid=this.gridMap;
    if(this.pendingWalk){
      const {dx,dy}=this.pendingWalk;this.pendingWalk=null;
      const cell=board.getBoundingClientRect().width/size;
      avatar.getAnimations?.().forEach(animation=>animation.cancel());
      avatar.classList.remove('walk-arrival');
      avatar.style.setProperty('--walk-offset-x',`${-dx*cell}px`);
      avatar.style.setProperty('--walk-offset-y',`${-dy*cell}px`);
      avatar.style.setProperty('--walk-duration',`${this.walkDurationMs}ms`);
      // Continuous 1 -> 0 -> 2 -> 0 walk poses while moving across one tile.
      const sequence=++this.walkSequence,facing=this.playerFacing;
      const frame=(step)=>{
        if(sequence===this.walkSequence&&avatar.isConnected)
          avatar.style.backgroundImage=`url('assets/${avatarFolder}/walk/${facing}-${step}.png')`;
      };
      frame(1);
      void avatar.offsetWidth;
      avatar.classList.add('walk-arrival');
      clearTimeout(this.playerIdleTimer);
      setTimeout(()=>frame(0),this.walkDurationMs*.28);
      setTimeout(()=>frame(2),this.walkDurationMs*.56);
      this.playerIdleTimer=setTimeout(()=>{
        frame(0);
        if(sequence===this.walkSequence)avatar.classList.remove('walk-arrival');
        this.playerStep=0;
      },this.walkDurationMs);
    }else if(Date.now()>=this.walkReadyAt){
      avatar.classList.remove('walk-arrival');
    }
  }

  async getPokemonData(id) {
    const key = String(id);
    if (!this.pokemonCache.has(key)) {
      const promise=fetch(`https://pokeapi.co/api/v2/pokemon/${key}`)
        .then(res=>{ if(!res.ok) throw new Error(`PokéAPI ${res.status}`); return res.json(); })
        .then(async data=>{
          // /pokemon returns combat data; /pokemon-species carries the growth rate.
          // Resolve it only once per species and tolerate temporary network failures.
          const species=data.species?.name||data.id;
          try{
            const res=await fetch(`https://pokeapi.co/api/v2/pokemon-species/${species}`);
            if(res.ok){const details=await res.json();data.growth_rate=details.growth_rate;}
          }catch(error){console.warn('Gruppo di crescita non disponibile, uso il fallback',error);}
          return data;
        })
        .catch(err=>{ this.pokemonCache.delete(key); throw err; });
      this.pokemonCache.set(key,promise);
    }
    return this.pokemonCache.get(key);
  }

  showGymLeaderIntro() {
    const leader=this.currentGym;
    if(!leader) return;
    this.isLocked=true;
    document.getElementById('overlay-battle').classList.add('hidden');
    document.getElementById('battle-controls').classList.add('hidden');
    const overlay=document.getElementById('gym-leader-intro');
    document.getElementById('gym-leader-name').textContent=leader.name.toUpperCase();
    document.getElementById('gym-leader-specialty').textContent=`SPECIALITÀ ${leader.specialty}`;
    document.getElementById('gym-leader-roster').textContent=`SQUADRA: ${leader.pokemon.length} POKÉMON`;
    const portrait=document.getElementById('gym-leader-portrait');
    this.setTrainerPortrait(portrait,`https://play.pokemonshowdown.com/sprites/trainers/${leader.sprite}.png`);
    portrait.onerror=()=>{ portrait.onerror=null; portrait.src='assets/gym.svg'; };
    portrait.style.visibility='visible';
    overlay.classList.remove('hidden');
    this.showDiscoveryNotice(`CAPOPALESTRA ${leader.name.toUpperCase()}!`,3200);
  }

  async advanceGymAfterVictory() {
    if (this.gymQueue[0] === 'leader') {
      if (this.gymLeaderIndex < this.currentGym.pokemon.length-1) {
        this.gymLeaderIndex++;
        await this.battleText(`${this.currentGym.name} schiera il prossimo Pokémon!`);
        await this.startBattle('gym',true);
        return;
      }
      this.gymQueue.shift();
      if(!this.completedGymFloors.has(this.floor)) {
        this.completedGymFloors.add(this.floor);
        this.badges.push({id:this.currentGym.badgeId,name:this.gymBadgeName});
        this.renderBadges();
      }
      this.money+=750;
      this.renderDungeon(); // L'uscita si sblocca visivamente dopo la medaglia.
      this.showDiscoveryNotice(`${this.gymBadgeName.toUpperCase()} OTTENUTA!`,3800);
      this.endBattle(`Hai sconfitto ${this.currentGym.name}! ${this.gymBadgeName} conquistata. +$750`);
      this.currentGym=null;
      return;
    }
    this.gymQueue.shift();
    if(this.gymQueue[0]==='leader') {
      await this.battleText('Tre allenatori sconfitti! Ora arriva il Capopalestra!');
      this.showGymLeaderIntro();
    } else {
      await this.battleText('Allenatore sconfitto! Il prossimo sfidante si prepara.');
      this.currentTrainerSprite=this.trainerSprites[Math.floor(Math.random()*this.trainerSprites.length)];
      await this.startBattle('gym');
    }
  }

  gameDelay(ms){return Math.max(0,Math.round(ms/(this.speedMultiplier===2?2:1)));}
  wait(ms) { return new Promise(resolve => setTimeout(resolve, this.gameDelay(ms))); }
  syncAnimationSpeed(){
    for(const animation of document.getAnimations?.()||[]){
      if(animation.playState==='running' && !animation.effect?.target?.closest?.('#game-quick-settings'))animation.playbackRate=this.speedMultiplier;
    }
  }
  setGameSpeed(value){
    this.speedMultiplier=value===2?2:1;
    document.documentElement.dataset.gameSpeed=String(this.speedMultiplier);
    const btn=this.$id('speed-toggle');
    if(btn){btn.textContent=`${this.locale==='en'?'SPEED':'VELOCITÀ'} ×${this.speedMultiplier}`;btn.setAttribute('aria-pressed',String(this.speedMultiplier===2));}
    // Re-time an already held direction without taking an extra step.
    if(this.heldWalk?.interval){
      const walk=this.heldWalk;
      clearInterval(walk.interval);
      walk.interval=setInterval(()=>{
        if(this.heldWalk!==walk)return;
        if(this.isLocked||this.pendingItemTarget||this.adventureCompleted){this.stopContinuousWalk();return;}
        this.movePlayer(walk.dx,walk.dy);
      },this.gameDelay(170));
    }
    clearInterval(this.speedAnimationTimer);
    this.syncAnimationSpeed();
    if(this.speedMultiplier===2)this.speedAnimationTimer=setInterval(()=>this.syncAnimationSpeed(),250);
    return this.speedMultiplier;
  }
  localize(text){
    if(this.locale!=='en')return String(text??'');
    const exact={
      'Un albero ti sbarra la strada!':'A tree blocks your path!',
      'Ti serve una Canna da Pesca per pescare!':'You need a fishing rod to fish!',
      'Lanci la lenza in acqua...':'You cast your fishing line...',
      "Abbocca un Pokémon d'acqua!":'A Water-type Pokémon took the bait!',
      'Questo elemento del villaggio blocca il passaggio.':'Something in the village blocks your way.',
      'Centro Pokémon: Squadra e PP curati!':'Pokémon Center: Your team and PP are fully restored!',
      'Hai aperto il Pokémarket.':'You entered the Poké Mart.',
      'Hai lasciato il Pokémarket.':'You left the Poké Mart.',
      'Sfida annullata: puoi tornare quando vuoi.':'Challenge cancelled. Come back anytime.',
      'Non puoi fuggire da questa sfida!':'You cannot flee from this battle!',
      'La Poké Ball nasconde una sfida RAID!':'The Poké Ball triggered a RAID battle!',
      'Acquisto completato!':'Purchase complete!',
      'Capacità massima raggiunta!':'Your bag is full!',
      'Hai già conquistato la medaglia di questa palestra!':'You already earned this Gym Badge!',
      'Una casetta tranquilla, illuminata e piena di fiori.':'A quiet little house surrounded by flowers.',
      'Agente: per proseguire hai bisogno della medaglia di questa città.':'Officer: you need this city’s badge to proceed.',
      'AGENTE: SERVE LA MEDAGLIA PER PROSEGUIRE':'OFFICER: GYM BADGE REQUIRED',
      'Una presenza leggendaria ti osserva!':'A legendary presence is watching you!',
      'Un Pokémon selvatico è comparso!':'A wild Pokémon appeared!',
      'Non puoi catturare Pokémon di allenatori o dei raid!':'You cannot catch Trainers’ or Raid Pokémon!',
      'Non puoi catturare Pokémon dei raid o degli allenatori!':'You cannot catch Raid or Trainer Pokémon!',
      'Ma la mossa fallisce!':'But the move missed!',
      'Non ha effetto…':'It had no effect...',
      'È superefficace!':"It's super effective!",
      'Non è molto efficace…':"It's not very effective...",
      'Protezione fallisce!':'Protect failed!',
      'RAID SEGRETO! 5 LOTTE · NESSUNA CATTURA':'SECRET RAID! 5 BATTLES · NO CAPTURES',
      'Tre allenatori sconfitti! Ora arriva il Capopalestra!':'Three Trainers defeated! Here comes the Gym Leader!',
      'Allenatore sconfitto! Il prossimo sfidante si prepara.':'Trainer defeated! The next challenger is ready.',
      'SCEGLI UN POKÉMON NEL PANNELLO SINISTRO':'CHOOSE A POKÉMON FROM THE LEFT PANEL',
      'POKÉMON SCONFITTO: CHI MANDI IN CAMPO?':'POKÉMON FAINTED: WHO WILL YOU SEND OUT?',
      'SCEGLI UNO STRUMENTO DALLO ZAINO A DESTRA':'CHOOSE AN ITEM FROM THE BAG ON THE RIGHT',
      'Tre compagni. Un solo inizio.':'Three companions. One beginning.',
      'Preparazione della valigetta...':'Preparing the briefcase...',
      'Hai rifiutato lo scambio.':'You declined the trade.',
      'Lo scambio non è riuscito. Non hai perso alcun Pokémon.':'The trade failed. Your Pokémon were not lost.',
      'Inizia una nuova avventura!':'A new adventure begins!',
      'Nessuna Medaglia':'No Badges',
      'CLICCA PER CONTINUARE ▾':'CLICK TO CONTINUE ▾',
    };
    const raw=String(text??'');
    if(exact[raw])return exact[raw];
    const patterns=[
      [/^Sei arrivato al Livello (\d+)\. Esplora liberamente!$/,'You reached Floor $1. Explore freely!'],
      [/^Sei salito al Livello (\d+)!$/,'You advanced to Floor $1!'],
      [/^Vai (.+)!$/,'Go, $1!'],
      [/^(.+) è esausto!$/,'$1 fainted!'],
      [/^(.+) riceve (\d+) punti esperienza!$/,'$1 gained $2 Exp. Points!'],
      [/^(.+) raggiunge il livello (\d+)!$/,'$1 grew to Level $2!'],
      [/^(.+) impara (.+)!$/,'$1 learned $2!'],
      [/^(.+) è pronto a combattere!$/,'$1 is ready to battle!'],
      [/^(.+) usa (.+)!$/,'$1 used $2!'],
      [/^Preso! (.+) è stato catturato!$/,'Gotcha! $1 was caught!'],
      [/^Hai catturato (.+)!$/,'You caught $1!'],
      [/^(.+) è uscito dalla Poké Ball!$/,'Oh no! $1 broke free!'],
      [/^Hai trovato: (.+)!$/,'You found: $1!'],
      [/^Zaino pieno: (.+) rimane a terra\. Torna dopo aver liberato spazio\.$/,'Your bag is full: $1 remains here. Come back later.'],
      [/^(.+) recupera (\d+) PS!$/,'$1 restored $2 HP!'],
      [/^(.+) subisce (\d+) danni da (.+)!$/,'$1 took $2 damage from $3!'],
      [/^Un allenatore ti sfida!$/,'A Trainer challenges you!'],
      [/^(.+) è stato sconfitto, chi vuoi mandare in campo\?$/,'$1 fainted. Who will you send out?'],
      [/^Hai scelto (.+), confermi la scelta\?$/,'You chose $1. Confirm your choice?'],
      [/^Vuoi iniziare la sfida di (.+)\? /,'Do you want to begin $1’s Gym challenge? '],
    ];
    for(const [pattern,translation] of patterns)if(pattern.test(raw))return raw.replace(pattern,translation);
    return raw;
  }
  translateVisibleUI(){
    if(typeof document.createTreeWalker!=='function')return;
    // Centralized UI glossary. Re-evaluated after renders and language changes.
    // Dynamic battle/status text also passes through localize().
    const vocabulary={
    "NUOVA AVVENTURA": "NEW ADVENTURE",
    "UN’AVVENTURA POKÉMON ROGUELIKE": "A POKÉMON ROGUELIKE ADVENTURE",
    "SCEGLI IL TUO POKÉMON": "CHOOSE YOUR POKÉMON",
    "LA TUA AVVENTURA INIZIA QUI": "YOUR ADVENTURE STARTS HERE",
    "RIMEDI": "MEDICINE",
    "POKÉ BALL": "POKÉ BALLS",
    "OGGETTI CHIAVE": "KEY ITEMS",
    "SQUADRA POKÉMON": "POKÉMON PARTY",
    "PORTAMEDAGLIE": "BADGE CASE",
    "CONTROLLI DI MOVIMENTO": "MOVEMENT CONTROLS",
    "DATI PERCORSO": "ROUTE DATA",
    "TIPO: PERCORSO": "TYPE: ROUTE",
    "PERCORSO": "ROUTE",
    "VILLAGGIO": "VILLAGE",
    "CITTÀ": "CITY",
    "ZAINO": "BAG",
    "SCANSIONI": "SCANS",
    "LIVELLO": "LEVEL",
    "DENARO": "MONEY",
    "INFO POKÉMON": "POKÉMON INFO",
    "SPOSTA POKÉMON": "MOVE POKÉMON",
    "CHIUDI": "CLOSE",
    "ANNULLA": "CANCEL",
    "CONFERMA": "CONFIRM",
    "INIZIA SFIDA": "START CHALLENGE",
    "LOTTA!": "BATTLE!",
    "LOTTA": "FIGHT",
    "BORSA": "BAG",
    "POKÉMON": "POKÉMON",
    "FUGA": "RUN",
    "NON IMPARARE": "DO NOT LEARN",
    "NUOVA MOSSA DISPONIBILE": "NEW MOVE AVAILABLE",
    "Il Pokémon ha già 4 mosse. Scegli quale dimenticare:": "This Pokémon knows four moves. Choose one to forget:",
    "CLICCA PER CONTINUARE ▾": "CLICK TO CONTINUE ▾",
    "AL CENTRO POKÉMON": "AT THE POKÉMON CENTER",
    "CENTRO POKÉMON": "POKÉMON CENTER",
    "POKÉMARKET": "POKÉ MART",
    "COMMESSO": "CLERK",
    "Benvenuto al Negozio! Acquista strumenti utili:": "Welcome! Choose useful items for your adventure:",
    "Benvenuto! Il mio Kecleon ti aiuterà a scegliere gli strumenti.": "Welcome! My Kecleon will help you choose your items.",
    "Pozione": "Potion",
    "Elisir": "Elixir",
    "Caramella Rara": "Rare Candy",
    "Caramella d’Oro": "Gold Candy",
    "Canna da Pesca": "Fishing Rod",
    "Condividi Esperienza": "Exp. Share",
    "Radar Scan +1 ($2.000)": "Radar Scan +1 ($2,000)",
    "ESCI DAL NEGOZIO": "LEAVE SHOP",
    "SQUADRA PIENA": "PARTY FULL",
    "LIBERA IL POKÉMON": "RELEASE POKÉMON",
    "Seleziona un Pokémon dalla valigetta per iniziare l’avventura.": "Choose a Pokémon from the briefcase to begin your adventure.",
    "RotomDex: Seleziona una Poké Ball dalla valigetta per scegliere il tuo compagno.": "RotomDex: Pick a Poké Ball from the briefcase to choose your partner.",
    "Il Capopalestra non si fa certo battere facilmente.": "The Gym Leader will not be easy to defeat.",
    "Hai visto i fiori nuovi vicino alla fontana?": "Have you seen the new flowers by the fountain?",
    "In questa città i sentieri sono collegati: esplora con calma.": "All the paths in this town are connected. Take your time.",
    "I Pokémon esausti non tornano: prenditi cura della tua squadra.": "Fainted Pokémon cannot come back. Take care of your team.",
    "Qualche volta la Poké Ball nell’erba nasconde una sorpresa.": "A Poké Ball hidden in the grass may conceal a surprise.",
    "Ho sentito che un raro Pokémon abita sulla costa.": "I heard a rare Pokémon lives along the coast.",
    "Al Centro Pokémon puoi ripristinare PS e PP.": "At the Pokémon Center you can restore HP and PP.",
    "Prima di lasciare la città passa dal Pokémarket.": "Visit the Poké Mart before leaving town.",
    "La Medaglia ti permetterà di superare il prossimo passaggio.": "A Gym Badge will let you pass the next checkpoint.",
    "La mia passeggiata preferita è lungo il viale alberato.": "I love walking along the tree-lined avenue.",
    "Una mossa superefficace può cambiare l’esito di una lotta.": "A super-effective move can turn a battle around.",
    "Con la canna da pesca potresti incontrare Pokémon d’acqua.": "You can find Water-type Pokémon with a fishing rod.",
    "ACCETTA": "ACCEPT",
    "RIFIUTA": "DECLINE",
    "SFIDA IN PALESTRA": "GYM CHALLENGE",
    "Vuoi iniziare la sfida?": "Do you want to start the challenge?",
    "Squadra e PP curati al 100%!": "Your team and PP have been fully restored!",
    "NESSUNA MEDAGLIA": "NO BADGES",
    "Nessuna Medaglia": "No Badges",
    "SQUADRA": "PARTY",
    "ABILITÀ": "ABILITY",
    "NATURA": "NATURE",
    "SFIDA FINALE DELLA PALESTRA": "FINAL GYM CHALLENGE",
    "SPECIALITÀ": "SPECIALTY",
    "Tre avversari superati. Adesso affronti il vero capopalestra!": "Three Trainers defeated. Now face the Gym Leader!",
    "RADAR ∞": "RADAR ∞",
    "CATTURA 100% ✓": "100% CATCH ✓",
    "SALTA RAID / TRAINER DUNGEON": "SKIP RAID / DUNGEON TRAINER",
    "Sblocca con il codice": "Unlock with code",
    "Velocità gioco": "Game speed",
    "SCEGLI IL TUO COMPAGNO": "CHOOSE YOUR PARTNER",
    "FINE DELL’AVVENTURA": "THE ADVENTURE ENDS",
    "TORNA AL MENU": "BACK TO MENU",
    "NUOVA MOSSA": "NEW MOVE",
    "IL TUO POKÉMON": "YOUR POKÉMON"
};
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;
      if(!parent || parent.closest('script,style,[data-i18n-it],[contenteditable],textarea'))continue;
      const current=node.textContent;
      const original=node._pokexSourceItalian;
      const previousEnglish=original?vocabulary[original]:null;
      if(original && current.trim()!==original && current.trim()!==previousEnglish)node._pokexSourceItalian=null;
      const source=node._pokexSourceItalian||current.trim();
      if(vocabulary[source]){
        node._pokexSourceItalian=source;
        node.textContent=current.replace(current.trim(),this.locale==='en'?vocabulary[source]:source);
      }
    }
  }
  toggleQuickSettings(){
    const panel=this.$id('quick-settings-panel'),toggle=this.$id('quick-settings-toggle');
    if(!panel||!toggle)return;
    const opening=panel.classList.contains('hidden');
    panel.classList.toggle('hidden',!opening);
    toggle.setAttribute('aria-expanded',String(opening));
    toggle.setAttribute('aria-label',opening?'Chiudi opzioni':'Apri opzioni');
  }
  closeQuickSettings(){
    this.$id('quick-settings-panel')?.classList.add('hidden');
    const toggle=this.$id('quick-settings-toggle');
    if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Apri opzioni');}
  }
  setGameLanguage(locale){
    this.locale=locale==='en'?'en':'it';
    document.documentElement.lang=this.locale;
    for(const language of ['it','en'])this.$id('language-'+language)?.setAttribute('aria-pressed',String(this.locale===language));
    document.querySelectorAll('[data-i18n-it][data-i18n-en]').forEach(node=>{
      node.textContent=node.getAttribute(`data-i18n-${this.locale}`);
    });
    if(this.team.length)this.renderSidebar();
    if(this.partyInfoPokemon)this.openPokemonInfo(this.partyInfoPokemon);
    this.translateVisibleUI();
    const speed=this.$id('speed-toggle');if(speed)speed.textContent=`${this.locale==='en'?'SPEED':'VELOCITÀ'} ×${this.speedMultiplier}`;
    return this.locale;
  }
  $id(id) { return document.getElementById(id); }
  openWings() { this.$id('rotom-container').classList.add('wings-open'); }
  hideAllActions() {
    for(const id of ['panel-main-actions','panel-move-actions','panel-bag-actions','panel-team-actions']) {
      this.$id(id)?.classList.add('hidden');
    }
  }
  hasForcedBattleAction(){
    return Boolean(this.activeMon?.pendingCharge || this.activeMon?.rechargeTurns>0 || this.activeMon?.rampageTurns>0 || this.activeMon?.rolloutTurns>0);
  }
  showMainActions() {
    if(this.battleBusy || this.pendingForcedSwitch) return;
    // A charging/recharging Pokémon has no manual action menu on this turn.
    const forced=this.hasForcedBattleAction();
    if(forced && this.isBattleVisible()){
      const token=this.battleToken;
      this.hideAllActions();
      setTimeout(()=>{
        if(token!==this.battleToken||this.battleBusy||this.pendingForcedSwitch||!this.isBattleVisible())return;
        const move=this.activeMon.pendingCharge?.move || this.activeMon.rampageMove || this.activeMon.rolloutMove || FORCED_RECHARGE_ACTION;
        this.executeAttack(move,true);
      },this.gameDelay(160));
      return;
    }
    this.battleMode=null; this.hideAllActions();
    this.$id('panel-main-actions').classList.remove('hidden');
    this.$id('btn-move-back').classList.add('hidden');
    const run=this.$id('btn-act-run');
    const forbidden=this.isRaidActive || ['gym','trainer','mewtwo'].includes(this.battleType);
    run.disabled=forbidden;run.title=forbidden?'Non puoi fuggire da una sfida con allenatori o dal raid.':'';
    this.renderSidebar();
  }
  encounterLevel(type,leader=false,rng=Math.random){
    const isTrainer=type==='trainer'||type==='gym';
    if(this.floor<=GAME_BALANCE.earlyFloors){
      if(leader)return 6;
      return isTrainer?4+Math.floor(rng()*2):(this.floor===1?1+Math.floor(rng()*3):2+Math.floor(rng()*2));
    }
    const base=3+this.floor*GAME_BALANCE.levelPerFloor;
    return Math.max(2,Math.min(70,Math.round(base+(leader?4:isTrainer?2:0)+Math.floor(rng()*2))));
  }

  async prepareBattleImage(element){
    if(!element)return false;
    try{
      // decode() resolves only after a real, drawable image has been decoded.
      if(element.decode){await element.decode();return true;}
      if(element.complete&&element.naturalWidth>0)return true;
      await new Promise((resolve,reject)=>{
        element.addEventListener('load',resolve,{once:true});
        element.addEventListener('error',reject,{once:true});
      });
      return true;
    }catch(err){
      // Do not show the literal HTML alt text on failed remote sprite loads.
      element.alt='';
      element.src='assets/items/pokeball-game.png';
      try{await element.decode?.();}catch(_){}
      return false;
    }
  }
  async startBattle(type,keepPlayerOnField=false) {
    this.closePartyActions();this.closePokemonInfo();
    this.ensureActivePokemon();
    this.battleType=type;this.isLocked=true;this.battleBusy=true;
    this.battleParticipants = new Set();
    this.battleMode=null;this.pendingForcedSwitch=false;
    const token=++this.battleToken;
    if(!this.activeMon || this.activeMon.currentHp<=0){
      const alive=this.team.find(p=>p.currentHp>0);
      if(!alive){this.endBattle('Tutta la squadra è esausta.');this.$id('gameover-overlay').classList.remove('hidden');return;}
      this.activeMon=alive;
    }
    this.$id('overlay-battle').classList.add('battle-preparing');
    this.$id('overlay-battle').classList.remove('hidden');
    this.$id('battle-controls').classList.remove('hidden');
    this.$id('rotom-body').classList.add('battle-active');
    this.hideAllActions();this.openWings();
    const leader=type==='gym' && this.gymQueue[0]==='leader' && this.currentGym;
    window.pokexplorerMusic?.setScene(type==='mewtwo'?'mewtwo':leader?'gym':type==='legendary'?'legend_trio':'encounter');
    const pool=this.getEncounterPool(type);
    // Roll level first so procedurally generated foes appear at valid evolution stages.
    const encounterLv=type==='mewtwo'?50:type==='legendary'?30:leader?this.currentGym.levels[this.gymLeaderIndex]:this.encounterLevel(type,false);
    const seed=pool?.length?pool[Math.floor(Math.random()*pool.length)]:randomKantoSpecies(encounterLv,this.floor);
    const enemyId=type==='mewtwo'?150:type==='legendary'?(this.pendingLegendaryId||[144,145,146][Math.floor(Math.random()*3)]):leader?this.currentGym.pokemon[this.gymLeaderIndex]:evolvedEncounterId(seed,encounterLv);
    if(type==='legendary')this.pendingLegendaryId=null;
    try {
      const data=await this.getPokemonData(enemyId);
      if(token!==this.battleToken)return;
      // Floor-based progression, with leaders stronger than regular encounters.
      this.enemyMon=new Pokemon(data,encounterLv);
      await Promise.all([this.enemyMon.loadLearnset(),this.activeMon.loadLearnset()]);
    }catch(err) {
      console.error('Battaglia non avviata:',err);
      if(token===this.battleToken){
        // Loading must not consume a trainer, a gym attempt or the only hidden raid.
        if(this.pendingTrainerCell){this.pendingTrainerCell.entity='trainer';this.pendingTrainerCell=null;}
        if(this.isRaidActive){
          const tile=this.gridMap?.[this.playerPos.y]?.[this.playerPos.x];
          if(tile){tile.entity='item';tile.itemKind=tile.itemKind||'pokeball';}
          this.isRaidActive=false;this.raidQueueCount=0;
        }
        if(type==='gym'){this.gymQueue=[];this.currentGym=null;this.gymLeaderIndex=0;}
        this.endBattle('Dati Pokémon non disponibili. Evento ripristinato: riprova quando sei online.');
        this.renderDungeon();
      }
      return;
    }
    if(token!==this.battleToken)return;
    if(type==='trainer')this.pendingTrainerCell=null;
    // Abilità d'ingresso alla lotta, calcolate solo per la battaglia corrente.
    if(!keepPlayerOnField)this.triggerEntryAbilities(this.activeMon,this.enemyMon);
    this.triggerEntryAbilities(this.enemyMon,this.activeMon);
    this.battleParticipants.add(this.activeMon);
    this.$id('enemy-name').textContent=this.enemyMon.name;
    this.$id('enemy-lv').textContent=this.enemyMon.level;
    this.$id('enemy-sprite').src=this.enemyMon.spriteFront;
    this.$id('enemy-sprite').classList.remove('faint-anim','summon-anim','recall-anim');
    this.$id('enemy-sprite').classList.add('hidden');
    this.$id('player-trainer-sprite').setAttribute('aria-label',this.playerGender==='female'?'Allenatrice, vista di spalle':'Allenatore, visto di spalle');
    const previousTrainer=this.$id('enemy-trainer-sprite');
    previousTrainer.className='poke-sprite-gba enemy-trainer-frame hidden';
    previousTrainer.removeAttribute('style');
    if(!keepPlayerOnField)this.$id('player-sprite').classList.add('hidden');
    this.$id('player-trainer-sprite').style.backgroundImage=this.playerGender==='female'?"url('assets/girl/throw/full.png')":"url('assets/red/throw/0.png')";
    this.$id('player-trainer-sprite').classList.toggle('female-trainer',this.playerGender==='female');
    this.$id('player-trainer-sprite').classList.remove('red-sheet-ready');
    this.$id('player-trainer-sprite').classList.add('hidden');
    const hostile=['gym','trainer'].includes(type);
    const stage=this.$id('battle-stage');
    stage.classList.toggle('wild-battle',!hostile);
    stage.classList.toggle('trainer-battle',hostile);
    stage.dataset.biome=type==='mewtwo'?'cavern':this.floor%10===0?'city':this.floor%5===0?'coast':
      this.floor%4===0?'cavern':this.floor%3===0?'forest':'meadow';
    this.resetBattleVisuals(keepPlayerOnField);
    this.updateBattleHUD();
    // The initial scene is covered until the HUD and both image resources are
    // ready. Never paint the HTML alt texts 'Enemy' / 'Player' between frames.
    await Promise.all([
      this.prepareBattleImage(this.$id('enemy-sprite')),
      this.prepareBattleImage(this.$id('player-sprite'))
    ]);
    if(token!==this.battleToken)return;
    this.$id('overlay-battle').classList.remove('battle-preparing');
    await this.battleText(hostile ? (leader?`Il Capopalestra ${this.currentGym.name} ti sfida!`:'Un allenatore ti sfida!') :
      (type==='mewtwo'?'Appare Mewtwo.':this.isRaidActive?`RAID ${6-this.raidQueueCount}/5 · Una presenza misteriosa!`:type==='legendary'?'UN POKÉMON LEGGENDARIO APPARE!':'Un Pokémon selvatico appare!'));
    if(token!==this.battleToken)return;
    if(hostile){
      const trainer=this.$id('enemy-trainer-sprite');
      this.setTrainerPortrait(trainer,leader?`https://play.pokemonshowdown.com/sprites/trainers/${this.currentGym.sprite}.png`:this.currentTrainerSprite);
      trainer.classList.remove('trainer-throw-anim','trainer-enter','summon-anim');
      trainer.classList.add('enemy-trainer-frame');
      trainer.classList.remove('hidden');
      trainer.classList.add('trainer-enter');
      await this.wait(590);
      if(token!==this.battleToken)return;
      await this.battleText(leader?`${this.currentGym.name} sceglie ${this.enemyMon.name}!`:`L'allenatore avversario prepara la Poké Ball!`);
      await this.animateBall('enemy');
      if(token!==this.battleToken)return;
      trainer.classList.add('hidden');trainer.classList.remove('trainer-enter');
      await this.summonPokemon('enemy');
    }else {
      const wildFx=this.$id('wild-appear-fx');wildFx.classList.add('active');
      await this.summonPokemon('enemy',true);
      wildFx.classList.remove('active');
    }
    if(token!==this.battleToken)return;
    await this.battleText(`${this.enemyMon.name} è pronto a combattere!`);
    if(token!==this.battleToken)return;
    if(!keepPlayerOnField){
      this.$id('player-trainer-sprite').style.backgroundImage=this.playerGender==='female'?"url('assets/girl/throw/full.png')":"url('assets/red/throw/0.png')";
      this.$id('player-trainer-sprite').classList.toggle('female-trainer',this.playerGender==='female');
      this.$id('player-trainer-sprite').classList.remove('red-sheet-ready');
      this.$id('player-trainer-sprite').classList.remove('hidden');
      await this.battleText(`Vai ${this.activeMon.name}!`);
      if(token!==this.battleToken)return;
      await this.animateBall('player');
      if(token!==this.battleToken)return;
      this.$id('player-trainer-sprite').classList.add('hidden');
      await this.summonPokemon('player');
    } else {
      // The surviving allied Pokémon remains on its platform between raid and gym rounds.
      this.$id('player-trainer-sprite').classList.add('hidden');
      this.$id('player-sprite').classList.remove('hidden');
    }
    if(token!==this.battleToken)return;
    this.battleBusy=false;this.showMainActions();
  }
  resetBattleVisuals(keepPlayerOnField=false){
    for(const id of ['battle-throw-ball','capture-ball','capture-smoke','summon-flash']){
      const el=this.$id(id);if(el){el.className=el.dataset.baseClass || el.className.split(' ')[0];el.removeAttribute('style');}
    }
    this.$id('attack-fx-container').replaceChildren();
    for(const id of ['enemy-sprite','player-sprite']){
      this.$id(id).classList.remove('recall-anim','summon-anim','summon-cinematic','hit-anim','attack-lunge','hidden');
    }
    this.$id('enemy-sprite').classList.add('hidden');
    if(!keepPlayerOnField)this.$id('player-sprite').classList.add('hidden');
  }
  async animateBall(side){
    const ball=this.$id('battle-throw-ball');
    const stage=this.$id('battle-stage');
    const trainer=this.$id(side==='enemy'?'enemy-trainer-sprite':'player-trainer-sprite');
    const rect=stage.getBoundingClientRect();
    const trainerRect=trainer.getBoundingClientRect();
    const target=this.battleThrowDestination(side);
    const size=34;
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const releaseX=trainerRect.left-rect.left+trainerRect.width*(side==='enemy'?.35:.68);
    const releaseY=trainerRect.top-rect.top+trainerRect.height*.43;
    const sx=clamp(releaseX-size/2,4,Math.max(4,rect.width-size-4));
    const sy=clamp(releaseY-size/2,4,Math.max(4,rect.height-size-4));
    const ex=clamp(target.x-size/2,4,Math.max(4,rect.width-size-4));
    const ey=clamp(target.y-size/2,4,Math.max(4,rect.height-size-4));
    ball.className='throw-ball ball-compositor';
    ball.style.left='0px';ball.style.top='0px';ball.style.opacity='1';
    const x=t=>sx+(ex-sx)*t;
    // The apex stays inside the stage even when the opponent sits near the top.
    const arcHeight=Math.min(84,rect.height*.23,Math.max(0,Math.min(sy,ey)-6));
    const y=t=>sy+(ey-sy)*t-Math.sin(Math.PI*t)*arcHeight;
    const angle=side==='enemy'?-1:1;
    const frames=[0,.18,.38,.60,.82,1].map((t,i)=>({
      transform:`translate3d(${x(t)}px,${y(t)}px,0) rotate(${angle*360*t}deg) scale(${.72+.28*Math.sin(Math.PI*t)})`,
      opacity:i===5?0:1,offset:t}));
    const trainerMotion=side==='player' ? (this.playerGender==='female'?
      this.playMotion(trainer,[
        {transform:'translate3d(0,0,0) rotate(0deg)'},
        {transform:'translate3d(-7px,-5px,0) rotate(-8deg)'},
        {transform:'translate3d(11px,-6px,0) rotate(7deg)'},
        {transform:'translate3d(0,0,0) rotate(0deg)'}],570,'ease-out'):
      (async()=>{
        for(let i=0;i<5;i++){
          trainer.style.backgroundImage=`url('assets/red/throw/${i}.png')`;
          await this.wait(i===4?195:115);
        }
      })()) : this.playMotion(trainer,[
      {transform:'translate3d(0,0,0) rotate(0deg)'},
      {transform:'translate3d(-10px,-7px,0) rotate(-4deg)'},
      {transform:'translate3d(0,0,0) rotate(0deg)'}],500,'ease-out');
    await Promise.all([this.playMotion(ball,frames,650,'linear'),trainerMotion]);
    ball.className='throw-ball';ball.removeAttribute('style');
  }
  async summonPokemon(side,wild=false){
    const sprite=this.$id(side==='enemy'?'enemy-sprite':'player-sprite');
    const flash=this.$id('summon-flash');
    flash.className=`summon-flash on-${side} active`;
    sprite.classList.remove('hidden','recall-anim','summon-cinematic','wild-entry');
    await this.playMotion(sprite,[
      {opacity:0,transform:'translate3d(0,22px,0) scale(.18)'},
      {opacity:.65,transform:'translate3d(0,-5px,0) scale(.95)'},
      {opacity:1,transform:'translate3d(0,0,0) scale(1)'}],570,'cubic-bezier(.18,.75,.2,1)');
    sprite.classList.remove('summon-cinematic','wild-entry');
    sprite.style.opacity='';flash.className='summon-flash';
  }
  async animateRecall(side){
    const sprite=this.$id(side==='enemy'?'enemy-sprite':'player-sprite');
    const flash=this.$id('summon-flash');
    flash.className=`summon-flash on-${side} recall`;
    await this.playMotion(sprite,[
      {opacity:1,transform:'translate3d(0,0,0) scale(1)'},
      {opacity:.75,transform:'translate3d(0,0,0) scale(.55)'},
      {opacity:0,transform:'translate3d(0,0,0) scale(.03)'}],390,'ease-in');
    sprite.classList.add('hidden');sprite.style.opacity='';flash.className='summon-flash';
  }
  async animateCapture(shakes,success,ballType='pokeball'){
    const ball=this.$id('capture-ball');
    const burst=this.$id('capture-smoke');
    const enemy=this.$id('enemy-sprite');
    const stage=this.$id('battle-stage');
    const area=stage.getBoundingClientRect();
    const target=this.battleSpritePosition('enemy');
    const width=38;
    const start={x:area.width*.21,y:area.height*.70};
    const hit={x:target.x-width/2,y:target.y-width/2};
    const platform=stage.querySelector('.enemy-platform-gba')?.getBoundingClientRect();
    const landingY=platform ? platform.top-area.top-12 : target.y+35;
    const ground={x:target.x-width/2,y:Math.max(hit.y+10,Math.min(area.height-48,landingY))};
    ball.className='capture-ball compositor-ball';
    ball.style.setProperty('--capture-ball-image',ballType==='masterball'?"url('assets/items/master-ball.svg')":"url('assets/items/pokeball-game.png')");
    ball.dataset.ballType=ballType;
    ball.style.display='block';ball.style.opacity='1';
    ball.style.left='0px';ball.style.top='0px';
    const anim=[0,.18,.42,.66,.85,1].map(t=>({
      transform:`translate3d(${start.x+(hit.x-start.x)*t}px,${start.y+(hit.y-start.y)*t-Math.sin(Math.PI*t)*Math.min(96,area.height*.26)}px,0) rotate(${t*360}deg) scale(${.72+Math.sin(Math.PI*t)*.25})`,offset:t}));
    await this.playMotion(ball,anim,630,'linear');
    ball.style.transform=`translate3d(${hit.x}px,${hit.y}px,0)`;
    burst.className='capture-smoke absorption';
    burst.style.left=`${target.x-54}px`;burst.style.top=`${target.y-54}px`;
    await this.playMotion(enemy,[
      {opacity:1,transform:'translate3d(0,0,0) scale(1)'},
      {opacity:0,transform:'translate3d(0,0,0) scale(.06)'}],340,'ease-in');
    enemy.classList.add('hidden');
    enemy.style.opacity='';burst.className='capture-smoke';
    await this.playMotion(ball,[
      {transform:`translate3d(${hit.x}px,${hit.y}px,0) rotate(0deg)`},
      {transform:`translate3d(${ground.x}px,${ground.y-7}px,0) rotate(12deg)`,offset:.66},
      {transform:`translate3d(${ground.x}px,${ground.y}px,0) rotate(0deg)`}],330,'ease-out');
    ball.style.transform=`translate3d(${ground.x}px,${ground.y}px,0)`;
    ball.classList.add('capture-waiting');
    await this.playMotion(ball,[
      {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1)`,filter:'brightness(1)'},
      {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1.07)`,filter:'brightness(2.2)',offset:.5},
      {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1)`,filter:'brightness(1)'}],450,'ease-in-out');
    for(let i=0;i<shakes;i++){
      await this.playMotion(ball,[
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) rotate(0deg)`},
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) rotate(-22deg)`,offset:.22},
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) rotate(17deg)`,offset:.55},
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) rotate(0deg)`}],470,'ease-in-out');
      await this.wait(85);
    }
    if(success){
      burst.className='capture-smoke caught-particles';
      await this.playMotion(ball,[
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1)`,filter:'brightness(1)'},
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1.12)`,filter:'brightness(1.9)',offset:.4},
        {transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1)`,filter:'brightness(.65)'}],780,'ease-out');
    }else{
      burst.className='capture-smoke escape-particles';
      await this.playMotion(ball,[
        {opacity:1,transform:`translate3d(${ground.x}px,${ground.y}px,0) scale(1)`},
        {opacity:0,transform:`translate3d(${ground.x}px,${ground.y-15}px,0) scale(1.5)`}],320,'ease-out');
      enemy.classList.remove('hidden');
      await this.playMotion(enemy,[
        {opacity:0,transform:'translate3d(0,0,0) scale(.25)'},
        {opacity:1,transform:'translate3d(0,0,0) scale(1)'}],430,'ease-out');
    }
    ball.className='capture-ball';ball.removeAttribute('style');
    burst.className='capture-smoke';burst.removeAttribute('style');
  }
  updateBattleHUD() {
    if(!this.activeMon||!this.enemyMon)return;
    const a=this.activeMon,b=this.enemyMon;
    this.$id('player-name').textContent=a.name;
    this.$id('enemy-name').textContent=b.name;
    this.$id('player-lv').textContent=a.level;
    this.$id('enemy-lv').textContent=b.level;
    this.$id('player-sprite').src=a.spriteBack;
    const playerPct=Math.max(0,100*a.currentHp/a.maxHp);
    const enemyPct=Math.max(0,100*b.currentHp/b.maxHp);
    this.$id('player-hp-fill').style.width=`${playerPct}%`;
    this.$id('enemy-hp-fill').style.width=`${enemyPct}%`;
    this.$id('player-hp-fill').className=`stat-bar-hp-gba hp-${this.hpColorState(a)}`;
    this.$id('enemy-hp-fill').className=`stat-bar-hp-gba hp-${this.hpColorState(b)}`;
    this.$id('player-hp-text').textContent=`${a.currentHp}/${a.maxHp}`;
    this.$id('enemy-hp-text').textContent=`${b.currentHp}/${b.maxHp}`;
    this.$id('player-exp-fill').style.width=`${a.level>=this.getLevelCap()?100:Math.max(0,Math.min(100,100*a.exp/Math.max(1,a.expToNext)))}%`;
    this.renderBattleConditions('player',a);
    this.renderBattleConditions('enemy',b);
    this.renderSidebar();
  }
  renderBattleConditions(side,mon){
    const out=this.$id(`${side}-conditions`);if(!out)return;
    out.replaceChildren();
    const statuses={burn:'BRU',poison:'VEL','bad-poison':'VEL+',paralysis:'PAR',sleep:'SON',freeze:'GEL',confusion:'CONF'};
    if(mon.status && mon.status!=='leech-seed'){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent=statuses[mon.status]||mon.status.toUpperCase();out.append(chip);}
    if(mon.trappedTurns>0){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent='INTR.';out.append(chip);}
    if(mon.seeded){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent='SEME';out.append(chip);}
    for(const [field,label] of [['lightScreenTurns','SCH. LUCE'],['reflectTurns','RIFLESSO'],['safeguardTurns','SALV.'],['mistTurns','NEBBIA']]){
      if(mon[field]>0){const chip=document.createElement('span');chip.className='condition-chip boost';chip.textContent=`${label} ${mon[field]}`;out.append(chip);}
    }
    if(mon.futureSight){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent=`DIV. ${mon.futureSight.turns}`;out.append(chip);}
    if(mon.focusEnergyActive){const chip=document.createElement('span');chip.className='condition-chip boost';chip.textContent='FOCUS';out.append(chip);}
    const labels={attack:'ATT',defense:'DIF','special-attack':'ATT.SP','special-defense':'DIF.SP',speed:'VEL.',accuracy:'PREC',evasion:'ELUS'};
    for(const [key,value] of Object.entries(mon.statStages||{})){
      if(!value)continue;
      const chip=document.createElement('span');chip.className=`condition-chip ${value>0?'boost':'nerf'}`;
      chip.textContent=`${labels[key]||key} ${value>0?'+':''}${value}`;out.append(chip);
    }
  }
  setBattleMsg(text){
    this.$id('battle-msg').textContent=this.localize(text);
    this.$id('battle-log').classList.toggle('awaiting-click',Boolean(this.dialogueResolve));
  }
  acknowledgeDialogue(){
    if(!this.dialogueResolve)return;
    const resolve=this.dialogueResolve;this.dialogueResolve=null;
    this.$id('battle-log').classList.remove('awaiting-click');
    resolve();
  }
  async battleText(text){
    this.setBattleMsg(text);
    if(this.$id('overlay-battle').classList.contains('hidden'))return;
    await new Promise(resolve=>{
      this.dialogueResolve=resolve;
      this.$id('battle-log').classList.add('awaiting-click');
    });
  }
  async showEvolution(mon, evo){
    const panel=this.$id('evolution-overlay');
    this.evolutionMon=mon;this.evolutionData=evo;
    this.$id('evolution-from').src=evo.fromSprite||'assets/items/pokeball-game.png';
    this.$id('evolution-to').src=evo.toSprite||'assets/items/pokeball-game.png';
    this.$id('evolution-caption').textContent=`${evo.from} si sta evolvendo...`;
    this.$id('evolution-from').classList.remove('hidden');
    this.$id('evolution-to').classList.add('hidden');
    this.$id('evolution-start').classList.remove('hidden');
    this.$id('evolution-finish').classList.add('hidden');
    panel.classList.remove('hidden');
    this.updateBattleHUD();this.renderSidebar();
    await new Promise(resolve=>{this.evolutionResolve=resolve;});
  }
  startEvolutionAnimation(){
    this.$id('evolution-start').classList.add('hidden');
    this.$id('evolution-from').classList.add('evo-transform');
    this.$id('evolution-to').classList.remove('hidden');
    this.$id('evolution-to').classList.add('evo-reveal');
    this.$id('evolution-caption').textContent=`${this.evolutionData.from} si sta evolvendo...`;
    setTimeout(()=>{
      this.$id('evolution-from').classList.add('hidden');
      this.$id('evolution-from').classList.remove('evo-transform');
      this.$id('evolution-caption').textContent=`${this.evolutionData.from} si è evoluto in ${this.evolutionData.to}!`;
      this.$id('evolution-finish').classList.remove('hidden');
      this.renderSidebar();this.updateBattleHUD();
    },1700);
  }
  finishEvolution(){
    this.$id('evolution-overlay').classList.add('hidden');
    this.$id('evolution-to').classList.remove('evo-reveal');
    const resolve=this.evolutionResolve;this.evolutionResolve=null;
    if(resolve)resolve();
  }
  showMoves(){
    if(this.battleConfirmAction)return;
    if(this.battleBusy || this.pendingForcedSwitch || this.hasForcedBattleAction())return;
    this.battleMode='moves';this.hideAllActions();
    const panel=this.$id('panel-move-actions');panel.innerHTML='';panel.classList.remove('hidden');
    this.$id('btn-move-back').classList.remove('hidden');
    for(const m of this.activeMon.moves){
      const btn=document.createElement('button');btn.className=`act-btn move-${m.type}`;
      btn.innerHTML=`<strong>${m.name}</strong><small>${m.type.toUpperCase()} · PP ${m.currentPp}/${m.maxPp}</small>`;
      btn.disabled=m.currentPp<=0;
      btn.onclick=()=>this.executeAttack(m);
      panel.appendChild(btn);
    }
    if(!this.activeMon.moves.some(m=>m.currentPp>0)){
      const struggle=new Move('Scontro','normal',50,1,'physical');
      struggle.currentPp=1;const btn=document.createElement('button');btn.className='act-btn';btn.textContent='SCONTRO';btn.onclick=()=>this.executeAttack(struggle);panel.appendChild(btn);
    }

  }
  showTeamMenu(force=false){
    if(!force&&(this.battleBusy || this.hasForcedBattleAction()))return;
    if(this.battleBusy && !force)return;
    this.pendingForcedSwitch=Boolean(force);
    this.battleMode='team';this.hideAllActions();
    this.openWings();this.renderSidebar();
    this.$id('panel-team-actions').classList.remove('hidden');
    this.$id('panel-team-actions').innerHTML=`<span>${force?'POKÉMON SCONFITTO: CHI MANDI IN CAMPO?':'SCEGLI UN POKÉMON NEL PANNELLO SINISTRO'}</span>${force?'':'<button id="battle-team-back" class="act-btn mini-back-btn">←</button>'}`;
    if(!force)this.$id('battle-team-back').onclick=()=>{this.teleportSwitchPending=false;this.showMainActions();};
    this.setBattleMsg(force?`${this.activeMon.name} è stato sconfitto, chi vuoi mandare in campo?`:'Apri il Pokémon nella squadra a sinistra e scegli MANDA IN CAMPO.');
  }
  showBagMenu(){
    if(this.battleBusy||this.pendingForcedSwitch||this.hasForcedBattleAction())return;
    this.battleMode='bag';this.hideAllActions();this.openWings();this.renderSidebar();
    this.$id('panel-bag-actions').classList.remove('hidden');
    this.$id('panel-bag-actions').innerHTML='<span>SCEGLI UNO STRUMENTO DALLO ZAINO A DESTRA</span><button id="battle-bag-back" class="act-btn mini-back-btn">←</button>';
    this.$id('battle-bag-back').onclick=()=>this.showMainActions();
    this.setBattleMsg('Apri lo zaino e scegli un oggetto.');
  }
  selectBattlePokemon(pokemon){
    if(this.battleConfirmAction || (!this.pendingForcedSwitch&&this.hasForcedBattleAction()))return;
    if(!this.$id('overlay-battle') || this.$id('overlay-battle').classList.contains('hidden'))return;
    if(this.battleBusy || this.dialogueResolve)return;
    if(!this.pendingForcedSwitch && this.activeMon?.trappedTurns>0){this.setBattleMsg(`${this.activeMon.name} non può essere sostituito: è intrappolato!`);return;}
    if(pokemon===this.activeMon){this.setBattleMsg('Questo Pokémon è già in campo!');return;}
    if(pokemon.currentHp<=0){this.setBattleMsg('Un Pokémon esausto non può combattere!');return;}
    this.askBattleConfirmation(this.pendingForcedSwitch?`Hai scelto ${pokemon.name}, confermi la scelta?`:`Richiamare ${this.activeMon.name} e mandare ${pokemon.name} (Lv.${pokemon.level})?`,()=>this.performSwitch(pokemon),true);
  }
  askBattleConfirmation(message,yes,cancellable=true){
    const o=this.$id('battle-confirm');this.battleConfirmAction=yes;
    this.$id('battle-confirm-text').textContent=message;
    this.$id('btn-battle-confirm-no').classList.toggle('hidden',!cancellable);
    o.classList.remove('hidden');
    this.$id('btn-battle-confirm-yes').focus({preventScroll:true});
  }
  acceptBattleConfirmation(){
    const action=this.battleConfirmAction;
    // On confirm, fishing transitions into a locked encounter rather than unlocking.
    if(this.fishingConfirmPending)this.fishingConfirmPending=false;
    this.closeBattleConfirmation();
    if(action)action();
  }
  closeBattleConfirmation(){
    this.$id('battle-confirm').classList.add('hidden');
    this.battleConfirmAction=null;
    if(this.fishingConfirmPending){this.fishingConfirmPending=false;this.isLocked=false;}
  }
  async performSwitch(next){
    if(next.currentHp<=0||!this.team.includes(next))return;
    const forced=this.pendingForcedSwitch;
    const fromTeleport=this.teleportSwitchPending;
    this.teleportSwitchPending=false;
    this.pendingForcedSwitch=false;
    this.battleBusy=true;this.hideAllActions();
    if(!forced&&!fromTeleport){await this.battleText(`${this.activeMon.name}, torna nella Poké Ball!`);await this.animateRecall('player');}
    if(this.enemyMon?.trapSource===this.activeMon){this.enemyMon.trappedTurns=0;this.enemyMon.trapSource=null;this.enemyMon.trapMove=null;}
    this.activeMon.clearVolatile();
    if(this.activeMon.ability==='natural-cure'){this.activeMon.status=null;this.activeMon.statusTurns=0;}
    // A mid-battle switch also updates the party's lead position.
    const nextIndex=this.team.indexOf(next);
    if(nextIndex>0){this.team.splice(nextIndex,1);this.team.unshift(next);}
    this.activeMon=next;this.battleParticipants.add(next);next.clearVolatile();
    this.triggerEntryAbilities(next,this.enemyMon);
    await next.loadLearnset();
    this.updateBattleHUD();
    await this.battleText(`Vai ${next.name}!`);
    await this.animateBall('player');
    await this.summonPokemon('player');
    this.updateBattleHUD();
    if(forced){this.battleBusy=false;this.showMainActions();}
    else {await this.enemyTurn();}
  }
  isBattleVisible(){return !this.$id('overlay-battle')?.classList.contains('hidden');}
  chooseBattleItem(id){
    if(this.battleConfirmAction || this.pendingItemTarget || this.battleBusy || this.dialogueResolve || (this.isBattleVisible()&&this.hasForcedBattleAction()))return;
    if(!this.items[id]){this.showItemFeedback('Non hai questo strumento.');return;}
    if(id==='pokeball'||id==='masterball'){
      if(id==='masterball' && this.isCelestialCave && this.celestialPhase!=='rematch'){
        this.showItemFeedback('Devi prima dimostrare il tuo valore contro Mewtwo.');return;
      }
      if(!this.isBattleVisible()){this.showItemFeedback('Le Poké Ball si usano solo durante gli incontri selvatici.');return;}
      if(this.isRaidActive||['gym','trainer'].includes(this.battleType)){
        this.setBattleMsg('Non puoi catturare Pokémon di allenatori o dei raid!');return;
      }
      this.askBattleConfirmation(id==='masterball'?'Vuoi lanciare la Master Ball?':'Vuoi lanciare una Poké Ball?',()=>this.useBattleItem(id));
      return;
    }
    if(['rareCandy','goldCandy'].includes(id)){
      if(!this.devMode)return;
      if(this.isBattleVisible()){
        this.showItemFeedback('Le caramelle DEV si usano solo fuori dalla battaglia.');return;
      }
    }
    if(!['potion','superPotion','hyperPotion','elixir','rareCandy','goldCandy'].includes(id))return;
    this.beginItemTargetSelection(id);
  }
  showItemFeedback(message){
    if(this.isBattleVisible())this.setBattleMsg(message);
    else {this.logMsg(message);this.showDiscoveryNotice(message,2400);}
  }
  beginItemTargetSelection(id){
    if((this.isBattleVisible()&&this.hasForcedBattleAction()) || !this.team.length || this.isLocked && !this.isBattleVisible())return;
    this.pendingItemTarget=id;this.openWings();
    const box=this.$id('item-target-prompt');
    const itemNames={potion:'Pozione',superPotion:'Superpozione',hyperPotion:'Iperpozione',elixir:'Elisir',rareCandy:'Caramella Rara',goldCandy:'Caramella d’Oro'};
    this.$id('item-target-message').textContent=`A quale Pokémon vuoi dare ${itemNames[id]}?`;
    box.classList.remove('hidden');
    const mobileList=this.$id('item-target-mobile-list');mobileList.replaceChildren();
    this.team.forEach(mon=>{
      const button=document.createElement('button');button.type='button';
      button.className='item-target-mobile-pokemon';
      button.textContent=`${mon.name} · Lv.${mon.level} · ${mon.currentHp}/${mon.maxHp} PS`;
      button.disabled=mon.currentHp<=0 || (['rareCandy','goldCandy'].includes(id)&&mon.level>=100);
      button.onclick=()=>this.giveItemToPokemon(mon);
      mobileList.appendChild(button);
    });
    this.renderSidebar();
    if(this.isBattleVisible()){
      this.battleMode='item-target';this.hideAllActions();
      this.$id('panel-bag-actions').classList.remove('hidden');
      this.$id('panel-bag-actions').textContent='SCEGLI UN POKÉMON DALLA SQUADRA A SINISTRA';
      this.setBattleMsg('A quale Pokémon vuoi dare lo strumento?');
    } else this.logMsg('A quale Pokémon vuoi dare lo strumento? Sceglilo dalla squadra.');
  }
  cancelItemTargetSelection(){
    if(!this.pendingItemTarget)return;
    this.pendingItemTarget=null;
    this.$id('item-target-prompt').classList.add('hidden');
    if(this.isBattleVisible() && !this.battleBusy)this.showMainActions();
    else this.renderSidebar();
  }
  async giveItemToPokemon(pokemon){
    const id=this.pendingItemTarget;
    if(!id||!this.team.includes(pokemon)||!this.items[id])return;
    if(pokemon.currentHp<=0){this.showItemFeedback('Non puoi usare lo strumento su un Pokémon esausto!');return;}
    if(['rareCandy','goldCandy'].includes(id)){
      if(!this.devMode||this.isBattleVisible()||pokemon.level>=100){
        this.showItemFeedback(pokemon.level>=100?'Livello 100 già raggiunto.':'Le caramelle DEV non si possono usare ora.');return;
      }
      this.pendingItemTarget=null;
      this.$id('item-target-prompt').classList.add('hidden');
      this.renderSidebar();
      return this.useDevCandy(pokemon,id);
    }
    if(['potion','superPotion','hyperPotion'].includes(id) && pokemon.currentHp>=pokemon.maxHp){this.showItemFeedback(`${pokemon.name} ha già tutti i PS!`);return;}
    if(id==='elixir' && pokemon.moves.every(m=>m.currentPp>=m.maxPp)){
      this.showItemFeedback(`${pokemon.name} ha già tutti i PP!`);return;
    }
    this.pendingItemTarget=null;this.$id('item-target-prompt').classList.add('hidden');
    this.items[id]--;
    if(['potion','superPotion','hyperPotion'].includes(id)){
      const before=pokemon.currentHp;
      const heal={potion:20,superPotion:50,hyperPotion:200}[id];
      pokemon.currentHp=Math.min(pokemon.maxHp,pokemon.currentHp+heal);
      this.showItemFeedback(`${pokemon.name} recupera ${pokemon.currentHp-before} PS grazie a ${ {potion:'Pozione',superPotion:'Superpozione',hyperPotion:'Iperpozione'}[id] }!`);
    } else {
      pokemon.restorePp();this.showItemFeedback(`Elisir: i PP di ${pokemon.name} sono stati ripristinati!`);
    }
    this.renderSidebar();
    if(this.isBattleVisible()){
      this.battleBusy=true;this.hideAllActions();this.updateBattleHUD();
      await this.wait(450);await this.enemyTurn();
    }
  }
  async useBattleItem(id){
    if(this.battleBusy||this.items[id]<=0||!['pokeball','masterball'].includes(id))return;
    if(this.isRaidActive||['trainer','gym'].includes(this.battleType)){
      this.setBattleMsg('Non puoi catturare Pokémon dei raid o degli allenatori!');return;
    }
    this.battleBusy=true;this.hideAllActions();this.items[id]--;
    const wild=this.enemyMon;
    await this.battleText(`Lanci una ${id==='masterball'?'Master Ball':'Poké Ball'} verso ${wild.name}!`);
    if(this.battleType==='mewtwo' && (this.celestialPhase==='trial'||id!=='masterball')){
      await this.animateCapture(0,false,id);
      await this.battleText('è troppo forte, non puoi catturarlo');
      this.updateBattleHUD();await this.wait(600);await this.enemyTurn();return;
    }
    const missing=1-(wild.currentHp/wild.maxHp);
    const odds=Math.min(.92,.20+missing*.68);
    const success=id==='masterball'||Boolean(this.devMode)||Math.random()<odds;
    const shakes=success?3:Math.floor(Math.random()*4);
    await this.animateCapture(shakes,success,id);
    if(success){
      if(this.battleType==='mewtwo')this.completeMewtwoEncounter();
      if([144,145,146].includes(Number(wild.id)))this.caughtLegendarySpecies.add(Number(wild.id));
      await this.battleText(`Preso! ${wild.name} è stato catturato!`);
      if(this.team.length<this.getTeamSlotLimit()){this.team.push(wild);this.endBattle(`Hai catturato ${wild.name}!`);}
      else this.promptTeamFullChoice(wild);
      return;
    }
    await this.battleText(`${wild.name} è uscito dalla Poké Ball!`);
    this.updateBattleHUD();await this.wait(900);await this.enemyTurn();
  }
  promptTeamFullChoice(newMon){
    this.battleBusy=true;
    let o=this.$id('team-full-overlay');
    if(!o){o=document.createElement('div');o.id='team-full-overlay';o.className='full-overlay battle-modal';this.$id('pokenav-screen-root').appendChild(o);}
    o.innerHTML=`<h3>SQUADRA PIENA</h3><p>Hai sbloccato ${this.getTeamSlotLimit()} slot su 6. Sostituisci un Pokémon oppure libera quello catturato.</p><div id="team-full-slots"></div><button class="act-btn" id="discard-new-btn">LIBERA IL POKÉMON</button>`;
    o.classList.remove('hidden');
    const slots=o.querySelector('#team-full-slots');
    this.team.forEach((p,i)=>{const b=document.createElement('button');b.className='act-btn';b.textContent=`${p.name} Lv.${p.level}`;
      b.onclick=()=>{this.team[i]=newMon;if(p===this.activeMon)this.activeMon=newMon;o.classList.add('hidden');this.endBattle(`Catturato ${newMon.name}!`);};slots.appendChild(b);});
    o.querySelector('#discard-new-btn').onclick=()=>{o.classList.add('hidden');this.endBattle(`${newMon.name} è stato liberato.`);};
  }
  async playAttackAnimation(move,target='enemy'){
    const fx=this.$id('attack-fx-container');
    fx.replaceChildren();
    const id=(move.id||'').toLowerCase(),type=move.type||'normal';
    const effect=/(scratch|slash|cut|fury-swipes|metal-claw)/.test(id)?'claw':
      /(tackle|quick-attack|headbutt|pound|slam|body-slam|swift)/.test(id)?'star':
      /(bubble|water-gun|hydro-pump|surf)/.test(id)?(id==='bubble'?'bubble':'wave'):
      /(vine-whip|razor-leaf|solar-beam|mega-drain|leech-seed)/.test(id)?'leaf':
      /(thunder|electric|spark|shock)/.test(id)?'bolt':
      /(ember|flame|fire|blast)/.test(id)?'ember':
      /(rock|earth|dig)/.test(id)?'rock':
      /(psychic|confusion|hypnosis)/.test(id)?'psychic':
      /(poison|smog|acid|gas|spore)/.test(id)?'smoke':
      type==='fire'?'ember':type==='water'?'wave':type==='grass'?'leaf':
      type==='electric'?'bolt':type==='ice'?'ice':type==='rock'||type==='ground'?'rock':
      type==='ghost'||type==='poison'?'smoke':type==='psychic'?'psychic':'star';
    const user=this.$id(target==='enemy'?'player-sprite':'enemy-sprite');
    const victim=this.$id(target==='enemy'?'enemy-sprite':'player-sprite');
    const rootBounds=fx.getBoundingClientRect();
    const a=user.getBoundingClientRect(),b=victim.getBoundingClientRect();
    const start={x:a.left-rootBounds.left+a.width*.50,y:a.top-rootBounds.top+a.height*.52};
    const end={x:b.left-rootBounds.left+b.width*.50,y:b.top-rootBounds.top+b.height*.52};
    const count=move.power===0?5:((effect==='wave'||effect==='ember'||effect==='bolt')?11:7);
    const dx=end.x-start.x,dy=end.y-start.y;
    user.classList.remove('attack-lunge');void user.offsetWidth;user.classList.add('attack-lunge');
    for(let i=0;i<count;i++){
      const p=document.createElement('img');p.className='v6-move-projectile';
      p.src=`assets/effects/${effect}.svg`;p.alt='';p.draggable=false;
      p.style.left=`${start.x+(i%3-1)*6}px`;p.style.top=`${start.y+(i%3-1)*4}px`;
      p.style.setProperty('--travel-x',`${dx+(i%4-1.5)*12}px`);
      p.style.setProperty('--travel-y',`${dy+(i%3-1)*15}px`);
      p.style.setProperty('--delay',`${i*44}ms`);
      p.style.setProperty('--spin',`${(i%2?1:-1)*30}deg`);
      fx.appendChild(p);
    }
    const impact=document.createElement('div');impact.className=`v6-attack-impact effect-${effect}`;
    impact.style.left=`${end.x}px`;impact.style.top=`${end.y}px`;
    fx.appendChild(impact);
    await this.wait(410);
    victim.classList.remove('hit-anim');void victim.offsetWidth;victim.classList.add('hit-anim');
    await this.wait(560);
    user.classList.remove('attack-lunge');victim.classList.remove('hit-anim');
    fx.replaceChildren();
  }
  async executeAttack(move,forced=false){
    if(this.battleBusy||this.pendingForcedSwitch||(!forced&&move.currentPp<=0))return;
    // Ignore manually selected moves when a previous turn is still resolving.
    if(!forced&&(this.activeMon?.pendingCharge||this.activeMon?.rechargeTurns>0||this.activeMon?.rampageTurns>0||this.activeMon?.rolloutTurns>0))return;
    if(move.id==='teleport'&&!forced){
      move.currentPp=Math.max(0,move.currentPp-1);
      if(this.battleType==='wild' && !this.isRaidActive){this.endBattle(`${this.activeMon.name} usa Teletrasporto e fugge!`);return;}
      if(this.team.filter(p=>p.currentHp>0 && p!==this.activeMon).length===0){
        this.setBattleMsg('Teletrasporto fallisce: non hai altri Pokémon disponibili.');this.showMainActions();return;
      }
      this.teleportSwitchPending=true;
      this.setBattleMsg(`${this.activeMon.name} usa Teletrasporto! Scegli chi mandare in campo.`);
      this.showTeamMenu();return;
    }
    this.battleBusy=true;this.hideAllActions();
    this.beginBattleTurn();
    const enemyMove=this.pickEnemyMove();
    const enemyFirst=(enemyMove.priority>move.priority)||
      (enemyMove.priority===move.priority && this.battleSpeed(this.enemyMon)>this.battleSpeed(this.activeMon));
    if(enemyFirst){const enemyResult=await this.applyMove(this.enemyMon,this.activeMon,enemyMove,'player');
      if(enemyResult==='battle-ended')return;
      if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}}
    if(this.enemyMon.currentHp>0){await this.applyMove(this.activeMon,this.enemyMon,move,'enemy');}
    // The self-KO must be processed even if the enemy fell too.
    if(this.activeMon.currentHp<=0){
      if(this.enemyMon.currentHp<=0){
        const fallen=this.activeMon;
        await this.handleBattleVictory();
        this.team=this.team.filter(p=>p!==fallen);
        if(this.activeMon===fallen)this.activeMon=this.team.find(p=>p.currentHp>0)||null;
        this.renderSidebar();
        if(!this.activeMon)this.$id('gameover-overlay').classList.remove('hidden');
      }else await this.onPlayerFainted();
      return;
    }
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    if(!enemyFirst){await this.enemyTurn(true);return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    this.battleBusy=false;this.showMainActions();
  }
  beginBattleTurn(){
    if(this.activeMon)this.activeMon.protectedThisTurn=false;
    if(this.enemyMon)this.enemyMon.protectedThisTurn=false;
  }
  triggerEntryAbilities(mon,opponent){
    if(!mon||!opponent)return;
    if(mon.ability==='intimidate'&&!['clear-body','white-smoke','hyper-cutter'].includes(opponent.ability)){
      opponent.statStages.attack=Math.max(-6,(opponent.statStages.attack||0)-1);
    }
  }
  statusAbilityBlocks(mon,ailment){
    return (ailment==='poison' && mon.ability==='immunity') ||
      (ailment==='burn' && mon.ability==='water-veil') ||
      (ailment==='paralysis' && mon.ability==='limber') ||
      (ailment==='freeze' && mon.ability==='magma-armor') ||
      (ailment==='sleep' && ['insomnia','vital-spirit'].includes(mon.ability));
  }
  abilityAttackImmunity(defender,move,attacker){
    if(defender.ability==='levitate'&&move.type==='ground')return `${defender.name} evita la mossa grazie a Levitazione!`;
    const absorb={water:'water-absorb',electric:'volt-absorb'};
    if(absorb[move.type]===defender.ability){
      const amount=Math.max(1,Math.floor(defender.maxHp/4));
      defender.currentHp=Math.min(defender.maxHp,defender.currentHp+amount);
      return `${defender.name} recupera PS grazie a ${defender.abilityName}!`;
    }
    if(move.type==='fire'&&defender.ability==='flash-fire'){
      defender.flashFireActivated=true;
      return `${defender.name} potenzia il Fuoco grazie a Fuocardore!`;
    }
    return null;
  }
  battleSpeed(mon){
    return mon.speed*statMultiplier(mon.statStages?.speed)*(mon.status==='paralysis'?.25:1);
  }
  pickEnemyMove(){
    if(this.enemyMon?.rechargeTurns>0)return FORCED_RECHARGE_ACTION;
    if(this.enemyMon?.pendingCharge)return this.enemyMon.pendingCharge.move;
    if(this.enemyMon?.rampageTurns>0)return this.enemyMon.rampageMove;
    if(this.enemyMon?.rolloutTurns>0)return this.enemyMon.rolloutMove;
    const available=this.enemyMon.moves.filter(m=>m.currentPp>0);
    if(!available.length)return new Move('Scontro','normal',50,1,'physical');
    const offensive=available.filter(m=>m.power>0);
    if(offensive.length && Math.random()<.85){
      return offensive.sort((a,b)=>(b.power*typeEffectiveness(b.type,this.activeMon.types))-(a.power*typeEffectiveness(a.type,this.activeMon.types)))[0];
    }
    return available[Math.floor(Math.random()*available.length)];
  }
  stopRollout(mon){mon.rolloutTurns=0;mon.rolloutHits=0;mon.rolloutMove=null;}
  // A separate hit runs its own damage, crit, ability and recoil logic. Only
  // the initial accuracy check and one PP payment occur per multihit action.
  async applyMove(attacker,defender,move,target){
    if(attacker.rechargeTurns>0){
      attacker.rechargeTurns--;
      await this.battleText(`${attacker.name} deve riposare per recuperare le energie!`);
      return 'recharging';
    }
    // The release of a charging attack does not spend PP a second time.
    const releasing=Boolean(attacker.pendingCharge && attacker.pendingCharge.move.id===move.id);
    if(attacker.status==='sleep'){
      attacker.statusTurns--;
      if(attacker.statusTurns>0){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} sta dormendo!`);return;}
      attacker.status=null;await this.battleText(`${attacker.name} si è svegliato!`);
    }
    if(attacker.status==='freeze' && Math.random()>=.2){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} è congelato!`);return;}
    if(attacker.status==='freeze')attacker.status=null;
    if(attacker.status==='paralysis' && Math.random()<.25){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} è paralizzato!`);return;}
    if(attacker.confusionTurns>0){
      await this.battleText(`${attacker.name} è confuso!`);
      attacker.confusionTurns--;
      if(Math.random()<.5){
        const selfDamage=getConfusionDamage(attacker);
        attacker.currentHp=Math.max(0,attacker.currentHp-selfDamage);
        attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);
        this.updateBattleHUD();await this.battleText(`${attacker.name} si ferisce per la confusione! (${selfDamage} danni)`);
        return 'confusion-self-hit';
      }
      if(attacker.confusionTurns===0)await this.battleText(`${attacker.name} non è più confuso!`);
    }
    if(!releasing && !attacker.rampageTurns && !attacker.rolloutTurns)
      move.currentPp=Math.max(0,move.currentPp-(defender.ability==='pressure'?2:1));
    if(releasing)attacker.pendingCharge=null;
    else if(CHARGE_MOVES.has(move.id)){
      attacker.pendingCharge={move};
      // Skull Bash's defence buff applies on the turn it is charged.
      if(move.id==='skull-bash')attacker.statStages.defense=Math.min(6,(attacker.statStages.defense||0)+1);
      if(move.id==='meteor-beam')attacker.statStages['special-attack']=Math.min(6,(attacker.statStages['special-attack']||0)+1);
      if(move.id==='electro-shot')attacker.statStages['special-attack']=Math.min(6,(attacker.statStages['special-attack']||0)+1);
      this.updateBattleHUD();
      await this.battleText(`${attacker.name} ${CHARGE_MESSAGES[move.id]||'si prepara'}!`);
      return 'charging';
    }
    if(RAMPAGE_MOVES.has(move.id) && !attacker.rampageTurns){
      attacker.rampageTurns=2+Math.floor(Math.random()*2);
      attacker.rampageMove=move;
    }
    this.setBattleMsg(`${attacker.name} usa ${move.name}!`);
    if(move.id==='geomancy'){
      for(const stat of ['special-attack','special-defense','speed'])
        attacker.statStages[stat]=Math.min(6,(attacker.statStages[stat]||0)+2);
      this.updateBattleHUD();
      await this.battleText(`${attacker.name} aumenta Attacco Speciale, Difesa Speciale e Velocità!`);
      return 'powered-up';
    }
    if(move.id==='teleport'){
      if(attacker===this.enemyMon && this.battleType==='wild' && !this.isRaidActive){
        this.endBattle(`${attacker.name} è fuggito usando Teletrasporto!`);return 'battle-ended';
      }
      await this.battleText('Teletrasporto non ha effetto sull’allenatore avversario.');
      return 'no-effect';
    }
    if(move.cureTeam||move.id==='heal-bell'||move.id==='aromatherapy'){
      for(const mon of this.team||[])if(mon){mon.status=null;mon.statusTurns=0;}
      await this.battleText(`${attacker.name} guarisce la squadra dai problemi di stato!`);
      this.updateBattleHUD();return 'cure-team';
    }
    if(move.cureStatus||move.id==='refresh'){
      if(!attacker.status){await this.battleText('Non c’è alcuno stato alterato da curare!');return 'no-effect';}
      attacker.status=null;attacker.statusTurns=0;
      await this.battleText(`${attacker.name} guarisce il proprio stato alterato!`);
      this.updateBattleHUD();return 'cure-status';
    }
    if(move.maxAttackHalfHp||move.id==='belly-drum'){
      if(attacker.currentHp<=Math.floor(attacker.maxHp/2)){
        await this.battleText('Panciamburo fallisce: PS insufficienti!');return 'no-effect';
      }
      attacker.currentHp-=Math.floor(attacker.maxHp/2);attacker.statStages.attack=6;
      await this.battleText(`${attacker.name} sacrifica metà dei suoi PS per massimizzare l’Attacco!`);
      this.updateBattleHUD();return 'belly-drum';
    }
    if(move.disengage||['roar','whirlwind'].includes(move.id)){
      if(['wild','fishing'].includes(this.battleType)&&!this.isRaidActive){
        this.endBattle(`${attacker.name} interrompe lo scontro con ${move.name}!`);return 'battle-ended';
      }
      await this.battleText(`${move.name} non può interrompere questa sfida!`);return 'no-effect';
    }
    if(move.copyStages||move.id==='psych-up'){
      attacker.statStages={...defender.statStages};
      this.updateBattleHUD();
      await this.battleText(`${attacker.name} copia le modifiche alle statistiche di ${defender.name}!`);
      return 'psych-up';
    }
    if(move.screen){
      const key=move.screen==='physical'?'reflectTurns':'lightScreenTurns';
      if(attacker[key]>0){await this.battleText('La barriera è già attiva!');return 'no-effect';}
      attacker[key]=5;
      await this.battleText(move.screen==='physical'?`${attacker.name} alza Riflesso! Danni fisici dimezzati per 5 turni.`:
        `${attacker.name} alza Schermoluce! Danni speciali dimezzati per 5 turni.`);
      this.updateBattleHUD();return 'screen';
    }
    if(move.id==='haze'||move.resetStages){
      attacker.statStages={};defender.statStages={};
      await this.battleText('Nebbia annulla tutte le modifiche alle statistiche!');
      this.updateBattleHUD();return 'haze';
    }
    if(move.focusEnergy || move.id==='focus-energy'){
      attacker.focusEnergyActive=true;
      await this.battleText(`${attacker.name} aumenta le probabilità di brutto colpo!`);
      this.updateBattleHUD();return 'focus-energy';
    }
    if(move.mist||move.safeguard){
      const key=move.mist?'mistTurns':'safeguardTurns';attacker[key]=5;
      await this.battleText(`${attacker.name} è protetto da ${move.name} per 5 turni!`);
      this.updateBattleHUD();return 'field-protection';
    }
    if(move.id==='rest'){
      if(attacker.currentHp>=attacker.maxHp && !attacker.status){await this.battleText('Riposo fallisce: PS già al massimo!');return 'no-effect';}
      attacker.currentHp=attacker.maxHp;attacker.status='sleep';attacker.statusTurns=3;
      await this.battleText(`${attacker.name} recupera tutti i PS e si addormenta!`);
      this.updateBattleHUD();return 'rest';
    }
    if(move.delayedHit||['future-sight','doom-desire'].includes(move.id)){
      if(defender.futureSight){await this.battleText('Una previsione è già in corso!');return 'no-effect';}
      defender.futureSight={turns:3,attacker,move:{...move, power:move.power||80, type:'typeless',category:'special'}};
      await this.battleText(`${attacker.name} prevede un attacco futuro! L’impatto arriverà tra due turni.`);
      return 'future-sight';
    }
    if(move.id==='protect'){
      const streak=attacker.protectStreak||0;
      // FireRed/LeafGreen: consecutive Protection halves success each time,
      // bottoming out at 1/8 (ignoring the original Gen III overflow bug).
      const success=Math.random()<Math.pow(.5,Math.min(3,streak));
      attacker.protectStreak=success?streak+1:0;
      attacker.protectedThisTurn=success;
      await this.battleText(success?`${attacker.name} si protegge!`:'Protezione fallisce!');
      return;
    }
    attacker.protectStreak=0;
    const targetsOpponent=move.power>0||move.ailment||move.id==='leech-seed'||
      (move.statChange&&move.statChange.stage<0)||
      (move.statChanges?.some(change=>change.stage<0)||false)||
      ['swagger','flatter'].includes(move.id);
    const airborne=defender.pendingCharge?.move?.id;
    if(targetsOpponent && airborne &&
       Object.prototype.hasOwnProperty.call(CHARGE_UNTOUCHABLE,airborne) &&
       !CHARGE_UNTOUCHABLE[airborne].includes(move.id)){
      this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;await this.battleText(`${defender.name} evita l'attacco mentre si prepara!`);
      return 'charging-evasion';
    }
    if(defender.protectedThisTurn && targetsOpponent){
      this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;await this.battleText(`${defender.name} si protegge dall'attacco!`);
      return;
    }
    let resolvedMove=move;
    if(ROLLOUT_MOVES.has(move.id)){
      const power=move.power*Math.pow(2,attacker.rolloutHits||0)*(attacker.defenseCurlUsed?2:1);
      resolvedMove={...move,power};
    }
    if(move.id==='magnitude'){
      const outcome=rollMagnitude();
      resolvedMove={...move,power:outcome.power};
      await this.battleText(`Magnitudo ${outcome.level}!`);
    }
    await this.playAttackAnimation(move,target);
    const accuracy=move.alwaysHits?Infinity:Math.min(100,(move.accuracy??100)*(attacker.ability==='compound-eyes'?1.3:1) * accuracyStageMultiplier(attacker.statStages?.accuracy) /
      accuracyStageMultiplier(defender.statStages?.evasion));
    if(Math.random()*100 >= accuracy){this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;await this.battleText('Ma la mossa fallisce!');return;}
    let modifier=typeEffectiveness(move.type,defender.types);
    // Immunità da abilità: il colpo non infligge danni (con assorbimento dove previsto).
    const immunity=this.abilityAttackImmunity(defender,move,attacker);
    if(immunity){this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;this.updateBattleHUD();await this.battleText(immunity);return;}
    // Fixed-damage moves ignore offensive/defensive stats but still obey immunities.
    const fixedDamage=({'dragon-rage':40,'sonic-boom':20,'night-shade':attacker.level,
      'seismic-toss':attacker.level,'super-fang':Math.max(1,Math.floor(defender.currentHp/2))})[move.id]??null;
    if(move.power>0 || fixedDamage!==null){
      const count=attacker.ability==='skill-link' && move.maxHits>move.minHits?move.maxHits:rollMultiHitCount(move);
      let landed=0,totalDamage=0,anyCrit=false;
      for(let i=0;i<count && defender.currentHp>0 && attacker.currentHp>0;i++){
        // Triple Kick/Triple Axel check accuracy per additional kick.
        if(i>0 && ['triple-kick','triple-axel','population-bomb'].includes(move.id) && Math.random()*100>=accuracy)break;
        const hitMove=move.id==='triple-kick'||move.id==='triple-axel'
          ?{...resolvedMove,power:resolvedMove.power*(i+1)}:resolvedMove;
        const result=fixedDamage===null?calculateBattleDamage(attacker,defender,hitMove):
          {damage:modifier===0?0:Math.min(defender.currentHp,fixedDamage),effectiveness:modifier,critical:false};
        defender.currentHp=Math.max(0,defender.currentHp-result.damage);
        landed++;totalDamage+=result.damage;anyCrit ||= result.critical;
        if(result.damage>0 && move.id==='rapid-spin'){attacker.trappedTurns=0;attacker.trapMove=null;}
        if(result.damage>0 && ['wrap','bind','clamp','fire-spin','whirlpool','sand-tomb'].includes(move.id) && defender.currentHp>0 && !defender.trappedTurns){
          const roll=Math.random();
          defender.trappedTurns=roll<.375?2:roll<.75?3:roll<.875?4:5;
          defender.trapMove=move.name;defender.trapSource=attacker;
        }
        if(result.damage>0 && move.category==='physical' && attacker.currentHp>0 &&
          !attacker.status && defender.currentHp>0){
          const reactive={static:['paralysis',.30], 'poison-point':['poison',.30], 'flame-body':['burn',.30]};
          const reaction=reactive[defender.ability];
          if(reaction&&Math.random()<reaction[1]){attacker.status=reaction[0];attacker.statusTurns=3;}
        }
        if(move.drain>0 && result.damage>0)attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+Math.max(1,Math.floor(result.damage*move.drain/100)));
        if(move.drain<0 && result.damage>0 && attacker.ability!=='rock-head')attacker.currentHp=Math.max(0,attacker.currentHp-Math.max(1,Math.floor(result.damage*-move.drain/100)));
        this.updateBattleHUD();
        if(count>1){
          await this.battleText(`Colpo ${landed}: ${result.damage} danni${result.critical?' · BRUTTO COLPO!':''}`);
          if(i<count-1 && defender.currentHp>0 && attacker.currentHp>0)await this.wait(120);
        }
      }
      if(count>1)await this.battleText(`Colpito ${landed} ${landed===1?'volta':'volte'}!`);
      const reaction=modifier===0?'Non ha effetto…':modifier>1?'È superefficace!':modifier<1?'Non è molto efficace…':'';
      this.updateBattleHUD();
      if(count===1)await this.battleText(`${attacker.name} usa ${move.name}! ${totalDamage} danni. ${anyCrit?'⚡ BRUTTO COLPO! ':''}${reaction}`);
      else if(reaction)await this.battleText(reaction);
      // Rollout/Ice Ball lock the combatant for up to five consecutive turns.
      if(ROLLOUT_MOVES.has(move.id)){
        if(modifier===0 || defender.currentHp<=0 || attacker.currentHp<=0)this.stopRollout(attacker);
        else if(attacker.rolloutTurns>0){
          attacker.rolloutTurns--;attacker.rolloutHits++;
          if(attacker.rolloutTurns===0)this.stopRollout(attacker);
        }else{attacker.rolloutTurns=4;attacker.rolloutHits=1;attacker.rolloutMove=move;}
      }
    } else if(modifier===0 && move.power>0) {
      await this.battleText('Non ha effetto…');
    } else if(move.healing>0 || ['recover','rest'].includes(move.id)){
      const amount=Math.max(1,Math.floor(attacker.maxHp*(move.healing||50)/100));
      attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+amount);
      await this.battleText(`${attacker.name} recupera ${amount} PS!`);
    } else if(move.id==='leech-seed'){defender.seeded=true;await this.battleText(`${defender.name} è stato parassitato!`);
    } else if(!move.statChange && !move.ailment) await this.battleText(`${attacker.name} esegue ${move.name}!`);
    // All Pokémon stat changes (including two-stat buffs) need application.
    // Negative stages usually target the foe; statTarget handles self-debuffs.
    const changes=move.statChanges?.length?move.statChanges:(move.statChange?[move.statChange]:[]);
    for(const {stat,stage,chance} of changes){
      if(!((move.power===0 || defender.currentHp>0)&&(move.power===0 || modifier>0)))continue;
      if(Math.random()*100>=(chance??100))continue;
      const targetsSelf=move.statTarget==='user'||move.statTarget==='users-field'||
        (move.power>0&&['superpower','close-combat','overheat','draco-meteor','leaf-storm'].includes(move.id));
      const targetsFoe=move.statTarget==='selected-pokemon'||move.statTarget==='all-opponents'||
        ['swagger','flatter'].includes(move.id);
      const targetP=targetsSelf?attacker:targetsFoe?defender:stage<0?defender:attacker;
      const immune=stage<0 && targetP===defender && (['clear-body','white-smoke'].includes(targetP.ability)||
        (stat==='attack'&&targetP.ability==='hyper-cutter')||
        (stat==='accuracy'&&targetP.ability==='keen-eye')|| targetP.mistTurns>0);
      if(immune){await this.battleText(`${targetP.name} impedisce il calo delle statistiche!`);}
      else {
        const before=targetP.statStages[stat]||0;
        const after=Math.max(-6,Math.min(6,before+stage));
        targetP.statStages[stat]=after;
        if(move.id==='defense-curl' && targetP===attacker)attacker.defenseCurlUsed=true;
        await this.battleText(after===before?`${targetP.name}: ${STAT_LABELS_IT[stat]||stat} non può cambiare ancora!`:
          `${targetP.name}: ${STAT_LABELS_IT[stat]||stat} ${stage<0?'diminuisce':'aumenta'}!`);
      }
    }
    this.updateBattleHUD();
    const blocked=move.power>0 && defender.ability==='shield-dust';
    const ailmentChance=Math.min(100,(move.ailmentChance || (move.power===0?100:0))*(attacker.ability==='serene-grace'?2:1));
    if(move.ailment && !['none','leech-seed'].includes(move.ailment) &&
      (move.ailment==='confusion'?!defender.confusionTurns:!defender.status) && defender.currentHp>0 && (move.power===0 || modifier>0) &&
      !blocked && !(move.ailment==='confusion' && defender.ability==='own-tempo') &&
      !(defender.safeguardTurns>0) && !this.statusAbilityBlocks(defender,move.ailment) && Math.random()*100<ailmentChance) {
      if(move.ailment==='confusion')defender.confusionTurns=2+Math.floor(Math.random()*4);
      else {defender.status=move.ailment;defender.statusTurns=2+Math.floor(Math.random()*3);}
      await this.battleText(`${defender.name}: ${({poison:'avvelenamento','bad-poison':'iperavvelenamento',burn:'scottatura',paralysis:'paralisi',sleep:'sonno',freeze:'congelamento',confusion:'confusione'})[move.ailment]||'stato alterato'}!`);
      if(defender.ability==='synchronize' && !attacker.status && ['poison','burn','paralysis'].includes(move.ailment) &&
        !this.statusAbilityBlocks(attacker,move.ailment)){
        attacker.status=move.ailment;attacker.statusTurns=3;
      }
    }
    if(RECHARGE_MOVES.has(move.id)&&modifier>0&&move.power>0)attacker.rechargeTurns=1;
    if(RAMPAGE_MOVES.has(move.id)&&attacker.rampageTurns>0){
      attacker.rampageTurns--;
      if(attacker.rampageTurns===0){attacker.rampageMove=null;
        attacker.confusionTurns=2+Math.floor(Math.random()*3);
        await this.battleText(`${attacker.name} è confuso dopo l'attacco furioso!`);
      }
    }
    if(move.selfKo||['self-destruct','explosion'].includes(move.id)){
      attacker.currentHp=0;this.updateBattleHUD();
      await this.battleText(`${attacker.name} è esausto dopo ${move.name}!`);
    }
    if(!move.power && move.category==='status' && !move.screen && !move.delayedHit && !move.statChanges?.length &&
      !move.statChange && !move.ailment && !move.healing && !move.focusEnergy &&
      !move.mist && !move.safeguard && !move.resetStages && !move.copyStages &&
      !['protect','rest','haze','teleport','leech-seed','geomancy','defense-curl'].includes(move.id)){
      await this.battleText(`${move.name}: effetto non ancora supportato.`);
    }
    this.updateBattleHUD();await this.wait(420);
  }
  async enemyTurn(sameTurn=false){
    if(!sameTurn)this.beginBattleTurn();
    if(!this.enemyMon||this.enemyMon.currentHp<=0)return;
    this.battleBusy=true;
    const move=this.pickEnemyMove();
    const enemyResult=await this.applyMove(this.enemyMon,this.activeMon,move,'player');
    if(enemyResult==='battle-ended')return;
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    this.battleBusy=false;this.showMainActions();
  }
  async applyEndOfTurnEffects(){
    const combatants=[this.activeMon,this.enemyMon];
    for(const mon of combatants){
      if(!mon)continue;
      if(mon.futureSight){
        mon.futureSight.turns--;
        if(mon.futureSight.turns<=0){
          const pending=mon.futureSight;mon.futureSight=null;
          if(mon.currentHp>0){
            const hit=calculateBattleDamage(pending.attacker,mon,pending.move);
            mon.currentHp=Math.max(0,mon.currentHp-hit.damage);
            await this.battleText(`Divinazione colpisce ${mon.name} dopo l'attesa! ${hit.damage} danni.`);
            this.updateBattleHUD();
          }
        }
      }
      for(const [key,label] of [['reflectTurns','Riflesso'],['lightScreenTurns','Schermoluce'],
        ['safeguardTurns','Salvaguardia'],['mistTurns','Nebbia']]){
        if(mon[key]>0){mon[key]--;if(mon[key]===0)await this.battleText(`${label} di ${mon.name} svanisce!`);}
      }
      if(mon.currentHp<=0)continue;
      if(['burn','poison','bad-poison'].includes(mon.status)){
        if(mon.status==='bad-poison')mon.toxicTurns=(mon.toxicTurns||0)+1;
        const damage=Math.max(1,Math.floor(mon.maxHp*(mon.status==='bad-poison'?Math.min(15,mon.toxicTurns):2)/16));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        this.updateBattleHUD();await this.battleText(`${mon.name} subisce ${damage} danni da ${mon.status==='burn'?'scottatura':'veleno'}!`);
      }
      if(mon.trappedTurns>0 && mon.currentHp>0){
        const damage=Math.max(1,Math.floor(mon.maxHp/16));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        mon.trappedTurns--;
        this.updateBattleHUD();
        await this.battleText(`${mon.name} subisce ${damage} danni da ${mon.trapMove||'Avvolgibotta'}!`);
      }
      if(mon.seeded && mon.currentHp>0){
        const damage=Math.max(1,Math.floor(mon.maxHp/12));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        const leech=mon===this.activeMon?this.enemyMon:this.activeMon;
        leech.currentHp=Math.min(leech.maxHp,leech.currentHp+damage);
        this.updateBattleHUD();await this.battleText(`Parassiseme sottrae energia a ${mon.name}!`);
      }
    }
  }
  async onPlayerFainted(){
    const lost=this.activeMon;
    this.updateBattleHUD();this.$id('player-sprite').classList.add('faint-anim');
    await this.battleText(`${lost.name} è esausto e lascia definitivamente la squadra!`);
    this.team=this.team.filter(p=>p!==lost);
    this.battleParticipants.delete(lost);
    this.renderSidebar();
    this.$id('player-sprite').classList.remove('faint-anim');
    if(!this.team.some(p=>p.currentHp>0)){
      this.isRaidActive=false;this.battleToken++;
      this.$id('overlay-battle').classList.add('hidden');this.$id('battle-controls').classList.add('hidden');
      this.$id('rotom-body').classList.remove('battle-active');
      this.activeMon=null;this.renderSidebar();
      this.$id('gameover-overlay').classList.remove('hidden');return;
    }
    this.battleBusy=false;this.showTeamMenu(true);
  }
  async awardBattleExperience(mon, amount) {
    if(!this.team.includes(mon) || mon.currentHp<=0)return;
    const levelCap=this.getLevelCap();
    if(mon.level>=levelCap){
      await this.battleText(`${mon.name} ha già raggiunto il limite di livello ${levelCap}!`);
      this.updateBattleHUD();
      return;
    }
    const levelEvents=await mon.gainExperience(amount,levelCap);
    await this.battleText(`${mon.name} riceve ${amount} punti esperienza!`);
    this.renderSidebar();this.updateBattleHUD();
    for(const event of levelEvents){
      await this.battleText(`${mon.name} raggiunge il livello ${event.level}!`);
      if(event.evolution)await this.showEvolution(mon,event.evolution);
      for(const move of event.moves)await this.learnMove(move,mon);
    }
    this.renderSidebar();this.updateBattleHUD();
  }
  async handleBattleVictory(){
    const defeated=this.enemyMon;
    this.$id('enemy-sprite').classList.add('faint-anim');
    await this.battleText(`${defeated.name} è esausto!`);
    const expMultiplier=this.battleType==='gym'?GAME_BALANCE.expGymMultiplier:
      this.battleType==='trainer'?GAME_BALANCE.expTrainerMultiplier:1;
    const eligible=[...this.battleParticipants].filter(p=>this.team.includes(p)&&p.currentHp>0);
    // Participants earn the usual award. With EXP Share (after badge 2),
    // each healthy nonparticipant additionally receives half a scaled award.
    const shared=this.hasExpShare()&&this.expShareEnabled
      ?this.team.filter(mon=>mon.currentHp>0&&!eligible.includes(mon)):[];
    for(const mon of [...eligible,...shared]){
      mon.gainEffortValues(defeated.evYield);
      const earned=scaledBattleExperience(defeated.baseExperience,defeated.level,mon.level,expMultiplier);
      const reward=shared.includes(mon)?Math.max(1,Math.round(earned*.5)):
        mon===this.activeMon?earned:Math.max(1,Math.round(earned*.55));
      await this.awardBattleExperience(mon,reward);
    }
    if(this.battleType==='mewtwo'){
      if(this.celestialPhase==='trial'){
        this.celestialPhase='rematch';this.endBattle('Hai sconfitto Mewtwo!');
        this.isLocked=true;
        setTimeout(()=>{if(this.isCelestialCave&&this.celestialPhase==='rematch')this.showOakMasterBallReward();},this.gameDelay(550));
      }else{this.completeMewtwoEncounter();this.endBattle('Hai sconfitto nuovamente Mewtwo!');}
      return;
    }
    if(this.battleType==='gym'&&this.gymQueue.length>0){
      await this.advanceGymAfterVictory();return;
    }
    if(this.isRaidActive){
      this.raidQueueCount--;
      if(this.raidQueueCount>0){
        await this.battleText(`RAID · Restano ${this.raidQueueCount} avversari!`);
        await this.startBattle('wild',true);return;
      }
      this.isRaidActive=false;this.endBattle('RAID SUPERATO! Hai vinto tutte e cinque le sfide!');return;
    }
    if(['trainer','gym'].includes(this.battleType)){
      const reward=Math.max(100,Math.round((defeated.level*18+(this.battleType==='gym'?180:0))/10)*10);
      this.money+=reward;this.endBattle(`Vittoria contro ${defeated.name}! +${reward} Pokécoins.`);
    } else this.endBattle(`Vittoria contro ${defeated.name}!`);
  }
  async learnMove(move, pokemon=this.activeMon){
    if(pokemon.moves.some(m=>m.id===move.id))return;
    if(pokemon.moves.length<4){pokemon.moves.push(move);await this.battleText(`${pokemon.name} impara ${move.name}!`);return;}
    return new Promise(resolve=>{
      this.moveChoiceResolve=resolve;this.pendingMove=move;this.learningMon=pokemon;
      this.$id('learn-move-overlay').classList.remove('hidden');
      this.$id('learn-move-text').textContent=`${pokemon.name} vuole imparare ${move.name}. Quale mossa deve dimenticare?`;
      const list=this.$id('forget-moves-list');list.innerHTML='';
      pokemon.moves.forEach((old,i)=>{
        const b=document.createElement('button');b.className='act-btn';b.textContent=`${old.name} → ${move.name}`;
        b.onclick=()=>this.resolveMoveChoice(i);list.appendChild(b);
      });
    });
  }
  resolveMoveChoice(index){
    if(this.moveChoiceResolve){
      if(index!==null && this.pendingMove){this.learningMon.moves[index]=this.pendingMove;this.setBattleMsg(`${this.learningMon.name} impara ${this.pendingMove.name}!`);}
      this.$id('learn-move-overlay').classList.add('hidden');
      const resolve=this.moveChoiceResolve;this.moveChoiceResolve=null;this.pendingMove=null;resolve();
    }else this.$id('learn-move-overlay').classList.add('hidden');
  }
  endBattle(msg){
    this.acknowledgeDialogue();
    this.battleToken++;this.battleBusy=false;this.pendingForcedSwitch=false;this.battleMode=null;
    this.pendingItemTarget=null;this.$id('item-target-prompt').classList.add('hidden');
    this.team.forEach(p=>{p.clearBattleConditions();p.protectedThisTurn=false;p.protectStreak=0;});
    this.closePartyActions();this.closePokemonInfo();
    this.ensureActivePokemon();
    this.enemyMon?.clearBattleConditions();
    this.$id('overlay-battle').classList.add('hidden');
    this.$id('overlay-battle').classList.remove('battle-preparing');
    this.$id('battle-controls').classList.add('hidden');
    this.$id('rotom-body').classList.remove('battle-active');
    this.$id('battle-confirm').classList.add('hidden');
    this.$id('enemy-sprite').classList.remove('faint-anim','hidden');
    this.$id('player-sprite').classList.remove('faint-anim');
    this.isLocked=false;this.logMsg(msg);this.renderSidebar();
    window.pokexplorerMusic?.setScene(this.isCelestialCave?'cave':'exploration');
    if(this.isCelestialCave)this.renderDungeon();
  }

  showDiscoveryNotice(message, duration=2800) {
    let notice=document.getElementById('discovery-notice');
    if(!notice) {
      notice=document.createElement('div');
      notice.id='discovery-notice';
      notice.setAttribute('role','status');
      notice.setAttribute('aria-live','polite');
      (this.$id('pokenav-screen-root') || document.body).appendChild(notice);
    }
    clearTimeout(this.discoveryNoticeTimer);
    notice.textContent=this.localize(message);
    notice.classList.toggle('raid-notice',message.includes('RAID'));
    notice.classList.add('visible');
    if(duration>0)this.discoveryNoticeTimer=setTimeout(()=>notice.classList.remove('visible'),duration);
  }

  waitForNotice(){
    return new Promise(resolve=>{
      let registered=false;
      const finish=event=>{
        if(event.type==='keydown' && !['Enter',' ','Escape'].includes(event.key))return;
        event.preventDefault();event.stopImmediatePropagation();
        document.removeEventListener('pointerdown',finish,true);
        document.removeEventListener('keydown',finish,true);
        this.$id('discovery-notice')?.classList.remove('visible');
        resolve();
      };
      setTimeout(()=>{
        document.addEventListener('pointerdown',finish,true);
        document.addEventListener('keydown',finish,true);
      },60);
    });
  }

  logMsg(text) { document.getElementById('log-status-text').textContent = this.localize(text); }

  isBadgeEarned(id){
    const names=['Sasso','Cascata','Tuono','Arcobaleno','Anima','Palude','Vulcano','Terra'];
    return this.badges.some((badge,index)=>typeof badge==='object'?Number(badge.id)===id:
      String(badge).toLowerCase()===names[id].toLowerCase()||index===id);
  }
  renderBadges() {
    const container=this.$id('badges-container');
    const gallery=this.$id('badge-case-grid');
    const count=Array.from({length:8},(_,i)=>this.isBadgeEarned(i)).filter(Boolean).length;
    if(container){
      container.replaceChildren();
      const stat=document.createElement('span');stat.className='badge-case-count';
      stat.textContent=`${count} / 8 MEDAGLIE`;container.append(stat);
    }
    if(!gallery)return;
    gallery.replaceChildren();
    const names=['Sasso','Cascata','Tuono','Arcobaleno','Anima','Palude','Vulcano','Terra'];
    for(let i=0;i<8;i++){
      const earned=this.isBadgeEarned(i);
      const slot=document.createElement('div');
      slot.className='badge-case-slot'+(earned?' earned':' locked');
      const image=document.createElement('img');image.className='badge-case-image';
      image.src=this.badgeSprites[i];image.alt=`Medaglia ${names[i]}`;image.draggable=false;
      slot.setAttribute('aria-label',`Medaglia ${names[i]}: ${earned?'ottenuta':'da ottenere'}`);
      const title=document.createElement('strong');title.textContent=names[i];
      const state=document.createElement('small');state.textContent=earned?'OTTENUTA':'DA OTTENERE';
      slot.append(image,title,state);gallery.append(slot);
    }
    const summary=this.$id('badge-case-progress');
    if(summary)summary.textContent=`${count} DI 8 MEDAGLIE CONQUISTATE`;
  }
  openBadgeCase(){
    this.closePartyActions();this.stopContinuousWalk();this.renderBadges();
    this.$id('badge-case-overlay')?.classList.remove('hidden');
  }
  closeBadgeCase(){this.$id('badge-case-overlay')?.classList.add('hidden');}

  closePartyActions(){
    this.partyMenuPokemon=null;this.partyMoveSource=null;
    const drawer=this.$id('party-action-menu');
    drawer?.classList.add('hidden');
    if(drawer?.classList.contains('is-portal')){
      drawer.classList.remove('is-portal');
      this.$id('rotom-container')?.querySelector('.rotom-wing-left')?.appendChild(drawer);
    }
    this.$id('rotom-container')?.classList.remove('party-drawer-open');
    this.$id('party-move-hint')?.classList.add('hidden');
    this.$id('party-send-action')?.classList.add('hidden');
  }
  openPartyActions(pokemon){
    if(!pokemon||!this.team.includes(pokemon)||this.pendingItemTarget||this.adventureCompleted||
      (this.isLocked&&!this.isBattleVisible())||this.battleBusy||this.dialogueResolve)return;
    if(this.partyMoveSource){
      this.completePartyReorder(pokemon);return;
    }
    this.stopContinuousWalk();
    this.partyMenuPokemon=pokemon;
    this.$id('party-action-title').textContent=`${pokemon.name} · Lv.${pokemon.level}`;
    const drawer=this.$id('party-action-menu');
    if(window.matchMedia?.('(max-width: 1020px)').matches){
      document.body.appendChild(drawer);
      drawer.classList.add('is-portal');
    }else{
      this.$id('rotom-container')?.querySelector('.rotom-wing-left')?.appendChild(drawer);
      drawer.classList.remove('is-portal');
    }
    drawer.classList.remove('hidden');
    this.$id('rotom-container')?.classList.add('party-drawer-open');
    const battle=this.isBattleVisible();
    this.$id('party-move-action').disabled=battle;
    this.$id('party-lead-action').classList.add('hidden');
    this.$id('party-move-action').title=battle?'Riordina la squadra fuori dalla battaglia.':'';
    this.$id('party-send-action').classList.toggle('hidden',!battle || pokemon===this.activeMon || pokemon.currentHp<=0);
    this.renderSidebar();
  }
  setActivePartyPokemon(pokemon){
    if(!pokemon||!this.team.includes(pokemon)||pokemon.currentHp<=0||
      this.isBattleVisible()||this.isLocked||this.pendingItemTarget)return false;
    const position=this.team.indexOf(pokemon);
    this.team.splice(position,1);
    this.team.unshift(pokemon);
    this.activeMon=pokemon;
    this.closePartyActions();
    this.renderSidebar();
    this.logMsg(`${pokemon.name} è ora il Pokémon attivo!`);
    return true;
  }
  beginPartyReorder(){
    const selected=this.partyMenuPokemon;
    if(!selected||this.isBattleVisible()||this.isLocked||this.pendingItemTarget)return;
    this.partyMoveSource=selected;
    this.$id('party-move-hint').textContent='Scegli il Pokémon con cui scambiare la posizione. Gli slot vuoti non sono validi.';
    this.$id('party-move-hint').classList.remove('hidden');
    this.renderSidebar();
  }
  completePartyReorder(other){
    const first=this.partyMoveSource;
    if(!first||!other||first===other||!this.team.includes(other)||!this.team.includes(first))return;
    const a=this.team.indexOf(first),b=this.team.indexOf(other);
    [this.team[a],this.team[b]]=[this.team[b],this.team[a]];
    // Party position 1 is the lead in subsequent battles.
    this.activeMon=this.team.find(mon=>mon.currentHp>0)||null;
    this.closePartyActions();
    this.renderSidebar();
    this.logMsg(`Posizioni scambiate! ${this.activeMon?.name||this.team[0].name} è il Pokémon in testa.`);
  }
  async getPokedexDescription(kind,id,locale=this.locale){
    const cache=kind==='ability'?this.abilityDescriptionCache:this.moveDescriptionCache;
    const key=`${id}:${locale}`;
    if(!cache.has(key))cache.set(key,(async()=>{
      try{
        const response=await fetch(`https://pokeapi.co/api/v2/${kind}/${encodeURIComponent(id)}`);
        if(!response.ok)return '';
        const data=await response.json();
        // Flavor text has broader Italian coverage than the formal effect entries.
        const entries=data.flavor_text_entries||[];
        const preferred=entries.filter(v=>v.language?.name===locale && (v.flavor_text||v.text));
        const text=(preferred.at(-1)||entries.find(v=>v.language?.name==='en')||{});
        const effect=(data.effect_entries||[]).find(v=>v.language?.name===locale)||
          (data.effect_entries||[]).find(v=>v.language?.name==='en');
        return String(text.flavor_text||text.text||effect?.short_effect||'').replace(/[\n\f]+/g,' ').replace(/\s+/g,' ').trim();
      }catch(_error){return '';}
    })());
    return cache.get(key);
  }
  async populatePokedexDescriptions(pokemon,requestId){
    const lang=this.locale;
    const abilityId=pokemon.ability;
    const abilityText=await this.getPokedexDescription('ability',abilityId,lang);
    if(this.partyInfoPokemon!==pokemon||requestId!==this.pokemonInfoRequest)return;
    this.$id('pokemon-info-ability-description').textContent=abilityText||
      (lang==='en'?'Description unavailable offline.':'Descrizione non disponibile offline.');
    await Promise.all(pokemon.moves.map(async(move,index)=>{
      const description=await this.getPokedexDescription('move',move.id,lang);
      if(this.partyInfoPokemon!==pokemon||requestId!==this.pokemonInfoRequest)return;
      const node=this.$id('pokemon-info-moves').children[index]?.querySelector('.move-description');
      if(node)node.textContent=description||
        (lang==='en'?'Description unavailable offline.':'Descrizione non disponibile offline.');
    }));
  }
  async resolveAbilityName(pokemon){
    if(!pokemon?.ability || pokemon.ability==='none')return;
    const id=pokemon.ability;
    if(!this.abilityInfoCache)this.abilityInfoCache=new Map();
    if(!this.abilityInfoCache.has(id)){
      const request=fetch(`https://pokeapi.co/api/v2/ability/${encodeURIComponent(id)}`)
        .then(r=>r.ok?r.json():null)
        .then(data=>data?.names?.find(n=>n.language?.name==='it')?.name||null)
        .catch(()=>null);
      this.abilityInfoCache.set(id,request);
    }
    const italian=await this.abilityInfoCache.get(id);
    if(!italian)return;
    pokemon.abilityName=italian;
    if(this.partyInfoPokemon===pokemon && !this.$id('pokemon-info-overlay').classList.contains('hidden')){
      this.$id('pokemon-info-ability').textContent=`ABILITÀ: ${italian}`;
    }
  }
  openPokemonInfo(pokemon){
    if(!pokemon||!this.team.includes(pokemon))return;
    this.partyInfoPokemon=pokemon;
    this.$id('pokemon-info-name').textContent=pokemon.name;
    this.$id('pokemon-info-sprite').src=pokemon.spriteFront||'';
    this.$id('pokemon-info-sprite').alt=`${pokemon.name} di fronte`;
    this.$id('pokemon-info-level').textContent=`LIVELLO ${pokemon.level}`;
    const typeIt={grass:'Erba',fire:'Fuoco',water:'Acqua',normal:'Normale',electric:'Elettro',poison:'Veleno',bug:'Coleottero',flying:'Volante',ground:'Terra',rock:'Roccia',ghost:'Spettro',psychic:'Psico',ice:'Ghiaccio',fighting:'Lotta',dragon:'Drago',dark:'Buio',steel:'Acciaio',fairy:'Folletto'};
    this.$id('pokemon-info-types').textContent=`TIPO: ${pokemon.types.map(t=>typeIt[t]||t).join(' / ').toUpperCase()}`;
    const nature=pokemon.nature||POKEMON_NATURES[0];
    const delta=nature[1]===nature[2]?'neutra':`+${STAT_LABELS_IT[nature[1]]} / −${STAT_LABELS_IT[nature[2]]}`;
    this.$id('pokemon-info-nature').textContent=`NATURA: ${nature[0]} (${delta})`;
    this.$id('pokemon-info-ability').textContent=`${this.locale==='en'?'ABILITY':'ABILITÀ'}: ${pokemon.abilityName||'—'}`;
    this.$id('pokemon-info-ability-description').textContent=this.locale==='en'?'Loading ability…':'Caricamento abilità…';
    this.$id('pokemon-info-hero').className=`pokemon-info-hero type-${pokemon.type}`;
    const stats=this.$id('pokemon-info-stats');stats.replaceChildren();
    const values=pokemon.getStatsSummary();
    for(const [key,label] of Object.entries(STAT_LABELS_IT)){
      const tile=document.createElement('div');tile.className='pokemon-info-stat';
      const name=document.createElement('span');name.textContent=label;
      const value=document.createElement('em');value.textContent=key==='hp'?`${pokemon.currentHp}/${values[key]}`:values[key];
      if(nature[1]!==nature[2])value.classList.add(nature[1]===key?'raised':nature[2]===key?'lowered':'neutral');
      tile.append(name,value);stats.append(tile);
    }
    const moves=this.$id('pokemon-info-moves');moves.replaceChildren();
    for(const move of pokemon.moves){
      const tile=document.createElement('div'),name=document.createElement('span'),extra=document.createElement('small');
      name.textContent=move.name;extra.textContent=`${(typeIt[move.type]||move.type).toUpperCase()} · POT ${move.power||'—'} · PREC ${move.alwaysHits?'—':move.accuracy+'%'} · PP ${move.currentPp}/${move.maxPp}`;
      const description=document.createElement('small');description.className='move-description';
      description.textContent=this.locale==='en'?'Loading description…':'Caricamento descrizione…';
      tile.append(name,extra,description);moves.append(tile);
    }
    this.$id('pokemon-info-overlay').classList.remove('hidden');
    void this.resolveAbilityName(pokemon);
    void this.populatePokedexDescriptions(pokemon,++this.pokemonInfoRequest);
  }
  closePokemonInfo(){this.pokemonInfoRequest++;this.partyInfoPokemon=null;this.$id('pokemon-info-overlay')?.classList.add('hidden');}
  renderSidebar() {
    this.$id('buy-super-potion-btn')?.classList.toggle('hidden',this.floor<21);
    this.$id('buy-hyper-potion-btn')?.classList.toggle('hidden',this.floor<51);
    this.$id('floor-num').textContent=this.floor;
    this.$id('player-money').textContent=`$${this.money}`;
    const radarCount=this.$id('radar-charge-count');
    if(radarCount)radarCount.textContent=`${this.locale==='en'?'SCANS':'SCANSIONI'}: ${this.radarCharges===Infinity?'∞':this.radarCharges}`;
    const radarButton=this.$id('btn-scan-radar');
    if(radarButton){
      radarButton.classList.remove('hidden');
      radarButton.classList.toggle('radar-empty',this.radarCharges===0);
      radarButton.classList.toggle('radar-infinite',this.radarCharges===Infinity);
    }
    const bag=this.$id('bag-list');bag.innerHTML='';
    const categories={
      rimedi:[['potion','Pozione','potion'],['superPotion','Superpozione','superPotion'],['hyperPotion','Iperpozione','hyperPotion'],['elixir','Elisir','elixir'],
        ...(this.devMode?[['rareCandy','Caramella Rara','rare-candy-game'],['goldCandy','Caramella d’Oro','gold-candy-game']]:[])],
      pokeball:[['pokeball','Poké Ball','poke-ball'],['masterball','Master Ball','master-ball']],
      chiave:[]
    };
    document.querySelectorAll('[data-bag-tab]').forEach(tab=>{
      const active=tab.dataset.bagTab===this.bagCategory;
      tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));
    });
    const inBattle=!this.$id('overlay-battle')?.classList.contains('hidden');
    for(const [id,label,file] of categories[this.bagCategory]){
      const b=document.createElement('button');b.className='bag-item';
      if(file){
        b.innerHTML=`<img src="${itemImage(id)}" alt=""><span>${label}</span><strong>×${this.items[id]}</strong>`;
      }else{
        const symbol=document.createElement('span');symbol.className='dev-candy-symbol';
        symbol.textContent='';
        const name=document.createElement('span');name.textContent=label;
        const quantity=document.createElement('strong');quantity.textContent=`×${this.items[id]}`;
        b.append(symbol,name,quantity);
      }
      b.disabled=!(this.team.length>0&&!this.pendingItemTarget&&!this.battleBusy&&!this.adventureCompleted&&this.items[id]>0 && (!this.isLocked||inBattle)) ||
        (['rareCandy','goldCandy'].includes(id) && (inBattle||this.devUpgradeInProgress||!this.team.some(mon=>mon.level<100)));
      b.onclick=()=>this.chooseBattleItem(id);
      bag.appendChild(b);
    }
    if(this.bagCategory==='chiave'){
      const rod=document.createElement('div');rod.className='bag-rod';
      rod.replaceChildren();
      const rodSprite=document.createElement('img');rodSprite.src=itemImage('fishingRod');
      rodSprite.alt='';rodSprite.width=22;rodSprite.height=22;
      rod.append(rodSprite,document.createTextNode(` Canna da pesca: ${this.items.fishingRod?'ottenuta':'non ancora ottenuta'}`));
      bag.appendChild(rod);
      if(this.hasExpShare()){
        const toggle=document.createElement('button');toggle.type='button';
        toggle.className='bag-item';toggle.id='toggle-exp-share';
        toggle.innerHTML=`<img src="${itemImage('expShare')}" alt="" width="22" height="22">`;
        toggle.append(document.createTextNode(` Condividi Esp.: ${this.expShareEnabled?'ON':'OFF'}`));
        toggle.disabled=this.battleBusy||this.adventureCompleted;
        toggle.onclick=()=>this.toggleExpShare();
        bag.appendChild(toggle);
      }
    }
    const team=this.$id('team-grid');team.innerHTML='';
    // A small status indicator, not a visual redesign of the original RotomDex.
    let progress=this.$id('party-progression-status');
    if(!progress){progress=document.createElement('div');progress.id='party-progression-status';
      progress.setAttribute('role','status');team.parentNode.insertBefore(progress,team);}
    progress.textContent=this.locale==='en'?`PARTY ${this.team.length}/${this.getTeamSlotLimit()} · LV CAP ${this.getLevelCap()}`:`SQUADRA ${this.team.length}/${this.getTeamSlotLimit()} · CAP LV.${this.getLevelCap()}`;
    for(let i=0;i<6;i++){
      const p=this.team[i];const slot=document.createElement('button');
      if(!p){
        const locked=i>=this.getTeamSlotLimit();
        slot.className=`team-slot empty ${locked?'locked':''}`;
        slot.setAttribute('aria-label',locked?`Slot ${i+1} bloccato: servono altre medaglie`:`Slot ${i+1} libero`);
        slot.innerHTML='<div class="team-slot-empty" aria-hidden="true"></div>';
        slot.disabled=true;
      }
      else {
        const hp=Math.max(0,Math.floor(100*p.currentHp/p.maxHp));
        const hpState=this.hpColorState(p);
        slot.className=`team-slot ${p===this.activeMon?'active':''} ${p.currentHp<=0?'fainted':''} type-${p.type} ${this.pendingItemTarget?(p.currentHp>0?'item-target-valid':'item-target-invalid'):''} ${this.partyMoveSource===p?'swap-choice':''} ${this.partyMoveSource&&p!==this.partyMoveSource?'move-destination':''}`;
        slot.innerHTML=`<div class="slot-top"><span>${p.name}</span><span>Lv.${p.level}</span></div>
          <img class="team-slot-img" src="${p.spriteFront}" alt="${p.name}">
          <div class="team-hp-bg"><div class="team-hp-fill hp-${hpState}" style="width:${hp}%"></div></div><div class="team-hp-text">${p.currentHp}/${p.maxHp} PS</div>`;
        slot.disabled=(inBattle && this.battleBusy) || (p.currentHp<=0 && !this.pendingItemTarget);
        slot.onclick=()=>{
          if(this.pendingItemTarget){this.giveItemToPokemon(p);return;}
          this.openPartyActions(p);
        };
      }
      team.appendChild(slot);
    }
    this.translateVisibleUI();
  }

}