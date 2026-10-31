// API-backed game features split from the rendering/gameplay class (F10).
GameEngine.prototype.getPokemonData = async function(id) {
    const key = String(id);
    if (!this.pokemonCache.has(key)) {
      const promise=pokeApiRequest(`pokemon/${key}`)
        .then(async data=>{
          // /pokemon returns combat data; /pokemon-species carries the growth rate.
          // Resolve it only once per species and tolerate temporary network failures.
          const species=data.species?.name||data.id;
          try{
            const res=await pokeApiRequest(`pokemon-species/${encodeURIComponent(species)}`);
            data.growth_rate=res.growth_rate;
            data.gender_rate=res.gender_rate;
          }catch(error){console.warn('Gruppo di crescita non disponibile, uso il fallback',error);}
          return data;
        })
        .catch(err=>{ this.pokemonCache.delete(key); throw err; });
      this.pokemonCache.set(key,promise);
    }
    return this.pokemonCache.get(key);
  };

GameEngine.prototype.getPokedexDescription = async function(kind,id,locale=this.locale) {
    const cache=kind==='ability'?this.abilityDescriptionCache:this.moveDescriptionCache;
    const key=`${id}:${locale}`;
    if(!cache.has(key))cache.set(key,(async()=>{
      try{
        const response=await pokeApiRequest(`${kind}/${encodeURIComponent(id)}`);
        const data=response;
        // Flavor text has broader Italian coverage than the formal effect entries.
        const entries=data.flavor_text_entries||[];
        const preferred=entries.filter(v=>v.language?.name===locale && (v.flavor_text||v.text));
        const text=preferred.at(-1)||{};
        const effect=(data.effect_entries||[]).find(v=>v.language?.name==='it');
        return String(text.flavor_text||text.text||effect?.short_effect||'').replace(/[\n\f]+/g,' ').replace(/\s+/g,' ').trim();
      }catch(_error){cache.delete(key);return '';}
    })());
    return cache.get(key);
  };

GameEngine.prototype.resolveAbilityName = async function(pokemon) {
  if(!pokemon?.ability || pokemon.ability==='none')return;
  const id=pokemon.ability,lang='it',key=`${id}:${lang}`;
  if(!this.abilityInfoCache)this.abilityInfoCache=new Map();
  if(!this.abilityInfoCache.has(key)){
    const request=pokeApiRequest(`ability/${encodeURIComponent(id)}`)
      .then(data=>data?.names?.find(n=>n.language?.name===lang)?.name||
        (typeof ABILITY_NAMES_IT!=='undefined'?ABILITY_NAMES_IT[id]:null)||id.replaceAll('-',' '))
      .catch(()=>{this.abilityInfoCache.delete(key);return id.replaceAll('-',' ');});
    this.abilityInfoCache.set(key,request);
  }
  const name=await this.abilityInfoCache.get(key);
  pokemon.abilityName=name;
  if(this.partyInfoPokemon===pokemon && this.locale===lang && !this.$id('pokemon-info-overlay').classList.contains('hidden')){
    this.$id('pokemon-info-ability').textContent=`ABILITÀ: ${name}`;
  }
};
