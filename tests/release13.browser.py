"""Beta 1.3: viewport + DOM interaction regressions for inventory, markets and NPC assets.
Run: python tests/release13.browser.py (requires Playwright, local Chromium).
All network requests are blocked; no credentials are used.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent.parent
SCRIPTS=['music.js','api-client.js','game-data.js','abilities.js','pokedex-core.js','pokemon.js',
         'engine.js','battle-helpers.js','battle-navigation.js','map-helpers.js','ui-helpers.js',
         'game-services.js','checkpoints.js']

def run_viewport(browser,w,h):
    page=browser.new_page(viewport={'width':w,'height':h})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/*',lambda r:r.abort())
    html=re.sub(r'<script\s+src="[^"]+"[^>]*></script>','',(BASE/'index.html').read_text())
    html=re.sub(r'<link\s+[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    css=(BASE/'style.css').read_text()
    css=re.sub(r'^@import\s+url\([^;]+;\s*','',css,count=1)
    page.add_style_tag(content=css)
    for filename in SCRIPTS:page.add_script_tag(content=(BASE/'js'/filename).read_text())
    page.evaluate('window.game=new GameEngine();game.locale="it";game.money=20000;game.floor=5;game.team=[];game.bagCategory="rimedi";game.isLocked=false;game.renderSidebar();')
    def state():
        return page.evaluate('''() => ({
          bag:[...document.querySelectorAll('#bag-list .bag-item')].map(b=>b.textContent.trim()),
          superHidden:document.getElementById('buy-super-potion-btn').classList.contains('hidden'),
          hyperHidden:document.getElementById('buy-hyper-potion-btn').classList.contains('hidden'),
          superCount:game.items.superPotion,
          hyperCount:game.items.hyperPotion,
          money:game.money,
          floor:game.floor
        })''')
    before=state()
    assert not any('Superpozione' in label or 'Iperpozione' in label or 'Capsula Abilità' in label for label in before['bag']),before
    assert before['superHidden'] and before['hyperHidden'],before
    no_super=page.evaluate('game.purchaseItem("superPotion",600)')
    no_hyper=page.evaluate('game.purchaseItem("hyperPotion",1000)')
    assert not no_super and not no_hyper and game_money(page)==20000
    # First city is floor 10; second city is floor 20 and fifth is floor 50.
    page.evaluate('game.floor=10;game.renderSidebar()')
    at10=state();assert at10['superHidden'] and at10['hyperHidden'],at10
    assert not page.evaluate('game.purchaseItem("superPotion",600)')
    page.evaluate('game.floor=20;game.renderSidebar()')
    at20=state();assert not at20['superHidden'] and at20['hyperHidden'],at20
    assert page.evaluate('game.purchaseItem("superPotion",600)')
    at20=state();assert at20['superCount']==1 and any('Superpozione' in t for t in at20['bag']),at20
    # Use up the only Superpotion; after consumption it vanishes from UI.
    page.evaluate('game.items.superPotion=0;game.renderSidebar()')
    assert not any('Superpozione' in t for t in state()['bag'])
    assert not page.evaluate('game.purchaseItem("hyperPotion",1000)')
    page.evaluate('game.floor=25;game.renderSidebar()')
    at25=state();assert not at25['superHidden'] and at25['hyperHidden'],at25
    assert not page.evaluate('game.purchaseItem("hyperPotion",1000)')
    page.evaluate('game.floor=50;game.renderSidebar()')
    at50=state();assert not at50['superHidden'] and not at50['hyperHidden'],at50
    assert page.evaluate('game.purchaseItem("hyperPotion",1000)')
    assert state()['hyperCount']==1 and any('Iperpozione' in t for t in state()['bag'])
    # A discovered item appears on pickup and disappears again on count 0.
    page.evaluate('game.items.potion=0;game.items.elixir=0;game.items.abilityCapsule=0;game.renderSidebar()')
    assert not any('Pozione' in s or 'Elisir' in s or 'Capsula Abilità' in s for s in state()['bag']),state()
    page.evaluate('game.items.potion=2;game.renderSidebar()')
    assert any('Pozione' in s for s in state()['bag']),state()
    page.evaluate('game.items.potion=0;game.renderSidebar()')
    assert not any('Pozione' in s for s in state()['bag']),state()
    # Key items visible without ownership, even while count/boolean is zero.
    page.evaluate('game.bagCategory="chiave";game.items.fishingRod=false;game.expShareClaimed=false;game.expShareEnabled=false;game.renderSidebar()')
    key_items=page.evaluate('''() => [...document.querySelectorAll('#bag-list .bag-key-item')].map(n=>({label:n.textContent,disabled:n.disabled}))''')
    assert len(key_items)==2 and all(k['disabled'] for k in key_items),key_items
    # The same zero-quantity rule must apply during a battle opened bag.
    page.evaluate('game.$id("overlay-battle").classList.remove("hidden");game.bagCategory="rimedi";game.items.potion=0;game.items.hyperPotion=1;game.renderSidebar()')
    assert not any('Pozione' in s for s in state()['bag'])
    # NPC illustration pairings and legacy path compatibility.
    npc=page.evaluate('''() => ({
      fisher:game.getNpcPortraitAsset({specialRole:'fisherman',npcName:'Pescatore'}),
      elder:game.getNpcPortraitAsset({npcName:'gentleman'}),
      nurse:game.getNpcPortraitAsset({npcName:'Infermiera Joy',npcSprite:FIRERED_OVERWORLD_BASE+'nurse.png'}),
      legacyNpc:game.getNpcLocalFallback({localSpriteFallback:'assets/characters/npc-04.png'}),
      legacyOak:resolvedSpritePath('assets/characters/oak-frlg-down.png'),
      currentFish:(()=>{game.playerGender='female';game.playerFishingFrame=2;game.playerFacing='left';game.gridSize=10;game.gridMap=Array.from({length:10},()=>Array.from({length:10},()=>({revealed:true,type:'path'})));game.playerPos={x:5,y:5};game.renderDungeon();return game.$id('dungeon-grid-board').querySelector('.player-avatar')?.style.backgroundImage})()
    })''')
    assert npc['fisher']=='assets/sprites/npc/ritratti/OW-18.png',npc
    assert npc['elder']=='assets/sprites/npc/ritratti/OW-15.png',npc
    assert npc['legacyNpc']=='assets/sprites/ui/trainer-avatar-fallback.svg' and npc['legacyOak'].endswith('oak-frlg-down.png'),npc
    assert 'assets/sprites/player/girl/walk/left-2.png' in npc['currentFish'],npc
    assert not errors,errors
    page.close()
    return f'{w}x{h}: OK'

def game_money(page):
    return page.evaluate('game.money')

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
            args=['--no-sandbox','--disable-dev-shm-usage'])
        for w,h in [(1460,900),(390,844)]:print(run_viewport(browser,w,h))
        browser.close()
