"""Static integrity checks for all packaged sprite paths and image files.
No network, Git push or deployment required.
Run: python tests/verify-assets.py
"""
from pathlib import Path
from PIL import Image
import re
import xml.etree.ElementTree as ET
BASE=Path(__file__).resolve().parent.parent
SRC=[*BASE.glob('js/*.js'), BASE/'index.html', BASE/'style.css']
MISSING=[]
for source in SRC:
    text=source.read_text(encoding='utf-8')
    if source.name=='game-data.js':
        # Migration strings describe removed *historic* paths intentionally.
        text=text.split('// Checkpoints may contain map cells')[0]
    for match in re.finditer(r'assets/[a-zA-Z0-9_./-]+\.(?:png|webp|svg|mp3|wav)',text):
        path=match.group(0)
        if not (BASE/path).is_file():MISSING.append((source.relative_to(BASE).as_posix(),path))
assert not MISSING,f'Broken explicit asset references: {MISSING}'

SPRITES=BASE/'assets/sprites'
assert SPRITES.is_dir()
# Check all dynamically generated paths expected by the runtime.
paths=[]
for avatar in ('red','girl'):
    for facing in ('up','down','left','right'):
        for frame in range(3):paths.append(SPRITES/f'player/{avatar}/walk/{facing}-{frame}.png')
    for frame in range(5):paths.append(SPRITES/f'player/{avatar}/throw/{frame}.png')
for facing in ('up','down','left','right'):
    for frame in range(4):paths.append(SPRITES/f'player/red/fish/{facing}-{frame}.png')
for frame in range(4):paths.append(SPRITES/f'player/girl/fish/down-{frame}.png')
for badge in range(1,9):paths.append(SPRITES/f'badges/kanto-clean-{badge}.png')
for house in range(1,4):paths.append(SPRITES/f'buildings/house-{house}.png')
for name in ('pokemart','pokecenter','gym'):paths.append(SPRITES/f'buildings/{name}.png')
for name in ('pokeball-game.png','potion-user.png','super-potion-user.png','hyper-potion-user.png','elixir-user.png','ability-capsule-user.png','old-rod-user.png','exp-share-user.png','rare-candy-user.png','gold-candy-user.png','master-ball.svg'):paths.append(SPRITES/f'items/{name}')
missing=[str(p.relative_to(BASE)) for p in paths if not p.is_file()]
assert not missing,f'Missing generated assets: {missing}'

# Detect malformed/corrupt graphics before packaging.
graphics=[*SPRITES.rglob('*.png'),*SPRITES.rglob('*.svg'),*SPRITES.rglob('*.webp'),*BASE.glob('assets/battle/**/*.webp')]
for path in graphics:
    if path.suffix=='.svg':ET.parse(path)
    else:
        with Image.open(path) as image:image.verify()
# These pre-existing legacy NPC placeholders are unreferenced by the current renderer.
assert not (SPRITES/'npc-legacy').exists(), 'Unused legacy NPC folder must be removed'

print(f'SPRITE AUDIT PASS · {len(paths)} constructed paths · {len(graphics)} graphic files · {len(SRC)} source files checked')
