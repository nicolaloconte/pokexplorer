"""Beta 1.4: direct browser regressions with all approved overworld assets and PokéMarket dialogue.
Run: python tests/release14.browser.py
No external services, requests or credentials required.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js','engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def run(browser,w,h):
 page=browser.new_page(viewport={'width':w,'height':h})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda route:route.abort())
 html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
 html=re.sub(r'<link\s+[^>]*>','',html)
 page.set_content(html,wait_until='domcontentloaded')
 css=(BASE/'style.css').read_text()
 css=re.sub(r'^@import\s+url\([^;]+;\s*','',css,count=1)
 page.add_style_tag(content=css)
 for name in SCRIPTS:page.add_script_tag(content=(BASE/'js'/name).read_text())
 page.evaluate('window.game=new GameEngine();game.floor=10;game.isLocked=false;game.money=15000;game.renderSidebar();')
 assert page.evaluate("document.querySelector('#language-en')===null")
 assert page.evaluate('document.documentElement.lang')=='it'
 assert 'radial-gradient' in page.locator('#main-menu-overlay').evaluate('(el)=>getComputedStyle(el).backgroundImage')
 paths=page.evaluate("FIRERED_OVERWORLD_NAMES.map(x=>overworldSpriteUrl(x))")
 assert len(paths)==18 and all(x.startswith('https://raw.githubusercontent.com/pret/pokefirered/') for x in paths),paths
 portraits=page.evaluate("FIRERED_OVERWORLD_NAMES.map(x=>overworldPortraitUrl(x))")
 assert len(portraits)==18 and all(x.startswith('assets/sprites/npc/ritratti/OW-') for x in portraits)
 assert page.evaluate("game.getNpcPortraitAsset({specialRole:'pokemart-clerk'})").endswith('OW-16.png')
 assert page.evaluate("game.getNpcPortraitAsset({specialRole:'pokemon-center-nurse'})").endswith('OW-09.png')
 assert page.evaluate("game.getNpcPortraitAsset({npcName:'Gentiluomo'})").endswith('OW-15.png')
 assert page.evaluate("game.getNpcPortraitAsset({npcName:'Anziano'})").endswith('OW-03.png')
 # Direct approach from the front entrance (same as the nurse on the left).
 page.evaluate('game.playerPos={x:7,y:3};game.isLocked=false;')
 assert page.evaluate('game.openPokemartDialog()') is True
 assert page.locator('#npc-dialog-overlay').is_visible()
 assert page.locator('#npc-speech-text').inner_text().find('Benvenuto al PokéMarket')>=0
 assert page.locator('#npc-portrait-img .pokex-portrait').count()==1
 page.wait_for_timeout(80)
 page.keyboard.press('Space')
 assert page.locator('#npc-dialog-overlay').is_hidden()
 assert page.locator('#pokemart-overlay').is_visible()
 assert page.evaluate('game.isLocked') is True
 focus_before=page.evaluate('document.activeElement.id')
 assert focus_before.startswith('buy-'),focus_before
 page.keyboard.press('s')
 focus_after=page.evaluate('document.activeElement.id')
 assert focus_after!=focus_before,(focus_before,focus_after)
 money=page.evaluate('game.money')
 # Current focus should be potion (not first Poké Ball); Space purchases via native click.
 page.keyboard.press('Space')
 assert page.evaluate('game.money')==money-150,(money,page.evaluate('game.money'))
 page.keyboard.press('Escape')
 assert page.locator('#pokemart-overlay').is_hidden()
 assert page.locator('#npc-dialog-overlay').is_visible()
 assert 'Torna a trovarci' in page.locator('#npc-speech-text').inner_text()
 page.wait_for_timeout(80)
 page.keyboard.press('Space')
 assert page.locator('#npc-dialog-overlay').is_hidden()
 assert page.evaluate('game.isLocked') is False
 assert not errors,errors
 page.close()
 return f'{w}×{h}: PASS'

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for size in [(1460,900),(390,844)]:print(run(browser,*size))
  browser.close()
