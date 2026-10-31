// Small, behavior-preserving engine helpers extracted from R2.21 RC2.1.
GameEngine.prototype.toggleQuickSettings = function() {
    const panel=this.$id('quick-settings-panel'),toggle=this.$id('quick-settings-toggle');
    if(!panel||!toggle)return;
    const opening=panel.classList.contains('hidden');
    panel.classList.toggle('hidden',!opening);
    toggle.setAttribute('aria-expanded',String(opening));
    toggle.setAttribute('aria-label',opening?'Chiudi opzioni':'Apri opzioni');
  };

GameEngine.prototype.closeQuickSettings = function() {
    this.$id('quick-settings-panel')?.classList.add('hidden');
    const toggle=this.$id('quick-settings-toggle');
    if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Apri opzioni');}
  };


/* Pokéxplorer modal confirmation — never use native browser dialogs. */
(function(root){
  'use strict';
  let pending=null;
  function elements(){return {
    overlay:document.getElementById('pokex-confirm-overlay'),
    title:document.getElementById('pokex-confirm-title'),
    message:document.getElementById('pokex-confirm-message'),
    accept:document.getElementById('pokex-confirm-accept'),
    cancel:document.getElementById('pokex-confirm-cancel')
  };}
  function close(value=false){
    if(!pending)return;
    const previous=pending;pending=null;
    const {overlay,accept,cancel}=elements();
    overlay?.classList.add('hidden');
    if(accept)accept.onclick=null;
    if(cancel)cancel.onclick=null;
    document.removeEventListener('keydown',onKeydown,true);
    try{
      const target=previous.focus?.isConnected && !previous.focus.closest('.hidden')
        ? previous.focus : document.getElementById('quick-settings-toggle');
      target?.focus?.();
    }catch(_){/* Removed node */}
    previous.resolve(Boolean(value));
  }
  function onKeydown(event){
    if(!pending)return;
    const {accept,cancel}=elements();
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(false);return;}
    if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      (event.key==='ArrowLeft'||event.key==='ArrowUp'?cancel:accept).focus();return;
    }
    if(event.key==='Tab'){
      const buttons=[cancel,accept].filter(button=>button && !button.classList.contains('hidden'));
      if(!buttons.length)return;
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    // Prevent background movement, battle shortcuts and dialogue advance.
    event.stopImmediatePropagation();
  }
  function show({title='CONFERMA',message='',accept='CONFERMA',cancel='ANNULLA',notice=false}={}){
    const el=elements();
    if(!el.overlay||!el.title||!el.message||!el.accept||!el.cancel)
      return Promise.resolve(false);
    if(pending)close(false);
    el.title.textContent=String(title);
    el.message.textContent=String(message);
    el.accept.textContent=String(accept);
    el.cancel.textContent=String(cancel);
    el.cancel.classList.toggle('hidden',Boolean(notice));
    el.overlay.classList.remove('hidden');
    const focus=document.activeElement;
    return new Promise(resolve=>{
      pending={resolve,focus};
      el.accept.onclick=()=>close(true);
      el.cancel.onclick=()=>close(false);
      el.overlay.onclick=event=>{if(event.target===el.overlay)close(false);};
      (notice?el.accept:el.cancel).focus();
    });
  }
  document.addEventListener('keydown',onKeydown,true);
  root.PokexDialogs=Object.freeze({confirm:show,alert:options=>show({...options,notice:true,accept:'CHIUDI'}),close});
})(typeof window!=='undefined'?window:globalThis);
