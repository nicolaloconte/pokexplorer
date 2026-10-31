"""Beta 1.6 browser smoke: mission UI, keyboard, Champion, Mewtwo KO, irreversible Oak deposit.
Static HTML, mocked game services; run: python tests/release16.browser.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','pokedex-core.js','objectives-core.js','objectives-ui.js',
 'pokemon.js','abilities.js','engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']
def check(browser,width,height):
 page=browser.new_page(viewport={'width':width,'height':height});errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.route('**/*',lambda route:route.abort())
 html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
 html=re.sub(r'<link\s+[^>]*>','',html)
 page.set_content(html,wait_until='domcontentloaded')
 css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
 page.add_style_tag(content=css)
 for script in SCRIPTS:page.add_script_tag(content=(BASE/'js'/script).read_text())
 page.evaluate("""() => {
  PokexObjectives.setOwner('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  PokexDex.setOwner('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  window.game=new GameEngine();
  document.querySelector('#pokex-extraction-warning')?.setAttribute('hidden','');
  document.querySelector('#login-gate')?.classList.add('hidden');
 }""")
 assert page.locator('#btn-oak-lab').count()==0
 page.locator('#btn-view-progress').click()
 assert page.locator('#objectives-overlay').is_visible()
 assert page.locator('.objective-entry').count()==17
 assert page.locator('#objectives-runs').inner_text()=='0'
 assert page.locator('.objective-entry-art.locked').count()==17
 page.keyboard.press('Escape')
 assert page.locator('#objectives-overlay').is_hidden()
 # run + shiny + legend events update counters without artificial history
 page.evaluate("""() => {
  PokexObjectives.record('run_start','actual-1');
  PokexObjectives.record('catch','actual-1',{species:25,shiny:true});
  PokexObjectives.record('catch','actual-1',{species:144,shiny:true});
  PokexObjectives.record('run_win','actual-1',{solo:true});
  game.updateChampionChoice();
 }""")
 assert page.locator('#choose-champion').is_enabled()
 assert page.evaluate("game.selectPlayerGender('champion')") is True
 assert page.evaluate('game.playerGender')=='champion'
 page.locator('#btn-view-progress').click()
 assert page.locator('#objectives-catches').inner_text()=='2'
 assert page.locator('#objectives-wins').inner_text()=='1'
 assert page.locator('.objective-entry.done').count()>=4
 page.keyboard.press('Escape')
 # second KO must mark complete and remove Mewtwo, then trigger exit automatically.
 page.evaluate("""() => {
  game.isCelestialCave=true;game.celestialPhase='rematch';game.battleType='mewtwo';
  game.gridMap=Array.from({length:10},()=>Array.from({length:10},()=>({entity:null})));
  game.gridMap[4][5].entity='mewtwo';
  game.team=[];game.activeMon=null;game.battleParticipants=new Set();
  game.enemyMon={name:'MEWTWO',id:150,evYield:{},baseExperience:100,level:50,currentHp:0};
  game.battleText=async()=>{};game.endBattle=(text)=>{window.koMessage=text;};
  game.showDiscoveryNotice=()=>{};game.gameDelay=()=>1;
  game.leaveCelestialCave=()=>{window.exitedCave=true;return true;};
 }""")
 page.evaluate('game.handleBattleVictory()')
 page.wait_for_timeout(35)
 assert page.evaluate('game.celestialPhase')=='complete'
 assert page.evaluate('game.celestialMewtwoCaptured') is False
 assert page.evaluate('game.gridMap[4][5].entity') is None
 assert page.evaluate('window.exitedCave') is True
 # Forced 7 -> choose one permanently. No withdrawal route.
 page.evaluate("""() => {
  game.isCelestialCave=false;game.battleType=null;game.isLocked=false;game.floor=75;
  game.isTownFloor=()=>true;game.isBattleVisible=()=>false;
  game.team=Array.from({length:7},(_,i)=>({name:'POKEMON '+i,level:50,spriteFront:'',currentHp:30}));
  game.laboratoryPokemon=[];game.renderSidebar=()=>{};game.saveCheckpoint=()=>true;
 }""")
 assert page.evaluate('game.openOakLaboratory(true)') is True
 assert page.locator('#oak-laboratory').is_visible()
 assert page.locator('#oak-lab-options button').count()==7
 assert page.evaluate('game.depositOakPokemon(0)') is True
 assert page.evaluate('game.team.length')==6
 assert page.evaluate('game.laboratoryPokemon.length')==1
 assert page.evaluate('game.withdrawOakPokemon(0)') is False
 assert page.evaluate('game.openOakLaboratory(false)') is False
 assert page.locator('#oak-laboratory').is_hidden()
 assert not errors,errors
 page.close();print(f'OK: Beta 1.6 · {width}x{height}')
if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   for wh in [(1440,900),(390,844)]:check(browser,*wh)
  finally:browser.close()
