from pathlib import Path
import tempfile, shutil, json,mimetypes
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,root in [('full',base),('single-file',None),('css-missing',None)]:
  with tempfile.TemporaryDirectory() as td:
   td=Path(td)
   if label=='single-file':
    root=td; shutil.copy2(base/'index.html',td/'index.html')
   elif label=='css-missing':
    root=td; shutil.copy2(base/'index.html',td/'index.html'); shutil.copytree(base/'js',td/'js')
   page=browser.new_page(viewport={'width':1440,'height':900})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    url=r.request.url
    if url.startswith('https://game.local/'):
     rel=url[len('https://game.local/'):].split('?')[0];path=(root/rel).resolve()
     if not path.is_relative_to(root) or not path.is_file():r.fulfill(status=404,body='Missing');return
     r.fulfill(status=200,body=path.read_bytes(),content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream')
    else:r.abort('blockedbyclient')
   page.route('**/*',route)
   html=(root/'index.html').read_text().replace('<head>','<head><base href="https://game.local/">',1)
   page.set_content(html,wait_until='load',timeout=25000)
   page.wait_for_timeout(80)
   state=page.evaluate('''() => ({warningVisible:!document.querySelector('#pokex-extraction-warning').hidden,gameOverVisible:getComputedStyle(document.querySelector('#gameover-overlay')).display!=='none',mainMenuVisible:getComputedStyle(document.querySelector('#main-menu-overlay')).display!=='none',enginePresent:!!window.game,styleLoaded:!!document.querySelector('#pokex-stylesheet').sheet,diagnostic:document.querySelector('#pokex-extraction-diagnostic').textContent})''')
   print(label,json.dumps(state,ensure_ascii=False), 'JS-errors', errors[:3])
   if label=='full':
    assert state['mainMenuVisible'] and not state['gameOverVisible'] and not state['warningVisible'] and state['enginePresent'] and state['styleLoaded'],state
    page.click('#btn-start-game')
    page.wait_for_timeout(120)
    scene=page.evaluate("!document.querySelector('#starter-scene-overlay').classList.contains('hidden')")
    print('    start_clicked, starter scene visible:',scene)
    assert scene
   else:
    assert state['warningVisible'] and not state['gameOverVisible'],state
   page.close()
 browser.close()
