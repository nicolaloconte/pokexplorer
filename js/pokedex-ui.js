/* Pokéxplorer Hybrid — RotomDex presentation; undiscovered variants have no slots. */
(function(root){
  'use strict';
  const dex=root.PokexDex;if(!dex)return;
  const NAMES=`bulbasaur|ivysaur|venusaur|charmander|charmeleon|charizard|squirtle|wartortle|blastoise|caterpie|metapod|butterfree|weedle|kakuna|beedrill|pidgey|pidgeotto|pidgeot|rattata|raticate|spearow|fearow|ekans|arbok|pikachu|raichu|sandshrew|sandslash|nidoran-f|nidorina|nidoqueen|nidoran-m|nidorino|nidoking|clefairy|clefable|vulpix|ninetales|jigglypuff|wigglytuff|zubat|golbat|oddish|gloom|vileplume|paras|parasect|venonat|venomoth|diglett|dugtrio|meowth|persian|psyduck|golduck|mankey|primeape|growlithe|arcanine|poliwag|poliwhirl|poliwrath|abra|kadabra|alakazam|machop|machoke|machamp|bellsprout|weepinbell|victreebel|tentacool|tentacruel|geodude|graveler|golem|ponyta|rapidash|slowpoke|slowbro|magnemite|magneton|farfetchd|doduo|dodrio|seel|dewgong|grimer|muk|shellder|cloyster|gastly|haunter|gengar|onix|drowzee|hypno|krabby|kingler|voltorb|electrode|exeggcute|exeggutor|cubone|marowak|hitmonlee|hitmonchan|lickitung|koffing|weezing|rhyhorn|rhydon|chansey|tangela|kangaskhan|horsea|seadra|goldeen|seaking|staryu|starmie|mr-mime|scyther|jynx|electabuzz|magmar|pinsir|tauros|magikarp|gyarados|lapras|ditto|eevee|vaporeon|jolteon|flareon|porygon|omanyte|omastar|kabuto|kabutops|aerodactyl|snorlax|articuno|zapdos|moltres|dratini|dragonair|dragonite|mewtwo|mew`.split('|');
  const pretty=s=>({nidoran_f:'Nidoran♀',nidoran_m:'Nidoran♂','nidoran-f':'Nidoran♀','nidoran-m':'Nidoran♂','mr-mime':'Mr. Mime','farfetchd':"Farfetch’d"}[s]||String(s||'').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase()));
  const typeNames={normal:'NORMALE',fire:'FUOCO',water:'ACQUA',electric:'ELETTRO',grass:'ERBA',ice:'GHIACCIO',fighting:'LOTTA',poison:'VELENO',ground:'TERRA',flying:'VOLANTE',psychic:'PSICO',bug:'COLEOTTERO',rock:'ROCCIA',ghost:'SPETTRO',dragon:'DRAGO',dark:'BUIO',steel:'ACCIAIO',fairy:'FOLLETTO'};
  const el=id=>root.document.getElementById(id);
  const labels={seen:'AVVISTATO',caught:'CATTURATO',unknown:'NON SCOPERTO',genderless:'SENZA SESSO',male:'MASCHIO ♂',female:'FEMMINA ♀',normal:'NORMALE',shiny:'SHINY ✨',waiting:'NON SINCRONIZZATO',description:'Descrizione',height:'ALTEZZA',weight:'PESO',habitat:'HABITAT'};
  let active=25,tab='scheda',initialized=false,lastFocus=null,detailsCache=new Map(),speciesCache=new Map(),requestId=0;
  let typePrefetching=false,noticeTimer=null;
  const discoveries=[];
  function showDiscovery(){
    if(noticeTimer||!discoveries.length)return;
    if(!el('overlay-battle')?.classList.contains('hidden')||!el('starter-scene-overlay')?.classList.contains('hidden')||isOpen())return;
    const event=discoveries.shift(),toast=el('dex-discovery-toast');if(!toast)return;
    const shiny=event.shiny===true;
    toast.classList.toggle('shiny',shiny);
    toast.textContent=(shiny?'✨ ':'')+('NUOVA VARIANTE REGISTRATA')+': '+
      pretty(NAMES[event.species_id-1])+' · '+L(event.sex)+(shiny?' ✨':'')+' · '+L(event.caught?'caught':'seen');
    toast.classList.remove('hidden');
    noticeTimer=setTimeout(()=>{noticeTimer=null;toast.classList.add('hidden');showDiscovery();},3000);
  }
  async function prefetchTypes(){
    if(typePrefetching)return;
    typePrefetching=true;
    const ids=dex.entries().species.map(s=>Number(s.species_id)).filter(id=>!detailsCache.has(id));
    let cursor=0;
    const worker=async()=>{while(cursor<ids.length){
      const id=ids[cursor++];
      try{const data=await root.pokeApiRequest(`pokemon/${id}`);detailsCache.set(id,data);}
      catch(_){/* missing data remain filtered until network is restored */}
      if(isOpen()&&(el('dex-filter-type')?.value||'all')!=='all')renderList();
    }};
    await Promise.all(Array.from({length:Math.min(4,ids.length)},worker));
    typePrefetching=false;
  }
  function locale(){return 'it';}
  function L(k){return labels[k]||k;}
  function T(type){const key=String(type||'').toLowerCase();return typeNames[key]||pretty(key).toUpperCase();}
  function node(tag,cls='',value=''){
    const n=root.document.createElement(tag);if(cls)n.className=cls;
    if(value!==undefined&&value!==null)n.textContent=String(value);return n;
  }
  function text(id,value){const e=el(id);if(e)e.textContent=value;}
  function status(){const s=dex.state();text('dex-cloud-status',s.guest?('UTENTE · TEMPORANEO'):s.owner==='local'?('LOCALE · SENZA CLOUD'):
      s.syncStatus==='synchronized'?('☁ SINCRONIZZATO'):s.syncStatus==='error'?('☁ SYNC NON DISPONIBILE'):s.pending?`☁ ${'IN ATTESA'} (${s.pending})`:('☁ IN ATTESA'));
    const count=dex.counts();text('dex-counts',`${'VISTI'} ${count.seen}/151 · ${'CATTURATI'} ${count.caught}/151`);
    text('dex-sidebar-count',`${count.caught} / 151`);
    if(s.lastError)el('dex-cloud-status')?.setAttribute('title',s.lastError);
  }
  function open(){
    const game=root.game;if(!game)return;
    const menu=!el('main-menu-overlay')?.classList.contains('hidden');
    if(!menu&&(game.isLocked||game.battleBusy||game.dialogueResolve||game.pendingItemTarget||game.isRaidActive))return;
    if(!el('overlay-battle')?.classList.contains('hidden')||!el('login-gate')?.classList.contains('hidden'))return;
    game.closePartyActions?.();game.closePokemonInfo?.();game.closeBadgeCase?.();game.stopContinuousWalk?.();
    lastFocus=root.document.activeElement;
    el('pokedex-overlay')?.classList.remove('hidden');
    if(!dex.getSpecies(active)){const first=dex.entries().species[0];if(first)active=Number(first.species_id);}
    render();el('dex-search')?.focus();
  }
  function close(){el('pokedex-overlay')?.classList.add('hidden');lastFocus?.focus?.();showDiscovery();}
  function isOpen(){return !!el('pokedex-overlay')&&!el('pokedex-overlay').classList.contains('hidden');}
  function renderList(){
    const list=el('dex-species-list');if(!list)return;
    const q=el('dex-search')?.value.toLowerCase().trim()||'';
    const selected=el('dex-filter-status')?.value||'all';
    const type=el('dex-filter-type')?.value||'all';
    if(type!=='all')prefetchTypes().catch(()=>{});
    list.replaceChildren();
    for(let i=1;i<=151;i++){
      const row=dex.getSpecies(i),caught=!!row?.first_caught_at;
      if(selected==='caught'&&!caught||selected==='seen'&&!row||selected==='missing'&&row)continue;
      // Names and types never leak if this species has not been seen.
      const name=row?pretty(NAMES[i-1]):'?????';
      if(q&&!String(i).padStart(3,'0').includes(q)&&!name.toLowerCase().includes(q))continue;
      if(type!=='all'){
        if(!row)continue;
        const cached=detailsCache.get(i);
        if(!cached||!cached.types?.some(t=>t.type.name===type))continue;
      }
      const b=node('button','dex-list-entry'+(i===active?' active':'')+(caught?' caught':''));b.type='button';b.dataset.species=String(i);
      b.append(node('span','dex-list-number',String(i).padStart(3,'0')),node('span','dex-list-name',name),node('span','dex-list-state',row?(caught?'●':'◉'):'·'));
      b.setAttribute('aria-label',`#${i} ${name} ${row?(caught?L('caught'):L('seen')):L('unknown')}`);
      b.onclick=()=>{active=i;tab='scheda';render();};list.appendChild(b);
    }
  }
  async function loadInfo(id,serial){
    if(!dex.getSpecies(id))return;
    try{
      if(!detailsCache.has(id)){
        const request=root.game?.getPokemonData?root.game.getPokemonData(id):root.pokeApiRequest?.(`pokemon/${id}`);
        detailsCache.set(id,await request);
      }
      if(!speciesCache.has(id))speciesCache.set(id,await root.pokeApiRequest(`pokemon-species/${id}`));
      if(serial===requestId&&isOpen())renderDetail();
      if((el('dex-filter-type')?.value||'all')!=='all')renderList();
    }catch(error){console.warn('Pokédex metadata unavailable',id,error);}
  }
  function variantSprite(id,v){const meta=detailsCache.get(id);return meta?dex.spriteFor(meta,v.sex,v.shiny):`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;}
  function tabContent(id,record){
    const area=el('dex-tab-content');if(!area)return;area.replaceChildren();
    if(!record){area.append(node('p','dex-muted','Questo Pokémon non è ancora stato scoperto.'));return;}
    const meta=detailsCache.get(id),species=speciesCache.get(id),caught=!!record.first_caught_at;
    if(tab==='varianti'){
      const variants=dex.getVariants(id).sort((a,b)=>(Number(a.shiny)-Number(b.shiny))||a.sex.localeCompare(b.sex));
      if(!variants.length){area.append(node('p','dex-muted','Nessuna variante individuale registrata (checkpoint precedente).'));return;}
      const grid=node('div','dex-variants');
      for(const v of variants){
        const item=node('div','dex-variant');const img=node('img','dex-variant-img');img.src=variantSprite(id,v);img.alt='';img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src='assets/sprites/ui/pokemon-placeholder.svg';};
        item.append(img,node('strong','',`${L(v.sex)} · ${L(v.shiny?'shiny':'normal')}`),node('small','',v.first_caught_at?L('caught'):L('seen')));grid.append(item);
      }area.append(grid);return;
    }
    if(tab==='diario'){
      for(const [label,date,context] of [[L('seen'),record.first_seen_at,record.first_seen_context],[L('caught'),record.first_caught_at,record.first_caught_context]]){
        if(!date)continue;const card=node('div','dex-journal-item');card.append(node('strong','',label),node('small','',new Date(date).toLocaleString('it-IT')),
          node('p','',context||'—'));area.append(card);
      }return;
    }
    if(tab==='habitat'){
      const habitat=species?.habitat?.name||null;
      const habitatIt={cave:'Grotta',forest:'Foresta',grassland:'Prateria',mountain:'Montagna',rare:'Raro',roughTerrain:'Terreno roccioso','rough-terrain':'Terreno roccioso',sea:'Mare',urban:'Città',watersEdge:'Riva','waters-edge':'Riva'};
      area.append(node('h3','',L('habitat')));
      area.append(node('p','',habitat?(habitatIt[habitat]||'Non specificato'):'Habitat non disponibile nei dati PokéAPI.'));
      if(record.first_seen_context)area.append(node('p','dex-muted',('Primo incontro: ')+record.first_seen_context));
      area.append(node('p','dex-muted','Non vengono mostrate località non ancora scoperte.'));return;
    }
    if(!meta){area.append(node('p','dex-muted','Caricamento dati Pokémon…'));return;}
    const facts=node('div','dex-facts');
    for(const [k,v] of [[L('height'),`${(meta.height||0)/10} m`],[L('weight'),`${(meta.weight||0)/10} kg`]]){
      const box=node('div');box.append(node('span','',k),node('strong','',v));facts.append(box);
    }area.append(facts);
    if(!caught){area.append(node('p','dex-muted','Cattura questa specie per sbloccare la scheda completa.'));return;}
    const language=locale();const flavors=species?.flavor_text_entries||[];
    const found=flavors.find(e=>e.language?.name===language);
    if(found)area.append(node('p','dex-flavor',String(found.flavor_text||'').replace(/[\n\f]+/g,' ').replace(/\s+/g,' ').trim()));
    const stats=node('div','dex-stat-list');for(const s of meta.stats||[]){const r=node('div');r.append(node('span','',pretty(s.stat.name)),node('strong','',s.base_stat));stats.append(r);}area.append(stats);
    // Only discovered family members are displayed: no undiscovered evolution spoilers.
    if(typeof KANTO_FAMILY_BY_ID!=='undefined'){
      const family=KANTO_FAMILY_BY_ID.get(id)||[];
      const unlocked=family.map(([number])=>number).filter(number=>dex.getSpecies(number));
      if(unlocked.length>1){
        area.append(node('h3','dex-evo-title','EVOLUZIONI SCOPERTE'));
        const line=node('div','dex-evolution-line');
        for(const number of unlocked){
          const button=node('button','dex-evo-entry',pretty(NAMES[number-1]));button.type='button';
          button.onclick=()=>{active=number;tab='scheda';render();};line.append(button);
        }area.append(line);
      }
    }
  }
  function renderDetail(){
    const id=active,row=dex.getSpecies(id),meta=detailsCache.get(id),variants=dex.getVariants(id);
    text('dex-detail-num','#'+String(id).padStart(3,'0'));
    text('dex-detail-name',row?pretty(NAMES[id-1]):'?????');
    text('dex-detail-state',row?(row.first_caught_at?L('caught'):L('seen')):L('unknown'));
    const img=el('dex-detail-sprite');if(img){img.hidden=!row;img.src=row?(variants.length?variantSprite(id,variants[0]):`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`):'';}
    const types=el('dex-detail-types');types?.replaceChildren();if(row&&meta&&types)for(const t of meta.types||[]){const typeName=String(t?.type?.name||'normal').toLowerCase();const c=node('span','dex-type type-'+typeName,T(typeName));types.append(c);}
    for(const b of root.document.querySelectorAll('[data-dex-tab]')){
      const on=b.dataset.dexTab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));
    }
    tabContent(id,row);
  }
  function render(){status();renderList();renderDetail();const serial=++requestId;if(dex.getSpecies(active))loadInfo(active,serial);}
  function init(){
    if(initialized||!el('pokedex-overlay'))return;initialized=true;
    el('btn-open-pokedex')?.addEventListener('click',open);
    el('btn-menu-pokedex')?.addEventListener('click',open);
    el('dex-close')?.addEventListener('click',close);
    el('pokedex-overlay')?.addEventListener('click',e=>{if(e.target===el('pokedex-overlay'))close();});
    el('dex-search')?.addEventListener('input',renderList);
    el('dex-filter-status')?.addEventListener('change',renderList);
    el('dex-filter-type')?.addEventListener('change',renderList);
    for(const b of root.document.querySelectorAll('[data-dex-tab]'))b.addEventListener('click',()=>{tab=b.dataset.dexTab;renderDetail();});
    root.document.addEventListener('keydown',e=>{
      if(!isOpen())return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
      else if(e.key==='Tab'){
        const focusables=[...el('pokedex-overlay').querySelectorAll('button:not(:disabled),input,select')].filter(n=>n.offsetParent!==null);
        if(!focusables.length)return;
        const first=focusables[0],last=focusables.at(-1);
        if(e.shiftKey&&root.document.activeElement===first){e.preventDefault();last.focus();}
        if(!e.shiftKey&&root.document.activeElement===last){e.preventDefault();first.focus();}
      }
    },true);
    root.addEventListener('pokex:dex-changed',()=>{status();if(isOpen())render();});
    root.addEventListener('pokex:dex-discovery',event=>{discoveries.push(event.detail);if(discoveries.length>8)discoveries.shift();showDiscovery();});
    root.addEventListener('pokex:dex-battle-ended',()=>setTimeout(showDiscovery,400));
    status();
  }
  if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init);
  else init();
  root.PokexDexUI=Object.freeze({open,close,isOpen,render});
})(typeof window!=='undefined'?window:globalThis);
