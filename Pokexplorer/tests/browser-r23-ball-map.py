"""R2.3 real Chromium regression: DEV fog and both trainer Poké Ball throws.
Local assets; external species data mocked. No game code changes in this test.
"""
from pathlib import Path
import mimetypes, json
from playwright.sync_api import sync_playwright
import importlib.util
spec=importlib.util.spec_from_file_location('pokex_smoke',Path(__file__).with_name('browser-smoke.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
ROOT=mod.ROOT

def check(width,height):
  errors=[]
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport=dict(width=width,height=height),device_scale_factor=1)
    page.set_default_timeout(5000)
    print('new page',width,flush=True)
    page.on('pageerror', lambda e:errors.append(str(e)))
    def router(route):
      url=route.request.url
      if url.startswith('https://game.local/'):
        file=(ROOT/url[len('https://game.local/'):].split('?',1)[0]).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file():route.fulfill(status=404,body='');return
        route.fulfill(status=200,body=file.read_bytes(),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
      elif url.startswith('https://pokeapi.co/api/v2/pokemon/'):
        mon=url.rstrip('/').split('/')[-1]
        route.fulfill(status=200,content_type='application/json',body=json.dumps(mod.pokemon_json(mon))) if mon.isdigit() else route.fulfill(status=404,body='')
      elif url.startswith('https://pokeapi.co/api/v2/pokemon-species/'):
        route.fulfill(status=200,body=json.dumps({'growth_rate':{'name':'medium-fast'}}),content_type='application/json')
      else:route.abort('blockedbyclient')
    page.route('**/*',router)
    print('about to',"page.set_content(mod.HTML,wait_until='domcontentloaded')",flush=True)
    page.set_content(mod.HTML,wait_until='domcontentloaded')
    page.wait_for_function('window.game !== undefined')
    # Unlock Dev Mode BEFORE choosing a starter; first generated map is revealed.
    print('about to',"page.locator('#dev-mode-trigger').click()",flush=True)
    page.locator('#dev-mode-trigger').click()
    print('about to',"page.locator('#dev-access-code').fill('2103')",flush=True)
    page.locator('#dev-access-code').fill('2103')
    print('about to',"page.locator('#dev-code-confirm').click()",flush=True)
    page.locator('#dev-code-confirm').click()
    print('about to',"page.locator('#btn-start-game').click()",flush=True)
    page.locator('#btn-start-game').click()
    print('about to',"page.locator('.pokeball-wrapper').first.click()",flush=True)
    page.locator('.pokeball-wrapper').first.click()
    print('about to',"page.locator('#btn-confirm-yes').click()",flush=True)
    page.locator('#btn-confirm-yes').click()
    print('about to',"page.wait_for_function('game.gridMap.length===10')",flush=True)
    page.wait_for_function('game.gridMap.length===10')
    assert page.evaluate('game.gridMap.flat().every(c=>c.revealed)')
    assert page.evaluate('game.gridMap.flat().filter(c=>c.hiddenRaid).length')==1
    # DEV scanner applies to a newly generated dungeon without using charges.
    info=page.evaluate('''() => {
      const radar=game.radarCharges;
      game.floor=2;game.generateFloorDungeon();
      return {all:game.gridMap.flat().every(c=>c.revealed),radarSame:game.radarCharges===radar,
         raids:game.gridMap.flat().filter(c=>c.hiddenRaid).length};
    }''')
    assert info=={'all':True,'radarSame':True,'raids':1},info
    # Test unlocking MID-DUNGEON separately (freshly fogged without dev).
    mid=page.evaluate('''() => {
      game.devMode=false;game.floor=3;game.generateFloorDungeon();
      const originallyFoggy=game.gridMap.flat().some(c=>!c.revealed);
      const before=game.radarCharges;
      const activated=game.activateDevMode('2103');
      return {originallyFoggy,activated,allRevealed:game.gridMap.flat().every(c=>c.revealed),
        unchangedRadar:game.radarCharges===before};
    }''')
    assert mid=={'originallyFoggy':True,'activated':True,'allRevealed':True,'unchangedRadar':True},mid
    # Actual HTML keeps the battle sprite hidden during its Poké Ball flight.
    results=page.evaluate('''async () => {
      document.getElementById('overlay-battle').classList.remove('hidden');
      document.getElementById('enemy-sprite').classList.add('hidden');
      document.getElementById('player-sprite').classList.add('hidden');
      document.getElementById('enemy-trainer-sprite').classList.remove('hidden');
      document.getElementById('player-trainer-sprite').classList.remove('hidden');
      const stage=document.getElementById('battle-stage');
      const realMotion=game.playMotion;
      const recorded=[];
      const positions=()=>{
        const sr=stage.getBoundingClientRect();
        return ['player','enemy'].map(side=>{
          const p=stage.querySelector(side==='enemy'?'.enemy-platform-gba':'.player-platform-gba').getBoundingClientRect();
          return {side,x:p.left-sr.left+p.width/2-17,y:p.top-sr.top+p.height*.28-17};
        });
      };
      game.playMotion=async(el,frames)=>{if(el.id==='battle-throw-ball')recorded.push(frames)};
      game.wait=async()=>{};
      for(const side of ['player','enemy'])await game.animateBall(side);
      game.playMotion=realMotion;
      return {positions:positions(),recorded,spriteHidden:['enemy-sprite','player-sprite'].map(id=>getComputedStyle(document.getElementById(id)).display==='none'),
         width:stage.getBoundingClientRect().width,height:stage.getBoundingClientRect().height};
    }''')
    assert results['width']>200 and results['height']>150,results
    assert results['spriteHidden']==[True,True],results
    for i,pos in enumerate(results['positions']):
      frames=results['recorded'][i]
      assert len(frames)==6,frames
      import re
      end=frames[-1]['transform']
      match=re.search(r'translate3d\(([-\d.]+)px,([-\d.]+)px,0\)',end)
      assert match,end
      x,y=map(float,match.groups())
      assert abs(x-pos['x'])<.1,(pos,x,y)
      assert abs(y-pos['y'])<.1,(pos,x,y)
    # Reactivate Dev via real form mid-level using a new game instance state? 
    # Already tested in Node where that branch is isolated.
    assert not errors,errors
    browser.close()
    print(f'PASS Chromium {width}x{height}: full DEV map, hidden raid preserved, both throws land on platforms with both Pokémon sprites display:none, no JS errors')

if __name__=='__main__':
  for viewport in [(390,844),(1440,900)]:check(*viewport)
