"""End-to-end Dev Mode test: actual HTML/CSS/JS with mocked external Pokémon API."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,mimetypes
import importlib.util
_mod=importlib.util.spec_from_file_location('pokex_smoke', Path(__file__).with_name('browser-smoke.py'))
_smoke=importlib.util.module_from_spec(_mod);_mod.loader.exec_module(_smoke)
pokemon_json,HTML,ROOT=_smoke.pokemon_json,_smoke.HTML,_smoke.ROOT

def run_case(width,height):
 errors=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':width,'height':height})
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_default_timeout(4000)
  def route(r):
   url=r.request.url
   if url.startswith('https://game.local/'):
    f=(ROOT/url[len('https://game.local/'):].split('?',1)[0]).resolve()
    if not f.is_relative_to(ROOT) or not f.is_file():r.fulfill(status=404,body='');return
    r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
   elif url.startswith('https://pokeapi.co/api/v2/pokemon/'):
    species=url.rstrip('/').split('/')[-1]
    if species.isdigit():r.fulfill(status=200,body=json.dumps(pokemon_json(species)),content_type='application/json');return
    r.fulfill(status=404,body='')
   elif url.startswith('https://pokeapi.co/api/v2/pokemon-species/'):
    r.fulfill(status=200,body=json.dumps({'growth_rate':{'name':'medium-fast'}}),content_type='application/json')
   else:r.abort('blockedbyclient')
  page.route('**/*',route)
  page.set_content(HTML,wait_until='domcontentloaded')
  page.wait_for_function('window.game!==undefined')
  assert page.locator('#dev-mode-trigger').is_visible()
  assert page.evaluate('game.devMode') is False
  page.locator('#dev-mode-trigger').click()
  assert page.locator('#dev-code-overlay').is_visible()
  page.locator('#dev-access-code').fill('1203')
  page.locator('#dev-code-confirm').click()
  assert page.locator('#dev-code-error').inner_text()=='Codice errato. Riprova.'
  assert page.evaluate('game.devMode') is False
  page.locator('#dev-access-code').fill('2103')
  page.locator('#dev-code-confirm').click()
  assert page.evaluate('game.devMode') is True
  assert page.evaluate('game.getLevelCap()')==100
  assert page.evaluate('game.items.rareCandy')==999
  assert page.evaluate('game.items.goldCandy')==999
  assert not page.locator('#dev-code-overlay').is_visible()
  assert page.locator('#dev-mode-trigger').get_attribute('aria-pressed')=='true'
  page.screenshot(path=str(ROOT/'tests'/f'dev-unlocked-{width}.png'))
  page.locator('#btn-start-game').click()
  page.wait_for_selector('.pokeball-wrapper')
  page.locator('.pokeball-wrapper').first.click()
  page.locator('#btn-confirm-yes').click()
  page.wait_for_function('game.team.length>0')
  assert page.evaluate('game.team[0].level')==5
  # Exercise visible bag buttons, target-selection UX and async application.
  page.evaluate("game.bagCategory='rimedi';game.renderSidebar()")
  assert page.locator('#bag-list .bag-item').count()==4
  assert page.locator('#bag-list').inner_text().count('999')==2
  page.locator('#bag-list .bag-item').filter(has_text='Caramella d’Oro').evaluate('(el)=>el.click()')
  assert page.locator('#item-target-prompt').is_visible()
  if width<=600:page.locator('#item-target-mobile-list button').first.click()
  else:page.locator('#team-grid .team-slot').first.evaluate('(el)=>el.click()')
  # Complete the real evolution and move-learning prompts. Golden Candy may
  # cross the evolution threshold; it must not silently skip that interaction.
  page.evaluate("""() => {window._devDialogs=setInterval(()=>{
    const visible=id=>{const e=document.getElementById(id);return e&&!e.classList.contains('hidden')};
    if(visible('evolution-overlay')&&visible('evolution-start'))document.getElementById('evolution-start').click();
    if(visible('evolution-overlay')&&visible('evolution-finish'))document.getElementById('evolution-finish').click();
    if(visible('learn-move-overlay'))document.getElementById('skip-new-move-btn').click();
  },100)}""")
  for i in range(13):
   page.wait_for_timeout(500)
   state=page.evaluate("""() => ({level:game.team[0].level,busy:game.devUpgradeInProgress,evol:!document.getElementById('evolution-overlay').classList.contains('hidden'),start:!document.getElementById('evolution-start').classList.contains('hidden'),finish:!document.getElementById('evolution-finish').classList.contains('hidden'),learn:!document.getElementById('learn-move-overlay').classList.contains('hidden'),coin:game.items.goldCandy})""")
   if state['level']==25 and not state['busy']:break
  assert state['level']==25 and not state['busy'],state
  page.evaluate('clearInterval(window._devDialogs)')
  assert page.evaluate('game.items.goldCandy')==998
  page.locator('#bag-list .bag-item').filter(has_text='Caramella Rara').evaluate('(el)=>el.click()')
  if width<=600:page.locator('#item-target-mobile-list button').first.click()
  else:page.locator('#team-grid .team-slot').first.evaluate('(el)=>el.click()')
  page.wait_for_function('game.team[0].level===26 && game.devUpgradeInProgress===false',timeout=18000)
  assert page.evaluate('game.items.rareCandy')==998
  assert page.evaluate('game.getLevelCap()')==100
  # Re-entering a new adventure in the same unlocked session restores the DEV kit.
  page.evaluate('game.returnToMainMenu()')
  assert page.evaluate('game.devMode') is True
  assert page.evaluate('game.items.goldCandy')==999
  assert page.evaluate('game.items.rareCandy')==999
  # Ensure display remains inside viewport; no boot failures or JS errors.
  dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,button:document.getElementById("dev-mode-trigger").getBoundingClientRect().right})')
  assert dims['scroll']<=dims['width']+1,dims
  assert dims['button']<=dims['width']+1,dims
  assert not errors,errors
  browser.close()
  return {'width':width,'unlock':'PASS','wrong_code':'PASS','gold_plus_20':'PASS','rare_plus_1':'PASS','inventory':'PASS','errors':errors}
if __name__=='__main__':
 for width,height in [(390,844),(1440,900)]:print(json.dumps(run_case(width,height),ensure_ascii=False))
