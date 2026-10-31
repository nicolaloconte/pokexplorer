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
