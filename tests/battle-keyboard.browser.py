"""Browser integration for keyboard-only battles and continuous gym/raid encounters.
Run: python tests/battle-keyboard.browser.py (requires playwright and Chromium).
No Discord credentials or public API requests needed: battle data are local test fixtures.
"""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js','engine.js',
         'battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def test_viewport(browser,width,height):
    page=browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/*', lambda route: route.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=(BASE/'style.css').read_text()
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',css,count=1)
    page.add_style_tag(content=css)
    for script in SCRIPTS:page.add_script_tag(content=(BASE/'js'/script).read_text())
    page.evaluate('window.game = new GameEngine();')
    page.evaluate('''() => {
      const data={id:1,name:'bulbasaur',gender:'male',isShiny:false,
       types:[{type:{name:'grass'}}],
       stats:[{stat:{name:'hp'},base_stat:45},{stat:{name:'attack'},base_stat:49},
              {stat:{name:'defense'},base_stat:49},{stat:{name:'special-attack'},base_stat:65},
              {stat:{name:'special-defense'},base_stat:65},{stat:{name:'speed'},base_stat:45}],
       abilities:[{ability:{name:'overgrow'}}],
       sprites:{front_default:'assets/ui/pokemon-placeholder.svg',back_default:'assets/ui/pokemon-placeholder.svg'}};
      window.testPokemonData=data;
      const a=new Pokemon(data,7),b=new Pokemon({...data,id:4,name:'charmander',types:[{type:{name:'fire'}}]},7);
      game.team=[a,b];game.activeMon=a;game.enemyMon=b;
      game.items.potion=3;game.items.pokeball=5;game.battleType='wild';
      game.battleBusy=false;game.isLocked=true;
      game.$id('main-menu-overlay').classList.add('hidden');
      game.$id('overlay-battle').classList.remove('hidden');
      game.$id('battle-controls').classList.remove('hidden');
      game.$id('rotom-body').classList.add('battle-active');
      game.showMainActions();
    }''')
    def press(key):
        page.keyboard.press(key)
    def state():
        return page.evaluate('''() => ({
          mode:game.battleMode,
          focus:document.activeElement?.id||document.activeElement?.getAttribute('class')||'',
          bagVisible:!game.$id('battle-close-bag').classList.contains('hidden'),
          teamVisible:!game.$id('battle-close-team').classList.contains('hidden'),
          target:game.pendingItemTarget,
          confirm:!game.$id('battle-confirm').classList.contains('hidden'),
          partyMenu:!game.$id('party-action-menu').classList.contains('hidden')
        })''')
    assert state()['focus']=='btn-act-fight',state()
    # Main menu -> bag via WASD and Space, then close via the context-only button.
    press('d');assert state()['focus']=='btn-act-bag',state()
    press('Space');assert state()['mode']=='bag' and state()['bagVisible'],state()
    if os.environ.get('POKEX_TEST_SHOTS')=='1':page.screenshot(path=f'/mnt/data/pokexplorer_110/bag_{width}.png')
    assert not state()['teamVisible']
    press('w');assert state()['focus']=='battle-close-bag',state()
    press('Space');assert state()['mode'] is None and not state()['bagVisible'],state()
    # Bag -> item -> target Pokémon -> cancel returns to BAG, not overworld.
    press('d');press('Space');press('s');assert state()['focus'].startswith('bag-item'),state()
    press('Space');assert state()['target']=='potion',state()
    press('w');assert state()['focus']=='item-target-cancel',state()
    press('Space');assert state()['mode']=='bag' and state()['target'] is None,state()
    press('Escape');assert state()['mode'] is None,state()
    # Choosing an item target with Space heals and consumes exactly one potion.
    page.evaluate('game.activeMon.currentHp=Math.max(1,game.activeMon.maxHp-10);game.enemyTurn=async()=>{game.battleBusy=false;game.showMainActions()};game.wait=async()=>{};')
    press('d');press('Space');press('s');press('Space')
    before=page.evaluate('game.items.potion')
    press('Space')
    page.wait_for_timeout(75)
    after=page.evaluate('game.items.potion')
    assert after==before-1,(before,after,state())
    assert state()['mode'] is None,state()
    # Bag Poké Ball requires native confirmation; cancellation is keyboard-only.
    press('d');press('Space');press('d');press('Space');press('s');press('Space')
    assert state()['confirm'],state()
    press('Escape');assert not state()['confirm'],state()
    press('Escape');assert state()['mode'] is None,state()
    # Team -> close button, and Team -> Pokémon action drawer -> Escape.
    press('s');press('Space');assert state()['mode']=='team' and state()['teamVisible'],state()
    if os.environ.get('POKEX_TEST_SHOTS')=='1':page.screenshot(path=f'/mnt/data/pokexplorer_110/team_{width}.png')
    press('w');assert state()['focus']=='battle-close-team',state()
    press('Space');assert state()['mode'] is None,state()
    press('s');press('Space');press('Space');assert state()['partyMenu'],state()
    press('Escape');assert not state()['partyMenu'],state()
    press('Escape');assert state()['mode'] is None,state()
    # 2x2 moves keyboard navigation, with the same click handler as mouse.
    page.evaluate("game.executeAttack=(move)=>{window.testAttack=move?.name||'attack'}")
    press('Space');assert state()['mode']=='moves',state()
    press('w');assert state()['focus']=='btn-move-back',state()
    press('Space');assert state()['mode'] is None,state()
    press('Space');assert state()['mode']=='moves',state()
    press('Space');assert page.evaluate('!!window.testAttack')
    press('Escape');assert state()['mode'] is None,state()
    # Gym/raid disabled FUGA cannot be activated or trap keyboard focus.
    page.evaluate("game.battleType='gym';game.showMainActions()")
    press('d');press('s');assert state()['focus']!='btn-act-run',state()
    press('Escape')
    # Native confirmation can be executed by Space.
    page.evaluate("game.askBattleConfirmation('Confermi?',()=>{window.testConfirm=true})")
    press('Space');assert page.evaluate('window.testConfirm===true'),state()
    # The arena must stay present and player sprite must not be hidden on chained rounds.
    continuous=page.evaluate('''async () => {
      game.battleBusy=true;
      const overlay=game.$id('overlay-battle');
      overlay.classList.remove('battle-preparing','battle-revealing');
      game.$id('player-sprite').classList.remove('hidden');
      game.getEncounterPool=()=>[1];game.getPokemonData=async()=>window.testPokemonData;
      game.battleText=async()=>{};game.prepareBattleImage=async()=>true;
      game.prepareBattleStageImages=async()=>true;game.summonPokemon=async()=>{};
      game.animateBall=async()=>{};game.triggerEntryAbilities=()=>{};
      let reveal=false,preparing=false;
      const oldReveal=game.revealPreparedBattle;
      game.revealPreparedBattle=()=>{reveal=true};
      const originalAdd=overlay.classList.add.bind(overlay.classList);
      overlay.classList.add=(...names)=>{if(names.includes('battle-preparing'))preparing=true;return originalAdd(...names)};
      try{await game.startBattle('gym',true)}finally{
        overlay.classList.add=originalAdd;game.revealPreparedBattle=oldReveal;
      }
      return {preparing,reveal,playerVisible:!game.$id('player-sprite').classList.contains('hidden'),
              overlayVisible:!overlay.classList.contains('hidden')};
    }''')
    assert continuous=={'preparing':False,'reveal':False,'playerVisible':True,'overlayVisible':True},continuous
    # All gym transitions, including the leader start, must keep the battle arena.
    transitions=page.evaluate('''async () => {
      const calls=[];game.startBattle=(type,keep)=>{calls.push([type,keep]);return Promise.resolve()};
      game.battleText=async()=>{};game.currentGym=KANTO_GYMS[0];game.gymBadgeName=game.currentGym.badge;
      game.gymQueue=['trainer1','trainer2','trainer3','leader'];
      await game.advanceGymAfterVictory();
      await game.advanceGymAfterVictory();
      await game.advanceGymAfterVictory();
      const leaderIntro= !game.$id('gym-leader-intro').classList.contains('hidden');
      const overlayStayed=!game.$id('overlay-battle').classList.contains('hidden');
      game.$id('btn-start-gym-leader').click();
      game.gymQueue=['leader'];game.gymLeaderIndex=0;
      await game.advanceGymAfterVictory();
      return {calls,leaderIntro,overlayStayed};
    }''')
    assert transitions['leaderIntro'] and transitions['overlayStayed'],transitions
    assert len(transitions['calls'])==4 and all(c==['gym',True] for c in transitions['calls']),transitions
    # Each raid round should request a continuous next opponent; no extra endBattle.
    raid=page.evaluate('''async () => {
      const calls=[];game.startBattle=(type,keep)=>{calls.push([type,keep]);return Promise.resolve()};
      game.battleType='wild';game.isRaidActive=true;game.raidQueueCount=5;game.battleToken=900;
      game.battleParticipants=new Set();game.hasExpShare=()=>false;
      game.enemyMon=new Pokemon(window.testPokemonData,7);
      game.battleText=async()=>{};game.awardBattleExperience=async()=>{};
      await game.handleBattleVictory();
      return {calls,remaining:game.raidQueueCount};
    }''')
    assert raid=={'calls':[['wild',True]],'remaining':4},raid
    assert not errors,errors
    page.close()
    return f'{width}x{height}: PASS'

if __name__=='__main__':
    with sync_playwright() as playwright:
        chromium_path=os.environ.get('POKEX_CHROMIUM','/usr/bin/chromium')
        browser=playwright.chromium.launch(executable_path=chromium_path,headless=True,args=['--no-sandbox'])
        try:
            for width,height in [(1460,900),(390,844)]:print(test_viewport(browser,width,height))
        finally:browser.close()
