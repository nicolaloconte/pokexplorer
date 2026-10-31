/* Achievements presentation, independent of battle menus. */
(function(root){
  'use strict';const api=root.PokexObjectives;
  const el=id=>root.document.getElementById(id);let wasFocused=null;
  function render(){
    if(!api)return;const value=api.values();
    for(const [name,count] of [['runs',value.runs],['catches',value.catches],['wins',value.wins]]){
      const target=el('objectives-'+name);if(target)target.textContent=String(count);
    }
    const status=el('objectives-cloud');if(status)status.textContent=`REGISTRO: ${value.status.toUpperCase()}${value.pending?' · '+value.pending+' IN ATTESA':''}`;
    const list=el('objectives-quests');if(!list)return;
    list.replaceChildren();
    for(const q of value.quests){
      const card=root.document.createElement('article');card.className='objective-entry'+(q.complete?' done':'');
      const side=root.document.createElement('div');side.className='objective-entry-text';
      const title=root.document.createElement('strong');title.textContent=String(q.id).padStart(2,'0')+' · '+q.name;
      const desc=root.document.createElement('p');desc.textContent=q.description;
      const progress=root.document.createElement('small');progress.textContent=q.complete?'✓ COMPLETATO':`${q.progress} / ${q.goal}`;
      const img=root.document.createElement('img');img.className='objective-entry-art'+(q.complete?'':' locked');
      img.alt='';img.src=q.image;img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src='assets/sprites/items/pokeball-game.png';};
      side.append(title,desc,progress);card.append(side,img);list.append(card);
    }
    root.game?.updateChampionChoice?.();
  }
  function open(){const panel=el('objectives-overlay');if(!panel)return;
    wasFocused=root.document.activeElement;render();panel.classList.remove('hidden');el('objectives-close')?.focus();}
  function close(){el('objectives-overlay')?.classList.add('hidden');wasFocused?.focus?.();}
  function init(){
    el('objectives-close')?.addEventListener('click',close);
    el('objectives-bottom-close')?.addEventListener('click',close);
    el('objectives-overlay')?.addEventListener('click',e=>{if(e.target===el('objectives-overlay'))close();});
    root.document.addEventListener('keydown',event=>{
      if(el('objectives-overlay')?.classList.contains('hidden'))return;
      if(['Escape','Backspace'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();close();return;}
      if(event.key===' '||event.key==='Enter'){
        event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)root.document.activeElement?.click?.();
      }
    },true);
    root.addEventListener('pokex:objectives-changed',render);
  }
  if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init);else init();
  root.PokexObjectivesUI=Object.freeze({open,close,render});
})(typeof window!=='undefined'?window:globalThis);
