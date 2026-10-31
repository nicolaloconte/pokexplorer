"""Beta 1.8: in-game confirmation and manual save in the quick menu.
Run: python tests/release18.browser.py
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','pokedex-core.js','objectives-core.js','objectives-ui.js','pokemon.js','abilities.js','engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def test(browser,w,h):
 page=browser.new_page(viewport={'width':w,'height':h});errors=[];native=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(native.append(d.message),d.dismiss()))
 page.route('**/*',lambda r:r.abort())
 html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
 html=re.sub(r'<link\s+[^>]*>','',html)
 page.set_content(html,wait_until='domcontentloaded')
 css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
 page.add_style_tag(content=css)
 for script in SCRIPTS:page.add_script_tag(content=(BASE/'js'/script).read_text())
 page.evaluate("""() => { window.game=new GameEngine();document.querySelector('#pokex-extraction-warning')?.setAttribute('hidden','');document.querySelector('#login-gate')?.classList.add('hidden');} """)
 assert page.locator('#save-game-quick').is_hidden()
 assert page.locator('#return-main-menu-quick').is_hidden()
 # start adventure with synthetic but valid state to reach the manual save
 page.evaluate("""() => {game.$id('main-menu-overlay').classList.add('hidden');game.team=[{id:25,name:'PIKACHU'}];game.gridMap=Array.from({length:10},()=>Array.from({length:10},()=>({entity:null})));game.playerPos={x:1,y:1};game.saveCheckpoint=()=>{window.manualSaveCalls=(window.manualSaveCalls||0)+1;return true};game.renderSidebar=()=>{};game.renderBadges=()=>{};game.updateContinueButton=()=>{};game.isLocked=false;game.battleBusy=false;game.isRaidActive=false;game.battleMode=null;game.isCelestialCave=false; game.runId='test-run';} """)
 # manual save must be visible during a run
 page.locator('#quick-settings-toggle').click()
 assert page.locator('#save-game-quick').is_visible()
 assert page.locator('#return-main-menu-quick').is_visible()
 page.locator('#save-game-quick').click()
 assert page.evaluate('window.manualSaveCalls')==1
 assert 'salvata' in page.locator('#save-game-quick-status').inner_text().lower()
 # cave and battle never create a save
 page.evaluate('game.isCelestialCave=true')
 page.locator('#save-game-quick').click()
 assert page.evaluate('window.manualSaveCalls')==1
 assert 'grotta celeste' in page.locator('#save-game-quick-status').inner_text().lower()
 page.evaluate('game.isCelestialCave=false;game.battleBusy=true')
 page.locator('#save-game-quick').click()
 assert page.evaluate('window.manualSaveCalls')==1
 assert 'battaglia' in page.locator('#save-game-quick-status').inner_text().lower()
 page.evaluate('game.battleBusy=false')
 # Cancel custom return prompt, also with Escape
 page.locator('#return-main-menu-quick').click()
 assert page.locator('#pokex-confirm-overlay').is_visible()
 assert page.locator('#pokex-confirm-title').inner_text()=='SEI SICURO DI VOLER TORNARE AL MENU?'
 assert 'non salvati' in page.locator('#pokex-confirm-message').inner_text().lower()
 page.keyboard.press('Escape')
 assert page.locator('#pokex-confirm-overlay').is_hidden()
 assert page.locator('#main-menu-overlay').is_hidden()
 page.locator('#quick-settings-toggle').click()
 page.locator('#return-main-menu-quick').click()
 page.locator('#pokex-confirm-cancel').click()
 assert page.locator('#main-menu-overlay').is_hidden()
 page.locator('#quick-settings-toggle').click()
 page.locator('#return-main-menu-quick').click()
 page.locator('#pokex-confirm-accept').click()
 assert page.locator('#main-menu-overlay').is_visible()
 assert page.evaluate('window.manualSaveCalls')==1,'Returning to menu must never auto-save'
 assert page.locator('#save-game-quick').is_hidden()
 # Real checkpoint: safe manual save must store a valid snapshot and retain it
 # when returning without saving a newer position.
 page.evaluate("""() => {
  PokexCheckpoints.setGuestMode(false);PokexCheckpoints.setUser('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  game.$id('main-menu-overlay').classList.add('hidden');game.syncQuickMenuState();
  game.floor=5;game.money=900;game.playerPos={x:2,y:3};game.runId='manual-actual';
  game.team=[{id:25,name:'PIKACHU',level:10,currentHp:35,maxHp:35,moves:[]}];
  game.activeMon=game.team[0];game.gridMap=Array.from({length:10},()=>Array.from({length:10},()=>({entity:null})));
  game.isLocked=false;game.battleBusy=false;game.isRaidActive=false;game.battleMode=null;
  game.isCelestialCave=false;game.adventureCompleted=false;
  game.saveCheckpoint=GameEngine.prototype.saveCheckpoint.bind(game);
 }""")
 page.locator('#quick-settings-toggle').click()
 page.locator('#save-game-quick').click()
 assert 'salvata' in page.locator('#save-game-quick-status').inner_text().lower()
 assert page.evaluate('PokexCheckpoints.load().game.playerPos.x')==2
 page.evaluate('game.playerPos.x=8')
 page.locator('#return-main-menu-quick').click()
 page.locator('#pokex-confirm-accept').click()
 assert page.evaluate('PokexCheckpoints.load().game.playerPos.x')==2
 # Guest button must not overwrite a logged-in account's existing checkpoint.
 page.evaluate("""() => {
  game.$id('main-menu-overlay').classList.add('hidden'); game.syncQuickMenuState();
  PokexCheckpoints.setGuestMode(true);
 }""")
 page.locator('#quick-settings-toggle').click()
 page.locator('#save-game-quick').click()
 assert 'discord' in page.locator('#save-game-quick-status').inner_text().lower()
 page.evaluate("""() => {PokexCheckpoints.setGuestMode(false);PokexCheckpoints.setUser('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');}""")
 assert page.evaluate('PokexCheckpoints.load().game.playerPos.x')==2
 assert native==[],f'Unexpected browser dialog: {native}'
 assert not errors,errors
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
 page.close();print(f'OK beta1.8 {w}x{h}')

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   for w,h in [(1440,900),(390,844)]:test(browser,w,h)
  finally:browser.close()
