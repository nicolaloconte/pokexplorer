/* Pokéxplorer battle rules. Type relations use the FireRed/LeafGreen-era chart
   for the 15 original types, with Fairy supported for modern PokéAPI typings. */
const TYPE_CHART = {
  normal: {rock:.5,ghost:0,steel:.5}, fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
  water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5}, electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
  grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
  ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
  fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2,fairy:.5},
  poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0,fairy:2},
  ground:{fire:2,electric:2,grass:.5,poison:2,flying:0,bug:.5,rock:2,steel:2},
  flying:{electric:.5,grass:2,fighting:2,bug:2,rock:.5,steel:.5},
  psychic:{fighting:2,poison:2,psychic:.5,dark:0,steel:.5},
  bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5,fairy:.5},
  rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
  ghost:{normal:0,psychic:2,ghost:2,dark:.5},
  dragon:{dragon:2,steel:.5,fairy:0},
  dark:{fighting:.5,psychic:2,ghost:2,dark:.5,fairy:.5},
  steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5,fairy:2},
  fairy:{fire:.5,fighting:2,poison:.5,dragon:2,dark:2,steel:.5}
};
function typeEffectiveness(attackType, defendingTypes) {
  return (defendingTypes || []).reduce((v, t) => v * (TYPE_CHART[attackType]?.[t] ?? 1), 1);
}
const MOVE_NAMES_IT = {
  scratch:'Graffio', growl:'Ruggito', ember:'Braciere', tackle:'Azione', 'vine-whip':'Frustata',
  'water-gun':'Pistolacqua','tail-whip':'Colpocoda', leer:'Fulmisguardo', 'quick-attack':'Attacco Rapido',
  'thunder-shock':'Tuonoshock', 'thunderbolt':'Fulmine','razor-leaf':'Foglielama', 'flamethrower':'Lanciafiamme',
  bite:'Morso','body-slam':'Corposcontro','poison-powder':'Velenpolvere', 'sleep-powder':'Sonnifero',
  'solar-beam':'Solarraggio', surf:'Surf', 'hydro-pump':'Idropompa', 'rock-throw':'Sassata',
  'rock-slide':'Frana', 'earthquake':'Terremoto','hypnosis':'Ipnosi', 'confusion':'Confusione',
  psychic:'Psichico', 'mega-drain':'Megassorbimento', 'leech-seed':'Parassiseme',
  'double-kick':'Doppiocalcio','fire-spin':'Turbofuoco', 'thunder-wave':'Tuononda',
  'acid':'Acido','poison-sting':'Velenospina', 'defense-curl':'Ricciolscudo', 'harden':'Rafforzatore',
  'bubble-beam':'Bollaraggio','bubble':'Bolla', 'swift':'Comete', 'slash':'Lacerazione',
  'hyper-beam':'Iper Raggio', 'double-edge':'Sdoppiatore', 'rest':'Riposo', 'recover':'Ripresa'
};
// Local metadata allow basic play even if the per-move network call fails.
const MOVE_FALLBACK = {
  scratch:['normal',40,35,'physical'],growl:['normal',0,40,'status'],ember:['fire',40,25,'special'],
  tackle:['normal',40,35,'physical'],'vine-whip':['grass',45,25,'physical'],'water-gun':['water',40,25,'special'],
  'tail-whip':['normal',0,30,'status'],leer:['normal',0,30,'status'],'quick-attack':['normal',40,30,'physical'],
  'thunder-shock':['electric',40,30,'special'],bite:['dark',60,25,'physical'],'razor-leaf':['grass',55,25,'physical'],
  'poison-powder':['poison',0,35,'status'],'sleep-powder':['grass',0,15,'status'],
  'rock-throw':['rock',50,15,'physical'], 'defense-curl':['normal',0,40,'status'],
  'thunderbolt':['electric',90,15,'special'], 'flamethrower':['fire',90,15,'special'],
  'bubble':['water',40,30,'special'],'bubble-beam':['water',65,20,'special'],
  'confusion':['psychic',50,25,'special'], 'psychic':['psychic',90,10,'special'],
  'poison-sting':['poison',15,35,'physical'],'earthquake':['ground',100,10,'physical'],
  'rock-slide':['rock',75,10,'physical'], 'body-slam':['normal',85,15,'physical'],
  'mega-drain':['grass',40,15,'special'], 'leech-seed':['grass',0,10,'status'],
  'fire-spin':['fire',35,15,'special'], 'double-kick':['fighting',30,30,'physical'],
  'thunder-wave':['electric',0,20,'status'], 'harden':['normal',0,30,'status'],
  'swift':['normal',60,20,'special'], 'slash':['normal',70,20,'physical'],
  'hydro-pump':['water',110,5,'special'],surf:['water',90,15,'special'],
  recover:['normal',0,10,'status'],rest:['psychic',0,10,'status']
};
const SPECIES_FALLBACK = {
  1:[[1,'tackle'],[3,'growl'],[7,'leech-seed'],[9,'vine-whip'],[13,'poison-powder'],[15,'sleep-powder'],[20,'razor-leaf']],
  4:[[1,'scratch'],[1,'growl'],[7,'ember'],[10,'smokescreen'],[16,'dragon-rage'],[19,'scary-face'],[25,'flamethrower']],
  7:[[1,'tackle'],[4,'tail-whip'],[7,'bubble'],[10,'withdraw'],[13,'water-gun'],[25,'bubble-beam']],
  25:[[1,'thunder-shock'],[5,'growl'],[10,'tail-whip'],[13,'quick-attack'],[26,'thunderbolt']],
  74:[[1,'tackle'],[1,'defense-curl'],[11,'rock-throw']],
  95:[[1,'tackle'],[1,'harden'],[12,'rock-throw'],[23,'rage']],
  92:[[1,'lick'],[1,'hypnosis'],[13,'spite'],[16,'curse']],
};
class Move {
  constructor(name, type, power, pp, category='physical', statChange=null, extra={}) {
    this.id = extra.id || String(name).toLowerCase().replaceAll(' ','-');
    this.name=name; this.type=type; this.power=power || 0;
    this.maxPp=pp || 10; this.currentPp=this.maxPp;
    this.category=category; this.statChange=statChange; this.accuracy=extra.accuracy ?? 100;
    this.priority=extra.priority || 0; this.critRate=extra.critRate || 0;
    this.ailment=extra.ailment || null; this.ailmentChance=extra.ailmentChance || 0;
    this.drain=extra.drain || 0;
    this.healing=extra.healing || 0;
  }
}
const moveMetadataCache = new Map();
async function createMove(moveId) {
  const id=String(moveId).toLowerCase();
  if (!moveMetadataCache.has(id)) {
    moveMetadataCache.set(id, (async()=>{
      try {
        const response=await fetch(`https://pokeapi.co/api/v2/move/${id}`);
        if(!response.ok) throw new Error(`move ${id}: ${response.status}`);
        const d=await response.json();
        const stat=d.stat_changes?.[0];
        return {type:d.type.name,power:d.power || 0,pp:d.pp || 10,category:d.damage_class.name,
          accuracy:d.accuracy ?? 100,priority:d.priority||0,critRate:d.meta?.crit_rate || 0,
          statChange:stat ? {stat:stat.stat.name,stage:stat.change, chance:d.effect_chance||100} : null,
          ailment:d.meta?.ailment?.name || null,ailmentChance:d.meta?.ailment_chance || 0,
          healing:d.meta?.healing || 0,drain:d.meta?.drain || 0};
      } catch(e) {const a=MOVE_FALLBACK[id] || ['normal',40,20,'physical'];return {type:a[0],power:a[1],pp:a[2],category:a[3],accuracy:100};}
    })());
  }
  const d=await moveMetadataCache.get(id);
  return new Move(MOVE_NAMES_IT[id] || id.replaceAll('-',' ').toUpperCase(),d.type,d.power,d.pp,d.category,d.statChange,{...d,id});
}
class Pokemon {
  constructor(data, level=5) {
    this.id=data.id; this.name=data.name.toUpperCase(); this.level=level;
    this.types=(data.types||[]).map(t=>t.type.name); this.type=this.types[0] || 'normal';
    this.spriteFront=data.sprites?.front_default || '';
    this.spriteBack=data.sprites?.back_default || this.spriteFront;
    this.baseStats=Object.fromEntries((data.stats||[]).map(s=>[s.stat.name,s.base_stat]));
    this.exp=0; this.expToNext=this.requiredExp(); this.statStages={}; this.status=null;
    this.statusTurns=0;this.seeded=false;
    this.calcStats(); this.currentHp=this.maxHp;
    this.learnset=this.parseLearnset(data);
    this.moves=[new Move('Azione','normal',40,35)];
    // Synchronous fallback. The real moves are hydrated from PokéAPI before battle.
    const starters=SPECIES_FALLBACK[this.id];
    if(starters) {
      this.moves=starters.filter(([lv])=>lv<=level).slice(-4).map(([lv,id])=>{
        const a=MOVE_FALLBACK[id]||['normal',40,25,'physical'];
        return new Move(MOVE_NAMES_IT[id]||id.toUpperCase(),...a,null,{id});
      });
    }
    this.movesLoaded=false;
  }
  requiredExp(){return Math.round(110 + this.level*22 + this.level*this.level*1.1);}
  calcStats() {
    const b=this.baseStats;
    this.maxHp=Math.floor((2*(b.hp||45)*this.level)/100)+this.level+10;
    this.attack=Math.floor((2*(b.attack||49)*this.level)/100)+5;
    this.defense=Math.floor((2*(b.defense||49)*this.level)/100)+5;
    this.spAtk=Math.floor((2*(b['special-attack']||49)*this.level)/100)+5;
    this.spDef=Math.floor((2*(b['special-defense']||49)*this.level)/100)+5;
    this.speed=Math.floor((2*(b.speed||45)*this.level)/100)+5;
  }
  parseLearnset(data) {
    const result=[];
    for(const record of data.moves || []) {
      const versions=(record.version_group_details||[]).filter(v=>v.move_learn_method?.name==='level-up');
      const version=versions.find(v=>v.version_group.name==='firered-leafgreen') ||
        versions.find(v=>v.version_group.name==='red-blue') ||
        versions.find(v=>v.version_group.name==='yellow');
      if(version) result.push({id:record.move.name,level:version.level_learned_at});
    }
    // PokéAPI's level-up list can be empty for special encounters. Provide explicit starters.
    if(!result.length && SPECIES_FALLBACK[this.id]) return SPECIES_FALLBACK[this.id].map(([level,id])=>({id,level}));
    return result.sort((a,b)=>a.level-b.level ||
      ((SPECIES_FALLBACK[this.id]?.findIndex(v=>v[1]===a.id) ?? -1) -
       (SPECIES_FALLBACK[this.id]?.findIndex(v=>v[1]===b.id) ?? -1)));
  }
  async loadLearnset() {
    if(this.movesLoaded) return;
    const learned=this.learnset.filter(m=>m.level<=this.level);
    if(learned.length) {
      const picked=learned.slice(-4);
      const old=this.moves;
      this.moves=await Promise.all(picked.map(async ({id})=>{
        const move=await createMove(id);
        const previous=old.find(m=>m.id===id);
        if(previous) move.currentPp=Math.min(previous.currentPp,move.maxPp);
        return move;
      }));
    }
    this.movesLoaded=true;
  }
  async gainExperience(amount) {
    const levels=[];
    this.exp+=Math.max(0,Math.floor(amount));
    while(this.exp>=this.expToNext && this.level<100) {
      this.exp-=this.expToNext;
      const oldHp=this.maxHp;
      this.level++; this.expToNext=this.requiredExp(); this.calcStats();
      this.currentHp=Math.min(this.maxHp,this.currentHp+(this.maxHp-oldHp));
      const eligible=this.learnset.filter(m=>m.level===this.level);
      const newMoves=await Promise.all(eligible.map(async m=>createMove(m.id)));
      levels.push({level:this.level,moves:newMoves});
      const evolution=await this.tryEvolution();
      if(evolution) levels[levels.length-1].evolution=evolution;
    }
    return levels;
  }
  async tryEvolution() {
    const evolutions={1:[16,2],2:[32,3],4:[16,5],5:[36,6],7:[16,8],8:[36,9],
      10:[7,11],11:[10,12],13:[7,14],14:[10,15],16:[18,17],17:[36,18],19:[20,20],
      21:[20,22],23:[22,24],27:[22,28],29:[16,30],32:[16,33],41:[22,42],43:[21,44],
      46:[24,47],48:[31,49],50:[26,51],52:[28,53],54:[33,55],56:[28,57],58:[35,59],
      60:[25,61],63:[16,64],64:[36,65],66:[28,67],67:[36,68],69:[21,70],70:[36,71],
      72:[30,73],74:[25,75],75:[40,76],77:[40,78],79:[37,80],81:[30,82],84:[31,85],
      86:[34,87],88:[38,89],92:[25,93],93:[38,94],96:[26,97],98:[28,99],100:[30,101],
      104:[28,105],109:[35,110],111:[42,112],116:[32,117],118:[33,119],
      129:[20,130],133:[99,133],147:[30,148],148:[55,149]};
    const next=evolutions[this.id];
    if(!next || this.level<next[0] || next[1]===this.id) return null;
    try {
      const res=await fetch(`https://pokeapi.co/api/v2/pokemon/${next[1]}`);
      if(!res.ok) return;
      const data=await res.json();const oldHp=this.maxHp;
      const evolution={from:this.name,to:data.name.toUpperCase(),fromSprite:this.spriteFront,toSprite:data.sprites.front_default};
      this.id=data.id;this.name=data.name.toUpperCase();
      this.types=data.types.map(t=>t.type.name);this.type=this.types[0];
      this.spriteFront=data.sprites.front_default;this.spriteBack=data.sprites.back_default||this.spriteFront;
      this.baseStats=Object.fromEntries(data.stats.map(s=>[s.stat.name,s.base_stat]));
      this.calcStats();this.currentHp=Math.min(this.maxHp,this.currentHp+this.maxHp-oldHp);
      this.learnset=this.parseLearnset(data);
      this.movesLoaded=true;
      return evolution;
    }catch(e){console.warn('Evoluzione non disponibile',e);return null;}
  }
  restorePp(){this.moves.forEach(m=>m.currentPp=m.maxPp);}
  clearVolatile(){this.statStages={};this.seeded=false;}
  healAll(){this.currentHp=this.maxHp;this.restorePp();this.status=null;this.statusTurns=0;this.clearVolatile();}
}
function statMultiplier(stage){const n=Math.max(-6,Math.min(6,stage||0));return n>=0?(2+n)/2:2/(2-n);}
function calculateBattleDamage(attacker,defender,move,random=Math.random) {
  const effectiveness=typeEffectiveness(move.type,defender.types);
  if(!move.power || effectiveness===0) return {damage:0,effectiveness,critical:false};
  const special=move.category==='special';
  const a=(special?attacker.spAtk:attacker.attack)*statMultiplier(attacker.statStages?.[special?'special-attack':'attack']);
  const d=Math.max(1,(special?defender.spDef:defender.defense)*statMultiplier(defender.statStages?.[special?'special-defense':'defense']));
  const critical=random()<(.0625+(move.critRate||0)*.0625);
  const stab=attacker.types.includes(move.type)?1.5:1;
  const power=Math.max(1,move.power);
  const base=(((2*attacker.level/5+2)*power*a/d)/50+2) * ((attacker.status==='burn' && !special)?0.5:1);
  const damage=Math.max(1,Math.floor(base * (critical?1.5:1) * stab * effectiveness * (.85+random()*.15)));
  return {damage,effectiveness,critical};
}
