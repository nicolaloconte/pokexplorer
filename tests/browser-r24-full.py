from pathlib import Path
from playwright.sync_api import sync_playwright
import mimetypes,json
from importlib.machinery import SourceFileLoader
smoke=SourceFileLoader("smoke",str(Path(__file__).with_name("browser-smoke.py"))).load_module()
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text().replace('<head>','<head><base href="https://game.local/">',1)
for width in [390,1440]:
 errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=b.new_page(viewport={'width':width,'height':880})
  page.on('pageerror',lambda err: errors.append(str(err)))
  def route(r):
   url=r.request.url
   if url.startswith('https://game.local/'):
    f=(root/url.split('https://game.local/',1)[1].split('?')[0]).resolve()
    if f.is_file() and f.is_relative_to(root):r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:r.fulfill(status=404,body='not found')
   elif url.startswith('https://pokeapi.co/api/v2/pokemon/'):
    name=url.rstrip('/').split('/')[-1]
    if name.isdigit():r.fulfill(status=200,body=json.dumps(smoke.pokemon_json(name)),content_type='application/json')
    else:r.fulfill(status=404,body='not found')
   elif url.startswith('https://pokeapi.co/api/v2/pokemon-species/'):
    r.fulfill(status=200,body=json.dumps(dict(growth_rate=dict(name='medium'))),content_type='application/json')
   else:r.abort()
  page.route('**/*',route)
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_function('window.game !== undefined')
  assert page.locator('#main-menu-overlay').is_visible()
  assert page.locator('#dev-mode-trigger').is_visible()
  assert page.locator('#btn-act-switch').count()==1
  assert page.locator('#mobile-dpad .dpad-arrow').count()==4
  page.evaluate('''() => {
    const game=window.game;
    const c={entity:'item',itemKind:'potion'};
    game.isLocked=false;game.floor=1;game.gridMap=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'path',entity:null,revealed:true})));
    game.gridMap[0][0]=c;game.items.potion=1;
    game.beginHiddenRaid=()=>{window.raidStarted=(window.raidStarted||0)+1};
    window.origRandom=Math.random;Math.random=()=>0.01;
    game.collectFloorItem(c);
    Math.random=window.origRandom;
  }''')
  assert page.evaluate('window.raidStarted')==1
  assert page.evaluate('game.items.potion')==1
  assert page.evaluate('game.gridMap[0][0].entity')==None
  page.locator('#btn-start-game').click()
  page.wait_for_selector('.pokeball-wrapper')
  page.locator('.pokeball-wrapper').first.click()
  page.locator('#btn-confirm-yes').click()
  page.wait_for_selector('.player-avatar')
  # Direct encounter with mocked Pokémon data; automatically acknowledge scripted dialogues.
  page.evaluate("""() => {game.floor=1;game.isLocked=false;game.pendingWildEncounterType=null;game.battleText=async msg=>{game.setBattleMsg(msg)};game.wait=async()=>{};game.animateBall=async()=>{};game.summonPokemon=async side=>{game.$id(side==='player'?'player-sprite':'enemy-sprite').classList.remove('hidden')};game.playAttackAnimation=async()=>{}}""")
  page.evaluate("game.startBattle('wild')")
  page.wait_for_selector('#panel-main-actions:not(.hidden)',timeout=12000)
  assert page.locator('#btn-act-switch').is_visible()
  page.locator('#btn-act-fight').click(position={'x':10,'y':20},force=True)
  assert page.locator('#panel-move-actions').is_visible()
  moves=page.locator('#panel-move-actions .act-btn')
  assert moves.count()>=1
  assert 'POT' not in moves.first.inner_text()
  assert not errors,errors
  print('Browser R2.4 full',width,'OK')
  b.close()
