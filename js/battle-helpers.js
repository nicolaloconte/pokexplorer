// Small, behavior-preserving engine helpers extracted from R2.21 RC2.1.
GameEngine.prototype.battleSpritePosition = function(side) {
    const stage=this.$id('battle-stage').getBoundingClientRect();
    const sprite=this.$id(side==='enemy'?'enemy-sprite':'player-sprite').getBoundingClientRect();
    // Used by capture effects only: the target must be a *visible* sprite.
    return {x:sprite.left-stage.left+sprite.width*.50,
      y:sprite.top-stage.top+sprite.height*.54};
  }
;

GameEngine.prototype.battleThrowDestination = function(side) {
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
;

GameEngine.prototype.hpColorState = function(mon) {
    const ratio=mon?.maxHp ? mon.currentHp/mon.maxHp : 0;
    return ratio < .20 ? 'red' : ratio < .50 ? 'yellow' : 'green';
  }
;

GameEngine.prototype.resetBattleVisuals = function(keepPlayerOnField=false) {
    for(const id of ['battle-throw-ball','capture-ball','capture-smoke','summon-flash']){
      const el=this.$id(id);if(el){el.className=el.dataset.baseClass || el.className.split(' ')[0];el.removeAttribute('style');}
    }
    this.$id('attack-fx-container').replaceChildren();
    for(const id of ['enemy-sprite','player-sprite']){
      this.$id(id).classList.remove('recall-anim','summon-anim','summon-cinematic','hit-anim','attack-lunge','hidden');
    }
    this.$id('enemy-sprite').classList.add('hidden');
    if(!keepPlayerOnField)this.$id('player-sprite').classList.add('hidden');
  };

GameEngine.prototype.updateBattleHUD = function() {
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
  };

GameEngine.prototype.renderBattleConditions = function(side,mon) {
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
  };
