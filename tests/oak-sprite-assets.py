"""Sanity checks for Oak's revised local map sprites (Beta 1.5.1)."""
from pathlib import Path
from PIL import Image
import hashlib
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'assets/sprites/npc'
frames={}
for direction in ('down','up','left','right'):
    path=ASSETS/f'oak-frlg-{direction}.png'
    with Image.open(path) as img:
        assert img.size == (24,32), (direction,img.size)
        assert img.mode == 'RGBA', (direction,img.mode)
        rgba=img.convert('RGBA')
        bbox=rgba.getchannel('A').getbbox()
        assert bbox and bbox[2]-bbox[0] >= 12 and bbox[3]-bbox[1] >= 23, (direction,bbox)
        assert rgba.getpixel((0,0))[3]==0, (direction,'non transparent corner')
        frames[direction]=hashlib.sha256(path.read_bytes()).hexdigest()
assert len(set(frames.values()))==4,'All directional frames must be distinct'
with Image.open(ASSETS/'oak-frlg-mugshot.png') as portrait:
    assert portrait.width>64 and portrait.height>64,'Oak dialog portrait was replaced by overworld'
assert (ASSETS/'originali-approvati/prof-oak-overworld-sheet-definitivo-1.5.1.png').is_file()
css=(ROOT/'style.css').read_text(encoding='utf8')
assert '.sprite-frame.celestial-oak-sprite' in css and 'width:24px!important' in css
print('OAK ASSETS PASS: four independent 24x32 poses, intact mugshot and resized viewport')
