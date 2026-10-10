// FireRed / LeafGreen overworld sprites from pret/pokefirered.
// Each source image is a horizontal spritesheet (16x32 per frame).
// Attribution / asset origin: https://github.com/pret/pokefirered
const FIRERED_OVERWORLD_BASE = 'https://raw.githubusercontent.com/pret/pokefirered/master/graphics/object_events/pics/people/';
const FIRERED_NPC_NAMES = ['youngster', 'lass', 'balding_man', 'old_woman', 'cooltrainer_m', 'cooltrainer_f', 'picnicker', 'camper', 'nurse', 'policeman', 'hiker', 'scientist', 'rich_boy', 'sailor', 'gentleman', 'clerk'];
const FIRERED_RED_OVERWORLD = `${FIRERED_OVERWORLD_BASE}red_normal.png`;
const TRAINER_PORTRAIT_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';
// Original FireRed five-frame backsprite, first 64x64 frame used for the opening throw.
const RED_FIRERED_BACK_SHEET = 'https://raw.githubusercontent.com/pret/pokefirered/master/graphics/trainers/back_pics/red_back_pic.png';
// Balancing knobs in one place: progression is intentionally slower than V7.
const GAME_BALANCE = Object.freeze({raidChancePerItem: 0.10, wildEncounterChance: .20,
  earlyWildMaxLevel:3, earlyTrainerMaxLevel:5, earlyFloors:5,
  levelPerFloor:.52, expTrainerMultiplier:1.25, expGymMultiplier:1.45});
const BAG_LIMITS=Object.freeze({potion:10,elixir:10,pokeball:20,fishingRod:1});
/** Level-scaled experience inspired by the main-series scaled EXP system. */
function scaledBattleExperience(baseYield, defeatedLevel, recipientLevel, trainerMultiplier=1){
  const base=Math.max(20,Number(baseYield)||60), enemy=Math.max(1,defeatedLevel), player=Math.max(1,recipientLevel);
  const levelRatio=Math.pow((2*enemy+10)/(enemy+player+10),2.5);
  return Math.max(1,Math.floor((base*enemy/7)*levelRatio*trainerMultiplier));
}

// Otto capipalestra di Kanto: composizioni dedicate (Misty secondo la richiesta: Squirtle + Starmie).
const KANTO_GYMS = [
  {name:'Brock', badge:'Sasso', badgeId:0, specialty:'ROCCIA', sprite:'brock-gen3', pokemon:[74,95]},
  {name:'Misty', badge:'Cascata', badgeId:1, specialty:'ACQUA', sprite:'misty-gen3', pokemon:[7,121]},
  {name:'Lt. Surge', badge:'Tuono', badgeId:2, specialty:'ELETTRO', sprite:'ltsurge-gen3', pokemon:[100,25,26]},
  {name:'Erika', badge:'Arcobaleno', badgeId:3, specialty:'ERBA', sprite:'erika-gen3', pokemon:[114,70,45]},
  {name:'Koga', badge:'Anima', badgeId:4, specialty:'VELENO', sprite:'koga-gen3', pokemon:[109,89,110]},
  {name:'Sabrina', badge:'Palude', badgeId:5, specialty:'PSICO', sprite:'sabrina-gen3', pokemon:[64,122,65]},
  {name:'Blaine', badge:'Vulcano', badgeId:6, specialty:'FUOCO', sprite:'blaine-gen3', pokemon:[58,77,78,59]},
  {name:'Giovanni', badge:'Terra', badgeId:7, specialty:'TERRA', sprite:'giovanni-gen3', pokemon:[111,51,31,34]}
];

class GameEngine {
  constructor() {
    this.gridSize = 10;
    this.playerPos = { x: 0, y: 0 };
    this.floor = 1;
    this.money = 600;
    this.team = [];
    this.activeMon = null;
    this.enemyMon = null;
    this.items = { pokeball: 5, potion: 3, elixir: 1, fishingRod: false };
    this.radarCharges=3; this.playerFacing='down';
    this.badges = [];
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

    // Variabili per la gestione della catena Raid Pokémon (5 sfide consecutive)
    this.isRaidActive = false;
    this.raidQueueCount = 0;

    this.trainerSprites = [
      "https://play.pokemonshowdown.com/sprites/trainers/bugcatcher-gen3.png",
      "https://play.pokemonshowdown.com/sprites/trainers/youngster-gen3.png",
      "https://play.pokemonshowdown.com/sprites/trainers/lass-gen3.png"
    ];
    // Named FireRed/LeafGreen NPC sheets: appearance is fixed, not generated.
    this.npcSprites = FIRERED_NPC_NAMES.map(name => `${FIRERED_OVERWORLD_BASE}${name}.png`);
    this.npcFallbacks = Array.from({length: 12}, (_, i) =>
      `assets/npc/npc-${String(i + 1).padStart(2, '0')}.svg`);
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
    this.badgeSprites = KANTO_GYMS.map((_, i) => `assets/badges/badge-${i + 1}.svg`);

    this.bindEvents();
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
      'wild-encounter-overlay','pokemart-overlay','box-pc-overlay',
      'npc-dialog-overlay','learn-move-overlay','evolution-overlay','battle-confirm']){
      this.$id(id)?.classList.add('hidden');
    }
    this.$id('rotom-body')?.classList.remove('battle-active');
    this.$id('main-menu-overlay').classList.remove('hidden');
    this.floor=1;this.money=600;this.playerPos={x:0,y:0};
    this.team=[];this.activeMon=null;this.enemyMon=null;
    this.gridMap=[];this.badges=[];this.completedGymFloors.clear();
    this.selectedStarterData=null;this.adventureCompleted=false;
    this.gymQueue=[];this.gymLeaderIndex=0;this.currentGym=null;
    this.battleParticipants.clear();this.battleBusy=false;
    this.pendingForcedSwitch=false;this.isRaidActive=false;this.raidQueueCount=0;
    this.battleMode=null;this.isLocked=false;this.battleConfirmAction=null;
    this.items={pokeball:5,potion:3,elixir:1,fishingRod:false};
    this.radarCharges=3;this.playerFacing='down';
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
    const officialBack = new Image();
    officialBack.onload = () => {
      this.redBackSheetReady = true;
      const red=this.$id('player-trainer-sprite');
      if(red){red.style.backgroundImage=`url('${RED_FIRERED_BACK_SHEET}')`;red.classList.add('red-sheet-ready');}
    };
    officialBack.onerror = () => { this.redBackSheetReady=false; };
    officialBack.src=RED_FIRERED_BACK_SHEET;
    this.preloadedTrainerImages.push(officialBack);
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
    const animation=element.animate(frames,{duration,easing,fill:'none'});
    try{await animation.finished;}catch(e){ /* Battles may cancel animations on exit. */ }
  }

  battleSpritePosition(side){
    const stage=this.$id('battle-stage').getBoundingClientRect();
    const sprite=this.$id(side==='enemy'?'enemy-sprite':'player-sprite').getBoundingClientRect();
    // Visible sprite center, not a corner of its image box.
    return {x:sprite.left-stage.left+sprite.width*.50,
      y:sprite.top-stage.top+sprite.height*.54};
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

    safeOnClick('btn-act-fight', () => this.showMoves());
    safeOnClick('btn-move-back', () => this.showMainActions());

    safeOnClick('btn-act-run', () => {
      if(this.battleConfirmAction)return;
      if (this.isRaidActive || this.battleType === 'gym' || this.battleType === 'trainer') {
        this.setBattleMsg("Non puoi fuggire da questa sfida!");
        return;
      }
      if (this.battleBusy || this.pendingForcedSwitch) return;
      this.endBattle("Sei fuggito dalla battaglia!");
    });

    safeOnClick('btn-start-trainer-battle', () => {
      document.getElementById('trainer-encounter-overlay').classList.add('hidden');
      const screenRoot = document.getElementById('pokenav-screen-root');
      screenRoot.classList.add('battle-transition-flash');
      setTimeout(() => {
        screenRoot.classList.remove('battle-transition-flash');
        this.startBattle(this.gymQueue.length > 0 ? 'gym' : 'trainer');
      }, 600);
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
        this.startBattle('wild');
      }, 600);
    });

    safeOnClick('buy-pokeball-btn', () => this.purchaseItem('pokeball',200));
    safeOnClick('buy-potion-btn', () => this.purchaseItem('potion',150));
    safeOnClick('buy-elixir-btn', () => this.purchaseItem('elixir',400));
    safeOnClick('buy-rod-btn', () => this.purchaseItem('fishingRod',500));
    safeOnClick('buy-radar-btn', () => this.purchaseRadar());

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

    safeOnClick('btn-dpad-up', () => this.movePlayer(0, -1));
    safeOnClick('btn-dpad-down', () => this.movePlayer(0, 1));
    safeOnClick('btn-dpad-left', () => this.movePlayer(-1, 0));
    safeOnClick('btn-dpad-right', () => this.movePlayer(1, 0));

    window.addEventListener('keydown', (e) => {
      if (this.isLocked || this.battleConfirmAction || e.target?.closest?.('input,textarea,[contenteditable]')) return;
      const directions={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],
        ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};
      const step=directions[e.key];if(!step)return;
      e.preventDefault();this.movePlayer(...step);
    });
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
    this.gridMap = [];
    this.playerPos = { x: 0, y: 0 };
    this.isLocked = false;
    this.isRaidActive = false;
    this.raidQueueCount = 0;
    this.gymQueue = [];
    this.currentGym = null;
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
      // Every item Poké Ball has a 10% surprise raid chance on pickup.
      // No mandatory raid cell is generated: some floors have none, others may have more than one.
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
        const c=pick(); if(c)c.entity='item';
      }

    }

    if(isCity || isVillage){
      for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
    } else this.revealArea(0,0);
    this.renderDungeon();
    this.renderSidebar();
    this.logMsg(`Sei arrivato al Livello ${this.floor}. Esplora liberamente!`);
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
    if(this.radarCharges<=0){this.logMsg('Radar esaurito: acquista un utilizzo al Pokémarket (2.000 Pokécoins).');return;}
    this.radarCharges--;
    for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
    this.renderDungeon();this.renderSidebar();
    this.logMsg(`Rotom Radar attivato! Utilizzi rimanenti: ${this.radarCharges}.`);
  }

  grantItem(id,count=1){
    const limit=BAG_LIMITS[id]; if(limit===undefined)return false;
    if(id==='fishingRod'){if(this.items.fishingRod)return false;this.items.fishingRod=true;return true;}
    const available=Math.max(0,limit-(this.items[id]||0));
    if(!available)return false;
    this.items[id]+=Math.min(available,count);return true;
  }
  purchaseItem(id,price){
    if(this.money<price){this.logMsg(`Pokécoins insufficienti: servono ${price}.`);return false;}
    if(!this.grantItem(id)){this.logMsg('Capacità massima raggiunta!');return false;}
    this.money-=price;this.renderSidebar();this.logMsg('Acquisto completato!');return true;
  }
  purchaseRadar(){
    if(this.money<2000){this.logMsg('Servono 2.000 Pokécoins per una scansione.');return false;}
    this.money-=2000;this.radarCharges++;this.renderSidebar();
    this.logMsg(`Radar +1 · Ora hai ${this.radarCharges} scansioni.`);return true;
  }

  movePlayer(dx, dy) {
    if (this.isLocked || this.adventureCompleted || !this.gridMap?.length) return;
    this.playerFacing=dx<0?'left':dx>0?'right':dy<0?'up':'down';
    const nx = this.playerPos.x + dx;
    const ny = this.playerPos.y + dy;

    if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
      const targetCell = this.gridMap[ny][nx];

      if (targetCell.type === 'tree') {
        this.renderDungeon();this.logMsg("Un albero ti sbarra la strada!");
        return;
      }

      if (targetCell.type === 'water') {
        if (!this.items.fishingRod) {
          this.logMsg("Ti serve una Canna da Pesca per pescare!");
          return;
        }
        this.isLocked=true;
        this.fishingConfirmPending=true;
        this.askBattleConfirmation('Vuoi usare la Canna da Pesca qui?', () => {
          this.logMsg('Lanci la lenza in acqua...');
          // Movement stays locked until battle or dialogue is closed.
          setTimeout(() => {
            if(!this.isLocked)return;
            this.logMsg("Abbocca un Pokémon d'acqua!");
            document.getElementById('wild-encounter-overlay').classList.remove('hidden');
          }, 900);
        });
        return;
      }

      if(this.isTownFloor() && targetCell.decoration){
        this.logMsg('Questo elemento del villaggio blocca il passaggio.');
        return;
      }
      const interactFromAdjacent=this.isSolidTownCell(targetCell);
      if(!interactFromAdjacent){
        this.playerPos={x:nx,y:ny};
        this.revealArea(nx,ny);
      }
      // Buildings and NPCs keep their tile/sprite while being interacted with from next door.
      this.renderDungeon();

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
        this.isLocked = true;
        this.currentGym = KANTO_GYMS[(Math.floor(this.floor / 10) - 1) % KANTO_GYMS.length];
        this.gymQueue = ['trainer1', 'trainer2', 'trainer3', 'leader'];
        this.gymLeaderIndex = 0;
        this.gymBadgeName = `Medaglia ${this.currentGym.badge}`;
        this.currentTrainerSprite = this.trainerSprites[0];
        this.setTrainerPortrait(document.getElementById('trainer-portrait-img'), this.currentTrainerSprite);
        document.getElementById('trainer-dialog-speech').textContent = `Palestra ${this.currentGym.specialty}: sconfiggi 3 allenatori per affrontare ${this.currentGym.name}!`;
        document.getElementById('trainer-encounter-overlay').classList.remove('hidden');
        this.logMsg(`Benvenuto! Ti attende ${this.currentGym.name}.`);
        return;
      } else if (targetCell.entity === 'house') {
        this.logMsg('Una casetta tranquilla, illuminata e piena di fiori.');
        return;
      }

      if (targetCell.entity === 'trainer') {
        this.isLocked = true;
        this.currentTrainerSprite = targetCell.trainerSprite || this.trainerSprites[0];
        targetCell.entity = null;
        this.logMsg(`${targetCell.trainerName || "Un Allenatore"} ti sfida!`);
        this.setTrainerPortrait(document.getElementById('trainer-portrait-img'), this.currentTrainerSprite);
        document.getElementById('trainer-dialog-speech').textContent = `${targetCell.trainerName || "Allenatore"}: preparati alla sfida!`;
        document.getElementById('trainer-encounter-overlay').classList.remove('hidden');
      } else if (targetCell.entity === 'raid' || targetCell.entity === 'item') {
        const isRaid = targetCell.entity === 'raid' || Math.random() < GAME_BALANCE.raidChancePerItem;
        targetCell.entity=null;
        this.renderDungeon();
        if(isRaid){
          this.isRaidActive=true;
          this.raidQueueCount=5;
          this.isLocked=true;
          this.logMsg("La Poké Ball nasconde un'anomalia! Cinque Pokémon ti attendono.");
          const root=document.getElementById('pokenav-screen-root');
          root.classList.add('raid-discovery');
          this.showDiscoveryNotice('TRAPPOLA RAID! 5 LOTTE · NESSUNA CATTURA',0);
          this.waitForNotice().then(()=>{
            root.classList.remove('raid-discovery');
            this.startBattle('wild');
          });
          return;
        }
        const randItem = Math.random();
        const kind=randItem<.4?'pokeball':randItem<.8?'potion':'elixir';
        const label={pokeball:'POKÉ BALL',potion:'POZIONE',elixir:'ELISIR'}[kind];
        const stored=this.grantItem(kind);
        this.logMsg(stored?`Hai trovato: ${label}!`:`Zaino pieno (${label}), oggetto lasciato.`);
        this.showDiscoveryNotice(stored?`${label} RACCOLTO!`:`ZAINO PIENO · ${label}`);
      } else if (targetCell.entity === 'door') {
        // Ogni decimo piano è una città: l'uscita richiede obbligatoriamente la medaglia.
        if (this.floor % 10 === 0 && !this.completedGymFloors.has(this.floor)) {
          this.logMsg('USCITA BLOCCATA! Sconfiggi il Capopalestra della città per proseguire.');
          this.showDiscoveryNotice('SFIDA E VINCI LA PALESTRA PRIMA DI USCIRE', 2900);
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
      } else if (targetCell.type === 'grass' && Math.random() < GAME_BALANCE.wildEncounterChance) {
        this.isLocked = true;
        this.logMsg('Un Pokémon selvatico è comparso!');
        document.getElementById('wild-encounter-overlay').classList.remove('hidden');
      }

      this.renderDungeon();
    }
  }

  triggerNpcEvent(npcCell) {
    const npcImage=this.$id('npc-portrait-img');
    if(npcImage){
      npcImage.style.backgroundImage=`url('${npcCell.npcSprite || this.npcSprites[0]}')`;
      npcImage.setAttribute('aria-label',npcCell.npcName || 'Abitante');
    }
    const overlay = document.getElementById('npc-dialog-overlay');
    const speech = document.getElementById('npc-speech-text');
    const actions = document.getElementById('npc-actions');
    overlay.classList.remove('hidden');

    const roll = Math.random();
    if (roll < 0.10) {
      speech.textContent = `Abitante: "Ehi! Ti va di fare uno scambio? Ti do un Pokémon in cambio del tuo ${this.activeMon.name}!"`;
      actions.style.display = 'flex';
      
      document.getElementById('npc-btn-yes').onclick = async () => {
        overlay.classList.add('hidden');
        this.isLocked = false;
        const randomId = Math.floor(Math.random() * 150) + 1;
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const data = await res.json();
        const tradedMon = new Pokemon(data, this.activeMon.level);
        const index = this.team.indexOf(this.activeMon);
        this.team[index] = tradedMon;
        this.activeMon = tradedMon;
        this.logMsg(`Scambio effettuato! Ora hai ${tradedMon.name}!`);
        this.renderSidebar();
      };
      document.getElementById('npc-btn-no').onclick = () => {
        overlay.classList.add('hidden');
        this.isLocked = false;
        this.logMsg("Hai rifiutato lo scambio.");
      };
    } else if (roll < 0.25) {
      speech.textContent = `Abitante: "Prendi questo strumento per il tuo viaggio!"`;
      actions.style.display = 'none';
      if (Math.random() < 0.5) { this.items.pokeball++; this.logMsg("L'abitante ti ha regalato una Poké Ball!"); }
      else { this.items.elixir++; this.logMsg("L'abitante ti ha regalato un Elisir!"); }
      this.waitForNpcClick(overlay);
    } else {
      speech.textContent = `Abitante: "${npcCell.npcLine || this.npcDialogues[0]}"`;
      actions.style.display = 'none';
      this.waitForNpcClick(overlay);
    }
  }

  waitForNpcClick(overlay){
    const hint=document.createElement('div');
    hint.className='npc-click-hint';hint.textContent='CLICCA PER CONTINUARE ▾';
    overlay.appendChild(hint);
    const listener=()=>{
      overlay.classList.add('hidden');this.isLocked=false;hint.remove();
      document.removeEventListener('pointerdown',listener,true);
    };
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
      image.style.width='16px';image.style.height='32px';};
    frame.appendChild(image);return frame;
  }

  renderDungeon() {
    const board = document.getElementById('dungeon-grid-board');
    if (!board) return;
    board.innerHTML = "";
    const redSpriteUrl = FIRERED_RED_OVERWORLD;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.gridMap[y][x];
        const cellDiv = document.createElement('div');
        cellDiv.className = `grid-cell ${cell.type}`;

        if (!cell.revealed) {
          cellDiv.className = 'grid-cell fog';
          cellDiv.setAttribute('aria-label','Area inesplorata');
          cellDiv.style.backgroundPosition=`${x*100/9}% ${y*100/9}%`;
        } else {
          if (x === this.playerPos.x && y === this.playerPos.y) {
            const facingFrame={down:0,up:1,left:2,right:3}[this.playerFacing]||0;
            cellDiv.innerHTML = `<span class="grid-icon player-avatar official-overworld" role="img" aria-label="Red" style="background-image:url('${redSpriteUrl}');--facing-position:-${facingFrame*16}px"></span>`;
          } else if (cell.type === 'tree') {
            cellDiv.innerHTML = `<img class="terrain-tree" src="assets/tree.svg" alt="" aria-hidden="true">`;
          } else if (cell.type === 'water') {
            cellDiv.innerHTML = `<span class="water-ripple" aria-hidden="true"></span>`;
          } else if (cell.entity === 'pokecenter') {
            cellDiv.innerHTML = `<img class="map-building" src="assets/pokecenter.svg" alt="Centro Pokémon">`;
          } else if (cell.entity === 'pokemart') {
            cellDiv.innerHTML = `<img class="map-building" src="assets/pokemart.svg" alt="Pokémarket">`;
          } else if (cell.entity === 'gym') {
            cellDiv.innerHTML = `<img class="map-building" src="assets/gym.svg" alt="Palestra">`;
          } else if (cell.entity === 'house') {
            cellDiv.innerHTML = `<img class="map-building" src="assets/house.svg" alt="Casa">`;
          } else if (cell.entity === 'npc') {
            const fallback=this.npcFallbacks[(x+y+this.floor)%this.npcFallbacks.length];
            cellDiv.appendChild(this.createSingleFrameAvatar(cell.npcSprite||this.npcSprites[0],
              fallback,`Abitante: ${cell.npcName||'Pokémon Rosso Fuoco'}`,'town-npc'));
          } else if (cell.entity === 'door') {
            if(this.floor%10===0 && !this.completedGymFloors.has(this.floor)) {
              cellDiv.classList.add('locked-exit');
              cellDiv.innerHTML='<span class="door-lock" title="Sconfiggi il Capopalestra">LOCK</span>';
            } else cellDiv.innerHTML = `<img class="grid-icon" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/escape-rope.png" alt="Uscita">`;
          } else if (cell.entity === 'raid' || cell.entity === 'item') {
            cellDiv.innerHTML = `<img class="grid-icon" src="assets/items/pokeball.svg" alt="Poké Ball">`;
          } else if (cell.entity === 'trainer') {
            cellDiv.appendChild(this.createSingleFrameAvatar(
              cell.trainerOverworldSprite||`${FIRERED_OVERWORLD_BASE}youngster.png`,
              this.npcFallbacks[(x+y+this.floor)%this.npcFallbacks.length],
              cell.trainerName||'Allenatore','route-trainer'));
          } else if(cell.decoration) {
            cellDiv.innerHTML=`<img class="map-decoration" src="assets/decor/${cell.decoration}.svg" alt="">`;
          }
          // Il raid ora si presenta intenzionalmente come una Poké Ball normale.
        }
        board.appendChild(cellDiv);
      }
    }
  }

  async getPokemonData(id) {
    const key = String(id);
    if (!this.pokemonCache.has(key)) {
      const promise=fetch(`https://pokeapi.co/api/v2/pokemon/${key}`)
        .then(res=>{ if(!res.ok) throw new Error(`PokéAPI ${res.status}`); return res.json(); })
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
        await this.startBattle('gym');
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
      await this.startBattle('gym');
    }
  }

  wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  $id(id) { return document.getElementById(id); }
  openWings() { this.$id('rotom-container').classList.add('wings-open'); }
  hideAllActions() {
    for(const id of ['panel-main-actions','panel-move-actions','panel-bag-actions','panel-team-actions']) {
      this.$id(id)?.classList.add('hidden');
    }
  }
  showMainActions() {
    if(this.battleBusy || this.pendingForcedSwitch) return;
    this.battleMode=null; this.hideAllActions();
    this.$id('panel-main-actions').classList.remove('hidden');
    this.$id('btn-move-back').classList.add('hidden');
    const run=this.$id('btn-act-run');
    const forbidden=this.isRaidActive || ['gym','trainer'].includes(this.battleType);
    run.disabled=forbidden;run.title=forbidden?'Non puoi fuggire da una sfida con allenatori o dal raid.':'';
    this.renderSidebar();
  }
  encounterLevel(type,leader=false,rng=Math.random){
    const isTrainer=type==='trainer'||type==='gym';
    if(this.floor<=GAME_BALANCE.earlyFloors){
      if(leader)return 6;
      return isTrainer?4+Math.floor(rng()*2):2+Math.floor(rng()*2);
    }
    const base=3+this.floor*GAME_BALANCE.levelPerFloor;
    return Math.max(2,Math.min(70,Math.round(base+(leader?4:isTrainer?2:0)+Math.floor(rng()*2))));
  }

  async startBattle(type) {
    this.battleType=type;this.isLocked=true;this.battleBusy=true;
    this.battleParticipants = new Set();
    this.battleMode=null;this.pendingForcedSwitch=false;
    const token=++this.battleToken;
    if(this.activeMon?.currentHp<=0){
      const alive=this.team.find(p=>p.currentHp>0);
      if(!alive){this.endBattle('Tutta la squadra è esausta.');this.$id('gameover-overlay').classList.remove('hidden');return;}
      this.activeMon=alive;
    }
    this.$id('overlay-battle').classList.remove('hidden');
    this.$id('battle-controls').classList.remove('hidden');
    this.$id('rotom-body').classList.add('battle-active');
    this.hideAllActions();this.openWings();
    const leader=type==='gym' && this.gymQueue[0]==='leader' && this.currentGym;
    const gymPool=[16,19,21,23,27,35,41,43,56,74,81];
    const wildPool=[1,4,7,19,25,39,52,133,10,13,16,37,43,63,74,92,104];
    // Gastly cannot be found until the first village (floor 5) has been passed.
    if(this.floor<=5)wildPool.splice(wildPool.indexOf(92),1);
    // Beginner routes favor low-threat Kanto species and avoid early bulky/ghost encounters.
    const beginnerPool=[19,16,10,13,52,39]; // Rattata, Pidgey, Caterpie, Weedle, Meowth, Jigglypuff
    const pool=type==='gym'?gymPool:(this.floor<=5?beginnerPool:wildPool);
    const enemyId=leader?this.currentGym.pokemon[this.gymLeaderIndex]:pool[Math.floor(Math.random()*pool.length)];
    try {
      const data=await this.getPokemonData(enemyId);
      if(token!==this.battleToken)return;
      // Floor-based progression, with leaders stronger than regular encounters.
      const level=this.encounterLevel(type,Boolean(leader));
      this.enemyMon=new Pokemon(data,level);
      await Promise.all([this.enemyMon.loadLearnset(),this.activeMon.loadLearnset()]);
    }catch(err) {
      console.error(err);if(token===this.battleToken)this.endBattle('Errore di rete: impossibile iniziare la lotta.');return;
    }
    if(token!==this.battleToken)return;
    this.battleParticipants.add(this.activeMon);
    this.$id('enemy-name').textContent=this.enemyMon.name;
    this.$id('enemy-lv').textContent=this.enemyMon.level;
    this.$id('enemy-sprite').src=this.enemyMon.spriteFront;
    this.$id('enemy-sprite').classList.remove('faint-anim','summon-anim','recall-anim');
    this.$id('enemy-sprite').classList.add('hidden');
    const previousTrainer=this.$id('enemy-trainer-sprite');
    previousTrainer.className='poke-sprite-gba enemy-trainer-frame hidden';
    previousTrainer.removeAttribute('style');
    this.$id('player-sprite').classList.add('hidden');
    this.$id('player-trainer-sprite').style.backgroundImage=this.redBackSheetReady ?
      `url('${RED_FIRERED_BACK_SHEET}')` : `url('assets/trainers/red-back-fallback.svg')`;
    this.$id('player-trainer-sprite').classList.toggle('red-sheet-ready',Boolean(this.redBackSheetReady));
    this.$id('player-trainer-sprite').classList.add('hidden');
    const hostile=['gym','trainer'].includes(type);
    const stage=this.$id('battle-stage');
    stage.classList.toggle('wild-battle',!hostile);
    stage.classList.toggle('trainer-battle',hostile);
    stage.dataset.biome=this.floor%10===0?'city':this.floor%5===0?'coast':
      this.floor%4===0?'cavern':this.floor%3===0?'forest':'meadow';
    this.resetBattleVisuals();
    this.updateBattleHUD();
    await this.battleText(hostile ? (leader?`Il Capopalestra ${this.currentGym.name} ti sfida!`:'Un allenatore ti sfida!') :
      (this.isRaidActive?`RAID ${6-this.raidQueueCount}/5 · Una presenza misteriosa!`:'Un Pokémon selvatico appare!'));
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
    this.$id('player-trainer-sprite').style.backgroundImage=this.redBackSheetReady ?
      `url('${RED_FIRERED_BACK_SHEET}')` : `url('assets/trainers/red-back-fallback.svg')`;
    this.$id('player-trainer-sprite').classList.toggle('red-sheet-ready',Boolean(this.redBackSheetReady));
    this.$id('player-trainer-sprite').classList.remove('hidden');
    await this.battleText(`Vai ${this.activeMon.name}!`);
    if(token!==this.battleToken)return;
    await this.animateBall('player');
    if(token!==this.battleToken)return;
    this.$id('player-trainer-sprite').classList.add('hidden');
    await this.summonPokemon('player');
    if(token!==this.battleToken)return;
    this.battleBusy=false;this.showMainActions();
  }
  resetBattleVisuals(){
    for(const id of ['battle-throw-ball','capture-ball','capture-smoke','summon-flash']){
      const el=this.$id(id);if(el){el.className=el.dataset.baseClass || el.className.split(' ')[0];el.removeAttribute('style');}
    }
    this.$id('attack-fx-container').replaceChildren();
    for(const id of ['enemy-sprite','player-sprite']){
      this.$id(id).classList.remove('recall-anim','summon-anim','summon-cinematic','hit-anim','attack-lunge','hidden');
    }
    this.$id('enemy-sprite').classList.add('hidden');
    this.$id('player-sprite').classList.add('hidden');
  }
  async animateBall(side){
    const ball=this.$id('battle-throw-ball');
    const stage=this.$id('battle-stage');
    const trainer=this.$id(side==='enemy'?'enemy-trainer-sprite':'player-trainer-sprite');
    const rect=stage.getBoundingClientRect();
    const trainerRect=trainer.getBoundingClientRect();
    const target=this.battleSpritePosition(side);
    const size=34;
    const sx=trainerRect.left-rect.left+trainerRect.width*.58-size/2;
    const sy=trainerRect.top-rect.top+trainerRect.height*.52-size/2;
    const ex=target.x-size/2,ey=target.y-size/2;
    ball.className='throw-ball ball-compositor';
    ball.style.left='0px';ball.style.top='0px';ball.style.opacity='1';
    const x=t=>sx+(ex-sx)*t;
    const y=t=>sy+(ey-sy)*t-Math.sin(Math.PI*t)*Math.min(84,rect.height*.23);
    const angle=side==='enemy'?-1:1;
    const frames=[0,.18,.38,.60,.82,1].map((t,i)=>({
      transform:`translate3d(${x(t)}px,${y(t)}px,0) rotate(${angle*360*t}deg) scale(${.72+.28*Math.sin(Math.PI*t)})`,
      opacity:i===5?0:1,offset:t}));
    const trainerMotion=this.playMotion(trainer,[
      {transform:'translate3d(0,0,0) rotate(0deg)'},
      {transform:`translate3d(${side==='enemy'?-10:10}px,-7px,0) rotate(${side==='enemy'?-4:4}deg)`},
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
  async animateCapture(shakes,success){
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
    ball.className='capture-ball compositor-ball';ball.style.display='block';ball.style.opacity='1';
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
    this.$id('player-exp-fill').style.width=`${Math.max(0,Math.min(100,100*a.exp/a.expToNext))}%`;
    this.renderBattleConditions('player',a);
    this.renderBattleConditions('enemy',b);
    this.renderSidebar();
  }
  renderBattleConditions(side,mon){
    const out=this.$id(`${side}-conditions`);if(!out)return;
    out.replaceChildren();
    const statuses={burn:'BRU',poison:'VEL','bad-poison':'VEL+',paralysis:'PAR',sleep:'SON',freeze:'GEL',confusion:'CONF'};
    if(mon.status){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent=statuses[mon.status]||mon.status.toUpperCase();out.append(chip);}
    if(mon.seeded){const chip=document.createElement('span');chip.className='condition-chip status-chip';chip.textContent='SEME';out.append(chip);}
    const labels={attack:'ATT',defense:'DIF','special-attack':'ATT.SP','special-defense':'DIF.SP',speed:'VEL.',accuracy:'PREC',evasion:'ELUS'};
    for(const [key,value] of Object.entries(mon.statStages||{})){
      if(!value)continue;
      const chip=document.createElement('span');chip.className=`condition-chip ${value>0?'boost':'nerf'}`;
      chip.textContent=`${labels[key]||key} ${value>0?'+':''}${value}`;out.append(chip);
    }
  }
  setBattleMsg(text){
    this.$id('battle-msg').textContent=text;
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
    this.$id('evolution-from').src=evo.fromSprite||'assets/items/pokeball.svg';
    this.$id('evolution-to').src=evo.toSprite||'assets/items/pokeball.svg';
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
    if(this.battleBusy || this.pendingForcedSwitch)return;
    this.battleMode='moves';this.hideAllActions();
    const panel=this.$id('panel-move-actions');panel.innerHTML='';panel.classList.remove('hidden');
    this.$id('btn-move-back').classList.remove('hidden');
    for(const m of this.activeMon.moves){
      const btn=document.createElement('button');btn.className=`act-btn move-${m.type}`;
      btn.innerHTML=`<strong>${m.name}</strong><small>${m.type.toUpperCase()} · ${m.currentPp}/${m.maxPp} PP</small>`;
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
    if(this.battleBusy && !force)return;
    this.pendingForcedSwitch=Boolean(force);
    this.battleMode='team';this.hideAllActions();
    this.openWings();this.renderSidebar();
    this.$id('panel-team-actions').classList.remove('hidden');
    this.$id('panel-team-actions').innerHTML=`<span>${force?'POKÉMON ESAUSTO: SCEGLINE UN ALTRO':'SCEGLI UN POKÉMON NEL PANNELLO SINISTRO'}</span>${force?'':'<button id="battle-team-back" class="act-btn mini-back-btn">←</button>'}`;
    if(!force)this.$id('battle-team-back').onclick=()=>this.showMainActions();
    this.setBattleMsg(force?`${this.activeMon.name} è esausto! Seleziona un compagno disponibile.`:'Seleziona un Pokémon dalla squadra a sinistra.');
  }
  showBagMenu(){
    if(this.battleBusy||this.pendingForcedSwitch)return;
    this.battleMode='bag';this.hideAllActions();this.openWings();this.renderSidebar();
    this.$id('panel-bag-actions').classList.remove('hidden');
    this.$id('panel-bag-actions').innerHTML='<span>SCEGLI UNO STRUMENTO DALLO ZAINO A DESTRA</span><button id="battle-bag-back" class="act-btn mini-back-btn">←</button>';
    this.$id('battle-bag-back').onclick=()=>this.showMainActions();
    this.setBattleMsg('Apri lo zaino e scegli un oggetto.');
  }
  selectBattlePokemon(pokemon){
    if(this.battleConfirmAction)return;
    if(!this.$id('overlay-battle') || this.$id('overlay-battle').classList.contains('hidden'))return;
    if(this.battleBusy || this.dialogueResolve)return;
    if(pokemon===this.activeMon){this.setBattleMsg('Questo Pokémon è già in campo!');return;}
    if(pokemon.currentHp<=0){this.setBattleMsg('Un Pokémon esausto non può combattere!');return;}
    this.askBattleConfirmation(`Richiamare ${this.activeMon.name} e mandare ${pokemon.name} (Lv.${pokemon.level})?`,()=>this.performSwitch(pokemon),!this.pendingForcedSwitch);
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
    this.pendingForcedSwitch=false;
    this.battleBusy=true;this.hideAllActions();
    await this.battleText(`${this.activeMon.name}, torna nella Poké Ball!`);
    await this.animateRecall('player');
    this.activeMon.clearVolatile();
    this.activeMon=next;this.battleParticipants.add(next);next.clearVolatile();
    await next.loadLearnset();
    this.updateBattleHUD();
    await this.battleText(`Vai ${next.name}!`);
    await this.animateBall('player');
    await this.summonPokemon('player');
    this.updateBattleHUD();
    if(forced){this.battleBusy=false;this.showMainActions();}
    else {await this.enemyTurn();}
  }
  chooseBattleItem(id){
    if(this.battleConfirmAction)return;
    if(this.battleBusy || this.dialogueResolve)return;
    if(!this.items[id]){this.setBattleMsg('Non hai questo strumento.');return;}
    if(id==='pokeball' && (this.isRaidActive||['gym','trainer'].includes(this.battleType))){
      this.setBattleMsg('Non puoi catturare Pokémon di allenatori o dei raid!');return;
    }
    if(id==='potion' && this.activeMon.currentHp>=this.activeMon.maxHp){this.setBattleMsg('I PS sono già al massimo!');return;}
    this.battleMode='bag';
    this.askBattleConfirmation(`Utilizzare ${id==='potion'?'Pozione':id==='elixir'?'Elisir':'Poké Ball'}${id==='potion'||id==='elixir'?' su '+this.activeMon.name:''}?`,()=>this.useBattleItem(id));
  }
  async useBattleItem(id){
    if(this.battleBusy||this.items[id]<=0)return;
    this.battleBusy=true;this.hideAllActions();this.items[id]--;
    if(id==='pokeball'){
      const wild=this.enemyMon;
      await this.battleText(`Lanci una Poké Ball verso ${wild.name}!`);
      const missing=1-(wild.currentHp/wild.maxHp);
      const odds=Math.min(.92,.20+missing*.68);
      const success=Math.random()<odds;
      const shakes=success?3:Math.floor(Math.random()*4);
      await this.animateCapture(shakes,success);
      if(success){
        await this.battleText(`Preso! ${wild.name} è stato catturato!`);
        if(this.team.length<6){this.team.push(wild);this.endBattle(`Hai catturato ${wild.name}!`);}
        else this.promptTeamFullChoice(wild);
        return;
      }
      await this.battleText(`${wild.name} è uscito dalla Poké Ball!`);
    } else if(id==='potion'){
      this.activeMon.currentHp=Math.min(this.activeMon.maxHp,this.activeMon.currentHp+20);
      await this.battleText(`Pozione: ${this.activeMon.name} recupera PS!`);
    } else if(id==='elixir'){
      this.activeMon.restorePp();await this.battleText(`Elisir: PP ripristinati per ${this.activeMon.name}!`);
    }
    this.updateBattleHUD();await this.wait(900);await this.enemyTurn();
  }
  promptTeamFullChoice(newMon){
    this.battleBusy=true;
    let o=this.$id('team-full-overlay');
    if(!o){o=document.createElement('div');o.id='team-full-overlay';o.className='full-overlay battle-modal';this.$id('pokenav-screen-root').appendChild(o);}
    o.innerHTML='<h3>SQUADRA PIENA</h3><p>Chi vuoi sostituire?</p><div id="team-full-slots"></div><button class="act-btn" id="discard-new-btn">LIBERA IL POKÉMON</button>';
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
  async executeAttack(move){
    if(this.battleBusy||this.pendingForcedSwitch||move.currentPp<=0)return;
    this.battleBusy=true;this.hideAllActions();
    const enemyMove=this.pickEnemyMove();
    const enemyFirst=(enemyMove.priority>move.priority)||
      (enemyMove.priority===move.priority && this.battleSpeed(this.enemyMon)>this.battleSpeed(this.activeMon));
    if(enemyFirst){await this.applyMove(this.enemyMon,this.activeMon,enemyMove,'player');
      if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}}
    if(this.enemyMon.currentHp>0){await this.applyMove(this.activeMon,this.enemyMon,move,'enemy');}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    if(!enemyFirst){await this.enemyTurn();return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    this.battleBusy=false;this.showMainActions();
  }
  battleSpeed(mon){
    return mon.speed*statMultiplier(mon.statStages?.speed)*(mon.status==='paralysis'?.5:1);
  }
  pickEnemyMove(){
    const available=this.enemyMon.moves.filter(m=>m.currentPp>0);
    if(!available.length)return new Move('Scontro','normal',50,1,'physical');
    const offensive=available.filter(m=>m.power>0);
    if(offensive.length && Math.random()<.85){
      return offensive.sort((a,b)=>(b.power*typeEffectiveness(b.type,this.activeMon.types))-(a.power*typeEffectiveness(a.type,this.activeMon.types)))[0];
    }
    return available[Math.floor(Math.random()*available.length)];
  }
  async applyMove(attacker,defender,move,target){
    move.currentPp=Math.max(0,move.currentPp-1);
    if(attacker.status==='sleep'){
      attacker.statusTurns--;
      if(attacker.statusTurns>0){await this.battleText(`${attacker.name} sta dormendo!`);return;}
      attacker.status=null;await this.battleText(`${attacker.name} si è svegliato!`);
    }
    if(attacker.status==='freeze' && Math.random()>=.2){await this.battleText(`${attacker.name} è congelato!`);return;}
    if(attacker.status==='freeze')attacker.status=null;
    if(attacker.status==='paralysis' && Math.random()<.25){await this.battleText(`${attacker.name} è paralizzato!`);return;}
    if(attacker.status==='confusion' && Math.random()<.33){
      const selfDamage=Math.max(1,Math.floor(attacker.maxHp*.09));
      attacker.currentHp=Math.max(0,attacker.currentHp-selfDamage);
      this.updateBattleHUD();await this.battleText(`${attacker.name} si ferisce per la confusione!`);return;
    }
    this.setBattleMsg(`${attacker.name} usa ${move.name}!`);
    await this.playAttackAnimation(move,target);
    const accuracy=(move.accuracy||100) * statMultiplier(attacker.statStages?.accuracy) /
      statMultiplier(defender.statStages?.evasion);
    if(Math.random()*100 >= accuracy){await this.battleText('Ma la mossa fallisce!');return;}
    const modifier=typeEffectiveness(move.type,defender.types);
    if(move.power>0){
      const result=calculateBattleDamage(attacker,defender,move);
      defender.currentHp=Math.max(0,defender.currentHp-result.damage);
      if(move.drain>0 && result.damage>0)attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+Math.max(1,Math.floor(result.damage*move.drain/100)));
      if(move.drain<0 && result.damage>0)attacker.currentHp=Math.max(0,attacker.currentHp-Math.max(1,Math.floor(result.damage*-move.drain/100)));
      const reaction=result.effectiveness===0?'Non ha effetto…':result.effectiveness>1?'È superefficace!':result.effectiveness<1?'Non è molto efficace…':'';
      this.updateBattleHUD();
      await this.battleText(`${attacker.name} usa ${move.name}! ${result.damage} danni. ${result.critical?'⚡ BRUTTO COLPO! ':''}${reaction}`);
    } else if(modifier===0 && move.power>0) {
      await this.battleText('Non ha effetto…');
    } else if(move.healing>0 || ['recover','rest'].includes(move.id)){
      const amount=Math.max(1,Math.floor(attacker.maxHp*(move.healing||50)/100));
      attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+amount);
      await this.battleText(`${attacker.name} recupera ${amount} PS!`);
    } else if(move.id==='leech-seed'){defender.seeded=true;await this.battleText(`${defender.name} è stato parassitato!`);
    } else if(!move.statChange && !move.ailment) await this.battleText(`${attacker.name} esegue ${move.name}!`);
    // Stage effects apply on support moves AND damaging moves with a secondary effect.
    if(move.statChange && (move.power===0 || defender.currentHp>0) &&
      (move.power===0 || modifier>0) && Math.random()*100<(move.statChange.chance??100)){
      const {stat,stage}=move.statChange;
      const targetP=stage<0?defender:attacker;
      targetP.statStages[stat]=Math.max(-6,Math.min(6,(targetP.statStages[stat]||0)+stage));
      this.updateBattleHUD();
      await this.battleText(`${targetP.name}: ${stat} ${stage<0?'diminuisce':'aumenta'}!`);
    }
    if(move.ailment && move.ailment!=='none' && !defender.status && defender.currentHp>0 && modifier>0 && Math.random()*100<(move.ailmentChance || (move.power===0?100:0))) {
      defender.status=move.ailment;defender.statusTurns=2+Math.floor(Math.random()*3);await this.battleText(`${defender.name} è affetto da ${move.ailment}!`);
    }
    this.updateBattleHUD();await this.wait(420);
  }
  async enemyTurn(){
    if(!this.enemyMon||this.enemyMon.currentHp<=0)return;
    this.battleBusy=true;
    const move=this.pickEnemyMove();
    await this.applyMove(this.enemyMon,this.activeMon,move,'player');
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.onPlayerFainted();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    this.battleBusy=false;this.showMainActions();
  }
  async applyEndOfTurnEffects(){
    const combatants=[this.activeMon,this.enemyMon];
    for(const mon of combatants){
      if(mon.currentHp<=0)continue;
      if(['burn','poison','bad-poison'].includes(mon.status)){
        const damage=Math.max(1,Math.floor(mon.maxHp/12));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        this.updateBattleHUD();await this.battleText(`${mon.name} subisce ${damage} danni da ${mon.status==='burn'?'scottatura':'veleno'}!`);
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
    const levelEvents=await mon.gainExperience(amount);
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
    // Each participant receives level-scaled EXP, with a smaller share for switched Pokémon.
    for(const mon of eligible){
      const earned=scaledBattleExperience(defeated.baseExperience,defeated.level,mon.level,expMultiplier);
      const reward=mon===this.activeMon?earned:Math.max(1,Math.round(earned*.55));
      await this.awardBattleExperience(mon,reward);
    }
    if(this.battleType==='gym'&&this.gymQueue.length>0){
      await this.advanceGymAfterVictory();return;
    }
    if(this.isRaidActive){
      this.raidQueueCount--;
      if(this.raidQueueCount>0){
        await this.battleText(`RAID · Restano ${this.raidQueueCount} avversari!`);
        await this.startBattle('wild');return;
      }
      this.isRaidActive=false;this.money+=500;this.endBattle('RAID SUPERATO! Premio: $500.');return;
    }
    this.money+=100;this.endBattle(`Vittoria contro ${defeated.name}! +$100.`);
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
    this.team.forEach(p=>p.clearBattleConditions());
    this.enemyMon?.clearBattleConditions();
    this.$id('overlay-battle').classList.add('hidden');
    this.$id('battle-controls').classList.add('hidden');
    this.$id('rotom-body').classList.remove('battle-active');
    this.$id('battle-confirm').classList.add('hidden');
    this.$id('enemy-sprite').classList.remove('faint-anim','hidden');
    this.$id('player-sprite').classList.remove('faint-anim');
    this.isLocked=false;this.logMsg(msg);this.renderSidebar();
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
    notice.textContent=message;
    notice.classList.toggle('raid-notice',message.includes('RAID'));
    notice.classList.add('visible');
    if(duration>0)this.discoveryNoticeTimer=setTimeout(()=>notice.classList.remove('visible'),duration);
  }

  waitForNotice(){
    return new Promise(resolve=>{
      const listener=event=>{
        event.preventDefault();event.stopImmediatePropagation();
        document.removeEventListener('pointerdown',listener,true);
        const notice=this.$id('discovery-notice');notice?.classList.remove('visible');
        resolve();
      };
      setTimeout(()=>document.addEventListener('pointerdown',listener,true),60);
    });
  }

  logMsg(text) { document.getElementById('log-status-text').textContent = text; }

  renderBadges() {
    const container = document.getElementById('badges-container');
    if (!container) return;
    container.innerHTML = "";
    if (this.badges.length === 0) {
      container.innerHTML = `<span style="font-size:5px; color:#64748b;">Nessuna Medaglia</span>`;
      return;
    }
    this.badges.forEach((b, idx) => {
      const badgeImg = document.createElement('img');
      const badgeId=typeof b==='object' ? b.id : idx;
      badgeImg.src = this.badgeSprites[badgeId % this.badgeSprites.length];
      badgeImg.alt = typeof b==='object' ? b.name : b;
      badgeImg.title = typeof b==='object' ? b.name : b;
      badgeImg.className='gym-badge-icon';
      badgeImg.onerror=()=>{ badgeImg.replaceWith(document.createTextNode('[MEDAGLIA]')); };
      container.appendChild(badgeImg);
    });
  }

  renderSidebar() {
    this.$id('floor-num').textContent=this.floor;
    this.$id('player-money').textContent=`$${this.money}`;
    this.$id('radar-charge-count')?.replaceChildren(document.createTextNode(`SCANSIONI: ${this.radarCharges}`));
    const bag=this.$id('bag-list');bag.innerHTML='';
    const categories={
      rimedi:[['potion','Pozione','potion'],['elixir','Elisir','elixir']],
      pokeball:[['pokeball','Poké Ball','poke-ball']],
      chiave:[]
    };
    document.querySelectorAll('[data-bag-tab]').forEach(tab=>{
      const active=tab.dataset.bagTab===this.bagCategory;
      tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));
    });
    const inBattle=!this.$id('overlay-battle')?.classList.contains('hidden');
    for(const [id,label,file] of categories[this.bagCategory]){
      const b=document.createElement('button');b.className='bag-item';
      b.innerHTML=`<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${file}.png" onerror="this.onerror=null;this.src='assets/items/${id}.svg'" alt=""><span>${label}</span><strong>×${this.items[id]}</strong>`;
      b.disabled=!(inBattle&&!this.battleBusy&&this.items[id]>0);
      b.onclick=()=>this.chooseBattleItem(id);
      bag.appendChild(b);
    }
    if(this.bagCategory==='chiave'){
      const rod=document.createElement('div');rod.className='bag-rod';
      rod.innerHTML=`Canna da pesca: ${this.items.fishingRod?'ottenuta':'non ancora ottenuta'}`;
      bag.appendChild(rod);
    }
    const team=this.$id('team-grid');team.innerHTML='';
    for(let i=0;i<6;i++){
      const p=this.team[i];const slot=document.createElement('button');
      if(!p){slot.className='team-slot empty';slot.innerHTML='<div class="slot-top"><span>&nbsp;</span><span>&nbsp;</span></div><div class="team-slot-empty"></div><div class="team-hp-bg"><div class="team-hp-fill hp-red" style="width:0%"></div></div><div class="team-hp-text">&nbsp;</div>';slot.disabled=true;}
      else {
        const hp=Math.max(0,Math.floor(100*p.currentHp/p.maxHp));
        const hpState=this.hpColorState(p);
        slot.className=`team-slot ${p===this.activeMon?'active':''} ${p.currentHp<=0?'fainted':''} type-${p.type}`;
        slot.innerHTML=`<div class="slot-top"><span>${p.name}</span><span>Lv.${p.level}</span></div>
          <img class="team-slot-img" src="${p.spriteFront}" alt="${p.name}">
          <div class="team-hp-bg"><div class="team-hp-fill hp-${hpState}" style="width:${hp}%"></div></div><div class="team-hp-text">${p.currentHp}/${p.maxHp} PS</div>`;
        slot.disabled=inBattle && (this.battleBusy || p.currentHp<=0);
        slot.onclick=()=>{
          if(inBattle){this.selectBattlePokemon(p);return;}
          if(!this.isLocked && p.currentHp>0){this.activeMon=p;this.renderSidebar();}
        };
      }
      team.appendChild(slot);
    }
  }

}