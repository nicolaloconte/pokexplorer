// Small, behavior-preserving engine helpers extracted from R2.21 RC2.1.
GameEngine.prototype.isSolidTownCell = function(cell) {
    if(!this.isTownFloor() || !cell)return false;
    return Boolean(cell.decoration) || ['pokecenter','pokemart','gym','house','npc'].includes(cell.entity);
  };

GameEngine.prototype.revealArea = function(px, py) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          this.gridMap[ny][nx].revealed = true;
        }
      }
    }
  }
;

GameEngine.prototype.scanRadar = function() {
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
;
