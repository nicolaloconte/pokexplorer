"""Browser integration smoke: local assets plus mocked external Pokémon data.
Required: pip install playwright and a local Chromium binary. No remote requests.
Screenshots show placeholders for Pokémon where the production game uses CDN sprite URLs.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse
import mimetypes, json, re, sys

ROOT=Path(__file__).resolve().parents[1]
ART=Path(__file__).resolve().parent/'screenshots'; ART.mkdir(exist_ok=True)
HTML=(ROOT/'index.html').read_text().replace('<head>','<head><base href="https://game.local/">',1)

NAMES={1:'bulbasaur',4:'charmander',7:'squirtle',16:'pidgey',19:'rattata',10:'caterpie',13:'weedle',52:'meowth',39:'jigglypuff'}
TYPES={1:'grass',4:'fire',7:'water',16:'flying',19:'normal',10:'bug',13:'bug',52:'normal',39:'normal'}

def pokemon_json(id):
    id=int(id); name=NAMES.get(id,f'pokemon-{id}'); tp=TYPES.get(id,'normal')
    return dict(id=id,name=name,base_experience=64,species=dict(name=name),types=[dict(type=dict(name=tp))],
       sprites=dict(front_default='https://game.local/assets/items/pokeball.svg',back_default='https://game.local/assets/items/pokeball.svg'),
       stats=[dict(stat=dict(name=k),base_stat=65,effort=0) for k in ['hp','attack','defense','special-attack','special-defense','speed']],
       abilities=[dict(ability=dict(name='overgrow'),is_hidden=False)],
       moves=[dict(move=dict(name='tackle'),version_group_details=[dict(version_group=dict(name='firered-leafgreen'),move_learn_method=dict(name='level-up'),level_learned_at=1)])])

def render_test(width,height):
    errors=[]; warnings=[]; blocked=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport=dict(width=width,height=height),device_scale_factor=1)
        page.on('pageerror',lambda e: errors.append(str(e)))
        def route(r):
            url=r.request.url
            if url.startswith('https://game.local/'):
                name=url[len('https://game.local/'):].split('?',1)[0]
                file=(ROOT/name).resolve()
                if not file.is_relative_to(ROOT) or not file.is_file():r.fulfill(status=404,body='not found');return
                r.fulfill(status=200,body=file.read_bytes(),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
            elif url.startswith('https://pokeapi.co/api/v2/pokemon/'):
                id=url.rstrip('/').split('/')[-1]
                if not id.isdigit():r.fulfill(status=404,body='not found');return
                r.fulfill(status=200,body=json.dumps(pokemon_json(id)),content_type='application/json')
            elif url.startswith('https://pokeapi.co/api/v2/pokemon-species/'):
                r.fulfill(status=200,body=json.dumps(dict(growth_rate=dict(name='medium'))),content_type='application/json')
            else:
                blocked.append(url);r.abort('blockedbyclient')
        page.route('**/*',route)
        page.set_content(HTML,wait_until='domcontentloaded',timeout=18000)
        page.wait_for_function('window.game !== undefined',timeout=12000)
        assert page.locator('#main-menu-overlay').is_visible()
        page.screenshot(path=str(ART/f'menu-{width}.png'))
        page.locator('#btn-start-game').click()
        page.wait_for_selector('.pokeball-wrapper',timeout=12000)
        assert page.locator('.pokeball-wrapper').count()==3
        page.screenshot(path=str(ART/f'starters-{width}.png'))
        page.locator('#choose-female').click()
        assert page.evaluate('game.playerGender')=='female'
        page.locator('.pokeball-wrapper').nth(1).click()
        page.locator('#btn-confirm-yes').click()
        assert page.evaluate('game.team[0].id')==4
        page.wait_for_selector('.player-avatar')
        page.screenshot(path=str(ART/f'game-{width}.png'))
        # Capture the market visuals independently of any network-loaded sprites.
        page.evaluate('''() => {game.isLocked=true;document.getElementById('pokemart-overlay').classList.remove('hidden')}''')
        page.screenshot(path=str(ART/f'pokemart-{width}.png'))
        page.evaluate('''() => {game.isLocked=false;document.getElementById('pokemart-overlay').classList.add('hidden')}''')
        # A new step must preserve sprite identity instead of rerendering 100 elements.
        identical=page.evaluate('''() => {
           const cell=game.gridMap[0][1];cell.type='path';cell.entity=null;cell.hiddenRaid=false;
           window._oldAvatar=document.querySelector('.player-avatar');
           window._oldTile=document.querySelectorAll('#dungeon-grid-board .grid-cell')[24];
           game.movePlayer(1,0);
           return {pos:game.playerPos.x,spriteSame:window._oldAvatar===document.querySelector('.player-avatar'),
                   tileSame:window._oldTile===document.querySelectorAll('#dungeon-grid-board .grid-cell')[24]};
        }''')
        assert identical=={'pos':1,'spriteSame':True,'tileSame':True}, identical
        # Bag full: an item must not vanish from the floor or turn into a different item.
        pickup=page.evaluate('''() => {
          game.movePlayer(-1,0);
          const c=game.gridMap[0][1];c.type='path';c.entity='item';c.itemKind='pokeball';
          game.items.pokeball=20;game.movePlayer(1,0);
          const first={entity:c.entity,item:c.itemKind,count:game.items.pokeball};
          game.movePlayer(-1,0);
          game.items.pokeball=19;game.movePlayer(1,0);
          return {first,second:{entity:c.entity,item:c.itemKind,count:game.items.pokeball}};
        }''')
        assert pickup=={'first':{'entity':'item','item':'pokeball','count':20},
          'second':{'entity':None,'item':'pokeball','count':20}},pickup
        # Gym challenge is reversible and not queued until explicit confirmation.
        gym=page.evaluate('''() => {
          game.floor=10; game.generateFloorDungeon();game.requestGymChallenge();
          const before={pending:game.gymChallengePending,queue:game.gymQueue.length};
          game.cancelGymChallenge();
          return {before,after:{pending:game.gymChallengePending,queue:game.gymQueue.length,locked:game.isLocked}};
        }''')
        assert gym=={'before':{'pending':True,'queue':0},'after':{'pending':False,'queue':0,'locked':False}},gym
        # Failed network start must restore a trainer and the hidden raid.
        rollback=page.evaluate('''async () => {
          game.floor=1;game.generateFloorDungeon();
          const cell=game.gridMap[0][1];cell.type='path';cell.entity=null;
          game.pendingTrainerCell=cell;
          const realLoader=game.getPokemonData;
          game.getPokemonData=async()=>{throw new Error('Simulated offline Pokemon API')};
          await game.startBattle('trainer');
          const trainerRestored=cell.entity==='trainer' && !game.isLocked;
          cell.entity=null;cell.hiddenRaid=false;
          game.playerPos={x:1,y:0};game.isRaidActive=true;game.raidQueueCount=5;
          await game.startBattle('wild');
          const raidRestored=cell.hiddenRaid && cell.type==='grass' && !game.isRaidActive && !game.isLocked;
          game.getPokemonData=realLoader;
          return {trainerRestored,raidRestored};
        }''')
        assert rollback=={'trainerRestored':True,'raidRestored':True},rollback
        # Genuine battle intro and one turn with the female trainer; click dialogue to advance.
        page.evaluate('''() => {
          window._battleAck=setInterval(()=>game.acknowledgeDialogue(),90);
          window._battleIntro=game.startBattle('wild');
        }''')
        # This verifies visibility on a REAL browser frame, not only a PNG-file check.
        page.wait_for_function('''() => document.querySelector('#player-trainer-sprite.female-trainer:not(.hidden)')!==null''',timeout=18000)
        page.screenshot(path=str(ART/f'female-throw-{width}.png'))
        combat=page.evaluate('''async () => {
          try {
            const limit=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('battle timeout')),ms))]);
            await limit(window._battleIntro,18000);
            const first={started:game.isBattleVisible(),busy:game.battleBusy,
              female:document.getElementById('player-trainer-sprite').classList.contains('female-trainer'),
              opponent:game.enemyMon?.name,moveCount:game.activeMon.moves.length};
            if(!first.started||first.busy||!first.female||!first.moveCount)return {first};
            const pp=game.activeMon.moves[0].currentPp;
            await limit(game.executeAttack(game.activeMon.moves[0]),18000);
            return {first,acted:game.activeMon.moves[0].currentPp<pp,
              finished:!game.battleBusy};
          }finally{clearInterval(window._battleAck)}
        }''')
        assert combat['first']['started'] and not combat['first']['busy'] and combat['first']['female'],combat
        assert combat['acted'] and combat['finished'],combat
        dimension=page.evaluate('''() => ({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,game:document.querySelector('#rotom-body').getBoundingClientRect().width})''')
        assert dimension['scrollWidth']<=dimension['viewport']+1, dimension
        assert not errors,errors
        browser.close()
        return {'viewport':width,'errorCount':len(errors),'blockedUrlCount':len(set(blocked)),
            'layout':dimension,'scenario':'starter → female → exploration → item full/retry → gym cancel → network rollback → female battle + turn PASS'}

if __name__=='__main__':
    results=[]
    for w,h in [(390,844),(1440,900)]:
        results.append(render_test(w,h))
    print(json.dumps(results,indent=2,ensure_ascii=False))
