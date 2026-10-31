// Pokéxplorer game engine. Static tables and helpers: js/game-data.js.
class GameEngine {
  constructor() {
    this.gridSize = 10;
    this.playerPos = { x: 0, y: 0 };
    this.playerGender='male';
    this.walkSequence=0;
    this.walkReadyAt=0;
    this.walkDurationMs=210;
    // BUG-002: source-aware held inputs and a single scheduled repeat.
    // Collision decisions continue to use integer tile coordinates.
    this.walkInputs=new Map();
    this.walkHoldTimer=null;
    // Keep references until the frame preloads complete; otherwise browsers
    // can discard orphaned Image elements and cancel their network requests.
    this.walkSpritePreloads=[];
    if(typeof Image!=='undefined')for(const gender of ['red','girl'])
      for(const direction of ['up','down','left','right'])
        for(let frame=0;frame<3;frame++){
          const image=new Image();image.src=`assets/sprites/player/${gender}/walk/${direction}-${frame}.png`;
          this.walkSpritePreloads.push(image);
        }
    this.floor = 1;
    this.money = 600;
    this.team = [];
    this.activeMon = null;
    this.enemyMon = null;
    this.items = { pokeball: 5, masterball:0, potion: 3, superPotion:0, hyperPotion:0, elixir: 1, abilityCapsule:0, fishingRod: false, rareCandy:0, goldCandy:0 };
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
    this.abilityCapsuleCandidate=null;this.abilityCapsuleOpen=false;this.abilityCapsuleSerial=0;

    // Variabili per la gestione della catena Raid Pokémon (5 sfide consecutive)
    this.isRaidActive = false;
    this.raidQueueCount = 0;
    // Diagnostic flag retained for compatibility; it no longer limits Raid rolls.
    // Each collectible independently has a 10% chance to trigger a Raid.
    this.raidTriggeredOnFloor = false;
    this.raidPickupSourceCell = null;
    this.raidBattleRetryPending = false;
    this.raidLaunchNonce = 0;
    this.raidVictoryResolutionToken = -1;
    this.fishingRodGiftClaimed = false;
    this.gymChallengePending = false;
    this.devMode = false; // Only the in-game DEV MODE button can unlock it.
    this.devUpgradeInProgress = false;
    this.speedMultiplier=1;
    this.locale='it';document.documentElement.lang='it';
    this.pokemonInfoRequest=0;
    this.moveDescriptionCache=new Map();
    this.abilityDescriptionCache=new Map();
    this.teleportSwitchPending=false;
    this.caughtLegendarySpecies=new Set();
    this.activeDialogNpcCell=null;
    this.oakEventDismissed=false;this.isCelestialCave=false;this.celestialPhase='unvisited';
    this.celestialReturnState=null;this.celestialCutsceneActive=false;this.celestialDeparturePending=false;
    this.celestialReserve=[];this.celestialRosterSelection=new Set();this.laboratoryPokemon=[];this.celestialDepositRequired=false;this.celestialExpeditionBusy=false;
    // Direct Nurse Joy interaction outside the building; no separate interior.
    this.pokemonCenterHealTimer=null;
    this.pokemonCenterHealSequence=0;
    this.pokemonCenterHealAudio=null;

    this.trainerSprites = ['bug_catcher','youngster','lass'].map(overworldPortraitUrl);
    // Named FireRed/LeafGreen NPC sheets: appearance is fixed, not generated.
    this.npcSprites = FIRERED_NPC_NAMES.map(overworldSpriteUrl);
    // Remote overworld sheets remain primary; a neutral bundled avatar is the
    // only local safety net when the image host is unreachable.
    this.npcFallbacks = FIRERED_NPC_NAMES.map(() => 'assets/sprites/ui/trainer-avatar-fallback.svg');
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
    this.badgeSprites = KANTO_GYMS.map((_, i) => `assets/sprites/badges/kanto-clean-${i + 1}.png`);

    this.installPokemonSpriteFallbacks();
    this.bindEvents();
    this.updateContinueButton();
    this.scheduleRotomExpression();
  }

  installPokemonSpriteFallbacks(){
    const fallback='assets/sprites/ui/pokemon-placeholder.svg';
    for(const id of ['starter-showcase-img','pokemon-info-sprite','enemy-sprite','player-sprite']){
      const element=this.$id(id);
      if(element)element.addEventListener('error',()=>{
        if(!element.src.endsWith('/pokemon-placeholder.svg'))element.src=fallback;
      });
    }
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
        const sprite=document.createElement('img');sprite.src=resolvedSpritePath(pokemon.spriteFront || '');
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
      'npc-dialog-overlay','celestial-dialog','celestial-expedition','oak-laboratory','celestial-cinematic','badge-case-overlay','pokedex-overlay','learn-move-overlay','evolution-overlay','battle-confirm']){
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
    this.raidTriggeredOnFloor=false;this.clearRaidTransientState();
    this.battleMode=null;this.isLocked=false;this.battleConfirmAction=null;
    this.items={pokeball:5,masterball:0,potion:3,superPotion:0,hyperPotion:0,elixir:1,abilityCapsule:0,fishingRod:false,
      rareCandy:this.devMode?999:0,goldCandy:this.devMode?999:0};
    this.fishingRodGiftClaimed=false;this.playerGender='male';
    this.gymChallengePending=false;this.devGuaranteedCapture=this.devMode;this.pendingTrainerCell=null;
    this.caughtLegendarySpecies=new Set();
    this.activeDialogNpcCell=null;this.oakEventDismissed=false;this.isCelestialCave=false;
    this.cancelPokemonCenterHealing();
    this.celestialPhase='unvisited';this.celestialReturnState=null;this.celestialCutsceneActive=false;this.celestialDeparturePending=false;
    this.celestialReserve=[];this.celestialRosterSelection.clear();this.laboratoryPokemon=[];this.celestialDepositRequired=false;this.celestialExpeditionBusy=false;
    this.$id('celestial-expedition')?.classList.add('hidden');this.$id('oak-laboratory')?.classList.add('hidden');
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
    this.abilityCapsuleOpen=false;this.abilityCapsuleCandidate=null;this.$id('ability-capsule-overlay')?.classList.add('hidden');
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
    this.redThrowFrames=Array.from({length:5},(_,i)=>`assets/sprites/player/red/throw/${i}.png`);
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

  // battleSpritePosition moved to js/battle-helpers.js (R2.22 modularisation).
  // battleThrowDestination moved to js/battle-helpers.js (R2.22 modularisation).
  // hpColorState moved to js/battle-helpers.js (R2.22 modularisation).
  isTownFloor(){return this.floor % 5 === 0;}
  // isSolidTownCell moved to js/map-helpers.js (R2.22 modularisation).
  setTrainerPortrait(element,src){
    if(!element)return;
    // Previously saved route trainer portraits still map to the approved OW assets.
    const filename=String(src||'').split('/').at(-1);
    const oldNames={'bugcatcher-gen3.png':'bug_catcher','youngster-gen3.png':'youngster',
      'lass-gen3.png':'lass','acetrainer-gen3.png':'cooltrainer_m',
      'pokemonranger-gen3.png':'cooltrainer_f','hiker-gen3.png':'hiker','camper-gen3.png':'camper'};
    const local=oldNames[filename]?overworldPortraitUrl(oldNames[filename]):null;
    element.onerror=()=>{element.onerror=null;element.src='assets/sprites/ui/trainer-avatar-fallback.svg';};
    element.src=local||src;
  }

  saveCheckpoint(){
    if(typeof window!=='undefined'&&window.PokexCheckpoints?.isGuestMode?.())return false;
    try {
      const snapshot=window.PokexCheckpoints?.take(this);
      if(snapshot){window.PokexCheckpoints.save(snapshot);this.updateContinueButton();
        window.dispatchEvent?.(new Event('pokex:checkpoint')); 
        // Cloud is opt-in via authenticated configured client; no auto-overwrite.
      }
      return !!snapshot;
    }catch(error){console.warn('Checkpoint not saved:',error);return false;}
  }
  updateContinueButton(){
    const button=this.$id('btn-continue-game');if(!button)return;
    let exists=false;
    try{exists=!!window.PokexCheckpoints?.load();}catch(_){exists=false;}
    button.disabled=!exists;
    const status=this.$id('save-status');
    if(status)status.textContent=window.PokexCheckpoints?.isGuestMode?.()?('MODALITÀ UTENTE: PROGRESSI NON SALVATI'):exists?('CHECKPOINT LOCALE DISPONIBILE'):('NESSUNA RUN SALVATA');
  }
  continueAdventure(){
    try{
      const checkpoint=window.PokexCheckpoints?.load();if(!checkpoint)return false;
      if(!window.PokexCheckpoints.restore(this,checkpoint))return false;
      this.logMsg('Avventura ripresa dall’ultimo checkpoint sicuro.');
      return true;
    }catch(error){console.error('Resume failed:',error);window.alert('Checkpoint non valido o corrotto.');return false;}
  }
  savedProgressText(){

    let data;try{data=window.PokexCheckpoints?.load();}catch(_){}
    if(!data)return 'Nessun progresso salvato disponibile.';
    const stats=window.PokexCheckpoints.progress(data);
    return `Piano ${stats.floor}/80 · Medaglie ${stats.badges}/8 · Pokémon ${stats.pokemon} · PokéCoins $${stats.money}`;
  }
  openMenuMessage(type){
    this.menuMessageType=type;
    const dialog=this.$id('menu-message'),confirm=this.$id('menu-message-confirm');
    const content=this.$id('menu-message-text'),cancel=this.$id('menu-message-cancel');

    content.textContent=type==='support'?('Vuoi contattare l’assistenza?'):
      this.savedProgressText();
    confirm.classList.toggle('hidden',type!=='support');
    confirm.textContent='SÌ';cancel.textContent=type==='support'?('NO'):('CHIUDI');
    dialog.classList.remove('hidden');cancel.focus();
  }
  closeMenuMessage(){this.$id('menu-message')?.classList.add('hidden');this.$id('btn-contact-support')?.focus();}

  openPokemartDialog(){
    if(!this.isTownFloor()||this.isCelestialCave||this.isLocked)return false;
    this.stopContinuousWalk();this.playerFacing='up';this.playerStep=0;
    this.isLocked=true;
    this.triggerNpcEvent({specialRole:'pokemart-clerk',npcName:'Commesso PokéMarket',
      npcSprite:overworldSpriteUrl('clerk'),npcEvent:'dialogue'});
    return true;
  }
  openPokemartShop(){
    this.isLocked=true;
    this.renderSidebar();
    this.$id('pokemart-overlay')?.classList.remove('hidden');
    const choice=[...this.$id('pokemart-overlay').querySelectorAll('.mart-catalogue button:not(.hidden):not(:disabled)')][0];
    (choice||this.$id('close-market-btn'))?.focus();
    this.logMsg('Hai aperto il PokéMarket.');
    return true;
  }
  closePokemart(){
    const market=this.$id('pokemart-overlay');
    if(!market||market.classList.contains('hidden'))return false;
    market.classList.add('hidden');
    this.isLocked=true;
    this.triggerNpcEvent({specialRole:'pokemart-farewell',npcName:'Commesso PokéMarket',
      npcSprite:overworldSpriteUrl('clerk'),npcEvent:'dialogue'});
    return true;
  }
  bindEvents() {
    const safeOnClick = (id, callback) => {
      const el = document.getElementById(id);
      if (el) el.onclick = callback;
    };

    safeOnClick('celestial-dialog-next',()=>this.advanceCelestialDialog());
    safeOnClick('celestial-dialog-yes',()=>this.answerOakInvitation(true));
    safeOnClick('celestial-dialog-no',()=>this.answerOakInvitation(false));
    safeOnClick('celestial-team-confirm',()=>this.confirmCelestialTeam());
    safeOnClick('celestial-team-cancel',()=>this.cancelCelestialTeam());
    safeOnClick('oak-lab-close',()=>this.closeOakLaboratory());
    safeOnClick('btn-oak-lab',()=>this.openOakLaboratory());
    // Dedicated keyboard handling prevents overworld walking behind these modals.
    document.addEventListener('keydown',event=>this.handleCelestialModalKey(event),true);
    safeOnClick('choose-male',()=>this.selectPlayerGender('male'));
    safeOnClick('choose-female',()=>this.selectPlayerGender('female'));
    safeOnClick('btn-start-game', () => {
      const previous=window.PokexCheckpoints?.load();
      if(previous && !window.confirm('Una nuova avventura sostituirà il checkpoint precedente. Confermi?'))return;
      // Keep previous checkpoint until starter selection finishes successfully.
      this.runId='run-'+Date.now();
      this.$id('main-menu-overlay').classList.add('hidden');
      this.startStarterScene();
    });
    safeOnClick('btn-continue-game',()=>this.continueAdventure());

    safeOnClick('btn-return-main-menu', () => this.returnToMainMenu());
    safeOnClick('btn-contact-support',()=>this.openMenuMessage('support'));
    safeOnClick('btn-view-progress',()=>this.openMenuMessage('progress'));
    safeOnClick('menu-message-cancel',()=>this.closeMenuMessage());
    safeOnClick('menu-message-confirm',()=>{
      if(this.menuMessageType!=='support')return;
      // This URL is the user's exact official support invite; never navigate on NO.
      window.open('https://discord.com/invite/qNGscTEYHM','_blank','noopener,noreferrer');
      this.closeMenuMessage();
    });
    safeOnClick('btn-raid-api-retry', () => this.retryRaidBattle());
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
    safeOnClick('pokemon-tab-stats',()=>this.selectPokemonInfoTab('stats'));
    safeOnClick('pokemon-tab-moves',()=>this.selectPokemonInfoTab('moves'));
    safeOnClick('btn-badge-case',()=>this.openBadgeCase());
    // The Hybrid Pokédex is bound by pokedex-ui.js (sidebar and main menu).
    safeOnClick('badge-case-close',()=>this.closeBadgeCase());
    this.$id('badge-case-overlay')?.addEventListener('click',event=>{if(event.target===event.currentTarget)this.closeBadgeCase();});

    safeOnClick('btn-act-fight', () => this.showMoves());
    safeOnClick('btn-act-bag', () => this.showBagMenu());
    safeOnClick('battle-close-bag', () => this.showMainActions());
    safeOnClick('battle-close-team', () => { if(!this.pendingForcedSwitch)this.showMainActions(); });
    safeOnClick('btn-move-back', () => this.showMainActions());
    safeOnClick('btn-act-switch',()=>this.showTeamMenu());

    safeOnClick('btn-act-run', () => {
      if(this.battleConfirmAction)return;
      if (this.isRaidActive || this.battleType === 'gym' || this.battleType === 'trainer' || this.battleType === 'mewtwo') {
        this.setBattleMsg("Non puoi fuggire da questa sfida!");
        return;
      }
      if (this.battleBusy || this.pendingForcedSwitch || this.hasForcedBattleAction()) return;
      if((this.activeMon?.trappedTurns>0 || this.isOpponentTrapping(this.activeMon)) && this.activeMon.ability!=='run-away'){
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
      this.startBattle('gym',true);
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
    safeOnClick('buy-ability-capsule-btn',()=>this.purchaseItem('abilityCapsule',3000));
    safeOnClick('ability-capsule-cancel',()=>this.closeAbilityCapsule());
    this.$id('ability-capsule-overlay')?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.closeAbilityCapsule();}
      if(event.key==='Tab'){
        const choices=[...this.$id('ability-capsule-overlay').querySelectorAll('button:not(:disabled)')];
        if(!choices.length)return;const first=choices[0],last=choices.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
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

    const closeMarket=()=>this.closePokemart();
    safeOnClick('close-market-btn',closeMarket);
    safeOnClick('mart-close-x',closeMarket);
    document.addEventListener('keydown',event=>{
      const shop=this.$id('pokemart-overlay');if(!shop||shop.classList.contains('hidden'))return;
      const items=[...shop.querySelectorAll('button:not([disabled]):not(.hidden)')].filter(el=>el.getClientRects().length);
      if(event.key==='Escape'){event.preventDefault();closeMarket();return;}
      if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();event.stopPropagation();
        const delta=['w','a','ArrowUp','ArrowLeft'].includes(event.key)?-1:1;
        const ix=items.indexOf(document.activeElement);
        items[(ix<0?(delta>0?0:items.length-1):(ix+delta+items.length)%items.length)]?.focus();return;
      }
      if((event.code==='Space'||event.key===' ')&&items.includes(document.activeElement)){
        event.preventDefault();event.stopPropagation();document.activeElement.click();
      }
    },true);

    safeOnClick('close-box-btn', () => {
      document.getElementById('box-pc-overlay').classList.add('hidden');
      this.isLocked = false;
      this.logMsg("Squadra e PP curati al Centro Pokémon!");
      this.saveCheckpoint();
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

    this.installBattleKeyboardNavigation();

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
      if(!this.$id('pokedex-overlay')?.classList.contains('hidden'))return;
      if(e.key==='Escape' && !this.$id('badge-case-overlay')?.classList.contains('hidden')){this.closeBadgeCase();return;}
      if(e.key==='Escape' && !this.$id('party-action-menu')?.classList.contains('hidden')){this.closePartyActions();return;}
      if(e.code==='Space' && !e.repeat){
        // A trainer challenge is a confirmation screen, not the overworld:
        // Space must activate the very same LOTTA! button as a mouse click.
        // Consume the keyboard default too, or the browser may click a focused
        // button again on keyup. Repeated/held keys must never start two battles.
        const trainerIntro=this.$id('trainer-encounter-overlay');
        if(trainerIntro && !trainerIntro.classList.contains('hidden')){
          e.preventDefault();e.stopImmediatePropagation();
          const fightButton=this.$id('btn-start-trainer-battle');
          if(fightButton && !fightButton.disabled)fightButton.click();
          return;
        }
        if(!this.$id('celestial-dialog')?.classList.contains('hidden')){
          e.preventDefault();e.stopImmediatePropagation();
          if(this.celestialDialogStep==='question'){
            const choice=this.$id('celestial-dialog-actions');
            (choice?.contains(document.activeElement)?document.activeElement:this.$id('celestial-dialog-yes'))?.click();
          }else this.advanceCelestialDialog();
          return;
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
      if(!this.$id('celestial-dialog')?.classList.contains('hidden')){
        e.preventDefault();
        if(this.celestialDialogStep==='question'){
          const current=document.activeElement===this.$id('celestial-dialog-no')?'no':'yes';
          this.$id(current==='yes'?'celestial-dialog-no':'celestial-dialog-yes')?.focus();
        }
        return;
      }
      if(this.$id('pokemon-info-overlay')&&!this.$id('pokemon-info-overlay').classList.contains('hidden'))return;
      if(this.$id('badge-case-overlay')&&!this.$id('badge-case-overlay').classList.contains('hidden'))return;
      if(this.$id('pokedex-overlay')&&!this.$id('pokedex-overlay').classList.contains('hidden'))return;
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

  walkClock(){return typeof performance!=='undefined'?performance.now():Date.now();}

  startContinuousWalk(dx,dy,source){
    if(this.$id('pokemon-info-overlay') && !this.$id('pokemon-info-overlay').classList.contains('hidden'))return false;
    if(this.$id('badge-case-overlay') && !this.$id('badge-case-overlay').classList.contains('hidden'))return false;
    if(this.$id('pokedex-overlay') && !this.$id('pokedex-overlay').classList.contains('hidden'))return false;
    if(this.$id('party-action-menu') && !this.$id('party-action-menu').classList.contains('hidden'))return false;
    if((this.$id('dev-code-overlay') && !this.$id('dev-code-overlay').classList.contains('hidden')) ||
       (this.$id('floor-jump-overlay') && !this.$id('floor-jump-overlay').classList.contains('hidden')) ||
       this.isLocked||this.adventureCompleted||this.pendingItemTarget||!this.gridMap?.length)return false;
    // Keyboard auto-repeat never creates a second input or an overlapping timer.
    if(this.walkInputs.has(source))return true;
    this.walkInputs.set(source,{dx,dy});
    this.heldWalk={dx,dy,source};
    // Last pressed direction wins; releasing it resumes an earlier held direction.
    // A new input during an active step is deferred until the animation ends.
    this.queueContinuousWalk(true);
    return true;
  }

  queueContinuousWalk(immediate=false){
    clearTimeout(this.walkHoldTimer);
    this.walkHoldTimer=null;
    const input=Array.from(this.walkInputs.values()).at(-1);
    if(!input)return;
    if(this.isLocked||this.pendingItemTarget||this.adventureCompleted){this.stopContinuousWalk();return;}
    const now=this.walkClock();
    const remaining=Math.max(0,this.walkReadyAt-now);
    if(immediate&&remaining<=0){
      this.movePlayer(input.dx,input.dy);
      this.walkHoldTimer=setTimeout(()=>this.queueContinuousWalk(),Math.max(this.gameDelay(220),this.walkReadyAt-this.walkClock()));
      return;
    }
    const delay=immediate?Math.max(1,remaining):Math.max(this.gameDelay(220),remaining);
    this.walkHoldTimer=setTimeout(()=>{
      this.walkHoldTimer=null;
      const active=Array.from(this.walkInputs.values()).at(-1);
      if(!active)return;
      if(this.isLocked||this.pendingItemTarget||this.adventureCompleted){this.stopContinuousWalk();return;}
      if(this.walkClock()>=this.walkReadyAt-0.25)this.movePlayer(active.dx,active.dy);
      this.queueContinuousWalk();
    },delay);
  }

  stopContinuousWalk(source){
    if(source)this.walkInputs.delete(source);
    else this.walkInputs.clear();
    clearTimeout(this.walkHoldTimer);this.walkHoldTimer=null;
    const last=Array.from(this.walkInputs.entries()).at(-1);
    if(!last){this.heldWalk=null;return;}
    this.heldWalk={source:last[0],...last[1]};
    this.queueContinuousWalk(true);
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
        wrapper.innerHTML='<span class="ball-pad"></span><span class="ball-model" aria-hidden="true"><span class="pokeball-top"></span><span class="pokeball-button"></span><span class="pokeball-bottom"></span></span><span class="starter-name"></span><span class="starter-kind"></span>';
        wrapper.querySelector('.starter-name').textContent=data.name.toUpperCase();
        wrapper.querySelector('.starter-kind').textContent=data.elemLabel;
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
      container.textContent='Connessione ai dati Pokémon non riuscita. ';
      const retry=document.createElement('button');retry.type='button';retry.className='btn-nav';
      retry.textContent='RIPROVA';retry.onclick=()=>this.startStarterScene();
      container.appendChild(retry);
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
    window.PokexDex?.record(this.activeMon,'caught',`Starter · Piano ${this.floor}`);
    document.getElementById('starter-scene-overlay').classList.add('hidden');
    this.generateFloorDungeon();
    this.saveCheckpoint();
    window.dispatchEvent?.(new Event('pokex:dex-battle-ended'));
  }

  cancelPokemonCenterHealing(){
    clearTimeout(this.pokemonCenterHealTimer);
    this.pokemonCenterHealTimer=null;
    this.pokemonCenterHealSequence=(this.pokemonCenterHealSequence||0)+1;
  }

  openPokemonCenterDialog(){
    // Interact from directly in front of the building: keep the village/city
    // map, floor, avatar position and checkpoint untouched until healing ends.
    if(!this.isTownFloor()||this.isCelestialCave||this.isLocked)return false;
    this.stopContinuousWalk();
    this.isLocked=true;
    this.playerFacing='up';this.playerStep=0;
    this.triggerNpcEvent({
      specialRole:'pokemon-center-nurse',npcName:'Infermiera Joy',
      npcLine:'Mi prenderò cura dei tuoi Pokémon!',
      npcSprite:overworldSpriteUrl('nurse'),npcEvent:'dialogue'
    });
    this.logMsg('Infermiera Joy: cura la tua squadra al Centro Pokémon.');
    return true;
  }

  playPokemonCenterHealSound(){
    if(typeof Audio==='undefined')return false;
    try{
      if(!this.pokemonCenterHealAudio){
        this.pokemonCenterHealAudio=new Audio('assets/audio/pokeheal.mp3');
        this.pokemonCenterHealAudio.preload='auto';
      }
      this.pokemonCenterHealAudio.pause();this.pokemonCenterHealAudio.currentTime=0;
      // Separate channel but the same global MUSIC control as the soundtrack.
      // Muting or moving the volume slider also affects an already-playing heal sound.
      const manager=window.pokexplorerMusic;
      if(manager?.registerEffect)manager.registerEffect(this.pokemonCenterHealAudio,.7);
      else {
        const sliderVolume=Number(this.$id('music-volume')?.value);
        this.pokemonCenterHealAudio.volume=.7*Math.max(0,Math.min(100,Number.isFinite(sliderVolume)?sliderVolume:10))/100;
      }
      // Never pause, fade, or replace background music.
      const playing=this.pokemonCenterHealAudio.play();
      playing?.catch?.(error=>console.warn('Motivetto di cura non riproducibile:',error));
      return true;
    }catch(error){console.warn('Errore audio Centro Pokémon',error);return false;}
  }

  startPokemonCenterHealing(overlay,speech){
    clearTimeout(this.pokemonCenterHealTimer);
    const token=++this.pokemonCenterHealSequence;
    speech.textContent='Mi prenderò cura dei tuoi Pokémon!';
    this.pokemonCenterHealTimer=setTimeout(()=>{
      this.pokemonCenterHealTimer=null;
      if(token!==this.pokemonCenterHealSequence||this.activeDialogNpcCell?.specialRole!=='pokemon-center-nurse'||overlay.classList.contains('hidden'))return;
      for(const pokemon of this.team)pokemon.healAll();
      this.renderSidebar();
      this.playPokemonCenterHealSound();
      speech.textContent='La tua squadra è in perfetta forma, a presto';
      this.logMsg('Centro Pokémon: squadra, PP e stati alterati ripristinati.');
      this.waitForNpcClick(overlay);
    },2000);
  }

generateFloorDungeon() {
    this.cancelPokemonCenterHealing();
    this.isCelestialCave=false;this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
    window.pokexplorerMusic?.setScene('exploration');
    this.gridMap = [];
    this.playerPos = { x: 0, y: 0 };
    this.isLocked = false;
    this.isRaidActive = false;
    this.raidQueueCount = 0;
    this.raidTriggeredOnFloor = false;
    this.clearRaidTransientState();
    this.gymQueue = [];
    this.currentGym = null;
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
        c.npcName=FIRERED_NPC_LABELS_IT[officialIndex];
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
          c.npcSprite=overworldSpriteUrl('fisher');
          c.localSpriteFallback='assets/sprites/ui/trainer-avatar-fallback.svg';
        }
        if(this.floor===20 && i===0){
          c.specialRole='exp-share-gift';c.npcName='Assistente Pokémon';
          c.npcLine='Hai sconfitto Misty? Ho qualcosa per la tua squadra.';
          c.npcSprite=overworldSpriteUrl('scientist');
          c.localSpriteFallback='assets/sprites/ui/trainer-avatar-fallback.svg';
        }
      }
      if(this.floor===75&&!this.oakEventDismissed){
        const oak=this.gridMap[3][5];oak.type='town-ground';oak.entity='npc';oak.decoration=null;
        oak.specialRole='celestial-oak';oak.npcName='Professor Oak';
        oak.npcSprite='assets/sprites/npc/oak-frlg-down.png';
        oak.localSpriteFallback='assets/sprites/npc/oak-frlg-down.png';
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
      // Item and trainer placements are independent of the existing surprise-raid trigger.
      // F02 is intentionally not part of this release.
      const classes=[['Bullo','youngster-gen3','youngster'],['Pigliamosche','bugcatcher-gen3','bug_catcher'],
        ['Fantallenatore','acetrainer-gen3','cooltrainer_m'],['Pokémon Ranger','pokemonranger-gen3','cooltrainer_f'],
        ['Montanaro','hiker-gen3','hiker'],['Campeggiatore','camper-gen3','camper']];
      for(let i=0,n=1+Math.floor(Math.random()*4);i<n;i++) {
        const c=pick(); if(!c)break;
        const [name,sprite,overworld]=classes[Math.floor(Math.random()*classes.length)];
        c.entity='trainer'; c.trainerName=name;
        c.trainerSprite=overworldPortraitUrl(overworld);
        c.trainerOverworldSprite=overworldSpriteUrl(overworld);
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
    }

    if(isCity || isVillage || this.devMode){
      // Dev Mode reveals every tile of this dungeon as soon as it is generated.
      // Hidden raid triggers remain hidden: only the fog-of-war is removed.
      for(const row of this.gridMap)for(const cell of row)cell.revealed=true;
    } else this.revealArea(0,0);
    this.renderDungeon();
    this.renderSidebar();
    if(this.floor===75&&!this.oakEventDismissed){
      this.logMsg('Un silenzio innaturale avvolge il villaggio. Il Professor Oak ti sta aspettando.');
      this.showDiscoveryNotice?.('UN PRESAGIO · IL PROFESSOR OAK TI ASPETTA',3600);
    }else this.logMsg(`Sei arrivato al Livello ${this.floor}. Esplora liberamente!`);
  }

  // Floor 75: authored story event. A refusal does not permanently lose the invitation.
  // The two expedition members are a temporary battle party; the remaining
  // Pokémon never enter the cave and must survive even if the mission fails.
  openCelestialTeamSelection(){
    if(this.isCelestialCave||!this.team.length)return false;
    this.celestialRosterSelection=new Set();this.celestialExpeditionBusy=false;
    this.$id('celestial-expedition')?.classList.remove('hidden');
    this.$id('celestial-dialog')?.classList.add('hidden');
    this.isLocked=true;this.stopContinuousWalk();
    this.renderCelestialTeamSelection();return true;
  }
  renderCelestialTeamSelection(){
    const list=this.$id('celestial-team-list');if(!list)return;
    list.replaceChildren();
    const max=Math.min(2,Math.max(0,this.team.length-1));
    for(const [index,mon] of this.team.entries()){
      const selected=this.celestialRosterSelection.has(index);
      const button=document.createElement('button');button.type='button';
      button.className='celestial-roster-choice'+(selected?' selected':'');
      button.setAttribute('aria-pressed',String(selected));
      const marker=document.createElement('span');marker.textContent=selected?'✓':'○';
      const picture=document.createElement('img');picture.src=resolvedSpritePath(mon.spriteFront||'assets/sprites/ui/pokemon-placeholder.svg');picture.alt='';
      picture.onerror=()=>{picture.onerror=null;picture.src='assets/sprites/ui/pokemon-placeholder.svg';};
      const name=document.createElement('span');name.textContent=`${mon.name} · Lv.${mon.level} · ${mon.currentHp}/${mon.maxHp} PS`;
      button.append(marker,picture,name);
      button.onclick=()=>{
        if(this.celestialExpeditionBusy)return;
        if(selected)this.celestialRosterSelection.delete(index);
        else if(this.celestialRosterSelection.size<max)this.celestialRosterSelection.add(index);
        this.renderCelestialTeamSelection();
        list.children[index]?.focus({preventScroll:true});
      };
      if(!selected&&this.celestialRosterSelection.size>=max)button.disabled=true;
      list.append(button);
    }
    const count=this.celestialRosterSelection.size;
    this.$id('celestial-team-counter').textContent=`${count} / ${max} SELEZIONATI · ${this.team.length-count} AL SICURO`;
    const confirm=this.$id('celestial-team-confirm');confirm.disabled=count<1||this.celestialExpeditionBusy;
    const help=this.$id('celestial-team-help');
    help.textContent=max<1?'Serve almeno un Pokémon da lasciare al villaggio prima di partire.':
      'Scegli al massimo due Pokémon. Se tutti i compagni della spedizione vengono sconfitti, li perderai definitivamente.';
    const first=list.querySelector('button:not(:disabled)');
    if(!list.contains(document.activeElement)&&document.activeElement!==confirm)first?.focus({preventScroll:true});
  }
  cancelCelestialTeam(){
    if(this.celestialExpeditionBusy)return;
    this.$id('celestial-expedition')?.classList.add('hidden');
    this.celestialRosterSelection.clear();this.isLocked=false;
    this.oakEventDismissed=false;
    this.logMsg('Il Professor Oak ti attenderà quando sarai pronto.');
  }
  async confirmCelestialTeam(){
    if(this.celestialExpeditionBusy||this.isCelestialCave)return false;
    const choice=[...this.celestialRosterSelection].sort((a,b)=>a-b);
    if(choice.length<1||choice.length>2||choice.length>=this.team.length||
       choice.some(index=>!this.team[index]||this.team[index].currentHp<=0))return false;
    this.celestialExpeditionBusy=true;
    const chosen=new Set(choice),previous=this.team;
    this.celestialReserve=previous.filter((_,index)=>!chosen.has(index));
    this.team=previous.filter((_,index)=>chosen.has(index));
    this.ensureActivePokemon();this.celestialRosterSelection.clear();
    this.$id('celestial-expedition')?.classList.add('hidden');
    this.oakEventDismissed=true;
    const oak=this.gridMap?.[3]?.[5];
    if(oak?.specialRole==='celestial-oak'){oak.entity=null;oak.specialRole=null;}
    this.renderDungeon();this.renderSidebar();
    try{await this.enterCelestialCave();return true;}
    finally{this.celestialExpeditionBusy=false;}
  }
  handleCelestialModalKey(event){
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' ','Enter','Escape'].includes(event.key))return;
    let modal=this.$id('celestial-expedition');
    if(modal?.classList.contains('hidden'))modal=this.$id('oak-laboratory');
    if(!modal||modal.classList.contains('hidden'))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.repeat && [' ','Enter'].includes(event.key))return;
    const options=[...modal.querySelectorAll('button:not(:disabled):not(.hidden)')].filter(button=>button.offsetParent!==null);
    if(event.key==='Escape'){
      if(modal.id==='celestial-expedition')this.cancelCelestialTeam();
      else if(!this.celestialDepositRequired)this.closeOakLaboratory();
      return;
    }
    if(event.key===' '||event.key==='Enter'){
      const active=options.includes(document.activeElement)?document.activeElement:options[0];
      active?.click();return;
    }
    if(!options.length)return;
    const forward=['s','d','S','D','ArrowDown','ArrowRight'].includes(event.key);
    const index=options.indexOf(document.activeElement);
    options[(index+(forward?1:-1)+options.length)%options.length]?.focus({preventScroll:true});
  }
  // Stored Pokémon keep their individual identity, moves, ability, gender and
  // shiny state. They are not casualties and can be withdrawn in towns.
  openOakLaboratory(forceDeposit=false){
    if(!forceDeposit && (this.isCelestialCave||this.isBattleVisible()||!this.isTownFloor()||this.isLocked))return false;
    this.celestialDepositRequired=!!forceDeposit;
    this.isLocked=true;this.stopContinuousWalk();
    this.$id('oak-laboratory')?.classList.remove('hidden');
    this.renderOakLaboratory();return true;
  }
  renderOakLaboratory(){
    const list=this.$id('oak-lab-options');if(!list)return;
    list.replaceChildren();
    const forced=this.celestialDepositRequired;
    const message=this.$id('oak-lab-message');
    message.textContent=forced?'Professor Oak: «Hai sette Pokémon con te! Quale vuoi lasciare al mio laboratorio? Sarà al sicuro e potrai recuperarlo in un altro villaggio.»':
      'Laboratorio del Professor Oak · Deposita un Pokémon oppure ritiralo quando hai uno spazio libero.';
    const add=(mon,kind,index)=>{
      const button=document.createElement('button');button.type='button';button.className='celestial-roster-choice';
      const img=document.createElement('img');img.src=resolvedSpritePath(mon.spriteFront||'assets/sprites/ui/pokemon-placeholder.svg');img.alt='';
      img.onerror=()=>{img.onerror=null;img.src='assets/sprites/ui/pokemon-placeholder.svg';};
      const label=document.createElement('span');label.textContent=`${kind==='deposit'?'DEPOSITA':'RITIRA'} · ${mon.name} Lv.${mon.level}`;
      button.append(img,label);button.onclick=()=>{
        if(kind==='deposit')this.depositOakPokemon(index);else this.withdrawOakPokemon(index);
      };list.append(button);
    };
    const canDeposit=forced?this.team.length>6:this.team.length>1;
    if(canDeposit)this.team.forEach((mon,index)=>add(mon,'deposit',index));
    if(!forced && this.team.length<6)this.laboratoryPokemon.forEach((mon,index)=>add(mon,'withdraw',index));
    if(!list.children.length){const empty=document.createElement('p');empty.textContent='Nessun trasferimento disponibile.';list.append(empty);}
    this.$id('oak-lab-count').textContent=`IN SQUADRA ${this.team.length}/6 · AL LABORATORIO ${this.laboratoryPokemon.length}`;
    const close=this.$id('oak-lab-close');close.classList.toggle('hidden',forced);
    if(forced)close.disabled=true;else close.disabled=false;
    list.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  depositOakPokemon(index){
    if(!this.isTownFloor()||this.isCelestialCave||this.isBattleVisible())return false;
    const forced=this.celestialDepositRequired;
    if(index<0||index>=this.team.length||this.laboratoryPokemon.length>=250||(!forced&&this.team.length<=1)||
       (forced&&this.team.length!==7))return false;
    const [mon]=this.team.splice(index,1);
    this.laboratoryPokemon.push(mon);this.ensureActivePokemon();
    this.renderSidebar();
    if(forced){this.celestialDepositRequired=false;this.closeOakLaboratory();}
    else this.renderOakLaboratory();
    this.saveCheckpoint();return true;
  }
  withdrawOakPokemon(index){
    if(this.celestialDepositRequired||!this.isTownFloor()||this.isCelestialCave||this.isBattleVisible()||
       this.team.length>=Math.min(6,this.getTeamSlotLimit())||index<0||index>=this.laboratoryPokemon.length)return false;
    this.team.push(...this.laboratoryPokemon.splice(index,1));this.ensureActivePokemon();
    this.renderSidebar();this.renderOakLaboratory();this.saveCheckpoint();return true;
  }
  closeOakLaboratory(){
    if(this.celestialDepositRequired)return false;
    this.$id('oak-laboratory')?.classList.add('hidden');this.isLocked=false;
    this.renderSidebar();return true;
  }
  finishCelestialExpeditionDefeat(){
    if(!this.isCelestialCave||!this.celestialReturnState)return false;
    const casualties=this.team.length;this.team=[...this.celestialReserve];this.celestialReserve=[];
    this.celestialPhase='unvisited';this.oakEventDismissed=false;
    this.battleToken++;this.battleBusy=false;this.pendingForcedSwitch=false;
    this.battleMode=null;this.battleType=null;this.battleWeather=null;this.pendingItemTarget=null;
    this.enemyMon?.clearBattleConditions?.();this.enemyMon=null;
    this.closePartyActions();this.closePokemonInfo();
    this.$id('overlay-battle')?.classList.add('hidden');
    this.$id('overlay-battle')?.classList.remove('battle-preparing','battle-revealing');
    this.$id('battle-controls')?.classList.add('hidden');
    this.$id('battle-confirm')?.classList.add('hidden');
    this.$id('item-target-prompt')?.classList.add('hidden');
    this.$id('rotom-body')?.classList.remove('battle-active');
    this.updateBattleWingCloseButtons();
    this.$id('gameover-overlay')?.classList.add('hidden');
    this.$id('celestial-dialog')?.classList.add('hidden');
    const saved=this.celestialReturnState;this.gridMap=saved.gridMap;
    this.playerPos={...saved.playerPos};this.floor=saved.floor;
    this.celestialReturnState=null;this.isCelestialCave=false;
    this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
    this.$id('area-type-label').textContent='VILLAGGIO';
    this.ensureOakEventAccessible();this.ensureActivePokemon();
    this.isLocked=false;this.renderDungeon();this.renderSidebar();
    this.logMsg(`La Grotta Celeste ti respinge. Hai perso definitivamente ${casualties} Pokémon della spedizione. Gli altri sono al sicuro.`);
    this.showDiscoveryNotice('SPEDIZIONE FALLITA · POKÉMON PERSI',3500);
    window.pokexplorerMusic?.setScene('exploration');
    this.saveCheckpoint();return true;
  }
  showOakIntroduction(){
    this.$id('npc-dialog-overlay')?.classList.add('hidden');
    this.pendingNpcAdvance=null;this.hideDialogNpcBackground(false);
    this.showCelestialDialogue('Ti stavo aspettando. Da giorni gli strumenti del laboratorio registrano un segnale impossibile, proprio sotto queste montagne.', 'intro-one');
  }
  showCelestialDialogue(line,step){
    this.celestialDialogStep=step;this.isLocked=true;this.stopContinuousWalk();
    const panel=this.$id('celestial-dialog');
    this.$id('celestial-dialog-text').textContent=line;
    const question=step==='question';
    this.$id('celestial-dialog-actions').classList.toggle('hidden',!question);
    this.$id('celestial-dialog-next').classList.toggle('hidden',question);
    const heading=this.$id('celestial-dialog-chapter');
    const progress=this.$id('celestial-dialog-progress');
    const chapter=step.startsWith('intro')||question?'PIANO 75 · IL RICHIAMO':
      step.startsWith('arrival')?'GROTTA CELESTE · LA SOGLIA':
      step.startsWith('reward')?'GROTTA CELESTE · LA PROVA':
      'GROTTA CELESTE · EPILOGO';
    if(heading)heading.textContent=chapter;
    if(progress)progress.textContent=({
      'intro-one':'01 / 05','intro-two':'02 / 05','intro-three':'03 / 05','intro-four':'04 / 05',
      question:'05 / 05','arrival-one':'01 / 03','arrival-two':'02 / 03','arrival-three':'03 / 03',
      'reward-one':'01 / 03','reward-two':'02 / 03','reward-three':'03 / 03',
      'farewell-one':'01 / 02','farewell-two':'02 / 02'
    })[step]||'';
    panel.classList.remove('hidden');
    (question?this.$id('celestial-dialog-yes'):this.$id('celestial-dialog-next'))?.focus({preventScroll:true});
  }
  advanceCelestialDialog(){
    if(this.$id('celestial-dialog')?.classList.contains('hidden'))return;
    const lines={
      'intro-one':['intro-two','Nessun Pokémon selvatico si avvicina più alla Grotta Celeste. Persino i più coraggiosi fuggono quando cala il silenzio.'],
      'intro-two':['intro-three','Non si tratta di un fenomeno naturale. Qualcuno ha creato una forza che non avrebbe mai dovuto essere liberata. Il suo nome è Mewtwo.'],
      'intro-three':['intro-four','Questa missione non perdona gli errori. Potrai portare al massimo due Pokémon, lasciando gli altri al sicuro. Se entrambi saranno sconfitti, non faranno ritorno.'],
      'intro-four':['question','Vuoi accompagnarmi nella Grotta Celeste? Puoi rifiutare e tornare quando sarai pronto.'],
      'arrival-one':['arrival-two','Ascolta… non è il vento. Qualcosa ci osserva da molto prima che varcassimo l’ingresso.'],
      'arrival-two':['arrival-three','Davanti a noi c’è Mewtwo. Prima di tentare la cattura dovrai affrontarlo e dimostrare di saper resistere alla sua forza.'],
      'reward-one':['reward-two','Mewtwo ti ha messo alla prova e ora ti riconosce come avversario. Ma non è finita: è ancora lì, in attesa.'],
      'reward-two':['reward-three','Questa Master Ball è il risultato di anni di ricerca. Può riuscire dove ogni altra Poké Ball fallirebbe. Usala con giudizio.'],
      'farewell-one':['farewell-two','La Grotta Celeste tornerà silenziosa, ma ciò che hai dimostrato qui resterà con te.'],
    };
    const next=lines[this.celestialDialogStep];
    if(next){this.showCelestialDialogue(next[1],next[0]);return;}
    if(this.celestialDialogStep==='question')return;
    const ending=this.celestialDialogStep;
    this.$id('celestial-dialog').classList.add('hidden');
    if(ending==='farewell-two'){
      this.finishCelestialReturn();return;
    }
    this.isLocked=false;
    if(ending==='reward-three'){
      this.logMsg('MASTER BALL ottenuta. Mewtwo ti attende per la seconda sfida.');
      this.showDiscoveryNotice('MASTER BALL OTTENUTA · SECONDA SFIDA',3100);
    }
  }
  answerOakInvitation(yes){
    if(this.celestialDialogStep!=='question')return;
    this.$id('celestial-dialog').classList.add('hidden');
    if(!yes){
      // Reversible: Oak stays on floor 75 and may be spoken to again.
      this.isLocked=false;
      this.oakEventDismissed=false;
      this.logMsg('Oak annuisce. «Prenditi il tempo che serve. Ti aspetterò qui.»');
      return;
    }
    this.openCelestialTeamSelection();
  }
  // Older checkpoints could mark Oak as dismissed despite the player refusing.
  ensureOakEventAccessible(){
    if(this.floor!==75||this.isCelestialCave||this.celestialPhase!=='unvisited')return;
    const oak=this.gridMap?.[3]?.[5];if(!oak)return;
    if(!oak.entity || oak.specialRole==='celestial-oak'){
      this.oakEventDismissed=false;
      oak.entity='npc';oak.type='town-ground';oak.decoration=null;
      oak.specialRole='celestial-oak';oak.npcName='Professor Oak';
      oak.npcSprite='assets/sprites/npc/oak-frlg-down.png';
      oak.localSpriteFallback='assets/sprites/npc/oak-frlg-down.png';
    }
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
      oak.npcName='Professor Oak';oak.npcSprite='assets/sprites/npc/oak-frlg-down.png';
      oak.localSpriteFallback='assets/sprites/npc/oak-frlg-down.png';
      this.$id('area-type-label').textContent='GROTTA CELESTE';
      this.renderDungeon();this.renderSidebar();
    });
    if(!this.isCelestialCave)return;
    await this.wait(600);
    window.pokexplorerMusic?.setScene('cave');
    this.showCelestialDialogue('La luce si spegne alle nostre spalle. Guarda quelle pareti… sembrano pulsare al ritmo di un cuore.','arrival-one');
  }
  async startMewtwoCinematic(){
    if(!this.isCelestialCave||!['trial','rematch'].includes(this.celestialPhase)||this.celestialCutsceneActive)return;
    this.celestialCutsceneActive=true;this.isLocked=true;this.stopContinuousWalk();
    const overlay=this.$id('celestial-cinematic');
    overlay.classList.remove('hidden');
    this.$id('celestial-cinematic-subtitle').textContent=this.celestialPhase==='trial'
      ?'Il silenzio si spezza. Una presenza immensa si risveglia…':'La grotta trema. Mewtwo ti riconosce e accetta l’ultima sfida.';
    window.pokexplorerMusic?.setScene('mewtwo');
    await this.wait(1900);
    if(!this.isCelestialCave){overlay.classList.add('hidden');this.celestialCutsceneActive=false;return;}
    overlay.classList.add('hidden');this.celestialCutsceneActive=false;
    this.startBattle('mewtwo');
  }
  showOakMasterBallReward(){
    if(this.items.masterball===0)this.grantItem('masterball');
    this.renderSidebar();
    this.showCelestialDialogue('Hai resistito a un potere che nessuno aveva mai saputo fronteggiare. Oak apre lentamente la valigetta che portava con sé…','reward-one');
  }
  completeMewtwoEncounter(){
    this.celestialPhase='complete';
    const mon=this.gridMap?.[4]?.[5];if(mon?.entity==='mewtwo')mon.entity=null;
    this.logMsg('La Grotta Celeste torna silenziosa. Oak ti aspetta prima dell’uscita a sud.');
  }
  leaveCelestialCave(){
    if(!this.isCelestialCave||this.celestialPhase!=='complete'||!this.celestialReturnState||this.celestialDeparturePending)return false;
    this.celestialDeparturePending=true;
    this.showCelestialDialogue('Ce l’hai fatta. Per un istante, la grotta è rimasta immobile, come se il mondo intero avesse trattenuto il respiro.','farewell-one');
    return true;
  }
  async finishCelestialReturn(){
    if(!this.isCelestialCave||this.celestialPhase!=='complete'||!this.celestialReturnState)return;
    this.isLocked=true;this.stopContinuousWalk();
    window.pokexplorerMusic?.setScene('exploration');
    try{
      await this.celestialFadeTo(async()=>{
        const previous=this.celestialReturnState;
        this.gridMap=previous.gridMap;this.playerPos={...previous.playerPos};
        this.floor=previous.floor;this.celestialReturnState=null;this.isCelestialCave=false;
        this.team=[...this.celestialReserve,...this.team];this.celestialReserve=[];this.ensureActivePokemon();
        this.$id('dungeon-grid-board')?.classList.remove('celestial-cave');
        this.$id('area-type-label').textContent='VILLAGGIO';
        this.renderDungeon();this.renderSidebar();
      });
    }finally{this.celestialDeparturePending=false;this.isLocked=false;}
    this.logMsg('Sei tornato al villaggio. Il ricordo della Grotta Celeste non ti abbandonerà.');
    if(this.team.length>6){this.openOakLaboratory(true);return;}
    this.saveCheckpoint();
  }
  // revealArea moved to js/map-helpers.js (R2.22 modularisation).
  // scanRadar moved to js/map-helpers.js (R2.22 modularisation).
  collectFloorItem(cell){
    if(!cell || cell.entity!=='item' || this.isRaidActive || this.raidBattleRetryPending)return false;
    if(!cell.itemKind){
      // Legacy maps without an assigned drop are upgraded once, never rerolled.
      const roll=Math.random();
      cell.itemKind=roll<.4?'pokeball':roll<.8?healingTier(this.floor).id:'elixir';
    }
    // Transactional check: a full inventory must not consume the tile,
    // including via the existing (unchanged) surprise-raid chance.
    if(!this.canAcceptItem(cell.itemKind)){
      const name={pokeball:'POKÉ BALL',potion:'POZIONE',superPotion:'SUPERPOZIONE',hyperPotion:'IPERPOZIONE',elixir:'ELISIR'}[cell.itemKind]||'OGGETTO';
      this.logMsg(`Zaino pieno: ${name} rimane a terra. Torna dopo aver liberato spazio.`);
      this.showDiscoveryNotice(`ZAINO PIENO · ${name}`);
      return false;
    }
    // Each successfully attempted collectible independently rolls a 10% Raid.
    // Only active/pending Raid state blocks another activation. A failed first
    // opponent load preserves the original roll on the same source cell.
    if(cell.raidRetryPending || Math.random()<.10){
      this.raidPickupSourceCell=cell;
      this.raidTriggeredOnFloor=true;
      cell.raidRetryPending=false;
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
    if(collected)this.saveCheckpoint();
    return collected;
  }

  canAcceptItem(id){
    if(id==='fishingRod')return !this.items.fishingRod;
    return BAG_LIMITS[id]!==undefined && (this.items[id]||0)<BAG_LIMITS[id];
  }
  grantItem(id,count=1){
    const limit=BAG_LIMITS[id]; if(limit===undefined)return false;
    if(id==='fishingRod'){if(this.items.fishingRod)return false;this.items.fishingRod=true;return true;}
    const available=Math.max(0,limit-(this.items[id]||0));
    if(!available)return false;
    this.items[id]+=Math.min(available,count);return true;
  }
  purchaseItem(id,price){
    if(!isPokemartItemUnlocked(id,this.floor)){this.logMsg('Questo rimedio non è ancora disponibile in questo PokéMarket.');return false;}
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
    if(this.walkClock()<this.walkReadyAt)return;
    if(Math.abs(dx)+Math.abs(dy)!==1)return; // never allow diagonals / zero steps
    this.playerFacing=dx<0?'left':dx>0?'right':dy<0?'up':'down';
    this.playerStep=0;
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
        this.renderDungeon();
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
        this.walkReadyAt=this.walkClock()+this.walkDurationMs;
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
        // Direct Nurse Joy conversation, without loading an indoor dungeon.
        if(this.playerPos.x===2&&this.playerPos.y===3&&dx===0&&dy===-1){
          this.openPokemonCenterDialog();
        }else this.logMsg('Parla con l’infermiera Joy davanti all’ingresso sul lato sud.');
        return;
      } else if (targetCell.entity === 'pokemart') {
        if(this.playerPos.x===7&&this.playerPos.y===3&&dx===0&&dy===-1){
          this.openPokemartDialog();
        }else this.logMsg('Parla con il commesso davanti all’ingresso sul lato sud.');
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
        this.saveCheckpoint();
        return;
      } else if(!this.isCelestialCave && targetCell.type==='grass' && this.rollLegendaryEncounter()){
        this.pendingWildEncounterType='legendary';this.isLocked=true;
        this.$id('wild-encounter-overlay').classList.remove('hidden');
        this.logMsg('Una presenza leggendaria ti osserva!');
      } else if (!this.isCelestialCave && targetCell.type === 'grass' && Math.random() < GAME_BALANCE.wildEncounterChance * (this.activeMon?.ability==='illuminate'?1.75:this.activeMon?.ability==='stench'?0.5:1)) {
        this.isLocked = true;
        this.logMsg('Un Pokémon selvatico è comparso!');
        document.getElementById('wild-encounter-overlay').classList.remove('hidden');
      }

      this.renderDungeon();
    }
  }

  rollLegendaryEncounter(random=Math.random){
    if(this.badgeCount()<3)return false;
    // TASK-007: 0.08% per still-available bird, per valid grass step.
    // Keep fixed intervals: already-owned birds do NOT boost the other odds.
    const owned=new Set([...(this.caughtLegendarySpecies||[]),...this.team.map(mon=>Number(mon.id))]);
    const roll=Math.min(.999999999,Math.max(0,Number(random())));
    // Integer tickets avoid floating-point ambiguity at 0.08% boundaries.
    const ticket=Math.floor(roll*1_000_000);
    const ticketsPerBird=LEGENDARY_BIRD_CHANCE_PER_STEP*1_000_000; // exactly 800
    const index=Math.floor(ticket/ticketsPerBird);
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
  clearRaidTransientState(){
    // Invalidate a pending "tap to enter the Raid" callback when the player
    // changes dungeon or returns to the menu.
    this.raidLaunchNonce=(this.raidLaunchNonce||0)+1;
    this.cancelRaidNotice?.();
    this.raidPickupSourceCell=null;
    this.raidBattleRetryPending=false;
    this.$id('raid-api-error')?.classList.add('hidden');
    this.$id('pokenav-screen-root')?.classList.remove('raid-discovery');
  }
  beginHiddenRaid(){
    if(this.isRaidActive || this.raidBattleRetryPending)return false;
    this.raidTriggeredOnFloor=true;
    this.isRaidActive=true;this.raidQueueCount=5;this.isLocked=true;
    const launch=++this.raidLaunchNonce;
    this.logMsg('Hai scoperto un RAID nascosto! Cinque battaglie senza cattura.');
    const root=this.$id('pokenav-screen-root');
    root.classList.add('raid-discovery');
    this.showDiscoveryNotice('RAID SEGRETO! 5 LOTTE · NESSUNA CATTURA',0);
    this.waitForNotice().then(()=>{
      if(launch!==this.raidLaunchNonce)return;
      root.classList.remove('raid-discovery');
      if(this.isRaidActive)this.startBattle('wild');
    });
    return true;
  }
  retryRaidBattle(){
    // The failed opponent was never awarded XP; retry that same queue slot.
    if(!this.isRaidActive || !this.raidBattleRetryPending ||
       this.raidQueueCount<1 || this.raidQueueCount>5)return false;
    this.raidBattleRetryPending=false;
    this.$id('raid-api-error')?.classList.add('hidden');
    this.startBattle('wild',true);
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
      const events=await pokemon.gainExperience(Math.max(0,needed),100,options=>this.chooseEvolution(pokemon,options));
      if(pokemon.level<=previousLevel)throw new Error('Nessun aumento di livello');
      this.items[id]--;
      this.renderSidebar();
      this.logMsg(`${id==='goldCandy'?'Caramella d’Oro':'Caramella Rara'}: ${pokemon.name} passa dal Lv.${previousLevel} al Lv.${pokemon.level}!`);
      for(const event of events){
        if(event.evolution){window.PokexDex?.record(pokemon,'caught',`Evoluzione · Piano ${this.floor}`);await this.showEvolution(pokemon,event.evolution);}
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
      this.clearRaidTransientState();
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
    if(npcCell?.localSpriteFallback)return resolvedSpritePath(npcCell.localSpriteFallback);
    if(npcCell?.specialRole==='fisherman')return 'assets/sprites/ui/trainer-avatar-fallback.svg';
    if(['celestial-oak','cave-oak'].includes(npcCell?.specialRole))return 'assets/sprites/npc/oak-frlg-down.png';
    if(npcCell?.specialRole==='exp-share-gift')return 'assets/sprites/ui/trainer-avatar-fallback.svg';
    if(npcCell?.specialRole==='gate-police')return 'assets/sprites/ui/trainer-avatar-fallback.svg';
    // Do not pretend the removed placeholder portraits match FireRed NPCs.
    return this.npcFallbacks[(x+y+this.floor)%this.npcFallbacks.length];
  }
  // R2.12: a dialogue portrait must represent the same sprite displayed on
  // the map. The old role-to-SVG table was unrelated to the actual map sprite:
  // e.g. the dialogue could show a different character entirely.
  getNpcPortraitAsset(npcCell){
    if(['celestial-oak','cave-oak'].includes(npcCell?.specialRole))return 'assets/sprites/npc/oak-frlg-mugshot.png';
    if(npcCell?.specialRole==='pokemon-center-nurse')return overworldPortraitUrl('nurse');
    if(npcCell?.specialRole==='pokemart-clerk')return overworldPortraitUrl('clerk');
    if(npcCell?.specialRole==='fisherman')return overworldPortraitUrl('fisher');
    if(npcCell?.specialRole==='gate-police')return overworldPortraitUrl('policeman');
    const raw=String(npcCell?.npcSprite||'');
    let key='';
    if(raw.startsWith(FIRERED_OVERWORLD_BASE))key=raw.slice(FIRERED_OVERWORLD_BASE.length).replace(/\.png$/,'');
    else if(raw.includes('/npc/overworld/'))key=raw.split('/').at(-1).replace(/\.png$/,'');
    if(!key){
      const name=String(npcCell?.npcName||'').toLowerCase();
      if(['gentleman','gentiluomo'].includes(name))key='gentleman';
      else if(['balding man','anziano'].includes(name))key='balding_man';
      else if(['policeman','poliziotto'].includes(name))key='policeman';
      else if(['scientist','scienziato'].includes(name))key='scientist';
      else if(['clerk','commesso pokémarket'].includes(name))key='clerk';
      else {const ix=FIRERED_NPC_LABELS_IT.findIndex(v=>v.toLowerCase()===name);
        if(ix>=0)key=FIRERED_NPC_NAMES[ix];}
    }
    return overworldPortraitUrl(key)||'assets/sprites/ui/trainer-avatar-fallback.svg';
  }
  renderNpcPortrait(npcCell){
    const slot=this.$id('npc-portrait-img');if(!slot)return;
    slot.replaceChildren();slot.style.removeProperty('background');slot.style.removeProperty('background-image');
    slot.classList.add('npc-portrait-local');
    slot.classList.toggle('npc-portrait-nurse',npcCell?.specialRole==='pokemon-center-nurse');
    slot.setAttribute('aria-label',npcCell?.npcName||'Abitante');
    const img=document.createElement('img');
    img.className='npc-portrait-illustration pokex-portrait';
    img.alt='';img.src=this.getNpcPortraitAsset(npcCell);
    img.onerror=()=>{img.onerror=null;img.src='assets/sprites/ui/trainer-avatar-fallback.svg';};
    slot.append(img);
  }
  hideDialogNpcBackground(hide,npcCell=null){
    this.activeDialogNpcCell=hide?npcCell:null;
    this.$id('dungeon-grid-board')?.classList.toggle('npc-conversation-active',Boolean(hide));
    if(this.gridMap?.length)this.renderDungeon();
  }
  closeNpcDialog(){
    this.cancelPokemonCenterHealing();
    const overlay=this.$id('npc-dialog-overlay');
    overlay?.classList.add('hidden');
    // Do not leave a pending click that can close the next conversation.
    clearTimeout(this.pendingNpcAdvanceTimer);
    if(this.pendingNpcAdvance)document.removeEventListener('pointerdown',this.pendingNpcAdvance,true);
    if(this.pendingNpcAdvanceKey)document.removeEventListener('keydown',this.pendingNpcAdvanceKey,true);
    this.pendingNpcAdvanceKey=null;
    overlay?.querySelector('.npc-click-hint')?.remove();
    this.isLocked=false;
    this.pendingNpcAdvance=null;
    this.hideDialogNpcBackground(false);
    this.saveCheckpoint();
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
    // The EXP Share is awarded by an NPC after the second badge, not automatically.
    if(npcCell.specialRole==='pokemon-center-nurse'){
      this.startPokemonCenterHealing(overlay,speech);return;
    }
    if(npcCell.specialRole==='pokemart-clerk'){
      speech.textContent='Commesso: «Benvenuto al PokéMarket! Cosa desideri acquistare?»';
      this.waitForNpcClick(overlay,()=>{this.closeNpcDialog();this.openPokemartShop();});
      return;
    }
    if(npcCell.specialRole==='pokemart-farewell'){
      speech.textContent='Commesso: «Grazie per la visita! Torna a trovarci!»';
      this.waitForNpcClick(overlay);return;
    }
    if(npcCell.specialRole==='celestial-oak'){this.showOakIntroduction();return;}
    if(npcCell.specialRole==='cave-oak'){
      speech.textContent=this.celestialPhase==='complete'?'Professor Oak: «Ora la grotta tace. Hai cambiato qualcosa, qui dentro. Quando sei pronto, raggiungi l’uscita a sud.»':
        this.celestialPhase==='rematch'?'Professor Oak: «Mewtwo ti osserva. Ricorda ciò che ti ho affidato: hai una sola occasione da non sprecare.»':
        'Professor Oak: «Avverti questa pressione? Non avanzare se la tua squadra non è pronta. Mewtwo percepisce ogni esitazione.»';
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
          window.PokexDex?.record(received,'caught',`Scambio NPC · Piano ${this.floor}`);
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

  waitForNpcClick(overlay,onAdvance=()=>this.closeNpcDialog()){
    clearTimeout(this.pendingNpcAdvanceTimer);
    if(this.pendingNpcAdvance)document.removeEventListener('pointerdown',this.pendingNpcAdvance,true);
    if(this.pendingNpcAdvanceKey)document.removeEventListener('keydown',this.pendingNpcAdvanceKey,true);
    this.pendingNpcAdvanceKey=null;
    overlay.querySelector?.('.npc-click-hint')?.remove();
    const hint=document.createElement('div');
    hint.className='npc-click-hint';hint.textContent='CLICCA PER CONTINUARE ▾';
    overlay.appendChild(hint);
    const listener=()=>{
      document.removeEventListener('pointerdown',listener,true);
      if(this.pendingNpcAdvanceKey)document.removeEventListener('keydown',this.pendingNpcAdvanceKey,true);
      this.pendingNpcAdvance=null;this.pendingNpcAdvanceKey=null;
      onAdvance();
    };
    this.pendingNpcAdvance=listener;
    const keyListener=(event)=>{
      if(!['Space','Enter'].includes(event.code)&&event.key!==' ')return;
      event.preventDefault();event.stopImmediatePropagation();listener();
    };
    this.pendingNpcAdvanceKey=keyListener;
    this.pendingNpcAdvanceTimer=setTimeout(()=>{
      this.pendingNpcAdvanceTimer=null;
      if(this.pendingNpcAdvance===listener&&!overlay.classList.contains('hidden')){
        document.addEventListener('pointerdown',listener,true);
        document.addEventListener('keydown',keyListener,true);
      }
    },20);
  }

  createSingleFrameAvatar(url,fallback,description,extraClass=''){
    // Source images are multi-pose horizontal sprite sheets: crop one 16×32 frame
    // in a dedicated viewport rather than scaling the entire sheet into the tile.
    const frame=document.createElement('span');
    frame.className=`grid-icon official-overworld single-frame sprite-frame ${extraClass}`;
    frame.setAttribute('role','img');frame.setAttribute('aria-label',description);
    const image=document.createElement('img');image.className='overworld-frame-img';
    image.src=resolvedSpritePath(url);image.alt='';image.loading='eager';image.decoding='async';
    // Regular FireRed URLs are horizontally-arranged sheets: CSS clips the
    // first 16x32 overworld frame.  Do not resize a dialogue portrait here.
    if(image.src.endsWith('.svg')){frame.classList.add('pokex-single-frame');image.style.width='16px';image.style.height='32px';}
    image.onerror=()=>{image.onerror=null;image.src=resolvedSpritePath(fallback);
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
      (avatarFolder==='girl' && this.playerFacing!=='down'
        ? `assets/sprites/player/girl/walk/${this.playerFacing}-${Math.min(this.playerFishingFrame,2)}.png`
        : `assets/sprites/player/${avatarFolder}/fish/${this.playerFacing}-${this.playerFishingFrame}.png`) :
      `assets/sprites/player/${avatarFolder}/walk/${this.playerFacing}-${this.playerStep}.png`;
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
    avatar.classList.toggle('local-fishing-sprite',this.playerFishingFrame!==null && !(avatarFolder==='girl' && this.playerFacing!=='down'));
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
            if(cell.specialRole==='celestial-oak')node.classList.add('oak-story-event');
            if(this.activeDialogNpcCell!==cell && ['celestial-oak','cave-oak'].includes(cell.specialRole)){
              const oak=document.createElement('img');oak.className='celestial-oak-sprite';
              node.appendChild(this.createSingleFrameAvatar(
                cell.npcSprite||'assets/sprites/npc/oak-frlg-down.png',
                'assets/sprites/npc/oak-frlg-down.png','Professor Oak','celestial-oak-sprite'));
            }else if(this.activeDialogNpcCell!==cell){
              const fallback=this.getNpcLocalFallback(cell,x,y);
              node.appendChild(this.createSingleFrameAvatar(cell.npcSprite||this.npcSprites[0],
                fallback,`Abitante: ${cell.npcName||'Pokémon Rosso Fuoco'}`,'town-npc'));
            }
          }else if(cell.entity==='door'){
            if(locked)node.appendChild(this.createSingleFrameAvatar(overworldSpriteUrl('policeman'),
              'assets/sprites/ui/trainer-avatar-fallback.svg','Poliziotto: serve la medaglia per proseguire','gate-police'));
            else node.innerHTML='<span class="exit-arrow" role="img" aria-label="Uscita verso destra">➜</span>';
          }else if(cell.entity==='item')node.innerHTML='<img class="grid-icon" src="assets/sprites/items/pokeball-game.png" alt="Oggetto">';
          else if(cell.entity==='trainer'){
            node.appendChild(this.createSingleFrameAvatar(
              cell.trainerOverworldSprite||overworldSpriteUrl('youngster'),
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
        const houseVariant=1+((x*7+y*3+this.floor)%3);
        building.src=cell.entity==='house'?`assets/sprites/buildings/house-${houseVariant}.png`:
          `assets/sprites/buildings/${cell.entity}.png`;
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
        scenery.src=cell.type==='tree'?'assets/sprites/world/tree.svg':`assets/sprites/decor/${cell.decoration}.svg`;
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
          avatar.style.backgroundImage=`url('assets/sprites/player/${avatarFolder}/walk/${facing}-${step}.png')`;
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
    }else if(this.walkClock()>=this.walkReadyAt){
      avatar.classList.remove('walk-arrival');
    }
  }

  // Network data access is defined in js/game-services.js.

  showGymLeaderIntro() {
    const leader=this.currentGym;
    if(!leader) return;
    this.isLocked=true;
    // The leader introduction overlays the same arena; don't tear down the battle.
    this.hideAllActions();
    const overlay=document.getElementById('gym-leader-intro');
    document.getElementById('gym-leader-name').textContent=leader.name.toUpperCase();
    document.getElementById('gym-leader-specialty').textContent=`SPECIALITÀ ${leader.specialty}`;
    document.getElementById('gym-leader-roster').textContent=`SQUADRA: ${leader.pokemon.length} POKÉMON`;
    const portrait=document.getElementById('gym-leader-portrait');
    this.setTrainerPortrait(portrait,`https://play.pokemonshowdown.com/sprites/trainers/${leader.sprite}.png`);
    portrait.onerror=()=>{ portrait.onerror=null; portrait.src='assets/sprites/ui/trainer-avatar-fallback.svg'; };
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
      await this.startBattle('gym',true);
    }
  }

  gameDelay(ms){return Math.max(0,Math.round(ms/(this.speedMultiplier===2?2:1)));}
  wait(ms) { return new Promise(resolve => setTimeout(resolve, this.gameDelay(ms))); }
  syncAnimationSpeed(){
    for(const animation of document.getAnimations?.()||[]){
      if(animation.playState==='running' && !animation.effect?.target?.closest?.('#game-quick-settings') && !animation.effect?.target?.classList?.contains?.('walk-arrival'))animation.playbackRate=this.speedMultiplier;
    }
  }
  setGameSpeed(value){
    this.speedMultiplier=value===2?2:1;
    document.documentElement.dataset.gameSpeed=String(this.speedMultiplier);
    const btn=this.$id('speed-toggle');
    if(btn){btn.textContent=`${'VELOCITÀ'} ×${this.speedMultiplier}`;btn.setAttribute('aria-pressed',String(this.speedMultiplier===2));}
    // A speed change affects the next tile, without restarting an in-flight step.
    if(this.walkInputs.size)this.queueContinuousWalk();
    clearInterval(this.speedAnimationTimer);
    this.syncAnimationSpeed();
    if(this.speedMultiplier===2)this.speedAnimationTimer=setInterval(()=>this.syncAnimationSpeed(),250);
    return this.speedMultiplier;
  }
  // Il gioco usa testi italiani direttamente, senza traduttore a runtime.
  // toggleQuickSettings moved to js/ui-helpers.js (R2.22 modularisation).
  // closeQuickSettings moved to js/ui-helpers.js (R2.22 modularisation).
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
    this.updateBattleWingCloseButtons();
    this.$id('panel-main-actions').classList.remove('hidden');
    this.$id('btn-move-back').classList.add('hidden');
    const run=this.$id('btn-act-run');
    const forbidden=this.isRaidActive || ['gym','trainer','mewtwo'].includes(this.battleType);
    run.disabled=forbidden;run.title=forbidden?'Non puoi fuggire da una sfida con allenatori o dal raid.':'';
    this.renderSidebar();
    this.focusBattleSelection('#btn-act-fight');
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
      element.src='assets/sprites/ui/pokemon-placeholder.svg';
      try{await element.decode?.();}catch(_){}
      return false;
    }
  }
  // Preload the actually selected visual assets while the previous map is still on
  // screen. This uses CSS-computed URLs, so gym palettes and future themes do
  // not require a duplicate lookup table in the battle engine.
  async prepareBattleStageImages(stage){
    if(typeof getComputedStyle!=='function' || typeof Image==='undefined')return true;
    const elements=[stage,stage.querySelector('.enemy-platform-gba'),stage.querySelector('.player-platform-gba'),this.$id('player-trainer-sprite')].filter(Boolean);
    const sources=new Set();
    const urlPattern=/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g;
    for(const element of elements){
      const background=getComputedStyle(element).backgroundImage||'';
      for(const result of background.matchAll(urlPattern)){
        const url=result[1]||result[2]||result[3];if(url)sources.add(url);
      }
    }
    // TASK-010: both protagonists use five local throwing frames.
    // Decode them before battle reveal to prevent flicker during the pose swap.
    const trainerFolder=this.playerGender==='female'?'girl':'red';
    for(let frame=0;frame<5;frame++)sources.add(`assets/sprites/player/${trainerFolder}/throw/${frame}.png`);
    // Retain Image references until decoding completes so browsers cannot
    // garbage-collect orphaned requests while the battle stays hidden.
    const pendingImages=[];
    const loaded=await Promise.all([...sources].map(src=>new Promise(resolve=>{
      const image=new Image();pendingImages.push(image);let settled=false;
      const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ok);};
      const timer=setTimeout(()=>finish(false),8000);
      image.onload=()=>{
        if(typeof image.decode==='function')image.decode().then(()=>finish(true),()=>finish(false));
        else finish(true);
      };
      image.onerror=()=>finish(false);
      image.src=src;
      if(image.complete&&image.naturalWidth>0)image.onload();
    })));
    pendingImages.length=0;
    if(loaded.some(ok=>!ok))console.warn('Alcune risorse di battaglia non sono disponibili; uso i fallback del browser.');
    return loaded.every(Boolean);
  }
  // The map remains visible during preparation. Once the selected scene is
  // decoded, a single short fade reveals the stage and its interface together.
  revealPreparedBattle(token){
    const overlay=this.$id('overlay-battle');
    overlay.classList.add('battle-revealing');
    overlay.classList.remove('battle-preparing');
    if(this.battleRevealTimer)clearTimeout(this.battleRevealTimer);
    this.battleRevealTimer=setTimeout(()=>{
      if(token===this.battleToken)overlay.classList.remove('battle-revealing');
      this.battleRevealTimer=null;
    },400);
  }
  // RC5.8: abstract backdrop + themed platform. The background now follows
  // the selected platform theme, while encounter logic and biome calculation
  // remain untouched because other game systems still rely on them.
  battlePlatformTheme(type,biome){
    if(type==='mewtwo')return 'celestial';
    if(this.isRaidActive || type==='legendary')return 'raid';
    if(type==='gym')return 'arena';
    const platforms={meadow:'meadow',forest:'woodland',coast:'sand',
      cavern:'cave',city:'town',celestial:'celestial',raid:'raid'};
    return platforms[biome]||'meadow';
  }
  // TASK-008: only the gym's actual leader controls its color theme.
  battleGymPalette(type){
    if(type!=='gym'||!this.currentGym)return null;
    return GYM_BATTLE_THEMES[this.currentGym.name]?.palette||null;
  }
  async startBattle(type,keepPlayerOnField=false) {
    this.closePartyActions();this.closePokemonInfo();
    this.ensureActivePokemon();
    const continuousRound=keepPlayerOnField && this.isBattleVisible();
    this.battleType=type;this.isLocked=true;this.battleBusy=true;
    if(!continuousRound)this.battleWeather=null;
    this.battleParticipants = new Set();
    this.battleMode=null;this.pendingForcedSwitch=false;
    const token=++this.battleToken;
    if(!this.activeMon || this.activeMon.currentHp<=0){
      const alive=this.team.find(p=>p.currentHp>0);
      if(!alive && this.isCelestialCave){this.finishCelestialExpeditionDefeat();return;}
      if(!alive){this.isRaidActive=false;this.raidQueueCount=0;this.clearRaidTransientState();this.endBattle('Tutta la squadra è esausta.');this.$id('gameover-overlay').classList.remove('hidden');window.PokexCheckpoints?.discard();this.updateContinueButton();return;}
      this.activeMon=alive;
    }
    const battleOverlay=this.$id('overlay-battle');
    if(this.battleRevealTimer)clearTimeout(this.battleRevealTimer);
    battleOverlay.classList.remove('battle-revealing');
    if(!continuousRound)battleOverlay.classList.add('battle-preparing');
    battleOverlay.classList.remove('hidden');
    this.$id('battle-controls').classList.remove('hidden');
    this.$id('rotom-body').classList.add('battle-active');
    this.hideAllActions();this.openWings();
    const leader=type==='gym' && this.gymQueue[0]==='leader' && this.currentGym;
    if(!continuousRound || (leader && this.gymLeaderIndex===0))window.pokexplorerMusic?.setScene(type==='mewtwo'?'mewtwo':leader?'gym':type==='legendary'?'legend_trio':'encounter');
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
      if(token===this.battleToken)window.PokexDex?.record(this.enemyMon,'seen',`${type} · Piano ${this.floor}`);
    }catch(err) {
      console.error('Battaglia non avviata:',err);
      if(token===this.battleToken){
        // Loading must not consume a trainer, a gym attempt or the only hidden raid.
        if(this.pendingTrainerCell){this.pendingTrainerCell.entity='trainer';this.pendingTrainerCell=null;}
        if(this.isRaidActive){
          const completed=5-this.raidQueueCount;
          if(completed===0){
            // Only the FIRST opponent has failed: restore the ORIGINAL pickup,
            // not playerPos (which is not necessarily the item cell).
            const source=this.raidPickupSourceCell;
            if(source){source.entity='item';source.raidRetryPending=true;}
            this.isRaidActive=false;this.raidQueueCount=0;
            this.raidTriggeredOnFloor=false;
            this.clearRaidTransientState();
            this.endBattle('Dati RAID non disponibili. Oggetto ripristinato: riprova quando sei online.');
            this.renderDungeon();
          }else{
            // Mid-chain failure must NOT erase completed wins, duplicate XP or
            // revive the source item. Keep the remaining queue and allow retry.
            this.endBattle('Connessione interrotta durante il RAID. Riprova il caricamento.');
            this.isLocked=true;
            this.raidBattleRetryPending=true;
            this.$id('raid-api-error')?.classList.remove('hidden');
          }
          return;
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
    this.$id('enemy-name').textContent=this.enemyMon.name+(this.enemyMon.gender==='male'?' ♂':this.enemyMon.gender==='female'?' ♀':'')+(this.enemyMon.isShiny?' ✨':'');
    this.$id('enemy-lv').textContent=this.enemyMon.level;
    this.$id('enemy-sprite').src=resolvedSpritePath(this.enemyMon.spriteFront);
    this.$id('enemy-sprite').classList.remove('faint-anim','summon-anim','recall-anim');
    this.$id('enemy-sprite').classList.add('hidden');
    this.$id('player-trainer-sprite').setAttribute('aria-label',this.playerGender==='female'?'Allenatrice, vista di spalle':'Allenatore, visto di spalle');
    const previousTrainer=this.$id('enemy-trainer-sprite');
    previousTrainer.className='poke-sprite-gba enemy-trainer-frame hidden';
    previousTrainer.removeAttribute('style');
    if(!keepPlayerOnField)this.$id('player-sprite').classList.add('hidden');
    this.$id('player-trainer-sprite').style.backgroundImage=this.playerGender==='female'?"url('assets/sprites/player/girl/throw/0.png')":"url('assets/sprites/player/red/throw/0.png')";
    this.$id('player-trainer-sprite').classList.toggle('female-trainer',this.playerGender==='female');
    this.$id('player-trainer-sprite').classList.remove('red-sheet-ready');
    this.$id('player-trainer-sprite').classList.add('hidden');
    const hostile=['gym','trainer'].includes(type);
    const stage=this.$id('battle-stage');
    stage.classList.toggle('wild-battle',!hostile);
    stage.classList.toggle('trainer-battle',hostile);
    // Visual-only selection: preserve encounters, Raid queue and all combat mechanics.
    stage.dataset.biome=type==='mewtwo'?'celestial':this.isRaidActive?'raid':type==='legendary'?'raid':
      type==='gym'?'city':this.floor%10===0?'city':this.floor%5===0?'coast':
      this.floor%4===0?'cavern':this.floor%3===0?'forest':'meadow';
    // Prevent legacy HD backgrounds from matching the old data-scene selector.
    delete stage.dataset.scene;
    stage.dataset.platformTheme=this.battlePlatformTheme(type,stage.dataset.biome);
    // TASK-008: palette only for gym battles, selected by LEADER identity.
    // Removing the attribute on every other battle prevents palette leakage.
    const gymPalette=this.battleGymPalette(type);
    if(gymPalette)stage.dataset.gymPalette=gymPalette;
    else delete stage.dataset.gymPalette;
    this.resetBattleVisuals(keepPlayerOnField);
    this.updateBattleHUD();
    // The initial scene is covered until the HUD and both image resources are
    // ready. Never paint the HTML alt texts 'Enemy' / 'Player' between frames.
    await Promise.all([
      this.prepareBattleImage(this.$id('enemy-sprite')),
      this.prepareBattleImage(this.$id('player-sprite')),
      this.prepareBattleStageImages(stage)
    ]);
    if(token!==this.battleToken)return;
    if(!continuousRound)this.revealPreparedBattle(token);
    await this.battleText(hostile ? (leader?`Il Capopalestra ${this.currentGym.name} ti sfida!`:'Un allenatore ti sfida!') :
      (type==='mewtwo'?'Appare MEWTWO!':this.isRaidActive?`RAID ${6-this.raidQueueCount}/5 · Una presenza misteriosa!`:type==='legendary'?'UN POKÉMON LEGGENDARIO APPARE!':'Un Pokémon selvatico appare!'));
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
      this.$id('player-trainer-sprite').style.backgroundImage=this.playerGender==='female'?"url('assets/sprites/player/girl/throw/0.png')":"url('assets/sprites/player/red/throw/0.png')";
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
  // resetBattleVisuals moved to js/battle-helpers.js (R2.22 modularisation).
  async animateBall(side){
    const ball=this.$id('battle-throw-ball');
    const stage=this.$id('battle-stage');
    const trainer=this.$id(side==='enemy'?'enemy-trainer-sprite':'player-trainer-sprite');
    const rect=stage.getBoundingClientRect();
    const trainerRect=trainer.getBoundingClientRect();
    const target=this.battleThrowDestination(side);
    const size=34;
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const releaseX=trainerRect.left-rect.left+trainerRect.width*(side==='enemy'?.35:(this.playerGender==='female'?.78:.68));
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
    const trainerMotion=side==='player' ? (async()=>{
      const folder=this.playerGender==='female'?'girl':'red';
      for(let i=0;i<5;i++){
        trainer.style.backgroundImage=`url('assets/sprites/player/${folder}/throw/${i}.png')`;
        await this.wait(i===4?195:115);
      }
    })() : this.playMotion(trainer,[
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
    ball.style.setProperty('--capture-ball-image',ballType==='masterball'?"url('assets/sprites/items/master-ball.svg')":"url('assets/sprites/items/pokeball-game.png')");
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
  // updateBattleHUD moved to js/battle-helpers.js (R2.22 modularisation).
  // renderBattleConditions moved to js/battle-helpers.js (R2.22 modularisation).
  setBattleMsg(text){
    this.$id('battle-msg').textContent=String(text??'');
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
  async chooseEvolution(pokemon,options){
    if(!Array.isArray(options)||options.length<2)return options?.[0]?.id??null;
    const overlay=this.$id('evolution-choice-overlay');
    if(overlay && overlay.parentElement!==this.$id('pokenav-screen-root'))this.$id('pokenav-screen-root').appendChild(overlay);
    const list=this.$id('evolution-choice-options');
    const title=this.$id('evolution-choice-title');
    if(!overlay||!list)return null;
    title.textContent=`SCEGLI L’EVOLUZIONE DI ${pokemon.name}`;
    list.replaceChildren();
    const names={134:'VAPOREON',135:'JOLTEON',136:'FLAREON'};
    return await new Promise(resolve=>{
      const finish=value=>{overlay.classList.add('hidden');list.replaceChildren();resolve(value);};
      for(const option of options){
        const button=document.createElement('button');button.type='button';
        const image=document.createElement('img');image.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${option.id}.png`;
        image.alt='';image.onerror=()=>{image.onerror=null;image.src='assets/sprites/ui/pokemon-placeholder.svg';};
        const caption=document.createElement('span');caption.textContent=`${names[option.id]||'POKÉMON #'+option.id} · Lv.${option.level}`;
        button.append(image,caption);button.onclick=()=>finish(option.id);list.appendChild(button);
      }
      this.$id('evolution-choice-later').onclick=()=>finish(null);
      overlay.classList.remove('hidden');
      list.querySelector('button')?.focus();
    });
  }
  evolutionText(phase,evo){
    if(!evo)return '';
    ;
    return phase==='done'?`${evo.from} si è evoluto in ${evo.to}!`:`${evo.from} si sta evolvendo…`;
  }
  async showEvolution(mon, evo){
    const panel=this.$id('evolution-overlay');
    if(panel && panel.parentElement!==this.$id('pokenav-screen-root'))this.$id('pokenav-screen-root').appendChild(panel);
    this.evolutionMon=mon;this.evolutionData=evo;
    this.$id('evolution-from').src=evo.fromSprite||'assets/sprites/items/pokeball-game.png';
    this.$id('evolution-to').src=evo.toSprite||'assets/sprites/items/pokeball-game.png';
    this.$id('evolution-caption').textContent=this.evolutionText('start',evo);
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
    this.$id('evolution-caption').textContent=this.evolutionText('start',this.evolutionData);
    setTimeout(()=>{
      this.$id('evolution-from').classList.add('hidden');
      this.$id('evolution-from').classList.remove('evo-transform');
      this.$id('evolution-caption').textContent=this.evolutionText('done',this.evolutionData);
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
  displayMoveName(move){
    return String(move.name);
  }
  showMoves(){
    if(this.battleConfirmAction)return;
    if(this.battleBusy || this.pendingForcedSwitch || this.hasForcedBattleAction())return;
    this.battleMode='moves';this.hideAllActions();this.updateBattleWingCloseButtons();
    const panel=this.$id('panel-move-actions');panel.innerHTML='';panel.classList.remove('hidden');
    this.$id('btn-move-back').classList.remove('hidden');
    for(const m of this.activeMon.moves){
      const btn=document.createElement('button');btn.className=`act-btn move-${m.type}`;
      const moveLabel=document.createElement('strong');moveLabel.textContent=this.displayMoveName(m);
      const detail=document.createElement('small');detail.textContent=`${m.type.toUpperCase()} · PP ${m.currentPp}/${m.maxPp}`;
      btn.append(moveLabel,detail);
      btn.disabled=m.currentPp<=0;
      btn.onclick=()=>this.executeAttack(m);
      panel.appendChild(btn);
    }
    if(!this.activeMon.moves.some(m=>m.currentPp>0)){
      const struggle=new Move('Scontro','normal',50,1,'physical');
      struggle.currentPp=1;const btn=document.createElement('button');btn.className='act-btn';btn.textContent='SCONTRO';btn.onclick=()=>this.executeAttack(struggle);panel.appendChild(btn);
    }
    this.focusBattleSelection('#panel-move-actions button:not(:disabled)');
  }
  showTeamMenu(force=false){
    if(!force&&(this.battleBusy || this.hasForcedBattleAction()))return;
    if(this.battleBusy && !force)return;
    this.pendingForcedSwitch=Boolean(force);
    this.battleMode='team';this.hideAllActions();
    this.openWings();this.renderSidebar();this.updateBattleWingCloseButtons();
    this.$id('panel-team-actions').classList.remove('hidden');
    this.$id('panel-team-actions').innerHTML=`<span>${force?'POKÉMON SCONFITTO: CHI MANDI IN CAMPO?':'SCEGLI UN POKÉMON NEL PANNELLO SINISTRO'}</span>${force?'':'<button id="battle-team-back" class="act-btn mini-back-btn">←</button>'}`;
    if(!force)this.$id('battle-team-back').onclick=()=>{this.teleportSwitchPending=false;this.showMainActions();};
    this.setBattleMsg(force?`${this.activeMon.name} è stato sconfitto, chi vuoi mandare in campo?`:'Apri il Pokémon nella squadra a sinistra e scegli MANDA IN CAMPO.');
    this.focusBattleSelection('#team-grid button:not(:disabled)');
  }
  showBagMenu(){
    if(this.battleBusy||this.pendingForcedSwitch||this.hasForcedBattleAction())return;
    this.battleMode='bag';this.hideAllActions();this.openWings();this.renderSidebar();this.updateBattleWingCloseButtons();
    this.$id('panel-bag-actions').classList.remove('hidden');
    this.$id('panel-bag-actions').innerHTML='<span>SCEGLI UNO STRUMENTO DALLO ZAINO A DESTRA</span><button id="battle-bag-back" class="act-btn mini-back-btn">←</button>';
    this.$id('battle-bag-back').onclick=()=>this.showMainActions();
    this.setBattleMsg('Apri lo zaino e scegli un oggetto.');
    this.focusBattleSelection('#bag-tabs button');
  }
  selectBattlePokemon(pokemon){
    if(this.battleConfirmAction || (!this.pendingForcedSwitch&&this.hasForcedBattleAction()))return;
    if(!this.$id('overlay-battle') || this.$id('overlay-battle').classList.contains('hidden'))return;
    if(this.battleBusy || this.dialogueResolve)return;
    if(!this.pendingForcedSwitch && (this.activeMon?.trappedTurns>0 || this.activeMon?.meanLookSource || this.isOpponentTrapping(this.activeMon))){this.setBattleMsg(`${this.activeMon.name} non può essere sostituito: è intrappolato!`);return;}
    if(pokemon===this.activeMon){this.setBattleMsg('Questo Pokémon è già in campo!');return;}
    if(pokemon.currentHp<=0){this.setBattleMsg('Un Pokémon esausto non può combattere!');return;}
    this.askBattleConfirmation(this.pendingForcedSwitch?`Hai scelto ${pokemon.name}, confermi la scelta?`:`Richiamare ${this.activeMon.name} e mandare ${pokemon.name} (Lv.${pokemon.level})?`,()=>this.performSwitch(pokemon),true);
  }
  askBattleConfirmation(message,yes,cancellable=true){
    const o=this.$id('battle-confirm');this.battleConfirmAction=yes;
    this.$id('battle-confirm-text').textContent=String(message??'');
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
    if(this.enemyMon?.meanLookSource===this.activeMon)this.enemyMon.meanLookSource=null;
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
      const lastBall = id==='pokeball' && this.items.pokeball===1;
      const message = id==='masterball' ? 'Vuoi lanciare la Master Ball?' :
        (lastBall ? 'È la tua ultima Poké Ball. Vuoi lanciarla?' : 'Vuoi lanciare una Poké Ball?');
      this.askBattleConfirmation(message,()=>this.useBattleItem(id));
      return;
    }
    if(['rareCandy','goldCandy'].includes(id)){
      if(!this.devMode)return;
      if(this.isBattleVisible()){
        this.showItemFeedback('Le caramelle DEV si usano solo fuori dalla battaglia.');return;
      }
    }
    if(id==='abilityCapsule'){
      if(this.isBattleVisible()){this.showItemFeedback('La Capsula Abilità si usa solo fuori dalla battaglia.');return;}
      this.beginItemTargetSelection(id);return;
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
    const itemNames={potion:'Pozione',superPotion:'Superpozione',hyperPotion:'Iperpozione',elixir:'Elisir',rareCandy:'Caramella Rara',goldCandy:'Caramella d’Oro',abilityCapsule:'Capsula Abilità'};
    this.$id('item-target-message').textContent=`A quale Pokémon vuoi dare ${itemNames[id]}?`;
    box.classList.remove('hidden');
    const mobileList=this.$id('item-target-mobile-list');mobileList.replaceChildren();
    this.team.forEach(mon=>{
      const button=document.createElement('button');button.type='button';
      button.className='item-target-mobile-pokemon';
      button.textContent=`${mon.name} · Lv.${mon.level} · ${mon.currentHp}/${mon.maxHp} ${'PS'}`;
      button.disabled=(mon.currentHp<=0 && id!=='abilityCapsule') || (['rareCandy','goldCandy'].includes(id)&&mon.level>=100);
      button.onclick=()=>this.giveItemToPokemon(mon);
      mobileList.appendChild(button);
    });
    this.renderSidebar();
    if(this.isBattleVisible()){
      this.battleMode='item-target';this.hideAllActions();
      this.$id('panel-bag-actions').classList.remove('hidden');
      this.$id('panel-bag-actions').textContent='SCEGLI UN POKÉMON DALLA SQUADRA A SINISTRA';
      this.setBattleMsg('A quale Pokémon vuoi dare lo strumento?');
      this.updateBattleWingCloseButtons();
      this.focusBattleSelection('#team-grid button:not(:disabled)');
    } else this.logMsg('A quale Pokémon vuoi dare lo strumento? Sceglilo dalla squadra.');
  }
  cancelItemTargetSelection(){
    if(!this.pendingItemTarget)return;
    this.pendingItemTarget=null;
    this.$id('item-target-prompt').classList.add('hidden');
    if(this.isBattleVisible() && !this.battleBusy){
      if(this.battleMode==='item-target')this.showBagMenu();
      else this.showMainActions();
    }
    else this.renderSidebar();
  }
  async openAbilityCapsule(pokemon){
    if(this.abilityCapsuleOpen || this.isBattleVisible() || this.battleBusy || this.adventureCompleted ||
       !this.team.includes(pokemon) || !this.items.abilityCapsule || this.pendingItemTarget!=='abilityCapsule')return false;
    this.pendingItemTarget=null;this.$id('item-target-prompt').classList.add('hidden');
    this.renderSidebar();
    const overlay=this.$id('ability-capsule-overlay'),list=this.$id('ability-capsule-options');
    this.abilityCapsuleOpen=true;this.abilityCapsuleCandidate=pokemon;const serial=(this.abilityCapsuleSerial=(this.abilityCapsuleSerial||0)+1);overlay.classList.remove('hidden');
    this.$id('ability-capsule-description').textContent=`${pokemon.name} · Verifica abilità normali…`;
    this.$id('ability-capsule-feedback').textContent='';list.replaceChildren();
    this.$id('ability-capsule-cancel').focus();
    try{
      // Never trust an old checkpoint's abilityOptions: check the *species* PokeAPI data.
      const data=await this.getPokemonData(pokemon.id);
      if(!this.abilityCapsuleOpen||this.abilityCapsuleCandidate!==pokemon||serial!==this.abilityCapsuleSerial)return false;
      if(Number(data?.id)!==pokemon.id)throw Error('Risposta specie non valida');
      const allowed=PokexAbilities.normalOptions(data);
      if(!allowed.length)throw Error('Dati ufficiali delle abilità non disponibili');
      pokemon.abilityOptions=allowed;
      const choices=PokexAbilities.alternatives(pokemon.ability,allowed);
      if(!allowed.includes(pokemon.ability)){
        this.$id('ability-capsule-feedback').textContent='Abilità attuale non verificabile per questa specie. Nessun oggetto consumato.';
        return false;
      }
      if(!choices.length){
        this.$id('ability-capsule-feedback').textContent='Questa specie non possiede altre abilità normali. Nessun oggetto consumato.';
        return false;
      }
      this.$id('ability-capsule-description').textContent=(`Scegli una nuova abilità normale per ${pokemon.name}. Le abilità nascoste sono escluse.`);
      for(const option of choices){
        const button=document.createElement('button');button.type='button';
        button.textContent=ABILITY_NAMES_IT[option]||option.replaceAll('-',' ').toUpperCase();
        button.onclick=()=>this.confirmAbilityCapsule(pokemon,option,allowed);
        list.appendChild(button);
      }
      list.querySelector('button')?.focus();return true;
    }catch(error){
      if(this.abilityCapsuleOpen && this.abilityCapsuleCandidate===pokemon && serial===this.abilityCapsuleSerial)
        this.$id('ability-capsule-feedback').textContent='Dati abilità non disponibili. Controlla la connessione: nessun oggetto consumato.';
      return false;
    }
  }
  confirmAbilityCapsule(pokemon,option,allowed){
    if(!this.abilityCapsuleOpen||this.abilityCapsuleCandidate!==pokemon||
       !this.team.includes(pokemon)||this.isBattleVisible()||this.battleBusy||!this.items.abilityCapsule||
       !allowed.includes(option)||!allowed.includes(pokemon.ability)||option===pokemon.ability)return false;
    const previous=pokemon.ability;
    pokemon.ability=option;pokemon.abilityName=ABILITY_NAMES_IT[option]||option.replaceAll('-',' ');
    if(pokemon.status&&PokexAbilities.statusBlocked(pokemon,pokemon.status)){pokemon.status=null;pokemon.statusTurns=0;}
    this.items.abilityCapsule--;this.closeAbilityCapsule();this.renderSidebar();
    this.showItemFeedback(`${pokemon.name}: ${ABILITY_NAMES_IT[previous]||previous} → ${pokemon.abilityName}!`);
    this.saveCheckpoint();return true;
  }
  closeAbilityCapsule(){
    this.abilityCapsuleSerial=(this.abilityCapsuleSerial||0)+1;this.abilityCapsuleOpen=false;this.abilityCapsuleCandidate=null;
    this.$id('ability-capsule-overlay')?.classList.add('hidden');
    this.$id('ability-capsule-options')?.replaceChildren();
    if(this.pendingItemTarget==='abilityCapsule'){this.pendingItemTarget=null;this.$id('item-target-prompt')?.classList.add('hidden');}
    this.renderSidebar();
    this.$id('bag-list')?.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  async giveItemToPokemon(pokemon){
    const id=this.pendingItemTarget;
    if(!id||!this.team.includes(pokemon)||!this.items[id])return;
    if(id==='abilityCapsule')return this.openAbilityCapsule(pokemon);
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
      const healNames={potion:'Pozione',superPotion:'Superpozione',hyperPotion:'Iperpozione'};
      this.showItemFeedback(`${pokemon.name} recupera ${pokemon.currentHp-before} PS grazie a ${healNames[id]}!`);
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
      // Record at confirmed capture, even when the player must release it.
      window.PokexDex?.record(wild,'caught',`${this.battleType} · Piano ${this.floor}`);
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
      p.src=`assets/sprites/effects/${effect}.svg`;p.alt='';p.draggable=false;
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
      if(this.activeMon.currentHp<=0){await this.resolveBattleFaints();return;}}
    if(this.enemyMon.currentHp>0){await this.applyMove(this.activeMon,this.enemyMon,move,'enemy');}
    // Both Pokémon may faint in the same hit (Destiny Bond / recoil).
    if(this.activeMon.currentHp<=0){await this.resolveBattleFaints();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    if(!enemyFirst){await this.enemyTurn(true);return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.resolveBattleFaints();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    this.battleBusy=false;this.showMainActions();
  }
  async resolveBattleFaints(){
    if(this.activeMon?.currentHp>0)return false;
    if(this.enemyMon?.currentHp>0){await this.onPlayerFainted();return true;}
    // In the cave a single faint is never permanent: only a wiped expedition is lost.
    if(this.isCelestialCave){
      if(!this.team.some(mon=>mon.currentHp>0)){this.finishCelestialExpeditionDefeat();return true;}
      await this.handleBattleVictory();return true;
    }
    // Both fainted: keep the existing permadeath rule, but do not leave an
    // invisible zero-HP enemy in the next turn when Destiny Bond triggers.
    const fallen=this.activeMon;
    await this.handleBattleVictory();
    this.team=this.team.filter(p=>p!==fallen);
    if(this.activeMon===fallen)this.activeMon=this.team.find(p=>p.currentHp>0)||null;
    this.renderSidebar();
    if(!this.activeMon){
      this.$id('gameover-overlay').classList.remove('hidden');
      window.PokexCheckpoints?.discard();this.updateContinueButton();
    }
    return true;
  }
  beginBattleTurn(){
    if(this.activeMon){this.activeMon.protectedThisTurn=false;this.activeMon.flinchedThisTurn=false;}
    if(this.enemyMon){this.enemyMon.protectedThisTurn=false;this.enemyMon.flinchedThisTurn=false;}
  }
  triggerEntryAbilities(mon,opponent){
    const messages=PokexAbilities.entry(mon,opponent,{weather:this.effectiveBattleWeather(),
      setWeather:type=>{this.battleWeather={type,turns:5};},typeEffectiveness});
    if(messages.length)this.setBattleMsg(messages.at(-1));
  }
  statusAbilityBlocks(mon,ailment){
    return PokexAbilities.statusBlocked(mon,ailment,{weather:this.effectiveBattleWeather()});
  }
  abilityAttackImmunity(defender,move,attacker){
    const outcome=PokexAbilities.immunity(attacker,defender,move,
      {weather:this.effectiveBattleWeather(),effectiveness:typeEffectiveness(move.type,defender.types)});
    if(!outcome)return null;
    if(outcome.kind==='heal'){
      const restored=PokexAbilities.restore(defender,outcome.amount);
      return `${defender.name} recupera ${restored} PS grazie a ${defender.abilityName}!`;
    }
    if(outcome.kind==='stage'){
      PokexAbilities.stage(defender,outcome.stat,1);
      return `${defender.name} potenzia le statistiche grazie a ${defender.abilityName}!`;
    }
    if(outcome.kind==='boost')defender[outcome.key]=true;
    return `${defender.name} neutralizza ${move.name} grazie a ${defender.abilityName}!`;
  }
  effectiveBattleWeather(){
    if(['cloud-nine','air-lock'].includes(this.activeMon?.ability) || ['cloud-nine','air-lock'].includes(this.enemyMon?.ability))return null;
    return this.battleWeather;
  }
  isOpponentTrapping(mon){
    const ability=this.enemyMon?.ability;
    if(!mon||!ability||!this.isBattleVisible())return false;
    if(ability==='shadow-tag'&&mon.ability!=='shadow-tag')return true;
    if(ability==='magnet-pull'&&mon.types?.includes('steel'))return true;
    if(ability==='arena-trap'&&!mon.types?.includes('flying')&&mon.ability!=='levitate')return true;
    return false;
  }
  battleSpeed(mon){
    return mon.speed*statMultiplier(mon.statStages?.speed)*(mon.status==='paralysis'&&mon.ability!=='quick-feet'?.25:1)*PokexAbilities.speedMultiplier(mon,{weather:this.effectiveBattleWeather()});
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
  async applyMove(attacker,defender,move,target,options={}){
    if(attacker.flinchedThisTurn){attacker.flinchedThisTurn=false;await this.battleText(`${attacker.name} tentenna e non attacca!`);return 'flinch';}
    if(attacker.rechargeTurns>0){
      attacker.rechargeTurns--;
      await this.battleText(`${attacker.name} deve riposare per recuperare le energie!`);
      return 'recharging';
    }
    // The release of a charging attack does not spend PP a second time.
    const releasing=Boolean(attacker.pendingCharge && attacker.pendingCharge.move.id===move.id);
    const sleepMove=['snore','sleep-talk'].includes(move.id);
    if(attacker.status==='sleep' && !options.fromSleepTalk){
      attacker.statusTurns-=attacker.ability==='early-bird'?2:1;
      if(attacker.statusTurns>0 && !sleepMove){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} sta dormendo!`);return;}
      if(attacker.statusTurns<=0){attacker.status=null;attacker.nightmareActive=false;
        await this.battleText(`${attacker.name} si è svegliato!`);}
    }
    if(sleepMove && attacker.status!=='sleep'){
      await this.battleText(`${move.name} fallisce: ${attacker.name} non dorme!`);return 'no-effect';
    }
    if(attacker.status==='freeze' && Math.random()>=.2){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} è congelato!`);return;}
    if(attacker.status==='freeze')attacker.status=null;
    if(attacker.status==='paralysis' && Math.random()<.25){attacker.pendingCharge=null;attacker.rampageTurns=0;this.stopRollout(attacker);await this.battleText(`${attacker.name} è paralizzato!`);return;}
    if(attacker.attractedTo===defender && defender.currentHp>0 && Math.random()<.5){await this.battleText(`${attacker.name} è immobilizzato dall'infatuazione!`);return;}
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
    if(!options.skipPp && !releasing && !attacker.rampageTurns && !attacker.rolloutTurns)
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
    if(move.id!=='destiny-bond')attacker.destinyBondActive=false;
    if(move.id!=='fury-cutter')attacker.furyCutterHits=0;
    attacker.lastUsedMoveId=move.id;
    this.setBattleMsg(`${attacker.name} usa ${move.name}!`);
    if(move.unsupported){await this.battleText(`${move.name}: dati non disponibili, mossa non eseguibile offline.`);return 'unsupported';}
    if(['sandstorm','rain-dance','sunny-day','hail','snowscape'].includes(move.id)){
      const kind={'sandstorm':'sandstorm','rain-dance':'rain','sunny-day':'sun',hail:'hail',snowscape:'snow'}[move.id];
      if(this.battleWeather?.type===kind){await this.battleText('Queste condizioni meteo sono già attive!');return 'no-effect';}
      this.battleWeather={type:kind,turns:5};
      await this.battleText(`${attacker.name} modifica il tempo con ${move.name}!`);return 'weather';
    }
    if(move.id==='metronome'){
      await this.battleText('Metronomo non è ancora supportato dal motore di combattimento.');return 'unsupported';
    }
    if((move.selfKo||['self-destruct','explosion'].includes(move.id)) && (attacker.ability==='damp'||defender.ability==='damp')){
      await this.battleText('Umidità impedisce l’esplosione!');return 'no-effect';
    }
    if(move.id==='destiny-bond'){
      attacker.destinyBondActive=true;
      await this.battleText(`${attacker.name} è pronto a trascinare con sé l’avversario!`);
      return 'destiny-bond';
    }
    if(move.id==='curse'){
      if(!attacker.types?.includes('ghost')){
        attacker.statStages.attack=Math.min(6,(attacker.statStages.attack||0)+1);
        attacker.statStages.defense=Math.min(6,(attacker.statStages.defense||0)+1);
        attacker.statStages.speed=Math.max(-6,(attacker.statStages.speed||0)-1);
        await this.battleText(`${attacker.name}: Attacco e Difesa aumentano, Velocità diminuisce!`);
      }else if(defender.ghostCurseActive){
        await this.battleText(`${defender.name} è già colpito da Maledizione!`);return 'no-effect';
      }else if(defender.protectedThisTurn){
        await this.battleText(`${defender.name} blocca Maledizione!`);return 'no-effect';
      }else{
        attacker.currentHp=Math.max(0,attacker.currentHp-Math.max(1,Math.floor(attacker.maxHp/2)));
        defender.ghostCurseActive=true;
        await this.battleText(`${attacker.name} sacrifica PS: una maledizione colpisce ${defender.name}!`);
      }
      this.updateBattleHUD();return 'curse';
    }
    if(move.id==='sleep-talk'){
      const alternatives=attacker.moves.filter(m=>m.id!==move.id && m.id!=='sleep-talk' && m.id!=='metronome' && m.id!=='assist' && m.id!=='mirror-move');
      if(!alternatives.length){await this.battleText('Sonnolalia fallisce: nessuna mossa utilizzabile!');return 'no-effect';}
      const chosen=alternatives[Math.floor(Math.random()*alternatives.length)];
      await this.battleText(`${attacker.name} usa Sonnolalia: ${chosen.name}!`);
      return this.applyMove(attacker,defender,chosen,target,{skipPp:true,fromSleepTalk:true});
    }
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
    const targetsOpponent=move.power>0||move.ailment||['leech-seed','nightmare','mean-look','spite','low-kick'].includes(move.id)||
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
    if(move.id==='fury-cutter'){
      const multiplier=Math.pow(2,Math.min(4,attacker.furyCutterHits||0));
      resolvedMove={...move,power:move.power*multiplier};
    }
    if(move.id==='low-kick'){
      if(!Number.isFinite(defender.weight)){await this.battleText('Calciobasso fallisce: peso del bersaglio non disponibile.');return 'no-effect';}
      const weightKg=defender.weight/10;
      const power=weightKg<10?20:weightKg<25?40:weightKg<50?60:weightKg<100?80:weightKg<200?100:120;
      resolvedMove={...move,power};
    }
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
    const abilityAccuracy=PokexAbilities.accuracyMultiplier(attacker,defender,move,{weather:this.effectiveBattleWeather()});
    const accuracy=abilityAccuracy===Infinity?Infinity:Math.min(100,(move.accuracy??100)*abilityAccuracy * accuracyStageMultiplier(attacker.statStages?.accuracy) /
      accuracyStageMultiplier(defender.statStages?.evasion));
    if(Math.random()*100 >= accuracy){attacker.furyCutterHits=0;this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;await this.battleText('Ma la mossa fallisce!');return;}
    if(move.id==='nightmare'){
      if(defender.status!=='sleep'){await this.battleText('Incubo fallisce: il bersaglio non dorme!');return 'no-effect';}
      if(defender.nightmareActive){await this.battleText(`${defender.name} è già tormentato da Incubo!`);return 'no-effect';}
      defender.nightmareActive=true;
      await this.battleText(`${defender.name} è tormentato da Incubo finché dormirà!`);
      return 'nightmare';
    }
    if(move.id==='spite'){
      const last=defender.lastUsedMoveId;
      const victim=defender.moves?.find(m=>m.id===last);
      if(!victim||victim.currentPp<=0){await this.battleText('Dispetto fallisce: nessuna mossa con PP da ridurre!');return 'no-effect';}
      const lost=Math.min(victim.currentPp,2+Math.floor(Math.random()*4));
      victim.currentPp-=lost;await this.battleText(`Dispetto riduce di ${lost} i PP di ${victim.name}!`);
      return 'spite';
    }
    if(move.id==='mean-look'){
      if(defender.meanLookSource){await this.battleText('Il bersaglio non può già scappare!');return 'no-effect';}
      defender.meanLookSource=attacker;
      await this.battleText(`${defender.name} non può più fuggire!`);return 'mean-look';
    }
    let modifier=typeEffectiveness(move.type,defender.types);
    // Immunità da abilità: il colpo non infligge danni (con assorbimento dove previsto).
    const immunity=this.abilityAttackImmunity(defender,move,attacker);
    if(immunity){this.stopRollout(attacker);if(move.selfKo||['self-destruct','explosion'].includes(move.id))attacker.currentHp=0;this.updateBattleHUD();await this.battleText(immunity);return;}
    // Fixed-damage moves ignore offensive/defensive stats but still obey immunities.
    const fixedDamage=({'dragon-rage':40,'sonic-boom':20,'night-shade':attacker.level,
      'seismic-toss':attacker.level,'super-fang':Math.max(1,Math.floor(defender.currentHp/2))})[move.id]??null;
    if(resolvedMove.power>0 || fixedDamage!==null){
      const count=attacker.ability==='skill-link' && move.maxHits>move.minHits?move.maxHits:rollMultiHitCount(move);
      let landed=0,totalDamage=0,anyCrit=false;
      for(let i=0;i<count && defender.currentHp>0 && attacker.currentHp>0;i++){
        // Triple Kick/Triple Axel check accuracy per additional kick.
        if(i>0 && ['triple-kick','triple-axel','population-bomb'].includes(move.id) && Math.random()*100>=accuracy)break;
        const hitMove=move.id==='triple-kick'||move.id==='triple-axel'
          ?{...resolvedMove,power:resolvedMove.power*(i+1)}:resolvedMove;
        const result=fixedDamage===null?calculateBattleDamage(attacker,defender,hitMove,Math.random,{weather:this.effectiveBattleWeather()}):
          {damage:modifier===0?0:Math.min(defender.currentHp,fixedDamage),effectiveness:modifier,critical:false};
        // Sturdy prevents a one-hit knockout from full HP. Multi-hit moves can still KO.
        if(defender.ability==='sturdy'&&defender.currentHp===defender.maxHp&&result.damage>=defender.currentHp&&
           !PokexAbilities.suppress(attacker)&&result.damage>0)result.damage=Math.max(0,defender.currentHp-1);
        defender.currentHp=Math.max(0,defender.currentHp-result.damage);
        if(defender.currentHp===0 && result.damage>0 && defender.destinyBondActive && attacker.currentHp>0){
          defender.destinyBondActive=false;attacker.currentHp=0;
          await this.battleText(`${defender.name} trascina ${attacker.name} con sé grazie a Destinobbligato!`);
        }
        landed++;totalDamage+=result.damage;anyCrit ||= result.critical;
        if(result.damage>0 && move.id==='rapid-spin'){attacker.trappedTurns=0;attacker.trapMove=null;}
        if(result.damage>0 && ['wrap','bind','clamp','fire-spin','whirlpool','sand-tomb'].includes(move.id) && defender.currentHp>0 && !defender.trappedTurns){
          const roll=Math.random();
          defender.trappedTurns=roll<.375?2:roll<.75?3:roll<.875?4:5;
          defender.trapMove=move.name;defender.trapSource=attacker;
        }
        // Contact means a move with the PokeAPI contact flag, not all physical damage.
        for(const feedback of PokexAbilities.contact(attacker,defender,move,result.damage,{weather:this.effectiveBattleWeather()}))
          await this.battleText(feedback);
        if(result.damage>0&&defender.currentHp>0&&!defender.flinchedThisTurn){
          const chance=Math.max(move.flinchChance||0,attacker.ability==='stench'?10:0)*(attacker.ability==='serene-grace'?2:1);
          if(Math.random()*100<chance && defender.ability!=='inner-focus'){
            defender.flinchedThisTurn=true;
            if(defender.ability==='steadfast')PokexAbilities.stage(defender,'speed',1);
          }
        }
        if(result.damage>0 && result.critical && defender.ability==='anger-point'){
          defender.statStages.attack=6;await this.battleText(`Grancollera massimizza l'Attacco di ${defender.name}!`);
        }
        if(move.drain>0 && result.damage>0)attacker.currentHp=Math.min(attacker.maxHp,attacker.currentHp+Math.max(1,Math.floor(result.damage*move.drain/100)));
        if(move.drain<0 && result.damage>0 && !['rock-head','magic-guard'].includes(attacker.ability))attacker.currentHp=Math.max(0,attacker.currentHp-Math.max(1,Math.floor(result.damage*-move.drain/100)));
        if(move.drain>0&&defender.ability==='liquid-ooze')attacker.currentHp=Math.max(0,attacker.currentHp-Math.max(1,Math.floor(result.damage*move.drain/100))*2);
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
      if(move.id==='fury-cutter' && modifier>0 && totalDamage>0)
        attacker.furyCutterHits=Math.min(4,(attacker.furyCutterHits||0)+1);
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
    } else if(move.id==='leech-seed'){
      if(defender.types.includes('grass')||defender.seeded){
        await this.battleText(defender.seeded?'Parassiseme è già attivo!':'Parassiseme non ha effetto sui Pokémon Erba!');
      }else{defender.seeded=true;await this.battleText(`${defender.name} è stato parassitato!`);}
    } else if(!move.statChange && !move.ailment) await this.battleText(`${attacker.name} esegue ${move.name}!`);
    // All Pokémon stat changes (including two-stat buffs) need application.
    // Negative stages usually target the foe; statTarget handles self-debuffs.
    const changes=move.statChanges?.length?move.statChanges:(move.statChange?[move.statChange]:[]);
    for(const {stat,stage,chance} of changes){
      if(!((move.power===0 || defender.currentHp>0)&&(move.power===0 || modifier>0)))continue;
      if(Math.random()*100>=Math.min(100,(chance??100)*(attacker.ability==='serene-grace'?2:1)))continue;
      const targetsSelf=move.statTarget==='user'||move.statTarget==='users-field'||
        (move.power>0&&['superpower','close-combat','overheat','draco-meteor','leaf-storm'].includes(move.id));
      const targetsFoe=move.statTarget==='selected-pokemon'||move.statTarget==='all-opponents'||
        ['swagger','flatter'].includes(move.id);
      const targetP=targetsSelf?attacker:targetsFoe?defender:stage<0?defender:attacker;
      if(move.power>0&&stage<0&&targetP===defender&&defender.ability==='shield-dust'&&!PokexAbilities.suppress(attacker))continue;
      const immune=stage<0 && targetP===defender &&
        ((PokexAbilities.dropBlocked(targetP,stat,true,{weather:this.effectiveBattleWeather()})&&!PokexAbilities.suppress(attacker))||targetP.mistTurns>0);
      if(immune){await this.battleText(`${targetP.name} impedisce il calo delle statistiche!`);}
      else {
        const before=targetP.statStages[stat]||0;
        const after=Math.max(-6,Math.min(6,before+stage));
        targetP.statStages[stat]=after;
        if(move.id==='defense-curl' && targetP===attacker)attacker.defenseCurlUsed=true;
        await this.battleText(after===before?`${targetP.name}: ${STAT_LABELS_IT[stat]||stat} non può cambiare ancora!`:
          `${targetP.name}: ${STAT_LABELS_IT[stat]||stat} ${stage<0?'diminuisce':'aumenta'}!`);
        if(stage<0 && targetP===defender && after<before)for(const message of PokexAbilities.afterStatDrop(targetP,true))await this.battleText(message);
      }
    }
    this.updateBattleHUD();
    const blocked=move.power>0 && defender.ability==='shield-dust'&&!PokexAbilities.suppress(attacker);
    const ailmentChance=Math.min(100,(move.ailmentChance || (move.power===0?100:0))*(attacker.ability==='serene-grace'?2:1));
    if(move.ailment && !['none','leech-seed'].includes(move.ailment) &&
      (move.ailment==='confusion'?!defender.confusionTurns:!defender.status) && defender.currentHp>0 && (move.power===0 || modifier>0) &&
      !blocked && !(move.ailment==='confusion' && defender.ability==='own-tempo'&&!PokexAbilities.suppress(attacker)) &&
      !(defender.safeguardTurns>0) && (PokexAbilities.suppress(attacker)||!this.statusAbilityBlocks(defender,move.ailment)) && Math.random()*100<ailmentChance) {
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
    if(this.activeMon.currentHp<=0){await this.resolveBattleFaints();return;}
    if(this.enemyMon.currentHp<=0){await this.handleBattleVictory();return;}
    await this.applyEndOfTurnEffects();
    if(this.activeMon.currentHp<=0){await this.resolveBattleFaints();return;}
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
      if(mon.ghostCurseActive && mon.ability!=='magic-guard'){
        const damage=Math.min(mon.currentHp,Math.max(1,Math.floor(mon.maxHp/4)));
        mon.currentHp-=damage;
        this.updateBattleHUD();await this.battleText(`Maledizione sottrae ${damage} PS a ${mon.name}!`);
      }
      if(mon.currentHp<=0)continue;
      if(mon.nightmareActive && mon.status!=='sleep')mon.nightmareActive=false;
      if(mon.nightmareActive && mon.status==='sleep' && mon.ability!=='magic-guard'){
        const damage=Math.min(mon.currentHp,Math.max(1,Math.floor(mon.maxHp/4)));
        mon.currentHp-=damage;
        this.updateBattleHUD();await this.battleText(`Incubo sottrae ${damage} PS a ${mon.name}!`);
      }
      if(mon.currentHp<=0)continue;
      if(['burn','poison','bad-poison'].includes(mon.status)&&!['magic-guard'].includes(mon.ability) && !(mon.ability==='poison-heal'&&['poison','bad-poison'].includes(mon.status))){
        if(mon.status==='bad-poison')mon.toxicTurns=(mon.toxicTurns||0)+1;
        const damage=Math.max(1,Math.floor(mon.maxHp*(mon.status==='bad-poison'?Math.min(15,mon.toxicTurns):2)/16));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        this.updateBattleHUD();await this.battleText(`${mon.name} subisce ${damage} danni da ${mon.status==='burn'?'scottatura':'veleno'}!`);
      }
      if(mon.trappedTurns>0 && mon.currentHp>0 && mon.ability!=='magic-guard'){
        const damage=Math.max(1,Math.floor(mon.maxHp/16));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        mon.trappedTurns--;
        this.updateBattleHUD();
        await this.battleText(`${mon.name} subisce ${damage} danni da ${mon.trapMove||'Avvolgibotta'}!`);
      }
      if(mon.seeded && mon.currentHp>0 && mon.ability!=='magic-guard'){
        const damage=Math.min(mon.currentHp,Math.max(1,Math.floor(mon.maxHp/8)));
        mon.currentHp=Math.max(0,mon.currentHp-damage);
        const leech=mon===this.activeMon?this.enemyMon:this.activeMon;
        leech.currentHp=Math.min(leech.maxHp,leech.currentHp+damage);
        this.updateBattleHUD();await this.battleText(`Parassiseme sottrae energia a ${mon.name}!`);
      }
    }
    for(const mon of combatants){
      for(const message of PokexAbilities.endTurn(mon,{weather:this.effectiveBattleWeather()}))await this.battleText(message);
    }
    if(this.effectiveBattleWeather()?.type==='sandstorm'){
      for(const mon of combatants){
        if(!mon||mon.currentHp<=0||PokexAbilities.immuneToSand(mon))continue;
        const damage=Math.min(mon.currentHp,Math.max(1,Math.floor(mon.maxHp/16)));
        mon.currentHp-=damage;this.updateBattleHUD();
        await this.battleText(`Terrempesta sottrae ${damage} PS a ${mon.name}!`);
      }
    }
    if(this.effectiveBattleWeather()?.type==='hail'){
      for(const mon of combatants){
        if(!mon||mon.currentHp<=0||mon.types?.includes('ice')||['overcoat','magic-guard','snow-cloak','ice-body'].includes(mon.ability))continue;
        const damage=PokexAbilities.hurt(mon,1/16);this.updateBattleHUD();await this.battleText(`Grandine infligge ${damage} danni a ${mon.name}!`);
      }
    }
    if(this.battleWeather){
      this.battleWeather.turns--;
      if(this.battleWeather.turns<=0){this.battleWeather=null;await this.battleText('Il tempo torna normale.');}
    }
  }
  async onPlayerFainted(){
    if(this.isCelestialCave){
      const fallen=this.activeMon;this.updateBattleHUD();
      await this.battleText(`${fallen.name} è esausto!`);
      if(!this.team.some(p=>p.currentHp>0)){this.finishCelestialExpeditionDefeat();return;}
      this.battleBusy=false;this.showTeamMenu(true);return;
    }
    const lost=this.activeMon;
    this.updateBattleHUD();this.$id('player-sprite').classList.add('faint-anim');
    await this.battleText(`${lost.name} è esausto e lascia definitivamente la squadra!`);
    this.team=this.team.filter(p=>p!==lost);
    this.battleParticipants.delete(lost);
    this.renderSidebar();
    this.$id('player-sprite').classList.remove('faint-anim');
    if(!this.team.some(p=>p.currentHp>0)){
      this.isRaidActive=false;this.raidQueueCount=0;this.clearRaidTransientState();this.battleToken++;
      this.$id('overlay-battle').classList.add('hidden');this.$id('battle-controls').classList.add('hidden');
      this.$id('rotom-body').classList.remove('battle-active');
      this.activeMon=null;this.renderSidebar();
      this.$id('gameover-overlay').classList.remove('hidden');window.PokexCheckpoints?.discard();this.updateContinueButton();return;
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
    const levelEvents=await mon.gainExperience(amount,levelCap,options=>this.chooseEvolution(mon,options));
    await this.battleText(`${mon.name} riceve ${amount} punti esperienza!`);
    this.renderSidebar();this.updateBattleHUD();
    for(const event of levelEvents){
      await this.battleText(`${mon.name} raggiunge il livello ${event.level}!`);
      if(event.evolution){window.PokexDex?.record(mon,'caught',`Evoluzione · Piano ${this.floor}`);await this.showEvolution(mon,event.evolution);}
      for(const move of event.moves)await this.learnMove(move,mon);
    }
    this.renderSidebar();this.updateBattleHUD();
  }
  async handleBattleVictory(){
    // Multiple async click/turn completions must never consume two Raid slots.
    const raidToken=this.isRaidActive?this.battleToken:null;
    if(raidToken!==null){
      if(this.raidVictoryResolutionToken===raidToken)return;
      this.raidVictoryResolutionToken=raidToken;
    }
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
    // Raccolta: once per defeated enemy, each surviving team member with Pickup
    // has an independent 10% chance to find a simple item, subject to bag limits.
    for(const collector of this.team){
      if(collector.currentHp<=0||collector.ability!=='pickup'||Math.random()>=.10)continue;
      const loot=['pokeball','potion','elixir'][Math.floor(Math.random()*3)];
      if(this.grantItem(loot))await this.battleText(`${collector.name} trova un oggetto grazie a Raccolta!`);
    }
    const knockoutMsg=PokexAbilities.afterKnockout(this.activeMon);
    if(knockoutMsg)await this.battleText(knockoutMsg);
    if(this.battleType==='mewtwo'){
      if(this.celestialPhase==='trial'){
        this.celestialPhase='rematch';this.endBattle('Hai sconfitto Mewtwo!');
        this.isLocked=true;
        setTimeout(()=>{if(this.isCelestialCave&&this.celestialPhase==='rematch')this.showOakMasterBallReward();},this.gameDelay(550));
      }else{this.endBattle('Mewtwo si rialza tra le ombre. Per completare la spedizione devi catturarlo!');
        this.showDiscoveryNotice('MEWTWO È ANCORA NELLA GROTTA · DEVI CATTURARLO',3500);}
      return;
    }
    if(this.battleType==='gym'&&this.gymQueue.length>0){
      await this.advanceGymAfterVictory();return;
    }
    if(this.isRaidActive){
      if(this.battleToken!==raidToken)return; // Run or battle changed while awaiting XP.
      this.raidQueueCount--;
      if(this.raidQueueCount>0){
        await this.battleText(`RAID · Restano ${this.raidQueueCount} avversari!`);
        await this.startBattle('wild',true);return;
      }
      this.isRaidActive=false;this.clearRaidTransientState();
      this.endBattle('RAID SUPERATO! Hai vinto tutte e cinque le sfide!');return;
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
    this.updateBattleWingCloseButtons();
    this.pendingItemTarget=null;this.$id('item-target-prompt').classList.add('hidden');
    this.battleWeather=null;
    this.team.forEach(p=>{p.clearBattleConditions();p.protectedThisTurn=false;p.protectStreak=0;});
    this.closePartyActions();this.closePokemonInfo();
    this.ensureActivePokemon();
    this.enemyMon?.clearBattleConditions();
    this.$id('overlay-battle').classList.add('hidden');
    this.$id('overlay-battle').classList.remove('battle-preparing','battle-revealing');
    if(this.battleRevealTimer){clearTimeout(this.battleRevealTimer);this.battleRevealTimer=null;}
    this.$id('battle-controls').classList.add('hidden');
    this.$id('rotom-body').classList.remove('battle-active');
    this.$id('battle-confirm').classList.add('hidden');
    this.$id('enemy-sprite').classList.remove('faint-anim','hidden');
    this.$id('player-sprite').classList.remove('faint-anim');
    this.isLocked=false;this.logMsg(msg);this.renderSidebar();
    window.pokexplorerMusic?.setScene(this.isCelestialCave?'cave':'exploration');
    if(this.isCelestialCave)this.renderDungeon();
    this.saveCheckpoint();
    window.dispatchEvent?.(new Event('pokex:dex-battle-ended'));
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
    notice.textContent=String(message??'');
    notice.classList.toggle('raid-notice',message.includes('RAID'));
    notice.classList.add('visible');
    if(duration>0)this.discoveryNoticeTimer=setTimeout(()=>notice.classList.remove('visible'),duration);
  }

  waitForNotice(){
    return new Promise(resolve=>{
      let closed=false;
      let activationTimer;
      const cleanup=()=>{
        if(closed)return;
        closed=true;
        clearTimeout(activationTimer);
        document.removeEventListener('pointerdown',finish,true);
        document.removeEventListener('keydown',finish,true);
        this.$id('discovery-notice')?.classList.remove('visible');
        this.cancelRaidNotice=null;
        resolve();
      };
      const finish=event=>{
        if(event.type==='keydown' && !['Enter',' ','Escape'].includes(event.key))return;
        event.preventDefault();event.stopImmediatePropagation();
        cleanup();
      };
      // If the floor is replaced or a run ends, no orphaned document listener
      // may capture future clicks or begin an obsolete Raid.
      this.cancelRaidNotice=cleanup;
      activationTimer=setTimeout(()=>{
        if(closed)return;
        document.addEventListener('pointerdown',finish,true);
        document.addEventListener('keydown',finish,true);
      },60);
    });
  }

  logMsg(text) { document.getElementById('log-status-text').textContent = String(text??''); }

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
    this.$id('party-move-action').title=battle?'Riordina la squadra fuori dalla battaglia.':'';
    this.$id('party-send-action').classList.toggle('hidden',!battle || pokemon===this.activeMon || pokemon.currentHp<=0);
    this.renderSidebar();
    if(battle)this.focusBattleSelection('#party-action-menu #party-send-action:not(.hidden):not(:disabled),#party-action-menu #party-close-action');
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
  // Pokédex API description lookup is defined in js/game-services.js.
  async populatePokedexDescriptions(pokemon,requestId){
    const lang='it';
    const abilityId=pokemon.ability;
    const abilityText=await this.getPokedexDescription('ability',abilityId,lang);
    if(this.partyInfoPokemon!==pokemon||requestId!==this.pokemonInfoRequest)return;
    this.$id('pokemon-info-ability-description').textContent=abilityText||
      'Descrizione non disponibile offline.';
    await Promise.all(pokemon.moves.map(async(move,index)=>{
      const description=await this.getPokedexDescription('move',move.id,lang);
      if(this.partyInfoPokemon!==pokemon||requestId!==this.pokemonInfoRequest)return;
      const node=this.$id('pokemon-info-moves').children[index]?.querySelector('.move-description');
      if(node)node.textContent=description||
        'Descrizione non disponibile offline.';
    }));
  }
  // Ability translation lookup is defined in js/game-services.js.
  selectPokemonInfoTab(tab='stats'){
    const selected=tab==='moves'?'moves':'stats';
    for(const key of ['stats','moves']){
      const button=this.$id(`pokemon-tab-${key}`),panel=this.$id(`pokemon-panel-${key}`);
      button?.classList.toggle('active',key===selected);
      button?.setAttribute('aria-selected',String(key===selected));
      panel?.classList.toggle('hidden',key!==selected);
    }
    const container=this.$id('pokemon-info-content');if(container)container.scrollTop=0;
  }
  openPokemonInfo(pokemon){
    if(!pokemon||!this.team.includes(pokemon))return;
    this.partyInfoPokemon=pokemon;
    this.$id('pokemon-info-name').textContent=pokemon.name+(pokemon.gender==='male'?' ♂':pokemon.gender==='female'?' ♀':'')+(pokemon.isShiny?' ✨':'');
    const infoSprite=this.$id('pokemon-info-sprite');
    infoSprite.onerror=()=>{infoSprite.onerror=null;infoSprite.src='assets/sprites/ui/pokemon-placeholder.svg';};
    infoSprite.src=resolvedSpritePath(pokemon.spriteFront||'assets/sprites/ui/pokemon-placeholder.svg');
    this.$id('pokemon-info-sprite').alt=`Sprite frontale di ${pokemon.name}`;
    const typeIt={grass:'Erba',fire:'Fuoco',water:'Acqua',normal:'Normale',electric:'Elettro',poison:'Veleno',bug:'Coleottero',flying:'Volante',ground:'Terra',rock:'Roccia',ghost:'Spettro',psychic:'Psico',ice:'Ghiaccio',fighting:'Lotta',dragon:'Drago',dark:'Buio',steel:'Acciaio',fairy:'Folletto'};

    this.$id('pokemon-info-level').textContent=`${'LIVELLO'} ${pokemon.level}`;
    const typesNode=this.$id('pokemon-info-types');typesNode.replaceChildren();
    for(const type of (pokemon.types||[pokemon.type])){
      const badge=document.createElement('span');badge.className='pokemon-type-chip type-'+type;
      badge.textContent=((typeIt[type]||type)).toUpperCase();typesNode.appendChild(badge);
    }
    const nature=pokemon.nature||POKEMON_NATURES[0];
    const delta=nature[1]===nature[2]?('neutra'):`+${STAT_LABELS_IT[nature[1]]} / −${STAT_LABELS_IT[nature[2]]}`;
    this.$id('pokemon-info-nature').textContent=`${'NATURA'}: ${nature[0]} (${delta})`;
    const localAbility=(pokemon.abilityName||'—');
    this.$id('pokemon-info-ability').textContent=`${'ABILITÀ'}: ${localAbility}`;
    this.$id('pokemon-info-ability-description').textContent='Caricamento abilità…';
    this.$id('pokemon-info-hero').className=`pokemon-info-hero type-${pokemon.type}`;
    const stats=this.$id('pokemon-info-stats');stats.replaceChildren();
    const values=pokemon.getStatsSummary();
    // Scale the bars to the strongest stat of this Pokémon, so low-level
    // teams do not show six nearly empty bars on the summary screen.
    const statScale=Math.max(30,...Object.values(values).map(value=>Number(value)||0));
    for(const [key,italianLabel] of Object.entries(STAT_LABELS_IT)){
      const label=italianLabel;
      const tile=document.createElement('div');tile.className='pokemon-info-stat';
      const name=document.createElement('span');name.textContent=label;
      const value=document.createElement('em');value.textContent=key==='hp'?`${pokemon.currentHp}/${values[key]}`:values[key];
      if(nature[1]!==nature[2])value.classList.add(nature[1]===key?'raised':nature[2]===key?'lowered':'neutral');
      const meter=document.createElement('div');meter.className='pokemon-stat-meter';
      meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',label);
      meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','300');
      meter.setAttribute('aria-valuenow',String(Math.min(300,Math.max(0,Number(values[key])||0))));
      const fill=document.createElement('span');fill.className='pokemon-stat-meter-fill';
      fill.style.width=`${Math.min(100,Math.max(3,(Number(values[key])||0)/statScale*100))}%`;
      meter.appendChild(fill);tile.append(name,value,meter);stats.append(tile);
    }
    const moves=this.$id('pokemon-info-moves');moves.replaceChildren();
    for(const move of pokemon.moves){
      const tile=document.createElement('div'),name=document.createElement('span'),extra=document.createElement('small');
      tile.className='pokemon-move-tile type-'+String(move.type||'normal');
      name.className='pokemon-move-name';name.textContent=this.displayMoveName(move);extra.textContent=`${((typeIt[move.type]||move.type)).toUpperCase()} · ${'POT'} ${move.power||'—'} · ${'PREC'} ${move.alwaysHits?'—':move.accuracy+'%'} · PP ${move.currentPp}/${move.maxPp}`;
      const details=document.createElement('details');details.className='pokemon-move-details';
      const summary=document.createElement('summary');summary.textContent='Descrizione';
      const description=document.createElement('small');description.className='move-description';
      description.textContent='Caricamento descrizione…';
      details.append(summary,description);tile.append(name,extra,details);moves.append(tile);
    }
    this.selectPokemonInfoTab('stats');
    this.$id('pokemon-info-overlay').classList.remove('hidden');
    void this.resolveAbilityName(pokemon);
    void this.populatePokedexDescriptions(pokemon,++this.pokemonInfoRequest);
  }
  closePokemonInfo(){this.pokemonInfoRequest++;this.partyInfoPokemon=null;this.$id('pokemon-info-overlay')?.classList.add('hidden');}
  renderSidebar() {
    const oakLab=this.$id('btn-oak-lab');if(oakLab){const visible=this.laboratoryPokemon.length>0;oakLab.classList.toggle('hidden',!visible);oakLab.disabled=!this.isTownFloor()||this.isCelestialCave;}
    // Keep availability and purchase validation tied to the same city milestones.
    // CSS alone is not an access control: locked purchases must also be disabled.
    for(const [itemId,buttonId] of [['superPotion','buy-super-potion-btn'],['hyperPotion','buy-hyper-potion-btn']]){
      const button=this.$id(buttonId);if(!button)continue;
      const unlocked=isPokemartItemUnlocked(itemId,this.floor);
      button.classList.toggle('hidden',!unlocked);
      button.hidden=!unlocked;
      button.disabled=!unlocked;
      button.setAttribute('aria-hidden',String(!unlocked));
    }
    this.$id('floor-num').textContent=this.floor;
    const location=this.$id('route-location-label');
    if(location){
      const cities=['Plumbeopoli','Celestopoli','Aranciopoli','Azzurropoli','Fucsiapoli','Zafferanopoli','Isola Cannella','Smeraldopoli'];
      
      location.textContent=this.isCelestialCave?`${'Luogo: Grotta Celeste'}`:this.floor%10===0?`${'Luogo'}: ${cities[this.floor/10-1]}`:
        this.floor%5===0?`${'Luogo: Villaggio'}`:
        `${'Sentiero: Percorso'} ${this.floor}`;
    }
    this.$id('player-money').textContent=`$${this.money}`;
    const radarCount=this.$id('radar-charge-count');
    if(radarCount)radarCount.textContent=`${'SCANSIONI'}: ${this.radarCharges===Infinity?'∞':this.radarCharges}`;
    const radarButton=this.$id('btn-scan-radar');
    if(radarButton){
      radarButton.classList.remove('hidden');
      radarButton.classList.toggle('radar-empty',this.radarCharges===0);
      radarButton.classList.toggle('radar-infinite',this.radarCharges===Infinity);
    }
    const bag=this.$id('bag-list');bag.innerHTML='';
    const itemLabels={potion:'Pozione',superPotion:'Superpozione',hyperPotion:'Iperpozione',elixir:'Elisir',rareCandy:'Caramella Rara',goldCandy:'Caramella d’Oro',abilityCapsule:'Capsula Abilità'};
    const categories={
      rimedi:[['potion',itemLabels.potion,'potion'],['superPotion',itemLabels.superPotion,'superPotion'],['hyperPotion',itemLabels.hyperPotion,'hyperPotion'],['elixir',itemLabels.elixir,'elixir'],
        ['abilityCapsule','Capsula Abilità','abilityCapsule'],
        ...(this.devMode?[['rareCandy',itemLabels.rareCandy,'rareCandy'],['goldCandy',itemLabels.goldCandy,'goldCandy']]:[])],
      pokeball:[['pokeball','Poké Ball','poke-ball'],['masterball','Master Ball','master-ball']],
      chiave:[]
    };
    document.querySelectorAll('[data-bag-tab]').forEach(tab=>{
      const active=tab.dataset.bagTab===this.bagCategory;
      tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));
    });
    const inBattle=!this.$id('overlay-battle')?.classList.contains('hidden');
    for(const [id,label,file] of categories[this.bagCategory]){
      // Non-key items are visible only after they have actually been obtained.
      // Key items intentionally remain listed (even before acquisition).
      if((Number(this.items[id])||0)<=0)continue;
      const b=document.createElement('button');b.className='bag-item';
      if(file){
        const icon=document.createElement('img');icon.alt='';icon.src=itemImage(id);
        const name=document.createElement('span');name.textContent=label;
        const count=document.createElement('strong');count.textContent=`×${this.items[id]}`;
        b.append(icon,name,count);
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
      // Always show exactly two key items, even when not yet obtained.
      const keyItems=[
        ['fishingRod','Canna da Pesca',Boolean(this.items.fishingRod)],
        ['expShare','Condividi Esperienza',this.hasExpShare()]
      ];
      for(const [key,label,owned] of keyItems){
        const button=document.createElement('button');button.type='button';
        button.className='bag-item bag-key-item'+(owned?' owned':'')+(key==='expShare'&&this.expShareEnabled&&owned?' enabled':'');
        button.dataset.keyItem=key;
        const icon=document.createElement('img');icon.src=itemImage(key);icon.alt='';icon.width=26;icon.height=26;
        const name=document.createElement('span');name.textContent=label;
        button.append(icon,name);
        if(key==='expShare'&&owned){
          const indicator=document.createElement('span');indicator.className='key-item-indicator';
          indicator.textContent=this.expShareEnabled?'●':'○';
          indicator.setAttribute('aria-hidden','true');button.append(indicator);
        }
        button.disabled=!owned||key==='fishingRod'||this.battleBusy||this.adventureCompleted;
        button.setAttribute('aria-label',label+(!owned?(' (non ottenuto)'):
          key==='fishingRod'?(' (usa vicino all’acqua)'):
          this.expShareEnabled?(' (attivo)'):(' (disattivo)')));
        if(key==='expShare')button.onclick=()=>this.toggleExpShare();
        bag.appendChild(button);
      }
    }
    const team=this.$id('team-grid');team.innerHTML='';
    // A small status indicator, not a visual redesign of the original RotomDex.
    let progress=this.$id('party-progression-status');
    if(!progress){progress=document.createElement('div');progress.id='party-progression-status';
      progress.setAttribute('role','status');team.parentNode.insertBefore(progress,team);}
    progress.textContent=`SQUADRA ${this.team.length}/${this.getTeamSlotLimit()} · CAP LV.${this.getLevelCap()}`;
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
        slot.className=`team-slot ${p===this.activeMon?'active':''} ${p.currentHp<=0?'fainted':''} type-${p.type} ${this.pendingItemTarget?(p.currentHp>0||this.pendingItemTarget==='abilityCapsule'?'item-target-valid':'item-target-invalid'):''} ${this.partyMoveSource===p?'swap-choice':''} ${this.partyMoveSource&&p!==this.partyMoveSource?'move-destination':''}`;
        // T01: Keep the original active border, without an ATTIVO/LEAD badge.
        // Announce lead and fainted status to assistive technology only.
        const accessibilityStatus=p.currentHp<=0 ? ('esausto') :
          p===this.activeMon ? ('Pokémon attivo') : '';
        slot.setAttribute('aria-label',`${p.name} · ${'livello'} ${p.level} · ${p.currentHp}/${p.maxHp} ${'PS'}`+
          (accessibilityStatus?` · ${accessibilityStatus}`:''));
        const line=document.createElement('div');line.className='slot-top';
        const monName=document.createElement('span');monName.textContent=p.name+(p.gender==='male'?' ♂':p.gender==='female'?' ♀':'')+(p.isShiny?' ✨':'');
        const lv=document.createElement('span');lv.textContent=`Lv.${p.level}`;line.append(monName,lv);
        const sprite=document.createElement('img');sprite.className='team-slot-img';
        sprite.src=typeof p.spriteFront==='string' && /^(https:\/\/|assets\/|data:image\/)/.test(p.spriteFront)?resolvedSpritePath(p.spriteFront):'assets/sprites/ui/pokemon-placeholder.svg';sprite.alt=p.name;
        const hpBack=document.createElement('div');hpBack.className='team-hp-bg';
        const hpFill=document.createElement('div');hpFill.className=`team-hp-fill hp-${hpState}`;hpFill.style.width=`${hp}%`;hpBack.append(hpFill);
        const hpText=document.createElement('div');hpText.className='team-hp-text';hpText.textContent=`${p.currentHp}/${p.maxHp} ${'PS'}`;
        slot.append(line,sprite,hpBack,hpText);
        slot.disabled=(inBattle && this.battleBusy) || (p.currentHp<=0 && !this.pendingItemTarget && !this.abilityCapsuleOpen);
        slot.onclick=()=>{
          if(this.pendingItemTarget){this.giveItemToPokemon(p);return;}
          this.openPartyActions(p);
        };
      }
      team.appendChild(slot);
    }
  }

}