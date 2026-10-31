"""Beta 1.7 UI regression: developer shortcut, footer, return to main menu.
Run: python tests/release17.browser.py
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','pokedex-core.js','objectives-core.js','objectives-ui.js','pokemon.js','abilities.js','engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def test(browser,w,h):
 page=browser.new_page(viewport={'width':w,'height':h});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda r:r.abort())
 html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
 html=re.sub(r'<link\s+[^>]*>','',html)
 page.set_content(html,wait_until='domcontentloaded')
 css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
 page.add_style_tag(content=css)
 for script in SCRIPTS:page.add_script_tag(content=(BASE/'js'/script).read_text())
 page.evaluate("""() => { window.game=new GameEngine();document.querySelector('#pokex-extraction-warning')?.setAttribute('hidden','');document.querySelector('#login-gate')?.classList.add('hidden');} """)
 assert page.locator('#floor-jump-trigger').is_hidden()
 assert page.locator('#return-main-menu-quick').is_hidden()
 assert page.locator('.poke-credits-footer a').get_attribute('href')=='https://discord.gg/qNGscTEYHM'
 page.locator('#quick-settings-toggle').click()
 assert page.locator('#quick-settings-panel').is_visible()
 assert page.locator('#return-main-menu-quick').is_hidden()
 assert page.locator('#floor-jump-trigger').is_hidden()
 page.locator('#dev-mode-trigger').click()
 page.locator('#dev-access-code').fill('2103')
 page.locator('#dev-code-confirm').click()
 assert page.evaluate('game.devMode') is True
 assert page.locator('#floor-jump-trigger').is_visible()
 assert page.locator('#floor-jump-code').count()==0
 page.locator('#floor-jump-trigger').click()
 assert page.locator('#floor-jump-overlay').is_visible()
 page.locator('#floor-jump-level').fill('75')
 page.locator('#floor-jump-confirm').click()
 assert 'run' in page.locator('#floor-jump-error').inner_text().lower(), repr(page.locator('#floor-jump-error').inner_text())
 page.locator('#floor-jump-cancel').click()
 # A run started; no menu return on cancel, then return with safe checkpoint, keeping it.
 page.evaluate("""() => {game.$id('main-menu-overlay').classList.add('hidden');game.team=[{name:'PIKACHU',id:25}];game.gridMap=Array.from({length:10},()=>Array.from({length:10},()=>({entity:null})));game.generateFloorDungeon=()=>{window.teleported=game.floor;};game.isLocked=false;game.battleBusy=false;game.dialogueResolve=null;game.saveCheckpoint=()=>{window.checkpointCalls=(window.checkpointCalls||0)+1;return true}; game.renderSidebar=()=>{};game.renderBadges=()=>{};game.updateContinueButton=()=>{};}""")
 page.locator('#floor-jump-trigger').click()
 page.locator('#floor-jump-level').fill('37')
 page.locator('#floor-jump-confirm').click()
 assert page.evaluate('window.teleported')==37
 assert page.locator('#floor-jump-overlay').is_hidden()
 page.locator('#quick-settings-toggle').click()
 assert page.locator('#return-main-menu-quick').is_visible()
 page.locator('#return-main-menu-quick').click()
 assert page.locator('#pokex-confirm-overlay').is_visible()
 page.locator('#pokex-confirm-cancel').click()
 assert page.locator('#main-menu-overlay').is_hidden()
 page.locator('#quick-settings-toggle').click()
 page.locator('#return-main-menu-quick').click()
 page.locator('#pokex-confirm-accept').click()
 assert page.locator('#main-menu-overlay').is_visible()
 assert page.evaluate('window.checkpointCalls||0')==0
 assert page.locator('#return-main-menu-quick').is_hidden()
 assert page.locator('#floor-jump-trigger').is_visible() # Dev Mode remains session-scoped
 assert page.locator('#quick-settings-panel').is_hidden()
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
 assert not errors,errors
 page.close();print(f'OK beta1.7 {w}x{h}')

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   for w,h in [(1440,900),(390,844)]:test(browser,w,h)
  finally:browser.close()
