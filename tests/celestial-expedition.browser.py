"""Celestial Expedition v1.5: live DOM + script flows, no network or Discord.
Run: python tests/celestial-expedition.browser.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js','engine.js',
         'battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def make_game(page):
    page.evaluate('''() => {
      window.game=new GameEngine();
      game.$id('pokex-extraction-warning')?.setAttribute('hidden','');
      game.$id('main-menu-overlay')?.classList.add('hidden');
      game.$id('login-gate')?.classList.add('hidden');
      game.floor=75;game.badges=[0,1,2,3,4,5,6];game.runId='test-celestial';game.wait=async()=>{};
      game.celestialFadeTo=async (fn)=>{await fn();};
      game.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'town-ground',entity:null,decoration:null,revealed:true})));
      game.playerPos={x:5,y:6};
      game.gridMap[3][5].entity='npc';game.gridMap[3][5].specialRole='celestial-oak';
      const meta=(id)=>({id,name:'Test'+id,gender:'male',isShiny:id===1,types:[{type:{name:'normal'}}],stats:[],sprites:{front_default:'assets/sprites/ui/pokemon-placeholder.svg'},abilities:[{ability:{name:'run-away'},is_hidden:false}]});
      window.syntheticMon=meta;
      game.team=[1,2,3,4,5,6].map(id=>new Pokemon(meta(id),45));game.activeMon=game.team[0];
      game.isLocked=false;game.renderDungeon=()=>{};game.renderSidebar=()=>{};
    }''')

def check(browser,width,height):
    page=browser.new_page(viewport={'width':width,'height':height});errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.route('**/*',lambda route:route.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
    page.add_style_tag(content=css)
    for name in SCRIPTS:page.add_script_tag(content=(BASE/'js'/name).read_text())
    make_game(page)
    # Selection: 2 expedition members and exactly 4 at the village.
    assert page.evaluate('game.openCelestialTeamSelection()') is True
    assert page.evaluate('game.$id("celestial-team-confirm").disabled') is True
    page.keyboard.press('Space')
    assert page.evaluate('game.celestialRosterSelection.size')==1
    page.keyboard.press('ArrowDown');page.keyboard.press('Space')
    assert page.evaluate('game.celestialRosterSelection.size')==2
    assert page.evaluate('game.$id("celestial-team-confirm").disabled') is False
    page.evaluate('game.$id("celestial-team-confirm").click()')
    page.wait_for_function('game.isCelestialCave && !game.celestialExpeditionBusy')
    assert page.evaluate('game.team.length')==2
    assert page.evaluate('game.celestialReserve.length')==4
    assert page.evaluate('game.team.map(p=>p.id).join(",")')=='1,2'
    # Fainting one member does not lose it permanently if the expedition survives.
    page.evaluate('''() => {game.isLocked=false;game.$id('celestial-dialog').classList.add('hidden');
      game.team[0].currentHp=0;game.activeMon=game.team[0];game.enemyMon={currentHp:1};
      game.battleText=async()=>{};game.updateBattleHUD=()=>{};game.showTeamMenu=()=>{};}''')
    page.evaluate('game.onPlayerFainted()')
    assert page.evaluate('game.team.length')==2
    assert page.evaluate('game.isCelestialCave') is True
    # All selected Pokémon defeated -> all deleted, reserve kept, village checkpoint saved.
    page.evaluate('game.team[1].currentHp=0;game.activeMon=game.team[1];game.onPlayerFainted()')
    assert page.evaluate('game.isCelestialCave') is False
    assert page.evaluate('game.team.map(p=>p.id).join(",")')=='3,4,5,6'
    assert page.evaluate('game.$id("gameover-overlay").classList.contains("hidden")') is True
    saved=page.evaluate('window.PokexCheckpoints.load()')
    assert saved is not None, 'Defeat must write a durable checkpoint'
    assert [mon['id'] for mon in saved['game']['team']]==[3,4,5,6]
    assert saved['game']['laboratoryPokemon']==[]
    # Second run, victory/capture: 4 reserve + 2 participants + Mewtwo -> forced deposit.
    make_game(page)
    page.evaluate('''async () => {
      game.openCelestialTeamSelection();game.celestialRosterSelection=new Set([0,1]);
      await game.confirmCelestialTeam();game.$id('celestial-dialog').classList.add('hidden');
      game.team.push(new Pokemon(syntheticMon(150),50));game.celestialPhase='complete';
    }''')
    page.evaluate('game.finishCelestialReturn()')
    page.wait_for_function('!game.isCelestialCave && game.celestialDepositRequired')
    assert page.evaluate('game.team.length')==7
    assert page.evaluate('game.$id("oak-laboratory").classList.contains("hidden")') is False
    assert page.evaluate('game.$id("oak-lab-close").classList.contains("hidden")') is True
    page.evaluate('game.$id("oak-lab-options").querySelectorAll("button")[4].focus()')
    page.keyboard.press('Space')
    assert page.evaluate('game.team.length')==6
    assert page.evaluate('game.laboratoryPokemon.length')==1
    assert page.evaluate('game.celestialDepositRequired') is False
    assert page.evaluate('game.$id("oak-laboratory").classList.contains("hidden")') is True
    snap=page.evaluate('window.PokexCheckpoints.load()')
    assert snap is not None and len(snap['game']['team'])==6 and len(snap['game']['laboratoryPokemon'])==1
    # Restoring the game preserves both party and lab Pokémon as functioning instances.
    page.evaluate('window.PokexCheckpoints.restore(game, window.PokexCheckpoints.load())')
    assert page.evaluate('game.laboratoryPokemon.length')==1
    assert page.evaluate('game.laboratoryPokemon[0] instanceof Pokemon') is True
    assert page.evaluate('game.laboratoryPokemon[0].isShiny') is True
    # Lab retrieval at village restores the Pokémon if there is room.
    page.evaluate('''() => {game.team.pop();game.isLocked=false;game.openOakLaboratory();}''')
    assert page.evaluate('game.$id("oak-lab-options").querySelectorAll("button").length')>=1
    assert page.evaluate('game.withdrawOakPokemon(0)') is True
    assert page.evaluate('game.team.length')==6
    assert page.evaluate('game.laboratoryPokemon.length')==0
    # Lone Pokémon cannot be sent to die, since no reserve would remain.
    make_game(page)
    page.evaluate('''() => {game.team=[game.team[0]];game.openCelestialTeamSelection();}''')
    assert page.evaluate('game.$id("celestial-team-confirm").disabled') is True
    # Mewtwo KO without capture does not mark story complete.
    page.evaluate('''() => {
      game.isCelestialCave=true;game.celestialPhase='rematch';
      game.endBattle=(text)=>{window.mewtwoKoMessage=text;};
      game.showDiscoveryNotice=()=>{};
      game.handleBattleVictory=GameEngine.prototype.handleBattleVictory;
      game.enemyMon=game.team[0];game.enemyMon.currentHp=0;
      game.battleParticipants=new Set();game.battleType='mewtwo';
    }''')
    page.evaluate('game.handleBattleVictory()')
    assert page.evaluate('game.celestialPhase')=='rematch'
    assert 'catturarlo' in page.evaluate('window.mewtwoKoMessage')
    assert not errors,errors
    page.close()
    print(f'PASS expedition selection/wipe/forced-lab/checkpoint/recovery {width}x{height}')

if __name__=='__main__':
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
      for width,height in [(1440,900),(390,844)]:check(browser,width,height)
    finally:browser.close()
