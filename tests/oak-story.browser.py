"""Oak's floor 75 / Celestial Cave story regression on desktop and mobile.
Uses stubbed external services; it does not contact Discord or PokéAPI.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js','engine.js',
         'battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def check(browser,width,height):
    page=browser.new_page(viewport={'width':width,'height':height})
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.route('**/*',lambda route:route.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
    page.add_style_tag(content=css)
    for name in SCRIPTS: page.add_script_tag(content=(BASE/'js'/name).read_text())
    page.evaluate('''() => {
      window.game=new GameEngine();
      game.$id('pokex-extraction-warning')?.setAttribute('hidden','');
      game.$id('main-menu-overlay')?.classList.add('hidden');
      game.$id('login-gate')?.classList.add('hidden');
      game.floor=75;game.isLocked=false;game.wait=async()=>{};
      game.team=Array.from({length:3},(_,i)=>({name:'Squadra '+i,level:40,currentHp:50,maxHp:50,spriteFront:'assets/sprites/ui/pokemon-placeholder.svg'}));
      game.renderSidebar=()=>{};game.renderDungeon=()=>{};
      game.saveCheckpoint=()=>{window.saved=(window.saved||0)+1;};
      game.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'town-ground',entity:null,decoration:null})));
      window.entered=0;
      game.enterCelestialCave=()=>{window.entered++;};
      game.showOakIntroduction();
    }''')
    assert page.evaluate('game.celestialDialogStep')=='intro-one'
    assert page.evaluate('game.$id("celestial-dialog-chapter").textContent')=='PIANO 75 · IL RICHIAMO'
    for expect in ['intro-two','intro-three','intro-four','question']:
        page.keyboard.press('Space')
        assert page.evaluate('game.celestialDialogStep')==expect,(expect,page.evaluate('game.celestialDialogStep'))
    # Keyboard-only refusal: D selects NO then Space activates it.
    page.keyboard.press('KeyD')
    assert page.evaluate('document.activeElement?.id')=='celestial-dialog-no'
    page.keyboard.press('Space')
    assert page.evaluate('window.entered')==0
    assert page.evaluate('game.oakEventDismissed') is False
    assert page.evaluate('game.isLocked') is False
    # Retry and accept with Space.
    page.evaluate('game.showOakIntroduction()')
    for expect in ['intro-two','intro-three','intro-four','question']:
        page.keyboard.press('Space')
        assert page.evaluate('game.celestialDialogStep')==expect
    page.keyboard.press('Space')
    assert page.evaluate('game.$id("celestial-expedition").classList.contains("hidden")') is False
    page.keyboard.press('Space') # toggle the first monster in selection
    assert page.evaluate('game.celestialRosterSelection.size')==1
    page.evaluate('game.$id("celestial-team-confirm").click()')
    page.wait_for_function('window.entered===1')
    assert page.evaluate('game.celestialReserve.length')==2
    assert page.evaluate('game.team.length')==1
    assert page.evaluate('game.oakEventDismissed') is True
    # Reenter through the actual, unmocked cave geometry/transition.
    page.evaluate('''() => {
      game.enterCelestialCave=GameEngine.prototype.enterCelestialCave;
      game.celestialFadeTo=async (fn)=>{await fn();};
      game.isLocked=false;game.oakEventDismissed=false;game.celestialPhase='unvisited';
      game.$id('celestial-dialog')?.classList.add('hidden');
    }''')
    page.evaluate('game.enterCelestialCave()')
    page.wait_for_function('game.isCelestialCave && game.celestialDialogStep === "arrival-one"')
    assert page.evaluate('game.gridMap[4][5].entity')=='mewtwo'
    assert page.evaluate('game.gridMap[7][4].specialRole')=='cave-oak'
    assert page.evaluate('game.gridMap[7][4].npcSprite.endsWith("oak-frlg-down.png")')
    for step in ['arrival-two','arrival-three']:
        page.keyboard.press('Space');assert page.evaluate('game.celestialDialogStep')==step
    page.keyboard.press('Space');assert page.evaluate('game.isLocked') is False
    # The actual reward stages preserve item semantics.
    page.evaluate('''() => {
      game.items.masterball=0;
      game.grantItem=(name)=>{if(name==='masterball'){game.items.masterball++;return true;}return false;};
      game.showOakMasterBallReward();
    }''')
    assert page.evaluate('game.celestialDialogStep')=='reward-one'
    assert page.evaluate('game.items.masterball')==1
    for step in ['reward-two','reward-three']:
        page.keyboard.press('Space');assert page.evaluate('game.celestialDialogStep')==step
    page.keyboard.press('Space');assert page.evaluate('game.isLocked') is False
    # End of cave: epilogue happens before any teleport.
    page.evaluate("game.celestialPhase='complete'")
    assert page.evaluate('game.leaveCelestialCave()') is True
    assert page.evaluate('game.isCelestialCave') is True
    page.keyboard.press('Space');assert page.evaluate('game.celestialDialogStep')=='farewell-two'
    page.keyboard.press('Space')
    page.wait_for_function('!game.isCelestialCave && game.celestialReturnState === null')
    assert page.evaluate('game.floor')==75
    assert page.evaluate('window.saved')==1
    assert not errors,errors
    page.close();print(f'OK oak cinematic + refusal + cave + reward + epilogue {width}x{height}')

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        try:
            for width,height in [(1440,900),(390,844)]:check(browser,width,height)
        finally:browser.close()
