"""Pokéxplorer 1.4.2: real CSS visibility, keyboard focus and purchase gating.
Run with `python tests/market-city-gating.browser.py`. Runs isolated with no network.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js',
         'engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js','game-services.js','checkpoints.js']

def run(browser,width,height):
    page=browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.route('**/*',lambda route:route.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',(BASE/'style.css').read_text(),count=1)
    page.add_style_tag(content=css)
    for script in SCRIPTS:page.add_script_tag(content=(BASE/'js'/script).read_text())
    page.evaluate('window.game=new GameEngine();game.money=100000;game.isLocked=false;')
    page.locator('#pokemart-overlay').evaluate("e=>e.classList.remove('hidden')")
    for floor,super_ok,hyper_ok in [(1,False,False),(5,False,False),(10,False,False),
                                     (15,False,False),(19,False,False),(20,True,False),
                                     (25,True,False),(49,True,False),(50,True,True),
                                     (51,True,True)]:
        page.evaluate('(floor)=>{game.floor=floor;game.renderSidebar();}',floor)
        for item,id,expected,price in [('superPotion','buy-super-potion-btn',super_ok,600),
                                       ('hyperPotion','buy-hyper-potion-btn',hyper_ok,1000)]:
            result=page.locator('#'+id).evaluate('''e=>({
              hidden:e.hidden, cssHidden:getComputedStyle(e).display==='none',
              disabled:e.disabled, ariaHidden:e.getAttribute('aria-hidden'),
              classHidden:e.classList.contains('hidden')
            })''')
            assert result['hidden'] is (not expected), (floor,item,result)
            assert result['cssHidden'] is (not expected), (floor,item,result)
            assert result['disabled'] is (not expected), (floor,item,result)
            assert result['classHidden'] is (not expected), (floor,item,result)
            assert result['ariaHidden'] == ('false' if expected else 'true'), (floor,item,result)
            old=page.evaluate('game.money')
            old_count=page.evaluate('(id)=>game.items[id]',item)
            bought=page.evaluate('([id,price])=>game.purchaseItem(id,price)',[item,price])
            assert bought is expected, (floor,item,bought,expected)
            assert page.evaluate('game.money')==old-(price if expected else 0),floor
            assert page.evaluate('(id)=>game.items[id]',item)==old_count+(1 if expected else 0),floor
        # Focus navigation must not target the unavailable remedies.
        page.evaluate('game.openPokemartShop()')
        assert page.evaluate("document.activeElement.id") == 'buy-pokeball-btn'
        page.keyboard.press('s')
        assert page.evaluate("document.activeElement.id")=='buy-potion-btn'
    assert not errors,errors
    page.close()
    return f'{width}x{height}: OK'

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
           args=['--no-sandbox','--disable-dev-shm-usage'])
        for w,h in [(1460,900),(390,844)]:print(run(browser,w,h))
        browser.close()
