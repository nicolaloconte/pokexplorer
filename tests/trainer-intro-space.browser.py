"""Beta 1.4.3: regression tests for Space on trainer challenge intro.
Run with python tests/trainer-intro-space.browser.py. External services not required.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js','engine.js',
         'battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def setup(browser,width,height):
    page=browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.route('**/*',lambda route:route.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
    page.add_style_tag(content=css)
    for script in SCRIPTS:
        page.add_script_tag(content=(BASE/'js'/script).read_text())
    page.evaluate('''() => {
      window.game=new GameEngine();
      game.gameDelay=()=>0;
      game.startBattle=(type)=>{window.startedTypes.push(type);};
      window.startedTypes=[];
      game.$id('main-menu-overlay').classList.add('hidden');
      game.$id('login-gate')?.classList.add('hidden');
      game.$id('pokex-extraction-warning')?.setAttribute('hidden','');
      game.isLocked=true;
      game.gymQueue=[];
      window.underlyingClicks=0;
      const dpad=game.$id('btn-dpad-right');
      dpad?.addEventListener('click',()=>window.underlyingClicks++);
      dpad?.focus();
      game.$id('trainer-encounter-overlay').classList.remove('hidden');
    }''')
    return page,errors

def check(browser,width,height):
    page,errors=setup(browser,width,height)
    assert page.evaluate("!game.$id('trainer-encounter-overlay').classList.contains('hidden')")
    assert page.evaluate("document.activeElement?.id")!='btn-start-trainer-battle'
    page.keyboard.press('Space')
    page.wait_for_timeout(70)
    assert page.evaluate('window.startedTypes')==['trainer'],page.evaluate('window.startedTypes')
    assert page.evaluate("game.$id('trainer-encounter-overlay').classList.contains('hidden')")
    assert page.evaluate('window.underlyingClicks')==0,'Space must not activate a different underlying button'
    # No second start when space is sent after the overlay is gone.
    page.keyboard.press('Space')
    page.wait_for_timeout(40)
    assert page.evaluate('window.startedTypes')==['trainer']
    # The mouse still activates the identical click handler, including gym mode.
    page.evaluate('''() => {
      game.gymQueue=['trainer1','trainer2','trainer3','leader'];
      game.$id('trainer-encounter-overlay').classList.remove('hidden');
    }''')
    page.locator('#btn-start-trainer-battle').click()
    page.wait_for_timeout(60)
    assert page.evaluate('window.startedTypes')==['trainer','gym']
    # Reopen gym intro and hold Space (repeated keydowns) -> one more battle only.
    page.evaluate("game.$id('trainer-encounter-overlay').classList.remove('hidden')")
    page.keyboard.down('Space')
    page.keyboard.down('Space')
    page.keyboard.up('Space')
    page.wait_for_timeout(60)
    assert page.evaluate('window.startedTypes')==['trainer','gym','gym']
    assert not errors,errors
    print(f'OK trainer intro keyboard + mouse {width}x{height}')
    page.close()

if __name__=='__main__':
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
      for width,height in [(1440,900),(390,844)]:check(browser,width,height)
    finally:browser.close()
