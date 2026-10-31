/* Pokéxplorer 1.1 — complete battle keyboard controls (WASD / arrows, Space, Esc).
 * Routed before overworld movement, without synthetic directional walking.
 * Uses native .click() so keyboard and mouse share game logic.
 */
(function(){
  'use strict';
  const directions={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
  const visible=el=>!!el && el.isConnected && !el.disabled && !el.closest('.hidden') &&
    getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden';
  const choices=(root,selector)=>root?[...root.querySelectorAll(selector)].filter(visible):[];
  const first=(root,selector)=>choices(root,selector)[0]||null;
  const focus=el=>{if(el){el.focus({preventScroll:true});el.scrollIntoView?.({block:'nearest',inline:'nearest'});}return el;};
  GameEngine.prototype.focusBattleSelection=function(selector){
    if(!this.isBattleVisible()||!selector)return;
    focus(first(document,selector));
  };
  GameEngine.prototype.updateBattleWingCloseButtons=function(){
    const battle=this.isBattleVisible();
    this.$id('battle-close-bag')?.classList.toggle('hidden',!battle||this.battleMode!=='bag');
    this.$id('battle-close-team')?.classList.toggle('hidden',!battle||this.battleMode!=='team'||this.pendingForcedSwitch);
  };
  GameEngine.prototype.installBattleKeyboardNavigation=function(){
    if(this._battleKeyboardInstalled)return;
    this._battleKeyboardInstalled=true;
    const self=this;
    const get=id=>self.$id(id);
    const shown=id=>{const el=get(id);return el && !el.classList.contains('hidden');};
    const focusFrom=(items,dir,cols=1)=>{
      if(!items.length)return;
      const index=items.indexOf(document.activeElement);
      const step=(dir==='left'?-1:dir==='right'?1:dir==='up'?-cols:cols);
      const next=index<0?0:Math.max(0,Math.min(items.length-1,index+step));
      focus(items[next]);
    };
    const focusGrid=(parent,dir)=>{
      const buttons=choices(parent,'button:not(:disabled)');
      if(!buttons.length)return;
      const all=[...parent.querySelectorAll('button')].filter(visible);
      const current=all.indexOf(document.activeElement);
      const move=dir==='up'?-2:dir==='down'?2:dir==='left'?-1:1;
      if(current<0){focus(buttons[0]);return;}
      let next=Math.max(0,Math.min(all.length-1,current+move));
      const valid=buttons.includes(all[next]);
      if(!valid){
        // Disabled FUGA must never strand the selection.
        const toward=move>=0?1:-1;
        while(next>=0&&next<all.length&&!buttons.includes(all[next]))next+=toward;
        if(next<0||next>=all.length){next=current;while(next>=0&&next<all.length&&!buttons.includes(all[next]))next-=toward;}
      }
      focus(buttons.includes(all[next])?all[next]:buttons[0]);
    };
    const modalSelector='button:not(.hidden):not(:disabled)';
    window.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,textarea,select,[contenteditable]'))return;
      const modalNames=['team-full-overlay','raid-api-error','battle-confirm','learn-move-overlay','evolution-overlay','gym-leader-intro','evolution-choice-overlay'];
      const modal=modalNames.map(get).find(el=>el && !el.classList.contains('hidden'));
      const battle=self.isBattleVisible();
      if(!battle&&!modal)return;
      const dir=directions[String(event.key||'').toLowerCase()];
      const space=event.code==='Space'||event.key===' ';
      const back=event.key==='Escape'||event.key==='Backspace';
      if(!dir&&!space&&!back)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(modal){
        const buttons=choices(modal,modalSelector);
        if(dir)focusFrom(buttons,dir);
        else if(space&&!event.repeat){
          const active=buttons.includes(document.activeElement)?document.activeElement:buttons[0];
          active?.click();
        } else if(back){
          const cancel=buttons.find(el=>/cancel|back|no|discard/i.test(el.id||'')||/ANNULLA|CHIUDI|NO|INDIETRO/i.test(el.textContent||''));
          cancel?.click();
        }
        return;
      }
      if(self.dialogueResolve){if(space&&!event.repeat)self.acknowledgeDialogue();return;}
      if(self.battleBusy)return;
      if(shown('pokemon-info-overlay')){
        const buttons=choices(get('pokemon-info-overlay'),modalSelector);
        if(dir)focusFrom(buttons,dir);else if(space&&!event.repeat)(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();
        else if(back)get('pokemon-info-close')?.click();return;
      }
      if(shown('item-target-prompt')){
        const team=choices(get('team-grid'),'button:not(:disabled)');
        const mobile=choices(get('item-target-mobile-list'),'button:not(:disabled)');
        const cancel=get('item-target-cancel');
        if(dir){
          const targets=team.length?team:mobile;
          const active=document.activeElement;
          if(active===cancel)focus(targets[0]);
          else if(targets.length && ((dir==='up'&&active===targets[0])||(dir==='down'&&active===targets.at(-1))))focus(cancel);
          else focusFrom(targets,dir,dir==='left'||dir==='right'?1:2);
        }else if(back){cancel?.click();}
        else if(space&&!event.repeat){
          if(document.activeElement===cancel)cancel.click();
          else (team.includes(document.activeElement)?document.activeElement:team[0]||mobile[0]||cancel)?.click();
        }
        return;
      }
      if(shown('party-action-menu')){
        const buttons=choices(get('party-action-menu'),modalSelector);
        if(dir)focusFrom(buttons,dir);
        else if(back){get('party-close-action')?.click();focus(first(get('team-grid'),'button:not(:disabled)'));}
        else if(space&&!event.repeat)(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();
        return;
      }
      if(back){
        if(self.battleMode==='bag'||self.battleMode==='team'||self.battleMode==='moves'){
          if(!self.pendingForcedSwitch)self.showMainActions();
        }
        return;
      }
      if(self.pendingForcedSwitch||self.battleMode==='team'){
        const team=choices(get('team-grid'),'button:not(:disabled)');
        const close=get('battle-close-team');
        if(dir){
          if(visible(close)&&document.activeElement===close)focus(team[0]);
          else if(visible(close)&&team.length && ((dir==='up'&&document.activeElement===team[0])||(dir==='down'&&document.activeElement===team.at(-1))))focus(close);
          else focusFrom(team,dir,dir==='up'||dir==='down'?2:1);
        }else if(space&&!event.repeat){
          if(visible(close)&&document.activeElement===close)close.click();
          else (team.includes(document.activeElement)?document.activeElement:team[0])?.click();
        }
        return;
      }
      if(self.battleMode==='bag'){
        const tabs=choices(get('bag-tabs'),'button:not(:disabled)');
        const items=choices(get('bag-list'),'button:not(:disabled)');
        const close=get('battle-close-bag');
        const active=document.activeElement;
        if(dir){
          if(tabs.includes(active)){
            if(dir==='down')focus(items[0]||close);
            else if(dir==='up')focus(close);
            else focusFrom(tabs,dir);
          }else if(items.includes(active)){
            if(dir==='up'&&active===items[0])focus(tabs.find(t=>t.classList.contains('active'))||tabs[0]);
            else if(dir==='left'||dir==='right')focus(tabs.find(t=>t.classList.contains('active'))||tabs[0]);
            else if(dir==='down'&&active===items.at(-1))focus(close);
            else focusFrom(items,dir);
          }else if(active===close){
            if(dir==='up')focus(items.at(-1)||tabs[0]);else focus(tabs[0]);
          }else focus(tabs[0]);
        }else if(space&&!event.repeat){
          if(active===close)close.click();
          else if(tabs.includes(active)){
            const selected=active.dataset.bagTab;active.click();
            focus([...get('bag-tabs').querySelectorAll('button')].find(t=>t.dataset.bagTab===selected));
          }else if(items.includes(active))active.click();
          else focus(tabs[0]);
        }
        return;
      }
      if(self.battleMode==='moves'){
        const panel=get('panel-move-actions'),backButton=get('btn-move-back');
        const moves=choices(panel,'button:not(:disabled)');
        if(dir){
          if(document.activeElement===backButton)focus(moves[0]);
          else if(dir==='up'&&document.activeElement===moves[0])focus(backButton);
          else focusGrid(panel,dir);
        }else if(space&&!event.repeat){
          if(document.activeElement===backButton)backButton.click();
          else (moves.includes(document.activeElement)?document.activeElement:moves[0])?.click();
        }
        return;
      }
      // The main 2×2 command grid handles LOTTA, BORSA, POKÉMON, FUGA.
      const panel=get('panel-main-actions');
      if(dir)focusGrid(panel,dir);
      else if(space&&!event.repeat){const items=choices(panel,'button:not(:disabled)');(items.includes(document.activeElement)?document.activeElement:items[0])?.click();}
    },true);
  };
})();
