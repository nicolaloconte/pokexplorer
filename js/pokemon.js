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
  'hyper-beam':'Iper Raggio', 'double-edge':'Sdoppiatore', 'rest':'Riposo', 'recover':'Ripresa',
  withdraw:'Ritirata','sand-attack':'Turbosabbia',sing:'Canto',supersonic:'Supersuono',
  'smoke-screen':'Muro di Fumo',smokescreen:'Muro di Fumo','dragon-rage':'Ira di Drago',
  'scary-face':'Visotruce',rage:'Ira',lick:'Leccata',spite:'Dispetto',curse:'Maledizione',
  'string-shot':'Millebave','bug-bite':'Coleomorso', peck:'Beccata',gust:'Raffica',
  'poison-gas':'Velenogas', 'sandstorm':'Terrempesta', 'sweet-scent':'Profumino',
  'double-team':'Doppioteam', 'minimize':'Minimizzato','swords-dance':'Danzaspada',
  'agility':'Agilità', 'focus-energy':'Focalenergia','water-pulse':'Idropulsar',
  'karate-chop':'Colpokarate','low-kick':'Calciobasso','rock-tomb':'Rocciotomba',
  'headbutt':'Bottintesta', 'fury-attack':'Furia', 'horn-attack':'Incornata',
  'poison-fang':'Velenodenti','acid-armor':'Scudo Acido',wrap:'Avvolgibotta',
  'stun-spore':'Paralizzante','fury-cutter':'Tagliofuria','flame-wheel':'Ruotafuoco',
  'fire-blast':'Fuocobomba','ice-beam':'Geloraggio','ice-punch':'Gelopugno',
  'psybeam':'Psicoraggio','double-slap':'Doppiasberla','fury-swipes':'Sfuriate',
  'pin-missile':'Missilspillo','rollout':'Rotolamento','ice-ball':'Palla Gelo',
  'confuse-ray':'Stordiraggio','comet-punch':'Cometapugno',
  'waterfall':'Cascata', 'dragon-breath':'Dragospiro','night-shade':'Ombra Notturna',
  'nightmare':'Incubo','mean-look':'Malosguardo','destiny-bond':'Destinobbligato',
  'self-destruct':'Autodistruzione', 'explosion':'Esplosione','seismic-toss':'Mov. Sismico',
  'psych-up':'Psicamisù','future-sight':'Divinazione','light-screen':'Schermoluce',reflect:'Riflesso','strength':'Forza',cut:'Taglio',fly:'Volo',dig:'Fossa','metronome':'Metronomo',
  'magnitude':'Magnitudo','teleport':'Teletrasporto','sonic-boom':'Sonicboom','super-fang':'Superzanna','protect':'Protezione','sleep-talk':'Sonnolalia','snore':'Russare', 'rest':'Riposo'
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
  recover:['normal',0,10,'status'],rest:['psychic',0,10,'status'],
  'psych-up':['normal',0,10,'status'],
  'future-sight':['psychic',80,15,'special'],'doom-desire':['steel',120,5,'special'],
  'self-destruct':['normal',200,5,'physical'],explosion:['normal',250,5,'physical'],
  'light-screen':['psychic',0,30,'status'],reflect:['psychic',0,20,'status'],
  'dragon-dance':['dragon',0,20,'status'],'work-up':['normal',0,30,'status'],
  'belly-drum':['normal',0,10,'status'],'heal-bell':['normal',0,5,'status'],
  aromatherapy:['grass',0,5,'status'],refresh:['normal',0,20,'status'],
  roar:['normal',0,20,'status'],whirlwind:['normal',0,20,'status'],
  swagger:['normal',0,15,'status'],flatter:['dark',0,15,'status'],
  'swords-dance':['normal',0,20,'status'],agility:['psychic',0,30,'status'],
  'double-team':['normal',0,15,'status'],screech:['normal',0,40,'status'],
  amnesia:['psychic',0,20,'status'],barrier:['psychic',0,20,'status'],
  'calm-mind':['psychic',0,20,'status'],haze:['ice',0,30,'status'],
  'focus-energy':['normal',0,30,'status'],mist:['ice',0,30,'status'],safeguard:['normal',0,25,'status'],
  sing:['normal',0,15,'status'],withdraw:['water',0,40,'status'],
  'sand-attack':['ground',0,15,'status'],
  'psybeam':['psychic',65,20,'special'],'rollout':['rock',30,20,'physical'],
  'ice-ball':['ice',30,20,'physical'],'fury-swipes':['normal',18,15,'physical'],
  'double-slap':['normal',15,10,'physical'],'pin-missile':['bug',14,20,'physical'],
  'fury-attack':['normal',15,20,'physical'],'comet-punch':['normal',18,15,'physical'],
  'spike-cannon':['normal',20,15,'physical'],'barrage':['normal',15,20,'physical'],
  'bone-rush':['ground',25,10,'physical'],'bullet-seed':['grass',10,30,'physical'],
  'rock-blast':['rock',25,10,'physical'],'icicle-spear':['ice',10,30,'physical'],
  'arm-thrust':['fighting',15,20,'physical'],'double-hit':['normal',35,10,'physical'],
  'twineedle':['bug',25,20,'physical'],'bonemerang':['ground',50,10,'physical'],
  'triple-kick':['fighting',10,10,'physical'],
  'string-shot':['bug',0,40,'status'],
  supersonic:['normal',0,20,'status'],
  protect:['normal',0,10,'status'],magnitude:['ground',70,30,'physical'],
  'dragon-rage':['dragon',0,10,'special'],'sonic-boom':['normal',0,20,'special'],
  'night-shade':['ghost',0,15,'special'],'seismic-toss':['fighting',0,20,'physical'],
  'super-fang':['normal',0,10,'physical'],teleport:['psychic',0,20,'status']
};
// FireRed/LeafGreen use the pre-Gen-IV type-based damage class split.
// PokéAPI reports the modern per-move split, so normalize every damaging
// move locally to prevent e.g. Crunch being treated as a physical Dark attack.
const GENERATION_THREE_SPECIAL_TYPES=new Set(['fire','water','grass','electric','ice','psychic','dragon','dark']);
function gen3DamageClass(type,category,power){
  return category==='status'||(!power && category==='status')?'status':
    GENERATION_THREE_SPECIAL_TYPES.has(type)?'special':'physical';
}
const MOVE_STATUS_FALLBACK={
  growl:{statChange:{stat:'attack',stage:-1,chance:100}},
  leer:{statChange:{stat:'defense',stage:-1,chance:100}},
  'tail-whip':{statChange:{stat:'defense',stage:-1,chance:100}},
  'defense-curl':{statChange:{stat:'defense',stage:1,chance:100}},
  harden:{statChange:{stat:'defense',stage:1,chance:100}},
  'thunder-wave':{ailment:'paralysis',ailmentChance:100},
  'poison-powder':{ailment:'poison',ailmentChance:100},
  'sleep-powder':{ailment:'sleep',ailmentChance:100,accuracy:75},
  ember:{ailment:'burn',ailmentChance:10},
  'thunder-shock':{ailment:'paralysis',ailmentChance:10},
  'poison-sting':{ailment:'poison',ailmentChance:30},
  swift:{alwaysHits:true},
  'leech-seed':{seed:true,ailment:null,ailmentChance:0},
  sing:{ailment:'sleep',ailmentChance:100,accuracy:55},
  withdraw:{statChange:{stat:'defense',stage:1,chance:100}},
  'sand-attack':{statChange:{stat:'accuracy',stage:-1,chance:100}},
  'string-shot':{statChange:{stat:'speed',stage:-2,chance:100}},
  supersonic:{ailment:'confusion',ailmentChance:100,accuracy:55},
  'confuse-ray':{ailment:'confusion',ailmentChance:100},
  psybeam:{ailment:'confusion',ailmentChance:10},
  rollout:{accuracy:90},'ice-ball':{accuracy:90},
  'fury-swipes':{accuracy:80},'double-slap':{accuracy:85},
  'pin-missile':{accuracy:85},'fury-attack':{accuracy:85},
  confusion:{ailment:'confusion',ailmentChance:10},
  'water-pulse':{ailment:'confusion',ailmentChance:20},
  'dizzy-punch':{ailment:'confusion',ailmentChance:20},
  'signal-beam':{ailment:'confusion',ailmentChance:10},
  'dynamic-punch':{ailment:'confusion',ailmentChance:100},
  swagger:{ailment:'confusion',ailmentChance:100},
  'sweet-kiss':{ailment:'confusion',ailmentChance:100},
  // First-generation support moves and relevant cross-generation learned moves.
  'psych-up':{copyStages:true},
  'light-screen':{screen:'special'},reflect:{screen:'physical'},
  'future-sight':{delayedHit:true},'doom-desire':{delayedHit:true},
  'self-destruct':{selfKo:true},explosion:{selfKo:true},
  'swords-dance':{statChanges:[{stat:'attack',stage:2,chance:100}]},
  agility:{statChanges:[{stat:'speed',stage:2,chance:100}]},
  'double-team':{statChanges:[{stat:'evasion',stage:1,chance:100}]},
  minimize:{statChanges:[{stat:'evasion',stage:1,chance:100}]},
  'smoke-screen':{statChanges:[{stat:'accuracy',stage:-1,chance:100}]},
  smokescreen:{statChanges:[{stat:'accuracy',stage:-1,chance:100}]},
  flash:{statChanges:[{stat:'accuracy',stage:-1,chance:100}]},
  kinesis:{statChanges:[{stat:'accuracy',stage:-1,chance:100}]},
  screech:{statChanges:[{stat:'defense',stage:-2,chance:85}]},
  'scary-face':{statChanges:[{stat:'speed',stage:-2,chance:100}]},
  charm:{statChanges:[{stat:'attack',stage:-2,chance:100}]},
  'fake-tears':{statChanges:[{stat:'special-defense',stage:-2,chance:100}]},
  'metal-sound':{statChanges:[{stat:'special-defense',stage:-2,chance:85}]},
  'feather-dance':{statChanges:[{stat:'attack',stage:-2,chance:100}]},
  'sweet-scent':{statChanges:[{stat:'evasion',stage:-1,chance:100}]},
  'acid-armor':{statChanges:[{stat:'defense',stage:2,chance:100}]},
  barrier:{statChanges:[{stat:'defense',stage:2,chance:100}]},
  'iron-defense':{statChanges:[{stat:'defense',stage:2,chance:100}]},
  amnesia:{statChanges:[{stat:'special-defense',stage:2,chance:100}]},
  'calm-mind':{statChanges:[{stat:'special-attack',stage:1,chance:100},{stat:'special-defense',stage:1,chance:100}]},
  'bulk-up':{statChanges:[{stat:'attack',stage:1,chance:100},{stat:'defense',stage:1,chance:100}]},
  'cosmic-power':{statChanges:[{stat:'defense',stage:1,chance:100},{stat:'special-defense',stage:1,chance:100}]},
  growth:{statChanges:[{stat:'special-attack',stage:1,chance:100}]},
  meditate:{statChanges:[{stat:'attack',stage:1,chance:100}]},
  sharpen:{statChanges:[{stat:'attack',stage:1,chance:100}]},
  howl:{statChanges:[{stat:'attack',stage:1,chance:100}]},
  'nasty-plot':{statChanges:[{stat:'special-attack',stage:2,chance:100}]},
  'tail-glow':{statChanges:[{stat:'special-attack',stage:2,chance:100}]},
  'focus-energy':{focusEnergy:true},
  'poison-gas':{ailment:'poison',ailmentChance:100,accuracy:90},
  'stun-spore':{ailment:'paralysis',ailmentChance:100,accuracy:75},
  glare:{ailment:'paralysis',ailmentChance:100,accuracy:75},
  toxic:{ailment:'bad-poison',ailmentChance:100,accuracy:85},
  'will-o-wisp':{ailment:'burn',ailmentChance:100,accuracy:75},
  'sweet-kiss':{ailment:'confusion',ailmentChance:100,accuracy:75},
  swagger:{ailment:'confusion',ailmentChance:100,statChanges:[{stat:'attack',stage:2,chance:100}],statTarget:'selected-pokemon'},
  flatter:{ailment:'confusion',ailmentChance:100,statChanges:[{stat:'special-attack',stage:1,chance:100}],statTarget:'selected-pokemon'},
  'dragon-dance':{statChanges:[{stat:'attack',stage:1,chance:100},{stat:'speed',stage:1,chance:100}]},
  'work-up':{statChanges:[{stat:'attack',stage:1,chance:100},{stat:'special-attack',stage:1,chance:100}]},
  'belly-drum':{maxAttackHalfHp:true},
  'heal-bell':{cureTeam:true},aromatherapy:{cureTeam:true},
  'refresh':{cureStatus:true},
  'roar':{disengage:true},whirlwind:{disengage:true},

  'rest':{healing:100},
  'haze':{resetStages:true},'mist':{mist:true},safeguard:{safeguard:true},
  protect:{priority:3,alwaysHits:true}
};
// Number of hits in one turn. Most of these attacks strike 2-5 times;
// two-/three-hit moves keep their own fixed counts. PokeAPI supplies other
// multi-hit moves through meta.min_hits/max_hits, but these work offline too.
const MOVE_HIT_FALLBACK=Object.freeze({
  'double-slap':[2,5],'fury-attack':[2,5],'fury-swipes':[2,5],
  'pin-missile':[2,5],'comet-punch':[2,5],'spike-cannon':[2,5],
  barrage:[2,5],'bone-rush':[2,5],'bullet-seed':[2,5],
  'rock-blast':[2,5],'icicle-spear':[2,5],'arm-thrust':[2,5],
  'tail-slap':[2,5],'water-shuriken':[2,5],'scale-shot':[2,5],
  'double-kick':[2,2],'double-hit':[2,2],'dual-wingbeat':[2,2],
  twineedle:[2,2],bonemerang:[2,2],'double-iron-bash':[2,2],
  'triple-kick':[3,3],'triple-axel':[3,3],'surging-strikes':[3,3]
});
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
    this.category=category; this.statChange=statChange; this.accuracy=extra.accuracy ?? 100; this.alwaysHits=Boolean(extra.alwaysHits);
    this.priority=extra.priority || 0; this.critRate=extra.critRate || 0;
    this.ailment=extra.ailment || null; this.ailmentChance=extra.ailmentChance || 0;
    this.drain=extra.drain || 0;
    this.healing=extra.healing || 0;
    this.minHits=extra.minHits || 1;this.maxHits=extra.maxHits || this.minHits;
    this.statChanges=extra.statChanges|| (statChange?[statChange]:[]);
    this.statTarget=extra.statTarget||null;
    this.screen=extra.screen||null;this.delayedHit=Boolean(extra.delayedHit);
    this.selfKo=Boolean(extra.selfKo);this.focusEnergy=Boolean(extra.focusEnergy);
    this.resetStages=Boolean(extra.resetStages);this.mist=Boolean(extra.mist);
    this.safeguard=Boolean(extra.safeguard);this.copyStages=Boolean(extra.copyStages);
    this.maxAttackHalfHp=Boolean(extra.maxAttackHalfHp);
    this.cureTeam=Boolean(extra.cureTeam);this.cureStatus=Boolean(extra.cureStatus);
    this.disengage=Boolean(extra.disengage);
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
          accuracy:d.accuracy ?? 100,alwaysHits:d.accuracy===null,priority:d.priority||0,critRate:d.meta?.crit_rate || 0,
          statChange:stat ? {stat:stat.stat.name,stage:stat.change, chance:d.effect_chance||100} : null,
          statChanges:(d.stat_changes||[]).map(c=>({stat:c.stat.name,stage:c.change,chance:d.meta?.stat_chance || d.effect_chance ||100})),
          statTarget:d.target?.name||null,
          ailment:d.meta?.ailment?.name || null,ailmentChance:d.meta?.ailment_chance || 0,
          healing:d.meta?.healing || 0,drain:d.meta?.drain || 0,
          minHits:d.meta?.min_hits || 1,maxHits:d.meta?.max_hits || d.meta?.min_hits || 1,
          italianName:d.names?.find(n=>n.language?.name==='it')?.name || null};
      } catch(e) {const a=MOVE_FALLBACK[id] || ['normal',40,20,'physical'];return {type:a[0],power:a[1],pp:a[2],category:a[3],accuracy:100,...(MOVE_STATUS_FALLBACK[id]||{})};}
    })());
  }
  const d=await moveMetadataCache.get(id);
  const meta={...d,...(MOVE_STATUS_FALLBACK[id]||{}),id};
  if(!meta.statChanges?.length && meta.statChange)meta.statChanges=[meta.statChange];
  // The API describes many special status techniques without actual boost metadata.
  if(id==='rest')meta.healing=100;
  // PokeAPI defaults to current generations. These values are FR/LG-specific.
  const generationThree={
    wrap:{power:15,accuracy:85,pp:20},
    'fire-spin':{power:15,accuracy:70,pp:15}
  };
  Object.assign(meta,generationThree[id]||{});
  // Protezione always acts before normal attacks, even when PokéAPI is offline.
  if(id==='protect')meta.priority=3;
  if(id==='leech-seed'){meta.ailment=null;meta.ailmentChance=0;}
  if(id==='sing')meta.accuracy=55;
  if(MOVE_HIT_FALLBACK[id]){[meta.minHits,meta.maxHits]=MOVE_HIT_FALLBACK[id];}
  meta.category=gen3DamageClass(meta.type,meta.category,meta.power);
  return new Move(MOVE_NAMES_IT[id] || d.italianName || id.replaceAll('-',' ').toUpperCase(),meta.type,meta.power,meta.pp,meta.category,meta.statChange,meta);
}
// I nomi e gli effetti delle 25 nature corrispondono alle tabelle dei giochi dalla Gen III.
// Chiavi: Attacco, Difesa, Attacco Speciale, Difesa Speciale, Velocità.
const POKEMON_NATURES=[
 ['Ardita',null,null],['Schiva','attack','defense'],['Audace','attack','speed'],
 ['Decisa','attack','special-attack'],['Birbona','attack','special-defense'],
 ['Sicura','defense','attack'],['Docile',null,null],['Placida','defense','speed'],
 ['Scaltra','defense','special-attack'],['Fiacca','defense','special-defense'],
 ['Timida','speed','attack'],['Lesta','speed','defense'],['Seria',null,null],
 ['Allegra','speed','special-attack'],['Ingenua','speed','special-defense'],
 ['Modesta','special-attack','attack'],['Mite','special-attack','defense'],
 ['Quieta','special-attack','speed'],['Ritrosa',null,null],['Ardente','special-attack','special-defense'],
 ['Calma','special-defense','attack'],['Gentile','special-defense','defense'],
 ['Vivace','special-defense','speed'],['Cauta','special-defense','special-attack'],['Furba',null,null]
];
const STAT_LABELS_IT={hp:'PS',attack:'ATT',defense:'DIF','special-attack':'ATT. SP','special-defense':'DIF. SP',speed:'VEL'};
const ABILITY_NAMES_IT={
 overgrow:'Erbaiuto',blaze:'Aiutofuoco',torrent:'Acquaiuto',swarm:'Aiutinsetto',
 intimidate:'Prepotenza',levitate:'Levitazione',static:'Statico','poison-point':'Velenopunte',
 'flame-body':'Corpodifuoco','water-absorb':'Assorbacqua','volt-absorb':'Assorbivolt',
 'flash-fire':'Fuocardore',sturdy:'Vigore',pressure:'Pressione','thick-fat':'Grassospesso',
 guts:'Dentistretti','huge-power':'Macroforza','pure-power':'Forzapura','clear-body':'Corpochiaro',
 'white-smoke':'Fumochiaro','hyper-cutter':'Ipertaglio','inner-focus':'Forza Interiore',
 'own-tempo':'Mente Locale','keen-eye':'Sguardofermo','natural-cure':'Alternacura',
 'run-away':'Fugafacile','shell-armor':'Guscioscudo','battle-armor':'Lottascudo',
 'synchronize':'Sincronismo',chlorophyll:'Clorofilla','swift-swim':'Nuotovelox',
 'rock-head':'Testadura', 'early-bird':'Sveglialampo',immunity:'Immunità',
 'insomnia':'Insonnia','vital-spirit':'Spiritovivo','water-veil':'Idrovelo',
 'limber':'Scioltezza','sand-veil':'Sabbiavelo', 'lightning-rod':'Parafulmine',
 'magma-armor':'Magmascudo', 'compound-eyes':'Insettocchi', 'shield-dust':'Polvoscudo',
 'effect-spore':'Spargispora', 'rough-skin':'Cartavetro','trace':'Traccia',
 'adaptability':'Adattabilità','technician':'Tecnico','serene-grace':'Leggiadro',
 'sniper':'Cecchino','super-luck':'Supersorte','no-guard':'Nullodifesa',
 'marvel-scale':'Pelledura','oblivious':'Indifferenza', 'pickup':'Raccolta',
 'thick-fat':'Grassospesso', 'arena-trap':'Trappoarena'
};
function natureStatMultiplier(nature,stat){return !nature || nature[1]===nature[2] ? 1 : (nature[1]===stat ? 1.1 : (nature[2]===stat ? 0.9 : 1));}
function pokemonStatValue(base,iv,ev,level,nature,key){
 const raw=Math.floor((2*base+iv+Math.floor(ev/4))*level/100);
 return key==='hp'?raw+level+10:Math.floor((raw+5)*natureStatMultiplier(nature,key));
}

/**
 * Experience groups used by the mainline games since Generation III.
 * These functions return TOTAL cumulative experience at a level (not
 * experience earned in the current level). A level-1 Pokémon starts at 0 XP.
 * Source: PokéAPI /growth-rate, Pokémon species.growth_rate.
 */
const POKEMON_GROWTH_RATES=new Set(['erratic','fast','medium-fast','medium-slow','slow','fluctuating']);
const GROWTH_FALLBACK_BY_SPECIES={
  // Kanto's starter families are Medium Slow in the mainline games.
  1:'medium-slow',2:'medium-slow',3:'medium-slow',
  4:'medium-slow',5:'medium-slow',6:'medium-slow',
  7:'medium-slow',8:'medium-slow',9:'medium-slow'
};
function normalizedGrowthRate(rate, speciesId){
  const value=typeof rate==='string'?rate:rate?.name;
  return POKEMON_GROWTH_RATES.has(value)?value:(GROWTH_FALLBACK_BY_SPECIES[speciesId]||'medium-fast');
}
function totalExperienceForLevel(rate, level){
  const n=Math.max(1,Math.min(100,Math.floor(Number(level)||1)));
  if(n===1)return 0;
  const n3=n*n*n;
  let value;
  switch(normalizedGrowthRate(rate)){
    case 'erratic':
      if(n<50)value=n3*(100-n)/50;
      else if(n<68)value=n3*(150-n)/100;
      else if(n<98)value=n3*Math.floor((1911-10*n)/3)/500;
      else value=n3*(160-n)/100;
      break;
    case 'fast':value=4*n3/5;break;
    case 'medium-slow':value=6*n3/5-15*n*n+100*n-140;break;
    case 'slow':value=5*n3/4;break;
    case 'fluctuating':
      if(n<15)value=n3*(Math.floor((n+1)/3)+24)/50;
      else if(n<36)value=n3*(n+14)/50;
      else value=n3*(Math.floor(n/2)+32)/50;
      break;
    default:value=n3; // medium-fast
  }
  return Math.max(0,Math.floor(value));
}
function experienceForNextLevel(rate, level){
  const n=Math.max(1,Math.min(100,Math.floor(Number(level)||1)));
  return n>=100?0:totalExperienceForLevel(rate,n+1)-totalExperienceForLevel(rate,n);
}

class Pokemon {
  constructor(data, level=5) {
    this.id=data.id; this.name=data.name.toUpperCase(); this.level=Math.min(100,Math.max(1,Math.floor(level)));
    this.growthRate=normalizedGrowthRate(data.growth_rate ?? data.growthRate, this.id);
    this.baseExperience=data.base_experience||65;
    this.types=(data.types||[]).map(t=>t.type.name); this.type=this.types[0] || 'normal';
    this.spriteFront=data.sprites?.front_default || '';
    this.spriteBack=data.sprites?.back_default || this.spriteFront;
    this.baseStats=Object.fromEntries((data.stats||[]).map(s=>[s.stat.name,s.base_stat]));
    this.ivs=Object.fromEntries(Object.keys(STAT_LABELS_IT).map(k=>[k,Math.floor(Math.random()*32)]));
    this.evs=Object.fromEntries(Object.keys(STAT_LABELS_IT).map(k=>[k,0]));
    this.nature=POKEMON_NATURES[Math.floor(Math.random()*POKEMON_NATURES.length)];
    this.abilityOptions=(data.abilities||[]).filter(a=>!a.is_hidden).map(a=>a.ability?.name).filter(Boolean);
    this.ability=this.abilityOptions[Math.floor(Math.random()*this.abilityOptions.length)]||'none';
    this.abilityName=ABILITY_NAMES_IT[this.ability]||this.ability.replaceAll('-',' ');
    this.evYield=Object.fromEntries((data.stats||[]).map(s=>[s.stat.name,s.effort||0]));
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
        const meta=MOVE_STATUS_FALLBACK[id]||{};
        return new Move(MOVE_NAMES_IT[id]||id.toUpperCase(),...a,meta.statChange||null,{id,...meta});
      });
    }
    this.movesLoaded=false;
  }
  requiredExp(){return experienceForNextLevel(this.growthRate,this.level);}
  calcStats() {
    const b=this.baseStats;
    const val=(key,fallback)=>pokemonStatValue(b[key]??fallback,this.ivs[key]??0,this.evs[key]??0,this.level,this.nature,key);
    this.maxHp=this.id===292?1:val('hp',45);
    this.attack=val('attack',49);this.defense=val('defense',49);
    this.spAtk=val('special-attack',49);this.spDef=val('special-defense',49);
    this.speed=val('speed',45);
  }
  gainEffortValues(yieldStats){
    if(!yieldStats)return false;
    let total=Object.values(this.evs).reduce((a,b)=>a+b,0),changed=false;
    for(const stat of Object.keys(STAT_LABELS_IT)){
      const amount=Math.min(Math.max(0,yieldStats[stat]||0),252-this.evs[stat],510-total);
      if(amount>0){this.evs[stat]+=amount;total+=amount;changed=true;}
    }
    if(changed){const hpBefore=this.maxHp;this.calcStats();this.currentHp=Math.min(this.maxHp,this.currentHp+this.maxHp-hpBefore);}
    return changed;
  }
  getStatsSummary(){return {
    hp:this.maxHp,attack:this.attack,defense:this.defense,
    'special-attack':this.spAtk,'special-defense':this.spDef,speed:this.speed};}
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
  async gainExperience(amount, levelCap=100) {
    const levels=[];
    const cap=Math.max(1,Math.min(100,Math.floor(Number(levelCap)||100)));
    // Experience cannot be stockpiled at a temporary badge cap.
    if(this.level>=cap){this.exp=0;if(this.level>=100)this.expToNext=0;return levels;}
    this.exp+=Math.max(0,Math.floor(Number(amount)||0));
    while(this.level<cap && this.exp>=this.expToNext) {
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
    if(this.level>=cap){this.exp=0;if(this.level>=100)this.expToNext=0;}
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
      this.id=data.id;this.name=data.name.toUpperCase();this.baseExperience=data.base_experience||this.baseExperience;
      this.types=data.types.map(t=>t.type.name);this.type=this.types[0];
      this.spriteFront=data.sprites.front_default;this.spriteBack=data.sprites.back_default||this.spriteFront;
      this.baseStats=Object.fromEntries(data.stats.map(s=>[s.stat.name,s.base_stat]));
      this.evYield=Object.fromEntries(data.stats.map(s=>[s.stat.name,s.effort||0]));
      this.abilityOptions=(data.abilities||[]).filter(a=>!a.is_hidden).map(a=>a.ability?.name).filter(Boolean);
      if(!this.abilityOptions.includes(this.ability))this.ability=this.abilityOptions[0]||this.ability;
      this.abilityName=ABILITY_NAMES_IT[this.ability]||this.ability.replaceAll('-',' ');
      this.calcStats();this.currentHp=Math.min(this.maxHp,this.currentHp+this.maxHp-oldHp);
      this.learnset=this.parseLearnset(data);
      this.movesLoaded=true;
      return evolution;
    }catch(e){console.warn('Evoluzione non disponibile',e);return null;}
  }
  restorePp(){this.moves.forEach(m=>m.currentPp=m.maxPp);}
  clearVolatile(){this.confusionTurns=0;this.toxicTurns=0;this.statStages={};this.seeded=false;this.trappedTurns=0;this.trapMove=null;this.trapSource=null;this.flashFireActivated=false;
    this.pendingCharge=null;this.rechargeTurns=0;this.rampageTurns=0;this.rampageMove=null;
    this.rolloutTurns=0;this.rolloutHits=0;this.rolloutMove=null;this.defenseCurlUsed=false;
    this.lightScreenTurns=0;this.reflectTurns=0;this.safeguardTurns=0;
    this.mistTurns=0;this.focusEnergyActive=false;this.futureSight=null;}
  clearBattleConditions(){this.clearVolatile();this.status=null;this.statusTurns=0;}
  healAll(){this.currentHp=this.maxHp;this.restorePp();this.clearBattleConditions();}
}
function accuracyStageMultiplier(stage){const n=Math.max(-6,Math.min(6,stage||0));return n>=0?(3+n)/3:3/(3-n);}
function statMultiplier(stage){const n=Math.max(-6,Math.min(6,stage||0));return n>=0?(2+n)/2:2/(2-n);}
function calculateBattleDamage(attacker,defender,move,random=Math.random) {
  const effectiveness=typeEffectiveness(move.type,defender.types);
  if(!move.power || effectiveness===0) return {damage:0,effectiveness,critical:false};
  const special=move.category==='special';
  const aBase=(special?attacker.spAtk:attacker.attack);
  const boosted=(attacker.ability==='huge-power'||attacker.ability==='pure-power')&&!special?2:1;
  const guts=attacker.ability==='guts'&&attacker.status&&!special?1.5:1;
  const critical=!['battle-armor','shell-armor'].includes(defender.ability) && random()<Math.min(1,(attacker.focusEnergyActive?.125:.0625)+(move.critRate||0)*.0625);
  const atkStage=attacker.statStages?.[special?'special-attack':'attack']||0;
  const defStage=defender.statStages?.[special?'special-defense':'defense']||0;
  const a=aBase*boosted*guts*statMultiplier(critical?Math.max(0,atkStage):atkStage);
  const d=Math.max(1,(special?defender.spDef:defender.defense)*statMultiplier(critical?Math.min(0,defStage):defStage));
  const stab=attacker.types.includes(move.type)?(attacker.ability==='adaptability'?2:1.5):1;
  const power=Math.max(1,move.power);
  let abilityPower=1;
  if(attacker.currentHp<=attacker.maxHp/3){
    if((attacker.ability==='overgrow'&&move.type==='grass')||
      (attacker.ability==='blaze'&&move.type==='fire')||
      (attacker.ability==='torrent'&&move.type==='water')||
      (attacker.ability==='swarm'&&move.type==='bug'))abilityPower=1.5;
  }
  if((attacker.ability==='flash-fire'&&attacker.flashFireActivated&&move.type==='fire'))abilityPower*=1.5;
  if(attacker.ability==='technician' && move.power<=60)abilityPower*=1.5;
  let abilityDefense=1;
  if(defender.ability==='thick-fat'&&['fire','ice'].includes(move.type))abilityDefense=2;
  const base=(((2*attacker.level/5+2)*power*abilityPower*a/(d*abilityDefense))/50+2) * ((attacker.status==='burn' && !special && attacker.ability!=='guts')?0.5:1);
  // Reflect and Light Screen halve the respective incoming damage for five turns.
  const screen=(!critical && (special?defender.lightScreenTurns>0:defender.reflectTurns>0))?.5:1;
  const damage=Math.max(1,Math.floor(base * screen * (critical?2:1) * stab * effectiveness * (.85+random()*.15)));
  return {damage,effectiveness,critical};
}
